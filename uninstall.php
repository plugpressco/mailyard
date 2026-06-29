<?php
/**
 * Uninstall handler.
 *
 * Deleting the plugin is intentionally NON-DESTRUCTIVE. It NEVER drops the logs
 * table or deletes connections, settings, or any other data. Erasing data is
 * irreversible, so it is only ever performed from an explicit, confirmed
 * "Delete all data" action inside the plugin (Settings -> Danger Zone) — never
 * silently when the plugin is removed.
 *
 * Do NOT add DROP TABLE / delete_option calls here.
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

// Intentionally a no-op.
