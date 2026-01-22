/**
 * Vocabulary Expander Service
 *
 * Expands vocabulary in content for improved semantic SEO:
 * - Adds synonyms to H2 headings (parenthetical)
 * - Enhances alt text with related terms
 * - Inserts related terms in strategic locations
 * - Maintains natural language flow
 *
 * @module services/publishing/vocabularyExpander
 */

import type { ExtractedKeywords, SemanticContentData } from './semanticExtractor';

// ============================================================================
// TYPES
// ============================================================================

export interface VocabularyExpansionOptions {
  /** Maximum synonyms to add per heading */
  maxSynonymsPerHeading?: number;
  /** Maximum related terms in alt text */
  maxTermsInAltText?: number;
  /** Whether to expand vocabulary in body text */
  expandBodyText?: boolean;
  /** Language code for proper formatting */
  language?: string;
  /** Whether to use parenthetical format for synonyms */
  useParenthetical?: boolean;
}

export interface ImagePlaceholder {
  id: string;
  description: string;
  altText?: string;
  context?: string;
  position?: string;
}

export interface ExpansionResult {
  content: string;
  expansionsApplied: number;
  synonymsAdded: string[];
  termsAdded: string[];
}

// ============================================================================
// MAIN EXPANSION FUNCTIONS
// ============================================================================

/**
 * Expand vocabulary in HTML content using semantic data
 */
export function expandVocabulary(
  content: string,
  semanticData: SemanticContentData,
  options: VocabularyExpansionOptions = {}
): ExpansionResult {
  const {
    maxSynonymsPerHeading = 1,
    expandBodyText = false,
    useParenthetical = true,
  } = options;

  let expanded = content;
  let expansionsApplied = 0;
  const synonymsAdded: string[] = [];
  const termsAdded: string[] = [];

  // 1. Expand H2 headings with synonyms
  const h2Result = expandH2WithSynonyms(
    expanded,
    semanticData.keywords,
    { maxSynonyms: maxSynonymsPerHeading, useParenthetical }
  );
  expanded = h2Result.content;
  expansionsApplied += h2Result.count;
  synonymsAdded.push(...h2Result.synonymsUsed);

  // 2. Expand H3 headings with related terms (less aggressive)
  const h3Result = expandH3WithRelatedTerms(
    expanded,
    semanticData.keywords,
    { maxTerms: 1 }
  );
  expanded = h3Result.content;
  expansionsApplied += h3Result.count;
  termsAdded.push(...h3Result.termsUsed);

  // 3. Optionally expand body text with first-occurrence term insertion
  if (expandBodyText) {
    const bodyResult = expandBodyWithTerms(
      expanded,
      semanticData.keywords,
      { maxInsertions: 3 }
    );
    expanded = bodyResult.content;
    expansionsApplied += bodyResult.count;
    termsAdded.push(...bodyResult.termsUsed);
  }

  return {
    content: expanded,
    expansionsApplied,
    synonymsAdded: [...new Set(synonymsAdded)],
    termsAdded: [...new Set(termsAdded)],
  };
}

/**
 * Generate semantically-rich alt text for images
 */
export function generateSemanticAltText(
  imagePlaceholder: ImagePlaceholder,
  semanticData: SemanticContentData,
  sectionContext?: string,
  options: VocabularyExpansionOptions = {}
): string {
  const { maxTermsInAltText = 3, language = 'nl' } = options;

  const baseDescription = imagePlaceholder.description || imagePlaceholder.altText || '';

  // Get relevant terms based on section context
  const relevantTerms = selectRelevantTerms(
    semanticData,
    sectionContext,
    maxTermsInAltText
  );

  if (relevantTerms.length === 0) {
    return baseDescription;
  }

  // Build contextual alt text
  const connector = language === 'nl' ? 'met' : 'with';
  const termList = relevantTerms.join(', ');

  // Avoid duplicating terms already in description
  const descLower = baseDescription.toLowerCase();
  const filteredTerms = relevantTerms.filter(
    term => !descLower.includes(term.toLowerCase())
  );

  if (filteredTerms.length === 0) {
    return baseDescription;
  }

  return `${baseDescription} ${connector} ${filteredTerms.join(', ')}`;
}

/**
 * Enhance all image alt texts in HTML content
 */
