/**
 * Icon re-exports from the PlugPress design system's curated lucide set
 * (strokeWidth 1.75), under Mailyard's historical names.
 * All icons accept className for Tailwind sizing (e.g. "h-4 w-4").
 */
import { LoaderIcon } from '@plugpress/ui';

export {
	MailIcon,
	SendIcon,
	SettingsIcon as GearIcon,
	ShieldCheckIcon as ShieldIcon,
	RefreshIcon as RetryIcon,
	ZapIcon as BoltIcon,
	GridIcon,
	ListIcon,
	ArrowLeftRightIcon as RouteIcon,
	FileTextIcon as LogIcon,
	LinkIcon,
	PlusIcon,
	SearchIcon,
	XIcon,
	EyeIcon,
	DownloadIcon,
	ChevronRightIcon,
	HelpIcon,
	ChevronUpIcon as UpIcon,
	CheckIcon,
	CheckCircleIcon,
	AlertCircleIcon as AlertIcon,
	XCircleIcon,
	GripIcon,
} from '@plugpress/ui';

/**
 * Spinner — animated loading circle (kept for existing call sites; the
 * design system's Button has a built-in `loading` state for new code).
 */
export function SpinnerIcon( { className = '', ...props } ) {
	return <LoaderIcon className={ `smtp-spin ${ className }` } { ...props } />;
}
