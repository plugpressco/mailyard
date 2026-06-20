import { cn } from '@/lib/utils';
import useId from '@/lib/useId';
import Field, { FIELD_BASE, FIELD_BORDER, FIELD_BORDER_ERROR } from './Field';

export default function Textarea( {
	label,
	hint,
	required,
	error,
	className,
	id: propId,
	...props
} ) {
	const id = propId || useId( 'my-textarea' );

	return (
		<Field label={ label } hint={ hint } error={ error } required={ required } htmlFor={ id }>
			<textarea
				id={ id }
				name={ id }
				className={ cn(
					FIELD_BASE,
					error ? FIELD_BORDER_ERROR : FIELD_BORDER,
					'min-h-[84px] resize-y px-3 py-2.5 text-sm leading-relaxed',
					className
				) }
				{ ...props }
			/>
		</Field>
	);
}
