# Gamification Implementation Plan for CutTheCrap.net

**Project:** Cost of Retrieval Reducer - Gamification System
**Brand:** CutTheCrap.net — "No fluff, just ranking"
**Created:** 2026-01-06
**Status:** Planning Phase

---

## Executive Summary

This plan outlines a comprehensive gamification system designed to:
1. **Build user confidence** through clarity and explainability
2. **Prioritize quality** over mere completion
3. **Make the experience fun** while remaining professional
4. **Address the "too much content" objection** through clear prioritization

### Core Design Philosophy
> "Serious Results, Playful Journey"
> The data is professional. The experience is delightful.

---

## Feature Priority Matrix

| Priority | Feature | Impact | Effort | Status |
|----------|---------|--------|--------|--------|
| 🔴 P1 | Semantic Authority Score | High | Medium | To Build |
| 🔴 P1 | Confidence Dashboard | High | Medium | To Build |
| 🔴 P1 | Priority Tiering System | High | Low | To Build |
| 🟡 P2 | Progress Messages (CutTheCrap Voice) | Medium | Low | To Build |
| 🟡 P2 | Ready to Publish Checklist | Medium | Low | To Build |
| 🟡 P2 | Celebration Animations | Medium | Low | To Build |
| 🟢 P3 | Achievements & Badges | Low | Medium | To Build |
| 🟢 P3 | Contextual "Why" Tooltips | Low | Low | To Build |
| 🟢 P3 | Sound Design | Low | Low | To Build |

---

# PRIORITY 1 FEATURES (Build First)

---

## Feature 1: Semantic Authority Score

### 1.1 Overview

A single, always-visible score (0-100) that answers: **"How good is my map?"**

The score provides instant feedback on map quality and guides users toward optimization opportunities.

### 1.2 Score Components

The overall score is calculated from 5 weighted sub-scores:

| Sub-Score | Weight | What It Measures |
|-----------|--------|------------------|
| Entity Clarity | 25% | Central entity definition quality, E-A-V completeness |
| Topical Coverage | 25% | Semantic space coverage, topic count vs expected |
| Intent Alignment | 20% | Topics matching actual search intents |
| Competitive Parity | 15% | Coverage compared to top competitors |
| Content Readiness | 15% | Brief completion and optimization status |

### 1.3 Score Calculation Logic

```typescript
interface SemanticAuthorityScore {
  overall: number; // 0-100
  breakdown: {
    entityClarity: SubScore;
    topicalCoverage: SubScore;
    intentAlignment: SubScore;
    competitiveParity: SubScore;
    contentReadiness: SubScore;
  };
  tier: ScoreTier;
  message: string;
}

interface SubScore {
  score: number; // 0-100
  weight: number;
  label: string; // Fun label like "Nailed it"
  details: string[];
  improvements: string[];
}

type ScoreTier =
  | 'just-starting'    // 0-30
  | 'building-momentum' // 31-50
  | 'getting-serious'   // 51-70
  | 'looking-sharp'     // 71-85
  | 'almost-elite'      // 86-95
  | 'absolute-unit';    // 96-100
```

#### Entity Clarity Calculation (25%)

```typescript
function calculateEntityClarity(map: TopicalMap): number {
  let score = 0;

  // Central entity defined (0-20 points)
  if (map.businessInfo?.centralEntity) score += 10;
  if (map.businessInfo?.entityType) score += 10;

  // E-A-V completeness (0-40 points)
  const eavCount = map.eavs?.length || 0;
  if (eavCount >= 50) score += 40;
  else if (eavCount >= 30) score += 30;
  else if (eavCount >= 15) score += 20;
  else if (eavCount >= 5) score += 10;

  // E-A-V category distribution (0-20 points)
  const hasUniqueEavs = map.eavs?.some(e => e.category === 'UNIQUE');
  const hasRootEavs = map.eavs?.some(e => e.category === 'ROOT');
  const hasCommonEavs = map.eavs?.some(e => e.category === 'COMMON');
  if (hasUniqueEavs) score += 8;
  if (hasRootEavs) score += 7;
  if (hasCommonEavs) score += 5;

  // Business info completeness (0-20 points)
  const bizInfo = map.businessInfo;
  if (bizInfo?.domain) score += 5;
  if (bizInfo?.projectName) score += 5;
  if (bizInfo?.targetAudience) score += 5;
  if (bizInfo?.uniqueSellingPoints?.length > 0) score += 5;

  return Math.min(100, score);
}
```

#### Topical Coverage Calculation (25%)

```typescript
function calculateTopicalCoverage(map: TopicalMap): number {
  let score = 0;

  const topicCount = map.topics?.length || 0;
  const expectedTopics = calculateExpectedTopics(map); // Based on entity type

  // Topic count vs expected (0-50 points)
  const coverageRatio = topicCount / expectedTopics;
  score += Math.min(50, Math.round(coverageRatio * 50));

  // Pillar coverage (0-25 points)
  const pillars = map.pillars || [];
  const topicsPerPillar = pillars.map(p =>
    map.topics?.filter(t => t.pillarId === p.id).length || 0
  );
  const avgTopicsPerPillar = topicsPerPillar.reduce((a,b) => a+b, 0) / pillars.length;
  if (avgTopicsPerPillar >= 5) score += 25;
  else if (avgTopicsPerPillar >= 3) score += 15;
  else if (avgTopicsPerPillar >= 1) score += 5;

  // Topic depth - has both core and outer topics (0-25 points)
  const coreTopics = map.topics?.filter(t => t.isCore).length || 0;
  const outerTopics = map.topics?.filter(t => !t.isCore).length || 0;
  if (coreTopics > 0 && outerTopics > 0) score += 15;
  if (outerTopics >= coreTopics * 2) score += 10;

  return Math.min(100, score);
}
```

#### Intent Alignment Calculation (20%)

```typescript
function calculateIntentAlignment(map: TopicalMap): number {
  let score = 0;

  const topics = map.topics || [];
  const topicsWithIntent = topics.filter(t => t.searchIntent);

  // Intent coverage (0-40 points)
  const intentCoverage = topicsWithIntent.length / topics.length;
  score += Math.round(intentCoverage * 40);

  // Intent diversity (0-30 points)
  const intents = new Set(topicsWithIntent.map(t => t.searchIntent));
  if (intents.has('informational')) score += 10;
  if (intents.has('commercial')) score += 10;
  if (intents.has('transactional')) score += 10;

  // Buyer intent presence (0-30 points)
  const buyerIntentTopics = topics.filter(t =>
    t.searchIntent === 'commercial' || t.searchIntent === 'transactional'
  );
  const buyerRatio = buyerIntentTopics.length / topics.length;
  if (buyerRatio >= 0.3) score += 30;
  else if (buyerRatio >= 0.2) score += 20;
  else if (buyerRatio >= 0.1) score += 10;

  return Math.min(100, score);
}
```

#### Competitive Parity Calculation (15%)

```typescript
function calculateCompetitiveParity(map: TopicalMap): number {
  const competitors = map.competitors || [];
  if (competitors.length === 0) return 50; // Neutral if no competitors

  let score = 0;

  // Has competitors defined (0-20 points)
  score += Math.min(20, competitors.length * 7);

  // Topic gap analysis (0-80 points)
  const competitorTopics = getCompetitorTopics(competitors);
  const ourTopics = new Set(map.topics?.map(t => t.title.toLowerCase()));

  const gaps = competitorTopics.filter(t => !ourTopics.has(t.toLowerCase()));
  const gapRatio = 1 - (gaps.length / competitorTopics.length);
  score += Math.round(gapRatio * 80);

  return Math.min(100, score);
}
```

