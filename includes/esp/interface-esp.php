<?php
defined( 'ABSPATH' ) || exit;

interface Starter_SMTP_ESP_Interface {
	public function connect( $config );
	public function send( $params );
	public function get_name();
	public function get_label();
	public function get_fields();
}
