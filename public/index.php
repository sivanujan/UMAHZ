<?php

// Polyfill for finfo when fileinfo PHP extension is disabled in environment
if (!defined('FILEINFO_MIME_TYPE')) {
    define('FILEINFO_MIME_TYPE', 16);
}
if (!class_exists('finfo')) {
    class finfo {
        public function __construct(int $flags = 0, ?string $magicFile = null) {}
        public function buffer(string $string, int $flags = 0, $context = null): string|false {
            return false;
        }
        public function file(string $filename, int $flags = 0, $context = null): string|false {
            return false;
        }
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
