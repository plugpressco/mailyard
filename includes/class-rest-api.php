<?php
namespace Mailyard;

defined( 'ABSPATH' ) || exit;

class REST_API {

	public function init() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	public function register_routes() {
		$ns = Options::REST_NS;

		$this->route( $ns, '/settings', array(
			'GET'  => 'get_settings',
			'POST' => 'save_settings',
		) );

		$this->route( $ns, '/connections', array(
			'GET'  => 'get_connections',
			'POST' => 'create_connection',
		) );

		$this->route( $ns, '/connections/reorder', array(
			'PUT' => 'reorder_connections',
		) );

		$this->route( $ns, '/connections/(?P<id>[\w-]+)', array(
			'PUT'    => 'update_connection',
			'DELETE' => 'delete_connection',
		) );

		$this->route( $ns, '/connections/(?P<id>[\w-]+)/test', array(
			'POST' => 'test_connection',
		) );

		$this->route( $ns, '/dashboard',           array( 'GET'  => 'get_dashboard' ) );
		$this->route( $ns, '/test-email',          array( 'POST' => 'send_test' ) );
		$this->route( $ns, '/logs',                array( 'GET'  => 'get_logs' ) );
		$this->route( $ns, '/logs/(?P<id>\d+)/resend', array( 'POST' => 'resend_log' ) );
		$this->route( $ns, '/deliverability',      array( 'GET'  => 'get_deliverability' ) );
		$this->route( $ns, '/diagnostics',         array( 'GET'  => 'get_diagnostics' ) );
		$this->route( $ns, '/data/erase-all',      array( 'POST' => 'erase_all_data' ) );

		// Connect AI: the ability catalog + per-tool permissions.
		$this->route( $ns, '/ai', array(
			'GET'  => 'get_ai',
			'POST' => 'save_ai',
		) );
	}

	/**
	 * Connect AI status: whether the platform supports abilities, whether an
	 * MCP bridge is present, the endpoint to paste into a client, and the tool
	 * catalog with each tool's current permission.
	 */
	public function get_ai() {
		$route = $this->mcp_route();

		return rest_ensure_response( array(
			'enabled'       => Abilities::is_enabled(),
			'abilitiesApi'  => function_exists( 'wp_register_ability' ),
			'adapterActive' => '' !== $route,
			'endpoint'      => rest_url( $route ? $route : 'mcp/mcp-adapter-default-server' ),
			'siteUrl'       => home_url(),
			'abilities'     => Abilities::catalog(),
		) );
	}

	/**
	 * Save the master switch and/or the per-tool permission map. Incoming keys
	 * are whitelisted against the catalog — an unknown ability can't be stored.
	 */
	public function save_ai( $request ) {
		$input = (array) $request->get_json_params();

		if ( array_key_exists( 'enabled', $input ) ) {
			update_option( Abilities::OPTION, ! empty( $input['enabled'] ) ? '1' : '0' );
		}

		if ( isset( $input['abilities'] ) && is_array( $input['abilities'] ) ) {
			$incoming = $input['abilities'];
			$map      = array();
			foreach ( Abilities::catalog() as $ability ) {
				$map[ $ability['name'] ] = ! empty( $incoming[ $ability['name'] ] ) ? '1' : '0';
			}
			update_option( Abilities::ABILITIES_OPTION, $map );
		}

		return $this->get_ai();
	}

	/**
	 * Find an MCP server route exposed by a bridge plugin (the WordPress MCP
	 * Adapter, Saddle, or the legacy wordpress-mcp). Empty string when none is
	 * active — Mailyard ships no MCP transport of its own.
	 */
	private function mcp_route(): string {
		/**
		 * Let an MCP bridge declare its own REST route instead of being sniffed.
		 *
		 * @param string $route Route relative to the REST root, e.g. 'saddle/v1/mcp'. Empty to fall through to detection.
		 */
		$declared = apply_filters( 'mailyard_mcp_route', '' );
		if ( is_string( $declared ) && '' !== $declared ) {
			return ltrim( $declared, '/' );
		}

		foreach ( array_keys( rest_get_server()->get_routes() ) as $route ) {
			$route = ltrim( (string) $route, '/' );
			if (
				preg_match( '#^mcp/[a-z0-9_-]*server#i', $route )
				|| 'saddle/v1/mcp' === $route
				|| false !== strpos( $route, 'wpmcp/streamable' )
			) {
				return $route;
			}
		}
		return '';
	}

