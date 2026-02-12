# Unified Content Audit System — Critical Review & Plan Revision

> **Status**: This document supersedes and amends the original plan at `2026-02-11-unified-content-audit-system.md`.
> All decisions here are final and must be incorporated before implementation begins.

---

## User Decisions (Final)

| Decision | Choice | Impact |
|----------|--------|--------|
| Rule coverage scope | **Full 437-rule coverage** | 3-4x scope increase; requires new rule implementation sprints |
| UI cleanup | **Sprint 0 cleanup first** | Delete V1 components, consolidate dashboards before building new |
| GSC/GA4 scope | **Phased: GSC API first, GA4 later, then multi-account** | Split into 3 mini-sprints |
| Phase weights | **User-configurable per project** | Add weight config UI + database storage |

---

## Critical Issues Found (Must Address Before Implementation)

### Issue 1: 75% of the 437-Rule Checklist Is NOT Implemented

The plan wraps existing services into a unified shell, but those services only implement ~108 of 437 rules (25%). The remaining 329 rules exist only in the reference checklist (`docs/build-docs/semantic-seo-audit-checklist-v2.md`) and are NOT enforced algorithmically.

**Rule implementation status by category:**

| Deel | Category | Rules | Implemented | Gap | Priority |
|------|----------|-------|-------------|-----|----------|
| A | Strategic Foundation (Macro Context, SC, CSI) | 1-16 | 5 (31%) | 11 | P0-P1 |
| A | E-E-A-T Signaling | 17-25 | 2 (22%) | 7 | P1-P3 |
| A | AI Pattern Avoidance | 26-32 | 7 (100%) | 0 | Done |
| B | EAV Triple Structure | 33-48 | 8 (50%) | 8 | P1-P2 |
| B | Knowledge-Based Trust (KBT) | 49-56 | 3 (38%) | 5 | P0 |
| C | Modality & Predicates | 57-72 | 6 (38%) | 10 | P1-P3 |
| D | Sentence Structure | 73-78 | 5 (83%) | 1 | P2 |
| D | Word Order & Prominence | 79-84 | 3 (50%) | 3 | P2-P3 |
| D | Context Qualifiers | 85-93 | 0 (0%) | 9 | P2-P3 |
| E | Information Density | 94-99 | 4 (67%) | 2 | P1-P2 |
| E | Filler Words & Vagueness | 100-112 | 8 (62%) | 5 | P1-P2 |
| F | Centerpiece Text | 113-120 | 4 (50%) | 4 | P0-P1 |
| F | Subordinate Text | 121-131 | 3 (27%) | 8 | P1-P2 |
| F | Heading Hierarchy & Vector | 132-149 | 8 (44%) | 10 | P0-P2 |
| F | Discourse Integration | 150-153 | 1 (25%) | 3 | P2-P3 |
| F | Contextual Bridges | 154-158 | 1 (20%) | 4 | P2-P3 |
| F | Introduction Alignment | 159-161 | 1 (33%) | 2 | P2-P3 |
| G | Anchor Text | 162-168 | 4 (57%) | 3 | P1-P3 |
| G | Link Placement | 169-173 | 3 (60%) | 2 | P1-P2 |
| G | Annotation Text | 174-177 | 2 (50%) | 2 | P1-P2 |
| G | Link Volume & PageRank | 178-185 | 5 (63%) | 3 | P1-P2 |
| G | Navigation & Dynamic | 186-189 | 2 (50%) | 2 | P2-P3 |
| G | URL Fragments & Jump Links | 190-194 | 0 (0%) | 5 | P2-P3 |
| H | Semantic Distance | 195-203 | 0 (0%) | 9 | P1-P3 |
| I | Format Per Intent Type | 204-209 | 4 (67%) | 2 | P1-P2 |
| I | List Rules | 210-215 | 4 (67%) | 2 | P1-P2 |
| I | Table Rules | 216-219 | 2 (50%) | 2 | P1-P3 |
| I | Visual Hierarchy | 220-224 | 0 (0%) | 5 | P2 |
| I | Featured Snippet Optimization | 225-229 | 1 (20%) | 4 | P1-P2 |
| I | Related Content Section | 230-232 | 0 (0%) | 3 | P2-P3 |
| J | Semantic HTML Tags | 233-241 | 0 (0%) | 9 | P1-P3 |
| J | HTML Validation & Nesting | 242-250 | 0 (0%) | 9 | P0-P3 |
| J | Heading Integrity (HTML) | 251-254 | 2 (50%) | 2 | P0-P2 |
| J | Images | 255-267 | 3 (23%) | 10 | P0-P3 |
| K | Meta Tags | 268-278 | 0 (0%) | 11 | P0-P2 |
| K | Structured Data (JSON-LD) | 279-291 | 4 (31%) | 9 | P1-P3 |
| L | DOM & Code | 292-303 | 0 (0%) | 12 | P1-P4 |
| L | Server & Performance | 304-310 | 0 (0%) | 7 | P1-P3 |
| L | Caching | 311-314 | 0 (0%) | 4 | P2-P3 |
| L | HTTP Headers | 315-319 | 0 (0%) | 5 | P2-P3 |
| L | Core Web Vitals | 320-333 | 0 (0%) | 14 | P1-P3 |
| L | HTTP Requests | 334-335 | 0 (0%) | 2 | P2 |
| M | URL Rules | 336-345 | 0 (0%) | 10 | P1-P3 |
| M | Canonicalization | 346-352 | 0 (0%) | 7 | P0-P2 |
| M | Crawl Efficiency | 353-367 | 0 (0%) | 15 | P1-P3 |
| M | Indexation | 368-379 | 0 (0%) | 12 | P0-P2 |
| N | Central Entity Site-Wide | 380-382 | 1 (33%) | 2 | P1-P2 |
| N | Fact Consistency Cross-Page | 383-385 | 2 (67%) | 1 | P0 |
| N | Template Consistency | 386-388 | 0 (0%) | 3 | P2 |
| N | Network Flow | 389-394 | 2 (33%) | 4 | P1-P2 |
| N | Hub-Spoke Architecture | 395-399 | 1 (20%) | 4 | P2-P3 |
| O | Website-Type Specific | 400-432 | 0 (0%) | 33 | P1-P3 |
| P | Monitoring & Ongoing | 433-437 | 0 (0%) | 5 | P2-P3 |

