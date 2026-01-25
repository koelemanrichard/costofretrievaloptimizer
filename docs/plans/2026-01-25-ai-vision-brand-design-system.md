# AI Vision-First Brand Design System

> Design document for implementing design-agency quality output through AI-generated brand-specific design systems.

**Status:** Ready for Implementation
**Created:** 2026-01-25
**Author:** Claude (with user direction)

---

## Executive Summary

The current system produces generic, template-based output that fails to deliver design-agency quality. This document outlines a hybrid architecture where:

1. **AI Vision analyzes brand screenshots** to extract complete Design DNA
2. **DOM extraction validates** and provides definitive color values
3. **AI generates a unique design system** per brand (not template selection)
4. **Blueprint system applies** brand-specific styling to content

The result: Every brand gets unique, professionally-designed output that looks like a design agency created it specifically for them.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: BRAND DNA EXTRACTION (AI Vision + DOM Validation)                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ Screenshot → Gemini/Claude Vision → Complete Design DNA                    │
│ DOM Crawl → CSS Variables/Computed Styles → Definitive Values              │
│ User Verification → Screenshot displayed for confirmation                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: BRAND DESIGN SYSTEM GENERATION (AI-Generated, Unique)             │
├─────────────────────────────────────────────────────────────────────────────┤
│ Design DNA → AI generates:                                                 │
│   • Complete CSS token system                                              │
│   • Custom component styles (not presets)                                  │
│   • Decorative elements (SVG patterns, dividers)                           │
│   • Micro-interactions (hover, focus, animations)                          │
│   • Typography treatments                                                  │
│   • Image treatments                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: CONTENT-AWARE LAYOUT (Blueprint with Brand Options)               │
├─────────────────────────────────────────────────────────────────────────────┤
│ Article Content + Brand Design System → Layout decisions                   │
│ Component selection based on content structure                             │
│ Emphasis/spacing using brand rhythm                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: RENDERED OUTPUT (Design-Agency Quality)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ Semantic HTML + Brand CSS + Decorative Elements                            │
│ Unique per brand, not template-based                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: AI Vision-First Brand DNA Extraction

### 1.1 Screenshot Capture

The system captures a full-page screenshot of the brand's website homepage (or specified page).

**File:** `services/design-analysis/BrandDiscoveryService.ts`

```typescript
interface ScreenshotCaptureResult {
  screenshotBase64: string;
  screenshotUrl: string;        // Temporary URL for display
  capturedAt: string;
  viewport: { width: number; height: number };
  fullPageHeight: number;
}
```

### 1.2 AI Vision Analysis

The AI vision model (Gemini 1.5 Pro or Claude) analyzes the screenshot to extract the complete Design DNA.

**New File:** `services/design-analysis/AIDesignAnalyzer.ts`

