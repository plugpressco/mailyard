import { useState, useEffect, useCallback } from 'react';
import { Drawer, toast } from '@plugpress/ui';
import { cn } from '@/lib/utils';
import { get, post } from '@/lib/api';
import ProviderIcon from '@/components/ProviderIcon';
import StatusPill from '@/components/StatusPill';
import {
	Button,
	Card,
	Input,
	Select,
	SectionTitle,
	PageHeader,
	TableSkeleton,
} from '@/components/ui';
import { SearchIcon } from '@/components/Icons';
import { LIVE_PROVIDERS } from '@/lib/providers';

const FILTERS = [ 'all', 'sent', 'failed' ];
const PER_PAGE = 25;
const PROVIDER_OPTIONS = [ { value: 'all', label: 'All providers' }, ...LIVE_PROVIDERS.map( ( p ) => ( { value: p.id, label: p.name } ) ) ];

// The log, filtered and paged server-side. A search waits for typing to pause.
function useLogPage( filters, page ) {
	const [ data, setData ] = useState( { items: [], total: 0 } );
	const [ loading, setLoading ] = useState( true );
	const [ error, setError ] = useState( null );

	const load = useCallback( () => {
		get( 'logs', { ...filters, page, per_page: PER_PAGE } )
			.then( ( res ) => { setData( { items: res.items || [], total: res.total || 0 } ); setError( null ); } )
			.catch( ( err ) => setError( err?.message || 'Failed to load the log.' ) )
			.finally( () => setLoading( false ) );
	}, [ filters.status, filters.provider, filters.search, page ] ); // eslint-disable-line react-hooks/exhaustive-deps

	useEffect( () => {
		const t = setTimeout( load, filters.search ? 300 : 0 );
		return () => clearTimeout( t );
	}, [ load ] ); // eslint-disable-line react-hooks/exhaustive-deps

	return { ...data, loading, error, refetch: load };
}

export default function Logs() {
	const [ filter, setFilter ] = useState( 'all' );
	const [ provider, setProvider ] = useState( 'all' );
	const [ query, setQuery ] = useState( '' );
	const [ page, setPage ] = useState( 1 );
	const [ selected, setSelected ] = useState( null );
	const [ exporting, setExporting ] = useState( false );

	const filters = { status: filter, provider, search: query.trim() };
	const { items: logs, total, loading, error, refetch } = useLogPage( filters, page );
	const pages = Math.max( 1, Math.ceil( total / PER_PAGE ) );

	// Any filter change starts over at page 1.
	useEffect( () => setPage( 1 ), [ filter, provider, query ] );

	const exportCsv = () => {
		setExporting( true );
		get( 'logs/export', filters )
			.then( ( res ) => {
				const url = URL.createObjectURL( new Blob( [ res.csv ], { type: 'text/csv;charset=utf-8' } ) );
				const a = document.createElement( 'a' );
				a.href = url;
				a.download = res.filename || 'mailyard-log.csv';
				a.click();
				URL.revokeObjectURL( url );
			} )
			.catch( ( err ) => toast.error( err?.message || 'Export failed' ) )
			.finally( () => setExporting( false ) );
	};

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
				title="Email log"
				subtitle="Every email your site sent, or tried to. Click one to read it, see the error, or send it again."
				action={
					<Button size="sm" variant="secondary" disabled={ exporting || ! total } onClick={ exportCsv }>
						{ exporting ? 'Exporting…' : 'Export CSV' }
					</Button>
				}
			/>

			<div className="mb-3 flex flex-wrap items-center justify-between gap-2">
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
				<div className="flex items-center gap-2">
					<Select
						size="sm"
						aria-label="Provider"
						options={ PROVIDER_OPTIONS }
						value={ provider }
						onChange={ ( e ) => setProvider( e.target.value ) }
						className="w-[160px]"
					/>
					<Input
						id="my-log-search"
						size="sm"
						icon={ <SearchIcon className="h-3.5 w-3.5" /> }
						placeholder="Search recipient or subject"
						value={ query }
						onChange={ ( e ) => setQuery( e.target.value ) }
						className="w-[220px]"
					/>
				</div>
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
							{ filter === 'all' && provider === 'all' && ! query
								? 'No emails logged yet.'
								: 'No emails match these filters.' }
						</div>
					) }
				</Card>
			) }

			{ total > PER_PAGE && (
				<div className="mt-3 flex items-center justify-between text-[12px] text-ink-500">
					<span>
						{ ( page - 1 ) * PER_PAGE + 1 }–{ Math.min( page * PER_PAGE, total ) } of { total }
					</span>
					<div className="flex gap-1.5">
						<Button size="sm" variant="secondary" disabled={ page <= 1 } onClick={ () => setPage( page - 1 ) }>Previous</Button>
						<Button size="sm" variant="secondary" disabled={ page >= pages } onClick={ () => setPage( page + 1 ) }>Next</Button>
					</div>
				</div>
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

			{ r.status !== 'pending' && (
				<div className="mb-4">
					<Button size="sm" variant={ r.status === 'failed' ? undefined : 'secondary' } onClick={ resend } disabled={ resending }>
						{ resending ? 'Resending…' : 'Resend email' }
					</Button>
					<p className="mt-1.5 mb-0 text-[11px] text-ink-400">
						Sends this message again through your current connections. Attachments aren’t kept in the log, so they don’t go with it.
					</p>
				</div>
			) }

			{ ( r.cc?.length > 0 || r.bcc?.length > 0 || r.reply_to ) && (
				<dl className="mb-4 grid grid-cols-[72px_1fr] gap-x-3 gap-y-1 text-[12px]">
					{ r.cc?.length > 0 && <><dt className="text-ink-400">Cc</dt><dd className="m-0 break-all font-mono text-ink-700">{ r.cc.join( ', ' ) }</dd></> }
					{ r.bcc?.length > 0 && <><dt className="text-ink-400">Bcc</dt><dd className="m-0 break-all font-mono text-ink-700">{ r.bcc.join( ', ' ) }</dd></> }
					{ r.reply_to && <><dt className="text-ink-400">Reply-To</dt><dd className="m-0 break-all font-mono text-ink-700">{ r.reply_to }</dd></> }
				</dl>
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
