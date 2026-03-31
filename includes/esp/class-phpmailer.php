<?php
defined( 'ABSPATH' ) || exit;

/**
 * Default provider — uses wp_mail() directly without modification.
 */
class Starter_SMTP_PHPMailer implements Starter_SMTP_ESP_Interface {

	/** @inheritDoc */
	public function connect( $config ) {
		return true;
	}

	/** @inheritDoc */
	public function send( $params ) {
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
			$error = '';
			if ( isset( $phpmailer ) && is_object( $phpmailer ) && ! empty( $phpmailer->ErrorInfo ) ) {
				$error = $phpmailer->ErrorInfo;
			}
			return Starter_SMTP_Result::failure( $error ? $error : __( 'wp_mail() failed.', 'starter-smtp' ) );
		}

		return Starter_SMTP_Result::success();
	}

	/** @inheritDoc */
	public function get_name() {
		return 'phpmailer';
	}

	/** @inheritDoc */
	public function get_label() {
		return __( 'Default (PHP)', 'starter-smtp' );
	}

	/** @inheritDoc */
	public function get_fields() {
		return array();
	}
}
