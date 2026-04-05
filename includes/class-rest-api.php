<?php
namespace MoolMail;

defined( 'ABSPATH' ) || exit;

class REST_API {

	const NS = 'moolmail/v1';

	private static $valid_providers = array( 'ses', 'postmark', 'resend', 'smtp', 'php', 'brevo', 'mailgun', 'sendgrid' );

	public function init() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	public function register_routes() {
		$admin = array( 'permission_callback' => array( $this, 'is_admin' ) );

		register_rest_route( self::NS, '/settings', array(
			array_merge( $admin, array( 'methods' => 'GET',  'callback' => array( $this, 'get_settings' ) ) ),
			array_merge( $admin, array( 'methods' => 'POST', 'callback' => array( $this, 'save_settings' ) ) ),
		) );

		register_rest_route( self::NS, '/connections', array(
			array_merge( $admin, array( 'methods' => 'GET',  'callback' => array( $this, 'get_connections' ) ) ),
			array_merge( $admin, array( 'methods' => 'POST', 'callback' => array( $this, 'create_connection' ) ) ),
		) );

		register_rest_route( self::NS, '/connections/reorder', array_merge( $admin, array( 'methods' => 'PUT', 'callback' => array( $this, 'reorder_connections' ) ) ) );

		register_rest_route( self::NS, '/connections/(?P<id>[\w-]+)', array(
			array_merge( $admin, array( 'methods' => 'PUT',    'callback' => array( $this, 'update_connection' ) ) ),
			array_merge( $admin, array( 'methods' => 'DELETE', 'callback' => array( $this, 'delete_connection' ) ) ),
		) );

		register_rest_route( self::NS, '/dashboard',           array_merge( $admin, array( 'methods' => 'GET',  'callback' => array( $this, 'get_dashboard' ) ) ) );
		register_rest_route( self::NS, '/test-email',          array_merge( $admin, array( 'methods' => 'POST', 'callback' => array( $this, 'send_test' ) ) ) );
		register_rest_route( self::NS, '/onboarding/complete', array_merge( $admin, array( 'methods' => 'POST', 'callback' => array( $this, 'complete_onboarding' ) ) ) );
		register_rest_route( self::NS, '/logs',                array_merge( $admin, array( 'methods' => 'GET',  'callback' => array( $this, 'get_logs' ) ) ) );
		register_rest_route( self::NS, '/emails/(?P<id>\d+)/resend', array_merge( $admin, array( 'methods' => 'POST', 'callback' => array( $this, 'resend_email' ) ) ) );
	}

	public function is_admin(): bool {
		return current_user_can( 'manage_options' );
	}

	// ── Settings ──

	public function get_settings() {
		return rest_ensure_response( get_option( 'moolmail_settings', array() ) );
	}

	public function save_settings( $request ) {
		$input    = $request->get_json_params();
		$settings = get_option( 'moolmail_settings', array() );

		// Sanitize each key by type.
		$keys = array(
			'active', 'from_name', 'from_email',
			'logging', 'log_retention', 'default_connection',
			'auto_retry', 'retry_delay', 'retry_attempts', 'retry_strategy',
			'send_guard', 'weekly_summary', 'summary_day', 'simulation', 'analytics',
		);

		foreach ( $keys as $key ) {
			if ( ! isset( $input[ $key ] ) ) continue;
			$settings[ $key ] = $this->sanitize_setting( $key, $input[ $key ] );
		}

		// Provider credential keys (e.g. postmark_api_key).
		foreach ( $input as $key => $value ) {
			$key = sanitize_key( $key );
			foreach ( self::$valid_providers as $pid ) {
				if ( 0 === strpos( $key, $pid . '_' ) ) {
					$settings[ $key ] = sanitize_text_field( (string) $value );
					break;
				}
			}
		}

		// Validate active provider.
		$valid_active = array_merge( self::$valid_providers, array( 'phpmailer' ) );
		if ( isset( $settings['active'] ) && ! in_array( $settings['active'], $valid_active, true ) ) {
			$settings['active'] = 'phpmailer';
		}

		update_option( 'moolmail_settings', $settings );
		return rest_ensure_response( $settings );
	}

	// ── Connections ──

	public function get_connections() {
		return rest_ensure_response( $this->connections() );
	}

	public function create_connection( $request ) {
		$input    = $request->get_json_params();
		$provider = sanitize_key( $input['provider'] ?? '' );

		if ( ! in_array( $provider, self::$valid_providers, true ) ) {
			return new \WP_Error( 'invalid_provider', 'Unknown provider.', array( 'status' => 400 ) );
		}

		$conns = $this->connections();
		$new   = array(
			'id'         => wp_generate_uuid4(),
			'provider'   => $provider,
			'name'       => sanitize_text_field( $input['name'] ?? '' ),
			'from_email' => sanitize_email( $input['from_email'] ?? '' ),
			'from_name'  => sanitize_text_field( $input['from_name'] ?? '' ),
			'config'     => $this->sanitize_config( $input['config'] ?? array() ),
			'enabled'    => (bool) ( $input['enabled'] ?? false ),
			'priority'   => count( $conns ),
		);

		$conns[] = $new;
		$this->save_connections( $conns );
		if ( $new['enabled'] ) $this->sync_active( $conns );

		return rest_ensure_response( $new );
	}

