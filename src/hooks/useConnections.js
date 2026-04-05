import { useState, useEffect, useCallback } from 'react';
import { get, post, put, del } from '@/lib/api';

export default function useConnections() {
	const [ connections, setConnections ] = useState( [] );
	const [ loading, setLoading ] = useState( true );
	const [ error, setError ] = useState( null );

	const fetch = useCallback( () => {
		setLoading( true );
		get( 'connections' )
			.then( ( data ) => {
				setConnections( data || [] );
				setError( null );
			} )
			.catch( ( err ) => setError( err.message || 'Failed to load connections.' ) )
			.finally( () => setLoading( false ) );
	}, [] );

	useEffect( () => {
		fetch();
	}, [ fetch ] );

	const create = useCallback( ( data ) => {
		return post( 'connections', data ).then( ( newConn ) => {
			setConnections( ( prev ) => [ ...prev, newConn ] );
			return newConn;
		} );
	}, [] );

	const update = useCallback( ( id, data ) => {
		return put( `connections/${ id }`, data ).then( ( updated ) => {
			setConnections( ( prev ) =>
				prev.map( ( c ) => ( c.id === id ? updated : c ) )
			);
			return updated;
		} );
	}, [] );

	const remove = useCallback( ( id ) => {
		return del( `connections/${ id }` ).then( () => {
			setConnections( ( prev ) => prev.filter( ( c ) => c.id !== id ) );
		} );
	}, [] );

	const reorder = useCallback( ( ids ) => {
		return put( 'connections/reorder', { ids } ).then( () => {
			setConnections( ( prev ) => {
				const map = Object.fromEntries( prev.map( ( c ) => [ c.id, c ] ) );
				return ids.map( ( id ) => map[ id ] ).filter( Boolean );
			} );
		} );
	}, [] );

	return { connections, setConnections, loading, error, create, update, remove, reorder, refetch: fetch };
}
