<?php
namespace Mailyard\ESP;

defined( 'ABSPATH' ) || exit;

// Amazon SES — sends via SES v2 API with AWS Sig V4 (no SDK needed).
class SES implements Provider {

	private $access_key = '';
	private $secret_key = '';
	private $region     = 'us-east-1';

	public function connect( array $config ): bool {
		$this->access_key = $config['access_key'] ?? '';
		$this->secret_key = $config['secret_key'] ?? '';
		$this->region     = $config['region'] ?: 'us-east-1';
		return ! empty( $this->access_key ) && ! empty( $this->secret_key );
	}

	public function send( array $params ): Result {
		$to         = sanitize_email( $params['to'] );
		$subject    = sanitize_text_field( $params['subject'] );
		$html       = (string) ( $params['html'] ?? '' );
		$text       = (string) ( $params['text'] ?? '' );
		$from_name  = sanitize_text_field( $params['from_name'] );
		$from_email = sanitize_email( $params['from_email'] );
		$from       = $from_name ? '=?UTF-8?B?' . base64_encode( $from_name ) . "?= <$from_email>" : $from_email;

		if ( '' === $html && '' === $text ) {
			return Result::failure( __( 'Empty email body.', 'mailyard' ) );
		}

		$raw = $this->build_mime( $from, $to, $subject, $html, $text, $params );

		$payload  = wp_json_encode( array( 'Content' => array( 'Raw' => array( 'Data' => base64_encode( $raw ) ) ) ) );
		$host     = "email.{$this->region}.amazonaws.com";
		$endpoint = "https://{$host}/v2/email/outbound-emails";

		$response = wp_remote_post( $endpoint, array(
			'timeout' => 30,
			'headers' => $this->sign_request( $host, $payload ),
			'body'    => $payload,
		) );

		if ( is_wp_error( $response ) ) {
			return Result::failure( $response->get_error_message() );
		}

		$code = wp_remote_retrieve_response_code( $response );
		$body = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( $code >= 200 && $code < 300 ) {
			return Result::success( is_array( $body ) ? ( $body['MessageId'] ?? '' ) : '' );
		}

		$error = is_array( $body ) && isset( $body['message'] )
			? sanitize_text_field( $body['message'] )
			/* translators: %d: HTTP status code returned by the Amazon SES API. */
			: sprintf( __( 'SES error (HTTP %d)', 'mailyard' ), (int) $code );
		return Result::failure( $error );
	}

	// Build raw MIME.
	// - HTML only:          multipart/alternative (text auto-derived from html)
	// - Plain only:         text/plain
	// - Either + attachments: multipart/mixed wrapping the above
	private function build_mime( string $from, string $to, string $subject, string $html, string $text, array $params ): string {
		$reply_to    = $params['reply_to'] ?? '';
		$cc          = $params['cc'] ?? array();
		$bcc         = $params['bcc'] ?? array();
		$attachments = $params['attachments'] ?? array();

		$alt_boundary = wp_generate_password( 16, false );
		$mix_boundary = wp_generate_password( 16, false );

		// Common headers.
		$headers = "From: $from\r\nTo: $to\r\n";
		if ( ! empty( $cc ) ) {
			$headers .= 'Cc: ' . implode( ', ', array_map( 'sanitize_email', $cc ) ) . "\r\n";
		}
		if ( ! empty( $bcc ) ) {
			$headers .= 'Bcc: ' . implode( ', ', array_map( 'sanitize_email', $bcc ) ) . "\r\n";
		}
		if ( $reply_to ) {
			$headers .= 'Reply-To: ' . sanitize_email( $reply_to ) . "\r\n";
		}
		$headers .= 'Subject: =?UTF-8?B?' . base64_encode( $subject ) . "?=\r\nMIME-Version: 1.0\r\n";

		// Body (no attachments yet — that wrapping happens below).
		if ( '' !== $html ) {
			$body_type    = "multipart/alternative; boundary=\"$alt_boundary\"";
			$body_content = "--$alt_boundary\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 7bit\r\n\r\n"
				. wp_strip_all_tags( $html ) . "\r\n\r\n"
				. "--$alt_boundary\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: 7bit\r\n\r\n"
				. $html . "\r\n\r\n"
				. "--$alt_boundary--";
		} else {
			$body_type    = 'text/plain; charset=UTF-8';
			$body_content = $text;
		}

		if ( empty( $attachments ) ) {
			return $headers . "Content-Type: $body_type\r\n\r\n" . $body_content;
		}

		// Wrap whatever body we built in multipart/mixed and append attachments.
		$wrapped = "--$mix_boundary\r\nContent-Type: $body_type\r\n\r\n"
			. $body_content . "\r\n\r\n";

		foreach ( $attachments as $a ) {
			$wrapped .= "--$mix_boundary\r\n"
				. 'Content-Type: ' . $a['mime'] . '; name="' . $a['filename'] . "\"\r\n"
				. "Content-Transfer-Encoding: base64\r\n"
				. 'Content-Disposition: attachment; filename="' . $a['filename'] . "\"\r\n\r\n"
				. chunk_split( $a['content_base64'] ) . "\r\n";
		}
		$wrapped .= "--$mix_boundary--";

		return $headers
			. "Content-Type: multipart/mixed; boundary=\"$mix_boundary\"\r\n\r\n"
			. $wrapped;
	}