#### Content Readiness Calculation (15%)

```typescript
function calculateContentReadiness(map: TopicalMap, briefs: ContentBrief[]): number {
  const topics = map.topics || [];
  if (topics.length === 0) return 0;

  let score = 0;

  // Briefs generated (0-40 points)
  const briefsGenerated = briefs.length;
  const briefRatio = briefsGenerated / topics.length;
  score += Math.round(briefRatio * 40);

  // Brief quality (0-40 points)
  const completeBriefs = briefs.filter(b =>
    b.structured_outline?.sections?.length > 0 &&
    b.meta_description &&
    b.h1
  );
  const qualityRatio = completeBriefs.length / Math.max(1, briefs.length);
  score += Math.round(qualityRatio * 40);

  // Drafts created (0-20 points)
  const draftsCreated = briefs.filter(b => b.article_draft?.length > 100).length;
  const draftRatio = draftsCreated / Math.max(1, topics.length);
  score += Math.round(draftRatio * 20);

  return Math.min(100, score);
}
```

### 1.4 Score Tiers & Messaging

```typescript
const SCORE_TIERS: Record<ScoreTier, TierConfig> = {
  'just-starting': {
    range: [0, 30],
    emoji: '🌱',
    label: 'Just Getting Started',
    message: "Every expert was once a beginner. Let's build your foundation.",
    color: '#6B7280', // gray
    animation: 'gentle-pulse'
  },
  'building-momentum': {
    range: [31, 50],
    emoji: '🚀',
    label: 'Building Momentum',
    message: "You're picking up steam. The map is taking shape.",
    color: '#3B82F6', // blue
    animation: 'upward-sparkles'
  },
  'getting-serious': {
    range: [51, 70],
    emoji: '💪',
    label: 'Getting Serious',
    message: "Now we're talking. Your semantic foundation is solid.",
    color: '#8B5CF6', // purple
    animation: 'steady-glow'
  },
  'looking-sharp': {
    range: [71, 85],
    emoji: '🔥',
    label: 'Looking Sharp',
    message: "This is quality work. You're ahead of most.",
    color: '#F59E0B', // amber
    animation: 'fire-particles'
  },
  'almost-elite': {
    range: [86, 95],
    emoji: '⚡',
    label: 'Almost Elite',
    message: "So close to perfection. A few tweaks and you're there.",
    color: '#EF4444', // red
    animation: 'electric-crackle'
  },
  'absolute-unit': {
    range: [96, 100],
    emoji: '🏆',
    label: 'Absolute Unit',
    message: "This is elite-level SEO. No fluff, pure ranking potential.",
    color: '#10B981', // emerald
    animation: 'confetti-burst'
  }
};
```

### 1.5 Sub-Score Labels

```typescript
const SUB_SCORE_LABELS: Record<string, (score: number) => string> = {
  entityClarity: (score) => {
    if (score >= 90) return "Crystal clear";
    if (score >= 70) return "Well-defined";
    if (score >= 50) return "Getting there";
    if (score >= 30) return "Needs focus";
    return "Undefined";
  },
  topicalCoverage: (score) => {
    if (score >= 90) return "Comprehensive";
    if (score >= 70) return "Strong foundation";
    if (score >= 50) return "Building up";
    if (score >= 30) return "Sparse";
    return "Empty";
  },
  intentAlignment: (score) => {
    if (score >= 90) return "Laser-targeted";
    if (score >= 70) return "Well-aligned";
    if (score >= 50) return "Partially aligned";
    if (score >= 30) return "Needs work";
    return "Misaligned";
  },
  competitiveParity: (score) => {
    if (score >= 90) return "Dominating";
    if (score >= 70) return "Competitive";
    if (score >= 50) return "Holding ground";
    if (score >= 30) return "Falling behind";
    return "Outmatched";
  },
  contentReadiness: (score) => {
    if (score >= 90) return "Ready to publish";
    if (score >= 70) return "Almost there";
    if (score >= 50) return "In progress";
    if (score >= 30) return "Early stages";
    return "Not started";
  }
};
```

### 1.6 Component Structure

```
components/gamification/
├── score/
│   ├── SemanticAuthorityScore.tsx      # Main score display
│   ├── ScoreRing.tsx                   # Animated circular progress
│   ├── SubScoreCard.tsx                # Individual sub-score display
│   ├── ScoreBreakdown.tsx              # Expandable breakdown view
│   ├── ScoreTierBadge.tsx              # Tier label with emoji
│   └── ScoreChangeToast.tsx            # "+5 points" notification
├── hooks/
│   ├── useSemanticScore.ts             # Score calculation hook
│   └── useScoreAnimation.ts            # Animation state management
└── utils/
    └── scoreCalculations.ts            # Pure calculation functions
```

### 1.7 UI Specifications

