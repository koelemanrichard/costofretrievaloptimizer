# Structural Analysis Layer — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Supabase Edge Function that parses raw HTML into heading trees, content regions, schema markup, and entity prominence — stored in `site_analysis_pages.structural_analysis` (JSONB) and consumed across pipeline, audits, content generation, and intelligence features.

**Architecture:** A Deno edge function (`html-structure-analyzer`) uses `deno-dom` to parse HTML and extract structural signals. Results are stored centrally and accessed via a frontend service. No new infrastructure — fully serverless.

**Tech Stack:** Deno (edge function), deno-dom (HTML parser), Supabase (PostgreSQL + Edge Functions), TypeScript (frontend types + service)

**Design Document:** `docs/plans/2026-02-24-structural-analysis-layer-design.md`

---

## Phase 1: Foundation

### Task 1: TypeScript Types

**Files:**
- Create: `types/structuralAnalysis.ts`
- Modify: `types.ts` (barrel export)

**Step 1: Create the type definitions file**

Create `types/structuralAnalysis.ts` with all interfaces from the design doc Section 2:

```typescript
/**
 * Structural Analysis Types
 *
 * Rich HTML structural analysis per page: heading tree, content regions,
 * schema markup, entity prominence. Computed by the html-structure-analyzer
 * edge function and stored in site_analysis_pages.structural_analysis.
 *
 * @module types/structuralAnalysis
 */

// ============================================================================
// HEADING TREE
// ============================================================================

export interface HeadingNode {
  level: number;            // 1-6
  text: string;
  wordCountBelow: number;   // Words between this heading and next same-or-higher level
  entityMentions: number;   // CE mentions in this section's text
  children: HeadingNode[];  // Nested sub-headings
}

// ============================================================================
// CONTENT REGIONS
// ============================================================================

export interface RegionStats {
  wordCount: number;
  percentage: number;       // Of total page word count
  exists: boolean;          // Whether semantic tag was found
}

// ============================================================================
// SECTION ANALYSIS
// ============================================================================

export interface SectionAnalysis {
  heading: string;
  level: number;
  wordCount: number;
  paragraphCount: number;
  listCount: number;
  tableCount: number;
  imageCount: number;
  entityMentions: number;
  subSections: SectionAnalysis[];  // Nested H3s under H2
}

// ============================================================================
// ENTITY PROMINENCE
// ============================================================================

export interface EntityProminence {
  entity: string;           // The CE being measured
  inTitle: boolean;
  inH1: boolean;
  inFirstH2: boolean;
  inMetaDescription: boolean;
  totalMentions: number;
  mainContentMentions: number;
  sidebarMentions: number;
  footerMentions: number;
  firstMentionPosition: number;  // 0-1 scale (0 = start of main content)
  headingMentionRate: number;    // % of headings containing CE
}

// ============================================================================
// SCHEMA MARKUP
// ============================================================================

export interface SchemaBlock {
  type: string;             // e.g., "Organization", "Article", "FAQPage"
  properties: Record<string, unknown>;
  source: 'json-ld' | 'microdata' | 'rdfa';
}

// ============================================================================
// STRUCTURAL ANALYSIS (main type)
// ============================================================================

export interface StructuralAnalysis {
  // Nested heading hierarchy (tree, not flat array)
  headingTree: HeadingNode[];

  // Content regions with word counts
  regions: {
    main:    RegionStats;
    sidebar: RegionStats;
    nav:     RegionStats;
    header:  RegionStats;
    footer:  RegionStats;
  };
  mainContentText: string;
  mainContentWordCount: number;

  // Per-section metrics (one entry per H2, with nested H3s)
  sections: SectionAnalysis[];

  // Central Entity structural positioning
  entityProminence: EntityProminence;

  // All JSON-LD and microdata blocks
  schemaMarkup: SchemaBlock[];

  // DOM metrics
  domMetrics: {
    totalNodes: number;
    mainContentNodes: number;
    nestingDepth: number;
    htmlSizeBytes: number;
  };

  // Metadata
  analyzedAt: string;       // ISO timestamp
  analyzerVersion: string;  // For cache invalidation
}

// ============================================================================
// EDGE FUNCTION REQUEST/RESPONSE
// ============================================================================

export interface StructuralAnalysisRequest {
  url?: string;            // Fetch and analyze
  html?: string;           // Or analyze pre-fetched HTML
  centralEntity?: string;  // Entity to measure prominence for
  language?: string;       // For entity matching rules
}

export interface StructuralAnalysisResponse {
  ok: boolean;
  analysis?: StructuralAnalysis;
  error?: string;
  processingTimeMs?: number;
}
```

**Step 2: Add barrel export**

In `types.ts`, add:
```typescript
export * from './types/structuralAnalysis';
```

Add it after the existing `export * from './types/siteAnalysis';` line.

**Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS (zero errors)

**Step 4: Commit**

```bash
git add types/structuralAnalysis.ts types.ts
git commit -m "feat(structural): add StructuralAnalysis type definitions"
```

---

### Task 2: Edge Function — Core HTML Parser

**Files:**
- Create: `supabase/functions/html-structure-analyzer/index.ts`

This is the largest task. The edge function parses HTML with `deno-dom` and returns a `StructuralAnalysis` object.

**Step 1: Create the edge function directory and file**

Create `supabase/functions/html-structure-analyzer/index.ts`:

