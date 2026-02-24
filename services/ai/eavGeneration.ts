/**
 * AI-Powered Dual-Layer EAV Generation
 *
 * Generates comprehensive EAV inventories using AI with two layers:
 * - Layer 1 (CE): Domain knowledge triples about the Central Entity
 * - Layer 2 (SC): Business/company triples about the Source Context
 *
 * Follows the pillarSuggestion.ts dispatch pattern.
 */

import type { BusinessInfo, SemanticTriple } from '../../types';
import type { DialogueContext } from '../../types/dialogue';
import type { AppAction } from '../../state/appState';
import { dispatchToProvider } from './providerDispatcher';
import { autoClassifyEavs } from './eavClassifier';
import { detectIndustryType, getPredicateSuggestions, generateEavTemplate } from './eavService';
import { buildDialogueContextSection } from './dialogueEngine';
import { getLanguageAndRegionInstruction, getLanguageName } from '../../utils/languageUtils';
import * as geminiService from '../geminiService';
import * as openAiService from '../openAiService';
import * as anthropicService from '../anthropicService';
import * as perplexityService from '../perplexityService';
import * as openRouterService from '../openRouterService';

// ── Types ──

export interface EavGenerationContext {
  pillars: {
    centralEntity: string;
    sourceContext?: string;
    centralSearchIntent?: string;
    csiPredicates?: string[];
    scPriorities?: string[];
    contentAreas?: string[];
  };
  competitorEAVs?: Array<{ entity: string; attribute: string; value: string }>;
  contentGaps?: Array<{ missingAttribute: string; priority: string }>;
}

export interface EavGenerationResult {
  eavs: SemanticTriple[];
  reasoning: string;
}

// ── Prompt Builders ──

function buildCompetitorSection(ctx: EavGenerationContext): string {
  const parts: string[] = [];

  if (ctx.competitorEAVs?.length) {
    const top = ctx.competitorEAVs.slice(0, 25);
    const formatted = top.map(e => `  ${e.entity} → ${e.attribute} → ${e.value}`).join('\n');
    parts.push(`COMPETITOR EAV DATA (top ${top.length}):\n${formatted}`);
  }

  if (ctx.contentGaps?.length) {
    const top = ctx.contentGaps.slice(0, 15);
    const formatted = top.map(g => `  ${g.missingAttribute} (${g.priority})`).join('\n');
    parts.push(`CONTENT GAPS — attributes competitors cover that you don't:\n${formatted}\nIMPORTANT: Cover these gap attributes in your output.`);
  }

  return parts.length > 0 ? '\n' + parts.join('\n\n') + '\n' : '';
}

function buildPrompt(
  businessInfo: BusinessInfo,
  ctx: EavGenerationContext,
  dialogueContext?: DialogueContext
): string {
  const { language, region, industry, audience, domain } = businessInfo;
  const languageInstruction = getLanguageAndRegionInstruction(language, region);
  const languageName = getLanguageName(language);
  const { pillars } = ctx;

  const csiPredicates = pillars.csiPredicates?.length
    ? pillars.csiPredicates.join(', ')
    : 'not specified';
  const contentAreas = pillars.contentAreas?.length
    ? pillars.contentAreas.join(', ')
    : 'not specified';
  const scPriorities = pillars.scPriorities?.length
    ? pillars.scPriorities.join(', ')
    : 'not specified';

  const competitorSection = buildCompetitorSection(ctx);

  return `${languageInstruction}

You are a Semantic SEO expert implementing Koray Tugberk Gubur's EAV (Entity-Attribute-Value) framework.

Generate a comprehensive dual-layer EAV inventory for the website described below.

LAYER 1 — CENTRAL ENTITY (CE): "${pillars.centralEntity}"
Generate domain knowledge triples about this entity. These are FACTS about the topic
itself, not about the business. Include sub-entities (hyponyms) with their own attributes.

LAYER 2 — SOURCE CONTEXT (SC): "${pillars.sourceContext || 'the business/website'}"
Generate business/company triples. These describe WHO writes about the CE and HOW they
monetize. Include identity, services, trust signals, and expertise markers.

BUSINESS CONTEXT:
- Industry: ${industry || 'not specified'}
- Domain: ${domain || 'not specified'}
- Target Audience: ${audience || 'not specified'}
- CSI Predicates: ${csiPredicates}
- SC Priorities: ${scPriorities}
- Content Areas: ${contentAreas}
${competitorSection}${dialogueContext ? buildDialogueContextSection(dialogueContext, 'eavs') + '\n' : ''}REQUIREMENTS:

Layer 1 (CE) — Generate 20-30 triples:
- Root Attributes (8-10): Definition, function, types, common problems, maintenance,
  applications. What every visitor must know.
- Unique Attributes (6-10): Lifespan, costs/m², specifications, variants, technical
  details. What proves depth of expertise.
- Rare Attributes (4-6): Technical assembly details, failure causes, regulatory
  requirements. What competitors typically don't cover.
- Sub-entities (3-5 entities with 2-3 attributes each): Hyponyms of the CE with
  their own specific attributes.

Layer 2 (SC) — Generate 15-25 triples:
- Identity (4-6): Company type, specialization, founding details
- Services (5-8): Core service offerings that connect SC to CE
- Trust Signals (3-5): Certifications, reviews, guarantees, media presence
- Location (2-3): Service area, regions
  For SC values that are business-specific and you cannot know (exact address,
  phone numbers, team size, review count), use the clipboard emoji as the value
  to indicate the user needs to fill this in.

VALUE RULES:
- CE Layer: Populate ALL values with factual domain knowledge. Use specific numbers,
  units, ranges where applicable.
- SC Layer: Populate values you can infer from context (company type, service types).
  Use the clipboard emoji for values requiring business-specific data (address, phone, exact counts).
- All text values must be in ${languageName}.
- Use snake_case for attribute names (e.g., "levensduur", "kosten_per_m2")
- Set confidence: 0.9 for established domain facts, 0.7 for reasonable inferences,
  0.5 for estimates, 0.0 for clipboard-emoji pending values.

Return JSON:
{
  "eavs": [
    {
      "entity": "the entity name",
      "attribute": "snake_case_predicate",
      "value": "specific populated value or clipboard emoji",
      "category": "ROOT|UNIQUE|RARE|COMMON",
      "classification": "TYPE|COMPONENT|BENEFIT|RISK|PROCESS|SPECIFICATION",
      "confidence": 0.85,
      "layer": "ce|sc"
    }
  ],
  "reasoning": "Brief explanation of attribute coverage strategy"
}`;
}

