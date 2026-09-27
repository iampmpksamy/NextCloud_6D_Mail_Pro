# Phased milestones

## M0 — Initialization
- [x] Inspect workspace instructions, existing apps, Git and public catalog source.
- [x] Inspect live AIO read-only, persistent storage and both hostname routes.
- [x] Inspect deployed Mail maps, backend and matching upstream tag.
- [x] Create independent bootstrap, authenticated landing page and fallback checks.
- [x] Document architecture, packaging, deployment and publication gates.
- [x] User authorized canonical repository creation and initial source push.

## M1A — Synthetic read-only workspace
- [x] Two accounts, multiple folders and fixture-wide unread counts.
- [x] Read/unread row hierarchy and independent Important/Favorite labels.
- [x] All/Unread/Important/Favorite filtering and cursor-ready pagination.
- [x] Loading, empty, fail-once error/retry and stale-response protection.
- [x] Reading placeholder, immutable selection and generated native Mail handoff.
- [x] Local browser checks at 390/1440px in light/dark with escaping and overflow assertions.
- [x] Verify the shared UI inside isolated Nextcloud through M1B; production access remains prohibited.

## M1B — Isolated read-only OCS integration
- [x] Boot Nextcloud 33.0.6/PHP 8.3.33 with exact Mail 5.11.5 and enable this app in dedicated test containers.
- [x] Seed two IMAP accounts, all eight independent states, Unicode/hostile/long text, tied timestamps and empty folders.
- [x] Normalize real public OCS accounts, folders and singleton summaries as the ordinary authenticated user.
- [x] Display authoritative folder unread counts; withhold missing account totals.
- [x] Implement All/Unread/Favorite server filters and bounded timestamp cursor pagination.
- [x] Map Important rows from `$label1`; withhold the legacy-flag Important filter because complete equivalence is unproven.
- [x] Preserve immutable row selection and generated native Mail message handoff.
- [x] Add OCS contracts, real runtime checks and authenticated browser smoke tooling.
- [ ] Prove complete Important filtering across legacy/classifier divergence using a public contract.
- [x] Evaluate thread/delegation contracts in M1C; limitations formally retained below.
- [x] Complete automated forced-colors, zoom approximation and width checks in M1C; manual audits remain pending.

## M1C — Extended read-only acceptance
- [x] Reuse the existing isolated runtime and preserve M1B changes.
- [x] Prove owner/outsider account, mailbox and summary boundaries without admin retries.
- [x] Record delegated/read-only grants as not available/proven through the inspected public Mail API; no private grant route called.
- [x] Test three synthetic conversations: threaded OCS returns newest-message representatives without aggregate states/counts. Retain singleton UI.
- [x] Add generated folder handoff and explicit initialize/refresh guidance with user-triggered Retry; prove cold-cache recovery.
- [x] Prove stale-response isolation for account, folder and filter switches.
- [x] Check Tab order, Enter/Space, Retry/handoff focus, accessibility tree and independent text state labels.
- [x] Check 390/640/768/1024/1440/1920px light/dark, forced colors, reduced motion and 200% zoom approximation.
- [x] Verify both loopback origins and generated index.php routes; preserve original isolated Apache configuration.
- [x] Add controller contracts for subdirectory/index.php path preservation and unsupported/disabled Mail gates.
- [x] Retain the disabled Important server filter; no public divergence contract is proven.
- [x] Measure native light/dark text and keyboard-focus contrast in message/recovery states; fix selected-filter focus contrast.
- [ ] Manual screen-reader usability, visual review with custom themes and real subdirectory deployment remain later acceptance gates.

## M2 — P1 productivity
- [ ] Density settings stored per user; synchronized across both origins.
- [ ] Design honest unread-first/important-first sorting across pages (OCS currently fixes newest-first).
- [ ] Add permission-aware actions through audited API contracts, CSRF and failure recovery.
- [ ] Improve empty reading pane and composer handoff; regression-test Mail Pop-out.
- [ ] Test supported, unavailable and unsupported Mail versions and app disable fallback.

## M3 — P2 evaluation
- [ ] Assess existing Priority Inbox before considering Focused/Other naming or scoring.
- [ ] Evaluate existing snooze, follow-up and tags before adding overlapping features.
- [ ] AI-assisted triage requires separate explicit opt-in/privacy design; no implementation now.

## M4 — Release and deployment
- [x] Reconcile local manifest/support/install wording with verified read-only runtime behavior; retain experimental version and compatibility bounds.
- [ ] Complete isolated integration/browser tests and both-domain acceptance matrix.
- [ ] Review package contents/license/security; reconcile versions and changelog.
- [ ] Obtain explicit production deployment approval and rollback window.
- [ ] Publish repository/Wiki/release/catalog only in a separately authorized publication task.
