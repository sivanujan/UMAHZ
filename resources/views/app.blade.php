<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="min-h-full bg-[#FBF7FD] dark:bg-[#0E0B14]">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="generator" content="UMAHZ Studio">
        {{-- Read by raw fetch() calls (e.g. clinical-note autosave/create) to pass Laravel's CSRF check. --}}
        <meta name="csrf-token" content="{{ csrf_token() }}">

        <!-- Root background styling: prevents white gaps or flashes at the top of the viewport -->
        <style>
            html, body {
                margin: 0 !important;
                padding: 0 !important;
                min-height: 100%;
                background-color: #FBF7FD;
            }
            html.dark, html.dark body {
                background-color: #0E0B14 !important;
            }
            #app {
                margin: 0 !important;
                padding: 0 !important;
                min-height: 100%;
                background: transparent !important;
            }
        </style>

        <!-- Theme Initialization: Prevents flash of incorrect theme before paint -->
        <script>
            (function() {
                try {
                    var isApp = window.location.pathname.indexOf('/app') === 0;
                    var stored = isApp 
                        ? localStorage.getItem('umahz-app-theme') 
                        : (localStorage.getItem('umahz-theme') || localStorage.getItem('umahz-app-theme'));
                    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                    var isDark = stored === 'dark' || (!stored && prefersDark && !isApp) || (stored === 'system' && prefersDark);
                    if (isDark) {
                        document.documentElement.classList.add('dark');
                        document.documentElement.style.backgroundColor = '#0E0B14';
                    } else {
                        document.documentElement.classList.remove('dark');
                        document.documentElement.style.backgroundColor = '#FBF7FD';
                    }
                } catch (e) {}
            })();
        </script>

        <title inertia>{{ config('app.name', 'UMAHZ Wellness') }}</title>

        <!-- Favicon -->
        <link rel="icon" type="image/x-icon" href="/favicon.ico">
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">

        <!-- Google Fonts -->
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@1,400;1,600;1,700&display=swap" rel="stylesheet">

        <!-- Clash Display (display headings) -->
        <link rel="preconnect" href="https://api.fontshare.com">
        <link href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=satoshi@300,400,500,700,900&display=swap" rel="stylesheet">

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.jsx', "resources/js/Pages/{$page['component']}.jsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased min-h-screen m-0 p-0 text-slate-800 dark:text-slate-100 bg-[#FBF7FD] dark:bg-[#0E0B14] selection:bg-[#5B2EFF] selection:text-white">
        @inertia
    </body>
</html>
