<?php
/**
 * Content Parser Class
 *
 * Parses HTML and Markdown content into a structured format
 * for component detection and transformation.
 *
 * @package CutTheCrap_Content_Styler
 */

if (!defined('ABSPATH')) {
    exit;
}

class CTCS_Content_Parser {

    /**
     * Parse content based on format
     *
     * @param string $content The raw content
     * @param string $format  The format (html or markdown)
     * @return array Parsed content structure
     */
    public function parse($content, $format = 'html') {
        // Convert Markdown to HTML if needed
        if ($format === 'markdown' || $format === 'md') {
            $content = $this->markdown_to_html($content);
        }

        // Clean and normalize the HTML
        $content = $this->clean_html($content);

        // Parse into structured format
        return $this->parse_html($content);
    }

    /**
     * Convert Markdown to HTML
     *
     * @param string $markdown
     * @return string HTML content
     */
    private function markdown_to_html($markdown) {
        // Use Parsedown if available, otherwise basic conversion
        if (class_exists('Parsedown')) {
            $parsedown = new Parsedown();
            $parsedown->setSafeMode(true);
            return $parsedown->text($markdown);
        }

        // Basic Markdown to HTML conversion
        $html = $markdown;

        // Headers
        $html = preg_replace('/^######\s+(.+)$/m', '<h6>$1</h6>', $html);
        $html = preg_replace('/^#####\s+(.+)$/m', '<h5>$1</h5>', $html);
        $html = preg_replace('/^####\s+(.+)$/m', '<h4>$1</h4>', $html);
        $html = preg_replace('/^###\s+(.+)$/m', '<h3>$1</h3>', $html);
        $html = preg_replace('/^##\s+(.+)$/m', '<h2>$1</h2>', $html);
        $html = preg_replace('/^#\s+(.+)$/m', '<h1>$1</h1>', $html);

        // Bold and italic
        $html = preg_replace('/\*\*\*(.+?)\*\*\*/s', '<strong><em>$1</em></strong>', $html);
        $html = preg_replace('/\*\*(.+?)\*\*/s', '<strong>$1</strong>', $html);
        $html = preg_replace('/\*(.+?)\*/s', '<em>$1</em>', $html);
        $html = preg_replace('/___(.+?)___/s', '<strong><em>$1</em></strong>', $html);
        $html = preg_replace('/__(.+?)__/s', '<strong>$1</strong>', $html);
        $html = preg_replace('/_(.+?)_/s', '<em>$1</em>', $html);

        // Links
        $html = preg_replace('/\[([^\]]+)\]\(([^)]+)\)/', '<a href="$2">$1</a>', $html);

        // Images
        $html = preg_replace('/!\[([^\]]*)\]\(([^)]+)\)/', '<img src="$2" alt="$1">', $html);

        // Unordered lists
        $html = preg_replace_callback('/(?:^[-*+]\s+.+$\n?)+/m', function($matches) {
            $items = preg_split('/^[-*+]\s+/m', trim($matches[0]), -1, PREG_SPLIT_NO_EMPTY);
            $list = '<ul>';
            foreach ($items as $item) {
                $list .= '<li>' . trim($item) . '</li>';
            }
            $list .= '</ul>';
            return $list;
        }, $html);

        // Ordered lists
        $html = preg_replace_callback('/(?:^\d+\.\s+.+$\n?)+/m', function($matches) {
            $items = preg_split('/^\d+\.\s+/m', trim($matches[0]), -1, PREG_SPLIT_NO_EMPTY);
            $list = '<ol>';
            foreach ($items as $item) {
                $list .= '<li>' . trim($item) . '</li>';
            }
            $list .= '</ol>';
            return $list;
        }, $html);

        // Blockquotes
        $html = preg_replace_callback('/(?:^>\s?.+$\n?)+/m', function($matches) {
            $content = preg_replace('/^>\s?/m', '', $matches[0]);
            return '<blockquote>' . trim($content) . '</blockquote>';
        }, $html);

        // Code blocks
        $html = preg_replace('/```([^`]+)```/s', '<pre><code>$1</code></pre>', $html);
        $html = preg_replace('/`([^`]+)`/', '<code>$1</code>', $html);

        // Horizontal rules
        $html = preg_replace('/^(?:---|\*\*\*|___)$/m', '<hr>', $html);

        // Paragraphs
        $html = preg_replace('/\n\n+/', '</p><p>', $html);
        $html = '<p>' . $html . '</p>';
        $html = preg_replace('/<p>\s*<(h[1-6]|ul|ol|blockquote|pre|hr)/', '<$1', $html);
        $html = preg_replace('/<\/(h[1-6]|ul|ol|blockquote|pre)>\s*<\/p>/', '</$1>', $html);
        $html = preg_replace('/<p>\s*<\/p>/', '', $html);

        return $html;
    }

