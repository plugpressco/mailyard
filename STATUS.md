# STATUS

**Tier:** build
**Board:** [PlugPress HQ](https://github.com/orgs/plugpressco/projects/3)

## Last session (2026-07-12)
- **Mailyard is now the Freemius PARENT product** for the new **Mailyard Pro** (Outbees rebranded — see mailyard#4, plan issues mailyard#4-8 + outbees#5-11 on the board). Bumped to **1.1.0** on `feat/freemius-parent`:
  - `includes/freemius.php` — `mailyard_fs()` parent init (`has_addons`, no paid plans), dormant until dashboard credentials are pasted; fires `mailyard_fs_loaded`, which the Pro add-on inits on (Pro sorts BEFORE mailyard in load order — don't remove that signal).
  - composer now has a runtime dep (`freemius/wordpress-sdk ^2.7`) → `scripts/zip.js` ships `vendor/` (--no-dev install → zip → dev restore) with a hard integrity check (autoload.php + SDK start.php + build/admin.js in archive).
  - readme.txt/site-copy: "no Pro version, ever" copy rewritten (free stays complete; Pro = separate campaigns plugin); Freemius added to External services; 1.1.0 changelog.
- Committed the pending @plugpress/ui v0.8.3 pin bump + managed AGENTS.md separately.

## Ship 2 (same day): universal dashboard — DONE on `feat/universal-shell` (→ 1.2.0)
- Top-level menu at reserved slot **58.14** (B1, mailyard#5): submenus via the `mailyard_admin_submenus` filter, click interceptor, legacy options-general URL 302s with fragment.
- Shell registry (B2, mailyard#6): `mailyard.shell.modules` wp.hooks filter, module contract in `src/shell/registry.js`, core module dogfoods it (Dashboard / Delivery / footer System groups), outlet keyed by module, `MAILYARD_SHELL_VERSION=1` + `mailyard_admin_enqueue` action. WP-submenu highlight sync added in B6.
- Back-compat matrix verified in Playground; .org build carries zero Pro references (generic hooks only).

## This session (2026-07-13): Abilities + Connect AI (mailyard#2) → 1.3.0
- **5 delivery abilities** (`includes/class-abilities.php`, namespace `Mailyard`): `delivery-status`, `check-deliverability`, `list-logs`, `get-log`, `send-test` — all wrap EXISTING services (`Manager::enabled_connections()`, `Deliverability::scan_all()`, `Logger::query()`, `REST_API::send_test()`), none reimplement. Category `mailyard` registered at **priority 10** — Pro's is at 20 behind an `is_registered` guard, so free owns it and the 14 tools coexist in one namespace (Playground-verified, no `_doing_it_wrong`).
- **Security**: chain output is a safe projection (canary API key in `conn['config']` verified NOT to leak); `list-logs` strips body/headers; `/diagnostics` (webhook secret) and `/data/erase-all` are deliberately NOT abilities.
- **Connect AI page** (`src/views/ConnectAI.jsx`, core Settings tab): master switch + per-tool permissions (instant persist), WP-7.0/MCP-bridge status dots, and a `GuideDrawer` with copy-paste config for Claude Code/Desktop, Cursor, Codex, Windsurf. Backed by new `GET|POST mailyard/v1/ai` (catalog + toggles, whitelisted against the catalog; MCP server auto-detected by sniffing REST routes).
- Graceful degradation: `Requires at least` stays **5.8** — the whole layer no-ops below WP 6.9 and the page says so. Master switch off → all abilities unregister (verified).

## Next up
- **User:** review/merge PR #9 (`feat/freemius-parent`) then `feat/universal-shell` on top; in-browser visual QA; new .org screenshots (top-level menu) before the SVN release.
- Launch ops (mailyard#8): create Freemius parent+add-on products, paste the four ID/key values, then .org SVN release (can go straight to 1.2.0).

## Blockers / open questions
- Push `plugpressco/plugpress-ui` to GitHub is done; all consumers install via `github:plugpressco/plugpress-ui#v0.2.0`.
