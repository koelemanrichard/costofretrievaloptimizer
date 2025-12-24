# Topic-Level Competitive Intelligence Roadmap

> **Document Created:** December 24, 2024
> **Status:** Planning Complete - Ready for Implementation
> **Priority:** High - Core Differentiator Feature

---

## Executive Summary

This roadmap defines a comprehensive **Topic-Level Competitive Intelligence** system that analyzes competitors across six distinct layers: Content, Technical, Visual, Link, SERP Features, and Authority. Unlike existing tools that focus solely on keywords and content, this system provides holistic analysis aligned with the Semantic SEO framework.

### Key Insight from Discussion

The current system performs competitor analysis at the **map level** (aggregate gaps), but real-world SEO workflow requires **topic-level** analysis. As the user stated:

> "In the old SEO ways I would look at the competitor websites per topic, find the keywords, find all headlines from the top 10 ranking, get the semantic context and the type of pages expected and then based on search volume I would start to create the content for those topics first."

Additionally, semantic/content analysis alone is insufficient. A complete analysis must include:
- Schema and structured data
- Rich snippet eligibility
- HTML markup quality
- Visual semantics
- Internal linking and bridge topics
- Authority signals (E-E-A-T)

---

## Current State Analysis

### What Already Exists

| Component | Location | Capability | Gap |
|-----------|----------|------------|-----|
| `QueryNetworkAudit` | `services/ai/queryNetworkAudit.ts` | Extracts competitor EAVs, identifies content gaps | Map-level only, not per-topic |
| `CompetitorGapGraph` | `components/visualization/CompetitorGapGraph.tsx` | Visualizes gaps as force-directed graph | No cluster/topic filtering |
| `SemanticDistanceMatrix` | `components/visualization/SemanticDistanceMatrix.tsx` | Heatmap of semantic relationships | Not connected to competitor data |
| `ContentBrief.serpAnalysis` | `types.ts` | PAA, related searches | AI-inferred, not actual SERP crawl |
| `jinaService` | `services/jinaService.ts` | Web page content extraction | Content only, no technical/schema extraction |
| `Pass 9 Schema Generation` | `services/ai/contentGeneration/passes/pass9SchemaGeneration.ts` | Generates schema for OUR content | Doesn't analyze competitor schema |
| `visualSemantics` | `config/visualSemantics.ts` | Image/visual guidelines | For generation, not competitor analysis |

### What's Missing

1. **Per-topic SERP analysis** - Each topic should have its own competitor breakdown
2. **Technical layer extraction** - Schema, rich snippets, HTML semantics from competitors
3. **Visual layer analysis** - How competitors use images, diagrams, infographics
4. **Link layer analysis** - Internal linking patterns, bridge topics, silo structure
5. **Authority signals** - E-E-A-T indicators from competitor pages
6. **SERP feature tracking** - What rich results competitors own
7. **Search volume integration** - Prioritization based on demand
8. **Cluster-level filtering** - View gaps for specific topic clusters

---

## Architecture Overview

### Multi-Layer Analysis Framework

```
┌─────────────────────────────────────────────────────────────────────┐
│                    COMPETITOR PAGE ANALYSIS                          │
│                    (Complete Holistic View)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │   CONTENT    │  │  TECHNICAL   │  │   VISUAL     │               │
│  │    LAYER     │  │    LAYER     │  │   LAYER      │               │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤               │
│  │ • Headlines  │  │ • Schema     │  │ • Images     │               │
│  │ • Word count │  │ • Rich snip  │  │ • Alt text   │               │
│  │ • Entities   │  │ • HTML5 sem  │  │ • Diagrams   │               │
│  │ • EAVs       │  │ • Microdata  │  │ • Infographs │               │
│  │ • Intent     │  │ • Open Graph │  │ • Layout     │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │    LINK      │  │    SERP      │  │  AUTHORITY   │               │
│  │    LAYER     │  │   FEATURES   │  │    LAYER     │               │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤               │
│  │ • Internal   │  │ • Featured   │  │ • E-E-A-T    │               │
│  │ • Bridge     │  │   snippet    │  │ • Citations  │               │
│  │ • Anchor txt │  │ • PAA owned  │  │ • Author     │               │
│  │ • Hub/spoke  │  │ • Image pack │  │ • Trust sigs │               │
│  │ • Siloing    │  │ • Video      │  │ • Reviews    │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Dual-Mode SERP Analysis

User requirement: Support both fast exploration and deep analysis.

```
┌─────────────────────────────────────────────────────────────────┐
│                    SERP ANALYSIS MODE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ⚡ FAST TRACK (AI-Inferred)         🔬 DEEP DIVE (Crawl)      │
│   ─────────────────────────           ─────────────────────      │
│   • Perplexity/Gemini inference       • Jina Reader crawl        │
│   • ~5 seconds per topic              • ~30-60 sec per topic     │
│   • Good for initial planning         • Actual headlines         │
│   • Pattern-based estimates           • Real word counts         │
│   • Lower API cost                    • Entity extraction        │
│                                       • Schema extraction        │
│                                       • Link structure           │
│                                                                  │
│   Use when: Exploring, prioritizing   Use when: Creating         │
│   Many topics quickly                 content for this topic     │
└─────────────────────────────────────────────────────────────────┘
```

### Three-Location Gap Display

User requirement: Gap analysis should appear in three locations.

```
                    ┌──────────────────────┐
                    │   MAP-LEVEL GAPS     │
                    │  (Strategic View)    │
                    │                      │
                    │  CompetitorGapGraph  │
                    │  + Filter by Cluster │◄──── NEW: Cluster filter
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
    │  TOPIC VIEW     │ │  BRIEF PANEL    │ │  CLUSTER VIEW   │
    │  (Detail Panel) │ │  (Embedded)     │ │  (Core Topic)   │
    │                 │ │                 │ │                 │
    │ • SERP snapshot │ │ • Top 10 summary│ │ • Aggregate gaps│
    │ • This topic's  │ │ • Headlines to  │ │ • Cluster vs    │
    │   gaps only     │ │   beat          │ │   competitors   │
    │ • Competitor    │ │ • Differentiate │ │ • Priority      │
    │   pages ranked  │ │   suggestions   │ │   heatmap       │
    └─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## Type Definitions

