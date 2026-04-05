import { cn } from '@/lib/utils';

let textareaId = 0;

export default function Textarea( {
	label,
	hint,
	required,
	className,
	id: propId,
	...props
} ) {
	const id = propId || `mm-textarea-${ ++textareaId }`;

	return (
		<div className="flex flex-col gap-1">
			{ label && (
				<label htmlFor={ id } className="text-[12px] font-medium text-warm-500">
					{ label }
					{ required && <span className="ml-0.5 text-danger">*</span> }
				</label>
			) }
			<textarea
				id={ id }
				name={ id }
				className={ cn(
					'w-full resize-y rounded-lg border border-warm-200 bg-white px-3 py-2.5 text-sm text-warm-900 outline-none transition-colors focus:border-brand leading-relaxed',
					className
				) }
				{ ...props }
			/>
			{ hint && <span className="text-[11px] leading-snug text-warm-400">{ hint }</span> }
		</div>
	);
}
