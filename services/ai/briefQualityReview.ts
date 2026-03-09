/**
 * Brief Quality Review Service
 *
 * 6-component weighted quality scoring for generated content briefs.
 * Graduated sub-scoring (not binary) for meaningful differentiation.
 * Aligned to the Holistic SEO framework.
 *
 * @module services/ai/briefQualityReview
 */

import type { ContentBrief, EnrichedTopic, BusinessInfo, SEOPillars, SemanticTriple, WebsiteType } from '../../types';
import type { BriefQualityReport, BriefQualityCheck, TopicConfig } from '../../types/actionPlan';
import { getWebsiteTypeConfig } from '../../config/websiteTypeTemplates';

// ── Component Weights (must sum to 1.0) ──

const COMPONENT_WEIGHTS: Record<string, number> = {
  contextualFlow: 0.20,
  eavQuality: 0.20,
  informationDensity: 0.15,
  linkCompliance: 0.15,
  formatCompliance: 0.15,
  structuralIntegrity: 0.15,
};

/**
 * Run a comprehensive quality review on a generated content brief.
 * Returns a weighted score (0-100) with per-component breakdown.
 */
export function reviewBriefQuality(
  brief: ContentBrief,
  topic: EnrichedTopic,
  businessInfo: BusinessInfo,
  pillars: SEOPillars,
  allTopics: EnrichedTopic[],
  eavs?: SemanticTriple[],
  topicConfig?: TopicConfig,
  allBriefs?: Record<string, ContentBrief>,
  websiteType?: WebsiteType,
): BriefQualityReport {
  const checks: BriefQualityCheck[] = [];
  const componentScores: Record<string, number> = {};

  // ── Component 1: Contextual Flow (20%) ──
  const centerpieceCheck = checkCenterpiece(brief, pillars);
  const bridgeCheck = checkContextualBridge(brief);
  const subordinateCheck = checkSubordinateText(brief);
  checks.push(centerpieceCheck, bridgeCheck, subordinateCheck);

  componentScores.contextualFlow = Math.round(
    (graduateCheck(centerpieceCheck) * 0.4) +
    (graduateCheck(bridgeCheck) * 0.3) +
    (graduateCheck(subordinateCheck) * 0.3)
  );

  // ── Component 2: EAV Quality (20%) ──
  const eavCheck = checkEavCoverage(brief, eavs);
  checks.push(eavCheck);

  componentScores.eavQuality = graduateEavScore(brief, eavs);

  // ── Component 3: Information Density (15%) ──
  const sectionCheck = checkSectionCount(brief, topicConfig);
  const completenessCheck = checkOutlineCompleteness(brief);
  checks.push(sectionCheck, completenessCheck);

  componentScores.informationDensity = Math.round(
    (graduateSectionCount(brief, topicConfig) * 0.6) +
    (graduateCheck(completenessCheck) * 0.4)
  );

  // ── Component 4: Link Compliance (15%) ──
  const linkCheck = checkInternalLinks(brief, allTopics);
  checks.push(linkCheck);

  componentScores.linkCompliance = graduateLinkScore(brief, allTopics);

  // ── Component 5: Format Compliance (15%) ──
  const fsCheck = checkFeaturedSnippet(brief, topicConfig);
  const websiteCheck = checkWebsiteTypeCompliance(brief, websiteType);
  const answerCapsuleCheck = checkAnswerCapsules(brief);
  checks.push(fsCheck, websiteCheck, answerCapsuleCheck);

  componentScores.formatCompliance = Math.round(
    (graduateCheck(fsCheck) * 0.4) +
    (graduateCheck(websiteCheck) * 0.3) +
    (graduateCheck(answerCapsuleCheck) * 0.3)
  );

  // ── Component 6: Structural Integrity (15%) ──
  const cannibCheck = checkCannibalization(brief, topic, allTopics, allBriefs);
  checks.push(cannibCheck);

  componentScores.structuralIntegrity = Math.round(
    (graduateCheck(completenessCheck) * 0.5) +
    (graduateCheck(cannibCheck) * 0.5)
  );

  // ── Weighted Score ──
  const score = Math.round(
    Object.entries(COMPONENT_WEIGHTS).reduce((sum, [key, weight]) => {
      return sum + (componentScores[key] ?? 0) * weight;
    }, 0)
  );

  const passCount = checks.filter(c => c.passed).length;
  const failCount = checks.filter(c => !c.passed).length;

  return {
    score,
    checks,
    passCount,
    failCount,
    componentScores,
    meetsMinimum: score >= 50,
    meetsTarget: score >= 85,
  };
}

