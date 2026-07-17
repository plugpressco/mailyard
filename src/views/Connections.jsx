import { useState, useCallback, useEffect, useRef } from 'react';
import {
	DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
	arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Dialog, toast } from '@plugpress/ui';
import { cn } from '@/lib/utils';
import useConnections from '@/hooks/useConnections';
import { post } from '@/lib/api';
import ProviderIcon from '@/components/ProviderIcon';
import StatusPill from '@/components/StatusPill';
import { Card, Button, Toggle, Input, Select, SegmentedControl, TagInput, SectionTitle, PageHeader, ConnectionsSkeleton } from '@/components/ui';
import { PlusIcon, GearIcon, XIcon, GripIcon, LinkIcon, ChevronRightIcon, SpinnerIcon } from '@/components/Icons';
import { LIVE_PROVIDERS, PURPOSES, SMTP_PRESETS } from '@/lib/providers';

function relative( unixSec ) {
	if ( ! unixSec ) return null;
	const diff = Math.max( 0, Math.floor( Date.now() / 1000 ) - unixSec );
	if ( diff < 60 )      return 'just now';
	if ( diff < 3600 )    return `${ Math.floor( diff / 60 ) }m ago`;
	if ( diff < 86400 )   return `${ Math.floor( diff / 3600 ) }h ago`;
	if ( diff < 86400*7 ) return `${ Math.floor( diff / 86400 ) }d ago`;
	return `${ Math.floor( diff / 86400 / 7 ) }w ago`;
}

function ArrowLeftIcon( props ) {
	return (
		<svg { ...props } viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
			<path d="M12.5 15L7.5 10L12.5 5" />
		</svg>
	);
}

