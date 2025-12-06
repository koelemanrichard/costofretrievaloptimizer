// services/ai/schemaGeneration/schemaValidator.ts
// Comprehensive schema validation pipeline

import type {
  SchemaValidationResult,
  SchemaValidationError,
  SchemaValidationWarning,
  ContentBrief,
  SemanticTriple,
  ResolvedEntity
} from '../../../types';
import { SCHEMA_TEMPLATES } from '../../../config/schemaTemplates';

// Schema.org type hierarchy for validation
const SCHEMA_ORG_TYPES = new Set([
  'Article', 'BlogPosting', 'NewsArticle', 'TechArticle',
  'Product', 'Offer', 'AggregateRating', 'Review',
  'Organization', 'Corporation', 'LocalBusiness',
  'Person', 'ProfilePage',
  'WebPage', 'WebSite', 'CollectionPage', 'FAQPage', 'HowTo',
  'Question', 'Answer', 'HowToStep', 'HowToSection',
  'BreadcrumbList', 'ListItem', 'ItemList',
  'ImageObject', 'VideoObject',
  'Place', 'PostalAddress', 'GeoCoordinates',
  'Event', 'Thing', 'CreativeWork',
  'MonetaryAmount', 'QuantitativeValue'
]);

// Required properties by type
const REQUIRED_PROPERTIES: Record<string, string[]> = {
  Article: ['headline', 'author', 'publisher', 'datePublished'],
  BlogPosting: ['headline', 'author', 'publisher', 'datePublished'],
  NewsArticle: ['headline', 'author', 'publisher', 'datePublished', 'dateline'],
  Product: ['name', 'image'],
  FAQPage: ['mainEntity'],
  HowTo: ['name', 'step'],
  Organization: ['name'],
  Person: ['name'],
  WebPage: ['name'],
  WebSite: ['name', 'url'],
  BreadcrumbList: ['itemListElement'],
  Offer: ['price', 'priceCurrency'],
  Question: ['name', 'acceptedAnswer'],
  Answer: ['text'],
  HowToStep: ['text'],
  ImageObject: ['url']
};

// ============================================================================
// MAIN VALIDATION FUNCTION
// ============================================================================

/**
 * Run full validation pipeline on a schema
 */
export async function validateSchema(
  schema: object,
  brief: ContentBrief,
  draftContent?: string,
  eavs?: SemanticTriple[],
  resolvedEntities?: ResolvedEntity[],
  runExternalValidation: boolean = false
): Promise<SchemaValidationResult> {
  const errors: SchemaValidationError[] = [];
  const warnings: SchemaValidationWarning[] = [];

  // 1. Syntax validation
  const syntaxErrors = validateSyntax(schema);
  errors.push(...syntaxErrors);

  // 2. Schema.org compliance validation
  const schemaOrgErrors = validateSchemaOrg(schema);
  errors.push(...schemaOrgErrors);

  // 3. Content parity validation
  const parityErrors = validateContentParity(schema, brief, draftContent);
  errors.push(...parityErrors);

  // 4. EAV consistency validation
  if (eavs?.length) {
    const eavErrors = validateEavConsistency(schema, eavs);
    errors.push(...eavErrors);
  }

  // 5. Entity validation
  if (resolvedEntities?.length) {
    const entityErrors = validateEntities(schema, resolvedEntities);
    errors.push(...entityErrors);
  }

  // 6. Best practices warnings
  const bestPracticeWarnings = checkBestPractices(schema, brief);
  warnings.push(...bestPracticeWarnings);

  // 7. External validation (optional)
  let externalResult: { source: string; isValid: boolean; errors: string[] } | undefined;
  if (runExternalValidation) {
    externalResult = await runExternalSchemaValidation(schema);
    if (externalResult && !externalResult.isValid) {
      for (const err of externalResult.errors) {
        errors.push({
          path: '/',
          message: err,
          severity: 'error',
          category: 'schema_org',
          autoFixable: false
        });
      }
    }
  }

  // Calculate overall score
  const overallScore = calculateValidationScore(errors, warnings);

  return {
    isValid: errors.filter(e => e.severity === 'error').length === 0,
    overallScore,
    syntaxErrors: errors.filter(e => e.category === 'syntax'),
    schemaOrgErrors: errors.filter(e => e.category === 'schema_org'),
    contentParityErrors: errors.filter(e => e.category === 'content_parity'),
    eavConsistencyErrors: errors.filter(e => e.category === 'eav_consistency'),
    entityErrors: errors.filter(e => e.category === 'entity'),
    warnings,
    autoFixApplied: false,
    autoFixChanges: [],
    autoFixIterations: 0,
    externalValidationRun: runExternalValidation,
    externalValidationResult: externalResult
  };
}