```typescript
// deno-lint-ignore-file no-explicit-any

/**
 * HTML Structure Analyzer Edge Function
 *
 * Parses raw HTML and extracts structural signals:
 * - Heading tree (nested hierarchy)
 * - Content regions (main, sidebar, nav, header, footer)
 * - Section analysis (per-H2 metrics)
 * - Entity prominence (CE positioning)
 * - Schema markup (JSON-LD, microdata, RDFa)
 * - DOM metrics (nodes, depth, size)
 *
 * Input: { url?, html?, centralEntity?, language? }
 * Output: StructuralAnalysis JSON
 *
 * Uses deno-dom for HTML parsing. No AI/LLM calls.
 * Typical processing time: <100ms per page.
 */

import { DOMParser, Element, Node } from 'https://deno.land/x/deno_dom@v0.1.48/deno-dom-wasm.ts';
import { corsHeaders, json, fetchWithTimeout } from '../_shared/utils.ts';

const Deno = (globalThis as any).Deno;
const ANALYZER_VERSION = '1.0.0';

// ============================================================================
// TYPES (mirror of frontend types/structuralAnalysis.ts)
// ============================================================================

interface HeadingNode {
  level: number;
  text: string;
  wordCountBelow: number;
  entityMentions: number;
  children: HeadingNode[];
}

interface RegionStats {
  wordCount: number;
  percentage: number;
  exists: boolean;
}

interface SectionAnalysis {
  heading: string;
  level: number;
  wordCount: number;
  paragraphCount: number;
  listCount: number;
  tableCount: number;
  imageCount: number;
  entityMentions: number;
  subSections: SectionAnalysis[];
}

interface EntityProminence {
  entity: string;
  inTitle: boolean;
  inH1: boolean;
  inFirstH2: boolean;
  inMetaDescription: boolean;
  totalMentions: number;
  mainContentMentions: number;
  sidebarMentions: number;
  footerMentions: number;
  firstMentionPosition: number;
  headingMentionRate: number;
}

interface SchemaBlock {
  type: string;
  properties: Record<string, unknown>;
  source: 'json-ld' | 'microdata' | 'rdfa';
}

interface StructuralAnalysis {
  headingTree: HeadingNode[];
  regions: {
    main: RegionStats;
    sidebar: RegionStats;
    nav: RegionStats;
    header: RegionStats;
    footer: RegionStats;
  };
  mainContentText: string;
  mainContentWordCount: number;
  sections: SectionAnalysis[];
  entityProminence: EntityProminence;
  schemaMarkup: SchemaBlock[];
  domMetrics: {
    totalNodes: number;
    mainContentNodes: number;
    nestingDepth: number;
    htmlSizeBytes: number;
  };
  analyzedAt: string;
  analyzerVersion: string;
}

// ============================================================================
// TEXT UTILITIES
// ============================================================================

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

function countEntityMentions(text: string, entity: string): number {
  if (!entity || !text) return 0;
  const lower = text.toLowerCase();
  const entityLower = entity.toLowerCase();
  let count = 0;
  let pos = 0;
  while ((pos = lower.indexOf(entityLower, pos)) !== -1) {
    count++;
    pos += entityLower.length;
  }
  return count;
}

// ============================================================================
// REGION EXTRACTION
// ============================================================================

function extractRegionText(doc: any, selectors: string[]): { text: string; exists: boolean } {
  for (const selector of selectors) {
    try {
      const el = doc.querySelector(selector);
      if (el) {
        return { text: stripTags(el.innerHTML), exists: true };
      }
    } catch {
      // Selector not supported, skip
    }
  }
  return { text: '', exists: false };
}

function buildRegionStats(text: string, totalWords: number, exists: boolean): RegionStats {
  const wc = countWords(text);
  return {
    wordCount: wc,
    percentage: totalWords > 0 ? Math.round((wc / totalWords) * 100) : 0,
    exists,
  };
}

function extractRegions(doc: any, fullText: string) {
  const totalWords = countWords(fullText);

  const mainResult = extractRegionText(doc, ['main', 'article', '[role="main"]']);
  const sidebarResult = extractRegionText(doc, ['aside', '[role="complementary"]']);
  const navResult = extractRegionText(doc, ['nav', '[role="navigation"]']);
  const headerResult = extractRegionText(doc, ['header', '[role="banner"]']);
  const footerResult = extractRegionText(doc, ['footer', '[role="contentinfo"]']);

  // If no semantic main region found, use heuristic: middle 70% of body text
  let mainContentText = mainResult.text;
  if (!mainResult.exists) {
    const bodyText = stripTags(doc.body?.innerHTML || '');
    const words = bodyText.split(/\s+/);
    const start = Math.floor(words.length * 0.15);
    const end = Math.floor(words.length * 0.85);
    mainContentText = words.slice(start, end).join(' ');
  }

  return {
    regions: {
      main: buildRegionStats(mainContentText, totalWords, mainResult.exists),
      sidebar: buildRegionStats(sidebarResult.text, totalWords, sidebarResult.exists),
      nav: buildRegionStats(navResult.text, totalWords, navResult.exists),
      header: buildRegionStats(headerResult.text, totalWords, headerResult.exists),
      footer: buildRegionStats(footerResult.text, totalWords, footerResult.exists),
    },
    mainContentText,
    mainContentWordCount: countWords(mainContentText),
  };
}

// ============================================================================
// HEADING TREE
// ============================================================================

function buildHeadingTree(doc: any, centralEntity: string): HeadingNode[] {
  const headingEls = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
  if (!headingEls || headingEls.length === 0) return [];

  // Collect heading elements with their text and level
  const headings: { level: number; text: string; el: any }[] = [];
  for (const el of headingEls) {
    const level = parseInt(el.tagName.charAt(1), 10);
    const text = (el.textContent || '').trim();
    if (text) {
      headings.push({ level, text, el });
    }
  }

  // Get all body text for word counting between headings
  const bodyHtml = doc.body?.innerHTML || '';

  // Build tree using a stack-based approach
  const root: HeadingNode[] = [];
  const stack: { node: HeadingNode; level: number }[] = [];

  for (let i = 0; i < headings.length; i++) {
    const h = headings[i];

    // Calculate words between this heading and the next same-or-higher level heading
    let wordCountBelow = 0;
    // Find next heading of same or higher level
    const currentPos = bodyHtml.indexOf(h.el.outerHTML);
    if (currentPos !== -1) {
      let nextPos = bodyHtml.length;
      for (let j = i + 1; j < headings.length; j++) {
        if (headings[j].level <= h.level) {
          const np = bodyHtml.indexOf(headings[j].el.outerHTML, currentPos + 1);
          if (np !== -1) {
            nextPos = np;
            break;
          }
        }
      }
      const sectionHtml = bodyHtml.slice(currentPos + h.el.outerHTML.length, nextPos);
      wordCountBelow = countWords(stripTags(sectionHtml));
    }

    const node: HeadingNode = {
      level: h.level,
      text: h.text,
      wordCountBelow,
      entityMentions: countEntityMentions(h.text, centralEntity),
      children: [],
    };

    // Pop stack until we find a parent (lower level number = higher in hierarchy)
    while (stack.length > 0 && stack[stack.length - 1].level >= h.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      root.push(node);
    } else {
      stack[stack.length - 1].node.children.push(node);
    }

    stack.push({ node, level: h.level });
  }

  return root;
}

// ============================================================================
// SECTION ANALYSIS
// ============================================================================

function buildSectionAnalysis(doc: any, centralEntity: string): SectionAnalysis[] {
  const bodyHtml = doc.body?.innerHTML || '';
  const h2Els = doc.querySelectorAll('h2');
  if (!h2Els || h2Els.length === 0) return [];

  const sections: SectionAnalysis[] = [];

  for (let i = 0; i < h2Els.length; i++) {
    const h2 = h2Els[i];
    const h2Text = (h2.textContent || '').trim();
    if (!h2Text) continue;

    // Find section boundaries
    const h2Pos = bodyHtml.indexOf(h2.outerHTML);
    let nextH2Pos = bodyHtml.length;
    if (i + 1 < h2Els.length) {
      const np = bodyHtml.indexOf(h2Els[i + 1].outerHTML, h2Pos + 1);
      if (np !== -1) nextH2Pos = np;
    }

    const sectionHtml = bodyHtml.slice(h2Pos + h2.outerHTML.length, nextH2Pos);
    const sectionText = stripTags(sectionHtml);

    // Count elements in this section
    const tmpDoc = new DOMParser().parseFromString(`<div>${sectionHtml}</div>`, 'text/html');
    const paragraphs = tmpDoc?.querySelectorAll('p');
    const lists = tmpDoc?.querySelectorAll('ul, ol');
    const tables = tmpDoc?.querySelectorAll('table');
    const images = tmpDoc?.querySelectorAll('img');

    // Build sub-sections from H3s within this section
    const h3s = tmpDoc?.querySelectorAll('h3') || [];
    const subSections: SectionAnalysis[] = [];
    for (const h3 of h3s) {
      const h3Text = (h3.textContent || '').trim();
      if (!h3Text) continue;

      // Approximate word count for sub-section
      const h3Pos = sectionHtml.indexOf(h3.outerHTML);
      let nextH3Pos = sectionHtml.length;
      // Find next h3 or end
      const remainingH3s = Array.from(h3s);
      const h3Index = remainingH3s.indexOf(h3);
      if (h3Index + 1 < remainingH3s.length) {
        const np = sectionHtml.indexOf((remainingH3s[h3Index + 1] as any).outerHTML, h3Pos + 1);
        if (np !== -1) nextH3Pos = np;
      }
      const subHtml = sectionHtml.slice(h3Pos + h3.outerHTML.length, nextH3Pos);
      const subTmpDoc = new DOMParser().parseFromString(`<div>${subHtml}</div>`, 'text/html');

      subSections.push({
        heading: h3Text,
        level: 3,
        wordCount: countWords(stripTags(subHtml)),
        paragraphCount: subTmpDoc?.querySelectorAll('p')?.length || 0,
        listCount: subTmpDoc?.querySelectorAll('ul, ol')?.length || 0,
        tableCount: subTmpDoc?.querySelectorAll('table')?.length || 0,
        imageCount: subTmpDoc?.querySelectorAll('img')?.length || 0,
        entityMentions: countEntityMentions(stripTags(subHtml), centralEntity),
        subSections: [],
      });
    }

    sections.push({
      heading: h2Text,
      level: 2,
      wordCount: countWords(sectionText),
      paragraphCount: paragraphs?.length || 0,
      listCount: lists?.length || 0,
      tableCount: tables?.length || 0,
      imageCount: images?.length || 0,
      entityMentions: countEntityMentions(sectionText, centralEntity),
      subSections,
    });
  }

  return sections;
}

// ============================================================================
// ENTITY PROMINENCE
// ============================================================================

function measureEntityProminence(
  doc: any,
  mainContentText: string,
  sidebarText: string,
  footerText: string,
  centralEntity: string
): EntityProminence {
  if (!centralEntity) {
    return {
      entity: '',
      inTitle: false,
      inH1: false,
      inFirstH2: false,
      inMetaDescription: false,
      totalMentions: 0,
      mainContentMentions: 0,
      sidebarMentions: 0,
      footerMentions: 0,
      firstMentionPosition: 1,
      headingMentionRate: 0,
    };
  }

  const ceLower = centralEntity.toLowerCase();

  // Check title
  const titleEl = doc.querySelector('title');
  const titleText = (titleEl?.textContent || '').toLowerCase();
  const inTitle = titleText.includes(ceLower);

  // Check H1
  const h1El = doc.querySelector('h1');
  const h1Text = (h1El?.textContent || '').toLowerCase();
  const inH1 = h1Text.includes(ceLower);

  // Check first H2
  const firstH2 = doc.querySelector('h2');
  const firstH2Text = (firstH2?.textContent || '').toLowerCase();
  const inFirstH2 = firstH2Text.includes(ceLower);

  // Check meta description
  const metaDesc = doc.querySelector('meta[name="description"]');
  const metaDescText = (metaDesc?.getAttribute('content') || '').toLowerCase();
  const inMetaDescription = metaDescText.includes(ceLower);

  // Count mentions per region
  const fullText = stripTags(doc.body?.innerHTML || '');
  const totalMentions = countEntityMentions(fullText, centralEntity);
  const mainContentMentions = countEntityMentions(mainContentText, centralEntity);
  const sidebarMentions = countEntityMentions(sidebarText, centralEntity);
  const footerMentions = countEntityMentions(footerText, centralEntity);

  // First mention position (0-1 scale)
  const mainLower = mainContentText.toLowerCase();
  const firstIdx = mainLower.indexOf(ceLower);
  const firstMentionPosition = firstIdx >= 0 ? firstIdx / Math.max(mainLower.length, 1) : 1;

  // Heading mention rate
  const allHeadings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
  let headingsWithCe = 0;
  const totalHeadings = allHeadings?.length || 0;
  if (totalHeadings > 0) {
    for (const h of allHeadings) {
      if ((h.textContent || '').toLowerCase().includes(ceLower)) {
        headingsWithCe++;
      }
    }
  }

  return {
    entity: centralEntity,
    inTitle,
    inH1,
    inFirstH2,
    inMetaDescription,
    totalMentions,
    mainContentMentions,
    sidebarMentions,
    footerMentions,
    firstMentionPosition: Math.round(firstMentionPosition * 100) / 100,
    headingMentionRate: totalHeadings > 0
      ? Math.round((headingsWithCe / totalHeadings) * 100) / 100
      : 0,
  };
}

// ============================================================================
// SCHEMA MARKUP EXTRACTION
// ============================================================================

function extractSchemaMarkup(doc: any): SchemaBlock[] {
  const blocks: SchemaBlock[] = [];

  // 1. JSON-LD
  const ldScripts = doc.querySelectorAll('script[type="application/ld+json"]');
  if (ldScripts) {
    for (const script of ldScripts) {
      try {
        const data = JSON.parse(script.textContent || '');
        if (Array.isArray(data)) {
          for (const item of data) {
            blocks.push({
              type: item['@type'] || 'Unknown',
              properties: item,
              source: 'json-ld',
            });
          }
        } else if (data['@graph']) {
          for (const item of data['@graph']) {
            blocks.push({
              type: item['@type'] || 'Unknown',
              properties: item,
              source: 'json-ld',
            });
          }
        } else {
          blocks.push({
            type: data['@type'] || 'Unknown',
            properties: data,
            source: 'json-ld',
          });
        }
      } catch {
        // Invalid JSON-LD, skip
      }
    }
  }

  // 2. Microdata (itemscope/itemprop)
  const microdataEls = doc.querySelectorAll('[itemscope]');
  if (microdataEls) {
    for (const el of microdataEls) {
      const itemType = el.getAttribute('itemtype') || '';
      const typeName = itemType.split('/').pop() || 'Unknown';
      const props: Record<string, unknown> = {};

      const propEls = el.querySelectorAll('[itemprop]');
      if (propEls) {
        for (const prop of propEls) {
          const name = prop.getAttribute('itemprop') || '';
          const value = prop.getAttribute('content') || prop.textContent || '';
          if (name) props[name] = value.trim();
        }
      }

      blocks.push({
        type: typeName,
        properties: { '@type': typeName, ...props },
        source: 'microdata',
      });
    }
  }

  // 3. RDFa (typeof/property)
  const rdfaEls = doc.querySelectorAll('[typeof]');
  if (rdfaEls) {
    for (const el of rdfaEls) {
      const typeName = (el.getAttribute('typeof') || 'Unknown').split(':').pop() || 'Unknown';
      const props: Record<string, unknown> = {};

      const propEls = el.querySelectorAll('[property]');
      if (propEls) {
        for (const prop of propEls) {
          const name = (prop.getAttribute('property') || '').split(':').pop() || '';
          const value = prop.getAttribute('content') || prop.textContent || '';
          if (name) props[name] = value.trim();
        }
      }

      blocks.push({
        type: typeName,
        properties: { '@type': typeName, ...props },
        source: 'rdfa',
      });
    }
  }

  return blocks;
}

// ============================================================================
// DOM METRICS
// ============================================================================

function computeDomMetrics(doc: any, html: string): {
  totalNodes: number;
  mainContentNodes: number;
  nestingDepth: number;
  htmlSizeBytes: number;
} {
  // Total nodes via tree walk
  let totalNodes = 0;
  let maxDepth = 0;

  function walkNodes(node: any, depth: number) {
    totalNodes++;
    if (depth > maxDepth) maxDepth = depth;
    if (node.childNodes) {
      for (const child of node.childNodes) {
        walkNodes(child, depth + 1);
      }
    }
  }

  if (doc.body) {
    walkNodes(doc.body, 0);
  }

  // Main content nodes
  let mainContentNodes = 0;
  const mainEl = doc.querySelector('main') || doc.querySelector('article') || doc.querySelector('[role="main"]');
  if (mainEl) {
    function countNodes(node: any) {
      mainContentNodes++;
      if (node.childNodes) {
        for (const child of node.childNodes) {
          countNodes(child);
        }
      }
    }
    countNodes(mainEl);
  }

  return {
    totalNodes,
    mainContentNodes,
    nestingDepth: maxDepth,
    htmlSizeBytes: new TextEncoder().encode(html).byteLength,
  };
}

// ============================================================================
// MAIN ANALYZER
// ============================================================================

function analyzeHtml(html: string, centralEntity: string): StructuralAnalysis {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  if (!doc) {
    throw new Error('Failed to parse HTML');
  }

  // 1. Extract regions
  const { regions, mainContentText, mainContentWordCount } = extractRegions(doc, stripTags(doc.body?.innerHTML || ''));

  // Get sidebar/footer text for entity prominence
  const sidebarResult = extractRegionText(doc, ['aside', '[role="complementary"]']);
  const footerResult = extractRegionText(doc, ['footer', '[role="contentinfo"]']);

  // 2. Build heading tree
  const headingTree = buildHeadingTree(doc, centralEntity);

  // 3. Build section analysis
  const sections = buildSectionAnalysis(doc, centralEntity);

  // 4. Measure entity prominence
  const entityProminence = measureEntityProminence(
    doc, mainContentText, sidebarResult.text, footerResult.text, centralEntity
  );

  // 5. Extract schema markup
  const schemaMarkup = extractSchemaMarkup(doc);

  // 6. Compute DOM metrics
  const domMetrics = computeDomMetrics(doc, html);

  return {
    headingTree,
    regions,
    mainContentText,
    mainContentWordCount,
    sections,
    entityProminence,
    schemaMarkup,
    domMetrics,
    analyzedAt: new Date().toISOString(),
    analyzerVersion: ANALYZER_VERSION,
  };
}

// ============================================================================
// HANDLER
// ============================================================================

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, origin);
  }

  const startTime = Date.now();

  try {
    const body = await req.json();
    const { url, html, centralEntity = '', language = 'en' } = body;

    if (!url && !html) {
      return json({ error: 'Provide either url or html' }, 400, origin);
    }

    let rawHtml = html;

    // Fetch HTML if URL provided
    if (!rawHtml && url) {
      try {
        const response = await fetchWithTimeout(url, { timeout: 15000 });
        if (!response.ok) {
          return json({
            ok: false,
            error: `Failed to fetch URL: ${response.status} ${response.statusText}`,
          }, 200, origin);
        }
        rawHtml = await response.text();
      } catch (e: any) {
        return json({
          ok: false,
          error: `Failed to fetch URL: ${e?.message || 'Unknown error'}`,
        }, 200, origin);
      }
    }

    if (!rawHtml || rawHtml.length < 50) {
      return json({
        ok: false,
        error: 'HTML content too short to analyze',
      }, 200, origin);
    }

    // Truncate extremely large pages (>5MB) to prevent OOM
    if (rawHtml.length > 5_000_000) {
      rawHtml = rawHtml.slice(0, 5_000_000);
    }

    const analysis = analyzeHtml(rawHtml, centralEntity);
    const processingTimeMs = Date.now() - startTime;

    return json({
      ok: true,
      analysis,
      processingTimeMs,
    }, 200, origin);

  } catch (error: any) {
    console.error('[html-structure-analyzer] Error:', error?.message);
    return json({
      ok: false,
      error: error?.message || 'Internal error',
      processingTimeMs: Date.now() - startTime,
    }, 200, origin);
  }
});
```

