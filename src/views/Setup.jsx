import { useState, useMemo, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { post } from '@/lib/api';
import ProviderIcon from '@/components/ProviderIcon';
import { SendIcon, CheckIcon, ChevronRightIcon, RetryIcon, ShieldIcon } from '@/components/Icons';
import { LIVE_PROVIDERS, PLANNED_PROVIDERS } from '@/lib/providers';
import sendTestEmail from '@/lib/testEmail';

const STEPS = [
	{ id: 'connect', label: 'Connect' },
	{ id: 'configure', label: 'Configure' },
	{ id: 'verify', label: 'Verify' },
];

const STORAGE_KEY = 'moolmail_onboarding';

function loadSaved() {
	try {
		const raw = localStorage.getItem( STORAGE_KEY );
		return raw ? JSON.parse( raw ) : null;
	} catch {
		return null;
	}
}

export default function Setup( { onComplete } ) {
	const saved = loadSaved();
	const savedProvider = saved?.providerId
		? LIVE_PROVIDERS.find( ( p ) => p.id === saved.providerId ) || null
		: null;

	const [ step, setStep ] = useState( saved?.step || 0 );
	const [ picked, setPicked ] = useState( savedProvider );
	const [ config, setConfig ] = useState( saved?.config || {} );
	const [ fromName, setFromName ] = useState( saved?.fromName || '' );
	const [ fromEmail, setFromEmail ] = useState( saved?.fromEmail || '' );
	const [ logging, setLogging ] = useState( saved?.logging ?? true );
	const [ autoRetry, setAutoRetry ] = useState( saved?.autoRetry ?? true );
	const [ testEmail, setTestEmail ] = useState( '' );
	const [ testState, setTestState ] = useState( null ); // null | 'sending' | 'success' | 'error'

	// Persist
	const persist = useCallback( () => {
		try {
			localStorage.setItem( STORAGE_KEY, JSON.stringify( {
				step, providerId: picked?.id || null, config,
				fromName, fromEmail, logging, autoRetry,
			} ) );
		} catch { /* ignore */ }
	}, [ step, picked, config, fromName, fromEmail, logging, autoRetry ] );

	useEffect( () => { persist(); }, [ persist ] );

	const [ saving, setSaving ] = useState( false );

	const handleComplete = () => {
		setSaving( true );
		post( 'onboarding/complete', {
			provider: picked?.id || '',
			provider_name: picked?.name || '',
			config,
			from_email: fromEmail,
			from_name: fromName,
			logging,
			auto_retry: autoRetry,
		} )
			.then( () => {
				try { localStorage.removeItem( STORAGE_KEY ); } catch { /* ignore */ }
				onComplete();
			} )
			.catch( () => {
				setSaving( false );
			} );
	};

	// Validation
	const credentialsFilled = useMemo( () => {
		if ( ! picked ) return false;
		return ! picked.fields
			.filter( ( f ) => f.required )
			.some( ( f ) => ! config[ f.key ]?.trim() );
	}, [ picked, config ] );

	const canAdvanceStep0 = picked && credentialsFilled;
	const canAdvanceStep1 = fromEmail.trim();

	const updateField = ( key, value ) => {
		setConfig( ( prev ) => ( { ...prev, [ key ]: value } ) );
	};

	const handlePickProvider = ( provider ) => {
		if ( picked?.id !== provider.id ) {
			setPicked( provider );
			setConfig( {} );
		}
	};

	const next = () => setStep( ( s ) => Math.min( s + 1, 2 ) );
	const back = () => setStep( ( s ) => Math.max( s - 1, 0 ) );

	const handleTest = () => {
		setTestState( 'sending' );
		sendTestEmail( testEmail || fromEmail )
			.then( ( result ) => {
				setTestState( result.success ? 'success' : 'error' );
			} )
			.catch( () => {
				setTestState( 'error' );
			} );
	};

	return (
		<div className="min-h-screen bg-warm-50 font-sans">
			{ /* Header */ }
			<div className="border-b border-warm-200 bg-white px-7 py-4">
				<div className="mx-auto flex max-w-[600px] items-center justify-between">
					<div className="flex items-center gap-[7px]">
						<div className="h-2 w-2 rounded-full bg-brand" />
						<span className="text-sm font-bold tracking-tight text-warm-900">MoolMail</span>
					</div>
					<button onClick={ handleComplete } className="cursor-pointer border-none bg-transparent text-xs text-warm-400 hover:text-warm-500">
						Skip setup
					</button>
				</div>
			</div>

			<div className="mx-auto max-w-[600px] px-6 py-10">
				{ /* Stepper */ }
				<div className="mb-10 flex items-center justify-center">
					{ STEPS.map( ( s, i ) => (
						<div key={ s.id } className="flex items-center">
							<div className="flex items-center gap-2">
								<div
									className={ cn(
										'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors',
										i < step ? 'bg-brand text-white'
											: i === step ? 'border-2 border-brand bg-white text-brand'
											: 'border border-warm-200 bg-white text-warm-400'
									) }
								>
									{ i < step ? <CheckIcon className="h-3.5 w-3.5" /> : i + 1 }
								</div>
								<span className={ cn(
									'text-[13px] font-medium',
									i <= step ? 'text-warm-900' : 'text-warm-400'
								) }>
									{ s.label }
								</span>
							</div>
							{ i < STEPS.length - 1 && (
								<div className={ cn( 'mx-4 h-[1.5px] w-12', i < step ? 'bg-brand' : 'bg-warm-200' ) } />
							) }
						</div>
					) ) }
				</div>

				{ /* ═══ Step 1: Connect ═══ */ }
				{ step === 0 && (
					<div>
						<div className="mb-6 text-center">
							<h1 className="m-0 mb-1 text-xl font-bold text-warm-900">
								Choose your email provider
							</h1>
							<p className="m-0 text-sm text-warm-500">
								Select the service that will deliver your emails.
							</p>
						</div>

						{ /* Provider grid */ }
						<div className="mb-4 grid grid-cols-3 gap-2">
							{ LIVE_PROVIDERS.map( ( p ) => (
								<button
									key={ p.id }
									onClick={ () => handlePickProvider( p ) }
									className={ cn(
										'flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-4 transition-all text-center',
										picked?.id === p.id
											? 'border-brand bg-brand-light'
											: 'border-warm-200 bg-white hover:border-warm-300'
									) }
								>
									<ProviderIcon id={ p.id } size={ 32 } />
									<div>
										<div className="text-[13px] font-semibold text-warm-900">{ p.name }</div>
										<div className="text-[11px] text-warm-400">{ p.desc }</div>
									</div>
								</button>
							) ) }
						</div>

						{ /* Coming soon */ }
						<div className="mb-6 flex flex-wrap items-center justify-center gap-1">
							<span className="text-[11px] text-warm-400">Coming soon:</span>
							{ PLANNED_PROVIDERS.map( ( name ) => (
								<span key={ name } className="rounded bg-warm-100 px-1.5 py-[1px] text-[10.5px] text-warm-400">{ name }</span>
							) ) }
						</div>

						{ /* Credentials — only if provider picked and has fields */ }
						{ picked && picked.fields.length > 0 && (
							<div className="mb-6 rounded-xl border border-warm-200 bg-white p-5">
								<div className="mb-4 flex items-center justify-between">
									<div className="flex items-center gap-2">
										<ProviderIcon id={ picked.id } size={ 20 } />
										<span className="text-[13px] font-semibold text-warm-800">
											{ picked.name } credentials
										</span>
									</div>
									{ picked.dashboard && (
										<a href={ picked.dashboard } target="_blank" rel="noopener noreferrer" className="text-[11px] text-brand no-underline hover:underline">
											Get your keys →
										</a>
									) }
								</div>
								<div className="flex flex-col gap-3">
									{ picked.fields.map( ( field ) =>
										field.type === 'select' ? (
											<SelectField key={ field.key } field={ field } value={ config[ field.key ] || field.options?.[ 0 ]?.value || '' } onChange={ ( v ) => updateField( field.key, v ) } />
										) : (
											<InputField key={ field.key } field={ field } value={ config[ field.key ] || '' } onChange={ ( v ) => updateField( field.key, v ) } />
										)
									) }
								</div>
							</div>
						) }

						<button
							onClick={ next }
							disabled={ ! canAdvanceStep0 }
							className={ cn(
								'flex h-11 w-full items-center justify-center gap-1 rounded-lg border-none text-sm font-medium text-white cursor-pointer',
								canAdvanceStep0 ? 'bg-brand' : 'bg-brand/30 cursor-default'
							) }
						>
							Continue <ChevronRightIcon className="h-3.5 w-3.5" />
						</button>
					</div>
				) }

				{ /* ═══ Step 2: Configure ═══ */ }
				{ step === 1 && (
					<div>
						<div className="mb-6 text-center">
							<h1 className="m-0 mb-1 text-xl font-bold text-warm-900">
								Set up your sender
							</h1>
							<p className="m-0 text-sm text-warm-500">
								How should your emails appear to recipients?
							</p>
						</div>

						{ /* Sender identity */ }
						<div className="mb-3 rounded-xl border border-warm-200 bg-white p-5">
							<span className="mb-3 block text-[13px] font-semibold text-warm-800">Sender identity</span>
							<div className="flex flex-col gap-3">
								<InputField
									field={ { key: 'from_email', label: 'From Email', type: 'email', required: true, placeholder: 'hello@yourdomain.com', hint: 'Must be verified with your provider. All outgoing emails will use this address.' } }
									value={ fromEmail }
									onChange={ setFromEmail }
								/>
								<InputField
									field={ { key: 'from_name', label: 'From Name', type: 'text', placeholder: 'Your Site Name', hint: 'The name that appears in the recipient\'s inbox.' } }
									value={ fromName }
									onChange={ setFromName }
								/>
							</div>
						</div>

						{ /* Quick preferences */ }
						<div className="mb-6 rounded-xl border border-warm-200 bg-white p-5">
							<span className="mb-3 block text-[13px] font-semibold text-warm-800">Preferences</span>
							<div className="flex flex-col gap-0">
								<ToggleRow
									title="Email logging"
									desc="Keep a log of every email sent — useful for debugging and resending."
									on={ logging }
									onChange={ setLogging }
								/>
								<div className="border-t border-warm-100" />
								<ToggleRow
									title="Auto-retry failed emails"
									desc="Automatically retry delivery if a send fails."
									on={ autoRetry }
									onChange={ setAutoRetry }
								/>
							</div>
						</div>

						<div className="flex gap-2">
							<button onClick={ back } className="h-11 rounded-lg border border-warm-200 bg-white px-5 text-sm font-medium text-warm-600 cursor-pointer">
								Back
							</button>
							<button
								onClick={ next }
								disabled={ ! canAdvanceStep1 }
								className={ cn(
									'flex h-11 flex-1 items-center justify-center gap-1 rounded-lg border-none text-sm font-medium text-white cursor-pointer',
									canAdvanceStep1 ? 'bg-brand' : 'bg-brand/30 cursor-default'
								) }
							>
								Continue <ChevronRightIcon className="h-3.5 w-3.5" />
							</button>
						</div>
					</div>
				) }

				{ /* ═══ Step 3: Verify ═══ */ }
				{ step === 2 && (
					<div>
						<div className="mb-6 text-center">
							<h1 className="m-0 mb-1 text-xl font-bold text-warm-900">
								Test your connection
							</h1>
							<p className="m-0 text-sm text-warm-500">
								Send a test email to make sure everything works.
							</p>
						</div>

						{ /* Summary */ }
						<div className="mb-4 rounded-xl border border-warm-200 bg-white p-5">
							<span className="mb-3 block text-[13px] font-semibold text-warm-800">Your setup</span>
							<div className="flex flex-col gap-2.5 text-[13px]">
								<SummaryRow label="Provider" value={
									<span className="flex items-center gap-1.5">
										<ProviderIcon id={ picked?.id } size={ 16 } />
										{ picked?.name }
									</span>
								} />
								<SummaryRow label="From" value={ `${ fromName ? fromName + ' · ' : '' }${ fromEmail }` } />
								<SummaryRow label="Logging" value={ logging ? 'Enabled' : 'Disabled' } />
								<SummaryRow label="Auto-retry" value={ autoRetry ? 'Enabled' : 'Disabled' } />
							</div>
						</div>

						{ /* Test */ }
						<div className="mb-6 rounded-xl border border-warm-200 bg-white p-5">
							<span className="mb-1 block text-[13px] font-semibold text-warm-800">Send test email</span>
							<p className="m-0 mb-3 text-[11.5px] text-warm-400">
								We'll send a quick test to confirm delivery is working.
							</p>
							<div className="flex gap-2">
								<input
									placeholder={ fromEmail || 'test@email.com' }
									value={ testEmail }
									onChange={ ( e ) => setTestEmail( e.target.value ) }
									className="h-10 flex-1 rounded-lg border border-warm-200 bg-white px-3 text-sm text-warm-900 outline-none focus:border-brand"
								/>
								<button
									onClick={ handleTest }
									disabled={ testState === 'sending' }
									className="inline-flex items-center gap-1.5 rounded-lg border-none bg-brand px-4 text-sm font-medium text-white cursor-pointer disabled:opacity-40"
								>
									{ testState === 'sending' ? (
										<>
											<svg className="smtp-spin h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="10" cy="10" r="7" strokeDasharray="30 14" /></svg>
											Sending…
										</>
									) : (
										<><SendIcon className="h-3.5 w-3.5" /> Send test</>
									) }
								</button>
							</div>
							{ testState === 'success' && (
								<div className="mt-3 flex items-center gap-1.5 rounded-lg bg-success-light px-3 py-2.5 text-xs font-medium text-success">
									<CheckIcon className="h-3.5 w-3.5" />
									Test email delivered successfully!
								</div>
							) }
							{ testState === 'error' && (
								<div className="mt-3 rounded-lg bg-danger-light px-3 py-2.5 text-xs text-danger">
									Failed to send test email. Check your provider credentials and try again.
								</div>
							) }
						</div>

						<div className="flex gap-2">
							<button onClick={ back } className="h-11 rounded-lg border border-warm-200 bg-white px-5 text-sm font-medium text-warm-600 cursor-pointer">
								Back
							</button>
							<button
								onClick={ handleComplete }
								className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border-none bg-brand text-sm font-medium text-white cursor-pointer"
							>
								<CheckIcon className="h-3.5 w-3.5" />
								Finish setup
							</button>
						</div>
					</div>
				) }
			</div>
		</div>
	);
}

/* ── Shared sub-components ── */

function InputField( { field, value, onChange } ) {
	return (
		<div className="flex flex-col gap-1">
			<label className="text-[12.5px] font-medium text-warm-700">
				{ field.label }
				{ field.required && <span className="ml-0.5 text-danger">*</span> }
			</label>
			<input
				type={ field.type || 'text' }
				value={ value }
				onChange={ ( e ) => onChange( e.target.value ) }
				placeholder={ field.placeholder }
				className="h-9 w-full rounded-lg border border-warm-200 bg-white px-3 text-sm text-warm-900 outline-none focus:border-brand"
			/>
			{ field.hint && <span className="text-[11px] leading-snug text-warm-400">{ field.hint }</span> }
		</div>
	);
}

function SelectField( { field, value, onChange } ) {
	return (
		<div className="flex flex-col gap-1">
			<label className="text-[12.5px] font-medium text-warm-700">
				{ field.label }
				{ field.required && <span className="ml-0.5 text-danger">*</span> }
			</label>
			<select
				value={ value }
				onChange={ ( e ) => onChange( e.target.value ) }
				className="h-9 w-full cursor-pointer appearance-auto rounded-lg border border-warm-200 bg-white px-2.5 text-sm text-warm-900 outline-none focus:border-brand"
			>
				{ field.options.map( ( opt ) => (
					<option key={ opt.value } value={ opt.value }>{ opt.label }</option>
				) ) }
			</select>
			{ field.hint && <span className="text-[11px] leading-snug text-warm-400">{ field.hint }</span> }
		</div>
	);
}

function ToggleRow( { title, desc, on, onChange } ) {
	return (
		<div className="flex items-center justify-between py-3">
			<div>
				<div className="text-[13px] font-medium text-warm-800">{ title }</div>
				<div className="text-[11.5px] text-warm-400">{ desc }</div>
			</div>
			<button
				onClick={ () => onChange( ! on ) }
				className="relative h-5 w-9 shrink-0 cursor-pointer rounded-full border-none transition-colors"
				style={ { background: on ? 'var(--mm-accent)' : 'var(--mm-border)' } }
			>
				<span className="absolute top-[2px] h-4 w-4 rounded-full bg-white transition-[left]" style={ { left: on ? 18 : 2 } } />
			</button>
		</div>
	);
}

function SummaryRow( { label, value } ) {
	return (
		<div className="flex items-center justify-between">
			<span className="text-warm-500">{ label }</span>
			<span className="font-medium text-warm-900">{ value }</span>
		</div>
	);
}
