import { useState } from 'react';
import { cn } from '@/lib/utils';
import useId from '@/lib/useId';
import Field, { FIELD_BASE, FIELD_BORDER_WITHIN } from './Field';
import { XIcon } from '@/components/Icons';

// Comma/Enter-separated tag editor (used for sender-match patterns). Shares the
// same chrome and focus ring as every other field.
export default function TagInput( {
	label,
	hint,
	required,
	values = [],
	onChange,
	placeholder,
	id: propId,
} ) {
	const id = propId || useId( 'my-tags' );
	const [ draft, setDraft ] = useState( '' );

	const commit = () => {
		const v = draft.trim().toLowerCase().replace( /,$/, '' );
		if ( v && ! values.includes( v ) ) onChange( [ ...values, v ] );
		setDraft( '' );
	};

	return (
		<Field label={ label } hint={ hint } required={ required } htmlFor={ id }>
			<div className={ cn( FIELD_BASE, FIELD_BORDER_WITHIN, 'flex min-h-9 flex-wrap items-center gap-1.5 px-2 py-1.5' ) }>
				{ values.map( ( v ) => (
					<span key={ v } className="inline-flex items-center gap-1 rounded-md bg-ink-100 px-2 py-[2px] text-[11.5px] text-ink-700">
						{ v }
						<button type="button" onClick={ () => onChange( values.filter( ( x ) => x !== v ) ) } className="cursor-pointer border-none bg-transparent p-0 leading-none text-ink-400 hover:text-danger">
							<XIcon className="h-3 w-3" />
						</button>
					</span>
				) ) }
				<input
					id={ id }
					value={ draft }
					onChange={ ( e ) => setDraft( e.target.value ) }
					onKeyDown={ ( e ) => {
						if ( e.key === 'Enter' || e.key === ',' ) { e.preventDefault(); commit(); }
						else if ( e.key === 'Backspace' && ! draft && values.length ) onChange( values.slice( 0, -1 ) );
					} }
					onBlur={ commit }
					placeholder={ values.length ? '' : placeholder }
					className="min-w-[140px] flex-1 border-none bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-300"
				/>
			</div>
		</Field>
	);
}
