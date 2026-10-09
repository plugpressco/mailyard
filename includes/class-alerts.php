<?php
namespace Mailyard;

defined( 'ABSPATH' ) || exit;

// Tells the site owner when email breaks, instead of a customer telling them:
// a failure alert, a "backup took over" alert, and an optional weekly summary
// — by email and/or to a chat webhook (Slack, Discord, Teams, or any JSON
// endpoint). At most one alert of each kind per hour, however many emails
// fail. Individual emails never reach the webhook: it reports on the site,
// not on the people the site writes to.
class Alerts {

	const SUMMARY_HOOK = 'mailyard_weekly_summary';

	public function init(): void {
		add_action( 'mailyard_send_failed', array( $this, 'on_failed' ), 10, 2 );
		add_action( 'mailyard_send_rescued', array( $this, 'on_rescued' ), 10, 3 );
		add_action( self::SUMMARY_HOOK, array( $this, 'send_summary' ) );

		$scheduled = wp_next_scheduled( self::SUMMARY_HOOK );
		if ( ! empty( Options::settings()['weekly_summary'] ) && ! $scheduled ) {
			wp_schedule_event( time() + WEEK_IN_SECONDS, 'weekly', self::SUMMARY_HOOK );
		} elseif ( empty( Options::settings()['weekly_summary'] ) && $scheduled ) {
			wp_clear_scheduled_hook( self::SUMMARY_HOOK );
		}
	}

	public function on_failed( $to, $error ): void {
		if ( ! $this->claim( 'failed' ) ) {
			return;
		}
		$site  = $this->site_name();
		$count = max( 1, Logger::instance()->count_failed_since( HOUR_IN_SECONDS ) );
		/* translators: %d: number of emails that failed in the last hour. */
		$what  = sprintf( _n( '%d email failed to send in the last hour.', '%d emails failed to send in the last hour.', $count, 'mailyard' ), $count );
		$error = (string) $error;

		$this->notify(
			/* translators: %s: site name. */
			sprintf( __( '[%s] Email is failing to send', 'mailyard' ), $site ),
			array_filter( array(
				/* translators: %s: site name. */
				sprintf( __( 'Emails from %s are not being delivered.', 'mailyard' ), $site ),
				$what,
				/* translators: %s: the provider's error message. */
				'' !== $error ? sprintf( __( 'Last error: %s', 'mailyard' ), $error ) : '',
			) ),
			'failed',
			array( 'failed' => $count, 'error' => $error )
		);
	}

	// A backup delivered what the primary refused. Nothing was lost, but the
	// primary can stay broken for weeks behind "sent" rows unless someone says so.
	public function on_rescued( $to, $provider, $failures ): void {
		if ( ! $this->claim( 'rescued' ) ) {
			return;
		}
		$site  = $this->site_name();
		$error = (string) ( $failures[0]['error'] ?? '' );

		$this->notify(
			/* translators: %s: site name. */
			sprintf( __( '[%s] Your main email provider is failing', 'mailyard' ), $site ),
			array_filter( array(
				/* translators: %s: site name. */
				sprintf( __( 'The main email provider on %s refused to send, and a backup delivered in its place.', 'mailyard' ), $site ),
				__( 'Your email is still going out. It is worth a look anyway — the backup is there for a bad moment, not to carry the site.', 'mailyard' ),
				/* translators: %s: the provider's error message. */
				'' !== $error ? sprintf( __( 'What the provider said: %s', 'mailyard' ), $error ) : '',
			) ),
			'rescued',
			array( 'error' => $error )
		);
	}

	// Weekly: what went out, what failed, and the most common errors. A quiet
	// week sends nothing.
	public function send_summary(): void {
		$settings = Options::settings();
		if ( empty( $settings['weekly_summary'] ) ) {
			return;
		}
		$logger = Logger::instance();
		$stats  = $logger->stats();
		$sent   = (int) ( $stats['sent_7d'] ?? 0 );
		$failed = (int) ( $stats['failed_7d'] ?? 0 );
		if ( 0 === $sent + $failed ) {
			return;
		}

		$site  = $this->site_name();
		/* translators: 1: emails sent, 2: emails failed. */
		$lines = array( sprintf( __( 'Last 7 days: %1$d sent, %2$d failed.', 'mailyard' ), $sent, $failed ) );
		foreach ( $logger->top_errors( 7, 3 ) as $row ) {
			/* translators: 1: how many times, 2: error message. */
			$lines[] = sprintf( __( '%1$d× %2$s', 'mailyard' ), $row['count'], $row['error'] );
		}
		/* translators: %s: site name. */
		$subject = sprintf( __( '[%s] Your weekly email summary', 'mailyard' ), $site );

		// The summary is ordinary mail: it goes through your provider, logged.
		$to = $this->recipient();
		wp_mail( $to, $subject, implode( "\n", $lines ) . $this->footer() );
		$this->post_webhook( 'summary', $subject . ' — ' . implode( ' ', $lines ), array( 'sent' => $sent, 'failed' => $failed ) );
	}

	/**
	 * Send a sample through one channel and report the result.
	 *
	 * @param string $channel 'email' or 'webhook'.
	 * @param string $target  The address or URL being typed (may not be saved
	 *                        yet); empty to use the saved one.
	 * @return true|\WP_Error
	 */
	public function test( string $channel, string $target = '' ) {
		/* translators: %s: site name. */
		$text = sprintf( __( '[%s] Mailyard test alert — this is what a failure alert looks like.', 'mailyard' ), $this->site_name() );
		if ( 'webhook' === $channel ) {
			return $this->post_webhook( 'test', $text, array(), true, $target );
		}
		$ok = $this->send_unrouted( is_email( $target ) ? $target : $this->recipient(), $text, $text . $this->footer() );
		return $ok ? true : new \WP_Error( 'alert_failed', __( 'Your server could not send the test alert.', 'mailyard' ) );
	}

