<?php
namespace Mailyard;

defined( 'ABSPATH' ) || exit;

// Intercepts wp_mail() to route emails through configured ESP connections,
// with synchronous failover across the chain when a send fails. Also owns the
// two delivery modes: Offline (log, never send) and Background (answer the
// page first, send right after the response).
class Override {

	// Re-entrancy guard. The SMTP and PHP-mail providers send via an inner
	// wp_mail() call, which would otherwise re-trigger our pre_wp_mail filter
	// and recurse. While true, the interceptor passes through so the inner
	// wp_mail() reaches real PHPMailer.
	private static $sending = false;

	// Messages deferred by Background sending, flushed on shutdown.
	private static $queue = array();

	// Set while a caller needs the real outcome (Send test, Resend), so the
	// message is sent now instead of being queued.
	private static $sync = false;

	// Outcome of the most recent intercepted send: { status, provider, error }.
	private static $last = array();

	// True while the failover loop is sending — used by Logger to avoid double-logging
	// SMTP sends (which fire wp_mail_succeeded/failed in addition to our own log).
	public static function is_sending(): bool {
		return self::$sending;
	}

	/**
	 * Run $fn with Background sending bypassed, so wp_mail() inside it returns
	 * the real result; last_outcome() then says which provider took it.
	 *
	 * @param callable $fn Work that sends mail.
	 * @return mixed Whatever $fn returns.
	 */
	public static function sync( callable $fn ) {
		self::$sync = true;
		self::$last = array();
		try {
			return $fn();
		} finally {
			self::$sync = false;
		}
	}

	// { status, provider, error } of the last intercepted send, or empty when
	// wp_mail() fell through to WordPress (no usable connection).
	public static function last_outcome(): array {
		return self::$last;
	}

	public function init() {
		// Route everything through the interceptor when at least one usable
		// connection exists (it picks a sender-matched failover chain and honors
		// the message's own From header), and always in Offline mode.
		if ( ! empty( Options::settings()['offline'] ) || ! empty( Manager::instance()->enabled_connections() ) ) {
			add_filter( 'pre_wp_mail', array( $this, 'intercept' ), 10, 2 );
			return;
		}

		// Passthrough: no usable connection. Set a default sender, but do NOT clobber
		// an explicit From — only replace WP's wordpress@localhost default.
		$settings   = Options::settings();
		$from_email = $settings['from_email'] ?? '';
		$from_name  = $settings['from_name'] ?? '';

		if ( empty( $from_email ) ) {
			$from_email = get_option( 'admin_email' );
		}
		add_filter( 'wp_mail_from', function ( $email ) use ( $from_email ) {
			return $this->is_wp_default_from( $email ) ? $from_email : $email;
		} );

		if ( ! empty( $from_name ) ) {
			add_filter( 'wp_mail_from_name', function ( $name ) use ( $from_name ) {
				return ( '' === $name || 'WordPress' === $name ) ? $from_name : $name;
			} );
		}
	}

	// Replaces wp_mail: offline capture, background queue, or an immediate send
	// down the sender-matched failover chain.
	public function intercept( $null, $atts ) {
		// Inner wp_mail() from the SMTP / PHP-mail provider — let it through.
		if ( self::$sending ) {
			return null;
		}

		$settings = Options::settings();
		$message  = Message::from_wp_mail( $atts, $settings );
		$log      = array(
			'to'      => implode( ', ', $message['to'] ),
			'subject' => $message['subject'],
			'body'    => (string) ( $atts['message'] ?? '' ),
			'headers' => $atts['headers'] ?? '',
		);

		if ( ! empty( $settings['offline'] ) ) {
			Logger::instance()->log( $log + array( 'status' => 'offline', 'provider' => '' ) );
			self::$last = array( 'status' => 'offline', 'provider' => '', 'error' => '' );
			return true;
		}

		$chain = Manager::instance()->chain_for( $message['from_email'] );
		if ( empty( $chain ) ) {
			return null; // Fall through to default wp_mail.
		}

		if ( $this->should_defer( $settings ) ) {
			$id = Logger::instance()->log( $log + array( 'status' => 'pending', 'provider' => '' ) );
			if ( empty( self::$queue ) ) {
				add_action( 'shutdown', array( $this, 'flush_queue' ), 100 );
			}
			self::$queue[] = array( $chain, $message, $log, $id );
			return true;
		}

		return $this->deliver( $chain, $message, $log, 0 );
	}

