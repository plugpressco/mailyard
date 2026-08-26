<?php
/**
 * Plugin Name:       Mailyard
 * Plugin URI:        https://plugpress.co/mailyard
 * Description:       WP SMTP plugin with automatic email failover. Send via Amazon SES, Postmark, Resend, Brevo or any SMTP — with an email log and deliverability fixes.
 * Version:           1.1.0
 * Requires at least: 7.0
 * Tested up to:      7.1
 * Requires PHP:      7.4
 * Author:            PlugPress
 * Author URI:        https://plugpress.co
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain:       mailyard
 * Domain Path:       /languages
 */

defined( 'ABSPATH' ) || exit;

define( 'MAILYARD_VERSION', '1.1.0' );

// Universal admin-shell API version. Extenders (Mailyard Pro) check this to
// decide between shell mode (register into Mailyard's dashboard) and their
// legacy standalone admin. Bump ONLY on breaking changes to the
// mailyard.shell.modules contract or the mailyard_admin_* hooks.
define( 'MAILYARD_SHELL_VERSION', 1 );

define( 'MAILYARD_FILE', __FILE__ );
define( 'MAILYARD_DIR', plugin_dir_path( __FILE__ ) );
define( 'MAILYARD_URL', plugin_dir_url( __FILE__ ) );
define( 'MAILYARD_BASENAME', plugin_basename( __FILE__ ) );

// Composer vendor. Ships in release builds — the broadcasting send pipeline
// runs on Action Scheduler. Guarded so a dev tree without an install boots.
if ( file_exists( MAILYARD_DIR . 'vendor/autoload.php' ) ) {
	require_once MAILYARD_DIR . 'vendor/autoload.php';
}

// Action Scheduler must load at file scope — it self-initializes on
// plugins_loaded priority 1, before our own boot below.
if ( ! class_exists( 'ActionScheduler' )
	&& file_exists( MAILYARD_DIR . 'vendor/woocommerce/action-scheduler/action-scheduler.php' ) ) {
	require_once MAILYARD_DIR . 'vendor/woocommerce/action-scheduler/action-scheduler.php';
}

require_once MAILYARD_DIR . 'includes/class-plugin.php';

Mailyard\Plugin::instance()->boot();

if ( ! function_exists( 'mailyard_is_active' ) ) {
	/**
	 * Whether Mailyard is actively routing mail (a non-default provider is configured).
	 */
	function mailyard_is_active(): bool {
		$settings = get_option( Mailyard\Options::SETTINGS, array() );
		return ( $settings['active'] ?? Mailyard\Options::DEFAULT_PROVIDER ) !== Mailyard\Options::DEFAULT_PROVIDER;
	}
}

if ( ! function_exists( 'mailyard_active_provider' ) ) {
	/**
	 * The active ESP provider instance, or null when none is configured.
	 */
	function mailyard_active_provider(): ?Mailyard\ESP\Provider {
		return Mailyard\Manager::instance()->active_provider();
	}
}
