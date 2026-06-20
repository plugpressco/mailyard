import { cn } from '@/lib/utils';

const variants = {
	primary: 'bg-ink-900 text-white hover:bg-ink-800',
	secondary: 'border border-ink-200 bg-white text-ink-800 hover:bg-ink-50 hover:border-ink-300',
	ghost: 'bg-transparent text-ink-500 hover:bg-ink-100 hover:text-ink-900',
	danger: 'bg-danger text-white hover:opacity-90',
	link: 'bg-transparent text-brand hover:underline p-0 h-auto',
};

const sizes = {
	sm: 'h-8 px-3 text-[12px] gap-1 rounded-md',
	md: 'h-9 px-3.5 text-[13px] gap-1.5 rounded-lg',
	lg: 'h-10 px-4 text-[13px] gap-1.5 rounded-lg',
	icon: 'h-8 w-8 rounded-lg justify-center p-0',
};

export default function Button( {
	children,
	variant = 'primary',
	size = 'md',
	className,
	disabled,
	...props
} ) {
	return (
		<button
			disabled={ disabled }
			className={ cn(
				'inline-flex items-center justify-center whitespace-nowrap font-medium cursor-pointer border-none transition-all duration-150 disabled:opacity-40 disabled:cursor-default',
				variants[ variant ],
				sizes[ size ],
				className
			) }
			{ ...props }
		>
			{ children }
		</button>
	);
}
