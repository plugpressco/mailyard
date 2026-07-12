# Mailyard — Plugin Documentation

## What Mailyard does

Mailyard replaces WordPress's default `wp_mail()` delivery mechanism. Instead of relying on your web host's PHP mail function (which is blocked or marked as spam by most email providers), Mailyard routes every outgoing WordPress email through a proper transactional email service.

You configure one or more connections to email providers like Amazon SES, Postmark, or Resend. Mailyard intercepts every `wp_mail()` call — from WooCommerce receipts, contact forms, password resets, plugin notifications — and delivers it through your configured provider.

---

## How it works (the full flow)

When any plugin calls `wp_mail()`:

1. Mailyard's `Override` class intercepts the call via the `pre_wp_mail` filter before WordPress does anything with it.
2. It reads the `From` header of the message (or falls back to your configured default sender).
3. It resolves the active **failover chain** — the list of enabled connections ordered by priority.
4. It walks the chain, attempting delivery through the first connection. If that fails, it tries the next, and so on — all within the same `wp_mail()` call, no queue.
5. The result (success or failure, which provider handled it, any error) is written to the email log.
6. The original caller receives `true` on success or `false` on failure, exactly as standard `wp_mail()` would return.

For API-based providers (SES, Postmark, Resend, Brevo), Mailyard sends directly via the provider's HTTP API. For SMTP connections, it configures WordPress's built-in PHPMailer to use your SMTP server.

---

## Providers

### Amazon SES

Amazon's Simple Email Service. Very low cost at volume ($0.10 per 1,000 emails). Best choice if you're already in the AWS ecosystem.

**Setup:**
1. In AWS Console → SES → Verified identities, verify your sending domain.
2. Create an IAM user with `ses:SendRawEmail` permission.
3. Generate an access key and secret for that user.
4. In Mailyard → Connections → Add → Amazon SES, paste the key, secret, and region.

**Required fields:** Access Key ID, Secret Access Key, AWS Region (e.g. `us-east-1`).

**How it sends:** Mailyard constructs a raw MIME email and signs it with AWS Signature Version 4, then POSTs it to `email.us-east-1.amazonaws.com` (or your chosen region endpoint).

---

### Postmark

Premium transactional email. Known for the fastest delivery and best inbox placement. A free sandbox is available for testing.

**Setup:**
1. In Postmark → Sender Signatures, add and verify your sending domain.
2. Create a Server and copy its Server API Token.
3. In Mailyard → Connections → Add → Postmark, paste the token.

**Required fields:** Server API Token.

**Note on SPF:** Postmark aligns via its own Return-Path (pm-bounces CNAME) and DKIM — not your domain's SPF record. You do not need to add Postmark to your SPF. You do need to add the DKIM and pm-bounces CNAME records Postmark provides.

**Message streams:** Postmark separates transactional and broadcast (marketing) emails into different streams. When you set a connection's Purpose to "Marketing", Mailyard automatically routes it to the `broadcast` stream. Transactional emails go to the `outbound` stream. You can override this by setting the `stream` field in the connection config directly.

---

### Resend

Modern email API with a generous free tier (3,000 emails/month free). Simple REST API.

**Setup:**
1. In Resend → Domains, add and verify your sending domain.
2. In Resend → API Keys, create a key.
3. In Mailyard → Connections → Add → Resend, paste the key.

**Required fields:** API Key.

---

### Brevo (formerly Sendinblue)

Free tier includes 300 emails per day with no monthly cap on contacts.

**Setup:**
1. In Brevo → Senders & Domains, authenticate your domain (adds DKIM and SPF records).
2. In Brevo → SMTP & API → API Keys, create a key.
3. In Mailyard → Connections → Add → Brevo, paste the key.

**Required fields:** API Key.

---

### Custom SMTP

Use any SMTP server: Gmail app passwords, Microsoft 365, Mailgun SMTP, your own mail server, etc.

**Setup:**
1. Gather your SMTP host, port, encryption type, and credentials from your provider.
2. In Mailyard → Connections → Add → Custom SMTP, fill in the fields.

**Required fields:** SMTP Host, Port (default 587).

**Encryption options:**
- `TLS` — STARTTLS on port 587. Recommended for most providers.
- `SSL` — Implicit SSL on port 465.
- `None` — Unencrypted. Only use on a trusted private network.

**How it sends:** Mailyard adds a `phpmailer_init` action to configure WordPress's built-in PHPMailer with your SMTP settings, then calls `wp_mail()` internally. The re-entrancy guard in `Override` ensures this inner call passes through without being intercepted again.

---

### PHP Mail (default)

