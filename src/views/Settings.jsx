import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import useSettings from '@/hooks/useSettings';
import { Card, Toggle, InlineSelect, Button, SettingsSkeleton } from '@/components/ui';
import { RetryIcon, ShieldIcon, BoltIcon, CheckIcon, MailIcon, LogIcon } from '@/components/Icons';

function SettingRow( { icon: Icon, iconBg, iconColor, title, desc, right, children } ) {
	return (
		<div className="border-b border-warm-200/50 last:border-b-0">
			<div className="flex items-center justify-between px-5 py-4">
				<div className="flex items-center gap-3">
					{ Icon && (
						<div className={ `flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${ iconBg }` }>
							<Icon className={ `h-4 w-4 ${ iconColor }` } />
						</div>
					) }
					<div>
						<div className="text-[13px] font-semibold text-warm-900">{ title }</div>
						{ desc && <div className="mt-[1px] text-[12px] text-warm-400">{ desc }</div> }
					</div>
				</div>
				{ right }
			</div>
			{ children && (
				<div className="border-t border-warm-200/40 bg-warm-50/50 px-5 py-3">
					{ children }
				</div>
			) }
		</div>
	);
}

export default function Settings() {
	const { settings, loading, save } = useSettings();

	const [ log, setLog ] = useState( true );
	const [ logRetention, setLogRetention ] = useState( '30' );
	const [ defaultConn, setDefaultConn ] = useState( 'ses' );
	const [ retry, setRetry ] = useState( false );
	const [ retryDelay, setRetryDelay ] = useState( '30' );
	const [ retryAttempts, setRetryAttempts ] = useState( '3' );
	const [ retryStrategy, setRetryStrategy ] = useState( 'next' );
	const [ shield, setShield ] = useState( false );
	const [ summary, setSummary ] = useState( false );
	const [ summaryDay, setSummaryDay ] = useState( 'mon' );
	const [ sim, setSim ] = useState( false );
	const [ analytics, setAnalytics ] = useState( false );

	const timer = useRef( null );
	const lastMsg = useRef( '' );
	const [ changeCount, setChangeCount ] = useState( 0 );

	// Hydrate from API — does NOT bump changeCount.
	useEffect( () => {
		if ( ! settings ) return;
		setLog( settings.logging ?? true );
		setLogRetention( String( settings.log_retention ?? 30 ) );
		setDefaultConn( settings.default_connection ?? 'ses' );
		setRetry( settings.auto_retry ?? false );
		setRetryDelay( String( settings.retry_delay ?? 30 ) );
		setRetryAttempts( String( settings.retry_attempts ?? 3 ) );
		setRetryStrategy( settings.retry_strategy ?? 'next' );
		setShield( settings.send_guard ?? false );
		setSummary( settings.weekly_summary ?? false );
		setSummaryDay( settings.summary_day ?? 'mon' );
		setSim( settings.simulation ?? false );
		setAnalytics( settings.analytics ?? false );
	}, [ settings ] );

	// Wraps a setter — bumps changeCount to trigger auto-save.
	const set = ( setter, msg ) => ( val ) => {
		setter( val );
		lastMsg.current = msg( val );
		setChangeCount( ( c ) => c + 1 );
	};

	// Auto-save only when changeCount > 0 (user actually changed something).
	useEffect( () => {
		if ( changeCount === 0 ) return;
		clearTimeout( timer.current );
		timer.current = setTimeout( () => {
			const msg = lastMsg.current || 'Settings saved';
			save( {
				logging: log, log_retention: Number( logRetention ), default_connection: defaultConn,
				auto_retry: retry, retry_delay: Number( retryDelay ), retry_attempts: Number( retryAttempts ), retry_strategy: retryStrategy,
				send_guard: shield, weekly_summary: summary, summary_day: summaryDay, simulation: sim, analytics,
			} )
				.then( () => toast.success( msg ) )
				.catch( () => toast.error( 'Failed to save' ) );
		}, 600 );
		return () => clearTimeout( timer.current );
	}, [ changeCount ] ); // eslint-disable-line react-hooks/exhaustive-deps

	if ( loading ) {
		return <SettingsSkeleton />;
	}

	return (
		<div>
			<div className="mb-5">
				<h2 className="m-0 text-[15px] font-bold text-warm-900">Settings</h2>
				<p className="m-0 mt-0.5 text-[12.5px] text-warm-400">Changes save automatically.</p>
			</div>

			<Card className="mb-3 overflow-hidden">
				<SettingRow
					icon={ LogIcon } iconBg="bg-brand-light" iconColor="text-brand"
					title="Email logging" desc="Store outgoing emails for debugging and resend."
					right={ <Toggle label="Email logging" on={ log } onChange={ set( setLog, ( v ) => v ? 'Email logging enabled' : 'Email logging disabled' ) } /> }
				>
					{ log && (
						<div className="flex flex-col divide-y divide-warm-200/40">
							<InlineSelect label="Delete logs after" value={ logRetention } onChange={ ( e ) => set( setLogRetention, ( v ) => `Log retention set to ${ v } days` )( e.target.value ) } options={ [
								{ value: '7', label: '7 days' }, { value: '30', label: '30 days' }, { value: '90', label: '90 days' },
							] } />
							<InlineSelect label="Default connection" value={ defaultConn } onChange={ ( e ) => set( setDefaultConn, () => 'Default connection updated' )( e.target.value ) } options={ [
								{ value: 'ses', label: 'Amazon SES' }, { value: 'postmark', label: 'Postmark' },
							] } />
						</div>
					) }
				</SettingRow>

				<SettingRow
					icon={ RetryIcon } iconBg="bg-success-light" iconColor="text-success"
					title="Auto-retry" desc="Resend failed emails through backup connections."
					right={ <Toggle label="Auto-retry" on={ retry } onChange={ set( setRetry, ( v ) => v ? 'Auto-retry enabled' : 'Auto-retry disabled' ) } /> }
				>
					{ retry && (
						<>
							<div className="flex items-center gap-2 mb-3 text-[12px] font-medium text-success">
								<div className="flex h-4 w-4 items-center justify-center rounded-full bg-success-light">
									<CheckIcon className="h-3 w-3 text-success" />
								</div>
								Auto-retry is active ({ retryDelay } min cycle, { retryAttempts } attempts)
							</div>
							<div className="flex flex-col divide-y divide-warm-200/40">
								<InlineSelect label="Delay" value={ retryDelay } onChange={ ( e ) => set( setRetryDelay, ( v ) => `Retry delay set to ${ v } min` )( e.target.value ) } options={ [
									{ value: '15', label: '15 min' }, { value: '30', label: '30 min' }, { value: '60', label: '1 hour' },
								] } />
								<InlineSelect label="Max attempts" value={ retryAttempts } onChange={ ( e ) => set( setRetryAttempts, ( v ) => `Retry attempts set to ${ v }` )( e.target.value ) } options={ [
									{ value: '2', label: '2 tries' }, { value: '3', label: '3 tries' }, { value: '5', label: '5 tries' },
								] } />
								<div>
									<InlineSelect label="Strategy" value={ retryStrategy } onChange={ ( e ) => set( setRetryStrategy, ( v ) => v === 'next' ? 'Strategy: next provider' : 'Strategy: same provider' )( e.target.value ) } options={ [
										{ value: 'next', label: 'Next provider' }, { value: 'same', label: 'Same provider' },
									] } />
									<div className="text-[11px] text-warm-400 mt-0.5">Determines which connection to use when retrying failed emails.</div>
								</div>
							</div>
						</>
					) }
				</SettingRow>
			</Card>

			<Card className="mb-3 overflow-hidden">
				<div className="flex items-center justify-between px-5 py-4">
					<div className="flex items-center gap-3">
						<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning-light">
							<ShieldIcon className="h-4 w-4 text-warning" />
						</div>
						<div>
							<div className="text-[13px] font-semibold text-warm-900">Send Guard</div>
							<div className="mt-[1px] text-[12px] text-warm-400">Scan emails for problematic content before sending.</div>
						</div>
					</div>
					{ shield && <Toggle label="Send Guard" on={ shield } onChange={ set( setShield, ( v ) => v ? 'Send Guard activated' : 'Send Guard deactivated' ) } /> }
				</div>
				{ ! shield ? (
					<div className="border-t border-warm-200/40 bg-warm-50/50 px-5 py-4">
						<div className="mb-3 flex flex-col gap-1.5">
							{ [ 'Avoid getting flagged by SMTP providers', 'Maintain high sender score', 'Prevent blacklists and policy violations' ].map( ( text ) => (
								<div key={ text } className="flex items-center gap-2 text-[12.5px] text-warm-600">
									<div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success-light">
										<CheckIcon className="h-3 w-3 text-success" />
									</div>
									{ text }
								</div>
							) ) }
						</div>
						<Button size="sm" onClick={ () => set( setShield, () => 'Send Guard activated' )( true ) }>
							<BoltIcon className="h-3.5 w-3.5" /> Activate
						</Button>
					</div>
				) : (
					<div className="flex items-center gap-2 border-t border-brand-mint/30 bg-brand-light px-5 py-3 text-[12.5px] font-medium text-brand">
						<div className="flex h-4 w-4 items-center justify-center rounded-full bg-brand/10">
							<CheckIcon className="h-3 w-3" />
						</div>
						Send Guard is active
					</div>
				) }
			</Card>

			<Card className="overflow-hidden">
				<SettingRow
					icon={ MailIcon } iconBg="bg-brand-light" iconColor="text-brand"
					title="Weekly summary" desc="Receive a digest of your email delivery stats."
					right={ <Toggle label="Weekly summary" on={ summary } onChange={ set( setSummary, ( v ) => v ? 'Weekly summary enabled' : 'Weekly summary disabled' ) } /> }
				>
					{ summary && (
						<InlineSelect label="Send on" value={ summaryDay } onChange={ ( e ) => set( setSummaryDay, ( v ) => {
							const days = { mon: 'Monday', fri: 'Friday', daily: 'Daily' };
							return `Summary set to ${ days[ v ] || v }`;
						} )( e.target.value ) } options={ [
							{ value: 'mon', label: 'Monday' }, { value: 'fri', label: 'Friday' }, { value: 'daily', label: 'Daily' },
						] } />
					) }
				</SettingRow>

				<div className="border-b border-warm-200/50" />

				<div className="px-5 py-4">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-[13px] font-medium text-warm-900">Email simulation</div>
							<div className="text-[12px] text-warm-400">Log emails without actually sending them.</div>
						</div>
						<Toggle label="Email simulation" on={ sim } onChange={ set( setSim, ( v ) => v ? 'Email simulation enabled' : 'Email simulation disabled' ) } />
					</div>
				</div>

				<div className="border-b border-warm-200/50" />

				<div className="px-5 py-4">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-[13px] font-medium text-warm-900">Anonymous analytics</div>
							<div className="text-[12px] text-warm-400">Share non-sensitive usage data to help us improve.</div>
						</div>
						<Toggle label="Anonymous analytics" on={ analytics } onChange={ set( setAnalytics, ( v ) => v ? 'Analytics enabled' : 'Analytics disabled' ) } />
					</div>
				</div>
			</Card>

			{ /* Mool Family */ }
			<div className="mt-6 mb-2">
				<h3 className="m-0 text-[13px] font-semibold text-warm-900">The Mool ecosystem</h3>
				<p className="m-0 mt-0.5 text-[12px] text-warm-400">MoolMail is part of a family of WordPress tools that work better together.</p>
			</div>
			<div className="grid grid-cols-3 gap-2.5">
				{ [
					{ name: 'MoolDesk', desc: 'AI-native helpdesk for WordPress', color: '#4263EB', url: 'https://23sphere.com/mooldesk' },
					{ name: 'MoolCast', desc: 'Email campaigns for solo founders', color: '#7C3AED', url: 'https://23sphere.com/moolcast' },
					{ name: 'MoolForms', desc: 'Form builder developers hand off', color: '#2B8A3E', url: 'https://23sphere.com/moolforms' },
				].map( ( product ) => (
					<div key={ product.name } className="rounded-[10px] border border-warm-200/50 bg-surface p-4" style={ { borderTopWidth: 3, borderTopColor: product.color } }>
						<div className="text-[14px] font-semibold text-warm-900">{ product.name }</div>
						<div className="mt-1 text-[12px] text-warm-400 leading-relaxed">{ product.desc }</div>
						<a href={ product.url } target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-[12px] font-medium text-brand no-underline hover:underline">
							Learn more →
						</a>
					</div>
				) ) }
			</div>

			{ /* Footer */ }
			<div className="mt-6 text-center">
				<a href="https://23sphere.com" target="_blank" rel="noopener noreferrer" className="text-[11px] text-warm-400 no-underline opacity-50 transition-opacity hover:opacity-80 hover:text-brand">
					Made by 23sphere
				</a>
			</div>
		</div>
	);
}
