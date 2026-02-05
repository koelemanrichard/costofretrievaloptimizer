/**
 * Image Type Routing Configuration
 *
 * This module provides intelligent routing from content patterns to appropriate
 * image types, implementing a photographic-first visual semantics strategy.
 *
 * The routing system:
 * 1. Matches content against regex patterns sorted by priority
 * 2. Returns the first matching image type with its tier
 * 3. Falls back to 'scene' (photographic) when no pattern matches
 *
 * Image Tiers:
 * - Photographic: Real-world photography, no text overlays
 * - Minimal-diagram: Simple geometric shapes, no labels or annotations
 * - Captioned: Reserved for future use (currently avoided)
 */

import { ImageStyle, ImageTier, ImageTypeMapping } from '../types/contextualEditor';

// ============================================================================
// CONTENT PATTERN ROUTES
// ============================================================================

export interface ContentPatternRoute {
  /** Regex pattern to match against content */
  pattern: RegExp;
  /** Higher priority patterns are matched first (100 = highest) */
  priority: number;
  /** The image type to use when pattern matches */
  imageType: ImageStyle;
  /** The tier classification for this image type */
  tier: ImageTier;
  /** Human-readable explanation for this routing rule */
  rationale: string;
}

/**
 * Content pattern routes sorted by priority (highest first).
 * Patterns are matched against section content to determine the most
 * appropriate image type for visual semantics.
 */
export const CONTENT_PATTERN_ROUTES: ContentPatternRoute[] = [
  // Priority 100: Numbered steps (strongest process indicator)
  {
    pattern: /\b(stap|step|fase|phase)\s*[1-9]/i,
    priority: 100,
    imageType: 'flowchart',
    tier: 'minimal-diagram',
    rationale: 'Numbered steps indicate a sequential process, best shown as a flowchart',
  },

  // Priority 95: Workflow/process terminology
  {
    pattern: /\b(workflow|proces|procedure|stappenplan|flow|pipeline|sequence|cycle|loop)\b/i,
    priority: 95,
    imageType: 'flowchart',
    tier: 'minimal-diagram',
    rationale: 'Process-oriented language suggests a visual flow representation',
  },

  // Priority 90: Hierarchy/organization terminology
  {
    pattern: /\b(hiërarchie|hierarchy|organisatie|organization|structuur|structure|niveau|level|rang|tier|afdeling|department|team\s*structuur|org\s*chart)\b/i,
    priority: 90,
    imageType: 'hierarchy',
    tier: 'minimal-diagram',
    rationale: 'Organizational/hierarchical content needs tree-structure visualization',
  },

  // Priority 85: Comparison/versus terminology
  {
    pattern: /\b(vergelijk|compare|versus|vs\.?|tegenover|contrast|verschil|difference|voor\s*en\s*na|before\s*and\s*after|alternatief|alternative)\b/i,
    priority: 85,
    imageType: 'comparison',
    tier: 'minimal-diagram',
    rationale: 'Comparative content benefits from side-by-side visual comparison',
  },

  // Priority 80: Relationship/network terminology
  {
    pattern: /\b(relatie|relation|verbinding|connection|netwerk|network|koppeling|link|integratie|integration|samenwerking|collaboration|afhankelijkheid|dependency)\b/i,
    priority: 80,
    imageType: 'relationship',
    tier: 'minimal-diagram',
    rationale: 'Relationship concepts are best shown as connected nodes',
  },

  // Priority 75: Team/staff/people
  {
    pattern: /\b(team|medewerker|employee|staff|personeel|collega|colleague|expert|specialist|professional|oprichter|founder|ceo|directeur|director|manager)\b/i,
    priority: 75,
    imageType: 'portrait',
    tier: 'photographic',
    rationale: 'People-focused content calls for professional portrait photography',
  },

  // Priority 70: Location/office/building
  {
    pattern: /\b(locatie|location|kantoor|office|gebouw|building|werkplek|workplace|faciliteit|facility|hoofdkwartier|headquarters|vestiging|branch|pand|premises)\b/i,
    priority: 70,
    imageType: 'scene',
    tier: 'photographic',
    rationale: 'Location content is best represented with environmental photography',
  },

  // Priority 65: Product/service focus
  {
    pattern: /\b(product|dienst|service|oplossing|solution|tool|software|platform|systeem|system|applicatie|application|app|machine|apparaat|device|equipment)\b/i,
    priority: 65,
    imageType: 'object',
    tier: 'photographic',
    rationale: 'Product/service content benefits from focused object photography',
  },

  // Priority 60: Statistics/data/percentages (NOT infographic - avoid text)
  {
    pattern: /\b(statistiek|statistic|data|procent|percent|%|grafiek|graph|chart|cijfer|number|metric|kpi|roi|groei|growth|daling|decline|trend|analyse|analysis)\b/i,
    priority: 60,
    imageType: 'concept',
    tier: 'photographic',
    rationale: 'Data content uses abstract concept imagery; infographics contain too much text',
  },

  // Priority 55: Tutorial/how-to content
  {
    pattern: /\b(tutorial|how\s*to|hoe\s*(je|u)?|handleiding|guide|instructie|instruction|uitleg|explanation|leer|learn|beginner|starten|start|aan\s*de\s*slag|getting\s*started)\b/i,
    priority: 55,
    imageType: 'action',
    tier: 'photographic',
    rationale: 'Tutorial content benefits from action photography showing the activity',
  },

  // Priority 50: Concept/strategy/idea
  {
    pattern: /\b(concept|strategie|strategy|idee|idea|visie|vision|missie|mission|doel|goal|objective|plan|aanpak|approach|methode|method|filosofie|philosophy)\b/i,
    priority: 50,
    imageType: 'concept',
    tier: 'photographic',
    rationale: 'Abstract concepts use photorealistic conceptual imagery',
  },

  // Priority 45: Benefit/opportunity
  {
    pattern: /\b(voordeel|benefit|advantage|kans|opportunity|winst|profit|succes|success|resultaat|result|verbetering|improvement|optimalisatie|optimization)\b/i,
    priority: 45,
    imageType: 'concept',
    tier: 'photographic',
    rationale: 'Positive outcome content uses uplifting conceptual photography',
  },

  // Priority 40: Risk/danger
  {
    pattern: /\b(risico|risk|gevaar|danger|waarschuwing|warning|fout|error|mistake|probleem|problem|uitdaging|challenge|obstakel|obstacle|bedreiging|threat)\b/i,
    priority: 40,
    imageType: 'concept',
    tier: 'photographic',
    rationale: 'Risk-related content uses cautionary conceptual imagery',
  },
];