### 1. Content Layer Analysis

```typescript
// File: types/competitiveIntelligence.ts

interface ContentLayerAnalysis {
  headlines: {
    tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    text: string;
    position: number;
  }[];
  wordCount: number;
  paragraphCount: number;

  entities: {
    name: string;
    type: string;           // Person, Organization, Product, Concept
    frequency: number;
    prominence: number;     // 0-1, based on position and emphasis
  }[];

  eavTriples: SemanticTriple[];

  searchIntent: 'informational' | 'commercial' | 'transactional' | 'navigational';
  contentType: 'guide' | 'listicle' | 'comparison' | 'product' | 'how-to' | 'faq' | 'news' | 'review';

  readability: {
    fleschKincaid: number;
    avgSentenceLength: number;
    avgWordLength: number;
  };

  uniqueAngles: string[];       // What makes this content different from others
  topicalCoverage: string[];    // Subtopics covered
  missingFromOthers: string[];  // What this page has that others don't
}
```

### 2. Technical Layer Analysis

```typescript
interface TechnicalLayerAnalysis {
  schema: {
    detected: boolean;
    types: string[];              // Article, Product, FAQ, HowTo, Recipe, etc.

    completeness: {
      score: number;              // 0-100
      missingRequired: string[];  // Required properties not filled
      missingRecommended: string[];
    };

    entities: {
      name: string;
      type: string;
      sameAs: string[];           // Wikipedia, Wikidata, social links
      identifier: string | null;  // Wikidata ID if found
    }[];

    speakable: boolean;           // Has speakable markup for voice

    raw: object;                  // Full JSON-LD for inspection
  };

  richSnippets: {
    eligible: {
      type: string;
      requirements: string[];
      currentStatus: 'has' | 'missing' | 'partial';
    }[];

    captured: string[];           // What they currently show in SERP

    opportunities: {
      snippet: string;
      difficulty: 'easy' | 'medium' | 'hard';
      impact: 'high' | 'medium' | 'low';
      implementation: string;     // What to add
    }[];
  };

  htmlSemantics: {
    doctype: string;
    usesSemanticTags: boolean;
    semanticTagsUsed: string[];   // article, section, aside, nav, main, header, footer

    headingHierarchy: {
      valid: boolean;
      structure: string[];        // ['h1', 'h2', 'h2', 'h3', 'h2']
      issues: string[];           // 'Skipped h2', 'Multiple h1'
    };

    landmarks: {
      hasMain: boolean;
      hasNav: boolean;
      hasAside: boolean;
      hasFooter: boolean;
    };

    accessibilityScore: number;   // 0-100
    accessibilityIssues: string[];
  };

  metaTags: {
    title: string;
    description: string;
    canonical: string | null;
    robots: string | null;

    openGraph: {
      title: string;
      description: string;
      image: string;
      type: string;
      url: string;
    } | null;

    twitter: {
      card: string;
      title: string;
      description: string;
      image: string;
    } | null;
  };

  technicalSignals: {
    hasCanonical: boolean;
    hasBreadcrumbs: boolean;
    breadcrumbStructure: string[] | null;
    hasTableOfContents: boolean;
    hasPagination: boolean;
    mobileViewport: boolean;
    hasAmpVersion: boolean;
    loadingStrategy: 'ssr' | 'csr' | 'ssg' | 'unknown';
  };
}
```

### 3. Visual Layer Analysis

