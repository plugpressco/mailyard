import { AppNav } from '@plugpress/ui';
import { HelpIcon } from './Icons';
import MailyardMark from './Logo';

/**
 * Which item owns the current route: exact match, prefix match (nested routes
 * like `settings/marketing` belong to `settings`), or the dashboard default at
 * the empty hash. AppNav's own active test is an exact `value` match, so the
 * winner is resolved here and handed over as `value` (longest prefix wins).
 */
function activeRoute( groups, route ) {
	let best = '';
	for ( const group of groups ) {
		for ( const item of group.items || [] ) {
			const r = item.route;
			const hit = route === r || route.startsWith( r + '/' ) || ( '' === route && 'dashboard' === r );
			if ( hit && r.length >= best.length ) {
				best = r;
			}
		}
	}
	return best;
}

/**
 * The shell sidebar — a thin mapping of the merged shell model onto the design
 * system's AppNav (groups, footer groups, meta line all come from the library;
 * see @plugpress/ui docs/consumer-agent-guide.md §5).
 *
 * Renders ONLY registered groups — when Mailyard Pro isn't active its groups
 * simply don't exist; there are no locked or placeholder entries.
 */
export default function Sidebar( { groups, modules = [], route, onNavigate } ) {
	const items = groups.map( ( group ) => ( {
		heading: group.label,
		footer: !! group.footer,
		items: ( group.items || [] ).map( ( item ) => {
			const Icon = item.icon;
			return {
				value: item.route,
				label: item.label,
				icon: Icon ? <Icon size={ 18 } /> : undefined,
			};
		} ),
	} ) );

	const versionLine = modules
		.filter( ( m ) => m.version )
		.map( ( m ) => `${ m.versionLabel || m.id } v${ m.version }` )
		.join( ' · ' );

	return (
		<AppNav
			aria-label="Mailyard"
			collapsible
			storageKey="mailyard"
			collapseLabel="Collapse menu"
			brand={
				<>
					<MailyardMark size={ 26 } className="shrink-0 text-brand" />
					Mailyard
				</>
			}
			items={ items }
			value={ activeRoute( groups, route ) }
			onChange={ onNavigate }
			footer={
				<a
					href="https://wordpress.org/plugins/mailyard/"
					target="_blank"
					rel="noopener noreferrer"
					className="pp-nav__item"
				>
					<span className="pp-nav__icon" aria-hidden="true">
						<HelpIcon size={ 18 } />
					</span>
					<span className="pp-nav__label">Help &amp; docs</span>
				</a>
			}
			meta={ versionLine || undefined }
		/>
	);
}
