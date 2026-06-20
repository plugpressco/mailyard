// Circular progress ring with a value/label in the middle. Shared by the
// Deliverability grades and the Dashboard delivery-rate card.
export default function ScoreRing( { value, max = 100, color = 'var(--my-accent)', size = 78, stroke = 6, big, small } ) {
	const cx  = size / 2;
	const r   = cx - stroke / 2 - 2;
	const c   = 2 * Math.PI * r;
	const pct = Math.max( 0, Math.min( 1, ( value || 0 ) / max ) );
	const off = c - pct * c;

	return (
		<div className="relative shrink-0" style={ { height: size, width: size } }>
			<svg viewBox={ `0 0 ${ size } ${ size }` } className="h-full w-full -rotate-90">
				<circle cx={ cx } cy={ cx } r={ r } fill="none" stroke="var(--my-border)" strokeWidth={ stroke } />
				<circle cx={ cx } cy={ cx } r={ r } fill="none" stroke={ color } strokeWidth={ stroke } strokeLinecap="round" strokeDasharray={ c } strokeDashoffset={ off } style={ { transition: 'stroke-dashoffset 700ms ease' } } />
			</svg>
			<div className="absolute inset-0 flex flex-col items-center justify-center">
				{ big != null && <span className="text-[18px] font-bold leading-none text-ink-900">{ big }</span> }
				{ small && <span className="text-[9.5px] font-semibold" style={ { color } }>{ small }</span> }
			</div>
		</div>
	);
}
