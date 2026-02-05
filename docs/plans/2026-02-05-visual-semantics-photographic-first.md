# Visual Semantics: Photographic-First Image Generation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the image generation pipeline to prefer photographic images without text, use minimal-text diagrams when technical visuals are needed, and move all text to HTML figcaptions instead of AI-generated text on images.

**Architecture:** Three-tier image classification system with content-aware routing, strengthened "no text" prompts, and post-generation caption injection via HTML.

**Tech Stack:** TypeScript, React, DALL-E 3 / Gemini Imagen, Supabase Edge Functions

---

## Problem Summary

AI image generators (DALL-E, Imagen) produce poor quality text in images - misspellings, garbled letters, inconsistent fonts. The current system:
1. Biases toward diagrams/infographics (text-heavy by design)
2. Instructs HERO images to include "text overlay with H1/title concept"
3. Only offers text-heavy image types: INFOGRAPHIC, DIAGRAM, CHART, TABLE-VISUAL
4. Interprets "engaging over expressive" as "text-heavy over photographic"

**User Impact:** Generated images look unprofessional due to text errors, feel template-like rather than natural.

---

## Solution Overview

### Three-Tier Image Classification

```
TIER 1: PHOTOGRAPHIC (Default - No Text Ever)
├── SCENE: Environmental/contextual photographs
├── OBJECT: Product/item close-ups
├── ACTION: People performing activities
├── CONCEPT: Abstract photorealistic visuals
└── PORTRAIT: Professional headshots/team photos

TIER 2: MINIMAL DIAGRAM (Shapes + Icons Only - No Labels)
├── FLOWCHART: Boxes + arrows showing process flow
├── RELATIONSHIP: Circles + lines showing connections
├── HIERARCHY: Tree structures showing organization
└── COMPARISON: Side-by-side visual elements

TIER 3: CAPTIONED (Photo/Diagram + HTML Figcaption)
└── Any Tier 1/2 image + <figcaption> with explanatory text
```

### Content Routing Logic

| Content Pattern | Image Tier | Specific Type |
|-----------------|------------|---------------|
| How-to, tutorial, guide | TIER 2 | FLOWCHART |
| Statistics, data, percentages | TIER 1 | CONCEPT (abstract data viz aesthetic) |
| Team, staff, office | TIER 1 | SCENE or PORTRAIT |
| Process, workflow | TIER 2 | FLOWCHART |
| Comparison, vs, alternative | TIER 2 | COMPARISON |
| Concept, idea, strategy | TIER 1 | CONCEPT |
| Product, service, feature | TIER 1 | OBJECT |
| Location, city, region | TIER 1 | SCENE |
| Default (all other) | TIER 1 | SCENE |

**Key Change:** Statistics/data now routes to CONCEPT photographs (abstract data visualization aesthetic) instead of INFOGRAPHIC, because AI cannot reliably render charts with accurate numbers.

---

## Tasks

### Task 1: Add New Image Types to Type Definitions

**Files:**
- Modify: `types/contextualEditor.ts`
- Modify: `types.ts` (ImagePlaceholder type)

**Step 1: Update ImageStyle type**

In `types/contextualEditor.ts`, find the `ImageStyle` type and expand it:

```typescript
// BEFORE:
export type ImageStyle = 'photograph' | 'illustration' | 'diagram' | 'infographic';

// AFTER:
export type ImageStyle =
  // Tier 1: Photographic (no text)
  | 'photograph'      // Generic photo (legacy, maps to SCENE)
  | 'scene'           // Environmental/contextual photography
  | 'object'          // Product/item close-ups
  | 'action'          // People performing activities
  | 'concept'         // Abstract photorealistic visuals
  | 'portrait'        // Professional headshots
  // Tier 2: Minimal diagram (shapes only, no labels)
  | 'flowchart'       // Process flow with boxes + arrows
  | 'relationship'    // Connection diagram with circles + lines
  | 'hierarchy'       // Tree structure diagram
  | 'comparison'      // Side-by-side visual comparison
  // Legacy (deprecated - map to new types)
  | 'illustration'    // Maps to 'concept'
  | 'diagram'         // Maps to 'flowchart'
  | 'infographic';    // Maps to 'concept' (avoid text-heavy)
```

**Step 2: Add ImageTier type**

```typescript
export type ImageTier = 'photographic' | 'minimal-diagram' | 'captioned';

export interface ImageTypeMapping {
  style: ImageStyle;
  tier: ImageTier;
  promptModifiers: string[];
  avoidTerms: string[];
}
```

**Step 3: Commit**

```bash
git add types/contextualEditor.ts types.ts
git commit -m "feat(visual-semantics): add photographic-first image type definitions"
```

---

### Task 2: Create Image Type Routing Configuration

**Files:**
- Create: `config/imageTypeRouting.ts`

**Step 1: Create the routing configuration file**

