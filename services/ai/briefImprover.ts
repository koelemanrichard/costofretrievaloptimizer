/**
 * Brief Improvement Service
 *
 * Multi-pass improvement for briefs scoring 50-84%. Uses targeted
 * fix prompts (~700 tokens each) instead of full regeneration (~8000 tokens).
 *
 * @module services/ai/briefImprover
 */

import type { ContentBrief, EnrichedTopic, BusinessInfo, SEOPillars, SemanticTriple } from '../../types';
import type { BriefQualityReport, TopicConfig } from '../../types/actionPlan';
import { reviewBriefQuality } from './briefQualityReview';
import { dispatchToProvider } from './providerDispatcher';
import * as geminiService from '../geminiService';
import * as openAiService from '../openAiService';
import * as anthropicService from '../anthropicService';
import * as perplexityService from '../perplexityService';
import * as openRouterService from '../openRouterService';
import { AIResponseSanitizer } from '../aiResponseSanitizer';
import {
  FIX_MISSING_SUBORDINATE_TEXT,
  FIX_MISSING_INTERNAL_LINKS,
  FIX_MISSING_FEATURED_SNIPPET,
  FIX_WEAK_CONTEXTUAL_BRIDGE,
  FIX_MISSING_EAVS,
} from '../../config/prompts/briefFixes';
import React from 'react';

interface ImprovementContext {
  businessInfo: BusinessInfo;
  pillars: SEOPillars;
  allTopics: EnrichedTopic[];
  eavs?: SemanticTriple[];
  topicConfig?: TopicConfig;
  allBriefs?: Record<string, ContentBrief>;
}

