<?php
namespace Mailyard;

defined( 'ABSPATH' ) || exit;

// DNS-based SPF/DKIM/DMARC/MX checker — scores 0–100 and returns fix suggestions.
class Deliverability {

	const CACHE_PREFIX = 'mailyard_deliv_';
	const CACHE_TTL    = HOUR_IN_SECONDS;

	// Per-provider authentication hints. include = SPF mechanism to expect;
	// dkim_selectors = likely DKIM selectors to probe; setup = where to fix DKIM.
	private static function provider_hints( string $provider ): array {
		$map = array(
			// Postmark authenticates via its custom Return-Path (pm-bounces CNAME)
			// and DKIM — NOT the domain's SPF. So no SPF include is expected.
			'postmark' => array(
				'include'        => '',
				'dkim_selectors' => array( 'pm' ),
				'setup'          => __( 'Postmark → Sender Signatures → add the DKIM and Return-Path (pm-bounces) records shown there.', 'mailyard' ),
				'spf_ok'         => __( 'Postmark aligns via its Return-Path and DKIM, so no SPF change is needed.', 'mailyard' ),
			),
			'ses' => array(
				'include'        => 'amazonses.com',
				'dkim_selectors' => array(),
				'setup'          => __( 'AWS SES → Verified identities → enable Easy DKIM and add the 3 CNAME records.', 'mailyard' ),
			),
			'resend' => array(
				'include'        => 'amazonses.com',
				'dkim_selectors' => array( 'resend' ),
				'setup'          => __( 'Resend → Domains → add the SPF, DKIM and DMARC records shown for your domain.', 'mailyard' ),
			),
			'brevo' => array(
				'include'        => 'spf.brevo.com',
				'dkim_selectors' => array( 'mail', 'brevo' ),
				'setup'          => __( 'Brevo → Senders & Domains → authenticate your domain and add the DKIM record.', 'mailyard' ),
			),
			'smtp' => array(
				'include'        => '',
				'dkim_selectors' => array(),
				'setup'          => __( 'Add the SPF include and DKIM record your SMTP host provides.', 'mailyard' ),
			),
		);

		return $map[ $provider ] ?? array(
			'include'        => '',
			'dkim_selectors' => array(),
			'setup'          => __( 'Add the SPF and DKIM records your email provider provides.', 'mailyard' ),
		);
	}

	// Selectors probed for every domain regardless of provider — covers the
	// common vendors (Google, SendGrid, Mailchimp/Mandrill, Zoho, generic).
	private static function base_selectors(): array {
		return array(
			'default', 'google', 'selector1', 'selector2', 'k1', 'k2', 'k3',
			'dkim', 'mail', 's1', 's2', 'fm1', 'fm2', 'fms', 'fms1', 'fms2',
			'sig1', 'zoho', 'mte1', 'pic',
		);
	}

	// Scan every unique sending domain across configured connections.
	public static function scan_all( bool $refresh = false ): array {
		$conns   = get_option( Options::CONNECTIONS, array() );
		$domains = array();

		foreach ( (array) $conns as $c ) {
			$email = $c['from_email'] ?? '';
			$at    = strrpos( $email, '@' );
			if ( false === $at ) {
				continue;
			}
			$domain = strtolower( substr( $email, $at + 1 ) );
			if ( $domain && ! isset( $domains[ $domain ] ) ) {
				$domains[ $domain ] = sanitize_key( $c['provider'] ?? '' );
			}
		}

		// Fall back to the settings sender if no connection domains found.
		if ( empty( $domains ) ) {
			$email = Options::settings()['from_email'] ?? '';
			$at    = strrpos( $email, '@' );
			if ( false !== $at ) {
				$domains[ strtolower( substr( $email, $at + 1 ) ) ] = '';
			}
		}

		$results = array();
		foreach ( $domains as $domain => $provider ) {
			$results[] = self::check_domain( $domain, $provider, $refresh );
		}
		return $results;
	}

