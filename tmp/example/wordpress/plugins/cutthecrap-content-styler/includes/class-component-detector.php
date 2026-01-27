<?php
/**
 * Component Detector Class
 *
 * Detects semantic components in parsed content
 * such as Key Takeaways, FAQ sections, CTAs, etc.
 *
 * @package CutTheCrap_Content_Styler
 */

if (!defined('ABSPATH')) {
    exit;
}

class CTCS_Component_Detector {

    /**
     * FAQ heading patterns (Dutch and English)
     */
    private $faq_patterns = [
        '/^faq$/i',
        '/^veelgestelde\s+vragen$/i',
        '/^veel\s+gestelde\s+vragen$/i',
        '/^frequently\s+asked\s+questions$/i',
        '/^vragen\s+en\s+antwoorden$/i',
        '/^q\s*&\s*a$/i',
        '/faq/i',
        '/veelgestelde/i'
    ];

    /**
     * Key Takeaways patterns
     */
    private $takeaways_patterns = [
        '/^key\s+takeaways?$/i',
        '/^belangrijkste\s+punten$/i',
        '/^samenvatting$/i',
        '/^in\s+het\s+kort$/i',
        '/^tl;?dr$/i',
        '/^hoofdpunten$/i',
        '/^kernpunten$/i',
        '/^highlights?$/i',
        '/^wat\s+je\s+leert$/i',
        '/^dit\s+leer\s+je$/i'
    ];

    /**
     * CTA patterns
     */
    private $cta_patterns = [
        '/neem\s+contact/i',
        '/vraag\s+(?:een\s+)?offerte/i',
        '/start\s+(?:nu|vandaag)/i',
        '/bestel\s+(?:nu|direct)/i',
        '/meld\s+(?:je\s+)?aan/i',
        '/schrijf\s+(?:je\s+)?in/i',
        '/download/i',
        '/get\s+started/i',
        '/contact\s+us/i',
        '/request\s+(?:a\s+)?quote/i',
        '/bel\s+(?:ons|nu)/i',
        '/plan\s+(?:een\s+)?afspraak/i'
    ];

    /**
     * Detect all components in parsed content
     *
     * @param array $parsed Parsed content from Content Parser
     * @return array Detected components
     */
    public function detect($parsed) {
        $components = [
            'has_hero' => false,
            'hero' => null,
            'has_key_takeaways' => false,
            'key_takeaways' => null,
            'has_faq' => false,
            'faq' => null,
            'sections' => [],
            'toc_items' => [],
            'cta_positions' => []
        ];

        // Detect Hero (H1 + meta description)
        $components = $this->detect_hero($parsed, $components);

        // Detect Key Takeaways (first UL after intro)
        $components = $this->detect_key_takeaways($parsed, $components);

        // Detect FAQ section
        $components = $this->detect_faq($parsed, $components);

        // Detect and categorize sections
        $components = $this->detect_sections($parsed, $components);

        // Build ToC items
        $components = $this->build_toc($parsed, $components);

        // Determine CTA positions
        $components = $this->determine_cta_positions($parsed, $components);

        return $components;
    }

    /**
     * Detect Hero component
     *
     * @param array $parsed
     * @param array $components
     * @return array
     */
    private function detect_hero($parsed, $components) {
        if (!empty($parsed['title'])) {
            $components['has_hero'] = true;
            $components['hero'] = [
                'title' => $parsed['title'],
                'description' => $parsed['meta_description'] ?? '',
                'intro' => $parsed['intro'] ?? ''
            ];
        }

        return $components;
    }

    /**
     * Detect Key Takeaways component
     *
     * @param array $parsed
     * @param array $components
     * @return array
     */
    private function detect_key_takeaways($parsed, $components) {
        $intro = $parsed['intro'] ?? '';

        // Check if intro contains a UL
        if (preg_match('/<ul[^>]*>(.*?)<\/ul>/is', $intro, $matches)) {
            // Check if the preceding text suggests key takeaways
            $before_ul = substr($intro, 0, strpos($intro, '<ul'));

            // Check for takeaways patterns in text before the list
            $is_takeaways = false;
            foreach ($this->takeaways_patterns as $pattern) {
                if (preg_match($pattern, $before_ul)) {
                    $is_takeaways = true;
                    break;
                }
            }

            // If no explicit pattern, treat first UL in intro as key takeaways
            // (common SEO pattern)
            if (!$is_takeaways && strlen($before_ul) < 500) {
                $is_takeaways = true;
            }

            if ($is_takeaways) {
                $items = $this->extract_list_items($matches[0]);
                if (count($items) >= 3 && count($items) <= 10) {
                    $components['has_key_takeaways'] = true;
                    $components['key_takeaways'] = [
                        'items' => $items,
                        'original_html' => $matches[0]
                    ];
                }
            }
        }

        // Also check sections for explicit key takeaways headings
        if (!$components['has_key_takeaways'] && !empty($parsed['sections'])) {
            foreach ($parsed['sections'] as $index => $section) {
                foreach ($this->takeaways_patterns as $pattern) {
                    if (preg_match($pattern, $section['heading'])) {
                        $items = $this->extract_list_items($section['content']);
                        if (count($items) >= 3) {
                            $components['has_key_takeaways'] = true;
                            $components['key_takeaways'] = [
                                'items' => $items,
                                'heading' => $section['heading'],
                                'section_index' => $index,
                                'original_html' => $section['content']
                            ];
                        }
                        break 2;
                    }
                }
            }
        }

        return $components;
    }

