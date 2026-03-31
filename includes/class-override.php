<?php
defined( 'ABSPATH' ) || exit;

/**
 * Overrides wp_mail() via the pre_wp_mail filter to route emails
 * through the active ESP provider.
 */
class Starter_SMTP_Override {

	/**
	 * Hook into WordPress if a non-default provider is active.
	 */
	public function init() {
		$settings = get_option( 'starter_smtp_settings', array() );
		$active   = isset( $settings['active'] ) ? $settings['active'] : 'phpmailer';

		// Only override when using an external provider.
		// phpmailer = default wp_mail, no override needed.
		// smtp uses phpmailer_init hook internally, so it also goes through wp_mail.
		if ( 'phpmailer' === $active || 'smtp' === $active ) {
			return;
		}

		add_filter( 'pre_wp_mail', array( $this, 'handle_mail' ), 10, 2 );
	}

	/**
	 * Intercept wp_mail and send via the active ESP.
	 *
	 * @param null|bool $null Short-circuit return value. Null to continue with wp_mail.
	 * @param array     $atts {
	 *     @type string|string[] $to          Recipients.
	 *     @type string          $subject     Subject.
	 *     @type string          $message     Body.
	 *     @type string|string[] $headers     Headers.
	 *     @type string|string[] $attachments Attachments.
	 * }
	 * @return bool|null True on success, null to fall through to default wp_mail.
	 */
	public function handle_mail( $null, $atts ) {
		$esp = Starter_SMTP_Manager::get_instance()->get_active_esp();

		if ( ! $esp ) {
			// Provider unavailable — fall through to default wp_mail.
			return null;
		}

		// Parse headers for From and Reply-To.
		$from_name  = '';
		$from_email = '';
		$reply_to   = '';

		$headers = isset( $atts['headers'] ) ? $atts['headers'] : '';
		if ( ! is_array( $headers ) ) {
			$headers = array_filter( explode( "\n", str_replace( "\r\n", "\n", $headers ) ) );
		}

		foreach ( $headers as $header ) {
			$parts = explode( ':', $header, 2 );
			if ( count( $parts ) < 2 ) {
				continue;
			}
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
		if ( empty( $from_email ) ) {
			$settings   = get_option( 'starter_smtp_settings', array() );
			$from_name  = isset( $settings['from_name'] ) ? $settings['from_name'] : get_bloginfo( 'name' );
			$from_email = isset( $settings['from_email'] ) ? $settings['from_email'] : get_option( 'admin_email' );
		}

		// Handle multiple recipients.
		$to_list = is_array( $atts['to'] ) ? $atts['to'] : explode( ',', $atts['to'] );

		$all_sent = true;
		foreach ( $to_list as $to ) {
			$to = trim( $to );
			if ( empty( $to ) ) {
				continue;
			}

			$result = $esp->send( array(
				'to'         => $to,
				'subject'    => $atts['subject'],
				'html'       => $atts['message'],
				'from_name'  => $from_name,
				'from_email' => $from_email,
				'reply_to'   => $reply_to,
			) );

			if ( ! $result->is_success() ) {
				$all_sent = false;
				do_action( 'starter_smtp_send_failed', $to, $result->get_error() );
			}
		}

		return $all_sent;
	}
}