```typescript
interface DesignDNA {
  // ═══════════════════════════════════════════════════════════════════════════
  // COLOR SYSTEM (Full Palette)
  // ═══════════════════════════════════════════════════════════════════════════
  colors: {
    // Primary brand colors
    primary: ColorWithUsage;
    primaryLight: ColorWithUsage;
    primaryDark: ColorWithUsage;

    // Secondary/accent colors
    secondary: ColorWithUsage;
    accent: ColorWithUsage;

    // Neutral palette (critical for professional design)
    neutrals: {
      darkest: string;      // Text, headers (#1a1a1a)
      dark: string;         // Secondary text (#4a4a4a)
      medium: string;       // Borders, dividers (#9ca3af)
      light: string;        // Backgrounds, cards (#f3f4f6)
      lightest: string;     // Page background (#ffffff)
    };

    // Semantic colors
    semantic: {
      success: string;
      warning: string;
      error: string;
      info: string;
    };

    // Design insights
    harmony: 'monochromatic' | 'complementary' | 'analogous' | 'triadic' | 'split-complementary';
    dominantMood: 'corporate' | 'creative' | 'luxurious' | 'friendly' | 'bold' | 'minimal';
    contrastLevel: 'high' | 'medium' | 'subtle';
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // TYPOGRAPHY SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════
  typography: {
    headingFont: {
      family: string;               // "Montserrat", "Playfair Display"
      fallback: string;             // "sans-serif", "serif"
      weight: number;               // 700, 600
      style: 'serif' | 'sans-serif' | 'display' | 'slab' | 'mono';
      character: 'modern' | 'classic' | 'playful' | 'corporate' | 'elegant';
    };
    bodyFont: {
      family: string;
      fallback: string;
      weight: number;
      style: 'serif' | 'sans-serif';
      lineHeight: number;           // 1.5, 1.6, 1.7
    };

    // Scale & hierarchy
    scaleRatio: number;             // 1.2 (minor third) to 1.333 (perfect fourth)
    baseSize: string;               // "16px", "18px"
    headingCase: 'none' | 'uppercase' | 'capitalize';
    headingLetterSpacing: string;   // "normal", "-0.02em", "0.05em"

    // Treatments detected
    usesDropCaps: boolean;
    headingUnderlineStyle: 'none' | 'solid' | 'gradient' | 'decorative';
    linkStyle: 'underline' | 'color-only' | 'animated-underline' | 'highlight';
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SPACING & RHYTHM
  // ═══════════════════════════════════════════════════════════════════════════
  spacing: {
    baseUnit: number;               // 4, 8 (for 4px or 8px grid)
    density: 'compact' | 'comfortable' | 'spacious' | 'airy';
    sectionGap: 'tight' | 'moderate' | 'generous' | 'dramatic';
    contentWidth: 'narrow' | 'medium' | 'wide' | 'full';
    whitespacePhilosophy: 'minimal' | 'balanced' | 'luxurious';
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SHAPE LANGUAGE
  // ═══════════════════════════════════════════════════════════════════════════
  shapes: {
    borderRadius: {
      style: 'sharp' | 'subtle' | 'rounded' | 'pill' | 'mixed';
      small: string;                // "2px", "4px"
      medium: string;               // "8px", "12px"
      large: string;                // "16px", "24px"
      full: string;                 // "9999px"
    };

    buttonStyle: 'sharp' | 'soft' | 'rounded' | 'pill';
    cardStyle: 'flat' | 'subtle-shadow' | 'elevated' | 'bordered' | 'glass';
    inputStyle: 'minimal' | 'bordered' | 'filled' | 'underlined';
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // VISUAL EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════
  effects: {
    shadows: {
      style: 'none' | 'subtle' | 'medium' | 'dramatic' | 'colored';
      cardShadow: string;           // Full CSS shadow value
      buttonShadow: string;
      elevatedShadow: string;
    };

    gradients: {
      usage: 'none' | 'subtle' | 'prominent';
      primaryGradient: string;      // "linear-gradient(135deg, #xxx, #yyy)"
      heroGradient: string;
      ctaGradient: string;
    };

    backgrounds: {
      usesPatterns: boolean;
      patternType?: 'dots' | 'grid' | 'waves' | 'geometric' | 'organic';
      usesTextures: boolean;
      usesOverlays: boolean;
    };

    borders: {
      style: 'none' | 'subtle' | 'visible' | 'decorative';
      defaultColor: string;
      accentBorderUsage: boolean;
    };
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // DECORATIVE ELEMENTS
  // ═══════════════════════════════════════════════════════════════════════════
  decorative: {
    dividerStyle: 'none' | 'line' | 'gradient' | 'decorative' | 'icon';
    usesFloatingShapes: boolean;
    usesCornerAccents: boolean;
    usesWaveShapes: boolean;
    usesGeometricPatterns: boolean;
    iconStyle: 'outline' | 'solid' | 'duotone' | 'custom';
    decorativeAccentColor: string;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // LAYOUT PATTERNS
  // ═══════════════════════════════════════════════════════════════════════════
  layout: {
    gridStyle: 'strict-12' | 'asymmetric' | 'fluid' | 'modular';
    alignment: 'left' | 'center' | 'mixed';
    heroStyle: 'full-bleed' | 'contained' | 'split' | 'minimal' | 'video' | 'animated';
    cardLayout: 'grid' | 'masonry' | 'list' | 'carousel' | 'stacked';
    ctaPlacement: 'inline' | 'floating' | 'section-end' | 'prominent-banner';
    navigationStyle: 'minimal' | 'standard' | 'mega-menu' | 'sidebar';
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MOTION & INTERACTION
  // ═══════════════════════════════════════════════════════════════════════════
  motion: {
    overall: 'static' | 'subtle' | 'dynamic' | 'expressive';
    transitionSpeed: 'instant' | 'fast' | 'normal' | 'slow';
    easingStyle: 'linear' | 'ease' | 'spring' | 'bounce';
    hoverEffects: {
      buttons: 'none' | 'darken' | 'lift' | 'glow' | 'fill' | 'scale';
      cards: 'none' | 'lift' | 'tilt' | 'glow' | 'border';
      links: 'none' | 'underline' | 'color' | 'highlight';
    };
    scrollAnimations: boolean;
    parallaxEffects: boolean;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // IMAGE TREATMENT
  // ═══════════════════════════════════════════════════════════════════════════
  images: {
    treatment: 'natural' | 'duotone' | 'grayscale' | 'high-contrast' | 'colorized';
    frameStyle: 'none' | 'rounded' | 'shadow' | 'border' | 'custom-mask';
    hoverEffect: 'none' | 'zoom' | 'overlay' | 'caption-reveal';
    aspectRatioPreference: '16:9' | '4:3' | '1:1' | 'mixed';
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPONENT PREFERENCES (detected from site)
  // ═══════════════════════════════════════════════════════════════════════════
  componentPreferences: {
    preferredListStyle: 'bullets' | 'icons' | 'cards' | 'numbered';
    preferredCardStyle: 'minimal' | 'bordered' | 'elevated' | 'glass';
    testimonialStyle: 'card' | 'quote' | 'carousel' | 'grid';
    faqStyle: 'accordion' | 'cards' | 'list';
    ctaStyle: 'button' | 'banner' | 'floating' | 'inline';
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // BRAND PERSONALITY SYNTHESIS
  // ═══════════════════════════════════════════════════════════════════════════
  personality: {
    overall: 'corporate' | 'creative' | 'luxurious' | 'friendly' | 'bold' | 'minimal' | 'elegant' | 'playful';
    formality: 1 | 2 | 3 | 4 | 5;           // 1=casual, 5=formal
    energy: 1 | 2 | 3 | 4 | 5;              // 1=calm, 5=energetic
    warmth: 1 | 2 | 3 | 4 | 5;              // 1=cool, 5=warm
    trustSignals: 'minimal' | 'moderate' | 'prominent';
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIDENCE & METADATA
  // ═══════════════════════════════════════════════════════════════════════════
  confidence: {
    overall: number;                // 0-100
    colorsConfidence: number;
    typographyConfidence: number;
    layoutConfidence: number;
  };

  analysisNotes: string[];          // AI observations about the design
}

interface ColorWithUsage {
  hex: string;
  usage: string;                    // "Primary buttons and links"
  confidence: number;               // 0-100
}
```

