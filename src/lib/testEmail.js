import { post } from '@/lib/api';

/**
 * Send a test email via the REST API endpoint.
 *
 * @param {string} to Recipient email address.
 * @return {Promise<{success: boolean, message: string}>}
 */
export default function sendTestEmail( to ) {
	return post( 'test-email', { to: to || '' } )
		.then( ( data ) => ( {
			success: !! data.success,
			message: data.message || ( data.success ? 'Sent!' : 'Failed.' ),
		} ) )
		.catch( ( err ) => ( {
			success: false,
			message: err.message || 'Request failed.',
		} ) );
}
