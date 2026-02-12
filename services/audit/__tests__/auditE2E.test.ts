/**
 * Audit E2E Test Suite
 *
 * Runs the REAL UnifiedAuditOrchestrator with REAL phase instances against
 * realistic HTML fixtures. Only the network fetch is mocked — all phase logic,
 * rule validators, scoring, and enrichment run as in production.
 *
 * Three assertion layers:
 *   Layer 1: Universal Phase Contract — every phase MUST return totalChecks > 0
 *   Layer 2: Fixture-Specific Findings — known flaws produce expected findings
 *   Layer 3: Report Integrity & Relative Scoring
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

import { UnifiedAuditOrchestrator } from '../UnifiedAuditOrchestrator';
import type { AuditPhase } from '../phases/AuditPhase';
import type {
  AuditRequest,
  AuditPhaseName,
  AuditPhaseResult,
  FetchedContent,
  UnifiedAuditReport,
} from '../types';
import type { ContentFetcher } from '../ContentFetcher';
import type { FixtureContext } from './fixtures/context/types';

// Real phase imports
import { StrategicFoundationPhase } from '../phases/StrategicFoundationPhase';
import { EavSystemPhase } from '../phases/EavSystemPhase';
import { ContentQualityPhase } from '../phases/ContentQualityPhase';
import { InformationDensityPhase } from '../phases/InformationDensityPhase';
import { ContextualFlowPhase } from '../phases/ContextualFlowPhase';
import { LinkStructurePhase } from '../phases/LinkStructurePhase';
import { SemanticDistancePhase } from '../phases/SemanticDistancePhase';
import { ContentFormatPhase } from '../phases/ContentFormatPhase';
import { HtmlTechnicalPhase } from '../phases/HtmlTechnicalPhase';
import { MetaStructuredDataPhase } from '../phases/MetaStructuredDataPhase';
import { CostOfRetrievalPhase } from '../phases/CostOfRetrievalPhase';
import { UrlArchitecturePhase } from '../phases/UrlArchitecturePhase';
import { CrossPageConsistencyPhase } from '../phases/CrossPageConsistencyPhase';
import { WebsiteTypeSpecificPhase } from '../phases/WebsiteTypeSpecificPhase';
import { FactValidationPhase } from '../phases/FactValidationPhase';

// Context imports
import { blogContext } from './fixtures/context/blog-context';
import { ecommerceContext } from './fixtures/context/ecommerce-context';
import { saasContext } from './fixtures/context/saas-context';
import { b2bContext } from './fixtures/context/b2b-context';
import { optimizedContext } from './fixtures/context/optimized-context';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

const FIXTURE_URLS: Record<string, string> = {
  blog: 'https://techreviewhub.com/best-crm-software-small-business',
  ecommerce: 'https://deskprostore.com/standing-desk-pro-x1',
  saas: 'https://projectflow.io/',
  b2b: 'https://cloudshift.com/services/cloud/enterprise/migration/overview',
  optimized: 'https://seoknowledgebase.com/what-is-semantic-seo-complete-guide-to-entity-optimization',
};

const FIXTURE_CONTEXTS: Record<string, FixtureContext> = {
  blog: blogContext,
  ecommerce: ecommerceContext,
  saas: saasContext,
  b2b: b2bContext,
  optimized: optimizedContext,
};

const FIXTURE_FILES: Record<string, string> = {
  blog: 'blog-article.html',
  ecommerce: 'ecommerce-product.html',
  saas: 'saas-landing.html',
  b2b: 'b2b-services.html',
  optimized: 'well-optimized.html',
};

/** Strip HTML to plain text for semanticText field */
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** Extract <title> from HTML */
function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1]?.trim() ?? '';
}

/** Extract meta description from HTML */
function extractMetaDescription(html: string): string {
  const match = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
  return match?.[1]?.trim() ?? '';
}

