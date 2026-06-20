<?php
namespace Mailyard\ESP;

defined( 'ABSPATH' ) || exit;

// Default provider — uses wp_mail() without modification.
class PHPMailer implements Provider {

	public function connect( array $config ): bool {
		return true;
	}

	public function send( array $params ): Result {
		$headers = array(
			'Content-Type: text/html; charset=UTF-8',
			'From: ' . sanitize_text_field( $params['from_name'] ) . ' <' . sanitize_email( $params['from_email'] ) . '>',
		);

		if ( ! empty( $params['reply_to'] ) ) {
			$headers[] = 'Reply-To: ' . sanitize_email( $params['reply_to'] );
		}

		$sent = wp_mail(
			sanitize_email( $params['to'] ),
			sanitize_text_field( $params['subject'] ),
			$params['html'],
			$headers
		);

		if ( ! $sent ) {
			global $phpmailer;
			$error = isset( $phpmailer->ErrorInfo ) ? $phpmailer->ErrorInfo : '';
			return Result::failure( $error ?: __( 'wp_mail() failed.', 'mailyard' ) );
		}

		return Result::success();
	}

	public function get_name(): string { return 'phpmailer'; }
	public function get_label(): string { return __( 'Default (PHP)', 'mailyard' ); }
	public function get_fields(): array { return array(); }
}
