import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { get, post } from '@/lib/api';
import useDeliverability from '@/hooks/useDeliverability';
import ProviderIcon from '@/components/ProviderIcon';
import { Card, Button, Input, PageHeader } from '@/components/ui';
import VolumeChart from '@/components/ui/VolumeChart';
import { SendIcon, SpinnerIcon, CheckIcon, XIcon, ChevronRightIcon } from '@/components/Icons';

const HEALTH = {
	healthy: { label: 'Healthy',     cls: 'bg-success/10 text-success', dot: 'bg-success' },
	warning: { label: 'Warning',     cls: 'bg-warning/10 text-warning', dot: 'bg-warning' },
	down:    { label: 'No delivery', cls: 'bg-danger/10 text-danger',   dot: 'bg-danger' },
	offline: { label: 'Offline',     cls: 'bg-ink-100 text-ink-700',    dot: 'bg-ink-400' },
	locked:  { label: 'Locked',      cls: 'bg-danger/10 text-danger',   dot: 'bg-danger' },
};

const BANNER = {
	down: { text: 'No delivery — there is no enabled connection, so email is not being sent.', action: 'Add a connection', route: 'connections' },
	warning: { text: 'Some recent emails failed to send.', action: 'View the log', route: 'logs' },
	offline: { text: 'Offline mode is on — every email is logged, none are sent.', action: 'Turn it off', route: 'settings' },
	locked: { text: 'Your saved credentials can’t be read — this site’s security keys changed since they were encrypted. Enter them again in Connections.', action: 'Open Connections', route: 'connections' },
};

const GRADE_TONE = { A: 'text-success', B: 'text-success', C: 'text-warning', D: 'text-danger', F: 'text-danger' };

function StatusDot( { status } ) {
	const cls = status === 'sent' ? 'bg-success' : status === 'failed' ? 'bg-danger' : 'bg-ink-300';
	return <span className={ `h-2 w-2 shrink-0 rounded-full ${ cls }` } title={ status || 'pending' } />;
}

function Kpi( { label, value, sub, tone } ) {
	return (
		<Card className="p-4">
			<div className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-ink-400">{ label }</div>
			<div className={ cn( 'mt-1.5 font-mono text-[24px] font-semibold leading-none', tone || 'text-ink-900' ) }>{ value }</div>
			{ sub && <div className="mt-1.5 truncate text-[11.5px] text-ink-500">{ sub }</div> }
		</Card>
	);
}

function PanelHead( { title, action, onAction } ) {
	return (
		<div className="flex items-center justify-between border-b border-ink-200 px-4 py-3">
			<span className="text-[13px] font-semibold text-ink-900">{ title }</span>
			{ action && (
				<button onClick={ onAction } className="inline-flex items-center gap-0.5 cursor-pointer border-none bg-transparent text-[12px] font-medium text-brand-text hover:underline">
					{ action } <ChevronRightIcon className="h-3 w-3" />
				</button>
			) }
		</div>
	);
}

function ChainPanel( { chain, onNavigate } ) {
	const backups = Math.max( 0, chain.length - 1 );
	const title = (
		<>
			Delivery chain
			{ chain.length > 0 && (
				<span className="ml-1.5 font-normal text-ink-400">
					· { chain.length === 1 ? 'no backup' : `${ backups } backup` }
				</span>
			) }
		</>
	);
	return (
		<Card className="overflow-hidden p-0">
			<PanelHead title={ title } action="Manage" onAction={ () => onNavigate( 'connections' ) } />
			{ chain.length === 0 ? (
				<div className="px-4 py-8 text-center text-[12px] text-ink-400">No connections yet.</div>
			) : (
				<div>
					{ chain.map( ( c, i ) => (
						<div key={ c.id } className="flex items-center gap-2.5 border-b border-ink-100 px-4 py-2.5 last:border-0">
							<span className="w-3 shrink-0 font-mono text-[11px] text-ink-400">{ i + 1 }</span>
							<ProviderIcon id={ c.provider } size={ 22 } />
							<div className="min-w-0 flex-1">
								<div className="truncate text-[12.5px] font-medium text-ink-900">{ c.name }</div>
								<div className="truncate font-mono text-[11px] text-ink-400">{ c.from_email || '—' }</div>
							</div>
							<StatusDot status={ c.last_test_status } />
						</div>
					) ) }
				</div>
			) }
		</Card>
	);
}

