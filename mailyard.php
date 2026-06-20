<?php
/**
 * Plugin Name:       Mailyard
 * Plugin URI:        https://mailyard.co
 * Description:       Reliable email delivery for WordPress. Route emails through Amazon SES, Postmark, Resend, or any SMTP server with smart failover.
 * Version:           1.0.0
 * Requires at least: 5.8
 * Tested up to:      6.8
 * Requires PHP:      7.4
 * Author:            PlugPress
 * Author URI:        https://plugpress.co
 * License:           GPL-2.0+
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain:       mailyard
 */

defined( 'ABSPATH' ) || exit;

define( 'MAILYARD_VERSION', '1.0.0' );
define( 'MAILYARD_FILE', __FILE__ );
define( 'MAILYARD_DIR', plugin_dir_path( __FILE__ ) );
define( 'MAILYARD_BASENAME', plugin_basename( __FILE__ ) );

require_once MAILYARD_DIR . 'includes/class-plugin.php';

Mailyard\Plugin::instance()->boot();

function mailyard_is_active(): bool {
	$settings = get_option( Mailyard\Options::SETTINGS, array() );
	return ( $settings['active'] ?? Mailyard\Options::DEFAULT_PROVIDER ) !== Mailyard\Options::DEFAULT_PROVIDER;
}

function mailyard_active_provider(): ?Mailyard\ESP\Provider {
	return Mailyard\Manager::instance()->active_provider();
}