**Step 2: Deploy and test**

Run: `supabase functions deploy html-structure-analyzer --no-verify-jwt --use-api`
Expected: Deployment succeeds

**Step 3: Commit**

```bash
git add supabase/functions/html-structure-analyzer/index.ts
git commit -m "feat(structural): add html-structure-analyzer edge function"
```

---

### Task 3: Database Migration

**Files:**
- Create: `supabase/migrations/2026MMDD_add_structural_analysis.sql`

**Step 1: Create the migration file**

Use the current date for the migration filename. Content:

```sql
-- Add structural_analysis column to site_analysis_pages
-- Stores rich HTML structural analysis: heading tree, content regions,
-- entity prominence, schema markup, DOM metrics.
-- Computed by the html-structure-analyzer edge function.

ALTER TABLE site_analysis_pages
ADD COLUMN IF NOT EXISTS structural_analysis JSONB DEFAULT NULL;

COMMENT ON COLUMN site_analysis_pages.structural_analysis IS
  'Rich HTML structural analysis: heading tree, content regions, entity prominence, schema markup. Computed by html-structure-analyzer edge function.';

-- Index for queries that check if structural analysis exists
CREATE INDEX IF NOT EXISTS idx_site_analysis_pages_has_structural
  ON site_analysis_pages ((structural_analysis IS NOT NULL));
```