	/**
	 * Send every deferred message. Hand the response to the visitor first when
	 * the server can (PHP-FPM, LiteSpeed); elsewhere the sends simply run at
	 * the very end of the request.
	 */
	public function flush_queue() {
		if ( function_exists( 'fastcgi_finish_request' ) ) {
			fastcgi_finish_request();
		} elseif ( function_exists( 'litespeed_finish_request' ) ) {
			litespeed_finish_request();
		}

		$queue       = self::$queue;
		self::$queue = array();
		foreach ( $queue as $item ) {
			list( $chain, $message, $log, $id ) = $item;
			$this->deliver( $chain, $message, $log, (int) $id );
		}
	}

	private function should_defer( array $settings ): bool {
		return ! empty( $settings['background'] )
			&& ! self::$sync
			&& ! wp_doing_cron()
			&& ! ( defined( 'WP_CLI' ) && WP_CLI )
			&& ! doing_action( 'shutdown' );
	}

	// Validate recipients, then walk the chain: first success wins; each failed
	// attempt before the last is logged on its own row so the log shows who
	// failed and why. $log_id (a Background "pending" row) receives the final
	// outcome instead of a new row.
	private function deliver( array $chain, array $message, array $log, int $log_id ): bool {
		$error = $this->recipient_error( $message, $chain[0]['slug'] );
		if ( '' !== $error ) {
			$this->record( $log, $log_id, 'failed', $chain[0]['slug'], $error );
			do_action( 'mailyard_send_failed', $log['to'], $error );
			return false;
		}

		$logger   = Logger::instance();
		$last     = count( $chain ) - 1;
		$failures = array();

		self::$sending = true;
		try {
			foreach ( $chain as $i => $link ) {
				$result = $link['esp']->send( $message );

				if ( $result->is_success() ) {
					$this->record( $log, $log_id, 'sent', $link['slug'], '' );
					self::$last['failed'] = $failures;
					do_action( 'mailyard_send_succeeded', $log['to'], $link['slug'] );
					return true;
				}

				$error      = $result->get_error();
				$failures[] = array( 'provider' => $link['slug'], 'error' => $error );
				if ( $i < $last ) {
					$logger->log( $log + array( 'status' => 'failed', 'provider' => $link['slug'], 'error' => $error ) );
				} else {
					$this->record( $log, $log_id, 'failed', $link['slug'], $error );
				}
			}
		} finally {
			self::$sending = false;
		}

		do_action( 'mailyard_send_failed', $log['to'], $error );
		return false;
	}

	private function record( array $log, int $log_id, string $status, string $provider, string $error ): void {
		$fields     = array( 'status' => $status, 'provider' => $provider, 'error' => $error );
		self::$last = $fields;
		if ( $log_id ) {
			Logger::instance()->update( $log_id, $fields );
		} else {
			Logger::instance()->log( $log + $fields );
		}
	}

	// Reject a message no provider could deliver: no valid To address, or (for
	// SMTP / PHP mail) a recipient domain with no mail server. API providers
	// validate recipients themselves, and the local DNS resolver is unreliable
	// on dev machines (localhost, VPN, firewalled).
	private function recipient_error( array $message, string $provider ): string {
		if ( empty( $message['to'] ) ) {
			return __( 'Invalid email address.', 'mailyard' );
		}
		if ( in_array( $provider, Options::api_providers(), true ) || ! function_exists( 'checkdnsrr' ) || defined( 'PHP_WASM' ) ) {
			return '';
		}
		foreach ( $message['to'] as $to ) {
			$domain = substr( $to, strrpos( $to, '@' ) + 1 );
			if ( ! @checkdnsrr( $domain, 'MX' ) && ! @checkdnsrr( $domain, 'A' ) ) { // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
				/* translators: %s: recipient email domain. */
				return sprintf( __( 'Invalid domain: %s has no mail server.', 'mailyard' ), $domain );
			}
		}
		return '';
	}

	// Detect WP's synthetic default From (wordpress@<sitename>) so the passthrough
	// default sender only replaces that, never a real From the caller set.
	private function is_wp_default_from( $email ): bool {
		if ( empty( $email ) ) {
			return true;
		}
		$sitename = strtolower( wp_parse_url( network_home_url(), PHP_URL_HOST ) ?: '' );
		if ( 0 === strpos( $sitename, 'www.' ) ) {
			$sitename = substr( $sitename, 4 );
		}
		return strtolower( $email ) === 'wordpress@' . $sitename;
	}
}
