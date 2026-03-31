<?php
defined( 'ABSPATH' ) || exit;

/**
 * Resend provider.
 */
class Starter_SMTP_Resend implements Starter_SMTP_ESP_Interface {

	/** @var string */
	private $api_key = '';

	/** @inheritDoc */
	public function connect( $config ) {
		$this->api_key = isset( $config['api_key'] ) ? sanitize_text_field( $config['api_key'] ) : '';
		return ! empty( $this->api_key );
	}

	/** @inheritDoc */
	public function send( $params ) {
		$from_name  = ! empty( $params['from_name'] ) ? sanitize_text_field( $params['from_name'] ) : '';
		$from_email = sanitize_email( $params['from_email'] );
		$from       = $from_name ? $from_name . ' <' . $from_email . '>' : $from_email;

		$body = array(
			'from'    => $from,
			'to'      => array( sanitize_email( $params['to'] ) ),
			'subject' => sanitize_text_field( $params['subject'] ),
			'html'    => $params['html'],
			'tags'    => array(
				array(
					'name'  => 'category',
					'value' => 'transactional',
				),
			),
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
			return Starter_SMTP_Result::failure( $response->get_error_message() );
		}

		$code    = wp_remote_retrieve_response_code( $response );
		$decoded = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( 200 !== (int) $code ) {
			$message = isset( $decoded['message'] ) ? $decoded['message'] : __( 'Unknown Resend error.', 'starter-smtp' );
			return Starter_SMTP_Result::failure( $message );
		}

		return Starter_SMTP_Result::success( isset( $decoded['id'] ) ? $decoded['id'] : '' );
	}

	/** @inheritDoc */
	public function get_name() {
		return 'resend';
	}

	/** @inheritDoc */
	public function get_label() {
		return __( 'Resend', 'starter-smtp' );
	}

	/** @inheritDoc */
	public function get_fields() {
		return array(
			array(
				'key'      => 'api_key',
				'label'    => __( 'API Key', 'starter-smtp' ),
				'type'     => 'password',
				'required' => true,
			),
		);
	}
}
