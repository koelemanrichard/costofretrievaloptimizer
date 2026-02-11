/**
 * CSS Builder — Fallback CSS Generation
 *
 * Generates CSS styles from brand design values when no compiledCss is available.
 * Includes structural CSS, visual fallback CSS, base styles, emphasis levels,
 * and content-type-specific styles (steps, FAQ, comparison, lists, etc.).
 *
 * @module services/publishing/renderer/cssBuilder
 */

export function generateStructuralCSS(): string {
  // IMPORTANT: This method ONLY contains layout primitives (positioning, sizing,
  // spacing, responsive breakpoints). ALL component-specific selectors
  // (.feature-card, .step-item, .faq-item, .timeline-*, etc.) are defined
  // EXCLUSIVELY in ComponentStyles.ts to prevent CSS cascade conflicts.
  //
  // Previous versions duplicated component selectors here with conflicting
  // structural-only properties (e.g., .feature-card { display: flex; gap: 1rem; })
  // which overrode ComponentStyles' rich visual properties (backgrounds, shadows,
  // borders, colors). This caused the "unstyled but structured" appearance.
  return `
/* ==========================================================================
 Structural CSS - Layout primitives ONLY (no component selectors)
 ComponentStyles.ts is the single source of truth for all component styling.
 ========================================================================== */

/* Section layout structure */
.section { position: relative; margin: 0; }
.section-container { max-width: 860px; margin: 0 auto; padding: 0 1.5rem; }
.section-content { margin-top: 1.5rem; }
.section-inner { max-width: 100%; margin-top: 1.5rem; }

/* Layout width classes */
.layout-narrow .section-container { max-width: 680px; }
.layout-medium .section-container { max-width: 860px; }
.layout-wide .section-container { max-width: 1100px; }
.layout-full .section-container { max-width: 100%; padding: 0 2rem; }

/* Column layout */
.columns-2-column .section-content { column-count: 2; column-gap: 2rem; }
.columns-3-column .section-content { column-count: 3; column-gap: 1.5rem; }
.columns-asymmetric-left .section-content { display: grid; grid-template-columns: 1fr 2fr; gap: 2rem; }
.columns-asymmetric-right .section-content { display: grid; grid-template-columns: 2fr 1fr; gap: 2rem; }

/* Spacing utilities */
.spacing-before-tight { padding-top: 1rem; }
.spacing-before-normal { padding-top: 2rem; }
.spacing-before-generous { padding-top: 3rem; }
.spacing-before-dramatic { padding-top: 5rem; }
.spacing-after-tight { padding-bottom: 1rem; }
.spacing-after-normal { padding-bottom: 2rem; }
.spacing-after-generous { padding-bottom: 3rem; }
.spacing-after-dramatic { padding-bottom: 5rem; }

/* Generic HTML element resets for standalone documents */
table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; }
th { padding: 0.75rem 1rem; text-align: left; }
td { padding: 0.75rem 1rem; }
figure { margin: 2rem 0; }
figure img { width: 100%; height: auto; }
figcaption { text-align: center; margin-top: 0.75rem; }
blockquote { padding: 1rem 1.5rem; margin: 1.5rem 0; }

/* Responsive breakpoints */
@media (max-width: 768px) {
.columns-2-column .section-content,
.columns-3-column .section-content { column-count: 1; }
.columns-asymmetric-left .section-content,
.columns-asymmetric-right .section-content { grid-template-columns: 1fr; }
.section-container { padding: 0 1rem; }
}

@media (max-width: 480px) {
.section-container { padding: 0 1rem; }
}
`;
}

/**
 * Generate VISUAL FALLBACK CSS for when no compiledCss is available.
 * Includes full visual styling (colors, backgrounds, fonts, shadows, borders)
 * using brand CSS variables from the AI-generated compiledCss or hardcoded fallbacks.
 * This is the LEGACY path — kept for backward compatibility when no compiledCss exists.
 */
