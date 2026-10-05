<?php
namespace Mailyard;

defined( 'ABSPATH' ) || exit;

// Normalizes wp_mail() arguments into the message every ESP driver sends:
// recipients pulled out of the headers, the HTML/plain decision made once,
// custom headers kept, attachments read into memory. Pure parsing, kept apart
// from Override (which owns routing, failover and the send queue) so the
// Logger can reuse the header parsing for its Cc/Bcc view.
class Message {

	// Headers wp_mail() interprets itself; anything else is passed through.
	const RESERVED = array( 'from', 'to', 'cc', 'bcc', 'reply-to', 'subject', 'content-type', 'mime-version', 'content-transfer-encoding' );

	/**
	 * @param array $atts     wp_mail() arguments as passed to `pre_wp_mail`.
	 * @param array $settings Mailyard settings (for the default sender).
	 * @return array { to, cc, bcc: string[], from_email, from_name, reply_to,
	 *               subject, html, text: string, headers: array<name,value>,
	 *               attachments: array }.
	 */
	public static function from_wp_mail( array $atts, array $settings ): array {
		$parsed  = self::parse_headers( $atts['headers'] ?? '' );
		$from    = self::sender( $parsed['from'], $settings );
		$is_html = self::is_html( $parsed['content-type'] );
		$body    = (string) ( $atts['message'] ?? '' );

		return array(
			'to'          => self::addresses( $atts['to'] ?? array() ),
			'cc'          => self::addresses( $parsed['cc'] ),
			'bcc'         => self::addresses( $parsed['bcc'] ),
			'from_email'  => $from['email'],
			'from_name'   => $from['name'],
			'reply_to'    => self::addresses( $parsed['reply-to'] )[0] ?? '',
			'subject'     => (string) ( $atts['subject'] ?? '' ),
			'html'        => $is_html ? $body : '',
			'text'        => $is_html ? '' : $body,
			'headers'     => $parsed['custom'],
			'attachments' => ESP\Attachment::normalize( $atts['attachments'] ?? array() ),
		);
	}

	/**
	 * Split raw wp_mail() headers (string or array of lines). Cc, Bcc and
	 * Reply-To may repeat and hold comma lists, so they collect into arrays of
	 * raw values; custom headers keep their original casing.
	 *
	 * @param string|array $headers Raw headers.
	 */
	public static function parse_headers( $headers ): array {
		if ( ! is_array( $headers ) ) {
			$headers = explode( "\n", str_replace( "\r\n", "\n", (string) $headers ) );
		}

		$out = array(
			'from'         => '',
			'content-type' => '',
			'cc'           => array(),
			'bcc'          => array(),
			'reply-to'     => array(),
			'custom'       => array(),
		);

		foreach ( $headers as $line ) {
			$parts = explode( ':', (string) $line, 2 );
			if ( count( $parts ) < 2 || '' === trim( $parts[1] ) ) {
				continue;
			}
			$name  = trim( $parts[0] );
			$value = trim( $parts[1] );
			$key   = strtolower( $name );

			if ( in_array( $key, array( 'cc', 'bcc', 'reply-to' ), true ) ) {
				$out[ $key ][] = $value;
			} elseif ( 'from' === $key || 'content-type' === $key ) {
				$out[ $key ] = $value;
			} elseif ( ! in_array( $key, self::RESERVED, true ) && preg_match( '/^[A-Za-z0-9-]+$/', $name ) ) {
				$out['custom'][ $name ] = $value;
			}
		}

		return $out;
	}

	/**
	 * Every valid address in a recipient value — a string ("a@x.com, Name
	 * <b@y.com>"), an array of such strings, or nested arrays. Display names
	 * are dropped; duplicates removed.
	 *
	 * @param string|array $value Recipient value.
	 * @return string[]
	 */
	public static function addresses( $value ): array {
		$out = array();
		foreach ( (array) $value as $item ) {
			if ( is_array( $item ) ) {
				$out = array_merge( $out, self::addresses( $item ) );
				continue;
			}
			// Addresses, wherever they sit: bare, in <brackets>, or after a
			// quoted display name that itself contains commas.
			preg_match_all( '/[^\s<>,;"\']+@[^\s<>,;"\']+/', (string) $item, $m );
			foreach ( $m[0] as $email ) {
				$email = sanitize_email( $email );
				if ( $email && is_email( $email ) ) {
					$out[] = strtolower( $email );
				}
			}
		}
		return array_values( array_unique( $out ) );
	}

	// The message's own From header wins (it drives sender routing); otherwise
	// the configured default sender.
	private static function sender( string $from, array $settings ): array {
		if ( '' !== $from ) {
			$email = self::addresses( $from )[0] ?? '';
			if ( $email ) {
				$name = preg_match( '/^(.*)<[^<>]+>\s*$/', $from, $m ) ? trim( $m[1], " \t\"'" ) : '';
				return array(
					'name'  => $name,
					'email' => $email,
				);
			}
		}

		return array(
			'name'  => (string) ( $settings['from_name'] ?? get_bloginfo( 'name' ) ),
			'email' => (string) ( ( $settings['from_email'] ?? '' ) ?: get_option( 'admin_email' ) ),
		);
	}

	// Resolve HTML vs plain the way wp_mail() itself would: the Content-Type
	// header, else the `wp_mail_content_type` filter, defaulting to plain text
	// (defaulting to HTML collapses \n-formatted plain bodies into one line).
	private static function is_html( string $content_type ): bool {
		if ( '' === $content_type ) {
			$content_type = (string) apply_filters( 'wp_mail_content_type', 'text/plain' );
		}
		return 'text/plain' !== strtolower( trim( explode( ';', $content_type )[0] ) );
	}
}
