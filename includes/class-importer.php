<?php
namespace Mailyard;

defined( 'ABSPATH' ) || exit;

// Finds another SMTP plugin's saved setup (WP Mail SMTP, Easy WP SMTP,
// FluentSMTP, Post SMTP) and copies it into Mailyard connections, so switching
// never means digging out API keys again. Secrets move server-side, straight
// from the other plugin's option into ours — they never reach the browser.
// A source is only offered when it maps to a provider Mailyard has AND its
// required credentials are readable; an import must never half-work.
class Importer {

	const SOURCES = array(
		'wp-mail-smtp' => 'WP Mail SMTP',
		'easy-wp-smtp' => 'Easy WP SMTP',
		'fluent-smtp'  => 'FluentSMTP',
		'post-smtp'    => 'Post SMTP',
	);

	// Credentials a connection can't send without.
	const REQUIRED = array(
		'smtp'      => array( 'host' ),
		'ses'       => array( 'access_key', 'secret_key' ),
		'mailgun'   => array( 'api_key', 'domain' ),
		'mailjet'   => array( 'api_key', 'secret_key' ),
		'gmail'     => array( 'client_id', 'client_secret' ),
		'microsoft' => array( 'client_id', 'client_secret' ),
		'zoho'      => array( 'client_id', 'client_secret' ),
		'phpmailer' => array(),
	);

	/**
	 * Every source with something importable: [{ source, name, active, connections: [{ provider, name }] }].
	 */
	public function detect(): array {
		$imported = (array) ( Options::settings()['imported'] ?? array() );
		$found    = array();
		foreach ( self::SOURCES as $source => $name ) {
			$drafts = $this->drafts( $source );
			if ( ! $drafts || in_array( $source, $imported, true ) ) {
				continue;
			}
			$found[] = array(
				'source'      => $source,
				'name'        => $name,
				'active'      => $this->is_active( $source ),
				'connections' => array_map( static function ( $d ) {
					return array( 'provider' => $d['provider'], 'name' => $d['name'] );
				}, $drafts ),
			);
		}
		return $found;
	}

	/**
	 * Append a source's connections. They go live only when Mailyard has no
	 * enabled connection yet; otherwise they arrive switched off for review.
	 *
	 * Sign-in connections (Gmail, Microsoft 365, Zoho) bring only their app
	 * credentials: the other plugin's tokens are bound to its own redirect URI,
	 * so they always arrive switched off, waiting for Connect account.
	 *
	 * @param string $source One of self::SOURCES.
	 * @return array|\WP_Error { imported: int, enabled: bool, connect: int }
	 */
	public function import( string $source ) {
		$drafts = $this->drafts( $source );
		if ( ! $drafts ) {
			return new \WP_Error( 'nothing_to_import', __( 'Nothing importable was found for this plugin.', 'mailyard' ), array( 'status' => 400 ) );
		}

		$conns   = Options::connections();
		$enable  = ! array_filter( $conns, static function ( $c ) { return ! empty( $c['enabled'] ); } );
		$primary = true;
		$connect = 0;
		foreach ( $drafts as $d ) {
			$signin   = (bool) OAuth::endpoints( $d['provider'], $d['config'] );
			$connect += $signin ? 1 : 0;
			$conns[]  = array(
				'id'               => wp_generate_uuid4(),
				'provider'         => $d['provider'],
				'name'             => $d['name'],
				'from_email'       => $d['from_email'],
				'from_name'        => $d['from_name'],
				'config'           => $d['config'],
				'from_match'       => $d['from_match'],
				// From a multi-connection source only its primary and backup
				// were live there, so only they go live here.
				'enabled'          => $enable && ! $signin && ( $primary || ! empty( $d['backup'] ) ),
				'priority'         => count( $conns ),
				'last_test_at'     => 0,
				'last_test_status' => '',
				'last_test_error'  => '',
			);
			$primary = false;
		}

		Options::save_connections( $conns );
		Options::sync_active( $conns );

		$settings             = get_option( Options::SETTINGS, array() );
		$settings['imported'] = array_values( array_unique( array_merge( (array) ( $settings['imported'] ?? array() ), array( $source ) ) ) );
		update_option( Options::SETTINGS, $settings );

		return array(
			'imported' => count( $drafts ),
			'enabled'  => $enable && $connect < count( $drafts ),
			'connect'  => $connect,
		);
	}

