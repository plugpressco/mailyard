<?php
namespace Mailyard;

defined( 'ABSPATH' ) || exit;

// OAuth 2.0 sign-in for the mailbox providers (Gmail, Microsoft 365, Zoho
// Mail): the authorize link, the callback that trades the code for tokens, and
// the refresh the drivers call before each send. Tokens live on their
// connection's config, never in the browser — REST_API strips TOKEN_KEYS from
// every response. No password is stored; access can be revoked at the
// provider without touching the mailbox password.
class OAuth {

	const ACTION = 'mailyard_oauth';

	// Config keys OAuth owns: never sent to the browser, never taken from it.
	const TOKEN_KEYS = array( 'access_token', 'refresh_token', 'expires_at', 'account_id', 'addresses', 'primary_address' );

	// Zoho keeps each region on its own hosts (accounts.{dc}, mail.{dc}).
	const ZOHO_DCS = array( 'zoho.com', 'zoho.eu', 'zoho.in', 'zoho.com.au', 'zoho.jp', 'zohocloud.ca', 'zoho.sa', 'zoho.com.cn' );

	public function init(): void {
		add_action( 'admin_post_' . self::ACTION, array( $this, 'handle_callback' ) );
	}

	// The one URL every provider sends the browser back to — pasted into the
	// OAuth app's allowed redirect URIs.
	public static function redirect_uri(): string {
		return admin_url( 'admin-post.php?action=' . self::ACTION );
	}

	/**
	 * Authorize/token endpoints and scope per provider; empty for non-OAuth ones.
	 *
	 * @param string $provider Provider slug.
	 * @param array  $config   Connection config (tenant, dc).
	 */
	public static function endpoints( string $provider, array $config ): array {
		switch ( $provider ) {
			case 'gmail':
				return array(
					'auth'  => 'https://accounts.google.com/o/oauth2/v2/auth',
					'token' => 'https://oauth2.googleapis.com/token',
					'scope' => 'https://www.googleapis.com/auth/gmail.send',
					'extra' => array( 'access_type' => 'offline', 'prompt' => 'consent' ),
				);
			case 'microsoft':
				$tenant = rawurlencode( trim( (string) ( $config['tenant'] ?? '' ) ) ?: 'common' );
				return array(
					'auth'  => "https://login.microsoftonline.com/{$tenant}/oauth2/v2.0/authorize",
					'token' => "https://login.microsoftonline.com/{$tenant}/oauth2/v2.0/token",
					'scope' => 'offline_access https://graph.microsoft.com/Mail.Send',
					'extra' => array( 'response_mode' => 'query', 'prompt' => 'consent' ),
				);
			case 'zoho':
				$dc = self::zoho_dc( (string) ( $config['dc'] ?? '' ) );
				return array(
					'auth'  => "https://accounts.{$dc}/oauth/v2/auth",
					'token' => "https://accounts.{$dc}/oauth/v2/token",
					'scope' => 'ZohoMail.messages.CREATE,ZohoMail.accounts.READ',
					'extra' => array( 'access_type' => 'offline', 'prompt' => 'consent' ),
				);
		}
		return array();
	}

	// A known Zoho data center ("zoho.eu"; "eu" and "ca" are accepted too),
	// defaulting to the US one.
	public static function zoho_dc( string $value ): string {
		$value = strtolower( trim( $value ) );
		if ( '' !== $value && false === strpos( $value, 'zoho' ) ) {
			$value = 'ca' === $value ? 'zohocloud.ca' : 'zoho.' . $value;
		}
		return in_array( $value, self::ZOHO_DCS, true ) ? $value : 'zoho.com';
	}

