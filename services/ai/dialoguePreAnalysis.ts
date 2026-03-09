/**
 * Dialogue Pre-Analysis Engine
 *
 * Runs algorithmic validators BEFORE AI question generation to produce
 * concrete, data-backed findings. The dialogue engine then generates
 * questions ONLY about detected issues — not generic focus areas.
 *
 * All validators are algorithmic (no AI calls), targeting <200ms total.
 */

import type { BusinessInfo, EnrichedTopic, SemanticTriple } from '../../types';
import type { DialogueContext, DialogueStep } from '../../types/dialogue';
import { detectTitleCannibalization } from './clustering';
import { FrameSemanticsAnalyzer } from './frameSemanticsAnalyzer';
import { TMDDetector } from './tmdDetector';
import type { TopicNode } from './tmdDetector';
import { TopicalBorderValidator } from './topicalBorderValidator';
import { IndexConstructionRule } from './indexConstructionRule';
import type { TopicSignals } from './indexConstructionRule';
import { auditEavs } from './eavAudit';
import { extractServicesFromEavs } from '../../utils/eavUtils';

// ── Types ──

export type FindingCategory =
  | 'title_cannibalization'
  | 'depth_imbalance'
  | 'missing_frame'
  | 'border_violation'
  | 'page_worthiness'
  | 'service_gap'
  | 'eav_inconsistency'
  | 'eav_category_gap'
  | 'eav_pending_values'
  | 'ce_ambiguity'
  | 'sc_specificity'
  | 'csi_coverage';

export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface PreAnalysisFinding {
  category: FindingCategory;
  severity: FindingSeverity;
  title: string;
  details: string;
  affectedItems: string[];
  suggestedAction: string;
  autoFixable: boolean;
}

export interface PreAnalysisResult {
  findings: PreAnalysisFinding[];
  healthScore: number;
  validatorsRun: string[];
  validatorsSkipped: string[];
  durationMs: number;
}

// ── Health Score ──

const SEVERITY_PENALTY: Record<FindingSeverity, number> = {
  critical: 15,
  high: 8,
  medium: 4,
  low: 1,
};

export function calculateHealthScore(findings: PreAnalysisFinding[]): number {
  const totalPenalty = findings.reduce(
    (sum, f) => sum + SEVERITY_PENALTY[f.severity],
    0
  );
  return Math.max(0, 100 - totalPenalty);
}

// ── Auto-fixable classification ──

const AUTO_FIXABLE_CATEGORIES: Record<FindingCategory, boolean> = {
  title_cannibalization: true,
  depth_imbalance: true,
  missing_frame: true,
  border_violation: true,
  page_worthiness: true,
  service_gap: false,
  eav_inconsistency: true,
  eav_category_gap: false,
  eav_pending_values: false,
  ce_ambiguity: false,
  sc_specificity: false,
  csi_coverage: false,
};

export function partitionFindings(findings: PreAnalysisFinding[]): {
  userQuestions: PreAnalysisFinding[];
  frameworkIssues: PreAnalysisFinding[];
} {
  return {
    userQuestions: findings.filter(f => !f.autoFixable),
    frameworkIssues: findings.filter(f => f.autoFixable),
  };
}

// ── Jaccard Word Distance (fallback for border validation) ──

function jaccardWordDistance(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  if (wordsA.size === 0 && wordsB.size === 0) return 0;
  const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  return union.size > 0 ? 1 - intersection.size / union.size : 1;
}

// ── Main Entry Point ──

export function runPreAnalysis(
  step: DialogueStep,
  stepOutput: unknown,
  businessInfo: BusinessInfo,
  dialogueContext?: DialogueContext
): PreAnalysisResult {
  const start = performance.now();
  const findings: PreAnalysisFinding[] = [];
  const validatorsRun: string[] = [];
  const validatorsSkipped: string[] = [];

  switch (step) {
    case 'map_planning':
      analyzeMapPlanning(stepOutput, businessInfo, dialogueContext, findings, validatorsRun, validatorsSkipped);
      break;
    case 'eavs':
      analyzeEavs(stepOutput, findings, validatorsRun, validatorsSkipped);
      break;
    case 'strategy':
      analyzeStrategy(stepOutput, findings, validatorsRun, validatorsSkipped);
      break;
  }

  return {
    findings,
    healthScore: calculateHealthScore(findings),
    validatorsRun,
    validatorsSkipped,
    durationMs: Math.round(performance.now() - start),
  };
}

