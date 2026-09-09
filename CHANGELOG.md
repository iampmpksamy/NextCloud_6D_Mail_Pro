# Changelog

## 0.1.0-dev.1 — 2026-09-09 (unreleased, experimental)

- Initialize a standalone authenticated Nextcloud app with Mail availability checks and native Mail navigation.
- Document inspected AIO environment, Mail state/API boundaries, existing plugin compatibility and publication requirements.
- Add local fallback/escaping checks and deterministic packaging.
- M1A: add a synthetic read-only account/folder sidebar, paginated message list, independent state indicators and filter chips.
- Add text-only reading placeholder, native Mail handoff, loading/empty/retry states and stale-response handling.
- Add provider and local light/dark browser tests; package plain JS assets with no npm build.
- Real mailbox integration, message actions and production deployment remain unimplemented.

Adjacent apps use numeric semver versions but provide no shared prerelease policy. The explicit `-dev.1` suffix is a new project choice accepted by the Nextcloud manifest schema; `0.1.0` denotes the first incomplete development milestone, not production readiness.
