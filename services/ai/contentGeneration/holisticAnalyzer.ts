// services/ai/contentGeneration/holisticAnalyzer.ts
import {
  ContentGenerationSection,
  ContentBrief,
  BusinessInfo,
  HolisticSummaryContext
} from '../../../types';
import { getLanguageName } from '../../../utils/languageUtils';

/**
 * Multilingual stop words for vocabulary analysis
 * These common words are excluded from term frequency calculations
 */
const MULTILINGUAL_STOP_WORDS: Record<string, Set<string>> = {
  'English': new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be',
    'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that',
    'these', 'those', 'it', 'its', 'they', 'their', 'them', 'you', 'your',
    'we', 'our', 'i', 'my', 'me', 'what', 'which', 'who', 'when', 'where',
    'how', 'why', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
    'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
    'so', 'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there',
  ]),

  'Dutch': new Set([
    'de', 'het', 'een', 'en', 'van', 'in', 'is', 'op', 'te', 'dat', 'die',
    'voor', 'zijn', 'met', 'als', 'aan', 'er', 'maar', 'om', 'ook', 'nog',
    'bij', 'of', 'uit', 'tot', 'naar', 'dan', 'kan', 'wel', 'zou', 'al',
    'dit', 'was', 'wordt', 'worden', 'heeft', 'hebben', 'deze', 'door',
    'over', 'veel', 'meer', 'zo', 'andere', 'wat', 'hoe', 'waar', 'wie',
    'wanneer', 'waarom', 'welke', 'alle', 'geen', 'niet', 'nu', 'hier',
    'daar', 'dus', 'echter', 'verder', 'onder', 'boven', 'tussen', 'tegen',
    'na', 'voor', 'achter', 'sinds', 'tijdens', 'binnen', 'buiten',
    'ik', 'je', 'jij', 'u', 'hij', 'zij', 'ze', 'wij', 'we', 'jullie',
    'hun', 'haar', 'hem', 'ons', 'onze', 'jouw', 'uw', 'mijn',
  ]),

  'German': new Set([
    'der', 'die', 'das', 'den', 'dem', 'ein', 'eine', 'einen', 'einem',
    'einer', 'und', 'in', 'von', 'zu', 'mit', 'ist', 'auf', 'für', 'nicht',
    'sich', 'des', 'auch', 'als', 'an', 'er', 'es', 'so', 'dass', 'kann',
    'aus', 'werden', 'bei', 'oder', 'war', 'sind', 'noch', 'wie', 'haben',
    'nur', 'nach', 'wird', 'über', 'mehr', 'hat', 'aber', 'man', 'dann',
    'schon', 'wenn', 'diesem', 'diese', 'dieser', 'dieses', 'im', 'am',
    'zum', 'zur', 'durch', 'alle', 'alles', 'andere', 'anderen', 'anderen',
    'was', 'wer', 'wo', 'wann', 'warum', 'welche', 'welcher', 'welches',
    'ich', 'du', 'er', 'sie', 'wir', 'ihr', 'mein', 'dein', 'sein', 'ihr',
    'unser', 'euer', 'mir', 'dir', 'ihm', 'uns', 'euch', 'ihnen',
  ]),

  'French': new Set([
    'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'en', 'à',
    'est', 'que', 'qui', 'dans', 'pour', 'sur', 'avec', 'ce', 'par', 'au',
    'aux', 'ne', 'pas', 'plus', 'ou', 'mais', 'être', 'avoir', 'son', 'sa',
    'ses', 'leur', 'leurs', 'cette', 'ces', 'tout', 'tous', 'toute', 'toutes',
    'fait', 'comme', 'peut', 'même', 'aussi', 'bien', 'encore', 'très',
    'quand', 'où', 'comment', 'pourquoi', 'quel', 'quelle', 'quels', 'quelles',
    'il', 'elle', 'ils', 'elles', 'nous', 'vous', 'on', 'je', 'tu', 'me',
    'te', 'se', 'lui', 'mon', 'ton', 'notre', 'votre', 'ma', 'ta',
  ]),

  'Spanish': new Set([
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del',
    'en', 'y', 'a', 'que', 'es', 'por', 'con', 'para', 'se', 'su', 'al',
    'lo', 'como', 'más', 'pero', 'sus', 'le', 'ya', 'o', 'fue', 'este',
    'ha', 'cuando', 'muy', 'sin', 'sobre', 'ser', 'tiene', 'también',
    'me', 'hasta', 'hay', 'donde', 'han', 'quien', 'están', 'estado',
    'desde', 'todo', 'nos', 'durante', 'todos', 'uno', 'les', 'ni',
    'qué', 'quién', 'cuál', 'cuándo', 'dónde', 'cómo', 'por qué',
    'yo', 'tú', 'él', 'ella', 'nosotros', 'vosotros', 'ellos', 'ellas',
    'mi', 'tu', 'nuestro', 'vuestro', 'mí', 'ti', 'sí', 'esto', 'eso',
  ]),

  'Italian': new Set([
    'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'di', 'del',
    'della', 'dei', 'delle', 'a', 'in', 'e', 'che', 'è', 'per', 'con',
    'da', 'su', 'sono', 'non', 'si', 'al', 'alla', 'come', 'più', 'ma',
    'anche', 'se', 'loro', 'questo', 'questa', 'questi', 'queste', 'quello',
    'quella', 'quelli', 'quelle', 'essere', 'avere', 'fatto', 'stato',
    'cosa', 'chi', 'dove', 'quando', 'come', 'perché', 'quale', 'quali',
    'io', 'tu', 'lui', 'lei', 'noi', 'voi', 'loro', 'mio', 'tuo', 'suo',
    'nostro', 'vostro', 'mi', 'ti', 'ci', 'vi', 'ne', 'tutto', 'tutti',
  ]),

  'Portuguese': new Set([
    'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da',
    'dos', 'das', 'em', 'no', 'na', 'nos', 'nas', 'por', 'para', 'com',
    'e', 'que', 'é', 'se', 'não', 'mais', 'como', 'mas', 'foi', 'ao',
    'ele', 'ela', 'entre', 'depois', 'sem', 'mesmo', 'aos', 'ter', 'seu',
    'sua', 'seus', 'suas', 'ou', 'ser', 'quando', 'muito', 'há', 'já',
    'está', 'também', 'só', 'pelo', 'pela', 'até', 'isso', 'este', 'esta',
    'quem', 'onde', 'qual', 'quais', 'quanto', 'porque', 'como',
    'eu', 'tu', 'nós', 'vós', 'eles', 'elas', 'meu', 'teu', 'nosso', 'vosso',
    'me', 'te', 'lhe', 'nos', 'vos', 'lhes', 'minha', 'tua', 'nossa',
  ]),

  'Polish': new Set([
    'i', 'w', 'nie', 'na', 'do', 'to', 'że', 'z', 'o', 'co', 'jak',
    'ale', 'po', 'tak', 'za', 'od', 'się', 'jest', 'przez', 'czy',
    'który', 'która', 'które', 'tego', 'tej', 'tym', 'tych', 'tylko',
    'może', 'będzie', 'już', 'lub', 'być', 'bardzo', 'kiedy', 'jeszcze',
    'też', 'bez', 'więc', 'wszystko', 'jako', 'przed', 'między', 'pod',
    'nad', 'także', 'oraz', 'gdyż', 'sobie', 'nawet', 'tam', 'tutaj',
    'kto', 'gdzie', 'dlaczego', 'jaki', 'jaka', 'jakie',
    'ja', 'ty', 'on', 'ona', 'ono', 'my', 'wy', 'oni', 'one',
    'mój', 'twój', 'jego', 'jej', 'nasz', 'wasz', 'ich', 'mi', 'ci',
  ]),
};

