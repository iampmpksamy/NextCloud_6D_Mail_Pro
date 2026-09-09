# Source discovery summary

The development baseline inspected was Nextcloud 33.0.6, PHP 8.3 and Mail 5.11.5. These are inspected versions, not runtime compatibility certification. Machine-specific configuration, container inventories and operational paths are retained privately and excluded from this public summary.

## Conventions

App ID `sixd_mail_pro`, namespace `OCA\SixdMailPro`, author IAMPMPKSAMY, license AGPL-3.0-or-later. Companion apps use snake_case IDs and native Nextcloud PHP bootstrap. The initial `0.1.0-dev.1` version denotes unreleased experimental work.

Mail Pop-out owns composer/window behavior. Domain Login Branding owns hostname-specific login branding. The new app owns only its independent mail workspace route.

## Mail source evidence

Installed Mail PHP, routes, compiled assets, OpenAPI and source maps were inspected before the matching upstream [v5.11.5 source](https://github.com/nextcloud/mail/tree/v5.11.5). No Mail source is bundled into this app; the standard AGPL license text is included.

The inspected frontend uses Vue 2.7, Vue Router 3 and Pinia 2. This app uses none of their private instances. Public OCS account/mailbox/message listing is the candidate future integration surface. Important row indicators derive from `$label1` tags; unread and Favorite use independent seen/flagged state. Existing Priority Inbox and local classification must be considered before adding overlapping features.

See [ARCHITECTURE.md](../ARCHITECTURE.md) for exact component, API, state, pagination and fallback boundaries. No production mailboxes were read during development. Production configuration, credentials, logs and private data must never be published.

## Deployment boundary

Use a persistent custom_apps directory and generated Nextcloud URLs. Test both origins of a multi-domain installation independently; sessions and browser storage are origin-specific. Runtime code contains no fixed deployment hostname. No production installation is authorized by repository publication.