	// Run the full check for one domain.
	public static function check_domain( string $domain, string $provider = '', bool $refresh = false ): array {
		$domain = strtolower( trim( $domain ) );
		$key    = self::CACHE_PREFIX . md5( $domain . '|' . $provider );

		if ( ! $refresh ) {
			$cached = get_transient( $key );
			if ( is_array( $cached ) ) {
				return $cached;
			}
		}

		$hints  = self::provider_hints( $provider );
		$checks = array(
			self::check_spf( $domain, $hints ),
			self::check_dkim( $domain, $hints ),
			self::check_dmarc( $domain ),
			self::check_mx( $domain ),
		);

		$score  = self::score( $checks );
		$result = array(
			'domain'   => $domain,
			'provider' => $provider,
			'score'    => $score,
			'grade'    => self::grade( $score ),
			'checks'   => $checks,
		);

		set_transient( $key, $result, self::CACHE_TTL );
		return $result;
	}

	private static function check_spf( string $domain, array $hints ): array {
		$records = self::txt( $domain );
		$spf     = '';
		foreach ( $records as $txt ) {
			if ( 0 === stripos( $txt, 'v=spf1' ) ) {
				$spf = $txt;
				break;
			}
		}

		$base = array( 'id' => 'spf', 'label' => 'SPF', 'value' => $spf );

		if ( '' === $spf ) {
			return $base + array(
				'status'  => 'fail',
				'message' => __( 'No SPF record found. Receivers can\'t confirm your server is allowed to send for this domain.', 'mailyard' ),
				'fix'     => $hints['include']
					/* translators: %s: SPF include mechanism, e.g. amazonses.com. */
					? sprintf( __( 'Add a TXT record at the domain root: v=spf1 include:%s ~all', 'mailyard' ), $hints['include'] )
					: __( 'Add a TXT record at the domain root starting with: v=spf1 … ~all (include your provider\'s mechanism).', 'mailyard' ),
			);
		}

		if ( $hints['include'] && false === stripos( $spf, $hints['include'] ) ) {
			// Build the corrected record: insert the include before the all mechanism.
			$fixed = preg_match( '/[~\-?+]?all\b/i', $spf )
				? preg_replace( '/([~\-?+]?all\b)/i', 'include:' . $hints['include'] . ' $1', $spf, 1 )
				: rtrim( $spf ) . ' include:' . $hints['include'];

			return $base + array(
				'status'  => 'warn',
				/* translators: %s: SPF include mechanism, e.g. amazonses.com. */
				'message' => sprintf( __( 'SPF exists but doesn\'t include your provider (%s), so its mail may fail SPF.', 'mailyard' ), $hints['include'] ),
				'fix'     => $fixed,
			);
		}

		$note = ! empty( $hints['spf_ok'] ) ? ' ' . $hints['spf_ok'] : '';
		return $base + array(
			'status'  => 'pass',
			'message' => __( 'SPF record found and valid.', 'mailyard' ) . $note,
			'fix'     => '',
		);
	}

	private static function check_dkim( string $domain, array $hints ): array {
		$selectors = array_merge( $hints['dkim_selectors'], self::base_selectors() );
		$found     = '';

		foreach ( array_unique( $selectors ) as $sel ) {
			$host    = $sel . '._domainkey.' . $domain;
			$records = array_merge( self::txt( $host ), self::cname( $host ) );
			foreach ( $records as $rec ) {
				if ( false !== stripos( $rec, 'DKIM1' ) || false !== stripos( $rec, '_domainkey' ) || false !== stripos( $rec, 'dkim' ) ) {
					$found = $sel;
					break 2;
				}
			}
		}

		$base = array( 'id' => 'dkim', 'label' => 'DKIM', 'value' => $found ? $found . '._domainkey' : '' );

		if ( $found ) {
			return $base + array(
				'status'  => 'pass',
				/* translators: %s: DKIM selector name. */
				'message' => sprintf( __( 'DKIM signing record detected (selector "%s").', 'mailyard' ), $found ),
				'fix'     => '',
			);
		}

		return $base + array(
			'status'  => 'warn',
			'message' => __( 'No DKIM record auto-detected. It may use a custom selector — verify it\'s set up with your provider.', 'mailyard' ),
			'fix'     => $hints['setup'],
		);
	}

