# STATUS

**Tier:** build
**Board:** [PlugPress HQ](https://github.com/orgs/plugpressco/projects/3)

## Last session
- Built **@plugpress/ui** — shared admin design system (repo `plugpressco/plugpress-ui`), now **v0.2.0, light-only** (dark mode removed). Geist/OpenAI aesthetic, `--pp-*` tokens, per-product accent, sonner toasts, Radix overlays, no bundled fonts, WCAG-AA contrast gate.
- Migrated **5 of 6** products onto it (light-only, menus in the reserved `58.x` band, verified in WP Playground):
  - Mailyard (blue, pins v0.1.0), Saddle (mono, v0.2.0), Waggle (gold, v0.2.0), Knovia (green, v0.2.0), Inbees (green, v0.2.0).
- Inbees/Knovia migrations also removed the **Inter/Google-Fonts** wp.org compliance risk and unified toasts to sonner.
- Waggle bug fixes: **llms.txt** now strips shortcodes → real text; **sitemap** serves at `/wp-sitemap.xml` (works around core's `/sitemap.xml` redirect) + version-based rewrite flush.
- Knovia: `slug`/`author` writable via Abilities API (v0.1.1). Saddle Pro: runs unlicensed for now (`updater:false`); Saddle + Saddle Pro got tag-triggered release workflows.

## Next up
- **Migrate Outbees** to @plugpress/ui (blue accent, reserved menu slot `58.12`). Largest one (~17k lines, react-router/react-query, embedded Gutenberg email editor stays product-specific). Same token-bridge recipe; also clears its Inter/Google-Fonts compliance issue. See `plugpress-ui/MIGRATION.md`.
- Optional: bump Mailyard to `@plugpress/ui` v0.2.0 for version parity; re-skin the PlugPress SDK Hub (Saddle Pro About/License pages) so pro screens match.

## Blockers / open questions
- Push `plugpressco/plugpress-ui` to GitHub is done; all consumers install via `github:plugpressco/plugpress-ui#v0.2.0`.
