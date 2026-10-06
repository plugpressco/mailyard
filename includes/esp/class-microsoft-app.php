<?php
namespace Mailyard\ESP;

use Mailyard\OAuth;

defined( 'ABSPATH' ) || exit;

// Microsoft 365 app-only — an Entra app registration with the Mail.Send
// APPLICATION permission sends as a named mailbox (users/{mailbox}/sendMail).
// Nobody signs in: the app proves itself with a client secret or a
// certificate (a signed JWT assertion), which suits client sites. A shared
// mailbox works and needs no licence. Message format is the same Graph JSON as
// the delegated driver; only the token and the endpoint differ.
// Docs: https://learn.microsoft.com/entra/identity-platform/v2-oauth2-client-creds-grant-flow
class Microsoft_App extends Microsoft {

	public function connect( array $config ): bool {
		$this->config = $config;
		$tenant       = strtolower( trim( (string) ( $config['tenant'] ?? '' ) ) );
		return '' !== $tenant
			// "common" & co. only mean something when a person signs in.
			&& ! in_array( $tenant, array( 'common', 'organizations', 'consumers' ), true )
			&& ! empty( $config['client_id'] )
			&& is_email( (string) ( $config['mailbox'] ?? '' ) )
			&& ( '' !== trim( (string) ( $config['client_secret'] ?? '' ) ) || '' !== trim( (string) ( $config['certificate'] ?? '' ) ) );
	}

	public function send( array $params ): Result {
		$token = $this->app_token();
		if ( is_wp_error( $token ) ) {
			return Result::failure( $token->get_error_message() );
		}
		$mailbox = str_replace( '%40', '@', rawurlencode( trim( (string) $this->config['mailbox'] ) ) );
		return $this->graph_send( 'https://graph.microsoft.com/v1.0/users/' . $mailbox . '/sendMail', $token, $params );
	}

	// Graph's own words say what failed, not where to fix it — which is always
	// Entra or Exchange.
	protected function explain( \WP_Error $error ): string {
		$message = rtrim( $error->get_error_message(), '. ' ) . '.';
		$code    = (int) substr( (string) $error->get_error_code(), strlen( 'oauth_http_' ) );
		if ( in_array( $code, array( 401, 403 ), true ) ) {
			return $message . ' ' . __( 'Check that the app has the Mail.Send application permission (not delegated) with admin consent, and that no Application Access Policy excludes this mailbox.', 'mailyard' );
		}
		if ( 404 === $code ) {
			return $message . ' ' . __( 'Check that this mailbox exists in the tenant — a shared mailbox works too.', 'mailyard' );
		}
		return $message;
	}

	/**
	 * A client-credentials token, cached per tenant + app + credential (so a
	 * corrected secret is used at once, not after the old token expires).
	 *
	 * @return string|\WP_Error
	 */
	public function app_token() {
		$tenant      = trim( (string) $this->config['tenant'] );
		$client_id   = trim( (string) $this->config['client_id'] );
		$certificate = trim( (string) ( $this->config['certificate'] ?? '' ) );
		$credential  = '' !== $certificate ? $certificate : trim( (string) ( $this->config['client_secret'] ?? '' ) );
		$cache_key   = 'mailyard_msapp_' . md5( $tenant . '|' . $client_id . '|' . $credential );

		$cached = get_transient( $cache_key );
		if ( is_string( $cached ) && '' !== $cached ) {
			return $cached;
		}

		$token_url = 'https://login.microsoftonline.com/' . rawurlencode( $tenant ) . '/oauth2/v2.0/token';
		$body      = array(
			'client_id'  => $client_id,
			'scope'      => 'https://graph.microsoft.com/.default',
			'grant_type' => 'client_credentials',
		);
		if ( '' !== $certificate ) {
			$assertion = self::client_assertion( $certificate, $client_id, $token_url );
			if ( is_wp_error( $assertion ) ) {
				return $assertion;
			}
			$body['client_assertion_type'] = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';
			$body['client_assertion']      = $assertion;
		} else {
			$body['client_secret'] = $credential;
		}

		$tokens = OAuth::post_form( $token_url, $body );
		if ( is_wp_error( $tokens ) ) {
			return $tokens;
		}
		if ( empty( $tokens['access_token'] ) ) {
			return new \WP_Error( 'msapp_token', __( 'Microsoft didn’t return an access token.', 'mailyard' ) );
		}
		set_transient( $cache_key, (string) $tokens['access_token'], max( 60, (int) ( $tokens['expires_in'] ?? HOUR_IN_SECONDS ) - 120 ) );
		return (string) $tokens['access_token'];
	}

