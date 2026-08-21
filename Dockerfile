# Stage 1: Build Inertia/React frontend assets with Node & Vite
FROM node:20-alpine AS frontend-builder
WORKDIR /app

# Copy package configuration files
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# Copy application source files required for building assets
COPY resources resources
COPY vite.config.js postcss.config.js* tailwind.config.js* ./
COPY public public

# Build frontend production bundle into public/build
RUN npm run build

# Stage 2: PHP Apache production environment (PHP 8.4 required for Laravel 13)
FROM php:8.4-apache

# Install system dependencies and PHP extensions required by Laravel & Cashier/Inertia
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libzip-dev \
    libonig-dev \
    libicu-dev \
    libpq-dev \
    zip \
    unzip \
    git \
    curl \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-configure intl \
    && docker-php-ext-install pdo_mysql pdo_pgsql mbstring exif pcntl bcmath gd zip intl opcache \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Enable Apache mod_rewrite module for Laravel routing
RUN a2enmod rewrite

# This image uses mod_php (PHP as an Apache module, not PHP-FPM — there's
# no proxy_fcgi/fpm config anywhere here), which is not thread-safe and
# requires mpm_prefork specifically. The apt-get install above still ends
# up with mpm_event enabled alongside it: Debian's apache2 package
# defaults to mpm_event, and installing further apt packages can re-run
# apache2's postinst trigger, re-enabling it even after an earlier
# a2dismod in this same image (confirmed — a plain `a2dismod mpm_event;
# a2enmod mpm_prefork` here was NOT sufficient and still deployed broken).
# Remove the competing MPMs' enabling symlinks directly instead of relying
# on a2dismod's exit behavior, then verify with configtest so a conflict
# fails the build here — visibly, at build time — rather than surfacing
# only as a crash loop after Render deploys it.
RUN rm -f /etc/apache2/mods-enabled/mpm_event.load /etc/apache2/mods-enabled/mpm_event.conf \
           /etc/apache2/mods-enabled/mpm_worker.load /etc/apache2/mods-enabled/mpm_worker.conf \
    && a2enmod mpm_prefork \
    && apache2ctl configtest

# Configure Apache DocumentRoot to point to Laravel's public folder
ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf \
    && sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

# Copy Composer binary from official composer image
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
ENV COMPOSER_ALLOW_SUPERUSER=1

WORKDIR /var/www/html

# Copy application source code
COPY . /var/www/html

# Copy built frontend assets from Stage 1
COPY --from=frontend-builder /app/public/build /var/www/html/public/build

# Install PHP production dependencies without running artisan scripts during build
RUN composer install --no-dev --optimize-autoloader --no-interaction --no-scripts --ignore-platform-reqs

# Set correct ownership and permissions for storage and bootstrap/cache
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Copy entrypoint script and ensure executable permissions
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Debug: print the FINAL loaded-module list as the very last build step, so
# the build log shows exactly what Apache will see at container start — not
# just what it looked like right after the earlier MPM fix, in case anything
# between here and there (composer install, chmod, etc.) changed it again.
# Temporary — remove once the MPM issue is confirmed resolved.
RUN apache2ctl -M

# Expose port 80 (Render dynamically overrides PORT at runtime)
EXPOSE 80

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["apache2-foreground"]
