/**
 * Visual Semantics Service
 * Implementation of Koray's "Pixels, Letters, and Bytes" Framework
 *
 * Analyzes and generates visual semantic specifications for content briefs,
 * including alt text generation, file naming, HTML templates, and Image N-gram analysis.
 */

import type {
  ContentBrief,
  BriefSection,
  VisualSemanticAnalysis,
  BriefVisualSemantics,
  AltTextValidationResult,
  FileNameValidationResult,
  VisualSemanticsValidationResult,
  ImageOptimizationSpec,
  VisualSemanticRuleType,
  SemanticTriple,
} from '../types';
import {
  ALT_TEXT_RULES,
  FILE_NAMING_RULES,
  DEFAULT_IMAGE_SPECS,
  HERO_IMAGE_SPECS,
  SEMANTIC_IMAGE_TEMPLATE,
  HERO_IMAGE_TEMPLATE,
  IMAGE_NGRAM_BY_INTENT,
  generateRecommendedFilename,
  generateImageHTML,
} from '../config/visualSemantics';

// =============================================================================
// ALT TEXT GENERATION & VALIDATION
// =============================================================================

/**
 * Generate optimized alt text for an image
 */
export function generateAltText(
  imageDescription: string,
  topicEntities: string[],
  searchIntent: string,
  context?: string
): string {
  // Start with the image description
  let altText = imageDescription;

  // Ensure at least one entity is mentioned
  const hasEntity = topicEntities.some(entity =>
    altText.toLowerCase().includes(entity.toLowerCase())
  );

  if (!hasEntity && topicEntities.length > 0) {
    // Prepend the primary entity
    altText = `${topicEntities[0]} - ${altText}`;
  }

  // Add context if provided and not already present
  if (context && !altText.toLowerCase().includes(context.toLowerCase())) {
    altText = `${altText} ${context}`;
  }

  // Clean up
  altText = altText
    .replace(/\s+/g, ' ')
    .replace(/\s*-\s*-\s*/g, ' - ')
    .trim();

  // Ensure reasonable length (Google recommends under 125 characters)
  if (altText.length > 125) {
    altText = altText.substring(0, 122) + '...';
  }

  return altText;
}

/**
 * Validate alt text against rules
 */
export function validateAltText(
  altText: string,
  topicEntities: string[],
  searchIntent: string
): AltTextValidationResult {
  const issues: AltTextValidationResult['issues'] = [];
  let score = 100;

  // Rule: Entity Presence
  const hasEntity = topicEntities.some(entity =>
    altText.toLowerCase().includes(entity.toLowerCase())
  );
  if (!hasEntity) {
    issues.push({
      rule_id: 'alt-entity',
      message: 'Alt text should contain at least one topic entity',
      severity: 'error',
    });
    score -= 25;
  }

  // Rule: No Keyword Stuffing
  const words = altText.toLowerCase().split(/\s+/);
  const wordCounts = new Map<string, number>();
  for (const word of words) {
    if (word.length > 3) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }
  }
  const stuffedWords = Array.from(wordCounts.entries()).filter(([_, count]) => count > 2);
  const keywordStuffing = stuffedWords.length > 0;
  if (keywordStuffing) {
    issues.push({
      rule_id: 'alt-no-stuffing',
      message: `Repeated words detected: ${stuffedWords.map(([w]) => w).join(', ')}`,
      severity: 'error',
    });
    score -= 15;
  }

  // Rule: Reasonable Length
  if (altText.length < 10) {
    issues.push({
      rule_id: 'alt-content-purpose',
      message: 'Alt text too short - should describe image content',
      severity: 'warning',
    });
    score -= 10;
  }

  if (altText.length > 150) {
    issues.push({
      rule_id: 'alt-accessibility',
      message: 'Alt text too long - may be truncated by screen readers',
      severity: 'warning',
    });
    score -= 5;
  }

  // Rule: Natural Language Flow
  const unnaturalPatterns = [
    /^[A-Z][a-z]+(?:\s[A-Z][a-z]+){4,}$/,  // All Title Case words
    /\|/,  // Pipe separators
    /,\s*,/,  // Double commas
  ];
  const isUnnatural = unnaturalPatterns.some(pattern => pattern.test(altText));
  if (isUnnatural) {
    issues.push({
      rule_id: 'alt-natural',
      message: 'Alt text should flow naturally without forced formatting',
      severity: 'warning',
    });
    score -= 10;
  }

  // Calculate entity coverage
  const entityCoverage = topicEntities.length > 0
    ? topicEntities.filter(e => altText.toLowerCase().includes(e.toLowerCase())).length / topicEntities.length
    : 0;

  return {
    is_valid: score >= 70 && !issues.some(i => i.severity === 'error'),
    score: Math.max(0, score),
    issues,
    suggestions: generateAltTextSuggestions(issues, topicEntities),
    entity_coverage: entityCoverage * 100,
    keyword_stuffing_detected: keywordStuffing,
  };
}

