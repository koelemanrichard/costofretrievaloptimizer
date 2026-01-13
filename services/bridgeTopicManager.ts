/**
 * Bridge Topic Manager Service
 *
 * Analyzes topical map structure to identify bridge topics and ensure proper
 * internal linking between core, bridge, and outer content tiers.
 *
 * Bridge Role Definitions:
 * - CORE: High-authority pillar pages, primary monetization content
 * - BRIDGE: Transitional topics connecting core to outer, often informational
 * - OUTER: Supporting content, long-tail queries, niche topics
 *
 * The service provides:
 * 1. Bridge structure analysis (identifying which topics serve bridge roles)
 * 2. Link suggestions based on semantic proximity
 * 3. Bridge coverage validation
 * 4. Gap identification for internal linking strategy
 *
 * Created: January 13, 2026
 */

import { EnrichedTopic, TopicalMap, ContextualBridgeLink, ContentBrief } from '../types';

// =============================================================================
// Types
// =============================================================================

export type BridgeRole = 'core' | 'bridge' | 'outer';

export interface BridgeRoleAssignment {
  topicId: string;
  topicTitle: string;
  inferredRole: BridgeRole;
  confidence: number; // 0-100
  reasoning: string;
}

export interface BridgeAnalysis {
  coreTopics: EnrichedTopic[];
  bridgeTopics: EnrichedTopic[];
  outerTopics: EnrichedTopic[];
  roleAssignments: Map<string, BridgeRoleAssignment>;
  missingBridges: MissingBridge[];
  linkingGaps: LinkingGap[];
  coverageScore: number; // 0-100
}

export interface MissingBridge {
  coreTopic: EnrichedTopic;
  suggestedBridgeTitle: string;
  suggestedBridgeDescription: string;
  targetOuterTopics: EnrichedTopic[];
  priority: 'high' | 'medium' | 'low';
}

export interface LinkingGap {
  fromTopic: EnrichedTopic;
  toTopic: EnrichedTopic;
  reason: string;
  severity: 'critical' | 'warning' | 'suggestion';
  suggestedAnchorText?: string;
}

export interface SuggestedInternalLink {
  targetTopicId: string;
  targetTopicTitle: string;
  anchorText: string;
  reasoning: string;
  priority: number; // 1-10, higher is more important
  linkDirection: 'outbound' | 'inbound';
}

export interface TopicLinkingContext {
  topic: EnrichedTopic;
  role: BridgeRole;
  parentTopic?: EnrichedTopic;
  childTopics: EnrichedTopic[];
  siblingTopics: EnrichedTopic[];
  semanticallyRelated: EnrichedTopic[];
}

// =============================================================================
// Bridge Role Inference
// =============================================================================

/**
 * Infer bridge role based on topic characteristics
 * Uses multiple signals: type, class, hierarchy position, attribute focus
 */