**Summary**: 108 implemented / 329 missing = **75% gap**

---

### Issue 2: Massive UI Duplication (40+ Components, 60% Overlap)

Three parallel audit ecosystems exist with significant data overlap:

| Dashboard | Tabs | Overlaps With | Action |
|-----------|------|---------------|--------|
| `ComprehensiveAuditDashboard` | 7 tabs | InsightsHub (60%) | **MERGE into InsightsHub** |
| `InsightsHub` | 8 tabs | ComprehensiveAuditDashboard (60%) | **KEEP as base** |
| `AuditDashboardV2` | Site analysis | Separate domain (page-level) | **KEEP** |
| `PortfolioAnalytics` | Quality tracking | Separate domain (portfolio) | **KEEP** |

**V1 components to DELETE** (superseded by V2):
- `components/site-analysis/AuditDashboard.tsx`
- `components/site-analysis/PageAuditDetail.tsx`
- `components/site-analysis/CrawlProgress.tsx`
- `components/site-analysis/ProjectSetup.tsx`
- `components/site-analysis/SiteAnalysisTool.tsx`

**Orphaned component**:
- `components/AuditDashboard.tsx` (root-level, not mounted anywhere) — DELETE or integrate

**AnalysisToolsPanel button consolidation** (12 buttons, some overlapping):
- "Health Check" and "Full Research" both open audit dashboards → MERGE
- Determine canonical audit entry point

---

### Issue 3: Phase Weights Don't Match the 437-Rule Checklist Weights

The checklist defines its own scoring weights. Our phase weights should align:

| Our Phase | Current Weight | Checklist Equivalent | Checklist Weight | Recommendation |
|-----------|---------------|---------------------|------------------|----------------|
| Technical SEO | 15% | Deel K (CoR) + Deel M (URL) | 7% | Reduce to 10% |
| Content Quality | 25% | Deel D (Micro) + E (Density) | 16% | Reduce to 20% |
| Semantic Richness | 20% | Deel B (EAV) + C (Modality) | 20% | Keep at 20% |
| Link Structure | 15% | Deel G (Linking) | 10% | Reduce to 12% |
| Schema & Structured Data | 10% | Deel K (Meta) | 5% | Reduce to 8% |
| E-A-T & Authority | 10% | Deel A (Strategic) | 10% | Keep at 10% |
| Contextual Flow | — | Deel F (Flow) | 15% | **ADD as separate phase** |
| Fact Validation | 5% | — | — | Keep at 5% |

