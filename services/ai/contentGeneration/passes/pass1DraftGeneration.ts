// services/ai/contentGeneration/passes/pass1DraftGeneration.ts
import { ContentBrief, ContentGenerationJob, SectionDefinition, BusinessInfo, BriefSection, SectionGenerationContext, DiscourseContext, SectionFlowGuidance, WebsiteType } from '../../../../types';
import { ContentGenerationOrchestrator } from '../orchestrator';
import { ContextChainer } from '../rulesEngine/contextChainer';
import { AttributeRanker } from '../rulesEngine/attributeRanker';
import { RulesValidator } from '../rulesEngine/validators';
import { SectionPromptBuilder } from '../rulesEngine/prompts/sectionPromptBuilder';
import { YMYLValidator } from '../rulesEngine/validators/ymylValidator';
import * as geminiService from '../../../geminiService';
import * as openAiService from '../../../openAiService';
import * as anthropicService from '../../../anthropicService';
import * as perplexityService from '../../../perplexityService';
import * as openRouterService from '../../../openRouterService';
import { dispatchToProvider } from '../../providerDispatcher';
import { createLogger } from '../../../../utils/debugLogger';
import { ContentGenerationSettings, LENGTH_PRESETS, DEFAULT_CONTENT_LENGTH_SETTINGS } from '../../../../types/contentGeneration';
import { buildFlowGuidance } from '../flowGuidanceBuilder';
import { selectTemplate } from '../templateRouter';
import { TemplateRouterInput, TemplateSelectionResult } from '../../../../types/contentTemplates';

const log = createLogger('Pass1');

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// No-op dispatch for standalone calls
const noOpDispatch = () => {};

// Helper to call AI based on provider
async function callProviderWithPrompt(
  info: BusinessInfo,
  prompt: string
): Promise<string> {
  return dispatchToProvider(info, {
    gemini: () => geminiService.generateText(prompt, info, noOpDispatch),
    openai: () => openAiService.generateText(prompt, info, noOpDispatch),
    anthropic: () => anthropicService.generateText(prompt, info, noOpDispatch),
    perplexity: () => perplexityService.generateText(prompt, info, noOpDispatch),
    openrouter: () => openRouterService.generateText(prompt, info, noOpDispatch),
  });
}

export interface Pass1Options {
  /** Content generation settings including length presets */
  settings?: ContentGenerationSettings;
  /** Topic type for auto-adjusting content length */
  topicType?: 'core' | 'outer' | 'child' | 'unknown';
}