Uses WordPress's own `wp_mail()` without modification — whatever your hosting server provides. This is the fallback when no connections are configured. It has no credentials and requires no setup, but deliverability depends entirely on your host.

---

## Connections and failover

### Priority order

Connections are attempted in priority order (1 = primary, 2 = first backup, etc.). Drag and drop in Mailyard → Connections to reorder them.

The **primary** connection handles every email under normal conditions. If it returns an error, Mailyard immediately tries the next enabled connection — still inside the same `wp_mail()` call.

### What triggers failover

Failover happens when a provider returns an explicit failure: a 4xx/5xx HTTP response from an API, or a PHPMailer/SMTP error. Timeouts are treated as failures.

Failover does **not** happen based on queue depth or rate limits — Mailyard does not monitor provider health between sends.

### Sender-based routing

Each connection can be restricted to specific senders via **Advanced routing → Send for these senders**. Add email addresses (`support@you.com`) or bare domains (`you.com`). Leave empty to match all senders (catch-all).

When an email is sent, Mailyard scores each enabled connection against the From address and picks the most specific match:
- Exact address match = highest priority (score 3)
- Domain match = medium (score 2)
- Catch-all or empty = lowest (score 1)

All connections at the same specificity tier form the failover chain for that send.

### Purpose

Each connection has a Purpose: **Any**, **Transactional**, or **Marketing**. This lets you dedicate one connection (e.g. a Postmark Broadcast stream) to marketing emails while another handles transactional sends.

The routing engine filters connections by purpose before selecting the chain.

---

## Email logging

When logging is enabled (Settings → Email logging), every outgoing email is recorded to a custom database table (`wp_mailyard_logs`).

### What is logged

| Field | Description |
|---|---|
| To | Recipient email address |
| Subject | Email subject line |
| Body | Full email body (HTML or plain text) |
| Headers | Raw headers sent with the email |
| Provider | Which connection delivered it |
| Status | `sent` or `failed` |
| Error | Error message on failure (empty on success) |
| Time | When the email was sent |

### Viewing logs

Go to Mailyard → Logs. You can:
- Filter by status (All / Sent / Failed)
- Search by recipient address or subject
- Page through results (20 per page)

### Log retention

Logs older than 30 days are deleted automatically via a daily WP-Cron job (`mailyard_daily_cleanup`). This keeps the database from growing unbounded.

To disable logging entirely, go to Settings → Email logging and toggle it off. Existing logs are kept until they age out or you uninstall the plugin.

---

## Deliverability checker

Mailyard → Deliverability scans your sending domain's DNS records and scores your authentication setup from 0–100.

### What it checks

