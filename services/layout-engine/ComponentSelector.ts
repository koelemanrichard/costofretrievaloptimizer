/**
 * ComponentSelector
 *
 * Selects visual components based on a two-factor selection system:
 * 1. Content type (from SectionAnalysis)
 * 2. Brand personality (from DesignDNA)
 *
 * Selection priority:
 * 1. FS-protected sections -> Always use compliant components
 * 2. High-value sections (UNIQUE/RARE) -> May get enhanced components
 * 3. Content patterns -> lead-paragraph, alert-box, info-box, faq-accordion,
 *    feature-grid, step-list detection
 * 4. Standard selection -> Content type x brand personality matrix
 */

import { DesignDNA } from '../../types/designDna';
import type { ContentPatternOptions } from './types';
import {
  ComponentSelection,
  ComponentType,
  ContentType,
  IComponentSelector,
  SectionAnalysis,
} from './types';
import {
  COMPONENT_MAPPINGS,
  getComponentMapping,
  getFSCompliantComponent,
  getHighValueComponent,
  getVariantForPersonality,
  PersonalityType,
} from './componentMappings';

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_PERSONALITY: PersonalityType = 'corporate';

const FS_CONFIDENCE = 0.95;
const HIGH_VALUE_BASE_CONFIDENCE = 0.85;
const CONTENT_PATTERN_ALERT_CONFIDENCE = 0.7;
const CONTENT_PATTERN_INFO_CONFIDENCE = 0.6;
const CONTENT_PATTERN_LEAD_CONFIDENCE = 0.8;
const CONTENT_PATTERN_FEATURE_GRID_CONFIDENCE = 0.75;
const CONTENT_PATTERN_SEQUENTIAL_CONFIDENCE = 0.7;
const CONTENT_PATTERN_QA_CONFIDENCE = 0.7;
const STANDARD_CONFIDENCE = 0.75;
const FALLBACK_CONFIDENCE = 0.6;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Infer brand personality from formality, energy, and warmth scores.
 * Uses a decision tree approach to map numeric values to personality types.
 */
function inferPersonalityFromScores(
  formality: number,
  energy: number,
  warmth: number
): PersonalityType {
  // High formality + low energy = corporate
  if (formality >= 4 && energy <= 2) {
    return 'corporate';
  }

  // Low formality + high energy = creative or playful
  if (formality <= 2 && energy >= 4) {
    // Only playful if warmth is very high (5)
    return warmth >= 5 ? 'playful' : 'creative';
  }

  // Low formality + low energy = minimal
  if (formality <= 2 && energy <= 2) {
    return 'minimal';
  }

  // High formality + high warmth = elegant
  if (formality >= 4 && warmth >= 4) {
    return 'elegant';
  }

  // High energy + high warmth = friendly
  if (energy >= 4 && warmth >= 4) {
    return 'friendly';
  }

  // High energy + low warmth = bold
  if (energy >= 4 && warmth <= 2) {
    return 'bold';
  }

  // High formality + moderate everything = luxurious
  if (formality >= 4 && energy >= 3 && warmth >= 3) {
    return 'luxurious';
  }

  // Default fallback
  return 'corporate';
}

/**
 * Determine the effective brand personality from DesignDNA.
 * Uses explicit overall personality if available, otherwise infers from scores.
 */
function determinePersonality(dna?: DesignDNA): PersonalityType {
  if (!dna?.personality) {
    return DEFAULT_PERSONALITY;
  }

  // Use explicit overall personality if available
  if (dna.personality.overall) {
    // Map DNA personality to our PersonalityType (they should match)
    return dna.personality.overall as PersonalityType;
  }

  // Infer from formality/energy/warmth scores
  const { formality, energy, warmth } = dna.personality;
  return inferPersonalityFromScores(formality, energy, warmth);
}

/**
 * Check if section requires FS-compliant component selection.
 */
function requiresFSCompliance(analysis: SectionAnalysis): boolean {
  return analysis.formatCode === 'FS' || analysis.constraints.fsTarget === true;
}

/**
 * Check if section qualifies for high-value enhancement.
 */
function qualifiesForHighValue(analysis: SectionAnalysis): boolean {
  const category = analysis.attributeCategory;
  return category === 'UNIQUE' || category === 'RARE';
}

// =============================================================================
// CONTENT PATTERN DETECTION
// =============================================================================

/**
 * Bold prefix patterns that indicate warning/alert content.
 * Matches <strong>Keyword:</strong> at or near the start of content.
 */