function ActivityFeed( { items, onNavigate } ) {
	return (
		<Card className="overflow-hidden p-0">
			<PanelHead title="Recent activity" action="View all" onAction={ () => onNavigate( 'logs' ) } />
			{ items.length === 0 ? (
				<div className="px-4 py-10 text-center">
					<p className="m-0 mb-1 text-[12.5px] font-medium text-ink-700">No emails sent yet</p>
					<p className="m-0 text-[11.5px] text-ink-400">Send a test to see activity here.</p>
				</div>
			) : (
				<div>
					{ items.map( ( it ) => (
						<div key={ it.id } className="flex items-center gap-3 border-b border-ink-100 px-4 py-2.5 last:border-0">
							<StatusDot status={ it.status } />
							<span className="hidden w-48 shrink-0 truncate font-mono text-[12px] text-ink-700 sm:block">{ it.to }</span>
							<span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-800">{ it.subject || '(no subject)' }</span>
							<ProviderIcon id={ it.provider } size={ 16 } />
							<span className="w-24 shrink-0 whitespace-nowrap text-right text-[11px] text-ink-400">{ it.time }</span>
						</div>
					) ) }
				</div>
			) }
		</Card>
	);
}

// The most common reasons sends failed this week, in plain words.
function TopErrors( { rows, onNavigate } ) {
	return (
		<Card className="mb-4 overflow-hidden p-0">
			<PanelHead title="Why emails failed · 7 days" action="View failures" onAction={ () => onNavigate( 'logs' ) } />
			{ rows.map( ( r, i ) => (
				<div key={ i } className="flex items-start gap-3 border-b border-ink-100 px-4 py-2.5 last:border-0">
					<span className="w-8 shrink-0 font-mono text-[12px] font-semibold text-danger">{ r.count }×</span>
					<div className="min-w-0 flex-1">
						<div className="text-[12.5px] font-medium text-ink-900">{ r.human?.title || r.error }</div>
						{ r.human?.guidance && <div className="mt-0.5 text-[11.5px] leading-relaxed text-ink-500">{ r.human.guidance }</div> }
					</div>
				</div>
			) ) }
		</Card>
	);
}