/**
 * Get stop words for a specific language
 */
function getStopWords(language?: string): Set<string> {
  const langName = getLanguageName(language);
  return MULTILINGUAL_STOP_WORDS[langName] || MULTILINGUAL_STOP_WORDS['English'];
}

/**
 * Extract words from text, supporting international characters
 */
function extractWords(text: string): string[] {
  // Match words with international characters
  const wordPattern = /[\p{L}\p{N}]+/gu;
  const matches = text.toLowerCase().match(wordPattern);
  return matches || [];
}

/**
 * Builds a compact holistic summary context from the full article sections.
 * This is computed ONCE per pass and passed to each section during optimization.
 * The resulting context is ~2-4KB instead of the full 150-200KB article.
 */
export function buildHolisticSummary(
  sections: ContentGenerationSection[],
  brief: ContentBrief,
  businessInfo: BusinessInfo
): HolisticSummaryContext {
  // Sort sections by order for consistent processing
  const sortedSections = [...sections].sort((a, b) => a.section_order - b.section_order);

  // Assemble full text for metrics calculation
  const fullText = sortedSections
    .map(s => s.current_content || '')
    .join('\n\n');

  // Get language for multilingual processing
  const language = businessInfo.language;

  return {
    articleStructure: buildArticleStructure(sortedSections, brief),
    vocabularyMetrics: calculateVocabularyMetrics(fullText, language),
    coverageDistribution: buildCoverageDistribution(sortedSections),
    anchorTextsUsed: extractAnchorTexts(sortedSections),
    sectionKeyTerms: extractSectionKeyTerms(sortedSections, language),
    introductionSummary: buildIntroductionSummary(sortedSections, language),
    centralEntity: brief.title || businessInfo.seedKeyword,
    discourseAnchors: extractDiscourseAnchors(brief, businessInfo),
    featuredSnippetTarget: extractFeaturedSnippetTarget(brief, language)
  };
}

