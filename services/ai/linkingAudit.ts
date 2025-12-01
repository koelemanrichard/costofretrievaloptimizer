// services/ai/linkingAudit.ts
// Multi-pass internal linking audit system aligned with research document

import {
  LinkingAuditContext,
  LinkingAuditResult,
  LinkingPassResult,
  LinkingIssue,
  LinkingAuditPass,
  LinkingAutoFix,
  AnchorTextByTargetMetric,
  ExternalLinkAnalysis,
  EnrichedTopic,
  ContentBrief,
  ContextualBridgeLink,
  ContextualBridgeSection,
  FoundationPage,
  FoundationPageType,
  NavigationStructure,
  InternalLinkingRules,
} from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Extract links from contextualBridge (handles both array and section formats)
 */
export const getLinksFromBridge = (
  bridge: ContextualBridgeLink[] | ContextualBridgeSection | undefined
): ContextualBridgeLink[] => {
  if (!bridge) return [];
  if (Array.isArray(bridge)) return bridge;
  if (bridge && typeof bridge === 'object' && 'links' in bridge) {
    return bridge.links || [];
  }
  return [];
};

/**
 * Build a link graph from topics and briefs
 */
export const buildLinkGraph = (
  topics: EnrichedTopic[],
  briefs: Record<string, ContentBrief>
): {
  incomingLinks: Record<string, string[]>;
  outgoingLinks: Record<string, { targetId: string; targetTitle: string; anchor: string }[]>;
} => {
  const incomingLinks: Record<string, string[]> = {};
  const outgoingLinks: Record<string, { targetId: string; targetTitle: string; anchor: string }[]> = {};

  // Initialize
  for (const topic of topics) {
    incomingLinks[topic.id] = [];
    outgoingLinks[topic.id] = [];
  }

  // Build graph from briefs
  for (const brief of Object.values(briefs)) {
    const sourceId = brief.topic_id;
    const links = getLinksFromBridge(brief.contextualBridge);

    for (const link of links) {
      const targetTopic = topics.find(t => t.title === link.targetTopic);
      if (targetTopic) {
        incomingLinks[targetTopic.id].push(sourceId);
        outgoingLinks[sourceId].push({
          targetId: targetTopic.id,
          targetTitle: targetTopic.title,
          anchor: link.anchorText,
        });
      }
    }
  }

  // Add hierarchical links (parent-child)
  for (const topic of topics) {
    if (topic.parent_topic_id) {
      const parentId = topic.parent_topic_id;
      if (incomingLinks[topic.id]) {
        incomingLinks[topic.id].push(parentId);
      }
      if (outgoingLinks[parentId]) {
        outgoingLinks[parentId].push({
          targetId: topic.id,
          targetTitle: topic.title,
          anchor: topic.title, // Hierarchical links use topic title
        });
      }
    }
  }

  return { incomingLinks, outgoingLinks };
};

/**
 * Generic anchor blacklist
 */
export const GENERIC_ANCHORS = [
  'click here', 'klik hier', 'read more', 'lees meer', 'learn more',
  'meer leren', 'here', 'hier', 'view', 'bekijk', 'see more',
  'bekijk meer', 'this', 'dit', 'link', 'page', 'pagina', 'more info',
  'meer informatie', 'details', 'info'
];

// ============================================
// PASS 1: FUNDAMENTALS (PageRank & Anchor Text)
// ============================================