function ConfigPage( { provider, conn, onSave, onBack, saving } ) {
	const [ name, setName ] = useState( '' );
	const [ config, setConfig ] = useState( {} );
	const [ fromEmail, setFromEmail ] = useState( '' );
	const [ fromName, setFromName ] = useState( '' );
	const [ fromMatch, setFromMatch ] = useState( [] );
	const [ purpose, setPurpose ] = useState( 'any' );
	const [ showRouting, setShowRouting ] = useState( false );
	const [ smtpPreset, setSmtpPreset ] = useState( null );

	useEffect( () => {
		setSmtpPreset( null );
		if ( conn ) {
			setName( conn.name || provider.name );
			setConfig( conn.config || {} );
			setFromEmail( conn.from_email || '' );
			setFromName( conn.from_name || '' );
			setFromMatch( Array.isArray( conn.from_match ) ? conn.from_match : [] );
			setPurpose( conn.purpose || 'any' );
			// Reveal routing only when it's been customised away from the default.
			setShowRouting( ( Array.isArray( conn.from_match ) && conn.from_match.length > 0 ) || ( conn.purpose && conn.purpose !== 'any' ) );
		} else {
			setName( provider.name );
			setConfig( {} );
			setFromEmail( '' );
			setFromName( '' );
			setFromMatch( [] );
			setPurpose( 'any' );
			setShowRouting( false );
		}
	}, [ conn, provider ] );

	const updateField = ( key, value ) => setConfig( ( prev ) => ( { ...prev, [ key ]: value } ) );

	const applyPreset = ( preset ) => {
		setSmtpPreset( preset.id );
		setConfig( ( prev ) => ( { ...prev, ...preset.values } ) );
	};

	const credentialsFilled = ! provider.fields
		.filter( ( f ) => f.required )
		.some( ( f ) => ! config[ f.key ]?.toString().trim() );

	const canSave = credentialsFilled && fromEmail.trim() && name.trim();

	return (
		<div className="max-w-[600px]">
				<div className="mb-5">
				<button
					onClick={ onBack }
					className="mb-4 inline-flex cursor-pointer items-center gap-1 border-none bg-transparent text-[13px] font-medium text-ink-500 transition-colors hover:text-ink-800"
				>
					<ArrowLeftIcon className="h-4 w-4" />
					Back to connections
				</button>
				<div className="flex items-center gap-3">
					<ProviderIcon id={ provider.id } size={ 36 } />
					<div>
						<h2 className="m-0 text-[15px] font-bold text-ink-900">
							{ conn ? 'Edit' : 'Connect' } { provider.name }
						</h2>
						<p className="m-0 text-[12.5px] text-ink-400">{ provider.desc }</p>
					</div>
				</div>
			</div>

			{ provider.fields.length > 0 && (
				<Card className="mb-3 overflow-hidden">
					<div className="px-5 pt-4 pb-1">
						<SectionTitle>Credentials</SectionTitle>
					</div>
					{ provider.id === 'smtp' && (
						<div className="px-5 pt-3">
							<div className="flex flex-wrap gap-1.5">
								{ SMTP_PRESETS.map( ( preset ) => (
									<button
										key={ preset.id }
										type="button"
										onClick={ () => applyPreset( preset ) }
										className={ cn(
											'rounded-full border px-3 py-1 text-[12px] font-medium transition-colors',
											smtpPreset === preset.id
												? 'border-brand bg-brand-light text-brand-text'
												: 'border-ink-200 bg-surface text-ink-600 hover:border-ink-300'
										) }
									>
										{ preset.name }
									</button>
								) ) }
							</div>
							{ smtpPreset && SMTP_PRESETS.find( ( p ) => p.id === smtpPreset )?.note && (
								<p className="mt-2 mb-0 text-[11.5px] text-ink-500">
									{ SMTP_PRESETS.find( ( p ) => p.id === smtpPreset ).note }
								</p>
							) }
						</div>
					) }
					<div className="flex flex-col gap-3.5 px-5 pb-5 pt-3">
						{ provider.fields.map( ( field ) =>
							field.type === 'select' ? (
								<Select
									key={ field.key }
									label={ field.label }
									required={ field.required }
									hint={ field.hint }
									value={ config[ field.key ] || field.options?.[ 0 ]?.value || '' }
									onChange={ ( e ) => updateField( field.key, e.target.value ) }
									options={ field.options }
								/>
							) : (
								<Input
									key={ field.key }
									label={ field.label }
									required={ field.required }
									hint={ field.hint }
									type={ field.type || 'text' }
									placeholder={ field.placeholder }
									value={ config[ field.key ] || '' }
									onChange={ ( e ) => updateField( field.key, e.target.value ) }
								/>
							)
						) }
					</div>
					{ provider.dashboard && (
						<div className="border-t border-ink-200/40 px-5 py-3">
							<a href={ provider.dashboard } target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] !text-brand-text no-underline hover:underline">
								Where do I find these? <ChevronRightIcon className="h-3.5 w-3.5" />
							</a>
						</div>
					) }
				</Card>
			) }

			<Card className="mb-3 overflow-hidden">
				<div className="px-5 pt-4 pb-1">
					<SectionTitle>Sender identity</SectionTitle>
				</div>
				<div className="flex flex-col gap-3.5 px-5 pb-5 pt-3">
					<Input label="Connection name" required placeholder={ provider.name } hint="A label to tell this connection apart — e.g. “Postmark · Transactional”." value={ name } onChange={ ( e ) => setName( e.target.value ) } />
					<Input label="From Email" required type="email" placeholder="hello@yourdomain.com" hint="This email or its domain must be verified with your provider." tooltip="Recipients see this as the sender. If it (or its domain) isn't verified with your provider, messages get rejected or land in spam." value={ fromEmail } onChange={ ( e ) => setFromEmail( e.target.value ) } />
					<Input label="From Name" placeholder="Your Site Name" hint="The name that appears in the recipient's inbox." value={ fromName } onChange={ ( e ) => setFromName( e.target.value ) } />
				</div>
			</Card>

			<Card className="mb-5 overflow-hidden">
				<button
					type="button"
					onClick={ () => setShowRouting( ! showRouting ) }
					className="flex w-full cursor-pointer items-center justify-between border-none bg-transparent px-5 py-3.5 text-left"
				>
					<span className="flex items-center gap-2">
						<SectionTitle>Advanced routing</SectionTitle>
						{ ! showRouting && (
							<span className="text-[11.5px] text-ink-400">
								{ fromMatch.length ? fromMatch.join( ', ' ) : 'All senders' }{ purpose !== 'any' ? ` · ${ purpose }` : '' }
							</span>
						) }
					</span>
					<ChevronRightIcon className={ `h-4 w-4 text-ink-400 transition-transform ${ showRouting ? 'rotate-90' : '' }` } />
				</button>
				{ showRouting && (
				<div className="flex flex-col gap-3.5 px-5 pb-5 pt-1">
					<TagInput
						label="Send for these senders"
						values={ fromMatch }
						onChange={ setFromMatch }
						placeholder="All senders (catch-all)"
						hint="Add an email (support@you.com) or a domain (you.com), then press Enter. Leave empty to handle every sender. The most specific match wins."
					/>
					<SegmentedControl
						label="Purpose"
						options={ PURPOSES }
						value={ purpose }
						onChange={ setPurpose }
						hint="How this connection is used for routing. “Any” handles everything — keep it unless you want a dedicated connection per stream (e.g. a separate Postmark Broadcast connection just for campaigns). Postmark’s message stream is set automatically: Marketing → Broadcast, otherwise Transactional."
					/>
				</div>
				) }
			</Card>

			<div className="flex items-center gap-2">
				<Button variant="secondary" onClick={ onBack }>Cancel</Button>
				<Button
					className="flex-1 justify-center"
					disabled={ ! canSave || saving }
					onClick={ () => canSave && onSave( { name, config, from_email: fromEmail, from_name: fromName, from_match: fromMatch, purpose } ) }
				>
					{ saving ? 'Saving…' : conn ? 'Save changes' : 'Save & enable connection' }
				</Button>
			</div>
		</div>
	);
}

