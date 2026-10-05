<?php
namespace Mailyard;

use Mailyard\ESP\Provider;

defined( 'ABSPATH' ) || exit;

// Registers ESP providers and resolves the active connection from stored options.
class Manager {

	private static $instance = null;
	private $providers = array();

	public static function instance(): self {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {
		$this->providers = array(
			Options::DEFAULT_PROVIDER => new ESP\Default_Mail(),
			'ses'                     => new ESP\SES(),
			'postmark'                => new ESP\Postmark(),
			'resend'                  => new ESP\Resend(),
			'brevo'                   => new ESP\Brevo(),
			'smtp'                    => new ESP\SMTP(),
		);

		// Allow third-party providers.
		$this->providers = apply_filters( 'mailyard_providers', $this->providers );
	}

	// Get the active ESP with its config applied — the first enabled connection,
	// or null when none is configured. Used by the SMTP fast path and the public
	// mailyard_active_provider() helper.
	public function active_provider(): ?Provider {
		$chain = $this->enabled_connections();
		return $chain[0]['esp'] ?? null;
	}

	// Connections sorted by priority ASC, enabled only, each paired with a connected ESP.
	// Used by Override::intercept() to implement synchronous failover.
	// Returns: [ [ 'slug' => 'resend', 'esp' => Provider, 'conn' => raw connection array ], ... ]
	public function enabled_connections(): array {
		return $this->build_entries( $this->enabled_sorted() );
	}

	// Resolve the failover chain for a given sender. Connections opt in to senders
	// via their `from_match` list (exact address, bare domain, or '*'); the most
	// specific matching tier wins (exact > domain > catch-all) and is then ordered
	// by priority for failover. Falls back to the full chain when nothing matches
	// so mail is never silently dropped.
	public function chain_for( string $from_email ): array {
		$from_email = strtolower( trim( $from_email ) );

		// Score each candidate, keeping only the highest specificity tier.
		$best  = 0;
		$tier  = array();
		foreach ( $this->enabled_sorted() as $conn ) {
			$score = $this->from_match_score( $conn['from_match'] ?? array(), $from_email );
			if ( 0 === $score ) {
				continue;
			}
			if ( $score > $best ) {
				$best = $score;
				$tier = array();
			}
			if ( $score === $best ) {
				$tier[] = $conn;
			}
		}

		if ( empty( $tier ) ) {
			// No sender-specific match — fall back to today's behavior: the full chain.
			return $this->build_entries( $this->enabled_sorted() );
		}

		usort( $tier, function ( $a, $b ) {
			return ( $a['priority'] ?? 0 ) <=> ( $b['priority'] ?? 0 );
		} );
		return $this->build_entries( $tier );
	}

	public function all(): array { return $this->providers; }
	public function get( string $slug ): ?Provider { return $this->providers[ $slug ] ?? null; }

	private function enabled_sorted(): array {
		$conns = get_option( Options::CONNECTIONS, array() );

		$enabled = array_filter( (array) $conns, function ( $c ) {
			return ! empty( $c['enabled'] );
		} );

		usort( $enabled, function ( $a, $b ) {
			return ( $a['priority'] ?? 0 ) <=> ( $b['priority'] ?? 0 );
		} );

		return $enabled;
	}

	// Resolve a connection's ESP config. Both the failover chain and the
	// connection test MUST connect through this, so a test can never send with
	// different settings than real mail.
	public function connection_config( array $conn ): array {
		return is_array( $conn['config'] ?? null ) ? $conn['config'] : array();
	}

	// Pair each raw connection with its connected ESP, dropping unknown providers
	// and ones whose credentials fail to connect.
	private function build_entries( array $conns ): array {
		$out = array();
		foreach ( $conns as $conn ) {
			$slug = sanitize_key( $conn['provider'] ?? '' );
			if ( ! isset( $this->providers[ $slug ] ) ) {
				continue;
			}

			$esp = $this->providers[ $slug ];
			if ( ! $esp->connect( $this->connection_config( $conn ) ) ) {
				continue;
			}
			$out[] = array( 'slug' => $slug, 'esp' => $esp, 'conn' => $conn );
		}
		return $out;
	}

	// Specificity of a connection's from_match list against an address:
	// exact address = 3, domain = 2, catch-all ('*' or empty) = 1, no match = 0.
	private function from_match_score( array $patterns, string $email ): int {
		// Empty list = catch-all.
		if ( empty( $patterns ) ) {
			return 1;
		}

		$domain  = strpos( $email, '@' ) !== false ? substr( $email, strrpos( $email, '@' ) + 1 ) : '';
		$best    = 0;
		foreach ( $patterns as $pattern ) {
			$pattern = strtolower( trim( (string) $pattern ) );
			if ( '' === $pattern ) {
				continue;
			}
			if ( '*' === $pattern ) {
				$best = max( $best, 1 );
			} elseif ( strpos( $pattern, '@' ) !== false ) {
				if ( $pattern === $email ) {
					return 3; // Exact address — most specific, can't be beaten.
				}
			} elseif ( $pattern === $domain ) {
				$best = max( $best, 2 );
			}
		}
		return $best;
	}
}
