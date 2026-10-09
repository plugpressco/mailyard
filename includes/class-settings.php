<?php
namespace Mailyard;

defined( 'ABSPATH' ) || exit;

// Admin page and asset loading for the Mailyard React UI.
class Settings {

	const PAGE = 'mailyard';

	// The page's screen id / hook suffix under Settings.
	const SCREEN = 'settings_page_mailyard';

	private static $instance = null;

	public static function instance(): self {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	public function init() {
		add_action( 'admin_menu', array( $this, 'add_menu' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue' ) );
		add_filter( 'admin_body_class', array( $this, 'body_class' ) );
		add_action( 'admin_init', array( $this, 'redirect_legacy_url' ) );
	}

	/**
	 * The admin page URL, optionally at an app route ('logs', 'connections', …).
	 * Every link into the app goes through here.
	 */
	public static function url( string $route = '' ): string {
		$url = admin_url( 'options-general.php?page=' . self::PAGE );
		return '' === $route ? $url : $url . '#/' . ltrim( $route, '#/' );
	}

	/**
	 * PlugPress design system token scope on <body>, so portaled overlays
	 * (dialogs, dropdowns, toasts) inherit the --pp-* custom properties.
	 */
	public function body_class( $classes ) {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( $screen && self::SCREEN === $screen->id ) {
			$classes .= ' pp-scope';
		}
		return $classes;
	}

	// Settings → SMTP: one page, the app's own top bar handles the sections.
	public function add_menu() {
		add_options_page(
			__( 'Mailyard SMTP', 'mailyard' ),
			__( 'SMTP', 'mailyard' ),
			'manage_options',
			self::PAGE,
			array( $this, 'render' )
		);
	}

	/**
	 * 302 the old top-level menu URL (admin.php?page=mailyard) to Settings →
	 * SMTP, keeping its query args (an OAuth return carries its outcome there).
	 * Browsers carry the URL fragment across the redirect, so old deep links
	 * (…page=mailyard#/logs, in alert emails already sent) keep working.
	 */
	public function redirect_legacy_url() {
		global $pagenow;
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only redirect.
		if ( 'admin.php' !== $pagenow || self::PAGE !== sanitize_key( wp_unslash( $_GET['page'] ?? '' ) ) ) {
			return;
		}
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only redirect.
		$args = map_deep( wp_unslash( $_GET ), 'sanitize_text_field' );
		wp_safe_redirect( add_query_arg( rawurlencode_deep( $args ), admin_url( 'options-general.php' ) ) );
		exit;
	}

	public function enqueue( $hook ) {
		if ( self::SCREEN !== $hook ) {
			return;
		}

		$asset_file = MAILYARD_DIR . 'build/admin.asset.php';
		$asset      = file_exists( $asset_file ) ? require $asset_file : array(
			'dependencies' => array(),
			'version'      => MAILYARD_VERSION,
		);

		wp_enqueue_style( 'mailyard-admin', plugins_url( 'build/admin.css', dirname( __FILE__ ) ), array(), $asset['version'] );
		wp_enqueue_script( 'mailyard-admin', plugins_url( 'build/admin.js', dirname( __FILE__ ) ), $asset['dependencies'], $asset['version'], true );
		wp_script_add_data( 'mailyard-admin', 'strategy', 'defer' );

		// The React app talks to the plugin over the REST API via @wordpress/api-fetch,
		// which supplies its own X-WP-Nonce (wp_rest) middleware. We expose the REST
		// root + nonce so the client can authenticate.
		wp_localize_script( 'mailyard-admin', 'mailyard', array(
			'restUrl'       => esc_url_raw( rest_url( Options::REST_NS ) ),
			'nonce'         => wp_create_nonce( 'wp_rest' ),
			'version'       => MAILYARD_VERSION,
			'adminEmail'    => (string) get_option( 'admin_email' ),
			'oauthRedirect' => OAuth::redirect_uri(),
			'locked'        => $this->locked_fields(),
		) );
	}

	// provider slug => field keys set in wp-config.php (MAILYARD_{PROVIDER}_{FIELD}),
	// so the connection editor can show them as managed there.
	private function locked_fields(): object {
		$out = array();
		foreach ( array_keys( Manager::instance()->all() ) as $slug ) {
			$keys = array_keys( Manager::instance()->constant_fields( $slug ) );
			if ( $keys ) {
				$out[ $slug ] = $keys;
			}
		}
		return (object) $out;
	}

	public function render() {
		echo '<div id="mailyard-admin"></div>';
	}
}