**Decision: Make weights configurable per project.** Default weights should match the checklist weights. Users can adjust per project based on their priorities.

**Default weight configuration:**

```typescript
export const DEFAULT_AUDIT_WEIGHTS: Record<AuditPhaseName, number> = {
  strategicFoundation: 10,  // Deel A: Macro Context, SC, CSI, E-E-A-T
  eavSystem: 15,            // Deel B: EAV triples, KBT consistency
  microSemantics: 13,       // Deel C+D: Modality, sentence structure, qualifiers
  informationDensity: 8,    // Deel E: Density, filler words
  contextualFlow: 15,       // Deel F: Centerpiece, subordinate, headings, discourse
  internalLinking: 10,      // Deel G: Anchors, placement, volume, navigation
  semanticDistance: 3,      // Deel H: Thematic distance, cannibalization
  contentFormat: 5,         // Deel I: Format per intent, lists, tables, FS
  htmlTechnical: 7,         // Deel J: Semantic HTML, validation, images
  metaStructuredData: 5,    // Deel K: Meta tags, JSON-LD
  costOfRetrieval: 4,       // Deel L: DOM, server, CWV
  urlArchitecture: 3,       // Deel M: URLs, canonical, crawl, indexation
  crossPageConsistency: 2,  // Deel N: Site-wide CE, templates, network flow
  // Website-type specific rules applied as bonus/malus
  // Monitoring rules not scored (operational)
};
```

---

### Issue 4: GSC/GA4 Infrastructure Underestimated

**Current state:**
- Zero OAuth infrastructure anywhere in codebase
- GSC is CSV-only (manual upload, 64-line parser)
- No GA4 integration (only indirect via WordPress plugins)
- Single `domain TEXT` field per project (no multi-property)
- No `analytics_connections` table

**Best reference**: WordPress integration (`wordpress_connections` table) supports multi-connection per user and can serve as the architectural template.

**Phased plan (3 mini-sprints):**

| Phase | Scope | Effort | Key Deliverables |
|-------|-------|--------|-----------------|
| 4A | Single-property GSC API | 20-30h | OAuth flow, API client, replace CSV |
| 4B | Multi-property GSC + single GA4 | 20-30h | `analytics_connections` table, property selector, GA4 client |
| 4C | Multi-account management | 10-20h | Multiple Google accounts, sync scheduling |

**Required infrastructure:**
- `supabase/functions/google-oauth-callback/index.ts` — OAuth callback handler
- `supabase/functions/gsc-proxy/index.ts` — GSC API proxy
- `supabase/functions/ga4-proxy/index.ts` — GA4 API proxy
- New database tables: `analytics_connections`, `analytics_properties`, `analytics_sync_logs`
- Token encryption using existing Supabase Vault pattern
- Automatic token refresh mechanism

---

### Issue 5: Missing Audit Data Migration Path

Six existing audit tables contain historical data:
- `audit_results` — unified audit snapshots
- `linking_audit_results` — linking audit data
- `query_network_audits` — competitor gap data
- `eat_scanner_audits` — E-A-T scan results
- `corpus_audits` — site-wide analysis
- `enhanced_metrics_snapshots` — performance metrics

**The new `unified_audit_snapshots` table must:**
1. Store its own results with the new 437-rule scoring
2. Reference existing audit data via foreign keys (not duplicate)
3. Provide a migration view that combines old + new audit history
4. NOT orphan existing data

**Schema addition:**
```sql
-- Link to existing audit tables for historical continuity
ALTER TABLE unified_audit_snapshots ADD COLUMN legacy_audit_id UUID REFERENCES audit_results(id);
ALTER TABLE unified_audit_snapshots ADD COLUMN legacy_linking_audit_id UUID REFERENCES linking_audit_results(id);
```

---

## Revised Sprint Plan

### Sprint 0: UI Cleanup & Foundation (NEW)

**Goal**: Delete V1 components, consolidate overlapping dashboards, clean AnalysisToolsPanel.

#### Task 0.1: Delete V1 site-analysis components
- Delete: `components/site-analysis/AuditDashboard.tsx` (V1)
- Delete: `components/site-analysis/PageAuditDetail.tsx` (V1)
- Delete: `components/site-analysis/CrawlProgress.tsx` (V1)
- Delete: `components/site-analysis/ProjectSetup.tsx` (V1)
- Delete: `components/site-analysis/SiteAnalysisTool.tsx` (V1)
- Update all imports that reference V1 → V2