**Step 2: Apply the migration**

Run against remote Supabase:
```bash
supabase db push
```

Or apply via SQL editor in Supabase Dashboard.

**Step 3: Verify column exists**

Check via Supabase Dashboard → Table Editor → `site_analysis_pages` → confirm `structural_analysis` column is present.

**Step 4: Commit**

```bash
git add supabase/migrations/2026*_add_structural_analysis.sql
git commit -m "feat(structural): add structural_analysis column to site_analysis_pages"
```

---

### Task 4: Frontend Service

**Files:**
- Create: `services/structuralAnalysisService.ts`

**Step 1: Create the service file**

```typescript
/**
 * Structural Analysis Service
 *
 * Frontend service for requesting and caching structural analysis.
 * Calls the html-structure-analyzer edge function and manages
 * persistence in site_analysis_pages.structural_analysis.
 */

import type { StructuralAnalysis, StructuralAnalysisRequest, StructuralAnalysisResponse } from '../types';
import { getSupabaseClient } from './supabaseClient';

const ANALYZER_VERSION = '1.0.0';

/**
 * Get structural analysis for a page, using cache if available.
 *
 * Priority:
 * 1. Check site_analysis_pages.structural_analysis for cached result
 * 2. If missing/stale, call edge function to analyze
 * 3. Store result for future use
 */
export async function getStructuralAnalysis(
  projectId: string,
  url: string,
  options: {
    centralEntity?: string;
    language?: string;
    html?: string;             // Pre-fetched HTML (avoids re-fetch)
    forceRefresh?: boolean;    // Skip cache
  } = {}
): Promise<StructuralAnalysis | null> {
  const supabase = getSupabaseClient();

  // 1. Check cache (unless force refresh)
  if (!options.forceRefresh) {
    const { data: cached } = await supabase
      .from('site_analysis_pages')
      .select('structural_analysis')
      .eq('project_id', projectId)
      .eq('url', url)
      .maybeSingle();

    if (cached?.structural_analysis) {
      const analysis = cached.structural_analysis as StructuralAnalysis;
      // Check version — re-analyze if analyzer was updated
      if (analysis.analyzerVersion === ANALYZER_VERSION) {
        return analysis;
      }
    }
  }

  // 2. Call edge function
  const request: StructuralAnalysisRequest = {
    centralEntity: options.centralEntity,
    language: options.language,
  };

  // Prefer pre-fetched HTML to avoid re-fetching
  if (options.html) {
    request.html = options.html;
  } else {
    request.url = url;
  }

  const { data, error } = await supabase.functions.invoke('html-structure-analyzer', {
    body: request,
  });

  if (error || !data?.ok || !data?.analysis) {
    console.warn('[structuralAnalysis] Analysis failed for', url, error?.message || data?.error);
    return null;
  }

  const analysis = data.analysis as StructuralAnalysis;

  // 3. Cache the result
  await supabase
    .from('site_analysis_pages')
    .update({ structural_analysis: analysis })
    .eq('project_id', projectId)
    .eq('url', url);

  return analysis;
}

/**
 * Analyze HTML directly without caching (for competitor pages, external URLs).
 * Returns the StructuralAnalysis or null on failure.
 */
export async function analyzeHtmlDirect(
  html: string,
  centralEntity?: string,
  language?: string
): Promise<StructuralAnalysis | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.functions.invoke('html-structure-analyzer', {
    body: { html, centralEntity, language },
  });

  if (error || !data?.ok || !data?.analysis) {
    console.warn('[structuralAnalysis] Direct analysis failed:', error?.message || data?.error);
    return null;
  }

  return data.analysis as StructuralAnalysis;
}

/**
 * Batch analyze multiple pages for a project.
 * Processes sequentially to avoid overwhelming the edge function.
 */
export async function batchAnalyzePages(
  projectId: string,
  pages: Array<{ url: string; html?: string }>,
  centralEntity?: string,
  language?: string,
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, StructuralAnalysis>> {
  const results = new Map<string, StructuralAnalysis>();
  const total = pages.length;

  for (let i = 0; i < total; i++) {
    const page = pages[i];
    const analysis = await getStructuralAnalysis(projectId, page.url, {
      centralEntity,
      language,
      html: page.html,
    });

    if (analysis) {
      results.set(page.url, analysis);
    }

    onProgress?.(i + 1, total);
  }

  return results;
}
```

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS (zero errors)

