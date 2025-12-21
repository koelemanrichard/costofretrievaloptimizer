// services/ai/unifiedAudit.ts
// Unified Audit Engine - Phase 6
// Runs all audit checks across categories and returns consolidated results

import { v4 as uuidv4 } from 'uuid';
import {
  EnrichedTopic,
  ContentBrief,
  FoundationPage,
  NavigationStructure,
  UnifiedAuditResult,
  UnifiedAuditIssue,
  AuditCategoryResult,
  AuditSeverity,
  SemanticTriple,
} from '../../types';
import {
  AUDIT_CATEGORIES,
  SEVERITY_PENALTIES,
  calculateCategoryScore,
  calculateOverallScore,
  isAutoFixable,
  getFixInfo,
} from '../../config/auditRules';
import { buildLinkGraph, getLinksFromBridge } from './linkingAudit';
import { GENERIC_ANCHORS } from '../../config/linkingRules';

// =============================================================================
// CONTEXT TYPE
// =============================================================================
export interface UnifiedAuditContext {
  mapId: string;
  topics: EnrichedTopic[];
  briefs: Record<string, ContentBrief>;
  foundationPages: FoundationPage[];
  navigation: NavigationStructure | null;
  eavs: SemanticTriple[];
  pillars: { id: string; name: string }[];
}

// =============================================================================
// PROGRESS TRACKING
// =============================================================================
export interface AuditProgress {
  phase: 'preparing' | 'checking' | 'calculating' | 'complete';
  currentCategory?: string;
  categoryIndex: number;
  totalCategories: number;
  percentComplete: number;
  issuesFound: number;
}

export type AuditProgressCallback = (progress: AuditProgress) => void;

// =============================================================================
// AUDIT RUNNER
// =============================================================================

/**
 * Run the unified audit across all categories
 */
export const runUnifiedAudit = async (
  context: UnifiedAuditContext,
  userId?: string,
  onProgress?: AuditProgressCallback
): Promise<UnifiedAuditResult> => {
  const categoryResults: AuditCategoryResult[] = [];
  const totalCategories = AUDIT_CATEGORIES.length;
  let totalIssuesFound = 0;

  // Emit initial progress
  onProgress?.({
    phase: 'preparing',
    categoryIndex: 0,
    totalCategories,
    percentComplete: 0,
    issuesFound: 0,
  });

  // Run each category's checks
  for (let i = 0; i < AUDIT_CATEGORIES.length; i++) {
    const category = AUDIT_CATEGORIES[i];

    // Emit progress for this category
    onProgress?.({
      phase: 'checking',
      currentCategory: category.name,
      categoryIndex: i,
      totalCategories,
      percentComplete: Math.round((i / totalCategories) * 90),
      issuesFound: totalIssuesFound,
    });

    const issues = await runCategoryChecks(category.id, context);
    totalIssuesFound += issues.length;

    const score = calculateCategoryScore(issues);
    const autoFixableCount = issues.filter(i => i.autoFixable).length;

    categoryResults.push({
      categoryId: category.id,
      categoryName: category.name,
      score,
      weight: category.weight,
      issueCount: issues.length,
      autoFixableCount,
      issues,
    });
  }

  // Emit calculating progress
  onProgress?.({
    phase: 'calculating',
    categoryIndex: totalCategories,
    totalCategories,
    percentComplete: 95,
    issuesFound: totalIssuesFound,
  });

  // Calculate totals
  const allIssues = categoryResults.flatMap(c => c.issues);
  const overallScore = calculateOverallScore(categoryResults);

  const result: UnifiedAuditResult = {
    id: uuidv4(),
    map_id: context.mapId,
    overallScore,
    categories: categoryResults,
    totalIssues: allIssues.length,
    criticalCount: allIssues.filter(i => i.severity === 'critical').length,
    warningCount: allIssues.filter(i => i.severity === 'warning').length,
    suggestionCount: allIssues.filter(i => i.severity === 'suggestion').length,
    autoFixableCount: allIssues.filter(i => i.autoFixable).length,
    runAt: new Date().toISOString(),
    runBy: userId,
  };

  // Emit complete progress
  onProgress?.({
    phase: 'complete',
    categoryIndex: totalCategories,
    totalCategories,
    percentComplete: 100,
    issuesFound: totalIssuesFound,
  });

  return result;
};

