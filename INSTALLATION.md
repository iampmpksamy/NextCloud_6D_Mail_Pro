# Installation and future AIO deployment

**6D Mail Pro remains experimental and is not a stable release. An explicitly authorized internal read-only beta deployment was completed on 2026-09-27; the procedure below remains a controlled runbook, not standing authorization for future deployments.** The deployed artifact and evidence are recorded in [validation evidence and remaining gates](docs/VALIDATION.md). Test in a separate Nextcloud 33/PHP 8.3 environment first. Do not mount production volumes into a test instance.

## Development installation

Run local tests and `python3 scripts/package.py`, then extract the archive into the isolated instance's custom_apps directory. The installed directory must be `sixd_mail_pro`, not `6D Mail Pro`. Enable using that isolated instance's `occ app:enable sixd_mail_pro`. Verify login enforcement, navigation, all availability states and disable fallback. No composer/vendor installation is required by runtime.

## Future production preflight

Obtain explicit approval after review of an immutable artifact, completed isolated tests and rollback plan. Confirm the running container names and volume paths again; do not rely on this dated discovery alone.

```bash
git status --short
git branch --show-current
git remote -v
docker exec -u www-data nextcloud-aio-nextcloud php occ status
docker exec -u www-data nextcloud-aio-nextcloud php occ app:list
docker inspect nextcloud-aio-nextcloud --format '{{json .Mounts}}'
docker exec nextcloud-aio-nextcloud test ! -e /var/www/html/custom_apps/sixd_mail_pro
```

The last command is a mandatory fresh-install guard: if it fails, stop and prepare an approved update/backup plan instead of overwriting an existing app. Confirm Mail version is explicitly covered by isolated tests; app compatibility targets alone are insufficient. Confirm both HTTPS status URLs and the baseline Mail/composer work for an approved test user. Record enabled state and versions without recording message contents, cookies or credentials.

## Backup and build

Confirm an operator-managed, restorable Nextcloud backup exists and that the application volume is covered. Store backups outside the repository with restricted permissions; never dump config or database content into source. For a first install there is no previous app directory; rollback is disable-only. For updates, back up the existing app directory and retain the exact previous artifact before any replacement. This scaffold has no migrations or user data, but future releases may require a different rollback plan.

```bash
composer validate --strict
bash tests/run-smoke.sh
python3 scripts/package.py
```

Review `tar -tzf build/sixd_mail_pro-0.1.0-dev.1.tar.gz` and verify its adjacent checksum from the build directory using `sha256sum -c`. For later versions use the actual reviewed artifact/version. No tag, GitHub release or stable claim is implied by packaging.

## Future approved fresh install

After the fresh-install guard and explicit production approval, use a new host staging directory. These commands copy reproducible source files into the already verified persistent AIO HTML volume, not an ephemeral container layer:

```bash
sixd_stage=$(mktemp -d /tmp/sixd-mail-pro-install.XXXXXX)
tar -xzf build/sixd_mail_pro-0.1.0-dev.1.tar.gz -C "$sixd_stage"
docker exec nextcloud-aio-nextcloud test ! -e /var/www/html/custom_apps/sixd_mail_pro
docker cp "$sixd_stage/sixd_mail_pro" nextcloud-aio-nextcloud:/var/www/html/custom_apps/
docker exec nextcloud-aio-nextcloud chown -R www-data:www-data /var/www/html/custom_apps/sixd_mail_pro
docker exec -u www-data nextcloud-aio-nextcloud php occ app:enable sixd_mail_pro
docker exec -u www-data nextcloud-aio-nextcloud php occ app:getpath sixd_mail_pro
```

Run each command with failure checking; do not proceed after a failed guard/copy. `custom_apps` maps to `/var/lib/docker/volumes/nextcloud_aio_nextcloud/_data/custom_apps` on the inspected machine. Use Docker's volume-backed copy path rather than manually editing Docker-managed storage. Source stays in the development checkout and approved Git history. Never copy `.git`, tests, secrets or node_modules into runtime.

No container restart, upgrade, config change, database command or blanket cache flush is required for this initial fresh install. Reload the browser first. If route/assets or OPcache behavior requires additional operations, diagnose and obtain approval for the concrete action rather than running routine `occ upgrade` or restarting AIO. An update requires its own plan; do not overlay versions blindly.

## Smoke checks — both origins

Replace the example hostnames below with the two approved deployment origins. For each of `https://cloud-a.example.invalid` and `https://cloud-b.example.invalid`:

1. Confirm `/status.php` stays healthy and anonymous `/apps/sixd_mail_pro/` requires authentication.
2. Sign in independently with the approved test user. Confirm app navigation, preview/status and Open Mail link stay on the same origin (including any configured index.php/subdirectory routing).
3. Verify `/apps/mail` still lists the same approved synthetic messages/accounts, native reading, filters, unread counts and preferences; no real-mail mutations for testing.
4. Check Mail Pop-out using a synthetic draft: drag, resize, detach, return, save, attachments, minimize, popup-blocked fallback. Test send only against an isolated test mail sink, not live recipients.
5. Verify login branding is correct for each hostname, native app shell is unchanged, no CSP errors or missing assets, and app CSS affects only its own root.
6. Check light/dark, keyboard, narrow widths and app disable behavior. Follow docs/TEST_PLAN.md.

## Rollback

If the approved deployment fails, disable only this new app:

```bash
docker exec -u www-data nextcloud-aio-nextcloud php occ app:disable sixd_mail_pro
```

Reload both origins and verify native Mail and Mail Pop-out. Leave disabled files in place for diagnosis; no file deletion, app removal, database rollback or AIO restart is required for this scaffold. For a later update, disable first and restore the explicitly backed-up app directory/version under an approved procedure. Never roll back the shared database or restore an entire HTML volume merely to remove this initial UI scaffold.
