import { createRoot } from 'react-dom/client';
import App from './App';

// Self-hosted fonts — Fira Sans (UI) + Fira Code (data/mono). Latin subsets
// only (no CDN, keeps the plugin zip lean).
import '@fontsource/fira-sans/latin-400.css';
import '@fontsource/fira-sans/latin-500.css';
import '@fontsource/fira-sans/latin-600.css';
import '@fontsource/fira-sans/latin-700.css';
import '@fontsource/fira-code/latin-400.css';
import '@fontsource/fira-code/latin-500.css';

import './styles/globals.css';

document.addEventListener( 'DOMContentLoaded', () => {
	const container = document.getElementById( 'mailyard-admin' );
	if ( container ) {
		const root = createRoot( container );
		root.render( <App /> );
	}
} );
