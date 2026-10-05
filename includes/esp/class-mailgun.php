<?php
namespace Mailyard\ESP;

defined( 'ABSPATH' ) || exit;

// Mailgun — sends via the Messages API (multipart form, Basic auth api:KEY).
// Docs: https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/messages
class Mailgun implements Provider {

	private $api_key = '';
	private $domain  = '';
	private $region  = 'us';

	public function connect( array $config ): bool {
		$this->api_key = sanitize_text_field( $config['api_key'] ?? '' );
		$this->domain  = strtolower( trim( sanitize_text_field( $config['domain'] ?? '' ) ) );
		$this->region  = 'eu' === ( $config['region'] ?? 'us' ) ? 'eu' : 'us';
		return ! empty( $this->api_key ) && ! empty( $this->domain );
	}

	public function send( array $params ): Result {
		$from_name  = sanitize_text_field( $params['from_name'] ?? '' );
		$from_email = sanitize_email( $params['from_email'] );
		$html       = (string) ( $params['html'] ?? '' );
		$text       = (string) ( $params['text'] ?? '' );

		if ( '' === $html && '' === $text ) {
			return Result::failure( __( 'Empty email body.', 'mailyard' ) );
		}

		// Ordered name/value pairs: Mailgun takes repeated `to`/`cc`/`bcc` fields.
		$fields = array( array( 'from', $from_name ? "$from_name <$from_email>" : $from_email ) );
		foreach ( Recipients::split( $params['to'] ) as $to ) {
			$fields[] = array( 'to', $to );
		}
		foreach ( Recipients::split( $params['cc'] ?? array() ) as $cc ) {
			$fields[] = array( 'cc', $cc );
		}
		foreach ( Recipients::split( $params['bcc'] ?? array() ) as $bcc ) {
			$fields[] = array( 'bcc', $bcc );
		}
		$fields[] = array( 'subject', sanitize_text_field( $params['subject'] ) );
		$fields[] = '' !== $html ? array( 'html', $html ) : array( 'text', $text );
		if ( ! empty( $params['reply_to'] ) ) {
			$fields[] = array( 'h:Reply-To', sanitize_email( $params['reply_to'] ) );
		}
		foreach ( (array) ( $params['headers'] ?? array() ) as $name => $value ) {
			$fields[] = array( 'h:' . $name, (string) $value );
		}

		$boundary = 'mailyard-' . wp_generate_password( 24, false );
		$body     = '';
		foreach ( $fields as $field ) {
			$body .= "--$boundary\r\nContent-Disposition: form-data; name=\"{$field[0]}\"\r\n\r\n{$field[1]}\r\n";
		}
		foreach ( (array) ( $params['attachments'] ?? array() ) as $a ) {
			$filename = str_replace( array( '"', "\r", "\n" ), '', $a['filename'] );
			$body    .= "--$boundary\r\nContent-Disposition: form-data; name=\"attachment\"; filename=\"$filename\"\r\n"
				. 'Content-Type: ' . $a['mime'] . "\r\n\r\n"
				. base64_decode( $a['content_base64'] ) . "\r\n"; // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode
		}
		$body .= "--$boundary--\r\n";

		$host     = 'eu' === $this->region ? 'api.eu.mailgun.net' : 'api.mailgun.net';
		$response = wp_remote_post( "https://$host/v3/" . rawurlencode( $this->domain ) . '/messages', array(
			'headers' => array(
				'Authorization' => 'Basic ' . base64_encode( 'api:' . $this->api_key ), // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode
				'Content-Type'  => 'multipart/form-data; boundary=' . $boundary,
			),
			'body'    => $body,
			'timeout' => 30,
		) );

		if ( is_wp_error( $response ) ) {
			return Result::failure( $response->get_error_message() );
		}

		$code    = (int) wp_remote_retrieve_response_code( $response );
		$raw     = wp_remote_retrieve_body( $response );
		$decoded = json_decode( $raw, true );

		if ( 200 !== $code ) {
			// JSON { message } for most errors; a bare "Forbidden" on a bad key.
			if ( is_array( $decoded ) && ! empty( $decoded['message'] ) ) {
				$error = sanitize_text_field( $decoded['message'] );
			} elseif ( '' !== trim( $raw ) && strlen( $raw ) < 200 ) {
				/* translators: 1: HTTP status code, 2: Mailgun's short error text. */
				$error = sprintf( __( 'Mailgun error (HTTP %1$d): %2$s', 'mailyard' ), $code, sanitize_text_field( wp_strip_all_tags( $raw ) ) );
			} else {
				/* translators: %d: HTTP status code returned by the Mailgun API. */
				$error = sprintf( __( 'Mailgun error (HTTP %d)', 'mailyard' ), $code );
			}
			return Result::failure( $error );
		}

		return Result::success( is_array( $decoded ) ? (string) ( $decoded['id'] ?? '' ) : '' );
	}

	public function get_name(): string { return 'mailgun'; }
	public function get_label(): string { return __( 'Mailgun', 'mailyard' ); }

	public function get_fields(): array {
		return array(
			array( 'key' => 'api_key', 'label' => __( 'API Key', 'mailyard' ), 'type' => 'password', 'required' => true ),
			array( 'key' => 'domain', 'label' => __( 'Sending Domain', 'mailyard' ), 'type' => 'text', 'required' => true ),
			array( 'key' => 'region', 'label' => __( 'Region', 'mailyard' ), 'type' => 'select', 'default' => 'us', 'options' => array( 'us' => 'US', 'eu' => 'EU' ) ),
		);
	}
}
