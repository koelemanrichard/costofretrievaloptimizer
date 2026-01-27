<?php
/**
 * The template for displaying all pages
 *
 * @package Daadvracht
 */

get_header();
?>

<main class="page-content">
    <?php while (have_posts()) : the_post(); ?>

        <?php
        // Check if this is a full-width Elementor page
        $is_elementor = (class_exists('Elementor\Plugin') && Elementor\Plugin::$instance->documents->get(get_the_ID())->is_built_with_elementor());
        $is_homepage = is_front_page();

        if ($is_elementor || $is_homepage) :
            // Elementor or homepage - no wrapper needed
        ?>
            <article id="page-<?php the_ID(); ?>" <?php post_class(); ?>>
                <div class="entry-content">
                    <?php the_content(); ?>
                </div>
            </article>

        <?php else :
            // Regular page with article layout + ToC
        ?>
            <div class="article-wrapper">
                <!-- Table of Contents Sidebar -->
                <aside class="article-toc">
                    <div class="article-toc-title">Inhoud</div>
                    <ul class="article-toc-list">
                        <!-- Populated by JavaScript -->
                    </ul>
                </aside>

                <!-- Main Article Content -->
                <article id="page-<?php the_ID(); ?>" <?php post_class('article-content'); ?>>
                    <h1><?php the_title(); ?></h1>

                    <div class="entry-content">
                        <?php the_content(); ?>
                    </div>
                </article>
            </div>

        <?php endif; ?>

    <?php endwhile; ?>
</main>

<?php
get_footer();
