// One-click SMTP presets — prefill host/port/encryption for common providers so
// the user only needs to add credentials. They all resolve to the generic `smtp`
// provider; "Custom" clears the prefill for anything else.
export const SMTP_PRESETS = [
	{
		id: 'gmail',
		name: 'Gmail',
		values: { host: 'smtp.gmail.com', port: '587', encryption: 'tls' },
		note: 'Use an app password (Google Account → Security → App passwords), not your login password.',
		docs: 'https://support.google.com/mail/answer/185833',
	},
	{
		id: 'outlook',
		name: 'Outlook / Microsoft 365',
		values: { host: 'smtp.office365.com', port: '587', encryption: 'tls' },
		note: 'Use your full email as the username and an app password if 2FA is on.',
		docs: 'https://support.microsoft.com/office/pop-imap-and-smtp-settings-8361e398-8af4-4e97-b147-6c6c4ac95353',
	},
	{
		id: 'sendgrid',
		name: 'SendGrid',
		values: { host: 'smtp.sendgrid.net', port: '587', encryption: 'tls', username: 'apikey' },
		note: 'Username is literally "apikey"; the password is your SendGrid API key.',
		docs: 'https://www.twilio.com/docs/sendgrid/for-developers/sending-email/integrating-with-the-smtp-api',
	},
	{
		id: 'zoho',
		name: 'Zoho Mail',
		values: { host: 'smtp.zoho.com', port: '587', encryption: 'tls' },
		note: 'Generate an app-specific password in Zoho Mail settings.',
		docs: 'https://www.zoho.com/mail/help/zoho-smtp.html',
	},
	{
		id: 'custom',
		name: 'Other / Custom',
		values: {},
		note: '',
		docs: null,
	},
];

