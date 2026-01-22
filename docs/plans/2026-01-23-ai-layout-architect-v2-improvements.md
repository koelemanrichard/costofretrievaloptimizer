# AI Layout Architect v2.0 - Making Layouts Spot On

## The Problem

The current system produces layouts that feel generic and disconnected from context. While the architecture is sound (blueprint → renderer separation, inheritance hierarchy, 45+ components), the **decision quality** is weak because:

1. **AI operates in a context vacuum** - Missing competitor visuals, SERP patterns, brand assets
2. **Content analysis is brittle** - Keyword matching instead of semantic understanding
3. **No feedback learning** - System doesn't improve from refinements
4. **Generic component selection** - Same FAQ accordion for every FAQ, regardless of context
5. **No visual coherence rules** - Adjacent sections can clash visually

---

## Design Principle: Context-First Decision Making

Every layout decision should answer: **"Why THIS component for THIS content in THIS context?"**

Current: "This looks like a list → bullet-list"
Target: "This is a benefits list for a decision-stage buyer in a B2B SaaS context where competitors use icon grids → icon-list with 4 columns, high emphasis, brand accent backgrounds"

---

## Improvement 1: Rich Context Assembly

### Current Gap
The AI receives minimal context. `ArchitectInput.businessContext` often has generic values like "professional tone" and nothing about visual expectations.

### Solution: Context Assembler Service

Create a pre-flight context assembler that gathers everything relevant before blueprint generation:

```typescript
interface RichArchitectContext {
  // Content Understanding
  content: {
    sections: ParsedSection[];           // Semantically parsed, not regex
    contentType: ContentTypeAnalysis;    // ML-classified type
    readingLevel: 'basic' | 'intermediate' | 'advanced';
    emotionalTone: 'neutral' | 'urgent' | 'inspiring' | 'cautious';
  };

  // Brand & Visual Identity
  brand: {
    primaryColor: string;
    accentColor: string;
    fontPairing: { heading: string; body: string };
    logoStyle: 'minimal' | 'detailed' | 'wordmark';
    existingPageStyles?: ExtractedStyles;  // From live site crawl
  };

  // Market Intelligence
  market: {
    competitorLayouts: CompetitorLayoutPattern[];  // Visual patterns, not just text
    serpFeatures: SerpFeatureAnalysis;             // What Google shows
    industryNorms: IndustryDesignNorms;            // Finance = conservative, etc.
  };

  // User Intent Signals
  intent: {
    buyerStage: 'awareness' | 'consideration' | 'decision';
    primaryAction: string;                         // What should user do?
    objections: string[];                          // What might stop them?
    trustSignals: string[];                        // What builds confidence?
  };

  // Historical Performance (Phase 2)
  performance?: {
    similarArticles: ArticlePerformance[];         // Engagement data
    refinementPatterns: LearnedPattern[];          // User's past fixes
    avoidPatterns: string[];                       // What user always changes
  };
}
```

### Implementation

```typescript
// services/publishing/architect/contextAssembler.ts

export async function assembleRichContext(
  articleContent: string,
  topicId: string,
  projectId: string
): Promise<RichArchitectContext> {
  // Parallel fetch all context sources
  const [
    contentAnalysis,
    brandContext,
    competitorData,
    serpAnalysis,
    briefData,
    refinementHistory
  ] = await Promise.all([
    analyzeContentSemantics(articleContent),
    getBrandContext(projectId),
    getCompetitorLayouts(projectId),
    getSerpFeatures(topicId),
    getContentBrief(topicId),
    getRefinementHistory(projectId)
  ]);

  return {
    content: contentAnalysis,
    brand: brandContext,
    market: {
      competitorLayouts: competitorData,
      serpFeatures: serpAnalysis,
      industryNorms: inferIndustryNorms(brandContext.industry)
    },
    intent: extractIntentSignals(briefData),
    performance: {
      refinementPatterns: refinementHistory.patterns,
      avoidPatterns: refinementHistory.avoided
    }
  };
}
```

