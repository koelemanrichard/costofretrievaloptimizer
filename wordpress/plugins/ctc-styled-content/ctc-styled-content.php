<?php
/**
 * Plugin Name: CTC Styled Content
 * Plugin URI: https://github.com/your-repo/ctc-styled-content
 * Description: Injects scoped CSS styles for content published from the CTC SEO platform. Provides brand-aware styling with low-specificity selectors that work with any WordPress theme.
 * Version: 1.0.0
 * Author: CTC Platform
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: ctc-styled-content
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('CTC_STYLED_VERSION', '1.0.0');
define('CTC_STYLED_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('CTC_STYLED_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Main Plugin Class
 */
class CTC_Styled_Content {

    /**
     * Instance
     */
    private static $instance = null;

    /**
     * Default CSS variables
     */
    private $default_css_vars = array(
        '--ctc-primary' => '#3B82F6',
        '--ctc-secondary' => '#1E40AF',
        '--ctc-accent' => '#F59E0B',
        '--ctc-background' => '#FFFFFF',
        '--ctc-surface' => '#F9FAFB',
        '--ctc-text' => '#111827',
        '--ctc-text-muted' => '#6B7280',
        '--ctc-border' => '#E5E7EB',
        '--ctc-font-heading' => 'Inter, system-ui, sans-serif',
        '--ctc-font-body' => 'Inter, system-ui, sans-serif',
        '--ctc-font-mono' => 'JetBrains Mono, monospace',
        '--ctc-radius' => '0.5rem',
        '--ctc-shadow' => '0 1px 2px rgba(0,0,0,0.05)',
        '--ctc-section-gap' => '3rem',
        '--ctc-content-width' => '768px',
    );

