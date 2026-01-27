<?php
/**
 * Plugin Name: CutTheCrap Content Styler
 * Plugin URI: https://cutthecrap.net
 * Description: Automatically transform SEO-optimized HTML/Markdown content into professionally styled pages with Key Takeaways, Hero Sections, FAQ Accordions, and more.
 * Version: 1.0.0
 * Requires at least: 5.6
 * Requires PHP: 7.4
 * Author: CutTheCrap
 * Author URI: https://cutthecrap.net
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: cutthecrap-content-styler
 * Domain Path: /languages
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Plugin constants
define('CTCS_VERSION', '1.0.0');
define('CTCS_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('CTCS_PLUGIN_URL', plugin_dir_url(__FILE__));
define('CTCS_PLUGIN_BASENAME', plugin_basename(__FILE__));

/**
 * Load plugin classes
 */
require_once CTCS_PLUGIN_DIR . 'includes/class-content-parser.php';
require_once CTCS_PLUGIN_DIR . 'includes/class-component-detector.php';
require_once CTCS_PLUGIN_DIR . 'includes/class-html-transformer.php';
require_once CTCS_PLUGIN_DIR . 'admin/class-admin-page.php';

/**
 * Main plugin class
 */
final class CutTheCrap_Content_Styler {

    /**
     * Plugin instance
     */
    private static $instance = null;

    /**
     * Content Parser
     */
    public $parser;

    /**
     * Component Detector
     */
    public $detector;

    /**
     * HTML Transformer
     */
    public $transformer;

