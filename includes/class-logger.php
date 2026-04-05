<?php
namespace MoolMail;

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
		return $wpdb->prefix . 'moolmail_logs';
	}

	// Create or upgrade the log table. Safe to call multiple times.
	public static function create_table() {
		global $wpdb;
		$table   = self::table();
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

		update_option( 'moolmail_log_table_version', self::TABLE_VERSION );
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

		$to      = is_array( $args['to'] ?? '' ) ? implode( ', ', $args['to'] ) : ( $args['to'] ?? '' );
		$headers = is_array( $args['headers'] ?? '' ) ? implode( "\n", $args['headers'] ) : ( $args['headers'] ?? '' );

		$this->insert( array(
			'to_email'      => sanitize_text_field( $to ),
			'subject'       => sanitize_text_field( $args['subject'] ?? '' ),
			'body'          => $args['body'] ?? '',
			'headers'       => sanitize_textarea_field( $headers ),
			'provider'      => sanitize_key( $args['provider'] ?? '' ),
			'status'        => sanitize_key( $args['status'] ?? 'sent' ),
			'error_message' => sanitize_text_field( $args['error'] ?? '' ),
		) );
	}

	public function on_success( $data ) {
		$settings = get_option( 'moolmail_settings', array() );
		$to       = is_array( $data['to'] ) ? implode( ', ', $data['to'] ) : $data['to'];
		$headers  = is_array( $data['headers'] ?? '' ) ? implode( "\n", $data['headers'] ) : ( $data['headers'] ?? '' );

		$this->insert( array(
			'to_email'      => sanitize_text_field( $to ),
			'subject'       => sanitize_text_field( $data['subject'] ?? '' ),
			'body'          => $data['message'] ?? '',
			'headers'       => sanitize_textarea_field( $headers ),
			'provider'      => sanitize_key( $settings['active'] ?? 'phpmailer' ),
			'status'        => 'sent',
			'error_message' => '',
		) );
	}

	public function on_failure( $error ) {
		$data     = $error->get_error_data();
		$settings = get_option( 'moolmail_settings', array() );
		$to       = is_array( $data['to'] ?? '' ) ? implode( ', ', $data['to'] ) : ( $data['to'] ?? '' );
		$headers  = is_array( $data['headers'] ?? '' ) ? implode( "\n", $data['headers'] ) : ( $data['headers'] ?? '' );

		$this->insert( array(
			'to_email'      => sanitize_text_field( $to ),
			'subject'       => sanitize_text_field( $data['subject'] ?? '' ),
			'body'          => $data['message'] ?? '',
			'headers'       => sanitize_textarea_field( $headers ),
			'provider'      => sanitize_key( $settings['active'] ?? 'phpmailer' ),
			'status'        => 'failed',
			'error_message' => sanitize_text_field( $error->get_error_message() ),
		) );
	}

	// Query logs with filters and pagination.
	public function query( array $args = array() ): array {
		global $wpdb;
		$table    = self::table();
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

		// Total.
		$count_sql = "SELECT COUNT(*) FROM {$table} {$where_sql}";
		$total     = (int) ( $values
			? $wpdb->get_var( $wpdb->prepare( $count_sql, $values ) ) // phpcs:ignore
			: $wpdb->get_var( $count_sql ) ); // phpcs:ignore

		// Rows.
		$rows = $wpdb->get_results( // phpcs:ignore
			$wpdb->prepare(
				"SELECT * FROM {$table} {$where_sql} ORDER BY created_at DESC LIMIT %d OFFSET %d",
				array_merge( $values, array( $per_page, $offset ) )
			),
			ARRAY_A
		);

		$items = array();
		foreach ( ( $rows ?: array() ) as $row ) {
			$items[] = array(
				'id'         => (int) $row['id'],
				'to'         => $row['to_email'],
				'subject'    => $row['subject'],
				'body'       => $row['body'],
				'headers'    => $row['headers'],
				'provider'   => $row['provider'],
				'status'     => $row['status'],
				'error'      => $row['error_message'],
				'time'       => human_time_diff( strtotime( $row['created_at'] ), current_time( 'timestamp' ) ) . ' ago', // phpcs:ignore
				'created_at' => $row['created_at'],
			);
		}

		return array( 'items' => $items, 'total' => $total );
	}

	// Dashboard stats.
	public function stats(): array {
		global $wpdb;
		$t = self::table();

		$total  = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$t}" ); // phpcs:ignore
		$sent   = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$t} WHERE status = 'sent'" ); // phpcs:ignore
		$failed = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$t} WHERE status = 'failed'" ); // phpcs:ignore

		// 14-day chart.
		$chart_rows = $wpdb->get_results( // phpcs:ignore
			"SELECT DATE(created_at) as day, COUNT(*) as cnt FROM {$t}
			 WHERE created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY) AND status = 'sent'
			 GROUP BY DATE(created_at) ORDER BY day ASC", ARRAY_A
		);
		$day_map = array();
		foreach ( ( $chart_rows ?: array() ) as $row ) {
			$day_map[ $row['day'] ] = (int) $row['cnt'];
		}
		$chart = array();
		for ( $i = 13; $i >= 0; $i-- ) {
			$chart[] = $day_map[ gmdate( 'Y-m-d', strtotime( "-{$i} days" ) ) ] ?? 0;
		}

		$recent = $this->query( array( 'page' => 1, 'per_page' => 5 ) );

		return array(
			'sent'          => $sent,
			'failed'        => $failed,
			'total'         => $total,
			'delivery_rate' => $total > 0 ? round( ( $sent / $total ) * 100 ) . '%' : '0%',
			'chart_data'    => $chart,
			'recent_logs'   => $recent['items'],
		);
	}

	// Delete logs older than N days.
	public function cleanup( int $days = 30 ): int {
		global $wpdb;
		return (int) $wpdb->query( $wpdb->prepare( // phpcs:ignore
			"DELETE FROM " . self::table() . " WHERE created_at < DATE_SUB(NOW(), INTERVAL %d DAY)", $days
		) );
	}

	private function is_enabled(): bool {
		$settings = get_option( 'moolmail_settings', array() );
		return ! isset( $settings['logging'] ) || $settings['logging'];
	}

	private function insert( array $data ) {
		global $wpdb;
		$wpdb->insert( self::table(), $data ); // phpcs:ignore
	}
}
