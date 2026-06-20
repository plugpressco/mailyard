<?php
namespace Mailyard;

defined( 'ABSPATH' ) || exit;

// Intercepts wp_mail() to route emails through configured ESP connections,
// with synchronous failover across the chain when a send fails.
class Override {

	// Re-entrancy guard. The SMTP provider sends via an inner wp_mail() call, which
	// would otherwise re-trigger our pre_wp_mail filter and recurse. While true, the
	// interceptor passes through so the inner wp_mail() reaches real PHPMailer.
	private static $sending = false;

	// True while the failover loop is sending — used by Logger to avoid double-logging
	// SMTP sends (which fire wp_mail_succeeded/failed in addition to our own log).
	public static function is_sending(): bool {
		return self::$sending;
	}

	public function init() {
		// When at least one usable connection exists, route everything (API and SMTP
		// alike) through the interceptor so it can pick a sender-matched failover
		// chain and honor the message's own From header.
		if ( ! empty( Manager::instance()->enabled_connections() ) ) {
			add_filter( 'pre_wp_mail', array( $this, 'intercept' ), 10, 2 );
			return;
		}

		// Passthrough: no usable connection. Set a default sender, but do NOT clobber
		// an explicit From — only replace WP's wordpress@localhost default.
		$settings   = Options::settings();
		$from_email = $settings['from_email'] ?? '';
		$from_name  = $settings['from_name'] ?? '';

		if ( empty( $from_email ) ) {
			$from_email = get_option( 'admin_email' );
		}
		add_filter( 'wp_mail_from', function ( $email ) use ( $from_email ) {
			return $this->is_wp_default_from( $email ) ? $from_email : $email;
		} );

		if ( ! empty( $from_name ) ) {
			add_filter( 'wp_mail_from_name', function ( $name ) use ( $from_name ) {
				return ( '' === $name || 'WordPress' === $name ) ? $from_name : $name;
			} );
		}
	}

	// Replaces wp_mail, walking a sender-matched failover chain.
	public function intercept( $null, $atts ) {
		// Inner wp_mail() from the SMTP provider — let it through to real PHPMailer.
		if ( self::$sending ) {
			return null;
		}

		$settings    = Options::settings();
		$headers     = $atts['headers'] ?? '';
		$from        = $this->resolve_from( $headers, $settings );

		$chain = Manager::instance()->chain_for( $from['email'], 'transactional' );
		if ( empty( $chain ) ) {
			return null; // Fall through to default wp_mail.
		}

		$logger      = Logger::instance();
		$reply_to    = $this->parse_reply_to( $headers );
		$is_html     = $this->is_html_body( $headers );
		$cc          = ESP\Recipients::split( $atts['cc']  ?? array() );
		$bcc         = ESP\Recipients::split( $atts['bcc'] ?? array() );
		$attachments = ESP\Attachment::normalize( $atts['attachments'] ?? array() );
		$recipients  = is_array( $atts['to'] ) ? $atts['to'] : explode( ',', $atts['to'] );
		$all_sent    = true;

		self::$sending = true;
		try {
			foreach ( $recipients as $i => $to ) {
				$to = trim( $to );
				if ( empty( $to ) ) {
					continue;
				}

				// cc/bcc and attachments piggy-back on the first recipient only —
				// otherwise each To address would see duplicate Cc copies.
				$extras = 0 === $i
					? array( 'cc' => $cc, 'bcc' => $bcc, 'attachments' => $attachments, 'is_html' => $is_html )
					: array( 'cc' => array(), 'bcc' => array(), 'attachments' => array(), 'is_html' => $is_html );

				if ( ! $this->send_with_failover( $chain, $to, $atts, $from, $reply_to, $extras, $logger ) ) {
					$all_sent = false;
				}
			}
		} finally {
			self::$sending = false;
		}

		return $all_sent;
	}