```typescript
interface VisualLayerAnalysis {
  images: {
    total: number;
    withAlt: number;
    withTitle: number;

    inventory: {
      src: string;
      alt: string;
      title: string | null;
      width: number | null;
      height: number | null;
      loading: 'lazy' | 'eager' | null;
      type: 'photo' | 'diagram' | 'infographic' | 'chart' | 'screenshot' | 'icon' | 'logo' | 'unknown';
      position: 'hero' | 'inline' | 'sidebar' | 'footer';
      context: string;          // Surrounding text/heading
    }[];

    altTextQuality: {
      score: number;            // 0-100
      descriptive: number;      // Count of good alts
      keywordStuffed: number;
      empty: number;
      decorative: number;       // Properly marked decorative
    };
  };

  visualEntities: {
    entity: string;
    representation: 'photo' | 'logo' | 'diagram' | 'chart' | 'illustration';
    caption: string | null;
    context: string;            // How it's presented in content
  }[];

  mediaRichness: {
    hasVideo: boolean;
    videoSources: string[];     // YouTube, Vimeo, self-hosted
    hasAudio: boolean;
    hasInteractive: boolean;    // Calculators, quizzes, tools
    hasDownloadable: boolean;   // PDFs, templates, checklists
    downloadableTypes: string[];
    hasEmbed: boolean;          // Twitter, Instagram, etc.
  };

  layoutAnalysis: {
    pattern: 'long-form' | 'scannable' | 'card-based' | 'comparison-table' | 'step-by-step' | 'mixed';
    hasTables: boolean;
    tableCount: number;
    hasLists: boolean;
    listCount: number;
    hasBlockquotes: boolean;
    hasCallouts: boolean;       // Tip boxes, warnings, notes
    hasCodeBlocks: boolean;
  };

  visualSeoScore: number;       // 0-100 composite
}
```

### 4. Link Layer Analysis

```typescript
interface LinkLayerAnalysis {
  internal: {
    total: number;
    unique: number;

    links: {
      href: string;
      anchorText: string;
      context: string;          // Surrounding sentence
      placement: 'in-content' | 'sidebar' | 'footer' | 'nav' | 'related-posts';
      followStatus: 'follow' | 'nofollow';
      isImage: boolean;
    }[];

    patterns: {
      toHubPages: string[];         // Links to identified hub/pillar pages
      toCategoryPages: string[];
      toRelatedPosts: string[];
      contextualVsNavigational: {
        contextual: number;         // In-content links
        navigational: number;       // Nav, sidebar, footer
      };
    };

    anchorTextAnalysis: {
      exact: number;                // Exact match keywords
      partial: number;              // Partial match
      branded: number;
      generic: number;              // "click here", "read more"
      naked: number;                // Raw URLs
    };
  };

  bridgeTopics: {
    topic: string;
    function: 'connects' | 'supports' | 'expands';
    connectsClusters: string[];     // Which topic clusters this bridges
    linkJuiceFlow: 'inbound' | 'outbound' | 'bidirectional';
    strategicValue: 'high' | 'medium' | 'low';
  }[];

  siloing: {
    detectedSilo: string | null;    // What silo/category this belongs to
    siloDepth: number;              // How deep in hierarchy (1 = top level)
    siloHubPage: string | null;     // Parent hub/pillar page
    crossSiloLinks: {
      toSilo: string;
      count: number;
    }[];
    siloIntegrity: number;          // 0-100, how well-contained
  };

  hubSpokeAnalysis: {
    isHub: boolean;
    isSpoke: boolean;
    hubPage: string | null;
    spokePages: string[];
    hubLinkCount: number;           // Links from hub to this
    spokeToHubLinks: number;        // Links from this to hub
  };

  external: {
    total: number;

    links: {
      href: string;
      domain: string;
      anchorText: string;
      followStatus: 'follow' | 'nofollow' | 'sponsored' | 'ugc';
      type: 'citation' | 'resource' | 'commercial' | 'social';
    }[];

    authoritative: string[];        // .edu, .gov, Wikipedia, etc.
    citations: string[];            // Academic/research citations
    commercialPartners: string[];   // Affiliate, sponsored
  };

  linkingScore: number;             // 0-100 composite
}
```

### 5. SERP Features Analysis

```typescript
interface SerpFeaturesAnalysis {
  query: string;                    // The query this analysis is for
  serpSnapshot: Date;               // When SERP was checked

  currentlyOwns: {
    featuredSnippet: {
      owns: boolean;
      type: 'paragraph' | 'list' | 'table' | null;
      content: string | null;
    };

    peopleAlsoAsk: {
      appears: boolean;
      questions: string[];          // Which PAA questions they appear in
      position: number[];           // Position in PAA for each
    };

    imagePack: {
      appears: boolean;
      imageCount: number;
      position: number | null;
    };

    videoCarousel: {
      appears: boolean;
      videoCount: number;
      source: string | null;        // YouTube channel, etc.
    };

    knowledgePanel: {
      appears: boolean;
      type: string | null;          // Brand, Person, Organization
      attributes: string[];
    };

    localPack: {
      appears: boolean;
      position: number | null;
    };

    sitelinks: {
      has: boolean;
      links: string[];
    };

    reviews: {
      has: boolean;
      rating: number | null;
      count: number | null;
      source: string | null;        // Google, third-party
    };

    breadcrumbs: {
      shows: boolean;
      structure: string[];
    };

    faq: {
      shows: boolean;
      questionCount: number;
    };

    howTo: {
      shows: boolean;
      stepCount: number;
    };
  };

  eligibleFor: {
    feature: string;
    currentStatus: 'has' | 'close' | 'missing';
    requirements: string[];
    blockers: string[];
    difficulty: 'easy' | 'medium' | 'hard';
    estimatedImpact: 'high' | 'medium' | 'low';
    implementation: string;
  }[];

  aiOverview: {
    present: boolean;               // Is AI Overview shown for this query?
    mentioned: boolean;             // Is this competitor mentioned in it?
    citedAs: string | null;         // How they're referenced
    position: number | null;        // Citation position
    competitorsMentioned: string[]; // Other sites mentioned
  };

  serpPosition: {
    organic: number | null;
    withFeatures: number | null;    // Position considering all SERP features
  };

  serpFeatureScore: number;         // 0-100 composite
}
```