// ── Map Planning Analyzer ──

function analyzeMapPlanning(
  stepOutput: unknown,
  businessInfo: BusinessInfo,
  dialogueContext: DialogueContext | undefined,
  findings: PreAnalysisFinding[],
  validatorsRun: string[],
  validatorsSkipped: string[]
): void {
  const output = stepOutput as any;
  const topics: EnrichedTopic[] = Array.isArray(output?.topics) ? output.topics : [];

  if (topics.length === 0) {
    validatorsSkipped.push('detectTitleCannibalization', 'FrameSemanticsAnalyzer', 'TMDDetector', 'TopicalBorderValidator', 'IndexConstructionRule');
    return;
  }

  // 1. Title Cannibalization
  runTitleCannibalization(topics, findings, validatorsRun, validatorsSkipped);

  // 2. Frame Coverage
  runFrameCoverage(topics, findings, validatorsRun, validatorsSkipped);

  // 3. TMD Depth Skew
  runTmdDetection(topics, findings, validatorsRun, validatorsSkipped);

  // 4. Topical Border Validation
  const ce = extractCentralEntity(output, dialogueContext);
  runBorderValidation(ce, topics, findings, validatorsRun, validatorsSkipped);

  // 5. Page Worthiness
  runPageWorthiness(topics, findings, validatorsRun, validatorsSkipped);

  // 6. Service Alignment — check if all business services have hub topics
  // Prefer user-confirmed services over re-extracting from EAVs
  const userConfirmedServices: string[] | undefined = Array.isArray(output?.confirmedServices) ? output.confirmedServices : undefined;
  const eavs: SemanticTriple[] = Array.isArray(output?.eavs) ? output.eavs : [];
  const centralEntity = ce || '';
  if ((userConfirmedServices && userConfirmedServices.length > 0) || (eavs.length > 0 && centralEntity)) {
    runServiceAlignment(topics, eavs, centralEntity, findings, validatorsRun, validatorsSkipped, userConfirmedServices);
  } else {
    validatorsSkipped.push('ServiceAlignment');
  }

  // 7. Hub-Spoke Compliance — each hub (pillar) should have ≥3 spokes
  runHubSpokeCompliance(topics, findings, validatorsRun, validatorsSkipped);
}

// ── Map Planning Sub-Validators ──

function runTitleCannibalization(
  topics: EnrichedTopic[],
  findings: PreAnalysisFinding[],
  validatorsRun: string[],
  validatorsSkipped: string[]
): void {
  try {
    const risks = detectTitleCannibalization(topics);
    validatorsRun.push('detectTitleCannibalization');

    for (const risk of risks) {
      const pct = Math.round(risk.similarity * 100);
      findings.push({
        category: 'title_cannibalization',
        severity: risk.similarity > 0.85 ? 'critical' : 'high',
        title: `"${risk.topicA.title}" and "${risk.topicB.title}" overlap ${pct}%`,
        details: `Jaccard word similarity is ${pct}%. These topics risk cannibalizing each other in search results.`,
        affectedItems: [risk.topicA.id, risk.topicB.id],
        suggestedAction: 'Merge into a single comprehensive page or differentiate their angles',
        autoFixable: AUTO_FIXABLE_CATEGORIES['title_cannibalization'],
      });
    }
  } catch (err) {
    console.warn('[dialoguePreAnalysis] detectTitleCannibalization failed:', err);
    validatorsSkipped.push('detectTitleCannibalization');
  }
}

