/**
 * AI Vision prompt for extracting complete Design DNA from a website screenshot.
 */

export const DESIGN_DNA_EXTRACTION_PROMPT = `You are a senior brand designer analyzing a website screenshot. Extract the complete design system (Design DNA) as a JSON object.

## Analysis Instructions

1. **Colors**: Identify ALL colors used, not just 1-2. Look for:
   - Primary brand color (logo, main buttons, key accents)
   - Secondary brand color (supporting elements)
   - Accent colors (CTAs, highlights, interactive elements)
   - Full neutral palette (text colors from darkest to lightest, backgrounds, borders)
   - Any semantic colors (success green, warning yellow, error red)

2. **Typography**: Identify fonts and their usage:
   - Heading font family and characteristics (serif, sans-serif, display, weight)
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

7. **Motion**: Assess animation/interaction level (from what's visible):
   - Static or likely animated elements
   - Hover effect sophistication hints
   - Scroll animations visible

8. **Image Treatment**: How are images presented?
   - Natural, duotone, or stylized
   - Frame/border treatment
   - Aspect ratios used

9. **Overall Personality**: Synthesize the brand feeling:
   - Corporate/Creative/Luxurious/Friendly/Bold/Minimal
   - Formality level (1-5)
   - Energy level (1-5)
   - Warmth level (1-5)

## Output Format - EXACT STRUCTURE REQUIRED

Return a JSON object with this EXACT structure. Use specific CSS values.

\`\`\`json
{
  "colors": {
    "primary": { "hex": "#hexcolor", "usage": "where used", "confidence": 80 },
    "primaryLight": { "hex": "#hexcolor", "usage": "light variant", "confidence": 70 },
    "primaryDark": { "hex": "#hexcolor", "usage": "dark variant", "confidence": 70 },
    "secondary": { "hex": "#hexcolor", "usage": "secondary color", "confidence": 70 },
    "accent": { "hex": "#hexcolor", "usage": "CTAs/highlights", "confidence": 70 },
    "neutrals": {
      "darkest": "#111827",
      "dark": "#374151",
      "medium": "#6b7280",
      "light": "#d1d5db",
      "lightest": "#f9fafb"
    },
    "semantic": {
      "success": "#10b981",
      "warning": "#f59e0b",
      "error": "#ef4444",
      "info": "#3b82f6"
    },
    "harmony": "monochromatic|complementary|analogous|triadic|split-complementary",
    "dominantMood": "corporate|creative|luxurious|friendly|bold|minimal",
    "contrastLevel": "high|medium|subtle"
  },
  "typography": {
    "headingFont": {
      "family": "Font Name",
      "fallback": "sans-serif",
      "weight": 700,
      "style": "serif|sans-serif|display|slab|mono",
      "character": "modern|classic|playful|corporate|elegant"
    },
    "bodyFont": {
      "family": "Font Name",
      "fallback": "sans-serif",
      "weight": 400,
      "style": "serif|sans-serif",
      "lineHeight": 1.6
    },
    "scaleRatio": 1.25,
    "baseSize": "16px",
    "headingCase": "none|uppercase|capitalize",
    "headingLetterSpacing": "normal|-0.02em|0.05em",
    "usesDropCaps": false,
    "headingUnderlineStyle": "none|solid|gradient|decorative",
    "linkStyle": "underline|color-only|animated-underline|highlight"
  },
  "spacing": {
    "baseUnit": 16,
    "density": "compact|comfortable|spacious|airy",
    "sectionGap": "tight|moderate|generous|dramatic",
    "contentWidth": "narrow|medium|wide|full",
    "whitespacePhilosophy": "minimal|balanced|luxurious"
  },
  "shapes": {
    "borderRadius": {
      "style": "sharp|subtle|rounded|pill|mixed",
      "small": "4px",
      "medium": "8px",
      "large": "16px",
      "full": "9999px"
    },
    "buttonStyle": "sharp|soft|rounded|pill",
    "cardStyle": "flat|subtle-shadow|elevated|bordered|glass",
    "inputStyle": "minimal|bordered|filled|underlined"
  },
  "effects": {
    "shadows": {
      "style": "none|subtle|medium|dramatic|colored",
      "cardShadow": "0 1px 3px rgba(0,0,0,0.1)",
      "buttonShadow": "0 1px 2px rgba(0,0,0,0.05)",
      "elevatedShadow": "0 10px 25px rgba(0,0,0,0.15)"
    },
    "gradients": {
      "usage": "none|subtle|prominent",
      "primaryGradient": "linear-gradient(...)",
      "heroGradient": "linear-gradient(...)",
      "ctaGradient": "linear-gradient(...)"
    },
    "backgrounds": {
      "usesPatterns": false,
      "patternType": "dots|grid|waves|geometric|organic",
      "usesTextures": false,
      "usesOverlays": false
    },
    "borders": {
      "style": "none|subtle|visible|decorative",
      "defaultColor": "#e5e7eb",
      "accentBorderUsage": false
    }
  },
  "decorative": {
    "dividerStyle": "none|line|gradient|decorative|icon",
    "usesFloatingShapes": false,
    "usesCornerAccents": false,
    "usesWaveShapes": false,
    "usesGeometricPatterns": false,
    "iconStyle": "outline|solid|duotone|custom",
    "decorativeAccentColor": "#3b82f6"
  },
  "layout": {
    "gridStyle": "strict-12|asymmetric|fluid|modular",
    "alignment": "left|center|mixed",
    "heroStyle": "full-bleed|contained|split|minimal|video|animated",
    "cardLayout": "grid|masonry|list|carousel|stacked",
    "ctaPlacement": "inline|floating|section-end|prominent-banner",
    "navigationStyle": "minimal|standard|mega-menu|sidebar"
  },
  "motion": {
    "overall": "static|subtle|dynamic|expressive",
    "transitionSpeed": "instant|fast|normal|slow",
    "easingStyle": "linear|ease|spring|bounce",
    "hoverEffects": {
      "buttons": "none|darken|lift|glow|fill|scale",
      "cards": "none|lift|tilt|glow|border",
      "links": "none|underline|color|highlight"
    },
    "scrollAnimations": false,
    "parallaxEffects": false
  },
  "images": {
    "treatment": "natural|duotone|grayscale|high-contrast|colorized",
    "frameStyle": "none|rounded|shadow|border|custom-mask",
    "hoverEffect": "none|zoom|overlay|caption-reveal",
    "aspectRatioPreference": "16:9|4:3|1:1|mixed"
  },
  "componentPreferences": {
    "preferredListStyle": "bullets|icons|cards|numbered",
    "preferredCardStyle": "minimal|bordered|elevated|glass",
    "testimonialStyle": "card|quote|carousel|grid",
    "faqStyle": "accordion|cards|list",
    "ctaStyle": "button|banner|floating|inline"
  },
  "personality": {
    "overall": "corporate|creative|luxurious|friendly|bold|minimal|elegant|playful",
    "formality": 3,
    "energy": 3,
    "warmth": 3,
    "trustSignals": "minimal|moderate|prominent"
  },
  "confidence": {
    "overall": 80,
    "colorsConfidence": 85,
    "typographyConfidence": 70,
    "layoutConfidence": 75
  },
  "analysisNotes": ["note about design choices"]
}
\`\`\`

IMPORTANT NOTES:
- For "colors", each color (primary, primaryLight, etc.) MUST be an object with "hex", "usage", and "confidence" properties
- For "shapes.borderRadius", it MUST be an object with "style", "small", "medium", "large", and "full" properties - NOT a simple string
- Pick ONE value from each set of options (e.g., "rounded" not "rounded|pill")
- Use actual hex colors detected from the screenshot
- formality, energy, warmth are integers from 1 to 5
- confidence values are integers from 0 to 100

## CRITICAL: Return ONLY valid JSON, no markdown formatting or explanation.`;

export const DESIGN_DNA_VALIDATION_PROMPT = `You are validating extracted design tokens against what you see in the screenshot.

EXTRACTED VALUES:
{extractedValues}

TASK: Compare the extracted values to what you actually see in the screenshot.

Return JSON:
{
  "isValid": true/false,
  "corrections": {
    "primaryColor": "#corrected" or null,
    "secondaryColor": "#corrected" or null,
    ...
  },
  "confidence": 0-100,
  "notes": "explanation"
}

IMPORTANT: Only suggest corrections if the extracted value is CLEARLY wrong.`;