### 6. Authority Layer Analysis (E-E-A-T)

```typescript
interface AuthorityLayerAnalysis {
  author: {
    hasAuthor: boolean;
    name: string | null;

    authorPage: {
      exists: boolean;
      url: string | null;
      hasSchema: boolean;
    };

    credentials: {
      titles: string[];             // MD, PhD, CPA, etc.
      positions: string[];          // CEO, Editor, etc.
      organizations: string[];
      yearsExperience: number | null;
    };

    linkedProfiles: {
      platform: string;
      url: string;
      verified: boolean;
    }[];

    authorScore: number;            // 0-100
  };

  expertise: {
    citesResearch: boolean;
    researchCitations: {
      title: string;
      source: string;
      year: number | null;
    }[];

    citesExperts: boolean;
    expertQuotes: {
      name: string;
      credentials: string;
      quote: string;
    }[];

    hasOriginalData: boolean;
    originalDataTypes: string[];    // Survey, study, analysis

    industryRecognition: string[];  // Awards, features, certifications

    expertiseScore: number;         // 0-100
  };

  trust: {
    hasReviews: boolean;
    reviewPlatforms: string[];
    averageRating: number | null;

    hasTestimonials: boolean;
    testimonialCount: number;

    hasCertifications: boolean;
    certifications: string[];       // BBB, SSL, industry certs

    legalPages: {
      privacyPolicy: boolean;
      termsOfService: boolean;
      disclaimer: boolean;
    };

    contactInfo: {
      hasEmail: boolean;
      hasPhone: boolean;
      hasAddress: boolean;
      hasSocial: boolean;
    };

    trustScore: number;             // 0-100
  };

  freshness: {
    publishDate: Date | null;
    lastUpdated: Date | null;
    showsLastUpdated: boolean;

    updateFrequency: 'never' | 'yearly' | 'quarterly' | 'monthly' | 'weekly' | 'unknown';

    contentAge: number;             // Days since publish
    staleness: 'fresh' | 'current' | 'aging' | 'stale';

    freshnessScore: number;         // 0-100
  };

  eatScore: number;                 // 0-100 composite E-E-A-T score
}
```

### 7. Complete Competitor Analysis

```typescript
interface HolisticCompetitorAnalysis {
  // Metadata
  url: string;
  domain: string;
  crawledAt: Date;
  crawlMode: 'fast' | 'deep';
  topic: string;                    // The topic this analysis is for
  topicId: string;

  // Individual Layers
  content: ContentLayerAnalysis;
  technical: TechnicalLayerAnalysis;
  visual: VisualLayerAnalysis;
  linking: LinkLayerAnalysis;
  serpFeatures: SerpFeaturesAnalysis;
  authority: AuthorityLayerAnalysis;

  // Composite Scores
  scores: {
    content: number;
    technical: number;
    visual: number;
    linking: number;
    serpFeatures: number;
    authority: number;
    overall: number;                // Weighted composite
  };

  // Comparison (if we have our own page)
  comparison?: {
    ourUrl: string | null;
    ourScore: number | null;

    gaps: {
      layer: 'content' | 'technical' | 'visual' | 'linking' | 'serpFeatures' | 'authority';
      category: string;
      gap: string;
      theirValue: string;
      ourValue: string | null;
      impact: 'critical' | 'high' | 'medium' | 'low';
      actionable: string;
      effort: 'easy' | 'medium' | 'hard';
    }[];

    advantages: {
      layer: string;
      advantage: string;
      leverage: string;             // How to leverage this advantage
    }[];
  };

  // Strategic Insights
  insights: {
    whyTheyRank: string[];          // Key ranking factors identified
    beatableOn: string[];           // Where we can realistically beat them
    hardToBeat: string[];           // Where they have strong advantages
    quickWins: string[];            // Easy improvements we can make
  };
}
```

### 8. Topic-Level SERP Intelligence

