# STATUS

**Tier:** build
**Board:** [PlugPress HQ](https://github.com/orgs/plugpressco/projects/3)

## Last session (2026-07-30) — banner redesign: tint + refine

- **WP.org banner reworked** after reviewing it on the live plugin page (user asked "what issue you see?" — verdict: white banner on wp.org's white page had no edges; the big circle mark sat directly above the identical plugin icon; the dotted failover arc (3px, `1 13` dashes) was illegible). User picked "tint + refine" over dark-banner/full-redesign.
- Changes (all in `src/banner-light.html`, re-rendered both PNGs via the documented headless-Chrome pipeline): background `#fff` → **`#F5F8FB`** (light blue-grey, gives the banner edges); **circle mark removed** — wordmark-led lockup at `left: 140px` (balanced margins); failover arc now **5px `0.1 14` round-cap dots in `#94A3B0`** (reads as a route); envelope stroke 3px → 4px to match; fork-circle fill matches new bg; tagline `#6F6F6F` → `#5F6B76`. Verified in a scratchpad mock of the wp.org page (banner + icon + title) before committing. `banner-dark.html` untouched.
- Push to `main` touching `.wordpress.org/**` auto-syncs to wp.org SVN via `assets.yml` (verified-working since `2795676`).

## Earlier session (2026-07-29, later) — readme SEO rewrite + plugpress.co/mailyard links + wp.org banner shipped

- **WP.org banner designed & shipped** (user picked from 2 rendered concepts): "light" — white plugpress-theme paper, blue mark + lowercase `mailyard` (Bricolage Grotesque 800, −0.03em), Space Mono tagline **"SMTP with a backup plan."** (no "WordPress"/"WP" — trademark rule from Saddle's round-1 review), and a failover route drawing (solid `#2395E7` line → envelope, dotted gray fallback arc forking and rejoining). Runner-up dark Saddle-shelf-mate concept kept at `.wordpress.org/src/banner-dark.html`. Pipeline: HTML comps + theme woff2 via headless Chrome (`--force-device-scale-factor` 1 / 0.5 for the two sizes; rsvg can't do woff2) — documented in `.wordpress.org/README.md`. Also rendered the missing `icon-128x128.png`/`icon-256x256.png` from icon.svg. Only screenshots remain on the assets checklist.

- **readme.txt rewritten compact** (user ask: compact, SMTP-keyword SEO, real Pro upsell): title/short-description/tags untouched (already lead with the `smtp` keyword family); Description + FAQ tightened ~40% — feature H3s collapsed into a keyword-rich "What you get" bullet list plus three short differentiator sections (failover / deliverability / MCP). **External services, Installation, Screenshots, Changelog byte-identical** (compliance sections deliberately untouched).
- **Mailyard Pro section is now a real 6-bullet feature list** (broadcast campaigns, Notion-style editor, Claude AI writing assistant BYO key, contacts/groups/segments + CSV, open tracking + analytics, RFC 8058 / GDPR compliance) — and **no longer advertises Automations** (removed from Pro 2026-07-17; the old one-liner still sold it).
- **Product URL is `https://plugpress.co/mailyard`** everywhere (user call): intro "Plugin site" link, both Pro links, "Is it really free?" FAQ — and `mailyard.php` `Plugin URI:` (was `mailyard.co`; header change reaches wp.org with the next release, the readme-only assets sync doesn't ship code). ⚠️ That URL currently **301s to `plugpress.co/docs/mailyard-faq-troubleshooting/`** — repoint the redirect at a real product page.
- **`assets.yml` had NEVER passed** (every run failed, incl. today's 1.0.1 push): the 10up asset-update action rsyncs the whole git tree over SVN trunk and aborts on any drift — and trunk always drifts because releases deploy built `build/` files git doesn't track. Rewritten (`2795676`) as a **sparse-checkout surgical svn commit** of `trunk/readme.txt` + `tags/{stable}/readme.txt` + `assets/` only, with a `workflow_dispatch` trigger for manual reruns. Dispatched run green in 20s; **verified live on wp.org SVN** — trunk + tags/1.0.1 readme both carry the new content (Pro section + 4 plugpress.co/mailyard links). Stable tag stays 1.0.1; the wp.org plugin page regenerates from SVN within the hour.

## Earlier session (2026-07-29) — v1.0.1 RELEASED to WordPress.org
- **1.0.1 shipped**: commit `baeb49b` (Reply-To "Name <email>" parsing fix + Content-Type detection via `wp_mail_content_type` in Override) pushed, tagged `v1.0.1`. Release workflow green in 2m35s: tag↔version check ✓, `mailyard-1.0.1.zip` (339 KB, integrity check passed) attached to the GitHub Release ✓, **deployed to WordPress.org SVN ✓ — wp.org now serves 1.0.1** (last_updated 2026-07-29 4:04pm GMT). Local `npm run zip` build was verified before tagging.

## Earlier session (2026-07-20, later)
- **`feat/smtp-ux-pass` merged into `main`** (merge commit `2a45883`, 8 commits) — user call: finish all free-plugin work; scope is free Mailyard only, no Pro. Only conflict was `STATUS.md` (kept main's log; the branch's self-describing "not merged" block dropped). Contents: humanized SMTP errors (`class-errors.php`) + send-failure admin notice (`class-failure-notice.php`) + resend-failed route; SMTP presets + field tooltips (`HelpTip`); **onboarding/`Setup.jsx` removed entirely**; new logo mark (360×360 path, also `.wordpress.org/icon.svg`); dashboard hierarchy/design pass; WP submenu now one entry per section (Dashboard · Delivery · Marketing · Settings).
- Verified post-merge: `npm run build` compiles (2 pre-existing size warnings), `php -l` clean on all touched includes, `npm run zip` → `mailyard-1.0.0.zip` (339 KB) integrity green.
- **Stale branches deleted** (local + origin): `feat/freemius-parent`, `feat/universal-shell` (both fully contained in main, zero unique commits), and `feat/smtp-ux-pass` after merge.
- All code work is done; remaining items are user-side (screenshots/banners, WP.org slug submission) — see Next up.

## Last session (2026-07-20)
- **Issue #12 fixed** (commit `c5dd633`, direct to `main`) — Mailyard now works through Saddle's MCP server:
  - `mcp_route()` recognises `saddle/v1/mcp`; new `mailyard_mcp_route` filter lets a bridge self-declare its route.
  - Enrolled `mailyard/*` in free Saddle's `saddle_integrations` wrapper engine (inert without Saddle) — tools surface as `saddle/mailyard-*`; Mailyard Pro's campaign tools ride along on the shared prefix (15 wrapped tools on the dev site).
  - `send-test-email` is now `annotations.destructive = true` (per the issue's recommendation), so Saddle injects its confirm-token step before a real email goes out.
  - `saddle_system_context` gets one delivery-triage line; Connect AI names Saddle as a supported bridge.
  - Verified live on `wp/plug-press` with Saddle activated (then deactivated again): wrappers registered, `adapterActive: true` with the Saddle endpoint, destructive flag in the wrapper meta, `delivery-status` executes. Saddle-side cosmetic companion (Permissions UI "Other" lane) still unfiled.
- **Issue #3 closed** (commit `fef625c`) — the ui bump itself was long done (now v0.10.4); deleted the stale shadcn `components.json` (+ its dead `zip.js` exclude). The tailwind palette dedupe was **deliberately skipped**: the literal hexes are intentional post-redesign (alpha modifiers need them; the `ink` ramp is used throughout `src/`).
- Issues #8 (external launch ops, partly moot since Freemius removal) and #1 (first-Friday-only) left open — not code, not due.
- `src/views/ConnectAI.jsx` carries ~40 pre-existing prettier errors (like `ui/index.js`/`Connections.jsx`); my added lines are clean, debt not touched.

## Last session (2026-07-17)
- **Freemius fully removed from Mailyard** (commit `7481ed9`, direct to `main`) — user call: Mailyard ships with zero Freemius wiring. Deleted `includes/freemius.php` (the parent-product `fs_dynamic_init` scaffold, `MAILYARD_FS_ID`/`PUBLIC_KEY`, `mailyard_fs()`, `mailyard_fs_loaded` signal); dropped its `require` + comment block from `mailyard.php`; removed it from `scripts/zip.js` must-contain + comments (kept the `freemius/wordpress-sdk` must-NOT-contain guard); removed the Freemius third-party disclosure from `readme.txt`. Zip now 337 KB.
- **Plugin Check now green on `main`** (commit `14185b0`). It was failing on two blocking errors — `wp_register_ability()` / `wp_register_ability_category()` (Abilities API, WP 6.9+) called while the header said WP 6.0.
  - Fix: **`Requires at least` 6.0 → 7.0** (`mailyard.php` + `readme.txt`); 7.0 > 6.9 clears both. Version stays **1.0.0**.
  - Silenced the 5 `$wpdb` false-positive warnings: `class-logger.php` (added `PluginCheck.Security.DirectDB.UnescapedDBParameter` to the ignore lists; wrapped `daily_stats` in `phpcs:disable/enable` for the `{$t}` interpolation), `class-abilities.php` (`esc_sql()` the table name in `get_log()` + corrected ignore codes).
- **The @plugpress/ui private-repo CI auth is resolved** — the `GH_PACKAGES_TOKEN` secret is in place; plugin-check + release workflows build the private dep cleanly (both green this session).
- **PR #10 (`feat/universal-shell`) closed** — its content was already an ancestor of `main` (HEAD `c13e57d`); closed without merge, nothing lost. PR #9 was already merged.
- Package is release-ready; WP.org submission still blocked on the user-side items below.

## Last session (2026-07-16)
- **Free build no longer bundles the Freemius SDK** (commit `0c95827`, direct to `main`). The free plugin has zero runtime composer deps; the SDK (~3.5 MB) ships inside Mailyard Pro, which loads first, so `fs_dynamic_init` exists exactly when needed. `includes/freemius.php` stays a no-op without Pro.
  - `composer.json`/`lock`: dropped `freemius/wordpress-sdk` runtime require (dev tooling only now).
  - `scripts/zip.js`: excludes `vendor/` entirely; integrity check now also asserts the SDK does NOT ship (`mustNotContain`). Verified: `npm run zip` → `mailyard-1.0.0.zip` (339 KB), check green, no `vendor/`, no SDK, keeps `includes/freemius.php`.
  - `mailyard.php`: `Requires at least` 5.8 → 6.0 (matches readme).
- **readme.txt decluttered** (user: "clutter free and clear"): removed ALL emoji, founder pitch 3× → 1× (kept the "Who's behind this" section, dropped the intro tail + duplicate "Who makes Mailyard?" FAQ), de-duplicated provider details (terse list; nuance lives only in the "Which provider should I pick?" FAQ).
- Package is release-ready; WP.org submission still blocked on user-side items below (token, PR #10, `.wordpress.org` assets, slug, secrets, Freemius products).

## Last session (2026-07-13)
- **Version reset → 1.0.0** (user decision: never shipped publicly, so the internal 1.1–1.3 bumps were rolled back; rule: never bump versions without explicit user approval). All work landed directly on `main`; PR #9 auto-merged, **PR #10 needs a manual close** (content is on main, GitHub didn't auto-flip it).
- **Deliverability "How it works" GuideDrawer** added (`src/views/Deliverability.jsx`).
- **readme.txt rewritten SEO-first** (user-approved title): `Mailyard – WP SMTP Plugin with Amazon SES, Postmark, Resend, Brevo, Email Log & Failover`; tags `smtp, email, mail, wp-mail, email-log`; 148-char short description; ✅ highlights list + emoji feature sections; two new search-shaped FAQs ("Why is WordPress not sending emails?", "alternative to WP Mail SMTP/FluentSMTP/Post SMTP"); 6 screenshot captions matching current UI; changelog collapsed to `1.0.0 — Initial release.` `mailyard.php` Description header aligned.
- **Release automation** (mirrors saddle's patterns, adapted for WP.org SVN):
  - `.github/workflows/release.yml` — on `vX.Y.Z` tag: tag↔version guard, `npm run zip` (integrity-checked), GitHub Release asset, then `10up/action-wordpress-plugin-deploy` (SLUG mailyard, ASSETS_DIR `.wordpress.org`). SVN steps skip until `SVN_USERNAME`/`SVN_PASSWORD` secrets exist.
  - `.github/workflows/assets.yml` — push to main touching readme/.wordpress.org → `10up/action-wordpress-plugin-asset-update` (same secrets guard).
  - `.github/workflows/plugin-check.yml` — WP.org's Plugin Check on main pushes + PRs, against the built plugin.
- **`.distignore`** — anchored patterns (vendor-integrity lesson); `/vendor` and `/build` SHIP (Freemius SDK + compiled admin), `/vendor/bin` and `/.wordpress.org` excluded.
- **`.wordpress.org/`** — `icon.svg` (brand mark, #2395E7, single-sourced from `src/components/Logo.jsx`) + `README.md` spec for the banners/PNG icons/6 screenshots still needed.
- Regenerated `languages/mailyard.pot`; earlier full audit: 0 blockers (hardening backlog: mask connection secrets on read, webhook signature verification, React i18n — file as board issues).

## Next up
- **User:** visual QA of the merged UX pass (collapsed rail, presets/tooltips, resend-failed, new nav + no-onboarding flow, Deliverability drawer, Saddle notice on Connect AI); produce `.wordpress.org` banners + PNG icons + 6 screenshots per `.wordpress.org/README.md`.
- File the Saddle-side cosmetic companion issue (wrapped `mailyard-*` tools land in the "Other" lane of Saddle's Permissions UI).
- Submit slug `mailyard` to WordPress.org; after approval add `SVN_USERNAME`/`SVN_PASSWORD` repo secrets.
- **Release = `git tag v1.0.0 && git push --follow-tags`** (after .org approval so the tag deploys to SVN in the same run; tagging earlier still produces the GitHub Release zip).
- Freemius was **removed** from the free plugin this session — if Mailyard Pro (add-on) later needs licensing, that wiring lives entirely in Pro, not here. `mailyard#8` (parent+add-on product setup) is moot for the free plugin.

## Blockers / open questions
- None.