function ConfirmDelete( { conn, onConfirm, onCancel } ) {
	return (
		<Dialog
			open
			onOpenChange={ ( open ) => ! open && onCancel() }
			size="sm"
			title={ `Remove ${ conn.name }?` }
			description={ `This will disconnect ${ conn.name } and remove its credentials. Emails will no longer be sent through this provider.` }
			footer={
				<>
					<Button variant="secondary" onClick={ onCancel }>Cancel</Button>
					<Button variant="danger" onClick={ onConfirm }>Remove</Button>
				</>
			}
		/>
	);
}

function TestDialog( { conn, onSend, onCancel, sending } ) {
	const [ email, setEmail ] = useState( '' );
	return (
		<Dialog
			open
			onOpenChange={ ( open ) => ! open && onCancel() }
			size="sm"
			title={ `Test ${ conn.name }` }
			description="Sends a test email through this connection. Use an inbox you can check — and that isn’t suppressed at your provider."
			footer={
				<>
					<Button variant="secondary" onClick={ onCancel }>Cancel</Button>
					<Button disabled={ sending } onClick={ () => onSend( email.trim() ) }>
						{ sending ? 'Sending…' : 'Send test' }
					</Button>
				</>
			}
		>
			<Input
				label="Send test to"
				type="email"
				placeholder="you@example.com"
				value={ email }
				onChange={ ( e ) => setEmail( e.target.value ) }
				hint="Leave empty to use your account email."
			/>
		</Dialog>
	);
}

