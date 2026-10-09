import { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { Dialog, DangerZone as PPDangerZone, Notice, Tabs, toast } from '@plugpress/ui';
import { cn } from '@/lib/utils';
import useSettings from '@/hooks/useSettings';
import { get, post } from '@/lib/api';
import { Card, Input, Select, Button, SectionTitle, SectionIntro, PageHeader, SettingsSkeleton } from '@/components/ui';
import ToggleRow from '@/components/ToggleRow';

const ConnectAI = lazy( () => import( './ConnectAI' ) );
const AlertsSettings = lazy( () => import( './AlertsSettings' ) );
const SecuritySettings = lazy( () => import( './SecuritySettings' ) );
const NetworkSettings = lazy( () => import( './NetworkSettings' ) );

// Multisite sharing state for this site; null until loaded (and on single sites
// the endpoint reports multisite: false).
function useNetwork() {
	const [ network, setNetwork ] = useState( null );
	useEffect( () => {
		get( 'network' ).then( setNetwork ).catch( () => setNetwork( {} ) );
	}, [] );
	return network;
}

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

/**
 * Settings backup: export everything (settings + connections, credentials
 * included) as JSON, import it on another site, and empty the log.
 */
function BackupCard() {
	const [ busy, setBusy ] = useState( null );
	const [ pending, setPending ] = useState( null );
	const [ confirmEmpty, setConfirmEmpty ] = useState( false );
	const fileRef = useRef( null );

	const exportFile = () => {
		setBusy( 'export' );
		get( 'settings/export' )
			.then( ( data ) => {
				const url = URL.createObjectURL( new Blob( [ JSON.stringify( data, null, 2 ) ], { type: 'application/json' } ) );
				const a = document.createElement( 'a' );
				a.href = url;
				a.download = `mailyard-settings-${ new Date().toISOString().slice( 0, 10 ) }.json`;
				a.click();
				URL.revokeObjectURL( url );
			} )
			.catch( ( err ) => toast.error( err?.message || 'Export failed' ) )
			.finally( () => setBusy( null ) );
	};

	const pickFile = ( e ) => {
		const file = e.target.files?.[ 0 ];
		e.target.value = '';
		if ( ! file ) return;
		file.text()
			.then( ( text ) => setPending( JSON.parse( text ) ) )
			.catch( () => toast.error( 'That file isn’t valid JSON.' ) );
	};

	const runImport = () => {
		setBusy( 'import' );
		post( 'settings/import', { data: pending } )
			.then( ( res ) => {
				toast.success( `Settings restored — ${ res.connections } connection${ res.connections === 1 ? '' : 's' }.` );
				setPending( null );
				setTimeout( () => window.location.reload(), 800 );
			} )
			.catch( ( err ) => toast.error( err?.message || 'Import failed' ) )
			.finally( () => setBusy( null ) );
	};

	const emptyLog = () => {
		setBusy( 'empty' );
		post( 'logs/empty' )
			.then( ( res ) => toast.success( `Log emptied — ${ res.deleted } entr${ res.deleted === 1 ? 'y' : 'ies' } removed.` ) )
			.catch( ( err ) => toast.error( err?.message || 'Could not empty the log' ) )
			.finally( () => { setBusy( null ); setConfirmEmpty( false ); } );
	};

	return (
		<Card className="mb-4 divide-y divide-ink-200 overflow-hidden">
			<div className="flex items-center justify-between gap-6 px-5 py-4">
				<div>
					<div className="text-[13px] font-semibold text-ink-900">Settings backup</div>
					<div className="mt-[1px] text-[12px] text-ink-400">
						Settings and connections in one file, to restore here or move to another site. It contains your credentials — keep it somewhere safe. The log isn’t included.
					</div>
				</div>
				<div className="flex shrink-0 gap-1.5">
					<Button size="sm" variant="secondary" disabled={ !! busy } onClick={ exportFile }>{ busy === 'export' ? 'Exporting…' : 'Export' }</Button>
					<Button size="sm" variant="secondary" disabled={ !! busy } onClick={ () => fileRef.current?.click() }>Import…</Button>
					<input ref={ fileRef } type="file" accept="application/json,.json" className="hidden" onChange={ pickFile } />
				</div>
			</div>
			<div className="flex items-center justify-between gap-6 px-5 py-4">
				<div>
					<div className="text-[13px] font-semibold text-ink-900">Empty the email log</div>
					<div className="mt-[1px] text-[12px] text-ink-400">Removes every logged email. Settings and connections stay.</div>
				</div>
				<Button size="sm" variant="secondary" disabled={ !! busy } onClick={ () => setConfirmEmpty( true ) }>Empty log</Button>
			</div>

			{ confirmEmpty && (
				<Dialog
					open
					onOpenChange={ ( open ) => ! open && busy !== 'empty' && setConfirmEmpty( false ) }
					size="sm"
					title="Empty the email log?"
					description="Every logged email is deleted. This can’t be undone."
					footer={
						<>
							<Button variant="secondary" disabled={ busy === 'empty' } onClick={ () => setConfirmEmpty( false ) }>Cancel</Button>
							<Button variant="danger" disabled={ busy === 'empty' } onClick={ emptyLog }>{ busy === 'empty' ? 'Emptying…' : 'Empty log' }</Button>
						</>
					}
				/>
			) }

			{ pending && (
				<Dialog
					open
					onOpenChange={ ( open ) => ! open && busy !== 'import' && setPending( null ) }
					size="sm"
					title="Restore this backup?"
					description={ `This replaces your current settings and all ${ ( pending.connections || [] ).length } connection(s) with the ones in the file${ pending.exported_at ? ` (exported ${ pending.exported_at.slice( 0, 10 ) })` : '' }. The log is left alone.` }
					footer={
						<>
							<Button variant="secondary" disabled={ busy === 'import' } onClick={ () => setPending( null ) }>Cancel</Button>
							<Button disabled={ busy === 'import' } onClick={ runImport }>{ busy === 'import' ? 'Restoring…' : 'Restore' }</Button>
						</>
					}
				/>
			) }
		</Card>
	);
}

/** Data & danger — backup, restore, and the irreversible erase-all action. */
function DataDanger() {
	const [ open, setOpen ] = useState( false );
	const [ erasing, setErasing ] = useState( false );

	const erase = () => {
		setErasing( true );
		post( 'data/erase-all', { confirm: 'DELETE' } )
			.then( () => {
				toast.success( 'All data deleted' );
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
		<div className="max-w-[840px]">
			<SectionIntro>Back up and restore your setup, clear the log, or start over.</SectionIntro>
			<BackupCard />
			<PPDangerZone
				eyebrow="Danger zone"
				title="Delete all delivery data"
				description="Permanently erases all delivery logs, connections, and settings. This cannot be undone."
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
		</div>
	);
}

/**
 * Delivery settings — the default Settings section.
 */
function DeliverySettings( { network } ) {
	// On a subsite under shared settings, the network's groups are read-only here.
	const managed = !! network?.shared && ! network?.isMain;
	const senderLocked = managed && !! network?.share_sender;
	const deliveryLocked = managed && !! network?.share_delivery;
	const { settings, loading, save } = useSettings();

	const [ fromEmail, setFromEmail ] = useState( '' );
	const [ fromName, setFromName ] = useState( '' );
	const [ returnPath, setReturnPath ] = useState( '' );
	const [ logging, setLogging ] = useState( true );
	const [ retention, setRetention ] = useState( '30' );
	const [ background, setBackground ] = useState( false );
	const [ offline, setOffline ] = useState( false );

	const timer = useRef( null );
	const lastMsg = useRef( '' );
	const [ changeCount, setChangeCount ] = useState( 0 );

	// Hydrate from API — does NOT bump changeCount.
	useEffect( () => {
		if ( ! settings ) return;
		setFromEmail( settings.from_email ?? '' );
		setFromName( settings.from_name ?? '' );
		setReturnPath( settings.return_path ?? '' );
		setLogging( settings.logging ?? true );
		setRetention( String( settings.log_retention ?? 30 ) );
		setBackground( !! settings.background );
		setOffline( !! settings.offline );
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
				return_path: returnPath.trim(),
				logging,
				log_retention: Number( retention ),
				background,
				offline,
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
			<SectionIntro>How WordPress email goes out. Changes save automatically.</SectionIntro>

			{ managed && (
				<Notice tone="info" className="mb-3">
					Email for this site goes through the connections set up on the network’s main site{ senderLocked || deliveryLocked ? ', and the greyed-out settings below are managed there too' : '' }. The log stays this site’s own.
				</Notice>
			) }

			<Card className="mb-3 overflow-hidden">
				<div className="px-5 pt-4 pb-1">
					<SectionTitle>Default sender</SectionTitle>
				</div>
				<fieldset disabled={ senderLocked } className={ cn( 'm-0 flex max-w-[520px] flex-col gap-3 border-0 px-5 pb-5 pt-3', senderLocked && 'opacity-60' ) }>
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
					<Input
						label="Return path"
						type="email"
						placeholder="bounces@yourdomain.com"
						hint="Optional. Bounces go here instead of the From address. Applies to SMTP and PHP Mail — API providers handle bounces on their side."
						value={ returnPath }
						onChange={ ( e ) => { setReturnPath( e.target.value ); trigger( 'Return path updated' ); } }
					/>
				</fieldset>
			</Card>

			<Card className="overflow-hidden divide-y divide-ink-200">
				<div className={ cn( 'divide-y divide-ink-200', deliveryLocked && 'pointer-events-none opacity-60' ) }>
					<ToggleRow
						title="Background sending"
						description="Answer the page first, send the email a moment later — a slow provider never slows your site. The log shows it as Pending until it goes out."
						on={ background }
						onChange={ ( v ) => { setBackground( v ); trigger( v ? 'Background sending on' : 'Background sending off' ); } }
					/>
					<ToggleRow
						title="Email logging"
						description="Store every outgoing email in the Email log for debugging and review."
						on={ logging }
						onChange={ ( v ) => { setLogging( v ); trigger( v ? 'Logging enabled' : 'Logging disabled' ); } }
					>
						<Select
							label="Keep logs for"
							options={ [
								{ value: '7', label: '7 days' },
								{ value: '30', label: '30 days' },
								{ value: '90', label: '90 days' },
								{ value: '0', label: 'Forever' },
							] }
							value={ retention }
							onChange={ ( e ) => { setRetention( e.target.value ); trigger( 'Log retention updated' ); } }
							className="max-w-[200px]"
						/>
					</ToggleRow>
				</div>
				<ToggleRow
					title="Offline mode"
					description="Log every email without sending any. For staging and development sites."
					on={ offline }
					onChange={ ( v ) => { setOffline( v ); trigger( v ? 'Offline mode on — nothing will be sent' : 'Offline mode off' ); } }
				/>
			</Card>

			<div className="mt-8 text-center">
				<a href="https://plugpress.co" target="_blank" rel="noopener noreferrer" className="text-[11px] !text-ink-400 no-underline opacity-60 transition-opacity hover:opacity-100 hover:!text-brand-text">
					Mailyard by PlugPress · plugpress.co
				</a>
			</div>
		</div>
	);
}

// The notification emails WordPress sends by itself, grouped as the admin
// thinks of them. Keys mirror WP_Emails::SWITCHES.
const WP_EMAIL_GROUPS = [
	{
		label: 'Users',
		items: [
			{ key: 'new_user_admin', title: 'New user — tell the admin', description: 'The “New user registration” email to the site admin.' },
			{ key: 'new_user_user', title: 'New user — welcome email', description: 'Includes the link to set a password. New users can still use “Lost your password?”.' },
			{ key: 'password_change_admin', title: 'Password reset — tell the admin', description: 'Sent to the admin after someone resets their password.' },
			{ key: 'password_change_user', title: 'Password changed — tell the user', description: 'Sent to a user after their password is changed.' },
			{ key: 'email_change_user', title: 'Email changed — tell the user', description: 'Sent to the old address after a user’s email is changed.' },
		],
	},
	{
		label: 'Comments',
		items: [
			{ key: 'comment_author', title: 'New comment', description: 'Tells a post’s author about each new comment.' },
			{ key: 'comment_moderation', title: 'Comment awaiting moderation', description: 'Tells moderators a comment needs approval.' },
		],
	},
	{
		label: 'Updates',
		items: [
			{ key: 'update_core', title: 'WordPress auto-updates', description: 'The report after WordPress updates itself.' },
			{ key: 'update_plugins', title: 'Plugin auto-updates', description: 'The report after plugins update themselves.' },
			{ key: 'update_themes', title: 'Theme auto-updates', description: 'The report after themes update themselves.' },
		],
	},
];

/** WordPress emails — switch off the notifications WordPress sends by itself. */
function WordPressEmails() {
	const { settings, loading, save } = useSettings();
	const [ disabled, setDisabled ] = useState( [] );

	useEffect( () => {
		if ( settings ) setDisabled( Array.isArray( settings.disabled_emails ) ? settings.disabled_emails : [] );
	}, [ settings ] );

	const toggle = ( key, on ) => {
		const next = on ? disabled.filter( ( k ) => k !== key ) : [ ...disabled, key ];
		setDisabled( next );
		save( { disabled_emails: next } )
			.then( () => toast.success( on ? 'Email switched on' : 'Email switched off' ) )
			.catch( () => toast.error( 'Failed to save' ) );
	};

	if ( loading ) {
		return <SettingsSkeleton />;
	}

	return (
		<div className="max-w-[840px]">
			<SectionIntro>Switch off the notifications WordPress sends by itself. Password reset emails always go out, so nobody gets locked out.</SectionIntro>
			{ WP_EMAIL_GROUPS.map( ( group ) => (
				<Card key={ group.label } className="mb-3 overflow-hidden">
					<div className="px-5 pt-4 pb-1">
						<SectionTitle>{ group.label }</SectionTitle>
					</div>
					<div className="divide-y divide-ink-200">
						{ group.items.map( ( item ) => (
							<ToggleRow
								key={ item.key }
								title={ item.title }
								description={ item.description }
								on={ ! disabled.includes( item.key ) }
								onChange={ ( v ) => toggle( item.key, v ) }
							/>
						) ) }
					</div>
				</Card>
			) ) }
		</div>
	);
}

/** Every settings section, in tab order. */
const SECTIONS = [
	{ id: 'delivery', label: 'Delivery', Component: DeliverySettings },
	{ id: 'alerts', label: 'Alerts', Component: AlertsSettings },
	{ id: 'wordpress-emails', label: 'WordPress emails', Component: WordPressEmails },
	{ id: 'connect-ai', label: 'Connect AI', Component: ConnectAI },
	{ id: 'network', label: 'Network', Component: NetworkSettings, when: ( n ) => !! n?.canManage },
	{ id: 'security', label: 'Security', Component: SecuritySettings },
	{ id: 'data', label: 'Data', Component: DataDanger },
];

/**
 * Settings — ONE header, ONE tab row, one section at a time.
 *
 * Route space: `#/settings` = Delivery, `#/settings/<id>` = that section
 * (deeper segments belong to the section). Unknown ids redirect to Delivery.
 */
export default function Settings( { route = 'settings', navigate } ) {
	const network = useNetwork();
	const sections = SECTIONS.filter( ( s ) => ! s.when || s.when( network ) );
	const activeId = route.split( '/' )[ 1 ] || 'delivery';
	const active = sections.find( ( s ) => s.id === activeId );

	// Retired/unknown section ids (old #/settings/marketing/* deep links)
	// land on Delivery instead of a blank pane — once we know which
	// conditional sections exist.
	useEffect( () => {
		if ( network && ! active && 'delivery' !== activeId ) {
			window.location.hash = '#/settings';
		}
	}, [ network, active, activeId ] );

	const go = ( id ) => {
		const target = 'delivery' === id ? 'settings' : 'settings/' + id;
		if ( navigate ) {
			navigate( target );
		} else {
			window.location.hash = '#/' + target;
		}
	};

	const Section = ( active || SECTIONS[ 0 ] ).Component;

	return (
		<div className="max-w-[840px]">
			<PageHeader
				title="Settings"
				tabs={
					// Narrow screens scroll the row sideways (scrollbar hidden,
					// like the top bar) instead of wrapping two-word labels.
					<div className="overflow-x-auto [scrollbar-width:none]">
						<Tabs
							aria-label="Settings sections"
							items={ sections.map( ( s ) => ( { value: s.id, label: <span className="whitespace-nowrap">{ s.label }</span> } ) ) }
							value={ active ? active.id : 'delivery' }
							onChange={ go }
						/>
					</div>
				}
			/>
			<Suspense fallback={ <SettingsSkeleton /> }>
				<Section route={ route } navigate={ navigate } network={ network } />
			</Suspense>
		</div>
	);
}
