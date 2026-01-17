# Definitive Improvements Plan: Topic-Level Competitive Intelligence

> **Document Created:** December 25, 2024
> **Status:** Ready for Implementation
> **Prerequisite:** Builds upon `topic-level-competitive-intelligence-roadmap.md`
> **Priority:** High - These are research-backed, proven value additions

---

## Overview

This plan integrates **8 definitive improvements** into the existing roadmap phases. Each improvement is directly supported by the Semantic SEO framework research in `docs/build-docs/` and requires no further debate or research.

These improvements transform the competitive intelligence system from a "traditional SEO tool" into a **Semantic SEO analyzer** that measures what actually matters for ranking in the modern search landscape.

---

## Integration Summary

| Improvement | Integrates Into | Phase | New/Enhanced |
|-------------|-----------------|-------|--------------|
| Root/Rare/Unique Attribute Classification | ContentLayerAnalysis | 1-2 | Enhanced |
| Schema about/mentions Detection | TechnicalLayerAnalysis | 2 | Enhanced |
| PageRank Flow Direction Analysis | LinkLayerAnalysis | 3 | Enhanced |
| Contextual Bridge Justification | LinkLayerAnalysis | 3 | Enhanced |
| Link Placement Position Analysis | LinkLayerAnalysis | 3 | Enhanced |
| Anchor Text Quality Scoring | LinkLayerAnalysis | 3 | Enhanced |
| Dynamic Navigation Detection | TechnicalLayerAnalysis | 2 | New |
| Central Entity Consistency | ContentLayerAnalysis | 1-2 | New |

---

## Detailed Implementation Specifications

### 1. Root/Rare/Unique Attribute Classification

**Research Source:** `knowledge graph deep dive.md`, `EAV Foundational Definition and Identification Rules.md`

**Research Quote:**
> "The map must cover attributes that satisfy Root, Rare, and Unique qualities to be considered complete and authoritative. Missing context creates topical gaps."

#### Type Definition Enhancement

```typescript
// Enhance existing SemanticTriple in types.ts
interface SemanticTriple {
  entity: string;
  attribute: string;
  value: string;
  // EXISTING fields...

  // NEW: Attribute rarity classification
  attributeRarity: 'root' | 'rare' | 'unique' | 'unknown';

  // NEW: How we determined the rarity
  raritySource: {
    method: 'competitor_frequency' | 'wikidata_check' | 'ai_inference';
    competitorCoverage?: number;  // % of top 10 that have this attribute
    confidence: number;           // 0-1
  };
}

// Add to ContentLayerAnalysis
interface ContentLayerAnalysis {
  // ... existing fields ...

  eavTriples: SemanticTriple[];

  // NEW: Attribute distribution summary
  attributeDistribution: {
    root: number;      // Count of root attributes covered
    rare: number;      // Count of rare attributes covered
    unique: number;    // Count of unique attributes covered
    total: number;

    // Comparison to competitors
    rootCoverage: number;    // % of market root attributes covered
    rareCoverage: number;    // % of market rare attributes covered
    uniqueAdvantage: string[]; // Unique attributes only this competitor has
  };
}
```

#### Classification Algorithm

```typescript
// File: services/ai/attributeClassifier.ts

interface AttributeClassificationResult {
  attribute: string;
  rarity: 'root' | 'rare' | 'unique';
  reasoning: string;
  competitorCount: number;
}

/**
 * Classify attributes based on competitor frequency
 *
 * Rules from research:
 * - ROOT: Appears in 70%+ of top 10 competitors (definitional, expected)
 * - RARE: Appears in 20-69% of competitors (authority signal)
 * - UNIQUE: Appears in <20% or only this competitor (differentiation)
 */
function classifyAttributeByFrequency(
  attribute: string,
  competitorEAVs: SemanticTriple[][],  // EAVs from each competitor
  totalCompetitors: number
): AttributeClassificationResult {
  const count = competitorEAVs.filter(eavs =>
    eavs.some(eav => normalizeAttribute(eav.attribute) === normalizeAttribute(attribute))
  ).length;

  const percentage = count / totalCompetitors;

  if (percentage >= 0.7) {
    return {
      attribute,
      rarity: 'root',
      reasoning: `Found in ${count}/${totalCompetitors} competitors (${Math.round(percentage*100)}%)`,
      competitorCount: count
    };
  } else if (percentage >= 0.2) {
    return {
      attribute,
      rarity: 'rare',
      reasoning: `Found in ${count}/${totalCompetitors} competitors - authority signal`,
      competitorCount: count
    };
  } else {
    return {
      attribute,
      rarity: 'unique',
      reasoning: `Found in only ${count}/${totalCompetitors} competitors - differentiation opportunity`,
      competitorCount: count
    };
  }
}
```

#### Gap Analysis Integration