#### Task 0.2: Consolidate ComprehensiveAuditDashboard into InsightsHub
- Move "Semantic Map" tab from ComprehensiveAuditDashboard → InsightsHub
- Move "Historical Audits" tab from ComprehensiveAuditDashboard → InsightsHub
- Delete ComprehensiveAuditDashboard component
- Update `/audit` route to redirect to `/insights`

#### Task 0.3: Clean up orphaned AuditDashboard (root)
- Delete or integrate `components/AuditDashboard.tsx` (not mounted anywhere)

#### Task 0.4: Consolidate AnalysisToolsPanel buttons
- Merge "Health Check" and "Full Research" into single "Audit" button
- Group remaining buttons logically:
  - Primary: "Full Audit" (unified), "Quick Audit" (fast check)
  - Analysis: "Gap Analysis", "E-A-T Scanner", "Corpus Audit"
  - Tools: "Validate Map", "Link Audit", "Authority"

#### Task 0.5: Verify no regressions
- Run full test suite
- Manual smoke test of all audit entry points

---

### Sprint 1: Orchestrator + Phase Adapters (as in original plan, with revised phases)

Phases revised to match 437-rule checklist categories:

| Phase | Category | Checklist Rules | Default Weight |
|-------|----------|----------------|----------------|
| 1 | Strategic Foundation | A: 1-32 | 10% |
| 2 | EAV System | B: 33-56 | 15% |
| 3 | Micro-Semantics | C+D: 57-93 | 13% |
| 4 | Information Density | E: 94-112 | 8% |
| 5 | Contextual Flow | F: 113-161 | 15% |
| 6 | Internal Linking | G: 162-194 | 10% |
| 7 | Semantic Distance | H: 195-203 | 3% |
| 8 | Content Format | I: 204-232 | 5% |
| 9 | HTML & Technical | J: 233-267 | 7% |
| 10 | Meta & Structured Data | K: 268-291 | 5% |
| 11 | Cost of Retrieval | L: 292-335 | 4% |
| 12 | URL & Architecture | M: 336-379 | 3% |
| 13 | Cross-Page Consistency | N: 380-399 | 2% |
| 14 | Website-Type Specific | O: 400-432 | bonus/malus |
| 15 | Fact Validation | custom | 5% (optional) |

**Add configurable weights:**
- Database: `project_audit_config` table with `weights JSONB`
- UI: Weight sliders in audit settings per project
- Default: checklist weights above

---

### Sprint 2: Content Fetching & External URL Support (unchanged)

### Sprint 3: Fact Validation Service (unchanged)

### Sprint 4A: GSC API Integration (single property)
- Build Google OAuth flow (consent screen, callback, token exchange)
- Create `analytics_connections` table
- Implement GSC API client (search analytics, page performance)
- Keep existing CSV import as fallback
- Add "Connect Search Console" button in settings

### Sprint 4B: Multi-property GSC + GA4 API
- Extend `analytics_connections` for multiple properties per project
- Build GA4 API client (pageviews, bounce rate, engagement)
- Add property selector UI
- Build GA4 OAuth flow (same infrastructure, different scopes)

### Sprint 4C: Multi-account & Sync Management
- Support multiple Google accounts per user
- Build automated sync worker (daily/weekly data pulls)
- Add sync status dashboard
- Build `analytics_sync_logs` table

---

### Sprint 5: Implement Missing P0 Rules (NEW — BLOCKERS)

**Goal**: Implement ALL P0 (blocker) rules that are currently missing. These block publication.

