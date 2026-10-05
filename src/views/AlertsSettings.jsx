import { useState, useEffect, useRef } from 'react';
import { toast } from '@plugpress/ui';
import useSettings from '@/hooks/useSettings';
import { post } from '@/lib/api';
import ToggleRow from '@/components/ToggleRow';
import { Card, Input, Button, PageHeader, SettingsSkeleton } from '@/components/ui';

/**
 * Alerts — find out email broke before a customer does. Failure and
 * "backup took over" alerts (at most one of each per hour) by email and/or a
 * chat webhook, plus an optional weekly summary. Changes save automatically.
 */
export default function AlertsSettings() {
	const { settings, loading, save } = useSettings();
	const [ form, setForm ] = useState( { alert_email: false, alert_to: '', alert_webhook: '', weekly_summary: false } );
	const [ testing, setTesting ] = useState( null );
	const dirty = useRef( false );
	const timer = useRef( null );

	useEffect( () => {
		if ( ! settings ) return;
		setForm( {
			alert_email: !! settings.alert_email,
			alert_to: settings.alert_to ?? '',
			alert_webhook: settings.alert_webhook ?? '',
			weekly_summary: !! settings.weekly_summary,
		} );
	}, [ settings ] );

	// Debounced auto-save, only after the user changed something.
	useEffect( () => {
		if ( ! dirty.current ) return;
		clearTimeout( timer.current );
		timer.current = setTimeout( () => {
			save( { ...form, alert_to: form.alert_to.trim(), alert_webhook: form.alert_webhook.trim() } )
				.then( () => toast.success( 'Alerts saved' ) )
				.catch( () => toast.error( 'Failed to save' ) );
		}, 600 );
		return () => clearTimeout( timer.current );
	}, [ form ] ); // eslint-disable-line react-hooks/exhaustive-deps

	const set = ( key, value ) => {
		dirty.current = true;
		setForm( ( f ) => ( { ...f, [ key ]: value } ) );
	};

	const test = ( channel ) => {
		setTesting( channel );
		post( 'alerts/test', { channel, target: ( 'webhook' === channel ? form.alert_webhook : form.alert_to ).trim() } )
			.then( ( res ) => toast[ res.success ? 'success' : 'error' ]( res.message ) )
			.catch( ( err ) => toast.error( err?.message || 'Test failed' ) )
			.finally( () => setTesting( null ) );
	};

	if ( loading ) {
		return <SettingsSkeleton />;
	}

	return (
		<div className="max-w-[840px]">
			<PageHeader title="Alerts" subtitle="Hear about failures from Mailyard, not from a customer. At most one alert per hour, however many emails fail." />

			<Card className="mb-3 divide-y divide-ink-200 overflow-hidden">
				<ToggleRow
					title="Email me when sending fails"
					description="Also when a backup has to take over. Sent by your server’s own mailer, so it arrives even when your provider is what broke."
					on={ form.alert_email }
					onChange={ ( v ) => set( 'alert_email', v ) }
				>
					<div className="flex max-w-[520px] items-end gap-2">
						<div className="flex-1">
							<Input
								label="Send alerts to"
								type="email"
								placeholder={ window.mailyard?.adminEmail || 'Your admin email' }
								hint="Leave empty to use the site admin email."
								value={ form.alert_to }
								onChange={ ( e ) => set( 'alert_to', e.target.value ) }
							/>
						</div>
						<Button variant="secondary" size="sm" className="mb-[22px]" disabled={ testing === 'email' } onClick={ () => test( 'email' ) }>
							{ testing === 'email' ? 'Sending…' : 'Send test' }
						</Button>
					</div>
				</ToggleRow>

				<ToggleRow
					title="Weekly summary"
					description="A short email each week: what went out, what failed, the most common errors. Nothing on a quiet week."
					on={ form.weekly_summary }
					onChange={ ( v ) => set( 'weekly_summary', v ) }
				/>
			</Card>

			<Card className="overflow-hidden px-5 py-4">
				<div className="text-[13px] font-semibold text-ink-900">Chat webhook</div>
				<div className="mb-3 mt-[1px] text-[12px] text-ink-400">
					Post the same alerts and the weekly summary to Slack, Discord or Microsoft Teams — or any URL that takes JSON. Individual emails are never posted.
				</div>
				<div className="flex max-w-[640px] items-end gap-2">
					<div className="flex-1">
						<Input
							label="Webhook URL"
							type="url"
							placeholder="https://hooks.slack.com/services/…"
							value={ form.alert_webhook }
							onChange={ ( e ) => set( 'alert_webhook', e.target.value ) }
						/>
					</div>
					<Button variant="secondary" size="sm" disabled={ ! form.alert_webhook.trim() || testing === 'webhook' } onClick={ () => test( 'webhook' ) }>
						{ testing === 'webhook' ? 'Posting…' : 'Send test' }
					</Button>
				</div>
			</Card>
		</div>
	);
}
