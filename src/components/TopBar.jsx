import { useRef, useLayoutEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { HelpIcon } from './Icons';

const navItems = [
	{ id: 'dashboard', label: 'Dashboard' },
	{ id: 'connections', label: 'Connections' },
	{ id: 'logs', label: 'Email Logs' },
	{ id: 'send-test', label: 'Send Test' },
	{ id: 'settings', label: 'Settings' },
];

export default function TopBar( { view, onNavigate } ) {
	const navRef = useRef( null );
	const [ lineStyle, setLineStyle ] = useState( {} );

	useLayoutEffect( () => {
		if ( ! navRef.current ) return;
		const el = navRef.current.querySelector( `[data-nav="${ view }"]` );
		if ( el ) {
			setLineStyle( {
				width: el.offsetWidth,
				transform: `translateX(${ el.offsetLeft }px)`,
			} );
		}
	}, [ view ] );

	return (
		<div className="sticky top-0 z-30 border-b border-warm-200/60 bg-surface">
			<div className="flex h-[46px] items-center justify-between px-6">
				<div className="flex items-center gap-0">
					{ /* Logo text */ }
					<span
						className="mr-4 text-[15px] font-bold text-warm-900"
						style={ { letterSpacing: '-0.4px' } }
					>
						MoolMail
					</span>
					<div className="mr-3 h-4 w-px bg-warm-200/60" />

					<nav ref={ navRef } className="relative flex items-center gap-0">
						{ navItems.map( ( item ) => (
							<button
								key={ item.id }
								data-nav={ item.id }
								onClick={ () => onNavigate( item.id ) }
								className={ cn(
									'relative cursor-pointer border-none bg-transparent px-3 py-[13px] text-[13px] font-medium transition-colors duration-150',
									view === item.id
										? 'text-warm-900'
										: 'text-warm-500 hover:text-warm-800'
								) }
							>
								{ item.label }
							</button>
						) ) }
						<div
							className="absolute bottom-0 h-[2px] rounded-full bg-brand transition-all duration-200 ease-out"
							style={ lineStyle }
						/>
					</nav>
				</div>

				<div className="flex items-center gap-2">
					<span className="mr-1 text-[11px] text-warm-400">v1.0.0</span>
					<button aria-label="Help" className="inline-flex items-center justify-center rounded-lg p-[6px] text-warm-400 transition-colors duration-150 hover:bg-warm-100 hover:text-warm-600 cursor-pointer border-none bg-transparent">
						<HelpIcon className="h-4 w-4" />
					</button>
				</div>
			</div>
		</div>
	);
}