| Rule # | Rule | Currently | Implementation |
|--------|------|-----------|----------------|
| 1 | Single Macro Context + CE per page | Partial (CE in title/H1 checked) | Add full MC validation |
| 2 | H1, Title, Centerpiece share focus | Partial | Add cross-comparison |
| 3 | No topic mixing on same page | Not checked | AI-based topic analysis |
| 6 | Content aligns with SC + CSI | Not checked | **NEW**: SC/CSI alignment scorer |
| 49 | Brand name consistent spelling | Partial (KBT check) | Extend to full entity names |
| 50 | Facts consistent with site | Partial (EAV KBT) | Extend to all facts |
| 54 | No conflicting definitions | Partial | Cross-page definition check |
| 55 | No conflicting attribute values | Partial | Already in EAV audit |
| 113 | First 400 chars: CE + definition + key attributes | Partial (centerpiece check) | Strengthen validation |
| 114 | Core entity in first sentence | Implemented | Done |
| 118 | No share buttons/ads before main text | Not checked | **NEW**: HTML structure check |
| 132 | Exactly one H1 | Implemented | Done |
| 138 | No heading level skips | Implemented | Done |
| 242 | No `<figure>` nested in `<p>` | Not checked | **NEW**: HTML nesting validator |
| 243 | No block elements in `<p>` | Not checked | **NEW**: HTML nesting validator |
| 251 | Exactly one `<h1>` in HTML | Implemented (checks heading text, add HTML check) | Extend |
| 252 | No heading hierarchy break in HTML | Implemented | Done |
| 256 | Alt text on all images | Partial (generation) | Add validation |
| 268 | Title contains keyword, unique | Partial | Add uniqueness check |
| 271 | Canonical tag present | Not checked | **NEW**: Canonical validator |
| 273 | No canonical + noindex conflict | Not checked | **NEW**: Signal conflict check |
| 346 | Self-referencing canonical | Not checked | **NEW**: Canonical validator |
| 347 | Canonical doesn't point to 404 | Not checked | **NEW**: URL existence check |
| 349 | Canonical consistent with signals | Not checked | **NEW**: Signal conflict check |
| 358 | No 5xx errors | Not checked | **NEW**: HTTP status checker |
| 363 | No redirect loops | Not checked | **NEW**: Redirect chain checker |
| 371 | Not blocked by robots.txt (if indexable) | Not checked | **NEW**: Robots.txt parser |
| 372 | Not noindex (if indexable) | Not checked | **NEW**: Meta robots check |
| 373 | No robots.txt + sitemap conflict | Not checked | **NEW**: Signal conflict check |
| 383 | Same entity same attribute values everywhere | Partial (EAV) | Extend to all content |
| 384 | No conflicting definitions cross-page | Partial | Cross-page check |
| 385 | Name spelling consistent site-wide | Partial | Extend |

**New services needed:**
- `services/audit/rules/HtmlNestingValidator.ts` — Validates HTML structure
- `services/audit/rules/CanonicalValidator.ts` — Checks canonical tags
- `services/audit/rules/SignalConflictChecker.ts` — robots/noindex/canonical conflicts
- `services/audit/rules/RedirectChainChecker.ts` — Detects redirect loops/chains
- `services/audit/rules/HttpStatusChecker.ts` — Checks for 5xx/4xx errors
- `services/audit/rules/SourceContextAligner.ts` — Validates SC/CSI alignment

---

### Sprint 6: Implement Missing P1 Rules (NEW — CRITICAL)

**Goal**: Implement ALL P1 (critical) rules. These must be fixed before publication.

Key new rules to implement (52 rules):
- Rules 4-5: CE in first 2 sentences / first sentence
- Rules 7-9: SC attribute priority, CS/AS classification
- Rules 11-13: CSI predicates
- Rules 17, 19: Author Entity + Author schema
- Rules 33-39: EAV triple structure (explicit, named entities)
- Rules 40-41: Specific quantitative values with units
- Rules 45: Root Attributes complete
- Rules 51: Facts align with authoritative sources (→ fact validator)
- Rules 57-58, 61: Modality rules (is/are for facts, can/may for possibilities)
- Rules 73: SPO sentence pattern
- Rules 94-96, 98: Information density (no redundancy, no filler, direct answers)
- Rules 115-117: Centerpiece primaries
- Rules 121-129: Subordinate text rules (11 rules)
- Rules 135-136, 139, 141, 144, 146, 148: Heading content & vector
- Rules 162-165: Anchor text rules
- Rules 169, 171-172: Link placement
- Rules 174, 177: Annotation text
- Rules 178-179, 181, 184: Link volume
- Rules 203: Canonical query assignment
- Rules 205-206: Format per intent (OL for how-to, TABLE for comparisons)
- Rules 210, 215: List rules
- Rules 216: Table headers
- Rules 229: IR Zone (first 400 chars) = main query answer
- Rules 233, 239: Semantic HTML (`<article>`, single `<main>`)
- Rules 244, 247: No pseudo-headings, HTML validates
- Rules 255, 258, 261: Image rules
- Rules 270, 276-278: Meta description, lang, viewport
- Rules 279, 284: Schema type + validation
- Rules 288: LocalBusiness/Service schema
- Rules 292: DOM nodes <1500
- Rules 304, 308: TTFB <100ms, compression
- Rules 338, 340: Lowercase URLs, no session IDs
- Rules 348: No canonical chains
- Rules 354-355: Bot response <100ms, error rate 0%
- Rules 359, 361-362: No active 404s, 301 for permanent, no redirect chains
- Rules 365, 367: No filter URL explosion, duplicate via canonical
- Rules 368-369: Not "crawled not indexed"
- Rules 374-375, 378: In sitemap, sitemap clean, submitted
- Rules 380, 382: CE in boilerplate, one CE per site
- Rules 390, 392, 394: AS→CS flow, no orphans, canonical query assignment

