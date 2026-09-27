# Validation plan

## Completed local checks

PHP syntax, eight availability/version/error fallback cases, four rendered-template status/escaping cases, manifest/SVG parsing, Composer metadata validation and packaging. These tests use small OCP test doubles, not a running Nextcloud framework. Schema validation and package reproducibility results are recorded in VALIDATION.md. The initialization suite used no mailbox endpoint. M1B adds the isolated read-only runtime suite below; no production endpoint is used.

## Isolated test environment

Use a separate Nextcloud 33/PHP 8.3 instance, exact Mail 5.11.5 source/release and optional Mail Pop-out 1.0.2. Create entirely synthetic users, two accounts, delegated/read-only cases, and an isolated mail sink. Do not connect test code to production IMAP/SMTP or restore production mail into fixtures.

## Required acceptance matrix

| Case | Required assertion | Phase / status |
| --- | --- | --- |
| Read | Neutral row, regular sender/subject, no unread dot/accent | M1C automated passed; manual acceptance remains |
| Unread | Dot + accent + bold hierarchy + stronger timestamp + accessible label | M1C automated passed; manual acceptance remains |
| Important | `$label1` indicator independent of unread/Favorite; server filter intentionally withheld | M1C automated passed; manual acceptance remains |
| Favorite | Separate star, independent of Important and read status | M1C automated passed; manual acceptance remains |
| Combined | All eight combinations of three booleans remain distinguishable; toggles alter only intended state | Eight states passed; mutation tests deferred to M2 |
| Threads | Newest-message representatives proven; no aggregate states/count; singleton UI retained | M1C decision verified |
| Multiple accounts | Owner/outsider boundaries verified; public delegated/read-only provisioning unproven | M1C boundary recorded |
| Pagination/filter | Limit/cursor, empty/loading/error, Unread/Important/Favorite, stale requests and duplicate pages | M1C automated passed; manual acceptance remains |
| Sorting | Global unread/important-first order proven across pages, or feature withheld | M2 pending |
| Light/dark | Native theme variables, readable state contrast and focus; icons distinguishable without color | M1C automated passed; manual acceptance remains |
| Compact/comfortable | No overlap, readable rows, accessible controls; preference same on both origins | M2 pending |
| Responsive | 390, 640, 768, 1024, 1440, 1920px; no horizontal overflow; 200% zoom | M1C automated passed; manual acceptance remains |
| Keyboard/a11y | Tab/focus, enter activation, labels, screen reader, forced colors, reduced motion | M1C automated passed; manual acceptance remains |
| Both hostnames | Same user/mail state, separate login sessions, same-origin generated routes; no cross-origin redirect | Runtime pending |
| Subdirectory/index.php | Actual index.php links on both loopbacks; subdirectory path/query controller contracts | M1C passed within stated limits |
| Mail Pop-out | Compose/reply/forward/draft, detach/return, autosave, attachments, popup blocked, minimize | Runtime pending; synthetic data only |
| Domain Login Branding | Each login retains configured branding; no sixd styles/scripts there | Runtime pending |
| Missing/disabled/restricted Mail | Disabled Mail yields unavailable page and no OCS requests; group restriction remains a local fallback test | Local + isolated disabled case passed |
| Unsupported Mail | No adapter/enhancements; clear unverified status; native Mail works | Local fallback passed; see M1B runtime results |
| Inspection failure | Generic unknown state, no exception/secret disclosure | Local fallback passed |
| Enable/disable | Own navigation appears/disappears; core Mail survives; no DB/mail data change | Isolated runtime pending |
| Authentication/CSRF | Landing redirects to login; anonymous OCS denied; ownership enforced; mutations deferred | M1B read-only checks passed |
| Hostile data | Escaped sender/subject/URL; no HTML injection or remote message resources | Local + isolated browser passed |

Do not count a static template test as a production or browser compatibility pass. Record browser/version, isolated image versions, results and failures before expanding manifest bounds or asking for production deployment approval.

## M1B reproducible checks

```bash
composer validate --strict
bash tests/run-smoke.sh
python3 tests/integration/setup.py
node tests/integration/verify.cjs
node tests/integration/browser.cjs
node tests/integration/browser.cjs --no-accounts
python3 scripts/package.py
git diff --check
```

All integration URLs are fixed to the dedicated loopback instance. Setup downloads exact Mail 5.11.5 with SHA-256 verification, enables apps only there, seeds synthetic IMAP messages and warms folder caches by native folder navigation. No selected message is opened. Rerunning preserves existing fixtures; no destructive teardown is required. Re-run the OCS verification after browser checks to confirm unread counts/state remain unchanged.

Contract tests cover malformed envelopes/schemas, 401/403/404/500, empty accounts/messages, abort timeout, network failure, off-origin rejection, independent tags/flags, cursor ties and unsupported Important filtering. Runtime tests cover two accounts, folder counts, all eight state combinations, exact timestamps, all supported server filters, complete multi-page traversal, long/Unicode/hostile strings, empty folders, invalid IDs and cross-user denial. Mail 5.11.5 returns HTTP 500/OCS 996 for the tested cross-user mailbox request; no rows are exposed. Anonymous access returns 401. HTTP 403/404 behavior is covered by contracts, not misreported as this runtime's ownership response.

Browser tests log in through Nextcloud as an ordinary user and exercise navigation, OCS rows, account/folder switches, filter/page resets, summary selection/handoff URL, hostile-text escaping, empty/loading/retry states, native theme variables and focus at 390/1440px. Loading/failure is injected into this app's provider only. Normal browser checks observe only GET Mail OCS requests. `--warm-mail` is a distinct setup mode using native folder navigation. `--no-accounts` tests the separate fixture-outsider user. `--unavailable` is used only while Mail is disabled in this test instance; restore it before normal checks.