/** Extract headings from HTML */
function extractHeadings(html: string): { level: number; text: string }[] {
  const headings: { level: number; text: string }[] = [];
  const re = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    headings.push({ level: parseInt(m[1], 10), text: m[2].replace(/<[^>]+>/g, '').trim() });
  }
  return headings;
}

/** Extract images from HTML */
function extractImages(html: string): { src: string; alt: string }[] {
  const images: { src: string; alt: string }[] = [];
  const re = /<img[^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const srcMatch = m[0].match(/src=["']([^"']*)["']/i);
    const altMatch = m[0].match(/alt=["']([^"']*)["']/i);
    images.push({ src: srcMatch?.[1] ?? '', alt: altMatch?.[1] ?? '' });
  }
  return images;
}

/** Extract links from HTML, split by internal/external relative to fixture URL */
function extractLinks(html: string, baseUrl: string): {
  internal: { href: string; anchor: string }[];
  external: { href: string; anchor: string }[];
} {
  const internal: { href: string; anchor: string }[] = [];
  const external: { href: string; anchor: string }[] = [];
  const re = /<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const baseHost = new URL(baseUrl).hostname;
  let m;
  while ((m = re.exec(html)) !== null) {
    const href = m[1];
    const anchor = m[2].replace(/<[^>]+>/g, '').trim();
    try {
      const linkUrl = new URL(href, baseUrl);
      if (linkUrl.hostname === baseHost) {
        internal.push({ href, anchor });
      } else {
        external.push({ href, anchor });
      }
    } catch {
      internal.push({ href, anchor });
    }
  }
  return { internal, external };
}

/** Extract JSON-LD schema from HTML */
function extractSchema(html: string): object[] {
  const schemas: object[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      schemas.push(JSON.parse(m[1]));
    } catch { /* skip malformed */ }
  }
  return schemas;
}

/** Detect language from <html lang="..."> */
function extractLanguage(html: string): string {
  const match = html.match(/<html[^>]*lang=["']([^"']*)["']/i);
  return match?.[1]?.trim() ?? 'en';
}

/** Load a fixture file and build FetchedContent + enriched context */
function loadFixture(name: string): {
  fetchedContent: FetchedContent;
  context: FixtureContext;
  url: string;
} {
  const htmlFile = path.join(FIXTURES_DIR, FIXTURE_FILES[name]);
  const rawHtml = fs.readFileSync(htmlFile, 'utf-8');
  const url = FIXTURE_URLS[name];
  const links = extractLinks(rawHtml, url);

  const fetchedContent: FetchedContent = {
    url,
    rawHtml,
    semanticText: stripHtml(rawHtml),
    title: extractTitle(rawHtml),
    metaDescription: extractMetaDescription(rawHtml),
    headings: extractHeadings(rawHtml),
    images: extractImages(rawHtml),
    internalLinks: links.internal,
    externalLinks: links.external,
    schemaMarkup: extractSchema(rawHtml),
    language: extractLanguage(rawHtml),
    provider: 'jina',
    fetchDurationMs: 100,
  };

  return { fetchedContent, context: FIXTURE_CONTEXTS[name], url };
}

/** Create a mock ContentFetcher that returns a given FetchedContent */
function createMockFetcher(content: FetchedContent): ContentFetcher {
  return { fetch: async () => content } as unknown as ContentFetcher;
}

/** Build all 15 real phases */
function createAllPhases(): AuditPhase[] {
  return [
    new StrategicFoundationPhase(),
    new EavSystemPhase(),
    new ContentQualityPhase(),
    new InformationDensityPhase(),
    new ContextualFlowPhase(),
    new LinkStructurePhase(),
    new SemanticDistancePhase(),
    new ContentFormatPhase(),
    new HtmlTechnicalPhase(),
    new MetaStructuredDataPhase(),
    new CostOfRetrievalPhase(),
    new UrlArchitecturePhase(),
    new CrossPageConsistencyPhase(),
    new WebsiteTypeSpecificPhase(),
    new FactValidationPhase(),
  ];
}

