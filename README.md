# 6D Mail Pro

An independent Nextcloud app for a clearer, more productive mail workspace, with Outlook/Fluent-inspired layout principles and a distinct 6D identity. No Microsoft branding or proprietary assets are included.

**0.1.0-dev.1 — experimental, not released or deployed.** M1B adds a read-only public OCS provider, exercised with synthetic IMAP mail in an isolated Nextcloud instance. The independent workspace lists accounts, folders and message summaries. It does not enhance `/apps/mail` or implement mail actions.

The product aims to distinguish unread, Important and Favorite messages immediately, improve multiple-account navigation, and support keyboard use, readable density and native light/dark themes. Unread, Important, Favorite and Focused remain separate concepts.

## Scope and boundaries

6D Mail Pro owns mail-specific presentation. Nextcloud Mail owns accounts, IMAP/SMTP, drafts, attachments, sending, message permissions and classification. Mail Pop-out retains composer/window behavior. Domain Login Branding retains hostname-specific login branding and its existing timezone compatibility. Global navigation theming is a separate product.

No AI classification, telemetry, external analytics, remote fonts, mail-content logging or external content services are introduced. The app adds no database tables, migrations, background jobs or state-changing routes. OCS mode makes authenticated same-origin GET requests to Mail; it never receives IMAP credentials.

## Compatibility

Development target: Nextcloud 33 / PHP 8.3. Locally inspected: Nextcloud 33.0.6, PHP 8.3.31, Mail 5.11.5, Mail Pop-out 1.0.2, Domain Login Branding 0.7.0. M1B runtime checks use isolated Nextcloud 33.0.6 (33.0.6.2), PHP 8.3.33 and Mail 5.11.5; companion apps and production origins remain untested. The manifest deliberately admits only Nextcloud 33 and PHP 8.3 for now.

Mail is optional at boot. Disabled, missing, group-restricted, unknown or newer Mail versions disable OCS mode; no Mail PHP classes are imported. Only 5.11.5 is marked source-inspected. Other enabled versions retain the native Mail link. Synthetic mode remains available by default. App configuration `data_provider=ocs` opts into OCS only for exact Mail 5.11.5; other versions fail closed with native handoff where available.

URLs use Nextcloud's `IURLGenerator` route methods and are checked for same-origin use. Application logic contains neither production hostname. Both Global Connect hostnames reach the same AIO service; account data should be shared, but browser sessions and local storage are origin-specific. Future user preferences must use server-side per-user settings to remain consistent across domains.

## Development

Requirements: PHP 8.3 CLI, Python 3, Node 22 (tests), Git; Composer is optional tooling. In this directory:

```bash
composer validate --strict
bash tests/run-smoke.sh
python3 scripts/package.py
```

Equivalent Composer aliases: `composer test`, `composer build`. No npm build, package.json, frontend dependencies, vendor install or transpilation is needed for the PHP/CSS scaffold. The frontend uses three plain JS files with no build dependencies. UI labels use Nextcloud translation helpers; sample content is deliberately synthetic.

Build output: `build/sixd_mail_pro-0.1.0-dev.1.tar.gz` and `.sha256`. The archive has the required `sixd_mail_pro/` directory and deterministic timestamps. It is a development artifact, not a production release. Linked engineering documentation accompanies the runtime files.

Tests exercise fallback behavior, template escaping, all eight state combinations, filters, counts and pagination. If Chrome/Chromium is installed, smoke also runs local browser checks at 390px/1440px in light/dark themes. These fixtures do not boot Nextcloud. Optional manifest XSD validation: `NEXTCLOUD_INFO_XSD=/path/to/info.xsd bash tests/run-smoke.sh`. Obtain the schema from the official Nextcloud app store. See [test plan](docs/TEST_PLAN.md) for outstanding isolated runtime checks.

## M1A synthetic preview

To preview without Nextcloud or mailbox access:

```bash
php -S 127.0.0.1:18763 -t .
# Open http://127.0.0.1:18763/tests/browser-fixture.php
# Add ?dark=1 for the local dark-theme fixture.
```

The app has two sample accounts and six folders. Select a folder, filter with All/Unread/Important/Favorite, and use Previous/Next for six-message pages. Selecting a row changes only the reading placeholder; it never marks a message read. Important derives from `$label1`, independently of seen/flagged state. Fixture counts cover each complete synthetic folder/account, not the displayed page.

Empty folder, Loading demo and Retry demo exercise explicit states; Retry demo fails once per page load and succeeds on Retry. Long, Unicode and hostile HTML-looking text is rendered as text. Open in Nextcloud Mail uses the controller-generated native landing URL; synthetic IDs are never passed into Mail. In the standalone fixture the link points to a deliberately absent local Nextcloud route.

