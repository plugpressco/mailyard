<?php
/**
 * Plugin Name:       MoolMail
 * Plugin URI:        https://23sphere.com/moolmail
 * Description:       Reliable email delivery for WordPress. Route emails through Amazon SES, Postmark, Resend, or any SMTP server with smart failover.
 * Version:           1.0.0
 * Requires at least: 5.8
 * Requires PHP:      7.4
 * Author:            Fahim Reza
 * Author URI:        https://23sphere.com
 * License:           GPL-2.0+
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain:       moolmail
 */

defined( 'ABSPATH' ) || exit;

define( 'MOOLMAIL_VERSION', '1.0.0' );
define( 'MOOLMAIL_DIR', plugin_dir_path( __FILE__ ) );
define( 'MOOLMAIL_BASENAME', plugin_basename( __FILE__ ) );

// Load all classes under MoolMail namespace.
require_once MOOLMAIL_DIR . 'includes/esp/interface-esp.php';
require_once MOOLMAIL_DIR . 'includes/esp/class-result.php';
require_once MOOLMAIL_DIR . 'includes/esp/class-phpmailer.php';
require_once MOOLMAIL_DIR . 'includes/esp/class-ses.php';
require_once MOOLMAIL_DIR . 'includes/esp/class-postmark.php';
require_once MOOLMAIL_DIR . 'includes/esp/class-resend.php';
require_once MOOLMAIL_DIR . 'includes/esp/class-smtp.php';
require_once MOOLMAIL_DIR . 'includes/class-manager.php';
require_once MOOLMAIL_DIR . 'includes/class-logger.php';
require_once MOOLMAIL_DIR . 'includes/class-override.php';
require_once MOOLMAIL_DIR . 'includes/class-rest-api.php';
require_once MOOLMAIL_DIR . 'includes/class-settings.php';

// Create log table on activation.
register_activation_hook( __FILE__, array( 'MoolMail\\Logger', 'create_table' ) );

// Boot on init.
add_action( 'init', function () {
	// Ensure log table exists (handles upgrades without reactivation).
	if ( get_option( 'moolmail_log_table_version' ) !== MoolMail\Logger::TABLE_VERSION ) {
		MoolMail\Logger::create_table();
	}

	// Start email logging.
	MoolMail\Logger::instance()->init();

	// Route emails through active provider.
	( new MoolMail\Override() )->init();
} );

// REST API.
( new MoolMail\REST_API() )->init();

// Admin UI.
if ( is_admin() ) {
	MoolMail\Settings::instance()->init();
}

// Settings link on plugins page.
add_filter( 'plugin_action_links_' . MOOLMAIL_BASENAME, function ( $links ) {
	array_unshift( $links, '<a href="' . esc_url( admin_url( 'options-general.php?page=moolmail' ) ) . '">' . __( 'Settings', 'moolmail' ) . '</a>' );
	return $links;
} );

// Public API.
function moolmail_is_active(): bool {
	$settings = get_option( 'moolmail_settings', array() );
	return ( $settings['active'] ?? 'phpmailer' ) !== 'phpmailer';
}

function moolmail_active_provider(): ?MoolMail\ESP\Provider {
	return MoolMail\Manager::instance()->active_provider();
}
