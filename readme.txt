=== Mailyard ===
Contributors: badhonrocks
Tags: smtp, wp-mail, email-log, email-deliverability, failover
Requires at least: 5.8
Tested up to: 7.0
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Reliable WordPress email: multi-provider failover, sender-based routing, bounce tracking, and a built-in deliverability checker.

== Description ==

Mailyard makes sure the email your WordPress site sends actually arrives — password resets, WooCommerce orders, form notifications, admin alerts.

Most SMTP plugins do one thing: route mail through one provider. Mailyard is a small **delivery layer** that does more.

= What makes Mailyard different =

* **Automatic failover.** Set up more than one email service. If your primary provider fails, Mailyard retries the next one *on the same send* — no email lost.
* **Sender-based routing.** Route different sender addresses, or marketing vs. transactional mail, through different providers.
* **Bounce & complaint tracking.** Mailyard receives bounce and spam-complaint events from Postmark, Amazon SES, Resend, and Brevo, normalizes them, and fires a `mailyard_bounce` action so other plugins can suppress bad addresses.
* **Built-in deliverability checker.** Inspects your domain's SPF, DKIM, DMARC, and MX records and tells you what's wrong.
* **Email log.** Every send recorded — recipient, subject, status — with one-click test sending.
* **100% free.** No Pro version, no locked features, no upsells.

= How it works =

Pick an email service, paste your API key, choose your sender address. From then on every email WordPress sends goes through that service instead of your host's unreliable mail server. No coding.

= Supported email services =

* **Resend** — free for 3,000 emails/month. Easiest start.
* **Brevo** (formerly Sendinblue) — free for 300 emails/day.
* **Postmark** — best inbox placement, ideal for stores.
* **Amazon SES** — very cheap at volume.
* **Custom SMTP** — any SMTP server, including Gmail app passwords.
* **Default (PHP mail)** — your host's mail server; no config, but unreliable.

= Source code =

The admin UI is built with React and bundled via `@wordpress/scripts`. The full unminified source is at https://github.com/plugpressco/mailyard (see `src/`). Build: `npm install` then `npm run build`.

= Privacy =

Mailyard only contacts the email service you configure. It does not phone home or track you.

The deliverability checker looks up your domain's DNS records using your server's resolver; if that fails it falls back to Cloudflare's public DNS (`cloudflare-dns.com`), which sees only the domain name.

With email logging on (the default), each email's recipient, subject, and body are stored in your WordPress database. You can turn logging off in Settings anytime.

== External services ==

Mailyard sends your WordPress email through a third-party email service that **you** choose and configure with your own account/API key. No email is sent to any external service until you select a provider and enter its credentials. Data is sent only to the single provider you have configured (plus its fallback, if you set one).

For every provider, the data sent is the email your WordPress site generates: the recipient address(es), sender, subject, message body, and any attachments — transmitted at the moment WordPress sends that email (for example a password reset, WooCommerce order email, or contact-form reply).

**Resend** — Email delivery API. Used when you select Resend as your provider. Each outgoing email is sent to `https://api.resend.com/emails`.
Terms: https://resend.com/legal/terms-of-service — Privacy: https://resend.com/legal/privacy-policy

**Brevo** (formerly Sendinblue) — Email delivery API. Used when you select Brevo. Each outgoing email is sent to `https://api.brevo.com/v3/smtp/email`.
Terms: https://www.brevo.com/legal/termsofuse/ — Privacy: https://www.brevo.com/legal/privacypolicy/

**Postmark** — Email delivery API. Used when you select Postmark. Each outgoing email is sent to `https://api.postmarkapp.com/email`.
Terms: https://postmarkapp.com/terms-of-service — Privacy: https://postmarkapp.com/privacy-policy

**Amazon SES (Simple Email Service)** — Email delivery API by Amazon Web Services. Used when you select Amazon SES. Each outgoing email is sent to `https://email.{your-region}.amazonaws.com/v2/email/outbound-emails`. If you enable bounce/complaint webhooks for SES, the plugin also confirms the Amazon SNS subscription by issuing a one-time request to the AWS-hosted `SubscribeURL` (validated to be an `amazonaws.com` host).
Terms: https://aws.amazon.com/service-terms/ — Privacy: https://aws.amazon.com/privacy/

