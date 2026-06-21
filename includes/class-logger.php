<?php
namespace Mailyard;

defined( 'ABSPATH' ) || exit;

// Logs every email to a custom DB table.
class Logger {

	const TABLE_VERSION = '1.0';

	private static $instance = null;

	public static function instance(): self {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	public static function table(): string {
		global $wpdb;
		return $wpdb->prefix . Options::TABLE_LOGS;
	}

	// Create or upgrade the log table. Safe to call multiple times.
	public static function create_table() {
		global $wpdb;
		$table   = esc_sql( self::table() );
		$charset = $wpdb->get_charset_collate();

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		dbDelta( "CREATE TABLE {$table} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			to_email varchar(255) NOT NULL DEFAULT '',
			subject varchar(255) NOT NULL DEFAULT '',
			body longtext NOT NULL,
			headers text NOT NULL,
			provider varchar(50) NOT NULL DEFAULT '',
			status varchar(20) NOT NULL DEFAULT 'sent',
			error_message text NOT NULL,
			created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (id),
			KEY status (status),
			KEY created_at (created_at)
		) {$charset};" );

		update_option( Options::TABLE_VERSION, self::TABLE_VERSION );
	}

	// Hook into WP mail events for SMTP/PHPMailer providers.
	public function init() {
		if ( ! $this->is_enabled() ) {
			return;
		}
		add_action( 'wp_mail_succeeded', array( $this, 'on_success' ) );
		add_action( 'wp_mail_failed', array( $this, 'on_failure' ) );
	}

	// Called by Override for API providers that bypass wp_mail().
	public function log( array $args ) {
		if ( ! $this->is_enabled() ) {
			return;
		}
		$this->insert( $this->build_row(
			$args['to'] ?? '',
			$args['subject'] ?? '',
			$args['body'] ?? '',
			$args['headers'] ?? '',
			sanitize_key( $args['provider'] ?? '' ),
			sanitize_key( $args['status'] ?? 'sent' ),
			$args['error'] ?? ''
		) );
	}

	public function on_success( $data ) {
		// Override already logs each chain attempt; its SMTP sends fire this hook too.
		if ( Override::is_sending() ) {
			return;
		}
		$this->insert( $this->build_row(
			$data['to'] ?? '',
			$data['subject'] ?? '',
			$data['message'] ?? '',
			$data['headers'] ?? '',
			$this->active_provider(),
			'sent',
			''
		) );
	}

	public function on_failure( $error ) {
		// Override already logs each chain attempt; its SMTP sends fire this hook too.
		if ( Override::is_sending() ) {
			return;
		}
		$data = $error->get_error_data();
		$this->insert( $this->build_row(
			$data['to'] ?? '',
			$data['subject'] ?? '',
			$data['message'] ?? '',
			$data['headers'] ?? '',
			$this->active_provider(),
			'failed',
			$error->get_error_message()
		) );
	}

	// Query logs with filters and pagination.
	public function query( array $args = array() ): array {
		global $wpdb;
		$table    = esc_sql( self::table() );
		$page     = max( 1, absint( $args['page'] ?? 1 ) );
		$per_page = min( 100, max( 1, absint( $args['per_page'] ?? 20 ) ) );
		$offset   = ( $page - 1 ) * $per_page;
		$where    = array();
		$values   = array();

		if ( ! empty( $args['status'] ) && 'all' !== $args['status'] ) {
			$where[]  = 'status = %s';
			$values[] = sanitize_key( $args['status'] );
		}

		if ( ! empty( $args['search'] ) ) {
			$like     = '%' . $wpdb->esc_like( sanitize_text_field( $args['search'] ) ) . '%';
			$where[]  = '(to_email LIKE %s OR subject LIKE %s)';
			$values[] = $like;
			$values[] = $like;
		}

		$where_sql = $where ? 'WHERE ' . implode( ' AND ', $where ) : '';

		// Table name comes from self::table() = $wpdb->prefix . hardcoded suffix.
		// $where_sql is composed of static strings and %s placeholders only.
		// Values are bound via $wpdb->prepare. Safe to interpolate.
		$count_sql = "SELECT COUNT(*) FROM {$table} {$where_sql}";
		$total     = (int) ( $values
			? $wpdb->get_var( $wpdb->prepare( $count_sql, $values ) ) // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.DirectDatabaseQuery.DirectQuery
			: $wpdb->get_var( $count_sql ) ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.DirectDatabaseQuery.DirectQuery

		$rows_sql = "SELECT * FROM {$table} {$where_sql} ORDER BY created_at DESC LIMIT %d OFFSET %d";
		$rows     = $wpdb->get_results( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.DirectDatabaseQuery.DirectQuery
			$wpdb->prepare( $rows_sql, array_merge( $values, array( $per_page, $offset ) ) ), // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			ARRAY_A
		);

		return array(
			'items' => array_map( array( $this, 'shape_row' ), $rows ?: array() ),
			'total' => $total,
		);
	}

	// Dashboard stats.
	public function stats(): array {
		global $wpdb;
		$t = esc_sql( self::table() );

		// Table name from self::table(); no user input in the SQL.
		$sent_7d   = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$t} WHERE status = 'sent'   AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.DirectDatabaseQuery.DirectQuery
		$failed_7d = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$t} WHERE status = 'failed' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.DirectDatabaseQuery.DirectQuery

		return array(
			'sent_7d'   => $sent_7d,
			'failed_7d' => $failed_7d,
		);
	}

