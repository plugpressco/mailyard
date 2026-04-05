import { useState, useEffect, useCallback } from 'react';
import { get } from '@/lib/api';

export default function useLogs( { status = 'all', search = '', page = 1, perPage = 20 } = {} ) {
	const [ logs, setLogs ] = useState( [] );
	const [ total, setTotal ] = useState( 0 );
	const [ loading, setLoading ] = useState( true );
	const [ error, setError ] = useState( null );

	const fetch = useCallback( () => {
		setLoading( true );
		const params = { page, per_page: perPage };
		if ( status !== 'all' ) params.status = status;
		if ( search ) params.search = search;

		get( 'logs', params )
			.then( ( data ) => {
				setLogs( data.items || data || [] );
				setTotal( data.total || 0 );
				setError( null );
			} )
			.catch( ( err ) => setError( err.message || 'Failed to load logs.' ) )
			.finally( () => setLoading( false ) );
	}, [ status, search, page, perPage ] );

	useEffect( () => {
		fetch();
	}, [ fetch ] );

	const updateLog = useCallback( ( id, updates ) => {
		setLogs( ( prev ) =>
			prev.map( ( log ) => ( log.id === id ? { ...log, ...updates } : log ) )
		);
	}, [] );

	return { logs, total, loading, error, refetch: fetch, updateLog };
}