function runFrameCoverage(
  topics: EnrichedTopic[],
  findings: PreAnalysisFinding[],
  validatorsRun: string[],
  validatorsSkipped: string[]
): void {
  try {
    const titles = topics.map(t => t.title);
    const report = FrameSemanticsAnalyzer.analyze(titles);
    validatorsRun.push('FrameSemanticsAnalyzer');

    const uncoveredFrames = report.frameResults.filter(
      fr => fr.coveredCore.length === 0 && fr.missingCore.length > 0
    );

    if (uncoveredFrames.length > 0) {
      // Promote to critical if <7/10 frames covered (map quality gate blocker)
      const coveredFrameCount = report.frameResults.length - uncoveredFrames.length;
      const severity: FindingSeverity = coveredFrameCount < 7 ? 'critical' : uncoveredFrames.length > 3 ? 'high' : 'medium';
      for (const fr of uncoveredFrames) {
        findings.push({
          category: 'missing_frame',
          severity,
          title: `No topics cover "${fr.frame.name}" frame (${fr.frame.description})`,
          details: `Missing core elements: ${fr.missingCore.join(', ')}`,
          affectedItems: [fr.frame.name],
          suggestedAction: `Add topics about ${fr.missingCore.slice(0, 3).join(', ')}`,
          autoFixable: AUTO_FIXABLE_CATEGORIES['missing_frame'],
        });
      }
    }
  } catch (err) {
    console.warn('[dialoguePreAnalysis] FrameSemanticsAnalyzer failed:', err);
    validatorsSkipped.push('FrameSemanticsAnalyzer');
  }
}

function runTmdDetection(
  topics: EnrichedTopic[],
  findings: PreAnalysisFinding[],
  validatorsRun: string[],
  validatorsSkipped: string[]
): void {
  try {
    const topicNodes: TopicNode[] = topics.map(t => {
      const parentTopic = t.parent_topic_id
        ? topics.find(p => p.id === t.parent_topic_id)
        : null;
      return {
        name: t.title,
        parent: parentTopic?.title || null,
        cluster: t.cluster_role === 'pillar' ? t.title : (parentTopic?.title || t.title),
      };
    });

    if (topicNodes.length < 3) {
      validatorsSkipped.push('TMDDetector');
      return;
    }

    const report = TMDDetector.analyze(topicNodes);
    validatorsRun.push('TMDDetector');

    if (!report.isBalanced) {
      const shallowList = report.shallowClusters.join(', ') || 'none';
      const deepList = report.deepClusters.join(', ') || 'none';

      findings.push({
        category: 'depth_imbalance',
        severity: report.tmdRatio > 3.0 ? 'critical' : 'high',
        title: `TMD ratio ${report.tmdRatio} — map depth is unbalanced`,
        details: `Shallow clusters: ${shallowList}. Deep clusters: ${deepList}.`,
        affectedItems: [...report.shallowClusters, ...report.deepClusters],
        suggestedAction: report.suggestions[0] || 'Expand shallow clusters or redistribute deep ones',
        autoFixable: AUTO_FIXABLE_CATEGORIES['depth_imbalance'],
      });
    }

    // Check topic count imbalance per cluster
    const avgCount = topics.length / (report.clusters.length || 1);
    for (const cluster of report.clusters) {
      if (cluster.topicCount < avgCount * 0.3 && report.clusters.length > 1) {
        findings.push({
          category: 'depth_imbalance',
          severity: 'medium',
          title: `Cluster "${cluster.clusterName}" has only ${cluster.topicCount} topics (avg: ${Math.round(avgCount)})`,
          details: `This cluster is significantly underdeveloped compared to others.`,
          affectedItems: [cluster.clusterName],
          suggestedAction: `Expand "${cluster.clusterName}" with subtopics or merge into a related cluster`,
          autoFixable: AUTO_FIXABLE_CATEGORIES['depth_imbalance'],
        });
      }
    }
  } catch (err) {
    console.warn('[dialoguePreAnalysis] TMDDetector failed:', err);
    validatorsSkipped.push('TMDDetector');
  }
}

