/**
 * BridgingOpportunitiesPanel
 *
 * Intelligent dashboard view of bridging opportunities.
 * Shows ONE best recommendation with full pre-filled topic data.
 *
 * Intelligence:
 * - Transforms node IDs to human-readable names
 * - Generates proper topic title based on gap context (NO REPETITION)
 * - Determines optimal placement (parent topic)
 * - Provides clear SEO reasoning
 * - Deduplicates identical suggestions
 * - Auto-generates internal link suggestions for existing bridges
 */

import React, { useMemo, useState } from 'react';
import { KnowledgeGraph, StructuralHole } from '../../lib/knowledgeGraph';
import { SemanticTriple, SEOPillars, EnrichedTopic, AttributeCategory, ContextualBridgeLink } from '../../types';
import { Button } from '../ui/Button';

/**
 * Pre-filled topic data for creating a bridge topic
 */
export interface BridgeTopicSuggestion {
  title: string;
  description: string;
  placement: {
    type: 'core' | 'outer' | 'child';
    parentTopicId?: string;
    parentTopicTitle?: string;
  };
  reasoning: string;
  seoImpact: string;
  clustersConnected: {
    clusterA: string[];
    clusterB: string[];
  };
}

/**
 * Auto-generated internal link suggestion
 */
export interface SuggestedInternalLink {
  targetTopicId: string;
  targetTopicTitle: string;
  anchorText: string;
  reasoning: string;
  cluster: 'A' | 'B';
  approved: boolean;
}

interface BridgingOpportunitiesPanelProps {
  knowledgeGraph: KnowledgeGraph | null;
  eavs: SemanticTriple[];
  pillars?: SEOPillars;
  topics: EnrichedTopic[];
  onSelectTopic?: (topicId: string) => void;
  onCreateBridgeTopic?: (suggestion: BridgeTopicSuggestion) => void;
  onAddLinks?: (bridgeTopicId: string, links: ContextualBridgeLink[]) => void;
}

// Attribute category weights for scoring (includes all AttributeCategory values)
const CATEGORY_WEIGHTS: Partial<Record<AttributeCategory, number>> = {
  UNIQUE: 1.0,
  ROOT: 0.8,
  RARE: 0.5,
  COMMON: 0.2,
  CORE_DEFINITION: 0.9,
  SEARCH_DEMAND: 0.7,
  COMPETITIVE_EXPANSION: 0.6,
  COMPOSITE: 0.4,
  UNCLASSIFIED: 0.1,
};

/**
 * Transform node ID to human-readable name
 * node_vve_beheer -> VVE Beheer
 * node_property_management_service -> Property Management Service
 */
