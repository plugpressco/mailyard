import ProviderIcon from './ProviderIcon';
import { BoltIcon } from './Icons';

export default function FailoverChain( { connections } ) {
	const active = connections.filter( ( c ) => c.enabled );

	if ( ! active.length ) {
		return null;
	}

	return (
		<div className="flex items-center gap-1.5 overflow-x-auto rounded-lg bg-brand-light/60 px-3.5 py-2.5">
			<div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-brand/10">
				<BoltIcon className="h-3.5 w-3.5 shrink-0 text-brand" />
			</div>
			<span className="mr-0.5 shrink-0 text-[11.5px] font-semibold text-brand-dark">
				Failover
			</span>
			{ active.map( ( c, i ) => (
				<span key={ c.id } className="flex items-center gap-1.5">
					<span className="flex items-center gap-1.5 whitespace-nowrap rounded-md border border-warm-200 bg-white px-2.5 py-[4px] text-[11.5px] font-medium text-warm-800">
						<ProviderIcon id={ c.provider } size={ 14 } />
						{ c.name }
					</span>
					{ i < active.length - 1 && (
						<svg className="h-3 w-3 shrink-0 text-brand/40" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
							<path d="M4 2l4 4-4 4" />
						</svg>
					) }
				</span>
			) ) }
		</div>
	);
}