    /**
     * Detect FAQ section
     *
     * @param array $parsed
     * @param array $components
     * @return array
     */
    private function detect_faq($parsed, $components) {
        if (empty($parsed['sections'])) {
            return $components;
        }

        foreach ($parsed['sections'] as $index => $section) {
            $is_faq = false;

            // Check heading against FAQ patterns
            foreach ($this->faq_patterns as $pattern) {
                if (preg_match($pattern, $section['heading'])) {
                    $is_faq = true;
                    break;
                }
            }

            if ($is_faq) {
                // Extract Q&A pairs
                $qa_pairs = $this->extract_qa_pairs($section['content']);

                if (count($qa_pairs) >= 2) {
                    $components['has_faq'] = true;
                    $components['faq'] = [
                        'heading' => $section['heading'],
                        'items' => $qa_pairs,
                        'section_index' => $index,
                        'original_html' => $section['content']
                    ];
                }
                break;
            }
        }

        // If no FAQ section found by heading, check for Schema.org FAQ markup
        if (!$components['has_faq'] && !empty($parsed['raw_html'])) {
            if (preg_match('/itemtype=["\'].*FAQPage/i', $parsed['raw_html'])) {
                $qa_pairs = $this->extract_schema_faq($parsed['raw_html']);
                if (count($qa_pairs) >= 2) {
                    $components['has_faq'] = true;
                    $components['faq'] = [
                        'heading' => 'Veelgestelde Vragen',
                        'items' => $qa_pairs,
                        'from_schema' => true
                    ];
                }
            }
        }

        return $components;
    }

    /**
     * Extract Q&A pairs from content
     *
     * @param string $content
     * @return array
     */
    private function extract_qa_pairs($content) {
        $pairs = [];

        // Pattern 1: H3/H4 followed by paragraph
        if (preg_match_all('/<h[34][^>]*>(.*?)<\/h[34]>\s*(.*?)(?=<h[34]|$)/is', $content, $matches, PREG_SET_ORDER)) {
            foreach ($matches as $match) {
                $question = strip_tags($match[1]);
                $answer = trim($match[2]);

                if (!empty($question) && !empty($answer)) {
                    $pairs[] = [
                        'question' => $question,
                        'answer' => $answer
                    ];
                }
            }
        }

        // Pattern 2: Strong/Bold followed by text
        if (empty($pairs) && preg_match_all('/<(?:strong|b)[^>]*>(.*?)<\/(?:strong|b)>\s*:?\s*(.*?)(?=<(?:strong|b)|<br|<p|$)/is', $content, $matches, PREG_SET_ORDER)) {
            foreach ($matches as $match) {
                $question = strip_tags($match[1]);
                $answer = trim(strip_tags($match[2]));

                if (!empty($question) && strlen($answer) > 20) {
                    $pairs[] = [
                        'question' => $question,
                        'answer' => '<p>' . $answer . '</p>'
                    ];
                }
            }
        }

        // Pattern 3: Definition lists
        if (empty($pairs) && preg_match_all('/<dt[^>]*>(.*?)<\/dt>\s*<dd[^>]*>(.*?)<\/dd>/is', $content, $matches, PREG_SET_ORDER)) {
            foreach ($matches as $match) {
                $pairs[] = [
                    'question' => strip_tags($match[1]),
                    'answer' => $match[2]
                ];
            }
        }

        return $pairs;
    }

    /**
     * Extract FAQ from Schema.org markup
     *
     * @param string $html
     * @return array
     */
    private function extract_schema_faq($html) {
        $pairs = [];

        // Match FAQPage questions
        if (preg_match_all('/itemprop=["\']name["\'][^>]*>([^<]+)/i', $html, $questions) &&
            preg_match_all('/itemprop=["\']text["\'][^>]*>([^<]+)/i', $html, $answers)) {

            $count = min(count($questions[1]), count($answers[1]));
            for ($i = 0; $i < $count; $i++) {
                $pairs[] = [
                    'question' => trim($questions[1][$i]),
                    'answer' => '<p>' . trim($answers[1][$i]) . '</p>'
                ];
            }
        }

        return $pairs;
    }

