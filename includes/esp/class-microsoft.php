<?php
namespace Mailyard\ESP;

use Mailyard\OAuth;

defined( 'ABSPATH' ) || exit;

// Microsoft 365 / Outlook — delegated OAuth 2.0 and Microsoft Graph
// (me/sendMail). The message goes as Graph JSON, not MIME: Graph then sends
// as the signed-in mailbox, where a MIME From it doesn't own would be refused
// (ErrorSendAsDenied) — and WordPress sites set arbitrary From addresses.
// Docs: https://learn.microsoft.com/graph/api/user-sendmail
class Microsoft implements Provider {

	protected $config = array();

	public function connect( array $config ): bool {
		$this->config = $config;
		return ! empty( $config['client_id'] ) && ! empty( $config['client_secret'] ) && ! empty( $config['refresh_token'] );
	}

	public function send( array $params ): Result {
		$token = OAuth::access_token( 'microsoft', $this->config );
		if ( is_wp_error( $token ) ) {
			return Result::failure( $token->get_error_message() );
		}
		return $this->graph_send( 'https://graph.microsoft.com/v1.0/me/sendMail', $token, $params );
	}

	// POST one message to a Graph sendMail endpoint. 202 Accepted, empty body.
	protected function graph_send( string $url, string $token, array $params ): Result {
		$html    = (string) ( $params['html'] ?? '' );
		$message = array(
			'subject'      => (string) ( $params['subject'] ?? '' ),
			'body'         => array(
				'contentType' => '' !== $html ? 'HTML' : 'Text',
				'content'     => '' !== $html ? $html : (string) ( $params['text'] ?? '' ),
			),
			'toRecipients' => self::recipients( $params['to'] ?? array() ),
		);
		if ( ! empty( $params['cc'] ) ) {
			$message['ccRecipients'] = self::recipients( $params['cc'] );
		}
		if ( ! empty( $params['bcc'] ) ) {
			$message['bccRecipients'] = self::recipients( $params['bcc'] );
		}
		if ( ! empty( $params['reply_to'] ) ) {
			$message['replyTo'] = self::recipients( $params['reply_to'] );
		}
		// Graph only takes custom headers named X-…; others (List-Unsubscribe)
		// would fail the whole send, so they're left out.
		foreach ( (array) ( $params['headers'] ?? array() ) as $name => $value ) {
			if ( 0 === stripos( (string) $name, 'x-' ) ) {
				$message['internetMessageHeaders'][] = array( 'name' => (string) $name, 'value' => (string) $value );
			}
		}
		foreach ( (array) ( $params['attachments'] ?? array() ) as $a ) {
			$message['attachments'][] = array(
				'@odata.type'  => '#microsoft.graph.fileAttachment',
				'name'         => $a['filename'],
				'contentType'  => $a['mime'],
				'contentBytes' => $a['content_base64'],
			);
		}

		$json = OAuth::read_json( wp_remote_post( $url, array(
			'timeout' => 30,
			'headers' => array(
				'Authorization' => 'Bearer ' . $token,
				'Content-Type'  => 'application/json',
			),
			'body'    => wp_json_encode( array( 'message' => $message, 'saveToSentItems' => true ) ),
		) ) );

		return is_wp_error( $json ) ? Result::failure( $this->explain( $json ) ) : Result::success();
	}

	protected function explain( \WP_Error $error ): string {
		return $error->get_error_message();
	}

	private static function recipients( $list ): array {
		return array_map( static function ( $email ) {
			return array( 'emailAddress' => array( 'address' => $email ) );
		}, Recipients::split( $list ) );
	}

	public function get_name(): string { return 'microsoft'; }
	public function get_label(): string { return __( 'Microsoft 365', 'mailyard' ); }

	public function get_fields(): array {
		return array(
			array( 'key' => 'client_id', 'label' => __( 'Application (client) ID', 'mailyard' ), 'type' => 'text', 'required' => true ),
			array( 'key' => 'client_secret', 'label' => __( 'Client Secret', 'mailyard' ), 'type' => 'password', 'required' => true ),
			array( 'key' => 'tenant', 'label' => __( 'Tenant', 'mailyard' ), 'type' => 'text', 'default' => 'common' ),
		);
	}
}
