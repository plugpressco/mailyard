import { cn } from '@/lib/utils';

/*
 * Single source of truth for form-control styling. Every text field, select,
 * textarea, and tag input composes these so the whole app shares one look:
 * same border, radius, text size, disabled state, and focus ring.
 */

// Shared control chrome (no height/padding — each control adds its own).
export const FIELD_BASE =
	'w-full rounded-lg border bg-white text-ink-900 outline-none transition-[border-color,box-shadow] placeholder:text-ink-300 disabled:cursor-not-allowed disabled:bg-ink-50 disabled:opacity-60';

// Border + focus ring. `*_WITHIN` is for composite controls (e.g. tag input)
// where focus lives on a child, not the wrapper.
export const FIELD_BORDER        = 'border-ink-200 focus:border-brand focus:ring-2 focus:ring-brand/15';
export const FIELD_BORDER_ERROR  = 'border-danger focus:border-danger focus:ring-2 focus:ring-danger/15';
export const FIELD_BORDER_WITHIN = 'border-ink-200 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15';

// Per-size single-line control class (input/select). Padding added by caller.
export function controlClass( { size = 'md', error = false } = {} ) {
	return cn(
		FIELD_BASE,
		error ? FIELD_BORDER_ERROR : FIELD_BORDER,
		'sm' === size ? 'h-8 text-[12.5px]' : 'h-9 text-sm'
	);
}

export function FieldLabel( { htmlFor, required, children } ) {
	return (
		<label htmlFor={ htmlFor } className="text-[12px] font-medium text-ink-700">
			{ children }
			{ required && <span className="ml-0.5 text-danger">*</span> }
		</label>
	);
}

export function Hint( { error, children } ) {
	return (
		<span className={ cn( 'text-[11.5px] leading-relaxed', error ? 'text-danger' : 'text-ink-400' ) }>
			{ children }
		</span>
	);
}

// Eyebrow heading used above card sections — one size everywhere.
export function SectionTitle( { children, className } ) {
	return (
		<div className={ cn( 'text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-400', className ) }>
			{ children }
		</div>
	);
}

// Label + control + hint/error wrapper. Pass the control as children.
export default function Field( { label, hint, error, required, htmlFor, className, children } ) {
	return (
		<div className={ cn( 'flex flex-col gap-1.5', className ) }>
			{ label && <FieldLabel htmlFor={ htmlFor } required={ required }>{ label }</FieldLabel> }
			{ children }
			{ error ? <Hint error>{ error }</Hint> : hint ? <Hint>{ hint }</Hint> : null }
		</div>
	);
}
