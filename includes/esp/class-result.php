<?php
defined( 'ABSPATH' ) || exit;

class Starter_SMTP_Result {
	private $success;
	private $message_id;
	private $error;

	public function __construct( $success, $message_id = '', $error = '' ) {
		$this->success    = (bool) $success;
		$this->message_id = $message_id;
		$this->error      = $error;
	}

	public function is_success() { return $this->success; }
	public function get_message_id() { return $this->message_id; }
	public function get_error() { return $this->error; }

	public static function success( $message_id = '' ) { return new self( true, $message_id ); }
	public static function failure( $error ) { return new self( false, '', $error ); }
}
