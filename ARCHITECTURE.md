# Architecture decision — 2026-09-09

## Decision

Use **Option A: an independent Nextcloud app with its own UI and public OCP/OCS interfaces**. Prompt 01 established the authenticated shell. M1A adds a synthetic read-only workspace; a real OCS adapter remains deferred to isolated testing. Source evidence is recorded in [discovery](docs/DISCOVERY.md).

| Option | Benefits | Limits / decision |
| --- | --- | --- |
| A — own route, supported OCP and Mail OCS APIs | Independent UI, no DOM coupling, Mail retains backend permissions, native Mail unaffected | Chosen. Public listing can support P0 exploration; mutations and global sorting are not covered by the inspected listing API. |
| B — independent app, narrowly scoped Mail integration | Can add restrained row CSS or a version-gated adapter to Mail's private HTTP endpoints | Optional later exception. Public template event does not make private selectors/APIs supported. Must pass exact-version contract tests; never traverse Vue/Pinia or rewrite the DOM. |
| C — controlled patch/fork/upstream contribution | Full control of Mail's own components, list toolbar, virtualized sorting and composer layout | Needed to replace components *inside native Mail* absent upstream extension slots, or to expose missing APIs cleanly. Separate maintained patch/fork project, pinned upstream commits and recurring rebases; no installed-source edits. |

An independent full client does not inherently require a fork, but using supported APIs alone is not yet proven sufficient for all requested features. Prefer upstream API additions over maintaining private backend coupling. A small stylesheet is never the product architecture.

## Current boundaries

`appinfo/info.xml` declares the `sixd_mail_pro.page.index` navigation route. `Application` implements OCP bootstrap with no global listeners. `PageController` renders only this app's page. `MailCompatibility` uses `IAppManager::isEnabledForUser('mail')` and `getAppVersion('mail')`; it never imports `OCA\Mail` classes or reads account credentials. Templates use escaped `p()` output and translated text; CSS is scoped to `#sixd-mail-pro`.

Only the authenticated GET has `NoCSRFRequired`, because it renders a landing page and performs no mutation. It has `NoAdminRequired`, not `PublicPage`. Future mutations must retain Nextcloud CSRF checks and per-user authorization. No tables, settings writes, background jobs, mail reads, HTML mail rendering or network calls are implemented.

`IURLGenerator::linkToRoute('mail.page.index')` produces native Mail navigation without a fixed origin. The native page route is a cross-app dependency; recheck it on Mail upgrades. Both domains use one backend, while authentication cookies/local storage remain per-origin. Future density/filter preferences must be per-user on the server, not per-host localStorage.

## M1A provider and UI boundary

`js/mail-provider.js` supplies `SyntheticMailProvider`; `js/workspace.js` owns only DOM beneath `#sixd-mail-pro`. The template loads these plain scripts with Nextcloud's asset helper. No UI framework, Mail DOM access, network fetch, storage or mutation is introduced.

Provider contract: async `listAccounts()` → account records with unread counts; `listMailboxes(accountId)` → folder records with unread counts; `listMessages({ mailboxId, filter, cursor, limit })` → `{ items, nextCursor }`. Normalized rows include identity, sender, subject, preview, ISO date and independent unread/important/favorite booleans. Synthetic IDs are never native Mail IDs. The fixture normalizer uses `flags.seen`, `flags.flagged` and `$label1` tags. A later OCS provider must normalize/authenticate/validate its own responses; raw OCS compatibility is not claimed.

Fixture filtering runs over finite client-side data before pagination, without claiming server-complete behavior. Counts describe the fixture mailbox/account, never a page. UI cursor history resets on folder/filter changes; request sequence checks discard stale results. Slow and fail-once folders test loading/error recovery. Row selection leaves all source flags unchanged. Rendering uses DOM creation and `textContent`, never HTML interpretation. Native Mail handoff opens its landing route, not a synthetic message.

## Integration classification

| Class | Evidence / integration | Treatment |
| --- | --- | --- |
| A — officially exposed | OCP bootstrap, controller DI, authentication middleware, TemplateResponse, IURLGenerator, IAppManager, asset and l10n APIs | Used now; keep within manifest Nextcloud/PHP bounds. |
| A — documented Mail HTTP surface | Installed `openapi.json`: OCS account list, mailbox list, mailbox message list, individual message/raw/attachment and send | Candidate read-only data source; authenticate as current user and honor OCS headers. OpenAPI's generic mailbox response types still require runtime validation. |
| B — reasonably stable convention | Mail page route; semantic IMAP seen/flagged concepts; Nextcloud CSS variables | Verify per release; no guarantee of Mail frontend embedding. |
| C — internal/fragile | Mail `/api/messages`, flags/tags mutations, Pinia stores, Vue components, DOM classes, priority query tokens, OCA Mail services/events | No direct dependency now. Source and contract audits required before introducing an adapter. |

