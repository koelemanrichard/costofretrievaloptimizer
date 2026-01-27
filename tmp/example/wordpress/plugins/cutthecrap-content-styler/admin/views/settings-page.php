<?php
/**
 * Settings Page Template
 *
 * @package CutTheCrap_Content_Styler
 */

if (!defined('ABSPATH')) {
    exit;
}

// Save message
$saved = isset($_GET['settings-updated']);
?>

<div class="wrap ctcs-wrap">
    <h1 class="ctcs-page-title">
        <span class="dashicons dashicons-admin-settings"></span>
        <?php esc_html_e('Content Styler Instellingen', 'cutthecrap-content-styler'); ?>
    </h1>

    <?php if ($saved): ?>
        <div class="notice notice-success is-dismissible">
            <p><?php esc_html_e('Instellingen opgeslagen.', 'cutthecrap-content-styler'); ?></p>
        </div>
    <?php endif; ?>

    <div class="ctcs-container ctcs-container--narrow">
        <form method="post" action="options.php">
            <?php settings_fields('ctcs_settings'); ?>

            <div class="ctcs-card">
                <h2><?php esc_html_e('Algemene Instellingen', 'cutthecrap-content-styler'); ?></h2>

                <table class="form-table">
                    <tr>
                        <th scope="row">
                            <?php esc_html_e('Automatische styling', 'cutthecrap-content-styler'); ?>
                        </th>
                        <td>
                            <label>
                                <input type="checkbox" name="ctcs_auto_style_enabled" value="1"
                                    <?php checked(get_option('ctcs_auto_style_enabled', true)); ?>>
                                <?php esc_html_e('Automatisch styling toepassen op geimporteerde content', 'cutthecrap-content-styler'); ?>
                            </label>
                            <p class="description">
                                <?php esc_html_e('Wanneer ingeschakeld, worden geimporteerde posts automatisch gestyled op de frontend.', 'cutthecrap-content-styler'); ?>
                            </p>
                        </td>
                    </tr>
                </table>
            </div>

            <div class="ctcs-card">
                <h2><?php esc_html_e('Kleuren', 'cutthecrap-content-styler'); ?></h2>

                <table class="form-table">
                    <tr>
                        <th scope="row">
                            <label for="ctcs_accent_color"><?php esc_html_e('Accent kleur', 'cutthecrap-content-styler'); ?></label>
                        </th>
                        <td>
                            <input type="text" name="ctcs_accent_color" id="ctcs_accent_color"
                                value="<?php echo esc_attr(get_option('ctcs_accent_color', '#ea580c')); ?>"
                                class="ctcs-color-picker">
                            <p class="description">
                                <?php esc_html_e('Hoofdkleur voor knoppen, links en accenten.', 'cutthecrap-content-styler'); ?>
                            </p>
                        </td>
                    </tr>
                </table>
            </div>

            <div class="ctcs-card">
                <h2><?php esc_html_e('Call-to-Action Instellingen', 'cutthecrap-content-styler'); ?></h2>

                <table class="form-table">
                    <tr>
                        <th scope="row">
                            <label for="ctcs_cta_text"><?php esc_html_e('CTA Tekst', 'cutthecrap-content-styler'); ?></label>
                        </th>
                        <td>
                            <input type="text" name="ctcs_cta_text" id="ctcs_cta_text"
                                value="<?php echo esc_attr(get_option('ctcs_cta_text', 'Neem contact op')); ?>"
                                class="regular-text">
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">
                            <label for="ctcs_cta_url"><?php esc_html_e('CTA URL', 'cutthecrap-content-styler'); ?></label>
                        </th>
                        <td>
                            <input type="url" name="ctcs_cta_url" id="ctcs_cta_url"
                                value="<?php echo esc_url(get_option('ctcs_cta_url', '/contact')); ?>"
                                class="regular-text">
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">
                            <label for="ctcs_cta_description"><?php esc_html_e('CTA Beschrijving', 'cutthecrap-content-styler'); ?></label>
                        </th>
                        <td>
                            <input type="text" name="ctcs_cta_description" id="ctcs_cta_description"
                                value="<?php echo esc_attr(get_option('ctcs_cta_description', 'Heeft u vragen of wilt u meer informatie? Wij helpen u graag verder.')); ?>"
                                class="large-text">
                            <p class="description">
                                <?php esc_html_e('Korte beschrijving die boven de CTA knop verschijnt.', 'cutthecrap-content-styler'); ?>
                            </p>
                        </td>
                    </tr>
                </table>
            </div>

            <div class="ctcs-card">
                <h2><?php esc_html_e('CutTheCrap Connector Integratie', 'cutthecrap-content-styler'); ?></h2>

                <?php if (class_exists('CutTheCrap_Connector')): ?>
                    <div class="ctcs-notice ctcs-notice--success">
                        <span class="dashicons dashicons-yes-alt"></span>
                        <?php esc_html_e('CutTheCrap Connector is actief. Content wordt automatisch gestyled bij import.', 'cutthecrap-content-styler'); ?>
                    </div>
                <?php else: ?>
                    <div class="ctcs-notice ctcs-notice--info">
                        <span class="dashicons dashicons-info"></span>
                        <?php esc_html_e('CutTheCrap Connector is niet geinstalleerd. Installeer de connector voor automatische content import.', 'cutthecrap-content-styler'); ?>
                    </div>
                <?php endif; ?>
            </div>

            <?php submit_button(__('Instellingen Opslaan', 'cutthecrap-content-styler')); ?>
        </form>
    </div>
</div>

<script>
jQuery(document).ready(function($) {
    // Initialize color picker
    if ($.fn.wpColorPicker) {
        $('.ctcs-color-picker').wpColorPicker();
    }
});
</script>