### 1.3 AI Vision Prompt

**New File:** `services/design-analysis/prompts/designDnaPrompt.ts`

```typescript
export const DESIGN_DNA_EXTRACTION_PROMPT = `
You are a senior brand designer analyzing a website screenshot. Extract the complete design system (Design DNA) as a JSON object.

## Analysis Instructions

1. **Colors**: Identify ALL colors used, not just 1-2. Look for:
   - Primary brand color (logo, main buttons, key accents)
   - Secondary brand color (supporting elements)
   - Accent colors (CTAs, highlights, interactive elements)
   - Full neutral palette (text colors from darkest to lightest, backgrounds, borders)
   - Any semantic colors (success green, warning yellow, error red)

2. **Typography**: Identify fonts and their usage:
   - Heading font family and characteristics
   - Body font family and characteristics
   - Size hierarchy (is there dramatic contrast or subtle?)
   - Any special treatments (drop caps, decorative underlines)

3. **Spacing**: Analyze whitespace usage:
   - Is the design dense/compact or spacious/airy?
   - Section gaps - tight or generous?
   - Overall content width preference

4. **Shapes**: Look at the shape language:
   - Border radius style (sharp/corporate vs rounded/friendly)
   - Button shapes
   - Card shapes
   - Input field shapes

5. **Visual Effects**: Identify depth and effects:
   - Shadow usage and intensity
   - Gradient usage
   - Background patterns or textures
   - Border treatments