// =============================================================================
// CATEGORY CHECK ROUTER
// =============================================================================

const runCategoryChecks = async (
  categoryId: string,
  context: UnifiedAuditContext
): Promise<UnifiedAuditIssue[]> => {
  switch (categoryId) {
    case 'content-completeness':
      return checkContentCompleteness(context);
    case 'hierarchy-structure':
      return checkHierarchyStructure(context);
    case 'internal-linking':
      return checkInternalLinking(context);
    case 'navigation-structure':
      return checkNavigationStructure(context);
    case 'semantic-consistency':
      return checkSemanticConsistency(context);
    case 'foundation-pages':
      return checkFoundationPages(context);
    default:
      return [];
  }
};

// =============================================================================
// CONTENT COMPLETENESS CHECKS
// =============================================================================

const checkContentCompleteness = (context: UnifiedAuditContext): UnifiedAuditIssue[] => {
  const issues: UnifiedAuditIssue[] = [];
  const { topics, briefs } = context;

  // Check for topics without briefs
  const topicsWithoutBriefs = topics.filter(t => !briefs[t.id]);
  if (topicsWithoutBriefs.length > 0) {
    issues.push(createIssue(
      'content-no-briefs',
      'Topics without content briefs',
      'content-completeness',
      'warning',
      `${topicsWithoutBriefs.length} topics have no content brief generated`,
      topicsWithoutBriefs.map(t => t.title),
      false,
      'Generate content briefs for these topics'
    ));
  }

  // Check for briefs with empty headings
  const briefsWithoutHeadings = Object.values(briefs).filter(brief => {
    const outline = brief.structured_outline || brief.outline;
    if (!outline) return true;
    if (Array.isArray(outline)) return outline.length === 0;
    if (typeof outline === 'object' && outline !== null) {
      const structuredOutline = outline as { h2_sections?: unknown[] };
      return !structuredOutline.h2_sections || structuredOutline.h2_sections.length === 0;
    }
    return true;
  });
  if (briefsWithoutHeadings.length > 0) {
    issues.push(createIssue(
      'content-empty-headings',
      'Content briefs with empty headings',
      'content-completeness',
      'warning',
      `${briefsWithoutHeadings.length} briefs have no H2 headings defined`,
      briefsWithoutHeadings.map(b => topics.find(t => t.id === b.topic_id)?.title || b.topic_id),
      false,
      'Add H2 section headings to structure the content'
    ));
  }

  // Check for missing SERP analysis
  const briefsWithoutSerp = Object.values(briefs).filter(brief => {
    const serp = brief.serpAnalysis;
    return !serp || (typeof serp === 'object' && Object.keys(serp).length === 0);
  });
  if (briefsWithoutSerp.length > 0) {
    issues.push(createIssue(
      'content-missing-serp',
      'Missing SERP analysis',
      'content-completeness',
      'suggestion',
      `${briefsWithoutSerp.length} briefs lack SERP competitive analysis`,
      briefsWithoutSerp.map(b => topics.find(t => t.id === b.topic_id)?.title || b.topic_id),
      false,
      'Run SERP analysis for competitive insights'
    ));
  }

  // Check for missing canonical query (target keyword)
  const topicsWithoutKeywords = topics.filter(t => !t.canonical_query && (!t.query_network || t.query_network.length === 0));
  if (topicsWithoutKeywords.length > 0) {
    issues.push(createIssue(
      'content-no-target-keywords',
      'No target keywords defined',
      'content-completeness',
      'warning',
      `${topicsWithoutKeywords.length} topics have no canonical query or query network`,
      topicsWithoutKeywords.map(t => t.title),
      false,
      'Define canonical query and query network for each topic'
    ));
  }

  // Check for missing topic class (content type intent)
  const topicsWithoutIntent = topics.filter(t => !t.topic_class && !t.query_type);
  if (topicsWithoutIntent.length > 0) {
    issues.push(createIssue(
      'content-missing-intent',
      'Search intent not specified',
      'content-completeness',
      'suggestion',
      `${topicsWithoutIntent.length} topics lack topic class or query type`,
      topicsWithoutIntent.map(t => t.title),
      true,
      'Classify as monetization/informational or specify query type'
    ));
  }

  return issues;
};

