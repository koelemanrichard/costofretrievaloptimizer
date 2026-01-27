<?php
/**
 * HTML Transformer Class
 *
 * Transforms parsed content with detected components
 * into professionally styled HTML output.
 *
 * @package CutTheCrap_Content_Styler
 */

if (!defined('ABSPATH')) {
    exit;
}

class CTCS_HTML_Transformer {

    /**
     * Component Detector instance
     */
    private $detector;

    /**
     * Constructor
     *
     * @param CTCS_Component_Detector $detector
     */
    public function __construct(CTCS_Component_Detector $detector) {
        $this->detector = $detector;
    }

    /**
     * Transform content with detected components
     *
     * @param array $parsed     Parsed content
     * @param array $components Detected components
     * @return string Transformed HTML
     */
    public function transform($parsed, $components) {
        $output = '';

        // Add Key Takeaways box if detected
        if ($components['has_key_takeaways']) {
            $output .= $this->render_key_takeaways($components['key_takeaways']);
        }

        // Process sections
        $section_count = 0;
        foreach ($components['sections'] as $index => $section) {
            // Check if CTA should be inserted before this section
            if (in_array($index, $components['cta_positions'])) {
                $output .= $this->render_cta_block();
            }

            // Handle special section types
            if (!empty($section['skip_transform'])) {
                if ($section['type'] === 'faq') {
                    $output .= $this->render_faq($components['faq']);
                }
                continue;
            }

            // Render the section
            $output .= $this->render_section($section, $index);
            $section_count++;
        }

        // Add FAQ at the end if it wasn't inline
        if ($components['has_faq'] && !isset($components['faq']['section_index'])) {
            $output .= $this->render_cta_block();
            $output .= $this->render_faq($components['faq']);
        }

        return $output;
    }