6. **Decorative Elements**: Note any:
   - Section dividers
   - Floating shapes or orbs
   - Corner accents
   - Wave shapes
   - Geometric patterns

7. **Motion**: Assess animation/interaction level:
   - Static or animated elements
   - Hover effect sophistication
   - Scroll animations visible

8. **Image Treatment**: How are images presented?
   - Natural, duotone, or stylized
   - Frame/border treatment
   - Aspect ratios used

9. **Overall Personality**: Synthesize the brand feeling:
   - Corporate/Creative/Luxurious/Friendly/Bold/Minimal
   - Formality level
   - Energy level

## Output Format

Return a JSON object matching the DesignDNA interface. Be specific with CSS values where possible (exact colors in hex, specific pixel values, CSS gradient syntax).

For colors, provide your best estimate in hex format. The DOM extraction will validate and provide exact values.

Include confidence scores (0-100) for each major category based on how clearly the design communicates these choices.
`;
```

### 1.4 DOM Validation

After AI Vision analysis, DOM extraction validates colors and provides definitive values.

**Updated File:** `services/design-analysis/BrandDiscoveryService.ts`

```typescript
interface DOMValidationResult {
  // Validated colors (from actual CSS)
  validatedColors: {
    cssVariables: Record<string, string>;    // --primary-color: #012d55
    computedColors: Record<string, string>;  // button background: #012d55
  };

  // Typography from CSS
  validatedTypography: {
    headingFontFamily: string;
    bodyFontFamily: string;
    baseFontSize: string;
  };

  // Corrections to AI hypothesis
  corrections: {
    field: string;
    aiValue: string;
    actualValue: string;
    confidence: number;
  }[];
}

async function validateDesignDNA(
  aiHypothesis: DesignDNA,
  domData: DOMExtractionResult
): Promise<{
  validatedDNA: DesignDNA;
  corrections: Correction[];
  finalConfidence: number;
}> {
  // Merge AI insights with DOM-validated values
  // AI provides the "what is this used for" context
  // DOM provides the exact hex values
}
```

### 1.5 User Verification UI

**Updated File:** `components/publishing/steps/BrandDNASummary.tsx`

The user sees:
1. The actual screenshot captured
2. Extracted color palette with usage descriptions
3. Typography preview
4. Key design characteristics
5. Option to override any values

```typescript
interface BrandDNASummaryProps {
  screenshotUrl: string;              // Display the screenshot
  designDNA: DesignDNA;
  onConfirm: () => void;
  onOverride: (overrides: Partial<DesignDNA>) => void;
}
```

---

## Phase 2: Brand Design System Generation

### 2.1 Overview

The AI takes the validated Design DNA and generates a **complete, unique design system** for the brand. This is NOT template selection - it's generation.

**New File:** `services/design-analysis/BrandDesignSystemGenerator.ts`

### 2.2 Generated Output Structure

