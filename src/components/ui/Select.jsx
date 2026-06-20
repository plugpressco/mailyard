import { cn } from '@/lib/utils';
import useId from '@/lib/useId';
import Field, { controlClass } from './Field';

// Custom chevron so the control looks identical across browsers/OSes.
function Chevron( { className } ) {
	return (
		<svg className={ className } viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
			<path d="M6 8l4 4 4-4" />
		</svg>
	);
}

export default function Select( {
	label,
	hint,
	required,
	error,
	size = 'md',
	options = [],
	className,
	id: propId,
	...props
} ) {
	const id = propId || useId( 'my-select' );

	return (
		<Field label={ label } hint={ hint } error={ error } required={ required } htmlFor={ id }>
			<div className="relative">
				<select
					id={ id }
					name={ id }
					className={ cn(
						controlClass( { size, error: !! error } ),
						'cursor-pointer appearance-none pl-3 pr-9',
						className
					) }
					{ ...props }
				>
					{ options.map( ( o ) => (
						<option key={ o.value } value={ o.value }>{ o.label }</option>
					) ) }
				</select>
				<Chevron className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
			</div>
		</Field>
	);
}

// Inline variant — label left, select right, for settings rows.
export function InlineSelect( { label, options = [], className, ...props } ) {
	const id = props.id || useId( 'my-iselect' );

	return (
		<div className="flex items-center justify-between py-2.5">
			<label htmlFor={ id } className="text-[13px] text-ink-700">{ label }</label>
			<div className="relative">
				<select
					id={ id }
					name={ id }
					className={ cn( controlClass( { size: 'sm' } ), 'w-auto cursor-pointer appearance-none pl-3 pr-8', className ) }
					{ ...props }
				>
					{ options.map( ( o ) => (
						<option key={ o.value } value={ o.value }>{ o.label }</option>
					) ) }
				</select>
				<Chevron className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
			</div>
		</div>
	);
}