	private static function check_dmarc( string $domain ): array {
		$records = self::txt( '_dmarc.' . $domain );
		$dmarc   = '';
		foreach ( $records as $txt ) {
			if ( 0 === stripos( $txt, 'v=DMARC1' ) ) {
				$dmarc = $txt;
				break;
			}
		}

		$base = array( 'id' => 'dmarc', 'label' => 'DMARC', 'value' => $dmarc );

		if ( '' === $dmarc ) {
			return $base + array(
				'status'  => 'fail',
				'message' => __( 'No DMARC record. Without it, spoofed mail from your domain isn\'t reported or blocked.', 'mailyard' ),
				/* translators: 1: domain name (DMARC host), 2: domain name (reporting address). */
				'fix'     => sprintf( __( 'Add a TXT record at _dmarc.%1$s: v=DMARC1; p=none; rua=mailto:dmarc@%2$s', 'mailyard' ), $domain, $domain ),
			);
		}

		$policy = 'none';
		if ( preg_match( '/p\s*=\s*(none|quarantine|reject)/i', $dmarc, $m ) ) {
			$policy = strtolower( $m[1] );
		}

		if ( 'none' === $policy ) {
			return $base + array(
				'status'  => 'warn',
				'message' => __( 'DMARC is set to monitor-only (p=none). Once SPF/DKIM look stable in your reports, tighten to quarantine, then reject. Replace your DMARC record with:', 'mailyard' ),
				'fix'     => preg_replace( '/p\s*=\s*none/i', 'p=quarantine', $dmarc ),
			);
		}

		return $base + array(
			'status'  => 'pass',
			/* translators: %s: DMARC policy, e.g. quarantine or reject. */
			'message' => sprintf( __( 'DMARC is enforced (p=%s).', 'mailyard' ), $policy ),
			'fix'     => '',
		);
	}

