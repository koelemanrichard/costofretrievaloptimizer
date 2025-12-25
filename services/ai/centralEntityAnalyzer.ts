/**
 * Central Entity Analyzer Service
 *
 * Analyzes content for Central Entity consistency - a key Semantic SEO metric.
 * The Central Entity should be:
 * - Defined and consistently appear throughout the page
 * - Present in H1, Title, and Introduction
 * - Referenced in H2/H3 headings proportionally
 * - Distributed evenly across content thirds
 *
 * Research Source: knowledge graph deep dive.md, Topical map_columns.md
 *
 * Quote: "The Central Entity must be defined and consistently appear site-wide,
 * forming the basis for site-wide N-grams."
 *
 * Quote: "De H1 is 'Voordelen van Water,' de introductie definieert water,
 * en elke H2/H3 daaronder gebruikt het woord 'water' in zijn context."
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Parsed content structure from HTML/Markdown
 */
export interface ParsedContent {
  title: string;
  h1: string;
  h2s: string[];
  h3s: string[];
  paragraphs: string[];
  introduction: string;  // First ~200 words
  fullText: string;
  schema?: {
    about?: {
      name?: string;
      '@type'?: string;
    };
  };
}

/**
 * Detection source for central entity
 */
export type EntityDetectionSource = 'h1' | 'title' | 'schema' | 'frequency';

/**
 * Detected central entity with confidence
 */
export interface DetectedEntity {
  name: string;
  confidence: number;  // 0-1
  sources: EntityDetectionSource[];
  variants: string[];  // Synonyms and partial matches
}

/**
 * Heading presence analysis
 */
export interface HeadingPresence {
  h2Count: number;
  h2WithEntity: number;
  h3Count: number;
  h3WithEntity: number;
  ratio: number;  // % of headings containing entity
}

/**
 * Body presence analysis
 */
export interface BodyPresence {
  totalParagraphs: number;
  paragraphsWithEntity: number;
  ratio: number;

  presentInFirstThird: boolean;
  presentInMiddleThird: boolean;
  presentInLastThird: boolean;
  distributionScore: number;  // 0-100
}

/**
 * N-gram analysis for entity mentions
 */
export interface EntityNGrams {
  exactMatch: number;     // Exact entity name
  partialMatch: number;   // Entity + modifier
  synonymMatch: number;   // Known synonyms
}

/**
 * Contextual drift point
 */
export interface DriftPoint {
  position: number;        // Paragraph number
  driftedTo: string;       // What entity/topic it drifted to
  severity: 'minor' | 'major';
  context: string;         // Snippet of text
}

/**
 * Contextual vector analysis
 */
export interface ContextualVector {
  isConsistent: boolean;
  driftPoints: DriftPoint[];
  vectorScore: number;  // 0-100
}

/**
 * Consistency check results
 */
export interface ConsistencyResult {
  inH1: boolean;
  inTitle: boolean;
  inIntroduction: boolean;
  inSchema: boolean;
  headingPresence: HeadingPresence;
  bodyPresence: BodyPresence;
  entityNGrams: EntityNGrams;
}

/**
 * Issue found during analysis
 */
export interface ConsistencyIssue {
  issue: 'missing_in_h1' | 'missing_in_intro' | 'low_heading_presence' |
         'uneven_distribution' | 'contextual_drift' | 'missing_in_title' | 'missing_in_schema';
  severity: 'critical' | 'warning' | 'info';
  description: string;
  location: string;
}

/**
 * Complete central entity analysis result
 */
