import { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { Dialog, DangerZone as PPDangerZone, toast } from '@plugpress/ui';
import { cn } from '@/lib/utils';
import useSettings from '@/hooks/useSettings';
import { post } from '@/lib/api';
import { Card, Input, Button, SectionTitle, PageHeader, SettingsSkeleton } from '@/components/ui';
import ToggleRow from '@/components/ToggleRow';

const ConnectAI = lazy( () => import( './ConnectAI' ) );
const AlertsSettings = lazy( () => import( './AlertsSettings' ) );

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

/** Data & danger — the irreversible erase-all action. */
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
			<PageHeader title="Data & danger" subtitle="Irreversible actions." />
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
function DeliverySettings() {
	const { settings, loading, save } = useSettings();

	const [ fromEmail, setFromEmail ] = useState( '' );
	const [ fromName, setFromName ] = useState( '' );
	const [ returnPath, setReturnPath ] = useState( '' );
	const [ logging, setLogging ] = useState( true );
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
					<Input
						label="Return path"
						type="email"
						placeholder="bounces@yourdomain.com"
						hint="Optional. Bounces go here instead of the From address. Applies to SMTP and PHP Mail — API providers handle bounces on their side."
						value={ returnPath }
						onChange={ ( e ) => { setReturnPath( e.target.value ); trigger( 'Return path updated' ); } }
					/>
				</div>
			</Card>

			<Card className="overflow-hidden divide-y divide-ink-200">
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
				/>
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
			<PageHeader title="WordPress emails" subtitle="Switch off the notifications WordPress sends by itself. Password reset emails always go out, so nobody gets locked out." />
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

/** Left-nav group order + labels. */
const SECTION_GROUPS = [
	{ id: 'configure', label: 'Configure' },
	{ id: 'connect', label: 'Connect' },
	{ id: 'data', label: 'Data' },
];

/** Every settings section, in rail order. */
const SECTIONS = [
	{ id: 'delivery', label: 'Delivery', group: 'configure', Component: DeliverySettings },
	{ id: 'alerts', label: 'Alerts', group: 'configure', Component: AlertsSettings },
	{ id: 'wordpress-emails', label: 'WordPress emails', group: 'configure', Component: WordPressEmails },
	{ id: 'connect-ai', label: 'Connect AI', group: 'connect', Component: ConnectAI },
	{ id: 'data', label: 'Data & danger', group: 'data', Component: DataDanger },
];

/**
 * Settings — ONE page, ONE left nav, grouped sections.
 *
 * Route space: `#/settings` = Delivery, `#/settings/<id>` = that section
 * (deeper segments belong to the section). Unknown ids redirect to Delivery.
 */
export default function Settings( { route = 'settings', navigate } ) {
	const sections = SECTIONS;
	const activeId = route.split( '/' )[ 1 ] || 'delivery';
	const active = sections.find( ( s ) => s.id === activeId );

	// Retired/unknown section ids (old #/settings/marketing/* deep links)
	// land on Delivery instead of a blank pane.
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

	const Section = ( active || SECTIONS[ 0 ] ).Component;

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