	/**
	 * The chat payload this URL's service expects: Slack and Discord each want
	 * their one key, Teams (Power Automate workflows) an Adaptive Card, and
	 * anything else gets the pieces separately for Zapier, Make or n8n.
	 *
	 * @param string $url   Webhook URL.
	 * @param string $event failed | rescued | summary | test.
	 * @param string $text  The message.
	 * @param array  $extra Extra fields for generic endpoints.
	 */
	public static function webhook_payload( string $url, string $event, string $text, array $extra = array() ): array {
		$host = strtolower( (string) wp_parse_url( $url, PHP_URL_HOST ) );
		$logs = Settings::url( 'logs' );

		if ( preg_match( '/(^|\.)slack\.com$/', $host ) ) {
			return array( 'text' => $text . "\n" . $logs );
		}
		if ( preg_match( '/(^|\.)discord(app)?\.com$/', $host ) ) {
			return array( 'content' => $text . "\n" . $logs );
		}
		if ( preg_match( '/(^|\.)(logic\.azure\.com|powerplatform\.com|webhook\.office\.com)$/', $host ) ) {
			return array(
				'type'        => 'message',
				'attachments' => array(
					array(
						'contentType' => 'application/vnd.microsoft.card.adaptive',
						'content'     => array(
							'$schema' => 'http://adaptivecards.io/schemas/adaptive-card.json',
							'type'    => 'AdaptiveCard',
							'version' => '1.2',
							'body'    => array( array( 'type' => 'TextBlock', 'text' => $text . "\n\n" . $logs, 'wrap' => true ) ),
						),
					),
				),
			);
		}
		return array_merge(
			array( 'site' => wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES ), 'url' => home_url(), 'event' => $event, 'text' => $text, 'logs' => $logs ),
			$extra
		);
	}

	// Throttle: one alert of each kind per hour, claimed before sending so two
	// failures in one request can't both decide to alert.
	private function claim( string $kind ): bool {
		$settings = Options::settings();
		if ( empty( $settings['alert_email'] ) && '' === (string) ( $settings['alert_webhook'] ?? '' ) ) {
			return false;
		}
		$key = 'mailyard_alerted_' . $kind;
		if ( get_transient( $key ) ) {
			return false;
		}
		set_transient( $key, time(), HOUR_IN_SECONDS );
		return true;
	}

	private function notify( string $subject, array $lines, string $event, array $extra ): void {
		if ( ! empty( Options::settings()['alert_email'] ) ) {
			$this->send_unrouted( $this->recipient(), $subject, implode( "\n\n", $lines ) . "\n\n" . __( 'The email log:', 'mailyard' ) . ' ' . Settings::url( 'logs' ) . $this->footer() );
		}
		$this->post_webhook( $event, $subject . ' — ' . implode( ' ', array_slice( $lines, 1 ) ), $extra );
	}

	// Alerts about a broken provider must not travel through it: send with
	// WordPress's own mailer (Override stands aside) — unlogged, so an alert
	// can't trigger the next one.
	private function send_unrouted( string $to, string $subject, string $body ): bool {
		return (bool) Override::unrouted( static function () use ( $to, $subject, $body ) {
			return wp_mail( $to, $subject, $body );
		} );
	}

	/**
	 * @return bool|\WP_Error Non-blocking sends report true; the test waits and reports.
	 */
	private function post_webhook( string $event, string $text, array $extra, bool $wait = false, string $url = '' ) {
		$url = '' !== $url ? $url : (string) ( Options::settings()['alert_webhook'] ?? '' );
		if ( ! wp_http_validate_url( $url ) ) {
			return $wait ? new \WP_Error( 'no_webhook', __( 'Add a webhook URL first.', 'mailyard' ) ) : false;
		}
		$response = wp_remote_post( $url, array(
			'timeout'  => $wait ? 10 : 3,
			'blocking' => $wait,
			'headers'  => array( 'Content-Type' => 'application/json' ),
			'body'     => wp_json_encode( self::webhook_payload( $url, $event, $text, $extra ) ),
		) );
		if ( ! $wait ) {
			return true;
		}
		if ( is_wp_error( $response ) ) {
			return $response;
		}
		$code = (int) wp_remote_retrieve_response_code( $response );
		/* translators: %d: HTTP status code. */
		return $code >= 200 && $code < 300 ? true : new \WP_Error( 'webhook_failed', sprintf( __( 'The webhook answered with HTTP %d.', 'mailyard' ), $code ) );
	}

	private function recipient(): string {
		$to = (string) ( Options::settings()['alert_to'] ?? '' );
		return is_email( $to ) ? $to : (string) get_option( 'admin_email' );
	}

	private function site_name(): string {
		return wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES ) ?: (string) wp_parse_url( home_url(), PHP_URL_HOST );
	}

	private function footer(): string {
		/* translators: %s: URL of Mailyard's alert settings. */
		return "\n\n— " . sprintf( __( 'Sent by Mailyard. Change alerts: %s', 'mailyard' ), Settings::url( 'settings/alerts' ) );
	}
}
