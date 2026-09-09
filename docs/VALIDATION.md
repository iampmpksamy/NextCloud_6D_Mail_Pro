# Initialization validation — 2026-09-09

- Composer metadata: `composer validate --strict` passes.
- PHP syntax: all app/test PHP files pass with host PHP 8.3.6.
- Availability/version handling: eight cases pass (missing/disabled, inspected version, future patch/major, prerelease, empty version, exception).
- Template rendering: four status/escaping cases pass; unavailable/unknown omit the Mail link.
- XML/SVG/JSON and version/changelog checks pass.
- Official Nextcloud app manifest XSD passes using existing PHP DOM in memory. No live app bootstrap or production file writes were needed. Host DOM/lxml are unavailable; optional XSD checks require a validator with DOM support.
- Artifact built twice from identical source and SHA-256 compared; deterministic archive paths and allowlist reviewed. Build artifacts are Git-ignored.
- Source whitespace/diff and relative documentation links checked; no credentials, real mail, production configuration, vendor, node_modules or upstream code bundled. The standard license text is included.

This is **local scaffold validation only**. No full Nextcloud boot, app enable/disable, authenticated browser, contrast/screen-reader, real Mail integration or dual-origin user acceptance test was performed. These remain explicit M1/runtime gates in TEST_PLAN.md. Source inspection and HTTP status checks are not runtime certification.
