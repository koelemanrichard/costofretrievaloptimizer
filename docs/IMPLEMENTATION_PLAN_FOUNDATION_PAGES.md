# Implementation Plan: Foundation Pages & Navigation Structure

**Status:** IN PROGRESS - Phases 1-3 Complete
**Created:** 2025-11-29
**Last Updated:** 2025-12-01
**Based on Research:** homepage.md, company pages about us EEAT.md, head header footer.md, Headers H rules.md, html structuur boilerplate en headers in head and footer.md

---

## Progress Summary

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ COMPLETE | Smart Defaults - Foundation pages auto-generated with maps |
| Phase 2 | ✅ COMPLETE | Validation Extension - Foundation page validation integrated |
| Phase 3 | ✅ COMPLETE | Blueprint Wizard - Pre-generation wizard with NAP, pages, navigation |
| Phase 4 | ✅ COMPLETE | Navigation Designer - Visual editor (no drag-drop yet) |
| Phase 5 | 🔲 NOT STARTED | Internal Linking System - Multi-pass optimization |
| Phase 6 | 🔲 NOT STARTED | Intelligent Audit System - Unified audit with fixes |

### Additional Enhancements Completed (2025-12-01)
- ✅ Multi-office NAP support (1 to many locations, multi-country)
- ✅ Founded year field in NAP form
- ✅ Loading indicator for "Complete & Generate" button
- ✅ Fixed "Generate Missing Pages" to properly merge new pages
- ✅ Navigation Designer integrated as third tab in Website Structure panel
- ✅ Navigation save/load from database

---

## Executive Summary

This plan adds foundation pages (Homepage, About Us, Contact, Privacy, Terms) and navigation/header/footer structure to topical maps based on Holistic SEO research. This transforms topical maps from content plans into complete website blueprints.

**Implementation Strategy:** Start with Phase 1 (Smart Defaults), then progressively add Phase 2 (Validation), Phase 3 (Blueprint Wizard), Phase 4 (Navigation Designer), Phase 5 (Internal Linking), and Phase 6 (Unified Audit).

---

## Research Rules Integrated

### From `homepage.md`
| Rule | Implementation |
|------|----------------|
| Homepage = Entity Home | H1 template reflects Central Entity + Source Context |
| Target Canonical Query | Homepage targets main business query |
| Link to Quality Nodes | Top 5-10 articles linked from homepage |
| First 400 chars = Centerpiece Text | Template enforces critical info + CTA first |
| Most internally linked page | Navigation Designer enforces homepage in all sections |
| Max 150 links total | Real-time link counter |
| LCP optimization | Schema export includes performance hints |
| Semantic HTML | Export uses `<header>`, `<footer>`, `<nav>`, `<main>` |

### From `company pages about us EEAT.md`
| Rule | Implementation |
|------|----------------|
| E-A-T corroboration | About page with expertise, credentials |
| NAP consistency | Single source of truth in `foundation_pages.nap_data` |
| Organization Schema | Auto-generated for homepage |
| AboutPage/ContactPage Schema | Schema type per page |
| Expertise display | Sections template for credentials |
| Footer legal links | Legal Links section in Navigation Designer |

### From `head header footer.md`
| Rule | Implementation |
|------|----------------|
| UTF-8 consistency | Export generates proper charset |
| First 1.4KB critical | SEO tags prioritized in export |
| Semantic HTML | `<header>`, `<footer>`, `<nav>` in export |
| Max 150 links per page | Enforced with real-time counting |
| Dynamic boilerplate | `dynamic_by_section` toggle in navigation |

### From `Headers H rules.md`
| Rule | Implementation |
|------|----------------|
| H1 = Macro Context | H1 template targets Central Entity + CSI |
| H2 sequence = Contextual Vector | Sections array defines H2 flow |
| Numeric values in H1 | Template suggestions include numbers |
| Each H2 in `<section>` | Export generates semantic structure |
| Visual hierarchy | CSS hints in export |

