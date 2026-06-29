# Mailyard → MCP / Abilities API Roadmap

**Goal:** make Mailyard the email-deliverability plugin an AI agent can actually operate —
diagnose why mail isn't arriving, read the failure log, check SPF/DKIM/DMARC, and send a
test, all over the WordPress **Abilities API** (and through it, MCP clients like Claude).

**Positioning:** not "SMTP plugin + AI." The story is the *workflow* —
> "Why aren't my WooCommerce emails arriving?" → agent runs the deliverability check,
> reads recent failures, sees the active provider/fallback chain, sends a test, reports back.

This is the "specialized go-to tool / missing link" angle the WordPress.org review explicitly rewards. Almost none of the 500+ SMTP plugins expose anything to agents.

---

## Sequencing (important)

1. **Get 1.0.0 approved first.** Do **not** add a new public surface mid-review — it invites
   fresh scrutiny and extra round-trips. Ship the review fixes, get approved.
2. **Then release MCP as 1.1.0** as the headline feature.

---

## Architecture decision

Re-expose the existing REST surface (`includes/class-rest-api.php`) as **abilities** — don't
rebuild logic. Each ability wraps the same Manager/Logger/Deliverability calls the REST
controller already uses. The Abilities API auto-publishes them at
`/wp-json/wp-abilities/v1/*`; an MCP adapter (or the WP Feature/MCP plugin) surfaces them to
MCP clients.

Register under category `mailyard`. Use `wp_register_ability_category()` once, then
`wp_register_ability()` per ability.

---

## Phase 1 — Read abilities (ship first, lowest risk)

These map to existing GET endpoints. Read-only, `manage_options`, safe for agents to call freely.

| Ability | Wraps | Returns |
|---|---|---|
| `mailyard/get-dashboard` | `get_dashboard()` | sent/failed 7d, health, chain, recent sends |
| `mailyard/get-logs` | `get_logs()` | paginated send log (status/search filters) |
| `mailyard/check-deliverability` | `get_deliverability()` | SPF/DKIM/DMARC/MX per domain |
| `mailyard/get-diagnostics` | `get_diagnostics()` | runtime state, table, chain, webhook URLs |
| `mailyard/get-active-provider` | `get_settings()` + chain | active provider + fallback order |

**Why these first:** highest diagnostic value, zero destructive risk, and they're the part an
agent needs to *reason* about email problems.

## Phase 2 — Action abilities (gated)

Map to existing POST endpoints. Still `manage_options`; annotate honestly as **writing**
(`readonly: false`), since the verify skill checks this.

| Ability | Wraps | Notes |
|---|---|---|
| `mailyard/send-test-email` | `send_test()` | low blast radius; great agent demo |
| `mailyard/test-connection` | `test_connection()` | test one provider in the chain |

## Phase 3 — Config abilities (optional, highest risk)

| Ability | Wraps | Notes |
|---|---|---|
| `mailyard/update-settings` | `save_settings()` | from name/email, logging, active |
| `mailyard/list-connections` | `get_connections()` | **MUST strip `config` secrets** (see below) |

Hold connection *create/delete* abilities until there's real demand — credential entry is a
poor fit for an agent and a large attack surface.

---

## Hard security rules (the review team will look here)

1. **Never emit secrets.** `get_connections()` returns each connection's `config`, which holds
   **API keys / SMTP passwords**. Any ability that touches connections must redact `config`
   before returning. `get_settings()` is safe (credentials live on connections, not settings).
2. **Real `permission_callback` on every ability.** `manage_options` for everything here.
   The review *just* flagged REST permissions — don't regress.
3. **Honest read/write annotations.** A writing ability annotated read-only is the #1 thing
   `wp-abilities-verify` catches. `get-*` = read; `send-*`/`update-*`/`test-*` = write.
4. **No new public/unauthenticated surface.** The webhook endpoint stays the only public route.
5. **Keep `erase-all` out of abilities.** Destructive + confirmation-gated; not for agents.

---

## Build order / tooling

1. **`wp-abilities-audit`** — scan the REST surface, generate the registration plan doc.
2. **`wp-abilities-api`** — implement `wp_register_ability_category()` + Phase 1 abilities in a
   new `includes/class-abilities.php`, wired from the main plugin bootstrap.
3. **`wp-abilities-verify`** — confirm callbacks match annotations, permissions, schemas, and
   that no secret leaks.
4. MCP exposure — document the WP MCP adapter / Feature API path for users in the readme.

## Readme / marketing follow-ups (1.1.0)

- New `== Description ==` lead bullet: "Built for AI — manage deliverability from Claude/MCP."
- Document the abilities + the MCP connection path.
- Update External Services only if MCP usage sends data anywhere new (it should not — abilities
  run locally against the same providers already documented).
</content>