```typescript
// Add to TopicSerpIntelligence.gaps
interface GapAnalysis {
  // ... existing fields ...

  // NEW: Attribute-based gaps
  attributeGaps: {
    missingRoot: {
      attribute: string;
      competitorsCovering: number;
      priority: 'critical';  // Always critical - these are expected
      example: string;       // Example value from a competitor
    }[];

    missingRare: {
      attribute: string;
      competitorsCovering: number;
      priority: 'high';      // Authority opportunity
      example: string;
    }[];

    uniqueOpportunities: {
      attribute: string;
      noCompetitorHas: boolean;
      potentialValue: string;  // AI-suggested value
      priority: 'medium';      // Differentiation opportunity
    }[];
  };
}
```

#### Implementation Tasks

| Task | File | Effort |
|------|------|--------|
| Add `attributeRarity` to SemanticTriple type | `types.ts` | Low |
| Create `attributeClassifier.ts` service | `services/ai/attributeClassifier.ts` | Medium |
| Integrate classification into content analysis | `services/ai/contentAnalysis.ts` | Medium |
| Add attribute gap section to UI | `components/analysis/ContentLayerAnalysis.tsx` | Medium |
| Update gap analysis aggregation | `services/gapAnalysisService.ts` | Medium |

---

### 2. Schema `about` vs `mentions` Detection

**Research Source:** `schema.md`

**Research Quote:**
> "Use `about` for the Central Entity of the page. Use `mentions` for entities that are discussed but are not the main focus. This defines the Macro Context (Main Topic) vs. Micro Context (Sub-topics) clearly to the search engine."

#### Type Definition Enhancement

```typescript
// Enhance TechnicalLayerAnalysis.schema
interface SchemaAnalysis {
  // ... existing fields ...

  // NEW: Entity linking quality
  entityLinking: {
    // About property analysis
    about: {
      present: boolean;
      entities: {
        name: string;
        type: string;
        wikidataId: string | null;    // Q-number if linked
        wikipediaUrl: string | null;
        isProperlyReconciled: boolean; // Has external ID
      }[];
      quality: 'excellent' | 'good' | 'poor' | 'missing';
      issues: string[];
    };

    // Mentions property analysis
    mentions: {
      present: boolean;
      count: number;
      entities: {
        name: string;
        type: string;
        wikidataId: string | null;
        isProperlyReconciled: boolean;
      }[];
      quality: 'excellent' | 'good' | 'poor' | 'missing';
    };

    // Overall entity disambiguation score
    disambiguationScore: number;  // 0-100

    // Actionable recommendations
    recommendations: {
      action: string;
      impact: 'high' | 'medium' | 'low';
      implementation: string;
    }[];
  };
}
```

#### Detection Logic

```typescript
// File: services/schemaEntityAnalyzer.ts

interface EntityLinkingAnalysis {
  about: AboutAnalysis;
  mentions: MentionsAnalysis;
  disambiguationScore: number;
  recommendations: Recommendation[];
}

function analyzeEntityLinking(schemaJson: object): EntityLinkingAnalysis {
  const about = extractAboutProperty(schemaJson);
  const mentions = extractMentionsProperty(schemaJson);

  const aboutAnalysis = analyzeAbout(about);
  const mentionsAnalysis = analyzeMentions(mentions);

  // Score calculation
  let score = 0;

  // About property scoring (max 60 points)
  if (aboutAnalysis.present) {
    score += 20;
    if (aboutAnalysis.entities.some(e => e.wikidataId)) {
      score += 40; // Properly reconciled = major points
    } else if (aboutAnalysis.entities.some(e => e.wikipediaUrl)) {
      score += 20; // Wikipedia link = partial credit
    }
  }

  // Mentions property scoring (max 40 points)
  if (mentionsAnalysis.present && mentionsAnalysis.count > 0) {
    score += 20;
    const reconciledRatio = mentionsAnalysis.entities.filter(e => e.wikidataId).length /
                            mentionsAnalysis.entities.length;
    score += Math.round(reconciledRatio * 20);
  }

  return {
    about: aboutAnalysis,
    mentions: mentionsAnalysis,
    disambiguationScore: score,
    recommendations: generateRecommendations(aboutAnalysis, mentionsAnalysis)
  };
}

function generateRecommendations(about: AboutAnalysis, mentions: MentionsAnalysis): Recommendation[] {
  const recs: Recommendation[] = [];

  if (!about.present) {
    recs.push({
      action: 'Add "about" property to Article/WebPage schema',
      impact: 'high',
      implementation: 'Link to Wikidata entity for the main topic'
    });
  } else if (!about.entities.some(e => e.wikidataId)) {
    recs.push({
      action: 'Add Wikidata @id to "about" property',
      impact: 'high',
      implementation: 'Use format: {"@id": "https://www.wikidata.org/wiki/Q123"}'
    });
  }

  if (!mentions.present && /* page has secondary entities */) {
    recs.push({
      action: 'Add "mentions" property for secondary entities',
      impact: 'medium',
      implementation: 'List entities discussed but not central to the page'
    });
  }

  return recs;
}
```

