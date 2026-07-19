<?php
namespace Mailyard;

defined( 'ABSPATH' ) || exit;

// Composes the plugin's runtime: loads classes, wires hooks, registers REST + admin.
class Plugin {

	const CRON_CLEANUP    = 'mailyard_daily_cleanup';
	const LOG_RETAIN_DAYS = 30;

	private static $instance = null;

	public static function instance(): self {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	public function boot(): void {
		$this->load_classes();

		register_activation_hook( MAILYARD_FILE, array( $this, 'on_activate' ) );
		register_deactivation_hook( MAILYARD_FILE, array( $this, 'on_deactivate' ) );

		add_action( 'init', array( $this, 'on_init' ) );
		add_action( self::CRON_CLEANUP, array( $this, 'run_cleanup' ) );

		// Keep the request-scoped settings cache coherent with writes.
		add_action( 'update_option_' . Options::SETTINGS, array( Options::class, 'flush_settings_cache' ) );
		add_action( 'add_option_' . Options::SETTINGS,    array( Options::class, 'flush_settings_cache' ) );
		add_action( 'delete_option_' . Options::SETTINGS, array( Options::class, 'flush_settings_cache' ) );

		( new REST_API() )->init();
		( new Webhooks() )->init();

		// Delivery tools for the WordPress Abilities API — a silent no-op on
		// WP < 6.9 (the API's functions simply don't exist) and when the user
		// turns AI access off in Settings → Connect AI.
		( new Abilities() )->register();

		if ( is_admin() ) {
			Settings::instance()->init();
			Conflicts::instance()->init();
			add_filter( 'plugin_action_links_' . MAILYARD_BASENAME, array( $this, 'plugin_action_links' ) );
		}
	}

	public function on_activate(): void {
		Logger::create_table();
		$this->disable_connections_autoload();
		if ( ! wp_next_scheduled( self::CRON_CLEANUP ) ) {
			wp_schedule_event( time() + HOUR_IN_SECONDS, 'daily', self::CRON_CLEANUP );
		}
	}

	// One-time migration: existing installs may have mailyard_connections as
	// autoload=yes (the WP default). Flip it so credentials aren't autoloaded.
	private function disable_connections_autoload(): void {
		global $wpdb;
		$row = $wpdb->get_row( $wpdb->prepare( // phpcs:ignore WordPress.DB
			"SELECT option_value, autoload FROM {$wpdb->options} WHERE option_name = %s",
			Options::CONNECTIONS
		) );
		if ( $row && 'no' !== $row->autoload ) {
			$wpdb->update( // phpcs:ignore WordPress.DB
				$wpdb->options,
				array( 'autoload' => 'no' ),
				array( 'option_name' => Options::CONNECTIONS )
			);
			wp_cache_delete( 'alloptions', 'options' );
		}
	}

	public function on_deactivate(): void {
		wp_clear_scheduled_hook( self::CRON_CLEANUP );
	}

	public function on_init(): void {
		// Ensure log table exists (handles upgrades without reactivation).
		if ( get_option( Options::TABLE_VERSION ) !== Logger::TABLE_VERSION ) {
			Logger::create_table();
		}

		// Activation hook is skipped on must-use installs and on dev-symlinked plugins
		// where activation never fires — re-schedule defensively if needed.
		if ( ! wp_next_scheduled( self::CRON_CLEANUP ) ) {
			wp_schedule_event( time() + HOUR_IN_SECONDS, 'daily', self::CRON_CLEANUP );
		}

		Logger::instance()->init();
		( new Override() )->init();
		( new Failure_Notice() )->init();
	}

	public function run_cleanup(): void {
		Logger::instance()->cleanup( self::LOG_RETAIN_DAYS );
	}

	public function plugin_action_links( array $links ): array {
		$url   = admin_url( 'admin.php?page=mailyard' );
		$label = __( 'Settings', 'mailyard' );
		array_unshift( $links, '<a href="' . esc_url( $url ) . '">' . $label . '</a>' );
		return $links;
	}

	private function load_classes(): void {
		$includes = MAILYARD_DIR . 'includes/';

		require_once $includes . 'esp/interface-esp.php';
		require_once $includes . 'esp/class-result.php';
		require_once $includes . 'esp/class-attachment.php';
		require_once $includes . 'esp/class-default.php';
		require_once $includes . 'esp/class-ses.php';
		require_once $includes . 'esp/class-postmark.php';
		require_once $includes . 'esp/class-resend.php';
		require_once $includes . 'esp/class-brevo.php';
		require_once $includes . 'esp/class-smtp.php';

		require_once $includes . 'class-options.php';
		require_once $includes . 'class-manager.php';
		require_once $includes . 'class-deliverability.php';
		require_once $includes . 'class-errors.php';
		require_once $includes . 'class-logger.php';
		require_once $includes . 'class-override.php';
		require_once $includes . 'class-failure-notice.php';
		require_once $includes . 'class-data-deleter.php';
		require_once $includes . 'class-rest-api.php';
		require_once $includes . 'class-abilities.php';
		require_once $includes . 'class-webhooks.php';
		require_once $includes . 'class-settings.php';
		require_once $includes . 'class-conflicts.php';
	}
}