// ============================================================================
// SYNTAX VALIDATION
// ============================================================================

function validateSyntax(schema: object): SchemaValidationError[] {
  const errors: SchemaValidationError[] = [];

  // Check if it's valid JSON (should already be if we got here)
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
    return errors;
  }

  // Check for @context
  if (!(schema as any)['@context']) {
    errors.push({
      path: '/@context',
      message: 'Missing @context property',
      severity: 'error',
      category: 'syntax',
      suggestion: 'Add "@context": "https://schema.org"',
      autoFixable: true
    });
  } else if ((schema as any)['@context'] !== 'https://schema.org') {
    errors.push({
      path: '/@context',
      message: 'Invalid @context value',
      severity: 'warning',
      category: 'syntax',
      suggestion: 'Use "https://schema.org" as the @context',
      autoFixable: true
    });
  }

  // Check for @graph or @type
  const hasGraph = !!(schema as any)['@graph'];
  const hasType = !!(schema as any)['@type'];

  if (!hasGraph && !hasType) {
    errors.push({
      path: '/',
      message: 'Schema must have either @graph (for multiple items) or @type (for single item)',
      severity: 'error',
      category: 'syntax',
      autoFixable: false
    });
  }

  // Validate @graph items
  if (hasGraph) {
    const graph = (schema as any)['@graph'];
    if (!Array.isArray(graph)) {
      errors.push({
        path: '/@graph',
        message: '@graph must be an array',
        severity: 'error',
        category: 'syntax',
        autoFixable: false
      });
    } else {
      graph.forEach((item: any, index: number) => {
        if (!item['@type']) {
          errors.push({
            path: `/@graph[${index}]`,
            message: 'Graph item missing @type',
            severity: 'error',
            category: 'syntax',
            autoFixable: false
          });
        }
      });
    }
  }

  return errors;
}

// ============================================================================
// SCHEMA.ORG VALIDATION
// ============================================================================

function validateSchemaOrg(schema: object): SchemaValidationError[] {
  const errors: SchemaValidationError[] = [];

  // Get all items to validate
  const items = (schema as any)['@graph'] || [schema];

  for (const item of items) {
    const type = item['@type'];

    // Validate type exists
    if (!type) continue;

    // Check if type is valid Schema.org type
    if (!SCHEMA_ORG_TYPES.has(type)) {
      errors.push({
        path: getItemPath(item),
        message: `Unknown Schema.org type: ${type}`,
        severity: 'warning',
        category: 'schema_org',
        autoFixable: false
      });
    }

    // Check required properties
    const requiredProps = REQUIRED_PROPERTIES[type] || [];
    for (const prop of requiredProps) {
      if (!item[prop]) {
        errors.push({
          path: `${getItemPath(item)}/${prop}`,
          message: `Missing required property "${prop}" for ${type}`,
          severity: 'error',
          category: 'schema_org',
          suggestion: `Add the "${prop}" property`,
          autoFixable: false
        });
      }
    }

    // Validate nested types
    validateNestedItems(item, errors, getItemPath(item));
  }

  return errors;
}

function validateNestedItems(
  item: any,
  errors: SchemaValidationError[],
  parentPath: string
): void {
  for (const [key, value] of Object.entries(item)) {
    if (key.startsWith('@')) continue;

    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        value.forEach((v: any, index: number) => {
          if (typeof v === 'object' && v !== null && v['@type']) {
            validateNestedItems(v, errors, `${parentPath}/${key}[${index}]`);
          }
        });
      } else if ((value as any)['@type']) {
        validateNestedItems(value, errors, `${parentPath}/${key}`);
      }
    }
  }
}

function getItemPath(item: any): string {
  if (item['@id']) return item['@id'];
  if (item['@type']) return `/${item['@type']}`;
  return '/';
}

// ============================================================================
// CONTENT PARITY VALIDATION
// ============================================================================