function generateAltTextSuggestions(
  issues: AltTextValidationResult['issues'],
  entities: string[]
): string[] {
  const suggestions: string[] = [];

  for (const issue of issues) {
    switch (issue.rule_id) {
      case 'alt-entity':
        suggestions.push(`Add entity "${entities[0]}" to describe what's shown in the image`);
        break;
      case 'alt-no-stuffing':
        suggestions.push('Remove repeated keywords and describe the image naturally');
        break;
      case 'alt-content-purpose':
        suggestions.push('Expand description to explain both what the image shows and why it\'s relevant');
        break;
      case 'alt-natural':
        suggestions.push('Rewrite as a natural sentence describing the image');
        break;
    }
  }

  return suggestions;
}

// =============================================================================
// FILE NAMING
// =============================================================================

/**
 * Validate a file name against rules
 */
export function validateFileName(
  fileName: string,
  topicEntities: string[],
  altText?: string
): FileNameValidationResult {
  const issues: string[] = [];

  // Check for hyphens
  if (fileName.includes('_') || fileName.includes(' ')) {
    issues.push('Use hyphens (-) instead of underscores or spaces');
  }

  // Check for entity
  const hasEntity = topicEntities.some(entity =>
    fileName.toLowerCase().includes(entity.toLowerCase().replace(/\s+/g, '-'))
  );
  if (!hasEntity && topicEntities.length > 0) {
    issues.push('File name should include primary entity keyword');
  }

  // Check for generic names
  const genericPatterns = ['img', 'image', 'photo', 'screenshot', 'picture', 'untitled'];
  const isGeneric = genericPatterns.some(pattern =>
    fileName.toLowerCase().startsWith(pattern)
  );
  if (isGeneric) {
    issues.push('Avoid generic file names - use descriptive entity-based names');
  }

  // Check pattern structure
  const parts = fileName.replace(/\.[^.]+$/, '').split('-');
  const patternMatch = parts.length >= 2;
  if (!patternMatch) {
    issues.push('Follow [entity]-[descriptor]-[context] pattern');
  }

  // Check alt text match
  let altMatch = true;
  if (altText) {
    const fileWords = new Set(fileName.toLowerCase().replace(/\.[^.]+$/, '').split('-'));
    const altWords = new Set(altText.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const sharedWords = Array.from(fileWords).filter(w => altWords.has(w));
    altMatch = sharedWords.length >= 1;
    if (!altMatch) {
      issues.push('File name should share vocabulary with alt text');
    }
  }

  // Generate recommended name
  const primaryEntity = topicEntities[0] || 'image';
  const context = altText?.split(' ').slice(-2).join('-') || 'content';
  const recommendedName = generateRecommendedFilename(primaryEntity, 'visual', context, 'avif');

  return {
    is_valid: issues.length === 0,
    original_name: fileName,
    recommended_name: recommendedName,
    issues,
    pattern_match: patternMatch,
  };
}

/**
 * Generate a file name from entities and description
 */
export function generateFileName(
  primaryEntity: string,
  descriptor: string,
  context: string,
  format: string = 'avif'
): string {
  return generateRecommendedFilename(primaryEntity, descriptor, context, format);
}

// =============================================================================
// IMAGE ANALYSIS FOR BRIEFS
// =============================================================================

/**
 * Analyze image requirements for a content brief
 */
export function analyzeImageRequirements(
  brief: ContentBrief,
  searchIntent: string = 'informational'
): BriefVisualSemantics {
  // Extract entities from brief
  const entities = extractEntitiesFromBrief(brief);
  const primaryEntity = entities[0] || brief.targetKeyword || brief.title;

  // Get expected image types from search intent
  const imageNGrams = IMAGE_NGRAM_BY_INTENT[searchIntent] || IMAGE_NGRAM_BY_INTENT.informational;

  // Generate hero image specification
  const heroImage = generateHeroImageSpec(brief, entities, imageNGrams);

  // Generate section images
  // Skip intro section since hero image already covers it (prevents duplicate images)
  const sectionImages: Record<string, VisualSemanticAnalysis> = {};
  const sections = brief.structured_outline || [];

  for (let i = 0; i < sections.length && i < 5; i++) {
    const section = sections[i];
    const sectionKey = section.key || `section-${i}`;
    const isIntroSection = sectionKey === 'intro' ||
      sectionKey.toLowerCase().includes('intro') ||
      i === 0 && section.heading?.toLowerCase().includes('introduction');

    // Skip intro section - hero image already covers it
    if (isIntroSection) {
      continue;
    }

    if (section.heading) {
      sectionImages[sectionKey] = generateSectionImageSpec(
        section,
        entities,
        primaryEntity,
        imageNGrams
      );
    }
  }

  // Determine visual hierarchy
  const sectionIds = Object.keys(sectionImages);
  const visualHierarchy = {
    above_fold: ['hero', sectionIds[0]].filter(Boolean) as string[],
    centerpiece: 'hero',
    supporting: sectionIds.slice(1),
  };

  return {
    hero_image: heroImage,
    section_images: sectionImages,
    image_n_grams: imageNGrams,
    total_images_recommended: 1 + Math.min(sections.length, 5),
    visual_hierarchy: visualHierarchy,
    brand_alignment: {
      uses_brand_colors: true,
      has_logo_placement: true,
      consistent_style: true,
    },
  };
}

function extractEntitiesFromBrief(brief: ContentBrief): string[] {
  const entities: string[] = [];

  // From target keyword
  if (brief.targetKeyword) {
    entities.push(brief.targetKeyword);
  }

  // From contextual vectors
  if (brief.contextualVectors) {
    for (const triple of brief.contextualVectors) {
      if (triple.subject?.label) entities.push(triple.subject.label);
      if (typeof triple.object?.value === 'string') entities.push(triple.object.value);
    }
  }

  // From title
  if (brief.title) {
    entities.push(brief.title);
  }

  // Deduplicate
  return [...new Set(entities)].slice(0, 5);
}

function generateHeroImageSpec(
  brief: ContentBrief,
  entities: string[],
  imageNGrams: string[]
): VisualSemanticAnalysis {
  const primaryEntity = entities[0] || brief.title;
  const searchIntent = brief.searchIntent || 'informational';

  // PHOTOGRAPHIC-FIRST: Hero image should always be a scene photograph
  // Never use illustration/infographic/diagram for hero - AI cannot render text well
  const heroImageType = 'scene photograph';

  // Create a photographic description that AI can render well (no text elements)
  const description = `Professional ${heroImageType} representing ${primaryEntity} in a business context - visually compelling without any text overlays`;
  const altText = generateAltText(description, entities, searchIntent);
  const fileName = generateFileName(primaryEntity, 'hero', 'featured', 'avif');

  return {
    image_description: description,
    alt_text_recommendation: altText,
    title_attribute: `${primaryEntity} - ${brief.title}`,
    file_name_recommendation: fileName,
    placement_context: 'Hero image above the fold, immediately after H1',
    entity_connections: entities.slice(0, 3),
    format_recommendation: HERO_IMAGE_SPECS,
    html_template: generateImageHTML(HERO_IMAGE_TEMPLATE, {
      path: `/images/${fileName.replace('.avif', '')}`,
      alt_text: altText,
      title: `${primaryEntity} visual`,
      width: HERO_IMAGE_SPECS.max_width,
      height: Math.round(HERO_IMAGE_SPECS.max_width * 0.5625), // 16:9
      caption: `${primaryEntity} - Professional photograph`,
    }),
    figcaption_text: `${primaryEntity}: Visual representation for ${brief.title}`,
    n_gram_match: [heroImageType],
    centerpiece_alignment: 100,
  };
}

function generateSectionImageSpec(
  section: BriefSection,
  entities: string[],
  primaryEntity: string,
  imageNGrams: string[]
): VisualSemanticAnalysis {
  const sectionTopic = section.heading;
  const suggestedType = determineSectionImageType(section, imageNGrams);

  // PHOTOGRAPHIC-FIRST: Create descriptions that AI can render well (no text elements)
  const description = `${suggestedType} visualizing ${sectionTopic} - photorealistic without text overlays or labels`;
  const altText = generateAltText(description, [primaryEntity, sectionTopic], 'informational');
  const fileName = generateFileName(primaryEntity, slugifySection(sectionTopic), 'section', 'avif');

  return {
    image_description: description,
    alt_text_recommendation: altText,
    title_attribute: sectionTopic,
    file_name_recommendation: fileName,
    placement_context: `Within ${sectionTopic} section, after the opening paragraph`,
    entity_connections: [primaryEntity, sectionTopic].filter(Boolean),
    format_recommendation: DEFAULT_IMAGE_SPECS,
    html_template: generateImageHTML(SEMANTIC_IMAGE_TEMPLATE, {
      path: `/images/${fileName.replace('.avif', '')}`,
      alt_text: altText,
      title: sectionTopic,
      width: DEFAULT_IMAGE_SPECS.max_width,
      height: Math.round(DEFAULT_IMAGE_SPECS.max_width * 0.75), // 4:3
      caption: sectionTopic,
    }),
    figcaption_text: sectionTopic,
    n_gram_match: [suggestedType],
    centerpiece_alignment: 80,
  };
}

/**
 * PHOTOGRAPHIC-FIRST: Determine section image type
 *
 * AI image generators (DALL-E, Gemini) are poor at rendering text.
 * This function now returns PHOTOGRAPHIC types instead of text-heavy infographics/charts.
 *
 * Migration from old types:
 * - "step-by-step illustration" → "action photograph showing process"
 * - "comparison chart" → "comparison photograph (side by side)"
 * - "infographic" → "concept photograph"
 * - "diagram" → "minimal flowchart" (shapes only, no labels)
 */
function determineSectionImageType(section: BriefSection, imageNGrams: string[]): string {
  const heading = section.heading.toLowerCase();

  // PHOTOGRAPHIC-FIRST mappings (no text-heavy types)
  if (heading.includes('how') || heading.includes('step') || heading.includes('process') || heading.includes('hoe')) {
    return 'action photograph showing process steps';
  }
  if (heading.includes('compare') || heading.includes('vs') || heading.includes('difference') || heading.includes('vergelijk')) {
    return 'comparison photograph (side by side objects)';
  }
  if (heading.includes('benefit') || heading.includes('advantage') || heading.includes('feature') || heading.includes('voordeel')) {
    return 'concept photograph representing benefits';
  }
  if (heading.includes('example') || heading.includes('case') || heading.includes('voorbeeld')) {
    return 'scene photograph showing real-world application';
  }
  if (heading.includes('product') || heading.includes('tool') || heading.includes('equipment')) {
    return 'object photograph showing product details';
  }
  if (heading.includes('team') || heading.includes('expert') || heading.includes('professional')) {
    return 'portrait photograph of professional';
  }

  // Default to photographic type from imageNGrams (which are now photographic)
  // Filter out any legacy text-heavy types that might still be in the array
  const photographicTypes = imageNGrams.filter(type =>
    type.includes('photograph') ||
    type.includes('photo') ||
    type.includes('scene') ||
    type.includes('object') ||
    type.includes('action') ||
    type.includes('concept') ||
    type.includes('portrait')
  );

  if (photographicTypes.length > 0) {
    return photographicTypes[Math.floor(Math.random() * photographicTypes.length)];
  }

  // Fallback to generic scene photograph (never return diagram/infographic/chart)
  return 'scene photograph representing the concept';
}

function slugifySection(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 30);
}