function SendTestPanel( { onClose, onSent } ) {
	const [ to, setTo ] = useState( '' );
	const [ state, setState ] = useState( null );
	const [ msg, setMsg ] = useState( '' );

	const send = () => {
		setState( 'sending' );
		setMsg( '' );
		post( 'test-email', { to: to.trim() } )
			.then( ( data ) => {
				setState( data.success ? ( data.warning ? 'warning' : 'success' ) : 'error' );
				setMsg( data.message || ( data.success ? 'Sent.' : 'Failed.' ) );
				if ( data.success ) onSent?.();
			} )
			.catch( ( err ) => { setState( 'error' ); setMsg( err.message || 'Request failed.' ); } );
	};

	return (
		<Card className="mb-5 p-4">
			<div className="mb-3 flex items-center gap-2">
				<SendIcon className="h-4 w-4 text-success" />
				<span className="text-[13px] font-semibold text-ink-900">Send a test email</span>
				<span className="text-[11.5px] text-ink-400">· runs through your live routing chain</span>
				<button onClick={ onClose } className="ml-auto cursor-pointer border-none bg-transparent text-ink-400 hover:text-ink-600">
					<XIcon className="h-3.5 w-3.5" />
				</button>
			</div>
			<div className="flex items-end gap-2">
				<div className="flex-1">
					<Input type="email" value={ to } onChange={ ( e ) => setTo( e.target.value ) } placeholder="Leave empty to use your admin email" />
				</div>
				<Button onClick={ send } disabled={ state === 'sending' }>
					{ state === 'sending' ? <><SpinnerIcon className="h-3.5 w-3.5" /> Sending</> : <><SendIcon className="h-3.5 w-3.5" /> Send</> }
				</Button>
			</div>
			{ state === 'success' && <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-success/10 px-3 py-2 text-[12px] font-medium text-success"><CheckIcon className="h-3.5 w-3.5" /> { msg }</div> }
			{ state === 'warning' && <div className="mt-3 rounded-lg bg-warning/10 px-3 py-2 text-[12px] font-medium text-warning">{ msg }</div> }
			{ state === 'error' && <div className="mt-3 rounded-lg bg-danger-light px-3 py-2 text-[12px] text-danger">{ msg }</div> }
		</Card>
	);
}

export default function Dashboard( { onNavigate } ) {
	const [ data, setData ] = useState( null );
	const [ loading, setLoading ] = useState( true );
	const [ testOpen, setTestOpen ] = useState( false );
	const { domains } = useDeliverability();

	const refresh = useCallback( () => get( 'dashboard' ).then( setData ).catch( () => setData( null ) ), [] );
	useEffect( () => { refresh().finally( () => setLoading( false ) ); }, [ refresh ] );

	const health  = data?.health || ( loading ? 'healthy' : 'down' );
	const chain   = data?.chain || [];
	const recent  = data?.recent || [];
	const series  = data?.series || [];
	const sent7   = data?.sent_7d ?? 0;
	const failed7 = data?.failed_7d ?? 0;
	const meta    = HEALTH[ health ] || HEALTH.warning;

	const total = sent7 + failed7;
	const rate  = total > 0 ? Math.round( ( sent7 / total ) * 100 ) : 100;
	const worst = domains?.length ? domains.reduce( ( a, b ) => ( b.score < a.score ? b : a ) ) : null;

	return (
		<div>
			<PageHeader
				title="Overview"
				subtitle="Your sending health, volume, and recent activity at a glance."
				action={
					<div className="flex items-center gap-2.5">
						{ health === 'healthy' && (
							<span className={ `inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${ meta.cls }` }>
								<span className={ `h-1.5 w-1.5 rounded-full ${ meta.dot }` } /> { meta.label }
							</span>
						) }
						<Button size="sm" onClick={ () => setTestOpen( ( v ) => ! v ) }>
							<SendIcon className="h-3.5 w-3.5" /> Send test
						</Button>
					</div>
				}
			/>

			{ /* Degraded health earns a full-width banner, not a tiny pill —
			     it's the single most important thing on this screen. */ }
			{ ! loading && BANNER[ health ] && (
				<div className={ `mb-5 flex items-center gap-2.5 rounded-xl px-4 py-3 text-[12.5px] font-medium ${ meta.cls }` }>
					<span className={ `h-2 w-2 shrink-0 rounded-full ${ meta.dot }` } />
					<span className="min-w-0 flex-1">{ BANNER[ health ].text }</span>
					<button
						onClick={ () => onNavigate( BANNER[ health ].route ) }
						className="shrink-0 cursor-pointer border-none bg-transparent font-semibold underline underline-offset-2 hover:opacity-80"
					>
						{ BANNER[ health ].action }
					</button>
				</div>
			) }

			{ data?.checks?.length > 0 && (
				<div className="mb-5 flex flex-col gap-2">
					{ data.checks.map( ( c ) => (
						<div key={ c.id } className={ cn( 'rounded-xl px-4 py-3 text-[12.5px]', c.tone === 'warning' ? 'bg-warning/10' : 'bg-ink-100' ) }>
							<div className={ cn( 'font-semibold', c.tone === 'warning' ? 'text-warning' : 'text-ink-800' ) }>{ c.title }</div>
							<div className="mt-0.5 leading-relaxed text-ink-600">{ c.detail }</div>
						</div>
					) ) }
				</div>
			) }

			{ testOpen && <SendTestPanel onClose={ () => setTestOpen( false ) } onSent={ refresh } /> }

			<div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
				<Kpi label="Sent · 7d" value={ sent7 } sub="delivered emails" />
				<Kpi label="Failed · 7d" value={ failed7 } sub={ failed7 > 0 ? 'needs attention' : 'all clear' } tone={ failed7 > 0 ? 'text-danger' : 'text-ink-900' } />
				<Kpi label="Success rate" value={ `${ rate }%` } sub="last 7 days" tone={ rate >= 98 ? 'text-success' : rate >= 90 ? 'text-warning' : 'text-danger' } />
				<Kpi label="Deliverability" value={ worst ? worst.grade : '—' } sub={ worst ? worst.domain : 'not scanned' } tone={ worst ? GRADE_TONE[ worst.grade ] : 'text-ink-400' } />
			</div>

			<div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
				<Card className="overflow-hidden p-0 lg:col-span-2">
					<div className="flex items-center justify-between border-b border-ink-200 px-4 py-3">
						<span className="text-[13px] font-semibold text-ink-900">Send volume · 14 days</span>
						<div className="flex items-center gap-3 text-[11px] text-ink-500">
							<span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brand" /> Sent</span>
							<span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-danger" /> Failed</span>
						</div>
					</div>
					<div className="px-2 py-3">
						<VolumeChart data={ series } />
					</div>
				</Card>
				<ChainPanel chain={ chain } onNavigate={ onNavigate } />
			</div>

			{ data?.top_errors?.length > 0 && <TopErrors rows={ data.top_errors } onNavigate={ onNavigate } /> }

			<ActivityFeed items={ recent } onNavigate={ onNavigate } />
		</div>
	);
}