function inferBridgeRole(
  topic: EnrichedTopic,
  allTopics: EnrichedTopic[]
): BridgeRoleAssignment {
  const signals: { role: BridgeRole; weight: number; reason: string }[] = [];

  // Signal 1: Explicit type classification
  if (topic.type === 'core') {
    signals.push({ role: 'core', weight: 30, reason: 'Classified as core topic' });
  } else if (topic.type === 'outer') {
    signals.push({ role: 'outer', weight: 20, reason: 'Classified as outer topic' });
  } else if (topic.type === 'child') {
    signals.push({ role: 'outer', weight: 15, reason: 'Child topic - typically outer tier' });
  }

  // Signal 2: Topic class (monetization vs informational)
  if (topic.topic_class === 'monetization') {
    signals.push({ role: 'core', weight: 25, reason: 'Monetization focus indicates core' });
  } else if (topic.topic_class === 'informational') {
    // Informational can be bridge or outer
    const hasChildren = allTopics.some(t => t.parent_topic_id === topic.id);
    if (hasChildren) {
      signals.push({ role: 'bridge', weight: 20, reason: 'Informational with children - bridge role' });
    } else {
      signals.push({ role: 'outer', weight: 15, reason: 'Informational without children - outer role' });
    }
  }

  // Signal 3: Cluster role
  if (topic.cluster_role === 'pillar') {
    signals.push({ role: 'core', weight: 30, reason: 'Pillar page - core tier' });
  } else if (topic.cluster_role === 'cluster_content') {
    signals.push({ role: 'outer', weight: 15, reason: 'Cluster content - typically outer' });
  }

  // Signal 4: Hierarchy position (middle tier = bridge)
  const parent = allTopics.find(t => t.id === topic.parent_topic_id);
  const children = allTopics.filter(t => t.parent_topic_id === topic.id);

  if (parent && children.length > 0) {
    // Has both parent and children - bridge position
    signals.push({ role: 'bridge', weight: 35, reason: 'Middle tier in hierarchy - natural bridge' });
  } else if (!parent && children.length > 0) {
    // Root with children - likely core
    signals.push({ role: 'core', weight: 20, reason: 'Root topic with children' });
  } else if (parent && children.length === 0) {
    // Leaf node - likely outer
    signals.push({ role: 'outer', weight: 15, reason: 'Leaf topic without children' });
  }

  // Signal 5: Attribute focus patterns
  const bridgeAttributes = ['overview', 'introduction', 'guide', 'basics', 'fundamentals'];
  const coreAttributes = ['services', 'products', 'solutions', 'pricing', 'consultation'];
  const outerAttributes = ['tips', 'examples', 'case studies', 'faq', 'troubleshooting'];

  const titleLower = topic.title.toLowerCase();
  const attributeFocus = (topic.attribute_focus || '').toLowerCase();

  if (coreAttributes.some(a => titleLower.includes(a) || attributeFocus.includes(a))) {
    signals.push({ role: 'core', weight: 15, reason: 'Core attribute pattern in title' });
  }
  if (bridgeAttributes.some(a => titleLower.includes(a) || attributeFocus.includes(a))) {
    signals.push({ role: 'bridge', weight: 15, reason: 'Bridge attribute pattern in title' });
  }
  if (outerAttributes.some(a => titleLower.includes(a) || attributeFocus.includes(a))) {
    signals.push({ role: 'outer', weight: 15, reason: 'Outer attribute pattern in title' });
  }

  // Calculate weighted average
  const roleScores: Record<BridgeRole, number> = { core: 0, bridge: 0, outer: 0 };
  let totalWeight = 0;

  for (const signal of signals) {
    roleScores[signal.role] += signal.weight;
    totalWeight += signal.weight;
  }

  // Find winner
  let maxScore = 0;
  let inferredRole: BridgeRole = 'outer';
  for (const role of ['core', 'bridge', 'outer'] as BridgeRole[]) {
    if (roleScores[role] > maxScore) {
      maxScore = roleScores[role];
      inferredRole = role;
    }
  }

  const confidence = totalWeight > 0 ? Math.round((maxScore / totalWeight) * 100) : 50;
  const topReasons = signals
    .filter(s => s.role === inferredRole)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 2)
    .map(s => s.reason);

  return {
    topicId: topic.id,
    topicTitle: topic.title,
    inferredRole,
    confidence,
    reasoning: topReasons.join('; ') || 'Default classification',
  };
}

// =============================================================================
// Semantic Proximity
// =============================================================================

/**
 * Calculate semantic proximity between two topics
 * Returns 0-100 score
 */
