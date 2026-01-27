<?php
/**
 * Import Page Template
 *
 * @package CutTheCrap_Content_Styler
 */

if (!defined('ABSPATH')) {
    exit;
}

// Get categories for dropdown
$categories = get_categories(['hide_empty' => false]);

// Get available post types (public ones that support editor)
$post_types = get_post_types([
    'public' => true,
    'show_ui' => true,
], 'objects');

// Filter to only include post types that support the editor
$available_post_types = [];
foreach ($post_types as $post_type) {
    if (post_type_supports($post_type->name, 'editor') && $post_type->name !== 'attachment') {
        $available_post_types[$post_type->name] = $post_type->label;
    }
}
?>

<div class="wrap ctcs-wrap">
    <h1 class="ctcs-page-title">
        <span class="dashicons dashicons-art"></span>
        <?php esc_html_e('SEO Content Importeren', 'cutthecrap-content-styler'); ?>
    </h1>

    <div class="ctcs-container">
        <div class="ctcs-main">
            <!-- Import Area -->
            <div class="ctcs-card ctcs-import-card" id="ctcs-import-area">
                <h2><?php esc_html_e('Content Uploaden', 'cutthecrap-content-styler'); ?></h2>

                <!-- Drag and Drop Zone -->
                <div class="ctcs-dropzone" id="ctcs-dropzone">
                    <div class="ctcs-dropzone__icon">
                        <span class="dashicons dashicons-upload"></span>
                    </div>
                    <p class="ctcs-dropzone__text"><?php esc_html_e('Sleep HTML of Markdown bestand hierheen', 'cutthecrap-content-styler'); ?></p>
                    <p class="ctcs-dropzone__subtext"><?php esc_html_e('of', 'cutthecrap-content-styler'); ?></p>
                    <label class="ctcs-dropzone__button">
                        <input type="file" id="ctcs-file-input" accept=".html,.htm,.md,.markdown" hidden>
                        <?php esc_html_e('Selecteer bestand', 'cutthecrap-content-styler'); ?>
                    </label>
                </div>

                <!-- Or paste content -->
                <div class="ctcs-divider">
                    <span><?php esc_html_e('OF', 'cutthecrap-content-styler'); ?></span>
                </div>

                <div class="ctcs-paste-area">
                    <label for="ctcs-paste-content"><?php esc_html_e('Plak HTML of Markdown content', 'cutthecrap-content-styler'); ?></label>
                    <textarea id="ctcs-paste-content" placeholder="<?php esc_attr_e('Plak hier uw HTML of Markdown content...', 'cutthecrap-content-styler'); ?>"></textarea>
                    <div class="ctcs-paste-actions">
                        <select id="ctcs-content-format">
                            <option value="html">HTML</option>
                            <option value="markdown">Markdown</option>
                        </select>
                        <button type="button" class="button button-primary" id="ctcs-process-paste">
                            <?php esc_html_e('Verwerken', 'cutthecrap-content-styler'); ?>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Processing Indicator -->
            <div class="ctcs-card ctcs-processing" id="ctcs-processing" style="display: none;">
                <div class="ctcs-processing__spinner"></div>
                <p class="ctcs-processing__text"><?php esc_html_e('Content wordt verwerkt...', 'cutthecrap-content-styler'); ?></p>
            </div>

            <!-- Preview Area -->
            <div class="ctcs-card ctcs-preview-card" id="ctcs-preview-area" style="display: none;">
                <div class="ctcs-preview-header">
                    <h2><?php esc_html_e('Preview', 'cutthecrap-content-styler'); ?></h2>
                    <button type="button" class="button" id="ctcs-back-to-import">
                        <span class="dashicons dashicons-arrow-left-alt"></span>
                        <?php esc_html_e('Terug', 'cutthecrap-content-styler'); ?>
                    </button>
                </div>

                <!-- Post Settings -->
                <div class="ctcs-post-settings">
                    <div class="ctcs-field">
                        <label for="ctcs-post-title"><?php esc_html_e('Titel', 'cutthecrap-content-styler'); ?></label>
                        <input type="text" id="ctcs-post-title" class="regular-text">
                    </div>

                    <div class="ctcs-field-row">
                        <div class="ctcs-field">
                            <label for="ctcs-post-type"><?php esc_html_e('Publiceren als', 'cutthecrap-content-styler'); ?></label>
                            <select id="ctcs-post-type">
                                <?php
                                // Ensure page is listed first and selected by default
                                if (isset($available_post_types['page'])) {
                                    echo '<option value="page" selected>' . esc_html($available_post_types['page']) . '</option>';
                                }
                                foreach ($available_post_types as $type_name => $type_label):
                                    if ($type_name === 'page') continue; // Already added above
                                ?>
                                    <option value="<?php echo esc_attr($type_name); ?>">
                                        <?php echo esc_html($type_label); ?>
                                    </option>
                                <?php endforeach; ?>
                            </select>
                        </div>

                        <div class="ctcs-field">
                            <label for="ctcs-post-slug"><?php esc_html_e('Slug (URL)', 'cutthecrap-content-styler'); ?></label>
                            <input type="text" id="ctcs-post-slug" class="regular-text">
                        </div>
                    </div>

                    <div class="ctcs-field-row">
                        <div class="ctcs-field ctcs-category-field" id="ctcs-category-field">
                            <label for="ctcs-post-category"><?php esc_html_e('Categorie', 'cutthecrap-content-styler'); ?></label>
                            <select id="ctcs-post-category">
                                <option value="0"><?php esc_html_e('Selecteer categorie', 'cutthecrap-content-styler'); ?></option>
                                <?php foreach ($categories as $cat): ?>
                                    <option value="<?php echo esc_attr($cat->term_id); ?>">
                                        <?php echo esc_html($cat->name); ?>
                                    </option>
                                <?php endforeach; ?>
                            </select>
                        </div>

                        <div class="ctcs-field ctcs-template-field" id="ctcs-template-field">
                            <label for="ctcs-page-template"><?php esc_html_e('Pagina template', 'cutthecrap-content-styler'); ?></label>
                            <select id="ctcs-page-template">
                                <option value="template-seo-article.php" selected><?php esc_html_e('SEO Artikel (Aanbevolen)', 'cutthecrap-content-styler'); ?></option>
                                <option value=""><?php esc_html_e('Standaard template', 'cutthecrap-content-styler'); ?></option>
                                <?php
                                // Get available page templates
                                $templates = wp_get_theme()->get_page_templates();
                                foreach ($templates as $template_file => $template_name):
                                    if ($template_file !== 'template-seo-article.php'): // Already added above
                                ?>
                                    <option value="<?php echo esc_attr($template_file); ?>">
                                        <?php echo esc_html($template_name); ?>
                                    </option>
                                <?php
                                    endif;
                                endforeach;
                                ?>
                            </select>
                        </div>
                    </div>

                    <div class="ctcs-field">
                        <label for="ctcs-meta-description"><?php esc_html_e('Meta Description', 'cutthecrap-content-styler'); ?></label>
                        <textarea id="ctcs-meta-description" rows="2"></textarea>
                        <p class="description"><?php esc_html_e('Wordt automatisch ingesteld voor Yoast/RankMath SEO.', 'cutthecrap-content-styler'); ?></p>
                    </div>

                    <div class="ctcs-field">
                        <label><?php esc_html_e('Uitgelichte afbeelding', 'cutthecrap-content-styler'); ?></label>
                        <div class="ctcs-featured-image" id="ctcs-featured-image-container">
                            <div class="ctcs-featured-image__preview" id="ctcs-featured-image-preview">
                                <span class="dashicons dashicons-format-image"></span>
                            </div>
                            <button type="button" class="button" id="ctcs-select-image">
                                <?php esc_html_e('Selecteer afbeelding', 'cutthecrap-content-styler'); ?>
                            </button>
                            <button type="button" class="button ctcs-remove-image" id="ctcs-remove-image" style="display: none;">
                                <?php esc_html_e('Verwijderen', 'cutthecrap-content-styler'); ?>
                            </button>
                            <input type="hidden" id="ctcs-featured-image-id" value="">
                        </div>
                    </div>
                </div>

                <!-- Components Detected -->
                <div class="ctcs-components" id="ctcs-components">
                    <h3><?php esc_html_e('Gedetecteerde componenten', 'cutthecrap-content-styler'); ?></h3>
                    <div class="ctcs-components__list" id="ctcs-components-list">
                        <!-- Filled by JavaScript -->
                    </div>
                </div>

                <!-- Preview Frame -->
                <div class="ctcs-preview-frame">
                    <h3><?php esc_html_e('Gestylde content preview', 'cutthecrap-content-styler'); ?></h3>
                    <div class="ctcs-preview-content" id="ctcs-preview-content">
                        <!-- Preview content inserted here -->
                    </div>
                </div>

                <!-- Actions -->
                <div class="ctcs-actions">
                    <button type="button" class="button button-secondary button-large" id="ctcs-save-draft">
                        <span class="dashicons dashicons-edit"></span>
                        <?php esc_html_e('Opslaan als concept', 'cutthecrap-content-styler'); ?>
                    </button>
                    <button type="button" class="button button-primary button-large" id="ctcs-publish-post">
                        <span class="dashicons dashicons-upload"></span>
                        <?php esc_html_e('Publiceren', 'cutthecrap-content-styler'); ?>
                    </button>
                </div>
            </div>

            <!-- Success Message -->
            <div class="ctcs-card ctcs-success" id="ctcs-success" style="display: none;">
                <div class="ctcs-success__icon">
                    <span class="dashicons dashicons-yes-alt"></span>
                </div>
                <h2 id="ctcs-success-title"><?php esc_html_e('Content succesvol aangemaakt!', 'cutthecrap-content-styler'); ?></h2>
                <div class="ctcs-success__actions">
                    <a href="#" class="button button-secondary" id="ctcs-view-post" target="_blank">
                        <?php esc_html_e('Bekijken', 'cutthecrap-content-styler'); ?>
                    </a>
                    <a href="#" class="button button-secondary" id="ctcs-edit-post">
                        <?php esc_html_e('Bewerken', 'cutthecrap-content-styler'); ?>
                    </a>
                    <button type="button" class="button button-primary" id="ctcs-import-another">
                        <?php esc_html_e('Nog een importeren', 'cutthecrap-content-styler'); ?>
                    </button>
                </div>
            </div>
        </div>

        <!-- Sidebar -->
        <div class="ctcs-sidebar">
            <div class="ctcs-card ctcs-info-card">
                <h3><?php esc_html_e('Ondersteunde formaten', 'cutthecrap-content-styler'); ?></h3>
                <ul>
                    <li><strong>HTML</strong> - <?php esc_html_e('Inclusief SEO-geoptimaliseerde content', 'cutthecrap-content-styler'); ?></li>
                    <li><strong>Markdown</strong> - <?php esc_html_e('Automatische conversie naar HTML', 'cutthecrap-content-styler'); ?></li>
                </ul>
            </div>

            <div class="ctcs-card ctcs-info-card">
                <h3><?php esc_html_e('Auto-detectie', 'cutthecrap-content-styler'); ?></h3>
                <p><?php esc_html_e('De volgende componenten worden automatisch gedetecteerd:', 'cutthecrap-content-styler'); ?></p>
                <ul>
                    <li><span class="dashicons dashicons-yes"></span> <?php esc_html_e('Key Takeaways', 'cutthecrap-content-styler'); ?></li>
                    <li><span class="dashicons dashicons-yes"></span> <?php esc_html_e('FAQ Secties', 'cutthecrap-content-styler'); ?></li>
                    <li><span class="dashicons dashicons-yes"></span> <?php esc_html_e('Stappen/How-to', 'cutthecrap-content-styler'); ?></li>
                    <li><span class="dashicons dashicons-yes"></span> <?php esc_html_e('Vergelijkingen', 'cutthecrap-content-styler'); ?></li>
                    <li><span class="dashicons dashicons-yes"></span> <?php esc_html_e('Voordelen lijsten', 'cutthecrap-content-styler'); ?></li>
                </ul>
            </div>

            <div class="ctcs-card ctcs-info-card">
                <h3><?php esc_html_e('Tips', 'cutthecrap-content-styler'); ?></h3>
                <ul>
                    <li><?php esc_html_e('Gebruik H2 headings voor secties', 'cutthecrap-content-styler'); ?></li>
                    <li><?php esc_html_e('Plaats FAQ aan het einde van de content', 'cutthecrap-content-styler'); ?></li>
                    <li><?php esc_html_e('Begin met een korte intro en bullet list', 'cutthecrap-content-styler'); ?></li>
                </ul>
            </div>
        </div>
    </div>
</div>
