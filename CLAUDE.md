# CLAUDE.md — SMTP Plugin Admin UI Rebuild

## What this is
We have an existing WordPress SMTP plugin with a PHP backend. The admin UI needs a complete rebuild using React + TailwindCSS + Shadcn UI. The PHP backend (REST API, settings, email sending, logging) already works. We are only rebuilding the frontend admin interface.

## Tech stack
- React 18+ (wp-scripts build pipeline, already configured)
- TailwindCSS v3 (already installed)  
- Shadcn UI components (already initialized)
- WordPress REST API for all data (existing endpoints)
- The React app mounts into `<div id="smtp-plugin-admin"></div>` in the WP admin page

## Design system

### Brand color
- Primary: Warm Teal `#0D9488` — delivery, infrastructure, trust
- Hover: `#0F766E`
- Light: `#F0FDFA`, Soft: `#CCFBF1`, Muted: `#0D948814`
- Personality: Reliable, quiet, trustworthy. Voice: "Your emails. Delivered. Every time."

### Shared Mool palette (oat warm backgrounds)
- Background: `#F8F6F1`, Surface: `#FEFCF9`, Surface-alt: `#F3F0EA`
- Borders: `#E3DED6` (default), `#ECE8E1` (light)
- Text: `#1A1815` (primary), `#7C766D` (secondary), `#ADA69B` (muted)
- Status: success `#16A34A`/`#ECFDF5`, warning `#CA8A04`/`#FEF9EC`, danger `#DC2626`/`#FEF2F2`

All design tokens live as `--mm-*` CSS custom properties in globals.css.

### Typography
- Font: IBM Plex Sans (load from Google Fonts via `wp_enqueue_style`)
- Weights: 400, 500, 600, 700
- Base size: 13px for body, 12px for table cells, 11px for meta/hints

### Design rules
- **No box-shadows anywhere.** Use borders (`border-warm-200`) and background tints for depth.
- Border radius: `rounded-lg` (8px) for cards, `rounded-md` (6px) for inputs/buttons, `rounded-full` for pills/badges.
- Default border: `border border-warm-200`
- Cards: white bg, `border-warm-200`, `rounded-xl` (12px), padding `p-4` or `p-5`
- Status colors: success `#E8F5E9` / `#2E7D32`, warning `#FFF8E1` / `#F57F17`, danger `#FFEBEE` / `#C62828`

## App structure

```
src/
├── admin.jsx                  # Entry point, mounts <App />
├── App.jsx                    # Router — shows Setup or Main based on state
├── components/
│   ├── ui/                    # Shadcn components (Button, Input, Select, Switch, Badge, etc.)
│   ├── ProviderIcon.jsx       # SVG icons for all 6 providers
│   ├── TopBar.jsx             # Brand mark + nav pills + actions
│   ├── StatusPill.jsx         # Colored status badge (sent/failed/retried/blocked)
│   └── FailoverChain.jsx      # Horizontal provider chip chain with arrows
├── views/
│   ├── Setup.jsx              # First-run onboarding (pick provider → configure → test)
│   ├── Overview.jsx           # Dashboard with stats, chart, activity feed
│   ├── Connections.jsx        # Provider management with priority ordering
│   ├── Logs.jsx               # Email log table with resend feature
│   └── Settings.jsx           # All settings grouped in cards
├── hooks/
│   ├── useSettings.js         # GET/POST settings via WP REST API
│   ├── useConnections.js      # CRUD connections via WP REST API
│   ├── useLogs.js             # Fetch/filter/paginate logs via WP REST API
│   └── useResend.js           # Resend email via WP REST API
└── lib/
    └── api.js                 # wp.apiFetch wrapper with nonce
```

## Navigation pattern

Top bar with segmented control pills (not traditional WP tabs):

```
[● Brand Name]  [ Overview | Connections | Logs | Settings ]        [Send test] [?]
```

- Brand mark: orange dot `●` + plugin name
- Nav: pill buttons inside a `bg-warm-50 rounded-md p-0.5` container
- Active pill: `bg-white border border-warm-200 text-warm-900`
- Inactive pill: `bg-transparent text-warm-400`
- Right side: "Send test" outline button + help icon

## Screens specification

### 1. Setup (first-run onboarding)

Only shown when no connections exist. Three inline phases on one scrollable page (NOT separate pages):

**Phase 1 — Pick provider:**
- Heading: "Connect your first provider"
- Subtext: "Which service sends your emails? You can add more anytime."
- 6 providers as selectable rows (radio-style, one selected at a time)
- Each row: provider SVG icon (28px) + name + short description + radio circle
- Selected row: `bg-brand-light border-brand` with filled radio
- Below the 6 live providers, show "Coming soon:" with muted chips listing planned providers
- "Continue with [Name]" primary button at bottom