#### Implementation Tasks

| Task | File | Effort |
|------|------|--------|
| Add `entityLinking` to schema types | `types/competitiveIntelligence.ts` | Low |
| Create `schemaEntityAnalyzer.ts` | `services/schemaEntityAnalyzer.ts` | Medium |
| Integrate into Technical Layer extraction | `services/technicalLayerService.ts` | Low |
| Add entity linking section to UI | `components/analysis/TechnicalLayerAnalysis.tsx` | Low |

---

### 3. PageRank Flow Direction Analysis

**Research Source:** `linking in website.md`

**Research Quote:**
> "De autoriteit moet vloeien van de Author Section naar de Core Section. Links in artikelen over [informational topic] linken naar de hoofdpagina [Core]. Core-pagina's linken uitgebreid naar algemene Author-pagina's = FOUT."

#### Type Definition Enhancement

```typescript
// Enhance LinkLayerAnalysis
interface LinkLayerAnalysis {
  // ... existing fields ...

  // NEW: PageRank flow analysis
  pageRankFlow: {
    // Detected page type
    pageType: 'core' | 'author' | 'bridge' | 'unknown';
    pageTypeConfidence: number;  // 0-1
    pageTypeSignals: string[];   // Why we classified it this way

    // Flow direction analysis
    flowAnalysis: {
      linksToCore: {
        count: number;
        urls: string[];
        anchorTexts: string[];
        placement: ('early' | 'middle' | 'late')[];
      };

      linksToAuthor: {
        count: number;
        urls: string[];
        anchorTexts: string[];
        placement: ('early' | 'middle' | 'late')[];
      };

      // Is the flow correct?
      flowDirection: 'correct' | 'reversed' | 'balanced' | 'unclear';
      flowScore: number;  // 0-100

      // Issues detected
      issues: {
        issue: string;
        severity: 'critical' | 'warning' | 'info';
        affectedLinks: string[];
      }[];
    };

    // Strategic assessment
    strategicAssessment: {
      isOptimal: boolean;
      recommendation: string;
      potentialImprovement: string;
    };
  };
}
```

#### Detection Logic

```typescript
// File: services/pageRankFlowAnalyzer.ts

interface FlowAnalysisResult {
  pageType: 'core' | 'author' | 'bridge' | 'unknown';
  flowDirection: 'correct' | 'reversed' | 'balanced' | 'unclear';
  flowScore: number;
  issues: FlowIssue[];
}

function analyzePageRankFlow(
  pageUrl: string,
  internalLinks: InternalLink[],
  siteStructure: SiteStructure  // URL patterns, known core pages
): FlowAnalysisResult {

  // Step 1: Classify page type based on URL and content signals
  const pageType = classifyPageType(pageUrl, siteStructure);

  // Step 2: Classify each link destination
  const linksToCore = internalLinks.filter(l => isCorePage(l.href, siteStructure));
  const linksToAuthor = internalLinks.filter(l => isAuthorPage(l.href, siteStructure));

  // Step 3: Determine flow direction
  let flowDirection: FlowAnalysisResult['flowDirection'];
  let flowScore = 50; // Neutral starting point
  const issues: FlowIssue[] = [];

  if (pageType === 'author') {
    // Author pages SHOULD link to Core (correct flow)
    if (linksToCore.length > linksToAuthor.length) {
      flowDirection = 'correct';
      flowScore = 80 + Math.min(20, linksToCore.length * 2);
    } else if (linksToAuthor.length > linksToCore.length) {
      flowDirection = 'reversed';
      flowScore = 30;
      issues.push({
        issue: 'Author page links more to other Author pages than Core',
        severity: 'warning',
        affectedLinks: linksToAuthor.map(l => l.href)
      });
    } else {
      flowDirection = 'balanced';
      flowScore = 60;
    }

    // Check placement - Core links should be late in content
    const earlyCoreLInks = linksToCore.filter(l => l.placement === 'early');
    if (earlyCoreLInks.length > 0) {
      issues.push({
        issue: 'Core section links placed too early - should be in Supplementary Content',
        severity: 'info',
        affectedLinks: earlyCoreLInks.map(l => l.href)
      });
      flowScore -= 10;
    }
  }

  if (pageType === 'core') {
    // Core pages should NOT extensively link to Author pages
    if (linksToAuthor.length > 5) {
      flowDirection = 'reversed';
      flowScore = 40;
      issues.push({
        issue: 'Core page links extensively to Author section - dilutes Core authority',
        severity: 'critical',
        affectedLinks: linksToAuthor.map(l => l.href)
      });
    } else {
      flowDirection = 'correct';
      flowScore = 85;
    }
  }

  return { pageType, flowDirection, flowScore, issues };
}
```