function runBorderValidation(
  centralEntity: string | null,
  topics: EnrichedTopic[],
  findings: PreAnalysisFinding[],
  validatorsRun: string[],
  validatorsSkipped: string[]
): void {
  if (!centralEntity) {
    validatorsSkipped.push('TopicalBorderValidator');
    return;
  }

  try {
    const topicTitles = topics.map(t => t.title);
    const report = TopicalBorderValidator.validateMap(
      centralEntity,
      topicTitles,
      jaccardWordDistance
    );
    validatorsRun.push('TopicalBorderValidator');

    if (report.outsideBorders > 0) {
      const outsideTopics: string[] = [];
      report.topicResults.forEach((result, topic) => {
        if (result.risk === 'high') outsideTopics.push(topic);
      });

      findings.push({
        category: 'border_violation',
        severity: outsideTopics.length > 3 ? 'critical' : 'high',
        title: `${outsideTopics.length} topic(s) outside topical borders of "${centralEntity}"`,
        details: `Topics far from CE: ${outsideTopics.slice(0, 5).join(', ')}${outsideTopics.length > 5 ? ` (+${outsideTopics.length - 5} more)` : ''}`,
        affectedItems: outsideTopics,
        suggestedAction: 'Remove these topics, add bridge content, or create a separate topical map',
        autoFixable: AUTO_FIXABLE_CATEGORIES['border_violation'],
      });
    }

    if (report.atRisk > 0) {
      const atRiskTopics: string[] = [];
      report.topicResults.forEach((result, topic) => {
        if (result.risk === 'medium') atRiskTopics.push(topic);
      });

      if (atRiskTopics.length > 0) {
        findings.push({
          category: 'border_violation',
          severity: 'medium',
          title: `${atRiskTopics.length} topic(s) near the topical border`,
          details: `Topics at risk: ${atRiskTopics.slice(0, 5).join(', ')}${atRiskTopics.length > 5 ? ` (+${atRiskTopics.length - 5} more)` : ''}`,
          affectedItems: atRiskTopics,
          suggestedAction: 'Strengthen connection to central entity through bridge content',
          autoFixable: AUTO_FIXABLE_CATEGORIES['border_violation'],
        });
      }
    }
  } catch (err) {
    console.warn('[dialoguePreAnalysis] TopicalBorderValidator failed:', err);
    validatorsSkipped.push('TopicalBorderValidator');
  }
}

function runPageWorthiness(
  topics: EnrichedTopic[],
  findings: PreAnalysisFinding[],
  validatorsRun: string[],
  validatorsSkipped: string[]
): void {
  try {
    const signals: TopicSignals[] = topics.map(t => {
      const parentTopic = t.parent_topic_id
        ? topics.find(p => p.id === t.parent_topic_id)
        : null;
      const subtopicCount = topics.filter(s => s.parent_topic_id === t.id).length;

      return {
        topic: t.title,
        searchVolume: (t as any).search_volume,
        intent: (t as any).search_intent || t.query_type,
        parentTopic: parentTopic?.title,
        subtopicCount,
        category: t.attribute_focus ? undefined : undefined,
      };
    });

    const results = IndexConstructionRule.evaluateMap(signals);
    validatorsRun.push('IndexConstructionRule');

    const mergeCount = Array.from(results.values()).filter(
      r => r.decision === 'merge_into_parent' && r.confidence >= 0.5
    ).length;

    if (mergeCount > 0) {
      const mergeCandidates: string[] = [];
      results.forEach((result, topic) => {
        if (result.decision === 'merge_into_parent' && result.confidence >= 0.5) {
          mergeCandidates.push(topic);
        }
      });

      findings.push({
        category: 'page_worthiness',
        severity: mergeCount > 5 ? 'high' : 'medium',
        title: `${mergeCount} topic(s) may not warrant standalone pages`,
        details: `Candidates for merging: ${mergeCandidates.slice(0, 5).join(', ')}${mergeCandidates.length > 5 ? ` (+${mergeCandidates.length - 5} more)` : ''}`,
        affectedItems: mergeCandidates,
        suggestedAction: 'Consider merging these topics into their parent pages or converting to FAQ entries',
        autoFixable: AUTO_FIXABLE_CATEGORIES['page_worthiness'],
      });
    }
  } catch (err) {
    console.warn('[dialoguePreAnalysis] IndexConstructionRule failed:', err);
    validatorsSkipped.push('IndexConstructionRule');
  }
}

// ── Hub-Spoke Compliance Validator ──

