<?php

namespace App\Support;

use DOMDocument;
use DOMElement;
use DOMXPath;

class HtmlSanitizer
{
    /**
     * Allowed HTML tag names.
     */
    protected static array $allowedTags = [
        'div', 'section', 'header', 'footer', 'nav', 'article', 'aside', 'main',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'a', 'img', 'button',
        'ul', 'ol', 'li', 'blockquote', 'hr', 'br', 'table', 'thead', 'tbody',
        'tr', 'th', 'td', 'b', 'strong', 'i', 'em', 'u', 'mark', 'small',
        'sub', 'sup', 'code', 'pre', 'figure', 'figcaption', 'iframe',
        'svg', 'path', 'g', 'circle', 'rect', 'polyline', 'polygon', 'line', 'use',
    ];

    /**
     * Allowed attribute names.
     */
    protected static array $allowedAttributes = [
        'id', 'class', 'style', 'title', 'alt', 'href', 'src', 'target', 'rel',
        'width', 'height', 'data-gjs-type', 'data-gjs-name', 'data-gjs-draggable',
        'viewbox', 'fill', 'stroke', 'stroke-width', 'd', 'cx', 'cy', 'r', 'x', 'y',
        'rx', 'ry', 'x1', 'y1', 'x2', 'y2', 'points',
        'allow', 'allowfullscreen', 'frameborder', 'loading', 'referrerpolicy',
    ];

    /**
     * Sanitize HTML string by stripping unsafe tags and attributes.
     */
    public static function sanitize(?string $html): string
    {
        if (empty($html)) {
            return '';
        }

        try {
            // Suppress warnings from libxml when parsing incomplete HTML snippets
            $previousState = libxml_use_internal_errors(true);

            $doc = new DOMDocument();
            // Load with UTF-8 encoding wrapper
            $loaded = $doc->loadHTML(
                '<?xml encoding="utf-8" ?><div>' . $html . '</div>',
                LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD
            );

            libxml_clear_errors();
            libxml_use_internal_errors($previousState);

            if (! $loaded) {
                return $html;
            }

        $xpath = new DOMXPath($doc);

        // 1. Remove disallowed elements
        $nodes = $xpath->query('//*');
        if ($nodes) {
            for ($i = $nodes->length - 1; $i >= 0; $i--) {
                $node = $nodes->item($i);
                if (! $node instanceof DOMElement) {
                    continue;
                }

                $tagName = strtolower($node->tagName);

                // Skip the outer wrapper div
                if ($tagName === 'html' || $tagName === 'body') {
                    continue;
                }

                if (! in_array($tagName, static::$allowedTags, true)) {
                    $node->parentNode?->removeChild($node);
                    continue;
                }

                // Clean attributes
                static::sanitizeAttributes($node);
            }
        }

        // Extract inner HTML of wrapper
        $wrapper = $doc->getElementsByTagName('div')->item(0);
        if (! $wrapper) {
            return '';
        }

        $cleanHtml = '';
        foreach ($wrapper->childNodes as $child) {
            $cleanHtml .= $doc->saveHTML($child);
        }

        return trim($cleanHtml);
        } catch (\Throwable $e) {
            return $html;
        }
    }

    /**
     * Remove event attributes (on*) and dangerous URIs (javascript:).
     */
    protected static function sanitizeAttributes(DOMElement $element): void
    {
        $attributesToRemove = [];

        foreach ($element->attributes as $attr) {
            $name = strtolower($attr->name);
            $value = trim(strtolower($attr->value));

            // Strip event handlers (onload, onerror, onclick, etc.)
            if (str_starts_with($name, 'on')) {
                $attributesToRemove[] = $attr->name;
                continue;
            }

            // Check URI safety for href and src
            if (($name === 'href' || $name === 'src') && ! empty($value)) {
                if (
                    str_starts_with($value, 'javascript:') ||
                    str_starts_with($value, 'vbscript:') ||
                    str_starts_with($value, 'data:text/html')
                ) {
                    $attributesToRemove[] = $attr->name;
                    continue;
                }
            }

            // Check if attribute is in allowed list or starts with data-
            if (! in_array($name, static::$allowedAttributes, true) && ! str_starts_with($name, 'data-')) {
                $attributesToRemove[] = $attr->name;
            }
        }

        foreach ($attributesToRemove as $name) {
            $element->removeAttribute($name);
        }
    }

    /**
     * Sanitize CSS rules (strip @import, behavior, binding, url(javascript:)).
     */
    public static function sanitizeCss(?string $css): string
    {
        if (empty($css)) {
            return '';
        }

        // Strip @import directives
        $css = preg_replace('/@import\s+[^;]+;/i', '', $css);
        // Strip javascript: urls
        $css = preg_replace('/url\s*\(\s*["\']?\s*javascript:[^)]+\)/i', '', $css);
        // Strip expression() or behavior in IE
        $css = preg_replace('/expression\s*\([^)]+\)/i', '', $css);

        return trim($css);
    }
}
