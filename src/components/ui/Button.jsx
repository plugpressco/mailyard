import { cn } from '@/lib/utils';

const variants = {
	primary: 'bg-brand text-white hover:opacity-90',
	secondary: 'border border-warm-200 bg-white text-warm-700 hover:bg-warm-50 hover:border-warm-300',
	ghost: 'bg-transparent text-warm-500 hover:bg-warm-100 hover:text-warm-700',
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
				'inline-flex items-center font-medium cursor-pointer border-none transition-all duration-150 disabled:opacity-40 disabled:cursor-default',
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