// ── Response Processing ──

const PENDING_MARKER = '\u{1F4CB}'; // 📋

function processAiResponse(
  raw: any,
  pillars: EavGenerationContext['pillars']
): EavGenerationResult {
  const eavsRaw = Array.isArray(raw?.eavs) ? raw.eavs : [];
  const reasoning = typeof raw?.reasoning === 'string' ? raw.reasoning : '';

  let ceIndex = 0;
  let scIndex = 0;

  const triples: SemanticTriple[] = eavsRaw
    .filter((e: any) => e?.entity && e?.attribute)
    .map((e: any) => {
      const layer = e.layer === 'sc' ? 'sc' : 'ce';
      const id = layer === 'ce' ? `eav-ce-${ceIndex++}` : `eav-sc-${scIndex++}`;
      const value = e.value ?? '';
      const isPending = typeof value === 'string' && value.includes(PENDING_MARKER);
      const confidence = isPending ? 0 : (typeof e.confidence === 'number' ? e.confidence : 0.7);

      const category = ['ROOT', 'UNIQUE', 'RARE', 'COMMON'].includes(e.category)
        ? e.category
        : undefined; // let autoClassifyEavs handle it
      const classification = ['TYPE', 'COMPONENT', 'BENEFIT', 'RISK', 'PROCESS', 'SPECIFICATION'].includes(e.classification)
        ? e.classification
        : undefined;

      return {
        id,
        subject: {
          label: e.entity || pillars.centralEntity,
          type: 'Entity' as const,
        },
        predicate: {
          relation: e.attribute,
          type: 'Property' as const,
          ...(category ? { category } : {}),
          ...(classification ? { classification } : {}),
        },
        object: {
          value: typeof value === 'string' || typeof value === 'number' ? value : String(value),
          type: 'Value' as const,
        },
        confidence,
        source: 'ai',
        context: isPending ? 'needs_input' : 'needs_confirmation',
        entity: e.entity || pillars.centralEntity,
        attribute: e.attribute,
        value: typeof value === 'string' || typeof value === 'number' ? value : String(value),
        category,
        classification,
      } as SemanticTriple;
    });

  // Run autoClassify as safety net for any unclassified triples
  const classified = autoClassifyEavs(triples);

  return { eavs: classified, reasoning };
}

// ── Main Export ──

/**
 * Generate a comprehensive dual-layer EAV inventory using AI.
 *
 * Falls back to rule-based template generation if AI fails.
 */
export async function generateEavsWithAI(
  businessInfo: BusinessInfo,
  ctx: EavGenerationContext,
  dispatch: React.Dispatch<AppAction>,
  dialogueContext?: DialogueContext
): Promise<EavGenerationResult> {
  const prompt = buildPrompt(businessInfo, ctx, dialogueContext);

  const fallback = { eavs: [] as any[], reasoning: 'Fallback — AI generation unavailable' };

  try {
    const result = await dispatchToProvider<any>(businessInfo, {
      gemini: () => geminiService.generateJson(prompt, businessInfo, dispatch, fallback),
      openai: () => openAiService.generateJson(prompt, businessInfo, dispatch, fallback),
      anthropic: () => anthropicService.generateJson(prompt, businessInfo, dispatch, fallback),
      perplexity: () => perplexityService.generateJson(prompt, businessInfo, dispatch, fallback),
      openrouter: () => openRouterService.generateJson(prompt, businessInfo, dispatch, fallback),
    });

    const processed = processAiResponse(result, ctx.pillars);

    // If AI returned too few results, something went wrong — use fallback
    if (processed.eavs.length < 5) {
      console.warn('[eavGeneration] AI returned too few EAVs, falling back to templates');
      return generateFallbackEavs(businessInfo, ctx.pillars.centralEntity);
    }

    return processed;
  } catch (err) {
    console.warn('[eavGeneration] AI generation failed, using fallback:', err);
    return generateFallbackEavs(businessInfo, ctx.pillars.centralEntity);
  }
}

// ── Fallback (existing rule-based pipeline) ──

function generateFallbackEavs(
  businessInfo: BusinessInfo,
  centralEntity: string
): EavGenerationResult {
  const industryType = detectIndustryType(businessInfo);
  const suggestions = getPredicateSuggestions(industryType);
  const highAndMedium = suggestions.filter(s => s.priority === 'high' || s.priority === 'medium');
  const templates = highAndMedium.map((s, i) => {
    const template = generateEavTemplate(s, centralEntity);
    return {
      id: `eav-${i}`,
      ...template,
      subject: template.subject ?? { label: centralEntity, type: 'Entity' as const },
      predicate: template.predicate ?? { relation: '', type: 'Property' as const, category: 'COMMON' as const },
      object: template.object ?? { value: '', type: 'Value' as const },
      source: 'ai',
      confidence: 0.5,
    } as SemanticTriple;
  });

  return {
    eavs: templates,
    reasoning: 'Generated from industry-specific templates (AI unavailable)',
  };
}
