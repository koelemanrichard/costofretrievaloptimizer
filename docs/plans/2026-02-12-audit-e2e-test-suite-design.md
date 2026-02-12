# Design: Audit E2E Test Suite — Full Phase Coverage Guarantee

**Date:** 2026-02-12
**Status:** Approved

## Problem

The page-level audit runs 15 phases but 13 of them silently returned 0/0 checks (false perfect score) due to a field name mismatch (`rawHtml`/`semanticText` vs `html`/`text`). No existing test caught this because:

- Unit tests cover individual rule validators in isolation
- The integration test uses stub `TestPhase` classes, not real phase logic
- No test runs the real orchestrator + real phases against realistic HTML content

We need E2E tests that guarantee **every phase produces real checks with real content** and fails immediately if any phase regresses.

## Architecture

### Test Structure

```
services/audit/__tests__/
├── auditE2E.test.ts              <- Main E2E test file
├── fixtures/
│   ├── blog-article.html         <- Blog with SEO issues
│   ├── ecommerce-product.html    <- Product page with schema gaps
│   ├── saas-landing.html         <- SaaS page with missing CTAs
│   ├── b2b-services.html         <- B2B page with density issues
│   ├── well-optimized.html       <- High-score baseline (minor flaws only)
│   └── context/
│       ├── blog-context.ts       <- TopicalMapContext for blog fixture
│       ├── ecommerce-context.ts
│       ├── saas-context.ts
│       ├── b2b-context.ts
│       └── optimized-context.ts
└── snapshot/
    └── real-page-snapshot.json   <- Saved FetchedContent from real URL
```

### Three-Layer Assertion Strategy

**Layer 1: Universal Phase Contract** (runs for ALL 5 fixtures)

Every phase MUST return `totalChecks > 0`. If any phase returns 0/0, the test fails. This is the critical guard against silent regression.

```typescript
for (const result of report.phaseResults) {
  expect(result.totalChecks).toBeGreaterThan(0);
  expect(result.score).toBeGreaterThanOrEqual(0);
  expect(result.score).toBeLessThanOrEqual(100);
  expect(result.weight).toBeGreaterThan(0);
}
```

**Layer 2: Fixture-Specific Finding Assertions**

3-5 targeted assertions per fixture validating that known-bad content produces specific findings (e.g., missing canonical tag produces a canonical finding in metaStructuredData phase).

**Layer 3: Report Integrity & Relative Scoring**

- Report has exactly 15 phase results
- `overallScore` is valid (0 < score < 100 for imperfect content)
- Well-optimized fixture scores higher than all broken fixtures
- `auditDurationMs > 0`

### Mocking Strategy

Only external service boundaries are mocked:

| Component | Real or Mock | Rationale |
|-----------|-------------|-----------|
| Phase logic (all 15) | Real | Core of what we're testing |
| `enrichContent()` | Real | Field aliasing was the bug |
| Rule validators (all 35) | Real | Must produce real findings |
| Scoring/weighting | Real | Must calculate correctly |
| ContentFetcher.fetch() | Mock | Returns fixture HTML instead of fetching network |
| CWV API | Mock | Injected via topicalMapContext spread |
| Fact verification network calls | Mock | Injected mock verification results |

### Content Fixtures (5 scenarios)

**1. Blog Article** (`blog-article.html`, ~300 lines)
- Topic: "Best CRM Software for Small Business"
- Flaws: No JSON-LD schema, missing alt text on 2 images, skipped h2 (h1 -> h3), filler paragraphs, no author bio, generic anchor text ("click here"), no canonical, missing OG tags, no contextual bridges, weak CE positioning

**2. E-commerce Product** (`ecommerce-product.html`, ~250 lines)
- Topic: "Ergonomic Standing Desk Pro X1"
- Flaws: Product schema missing price/availability, no breadcrumbs, excessive DOM nesting, ad div before main content, no ordered list for features, duplicate h1

**3. SaaS Landing** (`saas-landing.html`, ~280 lines)
- Topic: "ProjectFlow - Project Management Software"
- Flaws: No pricing section, no trial CTA, vague filler text, tables without headers, images without dimensions, noindex conflict with sitemap presence

**4. B2B Services** (`b2b-services.html`, ~250 lines)
- Topic: "Enterprise Cloud Migration Services"
- Flaws: No decision guide, no case studies, pronoun-heavy text, no temporal qualifiers, deep URL path, missing compression headers

**5. Well-Optimized Reference** (`well-optimized.html`, ~350 lines)
- Topic: "What Is Semantic SEO"
- Minor flaws only: 1 image missing alt, 1 filler sentence, slightly long URL slug. Score target: 85+

### Content Injection Path

```
Fixture HTML file
  -> parsed into FetchedContent shape (url, rawHtml, semanticText, headings, etc.)
  -> fed to mock ContentFetcher
  -> orchestrator.enrichContent() adds html/text aliases + topicalMapContext
  -> real phases extract and validate
  -> real scoring produces report
```

This exercises the full production path. Only the network fetch is replaced.

### Snapshot Regression

A saved `real-page-snapshot.json` (fetched once, committed) is tested for stability:
- Phase check counts must match saved baseline exactly
- Scores must be within +/-1 of baseline
- Update via `UPDATE_SNAPSHOT=1 npx vitest run auditE2E`

### Test Execution

```typescript
describe('Audit E2E', () => {
  describe.each(['blog', 'ecommerce', 'saas', 'b2b', 'optimized'])
    ('fixture: %s', (fixtureName) => {
    // Run orchestrator once per fixture in beforeAll
    // Assert Layer 1 (universal), Layer 2 (fixture-specific), Layer 3 (integrity)
  });

  describe('relative scoring', () => {
    // well-optimized > all broken fixtures
  });

  describe('snapshot regression', () => {
    // Stability assertions against saved baseline
  });
});
```

**Performance target:** < 5 seconds for all 5 fixtures (no network I/O).

## Files Changed

| File | Change | ~Lines |
|------|--------|--------|
| `services/audit/__tests__/auditE2E.test.ts` | New E2E test file | ~400 |
| `services/audit/__tests__/fixtures/blog-article.html` | Blog fixture | ~300 |
| `services/audit/__tests__/fixtures/ecommerce-product.html` | E-commerce fixture | ~250 |
| `services/audit/__tests__/fixtures/saas-landing.html` | SaaS fixture | ~280 |
| `services/audit/__tests__/fixtures/b2b-services.html` | B2B fixture | ~250 |
| `services/audit/__tests__/fixtures/well-optimized.html` | Optimized fixture | ~350 |
| `services/audit/__tests__/fixtures/context/blog-context.ts` | Blog context | ~50 |
| `services/audit/__tests__/fixtures/context/ecommerce-context.ts` | E-commerce context | ~50 |
| `services/audit/__tests__/fixtures/context/saas-context.ts` | SaaS context | ~50 |
| `services/audit/__tests__/fixtures/context/b2b-context.ts` | B2B context | ~50 |
| `services/audit/__tests__/fixtures/context/optimized-context.ts` | Optimized context | ~50 |

**Zero existing files modified.** Purely additive.

## Verification

1. `npx tsc --noEmit` -- zero type errors
2. `npx vitest run auditE2E` -- all tests green
3. All 15 phases produce totalChecks > 0 for every fixture
4. Well-optimized fixture scores higher than all broken fixtures
5. Full test suite still passes: `npx vitest run`
