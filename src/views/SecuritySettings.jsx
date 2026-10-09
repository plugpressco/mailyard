import { useState, useEffect } from 'react';
import { Notice, CodeBlock, toast } from '@plugpress/ui';
import { get, post } from '@/lib/api';
import ToggleRow from '@/components/ToggleRow';
import { Card, SectionIntro, SectionTitle, SettingsSkeleton } from '@/components/ui';

/**
 * Security — optional encryption of stored credentials, and the wp-config.php
 * constants that keep them out of the database altogether.
 */
export default function SecuritySettings() {
	const [ data, setData ] = useState( null );
	const [ saving, setSaving ] = useState( false );

	useEffect( () => {
		get( 'security' ).then( setData ).catch( () => setData( {} ) );
	}, [] );

	const toggle = ( on ) => {
		setSaving( true );
		post( 'security', { encrypt: on } )
			.then( ( res ) => {
				setData( res );
				toast.success( on ? 'Credentials encrypted' : 'Encryption turned off' );
			} )
			.catch( ( err ) => toast.error( err?.message || 'Could not change encryption' ) )
			.finally( () => setSaving( false ) );
	};

	if ( ! data ) {
		return <SettingsSkeleton />;
	}

	const example = [
		"define( 'MAILYARD_SMTP_PASSWORD', 'your-smtp-password' );",
		"define( 'MAILYARD_POSTMARK_API_KEY', 'your-server-token' );",
		"define( 'MAILYARD_ENCRYPTION_KEY', 'a-long-random-string' ); // optional",
	].join( '\n' );

	return (
		<div className="max-w-[840px]">
			<SectionIntro>Where your provider credentials live, and how they’re stored.</SectionIntro>

			{ data.unreadable && (
				<Notice tone="danger" className="mb-3">
					Some saved credentials can’t be read: this site’s security keys changed since they were encrypted (a migration, a restore, or a security plugin rotating them). Enter them again in Connections, or define MAILYARD_ENCRYPTION_KEY to pin a key that survives rotation.
				</Notice>
			) }

			<Card className="mb-3 overflow-hidden">
				<div className={ saving ? 'pointer-events-none opacity-60' : '' }>
					<ToggleRow
						title="Encrypt stored credentials"
						description={
							data.available
								? 'Passwords, API keys and OAuth tokens are stored encrypted with the security keys in wp-config.php. That protects a copied database (a backup, a dump, a staging clone) — not someone who can also read your files. If those keys change, you’ll need to enter the credentials again; export your settings before moving a site.'
								: 'Not available: this server’s PHP has no sodium extension.'
						}
						on={ !! data.enabled }
						onChange={ ( v ) => data.available && toggle( v ) }
					/>
				</div>
			</Card>

			<Card className="overflow-hidden px-5 py-4">
				<SectionTitle>Keep credentials in wp-config.php</SectionTitle>
				<p className="mb-3 mt-1 text-[12px] leading-relaxed text-ink-500">
					Any connection field can come from a constant named <code>MAILYARD_{ '{PROVIDER}' }_{ '{FIELD}' }</code> instead of the database. A constant wins over what’s saved, for every connection of that provider.
				</p>
				<CodeBlock label="wp-config.php" code={ example } wrap />
				{ data.constants?.length > 0 && (
					<p className="mb-0 mt-3 text-[12px] text-ink-600">
						In use on this site: { data.constants.map( ( c ) => <code key={ c } className="mr-1.5">{ c }</code> ) }
					</p>
				) }
			</Card>
		</div>
	);
}
