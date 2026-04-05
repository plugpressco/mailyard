<?php
namespace MoolMail\ESP;

defined( 'ABSPATH' ) || exit;

interface Provider {
	public function connect( array $config ): bool;
	public function send( array $params ): Result;
	public function get_name(): string;
	public function get_label(): string;
	public function get_fields(): array;
}