function calculateSemanticProximity(topic1: EnrichedTopic, topic2: EnrichedTopic): number {
  let score = 0;

  // Same parent bonus
  if (topic1.parent_topic_id && topic1.parent_topic_id === topic2.parent_topic_id) {
    score += 30; // Siblings
  }

  // Parent-child relationship
  if (topic1.parent_topic_id === topic2.id || topic2.parent_topic_id === topic1.id) {
    score += 50; // Direct hierarchy
  }

  // Title word overlap
  const words1 = new Set(topic1.title.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const words2 = new Set(topic2.title.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const overlap = [...words1].filter(w => words2.has(w)).length;
  const unionSize = new Set([...words1, ...words2]).size;
  if (unionSize > 0) {
    score += Math.round((overlap / unionSize) * 20);
  }

  // Keyword overlap (if available)
  const keywords1 = new Set((topic1.keywords || []).map(k => k.toLowerCase()));
  const keywords2 = new Set((topic2.keywords || []).map(k => k.toLowerCase()));
  if (keywords1.size > 0 && keywords2.size > 0) {
    const keywordOverlap = [...keywords1].filter(k => keywords2.has(k)).length;
    const keywordUnion = new Set([...keywords1, ...keywords2]).size;
    score += Math.round((keywordOverlap / keywordUnion) * 15);
  }

  // Query type match
  if (topic1.query_type && topic1.query_type === topic2.query_type) {
    score += 10;
  }

  // Attribute focus similarity
  if (topic1.attribute_focus && topic2.attribute_focus) {
    if (topic1.attribute_focus === topic2.attribute_focus) {
      score += 15;
    }
  }

  return Math.min(100, score);
}

/**
 * Find semantically related topics
 */
function findSemanticRelations(
  topic: EnrichedTopic,
  allTopics: EnrichedTopic[],
  minProximity: number = 20
): EnrichedTopic[] {
  return allTopics
    .filter(t => t.id !== topic.id)
    .map(t => ({ topic: t, proximity: calculateSemanticProximity(topic, t) }))
    .filter(item => item.proximity >= minProximity)
    .sort((a, b) => b.proximity - a.proximity)
    .slice(0, 10)
    .map(item => item.topic);
}

// =============================================================================
// Main Analysis Functions
// =============================================================================

/**
 * Analyze the bridge structure of a topical map
 */
export function analyzeBridgeStructure(topics: EnrichedTopic[]): BridgeAnalysis {
  // Assign roles to all topics
  const roleAssignments = new Map<string, BridgeRoleAssignment>();
  for (const topic of topics) {
    roleAssignments.set(topic.id, inferBridgeRole(topic, topics));
  }

  // Categorize by role
  const coreTopics: EnrichedTopic[] = [];
  const bridgeTopics: EnrichedTopic[] = [];
  const outerTopics: EnrichedTopic[] = [];

  for (const topic of topics) {
    const assignment = roleAssignments.get(topic.id);
    if (!assignment) continue;

    switch (assignment.inferredRole) {
      case 'core':
        coreTopics.push(topic);
        break;
      case 'bridge':
        bridgeTopics.push(topic);
        break;
      case 'outer':
        outerTopics.push(topic);
        break;
    }
  }

  // Identify missing bridges
  const missingBridges = identifyMissingBridges(coreTopics, bridgeTopics, outerTopics, topics);

  // Identify linking gaps
  const linkingGaps = identifyLinkingGaps(coreTopics, bridgeTopics, outerTopics, roleAssignments);

  // Calculate coverage score
  const coverageScore = calculateCoverageScore(coreTopics, bridgeTopics, outerTopics, linkingGaps);

  return {
    coreTopics,
    bridgeTopics,
    outerTopics,
    roleAssignments,
    missingBridges,
    linkingGaps,
    coverageScore,
  };
}

/**
 * Identify missing bridge topics between core and outer tiers
 */
function identifyMissingBridges(
  coreTopics: EnrichedTopic[],
  bridgeTopics: EnrichedTopic[],
  outerTopics: EnrichedTopic[],
  allTopics: EnrichedTopic[]
): MissingBridge[] {
  const missingBridges: MissingBridge[] = [];

  for (const core of coreTopics) {
    // Find outer topics that are children/related but have no bridge
    const relatedOuter = outerTopics.filter(outer => {
      // Check if there's a direct parent-child with no middle tier
      if (outer.parent_topic_id === core.id) {
        // Direct child of core - check if there should be a bridge
        const siblings = outerTopics.filter(o => o.parent_topic_id === core.id);
        // If many direct children, suggests missing bridge tier
        return siblings.length > 3;
      }
      return false;
    });

    if (relatedOuter.length > 3) {
      // Too many direct children - suggest a bridge topic
      const commonWords = findCommonWords(relatedOuter);
      missingBridges.push({
        coreTopic: core,
        suggestedBridgeTitle: `${core.title} ${commonWords.join(' ')} Overview`,
        suggestedBridgeDescription: `Bridge topic to organize ${relatedOuter.length} related subtopics under ${core.title}`,
        targetOuterTopics: relatedOuter.slice(0, 5),
        priority: relatedOuter.length > 5 ? 'high' : 'medium',
      });
    }

    // Check if core has semantic relation to outer but no linking path
    const semanticOuter = outerTopics.filter(outer => {
      const proximity = calculateSemanticProximity(core, outer);
      if (proximity < 20) return false;

      // Check if there's a bridge connecting them
      const hasBridge = bridgeTopics.some(bridge => {
        const coreToBridge = calculateSemanticProximity(core, bridge);
        const bridgeToOuter = calculateSemanticProximity(bridge, outer);
        return coreToBridge > 30 && bridgeToOuter > 30;
      });

      return !hasBridge;
    });

    if (semanticOuter.length > 2) {
      missingBridges.push({
        coreTopic: core,
        suggestedBridgeTitle: `${core.title} Resources & Guides`,
        suggestedBridgeDescription: `Bridge to connect ${core.title} with ${semanticOuter.length} related informational topics`,
        targetOuterTopics: semanticOuter.slice(0, 5),
        priority: 'medium',
      });
    }
  }

  return missingBridges;
}

/**
 * Find common words across topic titles
 */
function findCommonWords(topics: EnrichedTopic[]): string[] {
  const wordCounts = new Map<string, number>();
  const stopWords = new Set(['the', 'and', 'for', 'how', 'what', 'why', 'with', 'your']);

  for (const topic of topics) {
    const words = topic.title.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w));
    for (const word of words) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }
  }

  return [...wordCounts.entries()]
    .filter(([, count]) => count > topics.length * 0.3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([word]) => word);
}