### From `html structuur boilerplate en headers in head and footer.md`
| Rule | Implementation |
|------|----------------|
| Pure HTML links | No JS-dependent links in export |
| 150 link maximum | Hard limit with warnings |
| Dynamic headers/footers | Section-aware navigation |
| Descriptive anchor texts | Validation for generic anchors |
| NAP + E-A-T in footer | NAP display toggle |
| H4/H5/H6 for footer | Footer sections use H4 |
| No anchor repetition >3x | Anchor text audit |

---

## Phase 1: Smart Defaults (Foundation) ✅ COMPLETE

**Goal:** Auto-generate foundation pages when creating a new topical map.
**Priority:** HIGH
**Completed:** 2025-11-29

### Task 1.1: Add Type Definitions
**File:** `types.ts`
**Status:** ✅ COMPLETED

Added types including:
- `FoundationPageType` - enum for page types
- `FoundationPage` - full page specification
- `FoundationPageSection` - content section hints
- `NAPData` - Name, Address, Phone, Email (+ `OfficeLocation` for multi-office support)
- `NavigationStructure` - header/footer config
- `NavigationLink` - link definition
- `FooterSection` - footer column

### Task 1.2: Create Database Migration - Foundation Pages
**File:** `supabase/migrations/20251129000000_foundation_pages.sql`
**Status:** ✅ COMPLETED

```sql
-- Foundation Pages Table
CREATE TABLE foundation_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  map_id UUID NOT NULL REFERENCES topical_maps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  page_type TEXT NOT NULL CHECK (page_type IN ('homepage', 'about', 'contact', 'privacy', 'terms', 'author')),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  meta_description TEXT,
  h1_template TEXT,
  schema_type TEXT CHECK (schema_type IN ('Organization', 'AboutPage', 'ContactPage', 'WebPage')),
  sections JSONB,
  nap_data JSONB,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deletion_reason TEXT CHECK (deletion_reason IN ('user_deleted', 'not_needed')),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(map_id, page_type)
);

-- RLS Policies
ALTER TABLE foundation_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own foundation pages"
  ON foundation_pages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own foundation pages"
  ON foundation_pages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own foundation pages"
  ON foundation_pages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own foundation pages"
  ON foundation_pages FOR DELETE
  USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_foundation_pages_map_id ON foundation_pages(map_id);
CREATE INDEX idx_foundation_pages_user_id ON foundation_pages(user_id);
```

### Task 1.3: Create Database Migration - Navigation Structures
**File:** `supabase/migrations/YYYYMMDD_navigation_structures.sql`
**Status:** PENDING

```sql
-- Navigation Structures Table
CREATE TABLE navigation_structures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  map_id UUID NOT NULL REFERENCES topical_maps(id) ON DELETE CASCADE UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  header JSONB NOT NULL DEFAULT '{"logo_alt_text": "", "primary_nav": [], "cta_button": null}',
  footer JSONB NOT NULL DEFAULT '{"sections": [], "legal_links": [], "nap_display": true, "copyright_text": ""}',
  max_header_links INTEGER DEFAULT 10,
  max_footer_links INTEGER DEFAULT 30,
  dynamic_by_section BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Navigation Sync Status Table
CREATE TABLE navigation_sync_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  map_id UUID NOT NULL REFERENCES topical_maps(id) ON DELETE CASCADE UNIQUE,
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  topics_modified_since INTEGER DEFAULT 0,
  requires_review BOOLEAN DEFAULT false,
  pending_changes JSONB DEFAULT '{"addedTopics": [], "deletedTopics": [], "renamedTopics": []}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE navigation_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE navigation_sync_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own navigation"
  ON navigation_structures FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own sync status"
  ON navigation_sync_status FOR ALL
  USING (map_id IN (SELECT id FROM topical_maps WHERE user_id = auth.uid()));
```

### Task 1.4: Add Foundation Page Generation Prompt
**File:** `config/prompts.ts`
**Status:** ✅ COMPLETED

Implemented `GENERATE_FOUNDATION_PAGES_PROMPT` function that:
- Takes BusinessInfo and SEOPillars as input
- Generates 5+ foundation pages (homepage, about, contact, privacy, terms, author)
- Returns JSON with page specs and NAP suggestions
- Enforces E-A-T principles
- Uses Central Entity in H1 templates

### Task 1.5: Create Foundation Pages Service
**File:** `services/ai/foundationPages.ts`
**Status:** ✅ COMPLETED

