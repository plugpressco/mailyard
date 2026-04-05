<?php
namespace MoolMail\ESP;

defined( 'ABSPATH' ) || exit;

class Postmark implements Provider {

	private $api_key = '';
	private $stream  = 'outbound';

	public function connect( array $config ): bool {
		$this->api_key = sanitize_text_field( $config['api_key'] ?? '' );
		$this->stream  = sanitize_text_field( $config['stream'] ?? 'outbound' );
		return ! empty( $this->api_key );
	}

	public function send( array $params ): Result {
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
			return Result::failure( $response->get_error_message() );
		}

		$code = wp_remote_retrieve_response_code( $response );
		$body = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( ! is_array( $body ) ) {
			return Result::failure( __( 'Invalid response from Postmark.', 'moolmail' ) );
		}

		if ( 200 !== (int) $code ) {
			return Result::failure( sanitize_text_field( $body['Message'] ?? __( 'Unknown Postmark error.', 'moolmail' ) ) );
		}

		return Result::success( $body['MessageID'] ?? '' );
	}

	public function get_name(): string { return 'postmark'; }
	public function get_label(): string { return __( 'Postmark', 'moolmail' ); }

	public function get_fields(): array {
		return array(
			array( 'key' => 'api_key', 'label' => __( 'Server Token', 'moolmail' ), 'type' => 'password', 'required' => true ),
			array( 'key' => 'stream', 'label' => __( 'Message Stream', 'moolmail' ), 'type' => 'select', 'options' => array( 'outbound' => 'Transactional', 'broadcast' => 'Broadcast' ) ),
		);
	}
}
