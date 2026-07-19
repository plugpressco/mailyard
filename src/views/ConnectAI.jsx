/*
 * Connect AI — the ONE control page for the family's Abilities API tools.
 *
 * Free Mailyard owns the page; each family plugin contributes a section of
 * tools through the `mailyard.shell.aiSections` filter (Mailyard Pro adds its
 * campaign tools). Every plugin keeps its own permissions storage and REST, so
 * each section carries its own master switch — no cross-plugin writes.
 *
 * Mailyard ships no MCP transport: a bridge (WordPress MCP Adapter, or Saddle)
 * exposes the server; this page detects it and hands over the endpoint + guide.
 */
import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { applyFilters } from '@wordpress/hooks';
import { Badge, GuideDrawer, CodeBlock, LiveIndicator, Notice, toast } from '@plugpress/ui';
import { get, post } from '@/lib/api';
import { Card, Button, Toggle, SectionTitle, PageHeader, SettingsSkeleton } from '@/components/ui';
import { AlertIcon, BoltIcon } from '@/components/Icons';

const ACCESS_BADGE = {
	read: { label: 'View', variant: 'default' },
	write: { label: 'Draft', variant: 'info' },
	action: { label: 'Action', variant: 'warning' },
	send: { label: 'Sends email', variant: 'danger' },
};

const GROUPS = [
	{ label: 'View · read-only, always safe', accesses: [ 'read' ] },
	{ label: 'Manage · create, edit, stop', accesses: [ 'write' ] },
	{ label: 'Act · delivers a real email', accesses: [ 'action', 'send' ], danger: true },
];

function ToolRow( { tool, disabled, onToggle } ) {
	const badge = ACCESS_BADGE[ tool.access ] || ACCESS_BADGE.read;
	const danger = 'action' === tool.access || 'send' === tool.access;

	return (
		<div className="flex items-start justify-between gap-4 border-t border-ink-200 px-5 py-3.5">
			<div className="min-w-0">
				<div className="flex items-center gap-2">
					<span className="text-[13px] font-semibold text-ink-900">{ tool.label }</span>
					<Badge variant={ badge.variant }>{ badge.label }</Badge>
				</div>
				<div className="mt-0.5 text-[12px] leading-relaxed text-ink-500">{ tool.description }</div>
				{ tool.warning && (
					<div
						className={ `mt-1.5 flex items-start gap-1.5 text-[11.5px] ${
							danger ? 'text-danger' : 'text-warning'
						}` }
					>
						<AlertIcon className="mt-px h-3.5 w-3.5 shrink-0" />
						{ tool.warning }
					</div>
				) }
			</div>
			<Toggle
				label={ tool.label }
				on={ !! tool.enabled }
				onChange={ ( v ) => onToggle( tool.name, v ) }
				disabled={ disabled }
			/>
		</div>
	);
}

/**
 * One product's tool list: a master switch plus its tools, grouped by access.
 * Exported so family plugins can render their own section identically —
 * import { AiSection } from the shell and feed it your catalog.
 */
export function AiSection( { title, subtitle, enabled, tools = [], onToggleMaster, onToggleTool } ) {
	return (
		<Card className="mb-4 overflow-hidden">
			<div className="flex items-center justify-between px-5 py-4">
				<div>
					<div className="text-[13px] font-semibold text-ink-900">{ title }</div>
					<div className="mt-[1px] text-[12px] text-ink-400">{ subtitle }</div>
				</div>
				<Toggle label={ `AI access — ${ title }` } on={ !! enabled } onChange={ onToggleMaster } />
			</div>

			<div className={ enabled ? '' : 'pointer-events-none opacity-50' }>
				{ GROUPS.map( ( group ) => {
					const rows = tools.filter( ( t ) => group.accesses.includes( t.access ) );
					if ( ! rows.length ) {
						return null;
					}
					return (
						<div key={ group.label }>
							<div
								className={ `border-t border-ink-200 bg-canvas px-5 py-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] ${
									group.danger ? 'text-danger' : 'text-ink-400'
								}` }
							>
								{ group.label }
							</div>
							{ rows.map( ( tool ) => (
								<ToolRow
									key={ tool.name }
									tool={ tool }
									disabled={ ! enabled }
									onToggle={ onToggleTool }
								/>
							) ) }
						</div>
					);
				} ) }
			</div>
		</Card>
	);
}