Implemented functions:
- `generateFoundationPages(businessInfo, pillars, dispatch, selectedPages?)` - AI generation with page type filtering
- `generateDefaultNavigation(foundationPages, coreTopics)` - Create default nav
- `saveFoundationPages(mapId, userId, pages)` - Database save with upsert
- `loadFoundationPages(mapId)` - Database load
- `updateFoundationPage(pageId, updates)` - Update single page
- `deleteFoundationPage(pageId, reason)` - Soft delete
- `restoreFoundationPage(pageId)` - Restore deleted page

### Task 1.6: Add State Management for Foundation Pages
**File:** `state/appState.ts`
**Status:** ✅ COMPLETED

Added to AppState:
- `foundationPages: FoundationPage[]`
- `navigation: NavigationStructure | null`
- `websiteStructure: { napData?: NAPData }`

Added actions:
- `SET_FOUNDATION_PAGES`
- `UPDATE_FOUNDATION_PAGE`
- `DELETE_FOUNDATION_PAGE`
- `SET_NAVIGATION`
- `SET_NAP_DATA`

### Task 1.7: Create FoundationPagesPanel Component
**File:** `components/FoundationPagesPanel.tsx`
**Status:** ✅ COMPLETED

Component features:
- List of all foundation pages with status badges
- NAP data input form with multi-office support
- Expandable cards for each page
- Edit title, slug, meta description, H1 template
- Delete with confirmation (soft delete)
- "Generate Missing Pages" button (with proper merge logic)
- Completion counter (X/Y pages)

### Task 1.8: Add Website Structure Tab to Dashboard
**File:** `components/ProjectDashboard.tsx`
**Status:** ✅ COMPLETED

Changes:
- Added "Website Structure" section with scroll-to functionality
- "Website Structure" button in WorkbenchPanel with badge count
- Load foundation pages when component mounts
- Pass props to FoundationPagesPanel

### Task 1.9: Integrate Foundation Generation into Map Creation
**File:** `components/ProjectWorkspace.tsx`
**Status:** ✅ COMPLETED

After map generation:
1. Generate foundation pages via AI (with selectedPages filter from blueprint)
2. Save to database
3. Generate default navigation
4. Save navigation to database
5. Update state
6. Show success notification

### Task 1.10: Update Database Types
**File:** `database.types.ts`
**Status:** ✅ COMPLETED

Added Supabase-generated types for:
- `foundation_pages` table
- `navigation_structures` table
- `navigation_sync_status` table

### Task 1.11: Create Sitemap View Component
**File:** `components/ui/SitemapView.tsx`
**Status:** 🔲 DEFERRED (lower priority)

Display computed sitemap:
- Foundation pages section
- Core topics with children
- Total URL count
- Hierarchical tree view
- Filter by type

### Task 1.12: Add NAP Input Form Component
**File:** `components/ui/NAPForm.tsx`
**Status:** PENDING

Reusable NAP form:
- Company name input
- Address input (with validation hints)
- Phone input (with formatting)
- Email input (with validation)
- Founded year (optional)
- Save button with loading state

### Task 1.13: Create Foundation Page Card Component
**File:** `components/ui/FoundationPageCard.tsx`
**Status:** PENDING

Individual page display:
- Page type icon
- Title (editable)
- Status badge (complete/needs attention/deleted)
- Expand to show details
- Quick actions (edit, delete, restore)

### Task 1.14: Add Schema Preview Component
**File:** `components/ui/SchemaPreview.tsx`
**Status:** PENDING

Display generated schema:
- JSON-LD formatted
- Syntax highlighting
- Copy button
- Validation indicator

### Task 1.15: Create Non-Blocking Notification Component
**File:** `components/ui/FoundationNotificationBanner.tsx`
**Status:** PENDING

Yellow warning banner:
- Dismissable
- "Don't show again" option
- Action button (e.g., "Add About Page")
- Stacks multiple notifications

---

## Phase 2: Validation Extension ✅ COMPLETE

**Goal:** Extend existing Validate Map to check foundation page completeness.
**Priority:** MEDIUM
**Completed:** 2025-11-30

