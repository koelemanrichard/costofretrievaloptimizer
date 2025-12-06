// services/ai/schemaGeneration/schemaGenerator.ts
// Main schema generator orchestrator for Pass 9

import type {
  SchemaPageType,
  ContentBrief,
  BusinessInfo,
  SEOPillars,
  EnrichedTopic,
  ResolvedEntity,
  EntityCandidate,
  EnhancedSchemaResult,
  SchemaValidationResult,
  Pass9Config,
  ProgressiveSchemaData,
  DEFAULT_PASS9_CONFIG
} from '../../../types';
import {
  detectPageType,
  shouldUseBlogPosting,
  getSchemaTypesForPageType,
  getRichResultEligibility
} from '../schemaPageTypeDetector';
import {
  extractEntitiesFromBrief,
  prioritizeEntities,
  mergeEntityVariations
} from '../entityExtraction';
import {
  batchGetOrResolveEntities
} from '../../entityResolutionCache';
import {
  createOrganizationSchema,
  createPersonSchema,
  createWebSiteSchema,
  createBreadcrumbSchema,
  createArticleSchema,
  createFAQSchema,
  createHowToSchema,
  wrapInGraph,
  getSchemaId
} from '../../../config/schemaTemplates';

// Schema generation context
export interface SchemaGenerationContext {
  brief: ContentBrief;
  businessInfo: BusinessInfo;
  pillars: SEOPillars;
  topic?: EnrichedTopic;
  draftContent?: string;
  progressiveData?: ProgressiveSchemaData;
  url?: string;
  config: Pass9Config;
  supabaseUrl: string;
  supabaseKey: string;
  userId: string;
}

// Schema generation result before validation
interface RawSchemaResult {
  schema: object;
  pageType: SchemaPageType;
  detectedPageType: SchemaPageType;
  resolvedEntities: ResolvedEntity[];
  entityCandidates: EntityCandidate[];
  entitiesSkipped: string[];
  reasoning: string;
}

/**
 * Main schema generation function
 */
export async function generateSchema(
  context: SchemaGenerationContext
): Promise<EnhancedSchemaResult> {
  const startTime = Date.now();
  const config = { ...DEFAULT_PASS9_CONFIG, ...context.config };

  console.log('[SchemaGenerator] Starting schema generation...');

  // Step 1: Detect page type
  const { pageType: detectedType, confidence, reasoning: typeReasoning } = detectPageType(
    context.brief,
    context.topic,
    context.url,
    context.draftContent
  );

  // Use override if provided
  const pageType = config.pageType || detectedType;
  const pageTypeOverridden = !!config.pageType && config.pageType !== detectedType;

  console.log(`[SchemaGenerator] Page type: ${pageType} (detected: ${detectedType}, confidence: ${confidence})`);

  // Step 2: Extract entity candidates
  const entityCandidates = extractEntityCandidates(context);
  console.log(`[SchemaGenerator] Extracted ${entityCandidates.length} entity candidates`);

  // Step 3: Resolve entities (if enabled)
  let resolvedEntities: ResolvedEntity[] = [];
  let entitiesSkipped: string[] = [];

  if (config.includeEntities && entityCandidates.length > 0) {
    const result = await batchGetOrResolveEntities(
      context.supabaseUrl,
      context.supabaseKey,
      context.userId,
      entityCandidates,
      config.maxEntityResolutions
    );
    resolvedEntities = result.resolved;
    entitiesSkipped = result.failed;
    console.log(`[SchemaGenerator] Resolved ${resolvedEntities.length} entities, ${entitiesSkipped.length} skipped`);
  }

  // Step 4: Build schema graph
  const schema = buildSchemaGraph(
    pageType,
    context,
    resolvedEntities,
    config
  );

  // Step 5: Generate reasoning
  const reasoning = generateReasoning(
    pageType,
    detectedType,
    typeReasoning,
    resolvedEntities,
    schema
  );

  // Step 6: Get rich result eligibility
  const richResultInfo = getRichResultEligibility(pageType);

  // Step 7: Create basic validation result (full validation happens in validation pipeline)
  const basicValidation = createBasicValidation(schema);

  const result: EnhancedSchemaResult = {
    schema,
    schemaString: JSON.stringify(schema, null, 2),
    pageType,
    detectedPageType: detectedType,
    pageTypeOverridden,
    resolvedEntities,
    entityCandidates,
    entitiesSkipped,
    validation: basicValidation,
    reasoning,
    generatedAt: new Date().toISOString(),
    version: 1,
    configUsed: config,
    richResultTypes: richResultInfo.richResultTypes,
    richResultWarnings: richResultInfo.eligible ? [] : ['Page type may not be eligible for rich results']
  };

  console.log(`[SchemaGenerator] Schema generation completed in ${Date.now() - startTime}ms`);

  return result;
}

