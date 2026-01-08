// services/ai/contentGeneration/passes/pass9SchemaGeneration.ts
// Pass 9: Schema Generation - Final pass to generate comprehensive JSON-LD schema

import { createClient } from '@supabase/supabase-js';
import type {
  ContentBrief,
  BusinessInfo,
  SEOPillars,
  EnrichedTopic,
  EnhancedSchemaResult,
  Pass9Config,
  ProgressiveSchemaData,
  ContentGenerationJob
} from '../../../../types';
import { DEFAULT_PASS9_CONFIG } from '../../../../types';
import { generateSchema, SchemaGenerationContext } from '../../schemaGeneration/schemaGenerator';
import { validateSchema } from '../../schemaGeneration/schemaValidator';
import { applyAutoFixes, mergeEntitySameAs } from '../../schemaGeneration/schemaAutoFix';
import { validateCompleteness } from '../progressiveSchemaCollector';
import { createLogger } from '../../../../utils/debugLogger';

const log = createLogger('Pass9');

interface Pass9Result {
  success: boolean;
  schemaResult: EnhancedSchemaResult | null;
  error?: string;
}

/**
 * Execute Pass 9: Schema Generation
 */
export async function executePass9(
  jobId: string,
  brief: ContentBrief,
  businessInfo: BusinessInfo,
  pillars: SEOPillars,
  draftContent: string,
  topic: EnrichedTopic | undefined,
  progressiveData: ProgressiveSchemaData | undefined,
  supabaseUrl: string,
  supabaseKey: string,
  userId: string,
  config?: Partial<Pass9Config>,
  onProgress?: (message: string) => void
): Promise<Pass9Result> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const fullConfig: Pass9Config = { ...DEFAULT_PASS9_CONFIG, ...config };

  // Fetch current job to get existing passes_status for merging
  const { data: currentJob } = await supabase
    .from('content_generation_jobs')
    .select('passes_status')
    .eq('id', jobId)
    .single();

  const currentPassesStatus = currentJob?.passes_status || {};

  try {
    onProgress?.('Starting Pass 9: Schema Generation');

    // Step 1: Validate progressive data completeness
    onProgress?.('Validating progressive data...');
    const dataValidation = progressiveData
      ? validateCompleteness(progressiveData)
      : { isComplete: false, missingFields: ['all'], completedPasses: [] };

    if (!dataValidation.isComplete) {
      log.log(` Progressive data incomplete. Missing: ${dataValidation.missingFields.join(', ')}`);
      // Continue anyway - we can generate schema without complete progressive data
    }

    // Step 2: Build generation context
    onProgress?.('Building generation context...');
    const url = topic?.url_slug_hint
      ? `https://${businessInfo.domain}/${topic.url_slug_hint}`
      : undefined;

    const context: SchemaGenerationContext = {
      brief,
      businessInfo,
      pillars,
      topic,
      draftContent,
      progressiveData,
      url,
      config: fullConfig,
      supabaseUrl,
      supabaseKey,
      userId
    };

    // Step 3: Generate schema
    onProgress?.('Generating schema...');
    let schemaResult = await generateSchema(context);

    // Step 4: Run full validation
    onProgress?.('Running validation pipeline...');
    const validation = await validateSchema(
      schemaResult.schema,
      brief,
      draftContent,
      brief.contextualVectors,
      schemaResult.resolvedEntities,
      fullConfig.externalValidation
    );

    schemaResult.validation = validation;

    // Step 5: Apply auto-fixes if enabled and needed
    if (fullConfig.autoFix && !validation.isValid) {
      onProgress?.('Applying auto-fixes...');

      const fixResult = applyAutoFixes(
        schemaResult.schema,
        validation,
        brief,
        schemaResult.resolvedEntities,
        fullConfig.maxAutoFixIterations
      );

      if (fixResult.changes.length > 0) {
        schemaResult.schema = fixResult.schema;
        schemaResult.schemaString = JSON.stringify(fixResult.schema, null, 2);
        schemaResult.validation.autoFixApplied = true;
        schemaResult.validation.autoFixChanges = fixResult.changes;
        schemaResult.validation.autoFixIterations = fixResult.iterations;

        // Re-validate after fixes
        onProgress?.('Re-validating after fixes...');
        const revalidation = await validateSchema(
          schemaResult.schema,
          brief,
          draftContent,
          brief.contextualVectors,
          schemaResult.resolvedEntities,
          false // Don't run external validation again
        );

        // Merge revalidation results (keeping auto-fix info)
        schemaResult.validation = {
          ...revalidation,
          autoFixApplied: true,
          autoFixChanges: fixResult.changes,
          autoFixIterations: fixResult.iterations
        };
      }
    }

    // Step 6: Merge entity sameAs URLs if we have resolved entities
    if (schemaResult.resolvedEntities.length > 0) {
      schemaResult.schema = mergeEntitySameAs(
        schemaResult.schema,
        schemaResult.resolvedEntities
      );
      schemaResult.schemaString = JSON.stringify(schemaResult.schema, null, 2);
    }

    // Step 7: Save results to database
    onProgress?.('Saving schema to database...');
    await saveSchemaToJob(
      supabase,
      jobId,
      schemaResult,
      currentPassesStatus
    );

    onProgress?.('Pass 9 complete!');

    return {
      success: true,
      schemaResult
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error in Pass 9';
    console.error('[Pass9] Error:', error);

    // Update job with error - merge with existing passes_status
    await supabase
      .from('content_generation_jobs')
      .update({
        last_error: errorMessage,
        passes_status: {
          ...currentPassesStatus,
          pass_10_schema: 'failed'  // Now Pass 10 in new 10-pass order
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    return {
      success: false,
      schemaResult: null,
      error: errorMessage
    };
  }
}

/**
 * Save schema results to the job record
 */
async function saveSchemaToJob(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  jobId: string,
  schemaResult: EnhancedSchemaResult,
  currentPassesStatus: Record<string, string>
): Promise<void> {
  const { error } = await supabase
    .from('content_generation_jobs')
    .update({
      schema_data: schemaResult,
      schema_validation_results: schemaResult.validation,
      schema_entities: schemaResult.resolvedEntities,
      schema_page_type: schemaResult.pageType,
      passes_status: {
        ...currentPassesStatus,
        pass_10_schema: 'completed'  // Now Pass 10 in new 10-pass order
      },
      current_pass: 10,  // Final pass - no next pass
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId);

  if (error) {
    throw new Error(`Failed to save schema to job: ${error.message}`);
  }
}

/**
 * Check if Pass 9 can be executed
 */
export function canExecutePass9(job: ContentGenerationJob): {
  canExecute: boolean;
  reason?: string;
} {
  // Check if Pass 9 (Audit) is completed - was Pass 8 in old order
  if (job.passes_status?.pass_9_audit !== 'completed') {
    return {
      canExecute: false,
      reason: 'Pass 9 (Audit) must be completed before schema generation'
    };
  }

  // Check if draft content exists
  if (!job.draft_content) {
    return {
      canExecute: false,
      reason: 'No draft content available for schema generation'
    };
  }

  // Check if Pass 10 (Schema) already completed - was Pass 9 in old order
  if (job.passes_status?.pass_10_schema === 'completed') {
    return {
      canExecute: true,
      reason: 'Pass 10 can be re-run to regenerate schema'
    };
  }

  return { canExecute: true };
}

/**
 * Get Pass 9 status summary
 */
export function getPass9Status(job: ContentGenerationJob): {
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  hasSchema: boolean;
  validationScore: number | null;
  entityCount: number;
  pageType: string | null;
} {
  const status = job.passes_status?.pass_10_schema || 'pending';  // Now Pass 10
  const schemaData = job.schema_data as EnhancedSchemaResult | null;

  return {
    status,
    hasSchema: !!schemaData,
    validationScore: schemaData?.validation?.overallScore || null,
    entityCount: schemaData?.resolvedEntities?.length || 0,
    pageType: job.schema_page_type || schemaData?.pageType || null
  };
}

/**
 * Regenerate schema with new configuration
 */
export async function regenerateSchema(
  jobId: string,
  brief: ContentBrief,
  businessInfo: BusinessInfo,
  pillars: SEOPillars,
  draftContent: string,
  topic: EnrichedTopic | undefined,
  progressiveData: ProgressiveSchemaData | undefined,
  supabaseUrl: string,
  supabaseKey: string,
  userId: string,
  newConfig: Partial<Pass9Config>,
  onProgress?: (message: string) => void
): Promise<Pass9Result> {
  // Mark as in progress - fetch current passes_status first to preserve it
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: currentJob } = await supabase
    .from('content_generation_jobs')
    .select('passes_status')
    .eq('id', jobId)
    .single();

  const currentPassesStatus = currentJob?.passes_status || {};

  await supabase
    .from('content_generation_jobs')
    .update({
      passes_status: {
        ...currentPassesStatus,
        pass_10_schema: 'in_progress'  // Now Pass 10 in new 10-pass order
      },
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId);

  // Re-run pass 9 with new config
  return executePass9(
    jobId,
    brief,
    businessInfo,
    pillars,
    draftContent,
    topic,
    progressiveData,
    supabaseUrl,
    supabaseKey,
    userId,
    newConfig,
    onProgress
  );
}
