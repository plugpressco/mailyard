import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { Toaster } from '@plugpress/ui';
import Sidebar from './components/Sidebar';
import { DashboardSkeleton, ConnectionsSkeleton, TableSkeleton, SettingsSkeleton } from './components/ui';

const Setup = lazy( () => import( './views/Setup' ) );
const Dashboard = lazy( () => import( './views/Dashboard' ) );
const Connections = lazy( () => import( './views/Connections' ) );
const Deliverability = lazy( () => import( './views/Deliverability' ) );
const Logs = lazy( () => import( './views/Logs' ) );
const Settings = lazy( () => import( './views/Settings' ) );

const VALID_VIEWS = [ 'dashboard', 'connections', 'deliverability', 'logs', 'settings' ];

function getHashView() {
	const hash = window.location.hash.replace( '#/', '' ).replace( '#', '' );
	return VALID_VIEWS.includes( hash ) ? hash : 'dashboard';
}

const SKELETONS = {
	dashboard:   DashboardSkeleton,
	connections: ConnectionsSkeleton,
	logs:        TableSkeleton,
	settings:    SettingsSkeleton,
};

function ViewFallback( { view } ) {
	const Skel = SKELETONS[ view ] || DashboardSkeleton;
	return <Skel />;
}

export default function App() {
	const [ onboarded, setOnboarded ] = useState(
		() => window.mailyard?.onboarded ?? false
	);
	const [ view, setView ] = useState( getHashView );

	useEffect( () => {
		const handler = () => setView( getHashView() );
		window.addEventListener( 'hashchange', handler );
		return () => window.removeEventListener( 'hashchange', handler );
	}, [] );

	const navigate = useCallback( ( id ) => {
		window.location.hash = '#/' + id;
	}, [] );

	const handleSetupComplete = useCallback( () => {
		setOnboarded( true );
	}, [] );

	if ( ! onboarded ) {
		return (
			<Suspense fallback={ <DashboardSkeleton /> }>
				<Toaster />
				<Setup onComplete={ handleSetupComplete } />
			</Suspense>
		);
	}

	return (
		<div className="flex min-h-screen bg-canvas">
			<Toaster />
			<Sidebar view={ view } onNavigate={ navigate } />
			<main className="min-w-0 flex-1">
				<div className="mx-auto max-w-[1180px] px-8 py-7">
					<Suspense fallback={ <ViewFallback view={ view } /> }>
						{ view === 'dashboard' && <Dashboard onNavigate={ navigate } /> }
						{ view === 'connections' && <Connections /> }
						{ view === 'deliverability' && <Deliverability /> }
						{ view === 'logs' && <Logs /> }
						{ view === 'settings' && <Settings /> }
					</Suspense>
				</div>
			</main>
		</div>
	);
}
