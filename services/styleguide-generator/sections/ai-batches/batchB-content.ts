// services/styleguide-generator/sections/ai-batches/batchB-content.ts
// Batch B: Content blocks — Reviews, CTA, Hero, Alerts, Steps, Pricing, FAQ, Stats
// Sections: 12, 13, 14, 16, 17, 18, 19, 21

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

const BATCH_B_SPECS: AiSectionSpec[] = [
  {
    id: 12,
    title: 'Reviews & Testimonials',
    category: 'foundation' as SectionCategory,
    description: 'Customer testimonial cards with star ratings, avatars, and quote styling.',
    tip: 'Use prefix-review-* classes. Supports single card and carousel-ready layouts.',
  },
  {
    id: 13,
    title: 'CTA Blocks',
    category: 'foundation' as SectionCategory,
    description: 'Call-to-action sections with headline, description, and action buttons.',
    tip: 'Use prefix-cta-* classes. CTA blocks use brand primary as background by default.',
  },
  {
    id: 14,
    title: 'Hero Sections',
    category: 'foundation' as SectionCategory,
    description: 'Full-width hero banners with text overlay, background options, and CTAs.',
    tip: 'Use prefix-hero-* classes. Supports image, gradient, and solid color backgrounds.',
  },
  {
    id: 16,
    title: 'Alerts & Notifications',
    category: 'extension' as SectionCategory,
    description: 'Alert messages for success, error, warning, info, and neutral states with dismiss button.',
    tip: 'Use prefix-alert-* classes. Semantic colors are used automatically.',
  },
  {
    id: 17,
    title: 'Process Steps',
    category: 'extension' as SectionCategory,
    description: 'Step-by-step process indicators in horizontal and vertical orientations.',
    tip: 'Use prefix-steps-* classes. Supports numbered, icon, and connected variants.',
  },
  {
    id: 18,
    title: 'Pricing Cards',
    category: 'extension' as SectionCategory,
    description: 'Pricing table cards with featured/highlighted plan, feature lists, and CTA buttons.',
    tip: 'Use prefix-pricing-* classes. Featured card gets brand primary accent.',
  },
  {
    id: 19,
    title: 'FAQ / Accordion',
    category: 'extension' as SectionCategory,
    description: 'Expandable FAQ items with smooth open/close transitions.',
    tip: 'Use prefix-accordion-* classes. Works with native <details>/<summary> elements.',
  },
  {
    id: 21,
    title: 'Stats & Counters',
    category: 'extension' as SectionCategory,
    description: 'Statistical number displays with labels, icons, and dividers.',
    tip: 'Use prefix-stat-* classes. Numbers use heading font for visual emphasis.',
  },
];

function buildBatchBPrompt(tokens: DesignTokenSet, analysis: BrandAnalysis): string {
  const tokenSummary = buildTokenSummary(tokens);
  const brandSummary = buildBrandSummary(analysis);
  const p = tokens.prefix;

  return `You are a senior CSS architect creating an Elementor CSS Design System & Brand Styleguide.

${tokenSummary}

${brandSummary}

Generate CSS and demo HTML for 8 content block sections. ALL class names MUST start with .${p}-

For each section, output:
=== SECTION {id} ===
\`\`\`html
(demo HTML with INLINE STYLES that visually render each variant — users must SEE the styled component, not just code. Use style="" attributes with the exact brand colors, fonts, radii, shadows.)
\`\`\`
\`\`\`css
(complete CSS for all variants with .${p}-* prefix)
\`\`\`

CRITICAL REQUIREMENTS:
- Demo HTML MUST use INLINE STYLES (style="...") so components render visually in the browser
- Each demo should look like a finished component, not a code skeleton
- Use the exact brand colors, radii, shadows, and fonts from the token summary
- CSS must be self-contained (no @import, no external dependencies)
- Include responsive breakpoints at 640px, 768px, 1024px
- Use semantic colors for alerts: success, error, warning, info
- Demo content should be realistic placeholder text (not "lorem ipsum")
- After each demo, add an Elementor tip: which widget to use, which tab (Content/Style/Advanced), and where to paste the CSS class (Advanced → CSS Classes)

=== SECTION 12 === (Reviews & Testimonials)
Classes needed:
- .${p}-review (base), .${p}-review-card, .${p}-review-avatar, .${p}-review-name
- .${p}-review-text, .${p}-review-rating, .${p}-review-stars
Demo: Show 2-3 testimonial cards with star ratings and avatars.

=== SECTION 13 === (CTA Blocks)
Classes needed:
- .${p}-cta (base) with variants: -primary (brand bg), -light, -dark, -gradient
- .${p}-cta-title, .${p}-cta-text, .${p}-cta-actions
Demo: Show 2 CTA block variants (primary background and light background).

=== SECTION 14 === (Hero Sections)
Classes needed:
- .${p}-hero (base) with variants: -centered, -left-aligned, -split
- .${p}-hero-title, .${p}-hero-subtitle, .${p}-hero-actions, .${p}-hero-overlay
Demo: Show a centered hero with gradient overlay and CTA buttons.

=== SECTION 16 === (Alerts & Notifications)
Classes needed:
- .${p}-alert (base) with variants: -success, -error, -warning, -info, -neutral
- .${p}-alert-title, .${p}-alert-close, .${p}-alert-icon
Demo: Show all 5 alert variants.

=== SECTION 17 === (Process Steps)
Classes needed:
- .${p}-steps (container) with variants: -horizontal, -vertical
- .${p}-step, .${p}-step-number, .${p}-step-title, .${p}-step-text, .${p}-step-connector
- Active state: .${p}-step-active, completed: .${p}-step-done
Demo: Show a 4-step horizontal process with step 2 active.

=== SECTION 18 === (Pricing Cards)
Classes needed:
- .${p}-pricing (container grid), .${p}-pricing-card, .${p}-pricing-featured
- .${p}-pricing-header, .${p}-pricing-price, .${p}-pricing-period
- .${p}-pricing-features, .${p}-pricing-cta
Demo: Show 3 pricing cards with the middle one featured/highlighted.

=== SECTION 19 === (FAQ / Accordion)
Classes needed:
- .${p}-accordion, .${p}-accordion-item, .${p}-accordion-header, .${p}-accordion-body
- .${p}-accordion-icon (chevron/plus indicator)
Uses native <details>/<summary> for no-JS functionality.
Demo: Show 3 FAQ items, one open by default.

=== SECTION 21 === (Stats & Counters)
Classes needed:
- .${p}-stats (container grid), .${p}-stat, .${p}-stat-number, .${p}-stat-label
- .${p}-stat-icon, .${p}-stat-divider
Demo: Show 4 stats in a row (e.g., "150+ Projects", "98% Satisfaction").`;
}

/**
 * Generate AI-enhanced sections for Batch B (content blocks).
 * Returns section IDs that were successfully generated.
 */
export async function generateBatchB(
  tokens: DesignTokenSet,
  analysis: BrandAnalysis,
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<unknown>,
): Promise<number[]> {
  const prompt = buildBatchBPrompt(tokens, analysis);
  const response = await callAiForBatch(prompt, businessInfo, dispatch);
  const sectionIds = BATCH_B_SPECS.map(s => s.id);
  const outputs = parseAiBatchResponse(response, sectionIds);

  registerAiSections(BATCH_B_SPECS, outputs);

  return [...outputs.keys()];
}

export { BATCH_B_SPECS };
