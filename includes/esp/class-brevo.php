<?php
namespace Mailyard\ESP;

defined( 'ABSPATH' ) || exit;

// Brevo (formerly Sendinblue) — sends via the Transactional Email API.
// Docs: https://developers.brevo.com/reference/sendtransacemail
class Brevo implements Provider {

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

		$sender = array( 'email' => $from_email );
		if ( $from_name ) {
			$sender['name'] = $from_name;
		}

		$body = array(
			'sender'  => $sender,
			'to'      => array( array( 'email' => sanitize_email( $params['to'] ) ) ),
			'subject' => sanitize_text_field( $params['subject'] ),
		);

		if ( '' !== $html ) {
			$body['htmlContent'] = $html;
			$body['textContent'] = wp_strip_all_tags( $html );
		} elseif ( '' !== $text ) {
			$body['textContent'] = $text;
		} else {
			return Result::failure( __( 'Empty email body.', 'mailyard' ) );
		}

		if ( ! empty( $params['reply_to'] ) ) {
			$body['replyTo'] = array( 'email' => sanitize_email( $params['reply_to'] ) );
		}
		if ( ! empty( $params['cc'] ) ) {
			$body['cc'] = array_map( function ( $e ) { return array( 'email' => $e ); }, $params['cc'] );
		}
		if ( ! empty( $params['bcc'] ) ) {
			$body['bcc'] = array_map( function ( $e ) { return array( 'email' => $e ); }, $params['bcc'] );
		}
		if ( ! empty( $params['attachments'] ) ) {
			$body['attachment'] = array_map( function ( $a ) {
				return array(
					'name'    => $a['filename'],
					'content' => $a['content_base64'],
				);
			}, $params['attachments'] );
		}

		$response = wp_remote_post( 'https://api.brevo.com/v3/smtp/email', array(
			'headers' => array(
				'api-key'      => $this->api_key,
				'Content-Type' => 'application/json',
				'Accept'       => 'application/json',
			),
			'body'    => wp_json_encode( $body ),
			'timeout' => 30,
		) );

		if ( is_wp_error( $response ) ) {
			return Result::failure( $response->get_error_message() );
		}

		$code    = (int) wp_remote_retrieve_response_code( $response );
		$decoded = json_decode( wp_remote_retrieve_body( $response ), true );

		// 201 Created on success; everything else is an error with { code, message } body.
		if ( 201 !== $code ) {
			$error = is_array( $decoded ) && isset( $decoded['message'] )
				? sanitize_text_field( $decoded['message'] )
				: sprintf( __( 'Brevo error (HTTP %d)', 'mailyard' ), $code );
			return Result::failure( $error );
		}

		return Result::success( is_array( $decoded ) ? ( $decoded['messageId'] ?? '' ) : '' );
	}

	public function get_name(): string { return 'brevo'; }
	public function get_label(): string { return __( 'Brevo', 'mailyard' ); }

	public function get_fields(): array {
		return array(
			array( 'key' => 'api_key', 'label' => __( 'API Key', 'mailyard' ), 'type' => 'password', 'required' => true ),
		);
	}
}
