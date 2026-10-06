<?php
namespace Mailyard;

defined( 'ABSPATH' ) || exit;

// Admin page and asset loading for the Mailyard React UI.
class Settings {

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
	 * PlugPress design system token scope on <body>, so portaled overlays
	 * (dialogs, dropdowns, toasts) inherit the --pp-* custom properties.
	 */
	public function body_class( $classes ) {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( $screen && 'toplevel_page_mailyard' === $screen->id ) {
			$classes .= ' pp-scope';
		}
		return $classes;
	}

	public function add_menu() {
		// '58.14' is Mailyard's reserved slot in the PlugPress admin-menu band
		// (plugpress-ui php/menu-positions.php) — a decimal STRING so it can
		// never clobber a third-party menu registered at the same integer.
		add_menu_page(
			__( 'Mailyard', 'mailyard' ),
			__( 'Mailyard', 'mailyard' ),
			'manage_options',
			'mailyard',
			array( $this, 'render' ),
			$this->menu_icon(),
			'58.14'
		);

		// One native submenu entry per page, mirroring the app's sidebar (NAV in
		// src/App.jsx). Keys are the SPA hash route each entry lands on.
		$submenus = array(
			'dashboard'      => __( 'Dashboard', 'mailyard' ),
			'connections'    => __( 'Connections', 'mailyard' ),
			'logs'           => __( 'Email log', 'mailyard' ),
			'deliverability' => __( 'Deliverability', 'mailyard' ),
			'settings'       => __( 'Settings', 'mailyard' ),
		);

		$first = true;
		foreach ( $submenus as $key => $label ) {
			add_submenu_page(
				'mailyard',
				$label,
				$label,
				'manage_options',
				$first ? 'mailyard' : 'mailyard#/' . $key,
				array( $this, 'render' )
			);
			$first = false;
		}
	}

	/**
	 * 302 the pre-1.2 Settings-page URL to the top-level menu. Browsers carry
	 * the URL fragment across the redirect, so old deep bookmarks
	 * (options-general.php?page=mailyard#/logs) keep working.
	 */
	public function redirect_legacy_url() {
		global $pagenow;
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only redirect.
		if ( 'options-general.php' === $pagenow && 'mailyard' === sanitize_key( wp_unslash( $_GET['page'] ?? '' ) ) ) {
			wp_safe_redirect( admin_url( 'admin.php?page=mailyard' ) );
			exit;
		}
	}

	public function enqueue( $hook ) {
		if ( 'toplevel_page_mailyard' !== $hook ) {
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
		?>
		<div id="mailyard-admin"></div>
		<script>
		( function () {
			// On-page WP submenu clicks switch the SPA hash instead of reloading.
			document.querySelectorAll( '#adminmenu a[href*="page=mailyard#/"]' ).forEach( function ( a ) {
				var match = a.href.match( /page=mailyard#(\/[a-z-]*)/ );
				if ( ! match ) {
					return;
				}
				a.addEventListener( 'click', function ( e ) {
					e.preventDefault();
					window.location.hash = match[ 1 ];
					document.querySelectorAll( '#adminmenu .wp-submenu li' ).forEach( function ( li ) {
						li.classList.remove( 'current' );
					} );
					a.parentElement.classList.add( 'current' );
				} );
			} );
		} )();
		</script>
		<?php
	}

	/**
	 * Menu icon: the Mailyard mark (disc with the send arrow knocked out) as a
	 * base64 SVG data URI.
	 *
	 * Monochrome in wp-admin's icon grey on purpose — WordPress does NOT
	 * recolour data-URI menu icons, it only shifts their opacity for
	 * hover/current, so the brand blue would fight every admin colour scheme.
	 */
	private function menu_icon(): string {
		$svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 360">'
			. '<path fill="#a7aaad" fill-rule="evenodd" clip-rule="evenodd" d="M180 0C279.411 1.64109e-06 360 80.5888 360 180C360 279.411 279.411 360 180 360C80.5888 360 1.56177e-06 279.411 0 180C0 80.5887 80.5887 0 180 0ZM52.1162 156.537C50.5682 157.079 49.5073 158.511 49.4404 160.149C49.3736 161.788 50.314 163.302 51.8125 163.968L151.656 208.343L196.032 308.188C196.698 309.686 198.212 310.626 199.851 310.56C201.489 310.493 202.921 309.432 203.463 307.884L282.203 82.9111C282.01 83.4511 281.698 83.9582 281.266 84.3906L157.516 208.141C155.954 209.703 153.421 209.703 151.859 208.141C150.297 206.579 150.297 204.046 151.859 202.484L275.609 78.7344C276.042 78.3021 276.548 77.9899 277.088 77.7969L52.1162 156.537Z"/>'
			. '</svg>';

		return 'data:image/svg+xml;base64,' . base64_encode( $svg ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode
	}
}