/**
 * Extract entity candidates from all available sources
 */
function extractEntityCandidates(context: SchemaGenerationContext): EntityCandidate[] {
  const candidates: EntityCandidate[] = [];

  // From brief metadata
  const briefEntities = extractEntitiesFromBrief(
    context.brief,
    context.businessInfo,
    context.pillars.centralEntity,
    context.pillars.sourceContext
  );
  candidates.push(...briefEntities);

  // From progressive data (if available)
  if (context.progressiveData?.entities) {
    for (const entity of context.progressiveData.entities) {
      if (!candidates.find(c => c.name.toLowerCase() === entity.toLowerCase())) {
        candidates.push({
          name: entity,
          type: 'Thing',
          context: '',
          mentions: 1,
          isMainEntity: false,
          role: 'mentioned'
        });
      }
    }
  }

  // Merge variations and prioritize
  const merged = mergeEntityVariations(candidates);
  return prioritizeEntities(merged, 15); // Top 15 candidates
}

/**
 * Build the complete schema graph
 */
function buildSchemaGraph(
  pageType: SchemaPageType,
  context: SchemaGenerationContext,
  resolvedEntities: ResolvedEntity[],
  config: Pass9Config
): object {
  const graphItems: object[] = [];
  const baseUrl = context.businessInfo.domain
    ? `https://${context.businessInfo.domain.replace(/^https?:\/\//, '')}`
    : 'https://example.com';
  const pageUrl = context.url || `${baseUrl}/${context.brief.slug}`;

  // 1. Organization schema (if enabled)
  if (config.includeOrganizationSchema) {
    const orgEntity = resolvedEntities.find(e => e.type === 'Organization');
    const orgSchema = createOrganizationSchema(
      context.businessInfo.projectName || 'Organization',
      baseUrl,
      undefined, // Logo URL would come from business info
      orgEntity?.sameAs || []
    );
    graphItems.push(orgSchema);
  }

  // 2. WebSite schema
  graphItems.push(createWebSiteSchema(
    context.businessInfo.projectName || 'Website',
    baseUrl,
    getSchemaId(baseUrl, 'organization')
  ));

  // 3. Author schema (if enabled and available)
  if (config.includeAuthorSchema) {
    const authorName = context.businessInfo.authorProfile?.name || context.businessInfo.authorName;
    if (authorName) {
      const authorEntity = resolvedEntities.find(e => e.type === 'Person' && e.name.toLowerCase() === authorName.toLowerCase());
      const authorSchema = createPersonSchema(
        authorName,
        context.businessInfo.authorProfile?.socialUrls?.[0],
        undefined,
        context.businessInfo.authorProfile?.credentials,
        getSchemaId(baseUrl, 'organization'),
        authorEntity?.sameAs || context.businessInfo.authorProfile?.socialUrls || []
      );
      graphItems.push(authorSchema);
    }
  }

  // 4. Breadcrumb schema (if enabled)
  if (config.includeBreadcrumb) {
    const breadcrumbItems = [
      { name: 'Home', url: baseUrl }
    ];

    // Add parent topic if available
    if (context.topic?.parent_topic_id && context.topic.title) {
      // In a real scenario, we'd look up the parent topic
      breadcrumbItems.push({ name: 'Topics', url: `${baseUrl}/topics` });
    }

    breadcrumbItems.push({ name: context.brief.title, url: pageUrl });

    graphItems.push(createBreadcrumbSchema(breadcrumbItems));
  }

  // 5. Main content schema based on page type
  const mainSchema = buildMainContentSchema(
    pageType,
    context,
    resolvedEntities,
    baseUrl,
    pageUrl
  );
  graphItems.push(mainSchema);

  // 6. Add entity schemas for significant entities
  for (const entity of resolvedEntities) {
    if (entity.type !== 'Organization' && entity.type !== 'Person') {
      // Only add entities that aren't already represented
      continue;
    }

    // Add 'mentions' or 'about' references
    if (entity.role === 'mentioned' || entity.role === 'about') {
      // These are handled as properties on the main schema
    }
  }

  return wrapInGraph('https://schema.org', graphItems);
}

/**
 * Build the main content schema based on page type
 */
