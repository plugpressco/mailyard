import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { applyFilters } from '@wordpress/hooks';
import { Dialog, toast } from '@plugpress/ui';
import { cn } from '@/lib/utils';
import useSettings from '@/hooks/useSettings';
import { post } from '@/lib/api';
import { Card, Toggle, Input, Button, SectionTitle, PageHeader, SettingsSkeleton } from '@/components/ui';

// Confirm modal for the irreversible "Delete all data" action. Uses the
// design system's Dialog (focus trap, esc, aria). The destructive button
// stays disabled until the user types DELETE exactly.
function EraseDialog( { onConfirm, onCancel, erasing } ) {
	const [ value, setValue ] = useState( '' );
	const ready = value === 'DELETE';

	return (
		<Dialog
			open
			onOpenChange={ ( open ) => ! open && ! erasing && onCancel() }
			size="sm"
			title="Delete all data"
			footer={
				<>
					<Button variant="secondary" disabled={ erasing } onClick={ onCancel }>
						Cancel
					</Button>
					<Button variant="danger" disabled={ ! ready || erasing } onClick={ onConfirm }>
						{ erasing ? 'Deleting…' : 'Delete all data' }
					</Button>
				</>
			}
		>
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
		</Dialog>
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

/**
 * The free plugin's own settings — the "Delivery" tab of the shared page.
 * All original hooks/state live here so they don't run while another
 * plugin's tab is active.
 */
function DeliverySettings() {
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
		// 840px matches the Marketing tab's content column (Pro settings) so
		// switching tabs never jumps the container width.
		<div className="max-w-[840px]">
			<PageHeader title="Settings" subtitle="Changes save automatically." />

			<Card className="mb-3 overflow-hidden">
				<div className="px-5 pt-4 pb-1">
					<SectionTitle>Default sender</SectionTitle>
				</div>
				<div className="flex max-w-[520px] flex-col gap-3 px-5 pb-5 pt-3">
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
				<a href="https://plugpress.co" target="_blank" rel="noopener noreferrer" className="text-[11px] !text-ink-400 no-underline opacity-60 transition-opacity hover:opacity-100 hover:!text-brand">
					Mailyard by PlugPress · plugpress.co
				</a>
			</div>
		</div>
	);
}

/**
 * Settings shell: the Delivery tab (Mailyard's own settings above) plus tabs
 * contributed by family plugins via the `mailyard.shell.settingsTabs` filter
 * (Mailyard Pro registers "Marketing"). With no contributed tabs the tab bar
 * doesn't render at all — the free-only page looks exactly as before.
 *
 * The active tab comes from the route: `settings` → Delivery,
 * `settings/<tabId>[/…]` → that tab (deep segments belong to the tab).
 */
export default function Settings( { route = 'settings', navigate } ) {
	const extraTabs = useMemo( () => {
		const list = applyFilters( 'mailyard.shell.settingsTabs', [] );
		return ( Array.isArray( list ) ? list : [] )
			.filter( ( t ) => t && t.id && t.label && t.Component )
			.sort( ( a, b ) => ( a.order ?? 50 ) - ( b.order ?? 50 ) );
	}, [] );

	if ( ! extraTabs.length ) {
		return <DeliverySettings />;
	}

	const activeId = route.split( '/' )[ 1 ] || 'delivery';
	const active = extraTabs.find( ( t ) => t.id === activeId );
	const go = ( id ) => {
		if ( navigate ) {
			navigate( 'delivery' === id ? 'settings' : 'settings/' + id );
		} else {
			window.location.hash = 'delivery' === id ? '#/settings' : '#/settings/' + id;
		}
	};

	const tabs = [ { id: 'delivery', label: 'Delivery' }, ...extraTabs ];

	return (
		<div>
			<div className="mb-5 flex items-center gap-1 border-b border-ink-200">
				{ tabs.map( ( t ) => {
					const isActive = active ? t.id === active.id : 'delivery' === t.id;
					return (
						<button
							key={ t.id }
							onClick={ () => go( t.id ) }
							className={ cn(
								'-mb-px cursor-pointer border-0 border-b-2 border-solid bg-transparent px-3.5 py-2.5 text-[13px] font-medium transition-colors',
								isActive
									? 'border-brand text-ink-900'
									: 'border-transparent text-ink-500 hover:text-ink-900'
							) }
						>
							{ t.label }
						</button>
					);
				} ) }
			</div>

			{ active ? (
				<Suspense fallback={ null }>
					<active.Component />
				</Suspense>
			) : (
				<DeliverySettings />
			) }
		</div>
	);
}
