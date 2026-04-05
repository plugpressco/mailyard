import { useState, useEffect } from 'react';
import { get } from '@/lib/api';
import ProviderIcon from '@/components/ProviderIcon';
import StatusPill from '@/components/StatusPill';
import { Card, Button } from '@/components/ui';
import {
	UpIcon,
	LinkIcon,
	RetryIcon,
	ShieldIcon,
	MailIcon,
	CheckIcon,
} from '@/components/Icons';

function StatusDot( { status } ) {
	const colors = { sent: 'var(--mm-accent)', retried: 'var(--mm-warning)', failed: 'var(--mm-danger)', blocked: 'var(--mm-danger)' };
	return (
		<div
			className="h-[6px] w-[6px] shrink-0 rounded-full"
			style={ { background: colors[ status ] || 'var(--mm-text-muted)' } }
		/>
	);
}

function SparklineChart( { data } ) {
	if ( ! data || ! data.length ) return null;
	const w = 460;
	const h = 100;
	const padY = 12;
	const max = Math.max( ...data, 1 );
	const points = data.map( ( v, i ) => `${ ( i / ( data.length - 1 ) ) * w },${ h - padY - ( v / max ) * ( h - padY * 2 ) }` ).join( ' L' );

	return (
		<svg viewBox={ `0 0 ${ w } ${ h }` } className="block h-[100px] w-full">
			<defs>
				<linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="var(--mm-accent)" stopOpacity="0.12" />
					<stop offset="100%" stopColor="var(--mm-accent)" stopOpacity="0" />
				</linearGradient>
			</defs>
			<path d={ `M${ points } L${ w },${ h } L0,${ h }Z` } fill="url(#spark-grad)" />
			<path d={ `M${ points }` } fill="none" stroke="var(--mm-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
			{ data.length > 0 && (
				<circle
					cx={ w }
					cy={ h - padY - ( data[ data.length - 1 ] / max ) * ( h - padY * 2 ) }
					r="3.5"
					fill="var(--mm-accent)"
					stroke="var(--mm-surface)"
					strokeWidth="2"
				/>
			) }
		</svg>
	);
}

const STAT_THEMES = {
	Sent: { bg: 'bg-brand-light', text: 'text-brand', icon: MailIcon },
	Delivered: { bg: 'bg-success-light', text: 'text-success', icon: CheckIcon },
	Retried: { bg: 'bg-warning-light', text: 'text-warning', icon: RetryIcon },
	Blocked: { bg: 'bg-warm-100', text: 'text-warm-500', icon: ShieldIcon },
};