export function generateVisualFallbackCSS(): string {
  return `
/* ==========================================================================
 Supplementary Styles - Structure + Visual styling using brand CSS variables
 The AI-generated compiledCss sets --ctc-* custom properties.
 This CSS uses those properties to style ALL semantic class names
 that the CleanArticleRenderer generates in HTML.
 ========================================================================== */

/* Page-level: Soft branded background */
body, .article-body, .styled-article {
background: linear-gradient(180deg, #f0f4ff 0%, #f8faff 100%);
min-height: 100vh;
}
@supports (background: color-mix(in srgb, red 50%, blue)) {
body, .article-body, .styled-article {
  background: linear-gradient(180deg, color-mix(in srgb, var(--ctc-primary, #2563eb) 7%, white) 0%, color-mix(in srgb, var(--ctc-primary, #2563eb) 4%, white) 100%);
}
}

/* Article structure */
.article-header { margin-bottom: 2rem; text-align: center; }
.article-toc { margin: 1.5rem auto; max-width: 860px; padding: 1.5rem; background: var(--ctc-secondary, #f9fafb); border-radius: var(--ctc-radius-md, 8px); }
.article-toc a { color: var(--ctc-primary, #2563eb); text-decoration: none; }
.article-toc a:hover { text-decoration: underline; }
.section-inner { max-width: 100%; margin-top: 1.5rem; }

/* Section layout structure */
.section { position: relative; margin: 0; padding: 2rem 0; }
.section-container { max-width: 860px; margin: 0 auto; padding: 0 1.5rem; }
.section-content { margin-top: 1.5rem; }

/* White content cards on branded background */
.section:not(.emphasis-hero) .section-container {
background: var(--ctc-neutral-lightest, #ffffff);
border-radius: var(--ctc-radius-lg, 16px);
padding: 2.5rem;
box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}
.section-heading {
font-family: var(--ctc-font-heading, sans-serif);
font-weight: var(--ctc-heading-weight, 700);
color: var(--ctc-text-darkest, #0f172a);
margin-bottom: 1rem;
line-height: 1.3;
}

/* Heading size variants */
.heading-xl { font-size: var(--ctc-font-size-3xl, 2.1rem); }
.heading-lg { font-size: var(--ctc-font-size-2xl, 1.75rem); }
.heading-md { font-size: var(--ctc-font-size-xl, 1.45rem); }
.heading-sm { font-size: var(--ctc-font-size-lg, 1.2rem); }

/* Heading decoration */
.heading-decorated { position: relative; }
.heading-accent {
display: inline-block;
width: 40px;
height: 4px;
background: var(--ctc-primary, #2563eb);
margin-right: 0.75rem;
vertical-align: middle;
border-radius: 2px;
}

/* Layout width classes */
.layout-narrow .section-container { max-width: 680px; }
.layout-medium .section-container { max-width: 860px; }
.layout-wide .section-container { max-width: 1100px; }
.layout-full .section-container { max-width: 100%; padding: 0 2rem; }

/* Column layout */
.columns-2-column .section-content { column-count: 2; column-gap: 2rem; }
.columns-3-column .section-content { column-count: 3; column-gap: 1.5rem; }
.columns-asymmetric-left .section-content { display: grid; grid-template-columns: 1fr 2fr; gap: 2rem; }
.columns-asymmetric-right .section-content { display: grid; grid-template-columns: 2fr 1fr; gap: 2rem; }

/* Spacing utilities */
.spacing-before-tight { padding-top: 1rem; }
.spacing-before-normal { padding-top: 2rem; }
.spacing-before-generous { padding-top: 3rem; }
.spacing-before-dramatic { padding-top: 5rem; }
.spacing-after-tight { padding-bottom: 1rem; }
.spacing-after-normal { padding-bottom: 2rem; }
.spacing-after-generous { padding-bottom: 3rem; }
.spacing-after-dramatic { padding-bottom: 5rem; }

/* Emphasis levels - visual differentiation using brand colors */
.emphasis-hero {
background: linear-gradient(135deg, var(--ctc-primary, #2563eb), var(--ctc-primary-dark, #1e40af));
color: var(--ctc-neutral-lightest, #ffffff);
padding: 3rem 0;
border-radius: var(--ctc-radius-lg, 12px);
margin: 1rem 0;
}
.emphasis-hero .section-heading { color: var(--ctc-neutral-lightest, #ffffff); }
.emphasis-hero .section-content { color: rgba(255,255,255,0.9); }
.emphasis-hero .section-content p { color: rgba(255,255,255,0.92); }
.emphasis-hero .prose { color: rgba(255,255,255,0.92); }
.emphasis-hero .prose p { color: rgba(255,255,255,0.92); }

/* Hero inner component styles */
.hero-content { text-align: center; }
.hero-lead { max-width: 800px; margin: 0 auto 2rem; }
.hero-text { font-size: 1.375rem; line-height: 1.8; color: var(--ctc-text-dark, #1e293b); }
.hero-details { display: flex; justify-content: center; gap: 2rem; flex-wrap: wrap; margin-top: 2rem; }
.emphasis-hero .hero-lead { max-width: 720px; margin: 0 auto; }
.emphasis-hero .hero-text { font-size: 1.125rem; line-height: 1.7; color: rgba(255,255,255,0.92); }

/* Components inside hero - transparent overlays on gradient bg */
.emphasis-hero .step-item,
.emphasis-hero .card,
.emphasis-hero .feature-card,
.emphasis-hero .checklist-item { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.2); color: white; }
.emphasis-hero .step-content,
.emphasis-hero .card-body,
.emphasis-hero .feature-content,
.emphasis-hero .feature-desc,
.emphasis-hero .checklist-text,
.emphasis-hero .timeline-body { color: rgba(255,255,255,0.92); }

.emphasis-featured {
background: var(--ctc-secondary, #f9fafb);
padding: 2.5rem 0;
border-radius: var(--ctc-radius-md, 8px);
margin: 0.5rem 0;
}

.emphasis-standard { padding: 2rem 0; }
.emphasis-supporting { padding: 1.5rem 0; }
.emphasis-minimal { padding: 1rem 0; }

/* Section dividers - branded separator between major sections */
.section + .section.emphasis-featured { border-top: none; position: relative; }
.section + .section.emphasis-featured::before {
content: '';
display: block;
height: 4px;
margin-bottom: 1.5rem;
background: repeating-linear-gradient(
  90deg,
  var(--ctc-primary, #2563eb) 0px, var(--ctc-primary, #2563eb) 18px,
  transparent 18px, transparent 24px,
  var(--ctc-accent, #f59e0b) 24px, var(--ctc-accent, #f59e0b) 30px,
  transparent 30px, transparent 36px
);
}
.section.emphasis-standard + .section.emphasis-standard {
border-top: 2px solid var(--ctc-borders-dividers, #e2e8f0);
padding-top: 3rem;
}

/* Background and accent utilities */
.has-background { background-color: var(--ctc-secondary, #f9fafb); }
.bg-gradient { background: linear-gradient(135deg, var(--ctc-secondary, #f9fafb) 0%, var(--ctc-neutral-lightest, #ffffff) 100%); }
.has-accent-border { border-left: 4px solid var(--ctc-primary, #2563eb); }
.accent-left { border-left: 4px solid var(--ctc-primary, #2563eb); padding-left: 1.5rem; }
.accent-top { border-top: 4px solid var(--ctc-primary, #2563eb); padding-top: 1.5rem; }

/* Elevation (box shadows) */
.elevation-1 { box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06); }
.elevation-2 { box-shadow: 0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06); }
.elevation-3 { box-shadow: 0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05); }
.card-elevation-1 {
box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06);
border-radius: var(--ctc-radius-md, 8px);
background: var(--ctc-neutral-lightest, #ffffff);
border: 1px solid var(--ctc-borders-dividers, #e2e8f0);
}
.card-elevation-2 {
box-shadow: 0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06);
border-radius: var(--ctc-radius-md, 8px);
background: var(--ctc-neutral-lightest, #ffffff);
}

/* Prose typography */
.prose { line-height: 1.7; color: var(--ctc-text-dark, #1e293b); }
.prose p { margin-bottom: 1.25rem; }
.prose a { color: var(--ctc-primary, #2563eb); text-decoration: underline; text-decoration-color: transparent; transition: text-decoration-color 0.2s; }
.prose a:hover { text-decoration-color: currentColor; }
.prose strong { font-weight: 600; color: var(--ctc-text-darkest, #0f172a); }
.prose h2, .prose h3, .prose h4 { font-family: var(--ctc-font-heading, sans-serif); color: var(--ctc-text-darkest, #0f172a); margin-top: 2rem; margin-bottom: 0.75rem; }

/* Card component */
.card {
background: var(--ctc-neutral-lightest, #ffffff);
border-radius: var(--ctc-radius-md, 8px);
border: 1px solid var(--ctc-borders-dividers, #e2e8f0);
overflow: hidden;
transition: box-shadow 0.2s ease, transform 0.2s ease;
}
.card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); transform: translateY(-1px); }
.card-body { padding: 1.5rem; }
.card-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--ctc-borders-dividers, #e2e8f0); font-weight: 600; }

/* Feature grid component */
.feature-grid { display: grid; gap: 1.5rem; }
.feature-grid.columns-2 { grid-template-columns: repeat(2, 1fr); }
.feature-grid.columns-3 { grid-template-columns: repeat(3, 1fr); }
.feature-card {
display: flex;
gap: 1rem;
align-items: flex-start;
padding: 1.25rem;
background: var(--ctc-neutral-lightest, #ffffff);
border: 1px solid var(--ctc-borders-dividers, #e2e8f0);
border-radius: var(--ctc-radius-md, 8px);
transition: box-shadow 0.2s ease;
}
.feature-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.feature-icon {
flex-shrink: 0;
width: 2.5rem;
height: 2.5rem;
display: flex;
align-items: center;
justify-content: center;
background: var(--ctc-secondary, #f0f4ff);
color: var(--ctc-primary, #2563eb);
border-radius: var(--ctc-radius-sm, 6px);
font-size: 1.1rem;
font-weight: 700;
}
.feature-content { flex: 1; min-width: 0; }
.feature-title { font-weight: 600; color: var(--ctc-text-darkest, #0f172a); margin-bottom: 0.35rem; font-size: 0.95rem; line-height: 1.4; }
.feature-desc { font-size: 0.9rem; color: var(--ctc-text-medium, #475569); line-height: 1.5; }

/* Step list component */
.steps-list { list-style: none; padding: 0; counter-reset: step-counter; }
.step-item {
display: flex;
gap: 1rem;
align-items: flex-start;
margin-bottom: 1.5rem;
padding: 1rem;
background: var(--ctc-neutral-lightest, #ffffff);
border-radius: var(--ctc-radius-md, 8px);
border: 1px solid var(--ctc-borders-dividers, #e2e8f0);
}
.step-number {
flex-shrink: 0;
width: 2.25rem;
height: 2.25rem;
border-radius: 50%;
background: var(--ctc-primary, #2563eb);
color: var(--ctc-neutral-lightest, #ffffff);
display: flex;
align-items: center;
justify-content: center;
font-weight: 700;
font-size: 0.875rem;
}
.step-content { flex: 1; }
.step-content strong { display: block; margin-bottom: 0.25rem; color: var(--ctc-text-darkest, #0f172a); }

/* FAQ component */
.faq-list { list-style: none; padding: 0; }
.faq-accordion { display: flex; flex-direction: column; gap: 0; }
.faq-item {
border-bottom: 1px solid var(--ctc-borders-dividers, #e2e8f0);
padding: 1rem 0;
}
.faq-question {
font-weight: 600;
color: var(--ctc-text-darkest, #0f172a);
cursor: pointer;
display: flex;
align-items: center;
gap: 0.5rem;
font-size: 1.05rem;
}
.faq-icon { color: var(--ctc-primary, #2563eb); font-size: 1.1rem; flex-shrink: 0; }
.faq-answer { margin-top: 0.75rem; color: var(--ctc-text-medium, #475569); line-height: 1.6; padding-left: 1.75rem; }

/* Styled list component */
.styled-list { list-style: none; padding: 0; }
.list-item {
display: flex;
gap: 0.75rem;
align-items: flex-start;
margin-bottom: 0.75rem;
padding: 0.5rem 0;
}
.list-marker {
flex-shrink: 0;
color: var(--ctc-primary, #2563eb);
font-weight: 700;
font-size: 1.1rem;
line-height: 1.5;
}
.list-content { flex: 1; line-height: 1.6; }

/* Summary box component */
.summary-box {
background: var(--ctc-secondary, #f9fafb);
border-radius: var(--ctc-radius-md, 8px);
padding: 1.5rem;
border-left: 4px solid var(--ctc-primary, #2563eb);
display: flex;
gap: 1rem;
align-items: flex-start;
margin: 1.5rem 0;
}
.summary-icon {
flex-shrink: 0;
font-size: 1.5rem;
width: 2.5rem;
height: 2.5rem;
display: flex;
align-items: center;
justify-content: center;
background: var(--ctc-primary, #2563eb);
color: white;
border-radius: var(--ctc-radius-sm, 6px);
}
.summary-content { flex: 1; line-height: 1.6; }

/* Definition box component */
.definition-box {
background: var(--ctc-neutral-lightest, #ffffff);
border-radius: var(--ctc-radius-md, 8px);
padding: 1.5rem;
border: 1px solid var(--ctc-borders-dividers, #e2e8f0);
border-left: 4px solid var(--ctc-accent, #3b82f6);
display: flex;
gap: 1rem;
align-items: flex-start;
margin: 1.5rem 0;
}
.definition-icon { flex-shrink: 0; font-size: 1.5rem; color: var(--ctc-accent, #3b82f6); }
.definition-content { flex: 1; line-height: 1.6; }

/* Data highlight component */
.data-highlight {
background: var(--ctc-secondary, #f9fafb);
border-radius: var(--ctc-radius-md, 8px);
padding: 2rem;
text-align: center;
margin: 1.5rem 0;
}

/* Testimonial component */
.testimonial {
background: var(--ctc-secondary, #f9fafb);
border-radius: var(--ctc-radius-md, 8px);
padding: 2rem;
border-left: 4px solid var(--ctc-primary, #2563eb);
margin: 1.5rem 0;
font-style: italic;
}
.testimonial-text { font-size: 1.1rem; line-height: 1.7; color: var(--ctc-text-dark, #1e293b); }
.testimonial-author { margin-top: 1rem; font-style: normal; font-weight: 600; color: var(--ctc-text-medium, #475569); }

/* Stat grid component */
.stat-grid { display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
.stat-card {
text-align: center;
padding: 1.5rem;
background: var(--ctc-neutral-lightest, #ffffff);
border: 1px solid var(--ctc-borders-dividers, #e2e8f0);
border-radius: var(--ctc-radius-md, 8px);
}
.stat-value { font-size: 2rem; font-weight: 700; color: var(--ctc-primary, #2563eb); }
.stat-label { font-size: 0.875rem; color: var(--ctc-text-medium, #475569); margin-top: 0.25rem; }

/* Key takeaways component */
.key-takeaways-grid { display: grid; gap: 1rem; }
.key-takeaways-item {
display: flex;
gap: 0.75rem;
align-items: flex-start;
padding: 1rem;
background: var(--ctc-secondary, #f9fafb);
border-radius: var(--ctc-radius-sm, 6px);
}
.key-takeaways-icon { flex-shrink: 0; color: var(--ctc-primary, #2563eb); font-size: 1.1rem; }

/* Timeline component */
.timeline { position: relative; padding-left: 2rem; }
.timeline::before {
content: '';
position: absolute;
left: 0.5rem;
top: 0;
bottom: 0;
width: 2px;
background: var(--ctc-borders-dividers, #e2e8f0);
}
.timeline-item { position: relative; margin-bottom: 1.5rem; padding-left: 1.5rem; }
.timeline-marker {
position: absolute;
left: -1.5rem;
top: 0.25rem;
width: 1rem;
height: 1rem;
border-radius: 50%;
background: var(--ctc-primary, #2563eb);
border: 2px solid var(--ctc-neutral-lightest, #ffffff);
box-shadow: 0 0 0 2px var(--ctc-primary, #2563eb);
}
.timeline-content { padding-bottom: 0.5rem; }

/* Checklist component */
.checklist { list-style: none; padding: 0; }
.checklist-item {
display: flex;
gap: 0.75rem;
align-items: flex-start;
margin-bottom: 0.75rem;
padding: 0.5rem 0;
}
.checklist-icon { flex-shrink: 0; color: var(--ctc-success, #10b981); font-size: 1.1rem; }

/* CTA section */
.article-cta {
background: linear-gradient(135deg, var(--ctc-primary, #2563eb), var(--ctc-primary-dark, #1e40af));
color: var(--ctc-neutral-lightest, #ffffff);
padding: 3rem;
border-radius: var(--ctc-radius-lg, 12px);
text-align: center;
margin: 2rem 0;
}
.cta-actions { margin-top: 1.5rem; display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
.cta-primary {
display: inline-block;
padding: 0.75rem 2rem;
background: var(--ctc-neutral-lightest, #ffffff);
color: var(--ctc-primary, #2563eb);
border-radius: var(--ctc-radius-md, 8px);
font-weight: 600;
text-decoration: none;
transition: transform 0.2s, box-shadow 0.2s;
}
.cta-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
.cta-secondary {
display: inline-block;
padding: 0.75rem 2rem;
background: transparent;
color: var(--ctc-neutral-lightest, #ffffff);
border: 2px solid rgba(255,255,255,0.5);
border-radius: var(--ctc-radius-md, 8px);
font-weight: 600;
text-decoration: none;
transition: border-color 0.2s;
}
.cta-secondary:hover { border-color: rgba(255,255,255,0.9); }

/* Table styling */
table {
width: 100%;
border-collapse: collapse;
margin: 1.5rem 0;
font-size: 0.95rem;
}
th {
background: var(--ctc-primary, #2563eb);
color: var(--ctc-neutral-lightest, #ffffff);
font-weight: 600;
padding: 0.75rem 1rem;
text-align: left;
}
td {
padding: 0.75rem 1rem;
border-bottom: 1px solid var(--ctc-borders-dividers, #e2e8f0);
}
tr:nth-child(even) td { background: var(--ctc-secondary, #f9fafb); }

/* Blockquote */
blockquote {
border-left: 4px solid var(--ctc-primary, #2563eb);
padding: 1rem 1.5rem;
margin: 1.5rem 0;
background: var(--ctc-secondary, #f9fafb);
border-radius: 0 var(--ctc-radius-md, 8px) var(--ctc-radius-md, 8px) 0;
font-style: italic;
color: var(--ctc-text-dark, #1e293b);
}

/* Image placeholders */
.ctc-image-placeholder {
background: var(--ctc-secondary, #f0f4f8);
border: 2px dashed var(--ctc-borders-dividers, #cbd5e1);
border-radius: var(--ctc-radius-md, 8px);
padding: 2rem;
text-align: center;
color: var(--ctc-text-medium, #64748b);
font-style: italic;
margin: 1.5rem 0;
}

/* Responsive */
@media (max-width: 768px) {
.feature-grid.columns-2,
.feature-grid.columns-3 { grid-template-columns: 1fr; }
.columns-2-column .section-content,
.columns-3-column .section-content { column-count: 1; }
.columns-asymmetric-left .section-content,
.columns-asymmetric-right .section-content { grid-template-columns: 1fr; }
.stat-grid { grid-template-columns: repeat(2, 1fr); }
.article-cta { padding: 2rem 1.5rem; }
.emphasis-hero { padding: 2rem 0; }
.step-item { flex-direction: column; }
.summary-box, .definition-box { flex-direction: column; }
}

@media (max-width: 480px) {
.stat-grid { grid-template-columns: 1fr; }
.section-container { padding: 0 1rem; }
}
`;
}