```typescript
interface BrandDesignSystem {
  // Metadata
  id: string;
  brandName: string;
  sourceUrl: string;
  generatedAt: string;
  designDnaHash: string;              // For cache invalidation

  // ═══════════════════════════════════════════════════════════════════════════
  // CSS TOKENS (ready for injection)
  // ═══════════════════════════════════════════════════════════════════════════
  tokens: {
    css: string;                      // Complete :root CSS variables block
    json: Record<string, string>;     // For programmatic access
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPONENT STYLES (AI-generated CSS per component)
  // ═══════════════════════════════════════════════════════════════════════════
  componentStyles: {
    // Each component gets GENERATED CSS, not preset selection
    button: ComponentStyleDefinition;
    card: ComponentStyleDefinition;
    hero: ComponentStyleDefinition;
    timeline: ComponentStyleDefinition;
    testimonial: ComponentStyleDefinition;
    faq: ComponentStyleDefinition;
    cta: ComponentStyleDefinition;
    keyTakeaways: ComponentStyleDefinition;
    prose: ComponentStyleDefinition;
    list: ComponentStyleDefinition;
    table: ComponentStyleDefinition;
    blockquote: ComponentStyleDefinition;
    // ... all components
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // DECORATIVE ELEMENTS
  // ═══════════════════════════════════════════════════════════════════════════
  decorative: {
    dividers: {
      default: string;                // SVG or CSS
      subtle: string;
      decorative: string;
    };
    sectionBackgrounds: {
      default: string;                // CSS background value
      accent: string;
      featured: string;
    };
    shapes: {
      topWave?: string;               // SVG path
      bottomWave?: string;
      cornerAccent?: string;
      floatingOrb?: string;           // CSS for floating decorative element
    };
    patterns: {
      dots?: string;                  // CSS/SVG pattern
      grid?: string;
      custom?: string;
    };
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MICRO-INTERACTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  interactions: {
    buttonHover: string;              // CSS for :hover state
    buttonActive: string;             // CSS for :active state
    buttonFocus: string;              // CSS for :focus-visible
    cardHover: string;
    linkHover: string;
    focusRing: string;
    keyframes: Record<string, string>; // @keyframes definitions
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // TYPOGRAPHY TREATMENTS
  // ═══════════════════════════════════════════════════════════════════════════
  typographyTreatments: {
    headingDecoration: string;        // ::after underline, etc.
    dropCap: string;                  // ::first-letter styling
    pullQuote: string;                // Blockquote styling
    listMarker: string;               // ::marker or custom bullets
    linkUnderline: string;            // Custom link styling
    codeBlock: string;                // Pre/code styling
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // IMAGE TREATMENTS
  // ═══════════════════════════════════════════════════════════════════════════
  imageTreatments: {
    defaultFrame: string;             // Default image styling
    featured: string;                 // Featured/hero images
    thumbnail: string;                // Smaller images
    gallery: string;                  // Gallery items
    mask?: string;                    // SVG mask or clip-path
    overlay?: string;                 // Gradient/color overlay
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPLETE COMPILED CSS
  // ═══════════════════════════════════════════════════════════════════════════
  compiledCss: string;                // Full CSS ready for injection

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPONENT VARIANT MAPPINGS
  // ═══════════════════════════════════════════════════════════════════════════
  // Maps generic component types to brand-specific implementations
  variantMappings: {
    // When blueprint says "card with elevated style", use this CSS class
    card: {
      default: string;                // CSS class name
      elevated: string;
      bordered: string;
      featured: string;
    };
    hero: {
      default: string;
      gradient: string;
      image: string;
      minimal: string;
    };
    // ... etc
  };
}

interface ComponentStyleDefinition {
  baseCSS: string;                    // Base component styles
  variants: Record<string, string>;   // Named variants with CSS
  states: {
    hover?: string;
    active?: string;
    focus?: string;
    disabled?: string;
  };
  responsive?: {
    mobile?: string;
    tablet?: string;
  };
}
```

### 2.3 AI Generation Prompt

**New File:** `services/design-analysis/prompts/designSystemGenerationPrompt.ts`

```typescript
export const DESIGN_SYSTEM_GENERATION_PROMPT = `
You are a senior design system architect. Given a brand's Design DNA, generate a complete, production-ready CSS design system.

