# Changelog

## 0.1.0-dev.1 — 2026-09-09 (unreleased, experimental)

- Initialize a standalone authenticated Nextcloud app with Mail availability checks and native Mail navigation.
- Document inspected AIO environment, Mail state/API boundaries, existing plugin compatibility and publication requirements.
- Add local fallback/escaping checks and deterministic packaging.
- M1A: add a synthetic read-only account/folder sidebar, paginated message list, independent state indicators and filter chips.
- Add text-only reading placeholder, native Mail handoff, loading/empty/retry states and stale-response handling.
- Add provider and local light/dark browser tests; package plain JS assets with no npm build.
- M1B: add an opt-in public OCS provider, isolated Nextcloud/PHP 8.3/Mail 5.11.5 tooling, synthetic IMAP fixtures and runtime/contract/browser checks.
- Normalize account/folder/message summaries, tag-based Important rows, All/Unread/Favorite server filters and timestamp-boundary pagination. Withhold the unproven Important server filter.
- M1C: add explicit cache initialization/refresh recovery with generated folder handoff and Retry; improve named navigation, live statuses and long folder wrapping.
- Test threaded representatives and preserve singleton semantics; record the public delegation provisioning gap. Extend keyboard, ARIA, stale-response, six-width/theme, forced-colors, reduced-motion, zoom and route/version checks.
- Message actions, content rendering and production deployment remain unimplemented.
- Acceptance follow-up: fix selected-filter keyboard focus contrast under Nextcloud's core input styles; add measured native light/dark text/focus checks and align manifest/support/install wording with isolated read-only results.
- Internal beta deployment (2026-09-27): deployed the exact committed artifact to persistent AIO storage, enabled the app with `data_provider=ocs`, and passed same-origin read-only checks through both production origins. One origin encountered the documented uncached-folder recovery state; no force-sync or message handoff was performed.

Adjacent apps use numeric semver versions but provide no shared prerelease policy. The explicit `-dev.1` suffix is a new project choice accepted by the Nextcloud manifest schema; `0.1.0` denotes the first incomplete development milestone, not production readiness.
