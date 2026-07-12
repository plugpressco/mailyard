import { useState, useCallback, useEffect, useMemo, lazy, Suspense, Fragment } from 'react';
import { Toaster } from '@plugpress/ui';
import Sidebar from './components/Sidebar';
import { DashboardSkeleton } from './components/ui';
import { collectModules, matchModule, mergeGroups } from './shell/registry';
import coreModule from './shell/coreModule';

const Setup = lazy( () => import( './views/Setup' ) );

function getRoute() {
	return window.location.hash.replace( /^#\/?/, '' );
}

export default function App() {
	const [ onboarded, setOnboarded ] = useState(
		() => window.mailyard?.onboarded ?? false
	);
	const [ route, setRoute ] = useState( getRoute );

	// Collected ONCE at mount: extenders (Mailyard Pro) registered their
	// `mailyard.shell.modules` filter at script-eval time, before
	// DOMContentLoaded mounted us — deterministic via script dependencies.
	const modules = useMemo( () => collectModules( [ coreModule ] ), [] );
	const groups = useMemo( () => mergeGroups( modules ), [ modules ] );

	useEffect( () => {
		const handler = () => setRoute( getRoute() );
		window.addEventListener( 'hashchange', handler );
		return () => window.removeEventListener( 'hashchange', handler );
	}, [] );

	// Mirror the active route onto the WP admin submenu highlight for
	// programmatic navigation (menu CLICKS are handled by the PHP-side
	// interceptor). Generic over every registered section, Pro's included.
	useEffect( () => {
		const seg = route.split( '/' )[ 0 ] || 'dashboard';
		const items = document.querySelectorAll( '#adminmenu .wp-submenu li' );
		if ( ! items.length ) {
			return;
		}
		let matched = false;
		items.forEach( ( li ) => {
			const a = li.querySelector( 'a' );
			const href = a ? a.getAttribute( 'href' ) || '' : '';
			const hit = href.includes( 'page=mailyard#/' + seg );
			li.classList.toggle( 'current', hit );
			matched = matched || hit;
		} );
		if ( ! matched && 'dashboard' === seg ) {
			items.forEach( ( li ) => {
				const a = li.querySelector( 'a' );
				if ( a && /page=mailyard$/.test( a.getAttribute( 'href' ) || '' ) ) {
					li.classList.add( 'current' );
				}
			} );
		}
	}, [ route ] );

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

	const active = matchModule( modules, route ) || coreModule;
	const Provider = active.Provider || Fragment;
	const Outlet = active.Component;
	const Skeleton = active.skeleton;
	const fullscreen = !! active.isFullscreen?.( route );

	return (
		<div className="flex min-h-screen bg-canvas">
			<Toaster />
			{ ! fullscreen && (
				<Sidebar groups={ groups } modules={ modules } route={ route } onNavigate={ navigate } />
			) }
			<main className="min-w-0 flex-1">
				{ /* Keyed by MODULE (not route): the outlet stays mounted while the
				     user moves between the module's own routes, so client caches
				     (e.g. Pro's react-query) survive section switches. */ }
				<div key={ active.id } className={ fullscreen ? '' : 'mx-auto max-w-[1180px] px-8 py-7' }>
					<Provider>
						<Suspense fallback={ Skeleton ? <Skeleton route={ route } /> : <DashboardSkeleton /> }>
							<Outlet route={ route } navigate={ navigate } />
						</Suspense>
					</Provider>
				</div>
			</main>
		</div>
	);
}
