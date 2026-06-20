<?php
defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

global $wpdb;

$table = $wpdb->prefix . 'mailyard_logs';
$wpdb->query( "DROP TABLE IF EXISTS {$table}" ); // phpcs:ignore

delete_option( 'mailyard_settings' );
delete_option( 'mailyard_connections' );
delete_option( 'mailyard_onboarded' );
delete_option( 'mailyard_log_table_version' );

wp_clear_scheduled_hook( 'mailyard_daily_cleanup' );