/**
 * Identify gaps in internal linking structure
 */
function identifyLinkingGaps(
  coreTopics: EnrichedTopic[],
  bridgeTopics: EnrichedTopic[],
  outerTopics: EnrichedTopic[],
  roleAssignments: Map<string, BridgeRoleAssignment>
): LinkingGap[] {
  const gaps: LinkingGap[] = [];

  // Rule 1: Every core topic should link to at least one bridge
  for (const core of coreTopics) {
    const linkedBridges = bridgeTopics.filter(bridge => {
      return bridge.parent_topic_id === core.id ||
             calculateSemanticProximity(core, bridge) > 40;
    });

    if (linkedBridges.length === 0 && bridgeTopics.length > 0) {
      // Find best bridge candidate
      const bestBridge = bridgeTopics.reduce((best, current) => {
        const currentScore = calculateSemanticProximity(core, current);
        const bestScore = best ? calculateSemanticProximity(core, best) : 0;
        return currentScore > bestScore ? current : best;
      }, bridgeTopics[0]);

      if (bestBridge) {
        gaps.push({
          fromTopic: core,
          toTopic: bestBridge,
          reason: 'Core topic has no link to bridge tier',
          severity: 'critical',
          suggestedAnchorText: generateAnchorText(core, bestBridge),
        });
      }
    }
  }

  // Rule 2: Bridge topics should link to both core and outer
  for (const bridge of bridgeTopics) {
    // Check core link
    const linkedCore = coreTopics.filter(core => {
      return bridge.parent_topic_id === core.id ||
             calculateSemanticProximity(bridge, core) > 40;
    });

    if (linkedCore.length === 0 && coreTopics.length > 0) {
      const bestCore = coreTopics.reduce((best, current) => {
        const currentScore = calculateSemanticProximity(bridge, current);
        const bestScore = best ? calculateSemanticProximity(bridge, best) : 0;
        return currentScore > bestScore ? current : best;
      }, coreTopics[0]);

      if (bestCore) {
        gaps.push({
          fromTopic: bridge,
          toTopic: bestCore,
          reason: 'Bridge topic has no link to core tier',
          severity: 'warning',
          suggestedAnchorText: generateAnchorText(bridge, bestCore),
        });
      }
    }

    // Check outer link
    const linkedOuter = outerTopics.filter(outer => {
      return outer.parent_topic_id === bridge.id ||
             calculateSemanticProximity(bridge, outer) > 30;
    });

    if (linkedOuter.length === 0 && outerTopics.length > 0) {
      const bestOuter = outerTopics.reduce((best, current) => {
        const currentScore = calculateSemanticProximity(bridge, current);
        const bestScore = best ? calculateSemanticProximity(bridge, best) : 0;
        return currentScore > bestScore ? current : best;
      }, outerTopics[0]);

      if (bestOuter) {
        gaps.push({
          fromTopic: bridge,
          toTopic: bestOuter,
          reason: 'Bridge topic has no link to outer tier',
          severity: 'suggestion',
          suggestedAnchorText: generateAnchorText(bridge, bestOuter),
        });
      }
    }
  }

  return gaps;
}

