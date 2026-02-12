// services/styleguide-generator/sections/ai-batches/batchD-guidelines.ts
// Batch D: Design guidelines — Page Compositions, Icons, Image Guidelines,
//          Schema Markup Patterns, Tone of Voice
// Sections: 25, 39, 40, 43, 44

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

const BATCH_D_SPECS: AiSectionSpec[] = [
  {
    id: 25,
    title: 'Page Compositions',
    category: 'extension' as SectionCategory,
    description: 'Full-page layout examples showing how components combine into complete pages (landing page, service page, about page).',
    tip: 'These compositions demonstrate spacing rhythm and visual hierarchy using all previous components.',
  },
  {
    id: 39,
    title: 'Icon Library',
    category: 'site-wide' as SectionCategory,
    description: 'Icon sizing, coloring, and spacing guidelines for Font Awesome and custom SVG icons.',
    tip: 'Use prefix-icon-* classes for consistent icon sizing across the design system.',
  },
  {
    id: 40,
    title: 'Image Guidelines',
    category: 'site-wide' as SectionCategory,
    description: 'Image aspect ratios, placeholder patterns, lazy loading containers, and responsive image sizing.',
    tip: 'Use prefix-img-* classes. All images should specify width/height for CLS prevention.',
    warning: 'Always include meaningful alt text and width/height attributes on images.',
  },
  {
    id: 43,
    title: 'Schema Markup Patterns',
    category: 'site-wide' as SectionCategory,
    description: 'JSON-LD structured data templates for Organization, LocalBusiness, BreadcrumbList, FAQPage, and Article.',
    tip: 'Copy and customize the JSON-LD snippets for each page type. Validate at schema.org.',
  },
  {
    id: 44,
    title: 'Tone of Voice & Content',
    category: 'site-wide' as SectionCategory,
    description: 'Writing style guidelines including tone, vocabulary, sentence structure, and brand-specific terminology.',
    tip: 'Content guidelines complement the visual design system with consistent messaging.',
  },
];

function buildBatchDPrompt(tokens: DesignTokenSet, analysis: BrandAnalysis): string {
  const tokenSummary = buildTokenSummary(tokens);
  const brandSummary = buildBrandSummary(analysis);
  const p = tokens.prefix;

  return `You are a senior CSS architect and brand consultant creating an Elementor CSS Design System & Brand Styleguide.

${tokenSummary}

${brandSummary}

Generate CSS and demo HTML for 5 guideline/reference sections. Class names that are CSS components MUST start with .${p}-

For each section, output:
=== SECTION {id} ===
\`\`\`html
(demo HTML with visual examples using INLINE STYLES where applicable — users must SEE styled examples, not just text.)
\`\`\`
\`\`\`css
(CSS if applicable, or empty if section is content-only)
\`\`\`

CRITICAL REQUIREMENTS:
- Demo HTML should use INLINE STYLES for visual examples where applicable
- Use the exact brand colors, fonts, and personality from the summaries
- Tailor tone-of-voice and content guidelines to the brand personality (formality, energy, warmth)
- Schema markup must use the brand name and domain
- Page compositions should reference the existing .${p}-* class system
- Include Elementor implementation tips where applicable (which widget, which tab, which setting)

=== SECTION 25 === (Page Compositions)
Show 3 annotated wireframe-style layouts using HTML/CSS:
1. Landing page: hero → features (icon boxes) → testimonials → CTA → footer
2. Service/product page: breadcrumb → hero → content → pricing → FAQ → CTA
3. Blog post: header → breadcrumb → article (prose) → author bio → related posts
Use .${p}-composition-* wrapper classes. Show spacing rhythm between sections.
Demo: An annotated wireframe of layout #1 using simple placeholder boxes with labels.

=== SECTION 39 === (Icon Library)
Classes: .${p}-icon (base), .${p}-icon-xs, .${p}-icon-sm, .${p}-icon-md, .${p}-icon-lg, .${p}-icon-xl
Classes: .${p}-icon-primary, .${p}-icon-secondary, .${p}-icon-muted, .${p}-icon-white
Demo: Icon size scale (xs to xl) and color variants using Font Awesome icons.
Include: recommended icons for common UI patterns (navigation, social, actions, status).

=== SECTION 40 === (Image Guidelines)
Classes: .${p}-img-ratio-16x9, .${p}-img-ratio-4x3, .${p}-img-ratio-1x1, .${p}-img-ratio-3x2
Classes: .${p}-img-lazy (lazy loading container with skeleton), .${p}-img-responsive
Demo: Show the 4 aspect ratio containers with placeholder backgrounds, plus responsive image sizing guide.

=== SECTION 43 === (Schema Markup Patterns)
This section is content-only (no CSS). Show JSON-LD templates for:
1. Organization (with brand name: "${analysis.brandName}", domain: "${analysis.domain}")
2. LocalBusiness (if applicable)
3. BreadcrumbList
4. FAQPage
5. Article
Demo: Display each JSON-LD template in formatted code blocks.

=== SECTION 44 === (Tone of Voice & Content)
This section is content-only (no CSS). Based on the brand personality (formality: ${analysis.personality.formality}/5, energy: ${analysis.personality.energy}/5, warmth: ${analysis.personality.warmth}/5):
- Define the brand voice in 3 key adjectives
- Provide DO and DON'T writing examples
- Specify CTA button text guidelines (action verbs, length)
- Define heading style (question vs statement, power words)
- Provide 5 sample sentences showing the correct brand tone
Demo: A styled reference card showing the voice guidelines.`;
}

/**
 * Generate AI-enhanced sections for Batch D (design guidelines).
 * Returns section IDs that were successfully generated.
 */
export async function generateBatchD(
  tokens: DesignTokenSet,
  analysis: BrandAnalysis,
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<unknown>,
): Promise<number[]> {
  const prompt = buildBatchDPrompt(tokens, analysis);
  const response = await callAiForBatch(prompt, businessInfo, dispatch);
  const sectionIds = BATCH_D_SPECS.map(s => s.id);
  const outputs = parseAiBatchResponse(response, sectionIds);

  registerAiSections(BATCH_D_SPECS, outputs);

  return [...outputs.keys()];
}

export { BATCH_D_SPECS };
