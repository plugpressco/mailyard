=== Mailyard ===
Contributors: badhonrocks
Tags: smtp, wp-mail, email-log, email-deliverability, failover
Requires at least: 5.8
Tested up to: 7.0
Requires PHP: 7.4
Stable tag: 1.2.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

WordPress email with a backup plan — automatic failover between providers, sender routing, bounce tracking, and a deliverability checker.

== Description ==

Mailyard makes sure the email your site sends actually arrives — password resets, WooCommerce receipts, form notifications, all of it. Out of the box, WordPress hands mail to your host's server, and most hosts are bad at email: messages get blocked, land in spam, or vanish without a trace. Mailyard routes everything through a real email service instead.

Plenty of plugins do that part. Here's what Mailyard does that most of them don't:

= Automatic failover =

Add a backup provider and Mailyard switches to it the moment your first one fails — on the same send, not in a retry queue. A flaky API key on a Saturday night stops being your problem. Most SMTP plugins just give up and log the failure.

= Sender routing =

Send store receipts through Postmark and newsletters through Brevo, automatically, based on the from address. One site, the right provider for each kind of mail. You can also split by purpose — transactional one way, marketing the other.

= Bounce and complaint tracking =

When an address hard-bounces or someone hits "mark as spam", Postmark, Amazon SES, Resend, and Brevo report it back. Mailyard catches those events, tidies them into one shape, and fires a single `mailyard_bounce` hook your other plugins can act on — so bad addresses get caught instead of quietly wrecking your sender reputation.

= Deliverability checker =

Reads your domain's SPF, DKIM, DMARC, and MX records and tells you exactly what's missing. That missing record is usually the reason mail lands in spam — and most people never find out.

And the rest: a full email log, one-click test sends, a warning if another SMTP plugin is fighting you, and automatic log cleanup after 30 days. Everything in Mailyard is free and stays free — no locked buttons, no crippled features.

= Mailyard Pro =

If you also want to *send campaigns* — broadcast email, contacts, and automations — that's a separate paid plugin, Mailyard Pro, which uses Mailyard as its delivery engine. Mailyard itself never nags you about it, and nothing in this plugin is held back for it.

= Setup =

Pick a provider, paste your API key, set the address you send from. That's the whole thing. No code, no config files.

= Providers you can use =

* Resend — easiest to start with.
* Brevo (was Sendinblue) — all-in-one email platform.
* Postmark — best inbox placement, good for stores.
* Amazon SES — cheapest at high volume.
* Custom SMTP — any SMTP server, Gmail app passwords included.
* Default PHP mail — your host's server. No setup, but don't count on it.

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

= Will this fix my emails not sending? =

That's the whole point. Connect a provider, send a test, you're done. If the test lands, your password resets and order emails will too.

= Does it work with WooCommerce, Contact Form 7, Gravity Forms? =

Yes. Anything that sends mail the normal WordPress way goes through Mailyard automatically — no per-plugin setup.

= Which provider should I pick? =

Just starting out, go with Resend — it's the simplest to set up. Running a store or sending real volume, Postmark has the best inbox placement. Brevo is a solid pick for lower volume. And if you already have an account somewhere, just use that — Mailyard doesn't care which one you choose.

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

Yes. Every feature you can see is yours — failover, routing, bounce tracking, the deliverability checker, the log. Nothing in this plugin is locked or metered. The only thing we sell is Mailyard Pro, a separate campaigns plugin that builds on top of Mailyard — this plugin is complete without it.

== Screenshots ==

1. Setup — pick a provider, paste your key, set your sender address.
2. Dashboard — sending health, the last 14 days of volume, recent activity.
3. Connections — add providers and drag to choose the primary.
4. Email Logs — every send, with status and the error if it failed.
5. Settings — default From address and the logging toggle.

== Changelog ==

= 1.2.0 =
* Mailyard moved from Settings → Mailyard to its own top-level admin menu, with sections (Dashboard, Connections, Deliverability, Logs, Settings) as native submenus. Old Settings-page bookmarks redirect automatically.
* New universal dashboard shell: the sidebar is now grouped, and family plugins (Mailyard Pro) plug their sections into the same dashboard — one menu for delivery and campaigns. Nothing changes when no add-on is installed.

= 1.1.0 =
* Mailyard is now the free parent product for the new Mailyard Pro campaigns add-on (separate plugin — nothing in Mailyard changed or got locked).
* Added the Freemius SDK for the optional account surface and Pro licensing. Strictly opt-in; disclosed under External services.

= 1.0.0 =
* First release.
* Six providers: Amazon SES, Postmark, Resend, Brevo, Custom SMTP, PHP Mail.
* Failover across backup providers on the same send.
* Sender / message-purpose routing (`X-Mailyard-Purpose` header or the `mailyard_purpose` filter).
* Bounce and spam-complaint webhooks for Postmark, Amazon SES, Resend, and Brevo, exposed through the `mailyard_bounce` action.
* Deliverability checker for SPF, DKIM, DMARC, and MX.
* Email logging with 30-day cleanup; attachments, CC, and BCC on every provider.
* Warns you if another SMTP plugin is active.
* Uninstall leaves your data in place, with a one-click erase in Settings if you want it gone.

== Upgrade Notice ==

= 1.2.0 =
Mailyard gets its own top-level admin menu and a unified dashboard that Mailyard Pro plugs into. Old Settings-page links redirect automatically.

= 1.1.0 =
Adds the Freemius account/licensing layer for the new Mailyard Pro add-on. No feature changes; everything stays free.

= 1.0.0 =
First release.
