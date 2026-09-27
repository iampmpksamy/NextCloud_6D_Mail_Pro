# Architecture decision — 2026-09-09

## Decision

Use **Option A: an independent Nextcloud app with its own UI and public OCP/OCS interfaces**. Prompt 01 established the authenticated shell. M1A adds a synthetic read-only workspace; M1B adds the isolated-runtime-tested public OCS adapter. Source evidence is recorded in [discovery](docs/DISCOVERY.md).

| Option | Benefits | Limits / decision |
| --- | --- | --- |
| A — own route, supported OCP and Mail OCS APIs | Independent UI, no DOM coupling, Mail retains backend permissions, native Mail unaffected | Chosen. Public listing can support P0 exploration; mutations and global sorting are not covered by the inspected listing API. |
| B — independent app, narrowly scoped Mail integration | Can add restrained row CSS or a version-gated adapter to Mail's private HTTP endpoints | Optional later exception. Public template event does not make private selectors/APIs supported. Must pass exact-version contract tests; never traverse Vue/Pinia or rewrite the DOM. |
| C — controlled patch/fork/upstream contribution | Full control of Mail's own components, list toolbar, virtualized sorting and composer layout | Needed to replace components *inside native Mail* absent upstream extension slots, or to expose missing APIs cleanly. Separate maintained patch/fork project, pinned upstream commits and recurring rebases; no installed-source edits. |

An independent full client does not inherently require a fork, but using supported APIs alone is not yet proven sufficient for all requested features. Prefer upstream API additions over maintaining private backend coupling. A small stylesheet is never the product architecture.

## Current boundaries

`appinfo/info.xml` declares the `sixd_mail_pro.page.index` navigation route. `Application` implements OCP bootstrap with no global listeners. `PageController` renders only this app's page. `MailCompatibility` uses `IAppManager::isEnabledForUser('mail')` and `getAppVersion('mail')`; it never imports `OCA\Mail` classes or reads account credentials. Templates use escaped `p()` output and translated text; CSS is scoped to `#sixd-mail-pro`.

Only the authenticated GET has `NoCSRFRequired`, because it renders a landing page and performs no mutation. It has `NoAdminRequired`, not `PublicPage`. Future mutations must retain Nextcloud CSRF checks and per-user authorization. No tables, settings writes, background jobs or HTML mail rendering are implemented. OCS mode reads only account, mailbox and summary listings as the current browser user.

`IURLGenerator::linkToRoute('mail.page.index')` produces native Mail navigation without a fixed origin. The native page route is a cross-app dependency; recheck it on Mail upgrades. Both domains use one backend, while authentication cookies/local storage remain per-origin. Future density/filter preferences must be per-user on the server, not per-host localStorage.

## M1A provider and UI boundary

`js/mail-provider.js` supplies `SyntheticMailProvider`; `js/workspace.js` owns only DOM beneath `#sixd-mail-pro`. The template loads these plain scripts with Nextcloud's asset helper. No UI framework, Mail DOM access, storage or mutation is introduced. OCS transport lives separately in `js/ocs-provider.js`.

Provider contract: async `listAccounts()` → account records with unread counts; `listMailboxes(accountId)` → folder records with unread counts; `listMessages({ mailboxId, filter, cursor, limit })` → `{ items, nextCursor }`. Normalized rows include identity, sender, subject, preview, ISO date and independent unread/important/favorite booleans. Synthetic IDs are never native Mail IDs. The fixture normalizer uses `flags.seen`, `flags.flagged` and `$label1` tags. The OCS provider independently validates and normalizes actual 5.11.5 responses; raw records are not exposed to the UI.

Fixture filtering runs over finite client-side data before pagination, without claiming server-complete behavior. Counts describe the fixture mailbox/account, never a page. UI cursor history resets on folder/filter changes; request sequence checks discard stale results. Slow and fail-once folders test loading/error recovery. Row selection leaves all source flags unchanged. Rendering uses DOM creation and `textContent`, never HTML interpretation. Native Mail handoff opens its landing route, not a synthetic message.

## Integration classification

| Class | Evidence / integration | Treatment |
| --- | --- | --- |
| A — officially exposed | OCP bootstrap, controller DI, authentication middleware, TemplateResponse, IURLGenerator, IAppManager, asset and l10n APIs | Used now; keep within manifest Nextcloud/PHP bounds. |
| A — documented Mail HTTP surface | Installed `openapi.json`: OCS account list, mailbox list, mailbox message list, individual message/raw/attachment and send | Account/mailbox/summary listing tested in isolation as the current user; OCS headers and schema checks enforced. Individual content, attachments and send are unused. |
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

