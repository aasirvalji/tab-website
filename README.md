# Tab public website

Static public pages only; this is not a web version of Tab. No scripts, analytics,
browser-side Supabase calls, group lookups, signup forms or secret keys are included.
GitHub stores the source; Cloudflare Pages is the selected website host.

Confirmed public details:

- Developer/operator: Aasir Valji.
- Support: aasir.valji@hotmail.com.
- Apple team: `9S29AL28QR`; bundle: `com.aasirvalji.tab`.
- Association app identifier: `9S29AL28QR.com.aasirvalji.tab`.

## Content and publication gate

The owner approved the privacy/terms wording and actual-first-publication date
approach on October 18, 2026. That wording is implemented locally, including the
owner's confirmation that writing new Auth audit events into the database is off.
It does not promise deletion of old audit records or disable provider-side logs.
Provider logs/backups use configuration-based wording, not an invented duration.
Approval does not establish a complete jurisdiction-specific legal review.

The owner separately approved the website-only production push/deployment on
October 18, 2026. The owner approved the privacy-policy revision and its publication
on October 25 after native deletion and fresh sign-in verification. Privacy is
dated `2026-10-25`; the unchanged terms retain their `2026-10-18` publication date.
The revised policy explains contributed-text cleanup, retired identities,
preserved survivor finances and removal of groups without another claimed account.
The Cloudflare request-processing disclosure is included in the privacy policy.
The checker still rejects draft notices and unresolved placeholders.

Before the app is available, the homepage and fallback pages show a neutral
pre-release notice, not an invented/broken App Store link. Once the real listing
exists, update these pages with that link and retest them. Installation does not
automatically carry the invitation into the app: reopen the original link.

The publication checker rejects drafts/placeholders. Passing it is a content check,
not owner approval, a legal opinion or proof that hosted links work. Repository
creation, pushing public files, connecting accounts and deployment still need
approval of their exact targets. Never publish credentials or the whole iOS repository.

## Website-only repository structure

The exporter creates:

```text
README.md
.gitignore
tools/verify-website.cjs
public/
  index.html
  privacy.html, terms.html, support.html
  invite.html, group.html, 404.html, styles.css
  _headers, _redirects
  .well-known/apple-app-site-association
```

In the Tab repository, run the offline checks:

```sh
node scripts/website/test.cjs
node scripts/website/verify.cjs --site docs/release/website
node scripts/website/verify.cjs --site docs/release/website --publish
```

Export into a new absolute directory; existing destinations are never overwritten:

```sh
node scripts/website/export.cjs --out /absolute/new/website-repository
```

Only the allowlisted public assets, this README, `.gitignore` and the standalone
checker are copied. Apple `.p8` files and all app/backend files are excluded.
Unexpected files, symlinks or secret-like content block the export.

## Approved Cloudflare Pages target

GitHub repository target: `aasirvalji/tab-website` (website files only).
Production branch: `main`. The owner's dashboard screenshot confirms Pages project
`tab-website`, hostname `tab-website-dxi.pages.dev`, the connected GitHub repository
and automatic deployments. The owner explicitly approved pushing the completed,
dated public website to that target. This does not authorize future production
pushes, Supabase changes, Apple credential uploads or App Store submission.

1. Sign in to Cloudflare and verify the account email.
2. Open Workers & Pages → Create application → Pages → Import an existing Git
   repository. The dashboard may also call this Connect to Git.
3. Authorize GitHub access to only `aasirvalji/tab-website`, not every repository.
4. Select that repository and configure:

   | Setting | Value |
   |---|---|
   | Production branch | `main` |
   | Framework preset | None |
   | Root directory | Repository root |
   | Build command | `node tools/verify-website.cjs --publish` |
   | Build output directory | `public` |

5. Leave environment secrets, optional Web Analytics and Pages Functions unset.
6. Obtain exact-target approval before any subsequent production deployment.
   Do not bypass the checker with `exit 0`.

No extra server or purchased domain is needed for this `pages.dev` setup.
The Cloudflare Git integration can automatically publish future commits: treat
pushes to the production branch as deployments once connected, and get approval.

## Routes and security

Cloudflare's HTML handling serves `/privacy`, `/terms`, `/support`, `/invite` and
`/group` from their HTML files. Internal 200 proxies route `/invite/*` and `/group/*`
to the appropriate generic fallback while preserving the original browser address.
The explicit `404.html` keeps unrelated unknown paths from becoming a SPA homepage.
No public fallback shows names, balances or group data.

Apple's association file is served at `/.well-known/apple-app-site-association`,
with `Content-Type: application/json`, over HTTPS, with no redirect. Do not put a
redirect rule in front of it. Its app identifier must match the final signed app's
Associated Domains entitlement. iOS accepts only the configured host and exact
`/invite/<48-hex-token>` or `/group/<UUID>` paths; it rejects extra path/query parts.

Global headers disable referrers/indexing, framing and active third-party content.
These do not prevent the hosting provider from processing a requested invitation
URL. Do not add request-path analytics or copy real invitation tokens into QA logs.

## Verify the deployed site

After approved publication, check actual HTTP responses (not only the source files):

- Root, privacy, terms and support return usable HTML over HTTPS.
- Apple association returns 200 JSON with the exact team/bundle identifier, no
  redirect, and the JSON content type. Its referrer/CSP headers are present.
- Synthetic invitation and group paths return their corresponding fallback with
  200, preserving the URL and not revealing private data.
- An unrelated missing path returns 404 rather than the homepage.
- Real, signed iPhone builds open valid invitations cold, warm and signed out.

Only then set the actual website hostname and URLs in the iOS configuration.
Actual universal-link delivery and Apple's cached association need device checks.

Official references:

- https://developers.cloudflare.com/pages/framework-guides/deploy-anything/
- https://developers.cloudflare.com/pages/configuration/git-integration/
- https://developers.cloudflare.com/pages/configuration/headers/
- https://developers.cloudflare.com/pages/configuration/redirects/
- https://developers.cloudflare.com/pages/configuration/serving-pages/
- https://www.cloudflare.com/privacypolicy/
