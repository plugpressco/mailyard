<?php
namespace Mailyard\ESP;

defined( 'ABSPATH' ) || exit;

// Helper for converting wp_mail() attachment file paths into a normalized
// shape each ESP can forward to its API.
class Attachment {

	// Returns: [ 'filename' => string, 'content_base64' => string, 'mime' => string ]
	// or null if the file is unreadable.
	public static function from_path( string $path ): ?array {
		if ( ! is_string( $path ) || '' === $path ) {
			return null;
		}
		if ( ! file_exists( $path ) || ! is_readable( $path ) ) {
			return null;
		}

		$contents = @file_get_contents( $path ); // phpcs:ignore WordPress.WP.AlternativeFunctions
		if ( false === $contents ) {
			return null;
		}

		return array(
			'filename'       => basename( $path ),
			'content_base64' => base64_encode( $contents ),
			'mime'           => self::detect_mime( $path ),
		);
	}

	// Best-effort MIME detection. Falls back to application/octet-stream.
	private static function detect_mime( string $path ): string {
		$type = wp_check_filetype( basename( $path ) );
		if ( ! empty( $type['type'] ) ) {
			return $type['type'];
		}
		if ( function_exists( 'mime_content_type' ) ) {
			$detected = @mime_content_type( $path ); // phpcs:ignore
			if ( $detected ) {
				return $detected;
			}
		}
		return 'application/octet-stream';
	}

	// Normalize $atts['attachments'] (string path | array of paths) into an
	// array of from_path() results, dropping unreadable entries. A string key
	// is the filename the caller wants shown (wp_mail() supports
	// array( 'invoice.pdf' => '/tmp/abc123' )).
	public static function normalize( $attachments ): array {
		if ( empty( $attachments ) ) {
			return array();
		}
		if ( is_string( $attachments ) ) {
			$attachments = explode( "\n", str_replace( "\r\n", "\n", $attachments ) );
		}
		$out = array();
		foreach ( (array) $attachments as $name => $path ) {
			$entry = self::from_path( trim( (string) $path ) );
			if ( ! $entry ) {
				continue;
			}
			if ( is_string( $name ) && '' !== trim( $name ) ) {
				$entry['filename'] = basename( $name );
			}
			$out[] = $entry;
		}
		return $out;
	}
}

// Helper for normalizing CC/BCC inputs (string "a,b" or array) into an array
// of valid email addresses. Kept here because it's used by the same call site.
class Recipients {

	public static function split( $value ): array {
		if ( empty( $value ) ) {
			return array();
		}
		$list = is_array( $value ) ? $value : explode( ',', (string) $value );
		$out  = array();
		foreach ( $list as $item ) {
			$email = sanitize_email( trim( (string) $item ) );
			if ( $email && is_email( $email ) ) {
				$out[] = $email;
			}
		}
		return $out;
	}
}
