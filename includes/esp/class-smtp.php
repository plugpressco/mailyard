<?php
namespace Mailyard\ESP;

defined( 'ABSPATH' ) || exit;

// Custom SMTP — PHP mail pointed at an external SMTP server: the same wp_mail()
// send, with PHPMailer switched to SMTP in phpmailer_init.
class SMTP extends Default_Mail {

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

	public function configure_phpmailer( $phpmailer ) {
		$phpmailer->isSMTP();
		$phpmailer->Host       = $this->config['host'];
		$phpmailer->Port       = $this->config['port'];
		$phpmailer->SMTPSecure = 'none' === $this->config['encryption'] ? '' : $this->config['encryption'];
		// 'None' means none: PHPMailer otherwise upgrades to STARTTLS on its
		// own whenever the server offers it.
		$phpmailer->SMTPAutoTLS = 'none' !== $this->config['encryption'];

		if ( ! empty( $this->config['username'] ) ) {
			$phpmailer->SMTPAuth = true;
			$phpmailer->Username = $this->config['username'];
			$phpmailer->Password = $this->config['password'];
		}

		parent::configure_phpmailer( $phpmailer );
	}

	protected function failure_message(): string {
		return __( 'SMTP send failed.', 'mailyard' );
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
