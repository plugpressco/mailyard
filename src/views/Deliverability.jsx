import { useState } from 'react';
import { toast } from '@plugpress/ui';
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

	return (
		<div>
			<PageHeader
				title="Deliverability"
				subtitle="Will your mail land in the inbox? We check each sending domain's public DNS records — SPF, DKIM, DMARC & MX — and tell you exactly what to fix."
				action={
					<Button size="sm" variant="secondary" onClick={ rescan } disabled={ scanning || loading }>
						{ scanning ? <SpinnerIcon className="h-3.5 w-3.5" /> : <RetryIcon className="h-3.5 w-3.5" /> }
						{ scanning ? 'Scanning…' : 'Re-scan' }
					</Button>
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
		</div>
	);
}