	// Register one or more methods on a route with the admin permission check.
	private function route( string $ns, string $path, array $methods ) {
		$endpoints = array();
		foreach ( $methods as $method => $callback ) {
			$endpoints[] = array(
				'methods'             => $method,
				'callback'            => array( $this, $callback ),
				'permission_callback' => array( $this, 'is_admin' ),
			);
		}
		register_rest_route( $ns, $path, $endpoints );
	}

	public function is_admin(): bool {
		return current_user_can( 'manage_options' );
	}

	public function get_settings() {
		return rest_ensure_response( get_option( Options::SETTINGS, array() ) );
	}

	public function save_settings( $request ) {
		$input    = $request->get_json_params();
		$settings = get_option( Options::SETTINGS, array() );

		// Credentials are NOT stored here — they live on each connection's
		// 'config' field under mailyard_connections (non-autoloaded).
		$keys = array( 'active', 'from_name', 'from_email', 'logging' );

		foreach ( $keys as $key ) {
			if ( isset( $input[ $key ] ) ) {
				$settings[ $key ] = $this->sanitize_setting( $key, $input[ $key ] );
			}
		}

		if ( isset( $settings['active'] ) && ! in_array( $settings['active'], Options::providers_with_default(), true ) ) {
			$settings['active'] = Options::DEFAULT_PROVIDER;
		}

		update_option( Options::SETTINGS, $settings );
		return rest_ensure_response( $settings );
	}

	public function get_connections() {
		return rest_ensure_response( $this->connections() );
	}

	public function create_connection( $request ) {
		$input    = $request->get_json_params();
		$provider = sanitize_key( $input['provider'] ?? '' );

		if ( ! in_array( $provider, Options::providers(), true ) ) {
			return new \WP_Error( 'invalid_provider', __( 'Unknown provider.', 'mailyard' ), array( 'status' => 400 ) );
		}

		$conns = $this->connections();
		$new   = array(
			'id'               => wp_generate_uuid4(),
			'provider'         => $provider,
			'name'             => sanitize_text_field( $input['name'] ?? '' ),
			'from_email'       => sanitize_email( $input['from_email'] ?? '' ),
			'from_name'        => sanitize_text_field( $input['from_name'] ?? '' ),
			'config'           => $this->sanitize_config( $input['config'] ?? array() ),
			'from_match'       => $this->sanitize_from_match( $input['from_match'] ?? array() ),
			'purpose'          => $this->sanitize_purpose( $input['purpose'] ?? 'any' ),
			'enabled'          => (bool) ( $input['enabled'] ?? false ),
			'priority'         => count( $conns ),
			'last_test_at'     => 0,
			'last_test_status' => '',
			'last_test_error'  => '',
		);

		$conns[] = $new;
		$this->save_connections( $conns );
		if ( $new['enabled'] ) {
			$this->sync_active( $conns );
		}

		return rest_ensure_response( $new );
	}

	public function update_connection( $request ) {
		$id    = sanitize_text_field( $request->get_param( 'id' ) );
		$input = $request->get_json_params();
		$conns = $this->connections();
		$found = null;

		foreach ( $conns as &$c ) {
			if ( $c['id'] !== $id ) {
				continue;
			}
			if ( isset( $input['enabled'] ) ) {
				$c['enabled'] = (bool) $input['enabled'];
			}
			if ( isset( $input['name'] ) ) {
				$c['name'] = sanitize_text_field( $input['name'] );
			}
			if ( isset( $input['from_email'] ) ) {
				$c['from_email'] = sanitize_email( $input['from_email'] );
			}
			if ( isset( $input['from_name'] ) ) {
				$c['from_name'] = sanitize_text_field( $input['from_name'] );
			}
			if ( isset( $input['config'] ) ) {
				$c['config'] = $this->sanitize_config( $input['config'] );
			}
			if ( isset( $input['from_match'] ) ) {
				$c['from_match'] = $this->sanitize_from_match( $input['from_match'] );
			}
			if ( isset( $input['purpose'] ) ) {
				$c['purpose'] = $this->sanitize_purpose( $input['purpose'] );
			}
			$found = $c;
			break;
		}
		unset( $c );

		if ( ! $found ) {
			return new \WP_Error( 'not_found', __( 'Connection not found.', 'mailyard' ), array( 'status' => 404 ) );
		}

		$this->save_connections( $conns );
		$this->sync_active( $conns );
		return rest_ensure_response( $found );
	}

