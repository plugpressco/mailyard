import { Badge } from '@plugpress/ui';

// Design-system Badge under Mailyard's historical StatusPill API.
const toneByVariant = {
	ok: 'success',
	warn: 'warning',
	bad: 'danger',
	accent: 'accent',
	default: 'neutral',
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
	return <Badge tone={ toneByVariant[ v ] }>{ children }</Badge>;
}