/**
 * Build article structure outline with word counts
 */
function buildArticleStructure(
  sections: ContentGenerationSection[],
  brief: ContentBrief
): HolisticSummaryContext['articleStructure'] {
  let totalWordCount = 0;

  const headingOutline = sections.map(s => {
    const wordCount = countWords(s.current_content || '');
    totalWordCount += wordCount;

    return {
      key: s.section_key,
      heading: s.section_heading || s.section_key,
      level: s.section_level || 2,
      wordCount,
      order: s.section_order
    };
  });

  return {
    title: brief.title || '',
    totalWordCount,
    totalSections: sections.length,
    headingOutline
  };
}

/**
 * Calculate vocabulary metrics (TTR, overused terms)
 * Uses language-specific stop words for accurate analysis
 */
function calculateVocabularyMetrics(
  text: string,
  language?: string
): HolisticSummaryContext['vocabularyMetrics'] {
  const words = extractWords(text);

  if (words.length === 0) {
    return {
      typeTokenRatio: 1,
      uniqueWordCount: 0,
      totalWordCount: 0,
      overusedTerms: []
    };
  }

  // Count word frequencies
  const wordCounts = new Map<string, number>();
  words.forEach(word => {
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
  });

  const uniqueWordCount = wordCounts.size;
  const totalWordCount = words.length;
  const typeTokenRatio = uniqueWordCount / totalWordCount;

  // Find overused terms (appearing more than 3 times, excluding language-specific stop words)
  const stopWords = getStopWords(language);

  const overusedTerms = Array.from(wordCounts.entries())
    .filter(([word, count]) => count > 3 && !stopWords.has(word) && word.length > 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([term, count]) => ({ term, count }));

  return {
    typeTokenRatio,
    uniqueWordCount,
    totalWordCount,
    overusedTerms
  };
}

/**
 * Build coverage distribution showing % of content per section
 */
