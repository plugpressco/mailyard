<?php
defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

global $wpdb;

// Table name is built from the trusted $wpdb->prefix and a hardcoded suffix —
// no user input is involved. Identifiers can't be bound via prepare(), so it is
// interpolated directly after sanitizing with esc_sql().
$mailyard_table = esc_sql( $wpdb->prefix . 'mailyard_logs' );
$wpdb->query( "DROP TABLE IF EXISTS `{$mailyard_table}`" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange

delete_option( 'mailyard_settings' );
delete_option( 'mailyard_connections' );
delete_option( 'mailyard_onboarded' );
delete_option( 'mailyard_log_table_version' );

// Per-user dismissal flag for the conflict notice.
delete_metadata( 'user', 0, 'mailyard_conflict_notice_dismissed', '', true );

// Cached deliverability scan results (mailyard_deliv_* transients).
$wpdb->query( // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
	$wpdb->prepare(
		"DELETE FROM {$wpdb->options} WHERE option_name LIKE %s OR option_name LIKE %s",
		$wpdb->esc_like( '_transient_mailyard_deliv_' ) . '%',
		$wpdb->esc_like( '_transient_timeout_mailyard_deliv_' ) . '%'
	)
);

wp_clear_scheduled_hook( 'mailyard_daily_cleanup' );