```typescript
interface TopicSerpIntelligence {
  topicId: string;
  topicTitle: string;
  analyzedAt: Date;
  mode: 'fast' | 'deep';

  // SERP Overview
  serpOverview: {
    totalResults: number;
    dominantIntent: string;
    dominantContentType: string;
    avgWordCount: number;
    avgImageCount: number;

    contentTypeDistribution: {
      type: string;
      count: number;
      percentage: number;
    }[];

    featuresPresent: string[];

    difficultyAssessment: {
      score: number;                // 0-100
      factors: string[];
      recommendation: string;
    };
  };

  // Top 10 Analysis
  competitors: HolisticCompetitorAnalysis[];

  // Aggregated Patterns
  patterns: {
    headlines: {
      h1Patterns: string[];         // Common H1 structures
      h2Patterns: string[];
      commonPhrases: string[];
    };

    schema: {
      commonTypes: string[];
      requiredForRanking: string[];
      differentiators: string[];
    };

    linking: {
      avgInternalLinks: number;
      avgExternalLinks: number;
      commonLinkTargets: string[];
    };

    visual: {
      avgImages: number;
      commonImageTypes: string[];
      videoPresence: number;        // % of top 10 with video
    };

    authority: {
      avgEatScore: number;
      authorPresence: number;       // % with visible author
      expertQuotePresence: number;
    };
  };

  // Gap Analysis (What top 10 have that we don't)
  gaps: {
    content: string[];
    technical: string[];
    visual: string[];
    linking: string[];
    authority: string[];
  };

  // Opportunities (What no one is doing well)
  blueOcean: {
    opportunity: string;
    noneDoWell: boolean;
    implementation: string;
    potentialImpact: string;
  }[];

  // Action Plan
  actionPlan: {
    priority: number;
    action: string;
    layer: string;
    effort: 'easy' | 'medium' | 'hard';
    impact: 'high' | 'medium' | 'low';
    details: string;
  }[];
}
```

### 9. Volume Intelligence

```typescript
interface TopicVolumeIntelligence {
  topicId: string;
  topicTitle: string;
  fetchedAt: Date;

  // Primary: Traditional search volume
  searchVolume: {
    primary: {
      keyword: string;
      volume: number;
      difficulty: number;           // 0-100
      cpc: number | null;
    } | null;

    variants: {
      keyword: string;
      volume: number;
      difficulty: number;
      relevance: number;            // 0-1, how relevant to topic
    }[];

    clusteredTotal: number;         // Sum of all related

    trend: 'rising' | 'stable' | 'declining' | 'seasonal' | 'unknown';
    seasonality: {
      month: number;
      relativeVolume: number;
    }[] | null;

    source: 'semrush' | 'ahrefs' | 'dataforseo' | 'google' | 'estimated';
    confidence: number;             // 0-1
  };

  // Secondary: AI-era metrics
  aiVisibility: {
    mentionFrequency: number;       // How often in AI responses (0-100)
    citationLikelihood: number;     // Probability of being cited (0-1)
    aiOverviewPresence: boolean;    // Does AI Overview appear for this?

    queryTriggers: string[];        // Queries that surface this topic in AI

    source: 'manual-test' | 'estimated';
  } | null;

  // Fallback: Semantic importance
  semanticWeight: {
    eavCentrality: number;          // How connected in knowledge graph (0-1)
    competitorCoverage: number;     // % of competitors covering this (0-1)
    pillarAlignment: number;        // How core to strategy (0-1)
    clusterImportance: number;      // Importance within its cluster (0-1)
  };

  // Composite priority score
  priorityScore: {
    score: number;                  // 0-100

    breakdown: {
      volumeContribution: number;
      aiVisibilityContribution: number;
      competitorCoverageContribution: number;
      pillarAlignmentContribution: number;
    };

    recommendation: 'critical' | 'high' | 'medium' | 'low' | 'skip';
    reasoning: string;
  };
}
```

---

## Search Volume Challenges & Solutions

From discussion, user identified these challenges:

| Challenge | Problem | Solution |
|-----------|---------|----------|
| **AI Overviews/Zero-click** | No traditional search volume | Track "AI mention frequency" as proxy metric |
| **Foreign languages** | Limited tool coverage | Use DataForSEO API (multi-language), fall back to semantic weight |
| **Low volume keywords** | May not appear in tools | Use "topic clustering volume" - aggregate related queries |
| **Correct keyword wording** | Exact match matters for tools | Generate variants, fetch volume for each, use highest |
| **No data available** | Some topics have zero data | Fall back to semantic importance score |

### Priority Scoring Formula

```typescript
const calculatePriorityScore = (volume: TopicVolumeIntelligence): number => {
  const weights = {
    searchVolume: 0.30,
    aiVisibility: 0.20,
    competitorCoverage: 0.25,
    pillarAlignment: 0.25
  };

  const volumeScore = volume.searchVolume?.clusteredTotal
    ? Math.min(100, Math.log10(volume.searchVolume.clusteredTotal) * 25)
    : 0;

  const aiScore = volume.aiVisibility?.mentionFrequency || 0;

  const competitorScore = volume.semanticWeight.competitorCoverage * 100;

  const pillarScore = volume.semanticWeight.pillarAlignment * 100;

  const raw = (
    volumeScore * weights.searchVolume +
    aiScore * weights.aiVisibility +
    competitorScore * weights.competitorCoverage +
    pillarScore * weights.pillarAlignment
  );

  // Apply difficulty modifier if available
  const difficulty = volume.searchVolume?.primary?.difficulty || 50;
  const difficultyModifier = 1 - (difficulty / 200); // 0.5 to 1.0

  return Math.round(raw * difficultyModifier);
};
```

---

## Implementation Phases

### Phase 1: Foundation (Quick Wins)
**Status:** Partially Complete
**Priority:** Immediate

