<?php
namespace Mailyard\ESP;

defined( 'ABSPATH' ) || exit;

class Resend implements Provider {

	private $api_key = '';

	public function connect( array $config ): bool {
		$this->api_key = sanitize_text_field( $config['api_key'] ?? '' );
		return ! empty( $this->api_key );
	}

	public function send( array $params ): Result {
		$from_name  = sanitize_text_field( $params['from_name'] ?? '' );
		$from_email = sanitize_email( $params['from_email'] );
		$from       = $from_name ? "$from_name <$from_email>" : $from_email;

		$body = array(
			'from'    => $from,
			'to'      => array( sanitize_email( $params['to'] ) ),
			'subject' => sanitize_text_field( $params['subject'] ),
			'tags'    => array( array( 'name' => 'category', 'value' => 'transactional' ) ),
		);

		if ( ! empty( $params['html'] ) ) {
			$body['html'] = $params['html'];
		}
		if ( ! empty( $params['text'] ) ) {
			$body['text'] = $params['text'];
		}
		if ( empty( $body['html'] ) && empty( $body['text'] ) ) {
			return Result::failure( __( 'Empty email body.', 'mailyard' ) );
		}

		if ( ! empty( $params['reply_to'] ) ) {
			$body['reply_to'] = array( sanitize_email( $params['reply_to'] ) );
		}
		if ( ! empty( $params['cc'] ) ) {
			$body['cc'] = $params['cc'];
		}
		if ( ! empty( $params['bcc'] ) ) {
			$body['bcc'] = $params['bcc'];
		}
		if ( ! empty( $params['attachments'] ) ) {
			$body['attachments'] = array_map( function ( $a ) {
				return array(
					'filename'     => $a['filename'],
					'content'      => $a['content_base64'],
					'content_type' => $a['mime'],
				);
			}, $params['attachments'] );
		}

		$response = wp_remote_post( 'https://api.resend.com/emails', array(
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

		$code    = wp_remote_retrieve_response_code( $response );
		$decoded = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( ! is_array( $decoded ) ) {
			return Result::failure( __( 'Invalid response from Resend.', 'mailyard' ) );
		}

		if ( 200 !== (int) $code ) {
			return Result::failure( sanitize_text_field( $decoded['message'] ?? __( 'Unknown Resend error.', 'mailyard' ) ) );
		}

		return Result::success( $decoded['id'] ?? '' );
	}

	public function get_name(): string { return 'resend'; }
	public function get_label(): string { return __( 'Resend', 'mailyard' ); }

	public function get_fields(): array {
		return array(
			array( 'key' => 'api_key', 'label' => __( 'API Key', 'mailyard' ), 'type' => 'password', 'required' => true ),
		);
	}
}
