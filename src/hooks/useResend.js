import { useState, useCallback } from 'react';
import { post } from '@/lib/api';

export default function useResend() {
	const [ sending, setSending ] = useState( {} );
	const [ sent, setSent ] = useState( {} );

	const resend = useCallback( ( id, { to, connection_id } = {} ) => {
		setSending( ( prev ) => ( { ...prev, [ id ]: true } ) );

		return post( `emails/${ id }/resend`, { to, connection_id } )
			.then( () => {
				setSending( ( prev ) => {
					const next = { ...prev };
					delete next[ id ];
					return next;
				} );
				setSent( ( prev ) => ( { ...prev, [ id ]: true } ) );
				setTimeout( () => {
					setSent( ( prev ) => {
						const next = { ...prev };
						delete next[ id ];
						return next;
					} );
				}, 3000 );
				return true;
			} )
			.catch( () => {
				setSending( ( prev ) => {
					const next = { ...prev };
					delete next[ id ];
					return next;
				} );
				return false;
			} );
	}, [] );

	return { sending, sent, resend };
}