export interface CentralEntityAnalysis {
  detectedEntity: DetectedEntity;
  consistency: ConsistencyResult;
  contextualVector: ContextualVector;
  consistencyScore: number;  // 0-100
  issues: ConsistencyIssue[];
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Normalize text for comparison
 */
function normalizeText(text: string): string {
  return text.toLowerCase().trim();
}

/**
 * Check if text contains entity (or its variants)
 */
function containsEntity(text: string, entityVariants: string[]): boolean {
  const normalizedText = normalizeText(text);
  return entityVariants.some(variant =>
    normalizedText.includes(normalizeText(variant))
  );
}

/**
 * Count entity occurrences in text
 */
function countEntityOccurrences(text: string, entityVariants: string[]): {
  exact: number;
  partial: number;
  synonym: number;
} {
  const normalizedText = normalizeText(text);
  const primaryEntity = entityVariants[0];
  const synonyms = entityVariants.slice(1);

  // Count exact matches
  const exactRegex = new RegExp(`\\b${escapeRegex(normalizeText(primaryEntity))}\\b`, 'gi');
  const exactMatches = (normalizedText.match(exactRegex) || []).length;

  // Count partial matches (entity + modifier)
  const partialRegex = new RegExp(`\\b${escapeRegex(normalizeText(primaryEntity))}\\s+\\w+|\\w+\\s+${escapeRegex(normalizeText(primaryEntity))}\\b`, 'gi');
  const partialMatches = (normalizedText.match(partialRegex) || []).length;

  // Count synonym matches
  let synonymMatches = 0;
  for (const synonym of synonyms) {
    const synRegex = new RegExp(`\\b${escapeRegex(normalizeText(synonym))}\\b`, 'gi');
    synonymMatches += (normalizedText.match(synRegex) || []).length;
  }

  return {
    exact: exactMatches,
    partial: partialMatches - exactMatches, // Partial includes exact, so subtract
    synonym: synonymMatches,
  };
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Split paragraphs into thirds
 */
function splitIntoThirds<T>(items: T[]): [T[], T[], T[]] {
  const len = items.length;
  const third = Math.ceil(len / 3);

  return [
    items.slice(0, third),
    items.slice(third, third * 2),
    items.slice(third * 2),
  ];
}

/**
 * Extract most frequent meaningful words from text
 */
function extractFrequentTerms(text: string, minLength = 4, topN = 10): string[] {
  const words = text.toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= minLength);

  const counts = new Map<string, number>();
  for (const word of words) {
    counts.set(word, (counts.get(word) || 0) + 1);
  }

  // Filter out common stop words
  const stopWords = new Set([
    'that', 'this', 'with', 'have', 'from', 'they', 'what', 'when', 'where',
    'which', 'will', 'would', 'could', 'should', 'their', 'there', 'been',
    'being', 'about', 'these', 'those', 'other', 'some', 'such', 'than',
    'then', 'into', 'over', 'also', 'just', 'your', 'more', 'very',
  ]);

  return Array.from(counts.entries())
    .filter(([word]) => !stopWords.has(word))
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word]) => word);
}

/**
 * Generate synonyms/variants for an entity
 * In production, this could use a thesaurus API or AI
 */
function generateSynonyms(entity: string): string[] {
  const synonyms: string[] = [];
  const normalized = entity.toLowerCase();

  // Plural/singular variants
  if (normalized.endsWith('s')) {
    synonyms.push(normalized.slice(0, -1));
  } else {
    synonyms.push(normalized + 's');
  }

  // Common variations
  if (normalized.includes(' ')) {
    synonyms.push(normalized.replace(/\s+/g, '-'));
    synonyms.push(normalized.replace(/\s+/g, ''));
  }

  return synonyms;
}

// =============================================================================
// Core Analysis Functions
// =============================================================================

/**
 * Detect the central entity from content signals
 */
export function detectCentralEntity(content: ParsedContent): DetectedEntity {
  const sources: EntityDetectionSource[] = [];
  let primaryCandidate = '';
  let confidence = 0;

  // Priority 1: Schema about property
  if (content.schema?.about?.name) {
    primaryCandidate = content.schema.about.name;
    sources.push('schema');
    confidence = 0.95;
  }

  // Priority 2: H1 (most reliable semantic signal)
  if (!primaryCandidate && content.h1) {
    // Extract main noun phrase from H1
    primaryCandidate = extractMainNoun(content.h1);
    sources.push('h1');
    confidence = 0.85;
  }

  // Priority 3: Title tag
  if (!primaryCandidate && content.title) {
    primaryCandidate = extractMainNoun(content.title);
    sources.push('title');
    confidence = 0.75;
  }

  // Priority 4: Frequency analysis
  if (!primaryCandidate) {
    const frequentTerms = extractFrequentTerms(content.fullText);
    if (frequentTerms.length > 0) {
      primaryCandidate = frequentTerms[0];
      sources.push('frequency');
      confidence = 0.6;
    }
  }

  // Generate variants
  const variants = [
    primaryCandidate,
    ...generateSynonyms(primaryCandidate),
  ];

  return {
    name: primaryCandidate || 'Unknown',
    confidence,
    sources,
    variants,
  };
}