	private static function check_mx( string $domain ): array {
		$has = @checkdnsrr( $domain, 'MX' ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
		if ( ! $has ) {
			$has = ! empty( self::doh( $domain, 'MX' ) );
		}

		return array(
			'id'      => 'mx',
			'label'   => 'MX',
			'value'   => '',
			'status'  => $has ? 'pass' : 'warn',
			'message' => $has
				? __( 'Domain has mail-exchange records.', 'mailyard' )
				: __( 'No MX records. Replies to your mail may bounce, which can hurt reputation.', 'mailyard' ),
			'fix'     => $has ? '' : __( 'Add MX records (or use your provider/host\'s) so the domain can receive mail.', 'mailyard' ),
		);
	}

	private static function score( array $checks ): int {
		$by    = array();
		foreach ( $checks as $c ) {
			$by[ $c['id'] ] = $c;
		}

		$score = 0;
		// SPF (30)
		if ( 'pass' === ( $by['spf']['status'] ?? '' ) ) {
			$score += 30;
		} elseif ( 'warn' === ( $by['spf']['status'] ?? '' ) ) {
			$score += 18;
		}
		// DKIM (35 detected; half credit when undetectable since it may use a
		// custom selector we can't probe — don't over-penalise the unknown).
		if ( 'pass' === ( $by['dkim']['status'] ?? '' ) ) {
			$score += 35;
		} elseif ( 'warn' === ( $by['dkim']['status'] ?? '' ) ) {
			$score += 17;
		}
		// DMARC (20 present + 10 enforced)
		$dmarc = $by['dmarc']['status'] ?? '';
		if ( 'pass' === $dmarc ) {
			$score += 30;
		} elseif ( 'warn' === $dmarc ) {
			$score += 20;
		}
		// MX (5)
		if ( 'pass' === ( $by['mx']['status'] ?? '' ) ) {
			$score += 5;
		}

		return min( 100, $score );
	}

	private static function grade( int $score ): string {
		if ( $score >= 90 ) {
			return 'A';
		}
		if ( $score >= 75 ) {
			return 'B';
		}
		if ( $score >= 60 ) {
			return 'C';
		}
		if ( $score >= 40 ) {
			return 'D';
		}
		return 'F';
	}

	private static function txt( string $host ): array {
		$out = function_exists( 'dns_get_record' )
			? self::collect_txt( @dns_get_record( $host, DNS_TXT ) ) // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
			: array();

		// Some resolvers return nothing for a typed TXT query on apex domains
		// (UDP truncation without TCP fallback). Retry with DNS_ANY and filter.
		if ( empty( $out ) && function_exists( 'dns_get_record' ) ) {
			$any = @dns_get_record( $host, DNS_ANY ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
			if ( is_array( $any ) ) {
				$txt = array_filter( $any, function ( $r ) {
					return isset( $r['type'] ) && 'TXT' === $r['type'];
				} );
				$out = self::collect_txt( $txt );
			}
		}

		// Last resort: many hosts (local/containerised dev) can't resolve DNS at
		// all via PHP. Query a public DNS-over-HTTPS resolver so results stay
		// accurate instead of false "not found".
		if ( empty( $out ) ) {
			$out = self::doh( $host, 'TXT' );
		}

		return $out;
	}

	private static function collect_txt( $records ): array {
		$out = array();
		if ( is_array( $records ) ) {
			foreach ( $records as $r ) {
				if ( ! empty( $r['txt'] ) ) {
					$out[] = $r['txt'];
				} elseif ( ! empty( $r['entries'] ) && is_array( $r['entries'] ) ) {
					$out[] = implode( '', $r['entries'] );
				}
			}
		}
		return $out;
	}

	private static function cname( string $host ): array {
		$out = array();
		if ( function_exists( 'dns_get_record' ) ) {
			$records = @dns_get_record( $host, DNS_CNAME ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
			if ( is_array( $records ) ) {
				foreach ( $records as $r ) {
					if ( ! empty( $r['target'] ) ) {
						$out[] = $r['target'];
					}
				}
			}
		}
		if ( empty( $out ) ) {
			$out = self::doh( $host, 'CNAME' );
		}
		return $out;
	}

	// DNS-over-HTTPS fallback (Cloudflare public resolver). Returns record data
	// strings for the given type. Used only when the host's own resolver fails,
	// which is common on local/containerised WordPress installs.
	private static function doh( string $name, string $type ): array {
		$types = array( 'TXT' => 16, 'MX' => 15, 'CNAME' => 5, 'A' => 1 );
		$qtype = $types[ $type ] ?? 16;

		$resp = wp_remote_get(
			'https://cloudflare-dns.com/dns-query?name=' . rawurlencode( $name ) . '&type=' . $qtype,
			array(
				'timeout' => 6,
				'headers' => array( 'Accept' => 'application/dns-json' ),
			)
		);

		if ( is_wp_error( $resp ) || 200 !== (int) wp_remote_retrieve_response_code( $resp ) ) {
			return array();
		}

		$body = json_decode( wp_remote_retrieve_body( $resp ), true );
		if ( ! is_array( $body ) || empty( $body['Answer'] ) ) {
			return array();
		}

		$out = array();
		foreach ( $body['Answer'] as $ans ) {
			if ( (int) ( $ans['type'] ?? 0 ) !== $qtype || ! isset( $ans['data'] ) ) {
				continue;
			}
			$data = (string) $ans['data'];
			if ( 'TXT' === $type ) {
				// DoH returns TXT quoted, with long records split into adjacent
				// "chunk" "chunk" pairs — join them and strip the quotes.
				$data = preg_replace( '/"\s+"/', '', trim( $data ) );
				$data = trim( $data, '"' );
			} else {
				$data = rtrim( $data, '.' );
			}
			$out[] = $data;
		}
		return $out;
	}
}