export default function ConnectAI() {
	const [ data, setData ] = useState( null );
	const [ loading, setLoading ] = useState( true );
	const [ guideOpen, setGuideOpen ] = useState( false );

	// Tool sections contributed by family plugins (Mailyard Pro adds its
	// campaign tools). Each owns its own data + persistence.
	// AiSection is handed to extenders through the filter's context arg: their
	// bundle can't import ours, but both share the one React global, so a
	// component reference crosses the boundary fine — and every product's tool
	// list renders identically.
	const sections = useMemo( () => {
		const list = applyFilters( 'mailyard.shell.aiSections', [], { AiSection } );
		return ( Array.isArray( list ) ? list : [] )
			.filter( ( s ) => s && s.id && s.Component )
			.sort( ( a, b ) => ( a.order ?? 50 ) - ( b.order ?? 50 ) );
	}, [] );

	const load = useCallback( () => get( 'ai' ).then( setData ).catch( () => setData( null ) ), [] );
	useEffect( () => {
		load().finally( () => setLoading( false ) );
	}, [ load ] );

	const save = ( payload, optimistic ) => {
		setData( ( d ) => ( { ...d, ...optimistic } ) );
		post( 'ai', payload )
			.then( setData )
			.catch( () => {
				toast.error( 'Could not save' );
				load();
			} );
	};

	if ( loading ) {
		return <SettingsSkeleton />;
	}

	if ( ! data ) {
		return <Notice tone="danger">Could not load AI settings.</Notice>;
	}

	const { enabled, abilitiesApi, adapterActive, endpoint, abilities = [] } = data;
	const ready = abilitiesApi && adapterActive;

	const toggleTool = ( name, v ) => {
		const next = abilities.map( ( a ) => ( a.name === name ? { ...a, enabled: v } : a ) );
		const map = {};
		next.forEach( ( a ) => {
			map[ a.name ] = !! a.enabled;
		} );
		save( { abilities: map }, { abilities: next } );
	};

	const statusPill = ! enabled
		? { label: 'Turned off', cls: 'bg-ink-100 text-ink-500' }
		: ready
		? { label: 'Ready to connect', cls: 'bg-success/10 text-success' }
		: { label: 'Finish setup', cls: 'bg-warning/10 text-warning' };

	const authHeader = 'Authorization: Basic <base64 of WP_USERNAME:APP_PASSWORD>';
	const claudeCmd = [
		'claude mcp add --transport http mailyard \\',
		`  ${ endpoint } \\`,
		'  --header "Authorization: Basic $(printf \'WP_USERNAME:APP_PASSWORD\' | base64)"',
	].join( '\n' );
	const clientJson = JSON.stringify(
		{
			mcpServers: {
				mailyard: {
					type: 'http',
					url: endpoint,
					headers: { Authorization: 'Basic <base64 of WP_USERNAME:APP_PASSWORD>' },
				},
			},
		},
		null,
		2
	);

	return (
		<div className="max-w-[840px]">
			<PageHeader
				title="Connect AI"
				subtitle="Let an assistant like Claude or Codex work on your email — and decide exactly what it may touch."
				action={
					<span
						className={ `inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${ statusPill.cls }` }
					>
						{ statusPill.label }
					</span>
				}
			/>

			<AiSection
				title="Delivery tools · Mailyard"
				subtitle="Diagnose why email isn’t arriving."
				enabled={ enabled }
				tools={ abilities }
				onToggleMaster={ ( v ) => save( { enabled: v }, { enabled: v } ) }
				onToggleTool={ toggleTool }
			/>

			{ sections.map( ( { id, Component } ) => (
				<Suspense key={ id } fallback={ null }>
					<Component />
				</Suspense>
			) ) }

			<Card className="overflow-hidden">
				<div className="px-5 pt-4 pb-1">
					<SectionTitle>Connect your tool</SectionTitle>
				</div>
				<div className="flex items-center justify-between gap-4 px-5 pb-5 pt-3">
					<div className="flex items-center gap-4">
						<LiveIndicator tone={ abilitiesApi ? 'success' : 'danger' } pulse={ false }>
							WordPress 7.0
						</LiveIndicator>
						<LiveIndicator tone={ adapterActive ? 'success' : 'warning' } pulse={ false }>
							MCP server
						</LiveIndicator>
					</div>
					<Button size="sm" variant="secondary" onClick={ () => setGuideOpen( true ) }>
						<BoltIcon className="h-3.5 w-3.5" /> How to connect
					</Button>
				</div>

				{ ! abilitiesApi && (
					<div className="border-t border-ink-200 px-5 py-3 text-[12px] text-warning">
						Update to WordPress 7.0 or newer to enable AI tools.
					</div>
				) }
				{ abilitiesApi && ! adapterActive && (
					<div className="border-t border-ink-200 px-5 py-3 text-[12px] text-warning">
						Install an MCP bridge — the free{ ' ' }
						<a
							href="https://github.com/wordpress/mcp-adapter"
							target="_blank"
							rel="noopener noreferrer"
							className="!text-brand-text"
						>
							WordPress MCP Adapter
						</a>{ ' ' }
						plugin, or PlugPress’s Saddle — then reload. See “How to
						connect”.
					</div>
				) }
			</Card>

			<GuideDrawer open={ guideOpen } onOpenChange={ setGuideOpen } title="Connect your AI tool">
				<p>
					Mailyard’s tools ride the WordPress <strong>Abilities API</strong>. Any MCP client —
					Claude Code, Claude Desktop, Codex, Cursor, Windsurf, your own scripts — connects with
					the same endpoint and credentials below.
				</p>

				{ ! adapterActive && (
					<Notice tone="warning">
						No MCP server is running yet. Install the free{ ' ' }
						<a href="https://github.com/wordpress/mcp-adapter" target="_blank" rel="noopener noreferrer">
							WordPress MCP Adapter
						</a>{ ' ' }
						plugin or PlugPress’s Saddle, then reload this page.
					</Notice>
				) }

				<Notice tone="info">
					Connecting through Saddle? Mailyard’s tools appear there as{ ' ' }
					<code>saddle/mailyard-*</code>, with Saddle’s own permission
					tiers and activity log on top of the toggles above.
				</Notice>

				<h3>1 · Create a credential</h3>
				<p>
					In WordPress go to <strong>Users → Profile → Application Passwords</strong>, add one named
					“Mailyard AI”, and copy it (drop the spaces). Scope it to a least-privilege admin, and try
					this on a staging site first.
				</p>

				<h3>2 · Connection details</h3>
				<CodeBlock label="Endpoint" code={ endpoint } wrap />
				<CodeBlock label="Auth header" code={ authHeader } wrap />

				<h3>3 · Add it to your client</h3>
				<CodeBlock label="Claude Code" code={ claudeCmd } wrap />
				<CodeBlock label="Cursor · Claude Desktop · Codex · Windsurf" code={ clientJson } wrap />
				<p>
					Clients that only speak stdio can wrap the endpoint:{ ' ' }
					<code>npx mcp-remote { endpoint }</code>
				</p>

				<h3>4 · Try it</h3>
				<p>
					Ask your assistant: <em>“Why aren’t my WordPress emails arriving?”</em> — it will check the
					provider chain, score your SPF/DKIM/DMARC records, read recent failures, and can send a
					test once you’ve fixed things.
				</p>
			</GuideDrawer>
		</div>
	);
}
