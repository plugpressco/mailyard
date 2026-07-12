<?php
namespace Mailyard;

defined( 'ABSPATH' ) || exit;

// Detects other active SMTP / mail-routing plugins that hook phpmailer_init
// or pre_wp_mail. Multiple such plugins active at once produce undefined
// send behavior — surface a dismissible warning before that bites.
class Conflicts {

	const DISMISS_USER_META = 'mailyard_conflict_notice_dismissed';
	const DISMISS_QUERY_ARG = 'mailyard_dismiss_conflict';
	const DISMISS_NONCE     = 'mailyard_dismiss_conflict';

	private static $instance = null;

	public static function instance(): self {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	public function init(): void {
		add_action( 'admin_init', array( $this, 'maybe_dismiss' ) );
		add_action( 'admin_notices', array( $this, 'maybe_show_notice' ) );
	}

	// Handle ?mailyard_dismiss_conflict=1&_wpnonce=... clicks before any output.
	public function maybe_dismiss(): void {
		if ( empty( $_GET[ self::DISMISS_QUERY_ARG ] ) ) {
			return;
		}
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$nonce = isset( $_GET['_wpnonce'] ) ? sanitize_text_field( wp_unslash( $_GET['_wpnonce'] ) ) : '';
		if ( ! wp_verify_nonce( $nonce, self::DISMISS_NONCE ) ) {
			return;
		}
		update_user_meta( get_current_user_id(), self::DISMISS_USER_META, 1 );
		wp_safe_redirect( remove_query_arg( array( self::DISMISS_QUERY_ARG, '_wpnonce' ) ) );
		exit;
	}

	public function maybe_show_notice(): void {
		if ( get_user_meta( get_current_user_id(), self::DISMISS_USER_META, true ) ) {
			return;
		}

		$screen = get_current_screen();
		if ( $screen && ! in_array( $screen->id, array( 'toplevel_page_mailyard', 'plugins' ), true ) ) {
			return;
		}

		$found = $this->detected();
		if ( empty( $found ) ) {
			return;
		}

		$names = '<strong>' . esc_html( implode( ', ', $found ) ) . '</strong>';

		$message = sprintf(
			/* translators: %s = comma-separated list of conflicting plugin names (wrapped in <strong>) */
			esc_html__( 'Mailyard detected another SMTP / mail-routing plugin: %s. Running multiple at once causes unpredictable email delivery. Deactivate the other one before sending from this site.', 'mailyard' ),
			$names
		);

		$dismiss_url = wp_nonce_url(
			add_query_arg( self::DISMISS_QUERY_ARG, 1 ),
			self::DISMISS_NONCE
		);

		echo '<div class="notice notice-warning"><p>'
			. wp_kses( $message, array( 'strong' => array() ) )
			. ' <a href="' . esc_url( $dismiss_url ) . '" style="margin-left:8px">'
			. esc_html__( 'Dismiss', 'mailyard' )
			. '</a></p></div>';
	}

	// Returns display names of detected conflicting plugins.
	private function detected(): array {
		$candidates = array(
			'WP Mail SMTP'    => 'WPMailSMTP\\Core',
			'Easy WP SMTP'    => 'EasyWPSMTP\\Plugin',
			'FluentSMTP'      => 'FluentMail\\App\\Hooks\\Handlers\\InstallationHandler',
			'Post SMTP'       => 'PostmanWpMail',
			'WP SMTP'         => 'WP_SMTP',
			'WP Offload SES'  => 'DeliciousBrains\\WP_Offload_SES\\WP_Offload_SES',
			'SendGrid'        => 'Sendgrid_Mail',
		);

		$found = array();
		foreach ( $candidates as $label => $class ) {
			if ( class_exists( $class ) ) {
				$found[] = $label;
			}
		}
		return $found;
	}
}
