<?php

// Polyfill for finfo when fileinfo PHP extension is disabled in environment
if (!defined('FILEINFO_MIME_TYPE')) {
    define('FILEINFO_MIME_TYPE', 16);
}
if (!class_exists('finfo')) {
    class finfo {
        public function __construct(int $flags = 0, ?string $magicFile = null) {}
        public function buffer(string $string, int $flags = 0, $context = null): string|false {
            $tmp = tempnam(sys_get_temp_dir(), 'finfo');
            file_put_contents($tmp, $string);
            $mime = $this->file($tmp, $flags, $context);
            @unlink($tmp);
            return $mime;
        }
        public function file(string $filename, int $flags = 0, $context = null): string|false {
            if (class_exists(\App\Support\FallbackMimeTypeGuesser::class)) {
                $guesser = new \App\Support\FallbackMimeTypeGuesser();
                return $guesser->guessMimeType($filename) ?? false;
            }
            $img = @getimagesize($filename);
            return $img['mime'] ?? false;
        }
    }
}
if (!function_exists('finfo_open')) {
    function finfo_open(int $flags = 0, ?string $magicFile = null) {
        return new \finfo($flags, $magicFile);
    }
    function finfo_file($finfo, string $filename, int $flags = 0, $context = null) {
        return $finfo instanceof \finfo ? $finfo->file($filename, $flags, $context) : false;
    }
    function finfo_buffer($finfo, string $string, int $flags = 0, $context = null) {
        return $finfo instanceof \finfo ? $finfo->buffer($string, $flags, $context) : false;
    }
    function finfo_close($finfo): bool {
        return true;
    }
}

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
require __DIR__.'/../vendor/autoload.php';

// Bootstrap Laravel and handle the request...
/** @var Application $app */
$app = require_once __DIR__.'/../bootstrap/app.php';

$app->handleRequest(Request::capture());
