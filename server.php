<?php

/**
 * Laravel - A PHP Framework For Web Artisans
 *
 * Router script for PHP's built-in web server. Lets you run the app with
 * `php -S <host>:<port> server.php` — handy for passing ini flags the
 * `artisan serve` child process wouldn't otherwise pick up, e.g.:
 *
 *   php -d extension=fileinfo -S lvh.me:8000 server.php
 */

$uri = urldecode(
    parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH)
);

// This file allows us to emulate Apache's "mod_rewrite" functionality from the
// built-in PHP web server. This provides a convenient way to test a Laravel
// application without having installed a "real" web server software here.
if ($uri !== '/' && file_exists(__DIR__.'/public'.$uri)) {
    return false;
}

require_once __DIR__.'/public/index.php';
