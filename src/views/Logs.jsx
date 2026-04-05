import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import useLogs from '@/hooks/useLogs';
import useResend from '@/hooks/useResend';
import ProviderIcon from '@/components/ProviderIcon';
import StatusPill from '@/components/StatusPill';
import { Card, Button, Input, Select, TableSkeleton } from '@/components/ui';
import {
	RetryIcon, DownloadIcon, SearchIcon, EyeIcon, SendIcon, CheckIcon, SpinnerIcon,
} from '@/components/Icons';
import { LIVE_PROVIDERS } from '@/lib/providers';

const FILTERS = [ 'all', 'sent', 'retried', 'failed', 'blocked' ];

export default function Logs() {
	const [ filter, setFilter ] = useState( 'all' );
	const [ query, setQuery ] = useState( '' );
	const [ openId, setOpenId ] = useState( null );

	const { logs, loading, updateLog } = useLogs( { status: filter, search: query } );
	const { sending, sent, resend } = useResend();

	const failedCount = logs.filter( ( r ) => r.status === 'failed' || r.status === 'blocked' ).length;

	const doResend = useCallback( ( id ) => {
		resend( id ).then( ( ok ) => {
			if ( ok ) updateLog( id, { status: 'sent' } );
		} );
	}, [ resend, updateLog ] );

	const resendAll = useCallback( () => {
		logs.filter( ( r ) => r.status === 'failed' ).forEach( ( r, i ) => {
			setTimeout( () => doResend( r.id ), i * 800 );
		} );
	}, [ logs, doResend ] );

	return (
		<div>
			<div className="mb-3.5 flex items-center justify-between">
				<h2 className="m-0 text-[15px] font-bold text-warm-900">Email Logs</h2>
				<div className="flex gap-1.5">
					{ failedCount > 0 && (
						<Button variant="danger" size="sm" onClick={ resendAll }>
							<RetryIcon className="h-3.5 w-3.5" /> Resend { failedCount } failed
						</Button>
					) }
					<Button variant="secondary" size="sm">
						<DownloadIcon className="h-3.5 w-3.5" /> Export
					</Button>
				</div>
			</div>

			<div className="mb-3 flex items-center justify-between gap-2">
				<div className="flex gap-0.5 rounded-lg border border-warm-200/70 p-[3px]">
					{ FILTERS.map( ( v ) => (
						<button
							key={ v }
							onClick={ () => setFilter( v ) }
							className={ cn(
								'rounded-md border-none px-[11px] py-1 text-[11.5px] font-medium capitalize cursor-pointer transition-colors',
								filter === v ? 'bg-warm-900 text-white' : 'bg-transparent text-warm-400 hover:text-warm-600'
							) }
						>
							{ v }
						</button>
					) ) }
				</div>
				<div className="relative">
					<SearchIcon className="absolute left-[9px] top-[8px] h-3.5 w-3.5 text-warm-400" />
					<input
						id="mm-log-search"
						name="mm-log-search"
						placeholder="Search…"
						value={ query }
						onChange={ ( e ) => setQuery( e.target.value ) }
						className="h-8 w-[200px] rounded-lg border border-warm-200 bg-white pl-7 pr-2.5 text-xs text-warm-900 outline-none transition-colors focus:border-brand"
					/>
				</div>
			</div>

			{ loading ? (
				<TableSkeleton />
			) : (
				<Card className="overflow-hidden">
					<table className="w-full border-collapse text-xs">
						<thead>
							<tr>
								{ [ 'To', 'Subject', 'Via', 'Status', 'Time', '' ].map( ( h ) => (
									<th key={ h } className="border-b border-warm-200/50 px-3.5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-warm-400">{ h }</th>
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
									isOpen={ openId === r.id }
									isSending={ !! sending[ r.id ] }
									isSent={ !! sent[ r.id ] }
									onToggle={ () => setOpenId( openId === r.id ? null : r.id ) }
									onResend={ () => doResend( r.id ) }
								/>
							) ) }
						</tbody>
					</table>
					{ logs.length === 0 && (
						<div className="py-9 text-center text-[12.5px] text-warm-400">
							{ filter === 'all' ? 'No emails logged yet.' : `No ${ filter } emails.` }
						</div>
					) }
				</Card>
			) }
		</div>
	);
}