    /**
     * Detect and categorize sections
     *
     * @param array $parsed
     * @param array $components
     * @return array
     */
    private function detect_sections($parsed, $components) {
        if (empty($parsed['sections'])) {
            return $components;
        }

        $sections = [];
        $faq_index = $components['has_faq'] ? ($components['faq']['section_index'] ?? -1) : -1;
        $takeaways_index = $components['has_key_takeaways'] ? ($components['key_takeaways']['section_index'] ?? -1) : -1;

        foreach ($parsed['sections'] as $index => $section) {
            // Skip FAQ and Key Takeaways sections (handled separately)
            if ($index === $faq_index || $index === $takeaways_index) {
                $sections[] = [
                    'type' => ($index === $faq_index) ? 'faq' : 'takeaways',
                    'skip_transform' => true,
                    'heading' => $section['heading'],
                    'content' => $section['content']
                ];
                continue;
            }

            // Categorize section
            $type = $this->categorize_section($section);

            $sections[] = [
                'type' => $type,
                'heading' => $section['heading'],
                'content' => $section['content'],
                'has_list' => (bool) preg_match('/<[uo]l[^>]*>/i', $section['content']),
                'has_table' => (bool) preg_match('/<table[^>]*>/i', $section['content']),
                'has_image' => (bool) preg_match('/<img[^>]*>/i', $section['content']),
                'word_count' => str_word_count(strip_tags($section['content']))
            ];
        }

        $components['sections'] = $sections;

        return $components;
    }

    /**
     * Categorize a section based on its content
     *
     * @param array $section
     * @return string Section type
     */
    private function categorize_section($section) {
        $heading = strtolower($section['heading']);
        $content = $section['content'];

        // Check for how-to/steps patterns
        if (preg_match('/^(hoe|stap|steps?|how\s+to|guide|tutorial)/i', $heading)) {
            return 'steps';
        }

        // Check for benefits/advantages
        if (preg_match('/(voordelen|benefits?|waarom|why|advantages?)/i', $heading)) {
            return 'benefits';
        }

        // Check for comparison
        if (preg_match('/(vergelijk|verschil|versus|vs\.?|comparison)/i', $heading)) {
            return 'comparison';
        }

        // Check for pricing/costs
        if (preg_match('/(prijs|kosten|tarief|price|cost|pricing)/i', $heading)) {
            return 'pricing';
        }

        // Check for testimonials/reviews
        if (preg_match('/(review|ervaring|testimonial|mening)/i', $heading)) {
            return 'testimonials';
        }

        // Check for list-heavy content
        if (preg_match_all('/<li[^>]*>/i', $content, $matches) && count($matches[0]) >= 5) {
            return 'list';
        }

        // Default content section
        return 'content';
    }

    /**
     * Build Table of Contents items
     *
     * @param array $parsed
     * @param array $components
     * @return array
     */
    private function build_toc($parsed, $components) {
        $toc = [];

        foreach ($parsed['sections'] as $index => $section) {
            $slug = sanitize_title($section['heading']);
            $toc[] = [
                'id' => 'section-' . ($index + 1),
                'slug' => $slug,
                'text' => $section['heading'],
                'level' => 2
            ];
        }

        $components['toc_items'] = $toc;

        return $components;
    }

    /**
     * Determine CTA positions
     *
     * @param array $parsed
     * @param array $components
     * @return array
     */
    private function determine_cta_positions($parsed, $components) {
        $positions = [];
        $section_count = count($components['sections']);

        // Add CTA after every 2-3 sections, but not in the last section
        if ($section_count >= 4) {
            // After 2nd section
            $positions[] = 2;

            // If more than 6 sections, add another CTA
            if ($section_count >= 6) {
                $positions[] = min(5, $section_count - 2);
            }
        } elseif ($section_count >= 2) {
            // For shorter content, one CTA in the middle
            $positions[] = (int) ceil($section_count / 2);
        }

        // Always add CTA before FAQ if present
        if ($components['has_faq'] && isset($components['faq']['section_index'])) {
            $faq_index = $components['faq']['section_index'];
            if (!in_array($faq_index, $positions) && $faq_index > 0) {
                $positions[] = $faq_index;
            }
        }

        sort($positions);
        $components['cta_positions'] = array_unique($positions);

        return $components;
    }

    /**
     * Extract list items from HTML
     *
     * @param string $html
     * @return array
     */
    private function extract_list_items($html) {
        $items = [];

        if (preg_match_all('/<li[^>]*>(.*?)<\/li>/is', $html, $matches)) {
            foreach ($matches[1] as $item) {
                $text = trim(strip_tags($item));
                if (!empty($text)) {
                    $items[] = [
                        'text' => $text,
                        'html' => $item
                    ];
                }
            }
        }

        return $items;
    }

    /**
     * Check if content has CTA patterns
     *
     * @param string $text
     * @return bool
     */
    public function has_cta_pattern($text) {
        foreach ($this->cta_patterns as $pattern) {
            if (preg_match($pattern, $text)) {
                return true;
            }
        }
        return false;
    }
}
