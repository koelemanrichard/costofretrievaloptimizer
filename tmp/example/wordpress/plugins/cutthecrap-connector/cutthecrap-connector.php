<?php
/**
 * Plugin Name: CutTheCrap Connector
 * Plugin URI: https://cutthecrap.net
 * Description: Connect your WordPress site to CutTheCrap for automated content publishing with SEO optimization.
 * Version: 0.1.0
 * Requires at least: 5.6
 * Requires PHP: 7.4
 * Author: CutTheCrap
 * Author URI: https://cutthecrap.net
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: cutthecrap-connector
 * Domain Path: /languages
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Plugin constants
define('CUTTHECRAP_VERSION', '0.1.0');
define('CUTTHECRAP_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('CUTTHECRAP_PLUGIN_URL', plugin_dir_url(__FILE__));
define('CUTTHECRAP_PLUGIN_BASENAME', plugin_basename(__FILE__));

/**
 * Autoloader for plugin classes
 */
spl_autoload_register(function ($class) {
    // Only autoload our classes
    if (strpos($class, 'CutTheCrap\\') !== 0) {
        return;
    }

    // Convert namespace to file path
    $class_name = str_replace('CutTheCrap\\', '', $class);
    $class_name = str_replace('_', '-', $class_name);
    $class_name = strtolower($class_name);

    $file = CUTTHECRAP_PLUGIN_DIR . 'includes/class-' . $class_name . '.php';

    if (file_exists($file)) {
        require_once $file;
    }
});

/**
 * Main plugin class
 */
final class CutTheCrap_Connector {

    /**
     * Plugin instance
     */
    private static $instance = null;

    /**
     * Get plugin instance
     */
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Constructor
     */
    private function __construct() {
        $this->init_hooks();
    }

    /**
     * Initialize hooks
     */
    private function init_hooks() {
        // Activation/deactivation hooks
        register_activation_hook(__FILE__, [$this, 'activate']);
        register_deactivation_hook(__FILE__, [$this, 'deactivate']);

        // Init hook
        add_action('init', [$this, 'init']);

        // REST API hooks
        add_action('rest_api_init', [$this, 'register_rest_routes']);

        // Admin hooks
        if (is_admin()) {
            add_action('admin_menu', [$this, 'add_admin_menu']);
            add_action('admin_init', [$this, 'register_settings']);
            add_action('admin_enqueue_scripts', [$this, 'enqueue_admin_assets']);
        }

        // Post save hook for webhook dispatch
        add_action('save_post', [$this, 'on_post_save'], 10, 3);
        add_action('wp_trash_post', [$this, 'on_post_trash']);
        add_action('untrash_post', [$this, 'on_post_untrash']);
    }

    /**
     * Plugin activation
     */
    public function activate() {
        // Generate HMAC secret if not exists
        if (!get_option('cutthecrap_hmac_secret')) {
            $secret = wp_generate_password(32, false);
            add_option('cutthecrap_hmac_secret', $secret);
        }

        // Generate unique site ID if not exists
        if (!get_option('cutthecrap_site_id')) {
            $site_id = wp_generate_uuid4();
            add_option('cutthecrap_site_id', $site_id);
        }

        // Set default options
        add_option('cutthecrap_webhook_url', '');
        add_option('cutthecrap_webhook_enabled', false);

        // Flush rewrite rules
        flush_rewrite_rules();
    }

    /**
     * Plugin deactivation
     */
    public function deactivate() {
        // Clean up scheduled events if any
        wp_clear_scheduled_hook('cutthecrap_sync_event');

        // Flush rewrite rules
        flush_rewrite_rules();
    }

    /**
     * Plugin initialization
     */
    public function init() {
        // Load text domain for translations
        load_plugin_textdomain(
            'cutthecrap-connector',
            false,
            dirname(CUTTHECRAP_PLUGIN_BASENAME) . '/languages'
        );
    }

