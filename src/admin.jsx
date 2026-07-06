import { createRoot } from 'react-dom/client';
import App from './App';

// PlugPress design system: shared components/tokens + Mailyard's accent.
import '@plugpress/ui/ui.css';
import '@plugpress/ui/tokens/accents/mailyard.css';
import './styles/globals.css';

document.addEventListener( 'DOMContentLoaded', () => {
	const container = document.getElementById( 'mailyard-admin' );
	if ( container ) {
		container.classList.add( 'pp-app' );
		const root = createRoot( container );
		root.render( <App /> );
	}
} );
