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
	}

	public function add_menu() {
		add_options_page(
			__( 'Mailyard', 'mailyard' ),
			__( 'Mailyard', 'mailyard' ),
			'manage_options',
			'mailyard',
			array( $this, 'render' )
		);
	}

	public function enqueue( $hook ) {
		if ( 'settings_page_mailyard' !== $hook ) {
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
			'onboarded' => (bool) get_option( Options::ONBOARDED, false ),
			'restUrl'   => esc_url_raw( rest_url( Options::REST_NS ) ),
			'nonce'     => wp_create_nonce( 'wp_rest' ),
		) );
	}

	public function render() {
		echo '<div id="mailyard-admin"></div>';
	}
}
