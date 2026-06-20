import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import useSettings from '@/hooks/useSettings';
import { Card, Toggle, Input, SectionTitle, PageHeader, SettingsSkeleton } from '@/components/ui';

export default function Settings() {
	const { settings, loading, save } = useSettings();

	const [ fromEmail, setFromEmail ] = useState( '' );
	const [ fromName, setFromName ] = useState( '' );
	const [ logging, setLogging ] = useState( true );

	const timer = useRef( null );
	const lastMsg = useRef( '' );
	const [ changeCount, setChangeCount ] = useState( 0 );

	// Hydrate from API — does NOT bump changeCount.
	useEffect( () => {
		if ( ! settings ) return;
		setFromEmail( settings.from_email ?? '' );
		setFromName( settings.from_name ?? '' );
		setLogging( settings.logging ?? true );
	}, [ settings ] );

	const trigger = ( msg ) => {
		lastMsg.current = msg;
		setChangeCount( ( c ) => c + 1 );
	};

	// Auto-save (debounced) only after the user has changed something.
	useEffect( () => {
		if ( changeCount === 0 ) return;
		clearTimeout( timer.current );
		timer.current = setTimeout( () => {
			const msg = lastMsg.current || 'Settings saved';
			save( {
				from_email: fromEmail.trim(),
				from_name:  fromName.trim(),
				logging,
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
		<div className="max-w-[600px]">
			<PageHeader title="Settings" subtitle="Changes save automatically." />

			<Card className="mb-3 overflow-hidden">
				<div className="px-5 pt-4 pb-1">
					<SectionTitle>Default sender</SectionTitle>
				</div>
				<div className="flex flex-col gap-3 px-5 pb-5 pt-3">
					<Input
						label="From Email"
						type="email"
						placeholder="hello@yourdomain.com"
						hint="Used when wp_mail() is called without an explicit From header. Must be verified with your provider."
						value={ fromEmail }
						onChange={ ( e ) => { setFromEmail( e.target.value ); trigger( 'Default sender updated' ); } }
					/>
					<Input
						label="From Name"
						placeholder="Your Site Name"
						hint="Optional. The name recipients see in their inbox."
						value={ fromName }
						onChange={ ( e ) => { setFromName( e.target.value ); trigger( 'Default sender updated' ); } }
					/>
				</div>
			</Card>

			<Card className="overflow-hidden">
				<div className="flex items-center justify-between px-5 py-4">
					<div>
						<div className="text-[13px] font-semibold text-ink-900">Email logging</div>
						<div className="mt-[1px] text-[12px] text-ink-400">
							Store every outgoing email in the Logs tab for debugging and review.
						</div>
					</div>
					<Toggle
						label="Email logging"
						on={ logging }
						onChange={ ( v ) => { setLogging( v ); trigger( v ? 'Logging enabled' : 'Logging disabled' ); } }
					/>
				</div>
			</Card>

			<div className="mt-8 text-center">
				<a href="https://plugpress.co" target="_blank" rel="noopener noreferrer" className="text-[11px] text-ink-400 no-underline opacity-60 transition-opacity hover:opacity-100 hover:text-brand">
					Mailyard by PlugPress · plugpress.co
				</a>
			</div>
		</div>
	);
}