function runHubSpokeCompliance(
  topics: EnrichedTopic[],
  findings: PreAnalysisFinding[],
  validatorsRun: string[],
  validatorsSkipped: string[]
): void {
  try {
    const hubs = topics.filter(t => t.cluster_role === 'pillar' || (!t.parent_topic_id && topics.some(c => c.parent_topic_id === t.id)));
    validatorsRun.push('HubSpokeCompliance');

    if (hubs.length === 0) {
      validatorsSkipped.push('HubSpokeCompliance (no hubs)');
      return;
    }

    const weakHubs: string[] = [];
    for (const hub of hubs) {
      const spokeCount = topics.filter(t => t.parent_topic_id === hub.id).length;
      if (spokeCount < 3) {
        weakHubs.push(`"${hub.title}" (${spokeCount} spoke${spokeCount === 1 ? '' : 's'})`);
      }
    }

    if (weakHubs.length > 0) {
      findings.push({
        category: 'depth_imbalance',
        severity: weakHubs.length > 2 ? 'critical' : 'high',
        title: `${weakHubs.length} hub(s) have fewer than 3 spokes`,
        details: `Weak hubs: ${weakHubs.join(', ')}. Each hub needs ≥3 supporting topics for topical depth.`,
        affectedItems: weakHubs.map(h => h.replace(/^"(.+?)".*$/, '$1')),
        suggestedAction: 'Add supporting subtopics to weak hubs to establish topical authority',
        autoFixable: true,
      });
    }
  } catch (err) {
    console.warn('[dialoguePreAnalysis] HubSpokeCompliance failed:', err);
    validatorsSkipped.push('HubSpokeCompliance');
  }
}

// ── Service Alignment Validator ──

function runServiceAlignment(
  topics: EnrichedTopic[],
  eavs: SemanticTriple[],
  centralEntity: string,
  findings: PreAnalysisFinding[],
  validatorsRun: string[],
  validatorsSkipped: string[],
  confirmedServices?: string[]
): void {
  try {
    // Use user-confirmed services when available; fall back to EAV extraction
    const services = (confirmedServices && confirmedServices.length > 0)
      ? confirmedServices
      : extractServicesFromEavs(eavs, centralEntity);
    if (services.length === 0) {
      validatorsSkipped.push('ServiceAlignment');
      return;
    }

    validatorsRun.push('ServiceAlignment');

    const coveredServices = new Set<string>();
    for (const topic of topics) {
      const titleLower = topic.title.toLowerCase();
      const rationale = ((topic.metadata as any)?.rationale || '').toLowerCase();
      const serviceAlign = ((topic.metadata as any)?.service_alignment || '').toLowerCase();

      for (const service of services) {
        const serviceLower = service.toLowerCase();
        if (
          titleLower.includes(serviceLower) ||
          serviceAlign.includes(serviceLower) ||
          rationale.includes(serviceLower)
        ) {
          coveredServices.add(service);
        }
      }
    }

    const uncovered = services.filter(s => !coveredServices.has(s));
    if (uncovered.length > 0) {
      // Promote to critical if ANY service has no hub — map quality gate blocker
      findings.push({
        category: 'service_gap',
        severity: uncovered.length > 2 ? 'critical' : 'high',
        title: `${uncovered.length} business service(s) have no dedicated hub topic`,
        details: `Uncovered services: ${uncovered.join(', ')}. Each service should have at least one hub topic to capture search demand.`,
        affectedItems: uncovered,
        suggestedAction: `Add hub topics for: ${uncovered.join(', ')}`,
        autoFixable: false,
      });
    }
  } catch (err) {
    console.warn('[dialoguePreAnalysis] ServiceAlignment failed:', err);
    validatorsSkipped.push('ServiceAlignment');
  }
}

// ── EAV Analyzer ──

