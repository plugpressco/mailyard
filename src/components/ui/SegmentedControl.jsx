import useId from '@/lib/useId';
import Field from './Field';

export default function SegmentedControl( { options, value, onChange, label, hint, required } ) {
	const id = useId( 'my-seg' );

	const control = (
		<div className="inline-flex w-fit gap-1 rounded-lg bg-ink-100 p-1">
			{ options.map( ( opt ) => (
				<button
					key={ opt.value }
					type="button"
					onClick={ () => onChange?.( opt.value ) }
					className={ `cursor-pointer rounded-md border-none px-3 py-[5px] text-[12px] font-medium transition-colors duration-150 ${
						value === opt.value
							? 'bg-surface text-ink-900 shadow-sm'
							: 'bg-transparent text-ink-500 hover:text-ink-800'
					}` }
				>
					{ opt.label }
				</button>
			) ) }
		</div>
	);

	if ( ! label && ! hint ) return control;

	return (
		<Field label={ label } hint={ hint } required={ required } htmlFor={ id }>
			{ control }
		</Field>
	);
}