function buildMainContentSchema(
  pageType: SchemaPageType,
  context: SchemaGenerationContext,
  resolvedEntities: ResolvedEntity[],
  baseUrl: string,
  pageUrl: string
): object {
  const authorId = getSchemaId(baseUrl, 'author', context.businessInfo.authorProfile?.name || context.businessInfo.authorName || 'author');
  const publisherId = getSchemaId(baseUrl, 'organization');
  const now = new Date().toISOString();

  // Extract FAQ questions if present
  const faqQuestions = extractFAQQuestions(context);

  // Extract HowTo steps if present
  const howToSteps = extractHowToSteps(context);

  // Determine if we should use BlogPosting
  const useBlogPosting = pageType === 'Article' && shouldUseBlogPosting(context.url, context.topic);
  const articleType = useBlogPosting ? 'BlogPosting' : pageType as 'Article' | 'BlogPosting' | 'NewsArticle';

  switch (pageType) {
    case 'Article':
    case 'BlogPosting':
    case 'NewsArticle': {
      const articleSchema = createArticleSchema(articleType, {
        headline: context.brief.title,
        description: context.brief.metaDescription,
        url: pageUrl,
        datePublished: now,
        dateModified: now,
        authorId,
        publisherId,
        imageUrl: context.brief.visuals?.featuredImagePrompt ? undefined : undefined, // Would need actual image URL
        wordCount: context.progressiveData?.wordCount || estimateWordCount(context.draftContent),
        articleSection: context.topic?.cluster_role === 'pillar' ? 'Guide' : undefined,
        keywords: context.progressiveData?.keywords || extractKeywords(context.brief),
        inLanguage: context.businessInfo.language || 'en'
      });

      // Add 'about' entities
      const aboutEntities = resolvedEntities.filter(e => e.role === 'about' || e.isMainEntity);
      if (aboutEntities.length > 0) {
        (articleSchema as any).about = aboutEntities.map(e => ({
          '@type': e.type,
          name: e.name,
          ...(e.sameAs?.length && { sameAs: e.sameAs })
        }));
      }

      // Add 'mentions' entities
      const mentionedEntities = resolvedEntities.filter(e => e.role === 'mentioned');
      if (mentionedEntities.length > 0) {
        (articleSchema as any).mentions = mentionedEntities.map(e => ({
          '@type': e.type,
          name: e.name,
          ...(e.sameAs?.length && { sameAs: e.sameAs })
        }));
      }

      // Add FAQ if detected in content
      if (faqQuestions.length >= 2) {
        (articleSchema as any).hasPart = createFAQSchema(faqQuestions);
      }

      // Add HowTo if detected in content
      if (howToSteps.length >= 3) {
        const howToSchema = createHowToSchema({
          name: context.brief.title,
          description: context.brief.metaDescription,
          steps: howToSteps
        });
        (articleSchema as any).hasPart = (articleSchema as any).hasPart
          ? [(articleSchema as any).hasPart, howToSchema]
          : howToSchema;
      }

      return articleSchema;
    }

    case 'FAQPage': {
      if (faqQuestions.length === 0) {
        // Generate FAQ from PAA if available
        const paaQuestions = context.brief.serpAnalysis?.peopleAlsoAsk?.slice(0, 5) || [];
        faqQuestions.push(...paaQuestions.map(q => ({
          question: q,
          answer: `[Answer for: ${q}]` // Placeholder - should be filled from content
        })));
      }
      return createFAQSchema(faqQuestions);
    }

    case 'HowTo': {
      return createHowToSchema({
        name: context.brief.title,
        description: context.brief.metaDescription,
        steps: howToSteps.length > 0 ? howToSteps : extractDefaultSteps(context.brief)
      });
    }

    case 'Product': {
      // Product schema would need more data from brief
      return {
        '@type': 'Product',
        '@id': `${pageUrl}#product`,
        name: context.brief.title,
        description: context.brief.metaDescription,
        url: pageUrl
      };
    }

    case 'ProfilePage': {
      return {
        '@type': 'ProfilePage',
        '@id': pageUrl,
        mainEntity: {
          '@type': 'Person',
          '@id': authorId
        }
      };
    }

    case 'CollectionPage': {
      return {
        '@type': 'CollectionPage',
        '@id': pageUrl,
        name: context.brief.title,
        description: context.brief.metaDescription,
        url: pageUrl
      };
    }

    case 'HomePage':
    case 'WebPage':
    default: {
      return {
        '@type': 'WebPage',
        '@id': pageUrl,
        url: pageUrl,
        name: context.brief.title,
        description: context.brief.metaDescription,
        isPartOf: {
          '@type': 'WebSite',
          '@id': getSchemaId(baseUrl, 'website')
        }
      };
    }
  }
}

/**
 * Extract FAQ questions from brief/content
 */
