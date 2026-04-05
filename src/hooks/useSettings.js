import { useState, useEffect, useCallback } from 'react';
import { get, post } from '@/lib/api';

export default function useSettings() {
	const [ settings, setSettings ] = useState( null );
	const [ loading, setLoading ] = useState( true );
	const [ saving, setSaving ] = useState( false );
	const [ error, setError ] = useState( null );

	const fetch = useCallback( () => {
		setLoading( true );
		get( 'settings' )
			.then( ( data ) => {
				setSettings( data );
				setError( null );
			} )
			.catch( ( err ) => setError( err.message || 'Failed to load settings.' ) )
			.finally( () => setLoading( false ) );
	}, [] );

	useEffect( () => {
		fetch();
	}, [ fetch ] );

	const save = useCallback( ( values ) => {
		setSaving( true );
		return post( 'settings', values )
			.then( ( data ) => {
				setSettings( data );
				setError( null );
				return data;
			} )
			.catch( ( err ) => {
				setError( err.message || 'Failed to save settings.' );
				throw err;
			} )
			.finally( () => setSaving( false ) );
	}, [] );

	return { settings, loading, saving, error, save, refetch: fetch };
}
