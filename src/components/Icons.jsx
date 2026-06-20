/**
 * Icon re-exports from @heroicons/react.
 *
 * 24/outline — used for UI actions, nav, buttons (stroke-based, clean).
 * 20/solid   — used for small inline indicators, badges.
 *
 * All icons accept className for Tailwind sizing (e.g. "h-4 w-4").
 */

export {
	EnvelopeIcon as MailIcon,
	PaperAirplaneIcon as SendIcon,
	Cog6ToothIcon as GearIcon,
	ShieldCheckIcon as ShieldIcon,
	ArrowPathIcon as RetryIcon,
	BoltIcon,
	Squares2X2Icon as GridIcon,
	QueueListIcon as ListIcon,
	ArrowsRightLeftIcon as RouteIcon,
	DocumentTextIcon as LogIcon,
	LinkIcon,
	PlusIcon,
	MagnifyingGlassIcon as SearchIcon,
	XMarkIcon as XIcon,
	EyeIcon,
	ArrowDownTrayIcon as DownloadIcon,
	ChevronRightIcon,
	QuestionMarkCircleIcon as HelpIcon,
	ChevronUpIcon as UpIcon,
} from '@heroicons/react/24/outline';

export {
	CheckIcon,
	CheckCircleIcon,
	ExclamationCircleIcon as AlertIcon,
	XCircleIcon,
} from '@heroicons/react/20/solid';

/**
 * Grip handle — 6-dot drag handle. No Heroicon equivalent.
 */
export function GripIcon( props ) {
	return (
		<svg { ...props } viewBox="0 0 16 16" fill="currentColor">
			<circle cx="5" cy="4" r="1.2" />
			<circle cx="11" cy="4" r="1.2" />
			<circle cx="5" cy="8" r="1.2" />
			<circle cx="11" cy="8" r="1.2" />
			<circle cx="5" cy="12" r="1.2" />
			<circle cx="11" cy="12" r="1.2" />
		</svg>
	);
}

/**
 * Spinner — animated loading circle.
 */
export function SpinnerIcon( { className = '', ...props } ) {
	return (
		<svg { ...props } viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" className={ `smtp-spin ${ className }` }>
			<circle cx="10" cy="10" r="7" strokeDasharray="30 14" />
		</svg>
	);
}
