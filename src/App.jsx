import { useState, useCallback, useEffect, Suspense, lazy } from 'react';
import { AppShell, Toaster } from '@plugpress/ui';
import Nav from './components/Nav';
import {
	DashboardSkeleton,
	ConnectionsSkeleton,
	TableSkeleton,
	SettingsSkeleton,
} from './components/ui';

const Dashboard = lazy( () => import( './views/Dashboard' ) );
const Connections = lazy( () => import( './views/Connections' ) );
const Deliverability = lazy( () => import( './views/Deliverability' ) );
const Logs = lazy( () => import( './views/Logs' ) );
const Settings = lazy( () => import( './views/Settings' ) );

// The whole navigation: one row of pages in the top bar. Routes are the hash
// routes; nested routes (settings/connect-ai) belong to the first segment.
const NAV = [
	{ label: 'Overview', route: 'dashboard' },
	{ label: 'Connections', route: 'connections' },
	{ label: 'Email log', route: 'logs' },
	{ label: 'Deliverability', route: 'deliverability' },
	{ label: 'Settings', route: 'settings' },
];

const SKELETONS = {
	dashboard: DashboardSkeleton,
	connections: ConnectionsSkeleton,
	logs: TableSkeleton,
	settings: SettingsSkeleton,
};

function getRoute() {
	return window.location.hash.replace( /^#\/?/, '' );
}

function View( { route, navigate } ) {
	switch ( route.split( '/' )[ 0 ] ) {
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

export default function App() {
	const [ route, setRoute ] = useState( getRoute );

	useEffect( () => {
		const handler = () => setRoute( getRoute() );
		window.addEventListener( 'hashchange', handler );
		return () => window.removeEventListener( 'hashchange', handler );
	}, [] );

	const navigate = useCallback( ( id ) => {
		window.location.hash = '#/' + id;
	}, [] );

	const Skeleton = SKELETONS[ route.split( '/' )[ 0 ] ] || DashboardSkeleton;

	// AppShell owns the top bar (sticky under the admin bar) and pads the
	// content column; the outlet only centers itself.
	return (
		<>
			<Toaster />
			<AppShell
				variant="topbar"
				nav={ <Nav items={ NAV } route={ route } onNavigate={ navigate } /> }
			>
				<div className="mx-auto max-w-[960px]">
					<Suspense fallback={ <Skeleton /> }>
						<View route={ route } navigate={ navigate } />
					</Suspense>
				</div>
			</AppShell>
		</>
	);
}