    /**
     * Admin Page
     */
    public $admin;

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
        $this->init_classes();
        $this->init_hooks();
    }

    /**
     * Initialize classes
     */
    private function init_classes() {
        $this->parser = new CTCS_Content_Parser();
        $this->detector = new CTCS_Component_Detector();
        $this->transformer = new CTCS_HTML_Transformer($this->detector);

        if (is_admin()) {
            $this->admin = new CTCS_Admin_Page($this);
        }
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

        // AJAX hooks for admin
        add_action('wp_ajax_ctcs_parse_content', [$this, 'ajax_parse_content']);
        add_action('wp_ajax_ctcs_create_post', [$this, 'ajax_create_post']);
        add_action('wp_ajax_ctcs_preview_content', [$this, 'ajax_preview_content']);

        // Integration with CutTheCrap Connector
        add_action('cutthecrap_content_received', [$this, 'handle_connector_content'], 10, 2);

        // Filter for automatic styling on the frontend
        add_filter('the_content', [$this, 'maybe_style_content'], 5);
    }

    /**
     * Plugin activation
     */
    public function activate() {
        // Set default options
        add_option('ctcs_auto_style_enabled', true);
        add_option('ctcs_accent_color', '#ea580c');
        add_option('ctcs_cta_text', 'Neem contact op');
        add_option('ctcs_cta_url', '/contact');

        // Flush rewrite rules
        flush_rewrite_rules();
    }

    /**
     * Plugin deactivation
     */
    public function deactivate() {
        flush_rewrite_rules();
    }

    /**
     * Plugin initialization
     */
    public function init() {
        load_plugin_textdomain(
            'cutthecrap-content-styler',
            false,
            dirname(CTCS_PLUGIN_BASENAME) . '/languages'
        );
    }

    /**
     * AJAX: Parse content
     */
    public function ajax_parse_content() {
        check_ajax_referer('ctcs_admin_nonce', 'nonce');

        if (!current_user_can('edit_posts')) {
            wp_send_json_error(['message' => __('Insufficient permissions', 'cutthecrap-content-styler')]);
        }

        // Don't use wp_kses_post here - it strips needed HTML structure
        // We'll sanitize the output when saving/displaying
        $content = isset($_POST['content']) ? wp_unslash($_POST['content']) : '';
        $format = isset($_POST['format']) ? sanitize_text_field($_POST['format']) : 'html';

        if (empty($content)) {
            wp_send_json_error(['message' => __('No content provided', 'cutthecrap-content-styler')]);
        }

        try {
            // Parse the content
            $parsed = $this->parser->parse($content, $format);

            // Detect components
            $components = $this->detector->detect($parsed);

            // Get preview of transformed content
            $transformed = $this->transformer->transform($parsed, $components);

            // Debug info
            $debug = [
                'content_length' => strlen($content),
                'raw_html_length' => strlen($parsed['raw_html'] ?? ''),
                'parsed_sections_count' => count($parsed['sections'] ?? []),
                'detected_sections_count' => count($components['sections'] ?? []),
                'has_h2_tags_in_input' => preg_match('/<h2/i', $content) ? true : false,
                'has_h2_tags_in_parsed' => preg_match('/<h2/i', $parsed['raw_html'] ?? '') ? true : false,
                'intro_length' => strlen($parsed['intro'] ?? ''),
                'headings_found' => count($parsed['headings'] ?? []),
                'first_100_chars' => substr($parsed['raw_html'] ?? '', 0, 200),
                'section_headings' => array_map(function($s) { return $s['heading'] ?? ''; }, $parsed['sections'] ?? [])
            ];

            wp_send_json_success([
                'parsed' => $parsed,
                'components' => $components,
                'preview' => $transformed,
                'title' => $parsed['title'] ?? '',
                'meta_description' => $parsed['meta_description'] ?? '',
                'debug' => $debug
            ]);
        } catch (Exception $e) {
            wp_send_json_error(['message' => $e->getMessage()]);
        }
    }

    /**
     * AJAX: Create post
     */
    public function ajax_create_post() {
        check_ajax_referer('ctcs_admin_nonce', 'nonce');

        if (!current_user_can('publish_posts')) {
            wp_send_json_error(['message' => __('Insufficient permissions', 'cutthecrap-content-styler')]);
        }

        $title = isset($_POST['title']) ? sanitize_text_field(wp_unslash($_POST['title'])) : '';
        $content = isset($_POST['content']) ? wp_kses_post(wp_unslash($_POST['content'])) : '';
        $slug = isset($_POST['slug']) ? sanitize_title($_POST['slug']) : '';
        $post_type = isset($_POST['post_type']) ? sanitize_key($_POST['post_type']) : 'page';
        $category = isset($_POST['category']) ? absint($_POST['category']) : 0;
        $page_template = isset($_POST['page_template']) ? sanitize_text_field($_POST['page_template']) : '';
        $status = isset($_POST['status']) ? sanitize_text_field($_POST['status']) : 'draft';
        $meta_description = isset($_POST['meta_description']) ? sanitize_text_field(wp_unslash($_POST['meta_description'])) : '';
        $featured_image_id = isset($_POST['featured_image_id']) ? absint($_POST['featured_image_id']) : 0;

        if (empty($title) || empty($content)) {
            wp_send_json_error(['message' => __('Title and content are required', 'cutthecrap-content-styler')]);
        }

        // Validate post type exists
        if (!post_type_exists($post_type)) {
            $post_type = 'post';
        }

        // Check user can publish this post type
        $post_type_obj = get_post_type_object($post_type);
        if (!current_user_can($post_type_obj->cap->publish_posts)) {
            wp_send_json_error(['message' => __('You do not have permission to publish this content type', 'cutthecrap-content-styler')]);
        }

        // Create the post
        $post_data = [
            'post_title' => $title,
            'post_content' => $content,
            'post_status' => $status,
            'post_type' => $post_type,
            'post_name' => $slug
        ];

        // Add category only for posts (or post types that support categories)
        if ($category > 0 && $post_type === 'post') {
            $post_data['post_category'] = [$category];
        }

        $post_id = wp_insert_post($post_data, true);

        if (is_wp_error($post_id)) {
            wp_send_json_error(['message' => $post_id->get_error_message()]);
        }

        // Set featured image
        if ($featured_image_id > 0) {
            set_post_thumbnail($post_id, $featured_image_id);
        }

        // Set page template for pages - default to SEO Article template
        if ($post_type === 'page') {
            // If no template specified, default to SEO Article template
            if (empty($page_template)) {
                $page_template = 'template-seo-article.php';
            }
            update_post_meta($post_id, '_wp_page_template', $page_template);
        }

        // Save meta description (for Yoast/RankMath/custom)
        if (!empty($meta_description)) {
            update_post_meta($post_id, '_ctcs_meta_description', $meta_description);
            // Yoast SEO compatibility
            update_post_meta($post_id, '_yoast_wpseo_metadesc', $meta_description);
            // RankMath SEO compatibility
            update_post_meta($post_id, 'rank_math_description', $meta_description);
        }

        // Mark as SEO styled content
        update_post_meta($post_id, '_ctcs_styled', true);

        // Get post type label for response
        $post_type_label = $post_type_obj->labels->singular_name;

        wp_send_json_success([
            'post_id' => $post_id,
            'edit_url' => get_edit_post_link($post_id, 'raw'),
            'view_url' => get_permalink($post_id),
            'post_type' => $post_type,
            'post_type_label' => $post_type_label,
            'message' => sprintf(__('%s created successfully', 'cutthecrap-content-styler'), $post_type_label)
        ]);
    }

    /**
     * AJAX: Preview content
     */
    public function ajax_preview_content() {
        check_ajax_referer('ctcs_admin_nonce', 'nonce');

        if (!current_user_can('edit_posts')) {
            wp_send_json_error(['message' => __('Insufficient permissions', 'cutthecrap-content-styler')]);
        }

        $content = isset($_POST['content']) ? wp_kses_post(wp_unslash($_POST['content'])) : '';

        if (empty($content)) {
            wp_send_json_error(['message' => __('No content provided', 'cutthecrap-content-styler')]);
        }

        try {
            $parsed = $this->parser->parse($content, 'html');
            $components = $this->detector->detect($parsed);
            $transformed = $this->transformer->transform($parsed, $components);

            wp_send_json_success([
                'html' => $transformed
            ]);
        } catch (Exception $e) {
            wp_send_json_error(['message' => $e->getMessage()]);
        }
    }

    /**
     * Handle content from CutTheCrap Connector
     */
    public function handle_connector_content($content, $metadata) {
        try {
            $parsed = $this->parser->parse($content, 'html');
            $components = $this->detector->detect($parsed);
            $transformed = $this->transformer->transform($parsed, $components);

            // Return transformed content for the connector to use
            return $transformed;
        } catch (Exception $e) {
            // Log error and return original content
            error_log('CTCS Transform Error: ' . $e->getMessage());
            return $content;
        }
    }

    /**
     * Maybe apply styling to content on the frontend
     */
    public function maybe_style_content($content) {
        if (!is_singular('post') || !get_option('ctcs_auto_style_enabled', true)) {
            return $content;
        }

        // Check if this post is marked for SEO styling
        $post_id = get_the_ID();
        $is_styled = get_post_meta($post_id, '_ctcs_styled', true);

        if (!$is_styled) {
            return $content;
        }

        // Content is already transformed during import, return as-is
        return $content;
    }

    /**
     * Process content - main public method
     */
    public function process_content($content, $format = 'html') {
        $parsed = $this->parser->parse($content, $format);
        $components = $this->detector->detect($parsed);
        return $this->transformer->transform($parsed, $components);
    }
}

/**
 * Get plugin instance
 */
function ctcs() {
    return CutTheCrap_Content_Styler::get_instance();
}

// Initialize plugin
ctcs();