Filtering happens client-side over finite fixtures before pagination. It is prototype filtering, not evidence of complete real-server filtering or global ordering. `SyntheticMailProvider` exposes async accounts/mailboxes/messages methods and an opaque cursor response, shared with the OCS adapter. Synthetic timestamps remain fixed UTC values.

## M1B isolated OCS runtime

Requires Docker Compose, Python 3.12+, Node 22 and Chrome/Chromium (`CHROME_BIN` may override the browser executable):

```bash
python3 tests/integration/setup.py
node tests/integration/verify.cjs
node tests/integration/browser.cjs
# Extended isolated cases:
python3 tests/integration/acceptance-fixtures.py --cold
node tests/integration/browser.cjs --cold
python3 tests/integration/runtime-cases.py
node tests/integration/browser.cjs --localhost
```

Setup reuses the running `sixd-mail-test` environment; it creates its dedicated containers, networks and volumes only when needed. Nextcloud is published at `http://127.0.0.1:18764`; PostgreSQL and GreenMail have no host ports and share an internal network. The custom image runs Nextcloud 33.0.6 on PHP 8.3 because the upstream Nextcloud image used here contains PHP 8.4. Mail is pinned to 5.11.5 with a checked archive hash. No production mounts or internet mail delivery are configured.

Log in as the ordinary synthetic user `fixture-user` with the generated test password in `~/.local/state/sixd-mail-test/credentials.env` (mode 0600, outside the repository). Never commit this file. The project drive does not enforce Unix file permissions, so credentials are stored on the home filesystem instead. Two synthetic accounts contain all eight state combinations, tied timestamps, hostile-looking text, Unicode, long labels and empty folders. Setup preserves existing fixture mail. GreenMail is disposable/in-memory; run setup after recreating it.

Mail's account sync skips ordinary folders until their caches are initialized. Setup opens their generated native Mail folder routes in a temporary browser, without selecting messages or calling private APIs. The OCS provider cannot initialize or refresh caches itself; uncached folders show a safe error. Use the app’s “Open folder in Nextcloud Mail” action, then Retry in the original tab. The error explains that initialization/refresh may be needed; it does not loop automatically. Integration/browser test tooling and downloaded third-party files are excluded from the distributable.

M1C keeps the UI in singleton mode: the tested threaded response represents only each conversation’s newest message and provides no aggregate states/counts. Delegated/read-only grants are not proven through the inspected public API. Automated keyboard/ARIA, forced-colors/reduced-motion and six-width/zoom checks are included; manual accessibility and production acceptance remain pending.

Run `node tests/integration/browser.cjs --contrast` to measure text and keyboard-focus contrast on the existing isolated instance in native light/dark message and error/retry states. This checks solid-color surfaces and excludes disabled/decorative content; it does not certify screen-reader usability or arbitrary custom themes.

OCS mode provides server-side All/Unread/Favorite filtering, authoritative folder unread counts and finite cursor pagination. Account totals are unavailable and shown as `—`. Important **row indicators** use `$label1` tags; the Important filter is disabled because the legacy server importance flag is not proven equivalent for every mailbox. Selection displays summary text only. Its generated Open in Mail link may mark the message read when the user opens it in native Mail.

See [architecture](ARCHITECTURE.md#m1b-public-ocs-contract) for schemas and pagination limits, and [validation](docs/VALIDATION.md) for measured results and remaining acceptance gates.

## Installation and support

Do not install this initialization on production. Use a separate Nextcloud 33 development instance for enable/disable and browser testing. The eventual persistent AIO copy, preflight and rollback procedure is in [INSTALLATION.md](INSTALLATION.md).

- [Architecture](ARCHITECTURE.md), [milestones](TODO.md), [discovery evidence](docs/DISCOVERY.md)
- [Future Plugins Hub publication](docs/PUBLISHING.md)
- [Support guidance](SUPPORT.md)
- Author: **IAMPMPKSAMY**, https://pmpksamy.com/
- License: **AGPL-3.0-or-later**, full text in [LICENSE](LICENSE)

Repository: [https://github.com/iampmpksamy/NextCloud_6D_Mail_Pro](https://github.com/iampmpksamy/NextCloud_6D_Mail_Pro). Report issues at [https://github.com/iampmpksamy/NextCloud_6D_Mail_Pro/issues](https://github.com/iampmpksamy/NextCloud_6D_Mail_Pro/issues).

Source is published as experimental `0.1.0-dev.1`. No release, production deployment or public Plugins Hub catalog entry is created by this source publication. Installation and usage documentation are available in this repository; no Wiki URL is advertised until its pages are initialized.
