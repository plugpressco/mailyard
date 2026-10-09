import { useState, useEffect } from 'react';
import { toast } from '@plugpress/ui';
import { get, post } from '@/lib/api';
import ToggleRow from '@/components/ToggleRow';
import { Card, SectionIntro, SettingsSkeleton } from '@/components/ui';

/**
 * Network (multisite main site, network admins only): set email up once here
 * and let every site of the network use it. Logs always stay per site.
 */
export default function NetworkSettings() {
	const [ data, setData ] = useState( null );

	useEffect( () => {
		get( 'network' ).then( setData ).catch( () => setData( {} ) );
	}, [] );

	const set = ( key, value ) => {
		setData( ( d ) => ( { ...d, [ key ]: value } ) );
		post( 'network', { [ key ]: value } )
			.then( ( res ) => {
				setData( res );
				toast.success( 'Network settings saved' );
			} )
			.catch( ( err ) => toast.error( err?.message || 'Failed to save' ) );
	};

	if ( ! data ) {
		return <SettingsSkeleton />;
	}

	return (
		<div className="max-w-[840px]">
			<SectionIntro>Set email up once on this main site and let every site of the network use it. Each site keeps its own log.</SectionIntro>
			<Card className="divide-y divide-ink-200 overflow-hidden">
				<ToggleRow
					title="Share this site’s connections with the network"
					description="Every site sends through the connections set up here. Other sites see them as managed by the main site and can’t change them."
					on={ !! data.shared }
					onChange={ ( v ) => set( 'shared', v ) }
				/>
				<div className={ data.shared ? '' : 'pointer-events-none opacity-50' }>
					<ToggleRow
						title="Share the sender too"
						description="From address, From name and Return path. Usually left off, so each site keeps a From address on its own domain."
						on={ !! data.share_sender }
						onChange={ ( v ) => set( 'share_sender', v ) }
					/>
				</div>
				<div className={ data.shared ? '' : 'pointer-events-none opacity-50' }>
					<ToggleRow
						title="Share delivery options"
						description="Background sending, email logging and how long logs are kept."
						on={ !! data.share_delivery }
						onChange={ ( v ) => set( 'share_delivery', v ) }
					/>
				</div>
			</Card>
		</div>
	);
}
