<?php
namespace Mailyard\ESP;

defined( 'ABSPATH' ) || exit;

// Maileroo — sends via the v2 Email API with a Sending Key (Bearer).
// Docs: https://maileroo.com/docs/email-api/send-basic-email
class Maileroo implements Provider {

	// Maileroo refuses the whole email when the subject is longer.
	const MAX_SUBJECT = 255;

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

		// Maileroo's address shape is { address, display_name }.
		$wrap = function ( $e ) { return array( 'address' => $e ); };
		$from = array( 'address' => $from_email );
		if ( $from_name ) {
			$from['display_name'] = $from_name;
		}

		$subject = sanitize_text_field( $params['subject'] );
		if ( mb_strlen( $subject ) > self::MAX_SUBJECT ) {
			$subject = mb_substr( $subject, 0, self::MAX_SUBJECT );
		}

		$body = array(
			'from'    => $from,
			'to'      => array_map( $wrap, Recipients::split( $params['to'] ) ),
			'subject' => $subject,
		);
		if ( '' !== $html ) {
			$body['html'] = $html;
		} else {
			$body['plain'] = $text;
		}

		$cc  = Recipients::split( $params['cc'] ?? array() );
		$bcc = Recipients::split( $params['bcc'] ?? array() );
		if ( $cc ) {
			$body['cc'] = array_map( $wrap, $cc );
		}
		if ( $bcc ) {
			$body['bcc'] = array_map( $wrap, $bcc );
		}
		if ( ! empty( $params['reply_to'] ) ) {
			$body['reply_to'] = array( $wrap( sanitize_email( $params['reply_to'] ) ) );
		}
		// Custom headers are not sent: the v2 API documents no field for them.
		if ( ! empty( $params['attachments'] ) ) {
			$body['attachments'] = array_map( function ( $a ) {
				return array(
					'file_name'    => $a['filename'],
					'content_type' => $a['mime'],
					'content'      => $a['content_base64'],
				);
			}, $params['attachments'] );
		}

		$response = wp_remote_post( 'https://smtp.maileroo.com/api/v2/emails', array(
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

		$code    = (int) wp_remote_retrieve_response_code( $response );
		$decoded = json_decode( wp_remote_retrieve_body( $response ), true );

		// Maileroo can answer HTTP 200 with success:false (unverified domain,
		// bad recipient) — only success:true means the email was accepted.
		if ( $code >= 200 && $code < 300 && is_array( $decoded ) && true === ( $decoded['success'] ?? null ) ) {
			return Result::success( (string) ( $decoded['data']['reference_id'] ?? '' ) );
		}

		$error = is_array( $decoded ) && ! empty( $decoded['message'] )
			? sanitize_text_field( (string) $decoded['message'] )
			/* translators: %d: HTTP status code returned by the Maileroo API. */
			: sprintf( __( 'Maileroo error (HTTP %d)', 'mailyard' ), $code );
		return Result::failure( $error );
	}

	public function get_name(): string { return 'maileroo'; }
	public function get_label(): string { return __( 'Maileroo', 'mailyard' ); }

	public function get_fields(): array {
		return array(
			array( 'key' => 'api_key', 'label' => __( 'Sending Key', 'mailyard' ), 'type' => 'password', 'required' => true ),
		);
	}
}