// ── Graduated Scoring Helpers ──

/** Convert a binary check into a graduated 0-100 score */
function graduateCheck(check: BriefQualityCheck): number {
  return check.passed ? 100 : 0;
}

/** Graduated EAV scoring: 0/30/60/100 based on coverage ratio */
function graduateEavScore(brief: ContentBrief, eavs?: SemanticTriple[]): number {
  if (!eavs || eavs.length === 0) return 100; // No EAVs to check against

  const sections = brief.structured_outline ?? [];
  let totalMapped = 0;
  for (const section of sections) {
    if (section.mapped_eavs && section.mapped_eavs.length > 0) {
      totalMapped += section.mapped_eavs.length;
    }
  }

  const targetCount = Math.min(eavs.length, 30);
  const ratio = targetCount > 0 ? totalMapped / targetCount : 0;

  if (ratio >= 0.5) return 100;
  if (ratio >= 0.3) return 60;
  if (totalMapped > 0) return 30;
  return 0;
}

/** Graduated section count: 0→0, 1-2→30, 3-4→60, 5+→100 */
function graduateSectionCount(brief: ContentBrief, topicConfig?: TopicConfig): number {
  const count = brief.structured_outline?.length ?? 0;
  const lengthPreset = topicConfig?.contentLength;

  // Minimal preset has lower expectations
  if (lengthPreset === 'minimal') {
    if (count >= 3) return 100;
    if (count >= 2) return 60;
    if (count >= 1) return 30;
    return 0;
  }

  if (count >= 5) return 100;
  if (count >= 3) return 60;
  if (count >= 1) return 30;
  return 0;
}

/** Graduated link scoring: 0→0, 1→40, 2-4→100 */
function graduateLinkScore(brief: ContentBrief, allTopics: EnrichedTopic[]): number {
  const links = getBridgeLinks(brief.contextualBridge);
  const topicTitles = new Set(allTopics.map(t => t.title));
  const validTargets = links.filter(l => topicTitles.has(l.targetTopic)).length;

  if (validTargets >= 2 && links.length <= 4) return 100;
  if (validTargets >= 2) return 80;
  if (links.length >= 1) return 40;
  return 0;
}

// ── Individual Check Functions ──

function checkEavCoverage(brief: ContentBrief, eavs?: SemanticTriple[]): BriefQualityCheck {
  if (!eavs || eavs.length === 0) {
    return { name: 'EAV Coverage', passed: true, details: 'No EAVs provided — skipped' };
  }

  const sections = brief.structured_outline ?? [];
  let totalMapped = 0;
  for (const section of sections) {
    if (section.mapped_eavs && section.mapped_eavs.length > 0) {
      totalMapped += section.mapped_eavs.length;
    }
  }

  const criticalCount = eavs.filter(e =>
    e.predicate?.category === 'UNIQUE' || e.predicate?.category === 'ROOT'
  ).length;

  const ratio = eavs.length > 0 ? totalMapped / Math.min(eavs.length, 30) : 0;
  const passed = ratio >= 0.3 || totalMapped > 0;
  const coveredCritical = Math.min(totalMapped, criticalCount);

  return {
    name: 'EAV Coverage',
    passed,
    details: `${totalMapped}/${Math.min(eavs.length, 30)} EAVs mapped (${coveredCritical}/${criticalCount} critical)`,
    suggestion: passed ? undefined : 'Map at least one UNIQUE or ROOT EAV triple to a section',
  };
}

