<?php
namespace MoolMail\ESP;

defined( 'ABSPATH' ) || exit;

// Custom SMTP — configures WordPress PHPMailer for external SMTP servers.
class SMTP implements Provider {

	private $config = array();

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
	}

	public function send( array $params ): Result {
		add_action( 'phpmailer_init', array( $this, 'configure_phpmailer' ) );

		$headers = array(
			'Content-Type: text/html; charset=UTF-8',
			'From: ' . sanitize_text_field( $params['from_name'] ) . ' <' . sanitize_email( $params['from_email'] ) . '>',
		);

		if ( ! empty( $params['reply_to'] ) ) {
			$headers[] = 'Reply-To: ' . sanitize_email( $params['reply_to'] );
		}

		$sent = wp_mail( sanitize_email( $params['to'] ), sanitize_text_field( $params['subject'] ), $params['html'], $headers );

		remove_action( 'phpmailer_init', array( $this, 'configure_phpmailer' ) );

		if ( ! $sent ) {
			global $phpmailer;
			$error = isset( $phpmailer->ErrorInfo ) ? $phpmailer->ErrorInfo : '';
			return Result::failure( $error ?: __( 'SMTP send failed.', 'moolmail' ) );
		}

		return Result::success();
	}

	public function get_name(): string { return 'smtp'; }
	public function get_label(): string { return __( 'Custom SMTP', 'moolmail' ); }

	public function get_fields(): array {
		return array(
			array( 'key' => 'host', 'label' => __( 'SMTP Host', 'moolmail' ), 'type' => 'text', 'required' => true ),
			array( 'key' => 'port', 'label' => __( 'Port', 'moolmail' ), 'type' => 'number', 'required' => true, 'default' => 587 ),
			array( 'key' => 'encryption', 'label' => __( 'Encryption', 'moolmail' ), 'type' => 'select', 'default' => 'tls', 'options' => array( 'tls' => 'TLS', 'ssl' => 'SSL', 'none' => 'None' ) ),
			array( 'key' => 'username', 'label' => __( 'Username', 'moolmail' ), 'type' => 'text' ),
			array( 'key' => 'password', 'label' => __( 'Password', 'moolmail' ), 'type' => 'password' ),
		);
	}
}
