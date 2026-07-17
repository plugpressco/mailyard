/**
 * Mailyard's own shell module — Dashboard, the Delivery group, and the
 * footer System group. Same contract extenders use (see registry.js).
 */
import { lazy } from 'react';
import { GridIcon, RouteIcon, ShieldIcon, ListIcon, GearIcon } from '../components/Icons';
import {
	DashboardSkeleton,
	ConnectionsSkeleton,
	TableSkeleton,
	SettingsSkeleton,
} from '../components/ui';

const CoreOutlet = lazy( () => import( './CoreOutlet' ) );

const SKELETONS = {
	dashboard: DashboardSkeleton,
	connections: ConnectionsSkeleton,
	logs: TableSkeleton,
	settings: SettingsSkeleton,
};

function CoreSkeleton( { route } ) {
	const Skel = SKELETONS[ route.split( '/' )[ 0 ] ] || DashboardSkeleton;
	return <Skel />;
}

const coreModule = {
	id: 'core',
	requiresShell: 1,
	version: window.mailyard?.version,
	versionLabel: 'Mailyard',
	groups: [
		{
			id: 'general',
			order: 10,
			items: [ { id: 'dashboard', label: 'Dashboard', icon: GridIcon, route: 'dashboard', order: 10 } ],
		},
		{
			id: 'delivery',
			label: 'Delivery',
			order: 30,
			items: [
				{ id: 'connections', label: 'Connections', icon: RouteIcon, route: 'connections', order: 10 },
				{ id: 'deliverability', label: 'Deliverability', icon: ShieldIcon, route: 'deliverability', order: 20 },
				{ id: 'logs', label: 'Logs', icon: ListIcon, route: 'logs', order: 30 },
			],
		},
		{
			id: 'system',
			order: 90,
			items: [ { id: 'settings', label: 'Settings', icon: GearIcon, route: 'settings', order: 10 } ],
		},
	],
	routes: [
		{ prefix: 'dashboard' },
		{ prefix: 'connections' },
		{ prefix: 'deliverability' },
		{ prefix: 'logs' },
		{ prefix: 'settings' },
	],
	Component: CoreOutlet,
	skeleton: CoreSkeleton,
};

export default coreModule;
