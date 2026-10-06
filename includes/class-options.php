<?php
namespace Mailyard;

defined( 'ABSPATH' ) || exit;

// Central registry of option keys, table names, REST namespace, and provider IDs.
// Single source of truth — avoid string literals scattered across the codebase.
class Options {

	// wp_options keys.
	const SETTINGS       = 'mailyard_settings';
	const CONNECTIONS    = 'mailyard_connections';
	const TABLE_VERSION  = 'mailyard_log_table_version';
	const WEBHOOK_SECRET = 'mailyard_webhook_secret';

	// Custom table suffix (prepended with $wpdb->prefix).
	const TABLE_LOGS     = 'mailyard_logs';

	// REST.
	const REST_NS        = 'mailyard/v1';

	// Default provider when none configured — passes through to wp_mail().
	const DEFAULT_PROVIDER = 'phpmailer';

	// Providers a connection can use. Must stay in sync with the providers
	// registered in Manager::__construct(). 'phpmailer' (PHP Mail) needs no
	// setup — it's the zero-config backup at the end of a chain.
	public static function providers(): array {
		return array( 'ses', 'postmark', 'resend', 'brevo', 'mailgun', 'sendgrid', 'smtp2go', 'mailjet', 'mailersend', 'maileroo', 'gmail', 'microsoft', 'microsoft_app', 'zoho', 'smtp', self::DEFAULT_PROVIDER );
	}

	// Providers whose API performs its own recipient validation —
	// skip our DNS lookup which is unreliable on dev/VPN/firewalled machines.
	public static function api_providers(): array {
		return array( 'ses', 'postmark', 'resend', 'brevo', 'mailgun', 'sendgrid', 'smtp2go', 'mailjet', 'mailersend', 'maileroo', 'gmail', 'microsoft', 'microsoft_app', 'zoho' );
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

	// Effective settings for this site: its own, with the network's shared
	// groups laid over them on a subsite (see network()).
	public static function settings(): array {
		if ( null === self::$settings_cache ) {
			$value    = get_option( self::SETTINGS, array() );
			$settings = is_array( $value ) ? $value : array();
			$source   = self::shared_source();
			if ( $source ) {
				$main    = get_blog_option( $source, self::SETTINGS, array() );
				$main    = is_array( $main ) ? $main : array();
				$network = self::network();
				$keys    = array_merge(
					array( 'active' ),
					$network['share_sender'] ? self::SHARED_SENDER : array(),
					$network['share_delivery'] ? self::SHARED_DELIVERY : array()
				);
				foreach ( $keys as $key ) {
					if ( array_key_exists( $key, $main ) ) {
						$settings[ $key ] = $main[ $key ];
					} else {
						unset( $settings[ $key ] );
					}
				}
			}
			self::$settings_cache = $settings;
		}
		return self::$settings_cache;
	}

	public static function flush_settings_cache(): void {
		self::$settings_cache = null;
	}

	// Connections with their secrets readable — the one way code reads them, so
	// optional at-rest encryption (Crypto) stays invisible to every caller. On a
	// subsite under shared settings they're the main site's.
	public static function connections(): array {
		$source = self::shared_source();
		$conns  = $source ? get_blog_option( $source, self::CONNECTIONS, array() ) : get_option( self::CONNECTIONS, array() );
		return is_array( $conns ) ? Crypto::map_secrets( $conns, false ) : array();
	}

	// Multisite: the main site can share its setup with every site of the
	// network. The provider (connections) is always shared once on; the sender
	// and the delivery options are each optional. Logs are never shared.
	const NETWORK         = 'mailyard_network';
	const SHARED_SENDER   = array( 'from_email', 'from_name', 'return_path' );
	const SHARED_DELIVERY = array( 'background', 'logging', 'log_retention' );

	/**
	 * Network sharing switches (all false outside multisite).
	 *
	 * @return array{ shared: bool, share_sender: bool, share_delivery: bool }
	 */
	public static function network(): array {
		$value = is_multisite() ? get_site_option( self::NETWORK, array() ) : array();
		$value = is_array( $value ) ? $value : array();
		return array(
			'shared'         => ! empty( $value['shared'] ),
			'share_sender'   => ! empty( $value['share_sender'] ),
			'share_delivery' => ! empty( $value['share_delivery'] ),
		);
	}

	// The site whose setup this one uses: the main site's id on a subsite under
	// shared settings, otherwise 0 (this site manages itself).
	public static function shared_source(): int {
		if ( ! is_multisite() || is_main_site() || ! self::network()['shared'] ) {
			return 0;
		}
		return (int) get_main_site_id();
	}

	// Whether this site's copy of a setting is overridden by the network.
	public static function is_shared_key( string $key ): bool {
		if ( ! self::shared_source() ) {
			return false;
		}
		$network = self::network();
		return 'active' === $key
			|| ( $network['share_sender'] && in_array( $key, self::SHARED_SENDER, true ) )
			|| ( $network['share_delivery'] && in_array( $key, self::SHARED_DELIVERY, true ) );
	}

	// Mirror the primary (first enabled) connection into settings: the active
	// provider slug and, when it has them, its sender as the default sender.
	public static function sync_active( array $conns ): void {
		$settings = get_option( self::SETTINGS, array() );
		$settings = is_array( $settings ) ? $settings : array();

		$primary = null;
		foreach ( $conns as $c ) {
			if ( ! empty( $c['enabled'] ) ) {
				$primary = $c;
				break;
			}
		}

		if ( ! $primary ) {
			$settings['active'] = self::DEFAULT_PROVIDER;
		} else {
			$settings['active'] = sanitize_key( $primary['provider'] );
			if ( ! empty( $primary['from_email'] ) ) {
				$settings['from_email'] = sanitize_email( $primary['from_email'] );
			}
			if ( ! empty( $primary['from_name'] ) ) {
				$settings['from_name'] = sanitize_text_field( $primary['from_name'] );
			}
		}

		update_option( self::SETTINGS, $settings );
	}

	// Connections hold provider credentials in each conn['config'] — keep this
	// option out of the autoload set so credentials aren't loaded on every page.
	// With encryption on (Settings → Security), secret fields are sealed here.
	public static function save_connections( array $conns ): void {
		// Shared from the main site: write there (an OAuth driver refreshing
		// its tokens mid-send), never into a stale local copy.
		$source = self::shared_source();
		if ( $source ) {
			$main = get_blog_option( $source, self::SETTINGS, array() );
			update_blog_option( $source, self::CONNECTIONS, ! empty( $main['encrypt'] ) ? Crypto::map_secrets( $conns, true ) : $conns );
			return;
		}
		if ( ! empty( self::settings()['encrypt'] ) ) {
			$conns = Crypto::map_secrets( $conns, true );
		}
		if ( null === get_option( self::CONNECTIONS, null ) ) {
			add_option( self::CONNECTIONS, $conns, '', false );
		} else {
			update_option( self::CONNECTIONS, $conns, false );
		}
	}
}
