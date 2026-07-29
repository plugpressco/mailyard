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
| `icon-128x128.png` / `icon-256x256.png` | PNG fallbacks, rendered from `icon.svg` (`rsvg-convert -w 128 -h 128 icon.svg -o icon-128x128.png`, same for 256). |
| `banner-772x250.png` / `banner-1544x500.png` | Directory header banner — white plugpress-theme paper, mark + `mailyard` lockup, failover route drawing into an envelope, tagline "SMTP with a backup plan." Source: `src/banner-light.html`. |

## Banner source & render pipeline

`src/banner-light.html` is the shipped banner; `src/banner-dark.html` is the
alternate dark (Saddle shelf-mate) concept, kept for future use. Brand fonts
(Bricolage Grotesque, Space Mono) load via absolute `file://` paths from
`site/plugpress-theme/assets/fonts/` in the plugpress workspace — adjust the
paths if rendering on another machine. `rsvg-convert` can't resolve
woff2/@font-face, so banners render through headless Chrome:

```
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless=new --screenshot=banner-1544x500.png --window-size=1544,500 \
  --force-device-scale-factor=1   --hide-scrollbars --virtual-time-budget=3000 "file://$PWD/src/banner-light.html"
"$CHROME" --headless=new --screenshot=banner-772x250.png  --window-size=1544,500 \
  --force-device-scale-factor=0.5 --hide-scrollbars --virtual-time-budget=3000 "file://$PWD/src/banner-light.html"
```

The word "WordPress" must NOT appear in banner art (trademark — the same
WP.org round-1 review rule Saddle hit; "WP" is avoided too).

## Still needed (launch ops)

| File | Size | Notes |
| --- | --- | --- |
| `screenshot-1.png` | ~1280×800, same size for all | Setup — provider, key, sender address. |
| `screenshot-2.png` | | Dashboard — sending health, 14-day volume, activity. |
| `screenshot-3.png` | | Connections — providers, drag to set primary/backup. |
| `screenshot-4.png` | | Deliverability — A–F domain grades + DNS fixes. |
| `screenshot-5.png` | | Email Logs — every send with status/error. |
| `screenshot-6.png` | | Settings → Connect AI — master switch + per-tool permissions. |

Screenshot numbering must match the `== Screenshots ==` captions in
`readme.txt` — update both together.
