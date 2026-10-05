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

	// Called by Override for every send attempt. Returns the new row id (0 when
	// logging is off).
	public function log( array $args ): int {
		if ( ! $this->is_enabled() ) {
			return 0;
		}
		return $this->insert( $this->build_row(
			$args['to'] ?? '',
			$args['subject'] ?? '',
			$args['body'] ?? '',
			$args['headers'] ?? '',
			sanitize_key( $args['provider'] ?? '' ),
			sanitize_key( $args['status'] ?? 'sent' ),
			$args['error'] ?? ''
		) );
	}

	// Settle a row written earlier (a Background "pending" entry) with the
	// send's outcome.
	public function update( int $id, array $args ): void {
		if ( ! $id ) {
			return;
		}
		global $wpdb;
		$wpdb->update( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			self::table(),
			array(
				'status'        => sanitize_key( $args['status'] ?? 'sent' ),
				'provider'      => sanitize_key( $args['provider'] ?? '' ),
				'error_message' => sanitize_text_field( (string) ( $args['error'] ?? '' ) ),
			),
			array( 'id' => $id )
		);
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

		if ( ! empty( $args['provider'] ) && 'all' !== $args['provider'] ) {
			$where[]  = 'provider = %s';
			$values[] = sanitize_key( $args['provider'] );
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
			? $wpdb->get_var( $wpdb->prepare( $count_sql, $values ) ) // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.DirectDatabaseQuery.DirectQuery,PluginCheck.Security.DirectDB.UnescapedDBParameter
			: $wpdb->get_var( $count_sql ) ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.DirectDatabaseQuery.DirectQuery,PluginCheck.Security.DirectDB.UnescapedDBParameter

		$rows_sql = "SELECT * FROM {$table} {$where_sql} ORDER BY created_at DESC LIMIT %d OFFSET %d";
		$rows     = $wpdb->get_results( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.DirectDatabaseQuery.DirectQuery,PluginCheck.Security.DirectDB.UnescapedDBParameter
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

	// Failed sends in the last N seconds (for alert wording).
	public function count_failed_since( int $seconds ): int {
		global $wpdb;
		$t = esc_sql( self::table() );
		return (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$t} WHERE status = 'failed' AND created_at >= DATE_SUB(NOW(), INTERVAL %d SECOND)", max( 1, $seconds ) ) ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.DirectDatabaseQuery.DirectQuery,PluginCheck.Security.DirectDB.UnescapedDBParameter
	}

	// The most common failure messages of the last N days: [{ error, count }].
	public function top_errors( int $days = 7, int $limit = 5 ): array {
		global $wpdb;
		$t    = esc_sql( self::table() );
		$rows = $wpdb->get_results( $wpdb->prepare( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.DirectDatabaseQuery.DirectQuery,PluginCheck.Security.DirectDB.UnescapedDBParameter
			"SELECT error_message AS error, COUNT(*) AS count FROM {$t} WHERE status = 'failed' AND error_message <> '' AND created_at >= DATE_SUB(NOW(), INTERVAL %d DAY) GROUP BY error_message ORDER BY count DESC LIMIT %d", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			max( 1, $days ),
			max( 1, $limit )
		), ARRAY_A );
		return array_map( static function ( $r ) {
			return array( 'error' => (string) $r['error'], 'count' => (int) $r['count'] );
		}, (array) $rows );
	}

	// Per-day sent/failed counts for the last N days (oldest first), gaps filled
	// with zeros. Powers the dashboard send-volume chart.
	public function daily_stats( int $days = 14 ): array {
		global $wpdb;
		$t    = esc_sql( self::table() );
		$days = max( 1, min( 90, $days ) );

		// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- {$t} is esc_sql'd above; no user input in the SQL.
		$rows = $wpdb->get_results( $wpdb->prepare( // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.DirectDatabaseQuery.DirectQuery
			"SELECT DATE(created_at) AS d,
			        SUM(status = 'sent')   AS sent,
			        SUM(status = 'failed') AS failed
			 FROM {$t}
			 WHERE created_at >= DATE_SUB( UTC_DATE(), INTERVAL %d DAY )
			 GROUP BY DATE(created_at)",
			$days - 1
		), ARRAY_A );
		// phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared

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

	/**
	 * The filtered log as CSV — newest first, at most $limit rows, without
	 * bodies or headers (those stay in the admin, one message at a time).
	 *
	 * @param array $args  Same filters as query().
	 * @param int   $limit Row cap.
	 */
	public function export_csv( array $args, int $limit = 10000 ): string {
		$out = fopen( 'php://temp', 'r+' ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fopen
		fputcsv( $out, array( 'id', 'date', 'to', 'subject', 'provider', 'status', 'error' ), ',', '"', '\\' );
		$pages = (int) ceil( $limit / 100 );
		for ( $page = 1; $page <= $pages; $page++ ) {
			$rows = $this->query( array_merge( $args, array( 'page' => $page, 'per_page' => 100 ) ) )['items'];
			foreach ( $rows as $r ) {
				// Leading = + - @ would run as a formula in a spreadsheet.
				$cells = array_map( static function ( $v ) {
					$v = (string) $v;
					return preg_match( '/^[=+\-@\t\r]/', $v ) ? "'" . $v : $v;
				}, array( $r['id'], $r['created_at'], $r['to'], $r['subject'], $r['provider'], $r['status'], $r['error'] ) );
				fputcsv( $out, $cells, ',', '"', '\\' );
			}
			if ( count( $rows ) < 100 ) {
				break;
			}
		}
		rewind( $out );
		$csv = (string) stream_get_contents( $out );
		fclose( $out ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fclose
		return $csv;
	}

	// Delete every log row. Returns how many there were.
	public function truncate(): int {
		global $wpdb;
		$table = esc_sql( self::table() );
		$count = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$table}" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.DirectDatabaseQuery.DirectQuery,PluginCheck.Security.DirectDB.UnescapedDBParameter
		$wpdb->query( "DELETE FROM {$table}" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.DirectDatabaseQuery.DirectQuery,PluginCheck.Security.DirectDB.UnescapedDBParameter
		return $count;
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
		$shaped = array(
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

		// Cc / Bcc / Reply-To as the message carried them.
		$parsed             = Message::parse_headers( (string) $row['headers'] );
		$shaped['cc']       = Message::addresses( $parsed['cc'] );
		$shaped['bcc']      = Message::addresses( $parsed['bcc'] );
		$shaped['reply_to'] = Message::addresses( $parsed['reply-to'] )[0] ?? '';

		// Human-readable guidance for failures (single source: Errors::humanize).
		if ( 'failed' === $row['status'] && '' !== (string) $row['error_message'] ) {
			$shaped['error_human'] = Errors::humanize( (string) $row['error_message'], (string) $row['provider'] );
		}

		return $shaped;
	}

	/**
	 * Fetch a single log row (shaped) by id, or null. Used by the resend action.
	 *
	 * @param int $id Log row id.
	 * @return array|null
	 */
	public function get( int $id ) {
		global $wpdb;
		$table = esc_sql( self::table() );
		$row   = $wpdb->get_row( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, PluginCheck.Security.DirectDB.UnescapedDBParameter
			$wpdb->prepare( "SELECT * FROM {$table} WHERE id = %d", $id ), // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			ARRAY_A
		);
		return $row ? $this->shape_row( $row ) : null;
	}

	private function insert( array $data ): int {
		global $wpdb;
		$wpdb->insert( self::table(), $data ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		return (int) $wpdb->insert_id;
	}
}