function humanizeNodeId(nodeId: string): string {
  if (!nodeId || typeof nodeId !== 'string') return '';

  return nodeId
    .replace(/^node_/, '')           // Remove node_ prefix
    .replace(/_/g, ' ')              // Replace underscores with spaces
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Find the best parent topic for a bridge topic
 */
function findBestParent(
  clusterA: string[],
  clusterB: string[],
  topics: EnrichedTopic[]
): { parentTopic: EnrichedTopic | null; reason: string } {
  // Find topics that match either cluster
  const coreTopics = topics.filter(t => t.type === 'core');

  for (const coreTopic of coreTopics) {
    const titleLower = (coreTopic.title || '').toLowerCase();

    // Check if this core topic relates to either cluster
    const matchesA = clusterA.some(e => {
      const humanized = humanizeNodeId(e).toLowerCase();
      return titleLower.includes(humanized) || humanized.includes(titleLower.split(':')[0]);
    });

    const matchesB = clusterB.some(e => {
      const humanized = humanizeNodeId(e).toLowerCase();
      return titleLower.includes(humanized) || humanized.includes(titleLower.split(':')[0]);
    });

    if (matchesA || matchesB) {
      return {
        parentTopic: coreTopic,
        reason: `Under "${coreTopic.title}" because it relates to ${matchesA ? 'the first' : 'the second'} topic cluster`,
      };
    }
  }

  // Default: suggest as outer topic under first core topic
  if (coreTopics.length > 0) {
    return {
      parentTopic: coreTopics[0],
      reason: `Under "${coreTopics[0].title}" as a supporting topic`,
    };
  }

  return { parentTopic: null, reason: 'As a new outer topic' };
}

/**
 * Check if two terms are similar (overlap or contain each other)
 */
function areSimilarTerms(term1: string, term2: string): boolean {
  if (!term1 || !term2) return false;
  const t1 = term1.toLowerCase().trim();
  const t2 = term2.toLowerCase().trim();

  // Exact match
  if (t1 === t2) return true;

  // One contains the other
  if (t1.includes(t2) || t2.includes(t1)) return true;

  // Check word overlap (more than 50% of words shared)
  const words1 = t1.split(/\s+/);
  const words2 = t2.split(/\s+/);
  const sharedWords = words1.filter(w => words2.includes(w));
  const overlapRatio = sharedWords.length / Math.min(words1.length, words2.length);

  return overlapRatio > 0.5;
}

/**
 * Get unique, non-overlapping terms from a list
 */
function getDistinctTerms(terms: string[]): string[] {
  const distinct: string[] = [];

  for (const term of terms) {
    if (!term) continue;
    const isDuplicate = distinct.some(existing => areSimilarTerms(existing, term));
    if (!isDuplicate) {
      distinct.push(term);
    }
  }

  return distinct;
}

/**
 * Generate intelligent topic title following Semantic SEO rules:
 *
 * 1. MUST include Central Entity (CE) when relevant - site-wide N-gram consistency
 * 2. SHOULD use CSI predicates (verbs) to connect concepts
 * 3. Entity-first naming for prominence
 * 4. Short, specific titles (15-25 characters ideal, max 60)
 * 5. NO repetition of terms
 * 6. Semantically meaningful - no generic fallbacks
 */
function generateBridgeTitle(
  clusterA: string[],
  clusterB: string[],
  bridgeCandidates: string[],
  pillars?: SEOPillars
): string {
  // Extract Central Entity and CSI from pillars (CRITICAL for Semantic SEO)
  const centralEntity = pillars?.centralEntity?.trim() || '';
  // CSI verbs: use primary_verb and auxiliary_verb, or extract from centralSearchIntent string
  const csiVerbs: string[] = [];
  if (pillars?.primary_verb) csiVerbs.push(pillars.primary_verb);
  if (pillars?.auxiliary_verb) csiVerbs.push(pillars.auxiliary_verb);
  // Fallback: try to extract verb from centralSearchIntent if it's a string
  if (csiVerbs.length === 0 && pillars?.centralSearchIntent && typeof pillars.centralSearchIntent === 'string') {
    const words = pillars.centralSearchIntent.split(/\s+/);
    if (words.length > 0) csiVerbs.push(words[words.length - 1]); // Last word is often the verb
  }

  // Get human-readable names for clusters
  const clusterANames = clusterA.map(humanizeNodeId).filter(Boolean);
  const clusterBNames = clusterB.map(humanizeNodeId).filter(Boolean);

  // Get ALL unique terms across both clusters (excluding CE to avoid repetition)
  const allTerms = [...clusterANames, ...clusterBNames];
  const distinctTerms = getDistinctTerms(allTerms).filter(
    t => !centralEntity || !areSimilarTerms(t, centralEntity)
  );

  // Find the most distinct term from each cluster (excluding CE)
  const distinctA = getDistinctTerms(clusterANames).filter(
    t => !centralEntity || !areSimilarTerms(t, centralEntity)
  );
  const distinctB = clusterBNames.filter(
    b => !distinctA.some(a => areSimilarTerms(a, b)) &&
         (!centralEntity || !areSimilarTerms(b, centralEntity))
  );

  // Check if bridge candidate is distinct from clusters AND from CE
  let bridgeTopic: string | null = null;
  if (bridgeCandidates.length > 0) {
    const candidate = humanizeNodeId(bridgeCandidates[0]);
    const isDuplicateOfCluster = distinctTerms.some(t => areSimilarTerms(t, candidate));
    const isDuplicateOfCE = centralEntity && areSimilarTerms(candidate, centralEntity);
    if (!isDuplicateOfCluster && !isDuplicateOfCE) {
      bridgeTopic = candidate;
    }
  }

  // Find the best CSI verb to use (prefer action verbs)
  const actionVerbs = ['beheren', 'kiezen', 'vergelijken', 'vinden', 'optimaliseren'];
  const bestCsiVerb = csiVerbs.find(v =>
    typeof v === 'string' && actionVerbs.some(av => v.toLowerCase().includes(av))
  ) || csiVerbs[0] || '';

  // === TITLE GENERATION FOLLOWING SEMANTIC SEO RULES ===

  // Pattern 1: CE + Bridge Topic + Cluster Term (when all available)
  // Example: "MVGM VVE Beheer Diensten" or "MVGM Vastgoedbeheer Vergelijking"
  if (centralEntity && bridgeTopic && distinctA.length > 0) {
    // Check CE isn't already in bridge topic
    if (!areSimilarTerms(bridgeTopic, centralEntity)) {
      return truncateTitle(`${centralEntity} ${bridgeTopic}`);
    }
  }

  // Pattern 2: CE + Cluster A + Cluster B connection (entity-first)
  // Example: "MVGM: VVE en Commercieel Beheer"
  if (centralEntity && distinctA.length > 0 && distinctB.length > 0) {
    return truncateTitle(`${centralEntity}: ${distinctA[0]} en ${distinctB[0]}`);
  }

  // Pattern 3: CE + Single Cluster Term (when clusters overlap)
  // Example: "MVGM VVE Beheer Overzicht"
  if (centralEntity && distinctA.length > 0) {
    const suffix = bestCsiVerb ? capitalize(bestCsiVerb) : 'Overzicht';
    return truncateTitle(`${centralEntity} ${distinctA[0]} ${suffix}`);
  }

  // Pattern 4: No CE but distinct terms from both clusters
  // Example: "VVE Beheer en Commercieel Vastgoed"
  if (distinctA.length > 0 && distinctB.length > 0) {
    return truncateTitle(`${distinctA[0]} en ${distinctB[0]}`);
  }

  // Pattern 5: Bridge topic with cluster context
  // Example: "Vastgoedbeheer: Volledige Gids"
  if (bridgeTopic) {
    return truncateTitle(`${bridgeTopic}: Volledige Gids`);
  }

  // Pattern 6: Single distinct term with semantic purpose
  // Example: "VVE Beheer Kernconcepten"
  if (distinctTerms.length > 0) {
    return truncateTitle(`${distinctTerms[0]} Kernconcepten`);
  }

  // Pattern 7: CE-only fallback (still semantically meaningful)
  if (centralEntity) {
    return truncateTitle(`${centralEntity} Verbindende Content`);
  }

  // Last resort - should rarely happen if pillars are defined
  return 'Topical Bridge Content';
}

/**
 * Capitalize first letter of a string
 */
function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Truncate title to max length while keeping semantic meaning
 * Semantic SEO: Titles should be concise but complete
 */
function truncateTitle(title: string, maxLength: number = 60): string {
  if (title.length <= maxLength) return title;

  // Try to break at a word boundary
  const truncated = title.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.7) {
    return truncated.substring(0, lastSpace);
  }

  return truncated;
}

