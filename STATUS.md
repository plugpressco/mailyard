# STATUS

**Tier:** build
**Board:** [PlugPress HQ](https://github.com/orgs/plugpressco/projects/3)

## Last session (2026-07-12)
- **Mailyard is now the Freemius PARENT product** for the new **Mailyard Pro** (Outbees rebranded — see mailyard#4, plan issues mailyard#4-8 + outbees#5-11 on the board). Bumped to **1.1.0** on `feat/freemius-parent`:
  - `includes/freemius.php` — `mailyard_fs()` parent init (`has_addons`, no paid plans), dormant until dashboard credentials are pasted; fires `mailyard_fs_loaded`, which the Pro add-on inits on (Pro sorts BEFORE mailyard in load order — don't remove that signal).
  - composer now has a runtime dep (`freemius/wordpress-sdk ^2.7`) → `scripts/zip.js` ships `vendor/` (--no-dev install → zip → dev restore) with a hard integrity check (autoload.php + SDK start.php + build/admin.js in archive).
  - readme.txt/site-copy: "no Pro version, ever" copy rewritten (free stays complete; Pro = separate campaigns plugin); Freemius added to External services; 1.1.0 changelog.
- Committed the pending @plugpress/ui v0.8.3 pin bump + managed AGENTS.md separately.

## Next up
- **B1/B2 (mailyard#5, #6):** move Mailyard to top-level menu 58.14 + universal shell registry (`mailyard.shell.modules`) with grouped sidebar — Mailyard Pro plugs its Marketing group in (plan: `~/.claude/plans/generic-zooming-whistle.md`).
- Launch ops (mailyard#8): create Freemius parent+add-on products, paste the four ID/key values, then .org SVN release of 1.1.0.
- (Superseded: the old "Migrate Outbees to @plugpress/ui at slot 58.12" item is folded into the Ship-2 dashboard issues above.)

## Blockers / open questions
- Push `plugpressco/plugpress-ui` to GitHub is done; all consumers install via `github:plugpressco/plugpress-ui#v0.2.0`.