**Step 3: Commit**

```bash
git add services/structuralAnalysisService.ts
git commit -m "feat(structural): add frontend structural analysis service"
```

---

## Phase 2: Pipeline Integration

### Task 5: Crawl Step — Auto-Analyze During Discovery

**Files:**
- Modify: `components/pages/pipeline/PipelineCrawlStep.tsx`
- Modify: `services/pageExtractionService.ts`

**Step 1: Add structural analysis trigger after page extraction**

In `services/pageExtractionService.ts`, in the `mergeExtractionData()` function, after the data merge is complete, add a call to the structural analysis service. The raw HTML is available from Apify extraction (`apifyData?.html`).

Add import at top:
```typescript
import { analyzeHtmlDirect } from './structuralAnalysisService';
```

In the `extractPages()` function, after Phase 3 (combine), add a Phase 4 that runs structural analysis on pages that have raw HTML available. Store results in the returned data structure.

**Step 2: In `PipelineCrawlStep.tsx`, after crawl completion, persist structural analysis**

When crawl results are saved to `site_analysis_pages`, include the `structural_analysis` JSONB if available from the extraction result.

Add to the `handleSaveCrawlResults()` or equivalent function that upserts into `site_analysis_pages`:
```typescript
structural_analysis: page.structuralAnalysis || null,
```