	/**
	 * The provider's sign-in link for a saved connection.
	 *
	 * @param array $conn Stored connection.
	 * @return string|\WP_Error
	 */
	public static function authorize_url( array $conn ) {
		$config = (array) ( $conn['config'] ?? array() );
		$ep     = self::endpoints( (string) ( $conn['provider'] ?? '' ), $config );
		if ( ! $ep ) {
			return new \WP_Error( 'not_oauth', __( 'This provider doesn’t sign in with an account.', 'mailyard' ) );
		}
		if ( empty( $config['client_id'] ) || empty( $config['client_secret'] ) ) {
			return new \WP_Error( 'no_client', __( 'Save the Client ID and Client Secret first.', 'mailyard' ) );
		}

		$args = array_merge(
			array(
				'client_id'     => $config['client_id'],
				'redirect_uri'  => self::redirect_uri(),
				'response_type' => 'code',
				'scope'         => $ep['scope'],
				'state'         => self::state( (string) $conn['id'] ),
			),
			$ep['extra']
		);
		return add_query_arg( array_map( 'rawurlencode', $args ), $ep['auth'] );
	}

	// "{connection id}.{nonce}" — binds the round trip to this admin and this
	// connection, so a forged or replayed callback can't attach tokens.
	public static function state( string $id ): string {
		return $id . '.' . wp_create_nonce( self::ACTION . '|' . $id );
	}

	// The connection id a returning state was issued for, or '' if it wasn't.
	public static function verify_state( string $state ): string {
		$dot = strrpos( $state, '.' );
		if ( false === $dot ) {
			return '';
		}
		$id = substr( $state, 0, $dot );
		return wp_verify_nonce( substr( $state, $dot + 1 ), self::ACTION . '|' . $id ) ? $id : '';
	}