	public function update_connection( $request ) {
		$id    = sanitize_text_field( $request->get_param( 'id' ) );
		$input = $request->get_json_params();
		$conns = $this->connections();
		$found = null;

		foreach ( $conns as &$c ) {
			if ( $c['id'] !== $id ) continue;
			if ( isset( $input['enabled'] ) )    $c['enabled']    = (bool) $input['enabled'];
			if ( isset( $input['name'] ) )       $c['name']       = sanitize_text_field( $input['name'] );
			if ( isset( $input['from_email'] ) )  $c['from_email'] = sanitize_email( $input['from_email'] );
			if ( isset( $input['from_name'] ) )   $c['from_name']  = sanitize_text_field( $input['from_name'] );
			if ( isset( $input['config'] ) )      $c['config']     = $this->sanitize_config( $input['config'] );
			$found = $c;
			break;
		}
		unset( $c );

		if ( ! $found ) {
			return new \WP_Error( 'not_found', 'Connection not found.', array( 'status' => 404 ) );
		}

		$this->save_connections( $conns );
		$this->sync_active( $conns );
		return rest_ensure_response( $found );
	}

	public function delete_connection( $request ) {
		$id    = sanitize_text_field( $request->get_param( 'id' ) );
		$conns = array_values( array_filter( $this->connections(), function ( $c ) use ( $id ) { return $c['id'] !== $id; } ) );
		$this->save_connections( $conns );
		$this->sync_active( $conns );
		return rest_ensure_response( array( 'deleted' => true ) );
	}

	public function reorder_connections( $request ) {
		$ids  = array_map( 'sanitize_text_field', $request->get_json_params()['ids'] ?? array() );
		$map  = array();
		foreach ( $this->connections() as $c ) { $map[ $c['id'] ] = $c; }

		$reordered = array();
		foreach ( $ids as $i => $id ) {
			if ( isset( $map[ $id ] ) ) {
				$map[ $id ]['priority'] = $i;
				$reordered[] = $map[ $id ];
			}
		}

		$this->save_connections( $reordered );
		$this->sync_active( $reordered );
		return rest_ensure_response( $reordered );
	}

	// ── Dashboard ──

	public function get_dashboard() {
		$conns    = $this->connections();
		$settings = get_option( 'moolmail_settings', array() );
		$stats    = Logger::instance()->stats();

		return rest_ensure_response( array(
			'stats' => array(
				'sent' => $stats['sent'], 'sent_change' => '', 'delivery_rate' => $stats['delivery_rate'],
				'retried' => 0, 'recovery_rate' => '', 'blocked' => 0,
			),
			'chart_data'        => $stats['chart_data'],
			'recent_logs'       => $stats['recent_logs'],
			'connections_count' => count( array_filter( $conns, function ( $c ) { return ! empty( $c['enabled'] ); } ) ),
			'auto_retry'        => ! empty( $settings['auto_retry'] ),
			'shield_blocked'    => 0,
		) );
	}

	// ── Test email ──

	public function send_test( $request ) {
		$input  = $request->get_json_params();
		$to     = sanitize_email( $input['to'] ?? '' );
		$format = sanitize_key( $input['format'] ?? 'html' );

		if ( empty( $to ) ) $to = wp_get_current_user()->user_email;

		if ( ! is_email( $to ) ) {
			return rest_ensure_response( array( 'success' => false, 'message' => __( 'Invalid email address.', 'moolmail' ) ) );
		}

		$subject = ! empty( $input['subject'] )
			? sanitize_text_field( $input['subject'] )
			: __( 'MoolMail — Test Email', 'moolmail' );

		if ( ! empty( $input['body'] ) ) {
			$body = 'plain' === $format ? sanitize_textarea_field( $input['body'] ) : wp_kses_post( $input['body'] );
		} else {
			$body = '<div style="font-family:-apple-system,sans-serif;max-width:500px;margin:40px auto;padding:32px;background:#fff;border-radius:12px">'
				. '<h2 style="margin:0 0 12px;font-size:20px;color:#1a1815">Your email is working!</h2>'
				. '<p style="margin:0 0 16px;font-size:14px;color:#7c766d;line-height:1.6">This confirms that MoolMail is delivering emails correctly.</p>'
				. '<p style="margin:0;font-size:12px;color:#ada69b">Sent to ' . esc_html( $to ) . '</p></div>';
		}

		$content_type = 'plain' === $format ? 'text/plain' : 'text/html';
		$result       = wp_mail( $to, $subject, $body, array( "Content-Type: $content_type; charset=UTF-8" ) );

		if ( $result ) {
			return rest_ensure_response( array( 'success' => true, 'message' => sprintf( __( 'Test email sent to %s', 'moolmail' ), $to ) ) );
		}

		global $phpmailer;
		$error = isset( $phpmailer->ErrorInfo ) ? sanitize_text_field( $phpmailer->ErrorInfo ) : '';
		return rest_ensure_response( array( 'success' => false, 'message' => $error ?: __( 'Failed to send.', 'moolmail' ) ) );
	}

