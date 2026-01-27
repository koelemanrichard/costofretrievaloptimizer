<?php
/**
 * Daadvracht Theme Functions
 *
 * @package Daadvracht
 * @since 1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Theme Setup
 */
function daadvracht_setup() {
    // Add default posts and comments RSS feed links to head
    add_theme_support('automatic-feed-links');

    // Let WordPress manage the document title
    add_theme_support('title-tag');

    // Enable support for Post Thumbnails on posts and pages
    add_theme_support('post-thumbnails');

    // Add support for responsive embeds
    add_theme_support('responsive-embeds');

    // Add support for HTML5 markup
    add_theme_support('html5', array(
        'search-form',
        'comment-form',
        'comment-list',
        'gallery',
        'caption',
        'style',
        'script',
    ));

    // Add support for custom logo
    add_theme_support('custom-logo', array(
        'height'      => 80,
        'width'       => 200,
        'flex-height' => true,
        'flex-width'  => true,
    ));

    // Register navigation menus
    register_nav_menus(array(
        'primary'   => __('Hoofdmenu', 'daadvracht'),
        'footer'    => __('Footer Menu', 'daadvracht'),
    ));

    // Set content width
    if (!isset($content_width)) {
        $content_width = 1200;
    }

    // Disable block-based widgets
    remove_theme_support('widgets-block-editor');
}
add_action('after_setup_theme', 'daadvracht_setup');

/**
 * Remove unwanted default styles and scripts
 */
function daadvracht_remove_default_styles() {
    // Remove block library CSS (Gutenberg)
    wp_dequeue_style('wp-block-library');
    wp_dequeue_style('wp-block-library-theme');
    wp_dequeue_style('wc-blocks-style');
    wp_dequeue_style('global-styles');
    wp_dequeue_style('classic-theme-styles');
}
add_action('wp_enqueue_scripts', 'daadvracht_remove_default_styles', 100);

/**
 * Fix wpautop adding paragraph tags around shortcodes
 * This prevents gaps between sections
 */
function daadvracht_fix_shortcodes($content) {
    // Remove empty paragraphs
    $content = preg_replace('/<p>\s*<\/p>/', '', $content);
    // Remove paragraphs that only contain whitespace or line breaks
    $content = preg_replace('/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/', '', $content);
    // Remove extra line breaks between sections
    $content = preg_replace('/(<\/section>)\s+(<section)/', '$1$2', $content);
    return $content;
}
add_filter('the_content', 'daadvracht_fix_shortcodes', 20);

/**
 * Add critical inline CSS to ensure full-width layout
 */
function daadvracht_critical_css() {
    ?>
    <style id="daadvracht-critical-css">
        /* Reset WordPress layout containers only */
        html, body, body > *, #page, #content, #primary, #main, .site, .site-content,
        .wp-site-blocks, .is-layout-constrained, .is-layout-flow, .has-global-padding,
        main, .homepage-content, .page-content {
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
        }
        /* Remove empty paragraphs and line breaks between sections */
        .homepage-content > p:empty,
        .homepage-content > br,
        .page-content > p:empty,
        .page-content > br,
        .entry-content > p:empty,
        .entry-content > br,
        main > p:empty,
        main > br,
        p:empty {
            display: none !important;
            margin: 0 !important;
            padding: 0 !important;
            height: 0 !important;
            font-size: 0 !important;
            line-height: 0 !important;
        }
        /* Ensure all sections have no margin */
        .hero, .services, .werkwijze, .contact-form-section, .testimonials, .region-banner, .site-footer, section {
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
        }
        body {
            background-color: #fafafa !important;
        }
        .hero {
            background-color: #fafafa !important;
        }
        .services {
            background-color: #ffffff !important;
        }
        .werkwijze {
            background-color: #18181b !important;
        }
        .contact-form-section {
            background-color: #18181b !important;
        }
        .testimonials {
            background-color: #fff7ed !important;
        }
        .region-banner {
            background-color: #ea580c !important;
        }
        .site-footer {
            background-color: #ffffff !important;
        }
        .site-header {
            position: fixed !important;
            width: 100% !important;
            max-width: 100% !important;
            left: 0 !important;
            right: 0 !important;
            top: 0 !important;
            z-index: 9999 !important;
            background: rgba(255,255,255,0.95) !important;
        }
        body.admin-bar .site-header {
            top: 32px !important;
        }
        @media screen and (max-width: 782px) {
            body.admin-bar .site-header {
                top: 46px !important;
            }
        }
    </style>
    <?php
}
add_action('wp_head', 'daadvracht_critical_css', 1);

/**
 * Enqueue scripts and styles
 */