/**
 * Generate base CSS styles - typography, layout, basic elements
 */
export function generateBaseCSS(
  primary: string,
  primaryDark: string,
  textDark: string,
  textMedium: string,
  bgLight: string,
  border: string,
  headingFont: string,
  bodyFont: string,
  radiusSm: string,
  radiusMd: string,
  radiusLg: string,
  accent: string,
  brandName: string = 'Brand'
): string {
  return `
/* ==========================================================================
 Clean Article Styles - Generated for ${brandName}
 Brand Primary: ${primary}
 ========================================================================== */

/* Reset */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* Base Typography */
html { font-size: 16px; scroll-behavior: smooth; }

body {
font-family: ${bodyFont};
font-size: 1rem;
line-height: 1.7;
color: ${textDark};
background-color: #ffffff;
-webkit-font-smoothing: antialiased;
}

/* Headings */
h1, h2, h3, h4, h5, h6 {
font-family: ${headingFont};
font-weight: 700;
color: ${primaryDark};
line-height: 1.3;
margin-bottom: 1rem;
}

h1 { font-size: 2.5rem; }
h2 { font-size: 1.875rem; margin-top: 2.5rem; }
h3 { font-size: 1.5rem; margin-top: 2rem; }
h4 { font-size: 1.25rem; margin-top: 1.5rem; }

p { margin-bottom: 1.25rem; max-width: 70ch; }

a { color: ${primary}; text-decoration: none; transition: color 0.2s; }
a:hover { color: ${primaryDark}; text-decoration: underline; }

strong { font-weight: 600; color: ${primaryDark}; }

/* Article Header - branded hero with gradient */
.article-header {
padding: 4rem 2rem 3rem;
background: linear-gradient(135deg, ${primaryDark} 0%, ${primary} 100%);
position: relative;
overflow: hidden;
}

.article-header::after {
content: '';
position: absolute;
bottom: 0;
left: 0;
right: 0;
height: 4px;
background: linear-gradient(90deg, ${primary}, ${accent});
}

.article-header-inner {
max-width: 900px;
margin: 0 auto;
}

.article-header h1 {
max-width: 900px;
margin: 0 auto;
font-size: 2.5rem;
color: #ffffff;
line-height: 1.2;
letter-spacing: -0.02em;
}

/* Table of Contents - minimal semantic styling */
.article-toc {
max-width: 900px;
margin: 2rem auto;
padding: 1.5rem 2rem;
border-left: 3px solid ${primary};
background: ${bgLight};
}

.article-toc ul {
list-style: none;
padding: 0;
margin: 0;
display: flex;
flex-direction: column;
gap: 0.5rem;
}

.article-toc li a {
color: ${textDark};
padding: 0.5rem 0;
display: block;
border-bottom: 1px solid transparent;
transition: all 0.2s;
}

.article-toc li a:hover {
color: ${primary};
border-bottom-color: ${primary};
text-decoration: none;
}

/* Main Content */
main {
max-width: 900px;
margin: 0 auto;
padding: 0 2rem;
}

article {
padding: 2rem 0;
}

/* Sections - with visual rhythm using brand primary */
.section {
padding: 3rem 0;
}

.section:nth-child(even of .section) {
background: ${primary}06;
}

.section + .section {
border-top: 1px solid ${primary}12;
}

.section:last-child {
border-bottom: none;
}

.section-alt {
background: ${primary}0a;
margin: 0 -2rem;
padding: 3rem 2rem;
border-radius: ${radiusMd};
}

.section-inner {
max-width: 100%;
}

/* Lists */
ul, ol {
padding-left: 1.5rem;
margin-bottom: 1.5rem;
}

li {
margin-bottom: 0.5rem;
line-height: 1.6;
}

ul li::marker {
color: ${primary};
}

/* Tables */
.table-wrapper {
overflow-x: auto;
margin: 2rem 0;
border-radius: ${radiusMd};
box-shadow: 0 2px 10px rgba(0,0,0,0.05);
}

table {
width: 100%;
border-collapse: collapse;
font-size: 0.95rem;
}

thead {
background: ${primary};
color: #ffffff;
}

th {
padding: 1rem;
text-align: left;
font-weight: 600;
}

td {
padding: 1rem;
border-bottom: 1px solid ${bgLight};
}

tbody tr:hover {
background: ${bgLight};
}

/* Images */
figure {
margin: 2rem 0;
}

figure img {
width: 100%;
height: auto;
border-radius: ${radiusMd};
box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}

figcaption {
font-size: 0.875rem;
color: ${textMedium};
text-align: center;
margin-top: 0.75rem;
}

/* Blockquotes */
blockquote {
border-left: 4px solid ${primary};
padding: 1.5rem 2rem;
margin: 2rem 0;
background: ${bgLight};
border-radius: 0 ${radiusMd} ${radiusMd} 0;
}

blockquote p {
font-size: 1.1rem;
font-style: italic;
color: ${textMedium};
margin-bottom: 0;
}

/* CTA - only rendered if content provided */
.article-cta {
max-width: 900px;
margin: 3rem auto;
padding: 2rem;
background: ${bgLight};
border-radius: ${radiusMd};
text-align: center;
}

.article-cta h2 {
color: ${primaryDark};
margin-top: 0;
}

.cta-actions {
display: flex;
gap: 1rem;
justify-content: center;
flex-wrap: wrap;
margin-top: 1.5rem;
}

.cta-primary, .cta-secondary {
padding: 0.75rem 1.5rem;
border-radius: ${radiusSm};
font-weight: 600;
text-decoration: none;
transition: all 0.2s;
}

.cta-primary {
background: ${primary};
color: #ffffff;
}

.cta-primary:hover {
background: ${primaryDark};
text-decoration: none;
}

.cta-secondary {
background: transparent;
color: ${primary};
border: 1px solid ${primary};
}

.cta-secondary:hover {
background: ${primary};
color: #ffffff;
text-decoration: none;
}

/* Responsive */
@media (max-width: 768px) {
.article-header { padding: 2rem 1rem; }
.article-header h1 { font-size: 1.75rem; }

.article-toc { margin: 1.5rem 1rem; padding: 1rem; }

main { padding: 0 1rem; }

.section-alt { margin: 0 -1rem; padding: 2rem 1rem; }

h2 { font-size: 1.5rem; }
h3 { font-size: 1.25rem; }

.article-cta { margin: 2rem 1rem; padding: 1.5rem; }

.cta-actions { flex-direction: column; }
.cta-primary, .cta-secondary { width: 100%; text-align: center; }
}
`;
}

