<?php
namespace Mailyard\ESP;

use Mailyard\OAuth;

defined( 'ABSPATH' ) || exit;

// Gmail / Google Workspace — OAuth 2.0 and the Gmail API. The message is built
// as MIME (attachments, Cc/Bcc, UTF-8 all handled once) and submitted to
// users.messages.send. Gmail sends from the signed-in account; a From address
// it doesn't own is rewritten by Gmail rather than refused.
// Docs: https://developers.google.com/gmail/api/reference/rest/v1/users.messages/send
class Gmail implements Provider {

	private $config = array();

	public function connect( array $config ): bool {
		$this->config = $config;
		return ! empty( $config['client_id'] ) && ! empty( $config['client_secret'] ) && ! empty( $config['refresh_token'] );
	}

	public function send( array $params ): Result {
		$token = OAuth::access_token( 'gmail', $this->config );
		if ( is_wp_error( $token ) ) {
			return Result::failure( $token->get_error_message() );
		}

		try {
			$mime = Mime::build( $params );
		} catch ( \Exception $e ) {
			return Result::failure( $e->getMessage() );
		}

		$json = OAuth::read_json( wp_remote_post( 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send', array(
			'timeout' => 30,
			'headers' => array(
				'Authorization' => 'Bearer ' . $token,
				'Content-Type'  => 'application/json',
			),
			'body'    => wp_json_encode( array( 'raw' => Mime::base64url( $mime ) ) ),
		) ) );

		if ( is_wp_error( $json ) ) {
			return Result::failure( $json->get_error_message() );
		}
		return Result::success( (string) ( $json['id'] ?? '' ) );
	}

	public function get_name(): string { return 'gmail'; }
	public function get_label(): string { return __( 'Gmail', 'mailyard' ); }

	public function get_fields(): array {
		return array(
			array( 'key' => 'client_id', 'label' => __( 'Client ID', 'mailyard' ), 'type' => 'text', 'required' => true ),
			array( 'key' => 'client_secret', 'label' => __( 'Client Secret', 'mailyard' ), 'type' => 'password', 'required' => true ),
		);
	}
}