```typescript
// config/imageTypeRouting.ts
/**
 * Image Type Routing Configuration
 *
 * Routes content patterns to appropriate image tiers and styles.
 * Principle: Photographic-first, minimal-diagram for technical content,
 * all text moved to HTML figcaptions.
 */

import { ImageStyle, ImageTier, ImageTypeMapping } from '../types/contextualEditor';

/**
 * Content pattern matchers with priority order
 * Higher priority patterns are checked first
 */
export const CONTENT_PATTERN_ROUTES: Array<{
  pattern: RegExp;
  priority: number;
  imageType: ImageStyle;
  tier: ImageTier;
  rationale: string;
}> = [
  // TIER 2: Minimal Diagram routes (only when truly technical)
  {
    pattern: /\b(stap(?:pen)?|step(?:s)?|fase(?:n)?|phase(?:s)?)\s*\d/i,
    priority: 100,
    imageType: 'flowchart',
    tier: 'minimal-diagram',
    rationale: 'Numbered steps suggest process flow - use boxes with numbers only',
  },
  {
    pattern: /\b(workflow|proces(?:flow)?|pipeline|sequence)\b/i,
    priority: 95,
    imageType: 'flowchart',
    tier: 'minimal-diagram',
    rationale: 'Explicit process terminology - use directional flow diagram',
  },
  {
    pattern: /\b(hiërarchie|hierarchy|organigram|organization\s*chart)\b/i,
    priority: 90,
    imageType: 'hierarchy',
    tier: 'minimal-diagram',
    rationale: 'Organizational structure - use tree diagram without labels',
  },
  {
    pattern: /\b(vs\.?|versus|compared?\s*to|vergelijk(?:en|ing)?)\b/i,
    priority: 85,
    imageType: 'comparison',
    tier: 'minimal-diagram',
    rationale: 'Comparison content - use side-by-side visual without text',
  },
  {
    pattern: /\b(relatie|relationship|connectie|connection|network)\b/i,
    priority: 80,
    imageType: 'relationship',
    tier: 'minimal-diagram',
    rationale: 'Relationship content - use circles and connecting lines',
  },

  // TIER 1: Photographic routes (default preference)
  {
    pattern: /\b(team|staff|medewerker(?:s)?|employee(?:s)?|founder|oprichter)\b/i,
    priority: 75,
    imageType: 'portrait',
    tier: 'photographic',
    rationale: 'People content - use professional portrait photography',
  },
  {
    pattern: /\b(kantoor|office|gebouw|building|locatie|location|vestiging)\b/i,
    priority: 70,
    imageType: 'scene',
    tier: 'photographic',
    rationale: 'Location content - use environmental scene photography',
  },
  {
    pattern: /\b(product|dienst|service|tool|software|app(?:licatie)?)\b/i,
    priority: 65,
    imageType: 'object',
    tier: 'photographic',
    rationale: 'Product/service content - use object photography',
  },
  {
    pattern: /\b(statistiek|statistic|data|percent|%|cijfer(?:s)?|number(?:s)?)\b/i,
    priority: 60,
    imageType: 'concept',
    tier: 'photographic',
    rationale: 'Data content - use abstract concept photo (NOT infographic with numbers)',
  },
  {
    pattern: /\b(how\s*to|hoe\s*(je|u)?|tutorial|guide|handleiding|instructie)\b/i,
    priority: 55,
    imageType: 'action',
    tier: 'photographic',
    rationale: 'Tutorial content - prefer action photography showing the activity',
  },
  {
    pattern: /\b(concept|idea|idee|strategie|strategy|approach|aanpak|methode)\b/i,
    priority: 50,
    imageType: 'concept',
    tier: 'photographic',
    rationale: 'Conceptual content - use abstract photorealistic imagery',
  },
  {
    pattern: /\b(voordeel|benefit|advantage|kans|opportunity|mogelijkheid)\b/i,
    priority: 45,
    imageType: 'concept',
    tier: 'photographic',
    rationale: 'Benefit content - use aspirational concept photography',
  },
  {
    pattern: /\b(risico|risk|gevaar|danger|nadeel|disadvantage|probleem|problem)\b/i,
    priority: 40,
    imageType: 'concept',
    tier: 'photographic',
    rationale: 'Risk content - use evocative concept photography',
  },
];

/**
 * Default fallback when no pattern matches
 */
export const DEFAULT_IMAGE_ROUTE = {
  imageType: 'scene' as ImageStyle,
  tier: 'photographic' as ImageTier,
  rationale: 'Default: scenic photography provides context without text errors',
};

/**
 * Image type to prompt modifier mapping
 */
export const IMAGE_TYPE_PROMPTS: Record<ImageStyle, ImageTypeMapping> = {
  // Tier 1: Photographic
  scene: {
    style: 'scene',
    tier: 'photographic',
    promptModifiers: [
      'professional photography',
      'environmental scene',
      'natural lighting',
      'high resolution photograph',
      'editorial quality',
      'no text or words visible',
      'no signs or labels',
      'cinematic composition',
    ],
    avoidTerms: ['text', 'words', 'labels', 'caption', 'title', 'heading', 'infographic', 'diagram', 'chart', 'numbers', 'statistics'],
  },
  object: {
    style: 'object',
    tier: 'photographic',
    promptModifiers: [
      'product photography',
      'clean background',
      'studio lighting',
      'high detail close-up',
      'professional product shot',
      'no text or labels on product',
      'no brand names visible',
    ],
    avoidTerms: ['text', 'label', 'brand name', 'logo text', 'packaging text', 'infographic'],
  },
  action: {
    style: 'action',
    tier: 'photographic',
    promptModifiers: [
      'candid photography',
      'action shot',
      'person performing activity',
      'natural movement',
      'documentary style',
      'no text overlays',
      'authentic moment',
    ],
    avoidTerms: ['text', 'caption', 'label', 'title', 'infographic', 'diagram'],
  },
  concept: {
    style: 'concept',
    tier: 'photographic',
    promptModifiers: [
      'abstract photography',
      'conceptual image',
      'metaphorical visual',
      'artistic photograph',
      'evocative imagery',
      'no text or numbers',
      'symbolic representation',
    ],
    avoidTerms: ['text', 'numbers', 'statistics', 'chart', 'graph', 'infographic', 'data visualization', 'labels'],
  },
  portrait: {
    style: 'portrait',
    tier: 'photographic',
    promptModifiers: [
      'professional headshot',
      'portrait photography',
      'soft lighting',
      'clean background',
      'confident pose',
      'business professional',
      'no name tags or labels',
    ],
    avoidTerms: ['text', 'name', 'title', 'label', 'badge', 'caption'],
  },
  photograph: {
    style: 'photograph',
    tier: 'photographic',
    promptModifiers: [
      'professional photography',
      'high quality photograph',
      'natural lighting',
      'no text visible',
    ],
    avoidTerms: ['text', 'words', 'labels', 'infographic'],
  },

  // Tier 2: Minimal Diagram (NO TEXT/LABELS)
  flowchart: {
    style: 'flowchart',
    tier: 'minimal-diagram',
    promptModifiers: [
      'minimalist flowchart',
      'simple geometric shapes',
      'boxes connected by arrows',
      'clean white background',
      'no text inside boxes',
      'no labels',
      'numbered circles only',
      'flat design style',
      'monochromatic with one accent color',
    ],
    avoidTerms: ['text', 'labels', 'words', 'captions', 'annotations', 'detailed', 'complex'],
  },
  relationship: {
    style: 'relationship',
    tier: 'minimal-diagram',
    promptModifiers: [
      'network diagram',
      'circles connected by lines',
      'relationship visualization',
      'no text labels',
      'simple nodes and edges',
      'clean geometric design',
      'minimal color palette',
    ],
    avoidTerms: ['text', 'labels', 'names', 'annotations', 'detailed labels'],
  },
  hierarchy: {
    style: 'hierarchy',
    tier: 'minimal-diagram',
    promptModifiers: [
      'tree diagram',
      'hierarchical structure',
      'organizational chart without text',
      'boxes in tree formation',
      'no labels or names',
      'simple geometric shapes',
      'clean lines connecting levels',
    ],
    avoidTerms: ['text', 'names', 'titles', 'labels', 'job titles', 'annotations'],
  },
  comparison: {
    style: 'comparison',
    tier: 'minimal-diagram',
    promptModifiers: [
      'side by side comparison',
      'split composition',
      'visual contrast',
      'no text labels',
      'symbolic representation',
      'clean dividing line',
      'contrasting colors or shapes',
    ],
    avoidTerms: ['text', 'labels', 'versus text', 'comparison table', 'words'],
  },

  // Legacy types (mapped to new types)
  illustration: {
    style: 'illustration',
    tier: 'photographic',
    promptModifiers: [
      'conceptual photography',
      'artistic photograph',
      'no text elements',
    ],
    avoidTerms: ['text', 'labels', 'infographic'],
  },
  diagram: {
    style: 'diagram',
    tier: 'minimal-diagram',
    promptModifiers: [
      'simple diagram',
      'geometric shapes only',
      'no text labels',
      'clean minimal design',
    ],
    avoidTerms: ['text', 'labels', 'annotations', 'detailed'],
  },
  infographic: {
    style: 'infographic',
    tier: 'photographic', // Redirect to concept photography
    promptModifiers: [
      'abstract data visualization aesthetic',
      'conceptual photograph representing data',
      'no actual numbers or text',
      'artistic interpretation of information',
    ],
    avoidTerms: ['text', 'numbers', 'statistics', 'percentages', 'labels', 'chart axes'],
  },
};

/**
 * Route content to appropriate image type
 */
export function routeContentToImageType(content: string): {
  imageType: ImageStyle;
  tier: ImageTier;
  rationale: string;
} {
  // Sort by priority (highest first)
  const sortedRoutes = [...CONTENT_PATTERN_ROUTES].sort((a, b) => b.priority - a.priority);

  for (const route of sortedRoutes) {
    if (route.pattern.test(content)) {
      return {
        imageType: route.imageType,
        tier: route.tier,
        rationale: route.rationale,
      };
    }
  }

  return DEFAULT_IMAGE_ROUTE;
}

/**
 * Get prompt modifiers for an image type
 */
export function getPromptModifiers(imageType: ImageStyle): string[] {
  return IMAGE_TYPE_PROMPTS[imageType]?.promptModifiers || IMAGE_TYPE_PROMPTS.scene.promptModifiers;
}

/**
 * Get terms to avoid for an image type
 */
export function getAvoidTerms(imageType: ImageStyle): string[] {
  return IMAGE_TYPE_PROMPTS[imageType]?.avoidTerms || IMAGE_TYPE_PROMPTS.scene.avoidTerms;
}

/**
 * Build the "no text" instruction block for prompts
 */
export function buildNoTextInstruction(imageType: ImageStyle): string {
  const mapping = IMAGE_TYPE_PROMPTS[imageType];
  if (!mapping) return 'Do not include any text, letters, numbers, or words in the image.';

  const avoidList = mapping.avoidTerms.join(', ');

  return `CRITICAL: This image must contain ZERO text elements.
