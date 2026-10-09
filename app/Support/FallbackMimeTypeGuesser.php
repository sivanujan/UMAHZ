<?php

namespace App\Support;

use Symfony\Component\Mime\MimeTypeGuesserInterface;
use Symfony\Component\Mime\MimeTypes;

class FallbackMimeTypeGuesser implements MimeTypeGuesserInterface
{
    private static bool $registered = false;

    public static function register(): void
    {
        if (self::$registered) {
            return;
        }

        // Only register if fileinfo is not available
        if (! extension_loaded('fileinfo')) {
            MimeTypes::getDefault()->registerGuesser(new self());
        }

        self::$registered = true;
    }

    public function isGuesserSupported(): bool
    {
        return true;
    }

    public function guessMimeType(string $path): ?string
    {
        if (! is_file($path) || ! is_readable($path)) {
            return null;
        }

        // 1. Check images using PHP's built-in getimagesize()
        $imageInfo = @getimagesize($path);
        if ($imageInfo && ! empty($imageInfo['mime'])) {
            return $imageInfo['mime'];
        }

        // 2. Read magic bytes
        $handle = @fopen($path, 'rb');
        if (! $handle) {
            return null;
        }
        $header = fread($handle, 1024);
        fclose($handle);

        if (str_starts_with($header, '%PDF')) {
            return 'application/pdf';
        }

        if (str_starts_with($header, "\x89PNG\r\n\x1a\n")) {
            return 'image/png';
        }

        if (str_starts_with($header, "\xff\xd8\xff")) {
            return 'image/jpeg';
        }

        if (str_starts_with($header, 'GIF87a') || str_starts_with($header, 'GIF89a')) {
            return 'image/gif';
        }

        if (str_starts_with($header, 'RIFF') && substr($header, 8, 4) === 'WEBP') {
            return 'image/webp';
        }

        if (str_starts_with($header, "PK\x03\x04")) {
            return 'application/zip';
        }

        // SVG check
        if (preg_match('/<svg[\s>]/i', $header)) {
            return 'image/svg+xml';
        }

        return null;
    }
}