function checkCenterpiece(brief: ContentBrief, pillars: SEOPillars): BriefQualityCheck {
  const sections = brief.structured_outline ?? [];
  if (sections.length === 0) {
    return { name: 'Centerpiece Rule', passed: false, details: 'No sections in outline', suggestion: 'Add structured outline sections' };
  }

  const firstSection = sections[0];
  const hint = (firstSection.subordinate_text_hint || '').toLowerCase();
  const heading = (firstSection.heading || '').toLowerCase();
  const entity = (pillars.centralEntity || '').toLowerCase();

  const entityInHint = entity.length > 0 && hint.includes(entity);
  const entityInHeading = entity.length > 0 && heading.includes(entity);
  const passed = entityInHint || entityInHeading;

  return {
    name: 'Centerpiece Rule',
    passed,
    details: passed
      ? `Central Entity "${pillars.centralEntity}" found in first section`
      : `Central Entity "${pillars.centralEntity}" missing from first section`,
    suggestion: passed ? undefined : 'Include the Central Entity in the first section heading or subordinate text hint',
  };
}

function checkFeaturedSnippet(brief: ContentBrief, topicConfig?: TopicConfig): BriefQualityCheck {
  const fs = brief.featured_snippet_target;
  if (!fs || !fs.question) {
    return {
      name: 'Featured Snippet',
      passed: false,
      details: 'No featured snippet target defined',
      suggestion: 'Add a featured_snippet_target with question and target_type',
    };
  }

  const hasType = fs.target_type && ['PARAGRAPH', 'LIST', 'TABLE'].includes(fs.target_type);
  const configMatch = !topicConfig?.featuredSnippetFormat ||
    topicConfig.featuredSnippetFormat === 'NONE' ||
    fs.target_type === topicConfig.featuredSnippetFormat;

  const passed = !!hasType && configMatch;

  return {
    name: 'Featured Snippet',
    passed,
    details: `Target: "${fs.question}" (${fs.target_type || 'unset'})`,
    suggestion: passed ? undefined : `Set target_type to a valid format${topicConfig?.featuredSnippetFormat ? ` (expected: ${topicConfig.featuredSnippetFormat})` : ''}`,
  };
}

function getBridgeLinks(bridge: ContentBrief['contextualBridge']): Array<{ targetTopic: string; anchorText: string }> {
  if (!bridge) return [];
  if (Array.isArray(bridge)) return bridge;
  if ('links' in bridge && Array.isArray(bridge.links)) return bridge.links;
  return [];
}

function checkInternalLinks(brief: ContentBrief, allTopics: EnrichedTopic[]): BriefQualityCheck {
  const links = getBridgeLinks(brief.contextualBridge);
  const topicTitles = new Set(allTopics.map(t => t.title));

  if (links.length < 2) {
    return {
      name: 'Internal Links',
      passed: false,
      details: `${links.length} links (minimum 2 required)`,
      suggestion: 'Add at least 2 internal links to related topics',
    };
  }

  const anchorCounts = new Map<string, number>();
  for (const link of links) {
    const anchor = (link.anchorText || '').toLowerCase().trim();
    anchorCounts.set(anchor, (anchorCounts.get(anchor) || 0) + 1);
  }
  const duplicateAnchors = [...anchorCounts.entries()].filter(([, count]) => count > 3);

  const validTargets = links.filter(l => topicTitles.has(l.targetTopic)).length;

  const passed = links.length >= 2 && links.length <= 4 && duplicateAnchors.length === 0 && validTargets >= 2;

  return {
    name: 'Internal Links',
    passed,
    details: `${links.length} links, ${validTargets} valid targets${duplicateAnchors.length > 0 ? `, ${duplicateAnchors.length} duplicate anchors` : ''}`,
    suggestion: passed ? undefined : 'Ensure 2-4 links with unique anchors targeting existing topics',
  };
}

function checkSectionCount(brief: ContentBrief, topicConfig?: TopicConfig): BriefQualityCheck {
  const sections = brief.structured_outline ?? [];
  const count = sections.length;

  const maxSections = topicConfig?.sectionCountMax;
  const lengthPreset = topicConfig?.contentLength;

  let expectedMin = 5;
  let expectedMax = 10;
  if (lengthPreset === 'minimal') { expectedMin = 3; expectedMax = 4; }
  else if (lengthPreset === 'short') { expectedMin = 4; expectedMax = 6; }
  else if (lengthPreset === 'standard') { expectedMin = 5; expectedMax = 8; }
  else if (lengthPreset === 'comprehensive') { expectedMin = 7; expectedMax = 12; }

  if (maxSections) expectedMax = maxSections;

  const passed = count >= expectedMin && count <= expectedMax;

  return {
    name: 'Section Count',
    passed,
    details: `${count} sections (expected ${expectedMin}-${expectedMax})`,
    suggestion: passed ? undefined : `Adjust outline to have ${expectedMin}-${expectedMax} sections`,
  };
}