export const runFundamentalsPass = (ctx: LinkingAuditContext): LinkingPassResult => {
  const issues: LinkingIssue[] = [];

  // F-01: Page link limit (max 150)
  for (const topic of ctx.topics) {
    const brief = ctx.briefs[topic.id];
    const bridgeLinks = brief ? getLinksFromBridge(brief.contextualBridge) : [];
    const childCount = ctx.topics.filter(t => t.parent_topic_id === topic.id).length;
    const totalLinks = bridgeLinks.length + childCount;

    if (totalLinks > ctx.rules.maxLinksPerPage) {
      issues.push({
        id: `f01-${topic.id}`,
        type: 'page_link_limit_exceeded',
        severity: 'warning',
        pass: LinkingAuditPass.FUNDAMENTALS,
        sourceTopic: topic.title,
        currentCount: totalLinks,
        limit: ctx.rules.maxLinksPerPage,
        message: `"${topic.title}" has ${totalLinks} links (max ${ctx.rules.maxLinksPerPage}). PageRank dilution risk.`,
        autoFixable: false,
      });
    }
  }

  // F-02: Anchor text repetition per target (max 3x for same target URL)
  const anchorByTarget: Record<string, { anchor: string; count: number; sources: string[] }[]> = {};

  for (const brief of Object.values(ctx.briefs)) {
    const sourceTopic = ctx.topics.find(t => t.id === brief.topic_id);
    if (!sourceTopic) continue;

    const links = getLinksFromBridge(brief.contextualBridge);
    for (const link of links) {
      const targetKey = link.targetTopic;
      const anchorKey = link.anchorText.toLowerCase().trim();

      if (!anchorByTarget[targetKey]) {
        anchorByTarget[targetKey] = [];
      }

      const existing = anchorByTarget[targetKey].find(a => a.anchor === anchorKey);
      if (existing) {
        existing.count++;
        existing.sources.push(sourceTopic.title);
      } else {
        anchorByTarget[targetKey].push({
          anchor: anchorKey,
          count: 1,
          sources: [sourceTopic.title],
        });
      }
    }
  }

  for (const [target, anchors] of Object.entries(anchorByTarget)) {
    for (const anchorData of anchors) {
      if (anchorData.count > ctx.rules.maxAnchorTextRepetition) {
        issues.push({
          id: `f02-${target}-${anchorData.anchor}`,
          type: 'anchor_repetition_per_target',
          severity: 'warning',
          pass: LinkingAuditPass.FUNDAMENTALS,
          targetTopic: target,
          anchorText: anchorData.anchor,
          currentCount: anchorData.count,
          limit: ctx.rules.maxAnchorTextRepetition,
          sources: anchorData.sources,
          message: `Anchor "${anchorData.anchor}" used ${anchorData.count}x for target "${target}" (max ${ctx.rules.maxAnchorTextRepetition}). Signals templated linking.`,
          autoFixable: true,
          suggestedFix: 'AI will generate synonym anchor variations',
        });
      }
    }
  }

  // F-03: Generic anchor detection
  for (const brief of Object.values(ctx.briefs)) {
    const sourceTopic = ctx.topics.find(t => t.id === brief.topic_id);
    if (!sourceTopic) continue;

    const links = getLinksFromBridge(brief.contextualBridge);
    for (const link of links) {
      const normalized = link.anchorText.toLowerCase().trim();
      const isGeneric = GENERIC_ANCHORS.some(g => normalized === g || normalized.includes(g));

      if (isGeneric) {
        issues.push({
          id: `f03-${brief.topic_id}-${link.targetTopic}`,
          type: 'generic_anchor',
          severity: 'warning',
          pass: LinkingAuditPass.FUNDAMENTALS,
          sourceTopic: sourceTopic.title,
          targetTopic: link.targetTopic,
          anchorText: link.anchorText,
          message: `Generic anchor "${link.anchorText}" provides no semantic value. Use descriptive text.`,
          autoFixable: true,
          suggestedFix: `Use target topic title: "${link.targetTopic}"`,
        });
      }
    }
  }

  // F-04: Missing annotation text
  for (const brief of Object.values(ctx.briefs)) {
    const sourceTopic = ctx.topics.find(t => t.id === brief.topic_id);
    if (!sourceTopic) continue;

    const links = getLinksFromBridge(brief.contextualBridge);
    for (const link of links) {
      if (!link.annotation_text_hint || link.annotation_text_hint.trim() === '') {
        issues.push({
          id: `f04-${brief.topic_id}-${link.targetTopic}`,
          type: 'missing_annotation_text',
          severity: 'suggestion',
          pass: LinkingAuditPass.FUNDAMENTALS,
          sourceTopic: sourceTopic.title,
          targetTopic: link.targetTopic,
          message: `Link to "${link.targetTopic}" missing annotation text hint. Add context sentence for relevance.`,
          autoFixable: true,
          suggestedFix: 'AI will generate surrounding context based on topic descriptions',
        });
      }
    }
  }

  return {
    pass: LinkingAuditPass.FUNDAMENTALS,
    status: issues.length === 0 ? 'passed' : 'issues_found',
    issues,
    autoFixable: issues.some(i => i.autoFixable),
    summary: `Checked ${ctx.topics.length} topics. Found ${issues.length} fundamental linking issues.`,
  };
};

// ============================================
// PASS 2: NAVIGATION (Boilerplate)
// ============================================

