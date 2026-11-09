<?php

namespace Tests\Feature;

use App\Support\Tenancy;
use Tests\TestCase;

class PublicVideosTest extends TestCase
{
    public function test_central_home_page_renders_welcome(): void
    {
        $central = Tenancy::centralDomain();
        $response = $this->get("http://{$central}/");
        $response->assertOk();
    }

    public function test_clinic_registration_page_renders(): void
    {
        $central = Tenancy::centralDomain();
        $response = $this->get("http://{$central}/clinics/register");
        $response->assertOk();
    }

    public function test_web_video_files_exist_under_fifteen_megabytes(): void
    {
        $videos = [
            'umahz-full-2min.mp4' => 15 * 1024 * 1024,
            'umahz-social-60s-9x16.mp4' => 15 * 1024 * 1024,
            'umahz-setup-tutorial.mp4' => 15 * 1024 * 1024,
        ];

        foreach ($videos as $filename => $maxBytes) {
            $path = public_path("videos/{$filename}");
            $this->assertFileExists($path, "Expected web video {$filename} to exist.");
            $size = filesize($path);
            $this->assertLessThan($maxBytes, $size, "Video {$filename} exceeds 15 MB limit: {$size} bytes.");
            $this->assertGreaterThan(1024 * 1024, $size, "Video {$filename} seems too small: {$size} bytes.");
        }
    }

    public function test_video_posters_and_captions_exist(): void
    {
        $posters = [
            'umahz-full-2min-poster.webp',
            'umahz-full-2min-poster.jpg',
            'umahz-social-60s-poster.webp',
            'umahz-social-60s-poster.jpg',
            'umahz-setup-tutorial-poster.webp',
            'umahz-setup-tutorial-poster.jpg',
        ];

        foreach ($posters as $poster) {
            $path = public_path("videos/{$poster}");
            $this->assertFileExists($path, "Expected poster {$poster} to exist.");
            $this->assertGreaterThan(5 * 1024, filesize($path), "Poster {$poster} seems corrupted or empty.");
        }

        $vtts = [
            'umahz-full-2min.vtt',
            'umahz-setup-tutorial.vtt',
        ];

        foreach ($vtts as $vtt) {
            $path = public_path("videos/{$vtt}");
            $this->assertFileExists($path, "Expected VTT caption {$vtt} to exist.");
            $content = file_get_contents($path);
            $this->assertStringStartsWith('WEBVTT', $content, "Caption {$vtt} must be valid WebVTT format.");
        }
    }

    public function test_large_original_videos_are_gitignored(): void
    {
        $gitignore = file_get_contents(base_path('.gitignore'));
        $this->assertStringContainsString('/public/videos/*-v2.mp4', $gitignore);
    }
}