	// admin-post callback: thin wrapper around complete().
	public function handle_callback(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You are not allowed to connect email accounts.', 'mailyard' ), 403 );
		}
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- the OAuth state carries the nonce; complete() verifies it.
		$result = self::complete( wp_unslash( (array) $_GET ) );
		wp_safe_redirect( self::return_url( $result ) );
		exit;
	}

	/**
	 * Where the admin lands after signing in: the Connections page, with the
	 * outcome in the query string (the hash router owns #/…), read once by the
	 * page and then cleared.
	 *
	 * @param true|\WP_Error $result complete()'s outcome.
	 */
	public static function return_url( $result ): string {
		$args = is_wp_error( $result )
			? array( 'mailyard_oauth' => 'error', 'message' => $result->get_error_message() )
			: array( 'mailyard_oauth' => 'ok' );
		return add_query_arg( rawurlencode_deep( $args ), admin_url( 'options-general.php?page=' . Settings::PAGE ) ) . '#/connections';
	}

	/**
	 * Finish a sign-in: verify the state, trade the code for tokens, and keep
	 * them on the connection (Zoho also learns its account id and addresses).
	 *
	 * @param array $query The callback's query args.
	 * @return true|\WP_Error
	 */
	public static function complete( array $query ) {
		if ( ! empty( $query['error'] ) ) {
			return new \WP_Error( 'oauth_denied', sanitize_text_field( (string) ( $query['error_description'] ?? $query['error'] ) ) );
		}
		$id   = self::verify_state( sanitize_text_field( (string) ( $query['state'] ?? '' ) ) );
		$conn = '' !== $id ? self::find( $id ) : null;
		if ( ! $conn ) {
			return new \WP_Error( 'oauth_state', __( 'This sign-in expired or wasn’t started from this site. Click Connect account again.', 'mailyard' ) );
		}

		$provider = (string) $conn['provider'];
		$config   = (array) ( $conn['config'] ?? array() );
		$ep       = self::endpoints( $provider, $config );
		$body     = array(
			'grant_type'    => 'authorization_code',
			'code'          => sanitize_text_field( (string) ( $query['code'] ?? '' ) ),
			'redirect_uri'  => self::redirect_uri(),
			'client_id'     => (string) ( $config['client_id'] ?? '' ),
			'client_secret' => (string) ( $config['client_secret'] ?? '' ),
		);
		if ( 'microsoft' === $provider ) {
			$body['scope'] = $ep['scope'];
		}

		$tokens = self::post_form( $ep['token'], $body );
		if ( is_wp_error( $tokens ) ) {
			return $tokens;
		}
		if ( empty( $tokens['refresh_token'] ) ) {
			return new \WP_Error( 'no_refresh_token', __( 'The provider signed you in but returned no refresh token, so the connection couldn’t last. Remove the app’s access from your account settings, then click Connect account again.', 'mailyard' ) );
		}

		$fields = array(
			'access_token'  => (string) ( $tokens['access_token'] ?? '' ),
			'refresh_token' => (string) $tokens['refresh_token'],
			'expires_at'    => time() + ( (int) ( $tokens['expires_in'] ?? 0 ) ?: HOUR_IN_SECONDS ),
		);
		if ( 'zoho' === $provider ) {
			$account = self::zoho_account( (string) ( $config['dc'] ?? '' ), $fields['access_token'] );
			if ( is_wp_error( $account ) ) {
				return $account;
			}
			$fields += $account;
		}

		self::store( $id, $fields );
		return true;
	}

	/**
	 * A live access token for a signed-in connection: the stored one while it
	 * has over a minute left, otherwise a refreshed one — saved back to the
	 * connection (Microsoft rotates refresh tokens, so those are kept too).
	 *
	 * @param string $provider Provider slug.
	 * @param array  $config   Connection config; updated in place.
	 * @return string|\WP_Error
	 */
	public static function access_token( string $provider, array &$config ) {
		if ( empty( $config['refresh_token'] ) ) {
			return new \WP_Error( 'not_connected', __( 'This account isn’t connected yet — open the connection and click Connect account.', 'mailyard' ) );
		}
		if ( ! empty( $config['access_token'] ) && (int) ( $config['expires_at'] ?? 0 ) > time() + 60 ) {
			return (string) $config['access_token'];
		}

		$ep   = self::endpoints( $provider, $config );
		$body = array(
			'grant_type'    => 'refresh_token',
			'refresh_token' => (string) $config['refresh_token'],
			'client_id'     => (string) ( $config['client_id'] ?? '' ),
			'client_secret' => (string) ( $config['client_secret'] ?? '' ),
		);
		if ( 'microsoft' === $provider ) {
			$body['scope'] = $ep['scope'];
		}

		$tokens = self::post_form( $ep['token'], $body );
		if ( is_wp_error( $tokens ) ) {
			/* translators: %s: the provider's reason. */
			return new \WP_Error( 'refresh_failed', sprintf( __( 'Couldn’t refresh the sign-in (%s). Open the connection and click Connect account again.', 'mailyard' ), $tokens->get_error_message() ) );
		}
		if ( empty( $tokens['access_token'] ) ) {
			return new \WP_Error( 'refresh_failed', __( 'Couldn’t refresh the sign-in. Open the connection and click Connect account again.', 'mailyard' ) );
		}

		$fields = array(
			'access_token' => (string) $tokens['access_token'],
			'expires_at'   => time() + ( (int) ( $tokens['expires_in'] ?? 0 ) ?: HOUR_IN_SECONDS ),
		);
		if ( ! empty( $tokens['refresh_token'] ) ) {
			$fields['refresh_token'] = (string) $tokens['refresh_token'];
		}
		$config = array_merge( $config, $fields );
		if ( ! empty( $config['_connection_id'] ) ) {
			self::store( (string) $config['_connection_id'], $fields );
		}
		return $fields['access_token'];
	}

	/**
	 * The Zoho mailbox behind a token: its account id (every send URL needs it)
	 * and the verified addresses it may send as / take as Reply-To.
	 *
	 * @return array|\WP_Error { account_id, addresses, primary_address }
	 */
	public static function zoho_account( string $dc, string $token ) {
		$json = self::read_json( wp_remote_get( 'https://mail.' . self::zoho_dc( $dc ) . '/api/accounts', array(
			'timeout' => 30,
			'headers' => array( 'Authorization' => 'Zoho-oauthtoken ' . $token ),
		) ) );
		if ( is_wp_error( $json ) ) {
			return $json;
		}
		$account = $json['data'][0] ?? array();
		if ( empty( $account['accountId'] ) ) {
			return new \WP_Error( 'zoho_account', __( 'Couldn’t read the Zoho Mail account. Make sure the account you signed in with has a mailbox.', 'mailyard' ) );
		}

		$addresses = array();
		foreach ( (array) ( $account['sendMailDetails'] ?? array() ) as $detail ) {
			$address = strtolower( trim( (string) ( $detail['fromAddress'] ?? '' ) ) );
			if ( '' !== $address && ! empty( $detail['validated'] ) ) {
				$addresses[] = $address;
			}
		}
		$addresses = array_values( array_unique( $addresses ) );
		$primary   = strtolower( trim( (string) ( $account['primaryEmailAddress'] ?? '' ) ) ) ?: ( $addresses[0] ?? '' );

		return array(
			'account_id'      => (string) $account['accountId'],
			'addresses'       => $addresses,
			'primary_address' => $primary,
		);
	}

	// Merge fields into one connection's config and save.
	public static function store( string $id, array $fields ): void {
		$conns = Options::connections();
		foreach ( $conns as &$c ) {
			if ( ( $c['id'] ?? '' ) === $id ) {
				$c['config'] = array_merge( (array) ( $c['config'] ?? array() ), $fields );
				break;
			}
		}
		unset( $c );
		Options::save_connections( $conns );
	}

	private static function find( string $id ): ?array {
		foreach ( Options::connections() as $c ) {
			if ( ( $c['id'] ?? '' ) === $id ) {
				return $c;
			}
		}
		return null;
	}

	/**
	 * POST a form to a token endpoint and decode the JSON answer.
	 *
	 * @return array|\WP_Error
	 */
	public static function post_form( string $url, array $body ) {
		return self::read_json( wp_remote_post( $url, array( 'timeout' => 30, 'body' => $body ) ) );
	}

	/**
	 * A 2xx JSON answer (or an empty 2xx body) as an array; anything else as a
	 * plain-sentence WP_Error. Zoho answers some failures with 200 + { error }.
	 *
	 * @param array|\WP_Error $response wp_remote_* response.
	 * @return array|\WP_Error
	 */
	public static function read_json( $response ) {
		if ( is_wp_error( $response ) ) {
			return $response;
		}
		$code = (int) wp_remote_retrieve_response_code( $response );
		$json = json_decode( (string) wp_remote_retrieve_body( $response ), true );
		if ( $code >= 200 && $code < 300 && ! ( is_array( $json ) && ! empty( $json['error'] ) ) ) {
			return is_array( $json ) ? $json : array();
		}
		return new \WP_Error( 'oauth_http_' . $code, self::error_text( $json, $code ) );
	}

	/**
	 * The readable part of an OAuth / API error body: Entra and Google's
	 * error_description, Graph and Gmail's error.message, Zoho's moreInfo.
	 *
	 * @param mixed $json Decoded body.
	 * @param int   $code HTTP status.
	 */
	public static function error_text( $json, int $code ): string {
		if ( is_array( $json ) ) {
			if ( ! empty( $json['error_description'] ) && is_string( $json['error_description'] ) ) {
				// Entra appends Trace/Correlation IDs and a timestamp nobody needs here.
				return trim( preg_replace( '/\s*Trace ID:.*$/s', '', $json['error_description'] ) );
			}
			if ( ! empty( $json['error']['message'] ) && is_string( $json['error']['message'] ) ) {
				return $json['error']['message'];
			}
			if ( ! empty( $json['data']['moreInfo'] ) && is_string( $json['data']['moreInfo'] ) ) {
				return $json['data']['moreInfo'];
			}
			if ( ! empty( $json['status']['description'] ) && is_string( $json['status']['description'] ) && 200 !== (int) ( $json['status']['code'] ?? 0 ) ) {
				return $json['status']['description'];
			}
			if ( ! empty( $json['error'] ) && is_string( $json['error'] ) ) {
				return $json['error'];
			}
		}
		/* translators: %d: HTTP status code. */
		return sprintf( __( 'The provider answered with HTTP %d.', 'mailyard' ), $code );
	}
}