function extractFAQQuestions(
  context: SchemaGenerationContext
): Array<{ question: string; answer: string }> {
  const questions: Array<{ question: string; answer: string }> = [];

  // From People Also Ask
  if (context.brief.serpAnalysis?.peopleAlsoAsk) {
    for (const paa of context.brief.serpAnalysis.peopleAlsoAsk.slice(0, 5)) {
      questions.push({
        question: paa,
        answer: '' // Would be extracted from content
      });
    }
  }

  // From outline sections that are questions
  if (context.brief.structured_outline) {
    for (const section of context.brief.structured_outline) {
      if (section.heading.includes('?')) {
        questions.push({
          question: section.heading,
          answer: section.subordinate_text_hint || ''
        });
      }
    }
  }

  return questions;
}

/**
 * Extract HowTo steps from brief
 */
function extractHowToSteps(
  context: SchemaGenerationContext
): Array<{ name: string; text: string; imageUrl?: string }> {
  const steps: Array<{ name: string; text: string; imageUrl?: string }> = [];

  if (context.brief.structured_outline) {
    let stepNumber = 0;
    for (const section of context.brief.structured_outline) {
      // Check if section looks like a step
      if (/^step\s*\d+/i.test(section.heading) ||
          /^\d+\.\s/.test(section.heading) ||
          section.methodology_note?.toLowerCase().includes('step')) {
        stepNumber++;
        steps.push({
          name: section.heading.replace(/^step\s*\d+[:\s]*/i, '').replace(/^\d+\.\s*/, ''),
          text: section.subordinate_text_hint || section.heading
        });
      }
    }
  }

  return steps;
}

/**
 * Extract default steps from brief outline
 */
function extractDefaultSteps(
  brief: ContentBrief
): Array<{ name: string; text: string }> {
  if (!brief.structured_outline) return [];

  return brief.structured_outline
    .filter(s => s.level === 2)
    .slice(0, 8)
    .map((section, index) => ({
      name: section.heading,
      text: section.subordinate_text_hint || `Step ${index + 1}`
    }));
}

/**
 * Extract keywords from brief
 */
function extractKeywords(brief: ContentBrief): string[] {
  const keywords: string[] = [];

  if (brief.targetKeyword) {
    keywords.push(brief.targetKeyword);
  }

  // Add key takeaways as keywords
  if (brief.keyTakeaways) {
    keywords.push(...brief.keyTakeaways.slice(0, 5));
  }

  return keywords;
}

/**
 * Estimate word count from content
 */
function estimateWordCount(content?: string): number {
  if (!content) return 0;
  return content.split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Generate reasoning explanation
 */
function generateReasoning(
  pageType: SchemaPageType,
  detectedType: SchemaPageType,
  typeReasoning: string,
  resolvedEntities: ResolvedEntity[],
  schema: object
): string {
  const parts: string[] = [];

  parts.push(`Page Type: ${pageType}`);
  if (pageType !== detectedType) {
    parts.push(`(Overridden from detected type: ${detectedType})`);
  }
  parts.push(typeReasoning);

  if (resolvedEntities.length > 0) {
    parts.push(`\nResolved ${resolvedEntities.length} entities to external knowledge bases:`);
    for (const entity of resolvedEntities.slice(0, 5)) {
      parts.push(`- ${entity.name} (${entity.type}): ${entity.wikidataId || 'AI inferred'}`);
    }
  }

  const graphItems = (schema as any)['@graph'];
  if (graphItems) {
    parts.push(`\nSchema graph contains ${graphItems.length} items`);
  }

  return parts.join('\n');
}

/**
 * Create basic validation result
 */
function createBasicValidation(schema: object): SchemaValidationResult {
  const errors: any[] = [];
  const warnings: any[] = [];

  // Basic JSON structure check
  try {
    JSON.stringify(schema);
  } catch {
    errors.push({
      path: '/',
      message: 'Invalid JSON structure',
      severity: 'error',
      category: 'syntax',
      autoFixable: false
    });
  }

  // Check for @context
  if (!(schema as any)['@context']) {
    errors.push({
      path: '/@context',
      message: 'Missing @context',
      severity: 'error',
      category: 'schema_org',
      autoFixable: true
    });
  }

  // Check for @graph or @type
  if (!(schema as any)['@graph'] && !(schema as any)['@type']) {
    errors.push({
      path: '/',
      message: 'Schema must have @graph or @type',
      severity: 'error',
      category: 'schema_org',
      autoFixable: false
    });
  }

  return {
    isValid: errors.length === 0,
    overallScore: errors.length === 0 ? 80 : 40, // Basic score, full validation adds more
    syntaxErrors: errors.filter(e => e.category === 'syntax'),
    schemaOrgErrors: errors.filter(e => e.category === 'schema_org'),
    contentParityErrors: [],
    eavConsistencyErrors: [],
    entityErrors: [],
    warnings,
    autoFixApplied: false,
    autoFixChanges: [],
    autoFixIterations: 0,
    externalValidationRun: false
  };
}
