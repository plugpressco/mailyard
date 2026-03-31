<?php
defined( 'ABSPATH' ) || exit;

/**
 * Custom SMTP provider — configures WordPress PHPMailer to use an external SMTP server.
 */
class Starter_SMTP_SMTP implements Starter_SMTP_ESP_Interface {

	/** @var array */
	private $config = array();

	/** @inheritDoc */
	public function connect( $config ) {
		$this->config = array(
			'host'       => isset( $config['host'] ) ? sanitize_text_field( $config['host'] ) : '',
			'port'       => isset( $config['port'] ) ? absint( $config['port'] ) : 587,
			'encryption' => isset( $config['encryption'] ) ? sanitize_text_field( $config['encryption'] ) : 'tls',
			'username'   => isset( $config['username'] ) ? sanitize_text_field( $config['username'] ) : '',
			'password'   => isset( $config['password'] ) ? $config['password'] : '',
		);

		return ! empty( $this->config['host'] );
	}

	/** @inheritDoc */
	public function send( $params ) {
		$config = $this->config;

		// Hook into phpmailer_init to configure SMTP.
		$configure_smtp = function ( $phpmailer ) use ( $config ) {
			$phpmailer->isSMTP();
			$phpmailer->Host       = $config['host'];
			$phpmailer->Port       = $config['port'];
			$phpmailer->SMTPSecure = $config['encryption'];

			if ( ! empty( $config['username'] ) ) {
				$phpmailer->SMTPAuth = true;
				$phpmailer->Username = $config['username'];
				$phpmailer->Password = $config['password'];
			}
		};

		add_action( 'phpmailer_init', $configure_smtp );

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

		remove_action( 'phpmailer_init', $configure_smtp );

		if ( ! $sent ) {
			global $phpmailer;
			$error = '';
			if ( isset( $phpmailer ) && is_object( $phpmailer ) && ! empty( $phpmailer->ErrorInfo ) ) {
				$error = $phpmailer->ErrorInfo;
			}
			return Starter_SMTP_Result::failure( $error ? $error : __( 'SMTP send failed.', 'starter-smtp' ) );
		}

		return Starter_SMTP_Result::success();
	}

	/** @inheritDoc */
	public function get_name() {
		return 'smtp';
	}

	/** @inheritDoc */
	public function get_label() {
		return __( 'Other SMTP', 'starter-smtp' );
	}

	/** @inheritDoc */
	public function get_fields() {
		return array(
			array(
				'key'      => 'host',
				'label'    => __( 'SMTP Host', 'starter-smtp' ),
				'type'     => 'text',
				'required' => true,
			),
			array(
				'key'      => 'port',
				'label'    => __( 'Port', 'starter-smtp' ),
				'type'     => 'number',
				'required' => true,
				'default'  => 587,
			),
			array(
				'key'     => 'encryption',
				'label'   => __( 'Encryption', 'starter-smtp' ),
				'type'    => 'select',
				'default' => 'tls',
				'options' => array(
					'tls'  => 'TLS',
					'ssl'  => 'SSL',
					'none' => 'None',
				),
			),
			array(
				'key'   => 'username',
				'label' => __( 'Username', 'starter-smtp' ),
				'type'  => 'text',
			),
			array(
				'key'   => 'password',
				'label' => __( 'Password', 'starter-smtp' ),
				'type'  => 'password',
			),
		);
	}
}
