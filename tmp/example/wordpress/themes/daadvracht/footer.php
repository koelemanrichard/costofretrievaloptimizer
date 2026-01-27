<footer class="site-footer">
    <div class="container">
        <div class="footer-grid">
            <!-- Brand Column -->
            <div class="footer-brand">
                <a href="<?php echo esc_url(home_url('/')); ?>" class="site-logo">
                    <div class="logo-icon">
                        <?php echo daadvracht_get_svg_icon('package'); ?>
                    </div>
                    <span class="brand-name">DAAD<span>VRACHT</span></span>
                </a>
                <p>
                    <?php esc_html_e('De specialist in woningontruiming en seniorenverhuizingen in Brabant. Wij werken discreet, respectvol en daadkrachtig.', 'daadvracht'); ?>
                </p>
                <div class="footer-social">
                    <?php $linkedin = daadvracht_get_option('daadvracht_linkedin', '#'); ?>
                    <?php if ($linkedin) : ?>
                        <a href="<?php echo esc_url($linkedin); ?>" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                            <?php echo daadvracht_get_svg_icon('linkedin'); ?>
                        </a>
                    <?php endif; ?>

                    <?php $facebook = daadvracht_get_option('daadvracht_facebook', '#'); ?>
                    <?php if ($facebook) : ?>
                        <a href="<?php echo esc_url($facebook); ?>" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                            <?php echo daadvracht_get_svg_icon('facebook'); ?>
                        </a>
                    <?php endif; ?>
                </div>
            </div>

            <!-- Quick Links -->
            <div class="footer-column">
                <h4><?php esc_html_e('Snel naar', 'daadvracht'); ?></h4>
                <ul>
                    <li><a href="<?php echo esc_url(home_url('/')); ?>"><?php esc_html_e('Home', 'daadvracht'); ?></a></li>
                    <li><a href="#diensten"><?php esc_html_e('Woningontruiming', 'daadvracht'); ?></a></li>
                    <li><a href="#werkwijze"><?php esc_html_e('Seniorenverhuizing', 'daadvracht'); ?></a></li>
                    <li><a href="#offerte"><?php esc_html_e('Offerte Aanvragen', 'daadvracht'); ?></a></li>
                </ul>
            </div>

            <!-- Services -->
            <div class="footer-column">
                <h4><?php esc_html_e('Diensten', 'daadvracht'); ?></h4>
                <ul>
                    <li><?php esc_html_e('Huis leeghalen na overlijden', 'daadvracht'); ?></li>
                    <li><?php esc_html_e('Spoedontruiming 24/7', 'daadvracht'); ?></li>
                    <li><?php esc_html_e('Vloerbedekking verwijderen', 'daadvracht'); ?></li>
                    <li><?php esc_html_e('Herstelwerkzaamheden', 'daadvracht'); ?></li>
                    <li><?php esc_html_e('Inboedel opkopen/afvoeren', 'daadvracht'); ?></li>
                </ul>
            </div>

            <!-- Contact -->
            <div class="footer-column" id="contact">
                <h4><?php esc_html_e('Contact', 'daadvracht'); ?></h4>

                <?php $address = daadvracht_get_option('daadvracht_address', 'Breda, Noord-Brabant'); ?>
                <div class="footer-contact-item">
                    <?php echo daadvracht_get_svg_icon('map-pin'); ?>
                    <span><?php esc_html_e('Hoofdvestiging', 'daadvracht'); ?><br><?php echo esc_html($address); ?></span>
                </div>

                <?php $phone = daadvracht_get_option('daadvracht_phone', '+31 (0)10 123 4567'); ?>
                <div class="footer-contact-item">
                    <?php echo daadvracht_get_svg_icon('phone'); ?>
                    <a href="tel:<?php echo esc_attr(preg_replace('/[^0-9+]/', '', $phone)); ?>"><?php echo esc_html($phone); ?></a>
                </div>

                <?php $email = daadvracht_get_option('daadvracht_email', 'info@daadvracht.nl'); ?>
                <div class="footer-contact-item">
                    <?php echo daadvracht_get_svg_icon('mail'); ?>
                    <a href="mailto:<?php echo esc_attr($email); ?>"><?php echo esc_html($email); ?></a>
                </div>
            </div>
        </div>

        <div class="footer-bottom">
            <p>&copy; <?php echo date('Y'); ?> <?php bloginfo('name'); ?>. <?php esc_html_e('Alle rechten voorbehouden.', 'daadvracht'); ?></p>
            <div class="footer-legal">
                <?php
                if (has_nav_menu('footer')) {
                    wp_nav_menu(array(
                        'theme_location' => 'footer',
                        'menu_class'     => '',
                        'container'      => false,
                        'fallback_cb'    => false,
                        'depth'          => 1,
                    ));
                } else {
                    ?>
                    <a href="#"><?php esc_html_e('Privacybeleid', 'daadvracht'); ?></a>
                    <a href="#"><?php esc_html_e('Algemene Voorwaarden', 'daadvracht'); ?></a>
                    <?php
                }
                ?>
            </div>
        </div>
    </div>
</footer>

<?php wp_footer(); ?>
</body>
</html>