const ALERT_BOLD_PREFIXES = [
  /warning\s*:/i,
  /waarschuwing\s*:/i,
  /belangrijk\s*:/i,
  /let\s+op\s*:/i,
  /risico\s*:/i,
  /caution\s*:/i,
  /danger\s*:/i,
  /important\s*:/i,
  /critical\s*:/i,
  /opgelet\s*:/i,
];

/**
 * Keywords that indicate alert/warning content when present in the body text.
 * Requires at least 2 matches for keyword-only detection (no bold prefix).
 */
const ALERT_KEYWORDS = [
  /\brisk\b/i,
  /\brisico\b/i,
  /\bdanger\b/i,
  /\bgevaar\b/i,
  /\bimportant\b/i,
  /\bbelangrijk\b/i,
  /\bcaution\b/i,
  /\bwarning\b/i,
  /\bwaarschuwing\b/i,
  /\bkwetsbaar\b/i,
  /\bvulnerable\b/i,
  /\bcritical\b/i,
  /\bkritiek\b/i,
  /\bkritisch\b/i,
];

/**
 * Bold prefix patterns that indicate tip/info content.
 */
const INFO_BOLD_PREFIXES = [
  /tip\s*:/i,
  /info\s*:/i,
  /opmerking\s*:/i,
  /goed\s+om\s+te\s+weten\s*:/i,
  /note\s*:/i,
  /hint\s*:/i,
  /fyi\s*:/i,
  /wist\s+je\s+dat\s*[?:]/i,
  /did\s+you\s+know\s*[?:]/i,
];

/**
 * Keywords that indicate info/tip content (lower priority than bold prefix).
 */
const INFO_KEYWORDS = [
  /\btip\b/i,
  /\bnote\b/i,
  /\bhint\b/i,
  /\bgood\s+to\s+know\b/i,
  /\bgoed\s+om\s+te\s+weten\b/i,
  /\bopmerking\b/i,
];

/**
 * Strip HTML tags for plain-text analysis.
 */
function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Detect if content matches alert/warning patterns.
 * Returns true if the content has a bold warning prefix or multiple warning keywords.
 */
function detectAlertPattern(content: string): boolean {
  // Check for bold prefix patterns: <strong>Warning:</strong> etc.
  const boldPrefixPattern = /<strong>([^<]+)<\/strong>/gi;
  let match;
  while ((match = boldPrefixPattern.exec(content)) !== null) {
    const boldText = match[1];
    if (ALERT_BOLD_PREFIXES.some((p) => p.test(boldText))) {
      return true;
    }
  }

  // Check for keyword-based detection (require 2+ keyword matches)
  const plainText = stripHtmlTags(content);
  let keywordMatches = 0;
  for (const kw of ALERT_KEYWORDS) {
    if (kw.test(plainText)) {
      keywordMatches++;
    }
    if (keywordMatches >= 2) {
      return true;
    }
  }

  return false;
}

/**
 * Detect if content matches info/tip patterns.
 * Returns true if the content has a bold info prefix or multiple info keywords.
 */
function detectInfoPattern(content: string): boolean {
  // Check for bold prefix patterns: <strong>Tip:</strong> etc.
  const boldPrefixPattern = /<strong>([^<]+)<\/strong>/gi;
  let match;
  while ((match = boldPrefixPattern.exec(content)) !== null) {
    const boldText = match[1];
    if (INFO_BOLD_PREFIXES.some((p) => p.test(boldText))) {
      return true;
    }
  }

  // Check for keyword-based detection (require 2+ keyword matches)
  const plainText = stripHtmlTags(content);
  let keywordMatches = 0;
  for (const kw of INFO_KEYWORDS) {
    if (kw.test(plainText)) {
      keywordMatches++;
    }
    if (keywordMatches >= 2) {
      return true;
    }
  }

  return false;
}

/**
 * Detect if content should be a lead paragraph.
 * Requires: introduction content type AND first section of the article.
 */
function detectLeadParagraphPattern(
  analysis: SectionAnalysis,
  isFirstSection: boolean
): boolean {
  return analysis.contentType === 'introduction' && isFirstSection;
}

// =============================================================================
// FEATURE LIST PATTERN DETECTION
// =============================================================================

/**
 * Keywords that indicate a feature or benefit item.
 */
