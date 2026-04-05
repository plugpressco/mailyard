import { cn } from '@/lib/utils';

let selectId = 0;
function useId( prefix = 'mm-select' ) {
	const [ id ] = [ `${ prefix }-${ ++selectId }` ];
	return id;
}

export default function Select( {
	label,
	hint,
	required,
	options = [],
	className,
	id: propId,
	...props
} ) {
	const id = propId || useId();

	return (
		<div className="flex flex-col gap-1">
			{ label && (
				<label htmlFor={ id } className="text-[12px] font-medium text-warm-500">
					{ label }
					{ required && <span className="ml-0.5 text-danger">*</span> }
				</label>
			) }
			<select
				id={ id }
				name={ id }
				className={ cn(
					'h-9 w-full cursor-pointer appearance-auto rounded-lg border border-warm-200 bg-white px-2.5 text-sm text-warm-900 outline-none transition-colors focus:border-brand',
					className
				) }
				{ ...props }
			>
				{ options.map( ( o ) => (
					<option key={ o.value } value={ o.value }>{ o.label }</option>
				) ) }
			</select>
			{ hint && <span className="text-[11px] leading-snug text-warm-400">{ hint }</span> }
		</div>
	);
}

/**
 * Inline variant — label left, select right, for settings rows.
 */
export function InlineSelect( { label, options = [], ...props } ) {
	const id = props.id || useId( 'mm-iselect' );

	return (
		<div className="flex items-center justify-between py-2.5">
			<label htmlFor={ id } className="text-[13px] text-warm-600">{ label }</label>
			<select
				id={ id }
				name={ id }
				className="h-8 cursor-pointer appearance-auto rounded-lg border border-warm-200 bg-white px-2.5 text-[12.5px] text-warm-900 outline-none transition-colors focus:border-brand"
				{ ...props }
			>
				{ options.map( ( o ) => (
					<option key={ o.value } value={ o.value }>{ o.label }</option>
				) ) }
			</select>
		</div>
	);
}