function analyzeEavs(
  stepOutput: unknown,
  findings: PreAnalysisFinding[],
  validatorsRun: string[],
  validatorsSkipped: string[]
): void {
  const output = stepOutput as any;
  const eavs: SemanticTriple[] = Array.isArray(output?.eavs) ? output.eavs : [];

  if (eavs.length === 0) {
    validatorsSkipped.push('auditEavs', 'categoryBalance', 'pendingValues');
    return;
  }

  // 1. EAV Consistency Audit
  try {
    const report = auditEavs(eavs);
    validatorsRun.push('auditEavs');

    for (const inconsistency of report.inconsistencies) {
      const severity: FindingSeverity =
        inconsistency.severity === 'critical' ? 'critical' :
        inconsistency.severity === 'warning' ? 'high' : 'low';

      findings.push({
        category: 'eav_inconsistency',
        severity,
        title: inconsistency.description,
        details: `${inconsistency.type}: ${inconsistency.suggestion}`,
        affectedItems: [inconsistency.subject, inconsistency.attribute],
        suggestedAction: inconsistency.suggestion,
        autoFixable: AUTO_FIXABLE_CATEGORIES['eav_inconsistency'],
      });
    }
  } catch (err) {
    console.warn('[dialoguePreAnalysis] auditEavs failed:', err);
    validatorsSkipped.push('auditEavs');
  }

  // 2. Category Balance
  try {
    const categoryCount: Record<string, number> = {};
    for (const eav of eavs) {
      const cat = eav.predicate?.category || 'UNKNOWN';
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    }
    validatorsRun.push('categoryBalance');

    const requiredCategories = ['ROOT', 'UNIQUE'];
    for (const required of requiredCategories) {
      if (!categoryCount[required] || categoryCount[required] === 0) {
        findings.push({
          category: 'eav_category_gap',
          severity: required === 'ROOT' ? 'high' : 'medium',
          title: `No ${required} category EAVs found`,
          details: `${required} EAVs are essential for establishing topical authority. Current categories: ${Object.entries(categoryCount).map(([k, v]) => `${k}(${v})`).join(', ')}`,
          affectedItems: [required],
          suggestedAction: `Add ${required} category attributes that define the core identity of the entity`,
          autoFixable: AUTO_FIXABLE_CATEGORIES['eav_category_gap'],
        });
      }
    }
  } catch (err) {
    console.warn('[dialoguePreAnalysis] categoryBalance failed:', err);
    validatorsSkipped.push('categoryBalance');
  }

  // 3. Pending Values (clipboard emoji or empty)
  try {
    const pending = eavs.filter(eav => {
      const val = String(eav.object?.value || '');
      return val.includes('📋') || val.trim() === '' || val === 'TBD' || val === 'N/A';
    });
    validatorsRun.push('pendingValues');

    if (pending.length > 0) {
      const pendingAttrs = pending.map(e =>
        `${e.predicate?.relation || 'unknown'}`
      ).slice(0, 5);

      findings.push({
        category: 'eav_pending_values',
        severity: pending.length > 5 ? 'high' : 'medium',
        title: `${pending.length} EAV(s) have pending or empty values`,
        details: `Attributes needing values: ${pendingAttrs.join(', ')}${pending.length > 5 ? ` (+${pending.length - 5} more)` : ''}`,
        affectedItems: pending.map(e => e.predicate?.relation || 'unknown'),
        suggestedAction: 'Provide actual business data for these attributes',
        autoFixable: AUTO_FIXABLE_CATEGORIES['eav_pending_values'],
      });
    }
  } catch (err) {
    console.warn('[dialoguePreAnalysis] pendingValues failed:', err);
    validatorsSkipped.push('pendingValues');
  }
}

// ── Strategy Analyzer ──