function daadvracht_scripts() {
    // Enqueue Google Fonts
    wp_enqueue_style(
        'daadvracht-google-fonts',
        'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
        array(),
        null
    );

    // Enqueue Lucide Icons (reliable icon font)
    wp_enqueue_script(
        'lucide-icons',
        'https://unpkg.com/lucide@latest',
        array(),
        null,
        true
    );

    // Enqueue main stylesheet
    wp_enqueue_style(
        'daadvracht-style',
        get_stylesheet_uri(),
        array('daadvracht-google-fonts'),
        wp_get_theme()->get('Version')
    );

    // Enqueue main JavaScript
    wp_enqueue_script(
        'daadvracht-main',
        get_template_directory_uri() . '/assets/js/main.js',
        array('lucide-icons'),
        wp_get_theme()->get('Version'),
        true
    );

    // Enqueue article enhancements (ToC, sections, progress bar)
    if (is_singular() && !is_front_page()) {
        wp_enqueue_script(
            'daadvracht-article-enhancements',
            get_template_directory_uri() . '/js/article-enhancements.js',
            array(),
            wp_get_theme()->get('Version'),
            true
        );
    }
}
add_action('wp_enqueue_scripts', 'daadvracht_scripts');

/**
 * Register widget areas
 */
function daadvracht_widgets_init() {
    register_sidebar(array(
        'name'          => __('Footer Widget Area', 'daadvracht'),
        'id'            => 'footer-widgets',
        'description'   => __('Voeg widgets toe aan de footer.', 'daadvracht'),
        'before_widget' => '<div id="%1$s" class="widget %2$s">',
        'after_widget'  => '</div>',
        'before_title'  => '<h4 class="widget-title">',
        'after_title'   => '</h4>',
    ));
}
add_action('widgets_init', 'daadvracht_widgets_init');

/**
 * Custom excerpt length
 */
function daadvracht_excerpt_length($length) {
    return 25;
}
add_filter('excerpt_length', 'daadvracht_excerpt_length');

/**
 * Custom excerpt more
 */
function daadvracht_excerpt_more($more) {
    return '...';
}
add_filter('excerpt_more', 'daadvracht_excerpt_more');

/**
 * Add custom menu item classes
 */
function daadvracht_nav_menu_link_attributes($atts, $item, $args) {
    if (isset($args->theme_location)) {
        if ($args->theme_location === 'primary') {
            // Check if this is the CTA button (last item or marked with custom class)
            if (in_array('menu-item-cta', $item->classes)) {
                $atts['class'] = 'btn-cta';
            }
        }
    }
    return $atts;
}
add_filter('nav_menu_link_attributes', 'daadvracht_nav_menu_link_attributes', 10, 3);

/**
 * Theme Customizer settings
 */