/**
 * Generate anchor text for a link between two topics
 */
function generateAnchorText(from: EnrichedTopic, to: EnrichedTopic): string {
  // Use target topic's canonical query if available
  if (to.canonical_query) {
    return to.canonical_query;
  }

  // Use attribute focus if available
  if (to.attribute_focus) {
    return `${to.attribute_focus} of ${to.title.split(' ').slice(0, 3).join(' ')}`;
  }

  // Extract key phrase from title (2-4 words)
  const titleWords = to.title.split(/\s+/).filter(w => w.length > 2);
  if (titleWords.length <= 4) {
    return to.title.toLowerCase();
  }

  // Remove common leading words
  const skipWords = ['how', 'what', 'why', 'the', 'a', 'an', 'guide', 'complete'];
  const filtered = titleWords.filter(w => !skipWords.includes(w.toLowerCase()));
  return filtered.slice(0, 3).join(' ').toLowerCase();
}

/**
 * Calculate bridge coverage score
 */
function calculateCoverageScore(
  coreTopics: EnrichedTopic[],
  bridgeTopics: EnrichedTopic[],
  outerTopics: EnrichedTopic[],
  linkingGaps: LinkingGap[]
): number {
  let score = 100;

  // Penalize critical gaps heavily
  const criticalGaps = linkingGaps.filter(g => g.severity === 'critical').length;
  score -= criticalGaps * 15;

  // Penalize warning gaps moderately
  const warningGaps = linkingGaps.filter(g => g.severity === 'warning').length;
  score -= warningGaps * 5;

  // Penalize missing bridge tier
  if (bridgeTopics.length === 0 && outerTopics.length > 5) {
    score -= 20; // No bridge tier when there's significant outer content
  }

  // Bonus for good bridge ratio
  const totalTopics = coreTopics.length + bridgeTopics.length + outerTopics.length;
  if (totalTopics > 0) {
    const bridgeRatio = bridgeTopics.length / totalTopics;
    if (bridgeRatio > 0.1 && bridgeRatio < 0.4) {
      score += 10; // Good bridge coverage
    }
  }

  return Math.max(0, Math.min(100, score));
}

// =============================================================================
// Link Suggestion Functions
// =============================================================================

/**
 * Suggest internal links for a specific topic
 */
