/**
 * The free plugin's own outlet — the delivery views, switched by route.
 * Registered through the same module contract Pro uses (dogfooding: the
 * shell has no special-cased views, so "Pro absent → its groups absent"
 * holds by construction).
 */
import { lazy } from 'react';

const Dashboard = lazy( () => import( '../views/Dashboard' ) );
const Connections = lazy( () => import( '../views/Connections' ) );
const Deliverability = lazy( () => import( '../views/Deliverability' ) );
const Logs = lazy( () => import( '../views/Logs' ) );
const Settings = lazy( () => import( '../views/Settings' ) );

export default function CoreOutlet( { route, navigate } ) {
	const view = route.split( '/' )[ 0 ];

	switch ( view ) {
		case 'connections':
			return <Connections />;
		case 'deliverability':
			return <Deliverability />;
		case 'logs':
			return <Logs />;
		case 'settings':
			return <Settings route={ route } navigate={ navigate } />;
		case 'dashboard':
		default:
			return <Dashboard onNavigate={ navigate } />;
	}
}