| Task | Status | Files |
|------|--------|-------|
| Cluster filter on Gap Graph | ✅ Done | `ComprehensiveAuditDashboard.tsx`, `useCompetitorGapNetwork.ts` |
| Map Audit Dashboard menu item | ✅ Done | `TabNavigation.tsx`, `ProjectDashboard.tsx` |
| Topic SERP Panel (basic) | 🔲 TODO | `TopicDetailPanel.tsx` (new section) |
| Brief SERP Integration | 🔲 TODO | `ContentBriefModal.tsx` (new tab) |

**Implementation Notes:**
- Topic SERP Panel should add "Analyze SERP" button to existing TopicDetailPanel
- Start with fast-track (AI-inferred) mode only
- Brief SERP Integration adds "SERP Intel" tab to ContentBriefModal

### Phase 2: Technical Layer
**Status:** Not Started
**Priority:** High
**Dependencies:** Phase 1 (Topic SERP Panel)

| Task | Files to Create/Modify |
|------|----------------------|
| Schema extraction service | `services/schemaExtractionService.ts` (new) |
| HTML semantic analyzer | `services/htmlSemanticAnalyzer.ts` (new) |
| Rich snippet eligibility checker | `services/richSnippetService.ts` (new) |
| Technical layer UI component | `components/analysis/TechnicalLayerAnalysis.tsx` (new) |
| Integration with Jina crawl | `services/jinaService.ts` (extend) |

**Implementation Notes:**
- Extend Jina service to extract raw HTML in addition to markdown
- Parse JSON-LD, microdata, RDFa from HTML
- Analyze heading hierarchy programmatically
- Check for semantic HTML5 tags

### Phase 3: Link Layer
**Status:** Not Started
**Priority:** High
**Dependencies:** Phase 2 (need HTML extraction)

| Task | Files to Create/Modify |
|------|----------------------|
| Internal link extractor | `services/linkAnalysisService.ts` (new) |
| Bridge topic identifier | `services/ai/bridgeTopicAnalysis.ts` (new) |
| Silo/hub detector | `services/siloAnalysisService.ts` (new) |
| Link layer UI component | `components/analysis/LinkLayerAnalysis.tsx` (new) |
| Link flow visualization | `components/visualization/LinkFlowGraph.tsx` (new) |

**Implementation Notes:**
- Extract all `<a>` tags with context
- Identify hub pages by link count patterns
- Detect silo structure by URL patterns and link clustering
- Bridge topics connect different topic clusters

### Phase 4: Visual Layer
**Status:** Not Started
**Priority:** Medium
**Dependencies:** Phase 2 (need HTML extraction)

| Task | Files to Create/Modify |
|------|----------------------|
| Image inventory extractor | `services/visualAnalysisService.ts` (new) |
| Image type classifier | `services/ai/imageClassifier.ts` (new) |
| Alt text quality analyzer | (part of visualAnalysisService) |
| Visual layer UI component | `components/analysis/VisualLayerAnalysis.tsx` (new) |
| Visual gap recommendations | (integrate with existing visualSemantics) |

**Implementation Notes:**
- Extract all `<img>`, `<video>`, `<iframe>` tags
- Use AI to classify image types (photo, diagram, chart, etc.)
- Score alt text quality programmatically
- Connect to existing `config/visualSemantics.ts` for recommendations

### Phase 5: Authority Layer (E-E-A-T)
**Status:** Not Started
**Priority:** Medium
**Dependencies:** Phases 2-4

| Task | Files to Create/Modify |
|------|----------------------|
| Author detection service | `services/authorDetectionService.ts` (new) |
| E-E-A-T signal extractor | `services/eatAnalysisService.ts` (new) |
| Citation/research finder | (part of eatAnalysisService) |
| Authority layer UI component | `components/analysis/AuthorityLayerAnalysis.tsx` (new) |
| E-E-A-T score calculator | (part of eatAnalysisService) |

**Implementation Notes:**
- Look for author schema, bylines, author pages
- Detect credentials (MD, PhD, etc.) in author bios
- Find research citations by URL patterns and formatting
- Check for trust signals (reviews, certifications, contact info)

### Phase 6: SERP Features
**Status:** Not Started
**Priority:** Medium
**Dependencies:** Phase 1

| Task | Files to Create/Modify |
|------|----------------------|
| SERP feature detector | `services/serpFeatureService.ts` (new) |
| AI Overview tracker | `services/aiOverviewService.ts` (new) |
| Feature eligibility calculator | (part of serpFeatureService) |
| SERP features UI component | `components/analysis/SerpFeaturesAnalysis.tsx` (new) |

**Implementation Notes:**
- May need SerpAPI or similar for actual SERP data
- AI Overview detection requires testing actual queries
- Eligibility calculation based on schema presence, content structure

### Phase 7: Intelligence & Prioritization
**Status:** Not Started
**Priority:** High (but depends on earlier phases)
**Dependencies:** All previous phases

| Task | Files to Create/Modify |
|------|----------------------|
| Volume intelligence service | `services/volumeIntelligenceService.ts` (new) |
| Composite scoring algorithm | `utils/competitiveScoring.ts` (new) |
| Priority recommendation engine | `services/priorityRecommendationService.ts` (new) |
| Action roadmap generator | `services/actionRoadmapService.ts` (new) |
| Priority dashboard UI | `components/dashboard/PriorityDashboard.tsx` (new) |

