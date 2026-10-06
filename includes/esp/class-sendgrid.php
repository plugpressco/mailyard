<?php
namespace Mailyard\ESP;

defined( 'ABSPATH' ) || exit;

// SendGrid — sends via the v3 Mail Send API.
// Docs: https://www.twilio.com/docs/sendgrid/api-reference/mail-send/mail-send
class SendGrid implements Provider {

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

		// SendGrid rejects an address that appears twice across to/cc/bcc.
		$to  = Recipients::split( $params['to'] );
		$cc  = array_values( array_diff( Recipients::split( $params['cc'] ?? array() ), $to ) );
		$bcc = array_values( array_diff( Recipients::split( $params['bcc'] ?? array() ), $to, $cc ) );

		$wrap            = function ( $e ) { return array( 'email' => $e ); };
		$personalization = array( 'to' => array_map( $wrap, $to ) );
		if ( $cc ) {
			$personalization['cc'] = array_map( $wrap, $cc );
		}
		if ( $bcc ) {
			$personalization['bcc'] = array_map( $wrap, $bcc );
		}

		$from = array( 'email' => $from_email );
		if ( $from_name ) {
			$from['name'] = $from_name;
		}

		$body = array(
			'personalizations' => array( $personalization ),
			'from'             => $from,
			'subject'          => sanitize_text_field( $params['subject'] ),
			'content'          => array(
				'' !== $html
					? array( 'type' => 'text/html', 'value' => $html )
					: array( 'type' => 'text/plain', 'value' => $text ),
			),
		);

		if ( ! empty( $params['reply_to'] ) ) {
			$body['reply_to'] = array( 'email' => sanitize_email( $params['reply_to'] ) );
		}
		if ( ! empty( $params['headers'] ) ) {
			$body['headers'] = (object) array_map( 'strval', $params['headers'] );
		}
		if ( ! empty( $params['attachments'] ) ) {
			$body['attachments'] = array_map( function ( $a ) {
				return array(
					'content'     => $a['content_base64'],
					'filename'    => $a['filename'],
					'type'        => $a['mime'],
					'disposition' => 'attachment',
				);
			}, $params['attachments'] );
		}

		$response = wp_remote_post( 'https://api.sendgrid.com/v3/mail/send', array(
			'headers' => array(
				'Authorization' => 'Bearer ' . $this->api_key,
				'Content-Type'  => 'application/json',
			),
			'body'    => wp_json_encode( $body ),
			'timeout' => 30,
		) );

		if ( is_wp_error( $response ) ) {
			return Result::failure( $response->get_error_message() );
		}

		$code = (int) wp_remote_retrieve_response_code( $response );

		if ( 202 !== $code ) {
			$decoded  = json_decode( wp_remote_retrieve_body( $response ), true );
			$messages = is_array( $decoded ) && ! empty( $decoded['errors'] ) && is_array( $decoded['errors'] )
				? array_filter( array_map( function ( $e ) { return is_array( $e ) ? (string) ( $e['message'] ?? '' ) : ''; }, $decoded['errors'] ) )
				: array();
			$error    = $messages
				? sanitize_text_field( implode( '; ', $messages ) )
				/* translators: %d: HTTP status code returned by the SendGrid API. */
				: sprintf( __( 'SendGrid error (HTTP %d)', 'mailyard' ), $code );
			return Result::failure( $error );
		}

		return Result::success( (string) wp_remote_retrieve_header( $response, 'x-message-id' ) );
	}

	public function get_name(): string { return 'sendgrid'; }
	public function get_label(): string { return __( 'SendGrid', 'mailyard' ); }

	public function get_fields(): array {
		return array(
			array( 'key' => 'api_key', 'label' => __( 'API Key', 'mailyard' ), 'type' => 'password', 'required' => true ),
		);
	}
}
