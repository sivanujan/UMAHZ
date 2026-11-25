<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>@yield('title', 'Error') — UMAHZ</title>
    <style>
        :root {
            --bg: #f8fafc;
            --card: #ffffff;
            --border: #e2e8f0;
            --text: #0f172a;
            --muted: #64748b;
            --accent: #6366f1;
            --accent-2: #7c3aed;
            --soft: #eef2ff;
        }
        @media (prefers-color-scheme: dark) {
            :root {
                --bg: #0b0f19;
                --card: #111827;
                --border: #1e293b;
                --text: #f8fafc;
                --muted: #94a3b8;
                --accent: #818cf8;
                --accent-2: #a855f7;
                --soft: rgba(99, 102, 241, 0.14);
            }
        }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            min-height: 100vh;
            padding: 16px;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg);
            color: var(--text);
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .card {
            width: 100%;
            max-width: 520px;
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 24px;
            padding: 36px 28px;
            text-align: center;
            box-shadow: 0 20px 50px -15px rgba(15, 23, 42, 0.15);
        }
        .brand {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            font-weight: 800;
            font-size: 18px;
            margin-bottom: 24px;
            color: var(--text);
            text-decoration: none;
        }
        .brand-dot { color: var(--accent); }
        .code {
            font-size: 64px;
            font-weight: 800;
            line-height: 1;
            letter-spacing: -0.04em;
            background: linear-gradient(135deg, var(--accent-2), var(--accent));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 12px;
        }
        h1 {
            margin: 0 0 10px;
            font-size: 22px;
            font-weight: 700;
        }
        p {
            margin: 0 0 24px;
            font-size: 14px;
            line-height: 1.6;
            color: var(--muted);
        }
        .actions {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            justify-content: center;
        }
        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 11px 20px;
            border-radius: 9999px;
            font-size: 13px;
            font-weight: 600;
            text-decoration: none;
            cursor: pointer;
            border: 1px solid transparent;
        }
        .btn-primary {
            color: #fff;
            background: linear-gradient(90deg, #7c3aed, #4f46e5);
        }
        .btn-secondary {
            color: var(--text);
            background: transparent;
            border-color: var(--border);
        }
        .ref {
            margin-top: 20px;
            font-size: 12px;
            color: var(--muted);
        }
    </style>
</head>
<body>
    <main class="card">
        <a href="/" class="brand">
            <svg width="28" height="28" viewBox="0 0 36 36" fill="none" aria-hidden="true">
                <rect width="36" height="36" rx="10" fill="url(#g)"/>
                <path d="M11 12v8a7 7 0 0 0 14 0v-8" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
                <defs><linearGradient id="g" x1="0" y1="0" x2="36" y2="36"><stop stop-color="#7c3aed"/><stop offset="1" stop-color="#2563eb"/></linearGradient></defs>
            </svg>
            <span>{{ $clinicName ?? 'UMAHZ' }}<span class="brand-dot">.</span></span>
        </a>
        <div class="code">@yield('code')</div>
        <h1>@yield('heading')</h1>
        <p>@yield('message')</p>
        <div class="actions">@yield('actions')</div>
        @hasSection('extra')
            <div class="ref">@yield('extra')</div>
        @endif
    </main>
</body>
</html>