// =============================================================================
// HIERARCHY STRUCTURE CHECKS
// =============================================================================

const checkHierarchyStructure = (context: UnifiedAuditContext): UnifiedAuditIssue[] => {
  const issues: UnifiedAuditIssue[] = [];
  const { topics, pillars } = context;

  // Check for missing pillars
  if (pillars.length === 0) {
    issues.push(createIssue(
      'hierarchy-missing-pillars',
      'No pillar pages defined',
      'hierarchy-structure',
      'critical',
      'No pillars defined - topical map needs at least one pillar',
      [],
      true,
      'Create pillar pages to anchor your topical structure'
    ));
  }

  // Check for orphaned topics (no parent and not a core topic)
  const orphanedTopics = topics.filter(t =>
    !t.parent_topic_id &&
    t.type !== 'core' &&
    !pillars.some(p => p.id === t.id)
  );
  if (orphanedTopics.length > 0) {
    issues.push(createIssue(
      'hierarchy-orphan-topics',
      'Orphaned topics (no parent)',
      'hierarchy-structure',
      'critical',
      `${orphanedTopics.length} topics have no parent and aren't pillars`,
      orphanedTopics.map(t => t.title),
      true,
      'Assign these topics to appropriate parent pillars'
    ));
  }

  // Check for child topics with wrong parent type (should have outer parent, not core)
  const childTopicsWithWrongParent = topics.filter(t => {
    if (t.type !== 'child' || !t.parent_topic_id) return false;
    const parent = topics.find(p => p.id === t.parent_topic_id);
    return parent && parent.type !== 'outer';
  });
  if (childTopicsWithWrongParent.length > 0) {
    issues.push(createIssue(
      'hierarchy-child-wrong-parent',
      'Child topics with invalid parent',
      'hierarchy-structure',
      'warning',
      `${childTopicsWithWrongParent.length} child topics have non-outer parents`,
      childTopicsWithWrongParent.map(t => t.title),
      true,
      'Child topics should be placed under outer topics, not core topics'
    ));
  }

  // Check for excessive nesting depth
  const getDepth = (topicId: string, visited: Set<string> = new Set()): number => {
    if (visited.has(topicId)) return 0; // Circular reference protection
    visited.add(topicId);
    const topic = topics.find(t => t.id === topicId);
    if (!topic || !topic.parent_topic_id) return 0;
    return 1 + getDepth(topic.parent_topic_id, visited);
  };

  const deepTopics = topics.filter(t => getDepth(t.id) > 3);
  if (deepTopics.length > 0) {
    issues.push(createIssue(
      'hierarchy-deep-nesting',
      'Excessive topic depth',
      'hierarchy-structure',
      'warning',
      `${deepTopics.length} topics are nested more than 3 levels deep`,
      deepTopics.map(t => t.title),
      false,
      'Consider flattening the hierarchy for better navigation'
    ));
  }

  // Check for pillar imbalance
  if (pillars.length > 1) {
    const pillarChildCounts = pillars.map(p => ({
      name: p.name,
      count: topics.filter(t => t.parent_topic_id === p.id).length,
    }));
    const maxCount = Math.max(...pillarChildCounts.map(p => p.count));
    const minCount = Math.min(...pillarChildCounts.map(p => p.count));

    if (maxCount > 0 && minCount > 0 && maxCount / minCount > 3) {
      issues.push(createIssue(
        'hierarchy-pillar-imbalance',
        'Unbalanced pillar content',
        'hierarchy-structure',
        'suggestion',
        'Significant imbalance in content distribution across pillars',
        pillarChildCounts.map(p => `${p.name}: ${p.count} topics`),
        false,
        'Consider redistributing content for balanced coverage'
      ));
    }
  }

  // Check for circular references
  const checkCircular = (topicId: string, ancestors: Set<string>): boolean => {
    if (ancestors.has(topicId)) return true;
    ancestors.add(topicId);
    const children = topics.filter(t => t.parent_topic_id === topicId);
    return children.some(child => checkCircular(child.id, new Set(ancestors)));
  };

  const circularTopics = topics.filter(t => {
    const visited = new Set<string>();
    let current = t;
    while (current.parent_topic_id) {
      if (visited.has(current.parent_topic_id)) return true;
      visited.add(current.id);
      const parent = topics.find(p => p.id === current.parent_topic_id);
      if (!parent) break;
      current = parent;
    }
    return false;
  });

  if (circularTopics.length > 0) {
    issues.push(createIssue(
      'hierarchy-circular-reference',
      'Circular parent-child references',
      'hierarchy-structure',
      'critical',
      'Circular references detected in topic hierarchy',
      circularTopics.map(t => t.title),
      true,
      'Fix parent-child relationships to remove cycles'
    ));
  }

  return issues;
};