#### Main Score Ring Component

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│            ╭─────────────────────╮                  │
│          ╭─╯                     ╰─╮                │
│         ╭╯    ┌───────────────┐   ╰╮               │
│        ╭╯     │   ✨ 73 ✨    │    ╰╮              │
│       ╭╯      │               │     ╰╮             │
│       │       │  Looking      │      │             │
│       │       │   Sharp       │      │             │
│       ╰╮      │               │     ╭╯             │
│        ╰╮     └───────────────┘    ╭╯              │
│         ╰╮                        ╭╯               │
│          ╰─╮                    ╭─╯                │
│            ╰────────────────────╯                  │
│                                                     │
│     Ring: Animated progress (73% filled)           │
│     Color: Tier-based (#F59E0B for 71-85)         │
│     Animation: Fire particles on hover            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### Score Ring Specifications:
- **Size:** 180px diameter (responsive)
- **Stroke width:** 12px
- **Background stroke:** #374151 (gray-700)
- **Progress stroke:** Tier color with gradient
- **Animation:**
  - On load: Animate from 0 to current value (1.5s ease-out)
  - On change: Smooth transition to new value (0.5s)
  - Idle: Subtle glow pulse (2s infinite)

#### Sub-Score Display

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  🎯 Entity Clarity          ████████████░░  92%    │
│     "Crystal clear"                                 │
│                                                     │
│  🗺️ Topical Coverage        ████████████░░  82%    │
│     "Strong foundation"                             │
│                                                     │
│  🎪 Intent Alignment        ████████░░░░░░  71%    │
│     "Needs work"                                    │
│                                                     │
│  🆚 Competitive Parity      ██████████░░░░  78%    │
│     "Competitive"                                   │
│                                                     │
│  📝 Content Readiness       ██████░░░░░░░░  45%    │
│     "In progress"                                   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 1.8 Animation Specifications

| Animation | Trigger | Duration | Effect |
|-----------|---------|----------|--------|
| Score increase | Score goes up | 0.5s | Number bounces, sparkles emit |
| Level up | Tier threshold crossed | 1.5s | Flash, confetti, new badge slides in |
| Score decrease | Score goes down | 0.3s | Gentle shake, no celebration |
| Idle pulse | Always (subtle) | 2s loop | Soft glow on ring |
| Hover | Mouse over score | 0.2s | Scale 1.05, show breakdown |

### 1.9 Data Requirements

**From existing data:**
- `topicalMap.businessInfo` - Entity clarity
- `topicalMap.eavs` - E-A-V completeness
- `topicalMap.topics` - Topic coverage
- `topicalMap.pillars` - Pillar structure
- `topicalMap.competitors` - Competitor list
- `contentBriefs[]` - Brief status

**New data needed:**
- Competitor topic analysis (can be computed)
- Expected topic count per entity type (configuration)
- Historical score tracking (new table: `score_history`)

### 1.10 Database Schema Addition

```sql
-- Track score history for progress visualization
CREATE TABLE IF NOT EXISTS score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID NOT NULL REFERENCES topical_maps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  entity_clarity INTEGER NOT NULL,
  topical_coverage INTEGER NOT NULL,
  intent_alignment INTEGER NOT NULL,
  competitive_parity INTEGER NOT NULL,
  content_readiness INTEGER NOT NULL,
  tier VARCHAR(50) NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_map_timestamp UNIQUE (map_id, recorded_at)
);

-- Index for efficient queries
CREATE INDEX idx_score_history_map ON score_history(map_id, recorded_at DESC);

-- RLS policies
ALTER TABLE score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own score history"
  ON score_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own score history"
  ON score_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

---

## Feature 2: Confidence Dashboard

### 2.1 Overview

A dedicated view answering: **"Did I do this right?"**

The dashboard explains WHY the map is structured as it is, addresses the "too much content" concern, and shows competitive positioning.

### 2.2 Dashboard Sections

```typescript
interface ConfidenceDashboard {
  mapSummary: MapSummary;
  entityAnalysis: EntityAnalysis;
  topicRationale: TopicRationale;
  competitorComparison: CompetitorComparison;
  impactProjection: ImpactProjection;
}

interface MapSummary {
  mapName: string;
  createdAt: Date;
  lastUpdated: Date;
  overallScore: number;
  tier: ScoreTier;
  quickStats: {
    topicCount: number;
    briefsComplete: number;
    eavCount: number;
    competitorsCovered: number;
  };
}

interface EntityAnalysis {
  centralEntity: string;
  entityType: string;
  clarityScore: number;
  strengths: string[];
  improvements: string[];
  funFact: string; // "This puts you ahead of 89% of agency sites"
}

interface TopicRationale {
  totalTopics: number;
  breakdown: {
    directSupport: { count: number; description: string };
    semanticBridges: { count: number; description: string };
    buyerIntent: { count: number; description: string };
    eeatCredibility: { count: number; description: string };
  };
  excludedReasons: string[];
}

interface CompetitorComparison {
  yourTopicCount: number;
  avgCompetitorTopics: number;
  topCompetitorTopics: number;
  coveragePercentage: number;
  gaps: CompetitorGap[];
  advantages: string[];
}

interface ImpactProjection {
  visibilityIncrease: string; // "+340%"
  estimatedMonthlyVisitors: number;
  buyerIntentTopics: number;
  buyerIntentPercentage: number;
}
```

### 2.3 Component Structure

```
components/gamification/
├── dashboard/
│   ├── ConfidenceDashboard.tsx         # Main dashboard container
│   ├── MapReportCard.tsx               # Summary header
│   ├── EntityAnalysisCard.tsx          # Entity clarity section
│   ├── TopicRationaleCard.tsx          # "Why these topics?" section
│   ├── CompetitorShowdownCard.tsx      # Competitor comparison
│   ├── ImpactProjectionCard.tsx        # ROI estimates
│   ├── WhyTheseTopicsModal.tsx         # Detailed topic explainer
│   └── GapAnalysisModal.tsx            # Competitor gap details
└── shared/
    ├── ConfidenceCard.tsx              # Reusable card wrapper
    ├── ProgressBar.tsx                 # Horizontal progress bar
    ├── ComparisonBar.tsx               # Side-by-side comparison
    └── StatHighlight.tsx               # Big number with label
```

### 2.4 UI Specifications

#### Dashboard Layout (Desktop)

```
┌─────────────────────────────────────────────────────────────────────┐
│  CONFIDENCE DASHBOARD                                               │
│  "Here's why your map is solid (or what needs work)"                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────┐  ┌─────────────────────────────────┐  │
│  │                         │  │                                 │  │
│  │    SEMANTIC SCORE       │  │    QUICK STATS                  │  │
│  │         73              │  │    47 topics | 32 briefs        │  │
│  │     Looking Sharp       │  │    45 EAVs | 3 competitors      │  │
│  │                         │  │                                 │  │
│  └─────────────────────────┘  └─────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  ENTITY CLARITY                                        92/100 │ │
│  │  "Google knows EXACTLY who you are"                           │ │
│  │  [Details...]                                                 │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  WHY THESE 47 TOPICS?                                         │ │
│  │  23 direct support | 12 bridges | 8 buyer | 4 E-E-A-T        │ │
│  │  [See Full Breakdown →]                                       │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐ │
│  │  COMPETITOR SHOWDOWN        │  │  POTENTIAL IMPACT           │ │
│  │  89% coverage               │  │  +340% visibility           │ │
│  │  8 gaps to fill             │  │  12,400 monthly visits      │ │
│  │  [View Gaps →]              │  │  [See Breakdown →]          │ │
│  └─────────────────────────────┘  └─────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.5 "Why These Topics?" Logic

```typescript
function categorizeTopics(map: TopicalMap): TopicRationale {
  const topics = map.topics || [];

  const breakdown = {
    directSupport: {
      count: 0,
      description: "These are your bread and butter",
      topics: [] as Topic[]
    },
    semanticBridges: {
      count: 0,
      description: "These connect you to the bigger picture",
      topics: [] as Topic[]
    },
    buyerIntent: {
      count: 0,
      description: "These bring people ready to buy",
      topics: [] as Topic[]
    },
    eeatCredibility: {
      count: 0,
      description: "These prove you're the real deal",
      topics: [] as Topic[]
    }
  };

  topics.forEach(topic => {
    // Direct support: Core topics under main pillars
    if (topic.isCore) {
      breakdown.directSupport.count++;
      breakdown.directSupport.topics.push(topic);
    }
    // Buyer intent: Commercial/transactional intent
    else if (['commercial', 'transactional'].includes(topic.searchIntent || '')) {
      breakdown.buyerIntent.count++;
      breakdown.buyerIntent.topics.push(topic);
    }
    // E-E-A-T: Topics about expertise, credentials, process
    else if (isEEATTopic(topic)) {
      breakdown.eeatCredibility.count++;
      breakdown.eeatCredibility.topics.push(topic);
    }
    // Semantic bridges: Everything else (supporting context)
    else {
      breakdown.semanticBridges.count++;
      breakdown.semanticBridges.topics.push(topic);
    }
  });

  return {
    totalTopics: topics.length,
    breakdown,
    excludedReasons: [
      "Topics with < 10 monthly searches",
      "Topics with semantic distance > 3 from core entity",
      "Topics that would dilute rather than build authority"
    ]
  };
}

function isEEATTopic(topic: Topic): boolean {
  const eeatKeywords = [
    'about', 'team', 'expert', 'certified', 'experience',
    'case study', 'testimonial', 'review', 'award', 'credential',
    'methodology', 'process', 'approach', 'philosophy'
  ];
  const titleLower = topic.title.toLowerCase();
  return eeatKeywords.some(kw => titleLower.includes(kw));
}
```

### 2.6 Competitor Comparison Logic

```typescript
interface CompetitorAnalysis {
  competitor: string;
  topicCount: number;
  sharedTopics: string[];
  uniqueTopics: string[];
  gapOpportunities: GapOpportunity[];
}

interface GapOpportunity {
  topic: string;
  competitorsCovering: number;
  estimatedDifficulty: 'easy' | 'medium' | 'hard';
  priority: 'high' | 'medium' | 'low';
  rationale: string;
}

function analyzeCompetitorGaps(
  map: TopicalMap,
  competitorData: CompetitorData[]
): CompetitorComparison {
  const ourTopics = new Set(map.topics?.map(t => normalizeTopicTitle(t.title)));

  // Aggregate competitor topics
  const competitorTopicCounts: Map<string, number> = new Map();
  competitorData.forEach(competitor => {
    competitor.topics.forEach(topic => {
      const normalized = normalizeTopicTitle(topic);
      competitorTopicCounts.set(
        normalized,
        (competitorTopicCounts.get(normalized) || 0) + 1
      );
    });
  });

  // Find gaps (topics competitors have that we don't)
  const gaps: GapOpportunity[] = [];
  competitorTopicCounts.forEach((count, topic) => {
    if (!ourTopics.has(topic)) {
      gaps.push({
        topic,
        competitorsCovering: count,
        estimatedDifficulty: count >= 2 ? 'hard' : 'medium',
        priority: count >= 2 ? 'high' : 'medium',
        rationale: `${count} of your competitors rank for this topic`
      });
    }
  });

  // Sort by priority
  gaps.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const avgCompetitorTopics = competitorData.reduce(
    (sum, c) => sum + c.topics.length, 0
  ) / competitorData.length;

  return {
    yourTopicCount: ourTopics.size,
    avgCompetitorTopics: Math.round(avgCompetitorTopics),
    topCompetitorTopics: Math.max(...competitorData.map(c => c.topics.length)),
    coveragePercentage: Math.round(
      (ourTopics.size / (ourTopics.size + gaps.length)) * 100
    ),
    gaps,
    advantages: findAdvantages(ourTopics, competitorData)
  };
}
```

### 2.7 Copy/Messaging Guide

#### Entity Analysis Messages

```typescript
const ENTITY_MESSAGES = {
  excellent: {
    headline: "Google knows EXACTLY who you are",
    detail: "Your central entity is crystal clear with strong E-A-V coverage."
  },
  good: {
    headline: "Your identity is well-defined",
    detail: "A few more E-A-Vs would make your entity bulletproof."
  },
  needsWork: {
    headline: "Your entity needs more definition",
    detail: "Add more attributes to help Google understand what makes you unique."
  },
  poor: {
    headline: "Who are you, exactly?",
    detail: "Google is confused. Let's define your central entity properly."
  }
};
```

#### Topic Rationale Messages

```typescript
const TOPIC_RATIONALE_MESSAGES = {
  directSupport: "directly support your services",
  semanticBridges: "build semantic bridges to related concepts",
  buyerIntent: "capture high-intent buyer queries",
  eeatCredibility: "establish E-E-A-T credibility"
};

const EXCLUDED_TOPICS_EXPLAINER = `
We intentionally excluded topics that:
• Don't have meaningful search demand (< 10 monthly searches)
• Are semantically too far from your core entity (would confuse Google)
• Would dilute your authority rather than strengthen it

Quality over quantity. Always.
`;
```

#### Competitor Messages

```typescript
function getCompetitorMessage(coveragePercent: number, gapCount: number): string {
  if (coveragePercent >= 95) {
    return "You're covering virtually everything your competitors do. Dominance mode.";
  }
  if (coveragePercent >= 80) {
    return `Solid competitive position. ${gapCount} gaps to close for total coverage.`;
  }
  if (coveragePercent >= 60) {
    return `They've got ${gapCount} topics you don't. Let's close those gaps.`;
  }
  return `Significant gaps to address. Your competitors have a head start on ${gapCount} topics.`;
}
```

---

## Feature 3: Priority Tiering System

### 3.1 Overview

Addresses the "too much content" objection by organizing topics into clear priority tiers with actionable guidance.

### 3.2 Tier Definitions

```typescript
interface PriorityTier {
  id: 'core' | 'supporting' | 'extended';
  name: string;
  emoji: string;
  color: string;
  description: string;
  criteria: TierCriteria;
  effort: string;
  impact: 'high' | 'medium-high' | 'medium' | 'low';
}

