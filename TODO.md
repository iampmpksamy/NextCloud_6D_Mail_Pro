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
- [ ] Verify inside isolated Nextcloud; production and OCS access remain prohibited here.

## M1 — Isolated read-only P0 prototype
- [ ] Boot and enable scaffold on a separate Nextcloud 33/PHP 8.3 instance.
- [ ] Use synthetic accounts/mailboxes; test public Mail OCS list/filter contracts.
- [ ] Reconcile `$label1` tags, legacy flags, classifier output and thread aggregation.
- [ ] Implement own message row: accent, unread dot, bold sender/subject, strong date, neutral read state; independent Important/Favorite labels.
- [ ] Build account navigation, authoritative unread counts, Unread/Important/Favorite chips and paginated message list.
- [ ] Validate keyboard, screen-reader labels, contrast, forced colors, dark/light and 390–1920px widths.
- [ ] Prefer native Mail handoff for reading/composing until content security is designed.

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
- [ ] Complete isolated integration/browser tests and both-domain acceptance matrix.
- [ ] Review package contents/license/security; reconcile versions and changelog.
- [ ] Obtain explicit production deployment approval and rollback window.
- [ ] Publish repository/Wiki/release/catalog only in a separately authorized publication task.