Important row state is proven; the OCS Important filter stays disabled. Singleton behavior is tested, not thread aggregation. Delegation, manual screen-reader/contrast audits, subdirectory deployment, both production hostnames, Mail Pop-out, Domain Login Branding and production enable/disable are outstanding. Do not treat the broad matrix above as full acceptance of these deferred cases.


## M1C extended acceptance

Run the standard suite above, then:

```bash
node tests/integration/browser.cjs --localhost
python3 tests/integration/acceptance-fixtures.py --cold
node tests/integration/browser.cjs --cold
python3 tests/integration/runtime-cases.py
```

`setup.py` reuses healthy running containers and preserves existing messages. M1C adds Conversations and a long-label folder. Cold tests append a uniquely named synthetic folder, discover it through native account sync, and record its ID only in ignored `.cache/cold-folder.json`; setup's warm mode skips these cold-test folders. They are preserved rather than deleting caches/messages. This intentionally leaves small synthetic folders after repeated tests.

| Case | Automated assertion / boundary |
| --- | --- |
| Owner/outsider | Owner lists two accounts and their folders/summaries; outsider has no accounts, folder listing denied with 404, message listing denied with 500/OCS 996; no retry as admin |
| Delegated/read-only | Public listing recognizes delegates, but public grant/read-only-rights provisioning is not available/proven; no private endpoint or database workaround |
| Threads | Three referenced conversations produce six singletons vs three newest-message representatives; verify root Message-ID, newest database ID/sender/date/state, ordering and absent counts; retain singleton UI |
| Cold/stale cache | Real cold folder explains possible initialization/refresh, offers generated same-origin new-tab folder handoff, no automatic retry; native folder initializes, Retry succeeds with the original selection |
| Stale requests | Hold an actual response, switch account/folder/filter, release it, assert current rows/title/filter remain unchanged |
| Keyboard | Traverse all visible enabled app controls in document order, visible focus, escape app by Tab, Enter folder/Retry and Space filter; recovery link and native handoff included |
| ARIA | Chrome accessibility-tree navigation/group/state names, current/pressed controls, described loading/error live status, live page state; text badges distinguish states |
| Responsive | 390/640/768/1024/1440/1920px in native light/dark; long synthetic account/folder/sender/subject labels, rows, badges and selected reading pane without root overflow |
| Zoom | 720×500 CSS viewport at device scale 2 approximates 200% zoom on 1440×1000; reflow checked, not claimed to be a browser-chrome zoom certification |
| Forced colors/motion | Emulate `forced-colors: active` and `prefers-reduced-motion: reduce`; state text/border and keyboard focus remain available |
| Failure | Real anonymous/denied/disabled/no-account cases; controller unsupported-version contracts; injected 401/403/404/malformed/timeout/server browser errors plus provider wire/schema/error contracts |
| Origin/front controller | Both `127.0.0.1:18764` and `localhost:18764` authenticate independently; OCS and native links retain current origin. Temporarily turn off only the isolated Apache pretty-URL flag, test generated index.php links on both, restore exact file bytes |
| Subdirectory | Real controller with supplied OCP generated-prefix doubles verifies `/subdirectory` paths/query preservation; no second deployment created |

The runtime-case script uses `try/finally` to restore the isolated Apache file and re-enable Mail. Unsupported-version tests never patch installed Mail metadata/source. No actual message is opened during handoff checks. Manual screen-reader usability, contrast, browser-native 200% zoom, full subdirectory deployment and production/companion-app acceptance remain separate gates. Important server filtering remains intentionally unavailable; it is not an acceptance failure.

## Contrast and release-readiness follow-up

Run `node tests/integration/browser.cjs --contrast` after the normal authenticated browser suite. It reuses the isolated instance and tests native light/dark message and server-error/recovery states. It measures visible direct text plus focused-control text, and keyboard focus on every visible enabled app button/link. Browser canvas resolves colors to sRGB, including the unread row's color mix; solid ancestor backgrounds are alpha-composited. Unsupported background images, opacity, filters or blending fail the measurement instead of producing an assumed pass. Disabled controls and decorative/hidden text are excluded.

Thresholds follow W3C's [text contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum) (4.5:1 normal, 3:1 large) and [non-text contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast) (3:1). The focus calculation is specific to the current inset outline, not a general-purpose accessibility scanner. It does not evaluate screenshots, custom themes, every hover state, every possible color customization or screen-reader speech.

The remaining manual screen-reader pass should use only the synthetic fixture user in isolation:

1. Record OS, browser, screen reader and versions. Verify navigation/heading discovery and account/folder names, including long labels and unavailable account totals.
2. Tab through folders, filters, message summaries, pagination and native handoff. Confirm current/pressed states and Read/Unread, Important and Favorite are announced separately; selection must not open a message.
3. Switch folders/filters and pages. Check that live announcements are useful, not duplicated or excessively verbose, and that focus stays understandable after the list is replaced.
4. Use a synthetic cold folder to hear loading/error guidance, locate the folder handoff and Retry, then verify the successful retry announcement. Open only the native folder page, not message bodies.
5. Review focus visibility, custom theme contrast and actual browser 200% zoom visually. Record findings rather than treating the automated contrast or accessibility-tree checks as a listening/visual certification.

Before publication, review the final artifact and intended changes, recheck source/manifest/version/license/support consistency and package exclusions/reproducibility. Keep `0.1.0-dev.1` experimental and the existing compatibility bounds. A future publication or deployment requires its own authorization; this review does not create a release.