const PRIORITY_TIERS: PriorityTier[] = [
  {
    id: 'core',
    name: 'THE ESSENTIALS',
    emoji: '🔴',
    color: '#EF4444',
    description: "Start here. Seriously. These pages = foundation.",
    criteria: {
      isCore: true,
      hasHighIntent: true,
      competitorsMustHave: true
    },
    effort: '2-3 weeks',
    impact: 'high'
  },
  {
    id: 'supporting',
    name: 'THE AUTHORITY BUILDERS',
    emoji: '🟡',
    color: '#F59E0B',
    description: "These make Google trust your Tier 1 content.",
    criteria: {
      supportsCoreTopic: true,
      hasSearchVolume: true
    },
    effort: '6-8 weeks',
    impact: 'medium-high'
  },
  {
    id: 'extended',
    name: 'THE DOMINANCE PLAYS',
    emoji: '🟢',
    color: '#10B981',
    description: "For when you want to OWN the conversation.",
    criteria: {
      longTailOpportunity: true,
      competitiveDifferentiation: true
    },
    effort: '4-6 weeks',
    impact: 'medium'
  }
];
```

### 3.3 Tier Assignment Logic

```typescript
function assignTopicTiers(
  topics: Topic[],
  map: TopicalMap,
  competitorData: CompetitorData[]
): Map<string, PriorityTier['id']> {
  const tierAssignments = new Map<string, PriorityTier['id']>();
  const competitorTopics = getCompetitorTopicSet(competitorData);

  topics.forEach(topic => {
    // TIER 1 (Core): High-value, must-have topics
    if (
      topic.isCore ||
      isHighIntentTopic(topic) ||
      isCompetitorMustHave(topic, competitorTopics) ||
      isDirectServiceTopic(topic, map.businessInfo)
    ) {
      tierAssignments.set(topic.id, 'core');
      return;
    }

    // TIER 3 (Extended): Long-tail and differentiation
    if (
      isLongTailTopic(topic) ||
      !competitorTopics.has(normalizeTopicTitle(topic.title))
    ) {
      tierAssignments.set(topic.id, 'extended');
      return;
    }

    // TIER 2 (Supporting): Everything else
    tierAssignments.set(topic.id, 'supporting');
  });

  return tierAssignments;
}

function isHighIntentTopic(topic: Topic): boolean {
  return ['commercial', 'transactional'].includes(topic.searchIntent || '');
}

function isCompetitorMustHave(topic: Topic, competitorTopics: Set<string>): boolean {
  // If 2+ competitors have this topic, it's a must-have
  const normalized = normalizeTopicTitle(topic.title);
  // Would need competitor topic frequency data
  return competitorTopics.has(normalized);
}

function isDirectServiceTopic(topic: Topic, businessInfo: BusinessInfo): boolean {
  const services = businessInfo.services || [];
  return services.some(service =>
    topic.title.toLowerCase().includes(service.toLowerCase())
  );
}