**Step 3: Run type check and test**

Run: `npx tsc --noEmit`
Run: `npx vitest run`
Expected: PASS

**Step 4: Commit**

```bash
git add services/pageExtractionService.ts components/pages/pipeline/PipelineCrawlStep.tsx
git commit -m "feat(structural): auto-analyze HTML structure during crawl step"
```

---

### Task 6: Gap Analysis — Structural Comparison with Competitors

**Files:**
- Modify: `components/pages/pipeline/PipelineGapStep.tsx`
- Modify: `services/googleApiOrchestrator.ts`

**Step 1: Enrich gap analysis with structural data**

In `PipelineGapStep.tsx`, when loading `site_analysis_pages`, include `structural_analysis` in the SELECT query:
```typescript
.select('url, h1, headings, title, content_markdown, structural_analysis')
```

**Step 2: Use structural data in entity salience**

In `services/googleApiOrchestrator.ts`, when entity salience analysis runs, use `entityProminence` from `structural_analysis` if available as supplementary data. This provides more accurate prominence measurement than text-only analysis.

Add to the entity salience section (after line ~166):
```typescript
// Use structural analysis entity prominence if available
const structuralProminence = siteInventory
  .filter(p => (p as any).structural_analysis?.entityProminence)
  .map(p => (p as any).structural_analysis.entityProminence);
```

**Step 3: Add structural gap metrics to analysis output**

Add structural comparison metrics when available:
- Average H2 count: own pages vs competitor pages
- Main content word count (boilerplate excluded)
- Entity prominence in headings
- Schema markup coverage

These are added to the enrichment output for display in the gap analysis UI.

**Step 4: Commit**

```bash
git add components/pages/pipeline/PipelineGapStep.tsx services/googleApiOrchestrator.ts
git commit -m "feat(structural): enrich gap analysis with structural comparison data"
```

---

### Task 7: Entity Salience — Use entityProminence Instead of Flat Text

**Files:**
- Modify: `services/googleApiOrchestrator.ts`

**Step 1: Prefer structural entity prominence over Cloud NLP**

When `structural_analysis.entityProminence` is available for site pages, use it as the primary entity prominence signal. Cloud NLP remains as enrichment for salience scoring (which structural analysis doesn't provide — that's NLP-specific).

In the entity salience section, add logic to create a composite prominence report:

```typescript
// If structural analysis available, prefer its prominence data
const structuralPages = samplePages.filter(
  p => (p as any).structural_analysis?.entityProminence?.totalMentions > 0
);

if (structuralPages.length > 0) {
  // Aggregate structural prominence across pages
  const avgHeadingRate = structuralPages.reduce(
    (sum, p) => sum + ((p as any).structural_analysis.entityProminence.headingMentionRate || 0),
    0
  ) / structuralPages.length;

  const pagesWithCeInH1 = structuralPages.filter(
    p => (p as any).structural_analysis.entityProminence.inH1
  ).length;

  emit(onProgress, 'nlp', 'Structural entity prominence data available',
    `CE in H1: ${pagesWithCeInH1}/${structuralPages.length} pages, heading mention rate: ${Math.round(avgHeadingRate * 100)}%`);
}
```

**Step 2: Commit**

```bash
git add services/googleApiOrchestrator.ts
git commit -m "feat(structural): use entityProminence from structural analysis in gap analysis"
```

---

## Phase 3: Audit Enhancement

### Task 8: BoilerplateDetector — Use Actual Regions Data

**Files:**
- Modify: `services/audit/rules/BoilerplateDetector.ts`

**Step 1: Accept structural analysis in validate()**

Update the `validate()` method signature to accept optional `StructuralAnalysis`:

```typescript
import type { StructuralAnalysis } from '../../../types';

validate(
  html: string,
  structuralAnalysis?: StructuralAnalysis
): BoilerplateIssue[] {
  // If structural analysis available, use its region data
  if (structuralAnalysis?.regions) {
    return this.validateWithStructural(structuralAnalysis);
  }
  // Fallback to existing regex-based detection
  return this.validateWithHeuristic(html);
}
```

Move existing `validate()` logic into `validateWithHeuristic()`, and create `validateWithStructural()` that uses the pre-computed regions data.

**Step 2: Create validateWithStructural()**

```typescript
private validateWithStructural(sa: StructuralAnalysis): BoilerplateIssue[] {
  const issues: BoilerplateIssue[] = [];

  // BP-2: Check for semantic landmarks
  if (!sa.regions.main.exists) {
    issues.push({
      ruleId: 'BP-2',
      severity: 'medium',
      title: 'No semantic main content landmark',
      description: 'Page lacks <main>, <article>, or role="main". Add semantic landmarks.',
    });
  }

  // BP-1: Low main-content ratio
  if (sa.regions.main.percentage < 40) {
    issues.push({
      ruleId: 'BP-1',
      severity: 'high',
      title: 'Low main-content ratio',
      description: `Main content is only ${sa.regions.main.percentage}% of page. ` +
        `${sa.mainContentWordCount} words in main vs total page. Target >50%.`,
    });
  }

  return issues;
}
```

**Step 3: Commit**

```bash
git add services/audit/rules/BoilerplateDetector.ts
git commit -m "feat(structural): enhance BoilerplateDetector with structural regions data"
```

---

### Task 9: HeadingValidator — Use Nested headingTree

**Files:**
- Modify: `services/audit/rules/HeadingAndDiscourseValidator.ts`

**Step 1: Add structural analysis to validate() signature**

```typescript
validate(content: {
  text: string;
  html?: string;
  centralEntity?: string;
  headings?: { level: number; text: string }[];
  structuralAnalysis?: StructuralAnalysis;
}): HeadingDiscourseIssue[]
```

