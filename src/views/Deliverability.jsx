import { useState } from 'react';
import { GuideDrawer, toast } from '@plugpress/ui';
import useDeliverability from '@/hooks/useDeliverability';
import ProviderIcon from '@/components/ProviderIcon';
import { Card, Button, SectionTitle, PageHeader, ScoreRing } from '@/components/ui';
import { RetryIcon, SpinnerIcon, ShieldIcon, CheckCircleIcon, AlertIcon, XCircleIcon } from '@/components/Icons';

const GRADE_COLOR = {
	A: 'var(--my-success)', B: 'var(--my-success)',
	C: 'var(--my-warning)',
	D: 'var(--my-danger)',  F: 'var(--my-danger)',
	'—': 'var(--my-text-muted)',
};

const STATUS = {
	pass: { Icon: CheckCircleIcon, cls: 'text-success' },
	warn: { Icon: AlertIcon,       cls: 'text-warning' },
	fail: { Icon: XCircleIcon,     cls: 'text-danger' },
};

function CheckRow( { check } ) {
	const [ open, setOpen ] = useState( false );
	const s = STATUS[ check.status ] || STATUS.warn;
	const StatusIcon = s.Icon;
	const hasFix = check.status !== 'pass' && check.fix;

	const copyFix = ( e ) => {
		e.stopPropagation();
		navigator.clipboard?.writeText( check.fix ).then(
			() => toast.success( 'Copied to clipboard' ),
			() => toast.error( 'Copy failed' )
		);
	};

	return (
		<div className="border-t border-ink-200/50 first:border-t-0">
			<button
				onClick={ () => hasFix && setOpen( ! open ) }
				className={ `flex w-full items-center gap-3 border-none bg-transparent px-0 py-2.5 text-left ${ hasFix ? 'cursor-pointer' : 'cursor-default' }` }
			>
				<StatusIcon className={ `h-[18px] w-[18px] shrink-0 ${ s.cls }` } />
				<span className="w-12 shrink-0 text-[12.5px] font-semibold text-ink-800">{ check.label }</span>
				<span className="flex-1 text-[12px] leading-relaxed text-ink-500">{ check.message }</span>
				{ hasFix && (
					<span className="shrink-0 text-[11px] font-medium text-brand-text">{ open ? 'Hide' : 'How to fix' }</span>
				) }
			</button>
			{ open && hasFix && (
				<div className="mb-2.5 ml-8 rounded-lg border border-ink-200/70 bg-ink-50 p-3">
					<div className="flex items-start justify-between gap-3">
						<code className="whitespace-pre-wrap break-all font-mono text-[11.5px] leading-relaxed text-ink-700">{ check.fix }</code>
						<Button size="sm" variant="secondary" onClick={ copyFix }>Copy</Button>
					</div>
				</div>
			) }
		</div>
	);
}

function DomainCard( { result } ) {
	const issues = result.checks.filter( ( c ) => c.status !== 'pass' ).length;
	const summary = 0 === issues ? 'All authentication checks passed.' : `${ issues } thing${ issues > 1 ? 's' : '' } to improve.`;

	return (
		<Card className="mb-3 p-5">
			<div className="flex items-center gap-4">
				<ScoreRing value={ result.score } color={ GRADE_COLOR[ result.grade ] || GRADE_COLOR['—'] } big={ result.score } small={ `Grade ${ result.grade }` } />
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<span className="truncate text-[15px] font-bold text-ink-900">{ result.domain }</span>
						{ result.provider && <ProviderIcon id={ result.provider } size={ 18 } /> }
					</div>
					<p className="m-0 mt-0.5 text-[12.5px] text-ink-500">{ summary }</p>
				</div>
			</div>

			<div className="mt-3 border-t border-ink-200/50 pt-1">
				{ result.checks.map( ( check ) => (
					<CheckRow key={ check.id } check={ check } />
				) ) }
			</div>
		</Card>
	);
}

export default function Deliverability() {
	const { domains, loading, scanning, error, rescan } = useDeliverability();
	const [ guideOpen, setGuideOpen ] = useState( false );

	return (
		<div>
			<PageHeader
				title="Deliverability"
				subtitle="Will your mail land in the inbox? We check each sending domain's public DNS records — SPF, DKIM, DMARC & MX — and tell you exactly what to fix."
				action={
					<div className="flex items-center gap-2">
						<Button size="sm" variant="secondary" onClick={ () => setGuideOpen( true ) }>
							How it works
						</Button>
						<Button size="sm" variant="secondary" onClick={ rescan } disabled={ scanning || loading }>
							{ scanning ? <SpinnerIcon className="h-3.5 w-3.5" /> : <RetryIcon className="h-3.5 w-3.5" /> }
							{ scanning ? 'Scanning…' : 'Re-scan' }
						</Button>
					</div>
				}
			/>

			{ error && (
				<div className="mb-3 rounded-lg bg-danger-light px-3 py-2.5 text-[12.5px] text-danger">
					<strong>Couldn't scan:</strong> { error }
				</div>
			) }

			{ loading ? (
				<Card className="px-6 py-14 text-center text-[12.5px] text-ink-400">Scanning DNS records…</Card>
			) : ! domains?.length ? (
				<Card className="px-6 py-14 text-center">
					<div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-ink-100">
						<ShieldIcon className="h-5 w-5 text-ink-300" />
					</div>
					<p className="m-0 mb-1 text-[13px] font-semibold text-ink-800">Nothing to check yet</p>
					<p className="m-0 text-xs text-ink-400">Add a connection with a sending address and we'll grade its domain.</p>
				</Card>
			) : (
				<>
					<SectionTitle className="mb-2">Sending domains</SectionTitle>
					{ domains.map( ( result ) => (
						<DomainCard key={ result.domain } result={ result } />
					) ) }
				</>
			) }

			<GuideDrawer open={ guideOpen } onOpenChange={ setGuideOpen } title="How the deliverability check works">
				<p>
					Inbox providers like Gmail and Outlook decide whether to trust your mail by looking up
					public DNS records on your sending domain. Mailyard reads the same records and grades
					what it finds — so you fix problems <strong>before</strong> messages land in spam.
				</p>

				<h3>What we check</h3>
				<p>
					For every sending domain in your connections we look up four records:{ ' ' }
					<strong>SPF</strong> — which servers are allowed to send for the domain,{ ' ' }
					<strong>DKIM</strong> — the signing key your provider stamps on each message,{ ' ' }
					<strong>DMARC</strong> — what receivers should do when a message fails those checks, and{ ' ' }
					<strong>MX</strong> — whether the domain can receive replies and bounces.
				</p>

				<h3>How it's scored</h3>
				<p>
					Each record contributes to the domain's score and its A–F grade. Anything short of a pass
					gets a <strong>How to fix</strong> row with the exact DNS record to add — copy it into
					your DNS host (Cloudflare, Route 53, your registrar), give it a few minutes to propagate,
					then re-scan.
				</p>

				<h3>Where the data comes from</h3>
				<p>
					Lookups are ordinary public DNS queries — your server's resolver first, with Cloudflare's
					DNS-over-HTTPS as a fallback. No email content, API keys, or account data ever leaves
					your site. Results are cached for an hour; <strong>Re-scan</strong> fetches fresh records
					right away.
				</p>
			</GuideDrawer>
		</div>
	);
}
