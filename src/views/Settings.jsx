import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import useSettings from '@/hooks/useSettings';
import { post } from '@/lib/api';
import { Card, Toggle, Input, Button, SectionTitle, PageHeader, SettingsSkeleton } from '@/components/ui';

// Confirm modal for the irreversible "Delete all data" action. Mirrors the
// app's custom backdrop + Card dialog pattern (see Connections TestDialog).
// The destructive button stays disabled until the user types DELETE exactly.
function EraseDialog( { onConfirm, onCancel, erasing } ) {
	const backdropRef = useRef( null );
	const [ value, setValue ] = useState( '' );
	const ready = value === 'DELETE';

	return (
		<div
			ref={ backdropRef }
			onClick={ ( e ) => e.target === backdropRef.current && ! erasing && onCancel() }
			className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/20 backdrop-blur-[2px] animate-in"
		>
			<Card className="w-full max-w-[420px] p-5" style={ { animation: 'popIn 150ms ease-out' } }>
				<div className="mb-1 text-[14px] font-semibold text-danger">Delete all data</div>
				<p className="m-0 mb-2 text-[12.5px] leading-relaxed text-ink-500">
					This permanently erases <strong className="text-ink-700">all delivery logs, connections, and settings</strong>.
					Mailyard will reset to a fresh install. <strong className="text-ink-700">This cannot be undone.</strong>
				</p>
				<p className="m-0 mb-4 text-[12.5px] leading-relaxed text-ink-500">
					Type <strong className="font-mono text-ink-800">DELETE</strong> to confirm.
				</p>
				<Input
					label="Confirmation"
					placeholder="DELETE"
					value={ value }
					autoFocus
					disabled={ erasing }
					onChange={ ( e ) => setValue( e.target.value ) }
					onKeyDown={ ( e ) => { if ( e.key === 'Enter' && ready && ! erasing ) onConfirm(); } }
				/>
				<div className="mt-4 flex gap-2">
					<Button variant="secondary" className="flex-1 justify-center" disabled={ erasing } onClick={ onCancel }>
						Cancel
					</Button>
					<Button variant="danger" className="flex-1 justify-center" disabled={ ! ready || erasing } onClick={ onConfirm }>
						{ erasing ? 'Deleting…' : 'Delete all data' }
					</Button>
				</div>
			</Card>
		</div>
	);
}

function DangerZone() {
	const [ open, setOpen ] = useState( false );
	const [ erasing, setErasing ] = useState( false );

	const erase = () => {
		setErasing( true );
		post( 'data/erase-all', { confirm: 'DELETE' } )
			.then( () => {
				toast.success( 'All data deleted' );
				// Reset to the onboarding flow so the clean state is reflected.
				if ( window.mailyard ) window.mailyard.onboarded = false;
				window.location.hash = '';
				setTimeout( () => window.location.reload(), 600 );
			} )
			.catch( ( err ) => {
				toast.error( err?.message || 'Failed to delete data' );
				setErasing( false );
				setOpen( false );
			} );
	};

	return (
		<>
			<Card className="mt-8 overflow-hidden border-danger/30">
				<div className="px-5 pt-4 pb-1">
					<SectionTitle>Danger zone</SectionTitle>
				</div>
				<div className="flex items-start justify-between gap-4 px-5 pb-5 pt-3">
					<div className="min-w-0">
						<div className="text-[13px] font-semibold text-ink-900">Delete all data</div>
						<div className="mt-1 text-[12px] leading-relaxed text-ink-400">
							Permanently erases all delivery logs, connections, and settings. This cannot be undone.
						</div>
					</div>
					<Button variant="danger" className="shrink-0" onClick={ () => setOpen( true ) }>
						Delete all data
					</Button>
				</div>
			</Card>

			{ open && (
				<EraseDialog
					erasing={ erasing }
					onConfirm={ erase }
					onCancel={ () => ! erasing && setOpen( false ) }
				/>
			) }
		</>
	);
}

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

			<DangerZone />

			<div className="mt-8 text-center">
				<a href="https://plugpress.co" target="_blank" rel="noopener noreferrer" className="text-[11px] text-ink-400 no-underline opacity-60 transition-opacity hover:opacity-100 hover:text-brand">
					Mailyard by PlugPress · plugpress.co
				</a>
			</div>
		</div>
	);
}
