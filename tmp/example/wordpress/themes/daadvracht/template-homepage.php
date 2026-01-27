<?php
/**
 * Template Name: Homepage
 * Template Post Type: page
 *
 * This is the homepage template.
 * Edit this page in WordPress to add/remove/reorder sections using shortcodes.
 *
 * Available shortcodes:
 * [daadvracht_hero]        - Hero banner section
 * [daadvracht_services]    - Services grid section
 * [daadvracht_werkwijze]   - Why choose us section
 * [daadvracht_contact]     - Contact form section
 * [daadvracht_testimonials]- Testimonials section
 * [daadvracht_region]      - Region banner section
 *
 * @package Daadvracht
 */

get_header();
?>

<main class="homepage-content">
    <?php
    while (have_posts()) :
        the_post();

        // Get page content
        $content = get_the_content();

        // If page content is empty, show default sections
        if (empty(trim(strip_tags($content)))) {
            // Default homepage layout
            echo do_shortcode('[daadvracht_hero]');
            echo do_shortcode('[daadvracht_services]');
            echo do_shortcode('[daadvracht_werkwijze]');
            echo do_shortcode('[daadvracht_contact]');
            echo do_shortcode('[daadvracht_testimonials]');
            echo do_shortcode('[daadvracht_region]');
        } else {
            // User has added custom content - process shortcodes
            // Remove wpautop to prevent gaps between sections
            remove_filter('the_content', 'wpautop');

            // Get content and process shortcodes
            $content = apply_filters('the_content', get_the_content());

            // Clean up any remaining whitespace/empty tags between sections
            $content = preg_replace('/<p>\s*<\/p>/', '', $content);
            $content = preg_replace('/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/', '', $content);
            $content = preg_replace('/(<\/section>)\s*(<section)/', '$1$2', $content);

            echo $content;

            // Re-add wpautop for other content
            add_filter('the_content', 'wpautop');
        }
    endwhile;
    ?>
</main>

<?php
get_footer();
