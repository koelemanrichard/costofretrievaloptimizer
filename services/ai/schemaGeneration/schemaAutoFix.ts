// services/ai/schemaGeneration/schemaAutoFix.ts
// Auto-fix engine for common schema validation errors

import type {
  SchemaValidationError,
  SchemaValidationResult,
  ContentBrief,
  ResolvedEntity
} from '../../../types';

interface AutoFixResult {
  fixed: boolean;
  schema: object;
  changes: string[];
}

/**
 * Apply auto-fixes to a schema based on validation errors
 */
export function applyAutoFixes(
  schema: object,
  validation: SchemaValidationResult,
  brief: ContentBrief,
  resolvedEntities?: ResolvedEntity[],
  maxIterations: number = 3
): { schema: object; changes: string[]; iterations: number } {
  let currentSchema = JSON.parse(JSON.stringify(schema)); // Deep clone
  const allChanges: string[] = [];
  let iterations = 0;

  // Get all auto-fixable errors
  const fixableErrors = [
    ...validation.syntaxErrors,
    ...validation.schemaOrgErrors,
    ...validation.contentParityErrors,
    ...validation.eavConsistencyErrors,
    ...validation.entityErrors
  ].filter(e => e.autoFixable);

  // Apply fixes iteratively
  while (fixableErrors.length > 0 && iterations < maxIterations) {
    iterations++;
    const errorsThisRound = [...fixableErrors];
    fixableErrors.length = 0; // Clear for next round

    for (const error of errorsThisRound) {
      const result = applyFix(currentSchema, error, brief, resolvedEntities);
      if (result.fixed) {
        currentSchema = result.schema;
        allChanges.push(...result.changes);
      } else {
        // If fix failed, don't try again
      }
    }

    // If no changes were made, stop
    if (allChanges.length === 0) break;
  }

  return {
    schema: currentSchema,
    changes: allChanges,
    iterations
  };
}

/**
 * Apply a single fix for an error
 */
function applyFix(
  schema: object,
  error: SchemaValidationError,
  brief: ContentBrief,
  resolvedEntities?: ResolvedEntity[]
): AutoFixResult {
  const changes: string[] = [];

  switch (error.category) {
    case 'syntax':
      return applySyntaxFix(schema, error);

    case 'content_parity':
      return applyContentParityFix(schema, error, brief);

    case 'eav_consistency':
      return applyEavFix(schema, error, brief);

    case 'entity':
      return applyEntityFix(schema, error, resolvedEntities);

    case 'schema_org':
      return applySchemaOrgFix(schema, error);

    default:
      return { fixed: false, schema, changes: [] };
  }
}

/**
 * Fix syntax errors
 */
function applySyntaxFix(
  schema: object,
  error: SchemaValidationError
): AutoFixResult {
  const fixed = JSON.parse(JSON.stringify(schema));
  const changes: string[] = [];

  // Fix missing @context
  if (error.path === '/@context' && !fixed['@context']) {
    fixed['@context'] = 'https://schema.org';
    changes.push('Added @context: "https://schema.org"');
    return { fixed: true, schema: fixed, changes };
  }

  // Fix invalid @context
  if (error.path === '/@context' && fixed['@context'] !== 'https://schema.org') {
    fixed['@context'] = 'https://schema.org';
    changes.push('Fixed @context to "https://schema.org"');
    return { fixed: true, schema: fixed, changes };
  }

  return { fixed: false, schema, changes: [] };
}

/**
 * Fix content parity errors
 */