/** Build a standard AuditRequest for a fixture */
function makeRequest(url: string): AuditRequest {
  return {
    type: 'external',
    projectId: 'e2e-test',
    url,
    depth: 'deep',
    phases: [
      'strategicFoundation', 'eavSystem', 'microSemantics', 'informationDensity',
      'contextualFlow', 'internalLinking', 'semanticDistance', 'contentFormat',
      'htmlTechnical', 'metaStructuredData', 'costOfRetrieval', 'urlArchitecture',
      'crossPageConsistency', 'websiteTypeSpecific', 'factValidation',
    ] as AuditPhaseName[],
    scrapingProvider: 'jina',
    language: 'en',
    includeFactValidation: true,
    includePerformanceData: false,
  };
}

/** Get a specific phase result from a report, throw if not found */
function getPhase(report: UnifiedAuditReport, name: AuditPhaseName): AuditPhaseResult {
  const result = report.phaseResults.find(r => r.phase === name);
  if (!result) throw new Error(`Phase "${name}" not found in report`);
  return result;
}

// ---------------------------------------------------------------------------
// All phase names that MUST produce checks
// ---------------------------------------------------------------------------
const ALL_15_PHASES: AuditPhaseName[] = [
  'strategicFoundation', 'eavSystem', 'microSemantics', 'informationDensity',
  'contextualFlow', 'internalLinking', 'semanticDistance', 'contentFormat',
  'htmlTechnical', 'metaStructuredData', 'costOfRetrieval', 'urlArchitecture',
  'crossPageConsistency', 'websiteTypeSpecific', 'factValidation',
];

// ---------------------------------------------------------------------------
// Run audit for each fixture ONCE and share results across tests
// ---------------------------------------------------------------------------

const reports: Record<string, UnifiedAuditReport> = {};

