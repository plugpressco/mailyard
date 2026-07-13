<?php
/**
 * Plugin Name:       Mailyard
 * Plugin URI:        https://mailyard.co
 * Description:       WP SMTP plugin with automatic email failover. Send via Amazon SES, Postmark, Resend, Brevo or any SMTP — with an email log and deliverability fixes.
 * Version:           1.0.0
 * Requires at least: 5.8
 * Tested up to:      7.0
 * Requires PHP:      7.4
 * Author:            PlugPress
 * Author URI:        https://plugpress.co
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain:       mailyard
 * Domain Path:       /languages
 */

defined( 'ABSPATH' ) || exit;

define( 'MAILYARD_VERSION', '1.0.0' );

// Universal admin-shell API version. Extenders (Mailyard Pro) check this to
// decide between shell mode (register into Mailyard's dashboard) and their
// legacy standalone admin. Bump ONLY on breaking changes to the
// mailyard.shell.modules contract or the mailyard_admin_* hooks.
define( 'MAILYARD_SHELL_VERSION', 1 );

define( 'MAILYARD_FILE', __FILE__ );
define( 'MAILYARD_DIR', plugin_dir_path( __FILE__ ) );
define( 'MAILYARD_BASENAME', plugin_basename( __FILE__ ) );

// Composer vendor (Freemius SDK). Optional at runtime: the plugin works
// without it — the account surface simply stays dormant.
if ( file_exists( MAILYARD_DIR . 'vendor/autoload.php' ) ) {
	require_once MAILYARD_DIR . 'vendor/autoload.php';
}

// Freemius — Mailyard is the free PARENT product; the Mailyard Pro add-on
// attaches to it for licensing/updates. Must init at file scope so the
// `mailyard_fs_loaded` signal fires before plugins_loaded (Pro defers its
// own init onto it). Dormant until dashboard credentials are set.
require_once MAILYARD_DIR . 'includes/freemius.php';

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
