# Style & Publish System Redesign

## Overview

A complete redesign of the Style & Publish system to deliver professional-grade, "wow factor" output that matches target website branding. The system shifts from template application to intelligent design generation.

## Core Philosophy

- **Quality over quantity** - Take time to craft excellent output
- **AI as design expert** - Makes intelligent decisions like a high-end agency designer
- **Full transparency** - User sees exactly what was detected and can validate
- **Semantic SEO is sacred** - Design enhances without changing optimized content
- **Design inheritance** - Learn once, reuse across articles

---

## The New Workflow (3 Steps)

### Step 1: Brand Discovery

**Input:** Target website URL

**Process:**
1. Capture screenshot of target website
2. Extract design tokens (colors, fonts, spacing, shadows, border radius)
3. AI analyzes screenshot vs extracted values
4. Generate Brand Discovery Report

**Brand Discovery Report Contents:**
- Side-by-side: Target screenshot | Extracted color palette
- Specific findings with source:
  - "Primary: #E97B2D (from buttons)"
  - "Headings: Playfair Display (from H1 elements)"
  - "Style: Rounded corners, soft shadows"
- Confidence indicators per finding:
  - ✓ Found (high confidence extraction)
  - ⚠ Guessed (inferred from context)
  - ✗ Defaulted (could not detect, using fallback)
- Live component previews: Button, card, heading rendered with extracted settings
- AI validation: Flags mismatches between screenshot and extracted values

**Output:** Validated brand profile with user confirmation

---

### Step 2: Multi-Pass Design Generation

