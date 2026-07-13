# STATUS

**Tier:** build
**Board:** [PlugPress HQ](https://github.com/orgs/plugpressco/projects/3)

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
- **User:** close PR #10; visual QA (incl. Deliverability drawer); produce `.wordpress.org` banners + PNG icons + 6 screenshots per `.wordpress.org/README.md`.
- Submit slug `mailyard` to WordPress.org; after approval add `SVN_USERNAME`/`SVN_PASSWORD` repo secrets.
- Freemius launch ops (mailyard#8): create parent+add-on products, paste the four ID/key values.
- **Release = `git tag v1.0.0 && git push --follow-tags`** (after .org approval so the tag deploys to SVN in the same run; tagging earlier still produces the GitHub Release zip).

## Blockers / open questions
- None.
