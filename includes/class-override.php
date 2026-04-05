<?php
namespace MoolMail;

defined( 'ABSPATH' ) || exit;

// Intercepts wp_mail() to route emails through the active ESP.
class Override {

	public function init() {
		$settings   = get_option( 'moolmail_settings', array() );
		$active     = $settings['active'] ?? 'phpmailer';
		$from_email = $settings['from_email'] ?? '';
		$from_name  = $settings['from_name'] ?? '';

		// Always set a valid From email — WP defaults to wordpress@localhost.
		if ( empty( $from_email ) ) {
			$from_email = get_option( 'admin_email' );
		}
		add_filter( 'wp_mail_from', function () use ( $from_email ) { return $from_email; } );

		if ( ! empty( $from_name ) ) {
			add_filter( 'wp_mail_from_name', function () use ( $from_name ) { return $from_name; } );
		}

		// SMTP: configure PHPMailer directly.
		if ( 'smtp' === $active ) {
			$esp = Manager::instance()->active_provider();
			if ( $esp ) {
				add_action( 'phpmailer_init', array( $esp, 'configure_phpmailer' ) );
			}
			return;
		}

		// PHPMailer: default wp_mail, no override needed.
		if ( 'phpmailer' === $active ) {
			return;
		}

		// API providers (SES, Postmark, Resend): intercept wp_mail entirely.
		add_filter( 'pre_wp_mail', array( $this, 'intercept' ), 10, 2 );
	}

	// Replaces wp_mail for API-based providers.
	public function intercept( $null, $atts ) {
		$esp = Manager::instance()->active_provider();
		if ( ! $esp ) {
			return null; // Fall through to default wp_mail.
		}

		// Parse headers.
		$from_name  = '';
		$from_email = '';
		$reply_to   = '';
		$headers    = $atts['headers'] ?? '';

		if ( ! is_array( $headers ) ) {
			$headers = array_filter( explode( "\n", str_replace( "\r\n", "\n", $headers ) ) );
		}

		foreach ( $headers as $header ) {
			$parts = explode( ':', $header, 2 );
			if ( count( $parts ) < 2 ) continue;

			$name  = strtolower( trim( $parts[0] ) );
			$value = trim( $parts[1] );

			if ( 'from' === $name ) {
				if ( preg_match( '/^(.+)<(.+)>$/', $value, $m ) ) {
					$from_name  = trim( $m[1] );
					$from_email = trim( $m[2] );
				} else {
					$from_email = trim( $value );
				}
			} elseif ( 'reply-to' === $name ) {
				$reply_to = trim( $value );
			}
		}

		// Fallback from settings.
		$settings = get_option( 'moolmail_settings', array() );
		if ( empty( $from_email ) ) {
			$from_name  = $settings['from_name'] ?? get_bloginfo( 'name' );
			$from_email = $settings['from_email'] ?? get_option( 'admin_email' );
		}

		$to_list  = is_array( $atts['to'] ) ? $atts['to'] : explode( ',', $atts['to'] );
		$logger   = Logger::instance();
		$provider = $settings['active'] ?? 'phpmailer';

		$all_sent = true;
		foreach ( $to_list as $to ) {
			$to = trim( $to );
			if ( empty( $to ) ) continue;

			// Validate email format.
			if ( ! is_email( $to ) ) {
				$all_sent = false;
				$logger->log( array( 'to' => $to, 'subject' => $atts['subject'], 'body' => $atts['message'], 'headers' => $atts['headers'] ?? '', 'provider' => $provider, 'status' => 'failed', 'error' => 'Invalid email address.' ) );
				continue;
			}

			// Validate domain has mail server (skip in environments where DNS is unavailable).
			if ( function_exists( 'checkdnsrr' ) && ! defined( 'PHP_WASM' ) ) {
				$domain = substr( $to, strrpos( $to, '@' ) + 1 );
				if ( ! @checkdnsrr( $domain, 'MX' ) && ! @checkdnsrr( $domain, 'A' ) ) { // phpcs:ignore
					$all_sent = false;
					$logger->log( array( 'to' => $to, 'subject' => $atts['subject'], 'body' => $atts['message'], 'headers' => $atts['headers'] ?? '', 'provider' => $provider, 'status' => 'failed', 'error' => "Invalid domain: $domain has no mail server." ) );
					continue;
				}
			}

			$result = $esp->send( array(
				'to' => $to, 'subject' => $atts['subject'], 'html' => $atts['message'],
				'from_name' => $from_name, 'from_email' => $from_email, 'reply_to' => $reply_to,
			) );

			$log_base = array( 'to' => $to, 'subject' => $atts['subject'], 'body' => $atts['message'], 'headers' => $atts['headers'] ?? '', 'provider' => $provider );

			if ( $result->is_success() ) {
				$logger->log( array_merge( $log_base, array( 'status' => 'sent' ) ) );
			} else {
				$all_sent = false;
				$logger->log( array_merge( $log_base, array( 'status' => 'failed', 'error' => $result->get_error() ) ) );
				do_action( 'moolmail_send_failed', $to, $result->get_error() );
			}
		}

		return $all_sent;
	}
}