---

## Improvement 2: Semantic Content Parser

### Current Gap
Content analysis uses regex like `content.includes('voordeel')` to detect benefits. This:
- Fails on synonyms ("advantage", "plus", "upside")
- Misses context (a list of "problems" isn't benefits)
- Can't handle nuance

### Solution: Structured Content Parser

Instead of pattern matching, parse content into a semantic structure:

```typescript
interface ParsedSection {
  id: string;
  heading: string;
  headingLevel: 1 | 2 | 3 | 4;

  // Semantic understanding
  sectionType: SectionSemanticType;
  confidence: number;

  // Content structure
  structure: {
    paragraphs: string[];
    lists: ParsedList[];
    definitions: { term: string; definition: string }[];
    quotes: string[];
    callouts: { type: string; content: string }[];
  };

  // Relationships
  relationship: {
    toPrevious: 'continues' | 'contrasts' | 'elaborates' | 'new-topic';
    position: 'intro' | 'body' | 'conclusion';
    importance: 'supporting' | 'core' | 'key-takeaway';
  };
}

type SectionSemanticType =
  | 'definition'           // "What is X?"
  | 'benefits'             // Positive outcomes
  | 'features'             // Capabilities/characteristics
  | 'process'              // How to do something
  | 'comparison'           // X vs Y
  | 'faq'                  // Questions & answers
  | 'testimonial'          // Social proof
  | 'case-study'           // Story/example
  | 'pricing'              // Cost information
  | 'cta'                  // Call to action
  | 'technical'            // Specs/details
  | 'background'           // Context/history
  | 'problem-statement'    // Pain points
  | 'solution'             // How it solves
  | 'summary';             // Recap
```

### Implementation Approach

Use a lightweight classifier (can be AI-assisted or rule-based with fallbacks):

```typescript
// services/publishing/architect/contentParser.ts

export function parseContentSemantics(html: string): ParsedSection[] {
  const sections = splitIntoSections(html);

  return sections.map((section, index) => {
    const heading = extractHeading(section);
    const content = extractContent(section);

    // Multi-signal classification
    const typeSignals = {
      headingSignal: classifyByHeading(heading),
      structureSignal: classifyByStructure(content),
      keywordSignal: classifyByKeywords(content),
      positionSignal: classifyByPosition(index, sections.length)
    };

    // Weighted combination
    const { type, confidence } = combineSignals(typeSignals);

    return {
      id: generateId(),
      heading,
      headingLevel: getHeadingLevel(section),
      sectionType: type,
      confidence,
      structure: parseStructure(content),
      relationship: inferRelationship(sections, index)
    };
  });
}

function classifyByHeading(heading: string): { type: SectionSemanticType; weight: number } {
  const patterns: Record<SectionSemanticType, RegExp[]> = {
    'definition': [/wat is|what is|definitie|definition/i],
    'benefits': [/voordel|benefit|advantage|waarom|why choose/i],
    'features': [/kenmer|feature|functie|capability/i],
    'process': [/hoe|how|stap|step|proces|guide/i],
    'comparison': [/vergelijk|vs|versus|compare|verschil|difference/i],
    'faq': [/vraag|faq|veelgesteld|frequently asked/i],
    'pricing': [/prijs|cost|tarief|price|kosten/i],
    // ... more patterns
  };

  for (const [type, regexes] of Object.entries(patterns)) {
    if (regexes.some(r => r.test(heading))) {
      return { type: type as SectionSemanticType, weight: 0.7 };
    }
  }

  return { type: 'background', weight: 0.3 };
}
```

---

## Improvement 3: Component Selection Intelligence

### Current Gap
Component selection is a simple mapping: "FAQ content → faq-accordion". No consideration of:
- Visual rhythm (previous section was also cards)
- Content length (3-item FAQ vs 15-item FAQ)
- Brand style (minimal brands want simpler components)
- Competitor differentiation

### Solution: Intelligent Component Selector

```typescript
interface ComponentSelection {
  primary: ComponentType;
  alternatives: {
    component: ComponentType;
    tradeoff: string;
  }[];
  confidence: number;
  reasoning: string;
  visualConfig: {
    columns?: 2 | 3 | 4;
    variant?: string;
    iconStyle?: 'filled' | 'outlined' | 'none';
    emphasis: 'subtle' | 'normal' | 'featured';
  };
}

interface SelectionContext {
  section: ParsedSection;
  previousComponents: ComponentType[];      // Visual rhythm
  visualStyle: VisualStyle;                 // Brand style
  competitorPatterns: ComponentType[];      // What others use
  userPreferences: ComponentPreference[];   // Learned patterns
  itemCount: number;                        // Content size
}
```

### Selection Rules Engine

```typescript
// services/publishing/architect/componentSelector.ts

export function selectComponent(ctx: SelectionContext): ComponentSelection {
  const { section, previousComponents, visualStyle, itemCount } = ctx;

  // Step 1: Get candidate components for this content type
  const candidates = getCandidatesForType(section.sectionType);

  // Step 2: Score each candidate
  const scored = candidates.map(component => ({
    component,
    score: scoreComponent(component, ctx),
    reasoning: []
  }));

  // Step 3: Apply visual rhythm rules
  applyRhythmRules(scored, previousComponents);

  // Step 4: Apply brand style rules
  applyStyleRules(scored, visualStyle);

  // Step 5: Apply user preference rules
  applyPreferenceRules(scored, ctx.userPreferences);

  // Step 6: Select best with reasoning
  const sorted = scored.sort((a, b) => b.score - a.score);

  return {
    primary: sorted[0].component,
    alternatives: sorted.slice(1, 4).map(s => ({
      component: s.component,
      tradeoff: generateTradeoff(sorted[0], s)
    })),
    confidence: sorted[0].score / 100,
    reasoning: sorted[0].reasoning.join('. '),
    visualConfig: getVisualConfig(sorted[0].component, ctx)
  };
}

// Example rules:
function applyRhythmRules(
  scored: ScoredComponent[],
  previous: ComponentType[]
): void {
  const lastTwo = previous.slice(-2);

  for (const item of scored) {
    // Penalize repeating same component type
    if (lastTwo.includes(item.component)) {
      item.score -= 15;
      item.reasoning.push('Avoiding repetition');
    }

    // Penalize same visual weight consecutively
    const lastWeight = getVisualWeight(lastTwo[lastTwo.length - 1]);
    const thisWeight = getVisualWeight(item.component);
    if (lastWeight === 'heavy' && thisWeight === 'heavy') {
      item.score -= 10;
      item.reasoning.push('Visual rhythm: lighter after heavy');
    }
  }
}

function applyStyleRules(
  scored: ScoredComponent[],
  style: VisualStyle
): void {
  const stylePreferences: Record<VisualStyle, ComponentType[]> = {
    'minimal': ['prose', 'bullet-list', 'faq-accordion', 'simple-cta'],
    'bold': ['card-grid', 'timeline-zigzag', 'stat-cards', 'cta-banner'],
    'editorial': ['prose', 'pull-quote', 'image-with-caption', 'toc-sidebar'],
    'marketing': ['icon-list', 'testimonial-carousel', 'pricing-table', 'cta-sticky'],
    'warm-modern': ['card-grid', 'icon-list', 'timeline-horizontal', 'cta-inline']
  };

  const preferred = stylePreferences[style] || [];

  for (const item of scored) {
    if (preferred.includes(item.component)) {
      item.score += 10;
      item.reasoning.push(`Matches ${style} style`);
    }
  }
}
```

---

## Improvement 4: Visual Coherence Engine

### Current Gap
Each section is styled independently. Result: jarring transitions, no visual story.

### Solution: Blueprint-Level Coherence Rules

```typescript
interface VisualCoherenceRules {
  // Spacing rhythm
  spacing: {
    pattern: ('tight' | 'normal' | 'breathe')[];  // e.g., ['normal', 'breathe', 'normal']
    heroToFirstSection: 'tight' | 'breathe';
  };

  // Background alternation
  backgrounds: {
    strategy: 'none' | 'alternating' | 'feature-only';
    maxConsecutive: number;
  };

  // Emphasis distribution
  emphasis: {
    maxFeatured: number;                   // Don't overwhelm
    featuredPositions: 'start' | 'middle' | 'end' | 'distributed';
    heroMomentCount: 0 | 1;               // At most one "wow" section
  };

  // Component weight flow
  visualWeight: {
    flow: 'build-up' | 'front-loaded' | 'balanced';
    // build-up: lighter → heavier → lighter
    // front-loaded: heavy → progressively lighter
    // balanced: alternating weights
  };
}

function applyCoherenceRules(
  sections: SectionDesign[],
  rules: VisualCoherenceRules
): SectionDesign[] {
  const result = [...sections];

  // Apply spacing rhythm
  for (let i = 0; i < result.length; i++) {
    const rhythmPosition = i % rules.spacing.pattern.length;
    result[i].presentation.spacing = rules.spacing.pattern[rhythmPosition];
  }

  // Apply background strategy
  if (rules.backgrounds.strategy === 'alternating') {
    let consecutive = 0;
    for (let i = 0; i < result.length; i++) {
      if (i % 2 === 1 && consecutive < rules.backgrounds.maxConsecutive) {
        result[i].presentation.hasBackground = true;
        consecutive++;
      } else {
        result[i].presentation.hasBackground = false;
        consecutive = 0;
      }
    }
  }

  // Distribute emphasis
  distributeEmphasis(result, rules.emphasis);

  return result;
}
```

---

## Improvement 5: Competitor Visual Intelligence

### Current Gap
Competitor analysis extracts text patterns but misses visual patterns. We know competitors use "testimonials" but not that they place them mid-page in a 2-column card layout.

### Solution: Visual Pattern Extraction

Store and use visual component patterns from competitor analysis:

```typescript
interface CompetitorLayoutPattern {
  url: string;
  pageType: string;

  patterns: {
    heroStyle: 'full-width' | 'split' | 'minimal' | 'none';
    componentSequence: ComponentType[];     // What components appear in order
    emphasisDistribution: {
      position: 'top' | 'middle' | 'bottom';
      componentType: ComponentType;
    }[];
    ctaStrategy: {
      frequency: number;                    // CTAs per 1000 words
      positions: ('hero' | 'mid' | 'end' | 'sticky')[];
      style: 'subtle' | 'prominent';
    };
    visualDensity: 'sparse' | 'moderate' | 'dense';
  };
}

// Use patterns for differentiation
function getCompetitorDifferentiation(
  competitorPatterns: CompetitorLayoutPattern[],
  ourContext: RichArchitectContext
): DifferentiationStrategy {
  // Find common patterns
  const commonHeroStyle = mostCommon(competitorPatterns.map(p => p.patterns.heroStyle));
  const commonCta = mostCommon(competitorPatterns.map(p => p.patterns.ctaStrategy.style));

  return {
    // Suggest different hero if all competitors use same
    heroRecommendation: commonHeroStyle === 'full-width'
      ? 'split'  // Be different
      : 'full-width',

    // If competitors are aggressive, be subtle (or vice versa)
    ctaRecommendation: commonCta === 'prominent'
      ? 'subtle-but-frequent'
      : 'prominent-but-rare',

    // Find unused component opportunities
    unusedComponents: findUnusedByCompetitors(competitorPatterns)
  };
}
```

---

## Improvement 6: Learning from Refinements

### Current Gap
Pattern learning exists but isn't integrated into blueprint generation effectively.

### Solution: Preference-Weighted Generation

```typescript
interface LearnedStyleProfile {
  projectId: string;

  // Component preferences (from refinements)
  componentBias: {
    [from: ComponentType]: {
      to: ComponentType;
      frequency: number;      // How often user makes this swap
      contexts: string[];     // "When heading contains 'benefit'"
    }[];
  };

  // Visual preferences
  stylePreferences: {
    preferredPacing: 'dense' | 'balanced' | 'spacious';
    preferredEmphasis: 'subtle' | 'normal' | 'featured';
    backgroundFrequency: 'rare' | 'moderate' | 'frequent';
  };

  // Anti-patterns (what user always changes)
  avoidances: {
    component: ComponentType;
    frequency: number;
    replacement?: ComponentType;
  }[];
}

// Apply learned preferences during generation
function applyLearnedPreferences(
  blueprint: LayoutBlueprint,
  profile: LearnedStyleProfile
): LayoutBlueprint {
  const sections = blueprint.sections.map(section => {
    const component = section.presentation.component;

    // Check if user typically swaps this component
    const bias = profile.componentBias[component];
    if (bias && bias[0].frequency >= 3) {
      // Auto-apply the user's preferred swap
      return {
        ...section,
        presentation: {
          ...section.presentation,
          component: bias[0].to
        },
        reasoning: `Auto-applied: You typically change ${component} to ${bias[0].to}`
      };
    }

    // Check avoidances
    const avoidance = profile.avoidances.find(a => a.component === component);
    if (avoidance && avoidance.frequency >= 2 && avoidance.replacement) {
      return {
        ...section,
        presentation: {
          ...section.presentation,
          component: avoidance.replacement
        },
        reasoning: `Auto-avoided: You rarely keep ${component}`
      };
    }

    return section;
  });

  return {
    ...blueprint,
    sections,
    pageStrategy: {
      ...blueprint.pageStrategy,
      pacing: profile.stylePreferences.preferredPacing
    }
  };
}
```

---

## Implementation Plan

### Phase 1: Context Enrichment (Foundation)
1. Create `contextAssembler.ts` with parallel data fetching
2. Enhance `contentParser.ts` with semantic section classification
3. Pass rich context to existing architect service
4. Add confidence scores to blueprint output

**Verification**: Blueprint reasoning shows context-aware decisions

### Phase 2: Intelligent Selection (Core)
1. Create `componentSelector.ts` with scoring rules
2. Add visual rhythm rules to prevent repetition
3. Add style-matching rules for brand consistency
4. Generate alternatives with tradeoffs

**Verification**: Different articles get different layouts based on context

### Phase 3: Visual Coherence (Polish)
1. Add coherence rules engine
2. Implement spacing rhythm patterns
3. Add background alternation logic
4. Implement emphasis distribution

**Verification**: Layouts feel "designed" not "generated"

### Phase 4: Learning Integration (Adaptation)
1. Build learned style profiles from refinement history
2. Auto-apply high-confidence preferences
3. Surface anti-patterns in Blueprint Inspector
4. Add "Apply my style" button

**Verification**: Second article for same project looks consistent with user preferences

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Zero-refinement publish rate | ~30% | 70%+ |
| Visual variety score | Low | High (measured by component diversity) |
| Context alignment score | N/A | 80%+ (user rates "fits my brand") |
| Consistency across project | Low | High (same project = similar feel) |
| Learning effectiveness | None | 50%+ auto-applied preferences accurate |

---

## Files to Create/Modify

### Create
```
services/publishing/architect/
├── contextAssembler.ts       # Rich context gathering
├── contentParser.ts          # Semantic content parsing
├── componentSelector.ts      # Intelligent selection rules
├── coherenceEngine.ts        # Visual coherence rules
└── learningIntegration.ts    # Preference learning application
```

### Modify
```
services/publishing/architect/
├── architectService.ts       # Use new context assembler
└── architectPrompt.ts        # Include rich context in prompts

services/publishing/refinement/
├── patternLearning.ts        # Build learned profiles
└── enhancedSuggestions.ts    # Use component selector
```
