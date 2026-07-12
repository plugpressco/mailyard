/**
 * Universal shell registry.
 *
 * Mailyard owns the admin shell (menu, sidebar, outlet); other plugins in the
 * family (Mailyard Pro) plug their feature groups in through ONE extension
 * point: the `mailyard.shell.modules` filter on the shared `wp.hooks`
 * registry. Both bundles externalize @wordpress/hooks to the same global, and
 * script dependency order guarantees extenders register their filter before
 * the shell mounts on DOMContentLoaded.
 *
 * Module contract (everything but id/groups/routes/Component is optional):
 *
 *   {
 *     id: 'mailyard-pro',
 *     requiresShell: 1,          // min shell API version; skipped (with a
 *                                // console.warn) when newer than SHELL_VERSION
 *     version: '0.2.0',          // shown in the sidebar footer version line
 *     versionLabel: 'Pro',
 *     Provider,                  // wraps the module's outlet (query client,
 *                                // style scope, toaster)
 *     groups: [ { id, label, order, footer?, items: [
 *       { id, label, icon, route, order } ] } ],
 *     routes: [ { prefix: 'campaigns' } ],   // route ownership, incl. hidden
 *                                            // (non-sidebar) prefixes
 *     Component,                 // outlet; receives { route, navigate };
 *                                // stays mounted across the module's routes
 *     isFullscreen: ( route ) => bool,       // suppress the sidebar
 *     skeleton: SkeletonComponent,           // Suspense fallback
 *   }
 *
 * Two more extension filters (same wp.hooks registry, same collect-once
 * semantics):
 *   `mailyard.shell.dashboardWidgets` — [{ id, order, Component }] rendered
 *     at the bottom of the Dashboard view (src/views/Dashboard.jsx).
 *   `mailyard.shell.settingsTabs`     — [{ id, label, order, Component }]
 *     rendered as tabs of the Settings view; the tab owns every route under
 *     `settings/<id>` (src/views/Settings.jsx).
 */
import { applyFilters } from '@wordpress/hooks';

export const SHELL_VERSION = 1;

/**
 * Collect registered shell modules (core + everything added via the filter).
 *
 * @param {Array} coreModules Modules the shell itself provides.
 * @return {Array} Usable modules, incompatible ones skipped.
 */
export function collectModules( coreModules ) {
	const modules = applyFilters( 'mailyard.shell.modules', [ ...coreModules ], {
		shellVersion: SHELL_VERSION,
	} );

	return ( Array.isArray( modules ) ? modules : coreModules ).filter( ( m ) => {
		if ( ! m || ! m.id || typeof m.Component === 'undefined' ) {
			return false;
		}
		if ( ( m.requiresShell ?? 1 ) > SHELL_VERSION ) {
			// eslint-disable-next-line no-console
			console.warn(
				`[mailyard] shell module "${ m.id }" needs shell v${ m.requiresShell }, this is v${ SHELL_VERSION } — skipped. Update Mailyard.`
			);
			return false;
		}
		return true;
	} );
}

/**
 * Resolve which module owns a route — the longest matching prefix wins, so a
 * module owning `marketing` beats one owning nothing, and `marketing/settings`
 * style routes stay with their owner.
 *
 * @param {Array}  modules Collected modules.
 * @param {string} route   Current hash route without the leading '#/'.
 * @return {Object|null} The owning module, or null when nothing matches.
 */
export function matchModule( modules, route ) {
	let best = null;
	let bestLen = -1;

	for ( const m of modules ) {
		for ( const r of m.routes || [] ) {
			const prefix = r.prefix;
			if ( route === prefix || route.startsWith( prefix + '/' ) ) {
				if ( prefix.length > bestLen ) {
					best = m;
					bestLen = prefix.length;
				}
			}
		}
	}

	return best;
}

/**
 * Merge every module's groups into one ordered sidebar model. Groups merge by
 * id (first definition wins label/order/footer); items concatenate and sort.
 *
 * @param {Array} modules Collected modules.
 * @return {Array} Sorted groups, each with sorted items.
 */
export function mergeGroups( modules ) {
	const byId = new Map();

	for ( const m of modules ) {
		for ( const g of m.groups || [] ) {
			if ( ! byId.has( g.id ) ) {
				byId.set( g.id, { ...g, items: [] } );
			}
			byId.get( g.id ).items.push( ...( g.items || [] ) );
		}
	}

	const groups = [ ...byId.values() ];
	groups.forEach( ( g ) => g.items.sort( ( a, b ) => ( a.order ?? 50 ) - ( b.order ?? 50 ) ) );
	groups.sort( ( a, b ) => ( a.order ?? 50 ) - ( b.order ?? 50 ) );
	return groups;
}
