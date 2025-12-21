# Knowledge Panel Integration & UI Fixes Design

**Date:** 2025-12-18
**Status:** Approved
**Scope:** Knowledge Panel system integration + Query Template/Frame expansion UI fixes

---

## Overview

This design addresses two categories of work:

1. **Knowledge Panel (KP) Integration** - Adding comprehensive KP strategy and entity authority features throughout the application
2. **UI Fixes** - Resolving issues with Query Templates and Frame expansion visibility

---

## Part 1: Knowledge Panel Integration

### 1.1 Data Foundation

#### BusinessInfo.entityIdentity (new field)

```typescript
interface EntityIdentity {
  legalName: string;                    // Official registered name
  foundedYear?: number;                 // Year established
  headquartersLocation?: string;        // City, Country
  founderOrCEO: string;                 // Key person for E-A-T
  founderCredential?: string;           // Their primary credential
  primaryAttribute: string;             // Desired KP subtitle
  secondaryAttributes?: string[];       // Backup subtitles
  existingSeedSources: {
    wikipedia?: string;                 // URL if exists
    wikidata?: string;                  // QID if exists
    crunchbase?: string;
    linkedinCompany?: string;
    googleBusinessProfile?: boolean;    // Claimed or not
    industryDirectories?: Array<{
      name: string;
      url: string;
    }>;
  };
  brandSearchDemand?: number;           // Monthly branded searches
}
```

#### SemanticTriple.kpMetadata (new field)

```typescript
interface KPMetadata {
  isFactual: boolean;                   // Declarative fact vs opinion
  isKPEligible: boolean;                // User-flagged for KP strategy
  seedSourcesRequired: string[];        // Which sources should confirm
  seedSourcesConfirmed: string[];       // Which sources already confirm
  consensusScore: number;               // 0-100 based on source agreement
  generatedStatement?: string;          // Auto-generated declarative sentence
}
```

### 1.2 Navigation Structure

Two new pages added to main navigation:

```
STRATEGY section:
├─ Topical Map
├─ Content Calendar
└─ KP Strategy          → /project/{id}/kp-strategy

ANALYSIS section:
├─ Competitor Analysis
├─ SERP Analysis
└─ Entity Authority     → /project/{id}/entity-authority
```

### 1.3 KP Strategy Page

**Purpose:** Action-focused planning page for defining entity identity and tracking seed source status.

**Components:**

1. **Entity Identity Form**
   - Legal name, founded year, headquarters
   - Founder/CEO with credential
   - Primary attribute (desired KP subtitle) dropdown
   - Secondary attributes

2. **Seed Sources Tracker**
   - Table: Source | Status | URL | Action
   - Sources: Wikipedia, Wikidata, Crunchbase, LinkedIn, GBP, Industry Directories
   - Status: Missing / Claimed / Verified
   - Actions: Create / Edit / View links

3. **KP-Contributing Statements**
   - Auto-generated declarative sentences from KP-flagged EAVs
   - Checkbox to select which to publish
   - "Generate from EAVs" button
   - "Export for Publishing" button (copy-paste ready)

**File:** `components/KPStrategyPage.tsx`

### 1.4 Entity Authority Page

**Purpose:** Diagnostic/analysis page showing KP readiness and gaps.

**Components:**

1. **Readiness Score Panel**
   - Overall score (0-100) with circular indicator
   - Breakdown bars: Entity Identity, Seed Sources, EAV Consensus, Content Coverage
   - Each category shows percentage

2. **EAV Consensus Tracker**
   - Table: Attribute | Category | Sources Confirmed | Consensus Score
   - Visual bar showing consensus percentage
   - Filter by category (UNIQUE/ROOT/RARE/COMMON)
   - Source legend showing which sources are tracked

3. **Priority Actions**
   - Auto-generated recommendations based on gaps
   - Priority levels: HIGH (red) / MEDIUM (orange) / LOW (yellow)
   - Actionable descriptions with reasoning

4. **Brand Search Demand Chart** (optional)
   - Monthly branded searches trend
   - Target indicator
   - Data source selector (GSC / Manual entry)

**File:** `components/EntityAuthorityPage.tsx`

### 1.5 Business Info Wizard Enhancement

**New Step:** "Entity Identity" (Step 3 of 4, after basic info)

**Sections:**
- Legal Entity: Legal name, founded year, headquarters
- Key Person: Founder/CEO name, primary credential
- Desired KP Identity: Primary attribute dropdown, secondary attributes
- Existing Seed Sources: Checkboxes with URL fields (optional, can skip)

**Skip option:** "Skip for Now" button allows completing later via KP Strategy page

**File:** Modify `components/BusinessInfoWizard.tsx`

### 1.6 EAV Wizard Enhancement

**New Features:**

1. **KP Column** in EAV table
   - Checkbox to flag EAV as KP-contributing
   - Auto-excludes opinions/subjective statements

2. **Seeds Column** in EAV table
   - Shows "X/Y" (confirmed sources / target sources)
   - Links to seed source management

3. **Filter Toggle**
   - "Show KP-eligible EAVs only" checkbox

4. **Auto-Generated Statements Panel**
   - Shows declarative sentences generated from KP-flagged EAVs
   - Preview of what will appear in KP Strategy page

**File:** Modify `components/EAVWizard.tsx`

---

## Part 2: UI Fixes

### 2.1 Query Template Fixes