	// AWS Signature Version 4.
	private function sign_request( string $host, string $payload ): array {
		$datetime = gmdate( 'Ymd\THis\Z' );
		$date     = gmdate( 'Ymd' );

		$headers = array( 'content-type' => 'application/json', 'host' => $host, 'x-amz-date' => $datetime );
		ksort( $headers );

		$canonical_headers = '';
		$signed_headers    = '';
		foreach ( $headers as $k => $v ) {
			$canonical_headers .= "$k:$v\n";
			$signed_headers    .= ( $signed_headers ? ';' : '' ) . $k;
		}

		$payload_hash      = hash( 'sha256', $payload );
		$canonical_request = "POST\n/v2/email/outbound-emails\n\n$canonical_headers\n$signed_headers\n$payload_hash";
		$credential_scope  = "$date/{$this->region}/ses/aws4_request";
		$string_to_sign    = "AWS4-HMAC-SHA256\n$datetime\n$credential_scope\n" . hash( 'sha256', $canonical_request );

		$key = hash_hmac( 'sha256', 'aws4_request',
			hash_hmac( 'sha256', 'ses',
				hash_hmac( 'sha256', $this->region,
					hash_hmac( 'sha256', $date, 'AWS4' . $this->secret_key, true ),
				true ), true ), true );

		$sig = hash_hmac( 'sha256', $string_to_sign, $key );

		return array(
			'Content-Type'  => 'application/json',
			'X-Amz-Date'    => $datetime,
			'Authorization' => "AWS4-HMAC-SHA256 Credential={$this->access_key}/$credential_scope, SignedHeaders=$signed_headers, Signature=$sig",
		);
	}

	public function get_name(): string { return 'ses'; }
	public function get_label(): string { return __( 'Amazon SES', 'mailyard' ); }

	public function get_fields(): array {
		return array(
			array( 'key' => 'access_key', 'label' => __( 'Access Key ID', 'mailyard' ), 'type' => 'text', 'required' => true ),
			array( 'key' => 'secret_key', 'label' => __( 'Secret Access Key', 'mailyard' ), 'type' => 'password', 'required' => true ),
			array( 'key' => 'region', 'label' => __( 'Region', 'mailyard' ), 'type' => 'select', 'required' => true, 'options' => array(
				'us-east-1' => 'US East (N. Virginia)', 'us-east-2' => 'US East (Ohio)', 'us-west-2' => 'US West (Oregon)',
				'eu-west-1' => 'Europe (Ireland)', 'eu-central-1' => 'Europe (Frankfurt)', 'ap-south-1' => 'Asia Pacific (Mumbai)',
				'ap-southeast-1' => 'Asia Pacific (Singapore)', 'ap-northeast-1' => 'Asia Pacific (Tokyo)',
			) ),
		);
	}
}