function SortableCard( { conn, index, testing, onToggle, onRemove, onEdit, onTest } ) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable( { id: conn.id } );
	const isPrimary = index === 0 && conn.enabled;

	const tested = conn.last_test_at > 0;
	const ok     = conn.last_test_status === 'sent';
	const failed = conn.last_test_status === 'failed';
	const badge  = ! tested ? null
		: ok ? `Tested · ${ relative( conn.last_test_at ) }`
		: `Test failed · ${ relative( conn.last_test_at ) }`;
	const badgeCls = ok ? 'text-success' : 'text-danger';

	return (
		<div
			ref={ setNodeRef }
			style={ { transform: CSS.Transform.toString( transform ), transition, opacity: isDragging ? 0.5 : conn.enabled ? 1 : 0.45 } }
			className="group flex items-center gap-3 rounded-xl border border-ink-200/70 bg-surface px-4 py-3 transition-all duration-150 hover:border-ink-300"
		>
			<button { ...attributes } { ...listeners } className="cursor-grab touch-none border-none bg-transparent p-0 text-ink-300 opacity-0 transition-opacity group-hover:opacity-100">
				<GripIcon className="h-3.5 w-3.5" />
			</button>
			<div
				className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
				style={ {
					background: isPrimary ? 'var(--my-accent-light)' : conn.enabled ? 'var(--my-warning-bg)' : 'var(--my-surface-alt)',
					color: isPrimary ? 'var(--my-accent)' : conn.enabled ? 'var(--my-warning)' : 'var(--my-text-muted)',
				} }
			>
				{ index + 1 }
			</div>
			<ProviderIcon id={ conn.provider } size={ 26 } />
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-1.5">
					<span className="text-[13px] font-semibold text-ink-900">{ conn.name }</span>
					{ isPrimary && <StatusPill status="primary">Primary</StatusPill> }
					{ index > 0 && conn.enabled && <StatusPill status="backup">Backup</StatusPill> }
				</div>
				<div className="mt-[1px] flex items-center gap-2 text-[11.5px] text-ink-400">
					<span>{ conn.from_email || 'Not configured' }</span>
					{ Array.isArray( conn.from_match ) && conn.from_match.length > 0 && (
						<span className="truncate text-ink-500">· { conn.from_match.join( ', ' ) }</span>
					) }
					{ conn.purpose && conn.purpose !== 'any' && (
						<span className="rounded bg-ink-100 px-1.5 py-[1px] text-[10px] font-medium uppercase tracking-wide text-ink-500">{ conn.purpose === 'marketing' ? 'mkt' : 'txn' }</span>
					) }
					{ badge && (
						<span className={ `inline-flex items-center gap-1 ${ badgeCls }` }>
							<span className={ `h-1.5 w-1.5 rounded-full ${ ok ? 'bg-success' : 'bg-danger' }` } />
							{ badge }
						</span>
					) }
				</div>
			</div>
			<button
				onClick={ () => onTest( conn.id ) }
				disabled={ testing }
				className="cursor-pointer rounded-md border border-ink-200/70 bg-white px-2 py-[3px] text-[11px] font-medium text-ink-600 transition-colors hover:border-brand hover:text-brand-text disabled:opacity-50"
			>
				{ testing ? 'Testing…' : 'Test' }
			</button>
			<Toggle label={ `Toggle ${ conn.name }` } on={ conn.enabled } onChange={ () => onToggle( conn.id ) } />
			<div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
				<Button variant="ghost" size="icon" onClick={ () => onEdit( conn ) } aria-label={ `Edit ${ conn.name }` }>
					<GearIcon className="h-4 w-4" />
				</Button>
				<Button variant="ghost" size="icon" onClick={ () => onRemove( conn.id ) } aria-label={ `Remove ${ conn.name }` }>
					<XIcon className="h-4 w-4" />
				</Button>
			</div>
		</div>
	);
}