**Phase 2 — Configure:**
- Shows selected provider icon + name at top
- Card with form fields: From name, From email, API key/token (type=password)
- Hint text with link: "Find this in your [Provider] dashboard →"
- Below the config card: a "Verify it works" card with email input + "Test" button
- Test success: green banner "Delivered in X.Xs"

**Phase 3 — Complete:**
- "Finish & go to dashboard" button

Use `wp_option` to store `smtp_plugin_onboarded = true` so setup is only shown once.

### 2. Overview (dashboard)

**Top row — 4 stat cards in a grid:**
- "Sent" — total count, % change vs last month
- "Delivered" — delivery rate %
- "Retried" — count, recovery rate
- "Blocked" — count, "By shield"
- Each card: `bg-white border-warm-200 rounded-xl p-4`
- Number: `text-2xl font-bold text-warm-900`
- Change: green with up arrow for positive, red for negative

**Middle — 2-column layout:**
- Left (wider): Delivery volume sparkline chart (last 14 days)
  - Use a simple SVG path chart, no chart library needed
  - Area fill with brand color at 10% opacity
  - Line in brand color, 2px stroke
- Right (narrower): 3 stacked status cards
  - Connections: icon + count + "Active" pill
  - Auto-retry: icon + "30 min cycle" + "On" pill  
  - Reputation shield: icon + blocked count + score pill

**Bottom — Recent activity feed:**
- Card with header "Recent activity" + "All logs →" link
- Each row: status dot (green/amber/red) + provider icon (20px) + recipient + subject + time
- This is a feed, NOT a table — simpler, more compact than the full logs view

Data source: `GET /smtp-plugin/v1/dashboard` endpoint.

### 3. Connections

**Header:** "Connections" title + "Add" primary button

**Failover chain bar:**
- Horizontal bar with `bg-warm-100 rounded-md p-2`
- Lightning bolt icon + "Failover:" label
- Each active connection as a chip: provider icon (14px) + name in a white pill with border
- Arrows `→` between chips
- Only shows active (enabled) connections in priority order