function applyContentParityFix(
  schema: object,
  error: SchemaValidationError,
  brief: ContentBrief
): AutoFixResult {
  const fixed = JSON.parse(JSON.stringify(schema));
  const changes: string[] = [];

  // Parse path to find the item and property
  const pathParts = error.path.split('/').filter(p => p && !p.startsWith('@'));
  if (pathParts.length === 0) return { fixed: false, schema, changes: [] };

  // Find the item in @graph or root
  const items = fixed['@graph'] || [fixed];
  const articleItem = items.find((item: any) =>
    ['Article', 'BlogPosting', 'NewsArticle', 'WebPage'].includes(item['@type'])
  );

  if (!articleItem) return { fixed: false, schema, changes: [] };

  // Fix headline
  if (error.path.includes('/headline')) {
    articleItem.headline = brief.title;
    changes.push(`Updated headline to: "${brief.title}"`);
    return { fixed: true, schema: fixed, changes };
  }

  // Fix description
  if (error.path.includes('/description')) {
    articleItem.description = brief.metaDescription;
    changes.push(`Updated description to match meta description`);
    return { fixed: true, schema: fixed, changes };
  }

  // Fix wordCount
  if (error.path.includes('/wordCount')) {
    // Extract word count from suggestion
    const match = error.suggestion?.match(/(\d+)/);
    if (match) {
      articleItem.wordCount = parseInt(match[1]);
      changes.push(`Updated wordCount to ${match[1]}`);
      return { fixed: true, schema: fixed, changes };
    }
  }

  return { fixed: false, schema, changes: [] };
}

/**
 * Fix EAV consistency errors
 */
function applyEavFix(
  schema: object,
  error: SchemaValidationError,
  brief: ContentBrief
): AutoFixResult {
  const fixed = JSON.parse(JSON.stringify(schema));
  const changes: string[] = [];

  if (!error.path.includes('/about')) return { fixed: false, schema, changes: [] };

  // Find article item
  const items = fixed['@graph'] || [fixed];
  const articleItem = items.find((item: any) =>
    ['Article', 'BlogPosting', 'NewsArticle'].includes(item['@type'])
  );

  if (!articleItem) return { fixed: false, schema, changes: [] };

  // Extract entity name from error message
  const entityMatch = error.message.match(/"([^"]+)"/);
  if (!entityMatch) return { fixed: false, schema, changes: [] };

  const entityName = entityMatch[1];

  // Ensure about is an array
  if (!articleItem.about) {
    articleItem.about = [];
  } else if (!Array.isArray(articleItem.about)) {
    articleItem.about = [articleItem.about];
  }

  // Add the entity
  articleItem.about.push({
    '@type': 'Thing',
    name: entityName
  });

  changes.push(`Added "${entityName}" to about property`);
  return { fixed: true, schema: fixed, changes };
}

/**
 * Fix entity-related errors
 */
function applyEntityFix(
  schema: object,
  error: SchemaValidationError,
  resolvedEntities?: ResolvedEntity[]
): AutoFixResult {
  const fixed = JSON.parse(JSON.stringify(schema));
  const changes: string[] = [];

  if (!resolvedEntities?.length) return { fixed: false, schema, changes: [] };

  // Find the item
  const items = fixed['@graph'] || [fixed];

  // Fix author sameAs
  if (error.path.includes('/author/sameAs')) {
    for (const item of items) {
      if (item.author && typeof item.author === 'object') {
        const authorName = item.author.name;
        const matchedEntity = resolvedEntities.find(e =>
          e.type === 'Person' && e.name.toLowerCase() === String(authorName).toLowerCase()
        );

        if (matchedEntity?.sameAs?.length) {
          item.author.sameAs = matchedEntity.sameAs;
          changes.push(`Added sameAs URLs to author "${authorName}"`);
          return { fixed: true, schema: fixed, changes };
        }
      }
    }
  }

  // Fix publisher sameAs
  if (error.path.includes('/publisher/sameAs')) {
    for (const item of items) {
      if (item.publisher && typeof item.publisher === 'object') {
        const publisherName = item.publisher.name;
        const matchedEntity = resolvedEntities.find(e =>
          e.type === 'Organization' && e.name.toLowerCase() === String(publisherName).toLowerCase()
        );

        if (matchedEntity?.sameAs?.length) {
          item.publisher.sameAs = matchedEntity.sameAs;
          changes.push(`Added sameAs URLs to publisher "${publisherName}"`);
          return { fixed: true, schema: fixed, changes };
        }
      }
    }
  }

  return { fixed: false, schema, changes: [] };
}

/**
 * Fix Schema.org compliance errors
 */
function applySchemaOrgFix(
  schema: object,
  error: SchemaValidationError
): AutoFixResult {
  // Most Schema.org errors require content that we don't have
  // These fixes would need AI assistance
  return { fixed: false, schema, changes: [] };
}

/**
 * Add missing dateModified to schema
 */