function LogRow( { row: r, index, total, isOpen, isSending, isSent, onToggle, onResend } ) {
	const provider = LIVE_PROVIDERS.find( ( p ) => p.id === r.provider );
	const statusLabel = isSending ? 'Sending…' : isSent ? 'Resent ✓' : r.status;
	const statusVariant = isSending ? 'accent' : isSent ? 'ok' : undefined;

	return (
		<>
			<tr
				onClick={ onToggle }
				className={ cn(
					'cursor-pointer transition-colors',
					isOpen ? 'bg-warm-50' : 'hover:bg-warm-50/50',
					! isOpen && index < total - 1 && 'border-b border-warm-200/40'
				) }
			>
				<td className="px-3.5 py-[9px] font-medium text-warm-800">{ r.to }</td>
				<td className="max-w-[180px] truncate px-3.5 py-[9px] text-warm-500">{ r.subject }</td>
				<td className="px-3.5 py-[9px]">
					{ provider ? (
						<div className="flex items-center gap-[5px]">
							<ProviderIcon id={ r.provider } size={ 16 } />
							<span className="text-[11px] text-warm-500">{ provider.name }</span>
						</div>
					) : (
						<span className="text-warm-400">—</span>
					) }
				</td>
				<td className="px-3.5 py-[9px]">
					<StatusPill status={ statusLabel } variant={ statusVariant }>{ statusLabel }</StatusPill>
				</td>
				<td className="px-3.5 py-[9px] text-[11px] text-warm-400">{ r.time || r.created_at }</td>
				<td className="px-3.5 py-[9px]" onClick={ ( e ) => e.stopPropagation() }>
					<div className="flex gap-0.5">
						<Button variant="ghost" size="icon" aria-label="Preview email" onClick={ onToggle }>
							<EyeIcon className="h-4 w-4" />
						</Button>
						<Button variant="ghost" size="icon" aria-label="Resend email" onClick={ onResend } disabled={ isSending }>
							{ isSending ? <SpinnerIcon className="h-4 w-4" /> : <RetryIcon className="h-4 w-4" /> }
						</Button>
					</div>
				</td>
			</tr>

			{ isOpen && (
				<tr>
					<td colSpan={ 6 } className="p-0">
						<div className="border-b border-warm-200/40 bg-warm-50 px-3.5 py-3.5 pb-4">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-warm-400">Email preview</div>
									<div className="rounded-lg border border-warm-200/70 bg-surface p-3.5">
										<div className="mb-2 flex justify-between border-b border-warm-200/40 pb-2">
											<div>
												<div className="text-[12.5px] font-semibold text-warm-900">{ r.subject }</div>
												<div className="mt-[2px] text-[11px] text-warm-400">To: { r.to }</div>
											</div>
											<div className="text-[10.5px] text-warm-400">{ r.time || r.created_at }</div>
										</div>
										<div className="text-xs leading-relaxed text-warm-600">
											{ r.body ? r.body.substring( 0, 200 ) : 'No body preview available.' }
										</div>
									</div>
									{ r.headers && (
										<div className="mt-2 break-all rounded-lg border border-warm-200/70 bg-surface px-2.5 py-1.5 font-mono text-[10.5px] text-warm-400">
											{ r.headers }
										</div>
									) }
								</div>
								<div>
									<div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-warm-400">Resend this email</div>
									<div className="rounded-lg border border-warm-200/70 bg-surface p-3.5">
										<div className="mb-2.5">
											<Input label="Send to" defaultValue={ r.to } id={ `resend-to-${ r.id }` } />
										</div>
										<div className="mb-3">
											<Select
												label="Via provider"
												id={ `resend-via-${ r.id }` }
												defaultValue={ r.provider || 'ses' }
												options={ LIVE_PROVIDERS.filter( ( p ) => p.id !== 'php' ).map( ( p ) => ( { value: p.id, label: p.name } ) ) }
											/>
										</div>
										<Button className="w-full justify-center" disabled={ isSending } onClick={ onResend }>
											{ isSending ? ( <><SpinnerIcon className="h-3.5 w-3.5" style={ { stroke: '#fff' } } /> Sending…</> )
												: isSent ? ( <><CheckIcon className="h-3.5 w-3.5" /> Delivered!</> )
												: ( <><SendIcon className="h-3.5 w-3.5" /> Resend now</> ) }
										</Button>
										{ isSent && (
											<div className="mt-2 flex items-center gap-[5px] text-[11.5px] text-success">
												<CheckIcon className="h-3.5 w-3.5" /> Successfully delivered
											</div>
										) }
									</div>
									{ r.status === 'blocked' && (
										<div className="mt-2 rounded-lg bg-danger-light px-2.5 py-2 text-[11.5px] leading-snug text-danger">
											<strong>Blocked by Send Guard</strong> — review content before resending.
										</div>
									) }
									{ r.status === 'failed' && (
										<div className="mt-2 rounded-lg bg-warning-light px-2.5 py-2 text-[11.5px] leading-snug text-warning">
											<strong>Delivery failed</strong> — try a different provider.
										</div>
									) }
								</div>
							</div>
						</div>
					</td>
				</tr>
			) }
		</>
	);
}