- No letters, words, numbers, or symbols
- No labels, captions, titles, or annotations
- No signs, banners, or text on objects
- Specifically avoid: ${avoidList}
- If the scene would naturally have text (signs, screens, labels), blur it or replace with abstract shapes`;
}
```

**Step 2: Commit**

```bash
git add config/imageTypeRouting.ts
git commit -m "feat(visual-semantics): add content-to-image-type routing configuration"
```

---

### Task 3: Update Image Prompt Generator

**Files:**
- Modify: `services/ai/contextualEditing/imagePromptGenerator.ts`

**Step 1: Replace suggestImageStyle function**

Find the `suggestImageStyle` function (lines 60-85) and replace it:

```typescript
import {
  routeContentToImageType,
  getPromptModifiers,
  buildNoTextInstruction
} from '../../../config/imageTypeRouting';

/**
 * Suggest image style based on content analysis
 * Uses photographic-first routing - only suggests diagrams for explicitly technical content
 */
export function suggestImageStyle(contextText: string, personalityId?: string): ImageStyle {
  const { imageType } = routeContentToImageType(contextText);
  return imageType;
}

/**
 * Get the image tier for a given style
 */
export function getImageTier(style: ImageStyle): ImageTier {
  const { tier } = routeContentToImageType(''); // Default
  const mapping = IMAGE_TYPE_PROMPTS[style];
  return mapping?.tier || tier;
}
```

