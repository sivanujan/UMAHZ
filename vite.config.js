import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.jsx',
            refresh: true,
        }),
        react(),
    ],
    server: {
        // Clinic pages are served from per-clinic subdomains
        // (e.g. yaalstore.lvh.me:8000) but the Vite dev server runs on a single
        // origin. Allow every *.lvh.me host (and localhost) to pull dev assets
        // and connect to HMR, or the subdomain pages load blank in dev.
        // Production is unaffected — it serves built assets, not the dev server.
        cors: {
            origin: /^https?:\/\/(?:[a-z0-9-]+\.)?(?:lvh\.me|localhost)(?::\d+)?$/,
        },
    },
});