## OCS scope and limits

Under generated OCS base `/apps/mail`: `account/list`, `ocs/mailboxes?accountId=…`, `ocs/mailboxes/{mailboxId}/messages`. The message list accepts cursor/filter/limit/view, clamps limit to 1–100, and fixes newest-first order. Always specify a finite limit. `singleton` versus `threaded` changes row semantics; do not mix thread counts and message counts.

`MailboxesApiController` resolves delegated account/mailbox ownership before accessing Mail data. Preserve those permission boundaries. Do not proxy as an administrator or query Mail's database. Unknown account IDs, missing data, 401/403/404, expired sessions and schema changes require safe fallback.

Public listing does not provide arbitrary unread-first or important-first server sorting. Sorting a fetched page is not a globally sorted inbox. P1 needs a supported upstream API extension or an explicitly maintained adapter. Public send exists but does not provide a drop-in native composer; use native Mail handoff first. Do not render raw HTML or fetch remote message resources until a separate content-security design is complete.

## Upgrade and fallback

Manifest target is restricted to Nextcloud 33/PHP 8.3. Exact Mail 5.11.5 source inspection is displayed honestly; other enabled versions show unverified status with Open Mail, disabled/restricted versions show unavailable, inspection exceptions show unknown. OCS mode is opt-in through `IConfig` app key `data_provider=ocs`, and gated to exact Mail 5.11.5. The default remains synthetic.

The OCS adapter enforces the version allowlist, schema checks, finite pagination, timeout/error behavior and contract suite described below. Unknown versions default to native Mail handoff. A failing app page must not inject into or modify `/apps/mail`. Disabling 6D Mail Pro removes only its navigation/page; Mail data stays owned by Mail. Recheck both domains and Mail Pop-out on every supported upgrade.

## M1B public OCS contract

Verified on isolated Nextcloud 33.0.6 / PHP 8.3.33 / Mail 5.11.5. `PageController` uses public OCP `IConfig`, `IAppManager` and `IURLGenerator`; it fetches no mail on the server. Generated OCS route names are `mail.accountApi.list`, `mail.mailboxesApi.list` and `mail.mailboxesApi.listMessages` (camelCase). Native message handoff uses `mail.page.thread` with `mailboxId` and `id`. Nextcloud supplies the deployment prefix. The controller retains the generated path/query from the absolute OCS helper so requests resolve against the current origin; the browser also rejects off-origin URLs and redirects.

| GET endpoint tested | Public response → UI model |
| --- | --- |
| `/ocs/v2.php/apps/mail/account/list` | `id`, `email` → string ID, name/address; unread `null` because no authoritative account count exists |
| `/ocs/v2.php/apps/mail/ocs/mailboxes?accountId=…` | `databaseId`, `accountId`, `displayName`/`name`, `unread` → folder ID, owner, label, count; base64 `id` is not the database ID |
| `/ocs/v2.php/apps/mail/ocs/mailboxes/{id}/messages` | `databaseId`, `mailboxId`, `from[].label/email`, `subject`, `previewText`, `dateInt`, `flags`, `tags` → summary identity, text, ISO UTC date/UNIX timestamp, independent state booleans and native URL |

The response must have `ocs.meta.statuscode` 100/200 and an array `ocs.data`. Requests use `Accept: application/json`, `OCS-APIRequest: true`, the Nextcloud request token when available, same-origin session credentials, no-store caching and a ten-second abort timeout. HTTP 401/403/404, other errors, malformed responses, disabled/unverified Mail and transport failures produce generic UI messages. Raw errors, tokens and backend objects are not rendered or logged by the app. In the tested cross-user mailbox case, Mail returns HTTP 500/OCS 996; this is treated as a generic failure, not a successful empty mailbox. Mail retains ownership checks; no admin proxy or database access exists.

`unread = !flags.seen`, `favorite = flags.flagged`, and `important = Object.values(tags).some(tag => tag.imapLabel === '$label1')`. Empty tags are `[]`; populated tags can be objects keyed by IMAP label. All eight combinations were seeded independently. A contract test explicitly makes `flags.important` disagree with tags and verifies that tags win. The isolated classifier is disabled for deterministic fixtures. `is:important` matched tagged fixtures, but it filters a legacy stored flag: classifier/legacy disagreement and completeness are not established. Therefore the OCS Important filter is withheld; synthetic Important filtering and OCS row indicators remain available. Priority Inbox and classifier output are not new product states.

