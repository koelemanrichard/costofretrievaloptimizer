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

VALUE RULES — THIS IS CRITICAL:
- CE Layer: You MUST populate EVERY value with factual domain knowledge. NEVER leave
  values empty. Use specific numbers, units, ranges, lists, or descriptive text.
  Example: costs → "€50-€150 per m²", is_a → "online marketing dienstverlener",
  has_feature → "zoekmachine optimalisatie, content marketing, link building"
- SC Layer: Populate values you can infer from context (company type, service types).
  ONLY use the clipboard emoji for values you truly cannot know (exact address, phone
  number, founding year, employee count, review count).
- All text values must be in ${languageName}.
- Use snake_case for attribute names (e.g., "levensduur", "kosten_per_m2")
- Set confidence: 0.9 for established domain facts, 0.7 for reasonable inferences,
  0.5 for estimates, 0.0 for clipboard-emoji pending values.
- IMPORTANT: At least 90% of triples must have populated values. Empty values are
  unacceptable for CE layer attributes.

MINIMUM CATEGORY COUNTS — MANDATORY:
- CE layer must have at least 8 ROOT, 6 UNIQUE, and 4 RARE triples
- Do NOT generate all triples as the same category
- If you cannot think of enough RARE attributes, include: failure causes, maintenance intervals,
  regulatory requirements, assembly details, lifespan data, degradation factors

ONE-SHOT EXAMPLE (for a "heat pump" entity):
[
  {"entity":"heat pump","attribute":"is_a","value":"warmtepomp voor verwarming en koeling","category":"ROOT","classification":"TYPE","confidence":0.9,"layer":"ce"},
  {"entity":"heat pump","attribute":"has_types","value":"lucht-water, water-water, hybride","category":"ROOT","classification":"TYPE","confidence":0.9,"layer":"ce"},
  {"entity":"heat pump","attribute":"costs_per_m2","value":"€50-€150 per m²","category":"ROOT","classification":"SPECIFICATION","confidence":0.8,"layer":"ce"},
  {"entity":"heat pump","attribute":"has_cop_rating","value":"3.0-5.0 afhankelijk van type","category":"UNIQUE","classification":"SPECIFICATION","confidence":0.9,"layer":"ce"},
  {"entity":"heat pump","attribute":"failure_cause","value":"koudemiddellekkage, compressordefect","category":"RARE","classification":"RISK","confidence":0.8,"layer":"ce"},
  {"entity":"heat pump","attribute":"maintenance_interval","value":"jaarlijkse inspectie verplicht","category":"RARE","classification":"PROCESS","confidence":0.85,"layer":"ce"}
]