	public function delete_connection( $request ) {
		$id    = sanitize_text_field( $request->get_param( 'id' ) );
		$conns = array_values( array_filter(
			$this->connections(),
			function ( $c ) use ( $id ) { return $c['id'] !== $id; }
		) );
		$this->save_connections( $conns );
		$this->sync_active( $conns );
		return rest_ensure_response( array( 'deleted' => true ) );
	}

	public function reorder_connections( $request ) {
		$ids = array_map( 'sanitize_text_field', $request->get_json_params()['ids'] ?? array() );
		$map = array();
		foreach ( $this->connections() as $c ) {
			$map[ $c['id'] ] = $c;
		}

		$reordered = array();
		foreach ( $ids as $i => $id ) {
			if ( isset( $map[ $id ] ) ) {
				$map[ $id ]['priority'] = $i;
				$reordered[]            = $map[ $id ];
			}
		}

		$this->save_connections( $reordered );
		$this->sync_active( $reordered );
		return rest_ensure_response( $reordered );
	}

	// Send a test through ONE specific connection, bypassing the failover chain.
	// Stores the result on the connection record so the Dashboard can show a badge.
	public function test_connection( $request ) {
		$id    = sanitize_text_field( $request->get_param( 'id' ) );
		$input = $request->get_json_params();
		$to    = sanitize_email( $input['to'] ?? wp_get_current_user()->user_email );

		if ( ! is_email( $to ) ) {
			return new \WP_Error( 'invalid_recipient', __( 'Invalid email address.', 'mailyard' ), array( 'status' => 400 ) );
		}

		$conns = $this->connections();
		$conn  = null;
		foreach ( $conns as $c ) {
			if ( $c['id'] === $id ) {
				$conn = $c;
				break;
			}
		}
		if ( ! $conn ) {
			return new \WP_Error( 'not_found', __( 'Connection not found.', 'mailyard' ), array( 'status' => 404 ) );
		}

		$esp = Manager::instance()->get( $conn['provider'] );
		if ( ! $esp || ! $esp->connect( $conn['config'] ?? array() ) ) {
			$this->record_test_result( $id, 'failed', __( 'Connection could not be initialized — check credentials.', 'mailyard' ) );
			return rest_ensure_response( array( 'success' => false, 'message' => __( 'Connection could not be initialized.', 'mailyard' ) ) );
		}

		$body   = $this->default_test_body( $to );
		$result = $esp->send( array(
			'to'         => $to,
			'subject'    => __( 'Mailyard — Connection Test', 'mailyard' ),
			'html'       => $body,
			'text'       => '',
			'from_name'  => $conn['from_name'] ?? '',
			'from_email' => $conn['from_email'] ?? get_option( 'admin_email' ),
			'reply_to'   => '',
			'cc'         => array(),
			'bcc'        => array(),
			'attachments' => array(),
		) );

		if ( $result->is_success() ) {
			$this->record_test_result( $id, 'sent', '' );
			return rest_ensure_response( array(
				'success' => true,
				/* translators: %s: recipient email address. */
				'message' => sprintf( __( 'Test email sent to %s', 'mailyard' ), $to ),
			) );
		}

		$error = $result->get_error();
		$this->record_test_result( $id, 'failed', $error );
		return rest_ensure_response( array( 'success' => false, 'message' => $error ) );
	}

