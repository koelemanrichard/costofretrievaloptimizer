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

## Output Format

Return a JSON object matching the DesignDNA interface. Be specific with CSS values where possible (exact colors in hex, specific pixel values, CSS gradient syntax).

For colors, provide your best estimate in hex format. The DOM extraction will validate and provide exact values.

Include confidence scores (0-100) for each major category based on how clearly the design communicates these choices.

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