/**
 * Generate CSS for emphasis levels (hero, featured, standard, supporting, minimal)
 * Maps Layout Engine emphasis decisions to visual styling
 */
export function generateEmphasisCSS(
  primary: string,
  primaryDark: string,
  accent: string,
  bgLight: string,
  headingFont: string,
  radiusMd: string,
  radiusLg: string
): string {
  return `
/* ==========================================================================
 EMPHASIS LEVELS - Visual styling from Layout Engine decisions
 ========================================================================== */

/* Hero emphasis - Maximum visual impact */
.emphasis-hero {
padding: 4rem 2rem;
background: linear-gradient(135deg, ${primary}10 0%, ${primary}05 100%);
border-radius: ${radiusLg};
margin: 2rem 0;
position: relative;
}

.emphasis-hero::before {
content: '';
position: absolute;
top: 0;
left: 0;
right: 0;
height: 4px;
background: linear-gradient(90deg, ${primary}, ${accent});
border-radius: ${radiusLg} ${radiusLg} 0 0;
}

.emphasis-hero .section-heading {
font-size: 2.25rem;
color: ${primary};
margin-bottom: 1.5rem;
}

/* Featured emphasis - Strong visual presence */
.emphasis-featured {
padding: 3rem 2rem;
background: ${primary}08;
border-radius: ${radiusMd};
margin: 1.5rem 0;
border-left: 4px solid ${primary};
}

.emphasis-featured .section-heading {
font-size: 1.75rem;
color: ${primary};
}

/* Standard emphasis - Default styling */
.emphasis-standard {
padding: 2rem 0;
}

.emphasis-standard .section-heading {
font-size: 1.5rem;
}

/* Supporting emphasis - Reduced visual weight */
.emphasis-supporting {
padding: 1.5rem 0;
}

.emphasis-supporting .section-heading {
font-size: 1.25rem;
color: ${primary};
}

/* Minimal emphasis - Lightweight styling */
.emphasis-minimal {
padding: 1rem 0;
}

.emphasis-minimal .section-heading {
font-size: 1.125rem;
}

/* Emphasis responsive */
@media (max-width: 768px) {
.emphasis-hero { padding: 2.5rem 1.5rem; }
.emphasis-hero .section-heading { font-size: 1.75rem; }
.emphasis-featured { padding: 2rem 1.5rem; }
.emphasis-featured .section-heading { font-size: 1.5rem; }
}
`;
}

