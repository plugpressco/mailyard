import { useState, useEffect } from 'react';
import { Drawer, toast } from '@plugpress/ui';
import { cn } from '@/lib/utils';
import { post } from '@/lib/api';
import useLogs from '@/hooks/useLogs';
import ProviderIcon from '@/components/ProviderIcon';
import StatusPill from '@/components/StatusPill';
import {
	Button,
	Card,
	Input,
	SectionTitle,
	PageHeader,
	TableSkeleton,
} from '@/components/ui';
import { SearchIcon } from '@/components/Icons';
import { LIVE_PROVIDERS } from '@/lib/providers';

const FILTERS = [ 'all', 'sent', 'failed' ];

export default function Logs() {
	const [ filter, setFilter ] = useState( 'all' );
	const [ query, setQuery ] = useState( '' );
	const [ selected, setSelected ] = useState( null );

	const { logs, loading, error, refetch } = useLogs( {
		status: filter,
		search: query,
	} );

	// Close the drawer with Escape.
	useEffect( () => {
		if ( ! selected ) {
			return;
		}
		const onKey = ( e ) => {
			if ( e.key === 'Escape' ) {
				setSelected( null );
			}
		};
		window.addEventListener( 'keydown', onKey );
		return () => window.removeEventListener( 'keydown', onKey );
	}, [ selected ] );

	return (
		<div>
			<PageHeader
				title="Logs"
				subtitle="Every email sent through Mailyard."
			/>

			<div className="mb-3 flex items-center justify-between gap-2">
				<div className="inline-flex gap-1 rounded-lg bg-ink-100 p-1">
					{ FILTERS.map( ( v ) => (
						<button
							key={ v }
							onClick={ () => setFilter( v ) }
							className={ cn(
								'cursor-pointer rounded-md border-none px-3 py-1 text-[11.5px] font-medium capitalize transition-colors duration-150',
								filter === v
									? 'bg-surface text-ink-900 shadow-sm'
									: 'bg-transparent text-ink-500 hover:text-ink-800'
							) }
						>
							{ v }
						</button>
					) ) }
				</div>
				<Input
					id="my-log-search"
					size="sm"
					icon={ <SearchIcon className="h-3.5 w-3.5" /> }
					placeholder="Search…"
					value={ query }
					onChange={ ( e ) => setQuery( e.target.value ) }
					className="w-[200px]"
				/>
			</div>

			{ error && (
				<div className="mb-3 rounded-lg bg-danger-light px-3 py-2.5 text-[12.5px] text-danger">
					<strong>Couldn't load logs:</strong> { error }
				</div>
			) }

			{ loading ? (
				<TableSkeleton />
			) : (
				<Card className="overflow-hidden">
					<table className="w-full border-collapse text-xs">
						<thead>
							<tr>
								{ [
									'To',
									'Subject',
									'Via',
									'Status',
									'Time',
								].map( ( h ) => (
									<th
										key={ h }
										className="border-b border-ink-200/50 px-3.5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-ink-400"
									>
										{ h }
									</th>
								) ) }
							</tr>
						</thead>
						<tbody>
							{ logs.map( ( r, i ) => (
								<LogRow
									key={ r.id }
									row={ r }
									index={ i }
									total={ logs.length }
									isActive={ selected?.id === r.id }
									onSelect={ () => setSelected( r ) }
								/>
							) ) }
						</tbody>
					</table>
					{ logs.length === 0 && (
						<div className="py-9 text-center text-[12.5px] text-ink-400">
							{ filter === 'all'
								? 'No emails logged yet.'
								: `No ${ filter } emails.` }
						</div>
					) }
				</Card>
			) }

			{ selected && (
				<LogDrawer
					row={ selected }
					onClose={ () => setSelected( null ) }
					onResent={ refetch }
				/>
			) }
		</div>
	);
}