// =============================================================================
// FULL VALIDATION
// =============================================================================

/**
 * Validate all visual semantics for a brief
 */
export function validateBriefVisualSemantics(
  brief: ContentBrief,
  visualSemantics: BriefVisualSemantics
): VisualSemanticsValidationResult {
  const issues: VisualSemanticsValidationResult['issues'] = [];
  const entities = extractEntitiesFromBrief(brief);

  // Validate hero image
  const heroValidation = validateAltText(
    visualSemantics.hero_image.alt_text_recommendation,
    entities,
    brief.searchIntent || 'informational'
  );

  const heroScore = heroValidation.score;
  for (const issue of heroValidation.issues) {
    issues.push({
      image_id: 'hero',
      issue_type: 'alt_text',
      message: issue.message,
      severity: issue.severity === 'error' ? 'error' : 'warning',
      auto_fixable: issue.rule_id === 'alt-entity',
    });
  }

  // Validate section images
  let sectionScoreSum = 0;
  let sectionCount = 0;

  for (const [id, spec] of Object.entries(visualSemantics.section_images)) {
    const validation = validateAltText(spec.alt_text_recommendation, entities, 'informational');
    sectionScoreSum += validation.score;
    sectionCount++;

    for (const issue of validation.issues) {
      issues.push({
        image_id: id,
        issue_type: 'alt_text',
        message: issue.message,
        severity: issue.severity === 'error' ? 'error' : 'warning',
        auto_fixable: issue.rule_id === 'alt-entity',
      });
    }
  }

  const sectionImagesScore = sectionCount > 0 ? sectionScoreSum / sectionCount : 100;

  // Calculate N-gram alignment
  const expectedNGrams = new Set(visualSemantics.image_n_grams);
  const actualNGrams = new Set([
    ...visualSemantics.hero_image.n_gram_match,
    ...Object.values(visualSemantics.section_images).flatMap(s => s.n_gram_match),
  ]);
  const nGramMatch = Array.from(expectedNGrams).filter(ng => actualNGrams.has(ng)).length;
  const nGramAlignmentScore = expectedNGrams.size > 0
    ? (nGramMatch / expectedNGrams.size) * 100
    : 100;

  // Calculate centerpiece alignment
  const centerpieceAlignmentScore = visualSemantics.hero_image.centerpiece_alignment;

  // Overall score
  const overallScore = Math.round(
    (heroScore * 0.4) +
    (sectionImagesScore * 0.3) +
    (nGramAlignmentScore * 0.2) +
    (centerpieceAlignmentScore * 0.1)
  );

  // Generate recommendations
  const recommendations: string[] = [];
  if (heroScore < 80) {
    recommendations.push('Improve hero image alt text to include primary entity');
  }
  if (sectionImagesScore < 80) {
    recommendations.push('Review section image alt texts for entity coverage');
  }
  if (nGramAlignmentScore < 70) {
    recommendations.push('Image types don\'t match SERP expectations - consider different visual formats');
  }

  return {
    overall_score: overallScore,
    hero_image_score: heroScore,
    section_images_score: sectionImagesScore,
    n_gram_alignment_score: nGramAlignmentScore,
    centerpiece_alignment_score: centerpieceAlignmentScore,
    issues,
    recommendations,
  };
}