All/Unread/Favorite use the public server filter parameter (empty, `is:unread`, `is:starred`) before pagination. Every request uses `view=singleton`. Account/folder changes reset cursor history. Only folder counts returned by Mail are displayed; page length is never a mailbox total.

Mail's cursor is an **exclusive UNIX timestamp**, not a message ID. To preserve equal-timestamp rows, the adapter revisits the boundary second with `cursor=timestamp+1`, overfetches the page plus known boundary IDs and one lookahead, then removes seen IDs. Pages are capped at 50, HTTP limits at 100; UI pages contain six rows. Tests traverse equal-timestamp pairs without skipped/duplicate rows. An oversized timestamp group fails closed with native Mail guidance instead of silently skipping messages. Concurrent mailbox changes are not a snapshot guarantee. Newest-first is the only implemented order.

OCS listing requires Mail's existing cache. Account sync initializes Inbox but may skip ordinary folders; test setup warms native folder pages without message selection. 6D never invokes private sync endpoints. A cold or stale cache requires native Mail refresh and retry; cached data is not claimed to be live IMAP state. Threads, delegated-account behavior, production origins, subdirectory deployments and companion app regressions remain later gates.

## M1C acceptance decisions

**Delegation:** the 5.11.5 public account response includes `isDelegated`; listing controllers resolve delegated ownership. However, grant/revoke routes are `/api/delegations/...`, absent from `openapi.json`'s public surface. A public grant/read-only-rights provisioning contract is **“Not available/proven through inspected public Mail API.”** No private route, Mail class, Pinia state or database query was used to create a delegate. This does not claim native Mail lacks delegation. The tested outsider sees no accounts, receives HTTP 404 for another user's mailbox listing and HTTP 500/OCS 996 for its message listing; the provider makes one GET per call and never retries as admin.

**Threads:** an isolated Conversations folder contains A (read/unread/read), B (older Important, newest Favorite), and singleton C (unread/Important/Favorite). `view=singleton` returns six messages; `view=threaded` returns three newest-message representatives ordered C, B, A. `databaseId`, `dateInt`, sender, subject, flags and tags all come from that newest message. `threadRootId` is the root Message-ID string, not the integer message database ID used in native routes. A's representative is read despite its unread middle message; B's representative has no Important tag despite its older tagged message. No thread count/aggregate-state field is returned. The UI formally remains singleton-only: mapping these representatives as complete conversation states would conceal unread/Important messages. Handoff uses the representative's message ID; tests validate generated URLs without opening message bodies.

**Cache recovery:** `mail.page.mailbox` generates a per-folder route. The normalized mailbox holds only its checked same-origin `nativeMailUrl`. A load failure with server/network/timeout/malformed response explains that Mail **may** need to initialize/refresh the folder; it does not diagnose every 500 as a cache miss. The UI offers a new-tab “Open folder in Nextcloud Mail” link and Retry, keeps the chosen account/folder/filter, and performs no automatic polling or private sync calls. Authentication/access denials retain distinct generic guidance. Recovery links disappear when switching/loading or after success. Native Mail performs initialization through its normal folder page; no message is selected. Cached successful responses are not claimed to be a live snapshot or detect all staleness.

**Accessibility:** account sections are named by headings; message loading/error feedback is a described live status; pagination has a live page status. State badges include Read/Unread, Important and Favorite text. Long folder labels wrap. Browser acceptance traverses every visible enabled app control in DOM order, including recovery/Retry and handoff, activates Enter/Space, verifies visible focus and can leave the app. Accessibility-tree assertions, native forced-colors/reduced-motion emulation and viewport/zoom checks supplement (not replace) a manual screen-reader and contrast audit.

**Routes and compatibility:** controller contracts cover supplied generated paths at root and `/subdirectory`, with/without `index.php`, preserving OCS query strings while discarding the configured absolute origin. Exact-version gating prevents OCS route generation for disabled/unsupported Mail. Unsupported-version testing uses the real controller with public-interface doubles; the installed Mail source/version is never patched. Real loopback and front-controller results are recorded in VALIDATION.md. Important filtering stays disabled; message mutations and production acceptance are outside M1C.

**Contrast follow-up:** inset keyboard focus uses each control's text color, including the selected filter's contrasting text. The scoped `!important` outline overrides Nextcloud core's own important input outline; it also distinguishes row focus from the accent-colored selection outline. A dedicated browser measurement checks native light/dark text and focus against composited solid backgrounds. Manual screen-reader and custom-theme review remain separate gates.
