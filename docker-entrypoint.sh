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

# Configure Apache to listen on Render's dynamic PORT variable if provided
if [ -n "$PORT" ]; then
    echo "Configuring Apache to listen on port $PORT"
    sed -i "s/80/$PORT/g" /etc/apache2/ports.conf /etc/apache2/sites-available/*.conf
fi

exec "$@"
