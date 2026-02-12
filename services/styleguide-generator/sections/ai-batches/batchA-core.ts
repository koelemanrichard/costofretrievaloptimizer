// services/styleguide-generator/sections/ai-batches/batchA-core.ts
// Batch A: Core UI components — Buttons, Cards, Lists, Icon Boxes, Forms, Tables
// Sections: 4, 5, 7, 9, 10, 11

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

const BATCH_A_SPECS: AiSectionSpec[] = [
  {
    id: 4,
    title: 'Buttons',
    category: 'foundation' as SectionCategory,
    description: 'Primary, secondary, outline, ghost, icon, and disabled button variants with hover/focus states.',
    tip: 'All buttons use the prefix-btn-* class pattern. Combine with size modifiers (-sm, -lg).',
    warning: 'Ensure all buttons have accessible :focus-visible outlines.',
  },
  {
    id: 5,
    title: 'Cards',
    category: 'foundation' as SectionCategory,
    description: 'Card layouts for content, media, horizontal, pricing, and overlay variants.',
    tip: 'Cards use prefix-card-* classes. Pair with hover effects from Section 23.',
  },
  {
    id: 7,
    title: 'Lists',
    category: 'foundation' as SectionCategory,
    description: 'Styled unordered, ordered, inline, icon, and description lists.',
    tip: 'Use prefix-list-* classes. Custom bullet/icon colors inherit from the brand palette.',
  },
  {
    id: 9,
    title: 'Icon Boxes',
    category: 'foundation' as SectionCategory,
    description: 'Feature boxes with icon, title, and description in multiple layout variants.',
    tip: 'Use prefix-icon-box-* classes. Supports Font Awesome or SVG icons.',
  },
  {
    id: 10,
    title: 'Forms',
    category: 'foundation' as SectionCategory,
    description: 'Input fields, textareas, selects, checkboxes, radios, and form groups with labels.',
    tip: 'Use prefix-form-* classes. See Section 37 for state-specific styling.',
    warning: 'All form elements must have associated labels for accessibility.',
  },
  {
    id: 11,
    title: 'Tables',
    category: 'foundation' as SectionCategory,
    description: 'Responsive data tables with striped rows, hover highlights, and sortable headers.',
    tip: 'Wrap in prefix-table-responsive for horizontal scrolling on mobile.',
  },
];

function buildBatchAPrompt(tokens: DesignTokenSet, analysis: BrandAnalysis): string {
  const tokenSummary = buildTokenSummary(tokens);
  const brandSummary = buildBrandSummary(analysis);
  const p = tokens.prefix;

  return `You are a senior CSS architect creating an Elementor CSS Design System & Brand Styleguide.

${tokenSummary}

${brandSummary}

Generate CSS and demo HTML for 6 UI component sections. ALL class names MUST start with .${p}-

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
- Include :hover, :focus-visible, and :disabled states
- Mobile-first responsive: use min-width breakpoints at 640px, 768px, 1024px
- Use CSS custom properties where repeated values appear
- After each demo, add an Elementor tip: which widget to use, which tab (Content/Style/Advanced), and where to paste the CSS class (Advanced → CSS Classes)

=== SECTION 4 === (Buttons)
Classes needed:
- .${p}-btn (base) with variants: -primary, -secondary, -outline, -ghost, -danger
- Size modifiers: .${p}-btn-sm, .${p}-btn-lg
- Icon button: .${p}-btn-icon
- Button group: .${p}-btn-group
Demo: Show each variant as INLINE-STYLED buttons using style="background: ${tokens.colors.primary[400]}; color: white; padding: 14px 28px; border: none; border-radius: ${tokens.radius.md}; font-family: ${tokens.typography.headingFont.split(',')[0]}; font-weight: 700; cursor: pointer;". Each button should be visually styled, not just a code reference.
Elementor: Button widget → Style tab → adjust Background/Text colors. Advanced → CSS Classes → ${p}-btn-primary.

=== SECTION 5 === (Cards)
Classes needed:
- .${p}-card (base) with variants: -media (image top), -horizontal, -overlay, -minimal
- .${p}-card-header, .${p}-card-body, .${p}-card-footer, .${p}-card-img
Demo: Show at least 3 card variants in a grid using inline styles (border-radius, box-shadow, padding, background).
Elementor: Container widget → Column layout. Advanced → CSS Classes → ${p}-card.

=== SECTION 7 === (Lists)
Classes needed:
- .${p}-list (base) with variants: -unstyled, -inline, -icon, -check, -numbered
- .${p}-list-item, .${p}-list-icon
Demo: Show each list variant with inline-styled checkmarks/arrows using CSS pseudo-elements or Font Awesome icons.
Elementor: Icon List widget → Advanced → CSS Classes → ${p}-list-check.

=== SECTION 9 === (Icon Boxes)
Classes needed:
- .${p}-icon-box (base) with variants: -centered, -horizontal, -bordered, -filled
- .${p}-icon-box-icon, .${p}-icon-box-title, .${p}-icon-box-text
Demo: Show 3 icon boxes in a row with Font Awesome icons (use <i class="fas fa-star">), each with inline styles for background, padding, border-radius.
Elementor: Icon Box widget → Style tab. Advanced → CSS Classes → ${p}-icon-box-centered.

=== SECTION 10 === (Forms)
Classes needed:
- .${p}-form-group, .${p}-form-label, .${p}-form-input, .${p}-form-select, .${p}-form-textarea
- .${p}-form-checkbox, .${p}-form-radio, .${p}-form-hint
Demo: Show a sample form with inline-styled inputs (border, border-radius, padding, font-family).
Elementor: Form widget (Pro) → Style tab → Field Border/Radius. Advanced → CSS Classes → ${p}-form-group.

=== SECTION 11 === (Tables)
Classes needed:
- .${p}-table (base) with variants: -striped, -hover, -bordered, -compact
- .${p}-table-responsive (wrapper for horizontal scroll)
- .${p}-table-header, .${p}-table-cell
Demo: Show a 4-column, 4-row striped table with inline styles for borders, padding, alternating row colors.
Elementor: Table of Contents or Text Editor widget → Advanced → CSS Classes → ${p}-table-striped.`;
}

/**
 * Generate AI-enhanced sections for Batch A (core UI components).
 * Returns section IDs that were successfully generated.
 */
export async function generateBatchA(
  tokens: DesignTokenSet,
  analysis: BrandAnalysis,
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<unknown>,
): Promise<number[]> {
  const prompt = buildBatchAPrompt(tokens, analysis);
  const response = await callAiForBatch(prompt, businessInfo, dispatch);
  const sectionIds = BATCH_A_SPECS.map(s => s.id);
  const outputs = parseAiBatchResponse(response, sectionIds);

  registerAiSections(BATCH_A_SPECS, outputs);

  return [...outputs.keys()];
}

export { BATCH_A_SPECS };