#### Implementation Tasks

| Task | File | Effort |
|------|------|--------|
| Add `pageRankFlow` to LinkLayerAnalysis | `types/competitiveIntelligence.ts` | Low |
| Create `pageRankFlowAnalyzer.ts` | `services/pageRankFlowAnalyzer.ts` | High |
| Detect site structure patterns | `services/siteStructureDetector.ts` | Medium |
| Add flow visualization to UI | `components/analysis/LinkLayerAnalysis.tsx` | Medium |

---

### 4. Contextual Bridge Justification Detection

**Research Source:** `linking in website.md`

**Research Quote:**
> "Creëer een contextuele brug (Subordinate Text) om de verbinding tussen twee potentieel discordante onderwerpen te rechtvaardigen. Voeg een H4 of H5 toe aan de Author Section om een geleidelijke overgang naar het Core onderwerp te creëren."

#### Type Definition Enhancement

```typescript
// Enhance bridgeTopics in LinkLayerAnalysis
interface BridgeTopic {
  topic: string;
  function: 'connects' | 'supports' | 'expands';
  connectsClusters: string[];
  linkJuiceFlow: 'inbound' | 'outbound' | 'bidirectional';
  strategicValue: 'high' | 'medium' | 'low';

  // NEW: Bridge justification analysis
  justification: {
    hasSubordinateText: boolean;      // Is there H4/H5 before the link?
    subordinateHeading: string | null; // The actual heading text

    hasContextualIntro: boolean;       // Is the link preceded by context?
    contextualText: string | null;     // The text introducing the link

    linkPlacement: 'inline' | 'section_end' | 'standalone';

    // Quality assessment
    isJustified: boolean;              // Does this bridge make semantic sense?
    justificationScore: number;        // 0-100

    // If not justified, why?
    issues: {
      issue: 'no_context' | 'abrupt_transition' | 'semantic_disconnect' | 'early_placement';
      description: string;
      suggestion: string;
    }[];
  };
}
```

#### Detection Logic

```typescript
// File: services/bridgeJustificationAnalyzer.ts

function analyzeBridgeJustification(
  link: InternalLink,
  surroundingHtml: string,  // HTML context around the link
  sourceTopicCluster: string,
  targetTopicCluster: string
): BridgeJustification {

  // Check for subordinate heading before link
  const headingBefore = findHeadingBefore(link.position, surroundingHtml);
  const hasSubordinateText = headingBefore && ['h4', 'h5', 'h6'].includes(headingBefore.tag);

  // Check for contextual introduction
  const textBefore = extractTextBefore(link.position, surroundingHtml, 200); // 200 chars
  const hasContextualIntro = textBefore && containsTransitionLanguage(textBefore);

  // Determine if semantically justified
  const clusterDistance = calculateClusterDistance(sourceTopicCluster, targetTopicCluster);

  let isJustified = false;
  let score = 0;
  const issues: JustificationIssue[] = [];

  if (clusterDistance < 2) {
    // Same or adjacent cluster - always justified
    isJustified = true;
    score = 90;
  } else if (clusterDistance >= 2 && clusterDistance < 4) {
    // Moderate distance - needs bridge
    if (hasSubordinateText) {
      isJustified = true;
      score = 80;
    } else if (hasContextualIntro) {
      isJustified = true;
      score = 70;
    } else {
      isJustified = false;
      score = 40;
      issues.push({
        issue: 'no_context',
        description: 'Link bridges distant clusters without contextual introduction',
        suggestion: 'Add H4/H5 heading to create gradual transition'
      });
    }
  } else {
    // High distance - requires strong justification
    if (hasSubordinateText && hasContextualIntro) {
      isJustified = true;
      score = 70;
    } else {
      isJustified = false;
      score = 20;
      issues.push({
        issue: 'semantic_disconnect',
        description: 'Link connects semantically distant concepts without justification',
        suggestion: 'Consider if this link is necessary, or add bridge content'
      });
    }
  }

  return {
    hasSubordinateText,
    subordinateHeading: headingBefore?.text || null,
    hasContextualIntro,
    contextualText: hasContextualIntro ? textBefore : null,
    linkPlacement: determinePlacement(link),
    isJustified,
    justificationScore: score,
    issues
  };
}
```

#### Implementation Tasks

| Task | File | Effort |
|------|------|--------|
| Enhance `BridgeTopic` type | `types/competitiveIntelligence.ts` | Low |
| Create `bridgeJustificationAnalyzer.ts` | `services/bridgeJustificationAnalyzer.ts` | High |
| Extract HTML context around links | `services/htmlContextExtractor.ts` | Medium |
| Add bridge quality UI section | `components/analysis/LinkLayerAnalysis.tsx` | Medium |