const FEATURE_BENEFIT_KEYWORDS = [
  /\bbenefit\b/i,
  /\bvoordeel\b/i,
  /\bvoordelen\b/i,
  /\bfeature\b/i,
  /\bfunctie\b/i,
  /\bfunctionaliteit\b/i,
  /\badvantage\b/i,
  /\bimprove\b/i,
  /\bverbeter\b/i,
  /\benhance\b/i,
  /\boptimize\b/i,
  /\boptimaliseer\b/i,
  /\bsneller\b/i,
  /\bfaster\b/i,
  /\bbetter\b/i,
  /\bbeter\b/i,
  /\bautomat\w*/i,
  /\beffici[eë]nt\b/i,
  /\bsupport\b/i,
  /\bondersteuning\b/i,
  /\bbeveiliging\b/i,
  /\bsecurity\b/i,
  /\bprotect\b/i,
  /\bbescherming\b/i,
  /\bincluded\b/i,
  /\binbegrepen\b/i,
  /\bunlimited\b/i,
  /\bonbeperkt\b/i,
];

/**
 * Detect if content is a short list of features/benefits.
 * Returns true if:
 * - Content contains 3-5 list items (ul/ol > li)
 * - Items are short (< 100 chars each)
 * - Items contain feature/benefit keywords
 */
function detectFeatureListPattern(content: string): boolean {
  // Extract list items
  const listItemPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  const items: string[] = [];
  let match;
  while ((match = listItemPattern.exec(content)) !== null) {
    items.push(stripHtmlTags(match[1]));
  }

  // Need 3-5 items for a feature grid
  if (items.length < 3 || items.length > 5) {
    return false;
  }

  // All items must be short (< 100 chars)
  const allShort = items.every((item) => item.length < 100);
  if (!allShort) {
    return false;
  }

  // Check if items contain feature/benefit language
  const plainText = items.join(' ');
  let keywordMatches = 0;
  for (const kw of FEATURE_BENEFIT_KEYWORDS) {
    if (kw.test(plainText)) {
      keywordMatches++;
    }
  }

  // At least 1 keyword match across all items
  return keywordMatches >= 1;
}

// =============================================================================
// SEQUENTIAL CONTENT PATTERN DETECTION
// =============================================================================

/**
 * Sequential keywords (Dutch and English) that indicate step-by-step content.
 */
const SEQUENTIAL_KEYWORDS = [
  /\beerst(?:e)?\b/i,
  /\bvervolgens\b/i,
  /\bdaarna\b/i,
  /\btot\s+slot\b/i,
  /\bten\s+slotte\b/i,
  /\bfirst\b/i,
  /\bthen\b/i,
  /\bnext\b/i,
  /\bfinally\b/i,
  /\bafterwards?\b/i,
  /\bsubsequently\b/i,
  /\blastly\b/i,
  /\bstep\s+\d/i,
  /\bstap\s+\d/i,
];

/**
 * Detect if content follows a sequential pattern (step-by-step).
 * Returns true if:
 * - Content contains 2+ sequential keywords, OR
 * - Content contains an ordered list (<ol>)
 */
function detectSequentialPattern(content: string): boolean {
  // Check for ordered list
  if (/<ol[\s>]/i.test(content)) {
    // Verify it has at least 2 items
    const olItems = content.match(/<li[^>]*>/gi);
    if (olItems && olItems.length >= 2) {
      return true;
    }
  }

  // Check for sequential keywords in plain text
  const plainText = stripHtmlTags(content);
  let keywordMatches = 0;
  for (const kw of SEQUENTIAL_KEYWORDS) {
    if (kw.test(plainText)) {
      keywordMatches++;
    }
    if (keywordMatches >= 2) {
      return true;
    }
  }

  return false;
}

// =============================================================================
// Q&A PATTERN DETECTION
// =============================================================================

/**
 * Detect if content follows a Q&A (question-answer) format.
 * Returns true if:
 * - Content has 2+ bold questions (bold text ending with ?), OR
 * - Content has 2+ paragraphs that end with a question mark followed by a non-question paragraph
 */
function detectQAPattern(content: string): boolean {
  // Check for bold questions: <strong>...?</strong>
  const boldQuestionPattern = /<strong>[^<]*\?[^<]*<\/strong>/gi;
  const boldQuestions = content.match(boldQuestionPattern);
  if (boldQuestions && boldQuestions.length >= 2) {
    return true;
  }

  // Check for question-answer pairs in paragraphs
  // Extract paragraph texts
  const paragraphPattern = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  const paragraphs: string[] = [];
  let pMatch;
  while ((pMatch = paragraphPattern.exec(content)) !== null) {
    paragraphs.push(stripHtmlTags(pMatch[1]).trim());
  }

  // Count paragraphs that end with ? (questions)
  let questionCount = 0;
  for (const para of paragraphs) {
    if (para.endsWith('?')) {
      questionCount++;
    }
  }

  // Need at least 2 question paragraphs, and they shouldn't be all questions
  // (there should be some answer paragraphs too)
  return questionCount >= 2 && questionCount < paragraphs.length;
}