// Sort routes by priority (highest first) to ensure correct matching order
CONTENT_PATTERN_ROUTES.sort((a, b) => b.priority - a.priority);

// ============================================================================
// DEFAULT IMAGE ROUTE
// ============================================================================

/**
 * Default image route when no content pattern matches.
 * Uses 'scene' (environmental photography) as the safest photographic default.
 */
export const DEFAULT_IMAGE_ROUTE: ContentPatternRoute = {
  pattern: /.*/,
  priority: 0,
  imageType: 'scene',
  tier: 'photographic',
  rationale: 'Default to environmental photography when no specific pattern matches',
};

// ============================================================================
// IMAGE TYPE PROMPT CONFIGURATIONS
// ============================================================================

/**
 * Prompt modifiers and avoid terms for each image type.
 * These configurations ensure AI image generators produce appropriate
 * results without unwanted text or labels.
 */
export const IMAGE_TYPE_PROMPTS: Record<ImageStyle, ImageTypeMapping> = {
  // Tier 1: Photographic types
  photograph: {
    style: 'photograph',
    tier: 'photographic',
    promptModifiers: [
      'professional photography',
      'high resolution',
      'natural lighting',
      'no text or words visible',
      'no signs or labels',
      'no watermarks',
    ],
    avoidTerms: [
      'text', 'words', 'letters', 'labels', 'signs', 'typography',
      'captions', 'annotations', 'watermark', 'logo', 'brand name',
    ],
  },

  scene: {
    style: 'scene',
    tier: 'photographic',
    promptModifiers: [
      'professional photography',
      'environmental shot',
      'wide angle',
      'contextual setting',
      'no text or words visible',
      'no signs or labels',
      'no watermarks',
    ],
    avoidTerms: [
      'text', 'words', 'letters', 'labels', 'signs', 'typography',
      'captions', 'annotations', 'watermark', 'logo', 'brand name',
    ],
  },

  object: {
    style: 'object',
    tier: 'photographic',
    promptModifiers: [
      'professional product photography',
      'clean background',
      'studio lighting',
      'sharp focus',
      'no text or words visible',
      'no labels or packaging text',
      'no watermarks',
    ],
    avoidTerms: [
      'text', 'words', 'letters', 'labels', 'packaging', 'brand',
      'logo', 'typography', 'captions', 'annotations', 'watermark',
    ],
  },

  action: {
    style: 'action',
    tier: 'photographic',
    promptModifiers: [
      'professional photography',
      'dynamic action shot',
      'person performing activity',
      'natural movement',
      'no text or words visible',
      'no signs or labels',
      'no watermarks',
    ],
    avoidTerms: [
      'text', 'words', 'letters', 'labels', 'signs', 'typography',
      'captions', 'annotations', 'watermark', 'logo', 'instructional text',
    ],
  },

  concept: {
    style: 'concept',
    tier: 'photographic',
    promptModifiers: [
      'professional photography',
      'abstract conceptual',
      'photorealistic',
      'metaphorical visual',
      'no text or words visible',
      'no signs or labels',
      'no watermarks',
    ],
    avoidTerms: [
      'text', 'words', 'letters', 'labels', 'signs', 'typography',
      'captions', 'annotations', 'watermark', 'logo', 'infographic',
    ],
  },

  portrait: {
    style: 'portrait',
    tier: 'photographic',
    promptModifiers: [
      'professional portrait photography',
      'headshot',
      'professional lighting',
      'clean background',
      'no text or words visible',
      'no name badges or labels',
      'no watermarks',
    ],
    avoidTerms: [
      'text', 'words', 'letters', 'labels', 'name tag', 'badge',
      'typography', 'captions', 'annotations', 'watermark', 'logo',
    ],
  },

  // Tier 2: Minimal diagram types
  flowchart: {
    style: 'flowchart',
    tier: 'minimal-diagram',
    promptModifiers: [
      'minimalist diagram',
      'simple geometric shapes',
      'boxes and arrows',
      'clean lines',
      'no text labels',
      'no annotations',
      'abstract flow visualization',
    ],
    avoidTerms: [
      'text', 'labels', 'annotations', 'words', 'letters', 'numbers',
      'descriptions', 'captions', 'explanatory text', 'legend',
    ],
  },

  relationship: {
    style: 'relationship',
    tier: 'minimal-diagram',
    promptModifiers: [
      'minimalist diagram',
      'simple circles and lines',
      'node connection visualization',
      'clean network graph',
      'no text labels',
      'no annotations',
      'abstract relationship visualization',
    ],
    avoidTerms: [
      'text', 'labels', 'annotations', 'words', 'letters', 'numbers',
      'descriptions', 'captions', 'explanatory text', 'legend', 'names',
    ],
  },

  hierarchy: {
    style: 'hierarchy',
    tier: 'minimal-diagram',
    promptModifiers: [
      'minimalist diagram',
      'simple tree structure',
      'organizational boxes',
      'clean hierarchical layout',
      'no text labels',
      'no annotations',
      'abstract hierarchy visualization',
    ],
    avoidTerms: [
      'text', 'labels', 'annotations', 'words', 'letters', 'numbers',
      'descriptions', 'captions', 'explanatory text', 'legend', 'names', 'titles',
    ],
  },

  comparison: {
    style: 'comparison',
    tier: 'minimal-diagram',
    promptModifiers: [
      'minimalist diagram',
      'side by side layout',
      'simple geometric comparison',
      'clean visual contrast',
      'no text labels',
      'no annotations',
      'abstract comparison visualization',
    ],
    avoidTerms: [
      'text', 'labels', 'annotations', 'words', 'letters', 'numbers',
      'descriptions', 'captions', 'explanatory text', 'legend', 'versus text',
    ],
  },

  // Legacy types (mapped to new types)
  illustration: {
    style: 'illustration',
    tier: 'photographic',
    promptModifiers: [
      'professional photography',
      'conceptual visualization',
      'no text or words visible',
      'no signs or labels',
      'no watermarks',
    ],
    avoidTerms: [
      'text', 'words', 'letters', 'labels', 'signs', 'typography',
      'captions', 'annotations', 'watermark', 'logo',
    ],
  },

  diagram: {
    style: 'diagram',
    tier: 'minimal-diagram',
    promptModifiers: [
      'minimalist diagram',
      'simple geometric shapes',
      'clean lines',
      'no text labels',
      'no annotations',
    ],
    avoidTerms: [
      'text', 'labels', 'annotations', 'words', 'letters', 'numbers',
      'descriptions', 'captions', 'explanatory text',
    ],
  },

  infographic: {
    style: 'infographic',
    tier: 'photographic', // Mapped to photographic to avoid text-heavy results
    promptModifiers: [
      'professional photography',
      'abstract data visualization',
      'conceptual',
      'no text or words visible',
      'no charts with labels',
      'no watermarks',
    ],
    avoidTerms: [
      'text', 'words', 'letters', 'labels', 'numbers', 'statistics text',
      'typography', 'captions', 'annotations', 'watermark', 'data labels',
    ],
  },
};