**Step 2: Update buildImagePrompt function**

Find the `buildImagePrompt` function (lines 166-207) and update the system prompt:

```typescript
async function buildImagePrompt(params: {
  contextText: string;
  sectionHeading: string;
  articleTitle: string;
  style: ImageStyle;
  businessInfo: BusinessInfo;
  dispatch: React.Dispatch<any>;
  personalityId?: string;
}): Promise<string> {
  const { contextText, sectionHeading, articleTitle, style, businessInfo, dispatch, personalityId } = params;

  const vibeDescriptor = getVisualVibeDescriptor(personalityId);
  const colorHint = getColorKeyword((businessInfo as any)?.branding?.colors?.primary);

  // Get routing info for this content
  const routeInfo = routeContentToImageType(contextText);
  const promptModifiers = getPromptModifiers(routeInfo.imageType);
  const noTextInstruction = buildNoTextInstruction(routeInfo.imageType);

  const systemPrompt = `You are an expert at creating image generation prompts for professional web content.

Your task is to create a detailed prompt for generating a ${routeInfo.tier === 'photographic' ? 'PHOTOGRAPH' : 'MINIMAL DIAGRAM'}.

## Image Type: ${routeInfo.imageType.toUpperCase()}
${routeInfo.rationale}

## Style Modifiers (MUST include these):
${promptModifiers.map(m => `- ${m}`).join('\n')}

## Brand Context:
- Visual identity: ${vibeDescriptor || 'professional and clean'}
- Color hints: ${colorHint || 'natural tones'}
${(businessInfo as any)?.projectName ? `- Business: ${(businessInfo as any).projectName}` : ''}
${(businessInfo as any)?.targetMarket ? `- Location context: ${(businessInfo as any).targetMarket}` : ''}

## Content Context:
"${contextText.slice(0, 500)}"

Section: ${sectionHeading}
Article: ${articleTitle}

## ${noTextInstruction}

Generate a single, detailed prompt (60-100 words) that:
1. Describes a specific ${routeInfo.tier === 'photographic' ? 'photograph' : 'minimal diagram'}
2. Includes composition, lighting, and mood
3. Avoids any reference to text, labels, or words in the image
4. Uses the style modifiers listed above

Output ONLY the prompt, no explanations.`;

  const result = await callProviderWithFallback(businessInfo, systemPrompt);
  return result.trim();
}
```

**Step 3: Commit**

```bash
git add services/ai/contextualEditing/imagePromptGenerator.ts
git commit -m "feat(visual-semantics): update prompt generator with photographic-first routing"
```

---

### Task 4: Update OpenAI Image Provider

**Files:**
- Modify: `services/ai/imageGeneration/providers/openAiImageProvider.ts`

**Step 1: Import routing utilities**

Add at top of file:

```typescript
import {
  IMAGE_TYPE_PROMPTS,
  buildNoTextInstruction,
  getPromptModifiers,
  getAvoidTerms
} from '../../../../config/imageTypeRouting';
```

**Step 2: Replace getTypeStyleGuidance function**

Find `getTypeStyleGuidance` (lines 362-379) and replace:

```typescript
/**
 * Get style guidance based on image type
 * Now uses photographic-first configuration
 */
function getTypeStyleGuidance(type: string): string {
  const normalizedType = type.toLowerCase();

  // Map legacy types to new system
  const typeMap: Record<string, string> = {
    'hero': 'scene',
    'section': 'scene',
    'infographic': 'concept',
    'chart': 'concept',
    'diagram': 'flowchart',
    'author': 'portrait',
  };

  const mappedType = typeMap[normalizedType] || normalizedType;
  const mapping = IMAGE_TYPE_PROMPTS[mappedType as keyof typeof IMAGE_TYPE_PROMPTS];

  if (!mapping) {
    return 'Professional photography style, clean composition. No text, labels, or words visible in the image.';
  }

  return mapping.promptModifiers.join('. ') + '.';
}
```

**Step 3: Update buildImagePrompt function**

Find `buildImagePrompt` (lines 302-357) and update the prompt construction:

```typescript
function buildImagePrompt(
  placeholder: ImagePlaceholder,
  options: ImageGenerationOptions,
  businessInfo: BusinessInfo
): string {
  const parts: string[] = [];

  // Determine image type from placeholder or default to scene
  const imageType = (placeholder.type?.toLowerCase() || 'scene') as ImageStyle;
  const mapping = IMAGE_TYPE_PROMPTS[imageType] || IMAGE_TYPE_PROMPTS.scene;

  // Start with tier-appropriate style direction
  if (mapping.tier === 'photographic') {
    parts.push('Professional photograph, high resolution, natural lighting');
  } else {
    parts.push('Minimal diagram, clean geometric shapes, flat design');
  }

  // Add style-specific modifiers
  parts.push(...mapping.promptModifiers.slice(0, 4));

  // Add the placeholder description (but filter out text-suggesting words)
  let description = placeholder.description;
  for (const avoidTerm of mapping.avoidTerms) {
    const regex = new RegExp(`\\b${avoidTerm}\\b`, 'gi');
    description = description.replace(regex, '');
  }
  parts.push(description.trim());

  // Add brand color hints if available (as color tones, not text)
  if (businessInfo.brandKit?.colors?.primary) {
    parts.push(`Color palette includes tones of ${businessInfo.brandKit.colors.primary}`);
  }

  // Add industry context
  if (businessInfo.industry) {
    parts.push(`Context: ${businessInfo.industry} industry`);
  }

  // CRITICAL: Strengthened no-text instruction
  parts.push(buildNoTextInstruction(imageType));

  // Final quality modifiers
  parts.push('8K resolution, professional quality, suitable for web publication');

  return parts.filter(Boolean).join('. ');
}
```

**Step 4: Commit**

```bash
git add services/ai/imageGeneration/providers/openAiImageProvider.ts
git commit -m "feat(visual-semantics): update DALL-E provider with photographic-first prompts"
```

---

### Task 5: Update Gemini Image Provider

**Files:**
- Modify: `services/ai/imageGeneration/providers/geminiImageProvider.ts`

**Step 1: Import routing utilities**

```typescript
import {
  IMAGE_TYPE_PROMPTS,
  buildNoTextInstruction,
  getPromptModifiers
} from '../../../../config/imageTypeRouting';
```

**Step 2: Update prompt building logic**

Find where the prompt is constructed and apply similar changes as Task 4:

```typescript
function buildGeminiPrompt(
  placeholder: ImagePlaceholder,
  options: ImageGenerationOptions,
  businessInfo: BusinessInfo
): string {
  const imageType = (placeholder.type?.toLowerCase() || 'scene') as ImageStyle;
  const mapping = IMAGE_TYPE_PROMPTS[imageType] || IMAGE_TYPE_PROMPTS.scene;

  const parts: string[] = [];

  // Tier-appropriate base instruction
  if (mapping.tier === 'photographic') {
    parts.push('Create a professional photograph');
  } else {
    parts.push('Create a minimal diagram with simple geometric shapes');
  }

  // Style modifiers
  parts.push(mapping.promptModifiers.join(', '));

  // Description (filtered)
  let description = placeholder.description;
  for (const term of mapping.avoidTerms) {
    description = description.replace(new RegExp(`\\b${term}\\b`, 'gi'), '');
  }
  parts.push(description.trim());

  // No-text instruction
  parts.push(buildNoTextInstruction(imageType));

  return parts.filter(Boolean).join('. ');
}
```

**Step 3: Commit**

```bash
git add services/ai/imageGeneration/providers/geminiImageProvider.ts
git commit -m "feat(visual-semantics): update Gemini provider with photographic-first prompts"
```

---

### Task 6: Update Pass 4 Section Optimization Prompts

**Files:**
- Modify: `services/ai/contentGeneration/rulesEngine/prompts/sectionOptimizationPromptBuilder.ts`