### Task 2.1: Extend Validation Prompt
**File:** `config/prompts.ts`
**Status:** PENDING

Add to `VALIDATE_TOPICAL_MAP_PROMPT`:
- Rule H: Foundation Page Completeness (WARNING)
- Rule I: Navigation Structure (SUGGESTION)

### Task 2.2: Add Foundation Validation Types
**File:** `types.ts`
**Status:** ✅ COMPLETED

Added:
- `FoundationPageIssues` interface
- `NavigationIssues` interface

### Task 2.3: Implement Foundation Validation Logic
**File:** `services/ai/analysis.ts`
**Status:** PENDING

Add `validateFoundationPages()` function:
- Check for missing pages
- Verify NAP data completeness
- Check H1 templates reference Central Entity
- Validate section structure
- Return FoundationPageIssues

### Task 2.4: Implement Navigation Validation Logic
**File:** `services/ai/analysis.ts`
**Status:** PENDING

Add `validateNavigation()` function:
- Count header links (warn if >10)
- Count footer links (warn if >30)
- Check homepage is in header
- Check legal pages in footer
- Return NavigationIssues

### Task 2.5: Update validateTopicalMap Function
**File:** `services/ai/analysis.ts`
**Status:** PENDING

Modify to:
1. Run existing topic validation
2. Run foundation page validation
3. Run navigation validation
4. Merge results into ValidationResult
5. Adjust overall score based on foundation/nav issues

### Task 2.6: Update ValidationResultModal
**File:** `components/ValidationResultModal.tsx`
**Status:** PENDING

Add new sections:
- Foundation Pages Issues tab
- Navigation Issues tab
- "Repair Foundation" button
- Missing pages list with "Add" buttons

### Task 2.7: Add Repair Foundation Handler
**File:** `components/TopicalMapDisplay.tsx`
**Status:** PENDING

Add `handleRepairFoundation()`:
1. Generate missing foundation pages
2. Fill in suggested NAP data
3. Create default navigation if missing
4. Update database and state
5. Re-run validation

### Task 2.8: Add Foundation Quick Actions
**File:** `components/TopicalMapDisplay.tsx`
**Status:** PENDING

Add buttons near existing "Repair Section Labels":
- "Repair Foundation Pages"
- "Configure Navigation"
- Link to Website Structure tab

---

## Phase 3: Website Blueprint Wizard ✅ COMPLETE

**Goal:** Pre-generation wizard for foundation pages and navigation.
**Priority:** MEDIUM
**Completed:** 2025-12-01

### Additional Enhancements Added:
- Multi-office NAP support (1 to many locations)
- Founded year field
- Loading indicator for Complete & Generate button
- Page selection carries through to foundation page generation

### Task 3.1: Create WebsiteBlueprintWizard Component
**File:** `components/WebsiteBlueprintWizard.tsx`
**Status:** ✅ COMPLETED

Multi-step wizard implemented:
- Step 1: NAP input (with multi-office support)
- Step 2: Foundation page selection (including author page)
- Step 3: Navigation preferences
- Back/Next navigation with loading states
- Skip option

### Task 3.2: Create Industry Blueprint Templates
**File:** `config/blueprintTemplates.ts`
**Status:** ✅ COMPLETED

Templates for:
- E-commerce (+ Shipping, Returns)
- SaaS (+ Pricing, Support)
- Local Business (+ Service Areas)
- Blog/Media (+ Editorial Policy)
- Professional Services (+ Team, Testimonials)

### Task 3.3: Update Wizard Flow
**File:** `components/ProjectWorkspace.tsx`
**Status:** ✅ COMPLETED

Blueprint step inserted after competitor refinement:
- Added `AppStep.BLUEPRINT_WIZARD` to flow
- Wizard renders between competitor selection and map generation

### Task 3.4: Create Template Selector Component
**File:** `components/ui/BlueprintTemplateSelector.tsx`
**Status:** ✅ COMPLETED (integrated into WebsiteBlueprintWizard)

Visual template selection:
- Template cards with descriptions
- Foundation page preview
- Customization options

### Task 3.5: Create Navigation Preferences Form
**File:** Integrated into `components/WebsiteBlueprintWizard.tsx`
**Status:** ✅ COMPLETED

