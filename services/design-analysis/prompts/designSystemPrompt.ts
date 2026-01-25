// services/design-analysis/prompts/designSystemPrompt.ts
/**
 * AI prompt for generating a complete brand design system from Design DNA.
 */

export function buildDesignSystemGenerationPrompt(designDna: string): string {
  return `You are a senior design system architect. Given a brand's Design DNA, generate a complete, production-ready CSS design system.

## Design DNA Input
${designDna}

## Your Task

Generate CSS that brings this brand's design language to life. Every class should feel uniquely crafted for THIS brand, not generic.

### 1. CSS Tokens
Generate CSS custom properties for:
- All colors (primary, secondary, accent, neutrals, semantic)
- Typography scale (using the detected scale ratio)
- Spacing scale (based on density preference)
- Border radius scale (matching shape language)
- Shadow scale (matching effect preferences)
- Motion tokens (duration, easing)

### 2. Component Styles
For each component, generate CSS that:
- Reflects the brand's visual personality
- Uses the brand's shape language consistently
- Applies appropriate shadows/effects
- Includes proper hover/focus states
- Is responsive

Components needed: button, card, hero, timeline, testimonial, faq, cta, keyTakeaways, prose, list, table, blockquote

### 3. Decorative Elements
Based on the detected decorative preferences:
- Generate section dividers (SVG or CSS)
- Create background patterns if applicable
- Design floating shapes/accents if detected
- Create wave shapes if detected

### 4. Typography Treatments
- Heading decoration (underlines, accents)
- Drop caps if detected
- Pull quote styling
- List marker styling
- Link treatments

### 5. Micro-Interactions
Generate CSS for:
- Button hover effects (matching detected style)
- Card hover effects
- Link hover effects
- Focus rings
- Any keyframe animations

## Output Format
Return a JSON object matching the BrandDesignSystem interface with actual CSS code.

## Quality Requirements
- CSS must be production-ready
- Use CSS custom properties for theming (--ctc-* prefix)
- Include responsive breakpoints
- Follow BEM-like naming (.ctc-component__element--modifier)
- Ensure accessibility (focus states, contrast)
- CSS should be optimized (no redundant rules)

## Brand Personality Translation

Translate the brand personality into CSS:
- Corporate → Sharp corners, subtle shadows, restrained animations
- Creative → Rounded corners, bold shadows, expressive animations
- Luxurious → Elegant spacing, refined shadows, smooth transitions
- Friendly → Soft corners, warm colors, bouncy animations
- Bold → Strong contrasts, dramatic shadows, impactful animations
- Minimal → Clean lines, subtle effects, quick transitions

## CRITICAL: Return ONLY valid JSON, no markdown formatting.`;
}
