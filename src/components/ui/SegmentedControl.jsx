export default function SegmentedControl( { options, value, onChange } ) {
	return (
		<div className="flex gap-0 rounded-lg border border-warm-200 p-[3px] w-fit">
			{ options.map( ( opt ) => (
				<button
					key={ opt.value }
					onClick={ () => onChange?.( opt.value ) }
					className={ `cursor-pointer rounded-md border-none px-3 py-[5px] text-[12px] font-medium transition-colors ${
						value === opt.value
							? 'bg-warm-900 text-white'
							: 'bg-transparent text-warm-400 hover:text-warm-600'
					}` }
				>
					{ opt.label }
				</button>
			) ) }
		</div>
	);
}