function validateContentParity(
  schema: object,
  brief: ContentBrief,
  draftContent?: string
): SchemaValidationError[] {
  const errors: SchemaValidationError[] = [];

  // Find article/content item
  const items = (schema as any)['@graph'] || [schema];
  const articleItem = items.find((item: any) =>
    ['Article', 'BlogPosting', 'NewsArticle', 'WebPage'].includes(item['@type'])
  );

  if (!articleItem) return errors;

  // Check headline matches title
  if (articleItem.headline && articleItem.headline !== brief.title) {
    const similarity = calculateSimilarity(articleItem.headline, brief.title);
    if (similarity < 0.8) {
      errors.push({
        path: `${getItemPath(articleItem)}/headline`,
        message: `Headline "${articleItem.headline}" doesn't match brief title "${brief.title}"`,
        severity: 'warning',
        category: 'content_parity',
        suggestion: `Update headline to match: "${brief.title}"`,
        autoFixable: true
      });
    }
  }

  // Check description matches meta description
  if (articleItem.description && brief.metaDescription) {
    const similarity = calculateSimilarity(articleItem.description, brief.metaDescription);
    if (similarity < 0.7) {
      errors.push({
        path: `${getItemPath(articleItem)}/description`,
        message: 'Schema description differs significantly from meta description',
        severity: 'warning',
        category: 'content_parity',
        suggestion: 'Align schema description with meta description',
        autoFixable: true
      });
    }
  }

  // Check word count if we have draft content
  if (draftContent && articleItem.wordCount) {
    const actualWordCount = draftContent.split(/\s+/).filter(w => w.length > 0).length;
    const schemaWordCount = articleItem.wordCount;
    const difference = Math.abs(actualWordCount - schemaWordCount) / actualWordCount;

    if (difference > 0.1) { // More than 10% difference
      errors.push({
        path: `${getItemPath(articleItem)}/wordCount`,
        message: `Schema wordCount (${schemaWordCount}) differs from actual (${actualWordCount})`,
        severity: 'warning',
        category: 'content_parity',
        suggestion: `Update wordCount to ${actualWordCount}`,
        autoFixable: true
      });
    }
  }

  return errors;
}

// ============================================================================
// EAV CONSISTENCY VALIDATION
// ============================================================================

function validateEavConsistency(
  schema: object,
  eavs: SemanticTriple[]
): SchemaValidationError[] {
  const errors: SchemaValidationError[] = [];

  // Find article item
  const items = (schema as any)['@graph'] || [schema];
  const articleItem = items.find((item: any) =>
    ['Article', 'BlogPosting', 'NewsArticle'].includes(item['@type'])
  );

  if (!articleItem) return errors;

  // Check if main entity is represented
  const mainEntities = eavs.filter(eav =>
    eav.predicate?.category === 'CORE_DEFINITION' ||
    eav.predicate?.category === 'UNIQUE'
  );

  for (const eav of mainEntities) {
    const subjectName = eav.subject?.label?.toLowerCase();

    // Check if entity is in 'about' property
    const about = articleItem.about || [];
    const aboutArray = Array.isArray(about) ? about : [about];
    const isInAbout = aboutArray.some((a: any) =>
      a.name?.toLowerCase().includes(subjectName) ||
      subjectName?.includes(a.name?.toLowerCase())
    );

    if (!isInAbout && subjectName) {
      errors.push({
        path: `${getItemPath(articleItem)}/about`,
        message: `Core entity "${eav.subject.label}" from EAVs not represented in schema`,
        severity: 'warning',
        category: 'eav_consistency',
        suggestion: `Add "${eav.subject.label}" to the 'about' property`,
        autoFixable: true
      });
    }
  }

  return errors;
}

// ============================================================================
// ENTITY VALIDATION
// ============================================================================

