<?php

// Used only by the local dev server launch config (.claude/launch.json) so
// `-d extension=fileinfo` actually reaches the PHP built-in server process —
// `php artisan serve` re-spawns its own `php -S` subprocess without
// forwarding -d flags, and the vendor router script it uses assumes cwd is
// public/, which isn't guaranteed here. Not used in production.

$publicPath = __DIR__.'/public';

$uri = urldecode(
    parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? ''
);

if ($uri !== '/' && file_exists($publicPath.$uri) && ! is_dir($publicPath.$uri)) {
    $filePath = $publicPath.$uri;
    $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
    $mimes = [
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'webp' => 'image/webp',
        'gif' => 'image/gif',
        'svg' => 'image/svg+xml',
        'css' => 'text/css',
        'js' => 'application/javascript',
        'ico' => 'image/x-icon',
        'mp4' => 'video/mp4',
        'webm' => 'video/webm',
        'vtt' => 'text/vtt',
    ];

    $fileSize = filesize($filePath);
    $contentType = $mimes[$ext] ?? (function_exists('mime_content_type') ? mime_content_type($filePath) : 'application/octet-stream');

    if (isset($_SERVER['HTTP_RANGE']) && in_array($ext, ['mp4', 'webm'])) {
        $rangeParts = explode('=', $_SERVER['HTTP_RANGE'], 2);
        if (count($rangeParts) === 2 && strtolower(trim($rangeParts[0])) === 'bytes') {
            $range = explode('-', $rangeParts[1]);
            $start = ($range[0] === '') ? 0 : intval($range[0]);
            $end = (isset($range[1]) && $range[1] !== '') ? intval($range[1]) : $fileSize - 1;
            if ($end >= $fileSize) {
                $end = $fileSize - 1;
            }
            if ($start > $end || $start >= $fileSize) {
                header('HTTP/1.1 416 Requested Range Not Satisfiable');
                header("Content-Range: bytes */{$fileSize}");
                exit;
            }
            $length = $end - $start + 1;
            header('HTTP/1.1 206 Partial Content');
            header("Content-Range: bytes {$start}-{$end}/{$fileSize}");
            header("Content-Length: {$length}");
            header('Content-Type: '.$contentType);
            header('Accept-Ranges: bytes');
            $fp = fopen($filePath, 'rb');
            fseek($fp, $start);
            echo fread($fp, $length);
            fclose($fp);
            exit;
        }
    }

    header('Content-Type: '.$contentType);
    header('Content-Length: '.$fileSize);
    header('Accept-Ranges: bytes');
    if ($_SERVER['REQUEST_METHOD'] !== 'HEAD') {
        readfile($filePath);
    }
    exit;
}

$_SERVER['SCRIPT_FILENAME'] = $publicPath.'/index.php';
chdir($publicPath);
require $publicPath.'/index.php';