Configuration options:
- Max header links slider (3-15)
- Dynamic navigation toggle
- CTA button toggle
- Footer columns count (2-5)

### Task 3.6: Store Blueprint Config in State
**File:** `state/appState.ts`
**Status:** ✅ COMPLETED

BlueprintConfig interface defined and exported from WebsiteBlueprintWizard.tsx:
```typescript
interface BlueprintConfig {
  napData: NAPData;
  selectedPages: FoundationPageType[];
  templateId?: string;
  navigationPreferences: {
    maxHeaderLinks: number;
    dynamicBySection: boolean;
    includeCTA: boolean;
    footerColumns: number;
  };
}
```

### Task 3.7: Use Blueprint Config in Generation
**File:** `components/ProjectWorkspace.tsx`
**Status:** ✅ COMPLETED

`handleFinalizeBlueprint` and `generateMapWithBlueprint`:
1. Read blueprintConfig from wizard completion
2. Pass selectedPages to foundation page generation
3. Use NAP data from config
4. Apply navigation preferences
5. Only generate selected pages (including author if selected)

---

## Phase 4: Navigation Designer ✅ COMPLETE

**Goal:** Visual navigation editor.
**Priority:** MEDIUM
**Completed:** 2025-12-01

### Task 4.1: Create NavigationDesigner Component
**File:** `components/NavigationDesigner.tsx`
**Status:** ✅ COMPLETED

Main editor layout:
- Header link editor with add/edit/remove
- CTA button toggle and configuration
- Footer section editor with add/remove sections
- Legal links management
- NAP display toggle
- Copyright text field
- Real-time link counting with warning colors
- Save/discard buttons with loading states

### Task 4.2: Create NavigationPreview Component
**File:** `components/ui/NavigationPreview.tsx`
**Status:** ✅ COMPLETED

Preview component showing:
- Header with logo, nav links, CTA
- Footer with sections, legal links, NAP
- Responsive design

### Task 4.3: Add Reordering for Header Links
**File:** `components/NavigationDesigner.tsx`
**Status:** ✅ COMPLETED (Arrow buttons instead of DnD)

Implemented with up/down arrow buttons:
- Reorder header links
- Visual indicators
- Keyboard accessible via button clicks

### Task 4.4: Footer Section Management
**File:** `components/NavigationDesigner.tsx`
**Status:** ✅ COMPLETED

Footer management:
- Add/remove sections
- Add/remove links within sections
- Section heading editing

### Task 4.5: Inline Link Editing
**File:** `components/NavigationDesigner.tsx`
**Status:** ✅ COMPLETED (Inline instead of modal)

Inline link editing:
- Text input
- Target selector (foundation pages, core topics, external URL)
- External URL input when needed
- Delete button

### Task 4.6: Target Selection
**File:** `components/NavigationDesigner.tsx`
**Status:** ✅ COMPLETED (Integrated into link editor)

Inline target selection via dropdown:
- Foundation pages optgroup
- Core topics optgroup
- External URL option

### Task 4.7: Add Real-Time Link Counting
**File:** `components/NavigationDesigner.tsx`
**Status:** ✅ COMPLETED

Display counters:
- Header links: X/10
- Footer links: X/30
- Total links: X/150
- Color-coded warnings (green → yellow → red)

### Task 4.8: Add Smart Link Suggestions
**File:** `services/ai/navigationSuggestions.ts`
**Status:** 🔲 DEFERRED (future enhancement)

AI-powered suggestions - deferred for Phase 5 or later.

### Task 4.9: Create Export Functionality
**File:** `services/navigationExport.ts`
**Status:** 🔲 DEFERRED (future enhancement)

Export formats - deferred for Phase 5 or later.

### Task 4.10: Add Navigation Tab to Dashboard
**File:** `components/FoundationPagesPanel.tsx`
**Status:** ✅ COMPLETED

Added "Navigation" tab to Website Structure panel:
- Tab alongside Foundation Pages and NAP Data
- NavigationDesigner component integration
- Load navigation from state
- Save navigation to database

---

## Phase 5: Internal Linking System

**Goal:** Multi-pass internal linking optimization.
**Priority:** LOW
**Estimated Tasks:** 8