	public function get_dashboard() {
		$logger = Logger::instance();
		$stats  = $logger->stats();
		$chain  = Manager::instance()->enabled_connections();

		$chain_view = array_map( function ( $link ) {
			$c = $link['conn'];
			return array(
				'id'               => $c['id'],
				'name'             => $c['name'],
				'provider'         => $c['provider'],
				'from_email'       => $c['from_email'] ?? '',
				'last_test_at'     => (int) ( $c['last_test_at'] ?? 0 ),
				'last_test_status' => (string) ( $c['last_test_status'] ?? '' ),
				'last_test_error'  => (string) ( $c['last_test_error'] ?? '' ),
			);
		}, $chain );

		// Recent activity — last 7 logged emails.
		$recent = $logger->query( array( 'page' => 1, 'per_page' => 7 ) );

		return rest_ensure_response( array(
			'sent_7d'      => $stats['sent_7d'] ?? 0,
			'failed_7d'    => $stats['failed_7d'] ?? 0,
			'chain'        => $chain_view,
			'health'       => $this->compute_health( $chain_view, $stats['failed_7d'] ?? 0 ),
			'series'       => $logger->daily_stats( 14 ),
			'recent'       => $recent['items'] ?? array(),
		) );
	}

	// 'healthy' | 'warning' | 'down' — drives the Dashboard status banner.
	private function compute_health( array $chain, int $failed_7d ): string {
		if ( empty( $chain ) ) {
			return 'down';
		}
		foreach ( $chain as $c ) {
			if ( 'failed' === $c['last_test_status'] ) {
				return 'warning';
			}
		}
		if ( $failed_7d > 0 ) {
			return 'warning';
		}
		return 'healthy';
	}

	public function send_test( $request ) {
		$input  = $request->get_json_params();
		$to     = sanitize_email( $input['to'] ?? '' );
		$format = sanitize_key( $input['format'] ?? 'html' );

		if ( empty( $to ) ) {
			$to = wp_get_current_user()->user_email;
		}

		if ( ! is_email( $to ) ) {
			return rest_ensure_response( array( 'success' => false, 'message' => __( 'Invalid email address.', 'mailyard' ) ) );
		}

		$subject = ! empty( $input['subject'] )
			? sanitize_text_field( $input['subject'] )
			: __( 'Mailyard — Test Email', 'mailyard' );

		$body = ! empty( $input['body'] )
			? ( 'plain' === $format ? sanitize_textarea_field( $input['body'] ) : wp_kses_post( $input['body'] ) )
			: $this->default_test_body( $to );

		$content_type = 'plain' === $format ? 'text/plain' : 'text/html';
		$result       = wp_mail( $to, $subject, $body, array( "Content-Type: $content_type; charset=UTF-8" ) );

		if ( $result ) {
			return rest_ensure_response( array(
				'success' => true,
				/* translators: %s: recipient email address. */
				'message' => sprintf( __( 'Test email sent to %s', 'mailyard' ), $to ),
			) );
		}

		global $phpmailer;
		$error = isset( $phpmailer->ErrorInfo ) ? sanitize_text_field( $phpmailer->ErrorInfo ) : '';
		return rest_ensure_response( array(
			'success' => false,
			'message' => $error ?: __( 'Failed to send.', 'mailyard' ),
		) );
	}

	private function default_test_body( string $to ): string {
		return '<div style="font-family:-apple-system,sans-serif;max-width:500px;margin:40px auto;padding:32px;background:#ffffff;border:1px solid #E6E6EE;border-radius:12px">'
			. '<div style="display:inline-block;height:8px;width:8px;border-radius:50%;background:#7C6FB8;margin-right:8px;vertical-align:middle"></div>'
			. '<span style="font-size:13px;font-weight:600;color:#7C6FB8;letter-spacing:0.02em;text-transform:uppercase">Mailyard</span>'
			. '<h2 style="margin:18px 0 8px;font-size:20px;color:#131318">Your email is working.</h2>'
			. '<p style="margin:0 0 16px;font-size:14px;color:#6E6E80;line-height:1.6">This confirms Mailyard is delivering email correctly.</p>'
			. '<p style="margin:0;font-size:12px;color:#A0A0B0">Sent to ' . esc_html( $to ) . '</p></div>';
	}

