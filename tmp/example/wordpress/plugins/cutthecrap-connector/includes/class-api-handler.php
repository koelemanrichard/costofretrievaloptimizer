<?php
/**
 * CutTheCrap API Handler
 *
 * Registers and handles custom REST API endpoints for CutTheCrap integration.
 */

namespace CutTheCrap;

if (!defined('ABSPATH')) {
    exit;
}

class Api_Handler {

    /**
     * REST API namespace
     */
    const NAMESPACE = 'cutthecrap/v1';

    /**
     * Register REST routes
     */
    public function register_routes() {
        // Verify plugin installation
        register_rest_route(self::NAMESPACE, '/verify', [
            'methods' => 'POST',
            'callback' => [$this, 'verify_plugin'],
            'permission_callback' => [$this, 'check_auth_permission'],
        ]);

        // Get post status with content hash
        register_rest_route(self::NAMESPACE, '/post/(?P<id>\d+)/status', [
            'methods' => 'GET',
            'callback' => [$this, 'get_post_status'],
            'permission_callback' => [$this, 'check_auth_permission'],
            'args' => [
                'id' => [
                    'required' => true,
                    'validate_callback' => function($param) {
                        return is_numeric($param);
                    }
                ]
            ]
        ]);

        // Get post analytics
        register_rest_route(self::NAMESPACE, '/post/(?P<id>\d+)/analytics', [
            'methods' => 'GET',
            'callback' => [$this, 'get_post_analytics'],
            'permission_callback' => [$this, 'check_auth_permission'],
            'args' => [
                'id' => [
                    'required' => true,
                    'validate_callback' => function($param) {
                        return is_numeric($param);
                    }
                ],
                'start' => [
                    'required' => false,
                    'sanitize_callback' => 'sanitize_text_field'
                ],
                'end' => [
                    'required' => false,
                    'sanitize_callback' => 'sanitize_text_field'
                ]
            ]
        ]);

        // Bulk status check
        register_rest_route(self::NAMESPACE, '/bulk/status', [
            'methods' => 'POST',
            'callback' => [$this, 'bulk_status_check'],
            'permission_callback' => [$this, 'check_auth_permission'],
        ]);

        // Get categories for mapping
        register_rest_route(self::NAMESPACE, '/categories', [
            'methods' => 'GET',
            'callback' => [$this, 'get_categories'],
            'permission_callback' => [$this, 'check_auth_permission'],
        ]);
    }

    /**
     * Check if user has permission (authenticated via Application Password)
     */
    public function check_auth_permission(\WP_REST_Request $request) {
        // Check if user is logged in via Application Password
        if (!is_user_logged_in()) {
            return new \WP_Error(
                'rest_not_logged_in',
                __('You must be authenticated to access this endpoint.', 'cutthecrap-connector'),
                ['status' => 401]
            );
        }

        // Check if user can edit posts
        if (!current_user_can('edit_posts')) {
            return new \WP_Error(
                'rest_forbidden',
                __('You do not have permission to access this endpoint.', 'cutthecrap-connector'),
                ['status' => 403]
            );
        }

        // Optionally verify HMAC signature
        $signature = $request->get_header('X-CutTheCrap-Signature');
        $timestamp = $request->get_header('X-CutTheCrap-Timestamp');

        if ($signature && $timestamp) {
            if (!$this->verify_hmac_signature($request, $signature, $timestamp)) {
                return new \WP_Error(
                    'rest_invalid_signature',
                    __('Invalid request signature.', 'cutthecrap-connector'),
                    ['status' => 401]
                );
            }
        }

        return true;
    }

    /**
     * Verify HMAC signature
     */
    private function verify_hmac_signature(\WP_REST_Request $request, $signature, $timestamp) {
        // Check timestamp (allow 5 minute window)
        $now = time() * 1000; // Convert to milliseconds
        $timestamp_int = intval($timestamp);

        if (abs($now - $timestamp_int) > 300000) { // 5 minutes
            return false;
        }

        $hmac_secret = get_option('cutthecrap_hmac_secret', '');
        if (empty($hmac_secret)) {
            return true; // No secret configured, skip verification
        }

        $method = $request->get_method();
        $endpoint = $request->get_route();
        $body = $request->get_body();

        $payload = json_encode([
            'method' => $method,
            'endpoint' => $endpoint,
            'body' => $body ? json_decode($body) : null,
            'timestamp' => $timestamp_int
        ]);

        $expected = hash_hmac('sha256', $timestamp . '.' . $payload, $hmac_secret);

        return hash_equals($expected, $signature);
    }