**Step 1: Update HERO image instructions**

Find the HERO IMAGE section (around lines 389-415) and replace:

```typescript
${isFirstSection ? `
## HERO IMAGE REQUIRED (PHOTOGRAPHIC-FIRST APPROACH)
This is the INTRODUCTION section. You MUST insert a HERO image.

### HERO IMAGE TYPE: SCENE PHOTOGRAPH
- Must be a PHOTOGRAPH, not an infographic or diagram
- Should visually represent the central topic through imagery
- NO TEXT OVERLAYS - all text goes in figcaption
- Wide cinematic composition (16:9 aspect ratio)

### HERO IMAGE POSITIONING:
- AFTER the first paragraph (the definition/centerpiece annotation)
- BEFORE any subsequent paragraphs
- NEVER between the heading and the first paragraph

### CORRECT STRUCTURE:
## [Heading]
[First paragraph - the definition/centerpiece annotation]

[IMAGE: SCENE photograph showing ${holistic.centralEntity} in context - professional photography, no text | alt="descriptive scene of ${holistic.centralEntity}"]

[Second paragraph onwards...]

### WHAT TO DESCRIBE:
- Environmental context related to the topic
- Objects, scenes, or activities representing the concept
- Abstract visual metaphors for the topic
- NEVER describe text, labels, titles, or infographic elements
` : `
## SECTION IMAGE RULES (PHOTOGRAPHIC-FIRST)
For body sections:
- Prefer PHOTOGRAPHS over diagrams
- Only use MINIMAL DIAGRAMS for explicit process/workflow content
- Place images AFTER explanatory paragraphs
- Pattern: Heading → Answer paragraph → Image → Next content
- NEVER place image between heading and its answer
`}
```

**Step 2: Update image type list**

Find the image types section (around lines 447-452) and replace:

```typescript
## Image Types (PHOTOGRAPHIC-FIRST):
- **SCENE**: Environmental/contextual photographs (DEFAULT)
- **OBJECT**: Product or item close-up photographs
- **ACTION**: People performing activities
- **CONCEPT**: Abstract photorealistic imagery for ideas/data
- **FLOWCHART**: ONLY for explicit step-by-step processes (minimal shapes, NO labels)
- **COMPARISON**: ONLY for explicit A vs B content (visual contrast, NO text)

## DEPRECATED (DO NOT USE):
- ~~INFOGRAPHIC~~ → Use CONCEPT photograph instead
- ~~CHART~~ → Use CONCEPT photograph instead
- ~~DIAGRAM with labels~~ → Use FLOWCHART with shapes only
```

**Step 3: Update the engaging vs expressive guidance**

Find lines 440-443 and replace:

```typescript
### RULE 4: PHOTOGRAPHIC OVER DIAGRAMMATIC
- Prefer: Scene photographs, object photos, action shots, concept imagery
- Use sparingly: Minimal flowcharts (only for explicit processes)
- NEVER use: Infographics with text, labeled diagrams, charts with numbers

AI image generators cannot reliably render text. All explanatory text belongs in:
- <figcaption> elements below the image
- Alt text attributes
- Surrounding paragraph text
```

**Step 4: Commit**

```bash
git add services/ai/contentGeneration/rulesEngine/prompts/sectionOptimizationPromptBuilder.ts
git commit -m "feat(visual-semantics): update Pass 4 prompts for photographic-first approach"
```

---

### Task 7: Update Visual Semantics Configuration

**Files:**
- Modify: `config/visualSemantics.ts`

**Step 1: Update IMAGE_NGRAM_BY_INTENT**

Find `IMAGE_NGRAM_BY_INTENT` (lines 412-444) and replace:

```typescript
export const IMAGE_NGRAM_BY_INTENT: Record<string, string[]> = {
  informational: [
    'scene photographs showing context',
    'action photographs demonstrating process',
    'concept photographs representing ideas',
    'minimal flowcharts for step sequences',
    'object photographs of relevant items',
  ],
  transactional: [
    'product photographs from multiple angles',
    'lifestyle scene photographs',
    'object close-up photographs',
    'action photographs showing product in use',
    'comparison photographs (side by side)',
  ],
  commercial: [
    'comparison photographs',
    'scene photographs showing benefits',
    'object photographs of features',
    'action photographs of usage',
    'concept photographs for value propositions',
  ],
  navigational: [
    'scene photographs of locations',
    'object photographs of interfaces',
    'portrait photographs of team members',
    'action photographs of processes',
  ],
};
```

**Step 2: Add new ALT_TEXT guidance**

Add after `ALT_TEXT_EXAMPLES`:

```typescript
/**
 * Figcaption best practices
 * Since text is moved from images to captions
 */
export const FIGCAPTION_GUIDELINES = {
  maxLength: 150,
  structure: 'Describe what the image shows, then explain its relevance to the content',
  examples: [
    {
      imageDescription: 'Scene photograph of modern office workspace',
      goodCaption: 'Een moderne werkplek waar remote teams effectief samenwerken.',
      badCaption: 'Afbeelding van kantoor', // Too generic
    },
    {
      imageDescription: 'Flowchart showing 4 connected boxes',
      goodCaption: 'Het vier-stappen proces voor succesvolle implementatie: analyse, ontwerp, uitvoering, evaluatie.',
      badCaption: 'Diagram', // Caption should provide the text the diagram cannot show
    },
  ],
};

/**
 * Mapping from old text-heavy types to new photographic types
 */
export const LEGACY_TYPE_MIGRATION: Record<string, string> = {
  'infographic': 'concept',
  'chart': 'concept',
  'diagram': 'flowchart',
  'illustration': 'concept',
  'data visualization': 'concept',
  'labeled diagram': 'flowchart',
};
```

**Step 3: Commit**

```bash
git add config/visualSemantics.ts
git commit -m "feat(visual-semantics): update config with photographic-first image types"
```

---

### Task 8: Add Figcaption Generation

**Files:**
- Create: `services/ai/contextualEditing/figcaptionGenerator.ts`
- Modify: `services/publishing/renderer/imageInjector.ts`

**Step 1: Create figcaption generator service**

```typescript
// services/ai/contextualEditing/figcaptionGenerator.ts
/**
 * Figcaption Generator
 *
 * Generates descriptive captions for images since all explanatory text
 * has been moved from AI-generated images to HTML figcaptions.
 */

import { callProviderWithFallback } from '../contentGeneration/providerUtils';
import { BusinessInfo } from '../../../types';

export interface FigcaptionRequest {
  imageDescription: string;
  imageType: string;
  sectionHeading: string;
  sectionContent: string;
  altText: string;
}

export interface FigcaptionResult {
  caption: string;
  length: number;
}

/**
 * Generate a figcaption that provides the explanatory text
 * that would have been ON the image (but AI can't render reliably)
 */
export async function generateFigcaption(
  request: FigcaptionRequest,
  businessInfo: BusinessInfo,
): Promise<FigcaptionResult> {
  const { imageDescription, imageType, sectionHeading, sectionContent, altText } = request;

  const isMinimalDiagram = ['flowchart', 'hierarchy', 'relationship', 'comparison'].includes(imageType.toLowerCase());

  const systemPrompt = `You are writing a figcaption (image caption) for web content.

## Image Context
- Type: ${imageType}
- Description: ${imageDescription}
- Alt text: ${altText}
- Section: ${sectionHeading}

## Content Context (first 300 chars):
${sectionContent.slice(0, 300)}

## Task
Write a figcaption that:
${isMinimalDiagram
  ? `1. EXPLAINS what the diagram represents (since the diagram has no labels)
2. Names the elements/steps if it's a process diagram
3. Provides the context the viewer needs to understand the visual`
  : `1. Describes what the photograph shows
2. Connects it to the section topic
3. Adds value beyond what's visible`}

## Rules
- Maximum 150 characters
- Write in ${businessInfo.language || 'Dutch'}
- Be specific, not generic
- Don't start with "Afbeelding van" or "Image of"

Output ONLY the figcaption text, nothing else.`;

  try {
    const result = await callProviderWithFallback(businessInfo, systemPrompt);
    const caption = result.trim().slice(0, 150);

    return {
      caption,
      length: caption.length,
    };
  } catch (error) {
    // Fallback: use alt text as caption
    return {
      caption: altText.slice(0, 150),
      length: altText.length,
    };
  }
}

/**
 * Generate figcaptions for all images in content
 */
export async function generateFigcaptionsForContent(
  images: Array<{ description: string; type: string; altText: string; sectionKey: string }>,
  sections: Array<{ key: string; heading: string; content: string }>,
  businessInfo: BusinessInfo,
): Promise<Map<string, string>> {
  const captions = new Map<string, string>();

  for (const image of images) {
    const section = sections.find(s => s.key === image.sectionKey);
    if (!section) continue;

    const result = await generateFigcaption({
      imageDescription: image.description,
      imageType: image.type,
      sectionHeading: section.heading,
      sectionContent: section.content,
      altText: image.altText,
    }, businessInfo);

    captions.set(image.description, result.caption);
  }

  return captions;
}
```

**Step 2: Update imageInjector to include figcaptions**

In `services/publishing/renderer/imageInjector.ts`, find the HTML output section (around line 185-191) and update:

```typescript
// Generate HTML with figcaption wrapper
const figcaption = image.figcaption || image.altText;
const html = `<figure class="ctc-image-figure">
  <img src="${image.url}"
       alt="${image.altText}"
       width="${image.width || 800}"
       height="${image.height || 450}"
       loading="${isFirst ? 'eager' : 'lazy'}"
       ${isFirst ? 'fetchpriority="high"' : ''}
       class="ctc-injected-image" />
  <figcaption class="ctc-figcaption">${figcaption}</figcaption>
</figure>`;
```

**Step 3: Commit**

```bash
git add services/ai/contextualEditing/figcaptionGenerator.ts services/publishing/renderer/imageInjector.ts
git commit -m "feat(visual-semantics): add figcaption generator and update image injector"
```

---

### Task 9: Add CSS for Figcaptions