function buildCoverageDistribution(
  sections: ContentGenerationSection[]
): HolisticSummaryContext['coverageDistribution'] {
  const totalWords = sections.reduce((sum, s) => sum + countWords(s.current_content || ''), 0);

  if (totalWords === 0) return [];

  return sections.map(s => ({
    sectionKey: s.section_key,
    heading: s.section_heading || s.section_key,
    percentage: Math.round((countWords(s.current_content || '') / totalWords) * 100)
  }));
}

/**
 * Extract all anchor texts used across sections
 */
function extractAnchorTexts(
  sections: ContentGenerationSection[]
): HolisticSummaryContext['anchorTextsUsed'] {
  const anchorMap = new Map<string, { sectionKey: string; count: number }>();
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;

  sections.forEach(s => {
    const content = s.current_content || '';
    let match;

    while ((match = linkPattern.exec(content)) !== null) {
      const anchor = match[1].trim().toLowerCase();
      const existing = anchorMap.get(anchor);

      if (existing) {
        existing.count++;
      } else {
        anchorMap.set(anchor, { sectionKey: s.section_key, count: 1 });
      }
    }
  });

  return Array.from(anchorMap.entries()).map(([text, data]) => ({
    text,
    sectionKey: data.sectionKey,
    count: data.count
  }));
}

/**
 * Extract key terms and last sentence for each section
 * Used for discourse chaining (S-P-O pattern)
 */
function extractSectionKeyTerms(
  sections: ContentGenerationSection[],
  language?: string
): HolisticSummaryContext['sectionKeyTerms'] {
  return sections.map(s => {
    const content = s.current_content || '';

    // Extract last sentence for discourse chaining
    const sentences = content.split(/[.!?]+/).filter(sent => sent.trim());
    const lastSentence = sentences[sentences.length - 1]?.trim() || '';

    // Extract top 5 key terms using simple TF-IDF approximation
    const keyTerms = extractTopTerms(content, 5, language);

    return {
      sectionKey: s.section_key,
      keyTerms,
      lastSentence: lastSentence.substring(0, 200) // Limit length
    };
  });
}

/**
 * Build introduction summary for alignment checks
 */
function buildIntroductionSummary(
  sections: ContentGenerationSection[],
  language?: string
): HolisticSummaryContext['introductionSummary'] {
  // Multilingual introduction detection
  const introPatterns: Record<string, string[]> = {
    'English': ['introduction', 'intro', 'overview'],
    'Dutch': ['inleiding', 'introductie', 'overzicht'],
    'German': ['einleitung', 'einführung', 'überblick'],
    'French': ['introduction', 'présentation', 'aperçu'],
    'Spanish': ['introducción', 'presentación', 'resumen'],
    'Italian': ['introduzione', 'presentazione', 'panoramica'],
    'Portuguese': ['introdução', 'apresentação', 'resumo'],
    'Polish': ['wprowadzenie', 'wstęp', 'przegląd'],
  };

  const langName = getLanguageName(language);
  const patterns = introPatterns[langName] || introPatterns['English'];

  const introSection = sections.find(s =>
    s.section_key === 'intro' ||
    patterns.some(p => s.section_heading?.toLowerCase().includes(p))
  );

  if (!introSection || !introSection.current_content) {
    return { content: '', topicsPreviewedInOrder: [] };
  }

  const content = introSection.current_content;

  // Extract topics previewed (look for lists, colons, or sentence patterns)
  const topicsPreviewedInOrder = extractPreviewedTopics(content);

  return {
    content: content.substring(0, 500), // First 500 chars for alignment
    topicsPreviewedInOrder
  };
}

/**
 * Extract discourse anchors from SEO pillars and brief
 */
function extractDiscourseAnchors(
  brief: ContentBrief,
  businessInfo: BusinessInfo
): string[] {
  const anchors = new Set<string>();

  // Add central entity
  if (businessInfo.seedKeyword) {
    anchors.add(businessInfo.seedKeyword);
  }

  // Add title terms
  if (brief.title) {
    const words = extractWords(brief.title);
    words
      .filter(w => w.length > 4)
      .forEach(w => anchors.add(w));
  }

  // Add from structured outline headings
  if (brief.structured_outline) {
    brief.structured_outline.forEach(section => {
      if (section.heading) {
        const words = extractWords(section.heading);
        words
          .filter(w => w.length > 4)
          .forEach(w => anchors.add(w));
      }
    });
  }

  return Array.from(anchors).slice(0, 10);
}