| Check | Weight | What it looks for |
|---|---|---|
| SPF | 30 pts | A `v=spf1` TXT record at your domain root |
| DKIM | 35 pts | A valid DKIM key at any common selector |
| DMARC | 30 pts | A `v=DMARC1` TXT record at `_dmarc.yourdomain.com` |
| MX | 5 pts | At least one MX record (so replies don't bounce) |

### Score grades

| Score | Grade | Meaning |
|---|---|---|
| 90–100 | A | Fully authenticated |
| 75–89 | B | Good, minor gaps |
| 60–74 | C | Partial — some records missing |
| 40–59 | D | Significant gaps |
| 0–39 | F | Not authenticated |

### Fix suggestions

For each failed or warning check, Mailyard shows the exact DNS record you need to add and where to add it. For SPF warnings, it shows a corrected version of your existing record with the missing include inserted in the right place.

### How DNS lookups work

Checks run via PHP's `dns_get_record()`. If your server's resolver returns nothing (common on local or containerised installs), Mailyard falls back to querying Cloudflare's public DNS-over-HTTPS endpoint (`cloudflare-dns.com`) to retrieve the records. No domain data is stored or tracked by Cloudflare beyond a normal DNS query.

Results are cached for one hour per domain. Click **Refresh** to force a new check.

---

## Settings

### Default sender

The **From Email** and **From Name** set here are used when a plugin calls `wp_mail()` without specifying a From header. They do not override an explicit From — if WooCommerce sets `From: WooCommerce <store@example.com>`, that address is respected and used for sender-based routing.

This email address must be verified with your email provider.

### Email logging

Toggle to enable or disable the email log. Settings save automatically with a short debounce — no Save button needed.

---

## Conflict detection

If another SMTP or mail-routing plugin is also active (WP Mail SMTP, FluentSMTP, Post SMTP, Easy WP SMTP, WP Offload SES, SendGrid), Mailyard shows a dismissible warning on the plugin list page and its own settings page.

Running two mail-routing plugins simultaneously produces unpredictable behavior — one plugin may intercept the email before the other, or both may attempt delivery. Deactivate all other mail plugins when using Mailyard.

---

## Dashboard

The Dashboard gives an at-a-glance view of your email setup:

- **Status badge** — Healthy (all connections tested OK, no recent failures), Warning (a connection test failed or recent emails failed), or No delivery (no connections configured).
- **KPI strip** — Emails sent and failed in the last 7 days, success rate, your worst deliverability grade, and how many backup providers you have.
- **14-day send volume chart** — Daily sent/failed bar chart. Hover for exact counts.
- **Delivery chain** — Your active connections in priority order, with last test status.
- **Recent activity** — Last 7 logged emails with status, recipient, subject, provider, and time.

### Send test

Click **Send test** to send a real email through your live routing chain. Leave the address empty to send to your WordPress admin email. The activity feed and stats update automatically after a successful test.

---

## Connect AI (Abilities API / MCP)

Mailyard registers its delivery tools on the **WordPress Abilities API** (WordPress 7.0+), so an AI assistant can diagnose email problems for you. Control everything in **Settings → Connect AI**.

### The tools

| Ability | Access | What it does |
| --- | --- | --- |
| `mailyard/delivery-status` | View | Active provider, the ordered fallback chain with each connection's last test result, health, and sent/failed counts for the last 7 days. |
| `mailyard/check-deliverability` | View | Scores SPF, DKIM, DMARC, and MX per sending domain (0–100 + letter grade) and returns the exact DNS record to add for each failing check. Pass `refresh: true` to bypass the 1-hour cache. |
| `mailyard/list-logs` | View | Recent emails with recipient, subject, provider, status, and error. Filter with `status` (`all`/`sent`/`failed`), `search`, `limit`. Message bodies are **not** included. |
| `mailyard/get-log` | View | One logged email in full, including its body, to debug a specific failure. Takes the `id` from `list-logs`. |
| `mailyard/send-test` | Sends email | Sends a real test through the live chain (with failover). Optional `to` and `subject`; defaults to the current user. |

Every tool requires the `manage_options` capability. Credentials (`config`), and the webhook secret are **never** exposed to an assistant — the chain is projected to safe fields only.

### Permissions

**Settings → Connect AI** has a master switch ("AI access") and a switch per tool. Turning the master off unregisters every Mailyard ability immediately. All five tools are on by default; the send-test tool is flagged because it delivers a real email.

### Connecting a client

Mailyard exposes abilities but ships **no MCP server** — install a bridge, e.g. the free [WordPress MCP Adapter](https://github.com/wordpress/mcp-adapter). Then:

1. Create an Application Password (**Users → Profile → Application Passwords**).
2. Copy the endpoint from Settings → Connect AI (the "How to connect" guide has copy buttons).
3. Add it to your client, e.g. Claude Code:

```bash
claude mcp add --transport http mailyard \
  https://example.com/wp-json/mcp/mcp-adapter-default-server \
  --header "Authorization: Basic $(printf 'WP_USERNAME:APP_PASSWORD' | base64)"
```

Cursor, Claude Desktop, Codex, and Windsurf take the equivalent `mcpServers` JSON block (also in the guide). stdio-only clients can wrap the endpoint with `npx mcp-remote <endpoint>`.

Then ask: *"Why aren't my WordPress emails arriving?"*

Mailyard Pro adds its campaign tools (`mailyard/list-campaigns`, `mailyard/send-campaign`, …) to the **same** `mailyard` category, so an assistant sees one coherent toolset.

---

## Developer hooks

### `mailyard_providers` filter

Add a custom ESP to the provider registry:

```php
add_filter( 'mailyard_providers', function ( $providers ) {
    $providers['my_esp'] = new My_ESP_Provider();
    return $providers;
} );
```

Your class must implement `Mailyard\ESP\Provider`.

### `mailyard_send_failed` action

Fires when a send fails on every connection in the chain (total failure, not per-attempt):

```php
add_action( 'mailyard_send_failed', function ( $to, $last_error ) {
    // Alert, queue for retry, etc.
}, 10, 2 );
```

### Public helper functions

```php
// True when at least one non-default connection is configured and enabled.
mailyard_is_active(): bool

// Returns the active ESP Provider instance, or null if none configured.
mailyard_active_provider(): ?Mailyard\ESP\Provider
```

---

## Uninstall

Removing the plugin from the WordPress plugins screen runs `uninstall.php`, which:
- Drops the `wp_mailyard_logs` table
- Deletes all four `mailyard_*` options from `wp_options`
- Clears any scheduled cron events
- Clears deliverability transients
- Removes the conflict-notice dismissed flag from user meta

No data is left behind.
