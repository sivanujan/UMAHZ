#!/bin/bash
set -e

# Discover packages and cache configuration, routes, and views for production
php artisan package:discover --ansi
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Conditionally run database migrations if RUN_MIGRATIONS is set to true
if [ "${RUN_MIGRATIONS}" = "true" ]; then
    echo "Running database migrations..."
    php artisan migrate --force
fi

# Conditionally run database seeders if RUN_SEED is set to true
if [ "${RUN_SEED}" = "true" ]; then
    echo "Running database seeders..."
    php artisan db:seed --force
fi

# Render injects PORT at runtime; default to 8080 so the container still
# boots to something valid if it's ever missing (e.g. running locally).
PORT="${PORT:-8080}"
echo "Configuring Apache to listen on port ${PORT}"

# Regenerate these files from scratch on every boot instead of editing them
# in place. The previous approach — `sed -i "s/80/$PORT/g"` — mutated
# whatever was already on disk, and on Docker/Render a crashed container is
# typically restarted on the SAME writable layer rather than recreated from
# the image. That made it non-idempotent: the second run's sed matched the
# "80" already inside the substituted port (e.g. the "80" inside "8080")
# and replaced it again, doubling the line's length on every restart until
# it was megabytes long — which is what actually OOM-killed sed and left
# ports.conf truncated ("Line too long"), not a build-time memory shortage.
# Writing fresh files here means the result only ever depends on the
# current $PORT, never on what a prior run left behind.
cat > /etc/apache2/ports.conf <<EOF
Listen ${PORT}
EOF

cat > /etc/apache2/sites-available/000-default.conf <<EOF
<VirtualHost *:${PORT}>
	DocumentRoot \${APACHE_DOCUMENT_ROOT}

	ErrorLog \${APACHE_LOG_DIR}/error.log
	CustomLog \${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
EOF

exec "$@"
