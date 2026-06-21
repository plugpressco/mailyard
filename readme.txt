=== Mailyard ===
Contributors: plugpress
Tags: smtp, wp-mail, email-log, mail, transactional
Requires at least: 5.8
Tested up to: 6.8
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Route WordPress email through Amazon SES, Postmark, Resend, Brevo, or any SMTP server. Smart failover, full logging, zero clutter.

== Description ==

Mailyard makes `wp_mail()` reliable. Pick a transactional email provider, paste your API key, and every email WordPress sends — password resets, WooCommerce receipts, form submissions, plugin notifications — is delivered through that provider's infrastructure instead of your web host's unreliable PHP mail.

Set up in under two minutes. No bloated dashboards, no upsells, no fake premium features.

= Supported providers =

* **Amazon SES** — scalable cloud delivery, very low cost at volume
* **Postmark** — fast transactional, premium deliverability
* **Resend** — modern email API, generous free tier
* **Brevo** (formerly Sendinblue) — free 300 emails/day
* **Custom SMTP** — any SMTP server, including Gmail, Microsoft 365 with app passwords, or your own mail server
* **PHP Mail** — server default (no configuration)

= Key features =

* **Real failover.** Configure multiple connections, drag to set priority. If the primary provider returns an error, Mailyard automatically retries through the next enabled provider — within the same `wp_mail()` call, no queue required.
* **Full email logging.** Every outgoing email is saved to a custom database table with subject, recipient, provider used, status, and any error message. Search and filter from the Logs tab.
* **Attachments, CC, and BCC.** Properly forwarded to every provider's API, including file-path attachments from WooCommerce invoices and Gravity Forms uploads.
* **Inline test sender.** Send a test email from the Dashboard to verify delivery without leaving the admin.
* **Conflict warnings.** If another SMTP plugin (WP Mail SMTP, Easy WP SMTP, FluentSMTP, Post SMTP, etc.) is also active, Mailyard surfaces a dismissible warning before silent breakage.
* **Automatic log cleanup.** Logs older than 30 days are pruned daily via WP-Cron — your database doesn't grow unbounded.
* **Clean uninstall.** Removing the plugin drops the log table and all options. No orphan data left behind.

= What Mailyard is *not* =

* Not a marketing email tool. Use Mailchimp, Brevo's marketing side, or similar for newsletters and bulk sends.
* Not a queue-based sender. Failover and delivery are synchronous within `wp_mail()`. For high-volume scheduled sends, pair with a queue plugin like Action Scheduler.
* Not a paid plugin with locked features. Everything described above is in the free codebase. There is no Pro version that disables features.

= Source code =

The admin UI is built with React and bundled via `@wordpress/scripts`. The full unminified source is available at https://github.com/plugpressco/mailyard — see the `src/` directory. Build instructions: install Node.js dependencies with `npm install`, then run `npm run build`.

= Privacy =

Mailyard makes outbound HTTP requests only to the email provider you configure (e.g. `api.postmarkapp.com`, `api.resend.com`). It does not phone home, collect analytics, or contact any third-party server on its own. The Deliverability checker queries your domain's DNS records locally; if your server's PHP DNS resolver fails, it falls back to Cloudflare's public DNS-over-HTTPS endpoint (`cloudflare-dns.com`) to retrieve the records — no domain data is stored or tracked by Cloudflare beyond the normal DNS query.

When you send a test email through the admin, the email's recipient, subject, and body are stored in your WordPress database log table (if logging is enabled, which is the default). You can disable logging in Settings.

== Installation ==

1. Upload the `mailyard` folder to `/wp-content/plugins/` or install via the Plugins screen in WordPress.
2. Activate the plugin.
3. Go to **Settings → Mailyard**.
4. Pick a provider, paste your API credentials, set your sender email, and click **Save and start sending**.
5. From the Dashboard, click **Send test** to verify everything works.

= Adding backup providers (failover) =