**Custom SMTP** — When you select the Custom SMTP option, email is sent to the SMTP server host/port that you enter. This is whatever third-party SMTP service or mail server you choose; please refer to that provider's own terms and privacy policy.

**Cloudflare DNS over HTTPS** — Used only by the optional Deliverability checker, and only as a fallback when your server's own DNS resolver is unavailable. It sends only your site's domain name (to look up SPF/DKIM/DMARC/MX records) to `https://cloudflare-dns.com/dns-query`. No email content is involved.
Terms: https://www.cloudflare.com/website-terms/ — Privacy: https://developers.cloudflare.com/1.1.1.1/privacy/public-dns-resolver/

== Installation ==

1. In **Plugins → Add New**, search for "Mailyard" (or upload the zip), then activate.
2. Go to **Settings → Mailyard**.
3. Pick an email service, enter your API key, and set your sender address.
4. Click **Send test** from the Dashboard to confirm it works.

= Adding a backup provider =

In the **Connections** tab, click **Add**, set up a second provider, enable it, and drag it below your primary. If the primary fails, Mailyard tries the backup automatically.

= Switching from another SMTP plugin =

Deactivate your current mail plugin (WP Mail SMTP, FluentSMTP, Post SMTP, etc.) before activating Mailyard. Running two at once causes conflicts; Mailyard warns you if it detects another.

== Frequently Asked Questions ==

= Will this fix my WordPress emails not sending? =

Yes. Connect an email service (Resend is free and easy), send a test, done.

= Does it work with WooCommerce, Contact Form 7, Gravity Forms, etc.? =

Yes. Any plugin using WordPress's built-in email automatically routes through Mailyard.

= Which email service should I pick? =

Starting out: **Resend** (free, easiest). For a store or serious volume: **Postmark** (best inbox placement). **Brevo** is a good free option under 300 emails/day.

= What happens if my email service goes down? =

With a backup provider set in **Connections**, Mailyard retries it on the same send — no email lost. With only one provider, the email fails as it normally would.

= Does it work with Gmail or Microsoft 365? =

Personal Gmail works via Custom SMTP with an app password. Google Workspace and Microsoft 365 have disabled basic SMTP auth — use Resend or Postmark instead.

= How long are email logs kept? =

30 days, cleaned up automatically. You can turn logging off in Settings.

= Does uninstalling remove my data? =

No — uninstalling leaves your logs and settings intact so you can reinstall without losing anything. To wipe everything, use **Delete all data** in Settings; that is the only thing that erases your data and it never runs automatically.

= Is this plugin free? =

Yes. Everything here is free — no Pro version, no paywall.

== Screenshots ==

1. Setup — pick a provider, paste your API key, set your sender address.
2. Dashboard — sending health, 14-day volume, recent activity.
3. Connections — add multiple providers and drag to set the primary.
4. Email Logs — every send with status, recipient, and error details.
5. Settings — default From address and logging toggle.

== Changelog ==

= 1.0.0 =
* Initial release.
* Six providers: Amazon SES, Postmark, Resend, Brevo, Custom SMTP, PHP Mail.
* Automatic failover across backup providers, on the same send.
* Sender-based / message-purpose routing (`X-Mailyard-Purpose` header or `mailyard_purpose` filter).
* Normalized bounce & spam-complaint webhooks for Postmark, Amazon SES, Resend, and Brevo, exposed via the `mailyard_bounce` action.
* Built-in deliverability checker (SPF, DKIM, DMARC, MX).
* Full email logging with 30-day automatic cleanup; attachments, CC, and BCC on all providers.
* Conflict detection for other SMTP plugins.
* Non-destructive uninstall, with optional one-click data erasure in Settings.

== Upgrade Notice ==

= 1.0.0 =
Initial release.
</content>
