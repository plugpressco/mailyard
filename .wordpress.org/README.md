# WordPress.org directory assets

Everything in this folder goes to the SVN `/assets` directory (NOT shipped
inside the plugin — `.distignore` excludes it). Two workflows sync it:

- `release.yml` — on every `vX.Y.Z` tag (via `ASSETS_DIR`).
- `assets.yml` — on any push to `main` touching `readme.txt` or this folder,
  so readme/asset tweaks go live without a release.

Both skip until the `SVN_USERNAME` / `SVN_PASSWORD` repo secrets are set
(i.e. after the plugin is approved on WordPress.org).

## Present

| File | Purpose |
| --- | --- |
| `icon.svg` | Directory icon (brand mark, `#2395E7`). WP.org serves SVG icons directly. |

## Still needed (launch ops)

| File | Size | Notes |
| --- | --- | --- |
| `banner-772x250.png` | 772×250 | Directory page header (required look — first impression). |
| `banner-1544x500.png` | 1544×500 | Retina banner. |
| `icon-128x128.png` | 128×128 | PNG fallback for the SVG icon. |
| `icon-256x256.png` | 256×256 | Retina PNG fallback. |
| `screenshot-1.png` | ~1280×800, same size for all | Setup — provider, key, sender address. |
| `screenshot-2.png` | | Dashboard — sending health, 14-day volume, activity. |
| `screenshot-3.png` | | Connections — providers, drag to set primary/backup. |
| `screenshot-4.png` | | Deliverability — A–F domain grades + DNS fixes. |
| `screenshot-5.png` | | Email Logs — every send with status/error. |
| `screenshot-6.png` | | Settings → Connect AI — master switch + per-tool permissions. |

Screenshot numbering must match the `== Screenshots ==` captions in
`readme.txt` — update both together.