	// Per-day sent/failed counts for the last N days (oldest first), gaps filled
	// with zeros. Powers the dashboard send-volume chart.
	public function daily_stats( int $days = 14 ): array {
		global $wpdb;
		$t    = esc_sql( self::table() );
		$days = max( 1, min( 90, $days ) );

		$rows = $wpdb->get_results( $wpdb->prepare( // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.DirectDatabaseQuery.DirectQuery
			"SELECT DATE(created_at) AS d,
			        SUM(status = 'sent')   AS sent,
			        SUM(status = 'failed') AS failed
			 FROM {$t}
			 WHERE created_at >= DATE_SUB( UTC_DATE(), INTERVAL %d DAY )
			 GROUP BY DATE(created_at)",
			$days - 1
		), ARRAY_A );

		$map = array();
		foreach ( (array) $rows as $r ) {
			$map[ $r['d'] ] = array( 'sent' => (int) $r['sent'], 'failed' => (int) $r['failed'] );
		}

		$out = array();
		for ( $i = $days - 1; $i >= 0; $i-- ) {
			$date  = gmdate( 'Y-m-d', time() - $i * DAY_IN_SECONDS );
			$out[] = array(
				'date'   => $date,
				'sent'   => $map[ $date ]['sent'] ?? 0,
				'failed' => $map[ $date ]['failed'] ?? 0,
			);
		}
		return $out;
	}

	// Delete logs older than N days.
	public function cleanup( int $days = 30 ): int {
		global $wpdb;
		$table = esc_sql( self::table() );
		$sql   = "DELETE FROM {$table} WHERE created_at < DATE_SUB(NOW(), INTERVAL %d DAY)";
		return (int) $wpdb->query( $wpdb->prepare( $sql, $days ) ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.DirectDatabaseQuery.DirectQuery
	}

	private function is_enabled(): bool {
		$settings = Options::settings();
		return ! isset( $settings['logging'] ) || $settings['logging'];
	}

	private function active_provider(): string {
		$settings = Options::settings();
		return sanitize_key( $settings['active'] ?? Options::DEFAULT_PROVIDER );
	}

	private function build_row( $to, $subject, $body, $headers, string $provider, string $status, string $error ): array {
		return array(
			'to_email'      => sanitize_text_field( is_array( $to ) ? implode( ', ', $to ) : (string) $to ),
			'subject'       => sanitize_text_field( (string) $subject ),
			'body'          => (string) $body,
			'headers'       => sanitize_textarea_field( is_array( $headers ) ? implode( "\n", $headers ) : (string) $headers ),
			'provider'      => $provider,
			'status'        => $status,
			'error_message' => sanitize_text_field( $error ),
		);
	}

	private function shape_row( array $row ): array {
		return array(
			'id'         => (int) $row['id'],
			'to'         => $row['to_email'],
			'subject'    => $row['subject'],
			'body'       => $row['body'],
			'headers'    => $row['headers'],
			'provider'   => $row['provider'],
			'status'     => $row['status'],
			'error'      => $row['error_message'],
			'time'       => human_time_diff( strtotime( $row['created_at'] ), current_time( 'U' ) ) . ' ago',
			'created_at' => $row['created_at'],
		);
	}

	private function insert( array $data ) {
		global $wpdb;
		$wpdb->insert( self::table(), $data ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
	}
}