function isLongTailTopic(topic: Topic): boolean {
  // Long-tail: 4+ words in title, lower competition
  return topic.title.split(' ').length >= 4;
}
```

### 3.4 Component Structure

```
components/gamification/
├── tiering/
│   ├── PriorityTieringSystem.tsx       # Main tiering view
│   ├── TierCard.tsx                    # Individual tier display
│   ├── TierProgressBar.tsx             # Progress within tier
│   ├── TierTopicList.tsx               # Expandable topic list
│   ├── TierExportOptions.tsx           # Export by tier
│   └── TierCustomizer.tsx              # Manual tier adjustments
└── hooks/
    └── usePriorityTiers.ts             # Tier calculation hook
```

### 3.5 UI Specifications

#### Tier Card Design

```
┌─────────────────────────────────────────────────────────────────┐
│  🔴 TIER 1: THE ESSENTIALS                              8 topics│
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  "Start here. Seriously. These 8 pages = foundation."           │
│                                                                 │
│  Progress: ████████████░░░░░░░░  5 of 8 briefs ready           │
│                                                                 │
│  Why essential?                                                 │
│  • Directly tied to revenue                                     │
│  • Highest search intent alignment                              │
│  • Your competitors ALL have these                              │
│                                                                 │
│  Est. effort: 2-3 weeks                                         │
│  Expected impact: ████████████████████ HIGH                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [▼] View Topics                                         │   │
│  │                                                         │   │
│  │  ✅ Digital Marketing Services     Brief ready          │   │
│  │  ✅ SEO Agency Services            Brief ready          │   │
│  │  ✅ PPC Management                 Brief ready          │   │
│  │  ⏳ Content Marketing Strategy     In progress          │   │
│  │  ⏳ Social Media Marketing         In progress          │   │
│  │  ⬜ Marketing Analytics            Not started          │   │
│  │  ⬜ Marketing Automation           Not started          │   │
│  │  ⬜ Lead Generation Services       Not started          │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Export Tier 1 Only]                     Status: 🔥 Almost!   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.6 Pro Tip Messages

```typescript
const TIERING_PRO_TIPS = [
  {
    trigger: 'initial-view',
    message: "Don't try to do all {totalTopics} at once. Start with Tier 1, nail it, then expand. 8 great pages beat 47 mediocre ones every time."
  },
  {
    trigger: 'tier1-complete',
    message: "Tier 1 complete! Your foundation is solid. Now Tier 2 will amplify everything you've built."
  },
  {
    trigger: 'tier2-half',
    message: "Halfway through Tier 2. Your semantic authority is growing with every piece."
  },
  {
    trigger: 'all-complete',
    message: "All tiers complete. You're not just competing anymore — you're dominating the semantic space."
  }
];
```

---

# PRIORITY 2 FEATURES

---

## Feature 4: Progress Messages (CutTheCrap Voice)

### 4.1 Message Categories

```typescript
interface ProgressMessage {
  category: MessageCategory;
  trigger: string;
  message: string;
  tone: 'encouraging' | 'playful' | 'professional' | 'celebratory';
}

type MessageCategory =
  | 'wizard-stage'
  | 'action-feedback'
  | 'score-change'
  | 'achievement'
  | 'error'
  | 'empty-state';
```

### 4.2 Wizard Stage Messages

```typescript
const WIZARD_MESSAGES: Record<string, ProgressMessage[]> = {
  'business-info': [
    { message: "Tell us who you are. No fluff needed.", tone: 'professional' },
    { message: "The foundation of everything. Let's get specific.", tone: 'encouraging' }
  ],
  'entity-setup': [
    { message: "Lock in your core identity. This is your Google DNA.", tone: 'professional' },
    { message: "What's the ONE thing you want to be known for?", tone: 'playful' }
  ],
  'pillar-creation': [
    { message: "Define your expertise zones. What do you actually know?", tone: 'playful' },
    { message: "These pillars will structure your entire content strategy.", tone: 'professional' }
  ],
  'eav-discovery': [
    { message: "Time to teach Google about your entity. Every fact matters.", tone: 'encouraging' },
    { message: "E-A-Vs: The secret sauce of semantic SEO.", tone: 'playful' }
  ],
  'map-generation': [
    { message: "Building your semantic universe... ☕", tone: 'playful' },
    { message: "Analyzing entity relationships and generating topics...", tone: 'professional' }
  ],
  'map-complete': [
    { message: "Boom. {topicCount} topics that make Google trust you.", tone: 'celebratory' },
    { message: "Your topical map is ready. Time to build authority.", tone: 'encouraging' }
  ]
};
```

### 4.3 Action Feedback Messages

```typescript
const ACTION_MESSAGES = {
  'eav-added': [
    "✅ Added. Your entity clarity just improved by {points}%.",
    "✅ Another fact for Google's knowledge graph.",
    "✅ Entity definition strengthened."
  ],
  'eav-expanded': [
    "🧠 {count} new E-A-Vs discovered. Your semantic depth is growing.",
    "🧠 AI found {count} more facts about your entity. Nice."
  ],
  'brief-completed': [
    "📝 Brief ready. {completed} of {total} topics now publish-ready.",
    "📝 Another brief done. You're {percentage}% there."
  ],
  'brief-generated': [
    "✨ Brief generated with {sections} sections and {wordCount} words of guidance.",
    "✨ Your content blueprint is ready."
  ],
  'competitor-added': [
    "🔍 Competitor added. Now tracking {count} competitors.",
    "🔍 More competitive intel incoming..."
  ],
  'gap-filled': [
    "🎯 Gap filled. One less advantage for competitors.",
    "🎯 You now cover '{topic}' — that's one less blind spot."
  ],
  'topic-added': [
    "📌 Topic added to your map. Coverage expanding.",
    "📌 New topic: '{title}'. Your semantic net grows."
  ],
  'draft-saved': [
    "💾 Draft saved. {wordCount} words secured.",
    "💾 Progress saved. Keep building."
  ],
  'export-complete': [
    "📤 Exported! Go make Google happy.",
    "📤 Your content blueprint is ready for action."
  ]
};
```

### 4.4 Score Change Messages

```typescript
const SCORE_CHANGE_MESSAGES = {
  increase: {
    small: [ // 1-5 points
      "+{points} points. Every bit counts.",
      "Score bumped to {newScore}. Moving up."
    ],
    medium: [ // 6-15 points
      "📈 +{points}! That's a solid jump.",
      "📈 {newScore} now. You're making real progress."
    ],
    large: [ // 16+ points
      "🚀 +{points} points! Major improvement.",
      "🚀 From {oldScore} to {newScore}. That's how it's done."
    ]
  },
  decrease: [
    "Score adjusted to {newScore}. Let's build it back up.",
    "{newScore} now. Room to improve."
  ],
  tierUp: [
    "🎉 LEVEL UP! You've reached '{tierName}' status!",
    "🏆 New tier unlocked: {tierName}. Keep climbing!"
  ]
};
```

### 4.5 Empty State Messages

```typescript
const EMPTY_STATE_MESSAGES = {
  'no-topics': {
    emoji: '🗺️',
    headline: "Your topical map is... empty.",
    subline: "Like a blank canvas. Or a sad fridge. Let's fix that.",
    cta: "Generate Your First Map"
  },
  'no-competitors': {
    emoji: '🔍',
    headline: "No competitors added yet.",
    subline: "Either you're truly unique, or we need some URLs to analyze.",
    cta: "Add Competitors"
  },
  'no-eavs': {
    emoji: '🧠',
    headline: "No E-A-Vs defined.",
    subline: "Google doesn't know who you are yet. Let's teach them.",
    cta: "Add Your First E-A-V"
  },
  'no-briefs': {
    emoji: '📝',
    headline: "No briefs created.",
    subline: "Topics without briefs are just ideas. Let's make them real.",
    cta: "Generate Briefs"
  },
  'no-projects': {
    emoji: '📁',
    headline: "No projects yet.",
    subline: "Your SEO empire starts with a single project.",
    cta: "Create Your First Project"
  }
};
```