	// ── Onboarding ──

	public function complete_onboarding( $request ) {
		$input    = $request->get_json_params();
		$provider = sanitize_key( $input['provider'] ?? '' );

		if ( ! in_array( $provider, self::$valid_providers, true ) ) {
			return new \WP_Error( 'invalid_provider', 'Unknown provider.', array( 'status' => 400 ) );
		}

		$conns    = $this->connections();
		$new_conn = array(
			'id' => wp_generate_uuid4(), 'provider' => $provider,
			'name' => sanitize_text_field( $input['provider_name'] ?? $provider ),
			'from_email' => sanitize_email( $input['from_email'] ?? '' ),
			'from_name' => sanitize_text_field( $input['from_name'] ?? '' ),
			'config' => $this->sanitize_config( $input['config'] ?? array() ),
			'enabled' => true, 'priority' => 0,
		);

		$conns[] = $new_conn;
		$this->save_connections( $conns );

		$settings               = get_option( 'moolmail_settings', array() );
		$settings['active']     = $new_conn['provider'];
		$settings['from_email'] = $new_conn['from_email'];
		$settings['from_name']  = $new_conn['from_name'];
		$settings['logging']    = (bool) ( $input['logging'] ?? true );
		$settings['auto_retry'] = (bool) ( $input['auto_retry'] ?? true );

		// Flatten provider config into settings.
		if ( is_array( $new_conn['config'] ) ) {
			$prefix = $new_conn['provider'] . '_';
			foreach ( $new_conn['config'] as $k => $v ) {
				$settings[ sanitize_key( $prefix . $k ) ] = sanitize_text_field( (string) $v );
			}
		}

		update_option( 'moolmail_settings', $settings );
		update_option( 'moolmail_onboarded', true );

		return rest_ensure_response( array( 'success' => true, 'connection' => $new_conn ) );
	}

	// ── Logs ──

	public function get_logs( $request ) {
		return rest_ensure_response( Logger::instance()->query( array(
			'status'   => sanitize_key( $request->get_param( 'status' ) ?? 'all' ),
			'search'   => sanitize_text_field( $request->get_param( 'search' ) ?? '' ),
			'page'     => absint( $request->get_param( 'page' ) ?? 1 ),
			'per_page' => absint( $request->get_param( 'per_page' ) ?? 20 ),
		) ) );
	}

	public function resend_email() {
		return new \WP_Error( 'not_implemented', 'Not yet implemented.', array( 'status' => 501 ) );
	}

	// ── Helpers ──

	private function connections(): array {
		return get_option( 'moolmail_connections', array() );
	}

	private function save_connections( array $conns ) {
		update_option( 'moolmail_connections', $conns );
	}

	// Sync the first enabled connection as the active provider in settings.
	private function sync_active( array $conns ) {
		$settings = get_option( 'moolmail_settings', array() );
		$primary  = null;

		foreach ( $conns as $c ) {
			if ( ! empty( $c['enabled'] ) ) { $primary = $c; break; }
		}

		if ( $primary ) {
			$settings['active'] = sanitize_key( $primary['provider'] );
			if ( ! empty( $primary['from_email'] ) ) $settings['from_email'] = sanitize_email( $primary['from_email'] );
			if ( ! empty( $primary['from_name'] ) )  $settings['from_name']  = sanitize_text_field( $primary['from_name'] );

			if ( is_array( $primary['config'] ?? null ) ) {
				$prefix = $primary['provider'] . '_';
				foreach ( $primary['config'] as $k => $v ) {
					$settings[ sanitize_key( $prefix . $k ) ] = sanitize_text_field( (string) $v );
				}
			}
		} else {
			$settings['active'] = 'phpmailer';
		}

		update_option( 'moolmail_settings', $settings );
	}

	private function sanitize_config( $config ): array {
		if ( ! is_array( $config ) ) return array();
		$clean = array();
		foreach ( $config as $k => $v ) {
			$k = sanitize_key( $k );
			$clean[ $k ] = is_array( $v ) ? $this->sanitize_config( $v ) : sanitize_text_field( (string) $v );
		}
		return $clean;
	}

	private function sanitize_setting( string $key, $value ) {
		switch ( $key ) {
			case 'active': case 'default_connection': case 'retry_strategy': case 'summary_day':
				return sanitize_key( $value );
			case 'from_email':
				return sanitize_email( $value );
			case 'from_name':
				return sanitize_text_field( $value );
			case 'logging': case 'auto_retry': case 'send_guard': case 'weekly_summary': case 'simulation': case 'analytics':
				return (bool) $value;
			case 'log_retention': case 'retry_delay': case 'retry_attempts':
				return absint( $value );
			default:
				return sanitize_text_field( (string) $value );
		}
	}
}
