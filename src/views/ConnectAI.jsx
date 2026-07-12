/*
 * Connect AI — the control page for Mailyard's Abilities API tools.
 *
 * Two jobs: decide exactly what an assistant is allowed to do (master switch +
 * per-tool permissions), and show how to point an MCP client at this site.
 * Mailyard ships no MCP transport — a bridge plugin (WordPress MCP Adapter, or
 * Saddle) exposes the server; this page detects it and hands over the endpoint.
 */
import { useState, useEffect, useCallback } from 'react';
import { Badge, GuideDrawer, CodeBlock, StatusDot, Notice, toast } from '@plugpress/ui';
import { get, post } from '@/lib/api';
import { Card, Button, Toggle, SectionTitle, PageHeader, SettingsSkeleton } from '@/components/ui';
import { AlertIcon, BoltIcon } from '@/components/Icons';

const ACCESS_BADGE = {
	read: { label: 'View', variant: 'default' },
	action: { label: 'Sends email', variant: 'danger' },
};

const GROUPS = [
	{ label: 'View · read-only, always safe', accesses: [ 'read' ] },
	{ label: 'Act · delivers a real email', accesses: [ 'action' ], danger: true },
];

function ToolRow( { tool, disabled, onToggle } ) {
	const badge = ACCESS_BADGE[ tool.access ] || ACCESS_BADGE.read;
	const danger = 'action' === tool.access;

	return (
		<div className="flex items-start justify-between gap-4 border-t border-ink-200 px-5 py-3.5 first:border-t-0">
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

export default function ConnectAI() {
	const [ data, setData ] = useState( null );
	const [ loading, setLoading ] = useState( true );
	const [ guideOpen, setGuideOpen ] = useState( false );

	const load = useCallback(
		() => get( 'ai' ).then( setData ).catch( () => setData( null ) ),
		[]
	);
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

	const toggleMaster = ( v ) => save( { enabled: v }, { enabled: v } );

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

	return (
		<div className="max-w-[840px]">
			<PageHeader
				title="Connect AI"
				subtitle="Let an assistant like Claude or Codex diagnose your email delivery — and decide exactly what it may touch."
				action={
					<span className={ `inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${ statusPill.cls }` }>
						{ statusPill.label }
					</span>
				}
			/>

			{ /* Permissions — the centerpiece. */ }
			<Card className="mb-4 overflow-hidden">
				<div className="flex items-center justify-between px-5 py-4">
					<div>
						<div className="text-[13px] font-semibold text-ink-900">AI access</div>
						<div className="mt-[1px] text-[12px] text-ink-400">
							Master switch for every Mailyard tool.
						</div>
					</div>
					<Toggle label="AI access" on={ !! enabled } onChange={ toggleMaster } />
				</div>

				<div className={ enabled ? '' : 'pointer-events-none opacity-50' }>
					{ GROUPS.map( ( group ) => {
						const tools = abilities.filter( ( a ) => group.accesses.includes( a.access ) );
						if ( ! tools.length ) {
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
								{ tools.map( ( tool ) => (
									<ToolRow
										key={ tool.name }
										tool={ tool }
										disabled={ ! enabled }
										onToggle={ toggleTool }
									/>
								) ) }
							</div>
						);
					} ) }
				</div>
			</Card>

			{ /* Connect your tool. */ }
			<Card className="overflow-hidden">
				<div className="px-5 pt-4 pb-1">
					<SectionTitle>Connect your tool</SectionTitle>
				</div>
				<div className="flex items-center justify-between gap-4 px-5 pb-5 pt-3">
					<div className="flex items-center gap-4">
						<StatusDot tone={ abilitiesApi ? 'success' : 'danger' }>WordPress 7.0</StatusDot>
						<StatusDot tone={ adapterActive ? 'success' : 'warning' }>MCP server</StatusDot>
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
							className="!text-brand"
						>
							WordPress MCP Adapter
						</a>{ ' ' }
						plugin — then reload. See “How to connect”.
					</div>
				) }
			</Card>

			<GuideDrawer
				open={ guideOpen }
				onOpenChange={ setGuideOpen }
				title="Connect your AI tool"
			>
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
						plugin, then reload this page.
					</Notice>
				) }

				<h3>1 · Create a credential</h3>
				<p>
					In WordPress go to <strong>Users → Profile → Application Passwords</strong>, add one named
					“Mailyard AI”, and copy it (drop the spaces). Scope it to a least-privilege admin, and try
					this on a staging site first.
				</p>

				<h3>2 · Connection details</h3>
				<CodeBlock copyable>{ endpoint }</CodeBlock>
				<CodeBlock copyable>
					{ 'Authorization: Basic <base64 of WP_USERNAME:APP_PASSWORD>' }
				</CodeBlock>

				<h3>3 · Add it to your client</h3>
				<p>Claude Code:</p>
				<CodeBlock copyable language="bash">
					{ `claude mcp add --transport http mailyard \\\n  ${ endpoint } \\\n  --header "Authorization: Basic $(printf 'WP_USERNAME:APP_PASSWORD' | base64)"` }
				</CodeBlock>
				<p>Cursor, Claude Desktop, Codex, Windsurf:</p>
				<CodeBlock copyable language="json">
					{ JSON.stringify(
						{
							mcpServers: {
								mailyard: {
									type: 'http',
									url: endpoint,
									headers: {
										Authorization: 'Basic <base64 of WP_USERNAME:APP_PASSWORD>',
									},
								},
							},
						},
						null,
						2
					) }
				</CodeBlock>
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
