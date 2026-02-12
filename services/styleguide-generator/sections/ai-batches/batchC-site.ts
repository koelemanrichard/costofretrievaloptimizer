// services/styleguide-generator/sections/ai-batches/batchC-site.ts
// Batch C: Site-wide components — Header, Footer, Floating, Blog, Pagination,
//          Content Typography, Video, Gallery, Slider, Maps, Logos, Special Pages
// Sections: 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 41

import type { DesignTokenSet, BrandAnalysis, SectionCategory } from '../../types';
import type { BusinessInfo } from '../../../../types';
import type { AiSectionSpec } from './aiSectionUtils';
import {
  buildTokenSummary,
  buildBrandSummary,
  callAiForBatch,
  parseAiBatchResponse,
  registerAiSections,
} from './aiSectionUtils';

const BATCH_C_SPECS: AiSectionSpec[] = [
  {
    id: 26,
    title: 'Header & Navigation',
    category: 'site-wide' as SectionCategory,
    description: 'Responsive site header with logo area, navigation links, mobile hamburger toggle, and sticky behavior.',
    tip: 'Use prefix-header-* classes. Mobile menu uses CSS-only toggle or minimal JS.',
  },
  {
    id: 27,
    title: 'Footer',
    category: 'site-wide' as SectionCategory,
    description: 'Multi-column footer with links, contact info, social icons, and copyright bar.',
    tip: 'Use prefix-footer-* classes. Footer uses dark background by default.',
  },
  {
    id: 28,
    title: 'Floating Elements',
    category: 'site-wide' as SectionCategory,
    description: 'Fixed-position elements: back-to-top button, floating CTA, cookie banner, WhatsApp button.',
    tip: 'Use prefix-float-* classes. WhatsApp button uses the fixed #25D366 color.',
  },
  {
    id: 29,
    title: 'Blog Components',
    category: 'site-wide' as SectionCategory,
    description: 'Blog post cards, author bio boxes, related posts grid, and category tags.',
    tip: 'Use prefix-blog-* classes. Blog cards extend the base card component.',
  },
  {
    id: 30,
    title: 'Pagination & TOC',
    category: 'site-wide' as SectionCategory,
    description: 'Page pagination controls and table of contents sidebar with active state.',
    tip: 'Use prefix-pagination-* and prefix-toc-* classes.',
  },
  {
    id: 31,
    title: 'Content Typography',
    category: 'site-wide' as SectionCategory,
    description: 'Article body typography: prose formatting, blockquotes, inline code, drop caps, and pull quotes.',
    tip: 'Use prefix-prose-* classes. Apply to article/post body containers.',
  },
  {
    id: 32,
    title: 'Video Embed',
    category: 'site-wide' as SectionCategory,
    description: 'Responsive video embed containers maintaining 16:9 aspect ratio with play button overlay.',
    tip: 'Use prefix-video-* classes. Works with YouTube, Vimeo, and self-hosted video.',
  },
  {
    id: 33,
    title: 'Gallery',
    category: 'site-wide' as SectionCategory,
    description: 'Image gallery grid with masonry-like layout, lightbox-ready thumbnails, and captions.',
    tip: 'Use prefix-gallery-* classes. Supports 2, 3, and 4 column layouts.',
  },
  {
    id: 34,
    title: 'Slider / Carousel',
    category: 'site-wide' as SectionCategory,
    description: 'CSS-only horizontal slider with navigation dots and prev/next arrows.',
    tip: 'Use prefix-slider-* classes. Uses CSS scroll-snap for smooth behavior.',
  },
  {
    id: 35,
    title: 'Maps',
    category: 'site-wide' as SectionCategory,
    description: 'Embedded map container with responsive aspect ratio and styled info overlay.',
    tip: 'Use prefix-map-* classes. Container adapts to any embed (Google Maps, OpenStreetMap).',
  },
  {
    id: 36,
    title: 'Partner Logos',
    category: 'site-wide' as SectionCategory,
    description: 'Logo strip with grayscale-to-color hover effect, auto-scrolling carousel option.',
    tip: 'Use prefix-logos-* classes. Logos display in grayscale by default, full color on hover.',
  },
  {
    id: 41,
    title: 'Special Page Templates',
    category: 'site-wide' as SectionCategory,
    description: 'Layout templates for 404 error, coming soon, maintenance, and thank-you pages.',
    tip: 'Use prefix-page-* classes. Each template is a full-page centered layout.',
  },
];