export const runNavigationPass = (ctx: LinkingAuditContext): LinkingPassResult => {
  const issues: LinkingIssue[] = [];

  if (!ctx.navigation) {
    issues.push({
      id: 'n00-missing',
      type: 'static_navigation',
      severity: 'warning',
      pass: LinkingAuditPass.NAVIGATION,
      message: 'No navigation structure defined. Create header/footer navigation.',
      autoFixable: false,
    });
    return {
      pass: LinkingAuditPass.NAVIGATION,
      status: 'issues_found',
      issues,
      autoFixable: false,
      summary: 'Navigation structure missing.',
    };
  }

  // N-01: Header link limit
  const headerCount = ctx.navigation.header.primary_nav.length + (ctx.navigation.header.cta_button ? 1 : 0);
  const headerLimit = ctx.navigation.max_header_links || 10;

  if (headerCount > headerLimit) {
    issues.push({
      id: 'n01-header',
      type: 'header_link_overflow',
      severity: 'warning',
      pass: LinkingAuditPass.NAVIGATION,
      currentCount: headerCount,
      limit: headerLimit,
      message: `Header has ${headerCount} links (max ${headerLimit}). Reduce to preserve PageRank.`,
      autoFixable: false,
    });
  }

  // N-02: Footer link limit
  const footerCount = ctx.navigation.footer.sections.reduce((acc, s) => acc + s.links.length, 0)
    + ctx.navigation.footer.legal_links.length;
  const footerLimit = ctx.navigation.max_footer_links || 30;

  if (footerCount > footerLimit) {
    issues.push({
      id: 'n02-footer',
      type: 'footer_link_overflow',
      severity: 'warning',
      pass: LinkingAuditPass.NAVIGATION,
      currentCount: footerCount,
      limit: footerLimit,
      message: `Footer has ${footerCount} links (max ${footerLimit}). Reduce to prevent dilution.`,
      autoFixable: false,
    });
  }

  // N-03: Anchor differentiation (header vs footer)
  const headerAnchors = new Set(ctx.navigation.header.primary_nav.map(l => l.text.toLowerCase()));
  const footerAnchors = new Set<string>();
  ctx.navigation.footer.sections.forEach(s => s.links.forEach(l => footerAnchors.add(l.text.toLowerCase())));
  ctx.navigation.footer.legal_links.forEach(l => footerAnchors.add(l.text.toLowerCase()));

  const duplicates = [...headerAnchors].filter(a => footerAnchors.has(a));
  for (const dup of duplicates) {
    issues.push({
      id: `n03-${dup}`,
      type: 'duplicate_nav_anchor',
      severity: 'warning',
      pass: LinkingAuditPass.NAVIGATION,
      anchorText: dup,
      message: `Anchor "${dup}" appears in both header AND footer. Research says to differentiate.`,
      autoFixable: true,
      suggestedFix: `Header: "${dup}" → shorter variant | Footer: descriptive variant`,
    });
  }

  // N-04: E-A-T links present in footer
  const activeFoundationTypes = ctx.foundationPages
    .filter(p => !p.deleted_at)
    .map(p => p.page_type);

  const footerLegalTexts = ctx.navigation.footer.legal_links.map(l => l.text.toLowerCase());
  const footerSectionTexts = ctx.navigation.footer.sections
    .flatMap(s => s.links.map(l => l.text.toLowerCase()));
  const allFooterTexts = [...footerLegalTexts, ...footerSectionTexts];

  const requiredEatPages = ['about', 'privacy', 'contact'];
  for (const reqType of requiredEatPages) {
    const hasPage = activeFoundationTypes.includes(reqType as any);
    const inFooter = allFooterTexts.some(t => t.includes(reqType));

    if (hasPage && !inFooter) {
      const foundationPage = ctx.foundationPages.find(p => p.page_type === reqType && !p.deleted_at);
      issues.push({
        id: `n04-${reqType}`,
        type: 'missing_eat_link',
        severity: 'warning',
        pass: LinkingAuditPass.NAVIGATION,
        message: `${reqType.charAt(0).toUpperCase() + reqType.slice(1)} page exists but is not linked in footer. Add for E-A-T.`,
        autoFixable: true,
        suggestedFix: `Add link to ${foundationPage?.title || reqType} in footer.legal_links`,
      });
    }
  }

  // N-05: Dynamic navigation check
  if (!ctx.navigation.dynamic_by_section) {
    issues.push({
      id: 'n05-static',
      type: 'static_navigation',
      severity: 'suggestion',
      pass: LinkingAuditPass.NAVIGATION,
      message: 'Navigation is static. Consider enabling dynamic nav based on topic_class for contextual relevance.',
      autoFixable: false,
    });
  }

  return {
    pass: LinkingAuditPass.NAVIGATION,
    status: issues.length === 0 ? 'passed' : 'issues_found',
    issues,
    autoFixable: issues.some(i => i.autoFixable),
    summary: `Navigation audit: ${issues.length} issues found.`,
  };
};

// ============================================
// PASS 3: FLOW DIRECTION (Core ← Author)
// ============================================

