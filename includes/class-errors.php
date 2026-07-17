<?php
namespace Mailyard;

defined( 'ABSPATH' ) || exit;

/**
 * Turns raw SMTP / ESP failure messages into actionable, human-readable
 * guidance. This is the SINGLE source of humanized error copy — the log view,
 * the send-failure admin notice, and test results all call ::humanize() so the
 * wording stays consistent.
 */
class Errors {

	/**
	 * Ordered pattern → guidance map. First match wins, so list the specific
	 * causes before the generic ones. Each `match` is a case-insensitive
	 * substring OR (when it starts with `/`) a regular expression.
	 *
	 * @return array<int,array{match:string,title:string,guidance:string}>
	 */
	private static function map(): array {
		return array(
			array(
				'match'    => 'not verified',
				'title'    => __( 'Sender address or domain not verified', 'mailyard' ),
				'guidance' => __( 'Your email provider hasn\'t verified this From address or its domain. Verify the sender identity (and its DNS records) in your provider\'s dashboard, then try again.', 'mailyard' ),
			),
			array(
				'match'    => 'messagerejected',
				'title'    => __( 'The provider rejected the message', 'mailyard' ),
				'guidance' => __( 'Usually the From address or domain isn\'t verified yet, or your account is still in sandbox mode. Verify your sender and request production access in the provider dashboard.', 'mailyard' ),
			),
			array(
				'match'    => '/authenticat|could not authenticate|535|auth failed|invalid credentials|signature/i',
				'title'    => __( 'Authentication failed', 'mailyard' ),
				'guidance' => __( 'The username, password, or API key was rejected. Double-check the credentials — for Gmail/Microsoft use an app-specific password (with 2-factor enabled), not your normal login.', 'mailyard' ),
			),
			array(
				'match'    => '/starttls|ssl|tls|certificate/i',
				'title'    => __( 'Secure connection (TLS/SSL) problem', 'mailyard' ),
				'guidance' => __( 'The encrypted connection failed. Try port 587 with TLS (or 465 with SSL). If your host blocks these ports, ask them to open outbound SMTP.', 'mailyard' ),
			),
			array(
				'match'    => '/could not connect|connection refused|connection timed out|failed to connect|smtp connect|network is unreachable/i',
				'title'    => __( 'Could not reach the mail server', 'mailyard' ),
				'guidance' => __( 'Check the SMTP host and port are correct and that your web host allows outbound connections on that port (many block port 25 — use 587 or 465).', 'mailyard' ),
			),
			array(
				'match'    => '/throttl|rate exceeded|rate limit|too many requests|429|sending rate|quota/i',
				'title'    => __( 'Sending limit reached', 'mailyard' ),
				'guidance' => __( 'Your provider is rate-limiting or you\'ve hit a daily quota. Wait and retry, or raise your sending limit in the provider dashboard. Mailyard will fail over to a backup connection if you\'ve configured one.', 'mailyard' ),
			),
			array(
				'match'    => '/invalid.*(recipient|address)|recipient.*rejected|mailbox unavailable|user unknown|550|inactive recipient/i',
				'title'    => __( 'The recipient address was rejected', 'mailyard' ),
				'guidance' => __( 'The destination mailbox was refused as invalid, unknown, or suppressed. Confirm the recipient address is correct and not on a suppression list.', 'mailyard' ),
			),
			array(
				'match'    => 'no connections',
				'title'    => __( 'No email connection configured', 'mailyard' ),
				'guidance' => __( 'Add and activate an email provider under Connections so Mailyard has somewhere to send through.', 'mailyard' ),
			),
			array(
				'match'    => 'invalid email address',
				'title'    => __( 'Invalid email address', 'mailyard' ),
				'guidance' => __( 'The From or To address isn\'t a valid email. Fix the address and try again.', 'mailyard' ),
			),
		);
	}

	/**
	 * @param string $raw      Raw provider/SMTP error message.
	 * @param string $provider Provider id (reserved for provider-specific copy).
	 * @return array{title:string,guidance:string,raw:string}
	 */
	public static function humanize( string $raw, string $provider = '' ): array {
		$raw     = trim( $raw );
		$subject = strtolower( $raw );

		foreach ( self::map() as $entry ) {
			$m   = $entry['match'];
			$hit = ( '' !== $m && '/' === $m[0] )
				? (bool) preg_match( $m, $raw )
				: ( '' !== $m && false !== strpos( $subject, $m ) );
			if ( $hit ) {
				return array(
					'title'    => $entry['title'],
					'guidance' => $entry['guidance'],
					'raw'      => $raw,
				);
			}
		}

		return array(
			'title'    => '' !== $raw ? __( 'Email could not be sent', 'mailyard' ) : __( 'Unknown error', 'mailyard' ),
			'guidance' => __( 'The provider returned an error. Check the technical details below, verify your connection settings, and send a test email.', 'mailyard' ),
			'raw'      => $raw,
		);
	}
}
