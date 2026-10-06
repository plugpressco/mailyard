<?php
namespace Mailyard;

defined( 'ABSPATH' ) || exit;

// Optional at-rest encryption for stored credentials (sodium secretbox). The
// key comes from MAILYARD_ENCRYPTION_KEY when defined, else from the site's
// own security keys in wp-config.php. That protects a copied database (a
// backup, a dump, a staging clone), not someone who can read the files too.
// If those keys change, stored secrets can't be opened any more: decrypt()
// returns '' and remembers it, so the admin is told rather than mail failing
// quietly.
class Crypto {

	const PREFIX = 'mailyard-enc:';

	// Connection config keys that hold secrets.
	const SECRET_FIELDS = array( 'password', 'api_key', 'secret_key', 'client_secret', 'refresh_token', 'access_token', 'certificate' );

	private static $unreadable = false;

	public static function available(): bool {
		return function_exists( 'sodium_crypto_secretbox' );
	}

	public static function is_encrypted( $value ): bool {
		return is_string( $value ) && 0 === strpos( $value, self::PREFIX );
	}

	public static function encrypt( string $plain ): string {
		if ( '' === $plain || self::is_encrypted( $plain ) || ! self::available() ) {
			return $plain;
		}
		$nonce = random_bytes( SODIUM_CRYPTO_SECRETBOX_NONCEBYTES );
		return self::PREFIX . base64_encode( $nonce . sodium_crypto_secretbox( $plain, $nonce, self::key() ) ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode
	}

	public static function decrypt( string $value ): string {
		if ( ! self::is_encrypted( $value ) ) {
			return $value;
		}
		$raw = base64_decode( substr( $value, strlen( self::PREFIX ) ), true ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode
		$out = false;
		if ( self::available() && false !== $raw && strlen( $raw ) > SODIUM_CRYPTO_SECRETBOX_NONCEBYTES ) {
			$out = sodium_crypto_secretbox_open( substr( $raw, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES ), substr( $raw, 0, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES ), self::key() );
		}
		if ( false === $out ) {
			self::$unreadable = true;
			return '';
		}
		return $out;
	}

	// Whether a stored secret failed to open in this request (keys changed).
	public static function unreadable(): bool {
		return self::$unreadable;
	}

	/**
	 * Encrypt or decrypt the secret fields of every connection config.
	 *
	 * @param array $conns   Connections.
	 * @param bool  $encrypt True to seal, false to open.
	 */
	public static function map_secrets( array $conns, bool $encrypt ): array {
		foreach ( $conns as &$c ) {
			if ( ! is_array( $c['config'] ?? null ) ) {
				continue;
			}
			foreach ( self::SECRET_FIELDS as $field ) {
				if ( isset( $c['config'][ $field ] ) && is_string( $c['config'][ $field ] ) ) {
					$c['config'][ $field ] = $encrypt ? self::encrypt( $c['config'][ $field ] ) : self::decrypt( $c['config'][ $field ] );
				}
			}
		}
		unset( $c );
		return $conns;
	}

	private static function key(): string {
		$material = defined( 'MAILYARD_ENCRYPTION_KEY' ) && '' !== (string) MAILYARD_ENCRYPTION_KEY
			? (string) MAILYARD_ENCRYPTION_KEY
			: wp_salt( 'auth' ) . wp_salt( 'secure_auth' );
		return hash( 'sha256', 'mailyard|' . $material, true );
	}
}