export const runFlowDirectionPass = (ctx: LinkingAuditContext): LinkingPassResult => {
  const issues: LinkingIssue[] = [];
  const { incomingLinks, outgoingLinks } = buildLinkGraph(ctx.topics, ctx.briefs);

  // LF-01: Flow direction check (Core should NOT link extensively TO Author section)
  for (const topic of ctx.topics) {
    if (topic.topic_class !== 'monetization') continue; // Only check Core/Money pages

    const brief = ctx.briefs[topic.id];
    if (!brief) continue;

    const links = getLinksFromBridge(brief.contextualBridge);
    for (const link of links) {
      const targetTopic = ctx.topics.find(t => t.title === link.targetTopic);
      if (targetTopic?.topic_class === 'informational') {
        issues.push({
          id: `lf01-${topic.id}-${targetTopic.id}`,
          type: 'wrong_flow_direction',
          severity: 'critical',
          pass: LinkingAuditPass.FLOW_DIRECTION,
          sourceTopic: topic.title,
          targetTopic: targetTopic.title,
          message: `Core page "${topic.title}" links TO Author page "${targetTopic.title}". Authority should flow Author → Core.`,
          autoFixable: false,
          suggestedFix: `Remove this link. Add reverse link FROM "${targetTopic.title}" TO "${topic.title}".`,
        });
      }
    }
  }

  // LF-02: Contextual bridge required for discordant topics
  for (const brief of Object.values(ctx.briefs)) {
    const sourceTopic = ctx.topics.find(t => t.id === brief.topic_id);
    if (!sourceTopic) continue;

    const bridgeSection = !Array.isArray(brief.contextualBridge) ? brief.contextualBridge : null;
    const links = getLinksFromBridge(brief.contextualBridge);

    for (const link of links) {
      const targetTopic = ctx.topics.find(t => t.title === link.targetTopic);
      if (!targetTopic) continue;

      // Check if topics are discordant (different topic_class or different parent)
      const isDiscordant = sourceTopic.topic_class !== targetTopic.topic_class
        || sourceTopic.parent_topic_id !== targetTopic.parent_topic_id;

      if (isDiscordant) {
        const hasBridgeContent = bridgeSection?.content && bridgeSection.content.length > 50;
        if (!hasBridgeContent) {
          issues.push({
            id: `lf02-${sourceTopic.id}-${targetTopic.id}`,
            type: 'missing_contextual_bridge',
            severity: 'warning',
            pass: LinkingAuditPass.FLOW_DIRECTION,
            sourceTopic: sourceTopic.title,
            targetTopic: targetTopic.title,
            message: `Link from "${sourceTopic.title}" to discordant topic "${targetTopic.title}" lacks contextual bridge paragraph.`,
            autoFixable: true,
            suggestedFix: 'AI will generate H4/H5 subordinate text creating semantic transition.',
          });
        }
      }
    }
  }

  // LF-03: Loop closure to Central Entity
  const centralEntity = ctx.pillars.centralEntity;
  const ceTopic = ctx.topics.find(t =>
    t.title.toLowerCase().includes(centralEntity.toLowerCase()) ||
    (t.topic_class === 'monetization' && t.type === 'core')
  );

  if (ceTopic) {
    for (const topic of ctx.topics) {
      if (topic.id === ceTopic.id) continue;

      // BFS to find path to Central Entity
      const visited = new Set<string>();
      const queue = [topic.id];
      let foundPath = false;

      while (queue.length > 0 && !foundPath) {
        const current = queue.shift()!;
        if (visited.has(current)) continue;
        visited.add(current);

        const links = outgoingLinks[current] || [];
        for (const link of links) {
          if (link.targetId === ceTopic.id) {
            foundPath = true;
            break;
          }
          queue.push(link.targetId);
        }
      }

      if (!foundPath) {
        issues.push({
          id: `lf03-${topic.id}`,
          type: 'unclosed_loop',
          severity: 'warning',
          pass: LinkingAuditPass.FLOW_DIRECTION,
          sourceTopic: topic.title,
          targetTopic: ceTopic.title,
          message: `No link path from "${topic.title}" back to Central Entity "${ceTopic.title}". Broken context loop.`,
          autoFixable: true,
          suggestedFix: `Add link from "${topic.title}" (or its children) to "${ceTopic.title}".`,
        });
      }
    }
  }

  // LF-04: Orphan detection (no incoming links)
  for (const topic of ctx.topics) {
    const incoming = incomingLinks[topic.id] || [];

    // Outer topics should have incoming links
    if (topic.type === 'outer' && incoming.length === 0) {
      issues.push({
        id: `lf04-${topic.id}`,
        type: 'orphaned_topic',
        severity: 'critical',
        pass: LinkingAuditPass.FLOW_DIRECTION,
        targetTopic: topic.title,
        message: `"${topic.title}" has NO incoming internal links. Orphan page cannot receive PageRank.`,
        autoFixable: true,
        suggestedFix: 'AI will identify semantically related topics to add incoming links.',
      });
    }
  }

  return {
    pass: LinkingAuditPass.FLOW_DIRECTION,
    status: issues.length === 0 ? 'passed' : 'issues_found',
    issues,
    autoFixable: issues.some(i => i.autoFixable),
    summary: `Flow direction audit: ${issues.length} issues. ${issues.filter(i => i.type === 'wrong_flow_direction').length} critical flow reversals.`,
  };
};

// ============================================
// PASS 4: EXTERNAL E-A-T
// ============================================

export const runExternalPass = (ctx: LinkingAuditContext): LinkingPassResult => {
  const issues: LinkingIssue[] = [];

  // Extract external links from draft content (if available)
  const externalLinks: ExternalLinkAnalysis[] = [];

  for (const brief of Object.values(ctx.briefs)) {
    const sourceTopic = ctx.topics.find(t => t.id === brief.topic_id);
    if (!sourceTopic || !brief.articleDraft) continue;

    // Simple regex to find external links in draft
    const urlRegex = /https?:\/\/[^\s<>"]+/gi;
    const matches = brief.articleDraft.match(urlRegex) || [];

    for (const url of matches) {
      try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname.replace('www.', '');

        // Skip internal links
        if (ctx.domain && domain.includes(ctx.domain)) continue;

        const isCompetitor = ctx.competitors?.some(c =>
          domain.includes(c.replace('www.', ''))
        ) || false;

        externalLinks.push({
          url,
          domain,
          anchorText: url, // Will be refined by AI
          sourceTopic: sourceTopic.title,
          isCompetitor,
          isIntegratedInText: true, // Simplified - found in draft
        });
      } catch (e) {
        // Invalid URL, skip
      }
    }
  }

  // E-01: Competitor link detection
  for (const extLink of externalLinks) {
    if (extLink.isCompetitor) {
      issues.push({
        id: `e01-${extLink.sourceTopic}-${extLink.domain}`,
        type: 'competitor_link',
        severity: 'warning',
        pass: LinkingAuditPass.EXTERNAL,
        sourceTopic: extLink.sourceTopic,
        externalUrl: extLink.url,
        message: `"${extLink.sourceTopic}" links to competitor domain "${extLink.domain}". Review if necessary.`,
        autoFixable: false,
        suggestedFix: 'Remove link or replace with authoritative non-competitor source.',
      });
    }
  }

  // E-02: Topics with no external references (E-A-T concern)
  const topicsWithExternalRefs = new Set(externalLinks.map(l => l.sourceTopic));
  const coreTopics = ctx.topics.filter(t => t.type === 'core');

  for (const core of coreTopics) {
    const brief = ctx.briefs[core.id];
    if (!brief?.articleDraft) continue;

    if (!topicsWithExternalRefs.has(core.title) && brief.articleDraft.length > 500) {
      issues.push({
        id: `e02-${core.id}`,
        type: 'missing_eat_reference',
        severity: 'suggestion',
        pass: LinkingAuditPass.EXTERNAL,
        sourceTopic: core.title,
        message: `Core topic "${core.title}" has no external authority references. Consider adding E-A-T citations.`,
        autoFixable: false,
        suggestedFix: 'Add links to authoritative sources (academic, government, industry experts).',
      });
    }
  }

  return {
    pass: LinkingAuditPass.EXTERNAL,
    status: issues.length === 0 ? 'passed' : 'issues_found',
    issues,
    autoFixable: issues.some(i => i.autoFixable),
    summary: `External linking audit: ${externalLinks.length} external links analyzed, ${issues.length} issues found.`,
  };
};