	// Connection drafts for one source, primary first; empty when nothing usable.
	private function drafts( string $source ): array {
		switch ( $source ) {
			case 'wp-mail-smtp':
				$drafts = $this->from_wpms( 'wp_mail_smtp', 'WPMS_', 'wp_mail_smtp_mail_key', 'WPMS_CRYPTO_KEY' );
				break;
			case 'easy-wp-smtp':
				$drafts = $this->from_wpms( 'easy_wp_smtp', 'EASY_WP_SMTP_', 'easy_wp_smtp_mail_key', 'EASY_WP_SMTP_CRYPTO_KEY' );
				break;
			case 'fluent-smtp':
				$drafts = $this->from_fluent();
				break;
			case 'post-smtp':
				$drafts = $this->from_postsmtp();
				break;
			default:
				$drafts = array();
		}

		$manager = Manager::instance();
		$label   = self::SOURCES[ $source ] ?? '';
		$out     = array();
		foreach ( $drafts as $d ) {
			$esp = $manager->get( $d['provider'] );
			if ( ! $esp || ! $this->complete( $d['provider'], $d['config'] ) ) {
				continue;
			}
			$d['from_email'] = sanitize_email( $d['from_email'] ?? '' ) ?: get_option( 'admin_email' );
			$d['from_name']  = sanitize_text_field( $d['from_name'] ?? '' );
			$d['from_match'] = $d['from_match'] ?? array();
			/* translators: 1: provider name, 2: plugin the settings came from. */
			$d['name']       = sprintf( __( '%1$s (from %2$s)', 'mailyard' ), $esp->get_label(), $label );
			$out[]           = $d;
		}
		return $out;
	}

	private function complete( string $provider, array $config ): bool {
		foreach ( self::REQUIRED[ $provider ] ?? array( 'api_key' ) as $field ) {
			if ( '' === trim( (string) ( $config[ $field ] ?? '' ) ) ) {
				return false;
			}
		}
		return true;
	}

	private function is_active( string $source ): bool {
		$files = array(
			'wp-mail-smtp' => array( 'wp-mail-smtp/wp_mail_smtp.php', 'wp-mail-smtp-pro/wp_mail_smtp.php' ),
			'easy-wp-smtp' => array( 'easy-wp-smtp/easy-wp-smtp.php', 'easy-wp-smtp-pro/easy-wp-smtp.php' ),
			'fluent-smtp'  => array( 'fluent-smtp/fluent-smtp.php' ),
			'post-smtp'    => array( 'post-smtp/postman-smtp.php' ),
		);
		$active = (array) get_option( 'active_plugins', array() );
		return (bool) array_intersect( $files[ $source ] ?? array(), $active );
	}

