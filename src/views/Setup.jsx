import { useState, useMemo, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { post } from '@/lib/api';
import sendTestEmail from '@/lib/testEmail';
import ProviderIcon from '@/components/ProviderIcon';
import MailyardMark from '@/components/Logo';
import { Button, Input, Select, SectionTitle } from '@/components/ui';
import { SpinnerIcon, ChevronRightIcon } from '@/components/Icons';
import { LIVE_PROVIDERS, SMTP_PRESETS } from '@/lib/providers';

const STORAGE_KEY = 'mailyard_onboarding';
const STEPS = [ 'Provider', 'Credentials', 'Sender', 'Test & finish' ];

function loadDraft() {
	try {
		const raw = localStorage.getItem( STORAGE_KEY );
		return raw ? JSON.parse( raw ) : null;
	} catch {
		return null;
	}
}

function Stepper( { step, steps, onStep } ) {
	return (
		<ol
			className="mb-8 flex items-center gap-2"
			aria-label="Setup progress"
		>
			{ steps.map( ( label, i ) => {
				const done = i < step;
				const active = i === step;
				return (
					<li
						key={ label }
						className="flex flex-1 items-center gap-2"
					>
						<button
							type="button"
							onClick={ () => i <= step && onStep( i ) }
							disabled={ i > step }
							aria-current={ active ? 'step' : undefined }
							className={ cn(
								'flex items-center gap-2 text-[12px] font-medium',
								i > step ? 'cursor-default' : 'cursor-pointer'
							) }
						>
							<span
								className={ cn(
									'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold transition-colors',
									active && 'bg-brand text-white',
									done && 'bg-brand-light text-brand-text',
									! active &&
										! done &&
										'bg-ink-100 text-ink-400'
								) }
							>
								{ done ? '✓' : i + 1 }
							</span>
							<span
								className={ cn(
									active ? 'text-ink-900' : 'text-ink-400',
									'hidden sm:inline'
								) }
							>
								{ label }
							</span>
						</button>
						{ i < steps.length - 1 && (
							<span className="h-px flex-1 bg-ink-200" />
						) }
					</li>
				);
			} ) }
		</ol>
	);
}

export default function Setup( { onComplete } ) {
	const draft = loadDraft();
	const draftProvider = draft?.providerId
		? LIVE_PROVIDERS.find( ( p ) => p.id === draft.providerId ) || null
		: null;

	const [ step, setStep ] = useState( 0 );
	const [ picked, setPicked ] = useState( draftProvider );
	const [ config, setConfig ] = useState( draft?.config || {} );
	const [ smtpPreset, setSmtpPreset ] = useState( draft?.smtpPreset || null );
	const [ fromEmail, setFromEmail ] = useState( draft?.fromEmail || '' );
	const [ fromName, setFromName ] = useState( draft?.fromName || '' );
	const [ saving, setSaving ] = useState( false );
	const [ saved, setSaved ] = useState( false );
	const [ error, setError ] = useState( '' );
	const [ testTo, setTestTo ] = useState( '' );
	const [ testing, setTesting ] = useState( false );
	const [ testResult, setTestResult ] = useState( null );

	const persist = useCallback( () => {
		try {
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify( {
					providerId: picked?.id || null,
					config,
					smtpPreset,
					fromEmail,
					fromName,
				} )
			);
		} catch {
			/* ignore */
		}
	}, [ picked, config, smtpPreset, fromEmail, fromName ] );

	useEffect( () => {
		persist();
	}, [ persist ] );

	// Default the test recipient to the From address once we reach the last step.
	useEffect( () => {
		if ( step === 3 && ! testTo && fromEmail.trim() ) {
			setTestTo( fromEmail.trim() );
		}
	}, [ step, testTo, fromEmail ] );

	const hasCredentials = picked && picked.fields.length > 0;

	const credentialsFilled = useMemo( () => {
		if ( ! picked ) {
			return false;
		}
		return ! picked.fields
			.filter( ( f ) => f.required )
			.some( ( f ) => ! config[ f.key ]?.toString().trim() );
	}, [ picked, config ] );

	const stepValid = ( i ) => {
		if ( i === 0 ) {
			return !! picked;
		}
		if ( i === 1 ) {
			return ! hasCredentials || credentialsFilled;
		}
		if ( i === 2 ) {
			return !! fromEmail.trim();
		}
		return true;
	};

	const updateField = ( key, value ) =>
		setConfig( ( prev ) => ( { ...prev, [ key ]: value } ) );

	const handlePickProvider = ( provider ) => {
		if ( picked?.id !== provider.id ) {
			setPicked( provider );
			setConfig( {} );
			setSmtpPreset( null );
			setError( '' );
		}
	};

	const applyPreset = ( preset ) => {
		setSmtpPreset( preset.id );
		setConfig( ( prev ) => ( { ...prev, ...preset.values } ) );
	};

	const goNext = () =>
		stepValid( step ) &&
		setStep( ( s ) => Math.min( s + 1, STEPS.length - 1 ) );
	const goBack = () => setStep( ( s ) => Math.max( s - 1, 0 ) );

	const saveOnboarding = () =>
		post( 'onboarding/complete', {
			provider: picked.id,
			provider_name: picked.name,
			config,
			from_email: fromEmail.trim(),
			from_name: fromName.trim(),
		} ).then( () => {
			setSaved( true );
			try {
				localStorage.removeItem( STORAGE_KEY );
			} catch {
				/* ignore */
			}
		} );

	const saveAndTest = () => {
		setError( '' );
		setTesting( true );
		setTestResult( null );
		( saved ? Promise.resolve() : saveOnboarding() )
			.then( () => sendTestEmail( testTo.trim() ) )
			.then( ( res ) => setTestResult( res ) )
			.catch( ( err ) => {
				setError(
					err?.message ||
						'Could not save your settings. Please try again.'
				);
			} )
			.finally( () => setTesting( false ) );
	};

	const finish = () => {
		setSaving( true );
		setError( '' );
		( saved ? Promise.resolve() : saveOnboarding() )
			.then( () => onComplete() )
			.catch( ( err ) => {
				setError( err?.message || 'Failed to save. Please try again.' );
				setSaving( false );
			} );
	};

	let finishLabel = 'Skip test & finish';
	if ( saving ) {
		finishLabel = 'Finishing…';
	} else if ( testResult?.success ) {
		finishLabel = 'Finish';
	}

	return (
		<div className="min-h-screen bg-ink-50 font-sans">
			<div className="border-b border-ink-200 bg-surface px-6 py-4">
				<div className="mx-auto flex max-w-[560px] items-center gap-2">
					<MailyardMark size={ 20 } className="text-brand" />
					<span className="text-[13px] font-bold tracking-tight text-ink-900">
						Mailyard
					</span>
				</div>
			</div>

			<div className="mx-auto max-w-[560px] px-6 pb-16 pt-12">
				<h1 className="m-0 text-[24px] font-bold tracking-tight text-ink-900">
					Send email that actually delivers
				</h1>
				<p className="m-0 mb-8 mt-2 text-[14px] text-ink-500">
					Four quick steps: pick a provider, add credentials, set your
					sender, send a test.
				</p>

				<Stepper step={ step } steps={ STEPS } onStep={ setStep } />

				{ /* Step 1 — Provider */ }
				{ step === 0 && (
					<div className="grid grid-cols-3 gap-1.5">
						{ LIVE_PROVIDERS.map( ( p ) => (
							<button
								key={ p.id }
								onClick={ () => handlePickProvider( p ) }
								className={ cn(
									'flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-3.5 text-center transition-all',
									picked?.id === p.id
										? 'border-brand bg-brand-light ring-1 ring-brand/30'
										: 'border-ink-200 bg-surface hover:border-ink-300'
								) }
							>
								<ProviderIcon id={ p.id } size={ 28 } />
								<div>
									<div className="text-[12.5px] font-semibold text-ink-900">
										{ p.name }
									</div>
									<div className="text-[11px] text-ink-400">
										{ p.desc }
									</div>
								</div>
							</button>
						) ) }
					</div>
				) }

				{ /* Step 2 — Credentials */ }
				{ step === 1 && picked && (
					<div>
						{ picked.dashboard && (
							<a
								href={ picked.dashboard }
								target="_blank"
								rel="noopener noreferrer"
								className="mb-3 inline-flex items-center gap-0.5 text-[11px] !text-brand-text no-underline hover:underline"
							>
								Get your { picked.name } keys{ ' ' }
								<ChevronRightIcon className="h-3 w-3" />
							</a>
						) }

						{ picked.id === 'smtp' && (
							<div className="mb-4">
								<SectionTitle className="mb-1.5">
									Quick presets
								</SectionTitle>
								<div className="flex flex-wrap gap-1.5">
									{ SMTP_PRESETS.map( ( preset ) => (
										<button
											key={ preset.id }
											type="button"
											onClick={ () =>
												applyPreset( preset )
											}
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
								{ smtpPreset &&
									SMTP_PRESETS.find(
										( p ) => p.id === smtpPreset
									)?.note && (
										<p className="mt-2 mb-0 text-[11.5px] text-ink-500">
											{
												SMTP_PRESETS.find(
													( p ) => p.id === smtpPreset
												).note
											}
										</p>
									) }
							</div>
						) }

						{ hasCredentials ? (
							<div className="flex flex-col gap-3">
								{ picked.fields.map( ( field ) =>
									field.type === 'select' ? (
										<Select
											key={ field.key }
											label={ field.label }
											required={ field.required }
											tooltip={ field.hint }
											value={
												config[ field.key ] ||
												field.options?.[ 0 ]?.value ||
												''
											}
											onChange={ ( e ) =>
												updateField(
													field.key,
													e.target.value
												)
											}
											options={ field.options }
										/>
									) : (
										<Input
											key={ field.key }
											label={ field.label }
											required={ field.required }
											tooltip={ field.hint }
											type={ field.type || 'text' }
											placeholder={ field.placeholder }
											value={ config[ field.key ] || '' }
											onChange={ ( e ) =>
												updateField(
													field.key,
													e.target.value
												)
											}
										/>
									)
								) }
							</div>
						) : (
							<p className="rounded-lg border border-ink-200 bg-surface px-3 py-2.5 text-[12.5px] text-ink-500">
								No credentials needed for { picked.name }.
							</p>
						) }
					</div>
				) }

				{ /* Step 3 — Sender */ }
				{ step === 2 && (
					<div className="flex flex-col gap-3">
						<Input
							label="From Email"
							required
							type="email"
							placeholder="hello@yourdomain.com"
							tooltip="The address recipients see as the sender. It must be verified with your provider, or messages will be rejected or land in spam."
							hint="Must be verified with your provider."
							value={ fromEmail }
							onChange={ ( e ) => setFromEmail( e.target.value ) }
						/>
						<Input
							label="From Name"
							tooltip="The display name shown next to your address in the inbox, e.g. your site or business name."
							placeholder="Your Site Name"
							hint="Optional. Shown next to the email in inboxes."
							value={ fromName }
							onChange={ ( e ) => setFromName( e.target.value ) }
						/>
					</div>
				) }

				{ /* Step 4 — Test & finish */ }
				{ step === 3 && (
					<div>
						<p className="m-0 mb-3 text-[13px] text-ink-600">
							Send yourself a test to confirm everything works,
							then finish.
						</p>
						<div className="flex items-end gap-2">
							<Input
								label="Send test to"
								type="email"
								className="flex-1"
								placeholder="you@yourdomain.com"
								value={ testTo }
								onChange={ ( e ) =>
									setTestTo( e.target.value )
								}
							/>
							<Button
								onClick={ saveAndTest }
								disabled={ testing || ! testTo.trim() }
								className="h-9"
							>
								{ testing ? (
									<>
										<SpinnerIcon className="h-3.5 w-3.5" />{ ' ' }
										Sending…
									</>
								) : (
									'Send test'
								) }
							</Button>
						</div>
						{ testResult && (
							<div
								className={ cn(
									'mt-3 rounded-lg px-3 py-2.5 text-[12.5px]',
									testResult.success
										? 'bg-success-light text-success'
										: 'bg-danger-light text-danger'
								) }
							>
								{ testResult.success ? '✓ ' : '✕ ' }
								{ testResult.message }
							</div>
						) }
					</div>
				) }

				{ error && (
					<div className="mt-5 rounded-lg bg-danger-light px-3 py-2.5 text-[12.5px] text-danger">
						{ error }
					</div>
				) }

				{ /* Navigation */ }
				<div className="mt-8 flex items-center justify-between">
					<Button
						variant="ghost"
						onClick={ goBack }
						disabled={ step === 0 || saving }
						className={ cn( step === 0 && 'invisible' ) }
					>
						Back
					</Button>

					{ step < STEPS.length - 1 ? (
						<Button
							onClick={ goNext }
							disabled={ ! stepValid( step ) }
						>
							Continue
						</Button>
					) : (
						<Button onClick={ finish } disabled={ saving }>
							{ saving && (
								<SpinnerIcon className="h-3.5 w-3.5" />
							) }
							{ finishLabel }
						</Button>
					) }
				</div>
			</div>
		</div>
	);
}
