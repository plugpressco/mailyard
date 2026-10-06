<?php
namespace Mailyard\ESP;

defined( 'ABSPATH' ) || exit;

// Builds a complete RFC 822 message from the normalized send params, for APIs
// that take raw MIME (Gmail). WordPress's own PHPMailer does the encoding, so
// UTF-8 subjects, long HTML lines and attachments come out right without a
// hand-rolled builder.
class Mime {

	/**
	 * @param array $params Normalized send params (see Message::from_wp_mail()).
	 * @return string The full message, headers and body.
	 * @throws \PHPMailer\PHPMailer\Exception When PHPMailer rejects the message.
	 */
	public static function build( array $params ): string {
		if ( ! class_exists( '\PHPMailer\PHPMailer\PHPMailer' ) ) {
			require_once ABSPATH . WPINC . '/PHPMailer/PHPMailer.php';
			require_once ABSPATH . WPINC . '/PHPMailer/Exception.php';
		}

		$mail          = new \PHPMailer\PHPMailer\PHPMailer( true );
		$mail->CharSet = 'UTF-8';
		$mail->XMailer = ' '; // No "X-Mailer: PHPMailer" banner.

		$mail->setFrom( sanitize_email( $params['from_email'] ?? '' ), (string) ( $params['from_name'] ?? '' ), false );
		foreach ( Recipients::split( $params['to'] ?? array() ) as $to ) {
			$mail->addAddress( $to );
		}
		foreach ( Recipients::split( $params['cc'] ?? array() ) as $cc ) {
			$mail->addCC( $cc );
		}
		// Kept in the raw message on purpose: Gmail reads Bcc from it, delivers,
		// and strips the header before anyone sees it.
		foreach ( Recipients::split( $params['bcc'] ?? array() ) as $bcc ) {
			$mail->addBCC( $bcc );
		}
		if ( ! empty( $params['reply_to'] ) ) {
			$mail->addReplyTo( sanitize_email( $params['reply_to'] ) );
		}
		foreach ( (array) ( $params['headers'] ?? array() ) as $name => $value ) {
			$mail->addCustomHeader( (string) $name, str_replace( array( "\r", "\n" ), ' ', (string) $value ) );
		}

		$mail->Subject = (string) ( $params['subject'] ?? '' );
		if ( ! empty( $params['html'] ) ) {
			$mail->isHTML( true );
			$mail->Body    = (string) $params['html'];
			$mail->AltBody = wp_strip_all_tags( (string) $params['html'] );
		} else {
			$mail->Body = (string) ( $params['text'] ?? '' );
		}

		foreach ( (array) ( $params['attachments'] ?? array() ) as $a ) {
			$mail->addStringAttachment(
				base64_decode( $a['content_base64'] ), // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode
				$a['filename'],
				'base64',
				$a['mime']
			);
		}

		$mail->preSend();
		return $mail->getSentMIMEMessage();
	}

	/** URL-safe base64 without padding (RFC 4648 §5), as Gmail's `raw` and JWTs want it. */
	public static function base64url( string $data ): string {
		return rtrim( strtr( base64_encode( $data ), '+/', '-_' ), '=' ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode
	}
}