// ============================================
// MAIN ORCHESTRATOR
// ============================================

/**
 * Run complete multi-pass linking audit
 */
export const runLinkingAudit = (ctx: LinkingAuditContext): LinkingAuditResult => {
  const passResults: LinkingPassResult[] = [];

  // Run all passes
  passResults.push(runFundamentalsPass(ctx));
  passResults.push(runNavigationPass(ctx));
  passResults.push(runFlowDirectionPass(ctx));
  passResults.push(runExternalPass(ctx));

  // Calculate overall score
  const allIssues = passResults.flatMap(p => p.issues);
  const criticalCount = allIssues.filter(i => i.severity === 'critical').length;
  const warningCount = allIssues.filter(i => i.severity === 'warning').length;
  const suggestionCount = allIssues.filter(i => i.severity === 'suggestion').length;

  // Weighted scoring: critical = -10, warning = -3, suggestion = -1
  const maxScore = 100;
  const penalty = (criticalCount * 10) + (warningCount * 3) + (suggestionCount * 1);
  const overallScore = Math.max(0, maxScore - penalty);

  // Build summary
  const { incomingLinks, outgoingLinks } = buildLinkGraph(ctx.topics, ctx.briefs);
  const totalLinks = Object.values(outgoingLinks).flat().length;
  const avgLinksPerPage = ctx.topics.length > 0 ? totalLinks / ctx.topics.length : 0;
  const orphanedTopics = ctx.topics
    .filter(t => (incomingLinks[t.id] || []).length === 0 && t.type === 'outer')
    .map(t => t.title);
  const overLinkedTopics = ctx.topics
    .filter(t => {
      const links = outgoingLinks[t.id] || [];
      return links.length > ctx.rules.maxLinksPerPage;
    })
    .map(t => t.title);

  // Find repetitive anchors
  const anchorCounts: Record<string, number> = {};
  for (const links of Object.values(outgoingLinks)) {
    for (const link of links) {
      const key = link.anchor.toLowerCase();
      anchorCounts[key] = (anchorCounts[key] || 0) + 1;
    }
  }
  const repetitiveAnchors = Object.entries(anchorCounts)
    .filter(([_, count]) => count > ctx.rules.maxAnchorTextRepetition)
    .map(([text, count]) => ({ text, count }));

  return {
    map_id: ctx.mapId,
    passResults,
    overallScore,
    autoFixableCount: allIssues.filter(i => i.autoFixable).length,
    summary: {
      totalLinks,
      averageLinksPerPage: Math.round(avgLinksPerPage * 10) / 10,
      orphanedTopics,
      overLinkedTopics,
      repetitiveAnchors,
    },
  };
};

// ============================================
// DEFAULT RULES
// ============================================

export const DEFAULT_LINKING_RULES: InternalLinkingRules = {
  maxLinksPerPage: 150,
  maxAnchorTextRepetition: 3,
  prioritizeMainContentLinks: true,
  useDescriptiveAnchorText: true,
  avoidGenericAnchors: GENERIC_ANCHORS,
  contextualBridgeRequired: true,
  delayLowRelevanceLinks: true,
  hubSpokeFlowDirection: 'spoke_to_hub', // Author → Core
  linkToQualityNodesFirst: true,
  qualityNodeThreshold: 70,
};

// ============================================
// FIX GENERATORS (Task 5.8)
// ============================================

/**
 * Generate auto-fix for generic anchor issues
 * Replaces generic anchors with descriptive topic titles
 */
export const generateGenericAnchorFix = (
  issue: LinkingIssue,
  ctx: LinkingAuditContext
): LinkingAutoFix | null => {
  if (issue.type !== 'generic_anchor') return null;

  // Find the target topic to get a proper title
  const targetTopic = ctx.topics.find(t => t.title === issue.targetTopic);
  if (!targetTopic) return null;

  // Find the source brief to update
  const sourceTopic = ctx.topics.find(t => t.title === issue.sourceTopic);
  if (!sourceTopic) return null;

  const sourceBrief = ctx.briefs[sourceTopic.id];
  if (!sourceBrief) return null;

  return {
    issueId: issue.id,
    fixType: 'update_anchor',
    targetTable: 'content_briefs',
    targetId: sourceBrief.id,
    field: 'contextualBridge',
    oldValue: issue.anchorText,
    newValue: targetTopic.title,
    confidence: 85,
    requiresAI: false,
    description: `Replace generic anchor "${issue.anchorText}" with descriptive text "${targetTopic.title}"`,
  };
};

/**
 * Generate auto-fix for anchor repetition issues
 * Suggests synonym variations (requires AI for full implementation)
 */