/**
 * Extract main noun/phrase from a heading
 * Simple heuristic - in production could use NLP
 */
function extractMainNoun(heading: string): string {
  // Remove common prefixes
  const prefixes = [
    /^what is\s+/i,
    /^how to\s+/i,
    /^guide to\s+/i,
    /^best\s+/i,
    /^top\s+\d+\s+/i,
    /^the\s+/i,
    /^a\s+/i,
    /^an\s+/i,
  ];

  let result = heading;
  for (const prefix of prefixes) {
    result = result.replace(prefix, '');
  }

  // Remove trailing modifiers
  const suffixes = [
    /\s+guide$/i,
    /\s+tutorial$/i,
    /\s+explained$/i,
    /\s+overview$/i,
    /\s+basics$/i,
    /\s+in\s+\d+$/i,
  ];

  for (const suffix of suffixes) {
    result = result.replace(suffix, '');
  }

  return result.trim();
}

/**
 * Analyze consistency of central entity across content
 */
export function analyzeConsistency(
  content: ParsedContent,
  entity: DetectedEntity
): ConsistencyResult {
  const variants = entity.variants;

  // Check key positions
  const inH1 = containsEntity(content.h1, variants);
  const inTitle = containsEntity(content.title, variants);
  const inIntroduction = containsEntity(content.introduction, variants);
  const inSchema = content.schema?.about?.name?.toLowerCase() === entity.name.toLowerCase();

  // Analyze heading presence
  const h2WithEntity = content.h2s.filter(h => containsEntity(h, variants)).length;
  const h3WithEntity = content.h3s.filter(h => containsEntity(h, variants)).length;
  const totalHeadings = content.h2s.length + content.h3s.length;

  const headingPresence: HeadingPresence = {
    h2Count: content.h2s.length,
    h2WithEntity,
    h3Count: content.h3s.length,
    h3WithEntity,
    ratio: totalHeadings > 0 ? (h2WithEntity + h3WithEntity) / totalHeadings : 0,
  };

  // Analyze body presence
  const paragraphsWithEntity = content.paragraphs.filter(p =>
    containsEntity(p, variants)
  ).length;

  const thirds = splitIntoThirds(content.paragraphs);
  const presentInFirstThird = thirds[0].some(p => containsEntity(p, variants));
  const presentInMiddleThird = thirds[1].some(p => containsEntity(p, variants));
  const presentInLastThird = thirds[2].some(p => containsEntity(p, variants));

  const distributionScore =
    (presentInFirstThird ? 33 : 0) +
    (presentInMiddleThird ? 34 : 0) +
    (presentInLastThird ? 33 : 0);

  const bodyPresence: BodyPresence = {
    totalParagraphs: content.paragraphs.length,
    paragraphsWithEntity,
    ratio: content.paragraphs.length > 0
      ? paragraphsWithEntity / content.paragraphs.length
      : 0,
    presentInFirstThird,
    presentInMiddleThird,
    presentInLastThird,
    distributionScore,
  };

  // N-gram analysis
  const ngramCounts = countEntityOccurrences(content.fullText, variants);
  const entityNGrams: EntityNGrams = {
    exactMatch: ngramCounts.exact,
    partialMatch: ngramCounts.partial,
    synonymMatch: ngramCounts.synonym,
  };

  return {
    inH1,
    inTitle,
    inIntroduction,
    inSchema,
    headingPresence,
    bodyPresence,
    entityNGrams,
  };
}

/**
 * Detect contextual drift in content
 * Identifies where the content strays from the central entity
 */