/**
 * Generate description following Semantic SEO Algorithmic Authorship rules:
 *
 * 1. One EAV triple per sentence (Subject-Predicate-Object)
 * 2. Entity-first naming (CE appears first when relevant)
 * 3. Definitive modality ("is", "connects") not hedging ("might", "could")
 * 4. High information density - no filler words
 * 5. Short sentences (15-25 words max)
 */
function generateDescription(
  clusterANames: string[],
  clusterBNames: string[],
  pillars?: SEOPillars
): string {
  const centralEntity = pillars?.centralEntity?.trim();
  const termA = clusterANames[0] || 'onderwerp A';
  const termB = clusterBNames[0] || 'onderwerp B';

  const sentences: string[] = [];

  // Sentence 1: CE-first entity definition (EAV: CE -> has_bridge -> Topics)
  if (centralEntity) {
    sentences.push(
      `${centralEntity} omvat zowel ${termA} als ${termB}.`
    );
  } else {
    sentences.push(
      `Dit onderwerp verbindt ${termA} met ${termB}.`
    );
  }

  // Sentence 2: Bridge function (EAV: Article -> function -> internal_linking)
  sentences.push(
    `Het artikel versterkt de interne linkstructuur tussen deze clusters.`
  );

  // Sentence 3: Authority benefit (EAV: Content -> builds -> topical_authority)
  if (centralEntity) {
    sentences.push(
      `De content bouwt topical authority voor ${centralEntity}.`
    );
  } else {
    sentences.push(
      `De content demonstreert domeinexpertise.`
    );
  }

  // Sentence 4: Semantic SEO benefit (EAV: Strategy -> reduces -> cost_of_retrieval)
  sentences.push(
    `Dit verlaagt de Cost of Retrieval voor zoekmachines.`
  );

  return sentences.join(' ');
}