    /**
     * Clean and normalize HTML
     *
     * @param string $html
     * @return string Cleaned HTML
     */
    private function clean_html($html) {
        // Extract body content if full HTML document (use greedy match for nested content)
        if (preg_match('/<body[^>]*>(.*)<\/body>/is', $html, $matches)) {
            $html = $matches[1];
        }

        // Also check for html tag without body (some exports)
        if (preg_match('/<html[^>]*>(.*)<\/html>/is', $html, $matches) && !preg_match('/<body/i', $html)) {
            $html = $matches[1];
        }

        // Remove doctype, head, meta tags if present
        $html = preg_replace('/<!DOCTYPE[^>]*>/is', '', $html);
        $html = preg_replace('/<head[^>]*>.*?<\/head>/is', '', $html);
        $html = preg_replace('/<\/?html[^>]*>/is', '', $html);
        $html = preg_replace('/<meta[^>]*\/?>/is', '', $html);
        $html = preg_replace('/<link[^>]*\/?>/is', '', $html);
        $html = preg_replace('/<title[^>]*>.*?<\/title>/is', '', $html);

        // Remove script and style tags
        $html = preg_replace('/<script[^>]*>.*?<\/script>/is', '', $html);
        $html = preg_replace('/<style[^>]*>.*?<\/style>/is', '', $html);

        // Remove comments
        $html = preg_replace('/<!--.*?-->/s', '', $html);

        // Remove extra whitespace but preserve structure
        $html = preg_replace('/>\s+</', '> <', $html);

        // Fix self-closing tags
        $html = preg_replace('/<(br|hr|img)([^>]*)(?<!\/)>/', '<$1$2 />', $html);

        // Decode HTML entities
        $html = html_entity_decode($html, ENT_QUOTES, 'UTF-8');

        return trim($html);
    }

    /**
     * Parse HTML into structured format
     *
     * @param string $html
     * @return array
     */
    private function parse_html($html) {
        // Suppress errors for malformed HTML
        libxml_use_internal_errors(true);

        $dom = new DOMDocument('1.0', 'UTF-8');

        // Wrap in proper HTML structure for parsing
        $wrapped = '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>' . $html . '</body></html>';
        $dom->loadHTML(mb_convert_encoding($wrapped, 'HTML-ENTITIES', 'UTF-8'), LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);

        libxml_clear_errors();

        $xpath = new DOMXPath($dom);

        // Extract structure
        $result = [
            'title' => '',
            'meta_description' => '',
            'content' => '',
            'sections' => [],
            'headings' => [],
            'intro' => '',
            'raw_html' => $html
        ];

        // Find H1 for title (anywhere in the document)
        $h1s = $xpath->query('//h1');
        if ($h1s->length > 0) {
            $result['title'] = trim($h1s->item(0)->textContent);
        }

        // Extract all headings (anywhere in the document)
        $headings = [];
        foreach (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as $tag) {
            $elements = $xpath->query('//' . $tag);
            foreach ($elements as $el) {
                $headings[] = [
                    'level' => (int) substr($tag, 1),
                    'text' => trim($el->textContent),
                    'tag' => $tag
                ];
            }
        }
        $result['headings'] = $headings;

        // Use regex-based section extraction for reliability
        $result['sections'] = $this->extract_sections_regex($html);

        // Extract intro (content before first H2)
        $result['intro'] = $this->extract_intro_regex($html);

        // Try to extract meta description from first paragraph
        $paragraphs = $xpath->query('//p');
        if ($paragraphs->length > 0) {
            $first_p = trim($paragraphs->item(0)->textContent);
            if (strlen($first_p) > 50 && strlen($first_p) < 500) {
                $result['meta_description'] = $first_p;
            }
        }

        // Get the cleaned content
        $result['content'] = $html;

        return $result;
    }

