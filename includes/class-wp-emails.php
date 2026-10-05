<?php
namespace Mailyard;

defined( 'ABSPATH' ) || exit;

// Off switches for the notification emails WordPress sends on its own. A
// separate concern from delivery (Override): these decide whether an email
// exists at all, not how it travels. Password-reset emails are deliberately
// absent — switching those off locks people out of their accounts.
class WP_Emails {

	// Setting key => the core hook that silences it.
	const SWITCHES = array(
		'new_user_admin'        => 'wp_send_new_user_notification_to_admin',
		'new_user_user'         => 'wp_send_new_user_notification_to_user',
		'password_change_admin' => 'after_password_reset',
		'password_change_user'  => 'send_password_change_email',
		'email_change_user'     => 'send_email_change_email',
		'comment_author'        => 'notify_post_author',
		'comment_moderation'    => 'notify_moderator',
		'update_core'           => 'auto_core_update_send_email',
		'update_plugins'        => 'auto_plugin_update_send_email',
		'update_themes'         => 'auto_theme_update_send_email',
	);

	public function init(): void {
		foreach ( self::sanitize( Options::settings()['disabled_emails'] ?? array() ) as $key ) {
			if ( 'password_change_admin' === $key ) {
				remove_action( 'after_password_reset', 'wp_password_change_notification' );
			} else {
				add_filter( self::SWITCHES[ $key ], '__return_false' );
			}
		}
	}

	/**
	 * Keep only known switch keys.
	 *
	 * @param mixed $keys Incoming list.
	 * @return string[]
	 */
	public static function sanitize( $keys ): array {
		return array_values( array_intersect( array_keys( self::SWITCHES ), array_map( 'strval', (array) $keys ) ) );
	}
}