/**
 * Generate SEO impact explanation following Semantic SEO principles
 * Uses specific numbers and definitive language
 */
function generateSeoImpact(
  clusterANames: string[],
  clusterBNames: string[],
  entityCount: number,
  pillars?: SEOPillars
): string {
  const centralEntity = pillars?.centralEntity?.trim();
  const termA = clusterANames[0] || 'cluster A';
  const termB = clusterBNames[0] || 'cluster B';

  // Entity-first, specific values, definitive modality
  if (centralEntity) {
    return `${centralEntity}: verbindt ${entityCount} entiteiten. Koppelt ${termA} aan ${termB}. Verhoogt topical authority.`;
  }

  return `Verbindt ${entityCount} entiteiten. Koppelt ${termA} aan ${termB}. Versterkt domeinrelevantie.`;
}

interface ScoredOpportunity {
  suggestion: BridgeTopicSuggestion;
  score: number;
  impactLevel: 'critical' | 'high' | 'medium';
  existingBridge?: EnrichedTopic;
  suggestedLinks?: SuggestedInternalLink[];
}

/**
 * Auto-generate internal link suggestions for an existing bridge topic
 * This is the SMART part - AI generates specific links with context
 */
function generateLinkSuggestions(
  bridgeTopic: EnrichedTopic,
  clusterANames: string[],
  clusterBNames: string[],
  allTopics: EnrichedTopic[],
  eavs: SemanticTriple[]
): SuggestedInternalLink[] {
  const suggestions: SuggestedInternalLink[] = [];
  const bridgeTitle = bridgeTopic.title?.toLowerCase() || '';

  // Find topics that match each cluster
  for (const topic of allTopics) {
    if (topic.id === bridgeTopic.id) continue;
    if (!topic.title) continue;

    const topicTitleLower = topic.title.toLowerCase();

    // Check cluster A matches
    const matchesA = clusterANames.some(name => {
      const nameLower = name.toLowerCase();
      return topicTitleLower.includes(nameLower) || nameLower.includes(topicTitleLower.split(':')[0]);
    });

    // Check cluster B matches
    const matchesB = clusterBNames.some(name => {
      const nameLower = name.toLowerCase();
      return topicTitleLower.includes(nameLower) || nameLower.includes(topicTitleLower.split(':')[0]);
    });

    if (!matchesA && !matchesB) continue;

    // Generate intelligent anchor text based on EAVs
    let anchorText = topic.title;
    let reasoning = '';

    // Find relevant EAV for this topic
    const relevantEav = eavs.find(eav => {
      if (!eav.entity || !eav.attribute) return false;
      const entityLower = eav.entity.toLowerCase();
      const attrLower = eav.attribute.toLowerCase();
      return topicTitleLower.includes(entityLower) || topicTitleLower.includes(attrLower);
    });

    if (relevantEav) {
      // Create semantic anchor text from EAV
      anchorText = `${relevantEav.entity} ${relevantEav.attribute}`.trim();
      reasoning = `Links via ${relevantEav.category} attribute "${relevantEav.attribute}" - strengthens semantic relationship`;
    } else {
      // Fallback reasoning based on topic relationship
      if (matchesA) {
        reasoning = `Connects to ${clusterANames[0]} cluster - expands topical coverage`;
      } else {
        reasoning = `Connects to ${clusterBNames[0]} cluster - bridges content gaps`;
      }
    }

    // Ensure anchor text is not too long
    if (anchorText.length > 50) {
      anchorText = topic.title.split(':')[0].trim() || topic.title.substring(0, 45) + '...';
    }

    suggestions.push({
      targetTopicId: topic.id,
      targetTopicTitle: topic.title,
      anchorText,
      reasoning,
      cluster: matchesA ? 'A' : 'B',
      approved: true, // Default to approved - user can reject
    });
  }

  // Sort by cluster to show balanced distribution
  suggestions.sort((a, b) => {
    if (a.cluster !== b.cluster) return a.cluster === 'A' ? -1 : 1;
    return 0;
  });

  // Limit to reasonable number (3 from each cluster max)
  const clusterALinks = suggestions.filter(s => s.cluster === 'A').slice(0, 3);
  const clusterBLinks = suggestions.filter(s => s.cluster === 'B').slice(0, 3);

  return [...clusterALinks, ...clusterBLinks];
}

