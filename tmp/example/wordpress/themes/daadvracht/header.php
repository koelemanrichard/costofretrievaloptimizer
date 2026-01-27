<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="profile" href="https://gmpg.org/xfn/11">
    <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>

<header class="site-header">
    <div class="container">
        <?php if (has_custom_logo()) : ?>
            <div class="site-logo custom-logo-wrapper">
                <?php the_custom_logo(); ?>
            </div>
        <?php else : ?>
            <a href="<?php echo esc_url(home_url('/')); ?>" class="site-logo" rel="home">
                <div class="logo-icon">
                    <?php echo daadvracht_get_svg_icon('package'); ?>
                </div>
                <div class="logo-text">
                    <span class="brand-name"><?php echo esc_html(daadvracht_get_option('daadvracht_logo_text_1', 'DAAD')); ?><span><?php echo esc_html(daadvracht_get_option('daadvracht_logo_text_2', 'VRACHT')); ?></span></span>
                    <span class="brand-tagline"><?php echo esc_html(daadvracht_get_option('daadvracht_logo_tagline', 'Ontruimingen')); ?></span>
                </div>
            </a>
        <?php endif; ?>

        <nav class="main-nav" role="navigation" aria-label="<?php esc_attr_e('Hoofdnavigatie', 'daadvracht'); ?>">
            <?php
            if (has_nav_menu('primary')) {
                wp_nav_menu(array(
                    'theme_location' => 'primary',
                    'menu_class'     => '',
                    'container'      => false,
                    'fallback_cb'    => false,
                    'depth'          => 1,
                ));
            } else {
                ?>
                <ul>
                    <li><a href="#diensten">Diensten</a></li>
                    <li><a href="#werkgebied">Werkgebied</a></li>
                    <li><a href="#over-ons">Over Ons</a></li>
                    <li><a href="#contact">Contact</a></li>
                </ul>
                <?php
            }
            ?>
            <a href="#offerte" class="btn-cta">Gratis Offerte</a>
        </nav>

        <button class="mobile-menu-toggle" aria-label="<?php esc_attr_e('Menu openen', 'daadvracht'); ?>" aria-expanded="false" aria-controls="mobile-menu">
            <span class="menu-icon"><?php echo daadvracht_get_svg_icon('menu'); ?></span>
            <span class="close-icon" style="display: none;"><?php echo daadvracht_get_svg_icon('close'); ?></span>
        </button>
    </div>

    <nav class="mobile-nav" id="mobile-menu" role="navigation" aria-label="<?php esc_attr_e('Mobiele navigatie', 'daadvracht'); ?>">
        <?php
        if (has_nav_menu('primary')) {
            wp_nav_menu(array(
                'theme_location' => 'primary',
                'menu_class'     => '',
                'container'      => false,
                'fallback_cb'    => false,
                'depth'          => 1,
            ));
        } else {
            ?>
            <ul>
                <li><a href="#diensten">Diensten</a></li>
                <li><a href="#werkgebied">Werkgebied</a></li>
                <li><a href="#over-ons">Over Ons</a></li>
                <li><a href="#contact">Contact</a></li>
            </ul>
            <?php
        }
        ?>
        <a href="#offerte" class="btn-cta">Gratis Offerte Aanvragen</a>
    </nav>
</header>
