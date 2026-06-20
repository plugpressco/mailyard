import apiFetch from '@wordpress/api-fetch';

const API_NAMESPACE = 'mailyard/v1';

export function get( endpoint, params = {} ) {
	const query = new URLSearchParams( params ).toString();
	const path = `${ API_NAMESPACE }/${ endpoint }${ query ? '?' + query : '' }`;
	return apiFetch( { path } );
}

export function post( endpoint, data = {} ) {
	return apiFetch( {
		path: `${ API_NAMESPACE }/${ endpoint }`,
		method: 'POST',
		data,
	} );
}

export function put( endpoint, data = {} ) {
	return apiFetch( {
		path: `${ API_NAMESPACE }/${ endpoint }`,
		method: 'PUT',
		data,
	} );
}

export function del( endpoint ) {
	return apiFetch( {
		path: `${ API_NAMESPACE }/${ endpoint }`,
		method: 'DELETE',
	} );
}
