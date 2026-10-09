=== Mailyard - Free SMTP with a Backup Provider ===
Contributors: badhonrocks
Tags: smtp, email log, mailer, email, deliverability
Requires at least: 7.0
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 1.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Send WordPress email through Amazon SES, Postmark, Resend, Brevo or any SMTP. If a send fails, your backup provider sends it.

== Description ==

Most web hosts are bad at sending email. Password resets, order receipts and form replies get blocked, land in spam, or never arrive.

Mailyard sends your WordPress email through a real email service. Add a second one as a backup: if the first one fails, the backup sends the same email straight away.

Everything is free. No Pro version, no locked features, no upgrade nags. More at [plugpress.co/mailyard](https://plugpress.co/mailyard).

= Features =

* **Backup provider.** If a send fails, your backup sends the same email.
* **Email log.** Every email, with the provider's exact error when one fails. Search, resend, export to CSV.
* **Failure alerts.** By email, Slack, Discord or Teams, plus an optional weekly summary.
* **Deliverability check.** Grades your SPF, DKIM, DMARC and MX records A–F and gives you the DNS record to add.
* **Sender routing.** Send each From address through its own provider.
* **Bounce tracking.** For Amazon SES, Postmark, Resend and Brevo.
* **One-click import.** Bring your settings over from WP Mail SMTP, Easy WP SMTP, FluentSMTP or Post SMTP.
* **Fewer WordPress emails.** Turn off new-user, comment and update notices. Password resets always go out.
* **Background sending.** Pages don't wait for the mail server.
* **Offline mode.** Log every email and send none. Made for staging sites.
* **Safe credentials.** Keep keys in wp-config.php, or encrypt them in the database.
* **Multisite.** Set it up once for the whole network.
* **AI tools.** Let Claude, Cursor or Codex check your setup and read the log. Each tool has its own switch.

= Providers =

Amazon SES, Postmark, Resend, Brevo, Mailgun, SendGrid, SMTP2GO, Mailjet, MailerSend, Maileroo, Gmail / Google Workspace, Microsoft 365 / Outlook, Zoho Mail, any SMTP server, or your host's PHP mail.

Not sure which to pick?

* **Resend:** easiest to set up
* **Brevo:** free for 300 emails a day
* **Postmark:** best inbox placement, great for stores
* **Amazon SES:** cheapest at high volume
* **Gmail, Microsoft 365, Zoho:** send from the mailbox you already have

= Privacy =

Mailyard only connects to the services you set up (see External services). No tracking, no phoning home. The email log saves each email's recipient, subject and body in your database. You can turn logging off in Settings.

= Source code =

The admin screens are built with React. The source is at https://github.com/plugpressco/mailyard in `src/`. Build it with `npm install`, then `npm run build`.

== Installation ==

1. Install and activate Mailyard.
2. Go to Settings → SMTP.
3. Pick a provider, paste your API key and set your From address.
4. Click Send test on the Overview.

**Add a backup:** in Connections, add a second provider and drag it below the first.

**Switching from another SMTP plugin?** Open Connections and Mailyard offers to import your settings. Then deactivate the old plugin.

== External services ==

Mailyard sends nothing anywhere until you pick a provider and enter its credentials. After that, each email your site sends (recipients, sender, subject, body and attachments) goes to the provider you set up when WordPress sends it, and to your backup if the first one fails.

Each provider below is only used if you pick it:

* **Resend:** `https://api.resend.com/emails`. [Terms](https://resend.com/legal/terms-of-service), [Privacy](https://resend.com/legal/privacy-policy)
* **Brevo:** `https://api.brevo.com/v3/smtp/email`. [Terms](https://www.brevo.com/legal/termsofuse/), [Privacy](https://www.brevo.com/legal/privacypolicy/)
* **Postmark:** `https://api.postmarkapp.com/email`. [Terms](https://postmarkapp.com/terms-of-service), [Privacy](https://postmarkapp.com/privacy-policy)
* **Amazon SES:** `https://email.{your-region}.amazonaws.com/v2/email/outbound-emails`. If you turn on SES bounce webhooks, Mailyard also makes one request to the Amazon SNS `SubscribeURL` (only on `amazonaws.com`) to confirm the subscription. [Terms](https://aws.amazon.com/service-terms/), [Privacy](https://aws.amazon.com/privacy/)
* **Mailgun:** `https://api.mailgun.net/v3/{your-domain}/messages` (or `api.eu.mailgun.net` for the EU region). [Terms](https://www.mailgun.com/legal/terms/), [Privacy](https://www.mailgun.com/legal/privacy-policy/)
* **SendGrid (Twilio):** `https://api.sendgrid.com/v3/mail/send`. [Terms](https://www.twilio.com/en-us/legal/tos), [Privacy](https://www.twilio.com/en-us/legal/privacy)
* **SMTP2GO:** `https://api.smtp2go.com/v3/email/send`. [Terms](https://www.smtp2go.com/terms/), [Privacy](https://www.smtp2go.com/privacy/)
* **Mailjet:** `https://api.mailjet.com/v3.1/send`. [Terms](https://www.mailjet.com/legal/terms/), [Privacy](https://www.mailjet.com/legal/privacy-policy/)
* **MailerSend:** `https://api.mailersend.com/v1/email`. [Terms and Privacy](https://www.mailersend.com/legal)
* **Maileroo:** `https://smtp.maileroo.com/api/v2/emails`. [Terms](https://maileroo.com/terms-conditions), [Privacy](https://maileroo.com/privacy-policy)
* **Gmail (Google):** you sign in at `https://accounts.google.com`, sign-in tokens are exchanged and refreshed at `https://oauth2.googleapis.com/token`, and email goes to `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`. No password is stored. [Terms](https://policies.google.com/terms), [Privacy](https://policies.google.com/privacy)
* **Microsoft 365:** sign-in (or the app's own credentials, for app-only) goes to `https://login.microsoftonline.com`, and email goes to `https://graph.microsoft.com/v1.0/me/sendMail` (or `/users/{mailbox}/sendMail` for app-only). No password is stored. [Terms](https://www.microsoft.com/servicesagreement), [Privacy](https://privacy.microsoft.com/privacystatement)
* **Zoho Mail:** sign-in and token refresh go to `https://accounts.{your data center}` (for example accounts.zoho.com). Your mailbox's account ID and verified addresses are read from, and email and attachments are sent to, `https://mail.{your data center}/api/accounts`. No password is stored. [Terms](https://www.zoho.com/terms.html), [Privacy](https://www.zoho.com/privacy.html)
* **Custom SMTP:** email goes to the SMTP host and port you enter. Check that service's own terms and privacy policy.

Two more services, used only in these cases:

* **Chat webhook:** only if you add a webhook URL in Settings → Alerts (Slack, Discord, Microsoft Teams or any address you choose). Mailyard posts your site name and address, how many emails failed, and the provider's error. Email contents and recipients are never posted. The terms and privacy policy of the service you picked apply.
* **Cloudflare DNS over HTTPS:** only used by the deliverability checker, and only when your server's own DNS lookup fails. It sends just your domain name to `https://cloudflare-dns.com/dns-query` to read its SPF, DKIM, DMARC and MX records. [Terms](https://www.cloudflare.com/website-terms/), [Privacy](https://developers.cloudflare.com/1.1.1.1/privacy/public-dns-resolver/)

== Frequently Asked Questions ==

= Why is WordPress not sending emails? =

By default, WordPress sends email through your web host, and hosts aren't built for it: no SPF or DKIM, and shared IPs with poor reputations. Gmail and Outlook block that mail or send it to spam. Mailyard fixes this by sending through a real email service.

= Is Mailyard an alternative to WP Mail SMTP, FluentSMTP or Post SMTP? =

Yes. It does the same job and adds a backup provider, sender routing, bounce tracking and a deliverability check, all free. It can import your settings from those plugins. Deactivate the old one afterwards, because two mailers conflict.

= Does it work with WooCommerce, Contact Form 7 or Gravity Forms? =

Yes. Any plugin that sends mail the normal WordPress way goes through Mailyard automatically.

= What happens if my provider goes down? =

If you've added a backup, it sends the same email right away. With only one provider, the email fails as it normally would and the log shows why.

= Can I send from Gmail or Microsoft 365? =

Yes, with no password stored. Create an OAuth app in Google Cloud or Microsoft Entra ID, paste its Client ID and Secret, and click Connect account. For client sites, Microsoft 365 app-only sends without anyone signing in. Zoho Mail works the same way.

= Where are my API keys stored? =

In your WordPress database, and they're only ever sent to the provider they belong to. You can encrypt them, or keep them in wp-config.php instead (for example `MAILYARD_SMTP_PASSWORD`).

= How long are email logs kept? =

30 days by default. Choose 7, 30 or 90 days, or forever, in Settings → Delivery, or turn logging off.

= Does uninstalling delete my data? =

No. Your logs and settings stay, so you can reinstall without losing anything. Only the Delete all data button in Settings removes them.

= Can an AI assistant use Mailyard? =

Yes. Mailyard adds five tools to the WordPress Abilities API: delivery status, deliverability check, read the log, open one email, and send a test. Connect Claude, Cursor or Codex through an MCP bridge. Settings → Connect AI shows the steps, and each tool has its own switch.

= Is it really free? =

Yes. Every feature is free. Nothing is locked, metered or held back for an upgrade.

== Screenshots ==

1. Setup: pick a provider, paste your key, set your sender.
2. Overview: sending health, 14 days of volume and recent activity.
3. Connections: add providers and drag them to set the order.
4. Deliverability: each sending domain graded A–F, with the DNS fix.
5. Email log: every email, its status, and the error if it failed.
6. Connect AI: the master switch and per-tool permissions.

== Changelog ==

= 1.1.0 (2026/10/09) =
* Add: Six more providers — Mailgun, SendGrid, SMTP2GO, Mailjet, MailerSend and Maileroo.
* Add: Gmail / Google Workspace, Microsoft 365 / Outlook (including app-only, no sign-in) and Zoho Mail over OAuth 2.0 — no password stored.
* Add: One-click import from WP Mail SMTP, Easy WP SMTP, FluentSMTP or Post SMTP — provider, credentials and sender come over, including FluentSMTP's backup and per-sender routing.
* Add: Failure alerts by email — sent by your server's own mailer, so they arrive even when the provider is what broke. Also when a backup has to take over. At most one per hour.
* Add: Alerts on Slack, Discord, Microsoft Teams or any JSON webhook, with a test button. Individual emails are never posted.
* Add: Weekly summary — what went out, what failed, the most common errors. Nothing on a quiet week.
* Add: WordPress emails — switch off the notifications WordPress sends by itself (new users, password and email changes, comments, auto-update reports). Password resets always go out.
* Add: Return path — send bounces to their own mailbox (SMTP and PHP Mail), per message via the `mailyard_return_path` filter.
* Add: Background sending — the page answers first and the email goes out right after, shown as Pending in the log until then.
* Add: Offline mode — every email is logged, none are sent. For staging and development sites.
* Add: PHP Mail as a connection — your server's own mail, no setup, handy as the last backup in the chain.
* Add: The email log shows each message's Cc, Bcc and Reply-To.
* Add: Email log filters by provider, paging, and CSV export.
* Add: Keep logs for 7, 30 or 90 days, or forever.
* Add: Credentials can live in wp-config.php (`MAILYARD_{PROVIDER}_{FIELD}`, e.g. `MAILYARD_SMTP_PASSWORD`) instead of the database.
* Add: Optional encryption of stored credentials, with a clear warning if the site's security keys change.
* Add: Multisite shared settings — set email up once on the main site and let every site use it; the sender and delivery options are each optional to share. Logs always stay per site.
* Add: Settings backup — export and import settings and connections as one file; empty the log on its own.
* Add: Overview panel with the week's most common failure reasons, in plain words.
* Add: Setup checks on the Overview — another plugin replacing wp_mail(), a From address on another domain, and Contact Form 7 / WPForms / Gravity Forms set to send "from" the visitor.
* Update: Any logged email can be resent, not only failed ones.
* Add: Send test names the provider that delivered it, and says so when a backup had to take over.
* Update: Mailyard now lives under Settings → SMTP instead of its own top-level menu, with one slim top bar (Overview, Connections, Email log, Deliverability, Settings) and settings sections as tabs. Old links and bookmarks redirect.
* Update: The "email failed to send" notice shows on the WordPress Dashboard and Plugins screens only, with a single Dismiss link.
* Update: Connections no longer have a Marketing/Transactional purpose; every enabled connection carries all mail. A connection that was set to Marketing only is switched off on update (its settings are kept).
* Update: An email to several recipients goes out as one message, as WordPress sends it, instead of one copy per address.
* Fix: Cc and Bcc addresses set in email headers were dropped by every provider.
* Fix: Custom headers (List-Unsubscribe, X-…) and attachment filenames set by the sending plugin now reach the provider.
* Fix: Two connections on the same provider (two Postmark servers, say) no longer share one set of credentials during failover.
* Fix: Amazon SES no longer garbles non-English text or rejects long HTML lines.
* Fix: Custom SMTP with Encryption set to None no longer switches to TLS on its own.

= 1.0.2 (2026/07/30) =
* Fix: The connection Test now sends through the same provider settings as real mail — a Marketing-purpose Postmark connection tests on the broadcast stream, not the transactional one.

= 1.0.1 (2026/07/29) =
* Fix: Reply-To headers in "Name <email>" form are reduced to the bare address before reaching the provider — replies to form notifications no longer bounce.
* Fix: Emails without an explicit Content-Type header now follow `wp_mail_content_type`, so plain-text messages keep their line breaks.

= 1.0.0 (2026/07/17) =
* First release!
* Add: Six ways to send — Amazon SES, Postmark, Resend, Brevo, custom SMTP, or PHP mail.
* Add: Automatic failover to a backup provider, on the same send.
* Add: Email log with the provider's exact error on every failure, self-cleaning after 30 days.
* Add: Deliverability checker — SPF, DKIM, DMARC, and MX records graded A–F with the exact DNS fix.
* Add: Bounce and complaint webhooks for all four providers, normalized into one hook.
* Add: AI agent tools (MCP) on the WordPress Abilities API, each with its own permission switch.