---

### 5. Link Placement Position Analysis

**Research Source:** `linking in website.md`

**Research Quote:**
> "Links die PageRank overdragen naar het Core Section moeten onderaan de pagina worden geplaatst, in de Supplementary Content (Micro Context), om de relevantie niet te vroeg te verliezen."

#### Type Definition Enhancement

```typescript
// Enhance internal link structure
interface InternalLink {
  href: string;
  anchorText: string;
  context: string;
  placement: 'in-content' | 'sidebar' | 'footer' | 'nav' | 'related-posts';
  followStatus: 'follow' | 'nofollow';
  isImage: boolean;

  // NEW: Position analysis
  position: {
    // Where in the content
    contentZone: 'early' | 'middle' | 'late';  // First/middle/last third

    // Numeric position
    percentageThrough: number;  // 0-100
    paragraphNumber: number;
    totalParagraphs: number;

    // Is this in main content or supplementary?
    contentType: 'main' | 'supplementary' | 'navigation';

    // For Core section links specifically
    isOptimalPlacement: boolean;  // Late = optimal for Core links
    placementScore: number;        // 0-100
  };
}

// Add to LinkLayerAnalysis
interface LinkLayerAnalysis {
  // ... existing fields ...

  // NEW: Placement pattern analysis
  placementPatterns: {
    coreLinksPlacements: {
      early: number;
      middle: number;
      late: number;
      optimal: number;  // Count in late/supplementary position
    };

    authorLinksPlacements: {
      early: number;
      middle: number;
      late: number;
    };

    overallPlacementScore: number;  // 0-100

    recommendations: {
      action: string;
      currentPlacement: string;
      suggestedPlacement: string;
      affectedLinks: string[];
    }[];
  };
}
```

#### Implementation Tasks

| Task | File | Effort |
|------|------|--------|
| Add `position` to internal link type | `types/competitiveIntelligence.ts` | Low |
| Calculate content zones from HTML | `services/linkPositionAnalyzer.ts` | Medium |
| Aggregate placement patterns | `services/linkAnalysisService.ts` | Low |
| Add placement visualization | `components/analysis/LinkLayerAnalysis.tsx` | Low |

---

### 6. Anchor Text Quality Scoring

**Research Source:** `linking in website.md`

**Research Quotes:**
> - "Gebruik dezelfde ankertekst niet meer dan drie keer per pagina"
> - "Gebruik alleen beschrijvende ankerteksten die het doel van de gelinkte pagina aangeven"
> - "Link niet vanuit het eerste woord van een paragraaf of zin"

#### Type Definition Enhancement

```typescript
// Enhance LinkLayerAnalysis.internal
interface InternalLinkAnalysis {
  // ... existing fields ...

  // NEW: Anchor text quality
  anchorTextQuality: {
    // Repetition analysis
    repetitionIssues: {
      anchorText: string;
      count: number;
      targetUrl: string;
      isViolation: boolean;  // true if >3 times
    }[];

    // Descriptiveness analysis
    genericAnchors: {
      anchorText: string;
      href: string;
      suggestion: string;  // Better anchor text
    }[];
    genericCount: number;

    // Placement analysis
    firstWordLinks: {
      anchorText: string;
      href: string;
      paragraphStart: string;  // First 50 chars of paragraph
    }[];
    firstWordCount: number;

    // Annotation text analysis
    annotationQuality: {
      link: string;
      hasGoodAnnotation: boolean;  // Surrounding text provides context
      annotationText: string;
    }[];

    // Overall scores
    scores: {
      repetition: number;      // 0-100 (100 = no violations)
      descriptiveness: number; // 0-100
      placement: number;       // 0-100
      annotation: number;      // 0-100
      overall: number;         // Weighted average
    };

    // Summary issues
    issues: {
      severity: 'critical' | 'warning' | 'info';
      type: 'repetition' | 'generic' | 'placement' | 'annotation';
      description: string;
      count: number;
    }[];
  };
}
```

#### Detection Logic