function validateEntities(
  schema: object,
  resolvedEntities: ResolvedEntity[]
): SchemaValidationError[] {
  const errors: SchemaValidationError[] = [];

  // Find all person/organization references in schema
  const items = (schema as any)['@graph'] || [schema];

  for (const item of items) {
    // Check author
    if (item.author) {
      const authorName = item.author.name || item.author;
      const matchedEntity = resolvedEntities.find(e =>
        e.type === 'Person' && e.name.toLowerCase() === String(authorName).toLowerCase()
      );

      if (matchedEntity && matchedEntity.sameAs?.length) {
        // Check if sameAs is included
        if (!item.author.sameAs || item.author.sameAs.length === 0) {
          errors.push({
            path: `${getItemPath(item)}/author/sameAs`,
            message: `Author "${authorName}" has known sameAs URLs but they're not in schema`,
            severity: 'warning',
            category: 'entity',
            suggestion: `Add sameAs: ${JSON.stringify(matchedEntity.sameAs.slice(0, 3))}`,
            autoFixable: true
          });
        }
      }
    }

    // Check publisher
    if (item.publisher && typeof item.publisher === 'object') {
      const publisherName = item.publisher.name;
      const matchedEntity = resolvedEntities.find(e =>
        e.type === 'Organization' && e.name.toLowerCase() === String(publisherName).toLowerCase()
      );

      if (matchedEntity && matchedEntity.sameAs?.length) {
        if (!item.publisher.sameAs || item.publisher.sameAs.length === 0) {
          errors.push({
            path: `${getItemPath(item)}/publisher/sameAs`,
            message: `Publisher "${publisherName}" has known sameAs URLs but they're not in schema`,
            severity: 'warning',
            category: 'entity',
            suggestion: `Add sameAs to publisher`,
            autoFixable: true
          });
        }
      }
    }
  }

  return errors;
}

// ============================================================================
// BEST PRACTICES
// ============================================================================

function checkBestPractices(
  schema: object,
  brief: ContentBrief
): SchemaValidationWarning[] {
  const warnings: SchemaValidationWarning[] = [];

  const items = (schema as any)['@graph'] || [schema];
  const articleItem = items.find((item: any) =>
    ['Article', 'BlogPosting', 'NewsArticle'].includes(item['@type'])
  );

  if (articleItem) {
    // Check for image
    if (!articleItem.image) {
      warnings.push({
        path: `${getItemPath(articleItem)}/image`,
        message: 'Article is missing an image property',
        recommendation: 'Add a featured image to improve rich result eligibility',
        category: 'best_practice'
      });
    }

    // Check for speakable
    if (!articleItem.speakable) {
      warnings.push({
        path: `${getItemPath(articleItem)}/speakable`,
        message: 'Article is missing speakable property',
        recommendation: 'Add speakable property to enable voice assistant support',
        category: 'best_practice'
      });
    }

    // Check headline length
    if (articleItem.headline && articleItem.headline.length > 110) {
      warnings.push({
        path: `${getItemPath(articleItem)}/headline`,
        message: 'Headline exceeds recommended 110 character limit',
        recommendation: 'Shorten headline for better display in search results',
        category: 'best_practice'
      });
    }

    // Check for dateModified
    if (!articleItem.dateModified) {
      warnings.push({
        path: `${getItemPath(articleItem)}/dateModified`,
        message: 'Missing dateModified property',
        recommendation: 'Add dateModified to indicate content freshness',
        category: 'best_practice'
      });
    }
  }

  // Check for breadcrumbs
  const hasBreadcrumb = items.some((item: any) => item['@type'] === 'BreadcrumbList');
  if (!hasBreadcrumb) {
    warnings.push({
      path: '/',
      message: 'Schema is missing BreadcrumbList',
      recommendation: 'Add BreadcrumbList for improved navigation in search results',
      category: 'best_practice'
    });
  }

  return warnings;
}

// ============================================================================
// EXTERNAL VALIDATION
// ============================================================================

async function runExternalSchemaValidation(
  schema: object
): Promise<{ source: string; isValid: boolean; errors: string[] } | undefined> {
  // Note: This would typically call Google's Rich Results Test API or similar
  // For now, we'll return undefined as external validation requires API setup
  return undefined;
}

// ============================================================================
// HELPERS
// ============================================================================

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  if (s1 === s2) return 1;

  const words1 = new Set(s1.split(/\s+/));
  const words2 = new Set(s2.split(/\s+/));

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

function calculateValidationScore(
  errors: SchemaValidationError[],
  warnings: SchemaValidationWarning[]
): number {
  let score = 100;

  // Deduct for errors
  for (const error of errors) {
    if (error.severity === 'error') {
      score -= 15;
    } else {
      score -= 5;
    }
  }

  // Deduct for warnings
  score -= warnings.length * 2;

  return Math.max(0, Math.min(100, score));
}
