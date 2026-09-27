FROM nextcloud:33.0.6-apache AS source
FROM php:8.3-apache-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends \
    rsync bzip2 libpq-dev libzip-dev libicu-dev libpng-dev libjpeg62-turbo-dev libfreetype6-dev libonig-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j2 gd intl mbstring zip pdo_pgsql bcmath exif opcache \
    && a2enmod rewrite headers env dir mime \
    && rm -rf /var/lib/apt/lists/*
RUN pecl install APCu-5.1.28 && docker-php-ext-enable apcu \
    && echo "apc.enable_cli=1" > /usr/local/etc/php/conf.d/apcu-cli.ini
RUN docker-php-ext-install pcntl
COPY --from=source /usr/src/nextcloud /usr/src/nextcloud
COPY --from=source /entrypoint.sh /entrypoint.sh
COPY --from=source /upgrade.exclude /upgrade.exclude
COPY --from=source /var/www/html /var/www/html
ENV NEXTCLOUD_UPDATE=1
ENTRYPOINT ["/entrypoint.sh"]
CMD ["apache2-foreground"]
