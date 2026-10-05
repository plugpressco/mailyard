<?php
namespace Mailyard\ESP;

defined( 'ABSPATH' ) || exit;

// SMTP2GO — sends via the v3 Email Send API.
// Docs: https://developers.smtp2go.com/reference/send-standard-email
class SMTP2GO implements Provider {

	private $api_key = '';

	public function connect( array $config ): bool {
		$this->api_key = sanitize_text_field( $config['api_key'] ?? '' );
		return ! empty( $this->api_key );
	}

	public function send( array $params ): Result {
		$from_name  = sanitize_text_field( $params['from_name'] ?? '' );
		$from_email = sanitize_email( $params['from_email'] );
		$html       = (string) ( $params['html'] ?? '' );
		$text       = (string) ( $params['text'] ?? '' );

		if ( '' === $html && '' === $text ) {
			return Result::failure( __( 'Empty email body.', 'mailyard' ) );
		}

		$body = array(
			'sender'  => $from_name ? "$from_name <$from_email>" : $from_email,
			'to'      => Recipients::split( $params['to'] ),
			'subject' => sanitize_text_field( $params['subject'] ),
		);
		if ( '' !== $html ) {
			$body['html_body'] = $html;
		} else {
			$body['text_body'] = $text;
		}

		$cc  = Recipients::split( $params['cc'] ?? array() );
		$bcc = Recipients::split( $params['bcc'] ?? array() );
		if ( $cc ) {
			$body['cc'] = $cc;
		}
		if ( $bcc ) {
			$body['bcc'] = $bcc;
		}

		// Reply-To has no field of its own here; it rides with the custom headers.
		$headers = array();
		if ( ! empty( $params['reply_to'] ) ) {
			$headers[] = array( 'header' => 'Reply-To', 'value' => sanitize_email( $params['reply_to'] ) );
		}
		foreach ( (array) ( $params['headers'] ?? array() ) as $name => $value ) {
			$headers[] = array( 'header' => $name, 'value' => (string) $value );
		}
		if ( $headers ) {
			$body['custom_headers'] = $headers;
		}

		if ( ! empty( $params['attachments'] ) ) {
			$body['attachments'] = array_map( function ( $a ) {
				return array(
					'filename' => $a['filename'],
					'fileblob' => $a['content_base64'],
					'mimetype' => $a['mime'],
				);
			}, $params['attachments'] );
		}

		$response = wp_remote_post( 'https://api.smtp2go.com/v3/email/send', array(
			'headers' => array(
				'X-Smtp2go-Api-Key' => $this->api_key,
				'Content-Type'      => 'application/json',
				'Accept'            => 'application/json',
			),
			'body'    => wp_json_encode( $body ),
			'timeout' => 30,
		) );

		if ( is_wp_error( $response ) ) {
			return Result::failure( $response->get_error_message() );
		}

		$code    = (int) wp_remote_retrieve_response_code( $response );
		$decoded = json_decode( wp_remote_retrieve_body( $response ), true );
		$data    = is_array( $decoded ) && is_array( $decoded['data'] ?? null ) ? $decoded['data'] : array();

		if ( 200 === $code && (int) ( $data['succeeded'] ?? 0 ) >= 1 ) {
			return Result::success( (string) ( $data['email_id'] ?? '' ) );
		}

		if ( ! empty( $data['error'] ) ) {
			$error = (string) $data['error'];
		} elseif ( ! empty( $data['failures'] ) && is_array( $data['failures'] ) ) {
			$error = implode( '; ', array_map( 'strval', $data['failures'] ) );
		} else {
			/* translators: %d: HTTP status code returned by the SMTP2GO API. */
			$error = sprintf( __( 'SMTP2GO error (HTTP %d)', 'mailyard' ), $code );
		}
		return Result::failure( sanitize_text_field( $error ) );
	}

	public function get_name(): string { return 'smtp2go'; }
	public function get_label(): string { return __( 'SMTP2GO', 'mailyard' ); }

	public function get_fields(): array {
		return array(
			array( 'key' => 'api_key', 'label' => __( 'API Key', 'mailyard' ), 'type' => 'password', 'required' => true ),
		);
	}
}
