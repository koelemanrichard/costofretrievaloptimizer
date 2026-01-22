=== CTC Styled Content ===
Contributors: ctcplatform
Tags: styling, content, publishing, seo, css
Requires at least: 5.8
Tested up to: 6.4
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Injects scoped CSS styles for content published from the CTC SEO platform.

== Description ==

CTC Styled Content provides brand-aware styling for content published from the CTC SEO platform. It uses low-specificity CSS selectors that work seamlessly with any WordPress theme.

**Features:**

* Scoped CSS styles that don't interfere with your theme
* CSS variables for easy customization
* Reading progress bar
* Interactive table of contents
* FAQ accordion functionality
* Smooth scrolling navigation
* Print-optimized styles
* Mobile-responsive design

**How It Works:**

When you publish content from the CTC platform, this plugin automatically:

1. Detects styled content by looking for CTC markers
2. Injects CSS variables based on your brand settings
3. Loads scoped component styles
4. Enables interactive features like FAQ accordions and ToC

**CSS Variables:**

The plugin uses CSS custom properties (variables) that can be customized:

* `--ctc-primary` - Primary brand color
* `--ctc-secondary` - Secondary brand color
* `--ctc-accent` - Accent color for highlights
* `--ctc-background` - Page background
* `--ctc-surface` - Card/section backgrounds
* `--ctc-text` - Main text color
* `--ctc-text-muted` - Secondary text color
* `--ctc-font-heading` - Heading font family
* `--ctc-font-body` - Body font family

== Installation ==

1. Upload the `ctc-styled-content` folder to `/wp-content/plugins/`
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Configure settings under Settings > CTC Styled Content

== Frequently Asked Questions ==

= Will this affect my theme's styles? =

No. The plugin uses the `:where()` CSS selector with low specificity, so your theme's styles take precedence. The CTC styles only apply to content specifically published from the CTC platform.

= Can I customize the colors? =

Yes! Go to Settings > CTC Styled Content and add custom CSS variables in the provided textarea. For example:
`--ctc-primary: #FF5733;`

= Does this work with page builders? =

Yes. The styles are scoped to elements with CTC classes, so they won't interfere with Elementor, Divi, or other page builders.

= How do I disable the progress bar? =

Go to Settings > CTC Styled Content and uncheck "Enable Progress Bar".

== Screenshots ==

1. Settings page with customization options
2. Styled blog post with table of contents
3. FAQ accordion in action

== Changelog ==

= 1.0.0 =
* Initial release
* Scoped CSS component styles
* CSS variable injection
* Reading progress bar
* FAQ accordion functionality
* Table of contents toggle
* Smooth scroll navigation

== Upgrade Notice ==

= 1.0.0 =
Initial release of CTC Styled Content plugin.