// =============================================================================
// INTERNAL LINKING CHECKS
// =============================================================================

const checkInternalLinking = (context: UnifiedAuditContext): UnifiedAuditIssue[] => {
  const issues: UnifiedAuditIssue[] = [];
  const { topics, briefs } = context;

  // Build link graph
  const { incomingLinks, outgoingLinks } = buildLinkGraph(topics, briefs);

  // Check for orphan pages (no incoming links)
  const orphanPages = topics.filter(t =>
    !incomingLinks[t.id] || incomingLinks[t.id].length === 0
  );
  if (orphanPages.length > 0) {
    issues.push(createIssue(
      'linking-orphan-pages',
      'Pages with no internal links',
      'internal-linking',
      'critical',
      `${orphanPages.length} pages have no internal links pointing to them`,
      orphanPages.map(t => t.title),
      false,
      'Add internal links to these pages from related content'
    ));
  }

  // Check for generic anchor text
  const genericAnchors: { topic: string; anchor: string }[] = [];
  for (const brief of Object.values(briefs)) {
    const links = getLinksFromBridge(brief.contextualBridge);
    for (const link of links) {
      if (GENERIC_ANCHORS.some(ga =>
        link.anchorText.toLowerCase().includes(ga.toLowerCase())
      )) {
        const topic = topics.find(t => t.id === brief.topic_id);
        genericAnchors.push({
          topic: topic?.title || 'Unknown',
          anchor: link.anchorText
        });
      }
    }
  }
  if (genericAnchors.length > 0) {
    issues.push(createIssue(
      'linking-generic-anchors',
      'Generic anchor text usage',
      'internal-linking',
      'warning',
      `${genericAnchors.length} links use generic anchor text`,
      genericAnchors.map(a => `"${a.anchor}" in ${a.topic}`),
      true,
      'Replace with descriptive anchor text containing keywords'
    ));
  }

  // Check for excessive links per page
  const excessiveLinks = topics.filter(t =>
    outgoingLinks[t.id] && outgoingLinks[t.id].length > 150
  );
  if (excessiveLinks.length > 0) {
    issues.push(createIssue(
      'linking-excessive-links',
      'Too many links per page',
      'internal-linking',
      'warning',
      `${excessiveLinks.length} pages have more than 150 internal links`,
      excessiveLinks.map(t => `${t.title}: ${outgoingLinks[t.id].length} links`),
      false,
      'Reduce link count to maintain link equity distribution'
    ));
  }

  // Check for anchor text repetition
  const anchorCounts: Record<string, Record<string, number>> = {};
  for (const [sourceId, links] of Object.entries(outgoingLinks)) {
    for (const link of links) {
      const key = `${link.targetId}-${link.anchor.toLowerCase()}`;
      anchorCounts[sourceId] = anchorCounts[sourceId] || {};
      anchorCounts[sourceId][key] = (anchorCounts[sourceId][key] || 0) + 1;
    }
  }

  const repeatedAnchors: string[] = [];
  for (const [sourceId, counts] of Object.entries(anchorCounts)) {
    for (const [key, count] of Object.entries(counts)) {
      if (count > 3) {
        const topic = topics.find(t => t.id === sourceId);
        repeatedAnchors.push(`${topic?.title || 'Unknown'}: same anchor used ${count}x`);
      }
    }
  }
  if (repeatedAnchors.length > 0) {
    issues.push(createIssue(
      'linking-anchor-repetition',
      'Same anchor text used excessively',
      'internal-linking',
      'warning',
      'Same anchor text used more than 3 times for one target',
      repeatedAnchors,
      false,
      'Vary anchor text for the same target URL'
    ));
  }

  return issues;
};