/**
 * Try content-based pattern detection.
 * Returns a ComponentSelection if a pattern matches, or null for standard selection.
 */
function tryContentPatternDetection(
  analysis: SectionAnalysis,
  options?: ContentPatternOptions
): ComponentSelection | null {
  if (!options) return null;

  const { content, isFirstSection } = options;

  // Lead paragraph detection (does not need content string, uses analysis + position)
  if (isFirstSection && detectLeadParagraphPattern(analysis, true)) {
    return {
      primaryComponent: 'lead-paragraph',
      alternativeComponents: ['prose', 'hero'],
      componentVariant: 'default',
      confidence: CONTENT_PATTERN_LEAD_CONFIDENCE,
      reasoning: `Lead paragraph selected for introductory first section "${analysis.heading}". Premium visual treatment for article opening.`,
    };
  }

  // Content-based detection requires the content string
  if (!content) return null;

  // Alert/warning pattern detection (higher priority than info)
  if (detectAlertPattern(content)) {
    return {
      primaryComponent: 'alert-box',
      alternativeComponents: ['info-box', 'card'],
      componentVariant: 'warning',
      confidence: CONTENT_PATTERN_ALERT_CONFIDENCE,
      reasoning: `Alert box selected: content contains warning/risk indicators. Ensures critical information stands out visually.`,
    };
  }

  // Info/tip pattern detection
  if (detectInfoPattern(content)) {
    return {
      primaryComponent: 'info-box',
      alternativeComponents: ['card', 'prose'],
      componentVariant: 'tip',
      confidence: CONTENT_PATTERN_INFO_CONFIDENCE,
      reasoning: `Info box selected: content contains tip/note indicators. Highlights helpful supplementary information.`,
    };
  }

  // Q&A / FAQ pattern detection (check before sequential to prioritize Q&A format)
  if (detectQAPattern(content)) {
    return {
      primaryComponent: 'faq-accordion',
      alternativeComponents: ['accordion', 'card'],
      componentVariant: 'default',
      confidence: CONTENT_PATTERN_QA_CONFIDENCE,
      reasoning: `FAQ accordion selected: content follows question-answer format. Structured Q&A improves scanability and may target PAA snippets.`,
    };
  }

  // Feature list pattern detection (short benefit/feature lists -> feature-grid)
  if (detectFeatureListPattern(content)) {
    return {
      primaryComponent: 'feature-grid',
      alternativeComponents: ['checklist', 'card'],
      componentVariant: 'default',
      confidence: CONTENT_PATTERN_FEATURE_GRID_CONFIDENCE,
      reasoning: `Feature grid selected: content contains a short list of features/benefits. Visual grid is more impactful than a plain checklist.`,
    };
  }

  // Sequential content pattern detection (step-by-step -> step-list/timeline)
  if (detectSequentialPattern(content)) {
    return {
      primaryComponent: 'step-list',
      alternativeComponents: ['timeline', 'checklist'],
      componentVariant: 'default',
      confidence: CONTENT_PATTERN_SEQUENTIAL_CONFIDENCE,
      reasoning: `Step list selected: content follows a sequential pattern with ordered steps or sequence keywords. Visual step indicators improve comprehension.`,
    };
  }

  return null;
}

/**
 * Generate reasoning string for the component selection.
 */
function generateReasoning(
  analysis: SectionAnalysis,
  personality: PersonalityType,
  selectionPath: 'fs' | 'high-value' | 'matrix'
): string {
  const { contentType, attributeCategory, formatCode } = analysis;

  switch (selectionPath) {
    case 'fs':
      return `FS-compliant selection for ${contentType} content. Format code: ${formatCode}. HTML structure preserved for Featured Snippet eligibility.`;

    case 'high-value':
      return `Enhanced ${contentType} component for ${attributeCategory} attribute category. High-value content receives premium visual treatment to emphasize differentiated information.`;

    case 'matrix':
      return `Standard ${contentType} content mapped to ${personality} brand personality variant. Two-factor selection from content-type x personality matrix.`;
  }
}

// =============================================================================
// COMPONENT SELECTOR CLASS
// =============================================================================