/**
 * Analyze and score bridging opportunities
 */
function analyzeOpportunities(
  holes: StructuralHole[],
  eavs: SemanticTriple[],
  topics: EnrichedTopic[],
  pillars?: SEOPillars
): ScoredOpportunity | null {
  if (holes.length === 0) return null;

  const scored: ScoredOpportunity[] = [];
  const seenTitles = new Set<string>();

  for (const hole of holes) {
    const clusterA = (hole.clusterA || []).filter(Boolean);
    const clusterB = (hole.clusterB || []).filter(Boolean);
    const bridgeCandidates = (hole.bridgeCandidates || []).filter(Boolean);

    if (clusterA.length === 0 || clusterB.length === 0) continue;

    // Human-readable names
    const clusterANames = clusterA.map(humanizeNodeId).filter(Boolean);
    const clusterBNames = clusterB.map(humanizeNodeId).filter(Boolean);

    // Generate title
    const title = generateBridgeTitle(clusterA, clusterB, bridgeCandidates, pillars);

    // Deduplicate by title
    if (seenTitles.has(title.toLowerCase())) continue;
    seenTitles.add(title.toLowerCase());

    // Check if existing topic could bridge
    const existingBridge = topics.find(topic => {
      if (!topic.title) return false;
      const titleLower = topic.title.toLowerCase();
      return clusterANames.some(n => titleLower.includes(n.toLowerCase())) &&
             clusterBNames.some(n => titleLower.includes(n.toLowerCase()));
    });

    // Generate link suggestions if existing bridge found
    let suggestedLinks: SuggestedInternalLink[] | undefined;
    if (existingBridge) {
      suggestedLinks = generateLinkSuggestions(
        existingBridge,
        clusterANames,
        clusterBNames,
        topics,
        eavs
      );
    }

    // Calculate score
    let score = 0;

    // Priority score
    if (hole.priority === 'critical') score += 40;
    else if (hole.priority === 'high') score += 30;
    else if (hole.priority === 'medium') score += 20;
    else score += 10;

    // EAV importance
    const clusterEntities = [...clusterA, ...clusterB];
    eavs.forEach(eav => {
      if (!eav.entity) return;
      const eavLower = eav.entity.toLowerCase();
      if (clusterEntities.some(e => humanizeNodeId(e).toLowerCase().includes(eavLower))) {
        score += (CATEGORY_WEIGHTS[eav.category] || 0.2) * 5;
      }
    });

    // CSI alignment
    if (pillars?.centralSearchIntent && Array.isArray(pillars.centralSearchIntent)) {
      const csiRelevant = pillars.centralSearchIntent.some(intent => {
        if (!intent) return false;
        const intentLower = intent.toLowerCase();
        return clusterANames.some(n => n.toLowerCase().includes(intentLower)) ||
               clusterBNames.some(n => n.toLowerCase().includes(intentLower));
      });
      if (csiRelevant) score += 15;
    }

    // Find best parent
    const { parentTopic, reason: placementReason } = findBestParent(clusterA, clusterB, topics);

    // Create suggestion
    const suggestion: BridgeTopicSuggestion = {
      title,
      description: generateDescription(clusterANames, clusterBNames, pillars),
      placement: {
        type: parentTopic ? 'outer' : 'outer',
        parentTopicId: parentTopic?.id,
        parentTopicTitle: parentTopic?.title,
      },
      reasoning: placementReason,
      seoImpact: generateSeoImpact(clusterANames, clusterBNames, clusterA.length + clusterB.length, pillars),
      clustersConnected: {
        clusterA: clusterANames,
        clusterB: clusterBNames,
      },
    };

    const impactLevel: 'critical' | 'high' | 'medium' =
      score >= 50 ? 'critical' : score >= 30 ? 'high' : 'medium';

    scored.push({
      suggestion,
      score,
      impactLevel,
      existingBridge,
      suggestedLinks,
    });
  }

  // Return only the BEST opportunity
  if (scored.length === 0) return null;
  scored.sort((a, b) => b.score - a.score);
  return scored[0];
}

