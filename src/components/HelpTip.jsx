import { Tooltip, TooltipProvider } from '@plugpress/ui';
import { HelpIcon } from '@/components/Icons';

/* eslint-disable jsdoc/require-param */
/**
 * A small `?` icon that reveals help text on hover/focus. Self-contained (brings
 * its own TooltipProvider) so it works anywhere without a root provider. Feed it
 * a field's existing `hint` so copy isn't duplicated.
 */
export default function HelpTip( {
	content,
	side = 'top',
	label = 'More information',
} ) {
	if ( ! content ) {
		return null;
	}
	return (
		<TooltipProvider delayDuration={ 150 } skipDelayDuration={ 300 }>
			<Tooltip content={ content } side={ side }>
				<button
					type="button"
					aria-label={ label }
					onClick={ ( e ) => e.preventDefault() }
					className="ml-1 inline-flex align-middle text-ink-400 transition-colors hover:text-ink-600 focus:outline-none focus-visible:text-brand"
				>
					<HelpIcon size={ 13 } />
				</button>
			</Tooltip>
		</TooltipProvider>
	);
}
