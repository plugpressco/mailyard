<?php
/**
 * Mailyard tools for the WordPress Abilities API (WP 6.9+ / 7.0).
 *
 * The delivery half of the family's AI surface: an agent can see the provider
 * chain, diagnose SPF/DKIM/DMARC, read the failure log, and send a test — the
 * "why aren't my emails arriving?" workflow, end to end. Mailyard Pro adds the
 * campaign tools under the SAME `mailyard/*` namespace and `mailyard` category,
 * so both plugins read as one product to an agent.
 *
 * Every ability is opted into MCP (`meta.mcp.public => true`), so once an MCP
 * bridge is active (the WordPress MCP Adapter plugin, or Saddle) an MCP client
 * — Claude Code, Codex, Cursor, … — can discover and call them. Mailyard ships
 * no MCP transport of its own.
 *
 * The whole layer is a silent no-op on WordPress older than 6.9 (the API's
 * functions simply don't exist), which is why the plugin still supports 5.8.
 *
 * @package Mailyard
 */

namespace Mailyard;

defined( 'ABSPATH' ) || exit;

class Abilities {

	/**
	 * Shared FAMILY category — Mailyard Pro registers its campaign tools into
	 * this same category (at priority 20, behind an is_registered guard) so the
	 * free plugin, loading first at priority 10, is the one that defines it.
	 */
	const CATEGORY = 'mailyard';

	/** Master switch — every Mailyard tool at once. */
	const OPTION = 'mailyard_mcp_enabled';

	/** Per-tool permissions: ability name => '1'|'0'. */
	const ABILITIES_OPTION = 'mailyard_mcp_abilities';

	/**
	 * Whether any Mailyard AI tools are exposed at all. Default on, so the
	 * tools work the moment an MCP bridge is installed.
	 */
	public static function is_enabled(): bool {
		return '0' !== get_option( self::OPTION, '1' );
	}

	/**
	 * Per-tool permission, independent of the master switch.
	 *
	 * @param string $name Ability name.
	 */
	public static function ability_setting( string $name ): bool {
		$map = (array) get_option( self::ABILITIES_OPTION, array() );
		return isset( $map[ $name ] ) ? '1' === $map[ $name ] : self::default_for( $name );
	}

	/**
	 * Risk-aware default before the user has chosen. Every free tool is
	 * read-only except send-test, which delivers one real email to an address
	 * the caller names — safe enough to leave on (it can't touch an audience).
	 *
	 * @param string $name Ability name.
	 */
	public static function default_for( string $name ): bool {
		unset( $name );
		return true;
	}

	/**
	 * Effective state: a tool is exposed only when the master switch AND its
	 * own permission are on.
	 *
	 * @param string $name Ability name.
	 */
	public static function is_ability_enabled( string $name ): bool {
		return self::is_enabled() && self::ability_setting( $name );
	}

	/**
	 * The tools — plain-language copy, access level, and current on/off state.
	 * Single source for both registration and the Connect AI settings UI.
	 *
	 * `access`: 'read' (view only) or 'action' (sends a real email).
	 */
	public static function catalog(): array {
		$defs = array(
			array(
				'name'        => 'mailyard/delivery-status',
				'label'       => __( 'Delivery status', 'mailyard' ),
				'description' => __( 'See the active provider, the fallback chain, and how many emails sent or failed this week.', 'mailyard' ),
				'access'      => 'read',
			),
			array(
				'name'        => 'mailyard/check-deliverability',
				'label'       => __( 'Check deliverability', 'mailyard' ),
				'description' => __( 'Score SPF, DKIM, DMARC, and MX for your sending domains — with the exact DNS records to add.', 'mailyard' ),
				'access'      => 'read',
			),
			array(
				'name'        => 'mailyard/list-logs',
				'label'       => __( 'Read the email log', 'mailyard' ),
				'description' => __( 'List recent emails with their status and error — the fastest way to find what failed.', 'mailyard' ),
				'access'      => 'read',
			),
			array(
				'name'        => 'mailyard/get-log',
				'label'       => __( 'Open one logged email', 'mailyard' ),
				'description' => __( 'Read a single logged email in full, including its body, to debug why it failed.', 'mailyard' ),
				'access'      => 'read',
				'warning'     => __( 'Returns the message content of the email you ask for.', 'mailyard' ),
			),
			array(
				'name'        => 'mailyard/send-test',
				'label'       => __( 'Send a test email', 'mailyard' ),
				'description' => __( 'Send a test through the live provider chain to confirm delivery works.', 'mailyard' ),
				'access'      => 'action',
				'warning'     => __( 'Sends one real email to the address the assistant specifies.', 'mailyard' ),
			),
		);

		foreach ( $defs as &$def ) {
			$def['enabled'] = self::ability_setting( $def['name'] );
		}
		unset( $def );

		return $defs;
	}

