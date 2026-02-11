// services/ai/briefRegeneration/orchestrator.ts
// Orchestrates multi-pass content brief regeneration
// Breaks regeneration into manageable chunks to handle large briefs reliably

import { BusinessInfo, ContentBrief, EnrichedTopic, SEOPillars, BriefSection, SemanticTriple } from '../../../types';
import { AppAction } from '../../../state/appState';
import { RegenerationProgress, RegenerationResult, ProgressCallback } from './index';
import { regenerateMetaAndStrategy } from './passes/metaStrategy';
import { regenerateSectionsBatch } from './passes/sectionsBatch';
import { regenerateLinkingAndBridge } from './passes/linkingBridge';
import { generateSectionsFromScratch } from './passes/sectionsGeneration';
import { assembleFinalBrief } from './passes/assembly';
import React from 'react';
import { SERVICE_REGISTRY } from '../../../config/serviceRegistry';

// Configuration for batch processing
const SECTION_BATCH_SIZE = SERVICE_REGISTRY.limits.batchSize.orchestrator;

/**
 * Multi-pass brief regeneration orchestrator
 *
 * Passes:
 * 1. Meta & Strategy: title, slug, meta description, key takeaways, perspectives
 * 2. Sections (batched): Process structured_outline in batches
 * 3. Linking & Bridge: contextual bridge, discourse anchors, visual semantics
 * 4. Assembly: Combine all parts, validate coherence
 */