	// Try each connection in priority order. Return true on first success;
	// return false only after all attempts have failed.
	private function send_with_failover( array $chain, string $to, array $atts, array $from, string $reply_to, array $extras, Logger $logger ): bool {
		$last_error = '';

		foreach ( $chain as $i => $link ) {
			$slug = $link['slug'];
			$esp  = $link['esp'];

			$log_base = array(
				'to'       => $to,
				'subject'  => $atts['subject'],
				'body'     => $atts['message'],
				'headers'  => $atts['headers'] ?? '',
				'provider' => $slug,
			);

			if ( 0 === $i && ! is_email( $to ) ) {
				$logger->log( array_merge( $log_base, array( 'status' => 'failed', 'error' => __( 'Invalid email address.', 'mailyard' ) ) ) );
				return false;
			}

			if ( 0 === $i && ! $this->recipient_domain_ok( $to, $slug ) ) {
				$domain = substr( $to, strrpos( $to, '@' ) + 1 );
				$logger->log( array_merge( $log_base, array(
					'status' => 'failed',
					/* translators: %s: recipient email domain. */
					'error'  => sprintf( __( 'Invalid domain: %s has no mail server.', 'mailyard' ), $domain ),
				) ) );
				return false;
			}

			$body    = (string) $atts['message'];
			$is_html = $extras['is_html'];

			$result = $esp->send( array(
				'to'          => $to,
				'cc'          => $extras['cc'],
				'bcc'         => $extras['bcc'],
				'subject'     => $atts['subject'],
				'html'        => $is_html ? $body : '',
				'text'        => $is_html ? '' : $body,
				'from_name'   => $from['name'],
				'from_email'  => $from['email'],
				'reply_to'    => $reply_to,
				'attachments' => $extras['attachments'],
			) );

			if ( $result->is_success() ) {
				$logger->log( array_merge( $log_base, array( 'status' => 'sent' ) ) );
				return true;
			}

			$last_error = $result->get_error();
			$logger->log( array_merge( $log_base, array( 'status' => 'failed', 'error' => $last_error ) ) );
		}

		do_action( 'mailyard_send_failed', $to, $last_error );
		return false;
	}

	// Determine From name+email — message headers drive routing, so they win; fall
	// back to the configured default sender when the message sets no From.
	private function resolve_from( $headers, array $settings ): array {
		$from_name  = '';
		$from_email = '';

		foreach ( $this->normalize_headers( $headers ) as $name => $value ) {
			if ( 'from' !== $name ) {
				continue;
			}
			if ( preg_match( '/^(.+)<(.+)>$/', $value, $m ) ) {
				$from_name  = trim( $m[1] );
				$from_email = trim( $m[2] );
			} else {
				$from_email = trim( $value );
			}
			break;
		}

		if ( empty( $from_email ) ) {
			$from_name  = $settings['from_name']  ?? get_bloginfo( 'name' );
			$from_email = $settings['from_email'] ?? get_option( 'admin_email' );
		}

		return array( 'name' => $from_name, 'email' => $from_email );
	}

	// Detect WP's synthetic default From (wordpress@<sitename>) so the passthrough
	// default sender only replaces that, never a real From the caller set.
	private function is_wp_default_from( $email ): bool {
		if ( empty( $email ) ) {
			return true;
		}
		$sitename = strtolower( wp_parse_url( network_home_url(), PHP_URL_HOST ) ?: '' );
		if ( 0 === strpos( $sitename, 'www.' ) ) {
			$sitename = substr( $sitename, 4 );
		}
		return strtolower( $email ) === 'wordpress@' . $sitename;
	}

	private function is_html_body( $headers ): bool {
		foreach ( $this->normalize_headers( $headers ) as $name => $value ) {
			if ( 'content-type' !== $name ) {
				continue;
			}
			$type = strtolower( trim( explode( ';', $value )[0] ) );
			return 'text/plain' !== $type;
		}
		return true;
	}

	private function parse_reply_to( $headers ): string {
		foreach ( $this->normalize_headers( $headers ) as $name => $value ) {
			if ( 'reply-to' === $name ) {
				return trim( $value );
			}
		}
		return '';
	}

	private function normalize_headers( $headers ): array {
		if ( ! is_array( $headers ) ) {
			$headers = array_filter( explode( "\n", str_replace( "\r\n", "\n", $headers ) ) );
		}

		$parsed = array();
		foreach ( $headers as $header ) {
			$parts = explode( ':', $header, 2 );
			if ( count( $parts ) < 2 ) {
				continue;
			}
			$parsed[ strtolower( trim( $parts[0] ) ) ] = trim( $parts[1] );
		}
		return $parsed;
	}

	// Validate that the recipient's domain has a mail server. Skipped for API
	// providers because they perform their own validation, and the local DNS
	// resolver is unreliable on dev machines (localhost, VPN, firewalled).
	private function recipient_domain_ok( string $to, string $provider ): bool {
		if ( in_array( $provider, Options::api_providers(), true ) ) {
			return true;
		}
		if ( ! function_exists( 'checkdnsrr' ) || defined( 'PHP_WASM' ) ) {
			return true;
		}
		$domain = substr( $to, strrpos( $to, '@' ) + 1 );
		return @checkdnsrr( $domain, 'MX' ) || @checkdnsrr( $domain, 'A' ); // phpcs:ignore
	}
}