```typescript
// File: services/anchorTextQualityAnalyzer.ts

const GENERIC_ANCHORS = [
  'click here', 'read more', 'learn more', 'view', 'see more',
  'here', 'this', 'link', 'article', 'page', 'more info'
];

function analyzeAnchorTextQuality(links: InternalLink[]): AnchorTextQuality {
  // 1. Check repetition (max 3 per anchor-target combo)
  const anchorCounts = new Map<string, number>();
  const repetitionIssues: RepetitionIssue[] = [];

  for (const link of links) {
    const key = `${link.anchorText.toLowerCase()}|${link.href}`;
    const count = (anchorCounts.get(key) || 0) + 1;
    anchorCounts.set(key, count);

    if (count > 3) {
      repetitionIssues.push({
        anchorText: link.anchorText,
        count,
        targetUrl: link.href,
        isViolation: true
      });
    }
  }

  // 2. Check for generic anchors
  const genericAnchors = links.filter(l =>
    GENERIC_ANCHORS.some(g => l.anchorText.toLowerCase().includes(g))
  );

  // 3. Check for first-word placement
  const firstWordLinks = links.filter(l => l.isFirstWordOfParagraph);

  // 4. Calculate scores
  const repetitionScore = Math.max(0, 100 - (repetitionIssues.length * 20));
  const descriptivenessScore = Math.max(0, 100 - (genericAnchors.length / links.length * 100));
  const placementScore = Math.max(0, 100 - (firstWordLinks.length / links.length * 100));

  return {
    repetitionIssues,
    genericAnchors: genericAnchors.map(l => ({
      anchorText: l.anchorText,
      href: l.href,
      suggestion: generateBetterAnchor(l)
    })),
    genericCount: genericAnchors.length,
    firstWordLinks,
    firstWordCount: firstWordLinks.length,
    scores: {
      repetition: repetitionScore,
      descriptiveness: descriptivenessScore,
      placement: placementScore,
      overall: (repetitionScore + descriptivenessScore + placementScore) / 3
    }
  };
}
```

#### Implementation Tasks

| Task | File | Effort |
|------|------|--------|
| Add `anchorTextQuality` to types | `types/competitiveIntelligence.ts` | Low |
| Create `anchorTextQualityAnalyzer.ts` | `services/anchorTextQualityAnalyzer.ts` | Medium |
| Detect first-word-of-paragraph links | Integrate with HTML parsing | Low |
| Add quality indicators to UI | `components/analysis/LinkLayerAnalysis.tsx` | Low |

---

### 7. Dynamic vs Static Navigation Detection

**Research Source:** `linking in website.md`

**Research Quote:**
> "Gebruik Dynamic Headers en Footers om links te wijzigen op basis van de huidige contextuele sectie van de gebruiker. Statische mega-menu's die naar elke categorie linken, ongeacht de context = FOUT."

#### Type Definition Enhancement

```typescript
// Add to TechnicalLayerAnalysis
interface TechnicalLayerAnalysis {
  // ... existing fields ...

  // NEW: Navigation analysis
  navigationAnalysis: {
    // Header/Nav detection
    header: {
      linkCount: number;
      isDynamic: 'likely_dynamic' | 'likely_static' | 'unknown';
      dynamicSignals: string[];   // Why we think it's dynamic
      staticSignals: string[];    // Why we think it's static

      // If static, is it a mega-menu?
      isMegaMenu: boolean;
      megaMenuCategories: number;
    };

    // Footer detection
    footer: {
      linkCount: number;
      isDynamic: 'likely_dynamic' | 'likely_static' | 'unknown';

      // Corporate links present?
      hasCorporateLinks: {
        aboutUs: boolean;
        privacyPolicy: boolean;
        termsOfService: boolean;
        contact: boolean;
      };
    };

    // Sidebar detection
    sidebar: {
      present: boolean;
      linkCount: number;
      isDynamic: 'likely_dynamic' | 'likely_static' | 'unknown';

      // Content relevance
      linksRelevantToPage: number;  // Count of contextually relevant links
      relevanceScore: number;        // 0-100
    };

    // Overall navigation quality
    navigationScore: number;  // 0-100

    issues: {
      issue: 'mega_menu_dilution' | 'static_footer' | 'irrelevant_sidebar' | 'missing_corporate';
      severity: 'critical' | 'warning' | 'info';
      description: string;
      recommendation: string;
    }[];
  };
}
```

#### Detection Logic

```typescript
// File: services/navigationAnalyzer.ts

function detectNavigationType(
  headerHtml: string,
  currentPageContext: string,
  siteWideHeaderSample?: string[]  // Headers from other pages for comparison
): NavigationAnalysis {

  const headerLinks = extractLinksFromHtml(headerHtml);

  // Signals for dynamic navigation
  const dynamicSignals: string[] = [];
  const staticSignals: string[] = [];

  // Check 1: Compare to other pages' headers
  if (siteWideHeaderSample && siteWideHeaderSample.length > 0) {
    const otherHeaders = siteWideHeaderSample.map(h => extractLinksFromHtml(h));
    const allSame = otherHeaders.every(h =>
      JSON.stringify(h.map(l => l.href).sort()) ===
      JSON.stringify(headerLinks.map(l => l.href).sort())
    );

    if (allSame) {
      staticSignals.push('Header identical across sampled pages');
    } else {
      dynamicSignals.push('Header varies across pages');
    }
  }

  // Check 2: Link count (mega-menus have 50+ links)
  if (headerLinks.length > 50) {
    staticSignals.push(`High link count (${headerLinks.length}) suggests mega-menu`);
  } else if (headerLinks.length < 15) {
    dynamicSignals.push('Low link count suggests curated/dynamic');
  }

  // Check 3: Contextual relevance
  const relevantLinks = headerLinks.filter(l =>
    isRelevantToContext(l.anchorText, currentPageContext)
  );
  const relevanceRatio = relevantLinks.length / headerLinks.length;

  if (relevanceRatio > 0.7) {
    dynamicSignals.push('Most links contextually relevant to current page');
  } else if (relevanceRatio < 0.3) {
    staticSignals.push('Few links contextually relevant - likely static');
  }

  // Determine type
  const isDynamic = dynamicSignals.length > staticSignals.length
    ? 'likely_dynamic'
    : staticSignals.length > dynamicSignals.length
      ? 'likely_static'
      : 'unknown';

  return {
    linkCount: headerLinks.length,
    isDynamic,
    dynamicSignals,
    staticSignals,
    isMegaMenu: headerLinks.length > 50
  };
}
```

