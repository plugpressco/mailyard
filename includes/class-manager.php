<?php
defined( 'ABSPATH' ) || exit;

/**
 * Manages all registered ESP providers and resolves the active one.
 */
class Starter_SMTP_Manager {

	/** @var Starter_SMTP_Manager|null */
	private static $instance = null;

	/** @var Starter_SMTP_ESP_Interface[] */
	private $providers = array();

	private function __construct() {
		$this->register_providers();
	}

	/**
	 * @return Starter_SMTP_Manager
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Register built-in providers.
	 */
	private function register_providers() {
		$this->providers['phpmailer'] = new Starter_SMTP_PHPMailer();
		$this->providers['ses']       = new Starter_SMTP_SES();
		$this->providers['postmark']  = new Starter_SMTP_Postmark();
		$this->providers['resend']    = new Starter_SMTP_Resend();
		$this->providers['smtp']      = new Starter_SMTP_SMTP();

		/**
		 * Allow third-party plugins to register additional providers.
		 *
		 * @param Starter_SMTP_ESP_Interface[] $providers Registered providers keyed by slug.
		 */
		$this->providers = apply_filters( 'starter_smtp_providers', $this->providers );
	}

	/**
	 * Get the active ESP, connected with its saved config.
	 *
	 * @return Starter_SMTP_ESP_Interface|null Null if provider not found or connect fails.
	 */
	public function get_active_esp() {
		$settings = get_option( 'starter_smtp_settings', array() );
		$active   = isset( $settings['active'] ) ? $settings['active'] : 'phpmailer';

		if ( ! isset( $this->providers[ $active ] ) ) {
			return null;
		}

		$esp    = $this->providers[ $active ];
		$config = isset( $settings[ $active ] ) ? $settings[ $active ] : array();

		if ( ! $esp->connect( $config ) ) {
			return null;
		}

		return $esp;
	}

	/**
	 * Get all registered providers.
	 *
	 * @return Starter_SMTP_ESP_Interface[]
	 */
	public function get_providers() {
		return $this->providers;
	}

	/**
	 * Get a single provider by slug.
	 *
	 * @param string $slug Provider slug (e.g. 'ses', 'postmark').
	 * @return Starter_SMTP_ESP_Interface|null
	 */
	public function get_provider( $slug ) {
		return isset( $this->providers[ $slug ] ) ? $this->providers[ $slug ] : null;
	}
}
