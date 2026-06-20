import { cn } from '@/lib/utils';
import { GridIcon, RouteIcon, ShieldIcon, ListIcon, GearIcon, SendIcon, HelpIcon } from './Icons';

const NAV = [
	{ id: 'dashboard',      label: 'Dashboard',      Icon: GridIcon },
	{ id: 'connections',    label: 'Connections',    Icon: RouteIcon },
	{ id: 'deliverability', label: 'Deliverability', Icon: ShieldIcon },
	{ id: 'logs',           label: 'Logs',           Icon: ListIcon },
];

function NavItem( { item, active, onClick } ) {
	return (
		<button
			onClick={ onClick }
			className={ cn(
				'relative flex w-full cursor-pointer items-center gap-2.5 rounded-lg border-none bg-transparent px-3 py-2 text-left text-[13px] font-medium transition-colors duration-150',
				active ? 'bg-brand/[0.08] text-brand' : 'text-ink-500 hover:bg-ink-100 hover:text-ink-900'
			) }
		>
			{ active && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand" /> }
			<item.Icon className="h-[18px] w-[18px] shrink-0" />
			{ item.label }
		</button>
	);
}

export default function Sidebar( { view, onNavigate } ) {
	return (
		<aside className="sticky top-8 flex h-[calc(100vh-2rem)] w-[228px] shrink-0 flex-col self-start border-r border-ink-200 bg-surface px-3 py-4">
			{ /* Brand */ }
			<div className="mb-5 flex items-center gap-2 px-2">
				<span className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] bg-ink-900">
					<SendIcon className="h-[14px] w-[14px] text-white" />
				</span>
				<span className="text-[15px] font-semibold tracking-[-0.01em] text-ink-900">Mailyard</span>
			</div>

			{ /* Primary nav */ }
			<nav className="flex flex-col gap-0.5">
				{ NAV.map( ( item ) => (
					<NavItem key={ item.id } item={ item } active={ view === item.id } onClick={ () => onNavigate( item.id ) } />
				) ) }
			</nav>

			{ /* Footer */ }
			<div className="mt-auto flex flex-col gap-0.5 border-t border-ink-200 pt-3">
				<NavItem
					item={ { id: 'settings', label: 'Settings', Icon: GearIcon } }
					active={ view === 'settings' }
					onClick={ () => onNavigate( 'settings' ) }
				/>
				<a
					href="https://wordpress.org/plugins/mailyard/"
					target="_blank"
					rel="noopener noreferrer"
					className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-ink-500 no-underline transition-colors duration-150 hover:bg-ink-100 hover:text-ink-900"
				>
					<HelpIcon className="h-[18px] w-[18px] shrink-0" />
					Help &amp; docs
				</a>
				<div className="px-3 pt-2 text-[11px] font-medium text-ink-400">Mailyard v1.0.0</div>
			</div>
		</aside>
	);
}