export class ComponentSelector implements IComponentSelector {
  /**
   * Select a component for a section based on content type and brand personality.
   * Follows priority: FS-protected > High-value > Content patterns > Matrix selection
   *
   * @param analysis - Section analysis data
   * @param dna - Optional brand design DNA
   * @param options - Optional content pattern detection options (content string, isFirstSection)
   */
  static selectComponent(
    analysis: SectionAnalysis,
    dna?: DesignDNA,
    options?: ContentPatternOptions
  ): ComponentSelection {
    const personality = determinePersonality(dna);

    // Priority 1: FS-protected sections
    if (requiresFSCompliance(analysis)) {
      return ComponentSelector.selectFSCompliantComponent(analysis);
    }

    // Priority 2: High-value sections (UNIQUE/RARE)
    if (qualifiesForHighValue(analysis)) {
      return ComponentSelector.selectHighValueComponent(analysis, personality);
    }

    // Priority 3: Content-based pattern detection
    // (lead-paragraph, alert-box, info-box, faq-accordion, feature-grid, step-list)
    const contentPatternResult = tryContentPatternDetection(analysis, options);
    if (contentPatternResult) {
      return contentPatternResult;
    }

    // Priority 4: Standard matrix selection
    return ComponentSelector.selectFromMatrix(analysis, personality);
  }

  /**
   * Select components for all sections.
   * @param analyses - All section analyses
   * @param dna - Optional brand design DNA
   * @param contentOptions - Optional array of content pattern options (one per section)
   */
  static selectAllComponents(
    analyses: SectionAnalysis[],
    dna?: DesignDNA,
    contentOptions?: ContentPatternOptions[]
  ): ComponentSelection[] {
    return analyses.map((analysis, index) =>
      ComponentSelector.selectComponent(
        analysis,
        dna,
        contentOptions?.[index]
      )
    );
  }

  /**
   * Select an FS-compliant component that preserves HTML structure.
   */
  private static selectFSCompliantComponent(analysis: SectionAnalysis): ComponentSelection {
    const fsComponent = getFSCompliantComponent(analysis.contentType);
    const mapping = getComponentMapping(analysis.contentType);

    return {
      primaryComponent: fsComponent.component,
      alternativeComponents: mapping.alternatives,
      componentVariant: fsComponent.variant,
      confidence: FS_CONFIDENCE,
      reasoning: generateReasoning(analysis, DEFAULT_PERSONALITY, 'fs'),
    };
  }

  /**
   * Select an enhanced component for high-value (UNIQUE/RARE) content.
   */
  private static selectHighValueComponent(
    analysis: SectionAnalysis,
    personality: PersonalityType
  ): ComponentSelection {
    const highValueConfig = getHighValueComponent(analysis.contentType);
    const mapping = getComponentMapping(analysis.contentType);

    // Use high-value variant if available, otherwise use matrix variant with enhanced reasoning
    const variant = highValueConfig?.variant || getVariantForPersonality(mapping, personality);
    const confidenceBoost = highValueConfig?.confidenceBoost || 0.1;

    return {
      primaryComponent: highValueConfig?.component || mapping.componentType,
      alternativeComponents: mapping.alternatives,
      componentVariant: variant,
      confidence: HIGH_VALUE_BASE_CONFIDENCE + confidenceBoost,
      reasoning: generateReasoning(analysis, personality, 'high-value'),
    };
  }

  /**
   * Select from the content type x brand personality matrix.
   */
  private static selectFromMatrix(
    analysis: SectionAnalysis,
    personality: PersonalityType
  ): ComponentSelection {
    const mapping = getComponentMapping(analysis.contentType);

    if (!mapping) {
      // Fallback for unknown content types
      return {
        primaryComponent: 'prose' as ComponentType,
        alternativeComponents: ['card' as ComponentType],
        componentVariant: 'default',
        confidence: FALLBACK_CONFIDENCE,
        reasoning: `Fallback selection for unknown content type: ${analysis.contentType}`,
      };
    }

    const variant = getVariantForPersonality(mapping, personality);

    return {
      primaryComponent: mapping.componentType,
      alternativeComponents: mapping.alternatives,
      componentVariant: variant,
      confidence: STANDARD_CONFIDENCE,
      reasoning: generateReasoning(analysis, personality, 'matrix'),
    };
  }

  // =============================================================================
  // INSTANCE METHODS (delegate to static methods)
  // =============================================================================

  selectComponent(
    analysis: SectionAnalysis,
    dna?: DesignDNA,
    options?: ContentPatternOptions
  ): ComponentSelection {
    return ComponentSelector.selectComponent(analysis, dna, options);
  }

  selectAllComponents(
    analyses: SectionAnalysis[],
    dna?: DesignDNA,
    contentOptions?: ContentPatternOptions[]
  ): ComponentSelection[] {
    return ComponentSelector.selectAllComponents(analyses, dna, contentOptions);
  }
}

export type { ContentPatternOptions };
export default ComponentSelector;