	/**
	 * Hook ability + category registration. No-ops when the Abilities API isn't
	 * present (WP < 6.9) or the master switch is off. Individual tools are gated
	 * per-permission in maybe_register().
	 *
	 * Default priority 10 on both hooks: Mailyard Pro hooks the same actions at
	 * 20 and skips the category when it already exists, so free owns it.
	 */
	public function register(): void {
		if ( ! self::is_enabled() ) {
			return;
		}
		add_action( 'wp_abilities_api_categories_init', array( $this, 'register_category' ) );
		add_action( 'wp_abilities_api_init', array( $this, 'register_abilities' ) );
	}

	public function register_category(): void {
		if ( ! function_exists( 'wp_register_ability_category' ) ) {
			return;
		}
		wp_register_ability_category(
			self::CATEGORY,
			array(
				'label'       => __( 'Mailyard', 'mailyard' ),
				'description' => __( 'Email delivery, broadcast campaigns, and contacts.', 'mailyard' ),
			)
		);
	}

	/**
	 * Register one ability only when its per-tool permission is on.
	 *
	 * @param string $name Ability name.
	 * @param array  $def  Ability definition.
	 */
	private function maybe_register( string $name, array $def ): void {
		if ( self::is_ability_enabled( $name ) ) {
			wp_register_ability( $name, $def );
		}
	}

	public function register_abilities(): void {
		if ( ! function_exists( 'wp_register_ability' ) ) {
			return;
		}

		$this->maybe_register(
			'mailyard/delivery-status',
			array(
				'label'               => __( 'Delivery status', 'mailyard' ),
				'description'         => __( 'Report how WordPress email is being delivered: the active provider, the ordered fallback chain (with each connection\'s last test result), overall health, and the count of emails sent and failed in the last 7 days. Start here when email is not arriving.', 'mailyard' ),
				'category'            => self::CATEGORY,
				'execute_callback'    => array( $this, 'delivery_status' ),
				'permission_callback' => array( $this, 'can_manage' ),
				'input_schema'        => array(
					'type'       => 'object',
					'properties' => array(),
				),
				'output_schema'       => array(
					'type'       => 'object',
					'properties' => array(
						'active_provider' => array( 'type' => array( 'string', 'null' ) ),
						'health'          => array( 'type' => 'string' ),
						'chain'           => array( 'type' => 'array' ),
						'sent_7d'         => array( 'type' => 'integer' ),
						'failed_7d'       => array( 'type' => 'integer' ),
						'logging_enabled' => array( 'type' => 'boolean' ),
					),
				),
				'meta'                => $this->read_meta(),
			)
		);

		$this->maybe_register(
			'mailyard/check-deliverability',
			array(
				'label'               => __( 'Check deliverability', 'mailyard' ),
				'description'         => __( 'Check the DNS records that decide whether email reaches the inbox — SPF, DKIM, DMARC, and MX — for every domain Mailyard sends from. Returns a 0-100 score and letter grade per domain, plus, for each failing check, the exact DNS record to add. Use this when mail sends successfully but lands in spam.', 'mailyard' ),
				'category'            => self::CATEGORY,
				'execute_callback'    => array( $this, 'check_deliverability' ),
				'permission_callback' => array( $this, 'can_manage' ),
				'input_schema'        => array(
					'type'       => 'object',
					'properties' => array(
						'refresh' => array(
							'type'        => 'boolean',
							'description' => __( 'Bypass the 1-hour cache and re-query DNS live. Default false.', 'mailyard' ),
						),
					),
				),
				'output_schema'       => array(
					'type'       => 'object',
					'properties' => array(
						'count'   => array( 'type' => 'integer' ),
						'domains' => array( 'type' => 'array' ),
					),
				),
				'meta'                => $this->read_meta(),
			)
		);

		$this->maybe_register(
			'mailyard/list-logs',
			array(
				'label'               => __( 'Read the email log', 'mailyard' ),
				'description'         => __( 'List recently sent emails with recipient, subject, provider, status, and the error message when a send failed. Filter to failures only to find what is broken. Message bodies are not included — use mailyard/get-log for one specific email.', 'mailyard' ),
				'category'            => self::CATEGORY,
				'execute_callback'    => array( $this, 'list_logs' ),
				'permission_callback' => array( $this, 'can_manage' ),
				'input_schema'        => array(
					'type'       => 'object',
					'properties' => array(
						'status' => array(
							'type'        => 'string',
							'enum'        => array( 'all', 'sent', 'failed' ),
							'description' => __( 'Filter by status. Default: all.', 'mailyard' ),
						),
						'search' => array(
							'type'        => 'string',
							'description' => __( 'Match against recipient or subject.', 'mailyard' ),
						),
						'limit'  => array(
							'type'        => 'integer',
							'description' => __( 'Max rows to return (1-100, default 20).', 'mailyard' ),
						),
					),
				),
				'output_schema'       => array(
					'type'       => 'object',
					'properties' => array(
						'count' => array( 'type' => 'integer' ),
						'total' => array( 'type' => 'integer' ),
						'items' => array( 'type' => 'array' ),
					),
				),
				'meta'                => $this->read_meta(),
			)
		);

		$this->maybe_register(
			'mailyard/get-log',
			array(
				'label'               => __( 'Open one logged email', 'mailyard' ),
				'description'         => __( 'Read one logged email in full, including its message body and headers, to debug exactly why it failed. Get the id from mailyard/list-logs.', 'mailyard' ),
				'category'            => self::CATEGORY,
				'execute_callback'    => array( $this, 'get_log' ),
				'permission_callback' => array( $this, 'can_manage' ),
				'input_schema'        => array(
					'type'       => 'object',
					'properties' => array(
						'id' => array(
							'type'        => 'integer',
							'description' => __( 'The log row id.', 'mailyard' ),
						),
					),
					'required'   => array( 'id' ),
				),
				'output_schema'       => array( 'type' => 'object' ),
				'meta'                => $this->read_meta(),
			)
		);

		$this->maybe_register(
			'mailyard/send-test',
			array(
				'label'               => __( 'Send a test email', 'mailyard' ),
				'description'         => __( 'Send a test email through the live provider chain (with failover) to confirm delivery works end to end. Delivers a real email to the address given; defaults to the current user. Use after fixing a connection or DNS record.', 'mailyard' ),
				'category'            => self::CATEGORY,
				'execute_callback'    => array( $this, 'send_test' ),
				'permission_callback' => array( $this, 'can_manage' ),
				'input_schema'        => array(
					'type'       => 'object',
					'properties' => array(
						'to'      => array(
							'type'        => 'string',
							'description' => __( 'Recipient. Defaults to the current user\'s email.', 'mailyard' ),
						),
						'subject' => array( 'type' => 'string' ),
					),
				),
				'output_schema'       => array(
					'type'       => 'object',
					'properties' => array(
						'success' => array( 'type' => 'boolean' ),
						'message' => array( 'type' => 'string' ),
						'to'      => array( 'type' => 'string' ),
					),
				),
				'meta'                => array(
					'annotations'  => array(
						'readonly'    => false,
						'destructive' => false,
					),
					'show_in_rest' => true,
					'mcp'          => array( 'public' => true ),
				),
			)
		);
	}