function buildBatchCPrompt(tokens: DesignTokenSet, analysis: BrandAnalysis): string {
  const tokenSummary = buildTokenSummary(tokens);
  const brandSummary = buildBrandSummary(analysis);
  const p = tokens.prefix;

  return `You are a senior CSS architect creating an Elementor CSS Design System & Brand Styleguide.

${tokenSummary}

${brandSummary}

Generate CSS and demo HTML for 12 site-wide component sections. ALL class names MUST start with .${p}-

For each section, output:
=== SECTION {id} ===
\`\`\`html
(demo HTML with INLINE STYLES that visually render each component — users must SEE the styled component, not just code. Use style="" attributes with the exact brand colors, fonts, radii, shadows.)
\`\`\`
\`\`\`css
(complete CSS for all variants with .${p}-* prefix)
\`\`\`

CRITICAL REQUIREMENTS:
- Demo HTML MUST use INLINE STYLES (style="...") so components render visually in the browser
- Each demo should look like a finished component, not a code skeleton
- Use the exact brand colors, radii, shadows, and fonts from the token summary
- CSS must be self-contained (no @import, no external dependencies)
- Responsive breakpoints at 640px, 768px, 1024px
- Keep each section's CSS focused and modular
- After each demo, add an Elementor tip: which widget to use, which tab (Content/Style/Advanced), and where to paste the CSS class (Advanced → CSS Classes)

=== SECTION 26 === (Header & Navigation)
Classes: .${p}-header, .${p}-header-logo, .${p}-header-nav, .${p}-header-link, .${p}-header-toggle, .${p}-header-sticky
Demo: Responsive header with logo placeholder, 4 nav links, and mobile hamburger toggle (CSS-only using checkbox).

=== SECTION 27 === (Footer)
Classes: .${p}-footer, .${p}-footer-grid, .${p}-footer-column, .${p}-footer-title, .${p}-footer-link, .${p}-footer-social, .${p}-footer-bottom
Demo: 4-column footer with links, social icons (Font Awesome), and copyright bar.

=== SECTION 28 === (Floating Elements)
Classes: .${p}-float-top (back-to-top), .${p}-float-cta, .${p}-float-whatsapp, .${p}-float-cookie
Demo: Show all 4 floating elements positioned in corners.

=== SECTION 29 === (Blog Components)
Classes: .${p}-blog-card, .${p}-blog-card-img, .${p}-blog-card-body, .${p}-blog-meta, .${p}-blog-author, .${p}-blog-tag, .${p}-blog-related
Demo: 2 blog post cards with image, title, meta, and tags.

=== SECTION 30 === (Pagination & TOC)
Classes: .${p}-pagination, .${p}-pagination-item, .${p}-pagination-active, .${p}-pagination-prev, .${p}-pagination-next
Classes: .${p}-toc, .${p}-toc-item, .${p}-toc-active, .${p}-toc-indent
Demo: Pagination bar and a sidebar TOC with nested items.

=== SECTION 31 === (Content Typography)
Classes: .${p}-prose (container), .${p}-prose-blockquote, .${p}-prose-code, .${p}-prose-dropcap, .${p}-prose-pullquote, .${p}-prose-highlight
Demo: Sample article body with blockquote, inline code, drop cap paragraph, and pull quote.

=== SECTION 32 === (Video Embed)
Classes: .${p}-video, .${p}-video-16x9, .${p}-video-4x3, .${p}-video-play, .${p}-video-caption
Demo: A 16:9 video embed container with play button overlay.

=== SECTION 33 === (Gallery)
Classes: .${p}-gallery, .${p}-gallery-item, .${p}-gallery-caption, .${p}-gallery-2col, .${p}-gallery-3col, .${p}-gallery-4col
Demo: 6 gallery items in a 3-column grid with hover overlay effect.

=== SECTION 34 === (Slider / Carousel)
Classes: .${p}-slider, .${p}-slider-track, .${p}-slider-slide, .${p}-slider-dots, .${p}-slider-dot, .${p}-slider-prev, .${p}-slider-next
Demo: CSS scroll-snap slider with 3 slides and dot navigation.

=== SECTION 35 === (Maps)
Classes: .${p}-map, .${p}-map-16x9, .${p}-map-overlay, .${p}-map-info
Demo: Map embed container with an info overlay card.

=== SECTION 36 === (Partner Logos)
Classes: .${p}-logos, .${p}-logos-item, .${p}-logos-scroll
Demo: A row of 5 placeholder logo boxes with grayscale-to-color hover.

=== SECTION 41 === (Special Page Templates)
Classes: .${p}-page-404, .${p}-page-coming-soon, .${p}-page-maintenance, .${p}-page-thankyou
Demo: Show a 404 error page layout with heading, description, and back-to-home button.`;
}

/**
 * Generate AI-enhanced sections for Batch C (site-wide components).
 * Returns section IDs that were successfully generated.
 */
export async function generateBatchC(
  tokens: DesignTokenSet,
  analysis: BrandAnalysis,
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<unknown>,
): Promise<number[]> {
  const prompt = buildBatchCPrompt(tokens, analysis);
  const response = await callAiForBatch(prompt, businessInfo, dispatch);
  const sectionIds = BATCH_C_SPECS.map(s => s.id);
  const outputs = parseAiBatchResponse(response, sectionIds);

  registerAiSections(BATCH_C_SPECS, outputs);

  return [...outputs.keys()];
}

export { BATCH_C_SPECS };
