import { AppNav } from '@plugpress/ui';
import { HelpIcon } from './Icons';
import MailyardMark from './Logo';

/**
 * Which item owns the current route: exact match, prefix match (nested routes
 * like `settings/connect-ai` belong to `settings`), or the overview default at
 * the empty hash. AppNav's own active test is an exact `value` match, so the
 * winner is resolved here and handed over as `value` (longest prefix wins).
 */
function activeRoute( items, route ) {
	let best = '';
	for ( const item of items ) {
		const r = item.route;
		const hit = route === r || route.startsWith( r + '/' ) || ( '' === route && 'dashboard' === r );
		if ( hit && r.length >= best.length ) {
			best = r;
		}
	}
	return best;
}

/**
 * The app's top bar — a thin mapping of the NAV model (App.jsx) onto the
 * design system's AppNav in the topbar shell: brand, one row of pages, and
 * the help link right-aligned (see @plugpress/ui docs/consumer-agent-guide.md §5).
 */
export default function Nav( { items, route, onNavigate } ) {
	return (
		<AppNav
			aria-label="Mailyard"
			brand={
				<>
					<MailyardMark size={ 22 } className="shrink-0 text-brand" />
					Mailyard
				</>
			}
			items={ items.map( ( item ) => ( { value: item.route, label: item.label } ) ) }
			value={ activeRoute( items, route ) }
			onChange={ onNavigate }
			footer={
				<a
					href="https://wordpress.org/plugins/mailyard/"
					target="_blank"
					rel="noopener noreferrer"
					className="pp-nav__item"
				>
					<span className="pp-nav__icon" aria-hidden="true">
						<HelpIcon size={ 16 } />
					</span>
					<span className="pp-nav__label">Help</span>
				</a>
			}
		/>
	);
}
