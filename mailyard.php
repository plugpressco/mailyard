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
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain:       mailyard
 * Domain Path:       /languages
 */

defined( 'ABSPATH' ) || exit;

define( 'MAILYARD_VERSION', '1.0.0' );
define( 'MAILYARD_FILE', __FILE__ );
define( 'MAILYARD_DIR', plugin_dir_path( __FILE__ ) );
define( 'MAILYARD_BASENAME', plugin_basename( __FILE__ ) );

require_once MAILYARD_DIR . 'includes/class-plugin.php';

Mailyard\Plugin::instance()->boot();

// PlugPress SDK — self-hosted updates and shared admin UI.
// Mailyard is a free plugin, so `pro` is false: all installs receive updates
// from the PlugPress server without a license key and no License page appears.
//
// Must run on `plugins_loaded` (not `init`) so that PlugPress_Updater can hook
// `pre_set_site_transient_update_plugins` in time. WordPress fires that filter
// during background update checks that run before `init`, so an `init`-deferred
// registration means the updater never sees those checks and the update badge
// never appears. Translatable strings in the config (About tagline) are passed
// as plain strings here and translated at render time via the SDK's own __().
add_action( 'plugins_loaded', function () {
	require_once dirname( MAILYARD_FILE ) . '/vendor/autoload.php';
	PlugPress_SDK::init( [
		'slug'             => 'mailyard',
		'name'             => 'Mailyard',
		'file'             => MAILYARD_FILE,
		'version'          => MAILYARD_VERSION,
		'server'           => 'https://updates.plugpress.co',
		'telemetry_server' => 'https://analytics.plugpress.co',
		'pro'              => false,
		'menu_parent'      => 'options-general.php',
		'accent'           => '#2563EB',
		'about'            => [
			'tagline' => 'Reliable email delivery for WordPress.',
			'links'   => [
				'Documentation' => 'https://mailyard.co/docs',
				'Support'       => 'https://mailyard.co/support',
			],
		],
	] );
} );

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