### 4.6 Implementation

```typescript
// hooks/useProgressMessages.ts
export function useProgressMessages() {
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  const showMessage = useCallback((
    category: MessageCategory,
    key: string,
    variables?: Record<string, string | number>
  ) => {
    const messages = getMessagesForKey(category, key);
    const message = pickRandom(messages);
    const interpolated = interpolateMessage(message, variables);

    setLastMessage(interpolated);

    // Auto-clear after 4 seconds
    setTimeout(() => setLastMessage(null), 4000);

    return interpolated;
  }, []);

  return { lastMessage, showMessage };
}

function interpolateMessage(
  message: string,
  variables?: Record<string, string | number>
): string {
  if (!variables) return message;

  return message.replace(/\{(\w+)\}/g, (_, key) =>
    String(variables[key] ?? `{${key}}`)
  );
}
```

---

## Feature 5: Ready to Publish Checklist

### 5.1 Overview

Pre-export confidence builder that answers: **"Am I ready to commit?"**

### 5.2 Checklist Items

```typescript
interface ChecklistItem {
  id: string;
  category: 'required' | 'recommended' | 'optional';
  label: string;
  description: string;
  check: (map: TopicalMap, briefs: ContentBrief[]) => CheckResult;
}

interface CheckResult {
  status: 'pass' | 'warning' | 'fail';
  message: string;
  action?: string;
}

const PUBLISH_CHECKLIST: ChecklistItem[] = [
  {
    id: 'entity-defined',
    category: 'required',
    label: 'Entity Definition',
    description: 'Central entity is clearly defined',
    check: (map) => {
      const hasEntity = !!map.businessInfo?.centralEntity;
      const hasEavs = (map.eavs?.length || 0) >= 10;
      if (hasEntity && hasEavs) {
        return { status: 'pass', message: 'Complete' };
      }
      if (hasEntity) {
        return {
          status: 'warning',
          message: 'Add more E-A-Vs for better clarity',
          action: 'Add E-A-Vs'
        };
      }
      return {
        status: 'fail',
        message: 'Entity not defined',
        action: 'Define Entity'
      };
    }
  },
  {
    id: 'core-topics-ready',
    category: 'required',
    label: 'Core Topics (Tier 1)',
    description: 'All essential topics have briefs',
    check: (map, briefs) => {
      const coreTopics = map.topics?.filter(t => t.isCore) || [];
      const coreBriefs = briefs.filter(b =>
        coreTopics.some(t => t.id === b.topic_id)
      );
      const readyBriefs = coreBriefs.filter(b =>
        b.structured_outline?.sections?.length > 0
      );

      if (readyBriefs.length === coreTopics.length) {
        return { status: 'pass', message: 'All briefs ready' };
      }
      return {
        status: 'warning',
        message: `${readyBriefs.length} of ${coreTopics.length} ready`,
        action: 'Complete Core Briefs'
      };
    }
  },
  {
    id: 'competitor-coverage',
    category: 'recommended',
    label: 'Competitor Coverage',
    description: 'Above 80% competitive parity',
    check: (map) => {
      // Would need competitor analysis data
      const coverage = calculateCompetitiveParity(map);
      if (coverage >= 80) {
        return { status: 'pass', message: `${coverage}% coverage` };
      }
      if (coverage >= 60) {
        return {
          status: 'warning',
          message: `${coverage}% - some gaps remain`,
          action: 'View Gaps'
        };
      }
      return {
        status: 'fail',
        message: `${coverage}% - significant gaps`,
        action: 'Address Gaps'
      };
    }
  },
  {
    id: 'intent-alignment',
    category: 'recommended',
    label: 'Intent Alignment',
    description: 'Topics aligned with search intent',
    check: (map) => {
      const alignment = calculateIntentAlignment(map);
      if (alignment >= 80) {
        return { status: 'pass', message: `${alignment}%` };
      }
      if (alignment >= 60) {
        return { status: 'warning', message: `${alignment}%` };
      }
      return { status: 'fail', message: `${alignment}%` };
    }
  },
  {
    id: 'eav-completeness',
    category: 'recommended',
    label: 'E-A-V Completeness',
    description: 'Recommend 80%+ coverage',
    check: (map) => {
      const eavScore = calculateEntityClarity(map);
      if (eavScore >= 80) {
        return { status: 'pass', message: `${eavScore}%` };
      }
      if (eavScore >= 60) {
        return {
          status: 'warning',
          message: `${eavScore}% - add more E-A-Vs`,
          action: 'Expand E-A-Vs'
        };
      }
      return { status: 'fail', message: `${eavScore}%` };
    }
  }
];
```

### 5.3 Verdict Logic

```typescript
interface PublishVerdict {
  ready: boolean;
  phase: 'not-ready' | 'phase-1' | 'phase-2' | 'full';
  headline: string;
  message: string;
  recommendations: string[];
}

function calculatePublishVerdict(
  checklist: CheckResult[]
): PublishVerdict {
  const requiredPassing = checklist
    .filter(c => c.category === 'required')
    .every(c => c.status !== 'fail');

  const recommendedScore = checklist
    .filter(c => c.category === 'recommended')
    .reduce((score, c) => {
      if (c.status === 'pass') return score + 1;
      if (c.status === 'warning') return score + 0.5;
      return score;
    }, 0);

  const recommendedTotal = checklist.filter(c => c.category === 'recommended').length;
  const recommendedPercent = (recommendedScore / recommendedTotal) * 100;

  if (!requiredPassing) {
    return {
      ready: false,
      phase: 'not-ready',
      headline: 'NOT READY YET',
      message: "Some required items need attention before publishing.",
      recommendations: getFailingRecommendations(checklist)
    };
  }

  if (recommendedPercent >= 80) {
    return {
      ready: true,
      phase: 'full',
      headline: 'READY FOR FULL LAUNCH',
      message: "Your map is comprehensive. Ship it all with confidence.",
      recommendations: []
    };
  }

  if (recommendedPercent >= 50) {
    return {
      ready: true,
      phase: 'phase-2',
      headline: 'READY FOR PHASE 2',
      message: "Core and supporting content are solid. Good to go.",
      recommendations: getWarningRecommendations(checklist)
    };
  }

  return {
    ready: true,
    phase: 'phase-1',
    headline: 'READY FOR PHASE 1',
    message: "Your core topics are solid. Start there, then expand.",
    recommendations: getWarningRecommendations(checklist)
  };
}
```

---

## Feature 6: Celebration Animations

### 6.1 Animation Catalog

