<?php
/**
 * CutTheCrap Connector Settings Page
 */

if (!defined('ABSPATH')) {
    exit;
}
?>

<div class="wrap cutthecrap-settings">
    <h1><?php echo esc_html(get_admin_page_title()); ?></h1>

    <div class="cutthecrap-header">
        <div class="cutthecrap-logo">
            <h2>CutTheCrap Connector</h2>
            <span class="version">v<?php echo esc_html(CUTTHECRAP_VERSION); ?></span>
        </div>
        <p class="description">
            <?php esc_html_e('Connect your WordPress site to CutTheCrap for seamless content publishing and management.', 'cutthecrap-connector'); ?>
        </p>
    </div>

    <div class="cutthecrap-status-card">
        <h3><?php esc_html_e('Connection Status', 'cutthecrap-connector'); ?></h3>
        <div class="status-indicator">
            <span class="status-dot status-active"></span>
            <span><?php esc_html_e('Plugin Active', 'cutthecrap-connector'); ?></span>
        </div>
        <p class="help-text">
            <?php esc_html_e('To connect this site to CutTheCrap:', 'cutthecrap-connector'); ?>
        </p>
        <ol>
            <li><?php esc_html_e('Go to your CutTheCrap dashboard', 'cutthecrap-connector'); ?></li>
            <li><?php esc_html_e('Click "Add WordPress Connection"', 'cutthecrap-connector'); ?></li>
            <li><?php esc_html_e('Enter this site URL:', 'cutthecrap-connector'); ?> <code><?php echo esc_url(get_site_url()); ?></code></li>
            <li><?php esc_html_e('Create an Application Password in your WordPress profile', 'cutthecrap-connector'); ?></li>
            <li><?php esc_html_e('Enter your username and the Application Password', 'cutthecrap-connector'); ?></li>
        </ol>

        <div class="app-password-help">
            <h4><?php esc_html_e('How to create an Application Password:', 'cutthecrap-connector'); ?></h4>
            <ol>
                <li><?php esc_html_e('Go to Users → Profile in your WordPress admin', 'cutthecrap-connector'); ?></li>
                <li><?php esc_html_e('Scroll to "Application Passwords" section', 'cutthecrap-connector'); ?></li>
                <li><?php esc_html_e('Enter "CutTheCrap" as the application name', 'cutthecrap-connector'); ?></li>
                <li><?php esc_html_e('Click "Add New Application Password"', 'cutthecrap-connector'); ?></li>
                <li><?php esc_html_e('Copy the generated password (you won\'t see it again!)', 'cutthecrap-connector'); ?></li>
            </ol>
            <a href="<?php echo esc_url(admin_url('profile.php#application-passwords-section')); ?>" class="button button-secondary">
                <?php esc_html_e('Go to Application Passwords', 'cutthecrap-connector'); ?>
            </a>
        </div>
    </div>

    <form method="post" action="options.php">
        <?php
        settings_fields('cutthecrap_settings');
        do_settings_sections('cutthecrap-connector');
        submit_button();
        ?>
    </form>

    <div class="cutthecrap-info-card">
        <h3><?php esc_html_e('REST API Endpoints', 'cutthecrap-connector'); ?></h3>
        <p class="description">
            <?php esc_html_e('This plugin provides the following API endpoints for CutTheCrap integration:', 'cutthecrap-connector'); ?>
        </p>
        <table class="widefat">
            <thead>
                <tr>
                    <th><?php esc_html_e('Endpoint', 'cutthecrap-connector'); ?></th>
                    <th><?php esc_html_e('Method', 'cutthecrap-connector'); ?></th>
                    <th><?php esc_html_e('Description', 'cutthecrap-connector'); ?></th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><code>/wp-json/cutthecrap/v1/verify</code></td>
                    <td>POST</td>
                    <td><?php esc_html_e('Verify plugin installation and get site info', 'cutthecrap-connector'); ?></td>
                </tr>
                <tr>
                    <td><code>/wp-json/cutthecrap/v1/post/{id}/status</code></td>
                    <td>GET</td>
                    <td><?php esc_html_e('Get post status with content hash for sync', 'cutthecrap-connector'); ?></td>
                </tr>
                <tr>
                    <td><code>/wp-json/cutthecrap/v1/post/{id}/analytics</code></td>
                    <td>GET</td>
                    <td><?php esc_html_e('Get post analytics data', 'cutthecrap-connector'); ?></td>
                </tr>
                <tr>
                    <td><code>/wp-json/cutthecrap/v1/bulk/status</code></td>
                    <td>POST</td>
                    <td><?php esc_html_e('Bulk check multiple posts status', 'cutthecrap-connector'); ?></td>
                </tr>
                <tr>
                    <td><code>/wp-json/cutthecrap/v1/categories</code></td>
                    <td>GET</td>
                    <td><?php esc_html_e('Get categories for content mapping', 'cutthecrap-connector'); ?></td>
                </tr>
            </tbody>
        </table>
    </div>

    <div class="cutthecrap-footer">
        <p>
            <?php
            printf(
                /* translators: %s: CutTheCrap website URL */
                esc_html__('Need help? Visit %s for documentation and support.', 'cutthecrap-connector'),
                '<a href="https://cutthecrap.net/docs" target="_blank">cutthecrap.net/docs</a>'
            );
            ?>
        </p>
    </div>
</div>
