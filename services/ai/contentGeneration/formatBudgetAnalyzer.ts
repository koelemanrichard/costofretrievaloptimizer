// services/ai/contentGeneration/formatBudgetAnalyzer.ts
import {
  ContentGenerationSection,
  ContentBrief,
  ContentFormatBudget,
  SectionContentType,
  BusinessInfo
} from '../../../types';

// Supported languages for discourse analysis
type SupportedLanguage = 'en' | 'nl' | 'de' | 'fr' | 'es';

/**
 * PERFORMANCE: Yields to main thread to prevent browser freeze
 * Critical for preventing "Page not responding" during analysis
 */
function yieldToMainThread(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Format Budget Analyzer
 *
 * Implements the "Baker Principle" from research:
 * - Pages need both Prose Score and Structured Score
 * - Macro Context (top): Paragraphs heavy
 * - Body: Mix of paragraphs + lists
 * - Comparison: Tables
 * - Supplementary (bottom): Lists & links OK
 *
 * This analyzer:
 * 1. Counts current format distribution
 * 2. Classifies section types
 * 3. Determines which sections need optimization
 * 4. Enforces budget constraints
 */

// Patterns that indicate list-appropriate content (multi-language)
const LIST_QUERY_PATTERNS: Record<SupportedLanguage, RegExp[]> = {
  en: [
    /\b(types|kinds|categories)\s+of\b/i,
    /\b(benefits|advantages|pros)\s+of\b/i,
    /\b(disadvantages|cons|risks)\s+of\b/i,
    /\b(symptoms|signs|indicators)\s+of\b/i,
    /\b(steps|ways|methods)\s+to\b/i,
    /\b(features|characteristics)\s+of\b/i,
    /\b(examples|uses|applications)\s+of\b/i,
    /\b(causes|reasons|factors)\s+(of|for|why)\b/i,
    /\b(tips|tricks|strategies)\s+for\b/i,
    /\bhow\s+to\b/i,
    /\btop\s+\d+/i,
    /\bcomponents?\b/i,
    /\belements?\b/i,
  ],
  nl: [
    /\b(soorten|types|categorieën)\s+(van)?\b/i,
    /\b(voordelen|benefits)\s+(van)?\b/i,
    /\b(nadelen|risico's)\s+(van)?\b/i,
    /\b(symptomen|signalen|indicatoren)\s+(van)?\b/i,
    /\b(stappen|manieren|methoden)\s+(om|voor)?\b/i,
    /\b(kenmerken|eigenschappen|functies)\s+(van)?\b/i,
    /\b(voorbeelden|toepassingen)\s+(van)?\b/i,
    /\b(oorzaken|redenen|factoren)\s+(van|voor|waarom)?\b/i,
    /\b(tips|trucs|strategieën)\s+(voor)?\b/i,
    /\bhoe\s+(je|u)?\b/i,
    /\btop\s+\d+/i,
    /\bcomponenten\b/i,        // "Kerncomponenten"
    /\bkern\s*componenten\b/i,
    /\belementen\b/i,
    /\bonderdelen\b/i,
    /\bpunten\b/i,
    /\bveelgestelde\s+vragen\b/i, // FAQ section
    /\b(wat|welke)\s+(zijn|is)\b/i, // "Wat zijn..." often leads to lists
  ],
  de: [
    /\b(arten|typen|kategorien)\s+(von)?\b/i,
    /\b(vorteile|nutzen)\s+(von)?\b/i,
    /\b(nachteile|risiken)\s+(von)?\b/i,
    /\b(symptome|anzeichen)\s+(von)?\b/i,
    /\b(schritte|wege|methoden)\s+(zu|für)?\b/i,
    /\b(merkmale|eigenschaften)\s+(von)?\b/i,
    /\b(beispiele|anwendungen)\s+(von)?\b/i,
    /\bwie\s+(man)?\b/i,
    /\btop\s+\d+/i,
    /\bkomponenten\b/i,
    /\belemente\b/i,
  ],
  fr: [
    /\b(types|catégories)\s+(de)?\b/i,
    /\b(avantages|bénéfices)\s+(de)?\b/i,
    /\b(inconvénients|risques)\s+(de)?\b/i,
    /\b(étapes|méthodes)\s+(pour)?\b/i,
    /\b(caractéristiques|fonctionnalités)\s+(de)?\b/i,
    /\b(exemples|applications)\s+(de)?\b/i,
    /\bcomment\b/i,
    /\btop\s+\d+/i,
    /\bcomposants\b/i,
    /\béléments\b/i,
  ],
  es: [
    /\b(tipos|clases|categorías)\s+(de)?\b/i,
    /\b(ventajas|beneficios)\s+(de)?\b/i,
    /\b(desventajas|riesgos)\s+(de)?\b/i,
    /\b(pasos|métodos|maneras)\s+(de|para)?\b/i,
    /\b(características|funciones)\s+(de)?\b/i,
    /\b(ejemplos|aplicaciones)\s+(de)?\b/i,
    /\bcómo\b/i,
    /\btop\s+\d+/i,
    /\bcomponentes\b/i,
    /\belementos\b/i,
  ],
};

// Patterns that indicate table-appropriate content (multi-language)
const TABLE_QUERY_PATTERNS: Record<SupportedLanguage, RegExp[]> = {
  en: [
    /\bvs\.?\b|\bversus\b/i,
    /\bcompare\b|\bcomparison\b/i,
    /\bspecs\b|\bspecifications\b/i,
    /\bpricing\b|\bprices\b/i,
    /\bfeatures?\s+comparison\b/i,
    /\bdifferences?\s+between\b/i,
  ],
  nl: [
    /\bvs\.?\b|\bversus\b/i,
    /\bvergelijk(en|ing)?\b/i,
    /\bspecificaties\b/i,
    /\bprijzen\b|\btarieven\b/i,
    /\bverschillen?\s+(tussen)?\b/i,
    /\boverzicht\b/i,
  ],
  de: [
    /\bvs\.?\b|\bversus\b/i,
    /\bvergleich(en)?\b/i,
    /\bspezifikationen\b/i,
    /\bpreise\b/i,
    /\bunterschiede?\s+(zwischen)?\b/i,
    /\bübersicht\b/i,
  ],
  fr: [
    /\bvs\.?\b|\bversus\b/i,
    /\bcomparer\b|\bcomparaison\b/i,
    /\bspécifications\b/i,
    /\bprix\b|\btarifs\b/i,
    /\bdifférences?\s+(entre)?\b/i,
  ],
  es: [
    /\bvs\.?\b|\bversus\b/i,
    /\bcomparar\b|\bcomparación\b/i,
    /\bespecificaciones\b/i,
    /\bprecios\b/i,
    /\bdiferencias?\s+(entre)?\b/i,
  ],
};

// Patterns that indicate comparison section (multi-language)
const COMPARISON_HEADING_PATTERNS: Record<SupportedLanguage, RegExp[]> = {
  en: [
    /\bvs\.?\b|\bversus\b/i,
    /\bcompared\s+to\b/i,
    /\bcomparison\b/i,
    /\bdifferences?\s+between\b/i,
  ],
  nl: [
    /\bvs\.?\b|\bversus\b/i,
    /\bvergeleken\s+met\b/i,
    /\bvergelijking\b/i,
    /\bverschillen?\s+tussen\b/i,
  ],
  de: [
    /\bvs\.?\b|\bversus\b/i,
    /\bverglichen\s+mit\b/i,
    /\bvergleich\b/i,
    /\bunterschiede?\s+zwischen\b/i,
  ],
  fr: [
    /\bvs\.?\b|\bversus\b/i,
    /\bcomparé\s+à\b/i,
    /\bcomparaison\b/i,
    /\bdifférences?\s+entre\b/i,
  ],
  es: [
    /\bvs\.?\b|\bversus\b/i,
    /\bcomparado\s+con\b/i,
    /\bcomparación\b/i,
    /\bdiferencias?\s+entre\b/i,
  ],
};

/**
 * Analyzes the article's content format distribution and creates an optimization budget.
 * ASYNC: Yields to main thread to prevent browser freeze during analysis.
 */
export async function analyzeContentFormatBudget(
  sections: ContentGenerationSection[],
  brief: ContentBrief,
  businessInfo?: BusinessInfo
): Promise<ContentFormatBudget> {
  const totalSections = sections.length;

  // Detect language from businessInfo or from content
  const detectedLanguage = detectLanguage(sections, businessInfo);

  // Count current format usage
  let sectionsWithLists = 0;
  let sectionsWithTables = 0;
  let sectionsWithImages = 0;
  let totalProseChars = 0;
  let totalStructuredChars = 0;

  const sectionClassifications: ContentFormatBudget['sectionClassifications'] = [];

  // PERFORMANCE: Process sections with periodic yields to prevent browser freeze
  for (let index = 0; index < sections.length; index++) {
    const section = sections[index];
    const content = section.current_content || '';
    const heading = section.section_heading || '';

    // Detect format presence
    const hasList = hasListContent(content);
    const hasTable = hasTableContent(content);
    const hasImage = hasImageContent(content);

    if (hasList) sectionsWithLists++;
    if (hasTable) sectionsWithTables++;
    if (hasImage) sectionsWithImages++;

    // Calculate prose vs structured ratio for this section
    const { proseChars, structuredChars } = measureContentFormat(content);
    totalProseChars += proseChars;
    totalStructuredChars += structuredChars;

    // Classify section type based on position and content
    const sectionType = classifySectionType(section, index, totalSections, heading, detectedLanguage);

    sectionClassifications.push({
      sectionKey: section.section_key,
      heading: heading,
      type: sectionType,
      hasListAlready: hasList,
      hasTableAlready: hasTable,
      hasImageAlready: hasImage,
    });

    // PERFORMANCE: Yield every 3 sections to keep UI responsive
    if (index > 0 && index % 3 === 0) {
      await yieldToMainThread();
    }
  }

  // Calculate overall prose ratio
  const totalChars = totalProseChars + totalStructuredChars;
  const proseToStructuredRatio = totalChars > 0 ? totalProseChars / totalChars : 0.7;

  // Define constraints based on optimal ratios
  // Target: 60-80% prose, max 40% of sections with lists, max 15% with tables, max 50% with images
  const constraints = {
    maxListSections: Math.floor(totalSections * 0.4),
    maxTableSections: Math.floor(totalSections * 0.15),
    maxImageSections: Math.max(1, Math.floor(totalSections * 0.5)),
    targetProseRatio: 0.7, // 70% prose target
  };

  // Yield before optimization determination (also expensive)
  await yieldToMainThread();

  // Determine which sections NEED optimization
  const sectionsNeedingOptimization = await determineSectionsNeedingOptimization(
    sections,
    sectionClassifications,
    constraints,
    sectionsWithLists,
    sectionsWithTables,
    brief,
    detectedLanguage
  );

  return {
    currentStats: {
      totalSections,
      sectionsWithLists,
      sectionsWithTables,
      sectionsWithImages,
      proseToStructuredRatio,
    },
    sectionClassifications,
    sectionsNeedingOptimization,
    constraints,
  };
}

/**
 * Classifies a section into macro/body/comparison/bridge/supplementary.
 */
function classifySectionType(
  section: ContentGenerationSection,
  index: number,
  totalSections: number,
  heading: string,
  language: SupportedLanguage
): SectionContentType {
  // First 2 sections = macro context (intro, main definition)
  if (index <= 1) {
    return 'macro';
  }

  // Last 2 sections = supplementary (conclusion, related content)
  if (index >= totalSections - 2) {
    return 'supplementary';
  }

  // Check for comparison patterns in heading (language-specific)
  const comparisonPatterns = COMPARISON_HEADING_PATTERNS[language] || COMPARISON_HEADING_PATTERNS.en;
  if (comparisonPatterns.some(p => p.test(heading))) {
    return 'comparison';
  }

  // Check for bridge indicators (transition words in heading) - multi-language
  const bridgePatterns: Record<SupportedLanguage, RegExp> = {
    en: /\b(also|additionally|furthermore|moreover|however|alternatively)\b/i,
    nl: /\b(ook|daarnaast|bovendien|echter|alternatief)\b/i,
    de: /\b(auch|zusätzlich|außerdem|jedoch|alternativ)\b/i,
    fr: /\b(aussi|de plus|en outre|cependant|alternativement)\b/i,
    es: /\b(también|además|sin embargo|alternativamente)\b/i,
  };
  const bridgePattern = bridgePatterns[language] || bridgePatterns.en;
  if (bridgePattern.test(heading)) {
    return 'bridge';
  }

  // Default to body
  return 'body';
}

/**
 * Determines which sections should receive lists, tables, or other optimizations.
 * Respects the format budget to prevent over-optimization.
 * ASYNC: Yields periodically to prevent browser freeze.
 */
async function determineSectionsNeedingOptimization(
  sections: ContentGenerationSection[],
  classifications: ContentFormatBudget['sectionClassifications'],
  constraints: ContentFormatBudget['constraints'],
  currentListCount: number,
  currentTableCount: number,
  brief: ContentBrief,
  language: SupportedLanguage
): Promise<ContentFormatBudget['sectionsNeedingOptimization']> {
  const listsNeeded: string[] = [];
  const tablesNeeded: string[] = [];
  const imagesNeeded: string[] = [];
  const discourseNeeded: string[] = [];

  // Calculate remaining budget
  const listBudgetRemaining = Math.max(0, constraints.maxListSections - currentListCount);
  const tableBudgetRemaining = Math.max(0, constraints.maxTableSections - currentTableCount);

  let listsAssigned = 0;
  let tablesAssigned = 0;

  // Calculate overall prose ratio to determine if we need aggressive list conversion
  let totalProseChars = 0;
  let totalStructuredChars = 0;
  for (const section of sections) {
    const { proseChars, structuredChars } = measureContentFormat(section.current_content || '');
    totalProseChars += proseChars;
    totalStructuredChars += structuredChars;
  }
  const overallProseRatio = totalProseChars / Math.max(1, totalProseChars + totalStructuredChars);

  // If prose is too high (>80%), we need to be more aggressive about list conversion
  // Target is 60-80% prose, so >80% triggers aggressive mode
  const aggressiveMode = overallProseRatio > 0.80;
  if (aggressiveMode) {
    console.log(`[FormatBudgetAnalyzer] Aggressive mode: prose ratio ${(overallProseRatio * 100).toFixed(1)}% exceeds 80% target`);
  }

  // Track sections that could receive lists in aggressive mode (body sections without lists)
  const candidatesForAggressiveLists: Array<{ key: string; wordCount: number }> = [];

  // PERFORMANCE: Process with periodic yields
  for (let i = 0; i < classifications.length; i++) {
    const classification = classifications[i];
    const section = sections.find(s => s.section_key === classification.sectionKey);
    if (!section) continue;

    const heading = classification.heading;
    const sectionType = classification.type;

    // Skip macro sections for lists/tables - they should be paragraph-heavy
    if (sectionType === 'macro') {
      // Macro sections might need discourse improvement only
      if (needsDiscourseImprovement(section, language)) {
        discourseNeeded.push(section.section_key);
      }
      continue;
    }

    // Check if section needs a list
    if (
      !classification.hasListAlready &&
      listsAssigned < listBudgetRemaining &&
      shouldHaveList(heading, sectionType, language)
    ) {
      listsNeeded.push(section.section_key);
      listsAssigned++;
    } else if (
      aggressiveMode &&
      !classification.hasListAlready &&
      sectionType === 'body'
    ) {
      // Track as candidate for aggressive list conversion
      const wordCount = (section.current_content || '').split(/\s+/).length;
      candidatesForAggressiveLists.push({ key: section.section_key, wordCount });
    }

    // Check if section needs a table (comparison sections only)
    if (
      !classification.hasTableAlready &&
      tablesAssigned < tableBudgetRemaining &&
      shouldHaveTable(heading, sectionType, language)
    ) {
      tablesNeeded.push(section.section_key);
      tablesAssigned++;
    }

    // Check if section needs an image - SMART: use brief's visual plan
    if (!classification.hasImageAlready && shouldHaveImage(section, sectionType, brief)) {
      imagesNeeded.push(section.section_key);
    }

    // Check if section needs discourse improvement
    if (needsDiscourseImprovement(section, language)) {
      discourseNeeded.push(section.section_key);
    }

    // PERFORMANCE: Yield every 3 sections
    if (i > 0 && i % 3 === 0) {
      await yieldToMainThread();
    }
  }

  // AGGRESSIVE MODE: If prose is still too high, add more sections to list conversion
  // Prioritize longest sections for list conversion (more content to work with)
  if (aggressiveMode && listsAssigned < listBudgetRemaining && candidatesForAggressiveLists.length > 0) {
    // Sort by word count descending - longer sections have more potential for list extraction
    candidatesForAggressiveLists.sort((a, b) => b.wordCount - a.wordCount);

    // Add candidates until we hit the list budget or run out of candidates
    for (const candidate of candidatesForAggressiveLists) {
      if (listsAssigned >= listBudgetRemaining) break;
      if (listsNeeded.includes(candidate.key)) continue;

      console.log(`[FormatBudgetAnalyzer] Aggressive mode: adding "${candidate.key}" (${candidate.wordCount} words) for list conversion`);
      listsNeeded.push(candidate.key);
      listsAssigned++;
    }
  }

  return {
    lists: listsNeeded,
    tables: tablesNeeded,
    images: imagesNeeded,
    discourse: discourseNeeded,
  };
}

/**
 * Determines if a section heading implies list-appropriate content.
 * Uses language-specific patterns to detect list-worthy headings.
 */
function shouldHaveList(heading: string, sectionType: SectionContentType, language: SupportedLanguage): boolean {
  // Get language-specific patterns (fallback to English)
  const patterns = LIST_QUERY_PATTERNS[language] || LIST_QUERY_PATTERNS.en;

  // Supplementary sections are list-friendly
  if (sectionType === 'supplementary') {
    return patterns.some(p => p.test(heading));
  }

  // Body sections need strong indicators - use all language-specific patterns
  // The patterns already contain strong indicators like "componenten", "types", etc.
  if (sectionType === 'body') {
    return patterns.some(p => p.test(heading));
  }

  // Comparison sections should use tables, not lists
  return false;
}

/**
 * Determines if a section should have a table.
 * Uses language-specific patterns to detect table-worthy headings.
 */
function shouldHaveTable(heading: string, sectionType: SectionContentType, language: SupportedLanguage): boolean {
  // Only comparison sections get tables
  if (sectionType === 'comparison') {
    return true;
  }

  // Get language-specific patterns (fallback to English)
  const patterns = TABLE_QUERY_PATTERNS[language] || TABLE_QUERY_PATTERNS.en;

  // Or if heading explicitly indicates comparison
  return patterns.some(p => p.test(heading));
}

/**
 * Determines if a section should have an image.
 * SMART: Prioritizes brief's planned images over heuristics.
 */
function shouldHaveImage(section: ContentGenerationSection, sectionType: SectionContentType, brief?: ContentBrief): boolean {
  const sectionKey = section.section_key?.toLowerCase() || '';
  const sectionHeading = (section.section_heading || '').toLowerCase();

  // SMART: First check enhanced_visual_semantics.section_images (keyed by section)
  if (brief?.enhanced_visual_semantics?.section_images) {
    const sectionImages = brief.enhanced_visual_semantics.section_images;
    // Check if any key matches this section (by key or heading)
    for (const key of Object.keys(sectionImages)) {
      const normalizedKey = key.toLowerCase();
      if (sectionKey.includes(normalizedKey) || normalizedKey.includes(sectionKey) ||
          sectionHeading.includes(normalizedKey) || normalizedKey.includes(sectionHeading)) {
        return true; // Brief planned an image for this section
      }
    }
  }

  // SMART: Also check visual_semantics array for matching descriptions
  if (brief?.visual_semantics && brief.visual_semantics.length > 0) {
    // Check if any visual semantic description mentions this section
    for (const visual of brief.visual_semantics) {
      const desc = (visual.description || '').toLowerCase();
      if (desc.includes(sectionKey) || desc.includes(sectionHeading) ||
          sectionHeading.includes(desc.split(' ').slice(0, 3).join(' '))) {
        return true; // Brief planned an image related to this section
      }
    }
    // If brief has visual_semantics but none match, still allow based on count
    // If we have 4 planned images and 4 body sections, distribute images
    const plannedImageCount = brief.visual_semantics.length;
    if (plannedImageCount > 0 && sectionType === 'body') {
      // Body sections can get images to meet the planned count
      return true;
    }
  }

  // Fallback: Macro sections should have images (hero, concept diagrams)
  if (sectionType === 'macro') {
    return true;
  }

  // Fallback: Body sections with significant content should have images
  const content = section.current_content || '';
  const wordCount = content.split(/\s+/).length;

  // Sections with 200+ words could benefit from visual breaks
  return wordCount >= 200;
}

// Language-specific transition patterns for discourse detection
const TRANSITION_PATTERNS: Record<SupportedLanguage, RegExp> = {
  en: /^(This|These|The|As|When|While|Because|Since|After|Before|Although|However|Moreover|Furthermore|Additionally|In addition|For example|For instance|Therefore|Thus|Hence|Consequently|Based on|As mentioned|Following|Building on)/i,
  nl: /^(Dit|Deze|De|Het|Als|Wanneer|Terwijl|Omdat|Sinds|Na|Voor|Hoewel|Echter|Bovendien|Daarnaast|Bijvoorbeeld|Daarom|Dus|Daardoor|Vervolgens|Tenslotte|Hierbij|Hieronder|Hierboven|Op basis|Gebaseerd op|Zoals|Zoals genoemd|Volgend op|Voortbouwend|Om|Bij|In|Met|Een)/i,
  de: /^(Dies|Diese|Der|Die|Das|Als|Wenn|Während|Weil|Da|Seit|Nach|Vor|Obwohl|Jedoch|Außerdem|Zusätzlich|Zum Beispiel|Daher|Also|Folglich|Deshalb|Basierend auf|Wie erwähnt|Im Folgenden|Aufbauend auf|Um|Bei|In|Mit|Ein)/i,
  fr: /^(Ce|Cette|Ces|Le|La|Les|Comme|Quand|Pendant|Parce que|Depuis|Après|Avant|Bien que|Cependant|De plus|En outre|Par exemple|Donc|Ainsi|Par conséquent|Basé sur|Comme mentionné|Suite à|En s'appuyant sur|Pour|Dans|Avec|Un)/i,
  es: /^(Este|Esta|Estos|El|La|Los|Las|Como|Cuando|Mientras|Porque|Desde|Después|Antes|Aunque|Sin embargo|Además|Por ejemplo|Por lo tanto|Así|En consecuencia|Basado en|Como se mencionó|Siguiendo|A partir de|Para|En|Con|Un)/i
};

// Language-specific definition patterns (e.g., "X is/are...")
const DEFINITION_PATTERNS: Record<SupportedLanguage, RegExp> = {
  en: /^[A-Z][a-zA-ZÀ-ÿ\s]+\s+(is|are)\b/i,
  nl: /^[A-Z][a-zA-ZÀ-ÿ\s]+\s+(is|zijn|wordt|worden)\b/i,
  de: /^[A-Z][a-zA-ZÀ-ÿ\s]+\s+(ist|sind|bedeutet|heißt)\b/i,
  fr: /^[A-Z][a-zA-ZÀ-ÿ\s]+\s+(est|sont|signifie)\b/i,
  es: /^[A-Z][a-zA-ZÀ-ÿ\s]+\s+(es|son|significa)\b/i
};

/**
 * Detects the language of content from businessInfo or by analyzing the content.
 * Uses common word frequency to detect language if not explicitly set.
 */
function detectLanguage(sections: ContentGenerationSection[], businessInfo?: BusinessInfo): SupportedLanguage {
  // First try to get from businessInfo
  if (businessInfo?.language) {
    const lang = businessInfo.language.toLowerCase();
    if (lang.includes('dutch') || lang.includes('nederland') || lang === 'nl') return 'nl';
    if (lang.includes('german') || lang.includes('deutsch') || lang === 'de') return 'de';
    if (lang.includes('french') || lang.includes('français') || lang === 'fr') return 'fr';
    if (lang.includes('spanish') || lang.includes('español') || lang === 'es') return 'es';
    if (lang.includes('english') || lang === 'en') return 'en';
  }

  // Fallback: detect from content using common words
  const allContent = sections.map(s => s.current_content || '').join(' ').toLowerCase();
  if (!allContent || allContent.length < 100) return 'en'; // Default to English

  // Count language-specific common words
  const languageMarkers: Record<SupportedLanguage, RegExp> = {
    en: /\b(the|and|of|to|in|is|for|that|with|are|this|on|by|be|from)\b/gi,
    nl: /\b(de|het|een|van|en|in|is|dat|op|te|voor|met|zijn|wordt|ook|aan)\b/gi,
    de: /\b(der|die|das|und|ist|in|den|von|zu|mit|für|ein|eine|nicht|auf|werden)\b/gi,
    fr: /\b(le|la|les|de|et|en|est|un|une|du|que|pour|dans|des|sur|avec)\b/gi,
    es: /\b(el|la|los|las|de|en|que|y|es|un|una|del|para|con|por|se)\b/gi
  };

  const counts: Record<SupportedLanguage, number> = { en: 0, nl: 0, de: 0, fr: 0, es: 0 };

  for (const [lang, pattern] of Object.entries(languageMarkers) as [SupportedLanguage, RegExp][]) {
    const matches = allContent.match(pattern);
    counts[lang] = matches ? matches.length : 0;
  }

  // Find the language with the most matches
  const detected = (Object.entries(counts) as [SupportedLanguage, number][])
    .sort((a, b) => b[1] - a[1])[0][0];

  console.log(`[FormatBudgetAnalyzer] Detected language: ${detected} (word counts: ${JSON.stringify(counts)})`);
  return detected;
}

/**
 * Determines if a section needs discourse improvement (poor transitions).
 * Uses language-specific patterns for accurate detection.
 */
function needsDiscourseImprovement(section: ContentGenerationSection, language: SupportedLanguage): boolean {
  const content = section.current_content || '';
  if (!content || content.length < 100) return false;

  // First section never needs discourse improvement (no prior section to transition from)
  if (section.section_order === 0) return false;

  // Check for abrupt starts (no transition from previous content)
  const firstParagraph = content.split(/\n\n/)[0] || '';
  if (!firstParagraph) return false;

  // Get language-specific patterns
  const transitionPattern = TRANSITION_PATTERNS[language];
  const definitionPattern = DEFINITION_PATTERNS[language];

  // Check if section has a proper transition
  const hasTransition = transitionPattern.test(firstParagraph);

  // Check if section starts with a definition (acceptable start)
  const startsWithDefinition = definitionPattern.test(firstParagraph);

  // Section needs improvement only if:
  // 1. No transition words for this language
  // 2. Doesn't start with a clear definition pattern
  return !hasTransition && !startsWithDefinition;
}

// ============================================
// Content Format Detection Helpers
// ============================================

/**
 * Detects if content has list elements (ul/ol or markdown lists).
 */
function hasListContent(content: string): boolean {
  // HTML lists
  if (/<[ou]l[\s>]/i.test(content)) return true;

  // Markdown unordered lists (- or * at line start)
  if (/^[\s]*[-*]\s+\S/m.test(content)) return true;

  // Markdown ordered lists (1. at line start)
  if (/^[\s]*\d+\.\s+\S/m.test(content)) return true;

  return false;
}

/**
 * Detects if content has table elements.
 */
function hasTableContent(content: string): boolean {
  // HTML tables
  if (/<table[\s>]/i.test(content)) return true;

  // Markdown tables (pipe-separated with header row)
  if (/\|.+\|.*\n\|[-:|\s]+\|/m.test(content)) return true;

  return false;
}

/**
 * Detects if content has image elements.
 */
function hasImageContent(content: string): boolean {
  // HTML images
  if (/<img[\s>]/i.test(content)) return true;

  // Markdown images
  if (/!\[.*?\]\(.*?\)/.test(content)) return true;

  // Image placeholders
  if (/\[IMAGE:.*?\]/i.test(content)) return true;

  return false;
}

/**
 * Measures prose vs structured content character counts.
 */
function measureContentFormat(content: string): { proseChars: number; structuredChars: number } {
  if (!content) return { proseChars: 0, structuredChars: 0 };

  // Extract structured content (lists, tables)
  const structuredPatterns = [
    /<[ou]l[\s>][\s\S]*?<\/[ou]l>/gi,   // HTML lists
    /<table[\s>][\s\S]*?<\/table>/gi,   // HTML tables
    /^\s*[-*]\s+.+$/gm,                 // Markdown unordered lists
    /^\s*\d+\.\s+.+$/gm,                // Markdown ordered lists
    /\|.+\|/gm,                         // Markdown table rows
  ];

  let structuredContent = '';
  let workingContent = content;

  for (const pattern of structuredPatterns) {
    const matches = workingContent.match(pattern) || [];
    structuredContent += matches.join('');
    workingContent = workingContent.replace(pattern, '');
  }

  const structuredChars = structuredContent.length;
  const proseChars = workingContent.trim().length;

  return { proseChars, structuredChars };
}

/**
 * Gets a summary of the format budget for logging.
 */
export function formatBudgetSummary(budget: ContentFormatBudget): string {
  const { currentStats, constraints, sectionsNeedingOptimization } = budget;

  return [
    `Format Budget:`,
    `  Current: ${currentStats.sectionsWithLists}/${currentStats.totalSections} lists, ${currentStats.sectionsWithTables}/${currentStats.totalSections} tables`,
    `  Prose ratio: ${(currentStats.proseToStructuredRatio * 100).toFixed(0)}% (target: ${(constraints.targetProseRatio * 100).toFixed(0)}%)`,
    `  Budget remaining: ${constraints.maxListSections - currentStats.sectionsWithLists} lists, ${constraints.maxTableSections - currentStats.sectionsWithTables} tables`,
    `  Sections needing optimization:`,
    `    - Lists: ${sectionsNeedingOptimization.lists.length}`,
    `    - Tables: ${sectionsNeedingOptimization.tables.length}`,
    `    - Images: ${sectionsNeedingOptimization.images.length}`,
    `    - Discourse: ${sectionsNeedingOptimization.discourse.length}`,
  ].join('\n');
}
