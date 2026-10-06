import { useState, useCallback, useEffect, Suspense, lazy } from 'react';
import { AppShell, Toaster } from '@plugpress/ui';
import Sidebar from './components/Sidebar';
import { GridIcon, RouteIcon, ShieldIcon, ListIcon, GearIcon } from './components/Icons';
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

// The whole navigation: one list of pages, Settings pinned to the footer.
// Keys are the hash routes; nested routes (settings/connect-ai) belong to the
// first segment.
const NAV = [
	{
		id: 'main',
		items: [
			{ id: 'dashboard', label: 'Dashboard', icon: GridIcon, route: 'dashboard' },
			{ id: 'connections', label: 'Connections', icon: RouteIcon, route: 'connections' },
			{ id: 'logs', label: 'Email log', icon: ListIcon, route: 'logs' },
			{ id: 'deliverability', label: 'Deliverability', icon: ShieldIcon, route: 'deliverability' },
		],
	},
	{
		id: 'system',
		footer: true,
		items: [ { id: 'settings', label: 'Settings', icon: GearIcon, route: 'settings' } ],
	},
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

	// Mirror the active route onto the WP admin submenu highlight for
	// programmatic navigation (menu CLICKS are handled by the PHP-side
	// interceptor). The submenu mirrors NAV, one entry per page.
	useEffect( () => {
		const seg = route.split( '/' )[ 0 ] || 'dashboard';
		const items = document.querySelectorAll( '#adminmenu .wp-submenu li' );
		items.forEach( ( li ) => {
			const href = li.querySelector( 'a' )?.getAttribute( 'href' ) || '';
			const hit = href.includes( 'page=mailyard#/' + seg ) || ( 'dashboard' === seg && /page=mailyard$/.test( href ) );
			li.classList.toggle( 'current', hit );
		} );
	}, [ route ] );

	const navigate = useCallback( ( id ) => {
		window.location.hash = '#/' + id;
	}, [] );

	const Skeleton = SKELETONS[ route.split( '/' )[ 0 ] ] || DashboardSkeleton;

	// AppShell owns the sidebar frame (sticky rail, <782px icon-rail collapse)
	// and pads the content column; the outlet only centers itself.
	return (
		<>
			<Toaster />
			<AppShell
				variant="sidebar"
				nav={ <Sidebar groups={ NAV } route={ route } onNavigate={ navigate } /> }
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