export function suggestBridgeLinks(
  topic: EnrichedTopic,
  allTopics: EnrichedTopic[],
  existingLinks?: ContextualBridgeLink[]
): SuggestedInternalLink[] {
  const suggestions: SuggestedInternalLink[] = [];
  const existingTargets = new Set((existingLinks || []).map(l => l.targetTopic.toLowerCase()));

  // Get role assignment
  const assignment = inferBridgeRole(topic, allTopics);
  const role = assignment.inferredRole;

  // Get context
  const parent = allTopics.find(t => t.id === topic.parent_topic_id);
  const children = allTopics.filter(t => t.parent_topic_id === topic.id);
  const siblings = allTopics.filter(t =>
    t.id !== topic.id &&
    t.parent_topic_id === topic.parent_topic_id &&
    topic.parent_topic_id !== null
  );
  const semanticRelations = findSemanticRelations(topic, allTopics);

  // Priority 1: Link to parent (if not core)
  if (parent && role !== 'core' && !existingTargets.has(parent.title.toLowerCase())) {
    suggestions.push({
      targetTopicId: parent.id,
      targetTopicTitle: parent.title,
      anchorText: generateAnchorText(topic, parent),
      reasoning: 'Link to parent topic for topical hierarchy',
      priority: 9,
      linkDirection: 'outbound',
    });
  }

  // Priority 2: Link to children (especially for core/bridge)
  for (const child of children.slice(0, 3)) {
    if (!existingTargets.has(child.title.toLowerCase())) {
      suggestions.push({
        targetTopicId: child.id,
        targetTopicTitle: child.title,
        anchorText: generateAnchorText(topic, child),
        reasoning: 'Link to child topic for content distribution',
        priority: 8,
        linkDirection: 'outbound',
      });
    }
  }

  // Priority 3: Link to siblings (semantic clustering)
  for (const sibling of siblings.slice(0, 2)) {
    if (!existingTargets.has(sibling.title.toLowerCase())) {
      suggestions.push({
        targetTopicId: sibling.id,
        targetTopicTitle: sibling.title,
        anchorText: generateAnchorText(topic, sibling),
        reasoning: 'Link to sibling topic for cluster reinforcement',
        priority: 6,
        linkDirection: 'outbound',
      });
    }
  }

  // Priority 4: Semantic relations (topic relevance)
  for (const related of semanticRelations.slice(0, 3)) {
    if (!existingTargets.has(related.title.toLowerCase()) &&
        !suggestions.some(s => s.targetTopicId === related.id)) {
      const proximity = calculateSemanticProximity(topic, related);
      suggestions.push({
        targetTopicId: related.id,
        targetTopicTitle: related.title,
        anchorText: generateAnchorText(topic, related),
        reasoning: `Semantically related topic (${proximity}% similarity)`,
        priority: Math.min(7, Math.floor(proximity / 15) + 3),
        linkDirection: 'outbound',
      });
    }
  }

  // Role-specific suggestions
  if (role === 'core') {
    // Core should link to bridges
    const bridges = allTopics.filter(t => {
      const a = inferBridgeRole(t, allTopics);
      return a.inferredRole === 'bridge';
    });

    for (const bridge of bridges.slice(0, 2)) {
      if (!existingTargets.has(bridge.title.toLowerCase()) &&
          !suggestions.some(s => s.targetTopicId === bridge.id)) {
        suggestions.push({
          targetTopicId: bridge.id,
          targetTopicTitle: bridge.title,
          anchorText: generateAnchorText(topic, bridge),
          reasoning: 'Core→Bridge link for content flow',
          priority: 7,
          linkDirection: 'outbound',
        });
      }
    }
  } else if (role === 'outer') {
    // Outer should link back to core/bridge
    const cores = allTopics.filter(t => {
      const a = inferBridgeRole(t, allTopics);
      return a.inferredRole === 'core';
    });

    for (const core of cores.slice(0, 1)) {
      if (!existingTargets.has(core.title.toLowerCase()) &&
          !suggestions.some(s => s.targetTopicId === core.id)) {
        suggestions.push({
          targetTopicId: core.id,
          targetTopicTitle: core.title,
          anchorText: generateAnchorText(topic, core),
          reasoning: 'Outer→Core link for authority flow',
          priority: 8,
          linkDirection: 'outbound',
        });
      }
    }
  }

  // Sort by priority and return top suggestions
  return suggestions
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 5);
}