---

### Sprint 7: Implement P2+P3+P4 Rules (NEW — COMPLETENESS)

**Goal**: Implement remaining 225+ rules across all categories.

Organized by implementation type:

**Algorithmic (pattern-based, no AI needed) — ~120 rules:**
- Context qualifiers detection (rules 85-93)
- Filler word replacement (rules 108-112)
- Heading content validation (rules 142-143, 147, 149)
- Discourse integration (rules 150-153)
- Contextual bridges (rules 154-158)
- URL structure rules (rules 336-345)
- HTML nesting/structure (rules 245-250)
- Image metadata (rules 260-267)
- Caching headers (rules 311-314)
- HTTP headers (rules 315-319)
- Core Web Vitals checks (rules 320-335)
- Table/list formatting (rules 211-219)
- Visual hierarchy (rules 220-224)

**AI-assisted (require LLM analysis) — ~80 rules:**
- SC attribute priority alignment (rules 7-8, 14-16)
- Author expertise signals (rules 21-24)
- EAV explicitness validation (rules 34-36, 47-48)
- Frame semantics (rules 69-72)
- Vector straightness / content progression (rules 144-149)
- Featured snippet optimization (rules 225-228)
- Related content relevance (rules 230-232)
- Website-type specific rules (rules 400-432)

**External data required (need API calls) — ~30 rules:**
- Author citations on external sources (rule 20)
- Facts align with authoritative sources (rule 51)
- Competitor attribute analysis (rule 413)
- GSC indexation status (rules 368-370)
- Crawl metrics from log files (rules 353-357)

---

### Sprint 8: Unified Dashboard UI (revised from Sprint 5)

Same as original plan but with:
- **14 phase cards** instead of 8 (matching checklist categories)
- **Weight configuration panel** (sliders per phase)
- **Website-type selector** (E-commerce, SaaS, B2B, Blog) that applies bonus/malus rules
- **Checklist reference** — each finding links to its rule number in the 437-rule checklist

---

### Sprint 9: Click-to-Audit Integration Points (unchanged from Sprint 6)

### Sprint 10: Multilingual Support (unchanged from Sprint 7)

### Sprint 11: Export Enhancement (unchanged from Sprint 8)

### Sprint 12: Performance Timeline & Audit History (unchanged from Sprint 9)

### Sprint 13: Advanced Features & Polish (unchanged from Sprint 10)

---

## Revised Phase Architecture (14 Phases + Optional)

```typescript
export type AuditPhaseName =
  | 'strategicFoundation'     // A: Macro Context, SC, CSI, E-E-A-T, AI patterns
  | 'eavSystem'               // B: EAV triples, KBT consistency
  | 'microSemantics'          // C+D: Modality, predicates, sentence structure, qualifiers
  | 'informationDensity'      // E: Density, filler words, vagueness
  | 'contextualFlow'          // F: Centerpiece, subordinate, headings, discourse, bridges
  | 'internalLinking'         // G: Anchors, placement, volume, navigation, fragments
  | 'semanticDistance'         // H: Thematic distance, cannibalization
  | 'contentFormat'           // I: Format per intent, lists, tables, visual hierarchy, FS
  | 'htmlTechnical'           // J: Semantic HTML, nesting, heading integrity, images
  | 'metaStructuredData'      // K: Meta tags, JSON-LD, OG, hreflang
  | 'costOfRetrieval'         // L: DOM, server, caching, headers, CWV, HTTP
  | 'urlArchitecture'         // M: URLs, canonical, crawl, indexation
  | 'crossPageConsistency'    // N: Site-wide CE, templates, network flow, hub-spoke
  | 'websiteTypeSpecific'     // O: E-commerce, SaaS, B2B, Blog specific rules
  | 'factValidation';         // Custom: Claim extraction + verification
```

---

## What Gets Replaced vs Enhanced vs New