**Step 2: Use headingTree for hierarchy validation**

When `structuralAnalysis?.headingTree` is available, use the nested tree for more accurate heading skip detection (Rule 252) and hierarchy validation. The tree structure makes it trivial to check parent-child relationships:

```typescript
// Enhanced Rule 252: Heading hierarchy validation using tree
if (content.structuralAnalysis?.headingTree) {
  this.validateHeadingTree(content.structuralAnalysis.headingTree, issues);
}

private validateHeadingTree(tree: HeadingNode[], issues: HeadingDiscourseIssue[]) {
  for (const node of tree) {
    // Check for thin sections (heading with <30 words below)
    if (node.wordCountBelow < 30 && node.level >= 2) {
      issues.push({
        ruleId: 'rule-252b',
        severity: 'low',
        title: `Thin section under "${node.text}"`,
        description: `Only ${node.wordCountBelow} words under this H${node.level}. Consider expanding or merging.`,
      });
    }
    // Recurse into children
    if (node.children.length > 0) {
      this.validateHeadingTree(node.children, issues);
    }
  }
}
```

**Step 3: Commit**

```bash
git add services/audit/rules/HeadingAndDiscourseValidator.ts
git commit -m "feat(structural): enhance heading validation with nested headingTree"
```

---

### Task 10: CentralEntityPositionChecker — Use entityProminence

**Files:**
- Modify: `services/audit/rules/CentralEntityPositionChecker.ts`

**Step 1: Accept structural analysis and use entityProminence**

Update `validate()` to accept optional `StructuralAnalysis`:

```typescript
validate(content: {
  text: string;
  centralEntity: string;
  sourceContextAttributes?: string[];
  csiPredicates?: string[];
  structuralAnalysis?: StructuralAnalysis;
}): CePositionIssue[]
```

**Step 2: Use entityProminence for rules 4 and 5**

When `structuralAnalysis?.entityProminence` is available:

```typescript
const ep = content.structuralAnalysis?.entityProminence;

// Enhanced Rule 4: CE position — use firstMentionPosition instead of sentence parsing
if (ep) {
  if (ep.firstMentionPosition > 0.05) {
    issues.push({
      ruleId: 'rule-4',
      severity: 'high',
      title: 'CE not near start of main content',
      description: `"${content.centralEntity}" first appears at ${Math.round(ep.firstMentionPosition * 100)}% into main content. Target: within first 5%.`,
    });
  }

  // Enhanced Rule 5: CE in H1
  if (!ep.inH1) {
    issues.push({
      ruleId: 'rule-5',
      severity: 'medium',
      title: 'CE not in H1',
      description: `"${content.centralEntity}" is not in the page's H1 heading. The H1 is the strongest on-page signal.`,
    });
  }
} else {
  // Fallback to existing text-based checks
  // ... existing rules 4 and 5 logic ...
}
```

**Step 3: Commit**

```bash
git add services/audit/rules/CentralEntityPositionChecker.ts
git commit -m "feat(structural): enhance CE position checking with entityProminence"
```

---

### Task 11: HtmlNestingValidator — Use DOM Metrics

**Files:**
- Modify: `services/audit/rules/HtmlNestingValidator.ts`

**Step 1: Accept structural analysis for DOM metrics**

When `structuralAnalysis?.domMetrics` is available, use `mainContentNodes` vs `totalNodes` ratio and `nestingDepth` for more accurate DOM efficiency checking.

```typescript
validate(
  html: string,
  structuralAnalysis?: StructuralAnalysis
): NestingIssue[] {
  const issues = this.validateNesting(html);

  // Enhanced DOM metrics from structural analysis
  if (structuralAnalysis?.domMetrics) {
    const dm = structuralAnalysis.domMetrics;
    const contentRatio = dm.totalNodes > 0
      ? dm.mainContentNodes / dm.totalNodes
      : 0;

    if (contentRatio < 0.3 && dm.totalNodes > 500) {
      issues.push({
        ruleId: 'rule-CoR-dom',
        severity: 'medium',
        title: 'Low content-to-DOM ratio',
        description: `Only ${Math.round(contentRatio * 100)}% of DOM nodes (${dm.mainContentNodes}/${dm.totalNodes}) are in main content. High overhead increases Cost of Retrieval.`,
      });
    }
  }

  return issues;
}
```

**Step 2: Commit**

```bash
git add services/audit/rules/HtmlNestingValidator.ts
git commit -m "feat(structural): enhance DOM metrics with structural analysis data"
```

---

### Task 12: Wire Structural Analysis into Audit Phases

**Files:**
- Modify: `services/audit/phases/HtmlTechnicalPhase.ts`
- Modify: `services/audit/phases/StrategicFoundationPhase.ts`
- Modify: `services/audit/phases/ContextualFlowPhase.ts`
- Modify: `services/audit/ContentFetcher.ts`

**Step 1: Load structural analysis in ContentFetcher**

In `ContentFetcher.ts`, when fetching content for audit, also load `structural_analysis` from `site_analysis_pages` if the page exists. Add it to the `FetchedContent` type.

In `services/audit/types.ts`, add to `FetchedContent`:
```typescript
structuralAnalysis?: StructuralAnalysis;
```

**Step 2: Pass structural analysis through phase adapters**

In `HtmlTechnicalPhase.ts`, pass `structuralAnalysis` to validators:
```typescript
const nestingIssues = nestingValidator.validate(html, content.structuralAnalysis);
const boilerplateIssues = boilerplateDetector.validate(html, content.structuralAnalysis);
```

In `StrategicFoundationPhase.ts`, pass to CE position checker:
```typescript
const ceIssues = ceChecker.validate({
  text: content.semanticText,
  centralEntity: ce,
  structuralAnalysis: content.structuralAnalysis,
});
```

In `ContextualFlowPhase.ts`, pass to heading/discourse validator:
```typescript
const headingIssues = headingValidator.validate({
  text: content.semanticText,
  headings: content.headings,
  centralEntity: ce,
  structuralAnalysis: content.structuralAnalysis,
});
```

**Step 3: Run type check and tests**

Run: `npx tsc --noEmit`
Run: `npx vitest run`
Expected: PASS

**Step 4: Commit**

```bash
git add services/audit/types.ts services/audit/ContentFetcher.ts \
  services/audit/phases/HtmlTechnicalPhase.ts \
  services/audit/phases/StrategicFoundationPhase.ts \
  services/audit/phases/ContextualFlowPhase.ts
