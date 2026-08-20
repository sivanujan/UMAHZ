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

if ($uri !== '/' && file_exists($publicPath.$uri)) {
    return false;
}

$_SERVER['SCRIPT_FILENAME'] = $publicPath.'/index.php';
chdir($publicPath);
require $publicPath.'/index.php';
