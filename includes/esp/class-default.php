<?php
namespace Mailyard\ESP;

defined( 'ABSPATH' ) || exit;

// PHP mail — hands the message to WordPress's own PHPMailer (the web host's
// mail server). No setup, which makes it the zero-config backup at the end of
// a chain. Custom SMTP extends this and only adds the server settings.
class Default_Mail implements Provider {

	// Attachments for the in-flight send, applied via phpmailer_init
	// (wp_mail() only accepts file paths; normalized attachments are in memory).
	private $pending_attachments = array();

	public function connect( array $config ): bool {
		return true;
	}

	// phpmailer_init callback for the in-flight send.
	public function configure_phpmailer( $phpmailer ) {
		foreach ( $this->pending_attachments as $a ) {
			$phpmailer->addStringAttachment(
				base64_decode( $a['content_base64'] ), // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode
				$a['filename'],
				'base64',
				$a['mime']
			);
		}
	}

	public function send( array $params ): Result {
		$is_html = ! empty( $params['html'] );
		$body    = $is_html ? $params['html'] : ( $params['text'] ?? '' );

		$from = ! empty( $params['from_name'] )
			? sanitize_text_field( $params['from_name'] ) . ' <' . sanitize_email( $params['from_email'] ) . '>'
			: sanitize_email( $params['from_email'] );

		$headers = array(
			'Content-Type: ' . ( $is_html ? 'text/html' : 'text/plain' ) . '; charset=UTF-8',
			'From: ' . $from,
		);
		if ( ! empty( $params['reply_to'] ) ) {
			$headers[] = 'Reply-To: ' . sanitize_email( $params['reply_to'] );
		}
		foreach ( (array) ( $params['cc'] ?? array() ) as $cc ) {
			$headers[] = 'Cc: ' . sanitize_email( $cc );
		}
		foreach ( (array) ( $params['bcc'] ?? array() ) as $bcc ) {
			$headers[] = 'Bcc: ' . sanitize_email( $bcc );
		}
		foreach ( (array) ( $params['headers'] ?? array() ) as $name => $value ) {
			$headers[] = $name . ': ' . str_replace( array( "\r", "\n" ), ' ', (string) $value );
		}

		$this->pending_attachments = is_array( $params['attachments'] ?? null ) ? $params['attachments'] : array();
		add_action( 'phpmailer_init', array( $this, 'configure_phpmailer' ) );

		$sent = wp_mail( Recipients::split( $params['to'] ), sanitize_text_field( $params['subject'] ), $body, $headers );

		remove_action( 'phpmailer_init', array( $this, 'configure_phpmailer' ) );
		$this->pending_attachments = array();

		if ( ! $sent ) {
			global $phpmailer;
			$error = isset( $phpmailer->ErrorInfo ) ? $phpmailer->ErrorInfo : '';
			return Result::failure( $error ?: $this->failure_message() );
		}

		return Result::success();
	}

	protected function failure_message(): string {
		return __( 'wp_mail() failed.', 'mailyard' );
	}

	public function get_name(): string { return 'phpmailer'; }
	public function get_label(): string { return __( 'PHP Mail', 'mailyard' ); }
	public function get_fields(): array { return array(); }
}