export const generateAnchorRepetitionFix = (
  issue: LinkingIssue,
  ctx: LinkingAuditContext
): LinkingAutoFix | null => {
  if (issue.type !== 'anchor_repetition_per_target') return null;

  const sourceTopic = ctx.topics.find(t => t.title === issue.sourceTopic);
  if (!sourceTopic) return null;

  const sourceBrief = ctx.briefs[sourceTopic.id];
  if (!sourceBrief) return null;

  // For now, suggest using a variant with "about" prefix
  // Full implementation would use AI to generate natural synonyms
  const originalAnchor = issue.anchorText || '';
  const suggestedAnchor = `learn about ${originalAnchor}`;

  return {
    issueId: issue.id,
    fixType: 'update_anchor',
    targetTable: 'content_briefs',
    targetId: sourceBrief.id,
    field: 'contextualBridge',
    oldValue: originalAnchor,
    newValue: suggestedAnchor,
    confidence: 60, // Lower confidence - AI would improve this
    requiresAI: true,
    description: `Vary anchor text to avoid repetition: "${originalAnchor}" → "${suggestedAnchor}"`,
  };
};

/**
 * Generate auto-fix for missing contextual bridge
 * Creates a placeholder bridge section (requires AI for full content)
 */
export const generateContextualBridgeFix = (
  issue: LinkingIssue,
  ctx: LinkingAuditContext
): LinkingAutoFix | null => {
  if (issue.type !== 'missing_contextual_bridge') return null;

  const sourceTopic = ctx.topics.find(t => t.title === issue.sourceTopic);
  if (!sourceTopic) return null;

  const sourceBrief = ctx.briefs[sourceTopic.id];
  if (!sourceBrief) return null;

  const targetTopic = ctx.topics.find(t => t.title === issue.targetTopic);

  const bridgeTemplate: ContextualBridgeSection = {
    type: 'section',
    content: `[AI will generate contextual bridge content connecting ${issue.sourceTopic} to ${issue.targetTopic || 'target topic'}]`,
    links: targetTopic ? [{
      targetTopic: targetTopic.title,
      anchorText: targetTopic.title,
      reasoning: `Contextual bridge from ${issue.sourceTopic} to ${targetTopic.title}`,
      annotation_text_hint: `Explore more about ${targetTopic.title}`,
    }] : [],
  };

  return {
    issueId: issue.id,
    fixType: 'add_bridge',
    targetTable: 'content_briefs',
    targetId: sourceBrief.id,
    field: 'contextualBridge',
    oldValue: null,
    newValue: bridgeTemplate,
    confidence: 50, // Requires AI for proper content
    requiresAI: true,
    description: `Add contextual bridge section from "${issue.sourceTopic}" to "${issue.targetTopic}"`,
  };
};

/**
 * Generate auto-fix for orphaned topics
 * Suggests adding incoming link from related topic
 */
export const generateOrphanedTopicFix = (
  issue: LinkingIssue,
  ctx: LinkingAuditContext
): LinkingAutoFix | null => {
  if (issue.type !== 'orphaned_topic') return null;

  const orphanedTopic = ctx.topics.find(t => t.title === issue.sourceTopic);
  if (!orphanedTopic) return null;

  // Find best candidate to link FROM (same parent, or core topic in same pillar)
  const candidates = ctx.topics.filter(t => {
    if (t.id === orphanedTopic.id) return false;
    // Prefer topics with same parent
    if (orphanedTopic.parent_topic_id && t.parent_topic_id === orphanedTopic.parent_topic_id) return true;
    // Or core topics if orphan is outer
    if (orphanedTopic.type === 'outer' && t.type === 'core') return true;
    return false;
  });

  if (candidates.length === 0) {
    // Fallback to any core topic
    const fallback = ctx.topics.find(t => t.type === 'core');
    if (fallback) candidates.push(fallback);
  }

  if (candidates.length === 0) return null;

  const sourceTopic = candidates[0];
  const sourceBrief = ctx.briefs[sourceTopic.id];
  if (!sourceBrief) return null;

  return {
    issueId: issue.id,
    fixType: 'add_link',
    targetTable: 'content_briefs',
    targetId: sourceBrief.id,
    field: 'contextualBridge',
    oldValue: null,
    newValue: {
      targetTopicId: orphanedTopic.id,
      anchor: orphanedTopic.title,
      relationship: 'spoke_to_spoke',
      annotation_text_hint: `Learn more about ${orphanedTopic.title}`,
    },
    confidence: 70,
    requiresAI: false,
    description: `Add link from "${sourceTopic.title}" to orphaned topic "${orphanedTopic.title}"`,
  };
};

/**
 * Generate auto-fix for missing E-A-T links in footer
 */
