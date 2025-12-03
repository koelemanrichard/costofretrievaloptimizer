# Phase D: Site-Wide Architecture Features

**Date:** 2024-12-03
**Status:** PLANNING
**Prerequisite:** Phases A, B, C Complete (20 audit checks implemented)
**Author:** Claude Code

---

## Executive Summary

Phase D implements site-wide analysis features that require cross-article context. These are complex features that analyze the entire topical map and site structure rather than individual articles.

**Scope:** 4 major features from the macro context research document (Section 4).

---

## Feature 1: Site-Wide N-Gram Optimization

### Research Rule (from `macro context.md`):
> "Ensure the Macro Context terms appear consistently across the site (Menu, Footer, Boilerplate)."

### Current State
- Foundation Pages feature exists but doesn't validate N-gram consistency
- Navigation structure exists but no site-wide term analysis
- No boilerplate text validation

### Requirements

#### 1.1 Central Entity Presence Audit
Validate that the Central Entity (CE) and Source Context (SC) terms appear in:
- Navigation header
- Footer sections
- Homepage H1
- All pillar page titles

#### 1.2 Boilerplate Consistency Check
Ensure consistent N-grams across:
- Meta description templates
- Footer copyright text
- Schema Organization markup

### Implementation Approach

```typescript
interface SiteWideNGramAudit {
  centralEntityPresence: {
    inHeader: boolean;
    inFooter: boolean;
    inHomepage: boolean;
    inPillarPages: string[]; // Pages missing CE
  };
  sourceContextPresence: {
    inHeader: boolean;
    inFooter: boolean;
    inHomepage: boolean;
  };
  inconsistentBoilerplate: {
    field: string;
    variations: string[];
    recommendation: string;
  }[];
  overallScore: number;
}
```

### Files to Modify
- `services/ai/linkingAudit.ts` - Add site-wide audit functions
- `types.ts` - Add `SiteWideNGramAudit` interface
- `components/ProjectDashboard.tsx` - Add site-wide audit panel

---

## Feature 2: Dynamic Navigation by Context

### Research Rule (from `linking in website.md`):
> "Header- en Footer-links moeten dynamisch zijn en veranderen op basis van het segment waar de gebruiker zich bevindt."

### Current State
- `NavigationStructure` has `dynamic_by_section: boolean` flag
- No actual implementation of dynamic navigation rules
- Navigation is static across all pages

### Requirements

#### 2.1 Segment Detection Rules
Define which navigation items appear based on:
- Topic `topic_class` (monetization vs informational)
- Topic `cluster_role` (pillar vs cluster content)
- Topic hierarchy depth

#### 2.2 Dynamic Navigation Schema
Generate different navigation configurations per segment:
- Core Section pages → Show monetization topics
- Author Section pages → Show informational topics
- Pillar pages → Show child cluster topics

### Implementation Approach

```typescript
interface DynamicNavigationRule {
  segment: 'core_section' | 'author_section' | 'pillar' | 'cluster';
  headerLinks: {
    include: string[];  // Topic IDs or foundation page types
    exclude: string[];
    maxLinks: number;
  };
  footerLinks: {
    include: string[];
    exclude: string[];
    prioritizeByProximity: boolean;
  };
}

interface NavigationStructureEnhanced extends NavigationStructure {
  dynamicRules: DynamicNavigationRule[];
}
```

### Files to Modify
- `types.ts` - Extend `NavigationStructure`
- `services/navigationService.ts` (NEW) - Navigation generation logic
- `components/NavigationDesigner.tsx` - Dynamic rules UI

---

## Feature 3: Link Count Optimization (< 150 Rule)

### Research Rule (from `linking in website.md`):
> "De totale hoeveelheid interne links moet worden beperkt tot minder dan 150 per pagina."

### Current State
- `InternalLinkingRules.maxLinksPerPage` exists (default 150)
- No actual counting or validation across site
- No PageRank dilution warnings

### Requirements

#### 3.1 Per-Page Link Count Audit
For each page, count:
- Navigation links (header + footer)
- Content links (from contextualBridge)
- Foundation page links
- Total and compare to 150 limit

#### 3.2 PageRank Dilution Warning
Flag pages where:
- Link count exceeds 150
- Links are heavily concentrated (few targets, many links)
- External links exceed recommended ratio

### Implementation Approach

```typescript
interface PageLinkAudit {
  pageId: string;
  pageTitle: string;
  linkCounts: {
    navigation: number;
    content: number;
    footer: number;
    total: number;
  };
  isOverLimit: boolean;
  dilutionRisk: 'none' | 'low' | 'medium' | 'high';
  recommendations: string[];
}

interface SiteLinkAuditResult {
  pages: PageLinkAudit[];
  averageLinkCount: number;
  pagesOverLimit: number;
  overallScore: number;
}
```

### Files to Modify
- `services/ai/linkingAudit.ts` - Add `runSiteLinkCountAudit`
- `types.ts` - Add interfaces
- `components/LinkingAuditModal.tsx` - Add site-wide tab

---

## Feature 4: PageRank Flow Direction Audit

### Research Rule (from `linking in website.md`):
> "De autoriteit moet vloeien van de Author Section naar de Core Section."

### Current State
- Topics have `topic_class` (monetization/informational)
- Topics have `cluster_role` (pillar/cluster_content)
- No actual flow direction analysis

### Requirements