export default function Connections() {
	const { connections, setConnections, loading, create, update, remove, reorder, refetch } = useConnections();
	const [ adding, setAdding ] = useState( false );
	const [ configProvider, setConfigProvider ] = useState( null );
	const [ editingConn, setEditingConn ] = useState( null );
	const [ configSaving, setConfigSaving ] = useState( false );
	const [ confirmDelete, setConfirmDelete ] = useState( null );
	const [ testConn, setTestConn ] = useState( null );
	const [ testingId, setTestingId ] = useState( null );

	// Open the test dialog for a connection (lets the user pick the recipient
	// so a single suppressed address can't block testing).
	const askTest = useCallback( ( id ) => {
		const conn = connections.find( ( c ) => c.id === id );
		if ( conn ) setTestConn( conn );
	}, [ connections ] );

	const runTest = useCallback( ( to ) => {
		if ( ! testConn ) return;
		const id = testConn.id;
		setTestingId( id );
		post( `connections/${ id }/test`, to ? { to } : {} )
			.then( ( res ) => {
				toast[ res.success ? 'success' : 'error' ]( res.message || ( res.success ? 'Test passed' : 'Test failed' ) );
				if ( res.success ) setTestConn( null );
			} )
			.catch( ( err ) => toast.error( err?.message || 'Test request failed' ) )
			.finally( () => {
				setTestingId( null );
				refetch?.();
			} );
	}, [ testConn, refetch ] );

	const sensors = useSensors(
		useSensor( PointerSensor ),
		useSensor( KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates } )
	);

	const handleDragEnd = useCallback( ( event ) => {
		const { active, over } = event;
		if ( active.id !== over?.id ) {
			setConnections( ( prev ) => {
				const oldIdx = prev.findIndex( ( c ) => c.id === active.id );
				const newIdx = prev.findIndex( ( c ) => c.id === over.id );
				const reordered = arrayMove( prev, oldIdx, newIdx );
				reorder( reordered.map( ( c ) => c.id ) );
				return reordered;
			} );
		}
	}, [ setConnections, reorder ] );

	const toggleConn = useCallback( ( id ) => {
		setConnections( ( prev ) =>
			prev.map( ( c ) => {
				if ( c.id === id ) {
					const updated = { ...c, enabled: ! c.enabled };
					update( id, { enabled: updated.enabled } )
						.then( () => toast.success( `${ c.name } ${ updated.enabled ? 'enabled' : 'disabled' }` ) );
					return updated;
				}
				return c;
			} )
		);
	}, [ setConnections, update ] );

	const askRemove = useCallback( ( id ) => {
		const conn = connections.find( ( c ) => c.id === id );
		if ( conn ) setConfirmDelete( conn );
	}, [ connections ] );

	const doRemove = useCallback( () => {
		if ( ! confirmDelete ) return;
		const conn = confirmDelete;
		setConfirmDelete( null );
		setConnections( ( prev ) => prev.filter( ( c ) => c.id !== conn.id ) );
		remove( conn.id )
			.then( () => toast.success( `${ conn.name } removed` ) )
			.catch( () => toast.error( 'Failed to remove connection' ) );
	}, [ confirmDelete, setConnections, remove ] );

	const startAdd = ( provider ) => {
		setConfigProvider( provider );
		setEditingConn( null );
		setAdding( false );
	};

	const startEdit = ( conn ) => {
		const p = LIVE_PROVIDERS.find( ( pr ) => pr.id === conn.provider );
		if ( p ) {
			setConfigProvider( p );
			setEditingConn( conn );
		}
	};

	const closeConfig = () => {
		setConfigProvider( null );
		setEditingConn( null );
		setConfigSaving( false );
	};

	const handleConfigSave = useCallback( ( { name, config, from_email, from_name, from_match, purpose } ) => {
		setConfigSaving( true );
		if ( editingConn ) {
			update( editingConn.id, { name, config, from_email, from_name, from_match, purpose } )
				.then( () => { toast.success( `${ name } updated` ); closeConfig(); } )
				.catch( () => { toast.error( 'Failed to update' ); setConfigSaving( false ); } );
		} else if ( configProvider ) {
			create( { provider: configProvider.id, name, config, from_email, from_name, from_match, purpose, enabled: true } )
				.then( () => { toast.success( `${ name } connected` ); closeConfig(); } )
				.catch( () => { toast.error( 'Failed to save' ); setConfigSaving( false ); } );
		}
	}, [ editingConn, configProvider, create, update ] );

	if ( configProvider ) {
		return (
			<ConfigPage
				provider={ configProvider }
				conn={ editingConn }
				onSave={ handleConfigSave }
				onBack={ closeConfig }
				saving={ configSaving }
			/>
		);
	}

	if ( loading ) {
		return <ConnectionsSkeleton />;
	}

	// Any provider can be added more than once (e.g. Postmark transactional + Postmark broadcast).
	const availableProviders = LIVE_PROVIDERS;

	return (
		<div>
			<PageHeader
				title="Connections"
				subtitle="The first active connection is primary. If it fails, the next takes over."
				action={
					<Button size="sm" onClick={ () => setAdding( ! adding ) }>
						<PlusIcon className="h-3.5 w-3.5" /> Add
					</Button>
				}
			/>

			{ adding && (
				<div className="mb-4">
					<div className="mb-2 flex items-center justify-between">
						<span className="text-[13px] font-semibold text-ink-900">Choose a provider</span>
						<Button variant="link" size="sm" onClick={ () => setAdding( false ) }>Cancel</Button>
					</div>
					{ availableProviders.length > 0 ? (
						<div className="grid grid-cols-4 gap-2">
							{ availableProviders.map( ( p ) => (
								<button key={ p.id } onClick={ () => startAdd( p ) } className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-ink-200/70 bg-surface px-3 py-4 text-center transition-all duration-150 hover:border-brand hover:bg-brand-light">
									<ProviderIcon id={ p.id } size={ 30 } />
									<div>
										<div className="text-[12.5px] font-semibold text-ink-900">{ p.name }</div>
										<div className="mt-[1px] text-[11px] text-ink-400">{ p.desc }</div>
									</div>
								</button>
							) ) }
						</div>
					) : (
						<Card className="px-4 py-6 text-center text-xs text-ink-400">All available providers are connected.</Card>
					) }
				</div>
			) }

			{ connections.length === 0 ? (
				<Card className="px-6 py-14 text-center">
					<div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-ink-100">
						<LinkIcon className="h-5 w-5 text-ink-300" />
					</div>
					<p className="m-0 mb-1 text-[13px] font-semibold text-ink-800">No connections yet</p>
					<p className="m-0 mb-4 text-xs text-ink-400">Add a provider to start sending emails.</p>
					<Button size="sm" onClick={ () => setAdding( true ) }><PlusIcon className="h-3.5 w-3.5" /> Add your first connection</Button>
				</Card>
			) : (
				<DndContext sensors={ sensors } collisionDetection={ closestCenter } onDragEnd={ handleDragEnd }>
					<SortableContext items={ connections.map( ( c ) => c.id ) } strategy={ verticalListSortingStrategy }>
						<div className="flex flex-col gap-1.5">
							{ connections.map( ( conn, i ) => (
								<SortableCard
									key={ conn.id }
									conn={ conn }
									index={ i }
									testing={ testingId === conn.id }
									onToggle={ toggleConn }
									onRemove={ askRemove }
									onEdit={ startEdit }
									onTest={ askTest }
								/>
							) ) }
						</div>
					</SortableContext>
				</DndContext>
			) }

			{ confirmDelete && <ConfirmDelete conn={ confirmDelete } onConfirm={ doRemove } onCancel={ () => setConfirmDelete( null ) } /> }
			{ testConn && <TestDialog conn={ testConn } sending={ testingId === testConn.id } onSend={ runTest } onCancel={ () => setTestConn( null ) } /> }
		</div>
	);
}