/**
 * Extract featured snippet target from brief
 * Supports multilingual question patterns
 */
function extractFeaturedSnippetTarget(
  brief: ContentBrief,
  language?: string
): HolisticSummaryContext['featuredSnippetTarget'] | undefined {
  const title = brief.title?.toLowerCase() || '';
  const langName = getLanguageName(language);

  // Multilingual question patterns
  const whatPatterns: Record<string, string[]> = {
    'English': ['what is', 'what are'],
    'Dutch': ['wat is', 'wat zijn'],
    'German': ['was ist', 'was sind'],
    'French': ['qu\'est-ce que', 'que sont'],
    'Spanish': ['qué es', 'qué son'],
    'Italian': ['che cos\'è', 'cosa sono'],
    'Portuguese': ['o que é', 'o que são'],
    'Polish': ['co to jest', 'czym są'],
  };

  const howPatterns: Record<string, string[]> = {
    'English': ['how to', 'steps'],
    'Dutch': ['hoe', 'stappen'],
    'German': ['wie', 'schritte'],
    'French': ['comment', 'étapes'],
    'Spanish': ['cómo', 'pasos'],
    'Italian': ['come', 'passaggi'],
    'Portuguese': ['como', 'passos'],
    'Polish': ['jak', 'kroki'],
  };

  const comparisonPatterns: Record<string, string[]> = {
    'English': [' vs ', 'comparison', 'versus'],
    'Dutch': [' vs ', 'vergelijking', 'versus'],
    'German': [' vs ', 'vergleich', 'versus'],
    'French': [' vs ', 'comparaison', 'versus'],
    'Spanish': [' vs ', 'comparación', 'versus'],
    'Italian': [' vs ', 'confronto', 'versus'],
    'Portuguese': [' vs ', 'comparação', 'versus'],
    'Polish': [' vs ', 'porównanie', 'versus'],
  };

  const whatPats = whatPatterns[langName] || whatPatterns['English'];
  const howPats = howPatterns[langName] || howPatterns['English'];
  const compPats = comparisonPatterns[langName] || comparisonPatterns['English'];

  if (whatPats.some(p => title.includes(p))) {
    return { question: brief.title!, targetType: 'paragraph' };
  }

  if (howPats.some(p => title.includes(p))) {
    return { question: brief.title!, targetType: 'list' };
  }

  if (compPats.some(p => title.includes(p))) {
    return { question: brief.title!, targetType: 'table' };
  }

  return undefined;
}

// ============================================
// Helper Functions
// ============================================

function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Extract top N terms from text using TF approximation
 * Uses language-specific stop words
 */
function extractTopTerms(text: string, n: number, language?: string): string[] {
  const words = extractWords(text);
  const stopWords = getStopWords(language);

  const termCounts = new Map<string, number>();
  words.forEach(word => {
    if (!stopWords.has(word) && word.length > 3) {
      termCounts.set(word, (termCounts.get(word) || 0) + 1);
    }
  });

  return Array.from(termCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([term]) => term);
}

/**
 * Extract topics that are previewed in the introduction
 */
function extractPreviewedTopics(introContent: string): string[] {
  const topics: string[] = [];

  // Look for list items
  const listItems = introContent.match(/[-*]\s+([^-*\n]+)/g) || [];
  listItems.forEach(item => {
    const text = item.replace(/^[-*]\s+/, '').trim();
    if (text.length > 5 && text.length < 50) {
      topics.push(text);
    }
  });

  // Look for numbered items
  const numberedItems = introContent.match(/\d+\.\s+([^\n]+)/g) || [];
  numberedItems.forEach(item => {
    const text = item.replace(/^\d+\.\s+/, '').trim();
    if (text.length > 5 && text.length < 50) {
      topics.push(text);
    }
  });

  return topics.slice(0, 10);
}

