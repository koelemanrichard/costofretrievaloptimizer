<?php
/**
 * The template for displaying single posts
 *
 * @package Daadvracht
 */

get_header();
?>

<main class="page-content">
    <?php while (have_posts()) : the_post(); ?>

        <div class="article-wrapper">
            <!-- Table of Contents Sidebar -->
            <aside class="article-toc">
                <div class="article-toc-title">Inhoud</div>
                <ul class="article-toc-list">
                    <!-- Populated by JavaScript -->
                </ul>
            </aside>

            <!-- Main Article Content -->
            <article id="post-<?php the_ID(); ?>" <?php post_class('article-content'); ?>>
                <header class="article-header">
                    <h1><?php the_title(); ?></h1>
                    <div class="article-meta">
                        <time datetime="<?php echo get_the_date('c'); ?>">
                            <?php echo get_the_date(); ?>
                        </time>
                        <?php if (has_category()) : ?>
                            <span class="separator">|</span>
                            <?php the_category(', '); ?>
                        <?php endif; ?>
                    </div>
                </header>

                <?php if (has_post_thumbnail()) : ?>
                    <figure class="article-featured-image">
                        <?php the_post_thumbnail('large'); ?>
                    </figure>
                <?php endif; ?>

                <div class="entry-content">
                    <?php the_content(); ?>
                </div>

                <footer class="article-footer">
                    <?php
                    the_post_navigation(array(
                        'prev_text' => '<span class="nav-label">' . __('Vorige', 'daadvracht') . '</span><span class="nav-title">%title</span>',
                        'next_text' => '<span class="nav-label">' . __('Volgende', 'daadvracht') . '</span><span class="nav-title">%title</span>',
                    ));
                    ?>
                </footer>
            </article>
        </div>

    <?php endwhile; ?>
</main>

<?php
get_footer();