export function detectContextualDrift(
  content: ParsedContent,
  entity: DetectedEntity
): ContextualVector {
  const variants = entity.variants;
  const driftPoints: DriftPoint[] = [];

  // Analyze each paragraph for drift
  for (let i = 0; i < content.paragraphs.length; i++) {
    const para = content.paragraphs[i];

    if (!containsEntity(para, variants)) {
      // Paragraph doesn't mention entity - check if it drifted to another topic
      const frequentTerms = extractFrequentTerms(para, 4, 3);

      // If this paragraph has a dominant term different from entity
      if (frequentTerms.length > 0 && !variants.some(v =>
        normalizeText(v).includes(frequentTerms[0]) ||
        frequentTerms[0].includes(normalizeText(entity.name))
      )) {
        // Check context - is this a legitimate tangent or real drift?
        const prevMentioned = i > 0 && containsEntity(content.paragraphs[i - 1], variants);
        const nextMentions = i < content.paragraphs.length - 1 &&
          containsEntity(content.paragraphs[i + 1], variants);

        // If isolated paragraph without entity mention, could be drift
        if (!prevMentioned && !nextMentions && i > 0 && i < content.paragraphs.length - 1) {
          driftPoints.push({
            position: i + 1,
            driftedTo: frequentTerms[0],
            severity: 'minor',
            context: para.substring(0, 100) + '...',
          });
        } else if (i > 2 && i < content.paragraphs.length - 2) {
          // Check for extended drift (3+ paragraphs without mention)
          const prevFew = content.paragraphs.slice(Math.max(0, i - 2), i);
          const noneMentionEntity = prevFew.every(p => !containsEntity(p, variants));

          if (noneMentionEntity) {
            driftPoints.push({
              position: i + 1,
              driftedTo: frequentTerms[0],
              severity: 'major',
              context: para.substring(0, 100) + '...',
            });
          }
        }
      }
    }
  }

  const vectorScore = Math.max(0, 100 - (driftPoints.filter(d => d.severity === 'major').length * 20) -
    (driftPoints.filter(d => d.severity === 'minor').length * 5));

  return {
    isConsistent: driftPoints.filter(d => d.severity === 'major').length === 0,
    driftPoints,
    vectorScore,
  };
}

/**
 * Generate issues list from analysis
 */
export function identifyIssues(
  consistency: ConsistencyResult,
  contextualVector: ContextualVector
): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];

  // Critical issues
  if (!consistency.inH1) {
    issues.push({
      issue: 'missing_in_h1',
      severity: 'critical',
      description: 'Central entity not found in H1 heading',
      location: 'H1',
    });
  }

  if (!consistency.inIntroduction) {
    issues.push({
      issue: 'missing_in_intro',
      severity: 'critical',
      description: 'Central entity not defined in introduction (first 200 words)',
      location: 'Introduction',
    });
  }

  // Warning issues
  if (!consistency.inTitle) {
    issues.push({
      issue: 'missing_in_title',
      severity: 'warning',
      description: 'Central entity not found in title tag',
      location: 'Title',
    });
  }

  if (consistency.headingPresence.ratio < 0.3) {
    issues.push({
      issue: 'low_heading_presence',
      severity: 'warning',
      description: `Only ${Math.round(consistency.headingPresence.ratio * 100)}% of headings contain the central entity`,
      location: 'Headings',
    });
  }

  if (consistency.bodyPresence.distributionScore < 66) {
    issues.push({
      issue: 'uneven_distribution',
      severity: 'warning',
      description: 'Central entity not evenly distributed across content sections',
      location: 'Body',
    });
  }

  // Info issues
  if (!consistency.inSchema) {
    issues.push({
      issue: 'missing_in_schema',
      severity: 'info',
      description: 'Consider adding schema.org "about" property for the central entity',
      location: 'Schema',
    });
  }

  // Contextual drift
  const majorDrifts = contextualVector.driftPoints.filter(d => d.severity === 'major');
  if (majorDrifts.length > 0) {
    issues.push({
      issue: 'contextual_drift',
      severity: 'warning',
      description: `${majorDrifts.length} section(s) drift significantly from the central entity`,
      location: majorDrifts.map(d => `Paragraph ${d.position}`).join(', '),
    });
  }

  return issues;
}

/**
 * Calculate overall consistency score
 */
export function calculateConsistencyScore(
  consistency: ConsistencyResult,
  contextualVector: ContextualVector
): number {
  let score = 0;

  // Key position presence (40 points max)
  if (consistency.inH1) score += 15;
  if (consistency.inTitle) score += 10;
  if (consistency.inIntroduction) score += 10;
  if (consistency.inSchema) score += 5;

  // Heading presence (20 points max)
  score += Math.round(consistency.headingPresence.ratio * 20);

  // Distribution (20 points max)
  score += Math.round(consistency.bodyPresence.distributionScore * 0.2);

  // Contextual vector (20 points max)
  score += Math.round(contextualVector.vectorScore * 0.2);

  return Math.min(100, Math.max(0, score));
}

// =============================================================================
// Main Analysis Function
// =============================================================================

/**
 * Perform complete central entity analysis on content
 */
