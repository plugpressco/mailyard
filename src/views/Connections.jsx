import { useState, useCallback, useEffect, useRef } from 'react';
import {
	DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
	arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';
import useConnections from '@/hooks/useConnections';
import ProviderIcon from '@/components/ProviderIcon';
import StatusPill from '@/components/StatusPill';
import FailoverChain from '@/components/FailoverChain';
import { Card, Button, Toggle, Input, Select, ConnectionsSkeleton } from '@/components/ui';
import { PlusIcon, GearIcon, XIcon, GripIcon, LinkIcon, ChevronRightIcon } from '@/components/Icons';
import { LIVE_PROVIDERS, PLANNED_PROVIDERS } from '@/lib/providers';

/* ── Back Arrow Icon ── */

function ArrowLeftIcon( props ) {
	return (
		<svg { ...props } viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
			<path d="M12.5 15L7.5 10L12.5 5" />
		</svg>
	);
}

/* ── Config Page (replaces drawer) ── */

function ConfigPage( { provider, conn, onSave, onBack, saving } ) {
	const [ config, setConfig ] = useState( {} );
	const [ fromEmail, setFromEmail ] = useState( '' );
	const [ fromName, setFromName ] = useState( '' );

	useEffect( () => {
		if ( conn ) {
			setConfig( conn.config || {} );
			setFromEmail( conn.from_email || '' );
			setFromName( conn.from_name || '' );
		} else {
			setConfig( {} );
			setFromEmail( '' );
			setFromName( '' );
		}
	}, [ conn ] );

	const updateField = ( key, value ) => setConfig( ( prev ) => ( { ...prev, [ key ]: value } ) );

	const credentialsFilled = ! provider.fields
		.filter( ( f ) => f.required )
		.some( ( f ) => ! config[ f.key ]?.toString().trim() );

	const canSave = credentialsFilled && fromEmail.trim();

	return (
		<div className="mx-auto max-w-[520px]">
			{ /* Header with back */ }
			<div className="mb-5">
				<button
					onClick={ onBack }
					className="mb-4 inline-flex cursor-pointer items-center gap-1 border-none bg-transparent text-[13px] font-medium text-warm-500 transition-colors hover:text-warm-800"
				>
					<ArrowLeftIcon className="h-4 w-4" />
					Back to connections
				</button>
				<div className="flex items-center gap-3">
					<ProviderIcon id={ provider.id } size={ 36 } />
					<div>
						<h2 className="m-0 text-[15px] font-bold text-warm-900">
							{ conn ? 'Edit' : 'Connect' } { provider.name }
						</h2>
						<p className="m-0 text-[12.5px] text-warm-400">{ provider.desc }</p>
					</div>
				</div>
			</div>

			{ /* Credentials */ }
			{ provider.fields.length > 0 && (
				<Card className="mb-3 overflow-hidden">
					<div className="px-5 pt-4 pb-1">
						<div className="text-[12px] font-semibold uppercase tracking-wider text-warm-400">Credentials</div>
					</div>
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
						<div className="border-t border-warm-200/40 px-5 py-3">
							<a href={ provider.dashboard } target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] text-brand no-underline hover:underline">
								Where do I find these? <ChevronRightIcon className="h-3.5 w-3.5" />
							</a>
						</div>
					) }
				</Card>
			) }

			{ /* Sender identity */ }
			<Card className="mb-5 overflow-hidden">
				<div className="px-5 pt-4 pb-1">
					<div className="text-[12px] font-semibold uppercase tracking-wider text-warm-400">Sender identity</div>
				</div>
				<div className="flex flex-col gap-3.5 px-5 pb-5 pt-3">
					<Input label="From Email" required type="email" placeholder="hello@yourdomain.com" hint="This email or its domain must be verified with your provider." value={ fromEmail } onChange={ ( e ) => setFromEmail( e.target.value ) } />
					<Input label="From Name" placeholder="Your Site Name" hint="The name that appears in the recipient's inbox." value={ fromName } onChange={ ( e ) => setFromName( e.target.value ) } />
				</div>
			</Card>

			{ /* Actions */ }
			<div className="flex items-center gap-2">
				<Button variant="secondary" onClick={ onBack }>Cancel</Button>
				<Button
					className="flex-1 justify-center"
					disabled={ ! canSave || saving }
					onClick={ () => canSave && onSave( { config, from_email: fromEmail, from_name: fromName } ) }
				>
					{ saving ? 'Saving…' : conn ? 'Save changes' : 'Save & enable connection' }
				</Button>
			</div>
		</div>
	);
}

