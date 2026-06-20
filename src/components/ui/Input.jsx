import { cn } from '@/lib/utils';
import useId from '@/lib/useId';
import Field, { controlClass } from './Field';

export default function Input( {
	label,
	hint,
	required,
	error,
	size = 'md',
	icon,
	className,
	id: propId,
	...props
} ) {
	const id = propId || useId( 'my-input' );

	const input = (
		<input
			id={ id }
			name={ id }
			className={ cn(
				controlClass( { size, error: !! error } ),
				icon ? 'pl-8 pr-3' : 'px-3',
				className
			) }
			{ ...props }
		/>
	);

	return (
		<Field label={ label } hint={ hint } error={ error } required={ required } htmlFor={ id }>
			{ icon ? (
				<div className="relative">
					<span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400">{ icon }</span>
					{ input }
				</div>
			) : input }
		</Field>
	);
}