	public function get_deliverability( $request ) {
		$refresh = (bool) $request->get_param( 'refresh' );
		return rest_ensure_response( array(
			'domains'    => Deliverability::scan_all( $refresh ),
			'checked_at' => time(),
		) );
	}

	// Surface plugin runtime state to debug delivery issues.
	public function get_diagnostics() {
		global $wpdb;
		$table = esc_sql( Logger::table() );

		$table_exists = (bool) $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $table ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$row_count    = $table_exists ? (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$table}" ) : 0; // phpcs:ignore WordPress.DB

		$settings = get_option( Options::SETTINGS, array() );
		$conns    = get_option( Options::CONNECTIONS, array() );
		$chain    = Manager::instance()->enabled_connections();

		$last_rows = $table_exists
			? $wpdb->get_results( "SELECT id, to_email, provider, status, error_message, created_at FROM {$table} ORDER BY id DESC LIMIT 5", ARRAY_A ) // phpcs:ignore WordPress.DB
			: array();

		return rest_ensure_response( array(
			'table'              => $table,
			'table_exists'       => $table_exists,
			'table_version_opt'  => get_option( Options::TABLE_VERSION ),
			'table_version_code' => Logger::TABLE_VERSION,
			'row_count'          => $row_count,
			'logging_enabled'    => ! isset( $settings['logging'] ) || $settings['logging'],
			'active_setting'     => $settings['active'] ?? null,
			'connections_total'  => count( $conns ),
			'chain_length'       => count( $chain ),
			'chain_slugs'        => array_map( function ( $l ) { return $l['slug']; }, $chain ),
			'last_5_rows'        => $last_rows,
			'wp_mail_filtered'   => has_filter( 'pre_wp_mail' ) ? 'yes' : 'no',
			'wp_mail_succeeded_hooked' => has_action( 'wp_mail_succeeded' ) ? 'yes' : 'no',
			// Bounce/complaint webhook URLs to paste into each provider's dashboard
			// (Bounce + Spam-Complaint events). Token-gated; SMTP has no feedback.
			'webhook_urls'       => array(
				'postmark' => Options::webhook_url( 'postmark' ),
				'ses'      => Options::webhook_url( 'ses' ),
				'resend'   => Options::webhook_url( 'resend' ),
				'brevo'    => Options::webhook_url( 'brevo' ),
			),
		) );
	}

	// Danger Zone: irreversibly erase ALL Mailyard data. Requires the body to
	// carry confirm === 'DELETE' so this can never fire on an accidental POST.
	public function erase_all_data( $request ) {
		$confirm = $request->get_json_params()['confirm'] ?? '';

		if ( 'DELETE' !== $confirm ) {
			return new \WP_Error(
				'confirmation_required',
				__( 'Confirmation required. Type DELETE to erase all data.', 'mailyard' ),
				array( 'status' => 400 )
			);
		}

		Data_Deleter::delete_all_data();

		return rest_ensure_response( array( 'success' => true ) );
	}

	public function get_logs( $request ) {
		return rest_ensure_response( Logger::instance()->query( array(
			'status'   => sanitize_key( $request->get_param( 'status' ) ?? 'all' ),
			'search'   => sanitize_text_field( $request->get_param( 'search' ) ?? '' ),
			'page'     => absint( $request->get_param( 'page' ) ?? 1 ),
			'per_page' => absint( $request->get_param( 'per_page' ) ?? 20 ),
		) ) );
	}

