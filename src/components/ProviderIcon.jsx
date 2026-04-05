/**
 * SVG brand icons for all 6 live providers.
 * Each icon renders at the given `size` (px) with proper aspect ratio.
 */

const icons = {
	ses: ( s ) => (
		<svg width={ s } height={ s } viewBox="0 0 40 40">
			<rect width="40" height="40" rx="8" fill="#232F3E" />
			<path d="M10 16l10 6.5L30 16" stroke="#FF9900" strokeWidth="2" fill="none" strokeLinecap="round" />
			<rect x="10" y="13" width="20" height="14" rx="2" stroke="#FF9900" strokeWidth="1.5" fill="none" />
			<path d="M10 30c5 2.5 11 3.5 17 2s9-5 11-8" stroke="#FF9900" strokeWidth="1.3" strokeLinecap="round" fill="none" />
		</svg>
	),
	sendgrid: ( s ) => (
		<svg width={ s } height={ s } viewBox="0 0 40 40">
			<path fill="#9DD6E3" d="M40 0v26.67h-13.33v13.33H0V26.67h13.33V0z" />
			<path fill="#3F72AB" d="M0 40h13.33V26.67H0z" />
			<path fill="#00A9D1" d="M26.67 26.67H40V13.33H26.67zM13.33 13.33h13.34V0H13.33z" />
			<path fill="#2191C4" d="M13.33 26.67h13.34V13.33H13.33z" />
			<path fill="#3F72AB" d="M26.67 13.33H40V0H26.67z" />
		</svg>
	),
	mailgun: ( s ) => (
		<svg width={ s } height={ s } viewBox="0 0 24 24">
			<path
				fill="#F06B66"
				d="M11.837 0c6.602 0 11.984 5.381 11.984 11.994-.017 2.99-3.264 4.84-5.844 3.331a3.805 3.805 0 0 1-.06-.035l-.055-.033-.022.055c-2.554 4.63-9.162 4.758-11.894.232-2.732-4.527.46-10.313 5.746-10.416a6.868 6.868 0 0 1 7.002 6.866 1.265 1.265 0 0 0 2.52 0c0-5.18-4.197-9.38-9.377-9.387C4.611 2.594.081 10.41 3.683 16.673c3.238 5.632 11.08 6.351 15.289 1.402l1.997 1.686A11.95 11.95 0 0 1 11.837 24C2.6 23.72-2.87 13.543 1.992 5.684A12.006 12.006 0 0 1 11.837 0Zm0 7.745c-3.276-.163-5.5 3.281-4.003 6.2a4.26 4.26 0 0 0 4.014 2.31c3.276-.171 5.137-3.824 3.35-6.575a4.26 4.26 0 0 0-3.36-1.935Zm0 2.53c1.324 0 2.152 1.433 1.49 2.58a1.72 1.72 0 0 1-1.49.86 1.72 1.72 0 1 1 0-3.44Z"
			/>
		</svg>
	),
	postmark: ( s ) => (
		<svg width={ s } height={ s } viewBox="0 0 40 40">
			<rect width="40" height="40" rx="8" fill="#FFDE00" />
			<path
				d="M14 10h8c4.4 0 8 3.6 8 8s-3.6 8-8 8h-4v4c0 .7-.6 1.3-1.3 1.3s-1.4-.6-1.4-1.3V11.3c0-.7.6-1.3 1.4-1.3zm4 13.3h4c3 0 5.3-2.4 5.3-5.3s-2.4-5.3-5.3-5.3h-4v10.6z"
				fill="#1A1A1A"
			/>
		</svg>
	),
	brevo: ( s ) => (
		<svg width={ s } height={ s } viewBox="0 0 24 24">
			<path
				fill="#0B996E"
				d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zM7.2 4.8h5.747c2.34 0 3.895 1.406 3.895 3.516 0 1.022-.348 1.862-1.09 2.588C17.189 11.812 18 13.22 18 14.785c0 2.86-2.64 5.016-6.164 5.016H7.199v-15zm2.085 1.952v5.537h.07c.233-.432.858-.796 2.249-1.226 2.039-.659 3.037-1.52 3.037-2.655 0-.998-.766-1.656-1.924-1.656H9.285zm4.87 5.266c-.766.385-1.67.748-2.76 1.11-1.229.387-2.11 1.386-2.11 2.407v2.315h2.365c2.387 0 4.149-1.34 4.149-3.155 0-1.067-.625-2.087-1.645-2.677z"
			/>
		</svg>
	),
	resend: ( s ) => (
		<svg width={ s } height={ s } viewBox="0 0 40 40">
			<rect width="40" height="40" rx="8" fill="#000" />
			<path d="M12 14h8a4 4 0 010 8h-4l5 6" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	),
	smtp: ( s ) => (
		<svg width={ s } height={ s } viewBox="0 0 40 40">
			<rect width="40" height="40" rx="8" fill="#F3F0EA" />
			<rect x="10" y="12" width="20" height="16" rx="2.5" stroke="#7C766D" strokeWidth="1.8" fill="none" />
			<path d="M10 15l10 6 10-6" stroke="#7C766D" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
			<circle cx="32" cy="11" r="4" fill="#0D9488" />
			<path d="M30.5 11l1 1 2-2" stroke="#fff" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	),
	php: ( s ) => (
		<svg width={ s } height={ s } viewBox="0 0 24 24">
			<path
				fill="#777BB4"
				d="M7.01 10.207h-.944l-.515 2.648h.838c.556 0 .97-.105 1.242-.314.272-.21.455-.559.55-1.049.092-.47.05-.802-.124-.995-.175-.193-.523-.29-1.047-.29zM12 5.688C5.373 5.688 0 8.514 0 12s5.373 6.313 12 6.313S24 15.486 24 12c0-3.486-5.373-6.312-12-6.312zm-3.26 7.451c-.261.25-.575.438-.917.551-.336.108-.765.164-1.285.164H5.357l-.327 1.681H3.652l1.23-6.326h2.65c.797 0 1.378.209 1.744.628.366.418.476 1.002.33 1.752a2.836 2.836 0 0 1-.305.847c-.143.255-.33.49-.561.703zm4.024.715l.543-2.799c.063-.318.039-.536-.068-.651-.107-.116-.336-.174-.687-.174H11.46l-.704 3.625H9.388l1.23-6.327h1.367l-.327 1.682h1.218c.767 0 1.295.134 1.586.401s.378.7.263 1.299l-.572 2.944h-1.389zm7.597-2.265a2.782 2.782 0 0 1-.305.847c-.143.255-.33.49-.561.703a2.44 2.44 0 0 1-.917.551c-.336.108-.765.164-1.286.164h-1.18l-.327 1.682h-1.378l1.23-6.326h2.649c.797 0 1.378.209 1.744.628.366.417.477 1.001.331 1.751zM17.766 10.207h-.943l-.516 2.648h.838c.557 0 .971-.105 1.242-.314.272-.21.455-.559.551-1.049.092-.47.049-.802-.125-.995s-.524-.29-1.047-.29z"
			/>
		</svg>
	),
};

export default function ProviderIcon( { id, size = 26 } ) {
	const render = icons[ id ];
	if ( ! render ) {
		return null;
	}
	return (
		<div
			className="shrink-0 overflow-hidden leading-none"
			style={ { width: size, height: size, borderRadius: 6 } }
		>
			{ render( size ) }
		</div>
	);
}