export async function regenerateBriefMultiPass(
  businessInfo: BusinessInfo,
  topic: EnrichedTopic,
  currentBrief: ContentBrief,
  userInstructions: string,
  pillars: SEOPillars,
  allTopics: EnrichedTopic[],
  dispatch: React.Dispatch<AppAction>,
  onProgress?: ProgressCallback,
  eavs?: SemanticTriple[]  // Optional EAVs for section generation when structured_outline is empty
): Promise<RegenerationResult> {
  const sectionCount = currentBrief.structured_outline?.length || 0;
  const sectionBatches = Math.ceil(sectionCount / SECTION_BATCH_SIZE);

  // Total passes: 1 (meta) + N (section batches) + 1 (linking) + 1 (assembly)
  const totalPasses = 1 + Math.max(1, sectionBatches) + 1 + 1;
  let currentPass = 0;

  const logProgress = (passName: string, description: string, sectionsProcessed = 0) => {
    currentPass++;
    const progress: RegenerationProgress = {
      currentPass,
      totalPasses,
      passName,
      passDescription: description,
      sectionsProcessed,
      totalSections: sectionCount,
      percentComplete: Math.round((currentPass / totalPasses) * 100)
    };

    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'BriefRegeneration',
        message: `[${currentPass}/${totalPasses}] ${passName}: ${description}`,
        status: 'info',
        timestamp: Date.now()
      }
    });

    if (onProgress) {
      onProgress(progress);
    }
  };

  try {
    // Log the current brief state for debugging
    console.log('[BriefRegeneration] Starting multi-pass regeneration:', {
      sectionCount,
      totalPasses,
      hasStructuredOutline: !!currentBrief.structured_outline,
      structuredOutlineLength: currentBrief.structured_outline?.length || 0,
      briefTitle: currentBrief.title
    });

    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'BriefRegeneration',
        message: `Starting multi-pass regeneration (${sectionCount} sections, ${totalPasses} passes)`,
        status: 'info',
        timestamp: Date.now()
      }
    });

    // ========================================
    // PASS 1: Meta & Strategy
    // ========================================
    logProgress('Meta & Strategy', 'Regenerating title, description, key takeaways, and perspectives');

    const metaResult = await regenerateMetaAndStrategy(
      businessInfo,
      topic,
      currentBrief,
      userInstructions,
      pillars,
      dispatch
    );

    if (!metaResult.success) {
      throw new Error(metaResult.error || 'Failed to regenerate meta & strategy');
    }

    // ========================================
    // PASS 2+: Section Batches (or Generation if empty)
    // ========================================
    const currentSections = currentBrief.structured_outline || [];
    let regeneratedSections: BriefSection[] = [];

    // CRITICAL: If no sections exist, generate them from scratch first
    if (currentSections.length === 0) {
      logProgress(
        'Section Generation',
        'No sections exist - generating structured outline from scratch',
        0
      );

      dispatch({
        type: 'LOG_EVENT',
        payload: {
          service: 'BriefRegeneration',
          message: 'structured_outline is empty. Generating sections from scratch using topic context and EAVs.',
          status: 'info',
          timestamp: Date.now()
        }
      });

      const generationResult = await generateSectionsFromScratch(
        businessInfo,
        topic,
        currentBrief,
        userInstructions,
        pillars,
        allTopics,
        eavs || [], // Use provided EAVs or empty array
        dispatch
      );

      if (generationResult.success && generationResult.sections && generationResult.sections.length > 0) {
        regeneratedSections = generationResult.sections;
        dispatch({
          type: 'LOG_EVENT',
          payload: {
            service: 'BriefRegeneration',
            message: `Generated ${regeneratedSections.length} sections from scratch.`,
            status: 'success',
            timestamp: Date.now()
          }
        });
      } else {
        dispatch({
          type: 'LOG_EVENT',
          payload: {
            service: 'BriefRegeneration',
            message: `Failed to generate sections: ${generationResult.error || 'Unknown error'}`,
            status: 'failure',
            timestamp: Date.now()
          }
        });
        // Continue without sections - the brief will be incomplete but won't crash
      }
    } else {
      // Process existing sections in batches
      for (let batchIndex = 0; batchIndex < sectionBatches; batchIndex++) {
        const startIdx = batchIndex * SECTION_BATCH_SIZE;
        const endIdx = Math.min(startIdx + SECTION_BATCH_SIZE, currentSections.length);
        const batchSections = currentSections.slice(startIdx, endIdx);

        logProgress(
          `Sections (batch ${batchIndex + 1}/${sectionBatches})`,
          `Processing sections ${startIdx + 1}-${endIdx} of ${sectionCount}`,
          endIdx
        );

        const batchResult = await regenerateSectionsBatch(
          businessInfo,
          topic,
          batchSections,
          currentBrief,
          userInstructions,
          pillars,
          allTopics,
          dispatch,
          startIdx, // context: where in the outline we are
          sectionCount
        );

        if (!batchResult.success) {
          // On failure, preserve original sections for this batch
          dispatch({
            type: 'LOG_EVENT',
            payload: {
              service: 'BriefRegeneration',
              message: `Warning: Batch ${batchIndex + 1} failed. Preserving original sections.`,
              status: 'warning',
              timestamp: Date.now()
            }
          });
          regeneratedSections.push(...batchSections);
        } else {
          regeneratedSections.push(...(batchResult.sections || batchSections));
        }
      }
    }

    // ========================================
    // PASS N+1: Linking & Bridge
    // ========================================
    logProgress('Linking & Bridge', 'Regenerating contextual bridge, discourse anchors, and visual semantics');

    const linkingResult = await regenerateLinkingAndBridge(
      businessInfo,
      topic,
      regeneratedSections,
      currentBrief,
      userInstructions,
      pillars,
      allTopics,
      dispatch
    );

    // If linking fails, use defaults from current brief
    if (!linkingResult.success) {
      dispatch({
        type: 'LOG_EVENT',
        payload: {
          service: 'BriefRegeneration',
          message: 'Warning: Linking regeneration failed. Preserving original linking data.',
          status: 'warning',
          timestamp: Date.now()
        }
      });
    }

    // ========================================
    // FINAL PASS: Assembly
    // ========================================
    logProgress('Assembly', 'Combining all parts and validating coherence');

    const finalBrief = assembleFinalBrief(
      currentBrief,
      metaResult.meta!,
      regeneratedSections,
      linkingResult.success ? linkingResult.linking! : {
        contextualBridge: currentBrief.contextualBridge,
        discourse_anchors: currentBrief.discourse_anchors,
        visual_semantics: currentBrief.visual_semantics
      }
    );

    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'BriefRegeneration',
        message: `Multi-pass regeneration complete. Final brief has ${finalBrief.structured_outline?.length || 0} sections.`,
        status: 'info',
        timestamp: Date.now()
      }
    });

    return {
      success: true,
      brief: finalBrief
    };

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error during regeneration';

    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'BriefRegeneration',
        message: `Multi-pass regeneration failed: ${message}`,
        status: 'failure',
        timestamp: Date.now()
      }
    });

    return {
      success: false,
      brief: null,
      error: message
    };
  }
}
