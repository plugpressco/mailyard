<?php
namespace Mailyard;

defined( 'ABSPATH' ) || exit;

// Irreversible teardown of ALL Mailyard data.
//
// This is the ONLY place that erases data. It is NEVER run on uninstall
// (see uninstall.php — intentionally a no-op); it runs only from the explicit,
// confirmed "Delete all data" action in Settings -> Danger Zone.
//
// After wiping everything it recreates the empty logs table so the plugin is
// left in a clean, working "fresh install" state rather than a broken one.
class Data_Deleter {

	// Erase every trace of Mailyard data, then recreate the empty logs table.
	public static function delete_all_data(): void {
		global $wpdb;

		// 1. Drop the delivery-log table.
		$table = esc_sql( Logger::table() );
		$wpdb->query( "DROP TABLE IF EXISTS {$table}" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange

		// 2. Delete known options explicitly.
		delete_option( Options::SETTINGS );
		delete_option( Options::CONNECTIONS );
		delete_option( 'mailyard_onboarded' ); // Legacy — onboarding was removed.
		delete_option( Options::TABLE_VERSION );

		// 2b. Belt-and-braces: remove any other mailyard_* options that slipped
		// past the explicit list above (escape LIKE wildcards in the prefix).
		$like = $wpdb->esc_like( 'mailyard_' ) . '%';
		$wpdb->query( $wpdb->prepare( "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s", $like ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching

		// 3. Delete the per-user "conflict notice dismissed" meta for ALL users.
		delete_metadata( 'user', 0, Conflicts::DISMISS_USER_META, '', true );

		// 4. Delete the deliverability scan transients (both the value and the
		// timeout rows). Cache_Prefix matches CACHE_PREFIX on Deliverability.
		$transient = $wpdb->esc_like( '_transient_' . Deliverability::CACHE_PREFIX ) . '%';
		$timeout   = $wpdb->esc_like( '_transient_timeout_' . Deliverability::CACHE_PREFIX ) . '%';
		$wpdb->query( $wpdb->prepare( "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s OR option_name LIKE %s", $transient, $timeout ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching

		// 5. Clear the scheduled cron hook.
		wp_clear_scheduled_hook( Plugin::CRON_CLEANUP );

		// 6. Flush the request-scoped settings cache so nothing stale survives.
		Options::flush_settings_cache();

		// 7. Recreate the empty logs table — leave the plugin clean and working.
		Logger::create_table();
	}
}