export const generateMissingEatLinkFix = (
  issue: LinkingIssue,
  ctx: LinkingAuditContext
): LinkingAutoFix | null => {
  if (issue.type !== 'missing_eat_link') return null;

  // Find the matching foundation page
  const missingType = issue.message?.match(/Missing (About|Privacy|Contact|Terms)/i)?.[1]?.toLowerCase();
  if (!missingType) return null;

  const pageTypeMap: Record<string, FoundationPageType> = {
    'about': 'about',
    'privacy': 'privacy',
    'contact': 'contact',
    'terms': 'terms',
  };

  const foundationPage = ctx.foundationPages.find(
    fp => fp.page_type === pageTypeMap[missingType]
  );

  if (!foundationPage || !ctx.navigation) return null;

  return {
    issueId: issue.id,
    fixType: 'add_nav_link',
    targetTable: 'navigation_structures',
    targetId: ctx.navigation.map_id,
    field: 'footer.legal_links',
    oldValue: ctx.navigation.footer?.legal_links || [],
    newValue: [
      ...(ctx.navigation.footer?.legal_links || []),
      { title: foundationPage.title, slug: foundationPage.slug },
    ],
    confidence: 95,
    requiresAI: false,
    description: `Add ${foundationPage.title} to footer legal links`,
  };
};

/**
 * Generate all applicable auto-fixes for an audit result
 */
export const generateAllFixes = (
  auditResult: LinkingAuditResult,
  ctx: LinkingAuditContext
): LinkingAutoFix[] => {
  const fixes: LinkingAutoFix[] = [];

  const allIssues = auditResult.passResults.flatMap(p => p.issues);

  for (const issue of allIssues) {
    if (!issue.autoFixable) continue;

    let fix: LinkingAutoFix | null = null;

    switch (issue.type) {
      case 'generic_anchor':
        fix = generateGenericAnchorFix(issue, ctx);
        break;
      case 'anchor_repetition_per_target':
        fix = generateAnchorRepetitionFix(issue, ctx);
        break;
      case 'missing_contextual_bridge':
        fix = generateContextualBridgeFix(issue, ctx);
        break;
      case 'orphaned_topic':
        fix = generateOrphanedTopicFix(issue, ctx);
        break;
      case 'missing_eat_link':
        fix = generateMissingEatLinkFix(issue, ctx);
        break;
    }

    if (fix) {
      fixes.push(fix);
    }
  }

  // Sort by confidence (highest first)
  return fixes.sort((a, b) => b.confidence - a.confidence);
};

// ============================================
// FIX EXECUTOR (Task 5.9)
// ============================================

/**
 * Get Supabase client for database operations
 */
const getSupabaseClient = (): SupabaseClient => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return createClient(supabaseUrl, supabaseAnonKey);
};

/**
 * Apply a single fix to the database
 * Returns the fix history entry ID for potential undo
 */
export const applyFix = async (
  fix: LinkingAutoFix,
  auditId: string,
  userId: string
): Promise<{ success: boolean; historyId?: string; error?: string }> => {
  const supabase = getSupabaseClient();

  try {
    // Apply the fix based on target table
    switch (fix.targetTable) {
      case 'content_briefs': {
        // For content briefs, we need to update the specific field
        const { data: brief, error: fetchError } = await supabase
          .from('content_briefs')
          .select('*')
          .eq('id', fix.targetId)
          .single();

        if (fetchError) throw new Error(`Failed to fetch brief: ${fetchError.message}`);

        // Update the appropriate field
        let updateData: Record<string, any> = {};

        if (fix.field === 'contextualBridge') {
          if (fix.fixType === 'add_bridge' || fix.fixType === 'add_link') {
            // Add new bridge content
            updateData.contextual_bridge = fix.newValue;
          } else if (fix.fixType === 'update_anchor') {
            // Update anchor in existing bridge
            const currentBridge = brief.contextual_bridge;
            if (Array.isArray(currentBridge)) {
              // Old array format - find and update
              updateData.contextual_bridge = currentBridge.map((link: ContextualBridgeLink) =>
                link.anchorText === fix.oldValue
                  ? { ...link, anchorText: fix.newValue }
                  : link
              );
            } else if (currentBridge?.links) {
              // New section format
              updateData.contextual_bridge = {
                ...currentBridge,
                links: currentBridge.links.map((link: ContextualBridgeLink) =>
                  link.anchorText === fix.oldValue
                    ? { ...link, anchorText: fix.newValue }
                    : link
                ),
              };
            }
          }
        }

        const { error: updateError } = await supabase
          .from('content_briefs')
          .update(updateData)
          .eq('id', fix.targetId);

        if (updateError) throw new Error(`Failed to update brief: ${updateError.message}`);
        break;
      }

      case 'navigation_structures': {
        const { data: nav, error: fetchError } = await supabase
          .from('navigation_structures')
          .select('*')
          .eq('map_id', fix.targetId)
          .single();

        if (fetchError) throw new Error(`Failed to fetch navigation: ${fetchError.message}`);

        let updateData: Record<string, any> = {};

        if (fix.field === 'footer.legal_links') {
          updateData.footer = {
            ...nav.footer,
            legal_links: fix.newValue,
          };
        }

        const { error: updateError } = await supabase
          .from('navigation_structures')
          .update(updateData)
          .eq('map_id', fix.targetId);

        if (updateError) throw new Error(`Failed to update navigation: ${updateError.message}`);
        break;
      }

      case 'topics': {
        // Topics rarely need direct fixes, but support for completeness
        const { error: updateError } = await supabase
          .from('topics')
          .update({ [fix.field]: fix.newValue })
          .eq('id', fix.targetId);

        if (updateError) throw new Error(`Failed to update topic: ${updateError.message}`);
        break;
      }

      default:
        throw new Error(`Unknown target table: ${fix.targetTable}`);
    }

    // Record the fix in history for undo capability
    const { data: historyEntry, error: historyError } = await supabase
      .from('linking_fix_history')
      .insert({
        audit_id: auditId,
        user_id: userId,
        issue_id: fix.issueId,
        fix_type: fix.fixType,
        target_table: fix.targetTable,
        target_id: fix.targetId,
        field: fix.field,
        old_value: fix.oldValue,
        new_value: fix.newValue,
        confidence: fix.confidence,
        required_ai: fix.requiresAI,
        description: fix.description,
      })
      .select()
      .single();

    if (historyError) {
      console.error('Warning: Fix applied but history recording failed:', historyError);
      return { success: true };
    }

    return { success: true, historyId: historyEntry.id };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error applying fix',
    };
  }
};

