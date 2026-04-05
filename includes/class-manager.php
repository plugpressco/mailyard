<?php
namespace MoolMail;

use MoolMail\ESP\Provider;

defined( 'ABSPATH' ) || exit;

// Registers ESP providers and resolves the active one from settings.
class Manager {

	private static $instance = null;
	private $providers = array();

	public static function instance(): self {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {
		$this->providers = array(
			'phpmailer' => new ESP\PHPMailer(),
			'ses'       => new ESP\SES(),
			'postmark'  => new ESP\Postmark(),
			'resend'    => new ESP\Resend(),
			'smtp'      => new ESP\SMTP(),
		);

		// Allow third-party providers.
		$this->providers = apply_filters( 'moolmail_providers', $this->providers );
	}

	// Get the active ESP with its config applied.
	public function active_provider(): ?Provider {
		$settings = get_option( 'moolmail_settings', array() );
		$active   = $settings['active'] ?? 'phpmailer';

		if ( ! isset( $this->providers[ $active ] ) ) {
			return null;
		}

		$esp    = $this->providers[ $active ];
		$prefix = $active . '_';
		$config = array();

		foreach ( $settings as $key => $value ) {
			if ( 0 === strpos( $key, $prefix ) ) {
				$config[ substr( $key, strlen( $prefix ) ) ] = $value;
			}
		}

		return $esp->connect( $config ) ? $esp : null;
	}

	public function all(): array { return $this->providers; }
	public function get( string $slug ): ?Provider { return $this->providers[ $slug ] ?? null; }
}