	/**
	 * Re-send a previously-failed (or any) logged email. Replays the stored
	 * message through wp_mail(), which routes back through the current failover
	 * chain and logs a fresh attempt. Returns whether the resend succeeded.
	 */
	public function resend_log( $request ) {
		$id  = (int) $request->get_param( 'id' );
		$row = Logger::instance()->get( $id );

		if ( ! $row ) {
			return new \WP_Error( 'not_found', __( 'That log entry no longer exists.', 'mailyard' ), array( 'status' => 404 ) );
		}

		$to      = array_filter( array_map( 'trim', explode( ',', (string) $row['to'] ) ) );
		$headers = '' !== (string) $row['headers']
			? array_filter( array_map( 'trim', preg_split( '/\r\n|\r|\n/', (string) $row['headers'] ) ) )
			: array();

		$ok = wp_mail( $to, (string) $row['subject'], (string) $row['body'], $headers );

		return rest_ensure_response( array(
			'ok'     => (bool) $ok,
			'status' => $ok ? 'sent' : 'failed',
		) );
	}

	private function connections(): array {
		return get_option( Options::CONNECTIONS, array() );
	}

	// Connections hold provider credentials in each conn['config'] — keep this
	// option out of the autoload set so credentials aren't loaded on every page.
	private function save_connections( array $conns ) {
		$existing = get_option( Options::CONNECTIONS, null );
		if ( null === $existing ) {
			add_option( Options::CONNECTIONS, $conns, '', false );
		} else {
			update_option( Options::CONNECTIONS, $conns );
		}
	}

	private function record_test_result( string $id, string $status, string $error ): void {
		$conns = $this->connections();
		foreach ( $conns as &$c ) {
			if ( $c['id'] === $id ) {
				$c['last_test_at']     = time();
				$c['last_test_status'] = $status;
				$c['last_test_error']  = $error;
				break;
			}
		}
		unset( $c );
		$this->save_connections( $conns );
	}

	private function sync_active( array $conns ) {
		$settings = get_option( Options::SETTINGS, array() );

		$primary = null;
		foreach ( $conns as $c ) {
			if ( ! empty( $c['enabled'] ) ) {
				$primary = $c;
				break;
			}
		}

		if ( ! $primary ) {
			$settings['active'] = Options::DEFAULT_PROVIDER;
			update_option( Options::SETTINGS, $settings );
			return;
		}

		$settings['active'] = sanitize_key( $primary['provider'] );
		if ( ! empty( $primary['from_email'] ) ) {
			$settings['from_email'] = sanitize_email( $primary['from_email'] );
		}
		if ( ! empty( $primary['from_name'] ) ) {
			$settings['from_name'] = sanitize_text_field( $primary['from_name'] );
		}

		update_option( Options::SETTINGS, $settings );
	}

	private function sanitize_config( $config ): array {
		if ( ! is_array( $config ) ) {
			return array();
		}
		$clean = array();
		foreach ( $config as $k => $v ) {
			$k           = sanitize_key( $k );
			$clean[ $k ] = is_array( $v ) ? $this->sanitize_config( $v ) : sanitize_text_field( (string) $v );
		}
		return $clean;
	}

	// Sender-routing patterns: exact addresses, bare domains, or '*'. Lowercased,
	// de-duplicated, invalid entries dropped. Empty result = catch-all.
	private function sanitize_from_match( $items ): array {
		if ( ! is_array( $items ) ) {
			return array();
		}
		$clean = array();
		foreach ( $items as $item ) {
			$item = strtolower( trim( sanitize_text_field( (string) $item ) ) );
			if ( '' === $item ) {
				continue;
			}
			if ( '*' === $item || is_email( $item ) || preg_match( '/^([a-z0-9-]+\.)+[a-z]{2,}$/', $item ) ) {
				$clean[] = $item;
			}
		}
		return array_values( array_unique( $clean ) );
	}

	// Routing purpose — whitelist with a safe default.
	private function sanitize_purpose( $value ): string {
		$value = sanitize_key( (string) $value );
		return in_array( $value, array( 'any', 'transactional', 'marketing' ), true ) ? $value : 'any';
	}

	private function sanitize_setting( string $key, $value ) {
		switch ( $key ) {
			case 'active':
				return sanitize_key( $value );
			case 'from_email':
				return sanitize_email( $value );
			case 'from_name':
				return sanitize_text_field( $value );
			case 'logging':
				return (bool) $value;
			default:
				return sanitize_text_field( (string) $value );
		}
	}
}