#### Implementation Tasks

| Task | File | Effort |
|------|------|--------|
| Add `navigationAnalysis` to types | `types/competitiveIntelligence.ts` | Low |
| Create `navigationAnalyzer.ts` | `services/navigationAnalyzer.ts` | Medium |
| Compare headers across page samples | Integrate with crawl logic | Medium |
| Add navigation section to UI | `components/analysis/TechnicalLayerAnalysis.tsx` | Low |

---

### 8. Central Entity Consistency Check

**Research Source:** `knowledge graph deep dive.md`, `Topical map_columns.md`

**Research Quote:**
> "The Central Entity must be defined and consistently appear site-wide, forming the basis for site-wide N-grams."
> "De H1 is 'Voordelen van Water,' de introductie definieert water, en elke H2/H3 daaronder gebruikt het woord 'water' in zijn context."

#### Type Definition Enhancement

```typescript
// Add to ContentLayerAnalysis
interface ContentLayerAnalysis {
  // ... existing fields ...

  // NEW: Central Entity consistency
  centralEntityAnalysis: {
    // Detected central entity
    detectedEntity: {
      name: string;
      confidence: number;  // 0-1
      sources: ('h1' | 'title' | 'schema' | 'frequency')[];
    };

    // Consistency across page sections
    consistency: {
      // Presence in key positions
      inH1: boolean;
      inTitle: boolean;
      inIntroduction: boolean;  // First 200 words
      inSchema: boolean;

      // Heading presence
      headingPresence: {
        h2Count: number;
        h2WithEntity: number;
        h3Count: number;
        h3WithEntity: number;
        ratio: number;  // % of headings containing entity
      };

      // Body presence
      bodyPresence: {
        totalParagraphs: number;
        paragraphsWithEntity: number;
        ratio: number;

        // Distribution across content
        presentInFirstThird: boolean;
        presentInMiddleThird: boolean;
        presentInLastThird: boolean;
        distributionScore: number;  // 0-100
      };

      // N-gram analysis
      entityNGrams: {
        exactMatch: number;     // Exact entity name
        partialMatch: number;   // Entity + modifier
        synonymMatch: number;   // Known synonyms
      };
    };

    // Contextual vector analysis
    contextualVector: {
      isConsistent: boolean;           // Maintains straight line?
      driftPoints: {
        position: number;              // Paragraph number
        driftedTo: string;             // What entity/topic it drifted to
        severity: 'minor' | 'major';
      }[];

      vectorScore: number;  // 0-100
    };

    // Overall consistency score
    consistencyScore: number;  // 0-100

    issues: {
      issue: 'missing_in_h1' | 'missing_in_intro' | 'low_heading_presence' |
             'uneven_distribution' | 'contextual_drift';
      severity: 'critical' | 'warning' | 'info';
      description: string;
      location: string;
    }[];
  };
}
```

#### Detection Logic

