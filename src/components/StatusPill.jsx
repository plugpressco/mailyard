import { cn } from '@/lib/utils';

const variants = {
	ok: 'bg-success-light text-success',
	warn: 'bg-warning-light text-warning',
	bad: 'bg-danger-light text-danger',
	accent: 'bg-brand-light text-brand-dark',
	default: 'bg-warm-100 text-warm-600',
};

const statusMap = {
	sent: 'ok',
	delivered: 'ok',
	active: 'ok',
	on: 'ok',
	primary: 'ok',
	retried: 'warn',
	backup: 'warn',
	failed: 'bad',
	blocked: 'bad',
	sending: 'accent',
};

export default function StatusPill( { children, variant, status } ) {
	const v = variant || statusMap[ status ] || 'default';
	return (
		<span
			className={ cn(
				'inline-block rounded-full px-2 py-[2px] text-[10.5px] font-semibold tracking-wide whitespace-nowrap',
				variants[ v ]
			) }
		>
			{ children }
		</span>
	);
}