export async function executePass1(
  orchestrator: ContentGenerationOrchestrator,
  job: ContentGenerationJob,
  brief: ContentBrief,
  businessInfo: BusinessInfo,
  onSectionComplete: (key: string, heading: string, current: number, total: number) => void,
  shouldAbort: () => boolean,
  options?: Pass1Options
): Promise<string> {
  // 1. SMART SECTION DETECTION: Analyze brief complexity to determine appropriate content length
  // The brief itself tells us what's needed - don't blindly apply topic type presets
  const briefSectionCount = brief.structured_outline?.length || 0;
  const briefImageCount = brief.visual_semantics?.length || 0;
  const serpTargetWords = brief.serpAnalysis?.avgWordCount || 0;
  const hasDetailedOutline = briefSectionCount >= 5;
  const hasVisualPlan = briefImageCount >= 2;
  const isComprehensiveBrief = hasDetailedOutline || hasVisualPlan || serpTargetWords > 1500;

  // Log what the brief tells us
  log.info(`Brief analysis: ${briefSectionCount} sections, ${briefImageCount} images, SERP target: ${serpTargetWords} words`);

  const lengthSettings = options?.settings?.contentLength ?? DEFAULT_CONTENT_LENGTH_SETTINGS;

  // Calculate effective max sections - BRIEF COMPLEXITY OVERRIDES TOPIC TYPE
  let effectiveMaxSections: number | undefined;
  let decisionReason: string;

  if (lengthSettings.maxSections !== undefined) {
    // User override takes precedence
    effectiveMaxSections = lengthSettings.maxSections;
    decisionReason = 'User specified maxSections override';
  } else if (isComprehensiveBrief) {
    // SMART: Brief has detailed structure - respect it regardless of topic type
    effectiveMaxSections = briefSectionCount > 0 ? briefSectionCount + 2 : undefined; // +2 for intro/conclusion
    decisionReason = `Brief defines ${briefSectionCount} sections with ${briefImageCount} images - generating all content`;
    log.info(`[SMART] Brief complexity detected: ignoring topic type '${options?.topicType}', using full brief structure`);
  } else if (lengthSettings.respectTopicType && options?.topicType && options.topicType !== 'unknown') {
    // Only use topic type for simple briefs without detailed structure
    const topicTypePreset = options.topicType === 'core' ? 'comprehensive' :
                            options.topicType === 'outer' ? 'short' : 'standard';
    effectiveMaxSections = LENGTH_PRESETS[topicTypePreset].maxSections;
    decisionReason = `Simple brief, using ${options.topicType} topic preset`;
  } else {
    // Use preset default
    effectiveMaxSections = LENGTH_PRESETS[lengthSettings.preset].maxSections;
    decisionReason = `Using ${lengthSettings.preset} preset default`;
  }

  log.info(`Content length decision: ${decisionReason} → maxSections=${effectiveMaxSections || 'unlimited'}`);

  // 1b. SELECT TEMPLATE based on context using AI-driven router
  const topicType = options?.topicType || 'outer';
  const topicClass = (brief as any).topic_class || (brief as any).topicClass || 'informational';

  const templateInput: TemplateRouterInput = {
    websiteType: (businessInfo.websiteType as WebsiteType) || 'INFORMATIONAL',
    queryIntent: (brief.searchIntent as 'informational' | 'transactional' | 'commercial' | 'navigational') || 'informational',
    queryType: brief.serpAnalysis?.query_type || 'definitional',
    topicType: topicType as 'core' | 'outer' | 'child',
    topicClass: topicClass as 'monetization' | 'informational',
    briefHints: {
      hasComparisonSections: brief.structured_outline?.some(s =>
        s.heading?.toLowerCase().includes('vs') || s.heading?.toLowerCase().includes('comparison')
      ) || false,
      hasStepSections: brief.structured_outline?.some(s =>
        s.heading?.toLowerCase().includes('step') || s.heading?.toLowerCase().includes('how to')
      ) || false,
      hasSpecsSections: brief.structured_outline?.some(s =>
        s.heading?.toLowerCase().includes('spec') || s.heading?.toLowerCase().includes('feature')
      ) || false,
    },
    competitorAnalysis: brief.serpAnalysis?.avgWordCount ? {
      dominantFormat: brief.serpAnalysis.commonStructure || 'prose',
      avgSectionCount: brief.serpAnalysis.avgHeadings || 6,
      avgWordCount: brief.serpAnalysis.avgWordCount,
    } : undefined,
  };

  const templateSelection: TemplateSelectionResult = selectTemplate(templateInput);
  log.info(`[Pass1] Using template: ${templateSelection.template.templateName} (${templateSelection.confidence}% confidence)`);
  for (const reason of templateSelection.reasoning) {
    log.info(`[Pass1]   - ${reason}`);
  }
  if (templateSelection.alternatives.length > 0) {
    log.log(`[Pass1] Alternative templates: ${templateSelection.alternatives.map(a => a.templateName).join(', ')}`);
  }

  // 2. Parse sections from brief with maxSections limit
  let sections = orchestrator.parseSectionsFromBrief(brief, { maxSections: effectiveMaxSections });

  // 3. Order sections using AttributeRanker (ROOT → UNIQUE → RARE → COMMON)
  // Convert to BriefSection for ordering, then convert back
  const briefSections: BriefSection[] = sections.map(s => ({
    key: s.key,
    heading: s.heading,
    level: s.level,
    order: s.order,
    subordinate_text_hint: s.subordinateTextHint,
  }));

  const orderedBriefSections = AttributeRanker.orderSections(briefSections);

  // Convert back to SectionDefinition maintaining the order
  sections = orderedBriefSections.map(bs =>
    sections.find(s => s.key === bs.key)!
  );

  // 3. Find where to resume (if any sections already completed)
  const existingSections = await orchestrator.getSections(job.id);
  const completedKeys = new Set(
    existingSections
      .filter(s => s.status === 'completed' && s.pass_1_content)
      .map(s => s.section_key)
  );

  // Use actual completed count from DB, not stale job value
  let completedCount = completedKeys.size;

  // 4. Update job with section count and current progress
  await orchestrator.updateJob(job.id, {
    total_sections: sections.length,
    completed_sections: completedCount, // Sync with actual completed count
    status: 'in_progress',
    started_at: job.started_at || new Date().toISOString(), // Don't overwrite if resuming
    passes_status: { ...job.passes_status, pass_1_draft: 'in_progress' }
  });

  // 5. Track discourse context for S-P-O chaining
  let previousContent: string | null = null;

  // 6. Build length guidance for section prompts - SMART: based on brief, not just preset
  let sectionWordRange: { min: number; max: number };
  let isShortContent: boolean;

  if (isComprehensiveBrief && serpTargetWords > 0) {
    // SMART: Calculate word range from SERP target and section count
    const targetWordsPerSection = Math.round(serpTargetWords / Math.max(sections.length, 1));
    sectionWordRange = {
      min: Math.max(100, Math.round(targetWordsPerSection * 0.8)),
      max: Math.round(targetWordsPerSection * 1.2)
    };
    isShortContent = false;
    log.info(`[SMART] Section word range calculated from SERP: ${sectionWordRange.min}-${sectionWordRange.max} words (target: ${serpTargetWords} total)`);
  } else if (lengthSettings.respectTopicType && options?.topicType && options.topicType !== 'unknown' && !isComprehensiveBrief) {
    // Only use topic type for simple briefs
    const topicTypePreset = options.topicType === 'core' ? 'comprehensive' : options.topicType === 'outer' ? 'short' : 'standard';
    sectionWordRange = LENGTH_PRESETS[topicTypePreset].sectionWordRange;
    isShortContent = topicTypePreset === 'short'; // Only 'short' from topic type mapping
  } else {
    sectionWordRange = LENGTH_PRESETS[lengthSettings.preset].sectionWordRange;
    isShortContent = lengthSettings.preset === 'minimal' || lengthSettings.preset === 'short';
  }

  const lengthGuidance: LengthGuidance = {
    targetWords: sectionWordRange,
    presetName: isComprehensiveBrief ? 'comprehensive (auto)' : lengthSettings.preset,
    isShortContent
  };
  log.info(`Section word range: ${sectionWordRange.min}-${sectionWordRange.max} words`);

  // 7. Generate each section
  for (const section of sections) {
    // Check for abort
    if (shouldAbort()) {
      return '';
    }

    // Skip already completed sections
    if (completedKeys.has(section.key)) {
      // Load completed content to maintain discourse chain
      const existingSection = existingSections.find(s => s.section_key === section.key);
      if (existingSection?.pass_1_content) {
        previousContent = existingSection.pass_1_content;
      }
      continue;
    }

    // Update current section
    await orchestrator.updateJob(job.id, { current_section_key: section.key });

    // Build discourse context from previous section
    const discourseContext = previousContent
      ? ContextChainer.extractForNext(previousContent)
      : null;

    // Build flow guidance for this section (provides transition and structure context)
    const flowGuidance = buildFlowGuidance(section, sections, brief, businessInfo);

    // Generate with retry and validation
    const validationMode = options?.settings?.validationMode ?? 'hard';
    const content = await generateSectionWithRetry(
      section,
      brief,
      businessInfo,
      sections,
      discourseContext,
      3,
      lengthGuidance,
      flowGuidance,
      validationMode
    );

    // Save to sections table
    await orchestrator.upsertSection({
      job_id: job.id,
      section_key: section.key,
      section_heading: section.heading,
      section_order: Math.round(section.order * 10), // Convert to integer
      section_level: section.level,
      pass_1_content: content,
      current_content: content,
      current_pass: 1,
      status: 'completed'
    });

    // Update discourse context for next section
    previousContent = content;

    // Update progress
    completedCount++;
    await orchestrator.updateJob(job.id, {
      completed_sections: completedCount
    });

    // Callback
    onSectionComplete(section.key, section.heading, completedCount, sections.length);

    // Small delay between sections to avoid rate limiting
    await delay(500);
  }

  // 7. Assemble full draft
  const fullDraft = await orchestrator.assembleDraft(job.id);

  // 8. Mark pass complete
  await orchestrator.updateJob(job.id, {
    draft_content: fullDraft,
    passes_status: { ...job.passes_status, pass_1_draft: 'completed' },
    current_pass: 2,
    current_section_key: null
  });

  return fullDraft;
}

