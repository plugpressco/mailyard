=== Mailyard – WP SMTP Plugin with Email Failover, Email Log, Amazon SES, Postmark, Resend & Brevo ===
Contributors: badhonrocks
Tags: smtp, email, email-log, deliverability, transactional-email
Requires at least: 6.0
Tested up to: 7.0
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

WP SMTP plugin with automatic email failover, email log & deliverability fixes. Send via Amazon SES, Postmark, Resend, Brevo or any SMTP.

== Description ==

**Mailyard is a WordPress SMTP plugin with a backup plan.** Connect Amazon SES, Postmark, Resend, Brevo, or any SMTP server, and every email your site sends — password resets, WooCommerce receipts, form notifications — goes through a real email service instead of your host's mail server. And if that service fails, Mailyard switches to your backup **on the same send**, so the email still goes out.

Out of the box, WordPress hands `wp_mail()` to your web host, and most hosts are bad at email: messages get blocked, land in spam, or vanish without a trace. That's why "WordPress not sending emails" is one of the most common problems on any support forum. Mailyard fixes it — and keeps it fixed when your provider has a bad day.

Everything you see is free. No locked buttons, no crippled features, no upgrade nags.

= What you get =

* **Automatic email failover** — a backup provider takes over the moment the first one fails
* **Six ways to send** — Amazon SES, Postmark, Resend, Brevo, custom SMTP, or PHP mail
* **Smart sender routing** — the right provider for each kind of mail, automatically
* **Full email log** — every send and every failure, with the exact error
* **Deliverability checker** — grades your SPF, DKIM, DMARC & MX records and hands you the fix
* **Bounce & complaint tracking** — one clean hook for all four provider webhooks
* **AI agent tools (MCP)** — let Claude, Cursor, or Codex diagnose your email problems
* **60-second setup** — pick a provider, paste a key, send a test

= Automatic email failover =

Add a backup provider and Mailyard switches to it the moment your first one fails — on the same send, not in a retry queue. A flaky API key on a Saturday night stops being your problem. Most SMTP plugins just give up and log the failure; SMTP failover is the reason Mailyard exists.

= Smart sender routing =

Send store receipts through Postmark and newsletters through Brevo, automatically, based on the from address. One site, the right provider for each kind of mail. You can also split by purpose — transactional email one way, marketing the other.

= Full email log =

Every email your site sends is logged — recipient, subject, status, and the exact provider error when something fails — so "did the order confirmation go out?" takes ten seconds to answer, not an afternoon of digging through server logs. Logs clean themselves up after 30 days, and you can switch email logging off entirely.

= Deliverability checker (SPF, DKIM, DMARC & MX) =

Reads your sending domain's SPF, DKIM, DMARC, and MX records, grades them A–F, and tells you exactly which DNS record to add. That missing record is usually the reason email lands in spam — and most people never find out.

= Bounce and complaint tracking =

When an address hard-bounces or someone hits "mark as spam", Postmark, Amazon SES, Resend, and Brevo report it back. Mailyard catches those events, tidies them into one shape, and fires a single `mailyard_bounce` hook your other plugins can act on — so bad addresses get caught instead of quietly wrecking your sender reputation.

= AI agents (MCP) =

WordPress 7.0 shipped the Abilities API — the layer that lets AI tools operate your site. Mailyard is built on it from day one, so Claude, Codex, Cursor — any MCP client — can answer "why aren't my WooCommerce emails arriving?" for you: check the provider and fallback chain, score your SPF/DKIM/DMARC records (with the exact DNS lines to add), read the failure log, and send a test once it's fixed.

You decide what it may touch. Settings → Connect AI has a master switch and a per-tool permission for each of the five tools, with a step-by-step guide to connecting your client. Nothing is exposed until you install an MCP bridge (the free WordPress MCP Adapter plugin), and Mailyard never sends your data anywhere on its own. Needs WordPress 7.0 — the current release.

= 60-second setup =

Pick a provider, paste your API key, set the address you send from. That's the whole thing. No code, no config files. Mailyard also warns you if another SMTP plugin is fighting you, and one-click test sends tell you immediately that mail is flowing.

= Providers you can use =

* **Resend** — easiest to start with.
* **Brevo** (was Sendinblue) — all-in-one email platform.
* **Postmark** — best inbox placement, made for stores.
* **Amazon SES** — cheapest at high volume.
* **Custom SMTP** — any SMTP server or relay, Gmail app passwords included.
* **Default PHP mail** — your host's server. No setup, but don't count on it.

= Mailyard Pro =

If you also want to *send campaigns* — broadcast email, contacts, and automations — that's a separate paid plugin, Mailyard Pro, which uses Mailyard as its delivery engine. Mailyard itself never nags you about it, and nothing in this plugin is held back for it.

= Who's behind this =