### Task 5.1: Add Internal Linking Types
**File:** `types.ts`
**Status:** ✅ COMPLETED

Added:
- `InternalLinkingRules`
- `LinkingIssue`
- `LinkingPassResult`
- `LinkingAuditResult`

### Task 5.2: Create Database Migration - Linking Analysis
**File:** `supabase/migrations/YYYYMMDD_linking_analysis.sql`
**Status:** PENDING

```sql
CREATE TABLE linking_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  map_id UUID NOT NULL REFERENCES topical_maps(id) ON DELETE CASCADE,
  pass_results JSONB NOT NULL,
  overall_score INTEGER,
  summary JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Task 5.3: Implement Pass 1 - Hub-Spoke Links
**File:** `services/ai/internalLinking.ts`
**Status:** PENDING

Check:
- Every outer links to parent core
- Every core links to children
- 1:7 ratio coverage

### Task 5.4: Implement Pass 2 - Cross-Cluster Links
**File:** `services/ai/internalLinking.ts`
**Status:** PENDING

Check:
- Semantic relationships between clusters
- Bridge links where context overlaps
- Limit to prevent dilution

### Task 5.5: Implement Pass 3-4 - Quality Nodes & Foundation
**File:** `services/ai/internalLinking.ts`
**Status:** PENDING

Check:
- Quality Nodes linked from multiple sources
- Homepage links to Quality Nodes
- Foundation pages properly linked

### Task 5.6: Implement Pass 5-6 - Anchor Text & Validation
**File:** `services/ai/internalLinking.ts`
**Status:** PENDING

Check:
- No anchor text repeated >3 times
- Total links per page <150
- Suggest alternatives for repetitive anchors

### Task 5.7: Create Linking Audit UI
**File:** `components/LinkingAuditPanel.tsx`
**Status:** PENDING

Display:
- Pass results with status
- Issue list by severity
- Auto-fix suggestions
- Apply fixes button

### Task 5.8: Add Linking Tab to Dashboard
**File:** `components/ProjectDashboardContainer.tsx`
**Status:** PENDING

Add "Linking" tab or sub-section in Audit.

---

## Phase 6: Intelligent Audit System

**Goal:** Unified audit with fix application.
**Priority:** LOW
**Estimated Tasks:** 10

### Task 6.1: Add Unified Audit Types
**File:** `types.ts`
**Status:** ✅ COMPLETED

Added:
- `AuditSeverity`
- `AuditRule`
- `AuditCategory`
- `UnifiedAuditIssue`
- `AuditCategoryResult`
- `UnifiedAuditResult`
- `AuditFix`
- `AuditHistoryEntry`

### Task 6.2: Create Database Migration - Audit System
**File:** `supabase/migrations/YYYYMMDD_audit_system.sql`
**Status:** PENDING

```sql
CREATE TABLE audit_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  map_id UUID NOT NULL REFERENCES topical_maps(id) ON DELETE CASCADE,
  overall_score INTEGER,
  categories JSONB,
  total_issues INTEGER,
  critical_count INTEGER,
  warning_count INTEGER,
  suggestion_count INTEGER,
  auto_fixable_count INTEGER,
  run_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  run_by UUID REFERENCES auth.users(id)
);