**Implementation Notes:**
- Volume service should support multiple data providers with fallback
- Scoring algorithm uses weights from discussion
- Action roadmap should be exportable and trackable

---

## UI/UX Design Notes

### Topic SERP Panel (Phase 1)

```
┌─────────────────────────────────────────────────────────────┐
│ Topic: "Best Running Shoes for Flat Feet"                   │
├─────────────────────────────────────────────────────────────┤
│ [⚡ Quick Analysis]  [🔬 Deep Dive]     Last: Never         │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📊 SERP Snapshot                                        │ │
│ │ ├── Intent: Commercial Investigation                    │ │
│ │ ├── Dominant Format: Listicle (7/10)                   │ │
│ │ ├── Avg Word Count: 2,450                              │ │
│ │ ├── Schema Required: Product, FAQ                       │ │
│ │ └── Top Headlines:                                      │ │
│ │     • "15 Best Running Shoes for Flat Feet 2024"       │ │
│ │     • "Expert Picks: Running Shoes for Flat Feet"      │ │
│ │     • "Flat Feet? Here Are the Best Running Shoes"     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🎯 Your Gap Score: 34%                                  │ │
│ │ Critical Gaps:                                          │ │
│ │ • Missing FAQ schema (7/10 competitors have)           │ │
│ │ • No expert quotes (8/10 competitors have)             │ │
│ │ • Missing comparison table (6/10 competitors have)     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📈 Priority Score: 78/100                               │ │
│ │ Volume: ~8,100/mo (clustered: 24,500)                  │ │
│ │ Difficulty: Medium (62)                                 │ │
│ │ Recommendation: HIGH PRIORITY - Good opportunity        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [View Full Analysis] [Generate Brief with SERP Data]        │
└─────────────────────────────────────────────────────────────┘
```

### Complete Analysis View (All Layers)

```
┌─────────────────────────────────────────────────────────────────────┐
│ Competitive Analysis: "Best Running Shoes for Flat Feet"            │
├─────────────────────────────────────────────────────────────────────┤
│ [Content] [Technical] [Visual] [Linking] [SERP] [Authority] [All]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Competitor Comparison (Top 5)                                       │
│  ┌────────────┬────────┬────────┬────────┬────────┬────────┬──────┐ │
│  │ Domain     │Content │Tech    │Visual  │Links   │SERP    │E-E-A-T│
│  ├────────────┼────────┼────────┼────────┼────────┼────────┼──────┤ │
│  │ runner.com │  92    │  88    │  76    │  94    │  85    │  91  │ │
│  │ shoes.net  │  87    │  91    │  82    │  78    │  72    │  84  │ │
│  │ health.com │  84    │  72    │  68    │  82    │  91    │  96  │ │
│  │ review.io  │  79    │  85    │  91    │  71    │  68    │  72  │ │
│  │ YOUR SITE  │  65    │  42    │  38    │  56    │  21    │  58  │ │
│  └────────────┴────────┴────────┴────────┴────────┴────────┴──────┘ │
│                                                                      │
│  🎯 Priority Actions                                                 │
│  ┌────┬─────────────────────────────────┬────────┬────────┬───────┐ │
│  │ #  │ Action                          │ Layer  │ Impact │Effort │ │
│  ├────┼─────────────────────────────────┼────────┼────────┼───────┤ │
│  │ 1  │ Add FAQ schema                  │ Tech   │ High   │ Easy  │ │
│  │ 2  │ Add comparison table            │ Visual │ High   │ Medium│ │
│  │ 3  │ Link from "Foot Health" hub     │ Links  │ High   │ Easy  │ │
│  │ 4  │ Add expert podiatrist quote     │ E-E-A-T│ High   │ Medium│ │
│  │ 5  │ Create product schema           │ Tech   │ Medium │ Easy  │ │
│  └────┴─────────────────────────────────┴────────┴────────┴───────┘ │
│                                                                      │
│  [Export Action Plan]  [Generate Content Brief]  [Track Progress]   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema Additions

```sql
-- Topic-level SERP analysis results
CREATE TABLE topic_serp_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  map_id UUID REFERENCES topical_maps(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  mode VARCHAR(10) NOT NULL CHECK (mode IN ('fast', 'deep')),
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Stored as JSONB for flexibility
  serp_overview JSONB,           -- SerpOverview type
  competitors JSONB,             -- HolisticCompetitorAnalysis[]
  patterns JSONB,                -- Aggregated patterns
  gaps JSONB,                    -- Gap analysis
  action_plan JSONB,             -- Prioritized actions

  -- Volume data (may be fetched separately)
  volume_data JSONB,             -- TopicVolumeIntelligence

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX idx_topic_serp_topic ON topic_serp_analysis(topic_id);
CREATE INDEX idx_topic_serp_map ON topic_serp_analysis(map_id);
CREATE INDEX idx_topic_serp_date ON topic_serp_analysis(analyzed_at DESC);

-- Competitor page cache (avoid re-crawling)
CREATE TABLE competitor_page_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  domain TEXT NOT NULL,

  crawled_at TIMESTAMPTZ DEFAULT NOW(),
  mode VARCHAR(10) NOT NULL CHECK (mode IN ('fast', 'deep')),

  -- Raw data
  raw_html TEXT,                 -- For deep mode
  raw_markdown TEXT,             -- From Jina

  -- Parsed layers (JSONB)
  content_layer JSONB,
  technical_layer JSONB,
  visual_layer JSONB,
  link_layer JSONB,
  authority_layer JSONB,

  -- Composite scores
  scores JSONB,

  -- Cache control
  expires_at TIMESTAMPTZ,        -- When to re-crawl

  UNIQUE(url, mode)
);

