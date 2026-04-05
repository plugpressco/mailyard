<?php
namespace MoolMail\ESP;

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
			'html'    => $params['html'],
			'tags'    => array( array( 'name' => 'category', 'value' => 'transactional' ) ),
		);

		if ( ! empty( $params['reply_to'] ) ) {
			$body['reply_to'] = array( sanitize_email( $params['reply_to'] ) );
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
			return Result::failure( __( 'Invalid response from Resend.', 'moolmail' ) );
		}

		if ( 200 !== (int) $code ) {
			return Result::failure( sanitize_text_field( $decoded['message'] ?? __( 'Unknown Resend error.', 'moolmail' ) ) );
		}

		return Result::success( $decoded['id'] ?? '' );
	}

	public function get_name(): string { return 'resend'; }
	public function get_label(): string { return __( 'Resend', 'moolmail' ); }

	public function get_fields(): array {
		return array(
			array( 'key' => 'api_key', 'label' => __( 'API Key', 'moolmail' ), 'type' => 'password', 'required' => true ),
		);
	}
}