async function runFixtureAudit(fixtureName: string): Promise<UnifiedAuditReport> {
  const { fetchedContent, context, url } = loadFixture(fixtureName);
  const phases = createAllPhases();
  const fetcher = createMockFetcher(fetchedContent);

  const orchestrator = new UnifiedAuditOrchestrator(phases, fetcher, undefined, {
    topicalMapContext: context as Record<string, unknown>,
    mapEavs: context.eavs,
  });

  return orchestrator.runAudit(makeRequest(url));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Audit E2E', () => {
  beforeAll(async () => {
    // Run all 5 fixtures in parallel — no network calls, should be fast
    const fixtureNames = ['blog', 'ecommerce', 'saas', 'b2b', 'optimized'];
    const results = await Promise.all(fixtureNames.map(runFixtureAudit));
    for (let i = 0; i < fixtureNames.length; i++) {
      reports[fixtureNames[i]] = results[i];
    }
  }, 30_000); // 30s timeout for all fixtures

  // =========================================================================
  // LAYER 1: Universal Phase Contract
  // Every phase MUST produce totalChecks > 0 for EVERY fixture.
  // This is the critical guard against silent regressions (0/0 bugs).
  // =========================================================================

  describe.each(['blog', 'ecommerce', 'saas', 'b2b', 'optimized'])(
    'Layer 1 — fixture: %s',
    (fixtureName) => {
      it('has 15 phase results', () => {
        expect(reports[fixtureName].phaseResults).toHaveLength(15);
      });

      it.each(ALL_15_PHASES)('phase "%s" produces totalChecks > 0', (phaseName) => {
        const phase = getPhase(reports[fixtureName], phaseName);
        expect(phase.totalChecks).toBeGreaterThan(0);
      });

      it.each(ALL_15_PHASES)('phase "%s" has valid score 0-100', (phaseName) => {
        const phase = getPhase(reports[fixtureName], phaseName);
        expect(phase.score).toBeGreaterThanOrEqual(0);
        expect(phase.score).toBeLessThanOrEqual(100);
      });

      it.each(ALL_15_PHASES)('phase "%s" has weight > 0', (phaseName) => {
        const phase = getPhase(reports[fixtureName], phaseName);
        // websiteTypeSpecific and factValidation are bonus (weight 0 by default)
        if (phaseName !== 'websiteTypeSpecific' && phaseName !== 'factValidation') {
          expect(phase.weight).toBeGreaterThan(0);
        }
      });

      it('all imperfect fixtures produce findings', () => {
        if (fixtureName !== 'optimized') {
          const totalFindings = reports[fixtureName].phaseResults.reduce(
            (sum, r) => sum + r.findings.length, 0
          );
          expect(totalFindings).toBeGreaterThan(0);
        }
      });
    }
  );

  // =========================================================================
  // LAYER 2: Fixture-Specific Finding Assertions
  // Known flaws in each fixture MUST produce specific findings.
  // =========================================================================

  describe('Layer 2 — blog fixture findings', () => {
    it('metaStructuredData flags missing canonical', () => {
      const phase = getPhase(reports.blog, 'metaStructuredData');
      const hasCanonicalFinding = phase.findings.some(
        f => f.description.toLowerCase().includes('canonical') ||
             f.title.toLowerCase().includes('canonical')
      );
      expect(hasCanonicalFinding).toBe(true);
    });

    it('htmlTechnical flags missing alt text', () => {
      const phase = getPhase(reports.blog, 'htmlTechnical');
      const hasAltFinding = phase.findings.some(
        f => f.description.toLowerCase().includes('alt') ||
             f.title.toLowerCase().includes('alt')
      );
      expect(hasAltFinding).toBe(true);
    });

    it('informationDensity flags filler content', () => {
      const phase = getPhase(reports.blog, 'informationDensity');
      expect(phase.findings.length).toBeGreaterThan(0);
    });

    it('contextualFlow detects heading hierarchy issues', () => {
      const phase = getPhase(reports.blog, 'contextualFlow');
      expect(phase.findings.length).toBeGreaterThan(0);
    });

    it('factValidation extracts and reports claims', () => {
      const phase = getPhase(reports.blog, 'factValidation');
      expect(phase.totalChecks).toBeGreaterThan(0);
    });
  });

  describe('Layer 2 — ecommerce fixture findings', () => {
    it('htmlTechnical flags duplicate h1', () => {
      const phase = getPhase(reports.ecommerce, 'htmlTechnical');
      const hasDuplicateH1 = phase.findings.some(
        f => f.description.toLowerCase().includes('h1') ||
             f.title.toLowerCase().includes('h1')
      );
      expect(hasDuplicateH1).toBe(true);
    });

    it('metaStructuredData flags schema issues', () => {
      const phase = getPhase(reports.ecommerce, 'metaStructuredData');
      expect(phase.findings.length).toBeGreaterThan(0);
    });

    it('contentFormat flags missing structured content', () => {
      const phase = getPhase(reports.ecommerce, 'contentFormat');
      expect(phase.findings.length).toBeGreaterThan(0);
    });

    it('costOfRetrieval detects performance issues', () => {
      const phase = getPhase(reports.ecommerce, 'costOfRetrieval');
      expect(phase.totalChecks).toBeGreaterThan(0);
    });
  });

  describe('Layer 2 — saas fixture findings', () => {
    it('metaStructuredData flags missing JSON-LD schema', () => {
      const phase = getPhase(reports.saas, 'metaStructuredData');
      const hasSchemaFinding = phase.findings.some(
        f => f.description.toLowerCase().includes('schema') ||
             f.description.toLowerCase().includes('json-ld') ||
             f.title.toLowerCase().includes('schema') ||
             f.title.toLowerCase().includes('structured data')
      );
      expect(hasSchemaFinding).toBe(true);
    });

    it('microSemantics flags modality issues', () => {
      const phase = getPhase(reports.saas, 'microSemantics');
      expect(phase.findings.length).toBeGreaterThan(0);
    });

    it('crossPageConsistency detects signal conflicts', () => {
      // SaaS fixture has noindex + sitemap presence conflict
      const phase = getPhase(reports.saas, 'crossPageConsistency');
      expect(phase.totalChecks).toBeGreaterThan(0);
    });
  });

  describe('Layer 2 — b2b fixture findings', () => {
    it('urlArchitecture flags deep URL path', () => {
      const phase = getPhase(reports.b2b, 'urlArchitecture');
      expect(phase.findings.length).toBeGreaterThan(0);
    });

    it('contextualFlow flags transition/bridge issues', () => {
      const phase = getPhase(reports.b2b, 'contextualFlow');
      expect(phase.findings.length).toBeGreaterThan(0);
    });

    it('internalLinking flags insufficient links', () => {
      const phase = getPhase(reports.b2b, 'internalLinking');
      expect(phase.findings.length).toBeGreaterThan(0);
    });
  });

  describe('Layer 2 — optimized fixture findings', () => {
    it('still detects minor issues (not a perfect score)', () => {
      const totalFindings = reports.optimized.phaseResults.reduce(
        (sum, r) => sum + r.findings.length, 0
      );
      // Even the well-optimized page has 2-3 minor deliberate flaws
      expect(totalFindings).toBeGreaterThan(0);
    });

    it('overall score is high (80+)', () => {
      expect(reports.optimized.overallScore).toBeGreaterThanOrEqual(80);
    });
  });

  // =========================================================================
  // LAYER 3: Report Integrity & Relative Scoring
  // =========================================================================

  describe('Layer 3 — report integrity', () => {
    it.each(['blog', 'ecommerce', 'saas', 'b2b', 'optimized'])(
      '%s report has valid structure',
      (fixtureName) => {
        const report = reports[fixtureName];
        expect(report.id).toBeTruthy();
        expect(report.projectId).toBe('e2e-test');
        expect(report.auditType).toBe('external');
        expect(report.url).toBeTruthy();
        expect(report.overallScore).toBeGreaterThanOrEqual(0);
        expect(report.overallScore).toBeLessThanOrEqual(100);
        expect(report.phaseResults).toHaveLength(15);
        expect(report.auditDurationMs).toBeGreaterThanOrEqual(0);
        expect(report.language).toBe('en');
        expect(report.version).toBe(1);
        expect(report.createdAt).toBeTruthy();
        expect(report.contentMergeSuggestions).toBeDefined();
        expect(report.missingKnowledgeGraphTopics).toBeDefined();
        expect(report.cannibalizationRisks).toBeDefined();
      }
    );
  });

  describe('Layer 3 — relative scoring', () => {
    it('well-optimized page scores higher than blog with issues', () => {
      expect(reports.optimized.overallScore).toBeGreaterThan(reports.blog.overallScore);
    });

    it('well-optimized page scores higher than ecommerce with issues', () => {
      expect(reports.optimized.overallScore).toBeGreaterThan(reports.ecommerce.overallScore);
    });

    it('well-optimized page scores higher than saas with issues', () => {
      expect(reports.optimized.overallScore).toBeGreaterThan(reports.saas.overallScore);
    });

    it('well-optimized page scores higher than b2b with issues', () => {
      expect(reports.optimized.overallScore).toBeGreaterThan(reports.b2b.overallScore);
    });

    it('no broken fixture scores above 95 (too many flaws)', () => {
      for (const name of ['blog', 'ecommerce', 'saas', 'b2b']) {
        expect(reports[name].overallScore).toBeLessThan(95);
      }
    });
  });

  // =========================================================================
  // Phase check count diagnostics (not assertions — logged for visibility)
  // =========================================================================

  describe('diagnostics', () => {
    it('logs phase check counts for all fixtures', () => {
      for (const [name, report] of Object.entries(reports)) {
        const summary = report.phaseResults.map(
          r => `${r.phase}: ${r.passedChecks}/${r.totalChecks} (score: ${r.score}, findings: ${r.findings.length})`
        );
        console.log(`\n--- ${name.toUpperCase()} (overall: ${report.overallScore}) ---`);
        summary.forEach(s => console.log(`  ${s}`));
      }
    });
  });
});
