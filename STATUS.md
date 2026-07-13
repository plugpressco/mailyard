# STATUS

**Tier:** build
**Board:** [PlugPress HQ](https://github.com/orgs/plugpressco/projects/3)

## Last session (2026-07-13)
- **Version reset → 1.0.0.** User decision: the plugin has never shipped publicly, so the internal 1.1.0–1.3.0 bumps are rolled back and the first public release is **1.0.0**. Rule going forward: never bump the version without explicit user approval.
- **Everything landed on `main`** (fast-forward merge of `feat/universal-shell`, which already contained `feat/freemius-parent`); PR review flow skipped at user's request — pushing main marks PRs #9/#10 merged.
- readme.txt: Stable tag 1.0.0; changelog + upgrade notices collapsed into a single 1.0.0 "initial release" entry (failover, routing, webhooks, deliverability, logging, top-level dashboard, Connect AI/Abilities, Freemius opt-in).
- Regenerated `languages/mailyard.pot` (was stale from 2026-05-27 with refs to the deleted `class-phpmailer.php`; now 100 strings incl. Abilities + Connect AI).
- **Deliverability: new "How it works" GuideDrawer** in `src/views/Deliverability.jsx` (trigger button beside Re-scan) — explains the four checks (SPF/DKIM/DMARC/MX), the A–F scoring + How-to-fix rows, and the data path (server resolver → Cloudflare DoH fallback, 1-hour cache, DNS-only, nothing leaves the site).
- Full production-readiness audit (security / quality / release): **0 blockers**. Hardening backlog candidates for board issues: mask connection secrets in `REST_API::get_connections()` (write-only on save), webhook payload authenticity (SNS Signature validation, provider signing secrets, server-trusted replay dedupe), React admin i18n (`__()` + `set_script_translations`).
- Verified: WP Playground boot clean, admin page serves version 1.0.0; drawer compiled into `build/84.js`; `npm run zip` integrity passed → `mailyard-1.0.0.zip`.

## Next up
- **User:** in-browser visual QA (incl. the new Deliverability drawer); new .org screenshots (top-level menu) — readme screenshot caption #5 (Settings) still describes the old UI, refresh it alongside the new images.
- Launch ops (mailyard#8): create Freemius parent+add-on products, paste the four ID/key values, then .org SVN release at **1.0.0**.
- File board issues for the hardening backlog above.

## Blockers / open questions
- None.
