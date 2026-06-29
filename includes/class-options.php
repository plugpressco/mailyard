<?php
namespace Mailyard;

defined( 'ABSPATH' ) || exit;

// Central registry of option keys, table names, REST namespace, and provider IDs.
// Single source of truth — avoid string literals scattered across the codebase.
class Options {

	// wp_options keys.
	const SETTINGS       = 'mailyard_settings';
	const CONNECTIONS    = 'mailyard_connections';
	const ONBOARDED      = 'mailyard_onboarded';
	const TABLE_VERSION  = 'mailyard_log_table_version';
	const WEBHOOK_SECRET = 'mailyard_webhook_secret';

	// Custom table suffix (prepended with $wpdb->prefix).
	const TABLE_LOGS     = 'mailyard_logs';

	// REST.
	const REST_NS        = 'mailyard/v1';

	// Default provider when none configured — passes through to wp_mail().
	const DEFAULT_PROVIDER = 'phpmailer';

	// Providers that can be selected as the active connection. Must stay in sync
	// with the providers registered in Manager::__construct(); excludes 'phpmailer'
	// which is the fall-through default.
	public static function providers(): array {
		return array( 'ses', 'postmark', 'resend', 'brevo', 'smtp' );
	}

	// Providers whose API performs its own recipient validation —
	// skip our DNS lookup which is unreliable on dev/VPN/firewalled machines.
	public static function api_providers(): array {
		return array( 'postmark', 'ses', 'resend', 'brevo' );
	}

	public static function providers_with_default(): array {
		return array_merge( self::providers(), array( self::DEFAULT_PROVIDER ) );
	}

	// Per-site secret embedded in webhook URLs as `?token=`. Generated on first read
	// and never autoloaded. The first line of defense for the public bounce endpoint:
	// a caller without this secret can't report bounces.
	public static function webhook_secret(): string {
		$secret = (string) get_option( self::WEBHOOK_SECRET, '' );
		if ( '' === $secret ) {
			$secret = wp_generate_password( 40, false );
			update_option( self::WEBHOOK_SECRET, $secret, false );
		}
		return $secret;
	}

	// The full webhook URL to paste into a provider's dashboard, including the token.
	public static function webhook_url( string $provider ): string {
		return add_query_arg(
			'token',
			self::webhook_secret(),
			rest_url( self::REST_NS . '/webhooks/' . $provider )
		);
	}

	// Request-scoped cache for the settings array. wp_mail() inside a single
	// request can read settings 3–4 times across Override/Logger/Manager; this
	// avoids re-hydrating the option array each time.
	private static $settings_cache = null;

	public static function settings(): array {
		if ( null === self::$settings_cache ) {
			$value = get_option( self::SETTINGS, array() );
			self::$settings_cache = is_array( $value ) ? $value : array();
		}
		return self::$settings_cache;
	}

	public static function flush_settings_cache(): void {
		self::$settings_cache = null;
	}
}