/* ── Confirm Dialog ── */

function ConfirmDelete( { conn, onConfirm, onCancel } ) {
	const backdropRef = useRef( null );
	return (
		<div ref={ backdropRef } onClick={ ( e ) => e.target === backdropRef.current && onCancel() } className="fixed inset-0 z-50 flex items-center justify-center bg-warm-900/20 backdrop-blur-[2px] animate-in">
			<Card className="w-full max-w-[360px] p-5" style={ { animation: 'popIn 150ms ease-out' } }>
				<div className="mb-1 text-[14px] font-semibold text-warm-900">Remove { conn.name }?</div>
				<p className="m-0 mb-4 text-[12.5px] leading-relaxed text-warm-500">
					This will disconnect { conn.name } and remove its credentials. Emails will no longer be sent through this provider.
				</p>
				<div className="flex gap-2">
					<Button variant="secondary" className="flex-1 justify-center" onClick={ onCancel }>Cancel</Button>
					<Button variant="danger" className="flex-1 justify-center" onClick={ onConfirm }>Remove</Button>
				</div>
			</Card>
		</div>
	);
}

/* ── Sortable Card ── */

function SortableCard( { conn, index, onToggle, onRemove, onEdit } ) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable( { id: conn.id } );
	const isPrimary = index === 0 && conn.enabled;

	return (
		<div
			ref={ setNodeRef }
			style={ { transform: CSS.Transform.toString( transform ), transition, opacity: isDragging ? 0.5 : conn.enabled ? 1 : 0.45 } }
			className="group flex items-center gap-3 rounded-xl border border-warm-200/70 bg-surface px-4 py-3 transition-all duration-150 hover:border-warm-300"
		>
			<button { ...attributes } { ...listeners } className="cursor-grab touch-none border-none bg-transparent p-0 text-warm-300 opacity-0 transition-opacity group-hover:opacity-100">
				<GripIcon className="h-3.5 w-3.5" />
			</button>
			<div
				className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
				style={ {
					background: isPrimary ? 'var(--mm-accent-light)' : conn.enabled ? 'var(--mm-warning-bg)' : 'var(--mm-surface-alt)',
					color: isPrimary ? 'var(--mm-accent)' : conn.enabled ? 'var(--mm-warning)' : 'var(--mm-text-muted)',
				} }
			>
				{ index + 1 }
			</div>
			<ProviderIcon id={ conn.provider } size={ 26 } />
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-1.5">
					<span className="text-[13px] font-semibold text-warm-900">{ conn.name }</span>
					{ isPrimary && <StatusPill status="primary">Primary</StatusPill> }
					{ index > 0 && conn.enabled && <StatusPill status="backup">Backup</StatusPill> }
				</div>
				<div className="mt-[1px] text-[11.5px] text-warm-400">{ conn.from_email || 'Not configured' }</div>
			</div>
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

/* ── Main ── */

export default function Connections() {
	const { connections, setConnections, loading, create, update, remove, reorder } = useConnections();
	const [ adding, setAdding ] = useState( false );
	const [ configProvider, setConfigProvider ] = useState( null );
	const [ editingConn, setEditingConn ] = useState( null );
	const [ configSaving, setConfigSaving ] = useState( false );
	const [ confirmDelete, setConfirmDelete ] = useState( null );

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

	// Open config page for new connection.
	const startAdd = ( provider ) => {
		setConfigProvider( provider );
		setEditingConn( null );
		setAdding( false );
	};

	// Open config page for editing.
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

	const handleConfigSave = useCallback( ( { config, from_email, from_name } ) => {
		setConfigSaving( true );
		if ( editingConn ) {
			update( editingConn.id, { config, from_email, from_name } )
				.then( () => { toast.success( `${ editingConn.name } updated` ); closeConfig(); } )
				.catch( () => { toast.error( 'Failed to update' ); setConfigSaving( false ); } );
		} else if ( configProvider ) {
			create( { provider: configProvider.id, name: configProvider.name, config, from_email, from_name, enabled: true } )
				.then( () => { toast.success( `${ configProvider.name } connected` ); closeConfig(); } )
				.catch( () => { toast.error( 'Failed to save' ); setConfigSaving( false ); } );
		}
	}, [ editingConn, configProvider, create, update ] );

	// ── Config page view ──
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

	// ── Loading ──
	if ( loading ) {
		return <ConnectionsSkeleton />;
	}

	// ── Connections list ──
	const usedProviders = connections.map( ( c ) => c.provider );
	const availableProviders = LIVE_PROVIDERS.filter( ( p ) => ! usedProviders.includes( p.id ) );

	return (
		<div>
			<div className="mb-1 flex items-center justify-between">
				<h2 className="m-0 text-[15px] font-bold text-warm-900">Connections</h2>
				<Button size="sm" onClick={ () => setAdding( ! adding ) }>
					<PlusIcon className="h-3.5 w-3.5" /> Add
				</Button>
			</div>
			<p className="m-0 mb-4 text-[12.5px] text-warm-400">First active connection is primary. If it fails, the next one takes over.</p>

			{ connections.filter( ( c ) => c.enabled ).length > 0 && (
				<div className="mb-4"><FailoverChain connections={ connections } /></div>
			) }

			{ adding && (
				<div className="mb-4">
					<div className="mb-2 flex items-center justify-between">
						<span className="text-[13px] font-semibold text-warm-900">Choose a provider</span>
						<Button variant="link" size="sm" onClick={ () => setAdding( false ) }>Cancel</Button>
					</div>
					{ availableProviders.length > 0 ? (
						<div className="grid grid-cols-4 gap-2">
							{ availableProviders.map( ( p ) => (
								<button key={ p.id } onClick={ () => startAdd( p ) } className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-warm-200/70 bg-surface px-3 py-4 text-center transition-all duration-150 hover:border-brand hover:bg-brand-light">
									<ProviderIcon id={ p.id } size={ 30 } />
									<div>
										<div className="text-[12.5px] font-semibold text-warm-900">{ p.name }</div>
										<div className="mt-[1px] text-[11px] text-warm-400">{ p.desc }</div>
									</div>
								</button>
							) ) }
						</div>
					) : (
						<Card className="px-4 py-6 text-center text-xs text-warm-400">All available providers are connected.</Card>
					) }
					{ PLANNED_PROVIDERS.length > 0 && (
						<div className="mt-2.5 flex flex-wrap items-center gap-1">
							<span className="text-[11px] text-warm-400">Coming soon:</span>
							{ PLANNED_PROVIDERS.map( ( name ) => (
								<span key={ name } className="rounded-md bg-warm-100 px-2 py-[2px] text-[10.5px] text-warm-400">{ name }</span>
							) ) }
						</div>
					) }
				</div>
			) }

			{ connections.length === 0 ? (
				<Card className="px-6 py-14 text-center">
					<div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-warm-100">
						<LinkIcon className="h-5 w-5 text-warm-300" />
					</div>
					<p className="m-0 mb-1 text-[13px] font-semibold text-warm-800">No connections yet</p>
					<p className="m-0 mb-4 text-xs text-warm-400">Add a provider to start sending emails.</p>
					<Button size="sm" onClick={ () => setAdding( true ) }><PlusIcon className="h-3.5 w-3.5" /> Add your first connection</Button>
				</Card>
			) : (
				<DndContext sensors={ sensors } collisionDetection={ closestCenter } onDragEnd={ handleDragEnd }>
					<SortableContext items={ connections.map( ( c ) => c.id ) } strategy={ verticalListSortingStrategy }>
						<div className="flex flex-col gap-1.5">
							{ connections.map( ( conn, i ) => (
								<SortableCard key={ conn.id } conn={ conn } index={ i } onToggle={ toggleConn } onRemove={ askRemove } onEdit={ startEdit } />
							) ) }
						</div>
					</SortableContext>
				</DndContext>
			) }

			{ confirmDelete && <ConfirmDelete conn={ confirmDelete } onConfirm={ doRemove } onCancel={ () => setConfirmDelete( null ) } /> }
		</div>
	);
}
