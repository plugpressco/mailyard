import { cn } from '@/lib/utils';

let inputId = 0;
function useId( prefix = 'mm-input' ) {
	const [ id ] = [ `${ prefix }-${ ++inputId }` ];
	return id;
}

export default function Input( {
	label,
	hint,
	required,
	error,
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
			<input
				id={ id }
				name={ id }
				className={ cn(
					'h-9 w-full rounded-lg border bg-white px-3 text-sm text-warm-900 outline-none transition-colors',
					error ? 'border-danger focus:border-danger' : 'border-warm-200 focus:border-brand',
					className
				) }
				{ ...props }
			/>
			{ hint && ! error && <span className="text-[11px] leading-snug text-warm-400">{ hint }</span> }
			{ error && <span className="text-[11px] leading-snug text-danger">{ error }</span> }
		</div>
	);
}