    /**
     * Get instance
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
        // Init hooks
        add_action('init', array($this, 'init'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));

        // Frontend hooks
        add_action('wp_head', array($this, 'inject_css_variables'), 5);
        add_action('wp_enqueue_scripts', array($this, 'enqueue_assets'));
        add_filter('the_content', array($this, 'process_content'), 20);
    }

    /**
     * Initialize plugin
     */
    public function init() {
        // Load text domain
        load_plugin_textdomain('ctc-styled-content', false, dirname(plugin_basename(__FILE__)) . '/languages');
    }

    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        add_options_page(
            __('CTC Styled Content Settings', 'ctc-styled-content'),
            __('CTC Styled Content', 'ctc-styled-content'),
            'manage_options',
            'ctc-styled-content',
            array($this, 'render_settings_page')
        );
    }

    /**
     * Register settings
     */
    public function register_settings() {
        register_setting('ctc_styled_content', 'ctc_styled_options', array(
            'sanitize_callback' => array($this, 'sanitize_options'),
            'default' => array(
                'enable_global_styles' => true,
                'enable_progress_bar' => true,
                'enable_toc_script' => true,
                'custom_css_vars' => '',
            ),
        ));

        // Settings section
        add_settings_section(
            'ctc_styled_main',
            __('Style Settings', 'ctc-styled-content'),
            array($this, 'render_section_description'),
            'ctc-styled-content'
        );

        // Enable global styles
        add_settings_field(
            'enable_global_styles',
            __('Enable Global Styles', 'ctc-styled-content'),
            array($this, 'render_checkbox_field'),
            'ctc-styled-content',
            'ctc_styled_main',
            array(
                'label_for' => 'enable_global_styles',
                'description' => __('Load CTC component styles on all pages with styled content.', 'ctc-styled-content'),
            )
        );

        // Enable progress bar
        add_settings_field(
            'enable_progress_bar',
            __('Enable Progress Bar', 'ctc-styled-content'),
            array($this, 'render_checkbox_field'),
            'ctc-styled-content',
            'ctc_styled_main',
            array(
                'label_for' => 'enable_progress_bar',
                'description' => __('Show reading progress bar on articles.', 'ctc-styled-content'),
            )
        );

        // Enable ToC script
        add_settings_field(
            'enable_toc_script',
            __('Enable ToC & FAQ Scripts', 'ctc-styled-content'),
            array($this, 'render_checkbox_field'),
            'ctc-styled-content',
            'ctc_styled_main',
            array(
                'label_for' => 'enable_toc_script',
                'description' => __('Enable interactive Table of Contents and FAQ accordions.', 'ctc-styled-content'),
            )
        );

        // Custom CSS variables
        add_settings_field(
            'custom_css_vars',
            __('Custom CSS Variables', 'ctc-styled-content'),
            array($this, 'render_textarea_field'),
            'ctc-styled-content',
            'ctc_styled_main',
            array(
                'label_for' => 'custom_css_vars',
                'description' => __('Override default CSS variables. Format: --ctc-primary: #3B82F6;', 'ctc-styled-content'),
                'rows' => 6,
            )
        );
    }

    /**
     * Sanitize options
     */
    public function sanitize_options($input) {
        $sanitized = array();

        $sanitized['enable_global_styles'] = !empty($input['enable_global_styles']);
        $sanitized['enable_progress_bar'] = !empty($input['enable_progress_bar']);
        $sanitized['enable_toc_script'] = !empty($input['enable_toc_script']);
        $sanitized['custom_css_vars'] = wp_strip_all_tags($input['custom_css_vars'] ?? '');

        return $sanitized;
    }

    /**
     * Render settings page
     */
    public function render_settings_page() {
        if (!current_user_can('manage_options')) {
            return;
        }
        ?>
        <div class="wrap">
            <h1><?php echo esc_html(get_admin_page_title()); ?></h1>

            <form action="options.php" method="post">
                <?php
                settings_fields('ctc_styled_content');
                do_settings_sections('ctc-styled-content');
                submit_button(__('Save Settings', 'ctc-styled-content'));
                ?>
            </form>

            <hr>

            <h2><?php esc_html_e('Default CSS Variables', 'ctc-styled-content'); ?></h2>
            <p class="description"><?php esc_html_e('These are the default CSS variables used by the styled content components:', 'ctc-styled-content'); ?></p>

            <pre style="background: #f1f1f1; padding: 15px; border-radius: 4px; overflow-x: auto;">
:root {
<?php foreach ($this->default_css_vars as $var => $value): ?>
    <?php echo esc_html($var); ?>: <?php echo esc_html($value); ?>;
<?php endforeach; ?>
}
            </pre>
        </div>
        <?php
    }

    /**
     * Render section description
     */
    public function render_section_description() {
        echo '<p>' . esc_html__('Configure how styled content from the CTC platform is displayed.', 'ctc-styled-content') . '</p>';
    }

    /**
     * Render checkbox field
     */
    public function render_checkbox_field($args) {
        $options = get_option('ctc_styled_options', array());
        $value = isset($options[$args['label_for']]) ? $options[$args['label_for']] : true;
        ?>
        <label>
            <input type="checkbox"
                   id="<?php echo esc_attr($args['label_for']); ?>"
                   name="ctc_styled_options[<?php echo esc_attr($args['label_for']); ?>]"
                   value="1"
                   <?php checked($value, true); ?>>
            <?php echo esc_html($args['description']); ?>
        </label>
        <?php
    }

    /**
     * Render textarea field
     */
    public function render_textarea_field($args) {
        $options = get_option('ctc_styled_options', array());
        $value = isset($options[$args['label_for']]) ? $options[$args['label_for']] : '';
        ?>
        <textarea id="<?php echo esc_attr($args['label_for']); ?>"
                  name="ctc_styled_options[<?php echo esc_attr($args['label_for']); ?>]"
                  rows="<?php echo esc_attr($args['rows'] ?? 4); ?>"
                  class="large-text code"><?php echo esc_textarea($value); ?></textarea>
        <p class="description"><?php echo esc_html($args['description']); ?></p>
        <?php
    }

    /**
     * Inject CSS variables into wp_head
     */
    public function inject_css_variables() {
        // Only inject if we have styled content
        if (!$this->has_styled_content()) {
            return;
        }

        $options = get_option('ctc_styled_options', array());

        // Build CSS variables
        $css_vars = $this->default_css_vars;

        // Parse custom CSS vars
        if (!empty($options['custom_css_vars'])) {
            $custom_lines = explode("\n", $options['custom_css_vars']);
            foreach ($custom_lines as $line) {
                $line = trim($line);
                if (strpos($line, '--ctc-') === 0 && strpos($line, ':') !== false) {
                    list($var, $value) = explode(':', $line, 2);
                    $var = trim($var);
                    $value = trim(rtrim($value, ';'));
                    if ($var && $value) {
                        $css_vars[$var] = $value;
                    }
                }
            }
        }

        // Output CSS
        echo "<style id=\"ctc-styled-variables\">\n";
        echo ":root {\n";
        foreach ($css_vars as $var => $value) {
            echo "    " . esc_html($var) . ": " . esc_html($value) . ";\n";
        }
        echo "}\n";
        echo "</style>\n";
    }

    /**
     * Enqueue frontend assets
     */
    public function enqueue_assets() {
        // Only enqueue if we have styled content
        if (!$this->has_styled_content()) {
            return;
        }

        $options = get_option('ctc_styled_options', array());

        // Enqueue component styles
        if (!empty($options['enable_global_styles'])) {
            wp_enqueue_style(
                'ctc-styled-components',
                CTC_STYLED_PLUGIN_URL . 'assets/css/components.css',
                array(),
                CTC_STYLED_VERSION
            );
        }

        // Enqueue reading enhancements script
        if (!empty($options['enable_progress_bar']) || !empty($options['enable_toc_script'])) {
            wp_enqueue_script(
                'ctc-styled-enhancements',
                CTC_STYLED_PLUGIN_URL . 'assets/js/reading-enhancements.js',
                array(),
                CTC_STYLED_VERSION,
                true
            );

            wp_localize_script('ctc-styled-enhancements', 'ctcStyledConfig', array(
                'enableProgressBar' => !empty($options['enable_progress_bar']),
                'enableTocScript' => !empty($options['enable_toc_script']),
            ));
        }
    }

    /**
     * Process content
     */
    public function process_content($content) {
        // Check if content has CTC styled markers
        if (strpos($content, 'ctc-styled') === false) {
            return $content;
        }

        // Extract and process inline styles if present
        if (preg_match('/<style class="ctc-inline-styles">(.*?)<\/style>/s', $content, $matches)) {
            // Add the inline styles to wp_head instead
            add_action('wp_head', function() use ($matches) {
                echo '<style id="ctc-styled-inline">' . wp_strip_all_tags($matches[1]) . '</style>';
            }, 10);

            // Remove from content
            $content = str_replace($matches[0], '', $content);
        }

        // Remove CTC markers
        $content = str_replace(array('<!-- ctc-styled-content -->', '<!-- /ctc-styled-content -->'), '', $content);

        return $content;
    }

    /**
     * Check if current page has styled content
     */
    private function has_styled_content() {
        global $post;

        if (!is_singular() || !$post) {
            return false;
        }

        // Check for CTC styled markers
        return strpos($post->post_content, 'ctc-styled') !== false;
    }
}

// Initialize plugin
CTC_Styled_Content::get_instance();

// Activation hook
register_activation_hook(__FILE__, function() {
    // Set default options
    if (!get_option('ctc_styled_options')) {
        add_option('ctc_styled_options', array(
            'enable_global_styles' => true,
            'enable_progress_bar' => true,
            'enable_toc_script' => true,
            'custom_css_vars' => '',
        ));
    }
});

// Deactivation hook
register_deactivation_hook(__FILE__, function() {
    // Optionally clean up options
    // delete_option('ctc_styled_options');
});
