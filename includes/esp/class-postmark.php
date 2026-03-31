<?php
defined( 'ABSPATH' ) || exit;

/**
 * Postmark provider.
 *
 * Uses the transactional (outbound) stream since Starter SMTP handles
 * WordPress transactional emails, not marketing campaigns.
 */
class Starter_SMTP_Postmark implements Starter_SMTP_ESP_Interface {

	/** @var string */
	private $api_key = '';

	/** @var string */
	private $stream = 'outbound';

	/** @inheritDoc */
	public function connect( $config ) {
		$this->api_key = isset( $config['api_key'] ) ? sanitize_text_field( $config['api_key'] ) : '';
		$this->stream  = isset( $config['stream'] ) ? sanitize_text_field( $config['stream'] ) : 'outbound';
		return ! empty( $this->api_key );
	}

	/** @inheritDoc */
	public function send( $params ) {
		$from = ! empty( $params['from_name'] )
			? sanitize_text_field( $params['from_name'] ) . ' <' . sanitize_email( $params['from_email'] ) . '>'
			: sanitize_email( $params['from_email'] );

		$payload = array(
			'From'          => $from,
			'To'            => sanitize_email( $params['to'] ),
			'Subject'       => sanitize_text_field( $params['subject'] ),
			'HtmlBody'      => $params['html'],
			'MessageStream' => $this->stream,
		);

		if ( ! empty( $params['reply_to'] ) ) {
			$payload['ReplyTo'] = sanitize_email( $params['reply_to'] );
		}

		$response = wp_remote_post( 'https://api.postmarkapp.com/email', array(
			'headers' => array(
				'Accept'                  => 'application/json',
				'Content-Type'            => 'application/json',
				'X-Postmark-Server-Token' => $this->api_key,
			),
			'body'    => wp_json_encode( $payload ),
			'timeout' => 30,
		) );

		if ( is_wp_error( $response ) ) {
			return Starter_SMTP_Result::failure( $response->get_error_message() );
		}

		$code = wp_remote_retrieve_response_code( $response );
		$body = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( 200 !== (int) $code ) {
			$message = isset( $body['Message'] ) ? $body['Message'] : __( 'Unknown Postmark error.', 'starter-smtp' );
			return Starter_SMTP_Result::failure( $message );
		}

		return Starter_SMTP_Result::success( isset( $body['MessageID'] ) ? $body['MessageID'] : '' );
	}

	/** @inheritDoc */
	public function get_name() {
		return 'postmark';
	}

	/** @inheritDoc */
	public function get_label() {
		return __( 'Postmark', 'starter-smtp' );
	}

	/** @inheritDoc */
	public function get_fields() {
		return array(
			array(
				'key'      => 'api_key',
				'label'    => __( 'Server Token', 'starter-smtp' ),
				'type'     => 'password',
				'required' => true,
			),
			array(
				'key'     => 'stream',
				'label'   => __( 'Message Stream', 'starter-smtp' ),
				'type'    => 'select',
				'options' => array(
					'outbound'  => 'Transactional',
					'broadcast' => 'Broadcast',
				),
			),
		);
	}
}