Return JSON:
{
  "eavs": [
    {
      "entity": "the entity name (REQUIRED)",
      "attribute": "snake_case_predicate (REQUIRED)",
      "value": "specific populated value or clipboard emoji (REQUIRED - NEVER empty)",
      "category": "ROOT|UNIQUE|RARE|COMMON (REQUIRED - assign for every triple)",
      "classification": "TYPE|COMPONENT|BENEFIT|RISK|PROCESS|SPECIFICATION (REQUIRED)",
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

// ── Value Auto-Fill ──

/**
 * Second-pass AI call to populate empty values on EAV triples.
 * Ensures ≥90% of triples have concrete values before presenting to user.
 */
async function autoFillEmptyValues(
  eavs: SemanticTriple[],
  businessInfo: BusinessInfo,
  ctx: EavGenerationContext,
  dispatch: React.Dispatch<AppAction>
): Promise<SemanticTriple[]> {
  const emptyIndices: number[] = [];
  const emptyEavs: Array<{ entity: string; attribute: string; category?: string; layer?: string }> = [];

  for (let i = 0; i < eavs.length; i++) {
    const val = eavs[i].object?.value ?? eavs[i].value;
    if (!val || (typeof val === 'string' && (val.trim() === '' || val.includes(PENDING_MARKER)))) {
      emptyIndices.push(i);
      emptyEavs.push({
        entity: eavs[i].subject?.label || eavs[i].entity || ctx.pillars.centralEntity,
        attribute: eavs[i].predicate?.relation || eavs[i].attribute || '',
        category: eavs[i].predicate?.category || eavs[i].category,
        layer: (eavs[i] as any).context === 'needs_input' ? 'sc' : 'ce',
      });
    }
  }

  if (emptyEavs.length === 0) return eavs;

  const languageInstruction = getLanguageAndRegionInstruction(businessInfo.language, businessInfo.region);
  const languageName = getLanguageName(businessInfo.language);

  const fillPrompt = `${languageInstruction}

You are populating values for Entity-Attribute-Value triples about "${ctx.pillars.centralEntity}".
Business: ${ctx.pillars.sourceContext || businessInfo.domain || 'not specified'}
Industry: ${businessInfo.industry || 'not specified'}

For each attribute below, provide a concrete, factual value in ${languageName}.
Use specific numbers, ranges, lists, or descriptive text. NEVER return empty values.
For business-specific unknowns (exact address, phone, founding year), use reasonable
industry-typical examples prefixed with "bijv. " (example).

Attributes to fill:
${emptyEavs.map((e, i) => `${i + 1}. Entity: "${e.entity}" → Attribute: "${e.attribute}" (${e.category || 'COMMON'}, layer: ${e.layer})`).join('\n')}

Return JSON:
{
  "values": [
    { "index": 0, "value": "concrete value here" },
    ...
  ]
}`;

  const fallback = { values: [] as any[] };

  try {
    const result = await dispatchToProvider<any>(businessInfo, {
      gemini: () => geminiService.generateJson(fillPrompt, businessInfo, dispatch, fallback),
      openai: () => openAiService.generateJson(fillPrompt, businessInfo, dispatch, fallback),
      anthropic: () => anthropicService.generateJson(fillPrompt, businessInfo, dispatch, fallback),
      perplexity: () => perplexityService.generateJson(fillPrompt, businessInfo, dispatch, fallback),
      openrouter: () => openRouterService.generateJson(fillPrompt, businessInfo, dispatch, fallback),
    });

    const filled = Array.isArray(result?.values) ? result.values : [];
    const updated = [...eavs];

    for (const entry of filled) {
      const idx = typeof entry.index === 'number' ? entry.index : -1;
      if (idx >= 0 && idx < emptyIndices.length && entry.value) {
        const eavIdx = emptyIndices[idx];
        const val = String(entry.value);
        updated[eavIdx] = {
          ...updated[eavIdx],
          object: { ...updated[eavIdx].object, value: val, type: 'Value' as const },
          value: val,
          confidence: 0.6,
          context: 'needs_confirmation',
        } as SemanticTriple;
      }
    }

    const remainingEmpty = updated.filter(e => {
      const v = e.object?.value ?? e.value;
      return !v || (typeof v === 'string' && v.trim() === '');
    }).length;
    console.info(`[eavGeneration] Auto-fill: ${filled.length}/${emptyEavs.length} values populated, ${remainingEmpty} still empty`);

    return updated;
  } catch (err) {
    console.warn('[eavGeneration] Auto-fill failed (non-fatal):', err);
    return eavs;
  }
}

// ── Category Rebalancing ──

/**
 * Post-generation pass: if any required category is under minimum count,
 * make a targeted AI call to generate specifically the missing categories.
 */
async function rebalanceCategories(
  eavs: SemanticTriple[],
  businessInfo: BusinessInfo,
  ctx: EavGenerationContext,
  dispatch: React.Dispatch<AppAction>
): Promise<SemanticTriple[]> {
  // Count categories
  const counts: Record<string, number> = { ROOT: 0, UNIQUE: 0, RARE: 0, COMMON: 0 };
  for (const eav of eavs) {
    const cat = eav.predicate?.category;
    if (cat && cat in counts) counts[cat]++;
  }

  const MINIMUMS = { ROOT: 3, UNIQUE: 2, RARE: 2 };
  const needed: Array<{ category: string; count: number }> = [];

  for (const [cat, min] of Object.entries(MINIMUMS)) {
    if (counts[cat] < min) {
      needed.push({ category: cat, count: min - counts[cat] });
    }
  }

  if (needed.length === 0) return eavs;

  const languageInstruction = getLanguageAndRegionInstruction(businessInfo.language, businessInfo.region);
  const languageName = getLanguageName(businessInfo.language);

  const neededDesc = needed.map(n => `${n.count} ${n.category}`).join(', ');
  const existingPredicates = eavs.map(e => e.predicate?.relation || e.attribute).filter(Boolean).join(', ');

  const rebalancePrompt = `${languageInstruction}

You are generating additional EAV (Entity-Attribute-Value) triples for "${ctx.pillars.centralEntity}".
Industry: ${businessInfo.industry || 'not specified'}

The current set is missing these categories: ${neededDesc}.
Do NOT duplicate these existing predicates: ${existingPredicates}

Generate EXACTLY the missing triples with POPULATED values in ${languageName}.

Category guidelines:
- ROOT: Core identity facts (definition, function, types, common problems, applications)
- UNIQUE: Differentiating attributes (costs, specifications, variants, technical details)
- RARE: Expert-level details (failure causes, maintenance intervals, regulatory requirements, assembly, lifespan, degradation)

Return JSON:
{
  "eavs": [
    {
      "entity": "entity name",
      "attribute": "snake_case_predicate",
      "value": "concrete value",
      "category": "ROOT|UNIQUE|RARE",
      "classification": "TYPE|COMPONENT|BENEFIT|RISK|PROCESS|SPECIFICATION",
      "confidence": 0.7,
      "layer": "ce"
    }
  ]
}`;

  const fallback = { eavs: [] as any[] };

  try {
    const raw = await dispatchToProvider<any>(businessInfo, {
      gemini: () => geminiService.generateJson(rebalancePrompt, businessInfo, dispatch, fallback),
      openai: () => openAiService.generateJson(rebalancePrompt, businessInfo, dispatch, fallback),
      anthropic: () => anthropicService.generateJson(rebalancePrompt, businessInfo, dispatch, fallback),
      perplexity: () => perplexityService.generateJson(rebalancePrompt, businessInfo, dispatch, fallback),
      openrouter: () => openRouterService.generateJson(rebalancePrompt, businessInfo, dispatch, fallback),
    });

    const newEavs = Array.isArray(raw?.eavs) ? raw.eavs : [];
    if (newEavs.length === 0) return eavs;

    const startIdx = eavs.length;
    const additionalTriples: SemanticTriple[] = newEavs
      .filter((e: any) => e?.entity && e?.attribute && e?.value)
      .map((e: any, i: number) => {
        const category = ['ROOT', 'UNIQUE', 'RARE', 'COMMON'].includes(e.category) ? e.category : undefined;
        const classification = ['TYPE', 'COMPONENT', 'BENEFIT', 'RISK', 'PROCESS', 'SPECIFICATION'].includes(e.classification) ? e.classification : undefined;
        return {
          id: `eav-ce-rebal-${startIdx + i}`,
          subject: { label: e.entity || ctx.pillars.centralEntity, type: 'Entity' as const },
          predicate: {
            relation: e.attribute,
            type: 'Property' as const,
            ...(category ? { category } : {}),
            ...(classification ? { classification } : {}),
          },
          object: { value: String(e.value), type: 'Value' as const },
          confidence: typeof e.confidence === 'number' ? e.confidence : 0.7,
          source: 'ai',
          context: 'needs_confirmation',
          entity: e.entity || ctx.pillars.centralEntity,
          attribute: e.attribute,
          value: String(e.value),
          category,
          classification,
        } as SemanticTriple;
      });

    const merged = [...eavs, ...autoClassifyEavs(additionalTriples)];
    console.info(`[eavGeneration] Rebalance: added ${additionalTriples.length} triples for missing categories: ${neededDesc}`);
    return merged;
  } catch (err) {
    console.warn('[eavGeneration] Rebalance failed (non-fatal):', err);
    return eavs;
  }
}

// ── Main Export ──

/**
 * Generate a comprehensive dual-layer EAV inventory using AI.
 *
 * Falls back to rule-based template generation if AI fails.
 * Always runs auto-fill pass to ensure ≥90% value population.
 */
export async function generateEavsWithAI(
  businessInfo: BusinessInfo,
  ctx: EavGenerationContext,
  dispatch: React.Dispatch<AppAction>,
  dialogueContext?: DialogueContext
): Promise<EavGenerationResult> {
  const prompt = buildPrompt(businessInfo, ctx, dialogueContext);

  const fallback = { eavs: [] as any[], reasoning: 'Fallback — AI generation unavailable' };

  let result: EavGenerationResult;

  try {
    const raw = await dispatchToProvider<any>(businessInfo, {
      gemini: () => geminiService.generateJson(prompt, businessInfo, dispatch, fallback),
      openai: () => openAiService.generateJson(prompt, businessInfo, dispatch, fallback),
      anthropic: () => anthropicService.generateJson(prompt, businessInfo, dispatch, fallback),
      perplexity: () => perplexityService.generateJson(prompt, businessInfo, dispatch, fallback),
      openrouter: () => openRouterService.generateJson(prompt, businessInfo, dispatch, fallback),
    });

    const processed = processAiResponse(raw, ctx.pillars);

    // If AI returned too few results, something went wrong — use fallback
    if (processed.eavs.length < 5) {
      console.warn('[eavGeneration] AI returned too few EAVs, falling back to templates');
      result = generateFallbackEavs(businessInfo, ctx.pillars.centralEntity);
    } else {
      result = processed;
    }
  } catch (err) {
    console.warn('[eavGeneration] AI generation failed, using fallback:', err);
    result = generateFallbackEavs(businessInfo, ctx.pillars.centralEntity);
  }

  // Rebalance pass: ensure minimum category distribution
  result.eavs = await rebalanceCategories(result.eavs, businessInfo, ctx, dispatch);

  // Auto-fill pass: populate any remaining empty values
  const emptyCount = result.eavs.filter(e => {
    const v = e.object?.value ?? e.value;
    return !v || (typeof v === 'string' && (v.trim() === '' || v.includes(PENDING_MARKER)));
  }).length;

  if (emptyCount > 0 && emptyCount / result.eavs.length > 0.1) {
    console.info(`[eavGeneration] ${emptyCount}/${result.eavs.length} EAVs need values, running auto-fill`);
    result.eavs = await autoFillEmptyValues(result.eavs, businessInfo, ctx, dispatch);
  }

  return result;
}

// ── Fallback (existing rule-based pipeline) ──

function generateFallbackEavs(
  businessInfo: BusinessInfo,
  centralEntity: string
): EavGenerationResult {
  const industryType = detectIndustryType(businessInfo);
  const suggestions = getPredicateSuggestions(industryType);
  // Include ALL priority levels to get RARE predicates (not just high+medium)
  const templates = suggestions.map((s, i) => {
    const template = generateEavTemplate(s, centralEntity);
    return {
      id: `eav-${i}`,
      ...template,
      subject: template.subject ?? { label: centralEntity, type: 'Entity' as const },
      predicate: template.predicate ?? { relation: '', type: 'Property' as const, category: 'COMMON' as const },
      // Use exampleValue from suggestion instead of empty string
      object: { value: s.exampleValue || '', type: 'Value' as const },
      source: 'ai',
      confidence: 0.5,
    } as SemanticTriple;
  });

  return {
    eavs: templates,
    reasoning: 'Generated from industry-specific templates (AI unavailable)',
  };
}
