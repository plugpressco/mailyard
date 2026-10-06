<?php
namespace Mailyard\ESP;

use Mailyard\OAuth;

defined( 'ABSPATH' ) || exit;

// Zoho Mail — OAuth 2.0 and the Zoho Mail API. Two Zoho specifics: every URL
// lives on the account's own data center (a US host won't answer for an EU
// account), and attachments are uploaded first, then referenced by the send.
// Zoho only sends as — and only takes a Reply-To of — the account's own
// verified addresses, learned at sign-in.
// Docs: https://www.zoho.com/mail/help/api/post-send-an-email.html
class Zoho implements Provider {

	private $config = array();

	public function connect( array $config ): bool {
		$this->config = $config;
		return ! empty( $config['client_id'] ) && ! empty( $config['client_secret'] ) && ! empty( $config['refresh_token'] );
	}

	public function send( array $params ): Result {
		$token = OAuth::access_token( 'zoho', $this->config );
		if ( is_wp_error( $token ) ) {
			return Result::failure( $token->get_error_message() );
		}

		// Connections made before the account was looked up learn it now.
		if ( empty( $this->config['account_id'] ) ) {
			$account = OAuth::zoho_account( (string) ( $this->config['dc'] ?? '' ), $token );
			if ( is_wp_error( $account ) ) {
				return Result::failure( $account->get_error_message() );
			}
			$this->config = array_merge( $this->config, $account );
			if ( ! empty( $this->config['_connection_id'] ) ) {
				OAuth::store( (string) $this->config['_connection_id'], $account );
			}
		}

		$base      = 'https://mail.' . OAuth::zoho_dc( (string) ( $this->config['dc'] ?? '' ) ) . '/api/accounts/' . rawurlencode( (string) $this->config['account_id'] );
		$addresses = array_map( 'strtolower', (array) ( $this->config['addresses'] ?? array() ) );
		$from      = strtolower( sanitize_email( $params['from_email'] ?? '' ) );
		// Zoho refuses to send as an address the account doesn't own. Send as
		// the account's own address instead of not at all.
		if ( $addresses && ! in_array( $from, $addresses, true ) && ! empty( $this->config['primary_address'] ) ) {
			$from = (string) $this->config['primary_address'];
		}
		$name = sanitize_text_field( $params['from_name'] ?? '' );
		$html = (string) ( $params['html'] ?? '' );

		$payload = array(
			'fromAddress' => $name ? "$name <$from>" : $from,
			'toAddress'   => implode( ',', Recipients::split( $params['to'] ?? array() ) ),
			'subject'     => (string) ( $params['subject'] ?? '' ),
			'content'     => '' !== $html ? $html : (string) ( $params['text'] ?? '' ),
			'mailFormat'  => '' !== $html ? 'html' : 'plaintext',
			'askReceipt'  => 'no',
		);
		if ( ! empty( $params['cc'] ) ) {
			$payload['ccAddress'] = implode( ',', Recipients::split( $params['cc'] ) );
		}
		if ( ! empty( $params['bcc'] ) ) {
			$payload['bccAddress'] = implode( ',', Recipients::split( $params['bcc'] ) );
		}
		// A Reply-To that isn't one of the account's addresses makes Zoho reject
		// the whole message — and contact forms put the visitor's address there.
		// Delivering without it beats not delivering.
		$reply_to = strtolower( sanitize_email( $params['reply_to'] ?? '' ) );
		if ( '' !== $reply_to && ( $addresses ? in_array( $reply_to, $addresses, true ) : $reply_to === $from ) ) {
			$payload['replyTo'] = $reply_to;
		}

		foreach ( (array) ( $params['attachments'] ?? array() ) as $a ) {
			$uploaded = $this->upload( $base, $token, $a );
			if ( is_wp_error( $uploaded ) ) {
				return Result::failure( $uploaded->get_error_message() );
			}
			$payload['attachments'][] = $uploaded;
		}

		$json = OAuth::read_json( wp_remote_post( $base . '/messages', array(
			'timeout' => 30,
			'headers' => array(
				'Authorization' => 'Zoho-oauthtoken ' . $token,
				'Content-Type'  => 'application/json',
			),
			'body'    => wp_json_encode( $payload ),
		) ) );

		if ( is_wp_error( $json ) ) {
			return Result::failure( $json->get_error_message() );
		}
		return Result::success( (string) ( $json['data']['messageId'] ?? '' ) );
	}

	/**
	 * Upload one attachment's bytes; returns the handle the send references.
	 *
	 * @return array|\WP_Error { storeName, attachmentPath, attachmentName }
	 */
	private function upload( string $base, string $token, array $a ) {
		$json = OAuth::read_json( wp_remote_post( add_query_arg( 'fileName', rawurlencode( $a['filename'] ), $base . '/messages/attachments' ), array(
			'timeout' => 60,
			'headers' => array(
				'Authorization' => 'Zoho-oauthtoken ' . $token,
				'Content-Type'  => 'application/octet-stream',
			),
			'body'    => base64_decode( $a['content_base64'] ), // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode
		) ) );
		if ( is_wp_error( $json ) ) {
			return $json;
		}
		$file = $json['data'] ?? array();
		$file = isset( $file[0] ) ? $file[0] : $file;
		if ( empty( $file['storeName'] ) || empty( $file['attachmentPath'] ) || empty( $file['attachmentName'] ) ) {
			/* translators: %s: attachment file name. */
			return new \WP_Error( 'zoho_attachment', sprintf( __( 'Zoho didn’t accept the attachment “%s”.', 'mailyard' ), $a['filename'] ) );
		}
		return array(
			'storeName'      => (string) $file['storeName'],
			'attachmentPath' => (string) $file['attachmentPath'],
			'attachmentName' => (string) $file['attachmentName'],
		);
	}

	public function get_name(): string { return 'zoho'; }
	public function get_label(): string { return __( 'Zoho Mail', 'mailyard' ); }

	public function get_fields(): array {
		return array(
			array( 'key' => 'client_id', 'label' => __( 'Client ID', 'mailyard' ), 'type' => 'text', 'required' => true ),
			array( 'key' => 'client_secret', 'label' => __( 'Client Secret', 'mailyard' ), 'type' => 'password', 'required' => true ),
			array( 'key' => 'dc', 'label' => __( 'Data center', 'mailyard' ), 'type' => 'select', 'default' => 'zoho.com', 'options' => array_combine( OAuth::ZOHO_DCS, OAuth::ZOHO_DCS ) ),
		);
	}
}