```typescript
interface CelebrationAnimation {
  id: string;
  trigger: CelebrationTrigger;
  type: 'confetti' | 'sparkle' | 'bounce' | 'glow' | 'shake' | 'firework';
  duration: number; // ms
  intensity: 'subtle' | 'medium' | 'explosive';
}

type CelebrationTrigger =
  | 'score-increase'
  | 'tier-up'
  | 'achievement-unlocked'
  | 'first-map'
  | 'tier-complete'
  | 'gap-closed'
  | 'perfect-score';

const CELEBRATIONS: CelebrationAnimation[] = [
  {
    id: 'score-bump',
    trigger: 'score-increase',
    type: 'sparkle',
    duration: 800,
    intensity: 'subtle'
  },
  {
    id: 'level-up',
    trigger: 'tier-up',
    type: 'confetti',
    duration: 2000,
    intensity: 'medium'
  },
  {
    id: 'achievement',
    trigger: 'achievement-unlocked',
    type: 'firework',
    duration: 1500,
    intensity: 'medium'
  },
  {
    id: 'first-map-celebration',
    trigger: 'first-map',
    type: 'confetti',
    duration: 3000,
    intensity: 'explosive'
  },
  {
    id: 'perfect',
    trigger: 'perfect-score',
    type: 'firework',
    duration: 4000,
    intensity: 'explosive'
  }
];
```

### 6.2 Implementation with canvas-confetti

```typescript
// utils/celebrations.ts
import confetti from 'canvas-confetti';

export function celebrateScoreIncrease(points: number) {
  if (points < 5) {
    // Subtle sparkle
    confetti({
      particleCount: 20,
      spread: 40,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FFA500'],
      ticks: 100
    });
  } else if (points < 15) {
    // Medium burst
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 }
    });
  } else {
    // Big celebration
    confetti({
      particleCount: 100,
      spread: 100,
      origin: { y: 0.6 }
    });
  }
}

export function celebrateTierUp(tierName: string) {
  // Fire from both sides
  const defaults = {
    spread: 60,
    ticks: 100,
    gravity: 0.8,
    decay: 0.94,
    startVelocity: 30,
  };

  confetti({
    ...defaults,
    particleCount: 40,
    origin: { x: 0.2, y: 0.5 }
  });

  confetti({
    ...defaults,
    particleCount: 40,
    origin: { x: 0.8, y: 0.5 }
  });
}

export function celebratePerfectScore() {
  // Epic celebration
  const duration = 4000;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#10B981', '#34D399', '#6EE7B7']
    });
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#10B981', '#34D399', '#6EE7B7']
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };

  frame();
}
```

---

# PRIORITY 3 FEATURES

---

## Feature 7: Achievements & Badges

### 7.1 Achievement Categories

```typescript
interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'quality' | 'progress' | 'mastery' | 'consistency';
  requirement: AchievementRequirement;
  reward?: string; // Optional message/unlock
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

const ACHIEVEMENTS: Achievement[] = [
  // Quality Achievements
  {
    id: 'laser-focus',
    name: 'Laser Focus',
    description: 'Entity clarity score 95%+',
    icon: '🎯',
    category: 'quality',
    requirement: { type: 'score', metric: 'entityClarity', threshold: 95 },
    reward: "Your central entity is crystal clear. Google knows exactly who you are.",
    rarity: 'rare'
  },
  {
    id: 'authority-builder',
    name: 'Authority Builder',
    description: '50+ E-A-V triples defined',
    icon: '🏆',
    category: 'quality',
    requirement: { type: 'count', metric: 'eavCount', threshold: 50 },
    reward: "You've built a knowledge graph that rivals Wikipedia entries.",
    rarity: 'uncommon'
  },
  {
    id: 'competitor-crusher',
    name: 'Competitor Crusher',
    description: '100% competitive coverage',
    icon: '🔥',
    category: 'quality',
    requirement: { type: 'score', metric: 'competitiveParity', threshold: 100 },
    reward: "Every topic your competitors rank for? You've got it covered.",
    rarity: 'epic'
  },
  {
    id: 'content-machine',
    name: 'Content Machine',
    description: '25+ briefs at publish-ready',
    icon: '📚',
    category: 'progress',
    requirement: { type: 'count', metric: 'readyBriefs', threshold: 25 },
    reward: "Your content pipeline is loaded. Time to dominate.",
    rarity: 'rare'
  },
  {
    id: 'semantic-master',
    name: 'Semantic Master',
    description: 'Overall score 90%+',
    icon: '🧠',
    category: 'mastery',
    requirement: { type: 'score', metric: 'overall', threshold: 90 },
    reward: "This is elite-level SEO. No fluff, pure ranking potential.",
    rarity: 'legendary'
  },

  // Progress Achievements
  {
    id: 'first-map',
    name: 'First Steps',
    description: 'Create your first topical map',
    icon: '🌱',
    category: 'progress',
    requirement: { type: 'milestone', metric: 'mapsCreated', threshold: 1 },
    reward: "Your first semantic map is live. This is where rankings begin.",
    rarity: 'common'
  },
  {
    id: 'tier-1-complete',
    name: 'Foundation Laid',
    description: 'Complete all Tier 1 topics',
    icon: '🏗️',
    category: 'progress',
    requirement: { type: 'tierComplete', metric: 'core', threshold: 100 },
    reward: "Tier 1 DONE. Your foundation is rock solid.",
    rarity: 'uncommon'
  },
  {
    id: 'brief-streak',
    name: 'On Fire',
    description: '5 briefs completed in one session',
    icon: '🔥',
    category: 'consistency',
    requirement: { type: 'streak', metric: 'briefsInSession', threshold: 5 },
    reward: "5 briefs down. You're in the zone.",
    rarity: 'uncommon'
  }
];
```

### 7.2 Achievement Tracking

```typescript
// hooks/useAchievements.ts
export function useAchievements(map: TopicalMap, briefs: ContentBrief[]) {
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [newlyUnlocked, setNewlyUnlocked] = useState<Achievement | null>(null);

  useEffect(() => {
    const currentMetrics = calculateAllMetrics(map, briefs);

    ACHIEVEMENTS.forEach(achievement => {
      if (unlockedAchievements.includes(achievement.id)) return;

      if (checkAchievementUnlocked(achievement, currentMetrics)) {
        setUnlockedAchievements(prev => [...prev, achievement.id]);
        setNewlyUnlocked(achievement);

        // Persist to database
        saveAchievement(achievement.id);

        // Trigger celebration
        celebrateAchievement(achievement);
      }
    });
  }, [map, briefs]);

  return { unlockedAchievements, newlyUnlocked, clearNewlyUnlocked: () => setNewlyUnlocked(null) };
}
```

---

## Feature 8: Contextual "Why" Tooltips

### 8.1 Tooltip Content

```typescript
const CONTEXTUAL_TOOLTIPS: Record<string, TooltipContent> = {
  'topic-count': {
    title: 'Why this many topics?',
    content: "{count} topics isn't random. This covers the semantic space Google expects for '{entity}'. Fewer = gaps in authority. More = diminishing returns.",
    learnMore: '/help/topic-coverage'
  },
  'eav-triple': {
    title: 'What is an E-A-V?',
    content: "Entity-Attribute-Value triples tell Google facts about your business. More triples = clearer understanding = higher trust. Think of them as entries in Google's knowledge graph.",
    learnMore: '/help/eavs'
  },
  'supporting-topic': {
    title: 'Why supporting topics?',
    content: "Supporting topics prove you understand the full context. Google rewards comprehensive expertise, not keyword stuffing. These connect your core topics semantically.",
    learnMore: '/help/topic-types'
  },
  'competitor-gap': {
    title: 'Why does this gap matter?',
    content: "Your competitors rank for this topic. If you don't cover it, Google may see them as more authoritative in this area. Closing gaps = leveling the playing field.",
    learnMore: '/help/competitive-gaps'
  },
  'search-intent': {
    title: 'What is search intent?',
    content: "Search intent = what the user actually wants. Informational (learn), commercial (compare), transactional (buy). Matching intent = higher rankings + better conversions.",
    learnMore: '/help/search-intent'
  },
  'semantic-score': {
    title: 'How is this calculated?',
    content: "Your Semantic Authority Score combines 5 factors: Entity Clarity (25%), Topical Coverage (25%), Intent Alignment (20%), Competitive Parity (15%), and Content Readiness (15%).",
    learnMore: '/help/semantic-score'
  },
  'tier-1': {
    title: 'Why start with Tier 1?',
    content: "Tier 1 topics are directly tied to revenue and have the highest intent alignment. They're also topics your competitors already rank for. Foundation first, expansion second.",
    learnMore: '/help/tiering'
  }
};
```

