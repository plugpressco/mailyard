let toggleId = 0;

export default function Toggle( { on, onChange, label, id: propId } ) {
	const id = propId || `mm-toggle-${ ++toggleId }`;

	return (
		<button
			id={ id }
			role="switch"
			aria-checked={ on }
			aria-label={ label }
			onClick={ () => onChange?.( ! on ) }
			className="relative h-5 w-9 shrink-0 cursor-pointer rounded-full border-none transition-colors duration-200"
			style={ { background: on ? 'var(--mm-accent)' : 'var(--mm-border)' } }
		>
			<span
				className="absolute top-[2px] h-4 w-4 rounded-full bg-white transition-all duration-200"
				style={ { left: on ? 18 : 2 } }
			/>
		</button>
	);
}
