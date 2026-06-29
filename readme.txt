=== Mailyard ===
Contributors: badhonrocks
Tags: smtp, wp-mail, email-log, email-deliverability, failover
Requires at least: 5.8
Tested up to: 7.0
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Reliable WordPress email with automatic failover between providers, sender routing, bounce tracking, and a deliverability checker.

== Description ==

Mailyard makes sure your site's email actually shows up — password resets, WooCommerce orders, form notifications, the lot. By default WordPress hands email to your host's mail server, which usually either blocks it or dumps it in spam. Mailyard sends it through a real email service instead.

Plenty of plugins do that part. What Mailyard adds is everything around it:

= Failover =

You can set up more than one provider. If the first one fails, Mailyard tries the next one on the same send, so the email isn't lost. Most SMTP plugins just give up.

= Sender routing =

Send different addresses through different providers, or split marketing mail off from transactional mail. Useful once you outgrow a single inbox.

= Bounce and complaint tracking =

When someone's address hard-bounces or marks you as spam, Postmark, Amazon SES, Resend, and Brevo can tell you. Mailyard catches those events, tidies them into one shape, and fires a `mailyard_bounce` action other plugins can listen to.

= Deliverability checker =

Checks your domain's SPF, DKIM, DMARC, and MX records and points out what's missing. This is usually why mail lands in spam.

You also get a full email log, one-click test sends, a warning if another SMTP plugin is fighting you, and automatic log cleanup after 30 days. It's all free — there's no Pro version.

= Setup =

Pick a provider, paste your API key, set the address you send from. That's the whole setup. No code.

= Providers you can use =

* Resend — free for 3,000 emails a month, easiest to start with.
* Brevo (was Sendinblue) — free for 300 a day.
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

== Installation ==

1. Search for "Mailyard" in Plugins → Add New (or upload the zip), then activate.
2. Open Settings → Mailyard.
3. Pick a provider, enter your API key, set your sender address.
4. Hit Send test on the Dashboard to confirm it works.

= Adding a backup provider =

In the Connections tab, click Add, set up a second provider, enable it, and drag it below your main one. If the main provider fails, the backup takes over automatically.

= Coming from another SMTP plugin =

Turn off your current mail plugin (WP Mail SMTP, FluentSMTP, Post SMTP, whatever) before activating Mailyard. Two of them running together causes conflicts — Mailyard will warn you if it spots another one.

== Frequently Asked Questions ==

= Will this fix my emails not sending? =

That's the whole point. Connect a provider (Resend is free), send a test, you're done.

= Does it work with WooCommerce, Contact Form 7, Gravity Forms? =

Yes. Anything that uses WordPress's normal email goes through Mailyard automatically.

= Which provider should I pick? =

Just starting out, go with Resend — free and simple. For a store or real volume, Postmark has the best inbox placement. Brevo's a decent free pick if you send under 300 a day.

= What if my provider goes down? =

If you've added a backup in Connections, Mailyard retries it on the same send and nothing is lost. With only one provider, the email fails like it normally would.

= Gmail or Microsoft 365? =

Personal Gmail works through Custom SMTP with an app password. Google Workspace and Microsoft 365 have switched off basic SMTP auth, so use Resend or Postmark for those.

= How long do you keep logs? =

30 days, then they're deleted automatically. You can also turn logging off in Settings.

= Does uninstalling delete my data? =

No. Uninstalling leaves your logs and settings alone so you can reinstall without losing anything. If you actually want it all gone, there's a Delete all data button in Settings — that's the only thing that wipes your data, and it never runs on its own.

= Is it really free? =

Yes. No Pro version, nothing locked away.

== Screenshots ==

1. Setup — pick a provider, paste your key, set your sender address.
2. Dashboard — sending health, the last 14 days of volume, recent activity.
3. Connections — add providers and drag to choose the primary.
4. Email Logs — every send, with status and the error if it failed.
5. Settings — default From address and the logging toggle.

== Changelog ==

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

= 1.0.0 =
First release.
</content>
