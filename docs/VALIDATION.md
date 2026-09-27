# Initialization validation — 2026-09-09

- Composer metadata: `composer validate --strict` passes.
- PHP syntax: all app/test PHP files pass with host PHP 8.3.6.
- Availability/version handling: eight cases pass (missing/disabled, inspected version, future patch/major, prerelease, empty version, exception).
- Template rendering: four status/escaping cases pass; unavailable/unknown omit the Mail link.
- XML/SVG/JSON and version/changelog checks pass.
- Official Nextcloud app manifest XSD passes using existing PHP DOM in memory. No live app bootstrap or production file writes were needed. Host DOM/lxml are unavailable; optional XSD checks require a validator with DOM support.
- Artifact built twice from identical source and SHA-256 compared; deterministic archive paths and allowlist reviewed. Build artifacts are Git-ignored.
- Source whitespace/diff and relative documentation links checked; no credentials, real mail, production configuration, vendor, node_modules or upstream code bundled. The standard license text is included.

The initialization results above are **local scaffold validation only**. At initialization, no full Nextcloud boot, app enable/disable, authenticated browser, contrast/screen-reader, real Mail integration or dual-origin user acceptance test was performed. These remain explicit M1/runtime gates in TEST_PLAN.md. Source inspection and HTTP status checks are not runtime certification.


## M1B isolated runtime — 2026-09-10

