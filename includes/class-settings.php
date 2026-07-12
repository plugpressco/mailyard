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

		// SPA sections as native submenus for deep-linking. Entries are
		// order-aware so extenders slot in by weight instead of appending
		// after Settings — the flyout mirrors the SPA sidebar (Dashboard,
		// Marketing 20s, Delivery 30s, Settings last at 90).
		$submenus = array(
			'dashboard'      => array(
				'label' => __( 'Dashboard', 'mailyard' ),
				'order' => 10,
			),
			'connections'    => array(
				'label' => __( 'Connections', 'mailyard' ),
				'order' => 30,
			),
			'deliverability' => array(
				'label' => __( 'Deliverability', 'mailyard' ),
				'order' => 31,
			),
			'logs'           => array(
				'label' => __( 'Logs', 'mailyard' ),
				'order' => 32,
			),
			'settings'       => array(
				'label' => __( 'Settings', 'mailyard' ),
				'order' => 90,
			),
		);

		/**
		 * Extend the Mailyard admin submenu.
		 *
		 * Mailyard Pro adds its sections (Campaigns, Contacts, Automations)
		 * here so both products live under one menu.
		 *
		 * @param array $submenus Map of SPA hash route => array( 'label', 'order' ).
		 *                        Plain-string values are accepted (order 50).
		 */
		$submenus = apply_filters( 'mailyard_admin_submenus', $submenus );

		// Normalize legacy string entries, then sort by weight.
		foreach ( $submenus as $key => $entry ) {
			if ( ! is_array( $entry ) ) {
				$submenus[ $key ] = array(
					'label' => (string) $entry,
					'order' => 50,
				);
			}
		}
		uasort(
			$submenus,
			static function ( $a, $b ) {
				return ( $a['order'] ?? 50 ) <=> ( $b['order'] ?? 50 );
			}
		);

		$first = true;
		foreach ( $submenus as $key => $entry ) {
			add_submenu_page(
				'mailyard',
				$entry['label'],
				$entry['label'],
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
		// root + nonce so the client can authenticate, plus the onboarding flag.
		wp_localize_script( 'mailyard-admin', 'mailyard', array(
			'onboarded'    => (bool) get_option( Options::ONBOARDED, false ),
			'restUrl'      => esc_url_raw( rest_url( Options::REST_NS ) ),
			'nonce'        => wp_create_nonce( 'wp_rest' ),
			'version'      => MAILYARD_VERSION,
			'shellVersion' => MAILYARD_SHELL_VERSION,
		) );

		/**
		 * Fires after Mailyard's admin bundle is enqueued on its page.
		 *
		 * Extenders (Mailyard Pro) hook this to enqueue their own bundle with
		 * a dependency on the passed handle — that ordering guarantees their
		 * `mailyard.shell.modules` filter registers before the shell mounts.
		 *
		 * @param string $handle Mailyard's admin script handle.
		 */
		do_action( 'mailyard_admin_enqueue', 'mailyard-admin' );
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
		$svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
			. '<path fill="#a7aaad" d="M50 0C77.6142 7.99448e-07 100 22.3858 100 50C100 77.6142 77.6142 100 50 100C22.3858 100 1.12106e-06 77.6142 0 50C0 22.3858 22.3858 0 50 0ZM13.5225 40.7559C11.9745 41.2977 10.9135 42.7295 10.8467 44.3682C10.7798 46.0067 11.7202 47.5203 13.2188 48.1865L39.9375 60.0615L51.8135 86.7812C52.4797 88.2798 53.9932 89.2202 55.6318 89.1533C57.2705 89.0865 58.7023 88.0255 59.2441 86.4775L81.1094 24.0049C80.9164 24.5449 80.6043 25.0519 80.1719 25.4844L45.7969 59.8594C44.2348 61.4215 41.7027 61.4215 40.1406 59.8594C38.5785 58.2973 38.5785 55.7652 40.1406 54.2031L74.5156 19.8281C74.9479 19.3959 75.4545 19.0837 75.9941 18.8906L13.5225 40.7559Z"/>'
			. '</svg>';

		return 'data:image/svg+xml;base64,' . base64_encode( $svg ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode
	}
}