	/**
	 * The signed JWT Entra accepts in place of a secret: RS256, the
	 * certificate's SHA-1 thumbprint as x5t, a ten-minute lifetime.
	 *
	 * @param string $pem       Certificate and private key, PEM, pasted together.
	 * @param string $client_id App (client) ID.
	 * @param string $audience  The token endpoint.
	 * @return string|\WP_Error
	 */
	public static function client_assertion( string $pem, string $client_id, string $audience ) {
		if ( ! function_exists( 'openssl_sign' ) ) {
			return new \WP_Error( 'msapp_certificate', __( 'Signing in with a certificate needs PHP’s OpenSSL extension. Use a client secret instead, or ask your host to enable it.', 'mailyard' ) );
		}
		if ( ! preg_match( '/-----BEGIN CERTIFICATE-----.+?-----END CERTIFICATE-----/s', $pem, $cert_pem ) ) {
			return new \WP_Error( 'msapp_certificate', __( 'The certificate is missing. Paste the certificate and its private key together, both PEM.', 'mailyard' ) );
		}
		if ( false !== strpos( $pem, 'ENCRYPTED' ) ) {
			return new \WP_Error( 'msapp_certificate', __( 'The private key has a password. Export it without one (openssl’s -nodes option).', 'mailyard' ) );
		}
		if ( ! preg_match( '/-----BEGIN (?:RSA )?PRIVATE KEY-----.+?-----END (?:RSA )?PRIVATE KEY-----/s', $pem, $key_pem ) ) {
			return new \WP_Error( 'msapp_certificate', __( 'The private key is missing. Paste the certificate and its private key together, both PEM.', 'mailyard' ) );
		}

		$cert = openssl_x509_read( $cert_pem[0] );
		$key  = openssl_pkey_get_private( $key_pem[0] );
		if ( ! $cert || ! $key ) {
			return new \WP_Error( 'msapp_certificate', __( 'The certificate or its private key couldn’t be read.', 'mailyard' ) );
		}
		if ( ! openssl_x509_check_private_key( $cert, $key ) ) {
			return new \WP_Error( 'msapp_certificate', __( 'The private key doesn’t belong to this certificate.', 'mailyard' ) );
		}

		$der    = base64_decode( preg_replace( '/-----[^-]+-----|\s+/', '', $cert_pem[0] ) ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode
		$now    = time();
		$header = array( 'alg' => 'RS256', 'typ' => 'JWT', 'x5t' => Mime::base64url( sha1( $der, true ) ) );
		$claims = array(
			'aud' => $audience,
			'iss' => $client_id,
			'sub' => $client_id,
			'jti' => wp_generate_uuid4(),
			// A minute of slack for a server clock running ahead of Microsoft's.
			'nbf' => $now - 60,
			'iat' => $now - 60,
			'exp' => $now + 600,
		);

		$input = Mime::base64url( (string) wp_json_encode( $header ) ) . '.' . Mime::base64url( (string) wp_json_encode( $claims ) );
		if ( ! openssl_sign( $input, $signature, $key, OPENSSL_ALGO_SHA256 ) ) {
			return new \WP_Error( 'msapp_certificate', __( 'Signing with the private key failed.', 'mailyard' ) );
		}
		return $input . '.' . Mime::base64url( $signature );
	}

	public function get_name(): string { return 'microsoft_app'; }
	public function get_label(): string { return __( 'Microsoft 365 (app-only)', 'mailyard' ); }

	public function get_fields(): array {
		return array(
			array( 'key' => 'tenant', 'label' => __( 'Directory (tenant) ID', 'mailyard' ), 'type' => 'text', 'required' => true ),
			array( 'key' => 'client_id', 'label' => __( 'Application (client) ID', 'mailyard' ), 'type' => 'text', 'required' => true ),
			array( 'key' => 'mailbox', 'label' => __( 'Send from mailbox', 'mailyard' ), 'type' => 'email', 'required' => true ),
			array( 'key' => 'client_secret', 'label' => __( 'Client Secret', 'mailyard' ), 'type' => 'password' ),
			array( 'key' => 'certificate', 'label' => __( 'Certificate + private key (PEM)', 'mailyard' ), 'type' => 'textarea' ),
		);
	}
}