export function addDateModified(schema: object): object {
  const fixed = JSON.parse(JSON.stringify(schema));
  const items = fixed['@graph'] || [fixed];

  for (const item of items) {
    if (['Article', 'BlogPosting', 'NewsArticle'].includes(item['@type'])) {
      if (!item.dateModified) {
        item.dateModified = new Date().toISOString();
      }
    }
  }

  return fixed;
}

/**
 * Add missing image property
 */
export function addImage(
  schema: object,
  imageUrl: string,
  caption?: string
): object {
  const fixed = JSON.parse(JSON.stringify(schema));
  const items = fixed['@graph'] || [fixed];

  for (const item of items) {
    if (['Article', 'BlogPosting', 'NewsArticle'].includes(item['@type'])) {
      if (!item.image) {
        item.image = {
          '@type': 'ImageObject',
          url: imageUrl,
          contentUrl: imageUrl,
          ...(caption && { caption })
        };
      }
    }
  }

  return fixed;
}

/**
 * Add speakable property for voice assistant support
 */
export function addSpeakable(
  schema: object,
  cssSelectors: string[] = ['article', '.content', 'h1', 'h2']
): object {
  const fixed = JSON.parse(JSON.stringify(schema));
  const items = fixed['@graph'] || [fixed];

  for (const item of items) {
    if (['Article', 'BlogPosting', 'NewsArticle'].includes(item['@type'])) {
      if (!item.speakable) {
        item.speakable = {
          '@type': 'SpeakableSpecification',
          cssSelector: cssSelectors
        };
      }
    }
  }

  return fixed;
}

/**
 * Update schema with new date values
 */
export function updateDates(
  schema: object,
  datePublished?: string,
  dateModified?: string
): object {
  const fixed = JSON.parse(JSON.stringify(schema));
  const items = fixed['@graph'] || [fixed];

  for (const item of items) {
    if (['Article', 'BlogPosting', 'NewsArticle'].includes(item['@type'])) {
      if (datePublished) {
        item.datePublished = datePublished;
      }
      if (dateModified) {
        item.dateModified = dateModified;
      }
    }
  }

  return fixed;
}

/**
 * Add or update keywords
 */
export function updateKeywords(
  schema: object,
  keywords: string[]
): object {
  const fixed = JSON.parse(JSON.stringify(schema));
  const items = fixed['@graph'] || [fixed];

  for (const item of items) {
    if (['Article', 'BlogPosting', 'NewsArticle'].includes(item['@type'])) {
      item.keywords = keywords.join(', ');
    }
  }

  return fixed;
}

/**
 * Merge entity sameAs URLs into schema
 */
export function mergeEntitySameAs(
  schema: object,
  resolvedEntities: ResolvedEntity[]
): object {
  const fixed = JSON.parse(JSON.stringify(schema));
  const items = fixed['@graph'] || [fixed];

  for (const item of items) {
    // Update author
    if (item.author && typeof item.author === 'object') {
      const authorEntity = resolvedEntities.find(e =>
        e.type === 'Person' && e.name.toLowerCase() === item.author.name?.toLowerCase()
      );
      if (authorEntity?.sameAs?.length) {
        item.author.sameAs = authorEntity.sameAs;
        if (authorEntity.description) {
          item.author.description = authorEntity.description;
        }
      }
    }

    // Update publisher
    if (item.publisher && typeof item.publisher === 'object') {
      const publisherEntity = resolvedEntities.find(e =>
        e.type === 'Organization' && e.name.toLowerCase() === item.publisher.name?.toLowerCase()
      );
      if (publisherEntity?.sameAs?.length) {
        item.publisher.sameAs = publisherEntity.sameAs;
      }
    }

    // Update about entities
    if (item.about && Array.isArray(item.about)) {
      for (let i = 0; i < item.about.length; i++) {
        const aboutItem = item.about[i];
        if (aboutItem.name) {
          const matchedEntity = resolvedEntities.find(e =>
            e.name.toLowerCase() === aboutItem.name.toLowerCase()
          );
          if (matchedEntity?.sameAs?.length) {
            item.about[i].sameAs = matchedEntity.sameAs;
          }
        }
      }
    }
  }

  return fixed;
}
