# 6D Mail Pro

An independent Nextcloud app for a clearer, more productive mail workspace, with Outlook/Fluent-inspired layout principles and a distinct 6D identity. No Microsoft branding or proprietary assets are included.

**0.1.0-dev.1 — experimental, not released or deployed.** M1A implements an interactive, read-only synthetic mail workspace inside its own authenticated route. It displays sample accounts, folders, state labels, filters and pagination. It does not access real mail or enhance `/apps/mail`.

The product aims to distinguish unread, Important and Favorite messages immediately, improve multiple-account navigation, and support keyboard use, readable density and native light/dark themes. Unread, Important, Favorite and Focused remain separate concepts.

## Scope and boundaries

6D Mail Pro owns mail-specific presentation. Nextcloud Mail owns accounts, IMAP/SMTP, drafts, attachments, sending, message permissions and classification. Mail Pop-out retains composer/window behavior. Domain Login Branding retains hostname-specific login branding and its existing timezone compatibility. Global navigation theming is a separate product.

No AI classification, telemetry, external analytics, remote fonts, mail-content logging or external content services are introduced. No database tables, migrations, background jobs, mailbox requests or state-changing routes exist in this scaffold.

## Compatibility

Development target: Nextcloud 33 / PHP 8.3. Locally inspected: Nextcloud 33.0.6, PHP 8.3.31, Mail 5.11.5, Mail Pop-out 1.0.2, Domain Login Branding 0.7.0. These are source-inspection targets, **not a tested runtime compatibility claim**. The manifest deliberately admits only Nextcloud 33 and PHP 8.3 for now.

Mail is optional at boot. Disabled, missing, group-restricted, unknown or newer Mail versions yield a status page; no Mail PHP classes are imported. Only 5.11.5 is marked source-inspected. Other enabled versions retain the native Mail link. The synthetic workspace remains usable regardless of Mail availability; no real Mail adapter is invoked.

URLs use Nextcloud's `IURLGenerator::linkToRoute`. Application logic contains neither production hostname. Both Global Connect hostnames reach the same AIO service; account data should be shared, but browser sessions and local storage are origin-specific. Future user preferences must use server-side per-user settings to remain consistent across domains.

## Development

Requirements: PHP 8.3 CLI, Python 3, Node 22 (tests), Git; Composer is optional tooling. In this directory:

```bash
composer validate --strict
bash tests/run-smoke.sh
python3 scripts/package.py
```

Equivalent Composer aliases: `composer test`, `composer build`. No npm build, package.json, frontend dependencies, vendor install or transpilation is needed for the PHP/CSS scaffold. The frontend uses two plain JS files with no build dependencies. UI labels use Nextcloud translation helpers; sample content is deliberately synthetic.

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

Filtering happens client-side over finite fixtures before pagination. It is prototype filtering, not evidence of complete real-server filtering or global ordering. `SyntheticMailProvider` exposes async accounts/mailboxes/messages methods and an opaque cursor response, ready for a later adapter. No OCS adapter is enabled or implemented. All current timestamps are fixed synthetic UTC values.

## Installation and support

Do not install this initialization on production. Use a separate Nextcloud 33 development instance for enable/disable and browser testing. The eventual persistent AIO copy, preflight and rollback procedure is in [INSTALLATION.md](INSTALLATION.md).

- [Architecture](ARCHITECTURE.md), [milestones](TODO.md), [discovery evidence](docs/DISCOVERY.md)
- [Future Plugins Hub publication](docs/PUBLISHING.md)
- [Support guidance](SUPPORT.md)
- Author: **IAMPMPKSAMY**, https://pmpksamy.com/
- License: **AGPL-3.0-or-later**, full text in [LICENSE](LICENSE)

Repository: [https://github.com/iampmpksamy/NextCloud_6D_Mail_Pro](https://github.com/iampmpksamy/NextCloud_6D_Mail_Pro). Report issues at [https://github.com/iampmpksamy/NextCloud_6D_Mail_Pro/issues](https://github.com/iampmpksamy/NextCloud_6D_Mail_Pro/issues).

Source is published as experimental `0.1.0-dev.1`. No release, production deployment or public Plugins Hub catalog entry is created by this source publication. Installation and usage documentation are available in this repository; no Wiki URL is advertised until its pages are initialized.