### REPLACED (removed after migration)
- `ComprehensiveAuditDashboard.tsx` → Merged into InsightsHub
- All V1 site-analysis components → Already superseded by V2
- Root-level `AuditDashboard.tsx` → Orphaned, delete
- Redundant AnalysisToolsPanel buttons → Consolidated

### ENHANCED (existing services, improved)
- `services/ai/unifiedAudit.ts` → Expanded with 437 rules (currently 42)
- `services/ai/contentGeneration/passes/auditChecks.ts` → More checks, better coverage
- `services/ai/linkingAudit.ts` → Add lexical hierarchy, AS→CS flow
- `services/ai/eavAudit.ts` → Add attribute classification, priority ordering
- `services/siteAnalysisServiceV2.ts` → Add HTML validation, canonical checks
- `services/ai/flowValidator.ts` → Add discourse integration, bridge detection
- `config/auditRules.ts` → Expand from 42 to 437 rules
- `config/qualityRulesRegistry.ts` → Integrate with unified scoring
- `services/gscService.ts` → Keep CSV + add API integration
- `utils/enhancedExportUtils.ts` → Connect to unified audit results

### NEW (doesn't exist yet)
- `services/audit/UnifiedAuditOrchestrator.ts` — Main coordinator
- `services/audit/ContentFetcher.ts` — Multi-provider scraping
- `services/audit/RelatedUrlDiscoverer.ts` — Sitemap + link discovery
- `services/audit/FactValidator.ts` — Claim extraction + verification
- `services/audit/PerformanceCorrelator.ts` — GSC + GA4 correlation
- `services/audit/rules/HtmlNestingValidator.ts` — HTML structure checks
- `services/audit/rules/CanonicalValidator.ts` — Canonical tag validation
- `services/audit/rules/SignalConflictChecker.ts` — robots/noindex/canonical
- `services/audit/rules/SemanticDistanceAuditor.ts` — Uses `lib/knowledgeGraph.ts`
- `services/audit/rules/SourceContextAligner.ts` — SC/CSI alignment
- `services/audit/rules/CostOfRetrievalAuditor.ts` — CWV + DOM + performance
- `services/audit/rules/UrlArchitectureAuditor.ts` — URL + crawl + indexation
- `services/audit/rules/WebsiteTypeRuleEngine.ts` — E-commerce/SaaS/B2B/Blog rules
- `services/audit/adapters/GscApiAdapter.ts` — Google Search Console API
- `services/audit/adapters/Ga4ApiAdapter.ts` — Google Analytics 4 API
- `services/audit/AuditWeightConfig.ts` — Configurable weights
- `components/audit/UnifiedAuditDashboard.tsx` — New unified dashboard
- `components/audit/AuditWeightSliders.tsx` — Weight configuration UI
- `components/audit/WebsiteTypeSelector.tsx` — Website type picker

---

## Existing Rules Assessment

### Already Strong (108 rules — keep and enhance):
1. **AI Pattern Avoidance** (rules 26-32) — 100% implemented, multilingual
2. **Sentence Structure** (rules 73-78) — 83% implemented
3. **EAV Density** — Good coverage with term-based + pattern-based scoring
4. **Subject Positioning** — 60%+ enforcement working
5. **Heading Hierarchy** (rules 132, 138) — Correctly validates single H1, no skips
6. **LLM Signature Detection** — 50+ patterns, 5 languages
7. **Schema Generation** — Pass 9 with Wikidata entity resolution
8. **Content Flow** — Flow validator checks vector straightness, discourse

### Need Improvement (70+ rules — partially implemented):
1. **Centerpiece Text** — Checks presence but not completeness (all key attributes in first 400 chars)
2. **Subordinate Text** — Checks first sentence but not all heading response patterns
3. **EAV Attribute Classification** — Categories exist but priority ordering not enforced
4. **Link Annotation Text** — Basic check exists but semantic alignment missing
5. **Featured Snippet** — Only basic format check, no 40-60 word answer validation
6. **Cross-page KBT** — EAV consistency checked but not fact definitions
7. **Information Density** — Algorithmic but missing redundancy/repetition detection

