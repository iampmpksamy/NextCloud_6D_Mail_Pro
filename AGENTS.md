# 6D Mail Pro working instructions

Read the parent Plugins Hub AGENTS.md, GIT_PUSH_INSTRUCTIONS.md and PLUGIN_HUB_TASK_INSTRUCTIONS.md first. Then read README.md, ARCHITECTURE.md, TODO.md and docs/DISCOVERY.md. Preserve unrelated work.

- App ID: `sixd_mail_pro`; namespace: `OCA\SixdMailPro`; author: IAMPMPKSAMY.
- This is an experimental standalone mail app, not a global Nextcloud theme.
- No production deployment, app enable/disable, upgrades, container restarts, config edits, Mail patches or proxy changes are authorized by initialization.
- Commit/push only when authorized by the user. Canonical repository: https://github.com/iampmpksamy/NextCloud_6D_Mail_Pro. Preserve existing history and unrelated changes. Repository publication does not authorize production deployment.
- Never copy production mail, logs, configuration, credentials or backups into this project. Read only allowlisted configuration keys during inspection.
- Use supported OCP interfaces and generated relative routes. Never hardcode a production hostname in runtime code.
- Do not access Mail's Pinia instance, private Vue nodes, or rewrite Mail DOM with observers. A future private API adapter requires explicit version gating and isolated contract tests.
- Mail Pop-out owns composer/window behavior; Domain Login Branding owns login branding. Do not duplicate either.
- Important display is `$label1` tag membership in Mail 5.11.5; do not silently equate this with every legacy `flags.important` field or with Favorite/unread.
- Production email never belongs in fixtures. AI and external content processing are out of scope.
- Run `composer validate --strict`, `bash tests/run-smoke.sh`, `python3 scripts/package.py`, and diff checks after changes. Test the actual Nextcloud runtime in isolation before claiming compatibility.
- Do not expand compatibility bounds or mark a release stable from source inspection alone.