function analyzeStrategy(
  stepOutput: unknown,
  findings: PreAnalysisFinding[],
  validatorsRun: string[],
  validatorsSkipped: string[]
): void {
  const output = stepOutput as any;
  const pillars = output?.pillars || output;

  // 1. Central Entity ambiguity check
  try {
    const ce = pillars?.centralEntity || '';
    validatorsRun.push('ceAmbiguity');

    if (!ce || ce.trim().length === 0) {
      findings.push({
        category: 'ce_ambiguity',
        severity: 'critical',
        title: 'Central Entity is empty',
        details: 'Without a Central Entity, no semantic analysis can be performed.',
        affectedItems: ['centralEntity'],
        suggestedAction: 'Define a clear Central Entity — the main noun phrase your site is about',
        autoFixable: AUTO_FIXABLE_CATEGORIES['ce_ambiguity'],
      });
    } else {
      const trimmed = ce.trim();
      const wordCount = trimmed.split(/\s+/).length;
      const startsWithArticle = /^(a|an|the|de|het|een|der|die|das|le|la|les|el|los|las)\s/i.test(trimmed);

      if (wordCount === 1 && trimmed.length < 10) {
        findings.push({
          category: 'ce_ambiguity',
          severity: 'high',
          title: `Central Entity "${trimmed}" may be too short or ambiguous`,
          details: 'Single-word CEs often match many unrelated intents. Consider a more specific multi-word entity.',
          affectedItems: ['centralEntity'],
          suggestedAction: `Make "${trimmed}" more specific (e.g., add a qualifier like type, location, or domain)`,
          autoFixable: AUTO_FIXABLE_CATEGORIES['ce_ambiguity'],
        });
      } else if (startsWithArticle) {
        findings.push({
          category: 'ce_ambiguity',
          severity: 'low',
          title: `Central Entity "${trimmed}" starts with an article`,
          details: 'Starting with an article is unusual for a Central Entity and may cause matching issues.',
          affectedItems: ['centralEntity'],
          suggestedAction: `Consider removing the leading article from "${trimmed}"`,
          autoFixable: AUTO_FIXABLE_CATEGORIES['ce_ambiguity'],
        });
      }
    }
  } catch (err) {
    console.warn('[dialoguePreAnalysis] ceAmbiguity failed:', err);
    validatorsSkipped.push('ceAmbiguity');
  }

  // 2. Source Context specificity check
  try {
    const sc = pillars?.sourceContext || '';
    validatorsRun.push('scSpecificity');

    if (!sc || sc.trim().length === 0) {
      findings.push({
        category: 'sc_specificity',
        severity: 'critical',
        title: 'Source Context is empty',
        details: 'Without a Source Context, the AI cannot position the site as an authority.',
        affectedItems: ['sourceContext'],
        suggestedAction: 'Define who or what the site represents (e.g., "certified structural engineer", "organic skincare brand")',
        autoFixable: AUTO_FIXABLE_CATEGORIES['sc_specificity'],
      });
    } else {
      const trimmed = sc.trim();
      const wordCount = trimmed.split(/\s+/).length;
      const genericTerms = ['blog', 'website', 'expert', 'specialist', 'professional', 'site', 'page'];
      const isGeneric = wordCount <= 2 && genericTerms.some(term =>
        trimmed.toLowerCase().includes(term)
      );

      if (wordCount < 3 && !isGeneric) {
        findings.push({
          category: 'sc_specificity',
          severity: 'medium',
          title: `Source Context "${trimmed}" is quite short`,
          details: 'A more specific Source Context helps differentiate from competitors.',
          affectedItems: ['sourceContext'],
          suggestedAction: 'Add qualifiers: credentials, specialization, unique value proposition',
          autoFixable: AUTO_FIXABLE_CATEGORIES['sc_specificity'],
        });
      } else if (isGeneric) {
        findings.push({
          category: 'sc_specificity',
          severity: 'high',
          title: `Source Context "${trimmed}" is too generic`,
          details: 'Generic terms like "blog" or "expert" don\'t differentiate from competitors.',
          affectedItems: ['sourceContext'],
          suggestedAction: 'Specify the unique angle: certifications, experience, methodology, niche focus',
          autoFixable: AUTO_FIXABLE_CATEGORIES['sc_specificity'],
        });
      }
    }
  } catch (err) {
    console.warn('[dialoguePreAnalysis] scSpecificity failed:', err);
    validatorsSkipped.push('scSpecificity');
  }

  // 3. CSI Predicates coverage check
  try {
    const csi = pillars?.centralSearchIntent || '';
    const csiPredicates = pillars?.csiPredicates || [];
    validatorsRun.push('csiCoverage');

    if (!csi || csi.trim().length === 0) {
      findings.push({
        category: 'csi_coverage',
        severity: 'critical',
        title: 'Central Search Intent is empty',
        details: 'Without a CSI, topic generation lacks direction.',
        affectedItems: ['centralSearchIntent'],
        suggestedAction: 'Define the main intent users have when searching for your Central Entity',
        autoFixable: AUTO_FIXABLE_CATEGORIES['csi_coverage'],
      });
    }

    if (Array.isArray(csiPredicates) && csiPredicates.length < 3) {
      findings.push({
        category: 'csi_coverage',
        severity: csiPredicates.length === 0 ? 'high' : 'medium',
        title: `Only ${csiPredicates.length} CSI predicate(s) defined (minimum 3 recommended)`,
        details: 'CSI predicates define the main verbs/actions users want to perform. More predicates = wider topic coverage.',
        affectedItems: ['csiPredicates'],
        suggestedAction: 'Add verb-form predicates like "buy", "compare", "learn", "install", "troubleshoot"',
        autoFixable: AUTO_FIXABLE_CATEGORIES['csi_coverage'],
      });
    }
  } catch (err) {
    console.warn('[dialoguePreAnalysis] csiCoverage failed:', err);
    validatorsSkipped.push('csiCoverage');
  }
}

