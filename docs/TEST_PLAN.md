# Validation plan

## Completed local checks

PHP syntax, eight availability/version/error fallback cases, four rendered-template status/escaping cases, manifest/SVG parsing, Composer metadata validation and packaging. These tests use small OCP test doubles, not a running Nextcloud framework. Schema validation and package reproducibility results are recorded in VALIDATION.md. No live mailbox endpoint or mutation was used.

## Isolated test environment

Use a separate Nextcloud 33/PHP 8.3 instance, exact Mail 5.11.5 source/release and optional Mail Pop-out 1.0.2. Create entirely synthetic users, two accounts, delegated/read-only cases, and an isolated mail sink. Do not connect test code to production IMAP/SMTP or restore production mail into fixtures.

## Required acceptance matrix

| Case | Required assertion | Phase / status |
| --- | --- | --- |
| Read | Neutral row, regular sender/subject, no unread dot/accent | M1 pending |
| Unread | Dot + accent + bold hierarchy + stronger timestamp + accessible label | M1 pending |
| Important | `$label1` indicator independent of unread and Favorite; filter reconciles backend state | M1 pending |
| Favorite | Separate star, independent of Important and read status | M1 pending |
| Combined | All eight combinations of three booleans remain distinguishable; toggles alter only intended state | M1/M2 pending |
| Threads | Mixed-state threads vs singleton rows; accurate aggregation and counts | M1 pending |
| Multiple accounts | Two inboxes, stable account labels, delegated/read-only rights; no cross-user data | M1 pending |
| Pagination/filter | Limit/cursor, empty/loading/error, Unread/Important/Favorite, stale requests and duplicate pages | M1 pending |
| Sorting | Global unread/important-first order proven across pages, or feature withheld | M2 pending |
| Light/dark | Native theme variables, readable state contrast and focus; icons distinguishable without color | M1 pending |
| Compact/comfortable | No overlap, readable rows, accessible controls; preference same on both origins | M2 pending |
| Responsive | 390, 640, 768, 1024, 1440, 1920px; no horizontal overflow; 200% zoom | M1 pending |
| Keyboard/a11y | Tab/focus, enter activation, labels, screen reader, forced colors, reduced motion | M1 pending |
| Both hostnames | Same user/mail state, separate login sessions, same-origin generated routes; no cross-origin redirect | Runtime pending |
| Subdirectory/index.php | Generated route respects deployment base; no hardcoded `/apps` concatenation | Runtime pending |
| Mail Pop-out | Compose/reply/forward/draft, detach/return, autosave, attachments, popup blocked, minimize | Runtime pending; synthetic data only |
| Domain Login Branding | Each login retains configured branding; no sixd styles/scripts there | Runtime pending |
| Missing/disabled/restricted Mail | No native Mail classes loaded; graceful unavailable page; no broken link | Local fallback passed; runtime pending |
| Unsupported Mail | No adapter/enhancements; clear unverified status; native Mail works | Local fallback passed; runtime pending |
| Inspection failure | Generic unknown state, no exception/secret disclosure | Local fallback passed |
| Enable/disable | Own navigation appears/disappears; core Mail survives; no DB/mail data change | Isolated runtime pending |
| Authentication/CSRF | Anonymous landing requires login; future mutations reject invalid CSRF/session; enforce ownership | Runtime pending |
| Hostile data | Escaped sender/subject/URL; no HTML injection, remote message content, trackers or logged data | URL escaping passed; message cases deferred |

Do not count a static template test as a production or browser compatibility pass. Record browser/version, isolated image versions, results and failures before expanding manifest bounds or asking for production deployment approval.