### Completely Missing (329 rules — need new implementation):
1. **Semantic Distance** (9 rules) — Algorithm exists in `lib/knowledgeGraph.ts` but not connected to any audit
2. **HTML Validation** (20+ rules) — No nesting checks, no semantic tag validation
3. **Canonical/Meta** (18 rules) — Zero canonical, robots, OG validation
4. **Core Web Vitals** (14 rules) — Zero performance checks
5. **URL Architecture** (44 rules) — Zero URL structure, crawl, indexation checks
6. **Context Qualifiers** (9 rules) — Zero qualifier detection
7. **Website-Type Specific** (33 rules) — Zero industry-specific rules
8. **Source Context / CSI** (11 rules) — Zero business alignment validation
9. **Visual Hierarchy** (5 rules) — Zero component ordering validation
10. **Monitoring** (5 rules) — Zero scheduled/automated auditing

---

## Multi-Account Analytics Design

### Database Schema

```sql
-- Supports multiple Google accounts per user
CREATE TABLE analytics_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'bing')),
  account_email TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL, -- Supabase Vault
  refresh_token_encrypted TEXT NOT NULL, -- Supabase Vault
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider, account_email)
);

-- Supports multiple GSC/GA4 properties per project
CREATE TABLE analytics_properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  account_id UUID REFERENCES analytics_accounts(id) ON DELETE CASCADE,
  service TEXT NOT NULL CHECK (service IN ('gsc', 'ga4')),
  property_id TEXT NOT NULL, -- GSC: site URL, GA4: property ID
  property_name TEXT,
  is_primary BOOLEAN DEFAULT false,
  sync_enabled BOOLEAN DEFAULT true,
  sync_frequency TEXT DEFAULT 'daily' CHECK (sync_frequency IN ('hourly', 'daily', 'weekly')),
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, service, property_id)
);

-- Sync log for tracking data pulls
CREATE TABLE analytics_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES analytics_properties(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('full', 'incremental')),
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  rows_synced INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

### Multi-Account Flow

```
User Settings → "Analytics" tab
  → "Add Google Account" button → OAuth consent screen
  → User authorizes (GSC + GA4 scopes)
  → Token stored encrypted in analytics_accounts
  → User can add multiple Google accounts

Project Settings → "Analytics" tab
  → "Link GSC Property" → dropdown of all GSC sites from all linked accounts
  → "Link GA4 Property" → dropdown of all GA4 properties from all linked accounts
  → Can link multiple GSC properties (e.g., www + non-www, or main site + subdomain)
  → Can link multiple GA4 properties (e.g., UA + GA4, or main + staging)
  → Set one as "primary" per service
```

---

## Implementation Timeline (Revised)

| Sprint | Focus | Estimated Tasks | Depends On |
|--------|-------|-----------------|------------|
| 0 | UI Cleanup & Foundation | 5 tasks | Nothing |
| 1 | Orchestrator + Phase Adapters (14 phases) | 8 tasks | Sprint 0 |
| 2 | Content Fetching + URL Discovery | 4 tasks | Sprint 1 |
| 3 | Fact Validation Service | 3 tasks | Sprint 1 |
| 4A | GSC API (single property) | 5 tasks | Sprint 1 |
| 4B | Multi-property GSC + GA4 | 5 tasks | Sprint 4A |
| 4C | Multi-account & Sync | 4 tasks | Sprint 4B |
| 5 | P0 Rules Implementation | 10 tasks | Sprint 1 |
| 6 | P1 Rules Implementation | 15 tasks | Sprint 5 |
| 7 | P2-P4 Rules Implementation | 20 tasks | Sprint 6 |
| 8 | Unified Dashboard UI | 8 tasks | Sprint 5 |
| 9 | Click-to-Audit Integration | 4 tasks | Sprint 8 |
| 10 | Multilingual Support | 5 tasks | Sprint 8 |
| 11 | Export Enhancement | 3 tasks | Sprint 8 |
| 12 | Performance Timeline | 5 tasks | Sprint 4A |
| 13 | Advanced Features & Polish | 6 tasks | All above |

**Total: ~110 tasks across 15 sprints**

---

## Open Questions (Resolved)

| Question | Answer |
|----------|--------|
| Full 437 rules or partial? | **Full 437-rule coverage** |
| Sprint 0 cleanup? | **Yes, before building new** |
| GSC/GA4 phasing? | **GSC first → GA4 → multi-account** |
| Phase weights? | **User-configurable per project with checklist defaults** |
| What gets replaced? | V1 components + ComprehensiveAuditDashboard merged into InsightsHub |
| Data migration? | Link new snapshots to old via FKs, don't orphan data |
| Website-type rules? | Applied as bonus/malus, user selects type per project |
| Monitoring rules? | Deferred to Sprint 13 (operational, not scored) |