**Issues:**
- City input shows empty dropdown (no locations loaded)
- Multi-line Service input unclear
- No guidance on when/how to use for Local SEO

**Fixes:**

1. **Smart Location Initialization**
   - Detect `BusinessInfo.region`
   - Show "Load [Region] Cities" quick button when no locations
   - Display helpful message instead of empty dropdown

2. **Checkbox List for Locations** (instead of multi-select dropdown)
   - Individual checkboxes with population displayed
   - "Select All" / "Clear" / "Select Top 10 by Population" buttons
   - Counter showing "X selected"

3. **Clearer Service Input**
   - Placeholder: "Enter services, one per line"
   - Helper text below input
   - Visual separator between lines

4. **Contextual Help Panel**
   - Collapsible "When to use this" explanation
   - Example showing template → generated topics
   - "Don't show again" option

**File:** Modify `components/templates/QueryTemplatePanel.tsx`

### 2.2 Query Template Placement

**Current:** Button in TopicalMapDisplay header

**New:**
- Sidebar menu: Content → Add Topic → Generate from Template
- Opens unified "Add Topics" page with tabs

**Add Topics Page Tabs:**
```
[Manual] [From Template] [AI Expansion]
```

- **Manual:** Current manual topic creation form
- **From Template:** Query Template panel (moved here)
- **AI Expansion:** Future - AI-suggested topics based on gaps

**Files:**
- Create `components/AddTopicsPage.tsx`
- Modify sidebar navigation
- Remove "+ Templates" button from TopicalMapDisplay header

### 2.3 Frame Expansion by Topic Type

**Current:** Frame button only shows for Core topics

**New:** Different expansion options per topic type

| Topic Type | Expansion Options | Creates |
|------------|-------------------|---------|
| Core | ATTRIBUTE, ENTITY, CONTEXT, FRAME | Outer topics |
| Outer | FRAME, CHILD | Child topics |
| Child | None (leaf node) | — |

**New CHILD Expansion Mode:**
- Generates sub-topics: FAQs, variations, audience-specific versions
- Example: "Best Plumber" → "Best Plumber for Emergencies", "Best Plumber Reviews"

**File:** Modify `components/ui/TopicDetailPanel.tsx`

**Types:** Add 'CHILD' to ExpansionMode union in `types.ts`

---

## Implementation Phases

### Phase 1: Data Foundation
1. Add `EntityIdentity` interface to `types.ts`
2. Add `kpMetadata` to `SemanticTriple` in `types.ts`
3. Add `entityIdentity` field to `BusinessInfo` in `types.ts`
4. Create database migration for new fields

### Phase 2: UI Fixes (Quick Wins)
5. Fix Query Template panel (locations, help text, checkboxes)
6. Fix Frame expansion visibility by topic type
7. Add CHILD expansion mode

### Phase 3: Navigation & Pages
8. Create AddTopicsPage with tabs
9. Move Query Templates to AddTopicsPage
10. Add navigation items for KP Strategy and Entity Authority
11. Create KP Strategy page shell
12. Create Entity Authority page shell

### Phase 4: Wizard Enhancements
13. Add Entity Identity step to Business Info Wizard
14. Add KP flagging to EAV Wizard

### Phase 5: KP Features
15. Implement Seed Sources tracker
16. Implement KP-Contributing Statements generator
17. Implement Readiness Score calculation
18. Implement EAV Consensus Tracker
19. Implement Priority Actions generator

### Phase 6: Integration
20. Connect EAV Wizard KP flags to KP Strategy page
21. Connect Business Info entity identity to both pages
22. Add KP sheet to Excel export

---

## Files to Create

| File | Purpose |
|------|---------|
| `components/KPStrategyPage.tsx` | KP Strategy page |
| `components/EntityAuthorityPage.tsx` | Entity Authority page |
| `components/AddTopicsPage.tsx` | Unified topic creation with tabs |
| `services/kpReadinessService.ts` | Calculate KP readiness scores |
| `services/kpStatementGenerator.ts` | Generate declarative statements from EAVs |
| `config/seedSources.ts` | Seed source definitions and validation |

## Files to Modify

| File | Changes |
|------|---------|
| `types.ts` | Add EntityIdentity, KPMetadata, CHILD expansion mode |
| `components/templates/QueryTemplatePanel.tsx` | Location fixes, help panel, checkboxes |
| `components/ui/TopicDetailPanel.tsx` | Expansion options by topic type |
| `components/BusinessInfoWizard.tsx` | Add Entity Identity step |
| `components/EAVWizard.tsx` | Add KP flagging column |
| Navigation components | Add new menu items |
| `utils/enhancedExportUtils.ts` | Add KP sheet to export |

---

## Success Criteria

### Knowledge Panel
- [ ] Entity Identity captured in Business Info Wizard
- [ ] KP Strategy page shows seed sources and statements
- [ ] Entity Authority page shows readiness score and actions
- [ ] EAVs can be flagged as KP-contributing
- [ ] Declarative statements auto-generated from EAVs
- [ ] Export includes KP sheet

### UI Fixes
- [ ] Query Templates show locations based on region
- [ ] Location selection uses checkboxes with helpers
- [ ] Query Templates accessible via Content → Add Topic → From Template
- [ ] Frame expansion shows for Core topics (full options)
- [ ] Frame + Child expansion shows for Outer topics
- [ ] Child topics show no expansion (leaf nodes)