function LogRow( { row: r, index, total, isActive, onSelect } ) {
	const provider = LIVE_PROVIDERS.find( ( p ) => p.id === r.provider );

	return (
		<tr
			onClick={ onSelect }
			className={ cn(
				'cursor-pointer transition-colors',
				isActive ? 'bg-brand-light' : 'hover:bg-ink-50/50',
				index < total - 1 && 'border-b border-ink-200/40'
			) }
		>
			<td className="px-3.5 py-[9px] font-mono text-[12px] text-ink-700">
				{ r.to }
			</td>
			<td className="max-w-[260px] truncate px-3.5 py-[9px] text-ink-500">
				{ r.subject }
			</td>
			<td className="px-3.5 py-[9px]">
				{ provider ? (
					<div className="flex items-center gap-[5px]">
						<ProviderIcon id={ r.provider } size={ 16 } />
						<span className="text-[11px] text-ink-500">
							{ provider.name }
						</span>
					</div>
				) : (
					<span className="text-ink-400">—</span>
				) }
			</td>
			<td className="px-3.5 py-[9px]">
				<StatusPill status={ r.status }>{ r.status }</StatusPill>
			</td>
			<td className="px-3.5 py-[9px] text-[11px] text-ink-400">
				{ r.time || r.created_at }
			</td>
		</tr>
	);
}

function LogDrawer( { row: r, onClose, onResent } ) {
	const provider = LIVE_PROVIDERS.find( ( p ) => p.id === r.provider );
	const [ resending, setResending ] = useState( false );
	const [ showRaw, setShowRaw ] = useState( false );

	const resend = () => {
		setResending( true );
		post( `logs/${ r.id }/resend` )
			.then( ( res ) => {
				if ( res?.ok ) {
					toast.success( 'Email resent successfully.' );
				} else {
					toast.error(
						'Resend failed — check the new log entry for details.'
					);
				}
				onResent?.();
				onClose();
			} )
			.catch( ( err ) =>
				toast.error( err?.message || 'Resend request failed.' )
			)
			.finally( () => setResending( false ) );
	};

	return (
		<Drawer
			open
			onOpenChange={ ( open ) => ! open && onClose() }
			width={ 520 }
			title={ r.subject || '(no subject)' }
			description={ r.to }
		>
			<div className="mb-4 flex items-center gap-3 text-[11.5px]">
				<StatusPill status={ r.status }>{ r.status }</StatusPill>
				{ provider && (
					<div className="flex items-center gap-1.5 text-ink-500">
						<ProviderIcon id={ r.provider } size={ 14 } />
						<span>{ provider.name }</span>
					</div>
				) }
				<span className="ml-auto text-ink-400">
					{ r.time || r.created_at }
				</span>
			</div>

			{ r.status === 'failed' && ( r.error_human || r.error ) && (
				<div className="mb-4 rounded-lg bg-danger-light px-3 py-2.5 text-[12px] text-danger">
					<SectionTitle className="mb-0.5 text-danger">
						{ r.error_human?.title || 'Error' }
					</SectionTitle>
					{ r.error_human?.guidance && (
						<p className="mb-0 leading-relaxed">
							{ r.error_human.guidance }
						</p>
					) }
					{ r.error && (
						<div className="mt-2">
							<button
								type="button"
								onClick={ () => setShowRaw( ( v ) => ! v ) }
								className="text-[11px] font-medium underline underline-offset-2 opacity-80 hover:opacity-100"
							>
								{ showRaw
									? 'Hide technical details'
									: 'Show technical details' }
							</button>
							{ showRaw && (
								<div className="mt-1.5 break-all rounded border border-danger/20 bg-white/60 p-2 font-mono text-[10.5px]">
									{ r.error }
								</div>
							) }
						</div>
					) }
				</div>
			) }

			{ r.status === 'failed' && (
				<div className="mb-4">
					<Button size="sm" onClick={ resend } disabled={ resending }>
						{ resending ? 'Resending…' : 'Resend email' }
					</Button>
					<p className="mt-1.5 mb-0 text-[11px] text-ink-400">
						Replays this message through your current connections.
					</p>
				</div>
			) }

			<SectionTitle className="mb-1">Body</SectionTitle>
			<div className="mb-4 whitespace-pre-wrap rounded-lg border border-ink-200/70 bg-white p-3 text-[12px] leading-relaxed text-ink-700">
				{ r.body || '(no body)' }
			</div>

			{ r.headers && (
				<>
					<SectionTitle className="mb-1">Headers</SectionTitle>
					<div className="break-all rounded-lg border border-ink-200/70 bg-white p-3 font-mono text-[10.5px] text-ink-500">
						{ r.headers }
					</div>
				</>
			) }
		</Drawer>
	);
}