Mail's PHP events include message flags, sent/deleted mail, drafts and synchronization. They describe backend lifecycle, not UI extension slots. Source inspection found no documented plugin registration mechanism for replacing Envelope or its list toolbar. `BeforeTemplateRenderedEvent` is a public Nextcloud event, but injections into Mail's component DOM remain private integration.

## Mail 5.11.5 frontend

Vue 2.7 (`^2.7.16`), Vue Router 3 (`^3.6.5`), Pinia 2 (`^2.3.1`), webpack. These are upstream package ranges, not independently resolved package-lock versions. `src/main.js` mounts the app; `src/router.js` uses history routing under generated `/apps/mail/`.

Main hierarchy: `App.vue` / `views/Home.vue`; `Navigation.vue` → `NavigationAccount.vue` and mailbox entries; `Mailbox.vue` → `EnvelopeList.vue` → `Envelope.vue` → `EnvelopeSkeleton.vue`. Reading uses `MailboxThread.vue`, `Thread.vue`, `ThreadEnvelope.vue` and message components. `Composer.vue` and its floating/modal hosts retain native drafts, attachments, rich text, sending and minimizing. Stores live in `src/store/mainStore.js`, actions/getters, outboxStore and mailFilterStore. HTTP calls live in `src/service/`.

The deployed sourcemap confirms the `.envelope` row's `.seen` condition uses `data.flags.seen`, an unread bullet already has an accessible label, and Important/Favorite have separate icons. Generated CSS scopes are not contracts.

## State mapping

| Product state | Inspected source | Implementation rule |
| --- | --- | --- |
| Unread | `!data.flags.seen` in Envelope | Independent indicator, sender/subject weight, accent and timestamp; never derived from Important/Favorite. |
| Favorite | `data.flags.flagged` | Separate star and accessible label; preserve seen state. |
| Important row indicator | `getEnvelopeTags(databaseId).some(tag => tag.imapLabel === '$label1')` | Normalize tag membership, not just the legacy serialized `flags.important`. |
| Backend importance filter | `FilterStringParser`: `is:important` / `is:is_important` → `Flag::IMPORTANT` | Verify synchronization of tag, stored flag and classifier output with synthetic data before shipping. |
| Priority sections | `is:pi-important` and `is:pi-other` | Parser currently checks importance / its negation. A source comment calls it “important and unread,” but implementation does not impose unread here. Do not infer behavior from that comment. |
| Focused | No separate product state defined yet | Do not alias automatically to unread, Favorite or Important; defer naming and policy. |
| Counts / thread states | Mail mailbox state and threaded/singleton API view | Use authoritative counts; define aggregation. Never show the number on a loaded page as a mailbox total. |

Mail already has `ImportanceClassifier`, rule fallback, feature extraction and persistence. Training runs locally, with user/default settings; actual users' preferences were not inspected. There is no reason to introduce another classifier in initialization. Snooze, follow-up tags and quick actions also already exist.

## OCS limits to prove in M1

Under generated OCS base `/apps/mail`: `account/list`, `ocs/mailboxes?accountId=…`, `ocs/mailboxes/{mailboxId}/messages`. The message list accepts cursor/filter/limit/view, clamps limit to 1–100, and fixes newest-first order. Always specify a finite limit. `singleton` versus `threaded` changes row semantics; do not mix thread counts and message counts.

`MailboxesApiController` resolves delegated account/mailbox ownership before accessing Mail data. Preserve those permission boundaries. Do not proxy as an administrator or query Mail's database. Unknown account IDs, missing data, 401/403/404, expired sessions and schema changes require safe fallback.

Public listing does not provide arbitrary unread-first or important-first server sorting. Sorting a fetched page is not a globally sorted inbox. P1 needs a supported upstream API extension or an explicitly maintained adapter. Public send exists but does not provide a drop-in native composer; use native Mail handoff first. Do not render raw HTML or fetch remote message resources until a separate content-security design is complete.

## Upgrade and fallback

Manifest target is restricted to Nextcloud 33/PHP 8.3. Exact Mail 5.11.5 source inspection is displayed honestly; other enabled versions show unverified status with Open Mail, disabled/restricted versions show unavailable, inspection exceptions show unknown. No enhancement adapter is enabled even for the inspected version.

Before adding an adapter: define a tested version allowlist, schema validation, timeout/error behavior and contract suite. Unknown versions default to native Mail handoff. A failing app page must not inject into or modify `/apps/mail`. Disabling 6D Mail Pro removes only its navigation/page; Mail data stays owned by Mail. Recheck both domains and Mail Pop-out on every supported upgrade.
