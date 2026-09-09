# Plugins Hub publication handoff — not published

Catalog source is maintained in the separate Plugins Hub web repository. This document describes a future catalog publication task, not authorization to deploy it.

The public catalog is a compiled **Angular 22 registry**, rendered with Angular SSR/Express, not dynamically populated from the Nextcloud app directory or GitHub. Member/admin/auth routes coexist with the catalog; changing a plugin record requires a source build and separately approved platform deployment. Source/runtime parity must be checked during a separately authorized catalog deployment.

## Exact files requiring future changes

| File relative to web root | Required work |
| --- | --- |
| `src/app/core/models/catalog.models.ts` | Existing PluginRecord/PluginStatus schema; no change expected if it can represent verified data |
| `src/app/core/data/plugin.registry.ts` | Add one truthful PluginRecord; existing Nextcloud records are domain_login_branding and mail_popout |
| `src/app/core/data/platform.registry.ts` | Reuse `nextcloud`; no new platform needed |
| `src/app/app.routes.ts` | Route `nextcloud/6d-mail-pro` to shared PluginDetailPage with selected pluginSlug |
| `src/app/app.routes.server.ts` | Add explicit SSR route consistent with existing plugin routes |
| `src/server.ts` | Add canonical trailing-slash redirect entry; inspect current routing/404 behavior |
| `deploy/nginx/pluginshub.conf` | Add matching no-slash redirect in the canonical redirect configuration |
| `public/sitemap.xml` | Add verified canonical public detail URL after approval |
| `public/assets/plugins/6d-mail-pro/` | Local accurate cover and genuine tested UI screenshots, dimensions/alt/caption |
| Shared detail/SEO rendering | Verify title, description, canonical, OpenGraph/Twitter, structured metadata and related navigation |

Catalog and platform counts derive from registry record lengths; do not fabricate or manually inflate them. No separate hardcoded product component is needed. The SSR server currently uses the Angular router rather than a separate plugin-only deep-link allowlist; route and 404 acceptance checks remain required.

## Metadata to prepare

Proposed ID `sixd_mail_pro`, slug `6d-mail-pro`, platform `nextcloud`, name `6D Mail Pro`, status `experimental`, version `0.1.0-dev.1` only if publishing this actual development milestone. Proposed route `/nextcloud/6d-mail-pro/` is a reserved suggestion, not a published catalog link. The canonical source repository is https://github.com/iampmpksamy/NextCloud_6D_Mail_Pro.

PluginRecord requires: id, slug, platform, name, tagline, summary, status (`stable|beta|experimental`), version, compatibility items and summary, license, updatedAt, hero, screenshots, problem/solution titles and copy, features, installMethods, authorName/authorUrl, supportUrl/githubUrl/docsUrl/issuesUrl, changelog, SEO title/description/path.

Use IAMPMPKSAMY / https://pmpksamy.com/ and AGPL-3.0-or-later. Describe only the implemented landing/fallback behavior if that is all that exists. Clearly separate inspected versions from tested compatibility. The schema requires repository/documentation links and media; do not fill required fields with invented URLs to publish prematurely. Do not claim the planned list/filter/composer features work.

## Future publication sequence

1. Follow parent GIT_PUSH_INSTRUCTIONS.md: audit source/hidden files/secrets/license, verify canonical repository existence using authorized access, preserve existing history, stage reviewed paths only, obtain user approval before commit/push.
2. Create/verify repository Issues and Wiki before linking. Suggested topics: `nextcloud`, `nextcloud-app`, `nextcloud-mail`, `email`, `experimental`; add productivity capabilities only when implemented.
3. Prepare Wiki Home, Installation, Usage, Compatibility, Known Limitations, Support and navigation; preserve existing content if any. Match Topics line to actual repository topics.
4. For a release, source version, manifest, changelog, tag and archive must agree. No release/tag for an unreviewed scaffold.
5. Add the shared registry record, routes, local assets and SEO, then run `npm ci`, `npm run typecheck`, `npm run build` using the web repository's supported Node/npm engines. Existing package provides no separate unit-test script; typecheck is its lint alias.
6. Validate deep links 200, redirects 308, unknown routes 404, all repository/Wiki/support/media links, filters, keyboard, responsive widths and structured metadata.
7. Deploy Plugins Hub only with separate authorization using its existing platform deployment procedure; verify `/healthz`, live catalog routes and container health. No deployment or catalog modification is part of Prompt 01.

No downloads, ratings, user totals, fabricated screenshots or false stable status may be added. Generated artwork must be called a cover/mockup, never a product screenshot.