// =============================================================================
// NAVIGATION STRUCTURE CHECKS
// =============================================================================

const checkNavigationStructure = (context: UnifiedAuditContext): UnifiedAuditIssue[] => {
  const issues: UnifiedAuditIssue[] = [];
  const { navigation } = context;

  // Check for missing header navigation
  if (!navigation || !navigation.header || !navigation.header.primary_nav ||
      navigation.header.primary_nav.length === 0) {
    issues.push(createIssue(
      'nav-missing-header',
      'Header navigation not defined',
      'navigation-structure',
      'critical',
      'No header navigation items configured',
      [],
      true,
      'Add primary navigation items in the Navigation Designer'
    ));
  }

  // Check for missing footer navigation
  if (!navigation || !navigation.footer || !navigation.footer.sections ||
      navigation.footer.sections.length === 0) {
    issues.push(createIssue(
      'nav-missing-footer',
      'Footer navigation not defined',
      'navigation-structure',
      'warning',
      'No footer navigation sections configured',
      [],
      true,
      'Add footer sections with navigation links'
    ));
  }

  if (navigation) {
    // Check for excessive header items
    const headerCount = navigation.header?.primary_nav?.length || 0;
    if (headerCount > 10) {
      issues.push(createIssue(
        'nav-excessive-header-items',
        'Too many header navigation items',
        'navigation-structure',
        'warning',
        `Header has ${headerCount} items (recommended max: 10)`,
        navigation.header?.primary_nav?.map(n => n.text) || [],
        false,
        'Consolidate or move less critical items to footer'
      ));
    }

    // Check for missing E-A-T footer links
    const footerLinks = navigation.footer?.legal_links || [];
    const footerLabels = footerLinks.map(l => l.text.toLowerCase());
    const requiredLinks = ['about', 'privacy', 'contact'];
    const missingEatLinks = requiredLinks.filter(req =>
      !footerLabels.some(text => text.includes(req))
    );

    if (missingEatLinks.length > 0) {
      issues.push(createIssue(
        'nav-missing-eat-links',
        'Missing E-A-T footer links',
        'navigation-structure',
        'warning',
        `Missing required footer links for E-A-T: ${missingEatLinks.join(', ')}`,
        missingEatLinks,
        true,
        'Add About, Privacy Policy, and Contact links to footer'
      ));
    }

    // Check for duplicate anchors between header and footer
    if (navigation.header?.primary_nav && navigation.footer?.sections) {
      const headerTexts = new Set(navigation.header.primary_nav.map(n => n.text.toLowerCase()));
      const footerDupes: string[] = [];

      for (const section of navigation.footer.sections) {
        for (const link of section.links || []) {
          if (headerTexts.has(link.text.toLowerCase())) {
            footerDupes.push(link.text);
          }
        }
      }

      if (footerDupes.length > 0) {
        issues.push(createIssue(
          'nav-duplicate-anchors',
          'Duplicate anchor text in header/footer',
          'navigation-structure',
          'suggestion',
          'Same anchor text used in both header and footer navigation',
          footerDupes,
          false,
          'Use different anchor text variations for better SEO'
        ));
      }
    }
  }

  return issues;
};

// =============================================================================
// SEMANTIC CONSISTENCY CHECKS
// =============================================================================