CREATE TABLE audit_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  map_id UUID NOT NULL REFERENCES topical_maps(id) ON DELETE CASCADE,
  audit_run_id UUID NOT NULL,
  category TEXT NOT NULL,
  issue_id TEXT NOT NULL,
  fix_description TEXT NOT NULL,
  changes JSONB NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  applied_by UUID REFERENCES auth.users(id),
  undone_at TIMESTAMP WITH TIME ZONE,
  can_undo BOOLEAN DEFAULT true
);
```

### Task 6.3: Define Audit Categories and Rules
**File:** `config/auditRules.ts`
**Status:** PENDING

Define categories:
- Topical Structure (25% weight)
- Foundation Pages (15% weight)
- Navigation (20% weight)
- Internal Linking (20% weight)
- Content Structure (20% weight)

### Task 6.4: Implement Unified Audit Engine
**File:** `services/ai/unifiedAudit.ts`
**Status:** PENDING

Main function:
- Run all category audits
- Collect issues
- Calculate scores
- Determine auto-fixable items
- Return UnifiedAuditResult

### Task 6.5: Implement Fix Application System
**File:** `services/ai/auditFixes.ts`
**Status:** PENDING

Functions:
- `generateFix(issue)` - Create fix definition
- `applyFix(fix)` - Execute single fix
- `applyFixes(fixes)` - Batch with transaction
- `undoFix(historyEntry)` - Rollback fix

### Task 6.6: Create Audit Dashboard Component
**File:** `components/AuditDashboard.tsx`
**Status:** PENDING

Full audit UI:
- Overall score with progress bar
- Category breakdown table
- Critical/Warning/Suggestion counts
- "Fix All Auto-Fixable" button
- Issue list by category

### Task 6.7: Create Issue Card Component
**File:** `components/ui/AuditIssueCard.tsx`
**Status:** PENDING

Individual issue display:
- Severity icon
- Message
- Affected items
- [Apply Fix] [Ignore] [Details] buttons
- Fix type indicator

### Task 6.8: Create Audit History Panel
**File:** `components/AuditHistoryPanel.tsx`
**Status:** PENDING

History display:
- List of applied fixes
- Undo button for eligible fixes
- Timestamp
- Applied by

### Task 6.9: Add Audit Tab to Dashboard
**File:** `components/ProjectDashboardContainer.tsx`
**Status:** PENDING

Add "Audit" tab:
- Run Audit button
- AuditDashboard component
- History toggle

### Task 6.10: Implement Progress Tracking
**File:** `services/ai/unifiedAudit.ts`
**Status:** PENDING

Track improvement over time:
- Store historical scores
- Show trend graph
- Highlight improvements

---

## Critical UX Requirements

### Requirement 1: Non-Intrusive Integration
- Current topical map workflow remains unchanged
- Foundation pages are additive, not blocking
- Navigation is a separate step after map creation

### Requirement 2: Foundation Pages Are Optional
- Users can skip or delete any foundation page
- Non-blocking notifications (yellow banners, not modals)
- Soft delete tracks user intent
- "Don't show again" option for notifications

### Requirement 3: Sitemap/Navigation as Next Step
- Clear "Next Step" prompts after map generation
- "Skip for now" always available
- No required steps

### Requirement 4: Topic Changes Trigger Notifications
- Track changes since last navigation sync
- Show badge on Navigation tab
- Offer auto-update or manual review

### Requirement 5: Updates Reflected in Sitemap
- Sitemap is computed view, not stored
- Automatically includes all topics + foundation pages
- Filters out soft-deleted pages

---

## Database Persistence Summary

| Feature | Table | Key Fields |
|---------|-------|------------|
| Foundation Pages | `foundation_pages` | id, map_id, page_type, title, slug, sections, nap_data, deleted_at |
| Navigation Structure | `navigation_structures` | id, map_id, header, footer, max_links, dynamic_by_section |
| Navigation Sync | `navigation_sync_status` | map_id, last_synced_at, pending_changes |
| Audit Results | `audit_results` | id, map_id, categories, overall_score |
| Audit History | `audit_history` | id, map_id, issue_id, changes, applied_at, undone_at |
| Linking Analysis | `linking_analysis` | id, map_id, pass_results, summary |

---

## Success Criteria

After full implementation:
- [ ] Every new topical map can include 5 foundation pages
- [ ] NAP data is captured and consistent across pages
- [ ] Navigation follows max 150 link rule
- [ ] Header has ≤10 links by default
- [ ] Footer has dynamic sections
- [ ] Validation catches missing E-A-T pages
- [ ] Users can visually design navigation
- [ ] Exported navigation includes semantic HTML and Schema
- [ ] Internal linking follows all research rules
- [ ] Unified audit catches all optimization issues
- [ ] One-click fixes for auto-fixable issues
- [ ] Audit history with undo support

---

## Approval Required

**This plan requires approval before implementation begins.**

To approve, confirm:
1. Phase 1 implementation scope is correct
2. UX requirements are understood
3. Database schema is acceptable
4. Implementation order is approved

Once approved, implementation will proceed phase by phase with regular check-ins.