export function enhanceImageAltTexts(
  html: string,
  semanticData: SemanticContentData,
  options: VocabularyExpansionOptions = {}
): string {
  // Find all images with alt text
  const imgRegex = /<img([^>]*?)alt="([^"]*)"([^>]*?)>/gi;

  let result = html;
  let currentSection = '';

  // Track current section for context
  const sectionRegex = /<h2[^>]*>([^<]*)<\/h2>/gi;
  let sectionMatch;
  const sections: Array<{ start: number; title: string }> = [];

  while ((sectionMatch = sectionRegex.exec(html)) !== null) {
    sections.push({
      start: sectionMatch.index,
      title: sectionMatch[1],
    });
  }

  // Replace alt texts with enhanced versions
  result = result.replace(imgRegex, (match, before, altText, after, offset) => {
    // Find current section context
    let sectionContext = '';
    for (const section of sections) {
      if (section.start < offset) {
        sectionContext = section.title;
      }
    }

    const placeholder: ImagePlaceholder = {
      id: `img-${offset}`,
      description: altText,
      altText: altText,
      context: sectionContext,
    };

    const enhancedAlt = generateSemanticAltText(
      placeholder,
      semanticData,
      sectionContext,
      options
    );

    return `<img${before}alt="${enhancedAlt}"${after}>`;
  });

  return result;
}

// ============================================================================
// HEADING EXPANSION
// ============================================================================

/**
 * Expand H2 headings with synonyms
 */
function expandH2WithSynonyms(
  content: string,
  keywords: ExtractedKeywords,
  options: { maxSynonyms: number; useParenthetical: boolean }
): { content: string; count: number; synonymsUsed: string[] } {
  const { maxSynonyms, useParenthetical } = options;
  const synonymsUsed: string[] = [];
  let count = 0;
  let expandedOnce = false; // Only expand first matching H2

  // Match H2 tags with their content
  let result = content.replace(
    /<h2([^>]*)>([^<]*)<\/h2>/gi,
    (match, attrs, heading) => {
      if (expandedOnce) return match;

      const headingLower = heading.toLowerCase();

      // Check if heading contains any keyword with synonyms
      for (const [keyword, synonyms] of keywords.synonyms) {
        if (headingLower.includes(keyword.toLowerCase()) && synonyms.length > 0) {
          // Don't add if heading already has parenthetical
          if (heading.includes('(')) {
            return match;
          }

          const selectedSynonyms = synonyms.slice(0, maxSynonyms);
          synonymsUsed.push(...selectedSynonyms);
          count++;
          expandedOnce = true;

          if (useParenthetical) {
            return `<h2${attrs}>${heading} (${selectedSynonyms.join(', ')})</h2>`;
          } else {
            return `<h2${attrs}>${heading}: ${selectedSynonyms.join(' & ')}</h2>`;
          }
        }
      }

      // Check against primary keyword
      if (headingLower.includes(keywords.primary.toLowerCase())) {
        const synonymsForPrimary = keywords.synonyms.get(keywords.primary.toLowerCase());
        if (synonymsForPrimary && synonymsForPrimary.length > 0 && !heading.includes('(')) {
          const selectedSynonyms = synonymsForPrimary.slice(0, maxSynonyms);
          synonymsUsed.push(...selectedSynonyms);
          count++;
          expandedOnce = true;

          if (useParenthetical) {
            return `<h2${attrs}>${heading} (${selectedSynonyms.join(', ')})</h2>`;
          } else {
            return `<h2${attrs}>${heading}: ${selectedSynonyms.join(' & ')}</h2>`;
          }
        }
      }

      return match;
    }
  );

  return { content: result, count, synonymsUsed };
}

/**
 * Expand H3 headings with related terms
 */
function expandH3WithRelatedTerms(
  content: string,
  keywords: ExtractedKeywords,
  options: { maxTerms: number }
): { content: string; count: number; termsUsed: string[] } {
  const { maxTerms } = options;
  const termsUsed: string[] = [];
  let count = 0;
  let expandedOnce = false;

  // Find H3 that doesn't already have expanded content
  let result = content.replace(
    /<h3([^>]*)>([^<]*)<\/h3>/gi,
    (match, attrs, heading) => {
      if (expandedOnce || heading.includes('(') || heading.includes(':')) {
        return match;
      }

      const headingLower = heading.toLowerCase();

      // Check if any related term is missing from heading
      for (const term of keywords.relatedTerms.slice(0, 5)) {
        if (!headingLower.includes(term.toLowerCase()) &&
            isRelevantToHeading(term, heading)) {
          termsUsed.push(term);
          count++;
          expandedOnce = true;
          return `<h3${attrs}>${heading} (${term})</h3>`;
        }
      }

      return match;
    }
  );

  return { content: result, count, termsUsed };
}

// ============================================================================
// BODY TEXT EXPANSION
// ============================================================================

/**
 * Expand body text with term insertions
 */
