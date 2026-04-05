import { useState } from 'react';
import { post } from '@/lib/api';
import { Card, Input, Textarea, Button, SegmentedControl } from '@/components/ui';
import { SendIcon, CheckIcon } from '@/components/Icons';

export default function SendTest() {
	const [ to, setTo ] = useState( '' );
	const [ subject, setSubject ] = useState( '' );
	const [ body, setBody ] = useState( '' );
	const [ format, setFormat ] = useState( 'html' );
	const [ state, setState ] = useState( null );
	const [ msg, setMsg ] = useState( '' );

	const handleSend = () => {
		setState( 'sending' );
		setMsg( '' );
		post( 'test-email', {
			to: to.trim(),
			subject: subject.trim() || undefined,
			body: body.trim() || undefined,
			format,
		} )
			.then( ( data ) => {
				setState( data.success ? 'success' : 'error' );
				setMsg( data.message || ( data.success ? 'Sent!' : 'Failed.' ) );
			} )
			.catch( ( err ) => {
				setState( 'error' );
				setMsg( err.message || 'Request failed.' );
			} );
	};

	return (
		<div className="mx-auto max-w-[560px]">
			<div className="mb-5">
				<h2 className="m-0 text-[15px] font-bold text-warm-900">Send Test Email</h2>
				<p className="m-0 mt-0.5 text-[12.5px] text-warm-400">
					Verify your connection is working. Customize the message or use the default.
				</p>
			</div>

			<Card className="overflow-hidden">
				<div className="flex flex-col gap-4 p-5">
					<Input
						label="To"
						type="email"
						value={ to }
						onChange={ ( e ) => setTo( e.target.value ) }
						placeholder="Leave empty to use admin email"
					/>
					<Input
						label="Subject"
						type="text"
						value={ subject }
						onChange={ ( e ) => setSubject( e.target.value ) }
						placeholder="MoolMail — Test Email"
					/>
					<div className="flex flex-col gap-1.5">
						<span className="text-[12px] font-medium text-warm-500">Format</span>
						<SegmentedControl
							value={ format }
							onChange={ setFormat }
							options={ [
								{ value: 'html', label: 'HTML' },
								{ value: 'plain', label: 'Plain text' },
							] }
						/>
					</div>
					<Textarea
						label="Message"
						value={ body }
						onChange={ ( e ) => setBody( e.target.value ) }
						placeholder={ format === 'html'
							? '<h2>Hello!</h2><p>This is a test from MoolMail.</p>'
							: 'Hello! This is a test from MoolMail.'
						}
						rows={ 6 }
						hint="Leave empty to use the default test email template."
						style={ { fontFamily: format === 'html' ? 'monospace' : 'inherit' } }
					/>
				</div>

				<div className="flex items-center gap-3 border-t border-warm-200/50 px-5 py-4">
					<Button onClick={ handleSend } disabled={ state === 'sending' }>
						{ state === 'sending' ? (
							<>
								<svg className="smtp-spin h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="10" cy="10" r="7" strokeDasharray="30 14" /></svg>
								Sending…
							</>
						) : (
							<><SendIcon className="h-3.5 w-3.5" /> Send test email</>
						) }
					</Button>
					{ state === 'success' && (
						<span className="flex items-center gap-1.5 text-[12.5px] font-medium text-brand">
							<CheckIcon className="h-3.5 w-3.5" /> { msg }
						</span>
					) }
					{ state === 'error' && (
						<span className="text-[12.5px] text-danger">{ msg }</span>
					) }
				</div>
			</Card>
		</div>
	);
}