### 8.2 Tooltip Component

```typescript
// components/shared/WhyTooltip.tsx
interface WhyTooltipProps {
  tooltipKey: string;
  variables?: Record<string, string | number>;
  children: React.ReactNode;
}

export function WhyTooltip({ tooltipKey, variables, children }: WhyTooltipProps) {
  const tooltip = CONTEXTUAL_TOOLTIPS[tooltipKey];
  if (!tooltip) return <>{children}</>;

  const content = interpolate(tooltip.content, variables);

  return (
    <Tooltip
      content={
        <div className="max-w-xs">
          <h4 className="font-semibold text-white mb-1">{tooltip.title}</h4>
          <p className="text-gray-300 text-sm">{content}</p>
          {tooltip.learnMore && (
            <a href={tooltip.learnMore} className="text-blue-400 text-xs mt-2 block">
              Learn more →
            </a>
          )}
        </div>
      }
    >
      <span className="border-b border-dotted border-gray-500 cursor-help">
        {children}
      </span>
    </Tooltip>
  );
}
```

---

## Feature 9: Sound Design (Optional)

### 9.1 Sound Catalog

```typescript
const SOUNDS = {
  'score-increase': '/sounds/ding.mp3',
  'level-up': '/sounds/fanfare.mp3',
  'achievement': '/sounds/unlock.mp3',
  'error': '/sounds/bonk.mp3',
  'export': '/sounds/whoosh.mp3',
  'save': '/sounds/click.mp3'
};
```

### 9.2 Sound Manager

```typescript
// utils/soundManager.ts
class SoundManager {
  private enabled: boolean = true;
  private volume: number = 0.5;
  private audioCache: Map<string, HTMLAudioElement> = new Map();

  constructor() {
    // Load user preference
    this.enabled = localStorage.getItem('sounds-enabled') !== 'false';
  }

  play(soundId: keyof typeof SOUNDS) {
    if (!this.enabled) return;

    let audio = this.audioCache.get(soundId);
    if (!audio) {
      audio = new Audio(SOUNDS[soundId]);
      this.audioCache.set(soundId, audio);
    }

    audio.volume = this.volume;
    audio.currentTime = 0;
    audio.play().catch(() => {}); // Ignore autoplay errors
  }

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('sounds-enabled', String(this.enabled));
    return this.enabled;
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }
}

export const soundManager = new SoundManager();
```

---

# IMPLEMENTATION PHASES

## Phase 1: Core Gamification (Priority 1)
**Duration:** 2-3 weeks

### Week 1
- [ ] Create score calculation utilities
- [ ] Build ScoreRing component
- [ ] Build SubScoreCard component
- [ ] Implement useSemanticScore hook
- [ ] Create score_history database table

### Week 2
- [ ] Build ConfidenceDashboard layout
- [ ] Implement EntityAnalysisCard
- [ ] Implement TopicRationaleCard
- [ ] Implement CompetitorShowdownCard
- [ ] Add "Why these topics?" modal

### Week 3
- [ ] Build PriorityTieringSystem
- [ ] Implement tier assignment logic
- [ ] Build TierCard components
- [ ] Add tier-based export options
- [ ] Integration testing

## Phase 2: Delight Layer (Priority 2)
**Duration:** 1-2 weeks

### Week 4
- [ ] Implement progress messages system
- [ ] Add CutTheCrap voice throughout wizards
- [ ] Build Ready to Publish checklist
- [ ] Implement celebration animations
- [ ] Add score change toasts

## Phase 3: Engagement Extras (Priority 3)
**Duration:** 1 week

### Week 5
- [ ] Implement achievement system
- [ ] Add contextual tooltips
- [ ] Add sound effects (optional)
- [ ] Polish and bug fixes

---

# COMPONENT INVENTORY

## New Components to Create

```
components/gamification/
├── score/
│   ├── SemanticAuthorityScore.tsx
│   ├── ScoreRing.tsx
│   ├── SubScoreCard.tsx
│   ├── ScoreBreakdown.tsx
│   ├── ScoreTierBadge.tsx
│   └── ScoreChangeToast.tsx
├── dashboard/
│   ├── ConfidenceDashboard.tsx
│   ├── MapReportCard.tsx
│   ├── EntityAnalysisCard.tsx
│   ├── TopicRationaleCard.tsx
│   ├── CompetitorShowdownCard.tsx
│   ├── ImpactProjectionCard.tsx
│   ├── WhyTheseTopicsModal.tsx
│   └── GapAnalysisModal.tsx
├── tiering/
│   ├── PriorityTieringSystem.tsx
│   ├── TierCard.tsx
│   ├── TierProgressBar.tsx
│   ├── TierTopicList.tsx
│   └── TierExportOptions.tsx
├── checklist/
│   ├── PublishChecklist.tsx
│   ├── ChecklistItem.tsx
│   └── PublishVerdict.tsx
├── achievements/
│   ├── AchievementBadge.tsx
│   ├── AchievementToast.tsx
│   └── AchievementGallery.tsx
├── shared/
│   ├── ConfidenceCard.tsx
│   ├── ProgressBar.tsx
│   ├── ComparisonBar.tsx
│   ├── StatHighlight.tsx
│   ├── WhyTooltip.tsx
│   └── EmptyState.tsx
└── animations/
    ├── Confetti.tsx
    ├── Sparkle.tsx
    └── LevelUpAnimation.tsx

hooks/
├── useSemanticScore.ts
├── useScoreAnimation.ts
├── usePriorityTiers.ts
├── useProgressMessages.ts
├── useAchievements.ts
└── useCelebrations.ts

utils/
├── scoreCalculations.ts
├── tierAssignment.ts
├── celebrations.ts
├── soundManager.ts
└── messageInterpolation.ts

services/
└── gamificationService.ts  # API calls for score history, achievements
```

---

# DEPENDENCIES TO ADD

```json
{
  "dependencies": {
    "canvas-confetti": "^1.9.0",
    "framer-motion": "^10.16.0"
  }
}
```

---

# SUCCESS METRICS

| Metric | Target | How to Measure |
|--------|--------|----------------|
| User confidence | +40% | Survey: "I understand why my map is structured this way" |
| Feature completion | +25% | % of users completing all Tier 1 briefs |
| Return usage | +30% | Users returning within 7 days |
| Time to first export | -20% | Time from signup to first export |
| Support tickets | -30% | "Did I do this right?" type questions |

---

# APPENDIX: MESSAGE COPY BANK

See separate file: `docs/plans/gamification-copy-bank.md`

---

*End of Gamification Implementation Plan*
