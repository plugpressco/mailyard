# Mailyard — mailyard.co site copy

Paste-ready marketing copy. Voice: dry, founder-built, concrete. Free-first (the
wordpress.org listing is the distribution engine). Differentiators lead, not "SMTP plugin."

---

## HERO

**Headline (recommended — outcome + contrast):**
> Your WordPress email, with a backup plan.

**Subhead:**
> Most SMTP plugins send through one provider and give up if it fails. Mailyard sends through several — if the first one drops, the next one delivers, on the same send. Free, complete, nothing locked.

**Primary CTA:** `Install Free from WordPress.org`
**Secondary CTA:** `See how failover works`

**Headline alternatives:**
1. Your WordPress email, with a backup plan. *(outcome + emotional)*
2. Stop losing WordPress emails to one flaky provider. *(pain + outcome)*
3. The only WordPress email plugin that fails over to a second provider. *(category claim)*
4. Email that arrives — even when your provider has a bad day. *(outcome)*
5. One email plugin. Multiple providers. Zero lost mail. *(rhythm + number)*

---

## WHY MAILYARD (4 differentiator blocks)

Each is an outcome line, not a feature noun.

### Automatic failover
Add a second provider and Mailyard retries it the instant the first one fails — inside the
same `wp_mail()` call, no queue, no lost email. A flaky API key on a Saturday night stops
being your problem.

### Sender-based routing
Send your store receipts through Postmark and your newsletters through Brevo, automatically,
based on the from-address. One site, the right provider for each kind of mail.

### Bounce & complaint tracking
Mailyard listens for bounce and spam-complaint events from Postmark, Amazon SES, Resend, and
Brevo, normalizes them into one format, and hands them to your other plugins through a single
hook — so bad addresses get caught instead of quietly killing your sender reputation.

### Built-in deliverability checker
It reads your domain's SPF, DKIM, DMARC, and MX records and tells you exactly what's missing.
That missing record is usually the reason your mail lands in spam.

---

## SUPPORTED PROVIDERS

Resend · Brevo · Postmark · Amazon SES · any Custom SMTP server. Start on a free tier
(Resend: 3,000/month) and switch anytime — your settings don't change.

---

## COMING SOON — Mailyard for AI (MCP)

**Section headline:** Soon: let your AI assistant fix your email for you.

Mailyard is adding a Model Context Protocol (MCP) interface, built on WordPress's new
Abilities API. Once it ships, an AI assistant like Claude can connect to your site and
actually work your email setup in plain language:

- *"Why aren't my WooCommerce emails arriving?"* — it runs the deliverability check, reads
  your recent failures, sees which provider is active, and tells you what's wrong.
- *"Send a test through my backup provider."* — done, and it reports back.
- *"Show me everything that bounced this week."* — straight from the log.

No other WordPress email plugin lets an AI agent diagnose and operate it. That's where this
is going. **Coming in a future free update — install now and you'll get it automatically.**

*(CTA: `Install Free` — small print: MCP support is on the roadmap, not in the current release.)*

---

## CLOSE

**Headline:** Free. Complete. Nothing locked.
**Body:** Every delivery feature is in the free plugin on WordPress.org — failover, routing,
bounce tracking, the deliverability checker, the email log. Built and maintained by PlugPress.
Want to *send campaigns* too? **Mailyard Pro** adds broadcast email, contacts, and automations
on top of Mailyard — a separate plugin, so the free one stays complete on its own.
**CTA:** `Install Mailyard Free` · `Explore Mailyard Pro`

---

## Notes for build
- Keep three-color discipline — match PlugPress tokens (don't add new accent colors).
- Hero should show a screenshot of the Connections/failover chain (show-before-tell).
- The MCP block is "coming soon" — phrase it as roadmap, never as a current capability, so it
  stays honest (and matches what's actually shipped for the wordpress.org review).
</content>
