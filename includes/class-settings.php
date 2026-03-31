<?php
defined( 'ABSPATH' ) || exit;

/**
 * Settings page under Settings → Starter SMTP.
 * Native WordPress settings API — no React.
 */
class Starter_SMTP_Settings {

	private static $instance = null;

	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	public function init() {
		add_action( 'admin_menu', array( $this, 'add_menu' ) );
		add_action( 'admin_init', array( $this, 'register_settings' ) );
		add_action( 'wp_ajax_starter_smtp_test', array( $this, 'ajax_test' ) );
	}

	public function add_menu() {
		add_options_page(
			__( 'Starter SMTP', 'starter-smtp' ),
			__( 'Starter SMTP', 'starter-smtp' ),
			'manage_options',
			'starter-smtp',
			array( $this, 'render_page' )
		);
	}

	public function register_settings() {
		register_setting( 'starter_smtp', 'starter_smtp_settings', array(
			'sanitize_callback' => array( $this, 'sanitize_settings' ),
		) );
	}

	public function sanitize_settings( $input ) {
		$clean = array();
		$clean['active'] = sanitize_text_field( $input['active'] ?? 'phpmailer' );

		$manager = Starter_SMTP_Manager::get_instance();
		foreach ( $manager->get_providers() as $key => $provider ) {
			foreach ( $provider->get_fields() as $field ) {
				$fk = $key . '_' . $field['key'];
				if ( isset( $input[ $fk ] ) ) {
					if ( 'password' === $field['type'] ) {
						$clean[ $fk ] = $input[ $fk ]; // Don't sanitize passwords.
					} else {
						$clean[ $fk ] = sanitize_text_field( $input[ $fk ] );
					}
				}
			}
		}

		$clean['from_name']  = sanitize_text_field( $input['from_name'] ?? '' );
		$clean['from_email'] = sanitize_email( $input['from_email'] ?? '' );

		return $clean;
	}

	public function ajax_test() {
		check_ajax_referer( 'starter_smtp_test', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( 'Permission denied.' );
		}

		$to      = sanitize_email( $_POST['to'] ?? '' );
		$to      = $to ? $to : wp_get_current_user()->user_email;
		$subject = __( 'Starter SMTP — Test Email', 'starter-smtp' );
		$body    = '<div style="font-family:-apple-system,sans-serif;max-width:500px;margin:40px auto;padding:32px;background:#fff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.08)">'
			. '<h2 style="margin:0 0 12px;font-size:20px;color:#1c1917">Your email is working!</h2>'
			. '<p style="margin:0 0 16px;font-size:14px;color:#57534e;line-height:1.6">This confirms that Starter SMTP is delivering emails correctly.</p>'
			. '<p style="margin:0;font-size:12px;color:#a8a29e">Sent to ' . esc_html( $to ) . '</p>'
			. '</div>';

		$result = wp_mail( $to, $subject, $body, array( 'Content-Type: text/html; charset=UTF-8' ) );

		if ( $result ) {
			wp_send_json_success( sprintf( __( 'Test email sent to %s', 'starter-smtp' ), $to ) );
		} else {
			global $phpmailer;
			$error = '';
			if ( isset( $phpmailer ) && ! empty( $phpmailer->ErrorInfo ) ) {
				$error = $phpmailer->ErrorInfo;
			}
			wp_send_json_error( $error ? $error : __( 'Failed to send test email.', 'starter-smtp' ) );
		}
	}

	public function render_page() {
		$settings = get_option( 'starter_smtp_settings', array() );
		$active   = $settings['active'] ?? 'phpmailer';
		$manager  = Starter_SMTP_Manager::get_instance();
		$providers = $manager->get_providers();
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'Starter SMTP', 'starter-smtp' ); ?></h1>
			<p class="description"><?php esc_html_e( 'Connect WordPress to an email service for reliable delivery. Replaces the default PHP mail function.', 'starter-smtp' ); ?></p>

			<form method="post" action="options.php">
				<?php settings_fields( 'starter_smtp' ); ?>

				<table class="form-table" role="presentation">
					<tr>
						<th scope="row"><?php esc_html_e( 'Email Provider', 'starter-smtp' ); ?></th>
						<td>
							<select name="starter_smtp_settings[active]" id="starter-smtp-provider" style="min-width:200px">
								<?php foreach ( $providers as $key => $provider ) : ?>
									<option value="<?php echo esc_attr( $key ); ?>" <?php selected( $active, $key ); ?>>
										<?php echo esc_html( $provider->get_label() ); ?>
									</option>
								<?php endforeach; ?>
							</select>
						</td>
					</tr>
				</table>