function daadvracht_customize_register($wp_customize) {
    // Layout Section
    $wp_customize->add_section('daadvracht_layout', array(
        'title'       => __('Layout & Breedte', 'daadvracht'),
        'priority'    => 25,
        'description' => __('Stel de breedte van containers en pagina-inhoud in.', 'daadvracht'),
    ));

    // Global Container Width
    $wp_customize->add_setting('daadvracht_container_width', array(
        'default'           => 1280,
        'sanitize_callback' => 'absint',
        'transport'         => 'postMessage',
    ));
    $wp_customize->add_control('daadvracht_container_width', array(
        'label'       => __('Container Breedte (px)', 'daadvracht'),
        'description' => __('Maximale breedte van de hoofdcontainer (standaard: 1280px)', 'daadvracht'),
        'section'     => 'daadvracht_layout',
        'type'        => 'number',
        'input_attrs' => array(
            'min'  => 960,
            'max'  => 1920,
            'step' => 10,
        ),
    ));

    // Page Content Width
    $wp_customize->add_setting('daadvracht_page_content_width', array(
        'default'           => 1280,
        'sanitize_callback' => 'absint',
        'transport'         => 'postMessage',
    ));
    $wp_customize->add_control('daadvracht_page_content_width', array(
        'label'       => __('Pagina Inhoud Breedte (px)', 'daadvracht'),
        'description' => __('Breedte van de inhoud op standaard pagina\'s (standaard: 1280px)', 'daadvracht'),
        'section'     => 'daadvracht_layout',
        'type'        => 'number',
        'input_attrs' => array(
            'min'  => 600,
            'max'  => 1920,
            'step' => 10,
        ),
    ));

    // Full Width Pages Option
    $wp_customize->add_setting('daadvracht_fullwidth_pages', array(
        'default'           => false,
        'sanitize_callback' => 'wp_validate_boolean',
    ));
    $wp_customize->add_control('daadvracht_fullwidth_pages', array(
        'label'       => __('Volledige breedte voor pagina\'s', 'daadvracht'),
        'description' => __('Schakel in voor 100% breedte op alle pagina\'s', 'daadvracht'),
        'section'     => 'daadvracht_layout',
        'type'        => 'checkbox',
    ));

    // Contact Information Section
    $wp_customize->add_section('daadvracht_contact', array(
        'title'       => __('Contactgegevens', 'daadvracht'),
        'priority'    => 30,
        'description' => __('Voer uw bedrijfscontactgegevens in.', 'daadvracht'),
    ));

    // Phone number
    $wp_customize->add_setting('daadvracht_phone', array(
        'default'           => '+31 (0)10 123 4567',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('daadvracht_phone', array(
        'label'   => __('Telefoonnummer', 'daadvracht'),
        'section' => 'daadvracht_contact',
        'type'    => 'text',
    ));

    // Email
    $wp_customize->add_setting('daadvracht_email', array(
        'default'           => 'info@daadvracht.nl',
        'sanitize_callback' => 'sanitize_email',
    ));
    $wp_customize->add_control('daadvracht_email', array(
        'label'   => __('E-mailadres', 'daadvracht'),
        'section' => 'daadvracht_contact',
        'type'    => 'email',
    ));

    // Address
    $wp_customize->add_setting('daadvracht_address', array(
        'default'           => 'Breda, Noord-Brabant',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('daadvracht_address', array(
        'label'   => __('Adres', 'daadvracht'),
        'section' => 'daadvracht_contact',
        'type'    => 'text',
    ));

    // Social Media Section
    $wp_customize->add_section('daadvracht_social', array(
        'title'    => __('Social Media', 'daadvracht'),
        'priority' => 35,
    ));

    // LinkedIn
    $wp_customize->add_setting('daadvracht_linkedin', array(
        'default'           => '#',
        'sanitize_callback' => 'esc_url_raw',
    ));
    $wp_customize->add_control('daadvracht_linkedin', array(
        'label'   => __('LinkedIn URL', 'daadvracht'),
        'section' => 'daadvracht_social',
        'type'    => 'url',
    ));

    // Facebook
    $wp_customize->add_setting('daadvracht_facebook', array(
        'default'           => '#',
        'sanitize_callback' => 'esc_url_raw',
    ));
    $wp_customize->add_control('daadvracht_facebook', array(
        'label'   => __('Facebook URL', 'daadvracht'),
        'section' => 'daadvracht_social',
        'type'    => 'url',
    ));

    // Logo Text Settings (when no custom logo is set)
    $wp_customize->add_setting('daadvracht_logo_text_1', array(
        'default'           => 'DAAD',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('daadvracht_logo_text_1', array(
        'label'       => __('Logo Tekst (deel 1)', 'daadvracht'),
        'description' => __('Eerste deel van de logo tekst (zwart)', 'daadvracht'),
        'section'     => 'title_tagline',
        'type'        => 'text',
        'priority'    => 20,
    ));

    $wp_customize->add_setting('daadvracht_logo_text_2', array(
        'default'           => 'VRACHT',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('daadvracht_logo_text_2', array(
        'label'       => __('Logo Tekst (deel 2)', 'daadvracht'),
        'description' => __('Tweede deel van de logo tekst (oranje)', 'daadvracht'),
        'section'     => 'title_tagline',
        'type'        => 'text',
        'priority'    => 21,
    ));

    $wp_customize->add_setting('daadvracht_logo_tagline', array(
        'default'           => 'Ontruimingen',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('daadvracht_logo_tagline', array(
        'label'       => __('Logo Ondertitel', 'daadvracht'),
        'description' => __('Tekst onder het logo', 'daadvracht'),
        'section'     => 'title_tagline',
        'type'        => 'text',
        'priority'    => 22,
    ));

    // Hero Section
    $wp_customize->add_section('daadvracht_hero', array(
        'title'    => __('Hero Sectie', 'daadvracht'),
        'priority' => 40,
    ));

    // Hero Title
    $wp_customize->add_setting('daadvracht_hero_title', array(
        'default'           => 'Snel & Discreet Woningontruiming.',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('daadvracht_hero_title', array(
        'label'   => __('Hero Titel', 'daadvracht'),
        'section' => 'daadvracht_hero',
        'type'    => 'text',
    ));

    // Hero Description
    $wp_customize->add_setting('daadvracht_hero_description', array(
        'default'           => 'De zorgzame partner voor ontruimingen en seniorenverhuizingen. Wij leveren uw woning gegarandeerd bezemschoon op.',
        'sanitize_callback' => 'sanitize_textarea_field',
    ));
    $wp_customize->add_control('daadvracht_hero_description', array(
        'label'   => __('Hero Beschrijving', 'daadvracht'),
        'section' => 'daadvracht_hero',
        'type'    => 'textarea',
    ));

    // Hero Image
    $wp_customize->add_setting('daadvracht_hero_image', array(
        'default'           => '',
        'sanitize_callback' => 'esc_url_raw',
    ));
    $wp_customize->add_control(new WP_Customize_Image_Control($wp_customize, 'daadvracht_hero_image', array(
        'label'   => __('Hero Afbeelding', 'daadvracht'),
        'section' => 'daadvracht_hero',
    )));
}
add_action('customize_register', 'daadvracht_customize_register');

/**
 * Output dynamic CSS from Customizer settings
 */
function daadvracht_customizer_css() {
    $container_width = get_theme_mod('daadvracht_container_width', 1280);
    $page_content_width = get_theme_mod('daadvracht_page_content_width', 1280);
    $fullwidth_pages = get_theme_mod('daadvracht_fullwidth_pages', false);
    ?>
    <style id="daadvracht-customizer-css">
        .container,
        .site-header .container {
            max-width: <?php echo absint($container_width); ?>px !important;
        }
        <?php if ($fullwidth_pages) : ?>
        .page-content .container,
        .page-content .entry-content {
            max-width: 100% !important;
            width: 100% !important;
        }
        <?php else : ?>
        .page-content .container {
            max-width: <?php echo absint($page_content_width); ?>px !important;
        }
        <?php endif; ?>
    </style>
    <?php
}
add_action('wp_head', 'daadvracht_customizer_css', 100);

/**
 * Customizer live preview script
 */
function daadvracht_customizer_preview_js() {
    wp_enqueue_script(
        'daadvracht-customizer-preview',
        get_template_directory_uri() . '/assets/js/customizer-preview.js',
        array('customize-preview', 'jquery'),
        wp_get_theme()->get('Version'),
        true
    );
}
add_action('customize_preview_init', 'daadvracht_customizer_preview_js');

/**
 * Helper function to get theme option
 */
function daadvracht_get_option($option, $default = '') {
    return get_theme_mod($option, $default);
}

/**
 * SVG Icons helper function using Lucide Icons
 * Returns an <i> tag that Lucide.js will convert to SVG client-side
 * This approach avoids server-side SVG stripping by security plugins
 */
function daadvracht_get_svg_icon($icon, $size = 24) {
    // Map internal icon names to Lucide icon names
    $icon_map = array(
        'package'      => 'package',
        'menu'         => 'menu',
        'close'        => 'x',
        'check-circle' => 'check-circle',
        'arrow-right'  => 'arrow-right',
        'home'         => 'home',
        'heart'        => 'heart',
        'clock'        => 'clock',
        'brush'        => 'paintbrush',
        'trash'        => 'trash-2',
        'briefcase'    => 'briefcase',
        'star'         => 'star',
        'star-filled'  => 'star',
        'quote'        => 'quote',
        'message'      => 'message-square',
        'sparkles'     => 'sparkles',
        'mail'         => 'mail',
        'phone'        => 'phone',
        'map-pin'      => 'map-pin',
        'linkedin'     => 'linkedin',
        'facebook'     => 'facebook',
    );

    $lucide_icon = isset($icon_map[$icon]) ? $icon_map[$icon] : $icon;
    $fill = ($icon === 'star-filled') ? 'currentColor' : 'none';

    return sprintf(
        '<i data-lucide="%s" class="lucide-icon" style="width:%dpx;height:%dpx;"></i>',
        esc_attr($lucide_icon),
        intval($size),
        intval($size)
    );
}

/**
 * Disable emoji scripts
 */
function daadvracht_disable_emojis() {
    remove_action('wp_head', 'print_emoji_detection_script', 7);
    remove_action('admin_print_scripts', 'print_emoji_detection_script');
    remove_action('wp_print_styles', 'print_emoji_styles');
    remove_action('admin_print_styles', 'print_emoji_styles');
    remove_filter('the_content_feed', 'wp_staticize_emoji');
    remove_filter('comment_text_rss', 'wp_staticize_emoji');
    remove_filter('wp_mail', 'wp_staticize_emoji_for_email');
}
add_action('init', 'daadvracht_disable_emojis');

/**
 * Create assets directory
 */
function daadvracht_create_assets_directory() {
    $js_dir = get_template_directory() . '/assets/js';
    if (!file_exists($js_dir)) {
        wp_mkdir_p($js_dir);
    }
}
add_action('after_switch_theme', 'daadvracht_create_assets_directory');

/**
 * ============================================
 * SHORTCODES FOR HOMEPAGE SECTIONS
 * ============================================
 * Use these shortcodes in the WordPress editor to add sections:
 * [daadvracht_hero]
 * [daadvracht_services]
 * [daadvracht_werkwijze]
 * [daadvracht_contact]
 * [daadvracht_testimonials]
 * [daadvracht_region]
 */

/**
 * Hero Section Shortcode
 */
function daadvracht_hero_shortcode($atts) {
    ob_start();
    ?>
    <section class="hero">
        <div class="container">
            <div class="hero-content">
                <div class="hero-text">
                    <div class="hero-badge">
                        <span class="pulse"></span>
                        <?php esc_html_e('Actief in regio Breda - Tilburg', 'daadvracht'); ?>
                    </div>

                    <h1>
                        <?php esc_html_e('Snel & Discreet', 'daadvracht'); ?><br>
                        <span class="gradient-text"><?php esc_html_e('Woningontruiming.', 'daadvracht'); ?></span>
                    </h1>

                    <p class="hero-description">
                        <?php
                        $description = daadvracht_get_option('daadvracht_hero_description', 'De zorgzame partner voor ontruimingen en seniorenverhuizingen. Wij leveren uw woning gegarandeerd <strong>bezemschoon</strong> op.');
                        echo wp_kses_post($description);
                        ?>
                    </p>

                    <div class="hero-features">
                        <?php
                        $features = array(
                            __('Volledige ontzorging na overlijden', 'daadvracht'),
                            __('Seniorenverhuizing naar zorgcentrum', 'daadvracht'),
                            __('Bezemschone oplevering voor makelaars', 'daadvracht'),
                        );
                        foreach ($features as $feature) :
                        ?>
                            <div class="hero-feature">
                                <?php echo daadvracht_get_svg_icon('check-circle'); ?>
                                <span><?php echo esc_html($feature); ?></span>
                            </div>
                        <?php endforeach; ?>
                    </div>

                    <div class="hero-buttons">
                        <a href="#offerte" class="btn-primary">
                            <?php esc_html_e('Start de Intake', 'daadvracht'); ?>
                            <?php echo daadvracht_get_svg_icon('arrow-right'); ?>
                        </a>
                        <a href="tel:<?php echo esc_attr(preg_replace('/[^0-9+]/', '', daadvracht_get_option('daadvracht_phone', '+31101234567'))); ?>" class="btn-secondary">
                            <?php esc_html_e('Bel direct', 'daadvracht'); ?>
                        </a>
                    </div>
                </div>

                <div class="hero-image">
                    <div class="hero-image-wrapper">
                        <?php
                        $hero_image = daadvracht_get_option('daadvracht_hero_image', '');
                        if ($hero_image) :
                        ?>
                            <img src="<?php echo esc_url($hero_image); ?>" alt="<?php esc_attr_e('Verhuizers aan het werk', 'daadvracht'); ?>">
                        <?php else : ?>
                            <img src="https://images.unsplash.com/photo-1581578731117-10452a792edd?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" alt="<?php esc_attr_e('Verhuizers aan het werk', 'daadvracht'); ?>">
                        <?php endif; ?>
                        <div class="hero-image-overlay">
                            <div class="hero-review-badge">
                                <p>"<?php esc_html_e('Binnen 48 uur geregeld', 'daadvracht'); ?>"</p>
                                <div class="stars">
                                    <?php for ($i = 0; $i < 5; $i++) : ?>
                                        <i data-lucide="star" class="lucide-icon star-filled" style="width:18px;height:18px;"></i>
                                    <?php endfor; ?>
                                    <span class="review-count">(128 reviews)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
    <?php
    return ob_get_clean();
}
add_shortcode('daadvracht_hero', 'daadvracht_hero_shortcode');

/**
 * Services Section Shortcode
 */
function daadvracht_services_shortcode($atts) {
    ob_start();
    ?>
    <section id="diensten" class="services">
        <div class="container">
            <div class="section-header">
                <span class="section-label"><?php esc_html_e('Onze Diensten', 'daadvracht'); ?></span>
                <h2 class="section-title"><?php esc_html_e('Van A tot Z geregeld', 'daadvracht'); ?></h2>
                <p class="section-description">
                    <?php esc_html_e('Of het nu gaat om een emotionele boedelruiming of een praktische bedrijfsontruiming in Brabant: wij nemen de zorg uit handen.', 'daadvracht'); ?>
                </p>
            </div>

            <div class="services-grid">
                <?php
                $services = array(
                    array('icon' => 'home', 'title' => __('Woningontruiming', 'daadvracht'), 'description' => __('Totaaloplossing voor het leegruimen van woningen na overlijden of verhuizing. Wij zorgen voor een respectvolle afhandeling.', 'daadvracht')),
                    array('icon' => 'heart', 'title' => __('Seniorenverhuizing', 'daadvracht'), 'description' => __('Zorgzame verhuizing van groot naar klein, bijvoorbeeld naar een zorgcentrum. Wij helpen met inpakken en monteren.', 'daadvracht')),
                    array('icon' => 'clock', 'title' => __('Spoedontruiming', 'daadvracht'), 'description' => __('Moet de woning binnen 24 of 48 uur leeg? Ons calamiteitenteam staat paraat in regio Brabant.', 'daadvracht')),
                    array('icon' => 'brush', 'title' => __('Bezemschoon Opleveren', 'daadvracht'), 'description' => __('Wij garanderen de eindinspectie. Inclusief gaatjes dichten, vloeren verwijderen en schoonmaakwerk.', 'daadvracht')),
                    array('icon' => 'trash', 'title' => __('Afval & Hergebruik', 'daadvracht'), 'description' => __('Duurzame afvoer van inboedel. Bruikbare spullen gaan naar de kringloop, de rest wordt milieubewust gerecycled.', 'daadvracht')),
                    array('icon' => 'briefcase', 'title' => __('Zakelijke Ontruiming', 'daadvracht'), 'description' => __('Voor woningcorporaties, makelaars en notarissen. Efficient ontruimen van huurwoningen en bedrijfspanden.', 'daadvracht')),
                );

                foreach ($services as $service) :
                ?>
                    <div class="service-card">
                        <div class="service-icon">
                            <?php echo daadvracht_get_svg_icon($service['icon']); ?>
                        </div>
                        <h3><?php echo esc_html($service['title']); ?></h3>
                        <p><?php echo esc_html($service['description']); ?></p>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>
    </section>
    <?php
    return ob_get_clean();
}
add_shortcode('daadvracht_services', 'daadvracht_services_shortcode');

/**
 * Werkwijze Section Shortcode
 */
function daadvracht_werkwijze_shortcode($atts) {
    ob_start();
    ?>
    <section id="werkwijze" class="werkwijze">
        <div class="container">
            <div class="werkwijze-content">
                <div class="werkwijze-image">
                    <div class="werkwijze-image-wrapper">
                        <img src="https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="<?php esc_attr_e('Bezemschoon opleveren', 'daadvracht'); ?>">
                        <div class="werkwijze-image-overlay">
                            <span><?php esc_html_e('Zorgzaam & Respectvol', 'daadvracht'); ?></span>
                        </div>
                    </div>
                </div>

                <div class="werkwijze-text">
                    <span class="section-label"><?php esc_html_e('Onze Werkwijze', 'daadvracht'); ?></span>
                    <h3><?php esc_html_e('Volledige ontzorging in regio Breda-Tilburg', 'daadvracht'); ?></h3>
                    <p><?php esc_html_e('Wij begrijpen dat een ontruiming vaak gepaard gaat met emotie of stress. Daadvracht is uw betrouwbare partner die niet alleen sjouwt, maar ook ontzorgt.', 'daadvracht'); ?></p>

                    <div class="werkwijze-features">
                        <?php
                        $items = array(
                            array('title' => __('Bezemschoon Garantie', 'daadvracht'), 'desc' => __('Wij vertrekken pas als de woning voldoet aan de eisen van de verhuurder.', 'daadvracht')),
                            array('title' => __('Respectvolle Omgang', 'daadvracht'), 'desc' => __('Waardevolle en emotionele spullen worden met zorg behandeld.', 'daadvracht')),
                            array('title' => __('Een Aanspreekpunt', 'daadvracht'), 'desc' => __('Persoonlijk contact met een vaste planner uit de regio.', 'daadvracht')),
                        );
                        foreach ($items as $item) :
                        ?>
                            <div class="werkwijze-feature">
                                <div class="dot"></div>
                                <div>
                                    <h4><?php echo esc_html($item['title']); ?></h4>
                                    <p><?php echo esc_html($item['desc']); ?></p>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                </div>
            </div>
        </div>
    </section>
    <?php
    return ob_get_clean();
}
add_shortcode('daadvracht_werkwijze', 'daadvracht_werkwijze_shortcode');

/**
 * Contact Form Section Shortcode
 */
function daadvracht_contact_shortcode($atts) {
    ob_start();
    ?>
    <section id="offerte" class="contact-form-section">
        <div class="container">
            <div class="contact-content">
                <div class="contact-info">
                    <span class="section-label"><?php esc_html_e('Offerte Aanvragen', 'daadvracht'); ?></span>
                    <h3><?php esc_html_e('Vertel ons wat er moet gebeuren.', 'daadvracht'); ?></h3>
                    <p><?php esc_html_e('Geen ingewikkelde formulieren. Beschrijf gewoon uw situatie. Wij nemen binnen 24 uur contact met u op voor een vrijblijvende offerte.', 'daadvracht'); ?></p>

                    <div class="contact-steps">
                        <div class="contact-step">
                            <div class="contact-step-icon">
                                <?php echo daadvracht_get_svg_icon('message'); ?>
                            </div>
                            <div>
                                <h4><?php esc_html_e('1. U vertelt het verhaal', 'daadvracht'); ?></h4>
                                <p><?php esc_html_e('In uw eigen woorden, via het formulier.', 'daadvracht'); ?></p>
                            </div>
                        </div>
                        <div class="contact-step">
                            <div class="contact-step-icon">
                                <?php echo daadvracht_get_svg_icon('sparkles'); ?>
                            </div>
                            <div>
                                <h4><?php esc_html_e('2. Wij analyseren', 'daadvracht'); ?></h4>
                                <p><?php esc_html_e('We filteren direct de belangrijke details.', 'daadvracht'); ?></p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="contact-form-wrapper">
                    <div class="contact-form">
                        <?php echo daadvracht_render_contact_form(); ?>
                    </div>
                </div>
            </div>
        </div>
    </section>
    <?php
    return ob_get_clean();
}
add_shortcode('daadvracht_contact', 'daadvracht_contact_shortcode');

/**
 * Render Contact Form (works with or without Contact Form 7)
 */
function daadvracht_render_contact_form() {
    ob_start();

    // Check if Contact Form 7 is active
    if (class_exists('WPCF7_ContactForm')) {
        $forms = WPCF7_ContactForm::find();
        if (!empty($forms)) {
            echo do_shortcode('[contact-form-7 id="' . $forms[0]->id() . '"]');
            return ob_get_clean();
        }
    }

    // Default form fallback
    ?>
    <form action="<?php echo esc_url(admin_url('admin-post.php')); ?>" method="post">
        <input type="hidden" name="action" value="daadvracht_contact_form">
        <?php wp_nonce_field('daadvracht_contact_nonce', 'daadvracht_nonce'); ?>

        <label for="message"><?php esc_html_e('Hoe kunnen we u helpen?', 'daadvracht'); ?></label>
        <textarea
            id="message"
            name="message"
            placeholder="<?php esc_attr_e('Bijv: Ik zoek een ontruimer voor een eengezinswoning in Breda. Het moet volgende week leeg zijn. Er ligt veel vloerbedekking...', 'daadvracht'); ?>"
            required
        ></textarea>

        <div class="form-row">
            <div class="form-group">
                <label for="name"><?php esc_html_e('Uw naam', 'daadvracht'); ?></label>
                <input type="text" id="name" name="name" required>
            </div>
            <div class="form-group">
                <label for="phone"><?php esc_html_e('Telefoonnummer', 'daadvracht'); ?></label>
                <input type="tel" id="phone" name="phone">
            </div>
        </div>

        <div class="form-group">
            <label for="email"><?php esc_html_e('E-mailadres', 'daadvracht'); ?></label>
            <input type="email" id="email" name="email" placeholder="uw@email.nl" required>
        </div>

        <button type="submit" class="btn-submit">
            <?php echo daadvracht_get_svg_icon('sparkles'); ?>
            <?php esc_html_e('Verstuur aanvraag', 'daadvracht'); ?>
            <?php echo daadvracht_get_svg_icon('arrow-right'); ?>
        </button>
    </form>
    <?php
    return ob_get_clean();
}

/**
 * Testimonials Section Shortcode
 */
function daadvracht_testimonials_shortcode($atts) {
    ob_start();
    ?>
    <section class="testimonials">
        <div class="container">
            <div class="section-header">
                <h2 class="section-title"><?php esc_html_e('Ervaringen uit de regio', 'daadvracht'); ?></h2>
            </div>

            <div class="testimonials-grid">
                <?php
                $reviews = array(
                    array('name' => 'Fam. van den Berg', 'city' => 'Breda', 'text' => __('Na het overlijden van vader zagen we enorm op tegen de ontruiming. Daadvracht heeft dit zo respectvol opgepakt. Het huis was binnen 2 dagen bezemschoon voor de makelaar.', 'daadvracht'), 'rating' => 5),
                    array('name' => 'Mevr. de Jong', 'city' => 'Tilburg', 'text' => __('Verhuisd naar een seniorenwoning. De mannen hebben niet alleen gesjouwd, maar ook mijn lampen opgehangen in het nieuwe appartement. Geweldige service!', 'daadvracht'), 'rating' => 5),
                    array('name' => 'Woningcorporatie Zuid', 'city' => 'Oosterhout', 'text' => __('Wij huren Daadvracht regelmatig in voor spoedontruimingen. Altijd afspraak is afspraak en keurig netjes opgeleverd volgens onze eisen.', 'daadvracht'), 'rating' => 4),
                );

                foreach ($reviews as $review) :
                ?>
                    <div class="testimonial-card">
                        <div class="testimonial-quote-icon">
                            <?php echo daadvracht_get_svg_icon('quote'); ?>
                        </div>
                        <div class="testimonial-stars">
                            <?php
                            for ($i = 1; $i <= 5; $i++) {
                                $class = ($i <= $review['rating']) ? 'star-filled' : 'star-empty';
                                echo '<i data-lucide="star" class="lucide-icon ' . $class . '" style="width:18px;height:18px;"></i>';
                            }
                            ?>
                        </div>
                        <p class="testimonial-text">"<?php echo esc_html($review['text']); ?>"</p>
                        <div class="testimonial-author">
                            <div class="testimonial-avatar"><?php echo esc_html(substr($review['name'], 0, 1)); ?></div>
                            <div class="testimonial-author-info">
                                <span class="name"><?php echo esc_html($review['name']); ?></span>
                                <span class="city"><?php echo esc_html($review['city']); ?></span>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>
    </section>
    <?php
    return ob_get_clean();
}
add_shortcode('daadvracht_testimonials', 'daadvracht_testimonials_shortcode');

/**
 * Region Banner Shortcode
 */
function daadvracht_region_shortcode($atts) {
    ob_start();
    ?>
    <section id="werkgebied" class="region-banner">
        <div class="container">
            <h3><?php esc_html_e('Actief in heel Noord-Brabant', 'daadvracht'); ?></h3>
            <p><?php esc_html_e('Van Breda tot Tilburg, Oosterhout, Etten-Leur en Roosendaal.', 'daadvracht'); ?></p>
            <div class="region-tags">
                <?php
                $cities = array('Breda', 'Tilburg', 'Oosterhout', 'Roosendaal', 'Etten-Leur', 'Dongen', 'Gilze-Rijen');
                foreach ($cities as $city) :
                ?>
                    <span class="region-tag"><?php echo esc_html($city); ?></span>
                <?php endforeach; ?>
            </div>
        </div>
    </section>
    <?php
    return ob_get_clean();
}
add_shortcode('daadvracht_region', 'daadvracht_region_shortcode');

/**
 * ============================================
 * SEO CONTENT STYLER INTEGRATION
 * ============================================
 */

/**
 * Enqueue SEO content styles and scripts
 */
function daadvracht_enqueue_seo_content_assets() {
    // Check if this is an SEO styled post or using SEO template
    $is_seo_content = false;

    if (is_singular()) {
        $is_seo_content = get_post_meta(get_the_ID(), '_ctcs_styled', true);

        // Also check if using SEO article template
        $template = get_page_template_slug();
        if ($template === 'template-seo-article.php') {
            $is_seo_content = true;
        }
    }

    if ($is_seo_content) {
        // Enqueue SEO content CSS
        wp_enqueue_style(
            'daadvracht-seo-content',
            get_template_directory_uri() . '/css/seo-content.css',
            array('daadvracht-style'),
            wp_get_theme()->get('Version')
        );

        // Enqueue SEO enhancements JS
        wp_enqueue_script(
            'daadvracht-seo-enhancements',
            get_template_directory_uri() . '/js/seo-enhancements.js',
            array(),
            wp_get_theme()->get('Version'),
            true
        );
    }
}
add_action('wp_enqueue_scripts', 'daadvracht_enqueue_seo_content_assets');

/**
 * Calculate reading time for posts
 *
 * @param int $post_id Optional post ID
 * @return string Reading time string
 */
function daadvracht_reading_time($post_id = null) {
    if (!$post_id) {
        $post_id = get_the_ID();
    }

    $content = get_post_field('post_content', $post_id);
    $word_count = str_word_count(strip_tags($content));
    $reading_time = ceil($word_count / 200); // Average reading speed

    if ($reading_time < 1) {
        $reading_time = 1;
    }

    return sprintf(
        _n('%d min leestijd', '%d min leestijd', $reading_time, 'daadvracht'),
        $reading_time
    );
}

/**
 * Add body class for SEO styled content
 */
function daadvracht_seo_body_class($classes) {
    if (is_singular()) {
        $is_seo_styled = get_post_meta(get_the_ID(), '_ctcs_styled', true);
        $template = get_page_template_slug();

        if ($is_seo_styled || $template === 'template-seo-article.php') {
            $classes[] = 'seo-styled-content';
        }
    }

    return $classes;
}
add_filter('body_class', 'daadvracht_seo_body_class');

/**
 * Add SEO article template to single posts
 */
function daadvracht_add_post_templates($templates) {
    $templates['template-seo-article.php'] = __('SEO Article', 'daadvracht');
    return $templates;
}
add_filter('theme_post_templates', 'daadvracht_add_post_templates');

/**
 * Automatically apply SEO template to styled posts
 */
function daadvracht_auto_apply_seo_template($template) {
    if (is_singular('post')) {
        $is_seo_styled = get_post_meta(get_the_ID(), '_ctcs_styled', true);

        if ($is_seo_styled) {
            $seo_template = locate_template('template-seo-article.php');
            if ($seo_template) {
                return $seo_template;
            }
        }
    }

    return $template;
}
add_filter('single_template', 'daadvracht_auto_apply_seo_template');