    /**
     * Extract sections using regex (more reliable for varied HTML structures)
     *
     * @param string $html
     * @return array
     */
    private function extract_sections_regex($html) {
        $sections = [];

        // Multiple patterns for H2 detection (different formats)
        $patterns = [
            '/<h2[^>]*>(.*?)<\/h2>/is',           // Standard h2
            '/<H2[^>]*>(.*?)<\/H2>/s',             // Uppercase H2
        ];

        $h2_matches = [];
        $h2_offsets = [];

        // Try each pattern
        foreach ($patterns as $pattern) {
            if (preg_match_all($pattern, $html, $matches, PREG_OFFSET_CAPTURE)) {
                foreach ($matches[0] as $index => $match) {
                    $offset = $match[1];
                    // Avoid duplicates based on offset
                    if (!isset($h2_offsets[$offset])) {
                        $h2_offsets[$offset] = true;
                        $h2_matches[] = [
                            'full_match' => $match[0],
                            'heading' => strip_tags($matches[1][$index][0]),
                            'start' => $match[1],
                            'end' => $match[1] + strlen($match[0])
                        ];
                    }
                }
            }
        }

        if (empty($h2_matches)) {
            // Fallback: try to find any heading-like structures (h3, strong at start of line)
            // This helps with poorly structured content
            return $this->extract_sections_fallback($html);
        }

        // Sort by position
        usort($h2_matches, function($a, $b) {
            return $a['start'] - $b['start'];
        });

        // Extract content between H2s
        for ($i = 0; $i < count($h2_matches); $i++) {
            $current = $h2_matches[$i];

            // Content starts after the H2 tag
            $content_start = $current['end'];

            // Content ends at the next H2 or end of document
            if (isset($h2_matches[$i + 1])) {
                $content_end = $h2_matches[$i + 1]['start'];
            } else {
                $content_end = strlen($html);
            }

            $content = substr($html, $content_start, $content_end - $content_start);

            // Clean up the content
            $content = trim($content);

            // Remove any wrapper divs that might be incomplete
            $content = preg_replace('/^\s*<\/div>/is', '', $content);
            $content = preg_replace('/<div[^>]*>\s*$/is', '', $content);

            if (!empty($content) || !empty($current['heading'])) {
                $sections[] = [
                    'heading' => trim($current['heading']),
                    'content' => $content
                ];
            }
        }

        return $sections;
    }

    /**
     * Fallback section extraction when no H2s found
     *
     * @param string $html
     * @return array
     */
    private function extract_sections_fallback($html) {
        $sections = [];

        // Try H3 as section headers
        if (preg_match_all('/<h3[^>]*>(.*?)<\/h3>/is', $html, $matches, PREG_OFFSET_CAPTURE)) {
            $h3_positions = [];
            foreach ($matches[0] as $index => $match) {
                $h3_positions[] = [
                    'heading' => strip_tags($matches[1][$index][0]),
                    'start' => $match[1],
                    'end' => $match[1] + strlen($match[0])
                ];
            }

            for ($i = 0; $i < count($h3_positions); $i++) {
                $current = $h3_positions[$i];
                $content_start = $current['end'];
                $content_end = isset($h3_positions[$i + 1]) ? $h3_positions[$i + 1]['start'] : strlen($html);
                $content = trim(substr($html, $content_start, $content_end - $content_start));

                if (!empty($content) || !empty($current['heading'])) {
                    $sections[] = [
                        'heading' => trim($current['heading']),
                        'content' => $content
                    ];
                }
            }
        }

        return $sections;
    }

    /**
     * Extract intro content using regex (content before first H2)
     *
     * @param string $html
     * @return string
     */
    private function extract_intro_regex($html) {
        // Find first H2 position
        if (preg_match('/<h2[^>]*>/is', $html, $match, PREG_OFFSET_CAPTURE)) {
            $first_h2_pos = $match[0][1];

            // Get content before first H2
            $intro = substr($html, 0, $first_h2_pos);

            // Remove H1 tag from intro
            $intro = preg_replace('/<h1[^>]*>.*?<\/h1>/is', '', $intro);

            // Remove wrapper elements
            $intro = preg_replace('/^<(html|head|body|div)[^>]*>/is', '', $intro);
            $intro = preg_replace('/<\/(html|head|body)>$/is', '', $intro);

            // Clean up
            $intro = trim($intro);

            // Remove leading/trailing incomplete tags
            $intro = preg_replace('/^\s*<\/[^>]+>\s*/', '', $intro);
            $intro = preg_replace('/\s*<[^>\/]+>\s*$/', '', $intro);

            return $intro;
        }

        return '';
    }

    /**
     * Get inner HTML of an element
     *
     * @param DOMElement $element
     * @return string
     */
    private function get_inner_html($element) {
        $html = '';
        foreach ($element->childNodes as $child) {
            $html .= $element->ownerDocument->saveHTML($child);
        }
        return trim($html);
    }

    /**
     * Get outer HTML of an element
     *
     * @param DOMNode $node
     * @return string
     */
    private function get_outer_html($node) {
        return $node->ownerDocument->saveHTML($node);
    }

    /**
     * Parse file upload
     *
     * @param array $file $_FILES array element
     * @return array Parsed content
     */
    public function parse_file($file) {
        if (!isset($file['tmp_name']) || !is_readable($file['tmp_name'])) {
            throw new Exception(__('Cannot read uploaded file', 'cutthecrap-content-styler'));
        }

        $content = file_get_contents($file['tmp_name']);
        $extension = pathinfo($file['name'], PATHINFO_EXTENSION);

        $format = 'html';
        if (in_array(strtolower($extension), ['md', 'markdown'])) {
            $format = 'markdown';
        }

        return $this->parse($content, $format);
    }
}