**Input:** Completed semantic SEO article (the system's core product)

**Critical Constraint:** Design must preserve every word, heading, and structure of the SEO-optimized content. Design is a visual "skin" layer only.

#### Pass 1: Content Analysis
- Parse article structure: sections, headings, lists, tables, FAQs
- Identify content types per section: comparison, process, definition, narrative, statistics
- Map semantic importance: hero content, key points, supporting content
- Note special elements: quotes, callouts, data that needs visualization

#### Pass 2: Component Selection
- For each section, AI selects optimal component type
- Decision factors:
  - Content type (process → timeline, comparison → cards)
  - Brand personality (editorial → dramatic, minimal → clean)
  - Reading flow (variety, not monotony)
- Example decisions:
  - "This comparison works better as side-by-side cards than a table"
  - "This numbered list should be 2 columns with icons"
  - "This definition section needs a highlight box"

#### Pass 3: Visual Rhythm Planning
- Plan section flow: dense text → breathing room → visual callout → dense
- Map emphasis levels: normal, background, featured, hero-moment
- Ensure variety: No more than 3 consecutive plain prose sections
- Place visual anchors every 300-500 words
- Long articles must feel inviting, not overwhelming

#### Pass 4: Design Application
- Apply brand colors from Step 1 (vibrant, never gray fallback)
- Apply typography: detected fonts first, AI alternatives only if needed
- Apply spacing, shadows, border radius from brand profile
- Add contextual flourishes:
  - Gradients for featured sections
  - Accent borders and highlights
  - Icon treatments where appropriate
- Ensure consistency across all sections

#### Pass 5: Quality Validation
- Render designed article as image
- AI vision compares: Target website screenshot vs Generated output
- Evaluation criteria:
  - Color harmony: Do colors match the brand?
  - Typography feel: Does type convey same personality?
  - Visual weight: Similar whitespace, density, depth?
  - Professional polish: Would this impress on target site?
- Quality score with breakdown:
  ```
  Brand Match: 92%
  ├── Colors: ✓ Primary orange applied correctly
  ├── Typography: ✓ Serif headings match editorial feel
  ├── Visual Depth: ⚠ Shadows slightly weaker than target
  └── Overall Feel: ✓ Would fit naturally on target site
  ```
- If below threshold: AI explains issues, suggests fixes, can auto-fix

**Output:** Fully designed article ready for review

---

### Step 3: Review & Iterate

**Interaction Methods (Combined):**

1. **Click to Select**
   - Click any section in preview
   - Section highlights showing current component type and settings

2. **See Alternatives**
   - AI presents 2-3 alternative designs for selected section
   - Mini-previews with labels: "Timeline Layout", "Card Grid", "Numbered Steps"
   - Click to apply or dismiss

3. **Natural Language Feedback**
   - Section-level: "Make this section more visual" / "This feels too dense"
   - Global: "Add more breathing room throughout" / "Make it feel warmer"
   - AI interprets and regenerates affected sections

4. **Redo with Reason**
   - "Regenerate entire design" button
   - User explains: "Too corporate, needs to feel more approachable"
   - AI uses context for new generation

**What Gets Saved:**
- All design decisions (component choices, emphasis, spacing)
- User feedback that led to changes (for learning)
- Final approved state

**Output:** Approved design ready for publishing

---

## Design Inheritance System

Design choices cascade through a three-level hierarchy:

```
PROJECT LEVEL (Brand Foundation)
├── Brand colors, fonts, overall personality
├── Shadow style, border radius, spacing scale
├── Applies to ALL articles in project
│
└── TOPICAL MAP LEVEL (Content Cluster Style)
    ├── Layout patterns for this topic cluster
    ├── Preferred components learned from user feedback
    ├── Visual rhythm preferences
    │
    └── ARTICLE LEVEL (Specific Overrides)
        ├── Individual adjustments for this piece
        └── Exceptions to inherited styles
```

**Workflow Efficiency:**
- First article in topical map: Full design process with iteration
- Second article: System proposes design from learned preferences, minor tweaks
- Fifth article: Nearly automatic, quick review and publish

**User Controls:**
- Override any inherited setting at any level
- "Use this design for all articles in this topical map"
- "Reset to project defaults"
- "Make this article unique" (opt out of inheritance)

---

## Quality Standards

### Base Requirements (Minimum Floor)

These ensure nothing falls below acceptable quality:

**Color:**
- Primary color must be vibrant brand color (never gray #18181B fallback)
- Consistent application: buttons, accents, links, highlights
- Proper contrast ratios for accessibility
- Generated variations: primary-light, primary-dark

**Typography:**
- Priority: Detected from target → AI alternatives if needed
- Clear hierarchy: H1 > H2 > H3 visually distinct
- Display font for headings, reading-optimized font for body
- Weight used for emphasis, not just size

**Visual Depth:**
- Shadows: Minimum 15% opacity for subtle, 25%+ for featured
- Layering: Cards float, hero sections have depth
- Gradients: Subtle brand-tinted for featured sections
- Backdrop effects where appropriate

**Layout:**
- Visual rhythm: Alternating dense/spacious
- Component variety: Maximum 3 consecutive plain prose sections
- Breathing room: 6-8rem between major sections
- Visual anchors every 300-500 words

### Contextual AI Judgment (Raises the Bar)

The AI adjusts based on specific context:
- Target site is minimal? → Fewer gradients, subtler shadows
- Target site is bold? → More dramatic effects
- Content is technical? → Cleaner, more structured
- Content is lifestyle? → Warmer, more flourishes

The "wow factor" is contextual excellence, not a single formula.

---

## Current System Issues (For Reference)

Problems in existing implementation that this redesign addresses:

1. **Color Fallback Trap**: Default #18181B (gray) everywhere
2. **Font Loading**: Playfair Display defined but not loaded in HTML
3. **Weak Shadows**: Most personalities use 4-10% opacity (too subtle)
4. **Personality Disconnect**: Selection doesn't fully apply to output
5. **No Transparency**: Silent failures, no user validation
6. **Template Feel**: No intelligent design decisions, just slot filling
7. **No Learning**: Every article starts from scratch

---

## Technical Implementation Notes

### New Services Required

1. **ScreenshotCaptureService** - Capture target website screenshot via Apify
2. **DesignQualityValidator** - AI vision comparison service
3. **DesignInheritanceService** - Manage project/map/article hierarchy
4. **MultiPassDesignOrchestrator** - Coordinate the 5-pass design generation

### Modified Services

1. **DesignAnalyzer** - Enhanced extraction with confidence scoring
2. **blueprintRenderer** - Support for new component variety
3. **cssGenerator** - Stronger defaults, contextual adjustments
4. **componentLibrary** - Expand to 50+ components with variants

### Database Changes

1. **design_profiles** - Store validated brand profiles
2. **design_preferences** - User feedback and learned preferences
3. **design_inheritance** - Link project → map → article relationships

---

## Success Criteria

The redesign is successful when:

1. User enters URL → sees exactly what was detected → feels confident
2. Generated design looks like it belongs on the target website
3. Long articles feel inviting to read, not overwhelming
4. Second article in a series requires minimal setup
5. User says "wow" not "this looks like a template"

---

## Next Steps

1. Review and validate this design document
2. Create implementation plan with prioritized tasks
3. Set up isolated development environment
4. Implement in phases, validating each component
