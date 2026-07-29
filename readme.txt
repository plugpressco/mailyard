=== Mailyard – WP SMTP Plugin with Email Failover, Email Log, Amazon SES, Postmark, Resend & Brevo ===
Contributors: badhonrocks
Tags: smtp, email, email-log, deliverability, transactional-email
Requires at least: 7.0
Tested up to: 7.0
Requires PHP: 7.4
Stable tag: 1.0.1
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

WP SMTP plugin with automatic email failover, email log & deliverability fixes. Send via Amazon SES, Postmark, Resend, Brevo or any SMTP.

== Description ==

**Mailyard is a WordPress SMTP plugin with a backup plan.** Connect Amazon SES, Postmark, Resend, Brevo, or any SMTP server, and every email your site sends — password resets, WooCommerce receipts, form notifications — goes through a real email service instead of your host's mail server. And if that service fails, Mailyard switches to your backup **on the same send**, so the email still goes out.

Out of the box, WordPress hands `wp_mail()` to your web host, and most hosts are bad at email: messages get blocked, land in spam, or vanish without a trace. Mailyard fixes "WordPress not sending emails" — and keeps it fixed when your provider has a bad day.

Everything you see is free. No locked buttons, no crippled features, no upgrade nags. Plugin site: [plugpress.co/mailyard](https://plugpress.co/mailyard).

= What you get =

* **Automatic email failover** — a backup SMTP provider takes over the moment the first one fails, on the same send, not in a retry queue
* **Six ways to send** — Amazon SES, Postmark, Resend, Brevo, custom SMTP, or PHP mail
* **Smart sender routing** — store receipts through Postmark, newsletters through Brevo: the right provider per from address or purpose, automatically
* **Full email log** — every send and every failure with the exact provider error; logs clean themselves up after 30 days
* **Deliverability checker** — grades your SPF, DKIM, DMARC & MX records A–F and hands you the exact DNS record to add
* **Bounce & complaint tracking** — all four provider webhooks normalized into one `mailyard_bounce` hook
* **AI agent tools (MCP)** — let Claude, Cursor, or Codex diagnose your email problems
* **60-second setup** — pick a provider, paste a key, send a test; Mailyard warns if another SMTP plugin is fighting you

= Why failover matters =

Most SMTP plugins log the failure and give up. Mailyard retries the same email on your backup provider immediately — a flaky API key on a Saturday night stops being your problem. SMTP failover is the reason Mailyard exists.

= Deliverability, not just delivery =

Email that technically sends but lands in spam is still lost. The deliverability checker reads your sending domain's SPF, DKIM, DMARC, and MX records and tells you exactly which DNS record to fix — usually the difference between the inbox and the spam folder.

= AI agents (MCP) =

Built on the Abilities API that shipped in WordPress 7.0: any MCP client — Claude, Codex, Cursor — can check your provider and fallback chain, score your DNS records, read the failure log, and send a test once it's fixed. Settings → Connect AI has a master switch and a per-tool permission for each of the five tools; nothing is exposed until you install an MCP bridge (the free WordPress MCP Adapter plugin), and Mailyard never sends your data anywhere on its own.

= Providers you can use =

* **Resend** — easiest to start with
* **Brevo** (was Sendinblue) — all-in-one email platform
* **Postmark** — best inbox placement, made for stores
* **Amazon SES** — cheapest at high volume
* **Custom SMTP** — any SMTP server or relay, Gmail app passwords included
* **Default PHP mail** — your host's server; no setup, but don't count on it

= Mailyard Pro — broadcast email to your customers =

Mailyard delivers your site's email. **[Mailyard Pro](https://plugpress.co/mailyard)** builds email marketing on top of it:

* **Broadcast campaigns** — write, schedule, and send email to your customers, rate-limited to match your provider
* **Notion-style email editor** — slash commands, buttons, images, dividers, desktop & mobile preview, bulletproof email HTML
* **AI writing assistant** — draft and rewrite emails with Claude, using your own Anthropic API key
* **Contacts, groups & segments** — one deduped contact list, saved dynamic segments, CSV import & export
* **Open tracking & campaign analytics** — see how every campaign performed, with tracking you can switch off
* **Compliance built in** — one-click unsubscribe (RFC 8058), automatic footer with your business address, GDPR export & erase

Nothing in free Mailyard is held back for Pro, and Mailyard never nags you about it. [Get Mailyard Pro →](https://plugpress.co/mailyard)

= Who's behind this =

One person — Fahim, in Dhaka, building WordPress plugins since 2011. DiviPeople and DiviTorque come from the same desk and run on 170,000+ sites. When you post in the support forum, the developer answers; there's no tier-1 script to get past.

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

Yes. Every feature you can see is yours — failover, routing, bounce tracking, the deliverability checker, the email log. Nothing is locked or metered. The only thing we sell is [Mailyard Pro](https://plugpress.co/mailyard), a separate broadcast-campaigns plugin that builds on top of Mailyard — this plugin is complete without it.

== Screenshots ==

1. Setup — pick a provider, paste your key, set your sender address.
2. Dashboard — sending health, the last 14 days of volume, recent activity.
3. Connections — add providers and drag to choose the primary and its backup.
4. Deliverability — every sending domain graded A–F, with the exact DNS fix for anything that fails.
5. Email Logs — every send, with status and the error if it failed.
6. Settings → Connect AI — the master switch and per-tool permissions for AI agents.

== Changelog ==

= 1.0.1 =
* Fix: Reply-To headers in "Name <email>" form are reduced to the bare address before reaching ESP drivers — replies to form-notification emails no longer bounce.
* Fix: emails without an explicit Content-Type header now follow `wp_mail_content_type` (plain text by default), preserving line breaks in plain-text messages.

= 1.0.0 =
* Initial release.
