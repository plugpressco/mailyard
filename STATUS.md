# STATUS

**Tier:** build
**Board:** [PlugPress HQ](https://github.com/orgs/plugpressco/projects/3)

## UX pass (2026-07-17) — branch `feat/smtp-ux-pass` (not merged)

A design review scored 13 SMTP-plugin UX suggestions against the codebase (most already shipped: test-connection, health card, deliverability score, tabbed IA, confirm modals). Built the three chosen batches; **OAuth (#9) deferred** as a separate larger project. Three commits on `feat/smtp-ux-pass`:

- **Sidebar collapse** (`20b53ac`) — enabled `@plugpress/ui` `AppNav` `collapsible storageKey="mailyard"` in `Sidebar.jsx` (matches waggle): toggle, 224→56px animation, `localStorage['pp-nav:mailyard']`, tooltips, <782px auto-collapse. ~3 lines.
- **Reliability** (`f64cdca`) — **#6** `Errors::humanize()` (one PHP map, `includes/class-errors.php`) turns raw SMTP/ESP errors into title+guidance, fed into the log view (`error_human` via `shape_row`) + the notice; **#11** `Failure_Notice` records `mailyard_send_failed`, auto-clears on a new `mailyard_send_succeeded` action (added in `class-override.php`) or connection/settings save, shows a dismissible admin notice + View-log link; **#5** `POST /logs/{id}/resend` replays the stored message via `wp_mail`, with a Resend button + humanized/collapsible error in the Logs drawer. Verified live (humanize maps auth/conn/rate; record+clear; route registered).
- **Setup polish** (`21f8d7d`) — **#1** `SMTP_PRESETS` (Gmail/Outlook/SendGrid/Zoho) autofill host/port/encryption as chips in the wizard + Connections; **#3** `Setup.jsx` rebuilt as a 4-step wizard (Provider→Credentials→Sender→Test&finish) with a save-then-test step; **#8** self-contained `HelpTip` threaded as a `tooltip` prop through `Field`/`Input`/`Select`.

**Notes:** dev site (`wp/plug-press`) is **SQLite** — MySQL paths (real sends) aren't fully exercisable locally; the PHPUnit CI suite is the real gate. Build clean across all three; `ui/index.js` + `Connections.jsx` carry pre-existing prettier debt (not touched). Branch is local, no PR. Visual QA (collapsed rail, wizard flow, tooltips) best done in-browser by the user.

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
- **User:** visual QA (incl. Deliverability drawer); produce `.wordpress.org` banners + PNG icons + 6 screenshots per `.wordpress.org/README.md`.
- Submit slug `mailyard` to WordPress.org; after approval add `SVN_USERNAME`/`SVN_PASSWORD` repo secrets.
- **Release = `git tag v1.0.0 && git push --follow-tags`** (after .org approval so the tag deploys to SVN in the same run; tagging earlier still produces the GitHub Release zip).
- Freemius was **removed** from the free plugin this session — if Mailyard Pro (add-on) later needs licensing, that wiring lives entirely in Pro, not here. `mailyard#8` (parent+add-on product setup) is moot for the free plugin.

## Blockers / open questions
- None.
