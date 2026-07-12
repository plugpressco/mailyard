/**
 * Mailyard UI = @plugpress/ui (the shared PlugPress design system) exposed
 * under Mailyard's historical component APIs. All chrome (borders, focus
 * rings, radii, colors, motion) comes from the design system; this file only
 * adapts prop names (e.g. Toggle's `on` → Switch's `checked`).
 *
 * New code: prefer importing from '@plugpress/ui' directly.
 */
import { useId } from 'react';
import {
	Button as PPButton,
	Card as PPCard,
	Input as PPInput,
	Textarea as PPTextarea,
	NativeSelect,
	Switch,
	SegmentedControl as PPSegmentedControl,
	TagInput as PPTagInput,
	Label,
	Hint as PPHint,
	ErrorText,
	PageHeader as PPPageHeader,
	SectionTitle as PPSectionTitle,
	cx,
} from '@plugpress/ui';

export { default as ScoreRing } from './ScoreRing';
// VolumeChart is intentionally NOT re-exported here — import it directly so
// recharts only loads with the (lazy) Dashboard chunk, not the shared bundle.
export {
	default as Skeleton,
	SkeletonCard,
	SkeletonText,
	DashboardSkeleton,
	TableSkeleton,
	ConnectionsSkeleton,
	SettingsSkeleton,
} from './Skeleton';

// One content-width scale for the whole app (Tailwind class form).
export const WIDTH = {
	form: 'max-w-[560px]',
	content: 'max-w-[760px]',
	wide: 'max-w-[1080px]',
};

export function Button( { size = 'md', ...props } ) {
	if ( size === 'icon' ) {
		return <PPButton size="sm" icon { ...props } />;
	}
	return <PPButton size={ size } { ...props } />;
}

export function Card( { hover, className, ...props } ) {
	return (
		<PPCard
			padded={ false }
			className={ cx( hover && 'transition-colors hover:border-ink-300', className ) }
			{ ...props }
		/>
	);
}

export function FieldLabel( { htmlFor, required, children } ) {
	return (
		<Label htmlFor={ htmlFor }>
			{ children }
			{ required && <span className="ml-0.5 text-danger" aria-hidden="true">*</span> }
		</Label>
	);
}

export function Hint( { error, children } ) {
	return error ? <ErrorText>{ children }</ErrorText> : <PPHint>{ children }</PPHint>;
}

export function SectionTitle( { children, className } ) {
	return <PPSectionTitle className={ cx( 'my-0', className ) }>{ children }</PPSectionTitle>;
}

// Label + control + hint/error wrapper. Pass the control as children.
export function Field( { label, hint, error, required, htmlFor, className, children } ) {
	return (
		<div className={ cx( 'pp-field', className ) }>
			{ label && <FieldLabel htmlFor={ htmlFor } required={ required }>{ label }</FieldLabel> }
			{ children }
			{ error ? <Hint error>{ error }</Hint> : hint ? <Hint>{ hint }</Hint> : null }
		</div>
	);
}

export function Input( { label, hint, required, error, size, icon, className, id: propId, ...props } ) {
	const autoId = useId();
	const id = propId || autoId;
	const input = (
		<PPInput
			id={ id }
			name={ id }
			error={ !! error }
			className={ cx( icon && 'pl-8', size === 'sm' && 'h-7 text-xs', className ) }
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

export function Textarea( { label, hint, required, error, className, id: propId, ...props } ) {
	const autoId = useId();
	const id = propId || autoId;
	return (
		<Field label={ label } hint={ hint } error={ error } required={ required } htmlFor={ id }>
			<PPTextarea id={ id } name={ id } error={ !! error } className={ className } { ...props } />
		</Field>
	);
}

export function Select( { label, hint, required, error, size, options = [], className, id: propId, ...props } ) {
	const autoId = useId();
	const id = propId || autoId;
	return (
		<Field label={ label } hint={ hint } error={ error } required={ required } htmlFor={ id }>
			<NativeSelect
				id={ id }
				name={ id }
				error={ !! error }
				className={ cx( size === 'sm' && 'h-7 text-xs', className ) }
				{ ...props }
			>
				{ options.map( ( o ) => (
					<option key={ o.value } value={ o.value }>{ o.label }</option>
				) ) }
			</NativeSelect>
		</Field>
	);
}

// Inline variant — label left, select right, for settings rows.
export function InlineSelect( { label, options = [], className, id: propId, ...props } ) {
	const autoId = useId();
	const id = propId || autoId;
	return (
		<div className="flex items-center justify-between py-2.5">
			<label htmlFor={ id } className="text-sm text-ink-700">{ label }</label>
			<NativeSelect id={ id } name={ id } className={ cx( 'w-auto', className ) } { ...props }>
				{ options.map( ( o ) => (
					<option key={ o.value } value={ o.value }>{ o.label }</option>
				) ) }
			</NativeSelect>
		</div>
	);
}

export function Toggle( { on, onChange, label, id, disabled } ) {
	return (
		<Switch
			id={ id }
			checked={ !! on }
			onChange={ onChange }
			disabled={ disabled }
			aria-label={ label }
		/>
	);
}

export function SegmentedControl( { options, value, onChange, label, hint, required } ) {
	const control = (
		<PPSegmentedControl options={ options } value={ value } onChange={ onChange } aria-label={ label } />
	);
	if ( ! label && ! hint ) return control;
	return (
		<Field label={ label } hint={ hint } required={ required }>
			{ control }
		</Field>
	);
}

export function PageHeader( { title, subtitle, action, className } ) {
	return <PPPageHeader title={ title } description={ subtitle } actions={ action } className={ className } />;
}

export function TagInput( { label, hint, required, values = [], onChange, placeholder, id } ) {
	return (
		<Field label={ label } hint={ hint } required={ required } htmlFor={ id }>
			<PPTagInput
				id={ id }
				value={ values }
				placeholder={ placeholder }
				onChange={ ( next ) => onChange?.( next.map( ( t ) => t.toLowerCase() ) ) }
			/>
		</Field>
	);
}