/**
 * Get linking context for a topic
 */
export function getTopicLinkingContext(
  topic: EnrichedTopic,
  allTopics: EnrichedTopic[]
): TopicLinkingContext {
  const assignment = inferBridgeRole(topic, allTopics);

  return {
    topic,
    role: assignment.inferredRole,
    parentTopic: allTopics.find(t => t.id === topic.parent_topic_id),
    childTopics: allTopics.filter(t => t.parent_topic_id === topic.id),
    siblingTopics: allTopics.filter(t =>
      t.id !== topic.id &&
      t.parent_topic_id === topic.parent_topic_id &&
      topic.parent_topic_id !== null
    ),
    semanticallyRelated: findSemanticRelations(topic, allTopics),
  };
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validate bridge links are present in content
 */
export function validateBridgeLinksInContent(
  brief: ContentBrief,
  draft: string,
  allTopics: EnrichedTopic[]
): { valid: boolean; missingLinks: SuggestedInternalLink[]; presentLinks: string[] } {
  // Get bridge links from brief
  const bridgeLinks = Array.isArray(brief.contextualBridge)
    ? brief.contextualBridge
    : (brief.contextualBridge as { links?: ContextualBridgeLink[] })?.links || [];

  const presentLinks: string[] = [];
  const missingLinks: SuggestedInternalLink[] = [];

  // Check for markdown links in draft
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  const draftLinks = [...draft.matchAll(linkPattern)];
  const draftAnchors = new Set(draftLinks.map(m => m[1].toLowerCase()));
  const draftUrls = new Set(draftLinks.map(m => m[2].toLowerCase()));

  for (const link of bridgeLinks) {
    const anchorLower = link.anchorText.toLowerCase();
    const targetLower = link.targetTopic.toLowerCase();

    // Check if link is present by anchor text or target topic
    const isPresent = draftAnchors.has(anchorLower) ||
                      draftUrls.has(targetLower) ||
                      draft.toLowerCase().includes(`[${anchorLower}]`);

    if (isPresent) {
      presentLinks.push(link.anchorText);
    } else {
      // Find topic for better suggestion
      const targetTopic = allTopics.find(t =>
        t.title.toLowerCase() === targetLower ||
        t.slug === targetLower
      );

      missingLinks.push({
        targetTopicId: targetTopic?.id || '',
        targetTopicTitle: link.targetTopic,
        anchorText: link.anchorText,
        reasoning: link.reasoning || 'Required by brief contextualBridge',
        priority: 9,
        linkDirection: 'outbound',
      });
    }
  }

  return {
    valid: missingLinks.length === 0,
    missingLinks,
    presentLinks,
  };
}

/**
 * Get summary of bridge structure for display
 */
export function getBridgeSummary(analysis: BridgeAnalysis): string {
  const parts: string[] = [];

  parts.push(`Core: ${analysis.coreTopics.length}`);
  parts.push(`Bridge: ${analysis.bridgeTopics.length}`);
  parts.push(`Outer: ${analysis.outerTopics.length}`);

  if (analysis.missingBridges.length > 0) {
    parts.push(`Missing bridges: ${analysis.missingBridges.length}`);
  }

  if (analysis.linkingGaps.length > 0) {
    const critical = analysis.linkingGaps.filter(g => g.severity === 'critical').length;
    if (critical > 0) {
      parts.push(`Critical gaps: ${critical}`);
    }
  }

  parts.push(`Coverage: ${analysis.coverageScore}/100`);

  return parts.join(' | ');
}

// =============================================================================
// Export
// =============================================================================

export default {
  analyzeBridgeStructure,
  suggestBridgeLinks,
  getTopicLinkingContext,
  validateBridgeLinksInContent,
  getBridgeSummary,
};
