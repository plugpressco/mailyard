import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import TopBar from './components/TopBar';
import { DashboardSkeleton, ConnectionsSkeleton, TableSkeleton, SettingsSkeleton } from './components/ui';

const LazyToaster = lazy( () => import( 'sonner' ).then( ( m ) => ( { default: m.Toaster } ) ) );
const Setup = lazy( () => import( './views/Setup' ) );
const Overview = lazy( () => import( './views/Overview' ) );
const Connections = lazy( () => import( './views/Connections' ) );
const Logs = lazy( () => import( './views/Logs' ) );
const Settings = lazy( () => import( './views/Settings' ) );
const SendTest = lazy( () => import( './views/SendTest' ) );

const VALID_VIEWS = [ 'dashboard', 'connections', 'logs', 'send-test', 'settings' ];

function getHashView() {
	const hash = window.location.hash.replace( '#/', '' ).replace( '#', '' );
	return VALID_VIEWS.includes( hash ) ? hash : 'dashboard';
}

// Match the right skeleton to the current view.
const SKELETONS = {
	dashboard: DashboardSkeleton,
	connections: ConnectionsSkeleton,
	logs: () => <div className="px-6 py-[22px]"><TableSkeleton /></div>,
	settings: SettingsSkeleton,
	'send-test': () => <div className="px-6 py-[22px]"><SettingsSkeleton /></div>,
};

function ViewFallback( { view } ) {
	const Skel = SKELETONS[ view ] || DashboardSkeleton;
	return <Skel />;
}

function ToasterWrapper() {
	return (
		<Suspense fallback={ null }>
			<LazyToaster
				position="bottom-right"
				toastOptions={ {
					style: {
						fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
						fontSize: '13px',
						borderRadius: 'var(--mm-r)',
						border: '1px solid var(--mm-border)',
						boxShadow: 'none',
						background: 'var(--mm-surface)',
						color: 'var(--mm-text)',
						padding: '12px 14px',
					},
				} }
			/>
		</Suspense>
	);
}

export default function App() {
	const [ onboarded, setOnboarded ] = useState(
		() => window.moolMail?.onboarded ?? false
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
				<ToasterWrapper />
				<Setup onComplete={ handleSetupComplete } />
			</Suspense>
		);
	}

	return (
		<div className="min-h-screen bg-warm-50 font-sans">
			<ToasterWrapper />
			<TopBar view={ view } onNavigate={ navigate } />
			<Suspense fallback={ <ViewFallback view={ view } /> }>
				<div className="px-6 py-[22px]">
					{ view === 'dashboard' && <Overview onNavigate={ navigate } /> }
					{ view === 'connections' && <Connections /> }
					{ view === 'logs' && <Logs /> }
					{ view === 'send-test' && <SendTest /> }
					{ view === 'settings' && (
						<div className="mx-auto max-w-[680px]">
							<Settings />
						</div>
					) }
				</div>
			</Suspense>
		</div>
	);
}
