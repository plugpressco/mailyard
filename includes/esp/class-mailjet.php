<?php
namespace Mailyard\ESP;

defined( 'ABSPATH' ) || exit;

// Mailjet — sends via the v3.1 Send API (Basic auth API key : secret key).
// Docs: https://dev.mailjet.com/email/reference/send-emails/
class Mailjet implements Provider {

	private $api_key    = '';
	private $secret_key = '';

	public function connect( array $config ): bool {
		$this->api_key    = sanitize_text_field( $config['api_key'] ?? '' );
		$this->secret_key = sanitize_text_field( $config['secret_key'] ?? '' );
		return ! empty( $this->api_key ) && ! empty( $this->secret_key );
	}

	public function send( array $params ): Result {
		$from_name  = sanitize_text_field( $params['from_name'] ?? '' );
		$from_email = sanitize_email( $params['from_email'] );
		$html       = (string) ( $params['html'] ?? '' );
		$text       = (string) ( $params['text'] ?? '' );

		if ( '' === $html && '' === $text ) {
			return Result::failure( __( 'Empty email body.', 'mailyard' ) );
		}

		$wrap = function ( $e ) { return array( 'Email' => $e ); };
		$from = array( 'Email' => $from_email );
		if ( $from_name ) {
			$from['Name'] = $from_name;
		}

		$message = array(
			'From'    => $from,
			'To'      => array_map( $wrap, Recipients::split( $params['to'] ) ),
			'Subject' => sanitize_text_field( $params['subject'] ),
		);
		if ( '' !== $html ) {
			$message['HTMLPart'] = $html;
		} else {
			$message['TextPart'] = $text;
		}

		$cc  = Recipients::split( $params['cc'] ?? array() );
		$bcc = Recipients::split( $params['bcc'] ?? array() );
		if ( $cc ) {
			$message['Cc'] = array_map( $wrap, $cc );
		}
		if ( $bcc ) {
			$message['Bcc'] = array_map( $wrap, $bcc );
		}
		if ( ! empty( $params['reply_to'] ) ) {
			$message['ReplyTo'] = array( 'Email' => sanitize_email( $params['reply_to'] ) );
		}
		if ( ! empty( $params['headers'] ) ) {
			$message['Headers'] = (object) array_map( 'strval', $params['headers'] );
		}
		if ( ! empty( $params['attachments'] ) ) {
			$message['Attachments'] = array_map( function ( $a ) {
				return array(
					'ContentType'   => $a['mime'],
					'Filename'      => $a['filename'],
					'Base64Content' => $a['content_base64'],
				);
			}, $params['attachments'] );
		}

		$response = wp_remote_post( 'https://api.mailjet.com/v3.1/send', array(
			'headers' => array(
				'Authorization' => 'Basic ' . base64_encode( $this->api_key . ':' . $this->secret_key ), // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode
				'Content-Type'  => 'application/json',
			),
			'body'    => wp_json_encode( array( 'Messages' => array( $message ) ) ),
			'timeout' => 30,
		) );

		if ( is_wp_error( $response ) ) {
			return Result::failure( $response->get_error_message() );
		}

		$code    = (int) wp_remote_retrieve_response_code( $response );
		$decoded = json_decode( wp_remote_retrieve_body( $response ), true );
		$result  = is_array( $decoded ) && is_array( $decoded['Messages'][0] ?? null ) ? $decoded['Messages'][0] : array();

		if ( 200 === $code && 'success' === ( $result['Status'] ?? '' ) ) {
			return Result::success( (string) ( $result['To'][0]['MessageID'] ?? '' ) );
		}

		// Per-message validation errors, or a top-level error (bad keys).
		$messages = array();
		foreach ( (array) ( $result['Errors'] ?? array() ) as $e ) {
			if ( is_array( $e ) && ! empty( $e['ErrorMessage'] ) ) {
				$messages[] = (string) $e['ErrorMessage'];
			}
		}
		if ( ! $messages && is_array( $decoded ) && ! empty( $decoded['ErrorMessage'] ) ) {
			$messages[] = (string) $decoded['ErrorMessage'];
		}

		$error = $messages
			? implode( '; ', $messages )
			/* translators: %d: HTTP status code returned by the Mailjet API. */
			: sprintf( __( 'Mailjet error (HTTP %d)', 'mailyard' ), $code );
		return Result::failure( sanitize_text_field( $error ) );
	}

	public function get_name(): string { return 'mailjet'; }
	public function get_label(): string { return __( 'Mailjet', 'mailyard' ); }

	public function get_fields(): array {
		return array(
			array( 'key' => 'api_key', 'label' => __( 'API Key', 'mailyard' ), 'type' => 'password', 'required' => true ),
			array( 'key' => 'secret_key', 'label' => __( 'Secret Key', 'mailyard' ), 'type' => 'password', 'required' => true ),
		);
	}
}
