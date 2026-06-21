=== Mailyard ===
Contributors: badhonrocks
Tags: smtp, wp-mail, email-log, mail, transactional
Requires at least: 5.8
Tested up to: 7.0
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

WordPress not sending emails? Fix it in 2 minutes. Connect a real email service and every email your site sends will actually arrive.

== Description ==

**Is your WordPress site not sending emails?** Password resets not arriving. WooCommerce order emails going to spam. Contact form messages disappearing. This is the most common WordPress problem — and Mailyard fixes it.

By default, WordPress tries to send email through your web host's mail server. Most hosts either block it, or deliver it so poorly that it lands in spam. Mailyard replaces that with a proper email service — the same kind of infrastructure that real companies use to send millions of emails.

= How it works =

You connect Mailyard to an email service (like Resend, Postmark, or Amazon SES), and from that moment every email your WordPress site sends — password resets, order confirmations, contact form replies, admin alerts — goes through that service instead of your host's broken mail server.

No coding. No complicated setup. Pick a provider, paste your API key, and it works.

= Supported email services =

* **Resend** — Free for 3,000 emails/month. Great starting point.
* **Brevo** (formerly Sendinblue) — Free for 300 emails/day. Easy to set up.
* **Postmark** — Best deliverability. Used by serious businesses.
* **Amazon SES** — Very cheap at volume. Good if you already use AWS.
* **Custom SMTP** — Works with any SMTP server including Gmail app passwords.
* **Default (PHP mail)** — Your host's mail server. No config needed, but unreliable.

= What you get =

* **It actually works.** Emails land in the inbox, not spam.
* **Backup providers.** Add a second email service as a fallback. If the first one fails, Mailyard tries the next one automatically, on the same send.
* **Email log.** See every email your site sent — who it went to, what the subject was, whether it delivered or failed.
* **Send a test.** Click one button from the dashboard to send a test email and confirm everything is working.
* **Conflict detection.** If you have another SMTP plugin installed at the same time, Mailyard warns you so you can remove it.
* **Automatic cleanup.** Old email logs are deleted after 30 days so your database stays tidy.
* **Clean removal.** Uninstalling the plugin removes everything — no leftover data in your database.

= Is it free? =

Yes. Everything listed above is free. There is no paid version, no locked features, no upsells inside the plugin.

= Source code =

The admin UI is built with React and bundled via `@wordpress/scripts`. The full unminified source is available at https://github.com/plugpressco/mailyard — see the `src/` directory. Build instructions: install Node.js dependencies with `npm install`, then run `npm run build`.

= Privacy =

Mailyard only contacts the email service you configure. It does not phone home, track you, or send your data anywhere else.

The Deliverability checker looks up your domain's DNS records to check your email setup. It does this using your server's DNS resolver. If that fails, it falls back to Cloudflare's public DNS service (`cloudflare-dns.com`) — Cloudflare sees only the domain name, same as any normal DNS lookup.

If you have email logging turned on (it's on by default), the recipient address, subject line, and body of each email are saved in your WordPress database. You can turn logging off in Settings at any time.

== Installation ==

1. Go to **Plugins → Add New** in your WordPress admin and search for "Mailyard", or upload the zip file.
2. Activate the plugin.
3. Go to **Settings → Mailyard**.
4. Follow the setup steps: pick an email service, enter your API key, and set the email address you want to send from.
5. Click **Send test** from the Dashboard to make sure it's working.

That's it. Your site's emails will now go through the service you chose.

= Adding a backup email service =

After setting up your main provider, go to the **Connections** tab and click **Add**. Set up a second provider, enable it, and drag it below your primary. Now if your main provider ever fails, Mailyard automatically tries the backup.

= Switching from another SMTP plugin =

If you're already using WP Mail SMTP, FluentSMTP, Post SMTP, or similar — deactivate that plugin first, then activate Mailyard. Running two mail plugins at once causes conflicts. Mailyard will warn you if it detects another mail plugin is active.

== Frequently Asked Questions ==

= Will this fix my WordPress emails not sending? =

Yes, that's exactly what it's for. Install Mailyard, connect an email service (Resend is free and easy), send a test email, and you're done.

= Will this work with WooCommerce, Contact Form 7, Gravity Forms, and other plugins? =

Yes. Any plugin that uses WordPress's built-in email system (which is all of them) automatically routes through Mailyard. Order emails, form notifications, password resets — all of it.

= Which email service should I pick? =

If you're just starting out, use **Resend** — free for 3,000 emails/month and the easiest to set up. For a WooCommerce store or any serious volume, **Postmark** has the best inbox placement. **Brevo** is a solid free option if you send under 300 emails a day.

= Do I need to verify my domain? =

Yes, with most providers you need to add a couple of DNS records to your domain to prove you own it. The provider walks you through this during signup. Click the **Get your keys →** link in Mailyard's setup screen to jump straight to your provider's dashboard.

= What happens if my email service goes down? =

If you've set up a backup provider in the **Connections** tab, Mailyard automatically tries it when the main one fails — on the same send, no emails lost. If you only have one provider, the email fails like it normally would.

= Does it work with Gmail? =

Gmail personal accounts (`@gmail.com`) work via the Custom SMTP option using an app password (generate one at Google Account → Security → App Passwords). Note: Google Workspace accounts no longer support app passwords — use Resend or Postmark instead.

= Does it work with Microsoft 365 or Outlook? =

Microsoft turned off basic SMTP authentication for most accounts. For Microsoft 365 mailboxes, use Resend or Postmark instead.

= How long are email logs kept? =

30 days. Older logs are deleted automatically every day.

= Can I turn off email logging? =

Yes. Go to **Settings** and toggle off "Email logging". Existing logs stay until they age out or you uninstall the plugin.

= Does it work on WordPress Multisite? =

Activating per-site works fine. Network-wide activation hasn't been fully tested in this version — activate per-site for now.

= Does uninstalling remove all my data? =

Yes. The email log table and all plugin settings are permanently deleted when you remove the plugin.

= Is this plugin free? =

Yes. Everything described here is in the free version. There is no Pro version, no locked features, nothing behind a paywall.

== Screenshots ==

1. Setup screen — pick your email provider, paste your API key, set your sender address.
2. Dashboard — see your sending health, email volume over the last 14 days, and recent activity.
3. Connections — add multiple providers and drag to set which one is primary.
4. Email Logs — every email your site has sent, with status, recipient, and error details if it failed.
5. Settings — set your default From address and toggle email logging on or off.

== Changelog ==

= 1.0.0 =
* Initial release.
* Six providers: Amazon SES, Postmark, Resend, Brevo, Custom SMTP, PHP Mail.
* Automatic failover across backup providers.
* Full email logging with 30-day automatic cleanup.
* Attachments, CC, and BCC work with all providers.
* Conflict detection for other SMTP plugins.
* Clean uninstall.

== Upgrade Notice ==

= 1.0.0 =
Initial release.
