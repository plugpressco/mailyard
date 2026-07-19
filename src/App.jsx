import { useState, useCallback, useEffect, useMemo, Suspense, Fragment } from 'react';
import { AppShell, Toaster } from '@plugpress/ui';
import Sidebar from './components/Sidebar';
import { DashboardSkeleton } from './components/ui';
import { collectModules, matchModule, mergeGroups } from './shell/registry';
import coreModule from './shell/coreModule';

function getRoute() {
	return window.location.hash.replace( /^#\/?/, '' );
}

export default function App() {
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
	// interceptor). The WP submenu holds one entry per SECTION, so SPA
	// routes map onto their section's entry before matching.
	useEffect( () => {
		const SECTION = {
			deliverability: 'connections',
			logs: 'connections',
			contacts: 'campaigns',
		};
		let seg = route.split( '/' )[ 0 ] || 'dashboard';
		seg = SECTION[ seg ] || seg;
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

	const active = matchModule( modules, route ) || coreModule;
	const Provider = active.Provider || Fragment;
	const Outlet = active.Component;
	const Skeleton = active.skeleton;
	const fullscreen = !! active.isFullscreen?.( route );

	// Keyed by MODULE (not route): the outlet stays mounted while the user
	// moves between the module's own routes, so client caches (e.g. Pro's
	// react-query) survive section switches.
	// AppShell's <main> already pads the content column, so the outlet only
	// centers itself; fullscreen routes bypass the shell entirely.
	const outlet = (
		<div key={ active.id } className={ fullscreen ? '' : 'mx-auto max-w-[960px]' }>
			<Provider>
				<Suspense fallback={ Skeleton ? <Skeleton route={ route } /> : <DashboardSkeleton /> }>
					<Outlet route={ route } navigate={ navigate } />
				</Suspense>
			</Provider>
		</div>
	);

	if ( fullscreen ) {
		return (
			<div className="min-h-screen bg-canvas">
				<Toaster />
				{ outlet }
			</div>
		);
	}

	// AppShell owns the sidebar frame (sticky rail, <782px icon-rail collapse).
	return (
		<>
			<Toaster />
			<AppShell
				variant="sidebar"
				nav={ <Sidebar groups={ groups } modules={ modules } route={ route } onNavigate={ navigate } /> }
			>
				{ outlet }
			</AppShell>
		</>
	);
}