```typescript
// File: services/centralEntityAnalyzer.ts

function analyzeCentralEntityConsistency(
  content: ParsedContent,
  detectedEntity: string
): CentralEntityAnalysis {

  // Normalize entity for matching
  const entityVariants = [
    detectedEntity.toLowerCase(),
    ...generateSynonyms(detectedEntity),
    ...generatePartialMatches(detectedEntity)
  ];

  // Check H1
  const inH1 = containsEntity(content.h1, entityVariants);

  // Check introduction (first 200 words)
  const intro = content.paragraphs.slice(0, 2).join(' ');
  const inIntro = containsEntity(intro, entityVariants);

  // Check headings
  const h2WithEntity = content.h2s.filter(h => containsEntity(h, entityVariants)).length;
  const h3WithEntity = content.h3s.filter(h => containsEntity(h, entityVariants)).length;

  // Check body distribution
  const thirds = splitIntoThirds(content.paragraphs);
  const distribution = {
    first: thirds[0].some(p => containsEntity(p, entityVariants)),
    middle: thirds[1].some(p => containsEntity(p, entityVariants)),
    last: thirds[2].some(p => containsEntity(p, entityVariants))
  };

  // Detect contextual drift
  const driftPoints = detectDrift(content.paragraphs, detectedEntity);

  // Calculate scores
  const headingRatio = (h2WithEntity + h3WithEntity) / (content.h2s.length + content.h3s.length);
  const distributionScore = (distribution.first ? 33 : 0) +
                           (distribution.middle ? 34 : 0) +
                           (distribution.last ? 33 : 0);

  const consistencyScore = calculateOverallScore({
    inH1, inIntro, headingRatio, distributionScore, driftPoints
  });

  return {
    detectedEntity: { name: detectedEntity, confidence: 0.9, sources: ['h1', 'frequency'] },
    consistency: {
      inH1,
      inTitle: containsEntity(content.title, entityVariants),
      inIntroduction: inIntro,
      inSchema: content.schema?.about?.name === detectedEntity,
      headingPresence: {
        h2Count: content.h2s.length,
        h2WithEntity,
        h3Count: content.h3s.length,
        h3WithEntity,
        ratio: headingRatio
      },
      bodyPresence: {
        distributionScore,
        presentInFirstThird: distribution.first,
        presentInMiddleThird: distribution.middle,
        presentInLastThird: distribution.last
      }
    },
    contextualVector: {
      isConsistent: driftPoints.length === 0,
      driftPoints,
      vectorScore: Math.max(0, 100 - (driftPoints.length * 15))
    },
    consistencyScore
  };
}
```

#### Implementation Tasks

| Task | File | Effort |
|------|------|--------|
| Add `centralEntityAnalysis` to types | `types/competitiveIntelligence.ts` | Low |
| Create `centralEntityAnalyzer.ts` | `services/centralEntityAnalyzer.ts` | High |
| Integrate entity detection with EAV extraction | Reuse existing services | Medium |
| Add entity consistency UI section | `components/analysis/ContentLayerAnalysis.tsx` | Medium |

---

## Updated Phase Integration

### Phase 1: Foundation (Updated)
| Original Task | Status | New Tasks Added |
|--------------|--------|-----------------|
| Topic SERP Panel | TODO | Add Central Entity Consistency display |
| Brief SERP Integration | TODO | Add Root/Rare/Unique attribute gaps |

### Phase 2: Technical Layer (Updated)
| Original Task | Status | New Tasks Added |
|--------------|--------|-----------------|
| Schema extraction | TODO | Add `about`/`mentions` entity linking analysis |
| HTML semantic analyzer | TODO | Add Dynamic Navigation detection |
| Rich snippet checker | TODO | No change |

### Phase 3: Link Layer (Updated)
| Original Task | Status | New Tasks Added |
|--------------|--------|-----------------|
| Internal link extractor | TODO | Add position analysis |
| Bridge topic identifier | TODO | Add justification analysis, flow direction |
| Silo/hub detector | TODO | Add PageRank flow scoring |
| - | - | Add Anchor Text Quality scoring |

### Phases 4-7: No Changes
Visual, Authority, SERP Features, and Intelligence phases remain as originally specified.

---

## Execution Order Recommendation

Based on dependencies and value delivery:

1. **Central Entity Consistency** (Phase 1) - Can be done with existing content extraction
2. **Root/Rare/Unique Classification** (Phase 1) - Builds on existing EAV extraction
3. **Schema about/mentions** (Phase 2) - Simple addition to schema parsing
4. **Dynamic Navigation Detection** (Phase 2) - Standalone analysis
5. **Link Position Analysis** (Phase 3) - Foundation for other link analyses
6. **Anchor Text Quality** (Phase 3) - Uses position data
7. **PageRank Flow Direction** (Phase 3) - Needs site structure understanding
8. **Contextual Bridge Justification** (Phase 3) - Most complex, needs all above

---

## Success Metrics

| Improvement | Measurable Outcome |
|-------------|-------------------|
| Root/Rare/Unique Classification | 100% of extracted EAVs are categorized |
| Schema about/mentions | Detection accuracy >95% |
| PageRank Flow Direction | Flow classification for 80%+ of pages |
| Bridge Justification | Justification score for all cross-cluster links |
| Link Placement | Position data for 100% of internal links |
| Anchor Text Quality | Quality score for all pages analyzed |
| Dynamic Navigation | Classification for all competitor sites |
| Central Entity Consistency | Consistency score for all analyzed pages |

---

## Document History

| Date | Author | Changes |
|------|--------|---------|
| 2024-12-25 | Claude + User | Created from brainstorming session |

---

*This plan should be executed after reading the original roadmap. All type definitions are ready for implementation.*
