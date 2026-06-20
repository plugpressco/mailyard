<?php
namespace Mailyard\ESP;

defined( 'ABSPATH' ) || exit;

class Result {
	private $success;
	private $message_id;
	private $error;

	private function __construct( bool $success, string $message_id = '', string $error = '' ) {
		$this->success    = $success;
		$this->message_id = $message_id;
		$this->error      = $error;
	}

	public function is_success(): bool { return $this->success; }
	public function get_message_id(): string { return $this->message_id; }
	public function get_error(): string { return $this->error; }

	public static function success( string $message_id = '' ): self {
		return new self( true, $message_id );
	}

	public static function failure( string $error ): self {
		return new self( false, '', $error );
	}
}