    /**
     * Render Key Takeaways box
     *
     * @param array $takeaways
     * @return string
     */
    private function render_key_takeaways($takeaways) {
        $items = $takeaways['items'] ?? [];

        if (empty($items)) {
            return '';
        }

        $heading = $takeaways['heading'] ?? __('Belangrijkste Punten', 'cutthecrap-content-styler');

        // Split items into two columns
        $half = ceil(count($items) / 2);
        $col1 = array_slice($items, 0, $half);
        $col2 = array_slice($items, $half);

        ob_start();
        ?>
        <div class="seo-key-takeaways">
            <h3 class="seo-key-takeaways__title">
                <svg class="seo-key-takeaways__icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                    <path d="M2 17l10 5 10-5"></path>
                    <path d="M2 12l10 5 10-5"></path>
                </svg>
                <?php echo esc_html($heading); ?>
            </h3>
            <div class="seo-key-takeaways__grid">
                <ul class="seo-key-takeaways__list">
                    <?php foreach ($col1 as $item): ?>
                        <li class="seo-key-takeaways__item">
                            <svg class="seo-key-takeaways__check" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            <span><?php echo wp_kses_post($item['text']); ?></span>
                        </li>
                    <?php endforeach; ?>
                </ul>
                <?php if (!empty($col2)): ?>
                    <ul class="seo-key-takeaways__list">
                        <?php foreach ($col2 as $item): ?>
                            <li class="seo-key-takeaways__item">
                                <svg class="seo-key-takeaways__check" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                <span><?php echo wp_kses_post($item['text']); ?></span>
                            </li>
                        <?php endforeach; ?>
                    </ul>
                <?php endif; ?>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * Render a content section
     *
     * @param array $section
     * @param int   $index
     * @return string
     */
    private function render_section($section, $index) {
        $classes = ['seo-section'];
        $classes[] = 'seo-section--' . $section['type'];

        // Alternating backgrounds
        if ($index % 2 === 1) {
            $classes[] = 'seo-section--alt';
        }

        // Section ID for ToC navigation
        $section_id = 'section-' . ($index + 1);

        ob_start();
        ?>
        <section id="<?php echo esc_attr($section_id); ?>" class="<?php echo esc_attr(implode(' ', $classes)); ?>">
            <h2 class="seo-section__heading">
                <?php echo esc_html($section['heading']); ?>
                <span class="seo-section__underline"></span>
            </h2>
            <div class="seo-section__content">
                <?php echo $this->enhance_content($section['content'], $section['type']); ?>
            </div>
        </section>
        <?php
        return ob_get_clean();
    }

    /**
     * Enhance content based on section type
     *
     * @param string $content
     * @param string $type
     * @return string
     */
    private function enhance_content($content, $type) {
        // Enhance lists with icons
        $content = $this->enhance_lists($content);

        // Enhance tables
        $content = $this->enhance_tables($content);

        // Enhance blockquotes
        $content = $this->enhance_blockquotes($content);

        // Type-specific enhancements
        switch ($type) {
            case 'steps':
                $content = $this->enhance_steps($content);
                break;
            case 'benefits':
                $content = $this->enhance_benefits($content);
                break;
            case 'comparison':
                $content = $this->enhance_comparison($content);
                break;
        }

        return $content;
    }

    /**
     * Enhance lists with checkmarks
     *
     * @param string $content
     * @return string
     */
    private function enhance_lists($content) {
        // Add wrapper class to UL elements
        $content = preg_replace(
            '/<ul([^>]*)>/i',
            '<ul$1 class="seo-list">',
            $content
        );

        // Add wrapper class to OL elements
        $content = preg_replace(
            '/<ol([^>]*)>/i',
            '<ol$1 class="seo-list seo-list--numbered">',
            $content
        );

        return $content;
    }

    /**
     * Enhance tables
     *
     * @param string $content
     * @return string
     */
    private function enhance_tables($content) {
        // Wrap tables in responsive container
        $content = preg_replace(
            '/<table([^>]*)>/i',
            '<div class="seo-table-wrapper"><table$1 class="seo-table">',
            $content
        );

        $content = preg_replace(
            '/<\/table>/i',
            '</table></div>',
            $content
        );

        return $content;
    }

    /**
     * Enhance blockquotes
     *
     * @param string $content
     * @return string
     */
    private function enhance_blockquotes($content) {
        $content = preg_replace(
            '/<blockquote([^>]*)>/i',
            '<blockquote$1 class="seo-blockquote">',
            $content
        );

        return $content;
    }

    /**
     * Enhance step-by-step content
     *
     * @param string $content
     * @return string
     */
    private function enhance_steps($content) {
        // Convert H3/H4 headers in steps section to step cards
        $content = preg_replace_callback(
            '/<h([34])([^>]*)>(.*?)<\/h\1>/is',
            function($matches) {
                static $step_count = 0;
                $step_count++;
                return sprintf(
                    '<div class="seo-step"><div class="seo-step__number">%d</div><h%s%s class="seo-step__title">%s</h%s></div>',
                    $step_count,
                    $matches[1],
                    $matches[2],
                    $matches[3],
                    $matches[1]
                );
            },
            $content
        );

        return $content;
    }

    /**
     * Enhance benefits content
     *
     * @param string $content
     * @return string
     */
    private function enhance_benefits($content) {
        // Add benefit class to list items
        $content = preg_replace(
            '/<ul([^>]*)class="seo-list">/i',
            '<ul$1 class="seo-list seo-list--benefits">',
            $content
        );

        return $content;
    }

    /**
     * Enhance comparison content
     *
     * @param string $content
     * @return string
     */
    private function enhance_comparison($content) {
        // Add comparison class to tables
        $content = preg_replace(
            '/<table([^>]*)class="seo-table">/i',
            '<table$1 class="seo-table seo-table--comparison">',
            $content
        );

        return $content;
    }

    /**
     * Render FAQ accordion
     *
     * @param array $faq
     * @return string
     */
    private function render_faq($faq) {
        if (empty($faq['items'])) {
            return '';
        }

        $heading = $faq['heading'] ?? __('Veelgestelde Vragen', 'cutthecrap-content-styler');

        ob_start();
        ?>
        <section id="faq" class="seo-faq">
            <h2 class="seo-faq__heading">
                <?php echo esc_html($heading); ?>
                <span class="seo-section__underline"></span>
            </h2>
            <div class="seo-faq__list" itemscope itemtype="https://schema.org/FAQPage">
                <?php foreach ($faq['items'] as $index => $item): ?>
                    <div class="seo-faq__item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
                        <button class="seo-faq__question" aria-expanded="false" aria-controls="faq-answer-<?php echo $index; ?>">
                            <span itemprop="name"><?php echo esc_html($item['question']); ?></span>
                            <svg class="seo-faq__icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </button>
                        <div id="faq-answer-<?php echo $index; ?>" class="seo-faq__answer" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
                            <div itemprop="text">
                                <?php echo wp_kses_post($item['answer']); ?>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        </section>
        <?php
        return ob_get_clean();
    }

    /**
     * Render CTA block
     *
     * @return string
     */
    private function render_cta_block() {
        $cta_text = get_option('ctcs_cta_text', __('Neem contact op', 'cutthecrap-content-styler'));
        $cta_url = get_option('ctcs_cta_url', '/contact');
        $cta_description = get_option('ctcs_cta_description', __('Heeft u vragen of wilt u meer informatie? Wij helpen u graag verder.', 'cutthecrap-content-styler'));

        ob_start();
        ?>
        <div class="seo-cta">
            <div class="seo-cta__content">
                <h3 class="seo-cta__title"><?php echo esc_html($cta_text); ?></h3>
                <p class="seo-cta__description"><?php echo esc_html($cta_description); ?></p>
            </div>
            <a href="<?php echo esc_url($cta_url); ?>" class="seo-cta__button">
                <?php echo esc_html($cta_text); ?>
                <svg class="seo-cta__arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
            </a>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * Generate complete styled article
     *
     * @param array $parsed     Parsed content
     * @param array $components Detected components
     * @return string
     */
    public function generate_article($parsed, $components) {
        $output = '';

        // Article wrapper with TOC sidebar
        $output .= '<div class="seo-article-wrapper">';

        // Sidebar with ToC
        $output .= $this->render_toc_sidebar($components['toc_items']);

        // Main content
        $output .= '<article class="seo-article">';

        // Intro section (if any content before first H2)
        if (!empty($parsed['intro'])) {
            // Remove key takeaways list from intro if it was detected
            $intro = $parsed['intro'];
            if ($components['has_key_takeaways'] && !empty($components['key_takeaways']['original_html'])) {
                $intro = str_replace($components['key_takeaways']['original_html'], '', $intro);
            }

            if (!empty(trim(strip_tags($intro)))) {
                $output .= '<div class="seo-article__intro">' . $intro . '</div>';
            }
        }

        // Transform content
        $output .= $this->transform($parsed, $components);

        $output .= '</article>';
        $output .= '</div>';

        return $output;
    }

    /**
     * Render ToC sidebar
     *
     * @param array $toc_items
     * @return string
     */
    private function render_toc_sidebar($toc_items) {
        if (empty($toc_items)) {
            return '';
        }

        ob_start();
        ?>
        <aside class="seo-toc">
            <div class="seo-toc__title"><?php esc_html_e('Inhoud', 'cutthecrap-content-styler'); ?></div>
            <nav class="seo-toc__nav">
                <ul class="seo-toc__list">
                    <?php foreach ($toc_items as $item): ?>
                        <li class="seo-toc__item">
                            <a href="#<?php echo esc_attr($item['id']); ?>" class="seo-toc__link">
                                <?php echo esc_html($item['text']); ?>
                            </a>
                        </li>
                    <?php endforeach; ?>
                </ul>
            </nav>

            <!-- CTA Box in sidebar -->
            <div class="seo-toc__cta">
                <h4 class="seo-toc__cta-title"><?php esc_html_e('Hulp nodig?', 'cutthecrap-content-styler'); ?></h4>
                <p class="seo-toc__cta-text"><?php esc_html_e('Neem vrijblijvend contact met ons op.', 'cutthecrap-content-styler'); ?></p>
                <a href="<?php echo esc_url(get_option('ctcs_cta_url', '/contact')); ?>" class="seo-toc__cta-button">
                    <?php echo esc_html(get_option('ctcs_cta_text', __('Contact', 'cutthecrap-content-styler'))); ?>
                </a>
            </div>
        </aside>
        <?php
        return ob_get_clean();
    }
}