// ── Helpers ──

function extractCentralEntity(
  stepOutput: any,
  dialogueContext?: DialogueContext
): string | null {
  // Try from step output directly
  if (stepOutput?.pillars?.centralEntity) return stepOutput.pillars.centralEntity;
  if (stepOutput?.centralEntity) return stepOutput.centralEntity;

  // Try from dialogue context (strategy answers)
  if (dialogueContext?.strategy?.answers) {
    for (const answer of dialogueContext.strategy.answers) {
      if (answer.extractedData?.updatedFields?.centralEntity) {
        return answer.extractedData.updatedFields.centralEntity;
      }
    }
  }

  return null;
}

// ── Prompt Helpers (for dialogueEngine integration) ──

export function buildFindingsSection(result: PreAnalysisResult): string {
  if (result.findings.length === 0) return '';

  const grouped: Record<FindingSeverity, PreAnalysisFinding[]> = {
    critical: [],
    high: [],
    medium: [],
    low: [],
  };

  for (const f of result.findings) {
    grouped[f.severity].push(f);
  }

  const sections: string[] = [];

  if (grouped.critical.length > 0) {
    sections.push('CRITICAL ISSUES (must address):');
    for (const f of grouped.critical) {
      sections.push(`  - [${f.category}] ${f.title}`);
      sections.push(`    Details: ${f.details}`);
      sections.push(`    Suggested: ${f.suggestedAction}`);
    }
  }

  if (grouped.high.length > 0) {
    sections.push('HIGH-PRIORITY ISSUES:');
    for (const f of grouped.high) {
      sections.push(`  - [${f.category}] ${f.title}`);
      sections.push(`    Details: ${f.details}`);
      sections.push(`    Suggested: ${f.suggestedAction}`);
    }
  }

  if (grouped.medium.length > 0) {
    sections.push('MEDIUM-PRIORITY ISSUES:');
    for (const f of grouped.medium) {
      sections.push(`  - [${f.category}] ${f.title}`);
      sections.push(`    Suggested: ${f.suggestedAction}`);
    }
  }

  if (grouped.low.length > 0) {
    sections.push('LOW-PRIORITY SUGGESTIONS:');
    for (const f of grouped.low) {
      sections.push(`  - [${f.category}] ${f.title}`);
    }
  }

  return sections.join('\n');
}

export function getQuestionCountGuidance(findings: PreAnalysisFinding[]): string {
  const criticalCount = findings.filter(f => f.severity === 'critical').length;
  const highCount = findings.filter(f => f.severity === 'high').length;
  const mediumCount = findings.filter(f => f.severity === 'medium').length;

  const estimated = criticalCount + highCount + Math.ceil(mediumCount / 2);
  const capped = Math.min(estimated, 12);

  return `Generate ${capped} question(s) maximum. Each CRITICAL finding gets 1 dedicated question. HIGH findings get 1 each (may combine 2-3 related). MEDIUM findings can be grouped into 1-2 questions. LOW findings can be batched into 1 optional question.`;
}