export async function improveBrief(
  brief: ContentBrief,
  qualityReport: BriefQualityReport,
  topic: EnrichedTopic,
  context: ImprovementContext,
  dispatch: React.Dispatch<any>,
): Promise<{ improved: ContentBrief; newReport: BriefQualityReport }> {
  let improved = { ...brief };
  const failingChecks = qualityReport.checks.filter(c => !c.passed);

  dispatch({
    type: 'LOG_EVENT',
    payload: {
      service: 'BriefImprover',
      message: `Improving brief for "${topic.title}" (score: ${qualityReport.score}%, ${failingChecks.length} failing checks)`,
      status: 'info',
      timestamp: Date.now(),
    },
  });

  // Fix subordinate text
  if (failingChecks.some(c => c.name === 'Subordinate Text')) {
    try {
      const prompt = FIX_MISSING_SUBORDINATE_TEXT(
        improved,
        context.businessInfo.language,
        context.businessInfo.region
      );
      const result = await callProvider(prompt, context.businessInfo, dispatch);
      if (result?.fixes && Array.isArray(result.fixes)) {
        const outline = [...(improved.structured_outline ?? [])];
        for (const fix of result.fixes) {
          const section = outline.find(s => s.heading === fix.heading);
          if (section && fix.subordinate_text_hint) {
            section.subordinate_text_hint = fix.subordinate_text_hint;
          }
        }
        improved = { ...improved, structured_outline: outline };
      }
    } catch (err) {
      console.warn('[briefImprover] Subordinate text fix failed:', err);
    }
  }

  // Fix internal links
  if (failingChecks.some(c => c.name === 'Internal Links')) {
    try {
      const topicTitles = context.allTopics
        .filter(t => t.id !== topic.id)
        .map(t => t.title);
      const prompt = FIX_MISSING_INTERNAL_LINKS(
        improved,
        topicTitles,
        context.businessInfo.language,
        context.businessInfo.region
      );
      const result = await callProvider(prompt, context.businessInfo, dispatch);
      if (result?.links && Array.isArray(result.links)) {
        const existingBridge = improved.contextualBridge;
        if (existingBridge && !Array.isArray(existingBridge) && 'links' in existingBridge) {
          (existingBridge as any).links = [
            ...((existingBridge as any).links || []),
            ...result.links,
          ].slice(0, 4);
        } else {
          improved = {
            ...improved,
            contextualBridge: {
              type: 'section',
              content: (existingBridge && !Array.isArray(existingBridge) && 'content' in existingBridge)
                ? existingBridge.content
                : '',
              links: result.links.slice(0, 4),
            } as any,
          };
        }
      }
    } catch (err) {
      console.warn('[briefImprover] Internal links fix failed:', err);
    }
  }

  // Fix featured snippet
  if (failingChecks.some(c => c.name === 'Featured Snippet')) {
    try {
      const prompt = FIX_MISSING_FEATURED_SNIPPET(
        improved,
        topic.title,
        context.businessInfo.language,
        context.businessInfo.region
      );
      const result = await callProvider(prompt, context.businessInfo, dispatch);
      if (result?.featured_snippet_target) {
        improved = { ...improved, featured_snippet_target: result.featured_snippet_target };
      }
    } catch (err) {
      console.warn('[briefImprover] Featured snippet fix failed:', err);
    }
  }

  // Fix contextual bridge
  if (failingChecks.some(c => c.name === 'Contextual Bridge')) {
    try {
      const prompt = FIX_WEAK_CONTEXTUAL_BRIDGE(
        improved,
        context.pillars.centralEntity,
        context.businessInfo.language,
        context.businessInfo.region
      );
      const result = await callProvider(prompt, context.businessInfo, dispatch);
      if (result?.contextualBridge) {
        const existingBridge = improved.contextualBridge;
        const existingLinks = existingBridge && !Array.isArray(existingBridge) && 'links' in existingBridge
          ? (existingBridge as any).links
          : [];
        improved = {
          ...improved,
          contextualBridge: {
            ...result.contextualBridge,
            links: existingLinks,
          } as any,
        };
      }
    } catch (err) {
      console.warn('[briefImprover] Contextual bridge fix failed:', err);
    }
  }

  // Fix EAV mapping
  if (failingChecks.some(c => c.name === 'EAV Coverage') && context.eavs && context.eavs.length > 0) {
    try {
      const prompt = FIX_MISSING_EAVS(
        improved,
        context.eavs,
        context.businessInfo.language,
        context.businessInfo.region
      );
      const result = await callProvider(prompt, context.businessInfo, dispatch);
      if (result?.mappings && Array.isArray(result.mappings)) {
        const outline = [...(improved.structured_outline ?? [])];
        for (const mapping of result.mappings) {
          const section = outline.find(s => s.heading === mapping.heading);
          if (section && Array.isArray(mapping.mapped_eavs)) {
            section.mapped_eavs = mapping.mapped_eavs;
          }
        }
        improved = { ...improved, structured_outline: outline };
      }
    } catch (err) {
      console.warn('[briefImprover] EAV mapping fix failed:', err);
    }
  }

  // Re-run quality review
  const newReport = reviewBriefQuality(
    improved,
    topic,
    context.businessInfo,
    context.pillars,
    context.allTopics,
    context.eavs,
    context.topicConfig,
    context.allBriefs,
    context.businessInfo.websiteType,
  );

  dispatch({
    type: 'LOG_EVENT',
    payload: {
      service: 'BriefImprover',
      message: `Brief improvement complete for "${topic.title}": ${qualityReport.score}% → ${newReport.score}%`,
      status: newReport.score > qualityReport.score ? 'info' : 'warning',
      timestamp: Date.now(),
    },
  });

  return { improved, newReport };
}

// ── Helper: call AI provider for a fix prompt ──

async function callProvider(
  prompt: string,
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<any>
): Promise<any> {
  const fallback = {};
  const result = await dispatchToProvider(businessInfo, {
    gemini: () => geminiService.generateJson(prompt, businessInfo, dispatch, fallback),
    openai: () => openAiService.generateJson(prompt, businessInfo, dispatch, fallback),
    anthropic: () => anthropicService.generateJson(prompt, businessInfo, dispatch, fallback),
    perplexity: () => perplexityService.generateJson(prompt, businessInfo, dispatch, fallback),
    openrouter: () => openRouterService.generateJson(prompt, businessInfo, dispatch, fallback),
  });
  return result;
}
