<?php
/**
 * Freemius integration — Mailyard as the free PARENT product.
 *
 * Mailyard itself stays completely free (no paid plans, no locked features).
 * Freemius is here so the paid add-on, Mailyard Pro, can attach to this
 * product for its licensing and updates (`parent => <this product's id>`),
 * and so users get one account surface for the family. Usage tracking is
 * strictly opt-in and skippable — required for WordPress.org.
 *
 * The free build does NOT bundle the Freemius SDK — it would be 3.5 MB of
 * dead weight for free-only users. The SDK ships inside Mailyard Pro, which
 * loads first, so `fs_dynamic_init` exists here exactly when it's needed.
 * Without Pro (or while the credentials below are blank) this file is a
 * no-op — Mailyard runs exactly as it did before Freemius existed.
 *
 * The `mailyard_fs_loaded` action at the bottom is the add-on's init signal:
 * Mailyard Pro sorts BEFORE Mailyard in the active-plugins load order
 * ('mailyard-pro/' < 'mailyard/'), so Pro defers its own Freemius init onto
 * this action rather than assuming the parent already exists.
 *
 * @package Mailyard
 */

defined( 'ABSPATH' ) || exit;

// This (free, parent) product's Freemius credentials. Stays dormant until
// the public key is pasted from the Freemius dashboard.
defined( 'MAILYARD_FS_ID' ) || define( 'MAILYARD_FS_ID', '34096' );
defined( 'MAILYARD_FS_PUBLIC_KEY' ) || define( 'MAILYARD_FS_PUBLIC_KEY', '' );

if ( ! function_exists( 'mailyard_fs' ) ) {
	/**
	 * Singleton accessor for the Mailyard Freemius (parent) instance.
	 *
	 * @return Freemius|null The instance, or null if not yet configured / SDK absent.
	 */
	function mailyard_fs() {
		global $mailyard_fs;

		if ( ! isset( $mailyard_fs ) ) {
			// Dormant until the product exists in the Freemius dashboard.
			if ( '' === MAILYARD_FS_ID || '' === MAILYARD_FS_PUBLIC_KEY ) {
				return null;
			}

			// SDK is provided by the Mailyard Pro add-on (loads before us);
			// the free build ships without it.
			if ( ! function_exists( 'fs_dynamic_init' ) ) {
				return null;
			}

			$mailyard_fs = fs_dynamic_init(
				array(
					'id'             => MAILYARD_FS_ID,
					'slug'           => 'mailyard',
					'type'           => 'plugin',
					'public_key'     => MAILYARD_FS_PUBLIC_KEY,
					'is_premium'     => false,
					'has_addons'     => true,
					'has_paid_plans' => false,
					// Mailyard owns a top-level menu (slot 58.14); Freemius
					// Account hangs under it as a native WP submenu.
					'menu'           => array(
						'slug'       => 'mailyard',
						'first-path' => 'admin.php?page=mailyard',
						'account'    => true,
						'contact'    => false,
						'support'    => false,
						'pricing'    => false,
					),
				)
			);
		}

		return $mailyard_fs;
	}

	// Init Freemius.
	mailyard_fs();
	// Signal readiness — the Mailyard Pro add-on inits on this action.
	do_action( 'mailyard_fs_loaded' );
}