function checkContextualBridge(brief: ContentBrief): BriefQualityCheck {
  const bridge = brief.contextualBridge;
  if (!bridge) {
    return {
      name: 'Contextual Bridge',
      passed: false,
      details: 'No contextual bridge defined',
      suggestion: 'Add a contextualBridge section linking macro context to article topic',
    };
  }

  const links = getBridgeLinks(bridge);
  const hasContent = !Array.isArray(bridge) && 'content' in bridge && !!bridge.content && bridge.content.length > 20;
  const hasLinks = links.length >= 1;
  const passed = (hasContent || Array.isArray(bridge)) && hasLinks;

  return {
    name: 'Contextual Bridge',
    passed,
    details: `Bridge: ${hasContent ? 'content present' : Array.isArray(bridge) ? 'link array' : 'no content'}, ${links.length} links`,
    suggestion: passed ? undefined : 'Add bridge content and at least 1 internal link',
  };
}

function checkSubordinateText(brief: ContentBrief): BriefQualityCheck {
  const sections = brief.structured_outline ?? [];
  if (sections.length === 0) {
    return { name: 'Subordinate Text', passed: false, details: 'No sections', suggestion: 'Add structured outline' };
  }

  const fillerPhrases = ['in this section', 'we will discuss', 'let us explore', 'this section covers'];
  let badCount = 0;
  for (const section of sections) {
    const hint = (section.subordinate_text_hint || '').toLowerCase();
    if (hint && fillerPhrases.some(f => hint.includes(f))) {
      badCount++;
    }
  }

  const withHints = sections.filter(s => s.subordinate_text_hint && s.subordinate_text_hint.length > 5).length;
  const passed = withHints >= Math.ceil(sections.length * 0.5) && badCount === 0;

  return {
    name: 'Subordinate Text',
    passed,
    details: `${withHints}/${sections.length} sections have hints${badCount > 0 ? `, ${badCount} contain filler` : ''}`,
    suggestion: passed ? undefined : 'Add direct-answer subordinate text hints, avoid filler phrases',
  };
}

function checkOutlineCompleteness(brief: ContentBrief): BriefQualityCheck {
  const hasTitle = !!brief.title && brief.title.length > 3;
  const hasSlug = !!brief.slug && brief.slug.length > 3;
  const hasMeta = !!brief.metaDescription && brief.metaDescription.length > 20;
  const hasOutline = (brief.structured_outline?.length ?? 0) >= 3;
  const hasTakeaways = (brief.keyTakeaways?.length ?? 0) >= 2;

  const score = [hasTitle, hasSlug, hasMeta, hasOutline, hasTakeaways].filter(Boolean).length;
  const passed = score >= 4;

  const missing: string[] = [];
  if (!hasTitle) missing.push('title');
  if (!hasSlug) missing.push('slug');
  if (!hasMeta) missing.push('meta description');
  if (!hasOutline) missing.push('structured outline');
  if (!hasTakeaways) missing.push('key takeaways');

  return {
    name: 'Outline Completeness',
    passed,
    details: `${score}/5 core fields present${missing.length > 0 ? ` (missing: ${missing.join(', ')})` : ''}`,
    suggestion: passed ? undefined : `Add missing fields: ${missing.join(', ')}`,
  };
}

function checkAnswerCapsules(brief: ContentBrief): BriefQualityCheck {
  const sections = (brief.structured_outline ?? []).filter(s => s.level === 2);
  if (sections.length === 0) {
    return { name: 'Answer Capsules', passed: true, details: 'No H2 sections' };
  }
  const withCapsule = sections.filter(s =>
    s.answer_capsule &&
    s.answer_capsule.text_hint &&
    s.answer_capsule.target_length >= 40 &&
    s.answer_capsule.target_length <= 70
  );
  const ratio = withCapsule.length / sections.length;
  const passed = ratio >= 0.5;
  return {
    name: 'Answer Capsules',
    passed,
    details: `${withCapsule.length}/${sections.length} H2 sections have valid answer capsules (40-70 words)`,
    suggestion: passed ? undefined : 'Add answer_capsule with text_hint (40-70 words) to each H2 section for Featured Snippet and AI Overview eligibility',
  };
}