git commit -m "feat(structural): wire structural analysis into audit phase pipeline"
```

---

## Phase 4: Content & Intelligence

### Task 13: Content Briefs — Competitor Structural Templates

**Files:**
- Modify: `services/ai/briefGeneration.ts`

**Step 1: Include competitor structural data in brief prompts**

When generating content briefs, if competitor pages have `structural_analysis`, include a "Structural Template" section showing:
- Average number of H2 sections
- Average section word count
- Content element distribution (lists, tables, images per section)
- Schema types found on competitor pages

Add a helper function:
```typescript
function buildStructuralTemplateSection(
  competitorAnalyses: StructuralAnalysis[]
): string {
  if (competitorAnalyses.length === 0) return '';

  const avgH2Count = Math.round(
    competitorAnalyses.reduce((s, a) => s + a.sections.length, 0) / competitorAnalyses.length
  );
  const avgMainWords = Math.round(
    competitorAnalyses.reduce((s, a) => s + a.mainContentWordCount, 0) / competitorAnalyses.length
  );
  const schemaTypes = [...new Set(
    competitorAnalyses.flatMap(a => a.schemaMarkup.map(s => s.type))
  )];

  return `\n## Structural Template (from ${competitorAnalyses.length} competitor pages)\n` +
    `- Average H2 sections: ${avgH2Count}\n` +
    `- Average main content words: ${avgMainWords}\n` +
    `- Schema types found: ${schemaTypes.join(', ') || 'none'}\n`;
}
```

**Step 2: Commit**

```bash
git add services/ai/briefGeneration.ts
git commit -m "feat(structural): add competitor structural templates to content briefs"
```

---

### Task 14: Content Generation — Structural Validation in Pass 2

**Files:**
- Modify: `services/ai/contentGeneration/passes/pass2HeaderOptimization.ts`

**Step 1: Compare generated heading structure against competitor baseline**

In Pass 2 (Header Optimization), when `structural_analysis` data is available from competitor pages, compare the generated article's heading structure against the competitor baseline:
- Are there enough H2 sections? (compared to competitor average)
- Is the CE mentioned in enough headings? (compared to competitor heading mention rate)

Add this as supplementary guidance in the Pass 2 prompt:

```typescript
if (competitorStructural?.length) {
  const avgH2 = Math.round(
    competitorStructural.reduce((s, a) => s + a.sections.length, 0) / competitorStructural.length
  );
  prompt += `\nCompetitor pages average ${avgH2} H2 sections. Ensure comparable depth.\n`;
}
```

**Step 2: Commit**

```bash
git add services/ai/contentGeneration/passes/pass2HeaderOptimization.ts
git commit -m "feat(structural): add competitor heading comparison to Pass 2 optimization"
```

---

### Task 15: Insights Hub — Structural Health Metrics

**Files:**
- Modify: `components/InsightsHub.tsx` (or equivalent insights component)

**Step 1: Add structural health aggregation**

Create aggregation logic for structural metrics across all analyzed pages:
- Heading compliance: % of pages with valid heading hierarchy (no skips, single H1)
- Main content ratio: average `regions.main.percentage` across pages
- Schema coverage: % of pages with at least one schema block
- CE heading presence: % of pages with CE in H1
- DOM efficiency: average `mainContentNodes / totalNodes` ratio

**Step 2: Add structural health card to Insights Hub**

Display the aggregated metrics in a new card/section. Use the existing card component patterns.

**Step 3: Commit**

```bash
git add components/InsightsHub.tsx
git commit -m "feat(structural): add structural health metrics to Insights Hub"
```

---

## Phase 5: Migration & Advanced

### Task 16: Migration Planning — Structural Gap Justification

**Files:**
- Modify: Migration planning components (identify exact file after Phase 4)

**Step 1: Use structural depth for REWRITE vs OPTIMIZE decisions**

When deciding whether a page needs REWRITE, OPTIMIZE, or KEEP during migration planning, compare the page's structural depth against competitor averages:
- `sections.length` vs competitor average section count
- `mainContentWordCount` vs competitor average
- Schema coverage gap

Pages with significantly fewer sections or lower content depth than competitors get flagged for REWRITE. Pages at or above competitor levels get OPTIMIZE or KEEP.

**Step 2: Commit**

```bash
git commit -m "feat(structural): use structural depth for migration planning decisions"
```

---

### Task 17: Schema Generation — Heading-Driven Schema in Pass 9

**Files:**
- Modify: `services/ai/contentGeneration/passes/pass9SchemaGeneration.ts`
- Modify: `services/ai/contentGeneration/schemaGeneration/schemaGenerator.ts`

**Step 1: Use heading tree for FAQ schema detection**

When the heading tree contains question-format headings (detected via `?` or question words), suggest FAQPage schema. The structural analysis already classifies heading patterns.

**Step 2: Use heading tree for HowTo schema detection**

When sections follow a sequential pattern (Step 1, Step 2... or numbered headings), suggest HowTo schema with steps derived from the heading tree.

**Step 3: Validate @mainEntity alignment**

Check that `schemaMarkup` `@mainEntity` matches the H1 text from `headingTree[0]` (if level === 1).

**Step 4: Commit**

```bash
git add services/ai/contentGeneration/passes/pass9SchemaGeneration.ts \
  services/ai/contentGeneration/schemaGeneration/schemaGenerator.ts
git commit -m "feat(structural): heading-driven schema detection in Pass 9"
```

---

## Verification Checklist

After all tasks are complete, verify:

1. `npx tsc --noEmit` — zero errors
2. `npx vitest run` — zero failures
3. Edge function deploys successfully
4. Edge function returns valid `StructuralAnalysis` for:
   - Page with semantic HTML tags (`<main>`, `<article>`, `<aside>`)
   - Page without semantic tags (heuristic fallback)
   - Page with JSON-LD schema blocks
5. Heading tree correctly nests H1 → H2 → H3 hierarchy
6. Content regions correctly identify `<main>` vs `<aside>` vs `<footer>`
7. Entity prominence detects CE in H1, title, meta description
8. Results persist in `site_analysis_pages.structural_analysis`
9. Cached results are reused (no re-analysis for same content)
10. Audit rules produce different (more accurate) results with structural data
11. `mainContentWordCount` differs from total `word_count` (boilerplate excluded)
12. Gap analysis shows structural comparison when data is available
