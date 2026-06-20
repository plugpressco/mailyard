<?php
namespace Mailyard\ESP;

defined( 'ABSPATH' ) || exit;

// Custom SMTP — configures WordPress PHPMailer for external SMTP servers.
class SMTP implements Provider {

	private $config = array();

	// Attachments for the in-flight send, applied via the phpmailer_init callback
	// (wp_mail() only accepts file paths; our normalized attachments are in memory).
	private $pending_attachments = array();

	public function connect( array $config ): bool {
		$this->config = array(
			'host'       => sanitize_text_field( $config['host'] ?? '' ),
			'port'       => absint( $config['port'] ?? 587 ),
			'encryption' => sanitize_text_field( $config['encryption'] ?? 'tls' ),
			'username'   => sanitize_text_field( $config['username'] ?? '' ),
			'password'   => $config['password'] ?? '',
		);
		return ! empty( $this->config['host'] );
	}

	// Configures PHPMailer instance — used as phpmailer_init callback.
	public function configure_phpmailer( $phpmailer ) {
		$phpmailer->isSMTP();
		$phpmailer->Host       = $this->config['host'];
		$phpmailer->Port       = $this->config['port'];
		$phpmailer->SMTPSecure = $this->config['encryption'];

		if ( ! empty( $this->config['username'] ) ) {
			$phpmailer->SMTPAuth = true;
			$phpmailer->Username = $this->config['username'];
			$phpmailer->Password = $this->config['password'];
		}

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

		$this->pending_attachments = is_array( $params['attachments'] ?? null ) ? $params['attachments'] : array();
		add_action( 'phpmailer_init', array( $this, 'configure_phpmailer' ) );

		$content_type = $is_html ? 'text/html' : 'text/plain';
		$headers      = array(
			'Content-Type: ' . $content_type . '; charset=UTF-8',
			'From: ' . sanitize_text_field( $params['from_name'] ) . ' <' . sanitize_email( $params['from_email'] ) . '>',
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

		$sent = wp_mail( sanitize_email( $params['to'] ), sanitize_text_field( $params['subject'] ), $body, $headers );

		remove_action( 'phpmailer_init', array( $this, 'configure_phpmailer' ) );
		$this->pending_attachments = array();

		if ( ! $sent ) {
			global $phpmailer;
			$error = isset( $phpmailer->ErrorInfo ) ? $phpmailer->ErrorInfo : '';
			return Result::failure( $error ?: __( 'SMTP send failed.', 'mailyard' ) );
		}

		return Result::success();
	}

	public function get_name(): string { return 'smtp'; }
	public function get_label(): string { return __( 'Custom SMTP', 'mailyard' ); }

	public function get_fields(): array {
		return array(
			array( 'key' => 'host', 'label' => __( 'SMTP Host', 'mailyard' ), 'type' => 'text', 'required' => true ),
			array( 'key' => 'port', 'label' => __( 'Port', 'mailyard' ), 'type' => 'number', 'required' => true, 'default' => 587 ),
			array( 'key' => 'encryption', 'label' => __( 'Encryption', 'mailyard' ), 'type' => 'select', 'default' => 'tls', 'options' => array( 'tls' => 'TLS', 'ssl' => 'SSL', 'none' => 'None' ) ),
			array( 'key' => 'username', 'label' => __( 'Username', 'mailyard' ), 'type' => 'text' ),
			array( 'key' => 'password', 'label' => __( 'Password', 'mailyard' ), 'type' => 'password' ),
		);
	}
}