// =============================================================================
// HTML GENERATION
// =============================================================================

/**
 * Generate complete HTML snippets for all images in a brief
 */
export function generateBriefImageHTML(
  visualSemantics: BriefVisualSemantics
): Record<string, string> {
  const htmlSnippets: Record<string, string> = {
    hero: visualSemantics.hero_image.html_template,
  };

  for (const [id, spec] of Object.entries(visualSemantics.section_images)) {
    htmlSnippets[id] = spec.html_template;
  }

  return htmlSnippets;
}

/**
 * Export visual semantics data for a brief (for exports)
 */
export function exportVisualSemanticsData(
  visualSemantics: BriefVisualSemantics
): Record<string, any>[] {
  const rows: Record<string, any>[] = [];

  // Hero image
  rows.push({
    image_id: 'hero',
    type: 'Hero',
    alt_text: visualSemantics.hero_image.alt_text_recommendation,
    file_name: visualSemantics.hero_image.file_name_recommendation,
    placement: visualSemantics.hero_image.placement_context,
    format: visualSemantics.hero_image.format_recommendation.recommended_format,
    width: visualSemantics.hero_image.format_recommendation.max_width,
    entities: visualSemantics.hero_image.entity_connections.join(', '),
  });

  // Section images
  for (const [id, spec] of Object.entries(visualSemantics.section_images)) {
    rows.push({
      image_id: id,
      type: 'Section',
      alt_text: spec.alt_text_recommendation,
      file_name: spec.file_name_recommendation,
      placement: spec.placement_context,
      format: spec.format_recommendation.recommended_format,
      width: spec.format_recommendation.max_width,
      entities: spec.entity_connections.join(', '),
    });
  }

  return rows;
}