function expandBodyWithTerms(
  content: string,
  keywords: ExtractedKeywords,
  options: { maxInsertions: number }
): { content: string; count: number; termsUsed: string[] } {
  const { maxInsertions } = options;
  const termsUsed: string[] = [];
  let count = 0;

  // Find first paragraph that could benefit from term insertion
  const paragraphs = content.split(/<\/p>/i);
  const processedParagraphs = paragraphs.map((p, index) => {
    if (count >= maxInsertions) return p;
    if (!p.includes('<p')) return p;

    const pLower = p.toLowerCase();

    // Look for opportunity to insert hypernym or related term
    for (const hypernym of keywords.hypernyms.slice(0, 3)) {
      if (!pLower.includes(hypernym.toLowerCase()) &&
          pLower.includes(keywords.primary.toLowerCase())) {
        // Insert hypernym after first sentence
        const sentenceEnd = p.indexOf('. ');
        if (sentenceEnd > 50) {
          const before = p.slice(0, sentenceEnd + 2);
          const after = p.slice(sentenceEnd + 2);

          // Only insert if natural
          if (after.length > 20) {
            termsUsed.push(hypernym);
            count++;
            return `${before}Als onderdeel van ${hypernym.toLowerCase()}, ${after.charAt(0).toLowerCase()}${after.slice(1)}`;
          }
        }
      }
    }

    return p;
  });

  return {
    content: processedParagraphs.join('</p>'),
    count,
    termsUsed,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Select relevant terms based on context
 */
function selectRelevantTerms(
  semanticData: SemanticContentData,
  sectionContext?: string,
  maxTerms: number = 3
): string[] {
  const terms: string[] = [];

  // Add related terms from keywords
  terms.push(...semanticData.keywords.relatedTerms.slice(0, maxTerms));

  // Add entity attributes if context matches
  if (sectionContext) {
    const contextLower = sectionContext.toLowerCase();
    for (const entity of semanticData.entities) {
      for (const attr of entity.attributes) {
        if (contextLower.includes(attr.name.toLowerCase()) ||
            contextLower.includes(String(attr.value).toLowerCase())) {
          terms.push(`${attr.name}: ${attr.value}${attr.unit ? ' ' + attr.unit : ''}`);
        }
      }
    }
  }

  // Add hypernyms for broader context
  terms.push(...semanticData.keywords.hypernyms.slice(0, 2));

  return [...new Set(terms)].slice(0, maxTerms);
}

/**
 * Check if a term is relevant to a heading
 */
function isRelevantToHeading(term: string, heading: string): boolean {
  const termWords = term.toLowerCase().split(/\s+/);
  const headingWords = heading.toLowerCase().split(/\s+/);

  // Check for partial word overlap
  for (const termWord of termWords) {
    for (const headingWord of headingWords) {
      // Skip very short words
      if (termWord.length < 4 || headingWord.length < 4) continue;

      // Check for common root (simple stemming)
      const minLen = Math.min(termWord.length, headingWord.length);
      const commonPrefix = Math.floor(minLen * 0.6);

      if (termWord.slice(0, commonPrefix) === headingWord.slice(0, commonPrefix)) {
        return false; // Too similar, don't add
      }
    }
  }

  return true;
}

/**
 * Escape string for use in regex
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Check if content already has vocabulary expansion
 */
export function hasVocabularyExpansion(content: string): boolean {
  // Check for parenthetical additions in headings
  const h2WithParens = /<h2[^>]*>[^<]*\([^)]+\)[^<]*<\/h2>/gi;
  return h2WithParens.test(content);
}

/**
 * Get expansion suggestions without applying them
 */
export function suggestExpansions(
  content: string,
  semanticData: SemanticContentData
): Array<{
  type: 'h2-synonym' | 'h3-term' | 'alt-text' | 'body-term';
  location: string;
  original: string;
  suggested: string;
  term: string;
}> {
  const suggestions: Array<{
    type: 'h2-synonym' | 'h3-term' | 'alt-text' | 'body-term';
    location: string;
    original: string;
    suggested: string;
    term: string;
  }> = [];

  // Check H2 headings
  const h2Regex = /<h2[^>]*>([^<]*)<\/h2>/gi;
  let match;
  while ((match = h2Regex.exec(content)) !== null) {
    const heading = match[1];
    if (heading.includes('(')) continue;

    for (const [keyword, synonyms] of semanticData.keywords.synonyms) {
      if (heading.toLowerCase().includes(keyword.toLowerCase()) && synonyms.length > 0) {
        suggestions.push({
          type: 'h2-synonym',
          location: `H2: ${heading.slice(0, 30)}...`,
          original: heading,
          suggested: `${heading} (${synonyms[0]})`,
          term: synonyms[0],
        });
        break;
      }
    }
  }

  // Check alt texts
  const imgRegex = /<img[^>]*alt="([^"]*)"[^>]*>/gi;
  while ((match = imgRegex.exec(content)) !== null) {
    const altText = match[1];
    if (altText.length < 10) continue;

    const relevantTerms = selectRelevantTerms(semanticData, undefined, 2);
    const filteredTerms = relevantTerms.filter(
      term => !altText.toLowerCase().includes(term.toLowerCase())
    );

    if (filteredTerms.length > 0) {
      suggestions.push({
        type: 'alt-text',
        location: `Image: ${altText.slice(0, 30)}...`,
        original: altText,
        suggested: `${altText} met ${filteredTerms[0]}`,
        term: filteredTerms[0],
      });
    }
  }

  return suggestions;
}
