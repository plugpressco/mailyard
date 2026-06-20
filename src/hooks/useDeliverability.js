import { useState, useEffect, useCallback } from 'react';
import { get } from '@/lib/api';

export default function useDeliverability() {
	const [ domains, setDomains ] = useState( null );
	const [ checkedAt, setCheckedAt ] = useState( 0 );
	const [ loading, setLoading ] = useState( true );
	const [ scanning, setScanning ] = useState( false );
	const [ error, setError ] = useState( null );

	const load = useCallback( ( refresh = false ) => {
		refresh ? setScanning( true ) : setLoading( true );
		get( 'deliverability', refresh ? { refresh: 1 } : {} )
			.then( ( data ) => {
				setDomains( data.domains || [] );
				setCheckedAt( data.checked_at || 0 );
				setError( null );
			} )
			.catch( ( err ) => setError( err.message || 'Failed to scan deliverability.' ) )
			.finally( () => { setLoading( false ); setScanning( false ); } );
	}, [] );

	useEffect( () => { load( false ); }, [ load ] );

	return { domains, checkedAt, loading, scanning, error, rescan: () => load( true ) };
}
