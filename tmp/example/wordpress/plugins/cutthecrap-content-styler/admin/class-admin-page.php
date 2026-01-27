<?php
/**
 * Admin Page Class
 *
 * Handles the admin interface for content import and styling.
 *
 * @package CutTheCrap_Content_Styler
 */

if (!defined('ABSPATH')) {
    exit;
}

class CTCS_Admin_Page {

    /**
     * Main plugin instance
     */
    private $plugin;

    /**
     * Constructor
     *
     * @param CutTheCrap_Content_Styler $plugin
     */
    public function __construct($plugin) {
        $this->plugin = $plugin;
        $this->init_hooks();
    }

    /**
     * Initialize hooks
     */
    private function init_hooks() {
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('admin_init', [$this, 'register_settings']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_assets']);
    }

    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        // Main menu item
        add_menu_page(
            __('Content Styler', 'cutthecrap-content-styler'),
            __('Content Styler', 'cutthecrap-content-styler'),
            'edit_posts',
            'ctcs-import',
            [$this, 'render_import_page'],
            'dashicons-art',
            30
        );

        // Import submenu
        add_submenu_page(
            'ctcs-import',
            __('Content Importeren', 'cutthecrap-content-styler'),
            __('Importeren', 'cutthecrap-content-styler'),
            'edit_posts',
            'ctcs-import',
            [$this, 'render_import_page']
        );

        // Settings submenu
        add_submenu_page(
            'ctcs-import',
            __('Instellingen', 'cutthecrap-content-styler'),
            __('Instellingen', 'cutthecrap-content-styler'),
            'manage_options',
            'ctcs-settings',
            [$this, 'render_settings_page']
        );
    }

    /**
     * Register settings
     */
    public function register_settings() {
        register_setting('ctcs_settings', 'ctcs_auto_style_enabled', [
            'type' => 'boolean',
            'default' => true
        ]);

        register_setting('ctcs_settings', 'ctcs_accent_color', [
            'type' => 'string',
            'default' => '#ea580c',
            'sanitize_callback' => 'sanitize_hex_color'
        ]);

        register_setting('ctcs_settings', 'ctcs_cta_text', [
            'type' => 'string',
            'default' => 'Neem contact op',
            'sanitize_callback' => 'sanitize_text_field'
        ]);

        register_setting('ctcs_settings', 'ctcs_cta_url', [
            'type' => 'string',
            'default' => '/contact',
            'sanitize_callback' => 'esc_url_raw'
        ]);

        register_setting('ctcs_settings', 'ctcs_cta_description', [
            'type' => 'string',
            'default' => 'Heeft u vragen of wilt u meer informatie? Wij helpen u graag verder.',
            'sanitize_callback' => 'sanitize_text_field'
        ]);
    }

    /**
     * Enqueue admin assets
     */
    public function enqueue_assets($hook) {
        // Only load on our pages
        if (!in_array($hook, ['toplevel_page_ctcs-import', 'content-styler_page_ctcs-settings'])) {
            return;
        }

        // CSS
        wp_enqueue_style(
            'ctcs-admin',
            CTCS_PLUGIN_URL . 'assets/css/admin.css',
            [],
            CTCS_VERSION
        );

        // Color picker for settings
        if ($hook === 'content-styler_page_ctcs-settings') {
            wp_enqueue_style('wp-color-picker');
            wp_enqueue_script('wp-color-picker');
        }

        // Media uploader
        wp_enqueue_media();

        // JS
        wp_enqueue_script(
            'ctcs-admin',
            CTCS_PLUGIN_URL . 'assets/js/admin.js',
            ['jquery', 'wp-util'],
            CTCS_VERSION,
            true
        );

        wp_localize_script('ctcs-admin', 'ctcsAdmin', [
            'nonce' => wp_create_nonce('ctcs_admin_nonce'),
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'i18n' => [
                'dropZoneText' => __('Sleep HTML of Markdown bestand hierheen', 'cutthecrap-content-styler'),
                'dropZoneActive' => __('Laat los om te uploaden', 'cutthecrap-content-styler'),
                'processing' => __('Content wordt verwerkt...', 'cutthecrap-content-styler'),
                'error' => __('Er is een fout opgetreden', 'cutthecrap-content-styler'),
                'success' => __('Content succesvol verwerkt!', 'cutthecrap-content-styler'),
                'creating' => __('Post wordt aangemaakt...', 'cutthecrap-content-styler'),
                'created' => __('Post succesvol aangemaakt!', 'cutthecrap-content-styler'),
                'selectImage' => __('Selecteer uitgelichte afbeelding', 'cutthecrap-content-styler'),
                'useImage' => __('Gebruik deze afbeelding', 'cutthecrap-content-styler'),
                'componentsDetected' => __('Gedetecteerde componenten', 'cutthecrap-content-styler'),
            ]
        ]);
    }

    /**
     * Render import page
     */
    public function render_import_page() {
        include CTCS_PLUGIN_DIR . 'admin/views/import-page.php';
    }

    /**
     * Render settings page
     */
    public function render_settings_page() {
        include CTCS_PLUGIN_DIR . 'admin/views/settings-page.php';
    }
}