## Design DNA Input
{designDNA}

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
- Use CSS custom properties for theming
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
`;
```

### 2.4 Example Generated Output

For a corporate law firm (MVGM-style):

```css
/* === TOKENS === */
:root {
  /* Colors */
  --ctc-primary: #012d55;
  --ctc-primary-light: #1a4a7a;
  --ctc-primary-dark: #001a33;
  --ctc-secondary: #64748b;
  --ctc-accent: #0ea5e9;

  /* Neutrals */
  --ctc-neutral-900: #0f172a;
  --ctc-neutral-800: #1e293b;
  --ctc-neutral-700: #334155;
  --ctc-neutral-600: #475569;
  --ctc-neutral-500: #64748b;
  --ctc-neutral-400: #94a3b8;
  --ctc-neutral-300: #cbd5e1;
  --ctc-neutral-200: #e2e8f0;
  --ctc-neutral-100: #f1f5f9;
  --ctc-neutral-50: #f8fafc;

  /* Typography */
  --ctc-font-heading: 'Inter', -apple-system, sans-serif;
  --ctc-font-body: 'Inter', -apple-system, sans-serif;
  --ctc-text-base: 16px;
  --ctc-line-height: 1.6;

  /* Spacing (8px base, comfortable density) */
  --ctc-space-1: 4px;
  --ctc-space-2: 8px;
  --ctc-space-3: 12px;
  --ctc-space-4: 16px;
  --ctc-space-6: 24px;
  --ctc-space-8: 32px;
  --ctc-space-12: 48px;
  --ctc-space-16: 64px;

  /* Radii (sharp/corporate) */
  --ctc-radius-sm: 2px;
  --ctc-radius-md: 4px;
  --ctc-radius-lg: 6px;
  --ctc-radius-xl: 8px;

  /* Shadows (subtle) */
  --ctc-shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --ctc-shadow-md: 0 2px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --ctc-shadow-lg: 0 4px 8px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04);
  --ctc-shadow-xl: 0 8px 16px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.06);

  /* Motion (professional, not playful) */
  --ctc-duration-fast: 150ms;
  --ctc-duration-normal: 200ms;
  --ctc-ease-default: cubic-bezier(0.4, 0, 0.2, 1);
}

/* === BUTTON === */
.ctc-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--ctc-space-2);
  padding: var(--ctc-space-3) var(--ctc-space-6);
  font-family: var(--ctc-font-body);
  font-weight: 600;
  font-size: 0.9375rem;
  letter-spacing: 0.01em;
  border-radius: var(--ctc-radius-md);
  border: none;
  cursor: pointer;
  transition: all var(--ctc-duration-normal) var(--ctc-ease-default);
}

.ctc-btn--primary {
  background: var(--ctc-primary);
  color: white;
  box-shadow: var(--ctc-shadow-sm);
}

.ctc-btn--primary:hover {
  background: var(--ctc-primary-dark);
  box-shadow: var(--ctc-shadow-md);
  transform: translateY(-1px);
}

.ctc-btn--primary:active {
  transform: translateY(0);
  box-shadow: var(--ctc-shadow-sm);
}

.ctc-btn--primary:focus-visible {
  outline: 2px solid var(--ctc-primary);
  outline-offset: 2px;
}

/* === CARD === */
.ctc-card {
  background: white;
  border: 1px solid var(--ctc-neutral-200);
  border-radius: var(--ctc-radius-lg);
  padding: var(--ctc-space-6);
  transition: all var(--ctc-duration-normal) var(--ctc-ease-default);
}

.ctc-card:hover {
  border-color: var(--ctc-primary);
  box-shadow: var(--ctc-shadow-md);
}

.ctc-card--elevated {
  border: none;
  box-shadow: var(--ctc-shadow-md);
}

.ctc-card--elevated:hover {
  box-shadow: var(--ctc-shadow-lg);
  transform: translateY(-2px);
}

/* === HEADING DECORATION === */
.ctc-heading-decorated::after {
  content: '';
  display: block;
  width: 40px;
  height: 2px;
  background: var(--ctc-primary);
  margin-top: var(--ctc-space-3);
}

/* === SECTION DIVIDER === */
.ctc-divider {
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    var(--ctc-neutral-200) 20%,
    var(--ctc-neutral-200) 80%,
    transparent
  );
  border: none;
  margin: var(--ctc-space-12) 0;
}

/* ... more component styles ... */
```

