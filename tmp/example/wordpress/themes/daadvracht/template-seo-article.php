<?php
/**
 * Template Name: SEO Article
 * Template Post Type: post, page
 *
 * Enhanced template for SEO-optimized articles with:
 * - Hero section
 * - Sticky sidebar ToC
 * - Section cards
 * - FAQ accordion
 * - CTA blocks
 *
 * @package Daadvracht
 */

get_header();

// Check if this is styled content
$is_styled = get_post_meta(get_the_ID(), '_ctcs_styled', true);
?>

<main class="seo-page">
    <?php while (have_posts()) : the_post(); ?>

        <!-- Hero Section -->
        <section class="seo-hero">
            <div class="seo-hero__background">
                <?php if (has_post_thumbnail()): ?>
                    <?php the_post_thumbnail('full', ['class' => 'seo-hero__image']); ?>
                <?php endif; ?>
                <div class="seo-hero__overlay"></div>
            </div>
            <div class="container">
                <div class="seo-hero__content">
                    <?php if (has_category()): ?>
                        <div class="seo-hero__category">
                            <?php the_category(', '); ?>
                        </div>
                    <?php endif; ?>

                    <h1 class="seo-hero__title"><?php the_title(); ?></h1>

                    <?php
                    $meta_desc = get_post_meta(get_the_ID(), '_ctcs_meta_description', true);
                    if ($meta_desc):
                    ?>
                        <p class="seo-hero__description"><?php echo esc_html($meta_desc); ?></p>
                    <?php endif; ?>

                    <div class="seo-hero__meta">
                        <time datetime="<?php echo get_the_date('c'); ?>">
                            <?php echo get_the_date(); ?>
                        </time>
                        <span class="seo-hero__reading-time">
                            <?php echo daadvracht_reading_time(); ?>
                        </span>
                    </div>
                </div>
            </div>
        </section>

        <!-- Article Content with Sidebar -->
        <div class="seo-article-wrapper">
            <!-- Sticky Sidebar ToC -->
            <aside class="seo-toc" id="seo-toc">
                <div class="seo-toc__inner">
                    <div class="seo-toc__title"><?php esc_html_e('Inhoud', 'daadvracht'); ?></div>
                    <nav class="seo-toc__nav">
                        <ul class="seo-toc__list" id="seo-toc-list">
                            <!-- Populated by JavaScript -->
                        </ul>
                    </nav>

                    <!-- CTA Box -->
                    <div class="seo-toc__cta">
                        <h4 class="seo-toc__cta-title"><?php esc_html_e('Hulp nodig?', 'daadvracht'); ?></h4>
                        <p class="seo-toc__cta-text"><?php esc_html_e('Neem vrijblijvend contact met ons op.', 'daadvracht'); ?></p>
                        <a href="<?php echo esc_url(home_url('/contact')); ?>" class="seo-toc__cta-button">
                            <?php esc_html_e('Contact opnemen', 'daadvracht'); ?>
                        </a>
                    </div>
                </div>
            </aside>

            <!-- Main Article -->
            <article id="post-<?php the_ID(); ?>" <?php post_class('seo-article'); ?>>
                <div class="seo-article__content article-content">
                    <?php the_content(); ?>
                </div>

                <!-- Article Footer -->
                <footer class="seo-article__footer">
                    <?php if (has_tag()): ?>
                        <div class="seo-article__tags">
                            <span class="seo-article__tags-label"><?php esc_html_e('Tags:', 'daadvracht'); ?></span>
                            <?php the_tags('', ', ', ''); ?>
                        </div>
                    <?php endif; ?>

                    <!-- Author Box -->
                    <div class="seo-author-box">
                        <div class="seo-author-box__avatar">
                            <?php echo get_avatar(get_the_author_meta('ID'), 80); ?>
                        </div>
                        <div class="seo-author-box__info">
                            <span class="seo-author-box__label"><?php esc_html_e('Geschreven door', 'daadvracht'); ?></span>
                            <span class="seo-author-box__name"><?php the_author(); ?></span>
                            <?php if (get_the_author_meta('description')): ?>
                                <p class="seo-author-box__bio"><?php the_author_meta('description'); ?></p>
                            <?php endif; ?>
                        </div>
                    </div>

                    <!-- Post Navigation -->
                    <?php
                    the_post_navigation(array(
                        'prev_text' => '<span class="nav-label">' . __('Vorige artikel', 'daadvracht') . '</span><span class="nav-title">%title</span>',
                        'next_text' => '<span class="nav-label">' . __('Volgende artikel', 'daadvracht') . '</span><span class="nav-title">%title</span>',
                    ));
                    ?>
                </footer>
            </article>
        </div>

        <!-- Final CTA Section -->
        <section class="seo-final-cta">
            <div class="container">
                <div class="seo-final-cta__content">
                    <h2 class="seo-final-cta__title"><?php esc_html_e('Vragen over dit artikel?', 'daadvracht'); ?></h2>
                    <p class="seo-final-cta__text"><?php esc_html_e('Onze experts helpen u graag verder. Neem vrijblijvend contact met ons op.', 'daadvracht'); ?></p>
                    <div class="seo-final-cta__buttons">
                        <a href="<?php echo esc_url(home_url('/contact')); ?>" class="btn-primary">
                            <?php esc_html_e('Neem contact op', 'daadvracht'); ?>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                <polyline points="12 5 19 12 12 19"></polyline>
                            </svg>
                        </a>
                        <a href="tel:<?php echo esc_attr(preg_replace('/[^0-9+]/', '', get_theme_mod('daadvracht_phone', '+31101234567'))); ?>" class="btn-secondary">
                            <?php esc_html_e('Bel direct', 'daadvracht'); ?>
                        </a>
                    </div>
                </div>
            </div>
        </section>

    <?php endwhile; ?>
</main>

<!-- Reading Progress Bar -->
<div class="seo-reading-progress" id="seo-reading-progress"></div>

<?php
get_footer();
