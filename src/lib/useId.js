// Stable, render-deterministic counter used as a fallback when no `id` prop
// is provided. Component-local, not reactive — IDs only matter for label/input
// pairing. Per-prefix counters keep ids legible in the DOM.
const counters = {};

export default function useId( prefix = 'my' ) {
	counters[ prefix ] = ( counters[ prefix ] || 0 ) + 1;
	return `${ prefix }-${ counters[ prefix ] }`;
}
