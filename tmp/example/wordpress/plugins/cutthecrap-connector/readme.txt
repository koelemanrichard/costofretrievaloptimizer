=== CutTheCrap Connector ===
Contributors: cutthecrap
Tags: seo, content, publishing, automation, topical-authority
Requires at least: 5.6
Tested up to: 6.4
Requires PHP: 7.4
Stable tag: 0.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Connect your WordPress site to CutTheCrap for seamless SEO-optimized content publishing.

== Description ==

CutTheCrap Connector enables bidirectional sync between your WordPress site and CutTheCrap, the AI-powered topical authority platform.

**Features:**

* **One-Click Publishing** - Push optimized content from CutTheCrap directly to WordPress
* **Status Synchronization** - Track publication status (draft, published, scheduled) in real-time
* **Version Tracking** - Detect changes made in WordPress and sync back to CutTheCrap
* **SEO Integration** - Works with Yoast SEO and RankMath for meta optimization
* **Webhook Support** - Get notified when posts are updated in WordPress
* **Secure Authentication** - Uses WordPress Application Passwords with HMAC request signing

**Requirements:**

* WordPress 5.6 or higher
* PHP 7.4 or higher
* A CutTheCrap account (https://cutthecrap.net)

== Installation ==

1. Upload the `cutthecrap-connector` folder to `/wp-content/plugins/`
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Go to Settings → CutTheCrap to see your Site ID
4. In your WordPress profile, create an Application Password for CutTheCrap
5. In CutTheCrap, add a new WordPress connection using your site URL and credentials

== Frequently Asked Questions ==

= What is an Application Password? =

Application Passwords are a WordPress feature (5.6+) that allows external applications to authenticate without sharing your main password. Go to Users → Profile → Application Passwords to create one.

= Is my data secure? =

Yes. We use WordPress's built-in REST API authentication with Application Passwords, plus optional HMAC request signing for enhanced security. Your credentials are encrypted and never stored in plain text.

= Does this work with Yoast/RankMath? =

Yes! The plugin detects which SEO plugin you're using and can sync focus keywords, meta descriptions, and other SEO settings.

= Can I publish to multiple WordPress sites? =

Yes, CutTheCrap supports connecting multiple WordPress sites. Each site needs its own plugin installation and Application Password.

== Changelog ==

= 0.1.0 =
* Initial release
* Plugin verification endpoint
* Post status and content hash endpoints
* Bulk status checking
* Webhook support for post updates
* Admin settings page

== Upgrade Notice ==

= 0.1.0 =
Initial release. Install and connect to CutTheCrap to start publishing!
