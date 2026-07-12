import { useState, useEffect, useRef, useMemo, Suspense, lazy } from 'react';
import { applyFilters } from '@wordpress/hooks';
import { Dialog, DangerZone as PPDangerZone, toast } from '@plugpress/ui';
import { cn } from '@/lib/utils';
import useSettings from '@/hooks/useSettings';
import { post } from '@/lib/api';
import { Card, Toggle, Input, Button, SectionTitle, PageHeader, SettingsSkeleton } from '@/components/ui';

const ConnectAI = lazy( () => import( './ConnectAI' ) );

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
			title="Delete all delivery data"
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

/** Free Mailyard's erase-all card — one panel of the Data & danger page. */
function FreeDangerPanel() {
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
			<PPDangerZone
				eyebrow="Danger zone · Mailyard"
				title="Delete all delivery data"
				description="Permanently erases all delivery logs, connections, and settings. Campaign data (Mailyard Pro) is not touched. This cannot be undone."
				action={
					<Button variant="danger" onClick={ () => setOpen( true ) }>
						Delete all data
					</Button>
				}
				className="mb-4"
			/>

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
 * Data & danger — the family's data-management page: backup/restore and the
 * irreversible actions, one panel per concern. Family plugins contribute
 * panels via the `mailyard.shell.dataPanels` filter ({ id, order, Component });
 * panels with order < 50 render above the free erase card (e.g. Pro's
 * backup/restore), >= 50 below (e.g. Pro's own danger zone).
 */
function DataDanger() {
	const panels = useMemo( () => {
		const list = applyFilters( 'mailyard.shell.dataPanels', [] );
		return ( Array.isArray( list ) ? list : [] )
			.filter( ( p ) => p && p.id && p.Component )
			.sort( ( a, b ) => ( a.order ?? 50 ) - ( b.order ?? 50 ) );
	}, [] );

	const above = panels.filter( ( p ) => ( p.order ?? 50 ) < 50 );
	const below = panels.filter( ( p ) => ( p.order ?? 50 ) >= 50 );

	const render = ( { id, Component } ) => (
		<Suspense key={ id } fallback={ null }>
			<div className="mb-4">
				<Component />
			</div>
		</Suspense>
	);

	return (
		<div className="max-w-[840px]">
			<PageHeader title="Data & danger" subtitle="Backups, restores, and irreversible actions." />
			{ above.map( render ) }
			<FreeDangerPanel />
			{ below.map( render ) }
		</div>
	);
}

/**
 * The free plugin's own delivery settings — the default Settings section.
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
		<div className="max-w-[840px]">
			<PageHeader title="Delivery" subtitle="How WordPress email goes out. Changes save automatically." />

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

			<div className="mt-8 text-center">
				<a href="https://plugpress.co" target="_blank" rel="noopener noreferrer" className="text-[11px] !text-ink-400 no-underline opacity-60 transition-opacity hover:opacity-100 hover:!text-brand-text">
					Mailyard by PlugPress · plugpress.co
				</a>
			</div>
		</div>
	);
}

/** Left-nav group order + labels. */
const SECTION_GROUPS = [
	{ id: 'configure', label: 'Configure' },
	{ id: 'connect', label: 'Connect' },
	{ id: 'data', label: 'Data' },
];

/** Free Mailyard's own sections — same contract family plugins use. */
const CORE_SECTIONS = [
	{ id: 'delivery', label: 'Delivery', group: 'configure', order: 10, Component: DeliverySettings },
	{ id: 'connect-ai', label: 'Connect AI', group: 'connect', order: 10, Component: ConnectAI },
	{ id: 'data', label: 'Data & danger', group: 'data', order: 10, Component: DataDanger },
];

/**
 * Settings — ONE page, ONE left nav. Both plugins contribute flat sections
 * through the `mailyard.shell.settingsSections` filter
 * ({ id, label, order, group: 'configure'|'connect'|'data', Component });
 * Mailyard Pro adds Brand, Campaigns, Compliance, and API access. There is
 * deliberately no per-product wrapper: config is organized by WHAT it
 * configures, not by which plugin ships it.
 *
 * Route space: `#/settings` = Delivery, `#/settings/<id>` = that section
 * (deeper segments belong to the section). Unknown ids — including the
 * retired `marketing/*` tab paths — redirect to Delivery.
 */
export default function Settings( { route = 'settings', navigate } ) {
	const sections = useMemo( () => {
		const contributed = applyFilters( 'mailyard.shell.settingsSections', [] );
		return [
			...CORE_SECTIONS,
			...( Array.isArray( contributed ) ? contributed : [] ).filter(
				( s ) => s && s.id && s.label && s.Component && SECTION_GROUPS.some( ( g ) => g.id === s.group )
			),
		].sort( ( a, b ) => ( a.order ?? 50 ) - ( b.order ?? 50 ) );
	}, [] );

	const activeId = route.split( '/' )[ 1 ] || 'delivery';
	const active = sections.find( ( s ) => s.id === activeId );

	// Retired/unknown section ids (old #/settings/marketing/* deep links, a
	// deactivated plugin's section) land on Delivery instead of a blank pane.
	useEffect( () => {
		if ( ! active && 'delivery' !== activeId ) {
			window.location.hash = '#/settings';
		}
	}, [ active, activeId ] );

	const go = ( id ) => {
		const target = 'delivery' === id ? 'settings' : 'settings/' + id;
		if ( navigate ) {
			navigate( target );
		} else {
			window.location.hash = '#/' + target;
		}
	};

	const Section = ( active || CORE_SECTIONS[ 0 ] ).Component;

	return (
		<div className="flex gap-8">
			{ /* Section rail — grouped, same idiom as the app sidebar. */ }
			<aside className="w-[200px] shrink-0">
				<nav aria-label="Settings sections" className="sticky top-16 flex flex-col gap-0.5">
					{ SECTION_GROUPS.map( ( group ) => {
						const items = sections.filter( ( s ) => s.group === group.id );
						if ( ! items.length ) {
							return null;
						}
						return (
							<div key={ group.id } className="mb-3 flex flex-col gap-0.5">
								<div className="px-3 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-400">
									{ group.label }
								</div>
								{ items.map( ( s ) => {
									const isActive = active ? s.id === active.id : 'delivery' === s.id;
									return (
										<button
											key={ s.id }
											onClick={ () => go( s.id ) }
											aria-current={ isActive ? 'page' : undefined }
											className={ cn(
												'cursor-pointer rounded-lg border-none bg-transparent px-3 py-2 text-left text-[13px] font-medium transition-colors',
												isActive
													? 'bg-surface-alt font-semibold text-ink-900'
													: 'text-ink-500 hover:bg-ink-100 hover:text-ink-900'
											) }
										>
											{ s.label }
										</button>
									);
								} ) }
							</div>
						);
					} ) }
				</nav>
			</aside>

			<div className="min-w-0 flex-1">
				<Suspense fallback={ <SettingsSkeleton /> }>
					<Section route={ route } navigate={ navigate } />
				</Suspense>
			</div>
		</div>
	);
}