/**
 * Adjacent section context for discourse chaining
 */
export interface AdjacentContext {
  previousSection?: {
    key: string;
    heading: string;
    lastSentence: string;
    lastObject?: string;
  };
  nextSection?: {
    key: string;
    heading: string;
  };
}

/**
 * Build adjacent section context for a specific section.
 * Used for discourse chaining between sections (S-P-O pattern).
 */
export function buildAdjacentContext(
  allSections: ContentGenerationSection[],
  currentSection: ContentGenerationSection
): AdjacentContext {
  const sortedSections = [...allSections].sort((a, b) => a.section_order - b.section_order);
  const currentIndex = sortedSections.findIndex(s => s.section_key === currentSection.section_key);

  const result: AdjacentContext = {};

  // Get previous section context
  if (currentIndex > 0) {
    const prev = sortedSections[currentIndex - 1];
    const content = prev.current_content || '';

    // Extract last sentence
    const sentences = content.split(/[.!?]+/).filter(sent => sent.trim());
    const lastSentence = sentences[sentences.length - 1]?.trim() || '';

    // Extract potential object from last sentence (simplified)
    const words = lastSentence.split(/\s+/);
    const lastObject = words.slice(-3).join(' '); // Last 3 words as potential object

    result.previousSection = {
      key: prev.section_key,
      heading: prev.section_heading || prev.section_key,
      lastSentence: lastSentence.substring(0, 200),
      lastObject: lastObject.substring(0, 50)
    };
  }

  // Get next section context
  if (currentIndex < sortedSections.length - 1) {
    const next = sortedSections[currentIndex + 1];
    result.nextSection = {
      key: next.section_key,
      heading: next.section_heading || next.section_key
    };
  }

  return result;
}

/**
 * Serialize holistic context for prompt inclusion.
 * Creates a compact, readable summary for AI prompts.
 */
export function serializeHolisticContext(context: HolisticSummaryContext): string {
  const lines: string[] = [];

  // Article structure summary
  lines.push(`## Article Context`);
  lines.push(`Title: ${context.articleStructure.title}`);
  lines.push(`Total Words: ${context.articleStructure.totalWordCount}`);
  lines.push(`Sections: ${context.articleStructure.totalSections}`);
  lines.push('');

  // Section outline
  lines.push(`## Section Outline`);
  context.articleStructure.headingOutline.forEach(s => {
    const prefix = '#'.repeat(s.level);
    lines.push(`${prefix} ${s.heading} (${s.wordCount} words)`);
  });
  lines.push('');

  // Vocabulary metrics
  lines.push(`## Vocabulary Metrics`);
  lines.push(`Type-Token Ratio: ${(context.vocabularyMetrics.typeTokenRatio * 100).toFixed(1)}%`);
  lines.push(`Unique Words: ${context.vocabularyMetrics.uniqueWordCount}`);
  if (context.vocabularyMetrics.overusedTerms.length > 0) {
    lines.push(`Overused Terms: ${context.vocabularyMetrics.overusedTerms.map(t => `${t.term}(${t.count})`).join(', ')}`);
  }
  lines.push('');

  // Central entity
  lines.push(`## Central Entity`);
  lines.push(context.centralEntity);
  lines.push('');

  // Discourse anchors
  if (context.discourseAnchors.length > 0) {
    lines.push(`## Discourse Anchors`);
    lines.push(context.discourseAnchors.join(', '));
    lines.push('');
  }

  // Featured snippet target
  if (context.featuredSnippetTarget) {
    lines.push(`## Featured Snippet Target`);
    lines.push(`Question: ${context.featuredSnippetTarget.question}`);
    lines.push(`Target Type: ${context.featuredSnippetTarget.targetType}`);
    lines.push('');
  }

  return lines.join('\n');
}
