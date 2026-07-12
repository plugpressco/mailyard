import { useState, useMemo, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { post } from '@/lib/api';
import ProviderIcon from '@/components/ProviderIcon';
import { Button, Input, Select, SectionTitle } from '@/components/ui';
import { SpinnerIcon, ChevronRightIcon } from '@/components/Icons';
import { LIVE_PROVIDERS } from '@/lib/providers';

const STORAGE_KEY = 'mailyard_onboarding';

function loadDraft() {
	try {
		const raw = localStorage.getItem( STORAGE_KEY );
		return raw ? JSON.parse( raw ) : null;
	} catch {
		return null;
	}
}

// Small section label, no card chrome.
function GroupLabel( { children, action } ) {
	return (
		<div className="mb-2 mt-6 flex items-end justify-between">
			<SectionTitle>{ children }</SectionTitle>
			{ action }
		</div>
	);
}

export default function Setup( { onComplete } ) {
	const draft = loadDraft();
	const draftProvider = draft?.providerId
		? LIVE_PROVIDERS.find( ( p ) => p.id === draft.providerId ) || null
		: null;

	const [ picked, setPicked ] = useState( draftProvider );
	const [ config, setConfig ] = useState( draft?.config || {} );
	const [ fromEmail, setFromEmail ] = useState( draft?.fromEmail || '' );
	const [ fromName, setFromName ] = useState( draft?.fromName || '' );
	const [ saving, setSaving ] = useState( false );
	const [ error, setError ] = useState( '' );

	const persist = useCallback( () => {
		try {
			localStorage.setItem( STORAGE_KEY, JSON.stringify( {
				providerId: picked?.id || null, config, fromEmail, fromName,
			} ) );
		} catch { /* ignore */ }
	}, [ picked, config, fromEmail, fromName ] );

	useEffect( () => { persist(); }, [ persist ] );

	const credentialsFilled = useMemo( () => {
		if ( ! picked ) return false;
		return ! picked.fields
			.filter( ( f ) => f.required )
			.some( ( f ) => ! ( config[ f.key ]?.toString().trim() ) );
	}, [ picked, config ] );

	const canSave = picked && credentialsFilled && fromEmail.trim();

	const updateField = ( key, value ) => {
		setConfig( ( prev ) => ( { ...prev, [ key ]: value } ) );
	};

	const handlePickProvider = ( provider ) => {
		if ( picked?.id !== provider.id ) {
			setPicked( provider );
			setConfig( {} );
			setError( '' );
		}
	};

	const handleSave = () => {
		if ( ! canSave ) return;
		setSaving( true );
		setError( '' );
		post( 'onboarding/complete', {
			provider:      picked.id,
			provider_name: picked.name,
			config,
			from_email:    fromEmail.trim(),
			from_name:     fromName.trim(),
		} )
			.then( () => {
				try { localStorage.removeItem( STORAGE_KEY ); } catch { /* ignore */ }
				onComplete();
			} )
			.catch( ( err ) => {
				setError( err?.message || 'Failed to save. Please try again.' );
				setSaving( false );
			} );
	};

	return (
		<div className="min-h-screen bg-ink-50 font-sans">
			<div className="border-b border-ink-200 bg-surface px-6 py-4">
				<div className="mx-auto flex max-w-[560px] items-center gap-2">
					<div className="h-2 w-2 rounded-full bg-brand" />
					<span className="text-[13px] font-bold tracking-tight text-ink-900">Mailyard</span>
				</div>
			</div>

			<div className="mx-auto max-w-[560px] px-6 pb-16 pt-12">
				<h1 className="m-0 text-[24px] font-bold tracking-tight text-ink-900">
					Send email that actually delivers
				</h1>
				<p className="m-0 mt-2 text-[14px] text-ink-500">
					Pick a provider, paste your API key, set who emails come from. That's it.
				</p>

				<GroupLabel>1 · Provider</GroupLabel>
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
								<div className="text-[12.5px] font-semibold text-ink-900">{ p.name }</div>
								<div className="text-[11px] text-ink-400">{ p.desc }</div>
							</div>
						</button>
					) ) }
				</div>

				{ picked && picked.fields.length > 0 && (
					<>
						<GroupLabel
							action={ picked.dashboard && (
								<a href={ picked.dashboard } target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[11px] !text-brand no-underline hover:underline">
									Get your keys <ChevronRightIcon className="h-3 w-3" />
								</a>
							) }
						>
							2 · { picked.name } credentials
						</GroupLabel>
						<div className="flex flex-col gap-3">
							{ picked.fields.map( ( field ) =>
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
					</>
				) }

				{ picked && (
					<>
						<GroupLabel>{ picked.fields.length > 0 ? '3' : '2' } · Sender</GroupLabel>
						<div className="flex flex-col gap-3">
							<Input
								label="From Email"
								required
								type="email"
								placeholder="hello@yourdomain.com"
								hint="Must be verified with your provider."
								value={ fromEmail }
								onChange={ ( e ) => setFromEmail( e.target.value ) }
							/>
							<Input
								label="From Name"
								placeholder="Your Site Name"
								hint="Optional. Shown next to the email in inboxes."
								value={ fromName }
								onChange={ ( e ) => setFromName( e.target.value ) }
							/>
						</div>
					</>
				) }

				{ error && (
					<div className="mt-5 rounded-lg bg-danger-light px-3 py-2.5 text-[12.5px] text-danger">
						{ error }
					</div>
				) }

				{ picked && (
					<>
						<Button
							onClick={ handleSave }
							disabled={ ! canSave || saving }
							className="mt-8 h-11 w-full justify-center"
						>
							{ saving ? (
								<><SpinnerIcon className="h-3.5 w-3.5" /> Saving…</>
							) : (
								<>Start sending</>
							) }
						</Button>

						<p className="mt-3 text-center text-[11.5px] text-ink-400">
							You can add a backup provider any time after setup.
						</p>
					</>
				) }
			</div>
		</div>
	);
}
