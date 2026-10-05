<?php
namespace Mailyard;

defined( 'ABSPATH' ) || exit;

// Setup checks shown on the Dashboard: things that quietly break or weaken
// delivery even when every send "succeeds". Read-only and cheap — each check
// looks at configuration, never sends anything.
class Checks {

	/**
	 * Every check that currently fails: [{ id, tone: warning|info, title, detail }].
	 */
	public function run(): array {
		return array_values( array_filter( array_merge(
			array( $this->wp_mail_replaced(), $this->from_domain() ),
			$this->form_senders()
		) ) );
	}

	// wp_mail() is pluggable: a plugin that defines its own bypasses every
	// filter Mailyard relies on, so nothing is routed, logged or failed over.
	public function wp_mail_replaced(): ?array {
		if ( ! function_exists( 'wp_mail' ) ) {
			return null;
		}
		$file = wp_normalize_path( (string) ( new \ReflectionFunction( 'wp_mail' ) )->getFileName() );
		if ( wp_normalize_path( ABSPATH . WPINC . '/pluggable.php' ) === $file ) {
			return null;
		}
		$plugins = wp_normalize_path( WP_PLUGIN_DIR ) . '/';
		$owner   = 0 === strpos( $file, $plugins ) ? strtok( substr( $file, strlen( $plugins ) ), '/' ) : basename( dirname( $file ) );
		return array(
			'id'     => 'wp_mail_replaced',
			'tone'   => 'warning',
			'title'  => __( 'Another plugin has taken over WordPress email', 'mailyard' ),
			/* translators: %s: plugin folder or file that defines wp_mail(). */
			'detail' => sprintf( __( '"%s" replaces wp_mail() itself, so emails skip Mailyard entirely — no routing, logging or backup. Deactivate it, or its mail feature.', 'mailyard' ), $owner ),
		);
	}

	// A From address on a different domain than the site usually means a
	// sender the provider hasn't verified, or one that fails DMARC alignment.
	public function from_domain(): ?array {
		$from = (string) ( Options::settings()['from_email'] ?? '' );
		$site = strtolower( (string) wp_parse_url( home_url(), PHP_URL_HOST ) );
		if ( '' === $from || '' === $site || false === strpos( $from, '@' ) || in_array( $site, array( 'localhost', '127.0.0.1' ), true ) ) {
			return null;
		}
		$domain = strtolower( substr( $from, strrpos( $from, '@' ) + 1 ) );
		$site   = preg_replace( '/^www\./', '', $site );
		if ( $domain === $site || self::ends_with( $site, '.' . $domain ) || self::ends_with( $domain, '.' . $site ) ) {
			return null;
		}
		return array(
			'id'     => 'from_domain',
			'tone'   => 'info',
			'title'  => __( 'Your From address is on another domain', 'mailyard' ),
			/* translators: 1: sender domain, 2: site domain. */
			'detail' => sprintf( __( 'Mail is sent from %1$s while the site is %2$s. That works only if %1$s is verified with your provider and its SPF/DKIM records are in place — check Deliverability.', 'mailyard' ), $domain, $site ),
		);
	}

	/**
	 * Form plugins set up to send "from" the visitor's own address. Providers
	 * reject that, or the mail fails DMARC and lands in spam. Use a Reply-To
	 * with the visitor's address instead.
	 *
	 * @return array[]
	 */
	public function form_senders(): array {
		$forms = array();

		// Contact Form 7: the Mail tab's "From" address being a [mail-tag]. Only
		// the address part counts — the stock "[_site_title] <wordpress@…>"
		// puts a tag in the name, which is fine.
		if ( defined( 'WPCF7_VERSION' ) ) {
			foreach ( get_posts( array( 'post_type' => 'wpcf7_contact_form', 'numberposts' => 50, 'post_status' => 'any' ) ) as $post ) {
				$mail = get_post_meta( $post->ID, '_mail', true );
				if ( is_array( $mail ) && self::cf7_tagged_address( (string) ( $mail['sender'] ?? '' ) ) ) {
					$forms[] = get_the_title( $post );
				}
			}
		}

		// WPForms: a notification's From Email set to a {field_id} smart tag.
		if ( defined( 'WPFORMS_VERSION' ) ) {
			foreach ( get_posts( array( 'post_type' => 'wpforms', 'numberposts' => 50, 'post_status' => 'any' ) ) as $post ) {
				$data = json_decode( (string) $post->post_content, true );
				foreach ( (array) ( $data['settings']['notifications'] ?? array() ) as $n ) {
					if ( false !== strpos( (string) ( $n['sender_address'] ?? '' ), '{field_id' ) ) {
						$forms[] = get_the_title( $post );
						break;
					}
				}
			}
		}

		// Gravity Forms: a notification's From set to a field merge tag.
		if ( class_exists( '\GFAPI' ) ) {
			foreach ( (array) \GFAPI::get_forms() as $form ) {
				foreach ( (array) ( $form['notifications'] ?? array() ) as $n ) {
					if ( preg_match( '/\{[^}]*:\d+/', (string) ( $n['from'] ?? '' ) ) ) {
						$forms[] = (string) ( $form['title'] ?? '' );
						break;
					}
				}
			}
		}

		$forms = array_values( array_unique( array_filter( $forms ) ) );
		if ( ! $forms ) {
			return array();
		}
		return array(
			array(
				'id'     => 'form_senders',
				'tone'   => 'warning',
				'title'  => __( 'A form sends “from” the visitor’s address', 'mailyard' ),
				/* translators: %s: comma-separated form names. */
				'detail' => sprintf( __( 'In: %s. Providers reject a From address you don’t own, or the mail fails DMARC and lands in spam. Set the form’s From to your own address and put the visitor’s email in Reply-To.', 'mailyard' ), implode( ', ', array_slice( $forms, 0, 5 ) ) ),
			),
		);
	}

	public static function cf7_tagged_address( string $sender ): bool {
		$address = preg_match( '/<([^>]*)>/', $sender, $m ) ? $m[1] : $sender;
		return false !== strpos( $address, '[' );
	}

	private static function ends_with( string $haystack, string $needle ): bool {
		return '' !== $needle && substr( $haystack, -strlen( $needle ) ) === $needle;
	}
}
