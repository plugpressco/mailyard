<?php
namespace Mailyard\ESP;

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
			'MessageStream' => $this->stream,
		);

		if ( ! empty( $params['html'] ) ) {
			$payload['HtmlBody'] = $params['html'];
		}
		if ( ! empty( $params['text'] ) ) {
			$payload['TextBody'] = $params['text'];
		}
		if ( empty( $payload['HtmlBody'] ) && empty( $payload['TextBody'] ) ) {
			return Result::failure( __( 'Empty email body.', 'mailyard' ) );
		}

		if ( ! empty( $params['reply_to'] ) ) {
			$payload['ReplyTo'] = sanitize_email( $params['reply_to'] );
		}

		if ( ! empty( $params['cc'] ) ) {
			$payload['Cc'] = implode( ', ', $params['cc'] );
		}
		if ( ! empty( $params['bcc'] ) ) {
			$payload['Bcc'] = implode( ', ', $params['bcc'] );
		}
		if ( ! empty( $params['attachments'] ) ) {
			$payload['Attachments'] = array_map( function ( $a ) {
				return array(
					'Name'        => $a['filename'],
					'Content'     => $a['content_base64'],
					'ContentType' => $a['mime'],
				);
			}, $params['attachments'] );
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
			return Result::failure( __( 'Invalid response from Postmark.', 'mailyard' ) );
		}

		if ( 200 !== (int) $code ) {
			return Result::failure( sanitize_text_field( $body['Message'] ?? __( 'Unknown Postmark error.', 'mailyard' ) ) );
		}

		return Result::success( $body['MessageID'] ?? '' );
	}

	public function get_name(): string { return 'postmark'; }
	public function get_label(): string { return __( 'Postmark', 'mailyard' ); }

	public function get_fields(): array {
		// Message Stream is derived from the connection's purpose (marketing →
		// broadcast, otherwise transactional) — see Manager::build_entries().
		return array(
			array( 'key' => 'api_key', 'label' => __( 'Server Token', 'mailyard' ), 'type' => 'password', 'required' => true ),
		);
	}
}