/**
 * Generate CSS for steps/timeline content type
 */
export function generateStepsCSS(
  primary: string,
  primaryDark: string,
  bgLight: string,
  headingFont: string,
  radiusMd: string
): string {
  return `
/* ==========================================================================
 STEPS/TIMELINE - Numbered process/how-to sections
 ========================================================================== */

.section-steps .steps-list {
list-style: none;
padding: 0;
margin: 1.5rem 0;
counter-reset: step-counter;
}

.section-steps .step-item {
display: flex;
gap: 1.5rem;
padding: 1.5rem 0;
border-bottom: 1px solid ${bgLight};
align-items: flex-start;
}

.section-steps .step-item:last-child {
border-bottom: none;
}

.section-steps .step-number {
flex-shrink: 0;
width: 2.5rem;
height: 2.5rem;
background: ${primary};
color: #ffffff;
border-radius: 50%;
display: flex;
align-items: center;
justify-content: center;
font-family: ${headingFont};
font-weight: 700;
font-size: 1rem;
}

.section-steps .step-content {
flex: 1;
padding-top: 0.25rem;
}

/* Steps with featured emphasis */
.emphasis-featured.section-steps {
background: ${bgLight};
padding: 2rem;
border-radius: ${radiusMd};
}

.emphasis-featured.section-steps .step-number {
width: 3rem;
height: 3rem;
font-size: 1.25rem;
background: ${primaryDark};
}

/* Steps with hero emphasis */
.emphasis-hero.section-steps .step-number {
width: 3.5rem;
height: 3.5rem;
font-size: 1.5rem;
box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

/* Steps responsive */
@media (max-width: 768px) {
.section-steps .step-item { gap: 1rem; padding: 1rem 0; }
.section-steps .step-number { width: 2rem; height: 2rem; font-size: 0.875rem; }
}
`;
}

