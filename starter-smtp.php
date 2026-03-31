<?php
/**
 * Plugin Name:       Starter SMTP
 * Plugin URI:        https://23sphere.com/starter-smtp
 * Description:       Connect WordPress to Amazon SES, Postmark, Resend, or any SMTP server. Replaces wp_mail() for reliable email delivery.
 * Version:           1.0.0
 * Requires at least: 5.8
 * Requires PHP:      7.2
 * Author:            Fahim Reza
 * Author URI:        https://23sphere.com
 * License:           GPL-2.0+
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain:       starter-smtp
 */

defined( 'ABSPATH' ) || exit;

define( 'STARTER_SMTP_VERSION', '1.0.0' );
define( 'STARTER_SMTP_DIR', plugin_dir_path( __FILE__ ) );
define( 'STARTER_SMTP_BASENAME', plugin_basename( __FILE__ ) );

// Load ESP classes.
require_once STARTER_SMTP_DIR . 'includes/esp/interface-esp.php';
require_once STARTER_SMTP_DIR . 'includes/esp/class-result.php';
require_once STARTER_SMTP_DIR . 'includes/esp/class-phpmailer.php';
require_once STARTER_SMTP_DIR . 'includes/esp/class-ses.php';
require_once STARTER_SMTP_DIR . 'includes/esp/class-postmark.php';
require_once STARTER_SMTP_DIR . 'includes/esp/class-resend.php';
require_once STARTER_SMTP_DIR . 'includes/esp/class-smtp.php';
require_once STARTER_SMTP_DIR . 'includes/class-manager.php';
require_once STARTER_SMTP_DIR . 'includes/class-settings.php';
require_once STARTER_SMTP_DIR . 'includes/class-override.php';

// Boot.
add_action( 'init', function () {
	Starter_SMTP_Override::get_instance()->init();
} );

// Admin settings.
if ( is_admin() ) {
	Starter_SMTP_Settings::get_instance()->init();
}

// Plugin action links.
add_filter( 'plugin_action_links_' . STARTER_SMTP_BASENAME, function ( $links ) {
	array_unshift( $links, '<a href="' . esc_url( admin_url( 'options-general.php?page=starter-smtp' ) ) . '">' . __( 'Settings', 'starter-smtp' ) . '</a>' );
	return $links;
} );

/**
 * Public API — other plugins can check if Starter SMTP is handling email.
 */
function starter_smtp_is_active() {
	$settings = get_option( 'starter_smtp_settings', array() );
	$active   = isset( $settings['active'] ) ? $settings['active'] : 'phpmailer';
	return 'phpmailer' !== $active;
}

function starter_smtp_get_active_provider() {
	return Starter_SMTP_Manager::get_instance()->get_active_esp();
}