const checkSemanticConsistency = (context: UnifiedAuditContext): UnifiedAuditIssue[] => {
  const issues: UnifiedAuditIssue[] = [];
  const { eavs, topics } = context;

  // Check for missing EAVs
  if (!eavs || eavs.length === 0) {
    issues.push(createIssue(
      'semantic-missing-eavs',
      'No EAV triples defined',
      'semantic-consistency',
      'warning',
      'No Entity-Attribute-Value semantic triples defined for this map',
      [],
      false,
      'Use the EAV Discovery wizard to define semantic relationships'
    ));
    return issues; // No point checking other semantic issues without EAVs
  }

  // Check for inconsistent entity naming
  const entityVariations: Record<string, string[]> = {};
  for (const eav of eavs) {
    const entityLabel = eav.subject?.label || '';
    const normalized = entityLabel.toLowerCase().trim();
    if (!entityVariations[normalized]) {
      entityVariations[normalized] = [];
    }
    if (!entityVariations[normalized].includes(entityLabel)) {
      entityVariations[normalized].push(entityLabel);
    }
  }

  const inconsistentEntities = Object.entries(entityVariations)
    .filter(([, variations]) => variations.length > 1)
    .map(([, variations]) => variations.join(' / '));

  if (inconsistentEntities.length > 0) {
    issues.push(createIssue(
      'semantic-inconsistent-entities',
      'Inconsistent entity naming',
      'semantic-consistency',
      'warning',
      'Same entity appears with different naming variations',
      inconsistentEntities,
      false,
      'Standardize entity names for consistency'
    ));
  }

  // Check for conflicting attribute values
  const attributePairs: Record<string, { values: string[]; sources: string[] }> = {};
  for (const eav of eavs) {
    const entityLabel = eav.subject?.label || '';
    const predicateRelation = eav.predicate?.relation || '';
    const objectValue = String(eav.object?.value || '');
    const key = `${entityLabel.toLowerCase()}::${predicateRelation.toLowerCase()}`;
    if (!attributePairs[key]) {
      attributePairs[key] = { values: [], sources: [] };
    }
    if (!attributePairs[key].values.includes(objectValue)) {
      attributePairs[key].values.push(objectValue);
      attributePairs[key].sources.push(`${entityLabel}.${predicateRelation}`);
    }
  }

  const conflicts = Object.entries(attributePairs)
    .filter(([, data]) => data.values.length > 1)
    .map(([key, data]) => `${key}: ${data.values.join(' vs ')}`);

  if (conflicts.length > 0) {
    issues.push(createIssue(
      'semantic-conflicting-attributes',
      'Conflicting attribute values',
      'semantic-consistency',
      'warning',
      'Same entity-attribute pair has different values',
      conflicts,
      false,
      'Resolve conflicting values for consistency'
    ));
  }

  // Check for EAV density (at least 3 EAVs per topic for good coverage)
  const eavsPerTopic = topics.length > 0 ? eavs.length / topics.length : 0;
  if (eavsPerTopic < 3 && topics.length > 0) {
    issues.push(createIssue(
      'semantic-low-eav-density',
      'Low EAV density per topic',
      'semantic-consistency',
      'suggestion',
      `Average of ${eavsPerTopic.toFixed(1)} EAVs per topic (recommended: 3+)`,
      [`${eavs.length} EAVs across ${topics.length} topics`],
      false,
      'Add more EAV triples to improve semantic coverage per topic'
    ));
  }

  // Check for missing EAV categories (UNIQUE, ROOT, RARE, COMMON)
  const categories = new Set(eavs.map(eav => eav.predicate?.category).filter(Boolean));
  const expectedCategories = ['UNIQUE', 'ROOT', 'RARE', 'COMMON'];
  const missingCategories = expectedCategories.filter(cat => !categories.has(cat as any));

  if (missingCategories.length > 0) {
    issues.push(createIssue(
      'semantic-missing-categories',
      'Missing EAV categories',
      'semantic-consistency',
      'suggestion',
      `Missing ${missingCategories.length} EAV categories for comprehensive authority`,
      missingCategories.map(cat => `Missing: ${cat}`),
      false,
      'Add EAVs with UNIQUE/ROOT/RARE/COMMON categories for topical authority'
    ));
  }

  // Check for predicate diversity (TYPE, COMPONENT, BENEFIT, RISK, PROCESS, SPECIFICATION)
  const classifications = new Set(eavs.map(eav => eav.predicate?.classification).filter(Boolean));
  const expectedClassifications = ['TYPE', 'COMPONENT', 'BENEFIT', 'RISK', 'PROCESS', 'SPECIFICATION'];
  const presentClassifications = expectedClassifications.filter(cls => classifications.has(cls as any));

  if (presentClassifications.length < 3 && eavs.length > 5) {
    issues.push(createIssue(
      'semantic-predicate-diversity',
      'Low predicate diversity',
      'semantic-consistency',
      'suggestion',
      `Only ${presentClassifications.length} predicate classifications used (recommended: 3+ for diverse semantic coverage)`,
      [`Present: ${presentClassifications.join(', ') || 'None'}`],
      false,
      'Use diverse predicate types: TYPE, COMPONENT, BENEFIT, RISK, PROCESS, SPECIFICATION'
    ));
  }

  return issues;
};