For a creative agency (bold style) the same components would look completely different:

```css
/* === TOKENS === */
:root {
  --ctc-primary: #ff6b6b;
  --ctc-primary-light: #ff8787;
  --ctc-primary-dark: #ee5a5a;
  --ctc-secondary: #4ecdc4;
  --ctc-accent: #ffe66d;

  /* Radii (rounded/playful) */
  --ctc-radius-sm: 8px;
  --ctc-radius-md: 12px;
  --ctc-radius-lg: 20px;
  --ctc-radius-xl: 28px;

  /* Shadows (dramatic, colored) */
  --ctc-shadow-md: 0 8px 24px rgba(255,107,107,0.2);
  --ctc-shadow-lg: 0 16px 40px rgba(255,107,107,0.25);

  /* Motion (expressive) */
  --ctc-duration-normal: 300ms;
  --ctc-ease-default: cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* === BUTTON === */
.ctc-btn--primary {
  background: linear-gradient(135deg, var(--ctc-primary), var(--ctc-primary-dark));
  color: white;
  border-radius: var(--ctc-radius-xl);
  box-shadow: var(--ctc-shadow-md);
  font-weight: 700;
}

.ctc-btn--primary:hover {
  transform: translateY(-4px) rotate(-1deg);
  box-shadow: var(--ctc-shadow-lg);
}

/* === CARD === */
.ctc-card {
  background: #1a1a2e;
  border: none;
  border-radius: var(--ctc-radius-xl);
  padding: var(--ctc-space-8);
  box-shadow: var(--ctc-shadow-md);
}

.ctc-card:hover {
  transform: translateY(-8px) rotate(-1deg);
  box-shadow: var(--ctc-shadow-lg);
}

/* === HEADING DECORATION === */
.ctc-heading-decorated::after {
  content: '';
  display: block;
  width: 100%;
  height: 8px;
  background: linear-gradient(90deg, #ff6b6b, #feca57, #48dbfb);
  margin-top: var(--ctc-space-2);
  border-radius: var(--ctc-radius-md);
}

/* ... completely different visual language ... */
```

---

## Phase 3: Content-Aware Layout (Blueprint)

### 3.1 Blueprint Role Changes

The blueprint system's role changes from "select visual style" to "apply brand-specific layout decisions."

**Key Change:** Remove hardcoded visual styles, use generated brand system instead.

```typescript
// OLD (template selection)
interface PageStrategy {
  visualStyle: 'editorial' | 'marketing' | 'minimal' | 'bold' | 'warm-modern';
  // ...
}

// NEW (brand-driven)
interface PageStrategy {
  brandDesignSystemId: string;        // Reference to generated system
  layoutMode: 'standard' | 'magazine' | 'landing' | 'documentation';
  density: 'compact' | 'comfortable' | 'spacious';  // Content density only
  ctaPlacement: CTPStrategy;
  // Visual style comes from brand design system, not selection
}
```

### 3.2 Component Selection

Blueprint still handles content-to-component mapping:

```typescript
// Content analysis determines component type
if (contentHasFAQ) → use 'faq' component
if (contentHasSteps) → use 'timeline' component
if (contentHasList) → use 'card-grid' or 'list' based on item count

// Brand design system provides the styling
const componentCSS = brandDesignSystem.componentStyles.faq;
```

---

## Phase 4: Rendering

### 4.1 Updated Renderer

The renderer injects the brand design system CSS and applies brand-specific classes.