interface LengthGuidance {
  targetWords: { min: number; max: number };
  presetName: string;
  isShortContent: boolean;
}

async function generateSectionWithRetry(
  section: SectionDefinition,
  brief: ContentBrief,
  businessInfo: BusinessInfo,
  allSections: SectionDefinition[],
  discourseContext: DiscourseContext | null,
  maxRetries: number,
  lengthGuidance?: LengthGuidance,
  flowGuidance?: SectionFlowGuidance,
  validationMode: 'soft' | 'hard' | 'checkpoint' = 'hard'
): Promise<string> {
  let lastError: Error | null = null;
  let fixInstructions: string | undefined = undefined;

  // Convert SectionDefinition to BriefSection for Rules Engine
  const briefSection: BriefSection = {
    key: section.key,
    heading: section.heading,
    level: section.level,
    order: section.order,
    subordinate_text_hint: section.subordinateTextHint,
  };

  // Convert allSections to BriefSection array
  const allBriefSections: BriefSection[] = allSections.map(s => ({
    key: s.key,
    heading: s.heading,
    level: s.level,
    order: s.order,
    subordinate_text_hint: s.subordinateTextHint,
  }));

  // Detect YMYL content
  const ymylDetection = YMYLValidator.detectYMYL(
    `${brief.title} ${section.heading} ${businessInfo.industry}`
  );

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Build SectionGenerationContext
      const context: SectionGenerationContext = {
        section: briefSection,
        brief,
        businessInfo,
        discourseContext: discourseContext || undefined,
        allSections: allBriefSections,
        isYMYL: ymylDetection.isYMYL,
        ymylCategory: ymylDetection.category,
        language: businessInfo.language, // Pass language for multilingual validation
        lengthGuidance, // Content length guidance from settings
        flowGuidance, // Flow guidance for transitions and article structure
      };

      // Use SectionPromptBuilder instead of legacy prompt
      const prompt = SectionPromptBuilder.build(context, fixInstructions);

      const response = await callProviderWithPrompt(
        businessInfo,
        prompt
      );

      if (typeof response !== 'string') {
        throw new Error('AI returned non-string response');
      }

      const content = response.trim();

      // Validate generated content (pass=1: only fundamental validators)
      const validationResult = RulesValidator.validate(content, context, 1);

      // Log warnings (non-blocking) - only when verbose logging enabled
      const warnings = validationResult.violations.filter(v => v.severity === 'warning');
      if (warnings.length > 0) {
        log.warn(`Section "${section.heading}" has ${warnings.length} validation warnings:`, warnings);
      }

      // If validation failed with errors, retry with fix instructions
      if (!validationResult.passed) {
        const errors = validationResult.violations.filter(v => v.severity === 'error');
        log.warn(`Section "${section.heading}" validation failed (attempt ${attempt}/${maxRetries}):`, errors);

        if (attempt < maxRetries) {
          fixInstructions = validationResult.fixInstructions;
          // Exponential backoff before retry
          await delay(1000 * Math.pow(2, attempt - 1));
          continue; // Retry with fix instructions
        } else {
          // Max retries reached - behavior depends on validation mode
          const errorSummary = errors.map(e => e.text || e.suggestion).join('; ');

          if (validationMode === 'hard') {
            // HARD MODE: Throw error, do not save bad content
            throw new Error(`VALIDATION_FAILED: Section "${section.heading}" failed validation after ${maxRetries} attempts. Errors: ${errorSummary}`);
          } else if (validationMode === 'checkpoint') {
            // CHECKPOINT MODE: Log for review but return content
            log.error(`[CHECKPOINT] Section "${section.heading}" needs review. Errors: ${errorSummary}`);
            return `<!-- VALIDATION_CHECKPOINT: ${errorSummary} -->\n${content}`;
          } else {
            // SOFT MODE: Warn and continue (legacy behavior)
            log.error(`Section "${section.heading}" failed validation after ${maxRetries} attempts. Proceeding with last attempt.`);
            return content;
          }
        }
      }

      // Validation passed
      return content;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        // Exponential backoff
        await delay(1000 * Math.pow(2, attempt - 1));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}