**Connection cards (vertical stack):**
Each connection is a card row with:
- Drag handle (grip dots icon) — for reordering priority
- Priority number in a circle (green #1 = primary, amber #2+ = backup)
- Provider icon (26px)
- Name + status pills (Primary/Backup + Connected/Not configured)
- Email address subtitle
- Toggle switch (enable/disable)
- Gear icon button (opens config)
- X button (remove)

When a connection is disabled, the card fades to 40% opacity.

**Add connection panel:**
- Triggered by "Add" button
- Shows available providers not yet connected as clickable chips
- Below: "Planned:" with muted chips for coming-soon providers
- Clicking a provider adds it to the list (disabled, not configured)

**Drag to reorder:**
Use `@dnd-kit/sortable` for drag-and-drop. On reorder, POST new priority order to `PUT /smtp-plugin/v1/connections/reorder`.

Data source: `GET/POST/PUT/DELETE /smtp-plugin/v1/connections`.

### 4. Logs (with resend)

**Header:** "Email logs" title + "Resend N failed" red button (when failed emails exist) + "Export" outline button

**Filter bar:**
- Segmented pill filter: All | Sent | Retried | Failed | Blocked
- Search input with magnifying glass icon

**Log table:**
- Columns: To, Subject, Via (provider icon + name), Status (pill), Time, Actions
- Rows are clickable — clicking expands inline detail panel

**Expanded row (the key feature):**
When a row is clicked, it expands below with a two-column detail panel:

Left column — Email preview:
- Subject, recipient, timestamp
- Body preview (first 200 chars of the email body)
- Raw headers in monospace

Right column — Resend panel:
- "Send to" input (pre-filled with original recipient, editable)
- "Via provider" dropdown (all active connections)
- "Resend now" primary button
- Sending state: spinner + "Sending…"
- Success state: "Delivered!" green text
- For blocked emails: red warning "Blocked by Reputation Shield — review content before resending"
- For failed emails: amber warning "Delivery failed — try a different provider"

**Resend behavior:**
- POST to `/smtp-plugin/v1/emails/{id}/resend` with `{ to, connection_id }`
- On success: update the row status from failed → sent
- Show inline success message for 3 seconds

**Bulk resend:**
- "Resend N failed" button in header
- Fires resend for each failed email sequentially with 800ms delay
- Each row updates its status as it succeeds

Data source: `GET /smtp-plugin/v1/logs?status=X&search=X&page=X&per_page=20`.

### 5. Settings

All settings are grouped in cards, each card handles one feature area:

**Card 1 — Email logging:**
- Toggle: "Email logging" on/off
- When on, show: Delete logs dropdown (7/30/90 days), Default connection dropdown
  
**Card 2 — Auto-retry:**
- Left: icon in green circle + title + description
- Right: toggle switch
- When on, show 3 dropdowns: Delay (15/30/60 min), Attempts (2/3/5), Strategy (Next provider / Same provider)

**Card 3 — Reputation Shield:**
- Same layout as auto-retry but with activation CTA when off
- When OFF: show benefits list with checkmarks + "Activate" primary button
- When ON: show green confirmation bar "Shield is active — N emails blocked this month"
- Toggle to disable once activated

**Card 4 — Weekly summary:**
- Toggle on/off
- When on: "Send on" dropdown (Monday/Friday/Daily)

**Card 5 — Advanced:**
- Email simulation toggle (log but don't send)
- Anonymous analytics toggle

**Save behavior:** 
- "Save" button in header
- POST all settings to `/smtp-plugin/v1/settings`
- Show success toast on save

## Provider data

### Live providers (6)
Each provider needs: id, name, description, SVG icon component, config fields.

| ID | Name | Config fields |
|---|---|---|
| `ses` | Amazon SES | Access Key ID, Secret Access Key, Region, From Email, From Name |
| `brevo` | Brevo | API Key, From Email, From Name |
| `mailgun` | Mailgun | API Key, Domain, Region (US/EU), From Email, From Name |
| `sendgrid` | SendGrid | API Key, From Email, From Name |
| `postmark` | Postmark | Server Token, Message Stream ID, From Email, From Name |
| `php` | PHP Mail | From Email, From Name (no API key needed) |

### Planned providers (show as "Coming soon" chips)
Mailjet, MailerSend, SparkPost, Elastic Email, SMTP2GO, Zoho Mail, Google Workspace, Microsoft 365, Netcore

### Provider SVG icons
Real brand SVG icons are required for all 6 live providers. Reference file: `smtp-plugin-ui.jsx` in the project — it contains the exact SVG paths to use. Each icon component accepts a `size` prop and renders at that pixel dimension.

## Component specs for Shadcn

Use these Shadcn components (already installed):
- `Button` — with variants: default (outline), primary (filled brand), ghost, destructive
- `Input` — with label prop, warm border styling, brand-color focus ring
- `Select` — native select with label
- `Switch` — toggle with brand color when on
- `Badge` — status pills (success/warning/danger/default)
- `Table` — for logs
- `Card` — for all containers
- `DropdownMenu` — for action menus
- `Toast` — for save confirmations and resend feedback
- `Tooltip` — for icon buttons

Override Shadcn theme in `globals.css` to use our warm palette and brand color instead of the default slate/blue.

## REST API endpoints (already exist)

```
GET    /smtp-plugin/v1/dashboard          → { stats, recent_logs, chart_data }
GET    /smtp-plugin/v1/connections         → [ { id, provider, config, priority, enabled } ]
POST   /smtp-plugin/v1/connections         → Create new connection
PUT    /smtp-plugin/v1/connections/:id     → Update connection
DELETE /smtp-plugin/v1/connections/:id     → Remove connection
PUT    /smtp-plugin/v1/connections/reorder → { ids: [ordered_ids] }
GET    /smtp-plugin/v1/logs               → Paginated logs with filters
POST   /smtp-plugin/v1/emails/:id/resend  → { to, connection_id } → Resend email
POST   /smtp-plugin/v1/test-email         → { to, connection_id } → Send test
GET    /smtp-plugin/v1/settings            → All settings
POST   /smtp-plugin/v1/settings            → Save settings
```

All endpoints use `wp_rest` nonce via `wp.apiFetch`.

## Build order

1. Set up Tailwind config with custom colors and DM Sans font
2. Override Shadcn theme CSS variables to match our warm palette
3. Build shared components: ProviderIcon, StatusPill, FailoverChain, TopBar
4. Build Settings view (simplest, good for testing the component system)
5. Build Connections view (tests CRUD operations)
6. Build Logs view with resend (tests the expandable row pattern)
7. Build Overview dashboard (ties stats together)
8. Build Setup onboarding flow
9. Wire up App.jsx router and state management
10. Test full flow: setup → dashboard → connections → logs → settings

## Important notes

- No shadows. Anywhere. Use `border-warm-200` and `bg-warm-50` for depth.
- The UI should feel premium despite being a free plugin. Think Linear/Notion level polish, not typical WordPress admin.
- Keep the warm tone consistent — never use cool grays or blues for structural elements.
- All provider icons must use real brand SVGs, not generic placeholders.
- The resend feature in logs is a key differentiator — make it smooth with proper loading states and success feedback.
- Test email button in the top bar should open a small popover (not navigate away) with an email input and provider selector.
- Onboarding should only appear once. After completion, always show the main app.
- Mobile responsive is not critical (WP admin is desktop), but don't let anything break below 900px width.
