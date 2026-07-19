<?php
namespace Mailyard;

defined( 'ABSPATH' ) || exit;

/**
 * Surfaces email send failures as a dismissible admin notice with a link to the
 * log. Records the latest failure (fed by the `mailyard_send_failed` action) and
 * auto-clears it when a later send succeeds or the connection config changes, so
 * a fixed setup dismisses the warning on its own — it isn't nagware.
 */
class Failure_Notice {

	const OPTION       = 'mailyard_last_failure';
	const DISMISS_META = 'mailyard_failure_dismissed';

	public function init(): void {
		// Recorded on every send path (front-end form submissions included).
		add_action( 'mailyard_send_failed', array( $this, 'record' ), 10, 2 );

		// Auto-clear: a later success, or the user fixing their connections/settings.
		add_action( 'mailyard_send_succeeded', array( $this, 'clear' ) );
		add_action( 'update_option_' . Options::CONNECTIONS, array( $this, 'clear' ) );
		add_action( 'update_option_' . Options::SETTINGS, array( $this, 'clear' ) );

		// Admin display + per-user dismissal (these hooks only fire in wp-admin).
		add_action( 'admin_init', array( $this, 'maybe_dismiss' ) );
		add_action( 'admin_notices', array( $this, 'render' ) );
	}

	/**
	 * @param string|array $to  Recipient(s) of the failed message.
	 * @param string       $raw Raw provider/SMTP error.
	 */
	public function record( $to, $raw ): void {
		$prev  = get_option( self::OPTION );
		$count = ( is_array( $prev ) && isset( $prev['count'] ) ) ? (int) $prev['count'] + 1 : 1;
		$human = Errors::humanize( (string) $raw );

		update_option(
			self::OPTION,
			array(
				'time'     => time(),
				'to'       => sanitize_text_field( is_array( $to ) ? implode( ', ', $to ) : (string) $to ),
				'title'    => $human['title'],
				'guidance' => $human['guidance'],
				'count'    => $count,
			),
			false
		);
	}

	public function clear(): void {
		delete_option( self::OPTION );
	}

	/** Handle the per-user "dismiss" link (nonce-checked). */
	public function maybe_dismiss(): void {
		if ( empty( $_GET['mailyard_dismiss_failure'] ) ) {
			return;
		}
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		check_admin_referer( 'mailyard_dismiss_failure' );

		$failure = get_option( self::OPTION );
		$time    = is_array( $failure ) && isset( $failure['time'] ) ? (int) $failure['time'] : time();
		update_user_meta( get_current_user_id(), self::DISMISS_META, $time );

		wp_safe_redirect( remove_query_arg( array( 'mailyard_dismiss_failure', '_wpnonce' ) ) );
		exit;
	}

	public function render(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$failure = get_option( self::OPTION );
		if ( ! is_array( $failure ) || empty( $failure['time'] ) ) {
			return;
		}

		// The log is already on the Mailyard admin page — don't double up there.
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( $screen && false !== strpos( (string) $screen->id, 'page_mailyard' ) ) {
			return;
		}

		// Respect a per-user dismissal until the next (newer) failure.
		$dismissed = (int) get_user_meta( get_current_user_id(), self::DISMISS_META, true );
		if ( $dismissed >= (int) $failure['time'] ) {
			return;
		}

		$count    = isset( $failure['count'] ) ? (int) $failure['count'] : 1;
		$title    = isset( $failure['title'] ) ? $failure['title'] : __( 'Email could not be sent', 'mailyard' );
		$guidance = isset( $failure['guidance'] ) ? $failure['guidance'] : '';

		$log_url = admin_url( 'admin.php?page=mailyard#/logs?status=failed' );
		$dismiss_url = wp_nonce_url(
			add_query_arg( 'mailyard_dismiss_failure', '1' ),
			'mailyard_dismiss_failure'
		);

		$heading = ( $count > 1 )
			/* translators: %d: number of recent failures. */
			? sprintf( _n( 'Mailyard: %d email failed to send', 'Mailyard: %d emails failed to send recently', $count, 'mailyard' ), $count )
			: __( 'Mailyard: an email failed to send', 'mailyard' );

		printf(
			'<div class="notice notice-warning is-dismissible"><p><strong>%s</strong> — %s %s</p><p><a href="%s" class="button button-secondary">%s</a> <a href="%s" style="margin-left:8px">%s</a></p></div>',
			esc_html( $heading . ( $title ? ': ' . $title : '' ) ),
			esc_html( $guidance ),
			'',
			esc_url( $log_url ),
			esc_html__( 'View email log', 'mailyard' ),
			esc_url( $dismiss_url ),
			esc_html__( 'Dismiss', 'mailyard' )
		);
	}
}