				<?php foreach ( $providers as $pkey => $provider ) : ?>
					<?php $fields = $provider->get_fields(); ?>
					<?php if ( empty( $fields ) ) continue; ?>
					<div class="starter-smtp-provider-fields" data-provider="<?php echo esc_attr( $pkey ); ?>" style="<?php echo $pkey !== $active ? 'display:none' : ''; ?>">
						<h2><?php echo esc_html( $provider->get_label() ); ?> <?php esc_html_e( 'Settings', 'starter-smtp' ); ?></h2>
						<table class="form-table" role="presentation">
							<?php foreach ( $fields as $field ) : ?>
								<?php
								$fk    = $pkey . '_' . $field['key'];
								$value = $settings[ $fk ] ?? '';
								?>
								<tr>
									<th scope="row">
										<label for="<?php echo esc_attr( $fk ); ?>">
											<?php echo esc_html( $field['label'] ); ?>
											<?php if ( ! empty( $field['required'] ) ) echo '<span style="color:#dc2626">*</span>'; ?>
										</label>
									</th>
									<td>
										<?php if ( 'select' === $field['type'] && ! empty( $field['options'] ) ) : ?>
											<select name="starter_smtp_settings[<?php echo esc_attr( $fk ); ?>]" id="<?php echo esc_attr( $fk ); ?>" style="min-width:300px">
												<?php foreach ( $field['options'] as $opt ) : ?>
													<?php
													$opt_val   = is_array( $opt ) ? $opt['value'] : $opt;
													$opt_label = is_array( $opt ) ? $opt['label'] . ' — ' . $opt['value'] : strtoupper( $opt );
													?>
													<option value="<?php echo esc_attr( $opt_val ); ?>" <?php selected( $value, $opt_val ); ?>>
														<?php echo esc_html( $opt_label ); ?>
													</option>
												<?php endforeach; ?>
											</select>
										<?php else : ?>
											<input
												type="<?php echo esc_attr( $field['type'] ); ?>"
												name="starter_smtp_settings[<?php echo esc_attr( $fk ); ?>]"
												id="<?php echo esc_attr( $fk ); ?>"
												value="<?php echo esc_attr( $value ); ?>"
												class="regular-text"
												<?php if ( ! empty( $field['placeholder'] ) ) echo 'placeholder="' . esc_attr( $field['placeholder'] ) . '"'; ?>
											/>
										<?php endif; ?>
									</td>
								</tr>
							<?php endforeach; ?>
						</table>
					</div>
				<?php endforeach; ?>

				<h2><?php esc_html_e( 'Default Sender', 'starter-smtp' ); ?></h2>
				<p class="description"><?php esc_html_e( 'Override the default WordPress sender for all outgoing emails.', 'starter-smtp' ); ?></p>
				<table class="form-table" role="presentation">
					<tr>
						<th scope="row"><label for="from_name"><?php esc_html_e( 'From Name', 'starter-smtp' ); ?></label></th>
						<td><input type="text" name="starter_smtp_settings[from_name]" id="from_name" value="<?php echo esc_attr( $settings['from_name'] ?? '' ); ?>" class="regular-text" placeholder="<?php echo esc_attr( get_bloginfo( 'name' ) ); ?>" /></td>
					</tr>
					<tr>
						<th scope="row"><label for="from_email"><?php esc_html_e( 'From Email', 'starter-smtp' ); ?></label></th>
						<td><input type="email" name="starter_smtp_settings[from_email]" id="from_email" value="<?php echo esc_attr( $settings['from_email'] ?? '' ); ?>" class="regular-text" placeholder="<?php echo esc_attr( get_option( 'admin_email' ) ); ?>" /></td>
					</tr>
				</table>

				<?php submit_button(); ?>
			</form>

			<hr />
			<h2><?php esc_html_e( 'Test Email', 'starter-smtp' ); ?></h2>
			<p>
				<input type="email" id="starter-smtp-test-email" class="regular-text" placeholder="<?php echo esc_attr( wp_get_current_user()->user_email ); ?>" />
				<button type="button" class="button" id="starter-smtp-test-btn"><?php esc_html_e( 'Send Test', 'starter-smtp' ); ?></button>
				<span id="starter-smtp-test-result" style="margin-left:8px"></span>
			</p>

			<script>
			(function() {
				// Toggle provider fields.
				var sel = document.getElementById('starter-smtp-provider');
				if (sel) {
					sel.addEventListener('change', function() {
						document.querySelectorAll('.starter-smtp-provider-fields').forEach(function(el) {
							el.style.display = el.dataset.provider === sel.value ? '' : 'none';
						});
					});
				}
				// Test email.
				var btn = document.getElementById('starter-smtp-test-btn');
				var res = document.getElementById('starter-smtp-test-result');
				if (btn) {
					btn.addEventListener('click', function() {
						var email = document.getElementById('starter-smtp-test-email').value;
						btn.disabled = true;
						btn.textContent = 'Sending...';
						res.textContent = '';
						var fd = new FormData();
						fd.append('action', 'starter_smtp_test');
						fd.append('nonce', '<?php echo esc_js( wp_create_nonce( 'starter_smtp_test' ) ); ?>');
						fd.append('to', email);
						fetch(ajaxurl, { method: 'POST', body: fd })
							.then(function(r) { return r.json(); })
							.then(function(d) {
								res.textContent = d.success ? d.data : ('Error: ' + d.data);
								res.style.color = d.success ? '#16a34a' : '#dc2626';
							})
							.catch(function() { res.textContent = 'Request failed'; res.style.color = '#dc2626'; })
							.finally(function() { btn.disabled = false; btn.textContent = 'Send Test'; });
					});
				}
			})();
			</script>
		</div>
		<?php
	}
}
