=== Mailyard ===
Contributors: badhonrocks
Tags: smtp, email log, mailer, email, deliverability
Requires at least: 7.0
Tested up to: 7.0
Requires PHP: 7.4
Stable tag: 1.0.2
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Sends your WordPress email through Amazon SES, Postmark, Resend, Brevo, Mailgun, SendGrid, or any SMTP — and switches to a backup when a send fails.

== Description ==

WordPress hands your email to your web host, and most hosts are bad at email. Messages get blocked, land in spam, or disappear without a trace. So every site I've run ended up with an SMTP plugin — and every SMTP plugin I tried did the same thing when the provider failed. It wrote a log entry and gave up. The password reset, the order receipt, the form reply: gone.

That felt wrong.

So I built Mailyard. It sends your email through a real service — Amazon SES, Postmark, Resend, Brevo, Mailgun, SendGrid, SMTP2GO, Mailjet, MailerSend, Maileroo, or any SMTP server — and if that service fails, it retries the same email through your backup, on the same send. Not in a retry queue. Not tomorrow. The email still goes out.

That is Mailyard, and all of it is free. No locked buttons, no upgrade nags. Plugin site: [plugpress.co/mailyard](https://plugpress.co/mailyard).

= What it does =

* **A backup that takes over.** The moment a send fails, your backup provider tries the same email.
* **Twelve ways to send.** Amazon SES, Postmark, Resend, Brevo, Mailgun, SendGrid, SMTP2GO, Mailjet, MailerSend, Maileroo, custom SMTP, or plain PHP mail.
* **A log of every email.** Every send and every failure, with the provider's exact error. Logs delete themselves after 30 days.
* **A deliverability checker.** Your SPF, DKIM, DMARC, and MX records, graded A–F, with the exact DNS record to add.
* **Sender routing.** Receipts through Postmark, newsletters through Brevo — the right provider per sender, automatically.
* **Bounce tracking.** Amazon SES, Postmark, Resend, and Brevo webhooks, normalized into one `mailyard_bounce` hook.
* **AI tools.** Claude, Cursor, or Codex can check your setup and read the log — every tool has its own off switch, and nothing is exposed until you set it up.

Setup takes a minute: pick a provider, paste a key, send a test. If another SMTP plugin is fighting you, Mailyard says so.

= Which provider? =

* **Resend** — easiest to start with
* **Brevo** — has a free tier, 300 emails a day
* **Postmark** — best inbox placement, made for stores
* **Amazon SES** — cheapest at high volume
* **Mailgun, SendGrid, SMTP2GO, Mailjet, MailerSend, Maileroo** — already have an account with one? Use it
* **Custom SMTP** — any SMTP server, Gmail app passwords included
* **PHP mail** — your host's server; no setup, but don't count on it

= Source code =

The admin screens are React, built with `@wordpress/scripts`. The unminified source lives at https://github.com/plugpressco/mailyard under `src/` — `npm install`, then `npm run build`.

= Privacy =

Mailyard only talks to the email service you set up. It doesn't phone home and it doesn't track you. The deliverability checker reads your domain's DNS records via your server's resolver, falling back to Cloudflare's public DNS only if that fails (it sees the domain name and nothing more). If email logging is on (it is by default), each email's recipient, subject, and body are saved to your database — turn it off in Settings whenever you want.

== External services ==

Mailyard sends your WordPress email through a third-party email service that you choose and set up with your own account and API key. Nothing is sent anywhere until you pick a provider and enter its credentials, and then it only goes to that one provider (plus its fallback, if you added one).

What gets sent is the email your site is already trying to send: the recipient address(es), the sender, the subject, the body, and any attachments. It's sent at the moment WordPress sends that email — a password reset, a WooCommerce order, a contact-form reply, and so on.

Resend — email delivery API, used if you pick Resend. Each email goes to `https://api.resend.com/emails`.
Terms: https://resend.com/legal/terms-of-service — Privacy: https://resend.com/legal/privacy-policy

Brevo (formerly Sendinblue) — email delivery API, used if you pick Brevo. Each email goes to `https://api.brevo.com/v3/smtp/email`.
Terms: https://www.brevo.com/legal/termsofuse/ — Privacy: https://www.brevo.com/legal/privacypolicy/

Postmark — email delivery API, used if you pick Postmark. Each email goes to `https://api.postmarkapp.com/email`.
Terms: https://postmarkapp.com/terms-of-service — Privacy: https://postmarkapp.com/privacy-policy

Amazon SES (Simple Email Service) — Amazon's email delivery API, used if you pick Amazon SES. Each email goes to `https://email.{your-region}.amazonaws.com/v2/email/outbound-emails`. If you turn on bounce/complaint webhooks for SES, Mailyard also confirms the Amazon SNS subscription with a one-time request to the AWS-hosted `SubscribeURL` (it checks the host is on `amazonaws.com` first).
Terms: https://aws.amazon.com/service-terms/ — Privacy: https://aws.amazon.com/privacy/

Mailgun — email delivery API, used if you pick Mailgun. Each email goes to `https://api.mailgun.net/v3/{your-domain}/messages` (or `api.eu.mailgun.net` for the EU region).
Terms: https://www.mailgun.com/legal/terms/ — Privacy: https://www.mailgun.com/legal/privacy-policy/

SendGrid (Twilio) — email delivery API, used if you pick SendGrid. Each email goes to `https://api.sendgrid.com/v3/mail/send`.
Terms: https://www.twilio.com/en-us/legal/tos — Privacy: https://www.twilio.com/en-us/legal/privacy

SMTP2GO — email delivery API, used if you pick SMTP2GO. Each email goes to `https://api.smtp2go.com/v3/email/send`.
Terms: https://www.smtp2go.com/terms/ — Privacy: https://www.smtp2go.com/privacy/

Mailjet — email delivery API, used if you pick Mailjet. Each email goes to `https://api.mailjet.com/v3.1/send`.
Terms: https://www.mailjet.com/legal/terms/ — Privacy: https://www.mailjet.com/legal/privacy-policy/

MailerSend — email delivery API, used if you pick MailerSend. Each email goes to `https://api.mailersend.com/v1/email`.
Terms and Privacy: https://www.mailersend.com/legal

Maileroo — email delivery API, used if you pick Maileroo. Each email goes to `https://smtp.maileroo.com/api/v2/emails`.
Terms: https://maileroo.com/terms-conditions — Privacy: https://maileroo.com/privacy-policy

Custom SMTP — if you pick the Custom SMTP option, email goes to the SMTP host and port you enter. That's whatever SMTP service or server you choose, so check its own terms and privacy policy.

Cloudflare DNS over HTTPS — only used by the deliverability checker, and only as a fallback when your server's own DNS lookup fails. It sends just your domain name (to read SPF/DKIM/DMARC/MX records) to `https://cloudflare-dns.com/dns-query`. No email content is involved.
Terms: https://www.cloudflare.com/website-terms/ — Privacy: https://developers.cloudflare.com/1.1.1.1/privacy/public-dns-resolver/

== Installation ==

1. Search for "Mailyard" in Plugins → Add New (or upload the zip), then activate.
2. Open the Mailyard menu in your admin sidebar.
3. Pick a provider, enter your API key, set your sender address.
4. Hit Send test on the Dashboard to confirm it works.

= Adding a backup provider =

In the Connections tab, click Add, set up a second provider, enable it, and drag it below your main one. If the main provider fails, the backup takes over automatically.

= Coming from another SMTP plugin =

Deactivate your current mail plugin (WP Mail SMTP, FluentSMTP, Post SMTP, whichever) before activating Mailyard. Two of them running at once causes conflicts — Mailyard will warn you if it spots one.

== Frequently Asked Questions ==

= Why is WordPress not sending emails? =

By default WordPress hands `wp_mail()` to your web host's own mail server, and web hosts aren't email providers: no proper SPF/DKIM authentication, shared IPs with bad reputations, silent failures. Gmail and Outlook treat that mail as suspicious, so it gets blocked or lands in spam. The fix is routing email through a real provider over SMTP or an API — which is exactly what Mailyard does.

= Is Mailyard an alternative to WP Mail SMTP, FluentSMTP, or Post SMTP? =

Yes — it does the same core job and adds the things most of them don't have: automatic failover on the same send, sender routing across multiple providers, bounce and complaint tracking, and a deliverability checker, all free. Deactivate the other SMTP plugin first; two mailers at once conflict.

= Does it work with WooCommerce, Contact Form 7, Gravity Forms? =

Yes. Anything that sends mail the normal WordPress way goes through Mailyard automatically — no per-plugin setup.

= Which provider should I pick? =

Just starting out: Resend — one key and you're sending in five minutes. Running a store: Postmark — best sending reputation for transactional mail. Want a free tier: Brevo gives you 300 emails a day. High volume: Amazon SES, about $0.10 per 1,000 emails. Already have an account somewhere? Just use that.

= What if my provider goes down? =

If you've added a backup in Connections, Mailyard retries on the same send and nothing is lost. With only one provider, the email fails like it normally would — so add a backup.

= Can an AI assistant use Mailyard? =

Yes — that's what Settings → Connect AI is for. Mailyard registers five tools on the WordPress 7.0 Abilities API: delivery status, deliverability check, read the email log, open one logged email, and send a test. Install an MCP bridge (the free WordPress MCP Adapter plugin), create an Application Password, and paste the endpoint into Claude Code, Claude Desktop, Cursor, Codex, or Windsurf — the in-plugin guide gives you the exact command. Every tool has its own on/off switch.

= Where are my API keys stored? =

In your WordPress database, like any SMTP plugin's settings. They're only ever sent to the provider they belong to — never to us, never anywhere else.

= Gmail or Microsoft 365? =

Personal Gmail works through Custom SMTP with an app password. Google Workspace and Microsoft 365 have switched off basic SMTP auth, so use Resend or Postmark for those.

= How long do you keep email logs? =

30 days, then they're deleted automatically. You can also turn logging off entirely in Settings.

= Does uninstalling delete my data? =

No. Uninstalling leaves your logs and settings alone, so you can reinstall without losing anything. The only thing that wipes your data is the Delete all data button in Settings, and it never runs on its own.

= Is it really free? =

Yes. Every feature you can see is yours — failover, routing, bounce tracking, the deliverability checker, the email log. Nothing is locked, metered, or held back for an upgrade.

== Screenshots ==

1. Setup — pick a provider, paste your key, set your sender address.
2. Dashboard — sending health, the last 14 days of volume, recent activity.
3. Connections — add providers and drag to choose the primary and its backup.
4. Deliverability — every sending domain graded A–F, with the exact DNS fix for anything that fails.
5. Email Logs — every send, with status and the error if it failed.
6. Settings → Connect AI — the master switch and per-tool permissions for AI agents.

== Changelog ==

= 1.1.0 =
* Add: Six more providers — Mailgun, SendGrid, SMTP2GO, Mailjet, MailerSend and Maileroo.
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
* Add: Send test names the provider that delivered it, and says so when a backup had to take over.
* Update: Simpler admin — one sidebar (Dashboard, Connections, Email log, Deliverability, Settings), mirrored in the WordPress menu.
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
