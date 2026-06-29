<?php
namespace Mailyard;

defined( 'ABSPATH' ) || exit;

/**
 * Inbound bounce / complaint webhooks for every API provider (Postmark, SES,
 * Resend, Brevo). Each provider POSTs to:
 *
 *     {site}/wp-json/mailyard/v1/webhooks/{provider}?token={secret}
 *
 * We gate on the per-site token, normalise the payload to { email, type, reason },
 * dedupe retries, and fire `mailyard_bounce` so consumers (e.g. Outbees) can
 * suppress the address. SMTP has no event feedback, so it has no webhook.
 */
class Webhooks {

	public function init(): void {
		add_action( 'rest_api_init', array( $this, 'register' ) );
	}

	public function register(): void {
		register_rest_route(
			Options::REST_NS,
			'/webhooks/(?P<provider>[a-z0-9_-]+)',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'handle' ),
				// Public endpoint — providers can't send a WP nonce. Verified per
				// request via the token gate (and SSRF-safe SNS handshake) below.
				'permission_callback' => '__return_true',
				'args'                => array(
					'provider' => array( 'sanitize_callback' => 'sanitize_key' ),
				),
			)
		);
	}

	public function handle( \WP_REST_Request $request ) {
		$provider = sanitize_key( (string) $request->get_param( 'provider' ) );

		if ( ! in_array( $provider, Options::api_providers(), true ) ) {
			return new \WP_REST_Response( array( 'error' => 'unknown_provider' ), 404 );
		}

		// Token gate: the shared per-site secret embedded in the URL. Constant-time.
		if ( ! hash_equals( Options::webhook_secret(), (string) $request->get_param( 'token' ) ) ) {
			return new \WP_REST_Response( array( 'error' => 'forbidden' ), 403 );
		}

		$body = json_decode( $request->get_body(), true );
		if ( ! is_array( $body ) ) {
			return new \WP_REST_Response( array( 'error' => 'bad_payload' ), 400 );
		}

		// SES rides on SNS: confirm the subscription handshake before events flow.
		if ( 'ses' === $provider && 'SubscriptionConfirmation' === ( $body['Type'] ?? '' ) ) {
			$this->confirm_sns( $body );
			return new \WP_REST_Response( array( 'ok' => true ), 200 );
		}

		$events    = $this->parse( $provider, $body );
		$processed = 0;

		foreach ( $events as $event ) {
			$email = sanitize_email( (string) ( $event['email'] ?? '' ) );
			$type  = (string) ( $event['type'] ?? '' );
			if ( '' === $email || '' === $type ) {
				continue;
			}

			// Idempotency — providers retry; never double-count a soft bounce.
			$dedupe = 'mailyard_wh_' . md5( $provider . '|' . ( $event['id'] ?? '' ) . '|' . $email . '|' . $type );
			if ( get_transient( $dedupe ) ) {
				continue;
			}
			set_transient( $dedupe, 1, DAY_IN_SECONDS );

			/**
			 * A recipient hard/soft-bounced or complained.
			 *
			 * @param string $email    Recipient address.
			 * @param string $type     'hard' | 'soft' | 'complaint'.
			 * @param string $reason   Human-readable reason.
			 * @param string $provider Provider slug.
			 */
			do_action( 'mailyard_bounce', $email, $type, (string) ( $event['reason'] ?? '' ), $provider );
			++$processed;
		}

		return new \WP_REST_Response( array( 'ok' => true, 'processed' => $processed ), 200 );
	}

	// Normalise a provider payload into a list of { email, type, reason, id }.
	private function parse( string $provider, array $body ): array {
		switch ( $provider ) {
			case 'postmark':
				return $this->parse_postmark( $body );
			case 'brevo':
				return $this->parse_brevo( $body );
			case 'resend':
				return $this->parse_resend( $body );
			case 'ses':
				return $this->parse_ses( $body );
		}
		return array();
	}

	// Postmark — one object per POST; RecordType Bounce | SpamComplaint.
	private function parse_postmark( array $b ): array {
		$record = $b['RecordType'] ?? '';
		$email  = (string) ( $b['Email'] ?? $b['Recipient'] ?? '' );
		$id     = (string) ( $b['ID'] ?? $b['MessageID'] ?? '' );

		if ( 'SpamComplaint' === $record ) {
			return array( array( 'email' => $email, 'type' => 'complaint', 'reason' => 'Spam complaint', 'id' => $id ) );
		}
		if ( 'Bounce' === $record ) {
			$permanent = array( 'HardBounce', 'BadEmailAddress', 'Blocked', 'SpamNotification', 'ManuallyDeactivated', 'Unsubscribe' );
			$type      = in_array( (string) ( $b['Type'] ?? '' ), $permanent, true ) ? 'hard' : 'soft';
			return array( array( 'email' => $email, 'type' => $type, 'reason' => (string) ( $b['Description'] ?? $b['Details'] ?? '' ), 'id' => $id ) );
		}
		return array();
	}

	// Brevo — single event or a batch under 'items'/'events'.
	private function parse_brevo( array $b ): array {
		$list = $b['items'] ?? $b['events'] ?? array( $b );
		if ( ! is_array( $list ) ) {
			$list = array( $b );
		}

		$out = array();
		foreach ( $list as $e ) {
			if ( ! is_array( $e ) ) {
				continue;
			}
			$event = strtolower( (string) ( $e['event'] ?? '' ) );
			$email = (string) ( $e['email'] ?? '' );
			$id    = (string) ( $e['message-id'] ?? $e['id'] ?? '' );

			$type = '';
			if ( in_array( $event, array( 'hard_bounce', 'invalid_email', 'blocked' ), true ) ) {
				$type = 'hard';
			} elseif ( in_array( $event, array( 'soft_bounce', 'deferred' ), true ) ) {
				$type = 'soft';
			} elseif ( in_array( $event, array( 'spam', 'complaint' ), true ) ) {
				$type = 'complaint';
			}

			if ( '' !== $type && '' !== $email ) {
				$out[] = array( 'email' => $email, 'type' => $type, 'reason' => (string) ( $e['reason'] ?? $event ), 'id' => $id );
			}
		}
		return $out;
	}

	// Resend — { type: email.bounced | email.complained, data: {...} }.
	private function parse_resend( array $b ): array {
		$kind = (string) ( $b['type'] ?? '' );
		$data = is_array( $b['data'] ?? null ) ? $b['data'] : array();
		$id   = (string) ( $data['email_id'] ?? $b['id'] ?? '' );

		$emails = array();
		if ( ! empty( $data['to'] ) ) {
			$emails = is_array( $data['to'] ) ? $data['to'] : array( $data['to'] );
		} elseif ( ! empty( $data['email'] ) ) {
			$emails = array( $data['email'] );
		}

		$type = '';
		if ( 'email.complained' === $kind ) {
			$type = 'complaint';
		} elseif ( 'email.bounced' === $kind ) {
			$sub  = strtolower( (string) ( $data['bounce']['type'] ?? 'hard' ) );
			$type = ( false !== strpos( $sub, 'transient' ) || false !== strpos( $sub, 'soft' ) ) ? 'soft' : 'hard';
		}
		if ( '' === $type ) {
			return array();
		}

		$out = array();
		foreach ( $emails as $em ) {
			$out[] = array( 'email' => (string) $em, 'type' => $type, 'reason' => $kind, 'id' => $id );
		}
		return $out;
	}

	// SES — SNS Notification envelope; the real event is a JSON string in `Message`.
	private function parse_ses( array $b ): array {
		$msg = json_decode( (string) ( $b['Message'] ?? '' ), true );
		if ( ! is_array( $msg ) ) {
			return array();
		}
		$id   = (string) ( $b['MessageId'] ?? $msg['mail']['messageId'] ?? '' );
		$kind = $msg['notificationType'] ?? $msg['eventType'] ?? '';
		$out  = array();

		if ( 'Bounce' === $kind && isset( $msg['bounce'] ) ) {
			$type = ( 'Permanent' === ( $msg['bounce']['bounceType'] ?? '' ) ) ? 'hard' : 'soft';
			foreach ( (array) ( $msg['bounce']['bouncedRecipients'] ?? array() ) as $r ) {
				if ( ! empty( $r['emailAddress'] ) ) {
					$out[] = array( 'email' => (string) $r['emailAddress'], 'type' => $type, 'reason' => (string) ( $msg['bounce']['bounceSubType'] ?? 'Bounce' ), 'id' => $id );
				}
			}
		} elseif ( 'Complaint' === $kind && isset( $msg['complaint'] ) ) {
			foreach ( (array) ( $msg['complaint']['complainedRecipients'] ?? array() ) as $r ) {
				if ( ! empty( $r['emailAddress'] ) ) {
					$out[] = array( 'email' => (string) $r['emailAddress'], 'type' => 'complaint', 'reason' => 'Complaint', 'id' => $id );
				}
			}
		}
		return $out;
	}

	// Confirm an SNS subscription by fetching its SubscribeURL — AWS hosts only, so
	// a forged "SubscriptionConfirmation" can't make us call an attacker URL (SSRF).
	private function confirm_sns( array $body ): void {
		$url = (string) ( $body['SubscribeURL'] ?? '' );
		if ( '' === $url ) {
			return;
		}
		$host = wp_parse_url( $url, PHP_URL_HOST );
		if ( ! is_string( $host ) || ! preg_match( '/(^|\.)amazonaws\.com$/i', $host ) ) {
			return;
		}
		wp_remote_get( $url, array( 'timeout' => 10 ) );
	}
}
