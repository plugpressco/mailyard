import { cn } from '@/lib/utils';
import { SendIcon, HelpIcon } from './Icons';

function routeActive( route, itemRoute ) {
	return route === itemRoute || route.startsWith( itemRoute + '/' ) || ( '' === route && 'dashboard' === itemRoute );
}

function NavItem( { item, active, onClick } ) {
	const Icon = item.icon;
	return (
		<button
			onClick={ onClick }
			className={ cn(
				'relative flex w-full cursor-pointer items-center gap-2.5 rounded-lg border-none bg-transparent px-3 py-2 text-left text-[13px] font-medium transition-colors duration-150',
				active ? 'bg-brand/[0.08] text-brand' : 'text-ink-500 hover:bg-ink-100 hover:text-ink-900'
			) }
		>
			{ active && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand" /> }
			{ Icon && <Icon className="h-[18px] w-[18px] shrink-0" /> }
			{ item.label }
		</button>
	);
}

function Group( { group, route, onNavigate } ) {
	return (
		<div className="flex flex-col gap-0.5">
			{ group.label && (
				<div className="px-3 pb-1 pt-4 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-400">
					{ group.label }
				</div>
			) }
			{ group.items.map( ( item ) => (
				<NavItem
					key={ item.id }
					item={ item }
					active={ routeActive( route, item.route ) }
					onClick={ () => onNavigate( item.route ) }
				/>
			) ) }
		</div>
	);
}

/**
 * Grouped sidebar over the merged shell model. Renders ONLY registered
 * groups — when Mailyard Pro isn't active its groups simply don't exist;
 * there are no locked or placeholder entries.
 */
export default function Sidebar( { groups, modules = [], route, onNavigate } ) {
	const main = groups.filter( ( g ) => ! g.footer );
	const footer = groups.filter( ( g ) => g.footer );

	const versionLine = modules
		.filter( ( m ) => m.version )
		.map( ( m ) => `${ m.versionLabel || m.id } v${ m.version }` )
		.join( ' · ' );

	return (
		<aside className="sticky top-8 flex h-[calc(100vh-2rem)] w-[228px] shrink-0 flex-col self-start border-r border-ink-200 bg-surface px-3 py-4">
			{ /* Brand */ }
			<div className="mb-5 flex items-center gap-2 px-2">
				<span className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] bg-ink-900">
					<SendIcon className="h-[14px] w-[14px] text-white" />
				</span>
				<span className="text-[15px] font-semibold tracking-[-0.01em] text-ink-900">Mailyard</span>
			</div>

			{ /* Grouped nav */ }
			<nav className="flex flex-col gap-0.5">
				{ main.map( ( group ) => (
					<Group key={ group.id } group={ group } route={ route } onNavigate={ onNavigate } />
				) ) }
			</nav>

			{ /* Footer */ }
			<div className="mt-auto flex flex-col gap-0.5 border-t border-ink-200 pt-3">
				{ footer.map( ( group ) => (
					<Group key={ group.id } group={ group } route={ route } onNavigate={ onNavigate } />
				) ) }
				{ /* !text-*: wp-admin's id-scoped `#wpbody-content a` rule beats
				     plain utilities on anchors — see globals.css note. */ }
				<a
					href="https://wordpress.org/plugins/mailyard/"
					target="_blank"
					rel="noopener noreferrer"
					className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium !text-ink-500 no-underline transition-colors duration-150 hover:bg-ink-100 hover:!text-ink-900"
				>
					<HelpIcon className="h-[18px] w-[18px] shrink-0" />
					Help &amp; docs
				</a>
				{ versionLine && (
					<div className="px-3 pt-2 text-[11px] font-medium text-ink-400">{ versionLine }</div>
				) }
			</div>
		</aside>
	);
}