	/** Standard meta for a read-only tool. */
	private function read_meta(): array {
		return array(
			'annotations'  => array(
				'readonly'    => true,
				'destructive' => false,
			),
			'show_in_rest' => true,
			'mcp'          => array( 'public' => true ),
		);
	}

	/** Shared permission gate — the same capability as the REST controllers. */
	public function can_manage(): bool {
		return current_user_can( 'manage_options' );
	}

	/**
	 * The provider chain, projected safely. Connection records hold API keys in
	 * `config`; this NEVER leaves the server — mirror the dashboard's projection.
	 */
	public function delivery_status(): array {
		$manager = Manager::instance();
		$chain   = array();

		foreach ( $manager->enabled_connections() as $entry ) {
			$conn    = $entry['conn'];
			$chain[] = array(
				'name'             => (string) ( $conn['name'] ?? '' ),
				'provider'         => (string) ( $conn['provider'] ?? '' ),
				'from_email'       => (string) ( $conn['from_email'] ?? '' ),
				'purpose'          => (string) ( $conn['purpose'] ?? 'any' ),
				'last_test_status' => (string) ( $conn['last_test_status'] ?? '' ),
				'last_test_error'  => (string) ( $conn['last_test_error'] ?? '' ),
				'last_test_at'     => (string) ( $conn['last_test_at'] ?? '' ),
			);
		}

		$stats    = Logger::instance()->stats();
		$active   = $manager->active_provider();
		$settings = Options::settings();

		$failed = (int) ( $stats['failed_7d'] ?? 0 );
		$sent   = (int) ( $stats['sent_7d'] ?? 0 );

		if ( empty( $chain ) ) {
			$health = 'down';
		} elseif ( $failed > 0 ) {
			$health = 'warning';
		} else {
			$health = 'healthy';
		}

		return array(
			'active_provider' => $active ? $active->get_label() : null,
			'health'          => $health,
			'chain'           => $chain,
			'sent_7d'         => $sent,
			'failed_7d'       => $failed,
			'logging_enabled' => ( $settings['logging'] ?? true ) ? true : false,
			'summary'         => empty( $chain )
				? __( 'No email provider is connected — WordPress is falling back to the host mail server, which usually lands in spam.', 'mailyard' )
				: sprintf(
					/* translators: 1: provider label, 2: number of backups, 3: failed count. */
					__( 'Sending through %1$s with %2$d backup provider(s). %3$d failure(s) in the last 7 days.', 'mailyard' ),
					$active ? $active->get_label() : __( 'the default mailer', 'mailyard' ),
					max( 0, count( $chain ) - 1 ),
					$failed
				),
		);
	}