// ============================================================================
// ROUTING FUNCTIONS
// ============================================================================

/**
 * Routes content text to the most appropriate image type based on pattern matching.
 *
 * @param content - The text content to analyze
 * @returns The matched route with image type and tier, or the default route
 *
 * @example
 * ```ts
 * const route = routeContentToImageType("Stap 1: Analyseer de data");
 * // Returns: { imageType: 'flowchart', tier: 'minimal-diagram', ... }
 *
 * const route2 = routeContentToImageType("Ons kantoor in Amsterdam");
 * // Returns: { imageType: 'scene', tier: 'photographic', ... }
 * ```
 */
export function routeContentToImageType(content: string): ContentPatternRoute {
  // Iterate through patterns (already sorted by priority)
  for (const route of CONTENT_PATTERN_ROUTES) {
    if (route.pattern.test(content)) {
      return route;
    }
  }

  return DEFAULT_IMAGE_ROUTE;
}

/**
 * Gets the prompt modifiers for a specific image type.
 *
 * @param imageType - The image style to get modifiers for
 * @returns Array of prompt modifier strings
 */
export function getPromptModifiers(imageType: ImageStyle): readonly string[] {
  return IMAGE_TYPE_PROMPTS[imageType]?.promptModifiers ?? IMAGE_TYPE_PROMPTS.scene.promptModifiers;
}