export default function Overview( { onNavigate } ) {
	const [ dashboard, setDashboard ] = useState( null );
	const [ loading, setLoading ] = useState( true );

	useEffect( () => {
		get( 'dashboard' )
			.then( setDashboard )
			.catch( () => setDashboard( null ) )
			.finally( () => setLoading( false ) );
	}, [] );

	const stats = dashboard?.stats || {};
	const chart = dashboard?.chart_data || [];
	const recent = dashboard?.recent_logs || [];
	const connCount = dashboard?.connections_count || 0;
	const retryEnabled = dashboard?.auto_retry || false;
	const shieldBlocked = dashboard?.shield_blocked || 0;

	const statCards = [
		{ name: 'Sent', value: stats.sent ?? 0, sub: stats.sent_change || '', css: 'text-brand', arrow: !! stats.sent_change },
		{ name: 'Delivered', value: stats.delivery_rate ?? '0%', sub: 'Last 30 days', css: 'text-success', arrow: false },
		{ name: 'Retried', value: stats.retried ?? 0, sub: stats.recovery_rate || '', css: 'text-warning', arrow: false },
		{ name: 'Blocked', value: stats.blocked ?? 0, sub: 'By Send Guard', css: 'text-warm-500', arrow: false },
	];

	return (
		<div>
			<div className="mb-4 grid grid-cols-4 gap-2.5">
				{ statCards.map( ( s ) => {
					const theme = STAT_THEMES[ s.name ] || STAT_THEMES.Blocked;
					const Icon = theme.icon;
					return (
						<Card key={ s.name } hover className="px-4 py-3.5">
							<div className="mb-2.5 flex items-center justify-between">
								<span className="text-[11px] font-medium uppercase tracking-wider text-warm-400">
									{ s.name }
								</span>
								<div className={ `flex h-6 w-6 items-center justify-center rounded-md ${ theme.bg }` }>
									<Icon className={ `h-4 w-4 ${ theme.text }` } />
								</div>
							</div>
							{ loading ? (
								<div className="mt-1 h-6 w-12 rounded bg-warm-100 animate-pulse" />
							) : (
								<div className="text-[24px] font-bold leading-none tracking-tight text-warm-900">
									{ s.value }
								</div>
							) }
							{ s.sub && (
								<div className={ `mt-1.5 flex items-center gap-[3px] text-[11px] ${ s.css }` }>
									{ s.arrow && <UpIcon className="h-3 w-3" /> }
									{ s.sub }
								</div>
							) }
						</Card>
					);
				} ) }
			</div>

			<div className="mb-4 grid grid-cols-[5fr_3fr] gap-3">
				<Card className="px-5 py-4">
					<div className="mb-3 flex items-center justify-between">
						<span className="text-[13px] font-semibold text-warm-900">Delivery volume</span>
						<span className="rounded-md bg-warm-100 px-2 py-[2px] text-[10.5px] font-medium text-warm-400">14 days</span>
					</div>
					{ chart.length > 0 ? (
						<SparklineChart data={ chart } />
					) : (
						<div className="flex h-[100px] flex-col items-center justify-center gap-1.5">
							<MailIcon className="h-5 w-5 text-warm-300" />
							<span className="text-xs text-warm-400">No data yet</span>
						</div>
					) }
				</Card>

				<div className="flex flex-col gap-2">
					<Card hover className="flex flex-1 cursor-pointer items-center gap-3 px-3.5 py-3">
						<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success-light">
							<LinkIcon className="h-3.5 w-3.5 text-success" />
						</div>
						<div className="flex-1">
							<div className="text-[13px] font-semibold text-warm-900">
								{ connCount } connection{ connCount !== 1 ? 's' : '' }
							</div>
							<div className="text-[11px] text-warm-400">
								{ connCount > 0 ? 'Active' : 'None configured' }
							</div>
						</div>
						{ connCount > 0 && <StatusPill status="active">Active</StatusPill> }
					</Card>
					<Card hover className="flex flex-1 cursor-pointer items-center gap-3 px-3.5 py-3">
						<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-light">
							<RetryIcon className="h-3.5 w-3.5 text-brand" />
						</div>
						<div className="flex-1">
							<div className="text-[13px] font-semibold text-warm-900">Auto-retry</div>
							<div className="text-[11px] text-warm-400">
								{ retryEnabled ? '30 min cycle' : 'Disabled' }
							</div>
						</div>
						<StatusPill variant={ retryEnabled ? 'ok' : 'default' }>
							{ retryEnabled ? 'On' : 'Off' }
						</StatusPill>
					</Card>
					<Card hover className="flex flex-1 cursor-pointer items-center gap-3 px-3.5 py-3">
						<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning-light">
							<ShieldIcon className="h-3.5 w-3.5 text-warning" />
						</div>
						<div className="flex-1">
							<div className="text-[13px] font-semibold text-warm-900">Send Guard</div>
							<div className="text-[11px] text-warm-400">
								{ shieldBlocked > 0 ? `${ shieldBlocked } blocked` : 'No blocks' }
							</div>
						</div>
					</Card>
				</div>
			</div>

			<Card className="overflow-hidden">
				<div className="flex items-center justify-between border-b border-warm-200 px-4 py-3">
					<span className="text-[13px] font-semibold text-warm-900">Recent activity</span>
					<Button variant="link" size="sm" onClick={ () => onNavigate?.( 'logs' ) }>
						All logs →
					</Button>
				</div>
				{ recent.length === 0 ? (
					<div className="flex flex-col items-center gap-2 px-4 py-10">
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-warm-100">
							<MailIcon className="h-5 w-5 text-warm-300" />
						</div>
						<p className="m-0 text-[13px] font-medium text-warm-500">No emails sent yet</p>
						<Button variant="link" size="sm" onClick={ () => onNavigate?.( 'send-test' ) }>
							Send a test to get started →
						</Button>
					</div>
				) : (
					recent.map( ( r, i ) => (
						<div
							key={ r.id || i }
							className={ `flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-hover ${ i < recent.length - 1 ? 'border-b border-warm-200' : '' }` }
						>
							<StatusDot status={ r.status } />
							{ r.provider ? (
								<ProviderIcon id={ r.provider } size={ 20 } />
							) : (
								<div className="h-5 w-5 rounded-md bg-warm-100" />
							) }
							<div className="min-w-0 flex-1">
								<span className="text-[12.5px] font-medium text-warm-900">{ r.to }</span>
								<span className="ml-2 text-xs text-warm-400">{ r.subject }</span>
							</div>
							<span className="text-[11px] text-warm-400">{ r.time }</span>
						</div>
					) )
				) }
			</Card>
		</div>
	);
}