/**
 * Apply multiple fixes in sequence
 * Returns results for each fix
 */
export const applyFixes = async (
  fixes: LinkingAutoFix[],
  auditId: string,
  userId: string
): Promise<{
  applied: number;
  failed: number;
  results: Array<{ fix: LinkingAutoFix; success: boolean; historyId?: string; error?: string }>;
}> => {
  const results: Array<{ fix: LinkingAutoFix; success: boolean; historyId?: string; error?: string }> = [];
  let applied = 0;
  let failed = 0;

  for (const fix of fixes) {
    const result = await applyFix(fix, auditId, userId);
    results.push({ fix, ...result });

    if (result.success) {
      applied++;
    } else {
      failed++;
    }
  }

  return { applied, failed, results };
};

/**
 * Undo a previously applied fix
 * Restores the old value from history
 */
export const undoFix = async (
  historyId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  const supabase = getSupabaseClient();

  try {
    // Get the fix history entry
    const { data: history, error: fetchError } = await supabase
      .from('linking_fix_history')
      .select('*')
      .eq('id', historyId)
      .single();

    if (fetchError) throw new Error(`Failed to fetch history: ${fetchError.message}`);
    if (history.undone_at) throw new Error('Fix has already been undone');

    // Restore the old value
    switch (history.target_table) {
      case 'content_briefs': {
        const { error: updateError } = await supabase
          .from('content_briefs')
          .update({ [history.field === 'contextualBridge' ? 'contextual_bridge' : history.field]: history.old_value })
          .eq('id', history.target_id);

        if (updateError) throw new Error(`Failed to restore brief: ${updateError.message}`);
        break;
      }

      case 'navigation_structures': {
        if (history.field === 'footer.legal_links') {
          const { data: nav, error: fetchNavError } = await supabase
            .from('navigation_structures')
            .select('footer')
            .eq('map_id', history.target_id)
            .single();

          if (fetchNavError) throw new Error(`Failed to fetch navigation: ${fetchNavError.message}`);

          const { error: updateError } = await supabase
            .from('navigation_structures')
            .update({
              footer: { ...nav.footer, legal_links: history.old_value },
            })
            .eq('map_id', history.target_id);

          if (updateError) throw new Error(`Failed to restore navigation: ${updateError.message}`);
        }
        break;
      }

      case 'topics': {
        const { error: updateError } = await supabase
          .from('topics')
          .update({ [history.field]: history.old_value })
          .eq('id', history.target_id);

        if (updateError) throw new Error(`Failed to restore topic: ${updateError.message}`);
        break;
      }
    }

    // Mark the history entry as undone
    const { error: markError } = await supabase
      .from('linking_fix_history')
      .update({
        undone_at: new Date().toISOString(),
        undone_by: userId,
      })
      .eq('id', historyId);

    if (markError) {
      console.error('Warning: Fix undone but history update failed:', markError);
    }

    return { success: true };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error undoing fix',
    };
  }
};

/**
 * Save audit results to database
 */
export const saveAuditResults = async (
  result: LinkingAuditResult,
  userId: string,
  rules: InternalLinkingRules
): Promise<{ success: boolean; auditId?: string; error?: string }> => {
  const supabase = getSupabaseClient();

  try {
    // Calculate pass-specific scores
    const getPassScore = (pass: LinkingAuditPass): number => {
      const passResult = result.passResults.find(p => p.pass === pass);
      if (!passResult) return 100;

      const criticalCount = passResult.issues.filter(i => i.severity === 'critical').length;
      const warningCount = passResult.issues.filter(i => i.severity === 'warning').length;
      const suggestionCount = passResult.issues.filter(i => i.severity === 'suggestion').length;

      const penalty = (criticalCount * 20) + (warningCount * 5) + (suggestionCount * 1);
      return Math.max(0, 100 - penalty);
    };

    const { data, error } = await supabase
      .from('linking_audit_results')
      .insert({
        map_id: result.map_id,
        user_id: userId,
        pass_results: result.passResults,
        overall_score: result.overallScore,
        auto_fixable_count: result.autoFixableCount,
        total_issues_count: result.passResults.reduce((sum, p) => sum + p.issues.length, 0),
        critical_issues_count: result.passResults.reduce(
          (sum, p) => sum + p.issues.filter(i => i.severity === 'critical').length,
          0
        ),
        fundamentals_score: getPassScore(LinkingAuditPass.FUNDAMENTALS),
        navigation_score: getPassScore(LinkingAuditPass.NAVIGATION),
        flow_direction_score: getPassScore(LinkingAuditPass.FLOW_DIRECTION),
        external_score: getPassScore(LinkingAuditPass.EXTERNAL),
        rules_snapshot: rules,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to save audit: ${error.message}`);

    return { success: true, auditId: data.id };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error saving audit',
    };
  }
};