/**
 * Generate CSS for FAQ content type
 */
export function generateFaqCSS(
  primary: string,
  primaryDark: string,
  textDark: string,
  bgLight: string,
  headingFont: string,
  radiusMd: string
): string {
  return `
/* ==========================================================================
 FAQ - Question/Answer pairs
 ========================================================================== */

.section-faq .faq-list {
margin: 1.5rem 0;
}

.section-faq .faq-item {
margin-bottom: 1.5rem;
padding-bottom: 1.5rem;
border-bottom: 1px solid ${bgLight};
}

.section-faq .faq-item:last-child {
border-bottom: none;
margin-bottom: 0;
padding-bottom: 0;
}

.section-faq .faq-question {
display: flex;
align-items: flex-start;
gap: 0.75rem;
font-family: ${headingFont};
font-weight: 600;
font-size: 1.125rem;
color: ${primaryDark};
margin-bottom: 0.75rem;
}

.section-faq .faq-icon {
flex-shrink: 0;
width: 1.75rem;
height: 1.75rem;
background: ${primary};
color: #ffffff;
border-radius: 4px;
display: flex;
align-items: center;
justify-content: center;
font-size: 0.875rem;
font-weight: 700;
}

.section-faq .faq-answer {
margin-left: 2.5rem;
color: ${textDark};
line-height: 1.7;
}

/* FAQ with featured emphasis */
.emphasis-featured.section-faq .faq-item {
background: #ffffff;
padding: 1.5rem;
border-radius: ${radiusMd};
border-bottom: none;
margin-bottom: 1rem;
box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.emphasis-featured.section-faq .faq-answer {
margin-left: 0;
margin-top: 1rem;
}

/* FAQ responsive */
@media (max-width: 768px) {
.section-faq .faq-answer { margin-left: 0; margin-top: 0.75rem; }
}
`;
}