#### 4.1 Build Link Graph
Create directed graph from:
- All contextualBridge links
- Navigation links
- Foundation page links

#### 4.2 Analyze Flow Direction
Validate that:
- Author Section topics link TO Core Section topics
- Core Section topics do NOT link back to Author Section
- Money pages receive links, don't distribute them

#### 4.3 Identify Flow Violations
Flag instances where:
- Core Section page links to Author Section (reverse flow)
- Pillar page has no incoming links from cluster
- Orphan pages with no incoming links

### Implementation Approach

```typescript
interface LinkFlowAnalysis {
  graph: {
    nodes: { id: string; topicClass: string; incomingLinks: number; outgoingLinks: number }[];
    edges: { source: string; target: string; anchor: string }[];
  };
  flowViolations: {
    type: 'reverse_flow' | 'orphaned' | 'no_cluster_support' | 'link_hoarding';
    sourcePage: string;
    targetPage?: string;
    severity: 'warning' | 'critical';
    recommendation: string;
  }[];
  flowScore: number; // 0-100
  centralEntityReachability: number; // % of pages that can reach CE
}
```

### Files to Modify
- `services/ai/linkingAudit.ts` - Add flow analysis
- `lib/linkGraph.ts` (NEW) - Graph building and analysis
- `types.ts` - Add interfaces

---

## Implementation Priority

| Feature | Complexity | Value | Priority |
|---------|------------|-------|----------|
| 3. Link Count Audit | Medium | High | 1st |
| 4. PageRank Flow | High | High | 2nd |
| 1. Site-Wide N-Grams | Medium | Medium | 3rd |
| 2. Dynamic Navigation | High | Medium | 4th |

---

## Implementation Tasks

### Batch 1: Link Count Audit (Feature 3)

#### Task D.1.1: Add site link count interfaces
**File:** `types.ts`
- Add `PageLinkAudit` interface
- Add `SiteLinkAuditResult` interface

#### Task D.1.2: Implement link counter
**File:** `services/ai/linkingAudit.ts`
- Add `countPageLinks(pageId, brief, navigation)` function
- Add `runSiteLinkCountAudit(context)` function

#### Task D.1.3: Add UI for site-wide link audit
**File:** `components/LinkingAuditModal.tsx`
- Add "Site Overview" tab
- Show pages over 150 link limit
- Show average link distribution

### Batch 2: PageRank Flow Analysis (Feature 4)

#### Task D.2.1: Create link graph builder
**File:** `lib/linkGraph.ts` (NEW)
- Build directed graph from briefs
- Add BFS/DFS traversal methods
- Calculate reachability metrics

#### Task D.2.2: Implement flow analyzer
**File:** `services/ai/linkingAudit.ts`
- Add `analyzePageRankFlow(graph, topics)` function
- Detect reverse flow violations
- Calculate flow score

#### Task D.2.3: Add flow visualization
**File:** `components/LinkingAuditModal.tsx`
- Add flow direction indicators
- Show violation highlights
- Suggest fixes

### Batch 3: N-Gram Consistency (Feature 1)

#### Task D.3.1: Add N-gram audit interfaces
**File:** `types.ts`
- Add `SiteWideNGramAudit` interface

#### Task D.3.2: Implement N-gram checker
**File:** `services/ai/linkingAudit.ts`
- Add `checkCentralEntityPresence(pillars, navigation, foundationPages)`
- Add `checkBoilerplateConsistency(briefs)`

#### Task D.3.3: Add N-gram audit UI
**File:** `components/ProjectDashboard.tsx`
- Add "Site Consistency" panel
- Show CE/SC presence across site

### Batch 4: Dynamic Navigation (Feature 2)

#### Task D.4.1: Extend navigation types
**File:** `types.ts`
- Add `DynamicNavigationRule` interface
- Extend `NavigationStructure`

#### Task D.4.2: Create navigation service
**File:** `services/navigationService.ts` (NEW)
- Implement rule-based navigation generation
- Add segment detection logic

#### Task D.4.3: Add dynamic nav designer
**File:** `components/NavigationDesigner.tsx`
- Add rule configuration UI
- Preview navigation per segment

---

## Success Criteria

When Phase D is complete:

1. **Link Count:** All pages show link counts; pages over 150 flagged
2. **PageRank Flow:** Flow direction violations detected; score calculated
3. **N-Gram Consistency:** CE/SC presence verified across site
4. **Dynamic Navigation:** Rules configurable; preview per segment

---

## Dependencies

- Requires existing topical map with topics assigned to Core/Author sections
- Requires content briefs with contextualBridge links populated
- Requires navigation structure configured
- Requires foundation pages set up

---

## Estimated Effort

| Batch | Tasks | Estimate |
|-------|-------|----------|
| Batch 1: Link Count | D.1.1-D.1.3 | 3-4 hours |
| Batch 2: PageRank Flow | D.2.1-D.2.3 | 4-6 hours |
| Batch 3: N-Gram | D.3.1-D.3.3 | 2-3 hours |
| Batch 4: Dynamic Nav | D.4.1-D.4.3 | 4-5 hours |
| **Total** | | **~15-18 hours** |

---

## Notes

- Phase D features are more complex than A/B/C because they require site-wide context
- Consider implementing Feature 3 (Link Count) first as it provides immediate value
- Feature 4 (PageRank Flow) builds on Feature 3's link graph
- Features 1 and 2 can be done in parallel after 3 and 4