**Files:**
- Modify: `services/publishing/renderer/ComponentStyles.ts`

**Step 1: Add figcaption styles**

Find the component styles and add:

```typescript
// Figcaption styles for photographic-first images
.ctc-image-figure {
  margin: 1.5rem 0;
  position: relative;
}

.ctc-injected-image {
  width: 100%;
  height: auto;
  border-radius: var(--radius-medium, 8px);
  display: block;
}

.ctc-figcaption {
  margin-top: 0.75rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  color: var(--text-muted, #666);
  text-align: center;
  font-style: italic;
  line-height: 1.4;
  background: var(--surface-color, #f9fafb);
  border-radius: var(--radius-small, 4px);
  border-left: 3px solid var(--primary-color, #3b82f6);
}

/* Hero image figcaption - more prominent */
.hero-image .ctc-figcaption {
  font-size: 1rem;
  font-style: normal;
  font-weight: 500;
  text-align: left;
  padding: 1rem 1.5rem;
}
```

**Step 2: Commit**

```bash
git add services/publishing/renderer/ComponentStyles.ts
git commit -m "feat(visual-semantics): add figcaption CSS styles"
```

---

### Task 10: Update Placeholder Parser

**Files:**
- Modify: `services/ai/imageGeneration/placeholderParser.ts`

**Step 1: Update type detection to use new types**

Find the type detection logic (lines 49-69) and update:

```typescript
function detectImageType(description: string, isFirst: boolean): ImagePlaceholderType {
  const lower = description.toLowerCase();

  // Hero detection (first image in content)
  if (isFirst || lower.includes('hero') || lower.includes('featured')) {
    return 'HERO';
  }

  // Tier 2: Minimal diagrams (only explicit process content)
  if (lower.includes('flowchart') || lower.includes('flow chart')) {
    return 'FLOWCHART';
  }
  if (lower.includes('hierarchy') || lower.includes('tree structure') || lower.includes('organigram')) {
    return 'HIERARCHY';
  }
  if (lower.includes('comparison') || lower.includes('versus') || lower.includes(' vs ')) {
    return 'COMPARISON';
  }
  if (lower.includes('relationship') || lower.includes('network') || lower.includes('connection')) {
    return 'RELATIONSHIP';
  }

  // Tier 1: Photographic (default)
  if (lower.includes('portrait') || lower.includes('headshot') || lower.includes('team photo')) {
    return 'PORTRAIT';
  }
  if (lower.includes('product') || lower.includes('object') || lower.includes('close-up')) {
    return 'OBJECT';
  }
  if (lower.includes('action') || lower.includes('activity') || lower.includes('demonstrat')) {
    return 'ACTION';
  }
  if (lower.includes('concept') || lower.includes('abstract') || lower.includes('metaphor')) {
    return 'CONCEPT';
  }

  // Default to SCENE (environmental photography)
  return 'SCENE';
}
```

**Step 2: Commit**

```bash
git add services/ai/imageGeneration/placeholderParser.ts
git commit -m "feat(visual-semantics): update placeholder parser with photographic-first types"
```

---

## Verification

### After All Tasks Complete:

1. **Build verification:**
   ```bash
   npm run build
   ```
   Expected: No TypeScript errors

2. **Manual testing:**
   - Navigate to Style & Publish for a topic with generated content
   - Run through the image generation flow
   - Verify:
     - HERO images are scenic photographs, not infographics
     - Section images are predominantly photographs
     - Diagrams (if any) have minimal shapes, no labels
     - All images have figcaptions providing explanatory text
     - Generated images contain NO text/labels/numbers

3. **Visual comparison:**
   - Generate images for same content before/after
   - Before: Text-heavy infographics with spelling errors
   - After: Clean photographs with text in figcaptions

---

## Files Changed Summary

| File | Action | Impact |
|------|--------|--------|
| `types/contextualEditor.ts` | MODIFY | Add new ImageStyle and ImageTier types |
| `types.ts` | MODIFY | Update ImagePlaceholder type |
| `config/imageTypeRouting.ts` | CREATE | Content-to-image routing logic |
| `services/ai/contextualEditing/imagePromptGenerator.ts` | MODIFY | Photographic-first style suggestion |
| `services/ai/imageGeneration/providers/openAiImageProvider.ts` | MODIFY | Updated prompt building |
| `services/ai/imageGeneration/providers/geminiImageProvider.ts` | MODIFY | Updated prompt building |
| `services/ai/contentGeneration/rulesEngine/prompts/sectionOptimizationPromptBuilder.ts` | MODIFY | Pass 4 prompt updates |
| `config/visualSemantics.ts` | MODIFY | Updated image type configurations |
| `services/ai/contextualEditing/figcaptionGenerator.ts` | CREATE | Caption generation service |
| `services/publishing/renderer/imageInjector.ts` | MODIFY | Figcaption HTML output |
| `services/publishing/renderer/ComponentStyles.ts` | MODIFY | Figcaption CSS styles |
| `services/ai/imageGeneration/placeholderParser.ts` | MODIFY | Updated type detection |