/**
 * Gets the terms to avoid for a specific image type.
 *
 * @param imageType - The image style to get avoid terms for
 * @returns Array of terms that should be avoided in prompts
 */
export function getAvoidTerms(imageType: ImageStyle): readonly string[] {
  return IMAGE_TYPE_PROMPTS[imageType]?.avoidTerms ?? IMAGE_TYPE_PROMPTS.scene.avoidTerms;
}

/**
 * Builds a "no text" instruction string for inclusion in image prompts.
 * The instruction varies based on whether the image type is photographic or diagram.
 *
 * @param imageType - The image style to build instruction for
 * @returns A formatted instruction string to prevent text in generated images
 *
 * @example
 * ```ts
 * buildNoTextInstruction('scene');
 * // Returns: "CRITICAL: The image must contain absolutely no text, words, letters,
 * // signs, labels, or watermarks. Any readable text will make the image unusable."
 *
 * buildNoTextInstruction('flowchart');
 * // Returns: "CRITICAL: The diagram must use only geometric shapes and lines with
 * // no text labels, annotations, numbers, or any written characters inside or
 * // around the shapes."
 * ```
 */
export function buildNoTextInstruction(imageType: ImageStyle): string {
  const mapping = IMAGE_TYPE_PROMPTS[imageType] ?? IMAGE_TYPE_PROMPTS.scene;

  if (mapping.tier === 'photographic') {
    return 'CRITICAL: The image must contain absolutely no text, words, letters, signs, labels, or watermarks. Any readable text will make the image unusable.';
  }

  if (mapping.tier === 'minimal-diagram') {
    return 'CRITICAL: The diagram must use only geometric shapes and lines with no text labels, annotations, numbers, or any written characters inside or around the shapes.';
  }

  // Fallback for captioned tier (future use)
  return 'IMPORTANT: Minimize text in the image. Only essential labels should be included.';
}

/**
 * Gets the full ImageTypeMapping for a specific image style.
 *
 * @param imageType - The image style to get mapping for
 * @returns The complete ImageTypeMapping configuration
 */
export function getImageTypeMapping(imageType: ImageStyle): ImageTypeMapping {
  return IMAGE_TYPE_PROMPTS[imageType] ?? IMAGE_TYPE_PROMPTS.scene;
}

/**
 * Checks if an image type belongs to the photographic tier.
 *
 * @param imageType - The image style to check
 * @returns True if the image type is photographic
 */
export function isPhotographicType(imageType: ImageStyle): boolean {
  return (IMAGE_TYPE_PROMPTS[imageType]?.tier ?? 'photographic') === 'photographic';
}

/**
 * Checks if an image type belongs to the minimal-diagram tier.
 *
 * @param imageType - The image style to check
 * @returns True if the image type is a minimal diagram
 */
export function isDiagramType(imageType: ImageStyle): boolean {
  return IMAGE_TYPE_PROMPTS[imageType]?.tier === 'minimal-diagram';
}

/**
 * Maps legacy image types to their modern equivalents.
 *
 * @param imageType - The image style (may be legacy)
 * @returns The modern equivalent image style
 */
export function normalizeImageType(imageType: ImageStyle): ImageStyle {
  switch (imageType) {
    case 'photograph':
      return 'scene';
    case 'illustration':
      return 'concept';
    case 'diagram':
      return 'flowchart';
    case 'infographic':
      return 'concept';
    default:
      return imageType;
  }
}
