<?php
namespace MoolMail;

defined( 'ABSPATH' ) || exit;

// Admin page and asset loading for the MoolMail React UI.
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
			__( 'MoolMail', 'moolmail' ),
			__( 'MoolMail', 'moolmail' ),
			'manage_options',
			'moolmail',
			array( $this, 'render' )
		);
	}

	public function enqueue( $hook ) {
		if ( 'settings_page_moolmail' !== $hook ) {
			return;
		}

		$asset_file = MOOLMAIL_DIR . 'build/admin.asset.php';
		$asset      = file_exists( $asset_file ) ? require $asset_file : array(
			'dependencies' => array(),
			'version'      => MOOLMAIL_VERSION,
		);

		wp_enqueue_style( 'moolmail-admin', plugins_url( 'build/admin.css', dirname( __FILE__ ) ), array(), $asset['version'] );
		wp_enqueue_script( 'moolmail-admin', plugins_url( 'build/admin.js', dirname( __FILE__ ) ), $asset['dependencies'], $asset['version'], true );
		wp_script_add_data( 'moolmail-admin', 'strategy', 'defer' );

		wp_localize_script( 'moolmail-admin', 'moolMail', array(
			'onboarded' => (bool) get_option( 'moolmail_onboarded', false ),
			'ajaxUrl'   => esc_url( admin_url( 'admin-ajax.php' ) ),
			'testNonce' => wp_create_nonce( 'moolmail_test' ),
		) );
	}

	public function render() {
		echo '<div id="moolmail-admin"></div>';
	}
}