/**
 * Generate CSS for comparison/table content type
 */
export function generateComparisonCSS(
  primary: string,
  bgLight: string,
  radiusMd: string
): string {
  return `
/* ==========================================================================
 COMPARISON - Tables with visual enhancements
 ========================================================================== */

.section-comparison .table-wrapper {
margin: 1.5rem 0;
border-radius: ${radiusMd};
overflow: hidden;
box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.section-comparison table {
border-collapse: collapse;
width: 100%;
}

.section-comparison thead {
background: ${primary};
color: #ffffff;
}

.section-comparison th {
padding: 1rem 1.25rem;
text-align: left;
font-weight: 600;
}

.section-comparison td {
padding: 1rem 1.25rem;
border-bottom: 1px solid ${bgLight};
}

.section-comparison tbody tr:hover {
background: ${bgLight};
}

.section-comparison tbody tr:last-child td {
border-bottom: none;
}

/* Comparison with featured emphasis */
.emphasis-featured.section-comparison .table-wrapper {
box-shadow: 0 8px 24px rgba(0,0,0,0.12);
}

.emphasis-featured.section-comparison th {
padding: 1.25rem 1.5rem;
font-size: 1.05rem;
}
`;
}

/**
 * Generate CSS for list content type
 */
export function generateListCSS(
  primary: string,
  textDark: string,
  textMedium: string
): string {
  return `
/* ==========================================================================
 LIST - Styled bullet/feature lists
 ========================================================================== */

.section-list .styled-list {
list-style: none;
padding: 0;
margin: 1.5rem 0;
}

.section-list .list-item {
display: flex;
align-items: flex-start;
gap: 0.75rem;
margin-bottom: 1rem;
}

.section-list .list-marker {
flex-shrink: 0;
width: 0.5rem;
height: 0.5rem;
background: ${primary};
border-radius: 50%;
margin-top: 0.5rem;
}

.section-list .list-content {
flex: 1;
color: ${textDark};
}

/* List with featured emphasis - card style */
.emphasis-featured.section-list .list-item {
padding: 1rem;
background: #ffffff;
border-radius: 8px;
box-shadow: 0 2px 6px rgba(0,0,0,0.05);
border-left: 3px solid ${primary};
}

.emphasis-featured.section-list .list-marker {
width: 0.75rem;
height: 0.75rem;
}
`;
}