One person — Fahim, in Dhaka, building WordPress plugins since 2011. DiviPeople and DiviTorque come from the same desk and run on 170,000+ sites. When you post in the support forum, the developer answers; there's no tier-1 script to get past.

= Source code =

The admin screens are React, built with `@wordpress/scripts`. The unminified source lives at https://github.com/plugpressco/mailyard under `src/`. To build it yourself: `npm install`, then `npm run build`.

= Privacy =

Mailyard only talks to the email service you set up. It doesn't phone home and it doesn't track you.

The deliverability checker reads your domain's DNS records. It uses your server's resolver first, and only if that fails does it fall back to Cloudflare's public DNS (`cloudflare-dns.com`) — which sees the domain name and nothing more.

If logging is on (it is by default), each email's recipient, subject, and body get saved to your database. Turn it off in Settings whenever you want.

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

Freemius — account and update service (`api.freemius.com`), used for the optional Mailyard account and for licensing the separate Mailyard Pro add-on. Usage tracking is strictly opt-in: unless you explicitly opt in (or activate a Mailyard Pro license), nothing is sent. When you do, Freemius receives basic site data — site URL, WordPress/PHP versions, and the plugin version — never your email content, logs, or API keys.
Terms: https://freemius.com/terms/ — Privacy: https://freemius.com/privacy/

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

Because by default WordPress hands `wp_mail()` to your web host's own mail server, and web hosts aren't email providers: no proper SPF/DKIM authentication, shared IP addresses with bad reputations, silent failures. Gmail and Outlook treat that mail as suspicious, so it gets blocked or lands in spam. The fix is routing email through a real provider over SMTP or an API — which is exactly what Mailyard does. Connect one, send a test, and if the test lands, your password resets and order emails will too.

= Is Mailyard an alternative to WP Mail SMTP, FluentSMTP, or Post SMTP? =

Yes. Mailyard does the same core job — routing `wp_mail()` through a real email service — and adds the things most of them don't have: automatic failover on the same send, sender routing across multiple providers, bounce and complaint tracking, and a deliverability checker, all free. Just deactivate the other SMTP plugin first; two mailers at once conflict.

= Does it work with WooCommerce, Contact Form 7, Gravity Forms? =

Yes. Anything that sends mail the normal WordPress way goes through Mailyard automatically — no per-plugin setup.

= Can an AI assistant use Mailyard? =

Yes — that's what Settings → Connect AI is for. Mailyard registers five tools on the WordPress Abilities API that shipped in WordPress 7.0: delivery status, deliverability check, read the email log, open one logged email, and send a test. Install an MCP bridge (the free WordPress MCP Adapter plugin), create an Application Password, and paste the endpoint into Claude Code, Claude Desktop, Cursor, Codex, or Windsurf — the in-plugin guide gives you the exact command. Every tool has its own on/off switch, and the whole thing is off in one click. On WordPress older than 7.0 the tools simply don't appear.

= Which provider should I pick? =

Just starting out, go with Resend — one key and you're sending in five minutes. Running a store, Postmark: it only carries transactional mail, so its sending reputation stays clean. Brevo gives you 300 free emails a day, plenty for a small site. Amazon SES runs about $0.10 per 1,000 emails, which nothing beats at volume. And if you already have an account somewhere, just use that — Mailyard doesn't care which one you choose.

= What if my provider goes down? =

If you've added a backup in Connections, Mailyard retries on the same send and nothing is lost. With only one provider, the email fails like it normally would — so add a backup.

= Where are my API keys stored? =

In your WordPress database, like any SMTP plugin's settings. They're only ever sent to the provider they belong to — never to us, never anywhere else.

= Gmail or Microsoft 365? =

Personal Gmail works through Custom SMTP with an app password. Google Workspace and Microsoft 365 have switched off basic SMTP auth, so use Resend or Postmark for those.

= How long do you keep logs? =

30 days, then they're deleted automatically. You can also turn logging off entirely in Settings.

= Does uninstalling delete my data? =

No. Uninstalling leaves your logs and settings alone, so you can reinstall without losing anything. If you want it all gone, there's a Delete all data button in Settings — that's the only thing that wipes your data, and it never runs on its own.

= Is it really free? =

Yes. Every feature you can see is yours — failover, routing, bounce tracking, the deliverability checker, the email log. Nothing in this plugin is locked or metered. The only thing we sell is Mailyard Pro, a separate campaigns plugin that builds on top of Mailyard — this plugin is complete without it.

== Screenshots ==

1. Setup — pick a provider, paste your key, set your sender address.
2. Dashboard — sending health, the last 14 days of volume, recent activity.
3. Connections — add providers and drag to choose the primary and its backup.
4. Deliverability — every sending domain graded A–F, with the exact DNS fix for anything that fails.
5. Email Logs — every send, with status and the error if it failed.
6. Settings → Connect AI — the master switch and per-tool permissions for AI agents.

== Changelog ==

= 1.0.0 =
* Initial release.