	/**
	 * @param array $input { refresh? }.
	 */
	public function check_deliverability( $input ): array {
		$refresh = ! empty( $input['refresh'] );
		$domains = Deliverability::scan_all( $refresh );

		return array(
			'count'   => count( $domains ),
			'domains' => $domains,
		);
	}

	/**
	 * @param array $input { status?, search?, limit? }.
	 */
	public function list_logs( $input ): array {
		$result = Logger::instance()->query(
			array(
				'status'   => isset( $input['status'] ) ? sanitize_key( $input['status'] ) : 'all',
				'search'   => isset( $input['search'] ) ? sanitize_text_field( $input['search'] ) : '',
				'per_page' => isset( $input['limit'] ) ? max( 1, min( 100, (int) $input['limit'] ) ) : 20,
				'page'     => 1,
			)
		);

		// Bodies and headers are PII-heavy and blow up the context window — the
		// list is for triage; mailyard/get-log opens one message in full.
		$items = array_map(
			static function ( $row ) {
				unset( $row['body'], $row['headers'] );
				return $row;
			},
			(array) ( $result['items'] ?? array() )
		);

		return array(
			'count' => count( $items ),
			'total' => (int) ( $result['total'] ?? 0 ),
			'items' => $items,
		);
	}

	/**
	 * @param array $input { id }.
	 * @return array|\WP_Error
	 */
	public function get_log( $input ) {
		$id = (int) ( $input['id'] ?? 0 );
		if ( ! $id ) {
			return new \WP_Error( 'missing_id', __( 'A log id is required.', 'mailyard' ), array( 'status' => 400 ) );
		}

		global $wpdb;
		$table = Logger::table();
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery
		$row = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$table} WHERE id = %d", $id ), ARRAY_A );

		if ( ! $row ) {
			return new \WP_Error( 'not_found', __( 'Log entry not found.', 'mailyard' ), array( 'status' => 404 ) );
		}

		return array(
			'id'         => (int) $row['id'],
			'to'         => (string) $row['to_email'],
			'subject'    => (string) $row['subject'],
			'body'       => (string) $row['body'],
			'headers'    => (string) $row['headers'],
			'provider'   => (string) $row['provider'],
			'status'     => (string) $row['status'],
			'error'      => (string) $row['error_message'],
			'created_at' => (string) $row['created_at'],
		);
	}

	/**
	 * Reuse the REST send-test pipeline (full chain + failover), exactly like
	 * the UI's "Send test" button.
	 *
	 * @param array $input { to?, subject? }.
	 * @return array|\WP_Error
	 */
	public function send_test( $input ) {
		$to = isset( $input['to'] ) ? sanitize_email( $input['to'] ) : '';
		if ( $to && ! is_email( $to ) ) {
			return new \WP_Error( 'bad_email', __( 'A valid email address is required.', 'mailyard' ), array( 'status' => 400 ) );
		}

		// REST_API::send_test() reads get_json_params(), so hand it a real JSON
		// body rather than params.
		$body = array();
		if ( $to ) {
			$body['to'] = $to;
		}
		if ( ! empty( $input['subject'] ) ) {
			$body['subject'] = sanitize_text_field( $input['subject'] );
		}

		$request = new \WP_REST_Request( 'POST', '/' . Options::REST_NS . '/test-email' );
		$request->set_header( 'Content-Type', 'application/json' );
		$request->set_body( wp_json_encode( $body ) );

		$response = ( new REST_API() )->send_test( $request );
		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$data = rest_ensure_response( $response )->get_data();

		return array(
			'success' => ! empty( $data['success'] ),
			'message' => (string) ( $data['message'] ?? '' ),
			'to'      => $to ? $to : (string) wp_get_current_user()->user_email,
		);
	}
}
