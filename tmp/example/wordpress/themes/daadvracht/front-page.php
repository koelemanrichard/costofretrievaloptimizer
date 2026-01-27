<?php
/**
 * Front Page Template
 *
 * This template handles the front page display.
 * If a static page is set as the homepage, it will use that page's template.
 * Otherwise, it will display the blog posts.
 *
 * To set up your homepage:
 * 1. Create a new page (e.g., "Home")
 * 2. Assign the "Homepage" template to it
 * 3. Go to Settings > Reading
 * 4. Select "A static page" and choose your page as the homepage
 *
 * @package Daadvracht
 */

// If a static page is set as the front page, use its template
if (is_page()) {
    // Get the page template
    $template = get_page_template_slug();

    if ($template && locate_template($template)) {
        include(locate_template($template));
        return;
    }

    // If no custom template, use page.php
    get_template_part('page');
    return;
}

// Otherwise, display blog posts (for blog front page)
get_header();
?>

<main class="page-content blog-home">
    <div class="container">
        <?php if (have_posts()) : ?>
            <h1 class="page-title"><?php single_post_title(); ?></h1>

            <div class="posts-grid">
                <?php while (have_posts()) : the_post(); ?>
                    <article id="post-<?php the_ID(); ?>" <?php post_class('post-card'); ?>>
                        <?php if (has_post_thumbnail()) : ?>
                            <div class="post-thumbnail">
                                <a href="<?php the_permalink(); ?>">
                                    <?php the_post_thumbnail('medium_large'); ?>
                                </a>
                            </div>
                        <?php endif; ?>

                        <div class="post-content">
                            <h2 class="post-title">
                                <a href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
                            </h2>
                            <div class="post-meta">
                                <time datetime="<?php echo get_the_date('c'); ?>">
                                    <?php echo get_the_date(); ?>
                                </time>
                            </div>
                            <div class="post-excerpt">
                                <?php the_excerpt(); ?>
                            </div>
                            <a href="<?php the_permalink(); ?>" class="read-more">
                                <?php esc_html_e('Lees meer', 'daadvracht'); ?>
                                <?php echo daadvracht_get_svg_icon('arrow-right'); ?>
                            </a>
                        </div>
                    </article>
                <?php endwhile; ?>
            </div>

            <?php the_posts_navigation(); ?>

        <?php else : ?>
            <h1><?php esc_html_e('Geen berichten gevonden', 'daadvracht'); ?></h1>
            <p><?php esc_html_e('Er zijn nog geen berichten gepubliceerd.', 'daadvracht'); ?></p>
        <?php endif; ?>
    </div>
</main>

<?php
get_footer();