    /**
     * Register REST API routes
     */
    public function register_rest_routes() {
        $api_handler = new CutTheCrap\Api_Handler();
        $api_handler->register_routes();
    }

    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        add_options_page(
            __('CutTheCrap Connector', 'cutthecrap-connector'),
            __('CutTheCrap', 'cutthecrap-connector'),
            'manage_options',
            'cutthecrap-connector',
            [$this, 'render_settings_page']
        );
    }

    /**
     * Register settings
     */
    public function register_settings() {
        register_setting('cutthecrap_settings', 'cutthecrap_webhook_url', [
            'type' => 'string',
            'sanitize_callback' => 'esc_url_raw',
            'default' => ''
        ]);

        register_setting('cutthecrap_settings', 'cutthecrap_webhook_enabled', [
            'type' => 'boolean',
            'default' => false
        ]);

        add_settings_section(
            'cutthecrap_main_section',
            __('Connection Settings', 'cutthecrap-connector'),
            [$this, 'render_section_description'],
            'cutthecrap-connector'
        );

        add_settings_field(
            'cutthecrap_site_id_display',
            __('Site ID', 'cutthecrap-connector'),
            [$this, 'render_site_id_field'],
            'cutthecrap-connector',
            'cutthecrap_main_section'
        );

        add_settings_field(
            'cutthecrap_webhook_url',
            __('Webhook URL', 'cutthecrap-connector'),
            [$this, 'render_webhook_url_field'],
            'cutthecrap-connector',
            'cutthecrap_main_section'
        );

        add_settings_field(
            'cutthecrap_webhook_enabled',
            __('Enable Webhooks', 'cutthecrap-connector'),
            [$this, 'render_webhook_enabled_field'],
            'cutthecrap-connector',
            'cutthecrap_main_section'
        );
    }

    /**
     * Render settings page
     */
    public function render_settings_page() {
        if (!current_user_can('manage_options')) {
            return;
        }

        include CUTTHECRAP_PLUGIN_DIR . 'admin/views/settings-page.php';
    }

    /**
     * Render section description
     */
    public function render_section_description() {
        echo '<p>' . esc_html__('Configure your CutTheCrap connection settings below.', 'cutthecrap-connector') . '</p>';
    }

    /**
     * Render Site ID field (read-only)
     */
    public function render_site_id_field() {
        $site_id = get_option('cutthecrap_site_id', '');
        echo '<input type="text" value="' . esc_attr($site_id) . '" class="regular-text" readonly />';
        echo '<p class="description">' . esc_html__('Your unique site identifier. Use this when connecting from CutTheCrap.', 'cutthecrap-connector') . '</p>';
    }

    /**
     * Render Webhook URL field
     */
    public function render_webhook_url_field() {
        $value = get_option('cutthecrap_webhook_url', '');
        echo '<input type="url" name="cutthecrap_webhook_url" value="' . esc_attr($value) . '" class="regular-text" />';
        echo '<p class="description">' . esc_html__('URL to receive webhook notifications when posts are updated.', 'cutthecrap-connector') . '</p>';
    }

    /**
     * Render Webhook Enabled field
     */
    public function render_webhook_enabled_field() {
        $value = get_option('cutthecrap_webhook_enabled', false);
        echo '<input type="checkbox" name="cutthecrap_webhook_enabled" value="1" ' . checked(1, $value, false) . ' />';
        echo '<label>' . esc_html__('Send webhooks when posts are created, updated, or deleted', 'cutthecrap-connector') . '</label>';
    }

    /**
     * Enqueue admin assets
     */
    public function enqueue_admin_assets($hook) {
        if ('settings_page_cutthecrap-connector' !== $hook) {
            return;
        }

        wp_enqueue_style(
            'cutthecrap-admin',
            CUTTHECRAP_PLUGIN_URL . 'assets/css/admin.css',
            [],
            CUTTHECRAP_VERSION
        );

        wp_enqueue_script(
            'cutthecrap-admin',
            CUTTHECRAP_PLUGIN_URL . 'admin/js/admin.js',
            ['jquery'],
            CUTTHECRAP_VERSION,
            true
        );

        wp_localize_script('cutthecrap-admin', 'cutthecrapAdmin', [
            'nonce' => wp_create_nonce('cutthecrap_admin'),
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'i18n' => [
                'testSuccess' => __('Connection test successful!', 'cutthecrap-connector'),
                'testFailed' => __('Connection test failed.', 'cutthecrap-connector'),
            ]
        ]);
    }

    /**
     * Handle post save for webhook dispatch
     */
    public function on_post_save($post_id, $post, $update) {
        // Skip autosaves and revisions
        if (wp_is_post_autosave($post_id) || wp_is_post_revision($post_id)) {
            return;
        }

        // Only handle posts (not pages or custom types for now)
        if ($post->post_type !== 'post') {
            return;
        }

        // Check if we have a CutTheCrap topic ID
        $topic_id = get_post_meta($post_id, '_cutthecrap_topic_id', true);
        if (!$topic_id) {
            return;
        }

        // Dispatch webhook
        $this->dispatch_webhook($update ? 'post.updated' : 'post.created', [
            'post_id' => $post_id,
            'topic_id' => $topic_id,
            'status' => $post->post_status,
            'modified' => $post->post_modified_gmt
        ]);
    }

    /**
     * Handle post trash
     */
    public function on_post_trash($post_id) {
        $topic_id = get_post_meta($post_id, '_cutthecrap_topic_id', true);
        if (!$topic_id) {
            return;
        }

        $this->dispatch_webhook('post.trashed', [
            'post_id' => $post_id,
            'topic_id' => $topic_id
        ]);
    }

    /**
     * Handle post untrash
     */
    public function on_post_untrash($post_id) {
        $topic_id = get_post_meta($post_id, '_cutthecrap_topic_id', true);
        if (!$topic_id) {
            return;
        }

        $this->dispatch_webhook('post.restored', [
            'post_id' => $post_id,
            'topic_id' => $topic_id
        ]);
    }

    /**
     * Dispatch webhook to CutTheCrap
     */
    private function dispatch_webhook($event, $data) {
        if (!get_option('cutthecrap_webhook_enabled', false)) {
            return;
        }

        $webhook_url = get_option('cutthecrap_webhook_url', '');
        if (empty($webhook_url)) {
            return;
        }

        $hmac_secret = get_option('cutthecrap_hmac_secret', '');
        $site_id = get_option('cutthecrap_site_id', '');

        $payload = [
            'event' => $event,
            'site_id' => $site_id,
            'timestamp' => time(),
            'data' => $data
        ];

        $payload_json = wp_json_encode($payload);
        $signature = hash_hmac('sha256', $payload_json, $hmac_secret);

        wp_remote_post($webhook_url, [
            'headers' => [
                'Content-Type' => 'application/json',
                'X-CutTheCrap-Signature' => $signature,
                'X-CutTheCrap-Event' => $event
            ],
            'body' => $payload_json,
            'timeout' => 10,
            'blocking' => false // Non-blocking for performance
        ]);
    }
}

// Initialize plugin
function cutthecrap_connector() {
    return CutTheCrap_Connector::get_instance();
}

// Start the plugin
cutthecrap_connector();