export function analyzeCentralEntityConsistency(
  content: ParsedContent,
  providedEntity?: string
): CentralEntityAnalysis {
  // Detect or use provided entity
  let entity: DetectedEntity;

  if (providedEntity) {
    entity = {
      name: providedEntity,
      confidence: 1.0,
      sources: [],
      variants: [providedEntity, ...generateSynonyms(providedEntity)],
    };
  } else {
    entity = detectCentralEntity(content);
  }

  // Analyze consistency
  const consistency = analyzeConsistency(content, entity);

  // Detect drift
  const contextualVector = detectContextualDrift(content, entity);

  // Identify issues
  const issues = identifyIssues(consistency, contextualVector);

  // Calculate score
  const consistencyScore = calculateConsistencyScore(consistency, contextualVector);

  return {
    detectedEntity: entity,
    consistency,
    contextualVector,
    consistencyScore,
    issues,
  };
}

// =============================================================================
// Content Parsing Utilities
// =============================================================================

/**
 * Parse HTML content into structured format
 * In production, this would use a proper HTML parser
 */
export function parseHtmlContent(html: string): ParsedContent {
  // Simple regex-based parsing - in production use cheerio or similar
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);

  const h2Matches = html.match(/<h2[^>]*>(.*?)<\/h2>/gi) || [];
  const h3Matches = html.match(/<h3[^>]*>(.*?)<\/h3>/gi) || [];

  const h2s = h2Matches.map(m => m.replace(/<[^>]+>/g, '').trim());
  const h3s = h3Matches.map(m => m.replace(/<[^>]+>/g, '').trim());

  // Extract paragraphs
  const pMatches = html.match(/<p[^>]*>(.*?)<\/p>/gis) || [];
  const paragraphs = pMatches
    .map(m => m.replace(/<[^>]+>/g, '').trim())
    .filter(p => p.length > 20);

  // Extract full text
  const fullText = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Introduction = first ~200 words
  const words = fullText.split(/\s+/);
  const introduction = words.slice(0, 200).join(' ');

  // Try to extract JSON-LD schema
  let schema: ParsedContent['schema'];
  const schemaMatch = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
  if (schemaMatch) {
    try {
      const schemaJson = JSON.parse(schemaMatch[1]);
      if (schemaJson.about) {
        schema = { about: schemaJson.about };
      }
    } catch {
      // Schema parse error - ignore
    }
  }

  return {
    title: titleMatch ? titleMatch[1].trim() : '',
    h1: h1Match ? h1Match[1].replace(/<[^>]+>/g, '').trim() : '',
    h2s,
    h3s,
    paragraphs,
    introduction,
    fullText,
    schema,
  };
}

/**
 * Parse markdown content into structured format
 */
export function parseMarkdownContent(markdown: string): ParsedContent {
  const lines = markdown.split('\n');

  let title = '';
  let h1 = '';
  const h2s: string[] = [];
  const h3s: string[] = [];
  const paragraphs: string[] = [];

  let currentParagraph = '';

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('# ')) {
      h1 = trimmed.slice(2).trim();
      if (!title) title = h1;
    } else if (trimmed.startsWith('## ')) {
      h2s.push(trimmed.slice(3).trim());
    } else if (trimmed.startsWith('### ')) {
      h3s.push(trimmed.slice(4).trim());
    } else if (trimmed.length > 0 && !trimmed.startsWith('#')) {
      currentParagraph += ' ' + trimmed;
    } else if (currentParagraph.trim().length > 20) {
      paragraphs.push(currentParagraph.trim());
      currentParagraph = '';
    }
  }

  if (currentParagraph.trim().length > 20) {
    paragraphs.push(currentParagraph.trim());
  }

  const fullText = markdown.replace(/^#+\s*/gm, '').replace(/\n+/g, ' ').trim();
  const words = fullText.split(/\s+/);
  const introduction = words.slice(0, 200).join(' ');

  return {
    title,
    h1,
    h2s,
    h3s,
    paragraphs,
    introduction,
    fullText,
    schema: undefined,
  };
}

// =============================================================================
// Export
// =============================================================================

export default {
  detectCentralEntity,
  analyzeConsistency,
  detectContextualDrift,
  identifyIssues,
  calculateConsistencyScore,
  analyzeCentralEntityConsistency,
  parseHtmlContent,
  parseMarkdownContent,
};