    /**
     * Verify plugin installation endpoint
     */
    public function verify_plugin(\WP_REST_Request $request) {
        $site_id = get_option('cutthecrap_site_id', '');
        $hmac_secret = get_option('cutthecrap_hmac_secret', '');

        // Detect SEO plugin
        $seo_plugin = 'none';
        if (defined('WPSEO_VERSION')) {
            $seo_plugin = 'yoast';
        } elseif (defined('RANK_MATH_VERSION')) {
            $seo_plugin = 'rankmath';
        }

        // Get capabilities
        $capabilities = ['publish_posts', 'upload_files'];
        if (current_user_can('edit_others_posts')) {
            $capabilities[] = 'edit_others_posts';
        }

        // Only return HMAC secret on first verification (when no signature provided)
        $include_secret = !$request->get_header('X-CutTheCrap-Signature');

        $response = [
            'verified' => true,
            'plugin_version' => CUTTHECRAP_VERSION,
            'site_id' => $site_id,
            'capabilities' => $capabilities,
            'seo_plugin' => $seo_plugin,
            'gsc_connected' => false, // Would check GSC connection if available
            'wordpress_version' => get_bloginfo('version'),
            'site_name' => get_bloginfo('name'),
            'site_url' => get_site_url()
        ];

        if ($include_secret) {
            $response['hmac_secret'] = $hmac_secret;
        }

        return rest_ensure_response($response);
    }

    /**
     * Get post status with content hash
     */
    public function get_post_status(\WP_REST_Request $request) {
        $post_id = $request->get_param('id');
        $post = get_post($post_id);

        if (!$post) {
            return new \WP_Error(
                'rest_post_not_found',
                __('Post not found.', 'cutthecrap-connector'),
                ['status' => 404]
            );
        }

        // Calculate content hash
        $content_hash = hash('sha256', $post->post_content);

        $response = [
            'id' => $post->ID,
            'status' => $post->post_status,
            'modified' => $post->post_modified_gmt,
            'content_hash' => $content_hash
        ];

        // Add Yoast meta if available
        if (defined('WPSEO_VERSION')) {
            $response['yoast_meta'] = [
                'focus_keyword' => get_post_meta($post_id, '_yoast_wpseo_focuskw', true),
                'meta_description' => get_post_meta($post_id, '_yoast_wpseo_metadesc', true),
                'seo_score' => get_post_meta($post_id, '_yoast_wpseo_linkdex', true),
                'readability_score' => get_post_meta($post_id, '_yoast_wpseo_content_score', true)
            ];
        }

        // Add RankMath meta if available
        if (defined('RANK_MATH_VERSION')) {
            $response['rankmath_meta'] = [
                'focus_keyword' => get_post_meta($post_id, 'rank_math_focus_keyword', true),
                'meta_description' => get_post_meta($post_id, 'rank_math_description', true),
                'seo_score' => get_post_meta($post_id, 'rank_math_seo_score', true)
            ];
        }

        // Add CutTheCrap meta
        $response['cutthecrap_meta'] = [
            'topic_id' => get_post_meta($post_id, '_cutthecrap_topic_id', true),
            'brief_id' => get_post_meta($post_id, '_cutthecrap_brief_id', true),
            'version_hash' => get_post_meta($post_id, '_cutthecrap_version_hash', true)
        ];

        return rest_ensure_response($response);
    }

    /**
     * Get post analytics
     */
    public function get_post_analytics(\WP_REST_Request $request) {
        $post_id = $request->get_param('id');
        $post = get_post($post_id);

        if (!$post) {
            return new \WP_Error(
                'rest_post_not_found',
                __('Post not found.', 'cutthecrap-connector'),
                ['status' => 404]
            );
        }

        $response = [
            'id' => $post_id,
            'views' => 0,
            'visitors' => 0,
            'comments' => (int) $post->comment_count
        ];

        // Try to get Jetpack stats if available
        if (function_exists('stats_get_csv')) {
            $start = $request->get_param('start');
            $end = $request->get_param('end');

            // This would require Jetpack stats module
            // For now, just return basic data
        }

        // Try to get views from popular plugins
        // WP Statistics
        if (function_exists('wp_statistics_pages')) {
            $response['views'] = wp_statistics_pages('total', '', $post_id);
        }

        // MonsterInsights
        $monster_views = get_post_meta($post_id, '_monsterinsights_page_views', true);
        if ($monster_views) {
            $response['views'] = (int) $monster_views;
        }

        return rest_ensure_response($response);
    }

    /**
     * Bulk status check
     */
    public function bulk_status_check(\WP_REST_Request $request) {
        $post_ids = $request->get_param('post_ids');

        if (!is_array($post_ids)) {
            return new \WP_Error(
                'rest_invalid_param',
                __('post_ids must be an array.', 'cutthecrap-connector'),
                ['status' => 400]
            );
        }

        // Limit to 100 posts per request
        $post_ids = array_slice(array_map('intval', $post_ids), 0, 100);

        $posts = [];

        foreach ($post_ids as $post_id) {
            $post = get_post($post_id);
            if ($post) {
                $posts[] = [
                    'id' => $post->ID,
                    'status' => $post->post_status,
                    'modified' => $post->post_modified_gmt,
                    'content_hash' => hash('sha256', $post->post_content)
                ];
            }
        }

        return rest_ensure_response([
            'posts' => $posts
        ]);
    }

    /**
     * Get categories for mapping
     */
    public function get_categories(\WP_REST_Request $request) {
        $categories = get_categories([
            'hide_empty' => false,
            'orderby' => 'name',
            'order' => 'ASC'
        ]);

        $result = [];

        foreach ($categories as $category) {
            $result[] = [
                'id' => $category->term_id,
                'name' => $category->name,
                'slug' => $category->slug,
                'parent' => $category->parent,
                'count' => $category->count
            ];
        }

        return rest_ensure_response($result);
    }
}
