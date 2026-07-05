import { createRoot } from 'react-dom/client';
import App from './App';

import './styles/globals.css';

document.addEventListener( 'DOMContentLoaded', () => {
	const container = document.getElementById( 'mailyard-admin' );
	if ( container ) {
		const root = createRoot( container );
		root.render( <App /> );
	}
} );
