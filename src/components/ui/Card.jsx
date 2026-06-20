import { cn } from '@/lib/utils';

export default function Card( { children, className, hover, ...props } ) {
	return (
		<div
			className={ cn(
				'rounded-xl border border-ink-200 bg-surface',
				hover && 'transition-colors duration-150 hover:border-ink-300',
				className
			) }
			{ ...props }
		>
			{ children }
		</div>
	);
}