function checkWebsiteTypeCompliance(brief: ContentBrief, websiteType?: WebsiteType): BriefQualityCheck {
  if (!websiteType) {
    return { name: 'Website-Type Compliance', passed: true, details: 'No website type set — skipped' };
  }

  const config = getWebsiteTypeConfig(websiteType);
  const rootKeywords = config.eavPriority.requiredCategories.ROOT ?? [];

  if (rootKeywords.length === 0) {
    return { name: 'Website-Type Compliance', passed: true, details: `No ROOT keywords for type "${websiteType}"` };
  }

  const sections = brief.structured_outline ?? [];
  const textPool = sections
    .map(s => `${(s.heading || '').toLowerCase()} ${(s.subordinate_text_hint || '').toLowerCase()}`)
    .join(' ');

  const matched = rootKeywords.filter(kw => textPool.includes(kw.toLowerCase()));
  const ratio = matched.length / rootKeywords.length;
  const passed = ratio >= 0.3 || matched.length >= 1;

  return {
    name: 'Website-Type Compliance',
    passed,
    details: `${matched.length}/${rootKeywords.length} ROOT keywords found for "${websiteType}" (${matched.join(', ') || 'none'})`,
    suggestion: passed ? undefined : `Include relevant ${websiteType} keywords in section headings: ${rootKeywords.slice(0, 5).join(', ')}`,
  };
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const word of a) {
    if (b.has(word)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union > 0 ? intersection / union : 0;
}

function extractHeadingWords(brief: ContentBrief): Set<string> {
  const sections = brief.structured_outline ?? [];
  const words = new Set<string>();
  for (const section of sections) {
    const heading = (section.heading || '').toLowerCase();
    for (const word of heading.split(/\s+/)) {
      const cleaned = word.replace(/[^a-z0-9\u00C0-\u024F]/g, '');
      if (cleaned.length > 2) words.add(cleaned);
    }
  }
  return words;
}

function checkCannibalization(
  brief: ContentBrief,
  topic: EnrichedTopic,
  allTopics: EnrichedTopic[],
  allBriefs?: Record<string, ContentBrief>,
): BriefQualityCheck {
  if (!allBriefs || Object.keys(allBriefs).length === 0) {
    return { name: 'Cross-Topic Cannibalization', passed: true, details: 'No sibling briefs to compare — skipped' };
  }

  const siblings = allTopics.filter(
    t => t.id !== topic.id && t.parent_topic_id === topic.parent_topic_id
  );

  if (siblings.length === 0) {
    return { name: 'Cross-Topic Cannibalization', passed: true, details: 'No sibling topics found' };
  }

  const thisHeadings = extractHeadingWords(brief);
  if (thisHeadings.size === 0) {
    return { name: 'Cross-Topic Cannibalization', passed: true, details: 'No headings to compare' };
  }

  const flagged: Array<{ title: string; similarity: number }> = [];

  for (const sibling of siblings) {
    const siblingBrief = allBriefs[sibling.id];
    if (!siblingBrief) continue;

    const siblingHeadings = extractHeadingWords(siblingBrief);
    if (siblingHeadings.size === 0) continue;

    const similarity = jaccardSimilarity(thisHeadings, siblingHeadings);
    if (similarity > 0.5) {
      flagged.push({ title: sibling.title, similarity: Math.round(similarity * 100) / 100 });
    }
  }

  const passed = flagged.length === 0;

  return {
    name: 'Cross-Topic Cannibalization',
    passed,
    details: passed
      ? `No heading overlap >50% with ${siblings.length} sibling topics`
      : `High heading overlap with: ${flagged.map(f => `"${f.title}" (${Math.round(f.similarity * 100)}%)`).join(', ')}`,
    suggestion: passed ? undefined : 'Differentiate section headings to reduce overlap with sibling topics',
  };
}