- Dedicated `sixd-mail-test-nextcloud`, `sixd-mail-test-db`, `sixd-mail-test-mail`; separate Compose volumes and internal mail/database network. Only Nextcloud publishes `127.0.0.1:18764`. No production containers, data, credentials, configuration, domains or proxy were accessed/changed by M1B.
- Runtime: Nextcloud **33.0.6** (`33.0.6.2`), **PHP 8.3.33**, **Mail 5.11.5**, PostgreSQL 17 and GreenMail 2.1.13. A custom PHP 8.3 image uses official Nextcloud source/entrypoint; the upstream Nextcloud image examined contained PHP 8.4. The app manifest stays Nextcloud 33/PHP 8.3, version `0.1.0-dev.1`, experimental.
- Mail release archive SHA-256: `58dacb416ac7dfa1b711c7a5c15d502ca2d5f9f0b45253a0597eb39d29eaf881`. Downloads and browser profiles are excluded from source publication/packages. The project drive reports mode 0775 even after chmod; test credentials were moved to `~/.local/state/sixd-mail-test/credentials.env` on the home filesystem with enforced mode 0600.
- Public account, mailbox and singleton summary GETs passed as ordinary `fixture-user`. Exact endpoints/schema/state mappings are in [ARCHITECTURE.md](../ARCHITECTURE.md#m1b-public-ocs-contract). Two accounts expose authoritative folder counts; account totals remain unavailable.
- Each deterministic Fixtures folder has 24 messages, 12 unread, 12 Favorite and 12 tagged Important; all eight combinations pass. Equal timestamps in pairs traverse five-row test pages completely without duplicate IDs. Unicode, long sender/subject, HTML-looking text and empty folders pass.
- `is:unread` and `is:starred` return complete expected sets. `is:important` matched tagged fixtures with classification disabled, but does not prove equivalence across legacy/classifier state. OCS Important filtering is disabled; row tags remain correct even when a contract fixture's legacy flag disagrees. No Priority Inbox or classifier integration is claimed.
- Invalid account/mailbox requests fail closed; anonymous OCS access returns 401. The unrelated ordinary user's mailbox request returns HTTP **500 / OCS 996**, an upstream behavior; the adapter exposes no rows or backend error details. Mock contracts separately exercise 403/404 and other malformed/error/timeout cases.
- Mail account sync does not initialize every ordinary folder cache. Setup opens native generated folder routes without message selection, then waits for successful public OCS listing. Uninitialized caches yield safe app errors; no private sync adapter or direct Mail database access was added.

- Authenticated browser smoke passed in Chrome **153.0.8010.36**, Node **22.23.2**: account/folder switching, All/Unread/Favorite filters, page reset/next page, safe summary handoff, hostile escaping, empty/loading/error/retry and keyboard focus. At both 390px and 1440px the native light/dark backgrounds changed from `rgb(255, 255, 255)` to `rgb(23, 23, 23)` with no horizontal overflow. A real account-label wrapping issue at 390px was fixed.
- Ordinary `fixture-outsider` sees the no-account state. Disabling **Mail only in the isolated test instance** produced the unavailable state and zero OCS requests; Mail 5.11.5 was restored immediately afterward.

- Final validation commands: `composer validate --strict`, `bash tests/run-smoke.sh`, isolated OCS/browser checks, package reproducibility, relative documentation links, generated-secret exclusion and `git diff --check`. Results are verified locally; nothing was committed or pushed.

Remaining gates: complete Important server filtering, delegated/read-only shares, thread aggregation, oversized equal-timestamp groups (bounded failure by design), concurrent-change snapshot behavior, manual accessibility/contrast, intermediate/large widths and zoom, subdirectory routing, companion apps and dual-production-origin acceptance. No release, production deployment, commit or push is part of M1B.


## M1C extended read-only acceptance — 2026-09-10

The existing M1B containers/runtime and uncommitted work were reused. Production was untouched; no Mail private API, Mail database query, Vue/Pinia access, message mutation, send, commit or push was performed.

- **Delegation:** exact release OpenAPI exposes account/mailbox/message listing, not delegation grant/revoke. The latter exists only under `/api/delegations/...` and was not called. Delegated/read-only provisioning: **“Not available/proven through inspected public Mail API.”** Owner and outsider boundaries pass: no outsider accounts, HTTP 404 for owner folder listing, HTTP 500/OCS 996 for owner message listing, and exactly one GET per call without admin retry. This is not a claim that native Mail lacks delegation.
- **Threads:** synthetic A (three messages: read/unread/read), B (two: Important then Favorite), C (one: unread/Important/Favorite). Public singleton view returns six, threaded returns three in C/B/A order. Each representative uses its newest message's integer `databaseId`, sender, subject, flags, tags and timestamp; `threadRootId` is the root Message-ID string. A is reported read despite an unread member; B lacks the older Important tag. No aggregate count field exists in the returned schema. The test asserts these distinctions and formally retains singleton-only UI and message-ID handoff.
- **Cache recovery:** a newly appended synthetic folder initially fails OCS listing. The app displays qualified initialize/refresh guidance, a generated folder link and Retry. No automatic loop occurs. A user-gesture new-tab handoff initializes native Mail's folder cache; Retry loads the message while preserving the original account/folder selection. Backend exception bodies remain hidden.
- **Stale responses:** delayed actual account/folder/filter results cannot replace newer rows, title or filter selection. Normal 6D browser traffic remains GET-only Mail OCS.
- **Keyboard/ARIA:** Chrome 153.0.8010.36 traverses all visible app controls including folders, filters, messages, pagination, Retry and native handoffs; Enter/Space activation, visible focus and leaving the app pass. Accessibility-tree checks confirm navigation/filter labels and textual Read/Unread/Important/Favorite names. Error/loading and page statuses are live. Nextcloud's own onboarding dialog is dismissed via visible controls before keyboard checks.
- **Display:** six widths (390, 640, 768, 1024, 1440, 1920) pass native light/dark checks with long synthetic labels and no root overflow. Light/dark backgrounds remain white / rgb(23,23,23). Forced colors retains state text, unread border and focus; reduced-motion is emulated. The 720×500 CSS viewport/device-scale-2 test passes as a 200% desktop zoom approximation.
- **Origins/routes:** browser authentication, public GETs and generated links pass on both loopback origins. With the isolated `.htaccess` pretty-URL flag temporarily off, actual generated `index.php` native routes and app entry pass on both origins. Exact original Apache file bytes are restored. Subdirectory/index.php controller contracts preserve path/query and discard a configured absolute origin; actual subdirectory deployment remains untested.
- **Compatibility/failure:** disabled Mail produces no OCS requests and is restored; no-account and anonymous cases pass. Exact PageController tests keep unsupported Mail 5.11.6 disabled without generating OCS routes. Wire contracts and browser injections cover malformed responses, timeouts, 401/403/404/server errors and recovery. Unsupported installed versions are not simulated by patching Mail.

Remaining acceptance limits: no public delegation provisioning/read-only ACL proof, no aggregate thread UI, no Important server filter, no live-cache freshness guarantee, no manual screen-reader/contrast certification, no browser-chrome zoom certification, no deployed subdirectory or production-origin/companion-app acceptance. These are explicit boundaries, not concealed successes. No mutation phase or production deployment was started.

## Accessibility and local release-readiness follow-up — 2026-09-11

The existing isolated containers were reused. The review found that Nextcloud core's important input focus outline overrode the app's accent outline and produced **2.602:1** contrast on the selected All filter in light mode. The fix uses a scoped important `currentColor` outline, so focus follows the control's contrasting text color and remains distinct from the message selection accent. No global stylesheet or native Mail source was modified.

`node tests/integration/browser.cjs --contrast` passed on the existing Nextcloud 33.0.6 / PHP 8.3.33 / Mail 5.11.5 instance with Chrome 153.0.8010.36. At 1440×1000, each theme checks 105 text samples (including focused controls) and 25 focus outlines with messages, plus 72 text samples and 20 outlines with error/recovery controls. Minimum ratios after the fix:

| Native theme | Message text / focus | Error-recovery text / focus |
| --- | --- | --- |
| Light | 6.116:1 / 6.116:1 | 6.116:1 / 6.116:1 |
| Dark | 6.332:1 / 6.332:1 | 6.332:1 / 6.332:1 |

These are browser-computed solid-surface measurements using the W3C thresholds linked in [TEST_PLAN.md](TEST_PLAN.md#contrast-and-release-readiness-follow-up), not screenshot or full WCAG certification. Disabled/decorative content is excluded. Custom themes and untested hover/color combinations are not covered.

Orca and `dbus-run-session` are installed, but Xvfb is unavailable. No isolated graphical screen-reader session or listening test was performed; the existing headless Chrome accessibility-tree checks do not prove spoken output or usability. The test plan now gives a synthetic-only manual procedure covering announcements, navigation and focus after list replacement.

The local manifest incorrectly claimed no mailbox access, and support/install wording still described initialization without verified runtime integration. Those descriptions now match the opt-in read-only OCS implementation and isolated evidence. App ID, namespace, author, AGPL license, `0.1.0-dev.1` version and Nextcloud 33/PHP 8.3 bounds remain unchanged. No release readiness claim is made for production; repository/Wiki/catalog state was not re-audited or changed.

Regression validation passed: strict Composer metadata, smoke/contracts and all four synthetic light/dark browser combinations; authenticated runtime browser at all six widths, keyboard/ARIA, forced colors/reduced motion and zoom approximation; dedicated contrast checks; public OCS fixture verification. Deterministic packaging and source/archive credential/cache exclusions were checked separately. No commit, push, release, message mutation or production access/deployment was performed.

Remaining gates: manual screen-reader/visual/custom-theme review, actual browser zoom and deployed subdirectory acceptance, companion apps and separately authorized production acceptance. Public delegation provisioning, aggregate thread UI and Important server filtering retain their previously documented limits. This review does not start M2.