After the first provider is configured, visit the **Connections** tab and click **Add**. Configure a second provider, enable it, and drag it below your primary. If the primary fails on a send, Mailyard will automatically try the backup.

= Removing other SMTP plugins =

If you previously used WP Mail SMTP, FluentSMTP, or a similar plugin, deactivate it before activating Mailyard. Running two mail-routing plugins at once produces unpredictable results — Mailyard will show a dismissible admin notice when this is detected.

== Frequently Asked Questions ==

= Does Mailyard work with WooCommerce, Contact Form 7, Gravity Forms, Easy Digital Downloads, etc.? =

Yes. Any plugin that uses WordPress's standard `wp_mail()` function (which is essentially all of them) will route through Mailyard automatically. Attachments and CC/BCC are properly forwarded.

= My sender domain needs to be verified with the provider. Where do I do that? =

In the email provider's own dashboard. Click the **Get your keys →** link next to the credentials form during setup — it opens the provider's verification page in a new tab. Mailyard cannot verify domains for you; that has to happen with the provider directly.

= What happens if my primary provider is down? =

If you've configured a backup connection in **Connections**, Mailyard will automatically retry through the backup within the same `wp_mail()` call. The Logs tab will show both attempts — the failed primary and the successful backup. If you have only one connection configured, the send fails normally.

= Does this work with Gmail or Google Workspace? =

Personal `@gmail.com` accounts work via SMTP with an app password (set up at [Google Account → App Passwords](https://myaccount.google.com/apppasswords)). Google Workspace accounts no longer support app passwords as of May 2025 — for those, use Resend, Brevo, Postmark, or another provider.

= Does this work with Microsoft 365 / Outlook? =

Microsoft has deprecated SMTP basic auth. For Microsoft 365 mailboxes, use a transactional provider (Resend, Postmark, etc.) sending from your domain.

= Why don't I see a "Cloudflare" provider option? =

Cloudflare Email Sending requires your domain's DNS to be on Cloudflare and a CLI onboarding step (`wrangler email sending enable`), which is hostile to typical WordPress users. We may add it once Cloudflare offers a dashboard-only onboarding flow.

= How long are email logs kept? =

30 days. Older logs are pruned daily by WP-Cron.

= Can I disable email logging? =

Yes, in **Settings**. Toggle off "Email logging" and Mailyard will stop writing to the log table. Existing logs are kept until they age out (or until you uninstall the plugin, at which point the entire table is dropped).

= Does Mailyard work on WordPress Multisite? =

Single-site activation is fully supported. Network-wide activation has not been extensively tested in 1.0; please activate per-site for now.

= I uninstalled the plugin. Is my data deleted? =

Yes. The `uninstall.php` script drops the log table and removes all four `mailyard_*` options. Nothing is left behind in the database.

= Is this plugin free? Will there be a Pro version? =

Mailyard is GPL-licensed and free. Everything documented here is in the free code — there are no disabled features waiting behind a paywall. If a paid edition is ever offered, it will be additive (new providers, advanced features) and the existing free plugin will continue to receive updates.

== Screenshots ==

1. Onboarding — pick a provider, paste your API key, set your sender, done.
2. Dashboard — active connection, 14-day send volume, inline test email, and recent activity.
3. Connections — drag-to-reorder failover chain with primary and backup providers.
4. Email Logs — searchable, filterable list of every email Mailyard has sent.
5. Settings — two real controls: default sender identity and email logging toggle.

== Changelog ==

= 1.0.0 =
* Initial release.
* Six providers: Amazon SES, Postmark, Resend, Brevo, Custom SMTP, PHP Mail.
* Synchronous failover across enabled connections.
* Full email logging with 30-day automatic cleanup.
* Attachments, CC, and BCC support across all API providers.
* Conflict detection for other SMTP plugins.
* Clean uninstall (drops table and options).

== Upgrade Notice ==

= 1.0.0 =
Initial release.
