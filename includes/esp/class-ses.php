<?php
defined( 'ABSPATH' ) || exit;

/**
 * Amazon SES provider — sends via SES v2 API using raw HTTP (no AWS SDK needed).
 */
class Starter_SMTP_SES implements Starter_SMTP_ESP_Interface {

	/** @var string */
	private $access_key = '';

	/** @var string */
	private $secret_key = '';

	/** @var string */
	private $region = 'us-east-1';

	/** @inheritDoc */
	public function connect( $config ) {
		$this->access_key = isset( $config['access_key'] ) ? $config['access_key'] : '';
		$this->secret_key = isset( $config['secret_key'] ) ? $config['secret_key'] : '';
		$this->region     = isset( $config['region'] ) && $config['region'] ? $config['region'] : 'us-east-1';

		return ! empty( $this->access_key ) && ! empty( $this->secret_key );
	}

	/** @inheritDoc */
	public function send( $params ) {
		$to         = sanitize_email( $params['to'] );
		$subject    = sanitize_text_field( $params['subject'] );
		$html       = $params['html'];
		$from_name  = sanitize_text_field( $params['from_name'] );
		$from_email = sanitize_email( $params['from_email'] );

		$from = $from_name ? "=?UTF-8?B?" . base64_encode( $from_name ) . "?= <{$from_email}>" : $from_email;

		// Build raw MIME message.
		$boundary = wp_generate_password( 16, false );
		$raw      = "From: {$from}\r\n"
			. "To: {$to}\r\n"
			. "Subject: =?UTF-8?B?" . base64_encode( $subject ) . "?=\r\n"
			. "MIME-Version: 1.0\r\n"
			. "Content-Type: multipart/alternative; boundary=\"{$boundary}\"\r\n\r\n"
			. "--{$boundary}\r\n"
			. "Content-Type: text/plain; charset=UTF-8\r\n"
			. "Content-Transfer-Encoding: 7bit\r\n\r\n"
			. wp_strip_all_tags( $html ) . "\r\n\r\n"
			. "--{$boundary}\r\n"
			. "Content-Type: text/html; charset=UTF-8\r\n"
			. "Content-Transfer-Encoding: 7bit\r\n\r\n"
			. $html . "\r\n\r\n"
			. "--{$boundary}--";

		if ( ! empty( $params['reply_to'] ) ) {
			$raw = "Reply-To: " . sanitize_email( $params['reply_to'] ) . "\r\n" . $raw;
		}

		$payload = wp_json_encode( array(
			'Content' => array(
				'Raw' => array(
					'Data' => base64_encode( $raw ),
				),
			),
		) );

		$host     = "email.{$this->region}.amazonaws.com";
		$endpoint = "https://{$host}/v2/email/outbound-emails";
		$datetime = gmdate( 'Ymd\THis\Z' );
		$date     = gmdate( 'Ymd' );

		// AWS Signature Version 4.
		$headers = array(
			'content-type' => 'application/json',
			'host'         => $host,
			'x-amz-date'   => $datetime,
		);

		$canonical_headers = '';
		$signed_headers    = '';
		ksort( $headers );
		foreach ( $headers as $k => $v ) {
			$canonical_headers .= $k . ':' . $v . "\n";
			$signed_headers    .= ( $signed_headers ? ';' : '' ) . $k;
		}

		$payload_hash      = hash( 'sha256', $payload );
		$canonical_request = "POST\n/v2/email/outbound-emails\n\n{$canonical_headers}\n{$signed_headers}\n{$payload_hash}";

		$credential_scope = "{$date}/{$this->region}/ses/aws4_request";
		$string_to_sign   = "AWS4-HMAC-SHA256\n{$datetime}\n{$credential_scope}\n" . hash( 'sha256', $canonical_request );

		$signing_key = hash_hmac( 'sha256', 'aws4_request',
			hash_hmac( 'sha256', 'ses',
				hash_hmac( 'sha256', $this->region,
					hash_hmac( 'sha256', $date, 'AWS4' . $this->secret_key, true ),
				true ),
			true ),
		true );

		$signature     = hash_hmac( 'sha256', $string_to_sign, $signing_key );
		$authorization = "AWS4-HMAC-SHA256 Credential={$this->access_key}/{$credential_scope}, SignedHeaders={$signed_headers}, Signature={$signature}";

		$response = wp_remote_post( $endpoint, array(
			'timeout' => 30,
			'headers' => array(
				'Content-Type'  => 'application/json',
				'X-Amz-Date'   => $datetime,
				'Authorization' => $authorization,
			),
			'body'    => $payload,
		) );

		if ( is_wp_error( $response ) ) {
			return Starter_SMTP_Result::failure( $response->get_error_message() );
		}

		$code = wp_remote_retrieve_response_code( $response );
		$body = wp_remote_retrieve_body( $response );

		if ( $code >= 200 && $code < 300 ) {
			$data       = json_decode( $body, true );
			$message_id = isset( $data['MessageId'] ) ? $data['MessageId'] : '';
			return Starter_SMTP_Result::success( $message_id );
		}

		$data  = json_decode( $body, true );
		$error = isset( $data['message'] ) ? $data['message'] : "SES error (HTTP {$code})";
		return Starter_SMTP_Result::failure( $error );
	}

	/** @inheritDoc */
	public function get_name() {
		return 'ses';
	}

	/** @inheritDoc */
	public function get_label() {
		return __( 'Amazon SES', 'starter-smtp' );
	}

	/** @inheritDoc */
	public function get_fields() {
		return array(
			array(
				'key'      => 'access_key',
				'label'    => __( 'Access Key ID', 'starter-smtp' ),
				'type'     => 'text',
				'required' => true,
			),
			array(
				'key'      => 'secret_key',
				'label'    => __( 'Secret Access Key', 'starter-smtp' ),
				'type'     => 'password',
				'required' => true,
			),
			array(
				'key'      => 'region',
				'label'    => __( 'Region', 'starter-smtp' ),
				'type'     => 'select',
				'required' => true,
				'options'  => array(
					'us-east-1'      => 'US East (N. Virginia)',
					'us-east-2'      => 'US East (Ohio)',
					'us-west-1'      => 'US West (N. California)',
					'us-west-2'      => 'US West (Oregon)',
					'af-south-1'     => 'Africa (Cape Town)',
					'ap-south-1'     => 'Asia Pacific (Mumbai)',
					'ap-northeast-1' => 'Asia Pacific (Tokyo)',
					'ap-northeast-2' => 'Asia Pacific (Seoul)',
					'ap-northeast-3' => 'Asia Pacific (Osaka)',
					'ap-southeast-1' => 'Asia Pacific (Singapore)',
					'ap-southeast-2' => 'Asia Pacific (Sydney)',
					'ap-southeast-3' => 'Asia Pacific (Jakarta)',
					'ca-central-1'   => 'Canada (Central)',
					'eu-central-1'   => 'Europe (Frankfurt)',
					'eu-west-1'      => 'Europe (Ireland)',
					'eu-west-2'      => 'Europe (London)',
					'eu-west-3'      => 'Europe (Paris)',
					'eu-south-1'     => 'Europe (Milan)',
					'eu-north-1'     => 'Europe (Stockholm)',
					'il-central-1'   => 'Israel (Tel Aviv)',
					'me-south-1'     => 'Middle East (Bahrain)',
					'me-central-1'   => 'Middle East (UAE)',
					'sa-east-1'      => 'South America (São Paulo)',
				),
			),
		);
	}
}