/**
 * Generate CSS for summary/key takeaways content type
 */
export function generateSummaryCSS(
  primary: string,
  primaryDark: string,
  bgLight: string,
  radiusMd: string
): string {
  return `
/* ==========================================================================
 SUMMARY - Key takeaways, conclusions
 ========================================================================== */

.section-summary .summary-box {
display: flex;
gap: 1.25rem;
padding: 1.5rem;
background: ${bgLight};
border-radius: ${radiusMd};
border-left: 4px solid ${primary};
margin: 1.5rem 0;
}

.section-summary .summary-icon {
font-size: 1.5rem;
line-height: 1;
}

.section-summary .summary-content {
flex: 1;
}

.section-summary .summary-content ul {
margin: 0.5rem 0;
padding-left: 1.25rem;
}

.section-summary .summary-content li {
margin-bottom: 0.5rem;
}

/* Summary with featured emphasis */
.emphasis-featured.section-summary .summary-box {
padding: 2rem;
background: linear-gradient(135deg, ${bgLight} 0%, #ffffff 100%);
box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.emphasis-featured.section-summary .summary-icon {
font-size: 2rem;
}

/* Summary with hero emphasis */
.emphasis-hero.section-summary .summary-box {
padding: 2.5rem;
text-align: center;
flex-direction: column;
align-items: center;
}

.emphasis-hero.section-summary .summary-icon {
font-size: 2.5rem;
margin-bottom: 1rem;
}
`;
}

/**
 * Generate CSS for definition content type
 */
export function generateDefinitionCSS(
  primary: string,
  bgLight: string,
  radiusMd: string
): string {
  return `
/* ==========================================================================
 DEFINITION - Term definitions, glossary entries
 ========================================================================== */

.section-definition .definition-box {
display: flex;
gap: 1rem;
padding: 1.5rem;
background: ${bgLight};
border-radius: ${radiusMd};
margin: 1.5rem 0;
}

.section-definition .definition-icon {
font-size: 1.25rem;
line-height: 1;
}

.section-definition .definition-content {
flex: 1;
}

/* Definition with featured emphasis */
.emphasis-featured.section-definition .definition-box {
border: 2px solid ${primary};
background: #ffffff;
}
`;
}

/**
 * Generate CSS for testimonial content type
 */
export function generateTestimonialCSS(
  primary: string,
  textMedium: string,
  bgLight: string,
  radiusMd: string
): string {
  return `
/* ==========================================================================
 TESTIMONIAL - Quotes, reviews, social proof
 ========================================================================== */

.section-testimonial .testimonial {
position: relative;
padding: 2rem;
background: ${bgLight};
border-radius: ${radiusMd};
margin: 1.5rem 0;
border-left: 4px solid ${primary};
}

.section-testimonial .testimonial::before {
content: '"';
position: absolute;
top: -0.5rem;
left: 1rem;
font-size: 4rem;
color: ${primary};
opacity: 0.2;
font-family: Georgia, serif;
line-height: 1;
}

.section-testimonial .testimonial-text {
font-size: 1.125rem;
font-style: italic;
color: ${textMedium};
margin: 0;
position: relative;
z-index: 1;
}

/* Testimonial with featured emphasis */
.emphasis-featured.section-testimonial .testimonial {
padding: 2.5rem;
text-align: center;
border-left: none;
border-top: 4px solid ${primary};
}

.emphasis-featured.section-testimonial .testimonial::before {
left: 50%;
transform: translateX(-50%);
}
`;
}