// =============================================================================
// FOUNDATION PAGES CHECKS
// =============================================================================

const checkFoundationPages = (context: UnifiedAuditContext): UnifiedAuditIssue[] => {
  const issues: UnifiedAuditIssue[] = [];
  const { foundationPages } = context;

  const pageTypes = new Set(foundationPages.map(p => p.page_type));

  // Check for missing homepage
  if (!pageTypes.has('homepage')) {
    issues.push(createIssue(
      'foundation-missing-homepage',
      'No homepage defined',
      'foundation-pages',
      'critical',
      'No homepage page found in foundation pages',
      [],
      true,
      'Create a homepage as the central hub for your website'
    ));
  }

  // Check for missing about page
  if (!pageTypes.has('about')) {
    issues.push(createIssue(
      'foundation-missing-about',
      'No about page defined',
      'foundation-pages',
      'warning',
      'No about page found - essential for E-A-T',
      [],
      true,
      'Create an about page to establish expertise and trust'
    ));
  }

  // Check for missing contact page
  if (!pageTypes.has('contact')) {
    issues.push(createIssue(
      'foundation-missing-contact',
      'No contact page defined',
      'foundation-pages',
      'warning',
      'No contact page found',
      [],
      true,
      'Add a contact page for credibility and user trust'
    ));
  }

  // Check for incomplete NAP information
  const contactPage = foundationPages.find(p => p.page_type === 'contact');
  if (contactPage) {
    const nap = contactPage.nap_data;
    if (nap) {
      const missingNap: string[] = [];
      if (!nap.company_name) missingNap.push('Company Name');
      if (!nap.address) missingNap.push('Address');
      if (!nap.phone) missingNap.push('Phone');

      if (missingNap.length > 0) {
        issues.push(createIssue(
          'foundation-incomplete-nap',
          'Incomplete NAP information',
          'foundation-pages',
          'warning',
          `Missing NAP fields: ${missingNap.join(', ')}`,
          missingNap,
          true,
          'Complete Name, Address, Phone information for local SEO'
        ));
      }
    } else {
      issues.push(createIssue(
        'foundation-incomplete-nap',
        'No NAP information',
        'foundation-pages',
        'warning',
        'Contact page has no NAP data configured',
        ['Company Name', 'Address', 'Phone'],
        true,
        'Add Name, Address, Phone information for local SEO'
      ));
    }
  }

  // Note: 'service' and 'product' are not standard FoundationPageTypes
  // This check has been removed as those page types don't exist

  return issues;
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const createIssue = (
  ruleId: string,
  ruleName: string,
  category: string,
  severity: AuditSeverity,
  message: string,
  affectedItems: string[],
  autoFixable: boolean,
  suggestedFix?: string
): UnifiedAuditIssue => {
  const fixInfo = getFixInfo(ruleId);

  return {
    id: uuidv4(),
    ruleId,
    ruleName,
    category,
    severity,
    message,
    affectedItems,
    autoFixable: autoFixable || isAutoFixable(ruleId),
    fixType: fixInfo?.fixType || (autoFixable ? 'manual' : undefined),
    suggestedFix,
  };
};

export default {
  runUnifiedAudit,
};