	// WP Mail SMTP and Easy WP SMTP (same company, same option shape). Their
	// wp-config constants win over the option when {PREFIX}ON is set; only the
	// SMTP password is stored encrypted.
	private function from_wpms( string $option, string $prefix, string $key_option, string $key_const ): array {
		$data   = get_option( $option, array() );
		$data   = is_array( $data ) ? $data : array();
		$consts = defined( $prefix . 'ON' ) && constant( $prefix . 'ON' );
		$get    = static function ( string $group, string $key ) use ( $data, $prefix, $consts ) {
			$special = array( 'mail.mailer' => 'MAILER', 'mail.from_email' => 'MAIL_FROM', 'mail.from_name' => 'MAIL_FROM_NAME', 'smtp.encryption' => 'SSL' );
			$const   = $prefix . ( $special[ "$group.$key" ] ?? strtoupper( "{$group}_{$key}" ) );
			if ( $consts && defined( $const ) ) {
				return (string) constant( $const );
			}
			return is_scalar( $data[ $group ][ $key ] ?? null ) ? (string) $data[ $group ][ $key ] : '';
		};

		$mailer = $get( 'mail', 'mailer' );
		$draft  = array(
			'from_email' => $get( 'mail', 'from_email' ),
			'from_name'  => $get( 'mail', 'from_name' ),
		);
		$api    = array( 'sendinblue' => 'brevo', 'sendgrid' => 'sendgrid', 'smtp2go' => 'smtp2go', 'mailersend' => 'mailersend', 'resend' => 'resend' );

		if ( 'smtp' === $mailer ) {
			$encryption = $get( 'smtp', 'encryption' );
			$auth       = in_array( $get( 'smtp', 'auth' ), array( '1', 'true', 'yes', 'on' ), true ) || ( '' === $get( 'smtp', 'auth' ) && '' !== $get( 'smtp', 'user' ) );
			$pass       = $get( 'smtp', 'pass' );
			if ( ! ( $consts && defined( $prefix . 'SMTP_PASS' ) ) ) {
				$pass = $this->sodium_decrypt( $pass, defined( $key_const ) ? (string) constant( $key_const ) : base64_decode( (string) get_option( $key_option, '' ) ) ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode
			}
			$draft += array(
				'provider' => 'smtp',
				'config'   => array(
					'host'       => $get( 'smtp', 'host' ),
					'port'       => (string) ( absint( $get( 'smtp', 'port' ) ) ?: 587 ),
					'encryption' => in_array( $encryption, array( 'tls', 'ssl' ), true ) ? $encryption : 'none',
					'username'   => $auth ? $get( 'smtp', 'user' ) : '',
					'password'   => $auth ? $pass : '',
				),
			);
		} elseif ( isset( $api[ $mailer ] ) ) {
			$draft += array( 'provider' => $api[ $mailer ], 'config' => array( 'api_key' => $get( $mailer, 'api_key' ) ) );
		} elseif ( 'postmark' === $mailer ) {
			$draft += array( 'provider' => 'postmark', 'config' => array_filter( array( 'api_key' => $get( 'postmark', 'server_api_token' ), 'stream' => $get( 'postmark', 'message_stream' ) ) ) );
		} elseif ( 'amazonses' === $mailer ) {
			// Their naming: the IAM key pair lives under client_id / client_secret.
			$draft += array( 'provider' => 'ses', 'config' => array( 'access_key' => $get( 'amazonses', 'client_id' ), 'secret_key' => $get( 'amazonses', 'client_secret' ), 'region' => $get( 'amazonses', 'region' ) ?: 'us-east-1' ) );
		} elseif ( 'mailgun' === $mailer ) {
			$draft += array( 'provider' => 'mailgun', 'config' => array( 'api_key' => $get( 'mailgun', 'api_key' ), 'domain' => $get( 'mailgun', 'domain' ), 'region' => 'eu' === strtolower( $get( 'mailgun', 'region' ) ) ? 'eu' : 'us' ) );
		} elseif ( 'mailjet' === $mailer ) {
			$draft += array( 'provider' => 'mailjet', 'config' => array( 'api_key' => $get( 'mailjet', 'api_key' ), 'secret_key' => $get( 'mailjet', 'secret_key' ) ) );
		} elseif ( in_array( $mailer, array( 'gmail', 'outlook', 'zoho' ), true ) ) {
			// App credentials only; the account is connected again from Mailyard.
			$config = array( 'client_id' => $get( $mailer, 'client_id' ), 'client_secret' => $get( $mailer, 'client_secret' ) );
			if ( 'zoho' === $mailer ) {
				$config['dc'] = OAuth::zoho_dc( $get( 'zoho', 'domain' ) );
			}
			$draft += array( 'provider' => 'outlook' === $mailer ? 'microsoft' : $mailer, 'config' => $config );
		} else {
			return array();
		}

		return array( $draft );
	}

	// FluentSMTP: several connections, a default and a fallback, per-sender
	// mappings — Mailyard's own model, so it all carries over. Secrets are
	// AES-256-CTR with the site's salts when `use_encrypt` is on.
	private function from_fluent(): array {
		$data = get_option( 'fluentmail-settings', array() );
		if ( ! is_array( $data ) || empty( $data['connections'] ) || ! is_array( $data['connections'] ) ) {
			return array();
		}

		// Fields Fluent encrypts, keyed to the settings version that started.
		$encrypted = array(
			'smtp'       => array( 'password' => 1 ),
			'ses'        => array( 'secret_key' => 1, 'access_key' => 2 ),
			'mailgun'    => array( 'api_key' => 1 ),
			'sendgrid'   => array( 'api_key' => 1 ),
			'sendinblue' => array( 'api_key' => 1 ),
			'postmark'   => array( 'api_key' => 1 ),
			'gmail'      => array( 'client_secret' => 1 ),
			'outlook'    => array( 'client_secret' => 1 ),
		);
		$version = (int) ( $data['encrypt_version'] ?? 1 );
		$default = (string) ( $data['misc']['default_connection'] ?? '' );
		$backup  = (string) ( $data['misc']['fallback_connection'] ?? '' );

		// Sender mappings: email => connection key.
		$senders = array();
		foreach ( (array) ( $data['mappings'] ?? array() ) as $email => $key ) {
			$senders[ (string) $key ][] = strtolower( (string) $email );
		}

		$keys   = array_keys( $data['connections'] );
		$ranked = array_merge( array_filter( array( $default, $backup ) ), array_diff( $keys, array( $default, $backup ) ) );
		$drafts = array();
		foreach ( array_unique( $ranked ) as $key ) {
			$s = (array) ( $data['connections'][ $key ]['provider_settings'] ?? array() );
			$p = (string) ( $s['provider'] ?? '' );

			if ( ! empty( $data['use_encrypt'] ) && 'yes' !== ( $s['disable_encryption'] ?? '' ) ) {
				foreach ( $encrypted[ $p ] ?? array() as $field => $since ) {
					if ( $since <= $version && ! empty( $s[ $field ] ) ) {
						$s[ $field ] = $this->fluent_decrypt( (string) $s[ $field ] );
					}
				}
			}
			$wpc = 'wp_config' === ( $s['key_store'] ?? '' );
			$c   = static function ( string $const, string $field ) use ( $s, $wpc ) {
				return $wpc ? ( defined( $const ) ? (string) constant( $const ) : '' ) : (string) ( $s[ $field ] ?? '' );
			};

			$map = array(
				'smtp'       => array( 'smtp', array( 'host' => (string) ( $s['host'] ?? '' ), 'port' => (string) ( absint( $s['port'] ?? 0 ) ?: 587 ), 'encryption' => in_array( $s['encryption'] ?? '', array( 'tls', 'ssl' ), true ) ? $s['encryption'] : 'none', 'username' => 'no' === ( $s['auth'] ?? 'yes' ) ? '' : $c( 'FLUENTMAIL_SMTP_USERNAME', 'username' ), 'password' => 'no' === ( $s['auth'] ?? 'yes' ) ? '' : $c( 'FLUENTMAIL_SMTP_PASSWORD', 'password' ) ) ),
				'ses'        => array( 'ses', array( 'access_key' => $c( 'FLUENTMAIL_AWS_ACCESS_KEY_ID', 'access_key' ), 'secret_key' => $c( 'FLUENTMAIL_AWS_SECRET_ACCESS_KEY', 'secret_key' ), 'region' => (string) ( $s['region'] ?? 'us-east-1' ) ) ),
				'mailgun'    => array( 'mailgun', array( 'api_key' => $c( 'FLUENTMAIL_MAILGUN_API_KEY', 'api_key' ), 'domain' => $c( 'FLUENTMAIL_MAILGUN_DOMAIN', 'domain_name' ), 'region' => 'eu' === ( $s['region'] ?? '' ) ? 'eu' : 'us' ) ),
				'sendgrid'   => array( 'sendgrid', array( 'api_key' => $c( 'FLUENTMAIL_SENDGRID_API_KEY', 'api_key' ) ) ),
				'sendinblue' => array( 'brevo', array( 'api_key' => $c( 'FLUENTMAIL_SENDINBLUE_API_KEY', 'api_key' ) ) ),
				'postmark'   => array( 'postmark', array_filter( array( 'api_key' => $c( 'FLUENTMAIL_POSTMARK_API_KEY', 'api_key' ), 'stream' => (string) ( $s['message_stream'] ?? '' ) ) ) ),
				'smtp2go'    => array( 'smtp2go', array( 'api_key' => $c( 'FLUENTMAIL_SMTP2GO_API_KEY', 'api_key' ) ) ),
				'gmail'      => array( 'gmail', array( 'client_id' => $c( 'FLUENTMAIL_GMAIL_CLIENT_ID', 'client_id' ), 'client_secret' => $c( 'FLUENTMAIL_GMAIL_CLIENT_SECRET', 'client_secret' ) ) ),
				'outlook'    => array( 'microsoft', array( 'client_id' => $c( 'FLUENTMAIL_OUTLOOK_CLIENT_ID', 'client_id' ), 'client_secret' => $c( 'FLUENTMAIL_OUTLOOK_CLIENT_SECRET', 'client_secret' ) ) ),
				'default'    => array( 'phpmailer', array() ),
			);
			if ( ! isset( $map[ $p ] ) ) {
				continue;
			}

			$drafts[] = array(
				'provider'   => $map[ $p ][0],
				'config'     => $map[ $p ][1],
				'from_email' => (string) ( $s['sender_email'] ?? '' ),
				'from_name'  => (string) ( $s['sender_name'] ?? '' ),
				// The default handles every unmapped sender (catch-all).
				'from_match' => (string) $key === $default ? array() : ( $senders[ (string) $key ] ?? array() ),
				'backup'     => (string) $key === $backup,
			);
		}
		return $drafts;
	}

	// Post SMTP: one transport; secrets are base64-encoded (not encrypted).
	private function from_postsmtp(): array {
		$o = get_option( 'postman_options', array() );
		if ( ! is_array( $o ) || empty( $o['transport_type'] ) ) {
			return array();
		}
		$secret = static function ( string $key, string $const ) use ( $o ) {
			if ( defined( $const ) ) {
				return (string) constant( $const );
			}
			$raw = (string) ( $o[ $key ] ?? '' );
			$dec = base64_decode( $raw, true ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode
			return false === $dec ? $raw : $dec;
		};

		$api = array( 'sendgrid_api' => 'sendgrid', 'sendinblue_api' => 'brevo', 'postmark_api' => 'postmark', 'mailersend_api' => 'mailersend', 'smtp2go_api' => 'smtp2go', 'resend_api' => 'resend', 'maileroo_api' => 'maileroo' );
		$t   = (string) $o['transport_type'];

		if ( 'smtp' === $t ) {
			$auth   = 'none' !== ( $o['auth_type'] ?? 'none' );
			$config = array(
				'host'       => (string) ( $o['hostname'] ?? '' ),
				'port'       => (string) ( absint( $o['port'] ?? 0 ) ?: 587 ),
				'encryption' => in_array( $o['enc_type'] ?? '', array( 'tls', 'ssl' ), true ) ? $o['enc_type'] : 'none',
				'username'   => $auth ? (string) ( $o['basic_auth_username'] ?? '' ) : '',
				'password'   => $auth ? $secret( 'basic_auth_password', 'POST_SMTP_AUTH_PASSWORD' ) : '',
			);
			$provider = 'smtp';
		} elseif ( isset( $api[ $t ] ) ) {
			$provider = $api[ $t ];
			$config   = array( 'api_key' => $secret( str_replace( '_api', '_api_key', $t ), 'POST_SMTP_API_KEY' ) );
		} elseif ( 'mailgun_api' === $t ) {
			$provider = 'mailgun';
			$config   = array( 'api_key' => $secret( 'mailgun_api_key', 'POST_SMTP_API_KEY' ), 'domain' => (string) ( $o['mailgun_domain_name'] ?? '' ), 'region' => isset( $o['mailgun_region'] ) ? 'eu' : 'us' );
		} elseif ( 'mailjet_api' === $t ) {
			$provider = 'mailjet';
			$config   = array( 'api_key' => $secret( 'mailjet_api_key', 'POST_SMTP_API_KEY' ), 'secret_key' => $secret( 'mailjet_secret_key', 'POST_SMTP_API_KEY' ) );
		} elseif ( 'gmail_api' === $t ) {
			// Stored as typed (not base64), app credentials only.
			$provider = 'gmail';
			$config   = array( 'client_id' => (string) ( $o['oauth_client_id'] ?? '' ), 'client_secret' => (string) ( $o['oauth_client_secret'] ?? '' ) );
		} else {
			return array();
		}

		return array(
			array(
				'provider'   => $provider,
				'config'     => $config,
				'from_email' => (string) ( $o['sender_email'] ?? '' ),
				'from_name'  => (string) ( $o['sender_name'] ?? '' ),
			),
		);
	}

	// WP Mail SMTP's secretbox format: base64( nonce . ciphertext ). A value too
	// short to be one is an older plaintext password and passes through; one
	// that is shaped like ciphertext but won't open (the site's key changed)
	// comes back empty — to be re-typed, not sent to the server as garbage.
	private function sodium_decrypt( string $value, string $key ): string {
		$raw = base64_decode( $value, true ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode
		if ( false === $raw || ! function_exists( 'sodium_crypto_secretbox_open' ) || strlen( $raw ) < SODIUM_CRYPTO_SECRETBOX_NONCEBYTES + SODIUM_CRYPTO_SECRETBOX_MACBYTES ) {
			return $value;
		}
		if ( SODIUM_CRYPTO_SECRETBOX_KEYBYTES !== strlen( $key ) ) {
			return '';
		}
		$plain = sodium_crypto_secretbox_open( substr( $raw, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES ), substr( $raw, 0, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES ), $key );
		return false === $plain ? '' : $plain;
	}

	// FluentSMTP's format: base64( iv . openssl_encrypt( value . salt ) ). The
	// salt suffix proves the key was right; anything else yields ''.
	private function fluent_decrypt( string $value ): string {
		if ( ! function_exists( 'openssl_decrypt' ) ) {
			return '';
		}
		$salt = defined( 'FLUENTMAIL_ENCRYPT_SALT' ) ? FLUENTMAIL_ENCRYPT_SALT : ( ( defined( 'LOGGED_IN_SALT' ) && '' !== LOGGED_IN_SALT ) ? LOGGED_IN_SALT : 'this-is-a-fallback-salt-but-not-secure' );
		$key  = defined( 'FLUENTMAIL_ENCRYPT_KEY' ) ? FLUENTMAIL_ENCRYPT_KEY : ( ( defined( 'LOGGED_IN_KEY' ) && '' !== LOGGED_IN_KEY ) ? LOGGED_IN_KEY : 'this-is-a-fallback-key-but-not-secure' );
		$raw  = base64_decode( $value, true ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode
		if ( false === $raw ) {
			return '';
		}
		$len   = openssl_cipher_iv_length( 'aes-256-ctr' );
		$plain = openssl_decrypt( substr( $raw, $len ), 'aes-256-ctr', $key, 0, str_pad( substr( $raw, 0, $len ), 16, "\0" ) );
		if ( ! $plain || substr( $plain, -strlen( $salt ) ) !== $salt ) {
			return '';
		}
		return substr( $plain, 0, -strlen( $salt ) );
	}
}
