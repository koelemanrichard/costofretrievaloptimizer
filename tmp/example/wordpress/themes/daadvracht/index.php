<?php
/**
 * The main template file
 *
 * @package Daadvracht
 */

get_header();
?>

<main class="page-content">
    <div class="container">
        <?php if (have_posts()) : ?>
            <?php if (is_home() && !is_front_page()) : ?>
                <h1><?php single_post_title(); ?></h1>
            <?php endif; ?>

            <?php while (have_posts()) : the_post(); ?>
                <article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
                    <header>
                        <?php if (is_singular()) : ?>
                            <h1><?php the_title(); ?></h1>
                        <?php else : ?>
                            <h2><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
                        <?php endif; ?>
                    </header>

                    <div class="entry-content">
                        <?php
                        if (is_singular()) {
                            the_content();
                        } else {
                            the_excerpt();
                        }
                        ?>
                    </div>
                </article>
            <?php endwhile; ?>

            <?php the_posts_navigation(); ?>

        <?php else : ?>
            <h1><?php esc_html_e('Niets gevonden', 'daadvracht'); ?></h1>
            <p><?php esc_html_e('Het lijkt erop dat we niet konden vinden wat u zocht.', 'daadvracht'); ?></p>
        <?php endif; ?>
    </div>
</main>

<?php
get_footer();