CREATE INDEX idx_competitor_cache_url ON competitor_page_cache(url);
CREATE INDEX idx_competitor_cache_domain ON competitor_page_cache(domain);
CREATE INDEX idx_competitor_cache_expires ON competitor_page_cache(expires_at);

-- Volume data cache
CREATE TABLE volume_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL,
  language VARCHAR(10) DEFAULT 'en',

  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  source VARCHAR(50) NOT NULL,   -- semrush, ahrefs, dataforseo, estimated

  volume_data JSONB NOT NULL,    -- Full TopicVolumeIntelligence

  expires_at TIMESTAMPTZ,

  UNIQUE(keyword, language, source)
);

CREATE INDEX idx_volume_cache_keyword ON volume_cache(keyword);
```

---

## API Integrations Required

| Service | Purpose | Phase | Required |
|---------|---------|-------|----------|
| **Jina Reader** | Page content extraction | 1+ | Yes (existing) |
| **Perplexity** | AI-inferred SERP analysis | 1 | Yes (existing) |
| **SerpAPI / DataForSEO** | Actual SERP data | 6 | Optional (enhances accuracy) |
| **DataForSEO / SEMrush** | Search volume data | 7 | Optional (can estimate) |
| **Google Knowledge Graph** | Entity verification | 5 | Yes (existing) |

---

## Success Metrics

### Phase 1 Success
- [ ] Users can filter gap graph by topic cluster
- [ ] Topic detail panel shows basic SERP analysis
- [ ] Content brief modal has SERP Intel tab

### Phase 2-6 Success
- [ ] Each layer extracts 90%+ of specified data points
- [ ] Analysis completes in <60 seconds (deep mode)
- [ ] Analysis completes in <10 seconds (fast mode)
- [ ] Composite scores correlate with actual rankings (validation needed)

### Phase 7 Success
- [ ] Priority recommendations match user intuition 80%+ of time
- [ ] Volume data available for 70%+ of topics
- [ ] Action roadmap items are actionable and specific
- [ ] Users report improved content planning efficiency

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| API costs for deep analysis | High | Implement aggressive caching, offer fast-track as default |
| Schema extraction complexity | Medium | Start with JSON-LD only, add microdata later |
| Volume data accuracy | Medium | Use multiple sources, show confidence level |
| Analysis time for large maps | High | Batch processing, background jobs, progressive loading |
| Competitor page structure changes | Low | Graceful degradation, "unknown" fallbacks |

---

## Open Questions for Implementation

1. **Caching strategy:** How long to cache competitor analysis? (Suggest: 7 days for deep, 1 day for fast)

2. **Batch vs on-demand:** Should we pre-analyze all topics or wait for user request? (Suggest: on-demand with optional batch)

3. **Volume data source:** Which API to use for search volume? (Suggest: start with DataForSEO, it's cost-effective)

4. **SERP data source:** Real SERP API or AI-inferred? (Suggest: AI-inferred for MVP, real SERP as premium)

5. **Score weights:** Should users be able to customize layer weights? (Suggest: yes, with sensible defaults)

---

## Appendix: Key Quotes from Discussion

> "In the old SEO ways I would look at the competitor websites per topic, find the keywords, find all headlines from the top 10 ranking, get the semantic context and the type of pages expected and then based on search volume I would start to create the content for those topics first."

> "Should this not be content brief per topic? Especially the core topics? I think it would be an actual view of the market that the specific topic is covering."

> "If the user wants a fast-track that would be AI inferred, however if the user wants to be in depth, accurate it means actual SERP crawling."

> "Gap analysis should appear in: separate view per topic, embedded in brief, AND filter on existing visualization."

> "Search volume is vital in deciding what should have priority since that is what actual users are looking for."

> "In the holistic view there must be an HTML technical analysis as well - how about schema, how about rich snippets, how about markup, how about visual semantics? All those things are key part of the system."

> "Same as in-depth linking, bridge topics etc, they provide more link juice, topical authority and trust than anything else."

> "If the roadmap is to be complete these type of factors and probably more need to be taken into account for analysis and making decisions on - otherwise it is still just what the rest of the market already has and hence not very unique and good."

---

## Document History

| Date | Author | Changes |
|------|--------|---------|
| 2024-12-24 | Claude + User | Initial creation from brainstorming session |

---

*This document should be referenced when implementing the Topic-Level Competitive Intelligence system. All type definitions are ready for implementation. The phased approach allows incremental value delivery while building toward the complete vision.*