**Updated File:** `services/publishing/renderer/index.ts`

```typescript
async function renderBlueprint(
  blueprint: LayoutBlueprint,
  brandDesignSystem: BrandDesignSystem,
  options: RenderOptions
): Promise<RenderedOutput> {
  // 1. Inject brand design system CSS
  const css = brandDesignSystem.compiledCss;

  // 2. Render components using brand-specific variants
  const html = renderComponents(blueprint.sections, brandDesignSystem.variantMappings);

  // 3. Add decorative elements
  const decoratedHtml = addDecorativeElements(html, brandDesignSystem.decorative);

  return {
    html: decoratedHtml,
    css,
    metadata: { ... }
  };
}
```

---

## Storage Schema

### 4.1 Database Tables

```sql
-- Brand Design DNA (extracted from website)
CREATE TABLE brand_design_dna (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  source_url TEXT NOT NULL,
  screenshot_url TEXT,
  design_dna JSONB NOT NULL,
  ai_model TEXT,
  confidence_score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated Brand Design Systems
CREATE TABLE brand_design_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  design_dna_id UUID REFERENCES brand_design_dna(id),
  design_dna_hash TEXT NOT NULL,          -- For cache invalidation
  compiled_css TEXT NOT NULL,
  tokens JSONB NOT NULL,
  component_styles JSONB NOT NULL,
  decorative_elements JSONB,
  interactions JSONB,
  typography_treatments JSONB,
  image_treatments JSONB,
  ai_model TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Only one active system per project
  UNIQUE(project_id, design_dna_hash)
);

-- Index for fast lookup
CREATE INDEX idx_brand_systems_project ON brand_design_systems(project_id);
```

---

## Implementation Phases

### Phase 1: Fix Current Color Extraction Bug (Immediate)
- [ ] Fix hex parsing in `isNeutral()` function
- [ ] Add proper color format handling
- [ ] Show screenshot to user for verification
- [ ] Remove fake "Match Quality" metric

### Phase 2: AI Vision Design DNA Extraction (Week 1-2)
- [ ] Create `AIDesignAnalyzer.ts` service
- [ ] Implement Design DNA prompt
- [ ] Create DOM validation merge logic
- [ ] Update UI to show full Design DNA summary
- [ ] Add user override capability

### Phase 3: Brand Design System Generation (Week 2-3)
- [ ] Create `BrandDesignSystemGenerator.ts` service
- [ ] Implement design system generation prompt
- [ ] Create CSS compilation logic
- [ ] Add database storage for generated systems
- [ ] Create caching/invalidation logic

### Phase 4: Renderer Integration (Week 3-4)
- [ ] Update renderer to use brand design systems
- [ ] Remove hardcoded visual styles from blueprint
- [ ] Add decorative element injection
- [ ] Add micro-interaction CSS injection
- [ ] Update component library to use brand variants

### Phase 5: UI Integration (Week 4)
- [ ] Add brand design system preview
- [ ] Add CSS customization interface
- [ ] Add regeneration triggers
- [ ] Add export functionality

---

## Success Criteria

1. **Visual Uniqueness**: Two different brands should produce visually distinct outputs
2. **Brand Consistency**: All articles for one brand should share the same design language
3. **Quality**: Output should look like a design agency created it
4. **Accuracy**: Extracted colors match actual brand colors (validated by DOM)
5. **Flexibility**: Users can override/adjust the generated system
6. **Performance**: Design system generation < 30 seconds
7. **Caching**: Regeneration only when brand DNA changes

---

## Open Questions

1. **Font Loading**: How do we handle custom fonts detected from brand websites?
2. **Icon Sets**: Should we generate custom icons or use existing icon libraries?
3. **Animation Complexity**: How complex should generated animations be?
4. **Dark Mode**: Auto-generate dark mode variants?
5. **Print Styles**: Include print-optimized CSS?

---

*Document generated as part of brainstorming session for AI Vision-First Brand Design System architecture.*
