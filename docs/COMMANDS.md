# Development validation commands

Run from the project root:

```bash
composer validate --strict
bash tests/run-smoke.sh
python3 scripts/package.py
git diff --check
git status --short
```

The smoke runner performs PHP/JS syntax, provider and escaping tests. With Chrome/Chromium available it also starts a temporary loopback PHP fixture server, runs responsive light/dark browser checks, and stops its own server. It does not bootstrap production Nextcloud or call Mail endpoints.

Packaging is local, deterministic and excludes tests, dependencies and Git metadata. Build artifacts remain ignored. Operational discovery commands and machine-specific notes are retained privately rather than published here.
