import { cn } from '@/lib/utils';

// One content-width scale for the whole app. Forms read best narrow; data
// tables need room. Three tiers, used everywhere via `mx-auto ${WIDTH.x}`.
export const WIDTH = {
	form:    'max-w-[560px]',
	content: 'max-w-[760px]',
	wide:    'max-w-[1080px]',
};

// Shared page header — title + optional subtitle + optional right-aligned action.
// Replaces the bespoke header each view used to roll on its own.
export default function PageHeader( { title, subtitle, action, className } ) {
	return (
		<div className={ cn( 'mb-5 flex items-start justify-between gap-4', className ) }>
			<div className="min-w-0">
				<h2 className="m-0 text-[19px] font-semibold tracking-[-0.02em] text-ink-900">{ title }</h2>
				{ subtitle && <p className="m-0 mt-1 text-[13px] leading-relaxed text-ink-500">{ subtitle }</p> }
			</div>
			{ action && <div className="shrink-0">{ action }</div> }
		</div>
	);
}
