<?php
namespace Mailyard\ESP;

defined( 'ABSPATH' ) || exit;

// MailerSend — sends via the v1 Email API.
// Docs: https://developers.mailersend.com/api/v1/email.html
class MailerSend implements Provider {

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

		$wrap = function ( $e ) { return array( 'email' => $e ); };
		$from = array( 'email' => $from_email );
		if ( $from_name ) {
			$from['name'] = $from_name;
		}

		$body = array(
			'from'    => $from,
			'to'      => array_map( $wrap, Recipients::split( $params['to'] ) ),
			'subject' => sanitize_text_field( $params['subject'] ),
		);
		if ( '' !== $html ) {
			$body['html'] = $html;
		} else {
			$body['text'] = $text;
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
			$body['reply_to'] = array( 'email' => sanitize_email( $params['reply_to'] ) );
		}
		// Custom headers are deliberately not sent: MailerSend only accepts the
		// `headers` field on Professional/Enterprise plans and rejects the whole
		// email otherwise — losing an X- header beats losing the email.
		if ( ! empty( $params['attachments'] ) ) {
			$body['attachments'] = array_map( function ( $a ) {
				return array(
					'content'     => $a['content_base64'],
					'filename'    => $a['filename'],
					'disposition' => 'attachment',
				);
			}, $params['attachments'] );
		}

		$response = wp_remote_post( 'https://api.mailersend.com/v1/email', array(
			'headers' => array(
				'Authorization'    => 'Bearer ' . $this->api_key,
				'Content-Type'     => 'application/json',
				'Accept'           => 'application/json',
				'X-Requested-With' => 'XMLHttpRequest',
			),
			'body'    => wp_json_encode( $body ),
			'timeout' => 30,
		) );

		if ( is_wp_error( $response ) ) {
			return Result::failure( $response->get_error_message() );
		}

		$code = (int) wp_remote_retrieve_response_code( $response );

		if ( 202 !== $code ) {
			$decoded = json_decode( wp_remote_retrieve_body( $response ), true );
			$error   = is_array( $decoded ) && ! empty( $decoded['message'] ) ? (string) $decoded['message'] : '';

			// Field errors: { "from.email": [ "…" ] } — add the first if the
			// summary doesn't already say it.
			$first = '';
			foreach ( (array) ( is_array( $decoded ) ? ( $decoded['errors'] ?? array() ) : array() ) as $list ) {
				$first = is_array( $list ) ? (string) reset( $list ) : (string) $list;
				break;
			}
			if ( '' !== $first && false === strpos( $error, $first ) ) {
				$error = trim( $error . ' ' . $first );
			}

			if ( '' === $error ) {
				/* translators: %d: HTTP status code returned by the MailerSend API. */
				$error = sprintf( __( 'MailerSend error (HTTP %d)', 'mailyard' ), $code );
			}
			return Result::failure( sanitize_text_field( $error ) );
		}

		return Result::success( (string) wp_remote_retrieve_header( $response, 'x-message-id' ) );
	}

	public function get_name(): string { return 'mailersend'; }
	public function get_label(): string { return __( 'MailerSend', 'mailyard' ); }

	public function get_fields(): array {
		return array(
			array( 'key' => 'api_key', 'label' => __( 'API Token', 'mailyard' ), 'type' => 'password', 'required' => true ),
		);
	}
}