const BridgingOpportunitiesPanel: React.FC<BridgingOpportunitiesPanelProps> = ({
  knowledgeGraph,
  eavs,
  pillars,
  topics,
  onSelectTopic,
  onCreateBridgeTopic,
  onAddLinks,
}) => {
  // State for managing link approvals
  const [linkApprovals, setLinkApprovals] = useState<Record<string, boolean>>({});
  const [isAddingLinks, setIsAddingLinks] = useState(false);

  // Analyze and get the SINGLE BEST opportunity
  const opportunity = useMemo(() => {
    if (!knowledgeGraph) return null;

    try {
      const holes = knowledgeGraph.identifyStructuralHoles(0.15);
      return analyzeOpportunities(holes, eavs, topics, pillars);
    } catch (err) {
      console.error('Failed to analyze bridging opportunities:', err);
      return null;
    }
  }, [knowledgeGraph, eavs, topics, pillars]);

  // Initialize link approvals when suggestions change
  React.useEffect(() => {
    if (opportunity?.suggestedLinks) {
      const initial: Record<string, boolean> = {};
      opportunity.suggestedLinks.forEach(link => {
        initial[link.targetTopicId] = true; // Default to approved
      });
      setLinkApprovals(initial);
    }
  }, [opportunity?.suggestedLinks]);

  // Toggle link approval
  const toggleLinkApproval = (topicId: string) => {
    setLinkApprovals(prev => ({
      ...prev,
      [topicId]: !prev[topicId],
    }));
  };

  // Handle adding approved links
  const handleAddLinks = () => {
    if (!opportunity?.existingBridge || !opportunity.suggestedLinks || !onAddLinks) return;

    setIsAddingLinks(true);

    // Convert approved suggestions to ContextualBridgeLink format
    const approvedLinks: ContextualBridgeLink[] = opportunity.suggestedLinks
      .filter(link => linkApprovals[link.targetTopicId])
      .map(link => ({
        targetTopic: link.targetTopicTitle,
        anchorText: link.anchorText,
        annotation_text_hint: link.reasoning,
        reasoning: link.reasoning,
      }));

    onAddLinks(opportunity.existingBridge.id, approvedLinks);
    setIsAddingLinks(false);
  };

  // Count approved links
  const approvedCount = opportunity?.suggestedLinks?.filter(
    link => linkApprovals[link.targetTopicId]
  ).length || 0;

  if (!knowledgeGraph) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p className="text-sm">Add EAVs to detect content gaps</p>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="text-center py-4">
        <svg className="w-6 h-6 mx-auto mb-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-green-400">No content gaps detected</p>
        <p className="text-xs text-gray-500 mt-1">Your topic clusters are well connected</p>
      </div>
    );
  }

  const { suggestion, impactLevel, existingBridge } = opportunity;

  const impactColors = {
    critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', badge: 'bg-red-500' },
    high: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', badge: 'bg-orange-500' },
    medium: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', badge: 'bg-yellow-500' },
  };
  const colors = impactColors[impactLevel];

  return (
    <div className="space-y-3">
      {/* If existing bridge exists, show auto-generated links */}
      {existingBridge ? (
        <div className="p-3 rounded-lg border bg-green-500/10 border-green-500/30">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-green-400">Bridge Topic Ready</span>
          </div>
          <p className="text-sm text-gray-300 mb-3">
            <span className="text-white font-medium">"{existingBridge.title}"</span> bridges these clusters.
          </p>

          {/* Auto-generated internal links */}
          {opportunity.suggestedLinks && opportunity.suggestedLinks.length > 0 ? (
            <div className="space-y-2 mb-3">
              <p className="text-xs text-gray-400 font-medium">
                Suggested Internal Links ({approvedCount}/{opportunity.suggestedLinks.length} approved):
              </p>

              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {opportunity.suggestedLinks.map((link) => (
                  <div
                    key={link.targetTopicId}
                    className={`p-2 rounded border transition-colors cursor-pointer ${
                      linkApprovals[link.targetTopicId]
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-gray-800/50 border-gray-700/50 opacity-60'
                    }`}
                    onClick={() => toggleLinkApproval(link.targetTopicId)}
                  >
                    <div className="flex items-start gap-2">
                      {/* Checkbox */}
                      <div className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center flex-shrink-0 ${
                        linkApprovals[link.targetTopicId]
                          ? 'bg-emerald-500 border-emerald-500'
                          : 'border-gray-500'
                      }`}>
                        {linkApprovals[link.targetTopicId] && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Link target */}
                        <p className="text-xs text-white truncate" title={link.targetTopicTitle}>
                          → {link.targetTopicTitle}
                        </p>
                        {/* Anchor text */}
                        <p className="text-xs text-blue-400">
                          Anchor: "<span className="italic">{link.anchorText}</span>"
                        </p>
                        {/* Reasoning */}
                        <p className="text-xs text-gray-500 mt-0.5">
                          {link.reasoning}
                        </p>
                      </div>

                      {/* Cluster badge */}
                      <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                        link.cluster === 'A'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-purple-500/20 text-purple-400'
                      }`}>
                        {link.cluster}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mt-3">
                {onAddLinks && approvedCount > 0 && (
                  <Button
                    onClick={handleAddLinks}
                    variant="primary"
                    size="sm"
                    disabled={isAddingLinks}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    {isAddingLinks ? (
                      'Adding...'
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        Add {approvedCount} Links
                      </>
                    )}
                  </Button>
                )}
                {onSelectTopic && (
                  <Button
                    onClick={() => onSelectTopic(existingBridge.id)}
                    variant="secondary"
                    size="sm"
                    className="text-xs"
                  >
                    View Topic
                  </Button>
                )}
              </div>
            </div>
          ) : (
            /* No suggestions available - fallback to manual */
            <div className="flex gap-2">
              {onSelectTopic && (
                <Button
                  onClick={() => onSelectTopic(existingBridge.id)}
                  variant="secondary"
                  size="sm"
                  className="text-xs"
                >
                  View & Add Links Manually
                </Button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Show the recommendation */
        <div className={`p-4 rounded-lg border ${colors.bg} ${colors.border}`}>
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${colors.badge}`} />
              <span className={`text-xs font-medium uppercase ${colors.text}`}>
                {impactLevel} priority gap
              </span>
            </div>
          </div>

          {/* Suggested Title */}
          <h4 className="text-white font-medium mb-2">{suggestion.title}</h4>

          {/* Clusters being connected */}
          <p className="text-sm text-gray-400 mb-3">
            Verbindt{' '}
            <span className="text-blue-400">{suggestion.clustersConnected.clusterA.slice(0, 2).join(', ')}</span>
            {' '}met{' '}
            <span className="text-purple-400">{suggestion.clustersConnected.clusterB.slice(0, 2).join(', ')}</span>
          </p>

          {/* Placement recommendation */}
          <div className="bg-gray-800/50 rounded p-2 mb-3">
            <p className="text-xs text-gray-400">
              <span className="text-gray-500">Plaatsing:</span> {suggestion.reasoning}
            </p>
          </div>

          {/* SEO Impact */}
          <p className="text-xs text-gray-500 mb-3">
            <span className="text-emerald-400">SEO Impact:</span> {suggestion.seoImpact}
          </p>

          {/* Action */}
          {onCreateBridgeTopic && (
            <Button
              onClick={() => onCreateBridgeTopic(suggestion)}
              variant="primary"
              size="sm"
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Bridge Topic
            </Button>
          )}
        </div>
      )}

      {/* Help text */}
      <p className="text-xs text-gray-500">
        Bridge topics connect isolated content clusters, improving internal linking and demonstrating comprehensive expertise.
      </p>
    </div>
  );
};

export default BridgingOpportunitiesPanel;