export const LIVE_PROVIDERS = [
	{
		id: 'ses',
		name: 'Amazon SES',
		desc: 'Scalable cloud delivery',
		dashboard: 'https://console.aws.amazon.com/ses/',
		fields: [
			{ key: 'access_key', label: 'Access Key ID', type: 'text', required: true, placeholder: 'AKIAIOSFODNN7EXAMPLE', hint: 'Create an IAM user with ses:SendEmail and ses:SendRawEmail permissions.' },
			{ key: 'secret_key', label: 'Secret Access Key', type: 'password', required: true, placeholder: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLE' },
			{
				key: 'region', label: 'Region', type: 'select', required: true,
				hint: 'Must match the region where your SES identity is verified.',
				options: [
					{ value: 'us-east-1', label: 'US East (N. Virginia)' },
					{ value: 'us-east-2', label: 'US East (Ohio)' },
					{ value: 'us-west-1', label: 'US West (N. California)' },
					{ value: 'us-west-2', label: 'US West (Oregon)' },
					{ value: 'af-south-1', label: 'Africa (Cape Town)' },
					{ value: 'ap-south-1', label: 'Asia Pacific (Mumbai)' },
					{ value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
					{ value: 'ap-northeast-2', label: 'Asia Pacific (Seoul)' },
					{ value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
					{ value: 'ap-southeast-2', label: 'Asia Pacific (Sydney)' },
					{ value: 'ca-central-1', label: 'Canada (Central)' },
					{ value: 'eu-central-1', label: 'Europe (Frankfurt)' },
					{ value: 'eu-west-1', label: 'Europe (Ireland)' },
					{ value: 'eu-west-2', label: 'Europe (London)' },
					{ value: 'eu-west-3', label: 'Europe (Paris)' },
					{ value: 'eu-north-1', label: 'Europe (Stockholm)' },
					{ value: 'eu-south-1', label: 'Europe (Milan)' },
					{ value: 'me-south-1', label: 'Middle East (Bahrain)' },
					{ value: 'sa-east-1', label: 'South America (São Paulo)' },
					{ value: 'il-central-1', label: 'Israel (Tel Aviv)' },
				],
			},
		],
	},
	{
		id: 'postmark',
		name: 'Postmark',
		desc: 'Fast transactional',
		dashboard: 'https://account.postmarkapp.com/servers',
		fields: [
			{ key: 'api_key', label: 'Server API Token', type: 'password', required: true, placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', hint: 'Found in Server → API Tokens. Use the Server token, not Account token.' },
		],
	},
	{
		id: 'resend',
		name: 'Resend',
		desc: 'Modern email API',
		dashboard: 'https://resend.com/api-keys',
		fields: [
			{ key: 'api_key', label: 'API Key', type: 'password', required: true, placeholder: 're_xxxxxxxxxx', hint: 'Found in Resend dashboard → API Keys.' },
		],
	},
	{
		id: 'brevo',
		name: 'Brevo',
		desc: 'All-in-one email platform',
		dashboard: 'https://app.brevo.com/settings/keys/api',
		fields: [
			{ key: 'api_key', label: 'API Key', type: 'password', required: true, placeholder: 'xkeysib-xxxxxxxxxxxxxxxxxxxx', hint: 'Found in Brevo dashboard → SMTP & API → API Keys. Use a v3 key.' },
		],
	},
	{
		id: 'mailgun',
		name: 'Mailgun',
		desc: 'Developer email API',
		dashboard: 'https://app.mailgun.com/settings/api_security',
		fields: [
			{ key: 'api_key', label: 'API Key', type: 'password', required: true, placeholder: 'key-xxxxxxxxxxxxxxxxxxxxxxxx', hint: 'Found in Mailgun → Settings → API Security. A domain Sending Key also works.' },
			{ key: 'domain', label: 'Sending Domain', type: 'text', required: true, placeholder: 'mg.yourdomain.com', hint: 'The domain you verified in Mailgun → Sending → Domains.' },
			{
				key: 'region', label: 'Region', type: 'select', required: true,
				hint: 'Must match where your Mailgun domain was created.',
				options: [
					{ value: 'us', label: 'US' },
					{ value: 'eu', label: 'EU' },
				],
			},
		],
	},
	{
		id: 'sendgrid',
		name: 'SendGrid',
		desc: 'Twilio email API',
		dashboard: 'https://app.sendgrid.com/settings/api_keys',
		fields: [
			{ key: 'api_key', label: 'API Key', type: 'password', required: true, placeholder: 'SG.xxxxxxxxxxxxxxxxxxxx', hint: 'Found in SendGrid → Settings → API Keys. Needs the Mail Send permission.' },
		],
	},
	{
		id: 'smtp2go',
		name: 'SMTP2GO',
		desc: 'Reliable global delivery',
		dashboard: 'https://app.smtp2go.com/sending/apikeys/',
		fields: [
			{ key: 'api_key', label: 'API Key', type: 'password', required: true, placeholder: 'api-xxxxxxxxxxxxxxxxxxxxxxxx', hint: 'Found in SMTP2GO → Sending → API Keys. Allow the /email/send endpoint.' },
		],
	},
	{
		id: 'mailjet',
		name: 'Mailjet',
		desc: 'European email platform',
		dashboard: 'https://app.mailjet.com/account/apikeys',
		fields: [
			{ key: 'api_key', label: 'API Key', type: 'password', required: true, placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', hint: 'Found in Mailjet → Account settings → API Key Management.' },
			{ key: 'secret_key', label: 'Secret Key', type: 'password', required: true, placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', hint: 'Shown next to the API key. Regenerate it there if you lost it.' },
		],
	},
	{
		id: 'mailersend',
		name: 'MailerSend',
		desc: 'Simple transactional API',
		dashboard: 'https://app.mailersend.com/api-tokens',
		fields: [
			{ key: 'api_key', label: 'API Token', type: 'password', required: true, placeholder: 'mlsn.xxxxxxxxxxxxxxxxxxxx', hint: 'Found in MailerSend → Integrations → API tokens. Needs Email full access.' },
		],
	},
	{
		id: 'maileroo',
		name: 'Maileroo',
		desc: 'Affordable email API',
		dashboard: 'https://app.maileroo.com/domains',
		fields: [
			{ key: 'api_key', label: 'Sending Key', type: 'password', required: true, placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxx', hint: 'Found in Maileroo → Domains → your domain → Sending Keys.' },
		],
	},
	{
		id: 'smtp',
		name: 'Custom SMTP',
		desc: 'Any SMTP server',
		dashboard: null,
		fields: [
			{ key: 'host', label: 'SMTP Host', type: 'text', required: true, placeholder: 'smtp.example.com', hint: 'e.g. smtp.gmail.com, smtp.office365.com, mail.yourdomain.com' },
			{
				key: 'port', label: 'Port', type: 'select', required: true,
				hint: 'If unsure, try 587 with TLS first.',
				options: [
					{ value: '587', label: '587 — recommended' },
					{ value: '465', label: '465 — legacy SSL' },
					{ value: '2525', label: '2525 — alternative' },
					{ value: '25', label: '25 — unencrypted' },
				],
			},
			{
				key: 'encryption', label: 'Encryption', type: 'select', required: true,
				options: [
					{ value: 'tls', label: 'TLS (STARTTLS)' },
					{ value: 'ssl', label: 'SSL' },
					{ value: 'none', label: 'None' },
				],
			},
			{ key: 'username', label: 'Username', type: 'text', placeholder: 'user@example.com', hint: 'Usually your full email address. Leave blank if your server has no auth.' },
			{ key: 'password', label: 'Password', type: 'password', placeholder: 'App password or SMTP password', hint: 'For Gmail/Microsoft, use an app-specific password.' },
		],
	},
	{
		id: 'phpmailer',
		name: 'PHP Mail',
		desc: 'Your server — a no-setup backup',
		dashboard: null,
		fields: [],
	},
];

