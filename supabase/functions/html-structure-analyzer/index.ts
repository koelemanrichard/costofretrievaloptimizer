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

import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.48/deno-dom-wasm.ts';
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

  const headings: { level: number; text: string; el: any }[] = [];
  for (const el of headingEls) {
    const level = parseInt(el.tagName.charAt(1), 10);
    const text = (el.textContent || '').trim();
    if (text) {
      headings.push({ level, text, el });
    }
  }

  const bodyHtml = doc.body?.innerHTML || '';

  const root: HeadingNode[] = [];
  const stack: { node: HeadingNode; level: number }[] = [];

  for (let i = 0; i < headings.length; i++) {
    const h = headings[i];

    let wordCountBelow = 0;
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

    const h2Pos = bodyHtml.indexOf(h2.outerHTML);
    let nextH2Pos = bodyHtml.length;
    if (i + 1 < h2Els.length) {
      const np = bodyHtml.indexOf(h2Els[i + 1].outerHTML, h2Pos + 1);
      if (np !== -1) nextH2Pos = np;
    }

    const sectionHtml = bodyHtml.slice(h2Pos + h2.outerHTML.length, nextH2Pos);
    const sectionText = stripTags(sectionHtml);

    const tmpDoc = new DOMParser().parseFromString(`<div>${sectionHtml}</div>`, 'text/html');
    const paragraphs = tmpDoc?.querySelectorAll('p');
    const lists = tmpDoc?.querySelectorAll('ul, ol');
    const tables = tmpDoc?.querySelectorAll('table');
    const images = tmpDoc?.querySelectorAll('img');

    const h3s = tmpDoc?.querySelectorAll('h3') || [];
    const h3Array = Array.from(h3s);
    const subSections: SectionAnalysis[] = [];

    for (let k = 0; k < h3Array.length; k++) {
      const h3 = h3Array[k] as any;
      const h3Text = (h3.textContent || '').trim();
      if (!h3Text) continue;

      const h3Pos = sectionHtml.indexOf(h3.outerHTML);
      let nextH3Pos = sectionHtml.length;
      if (k + 1 < h3Array.length) {
        const np = sectionHtml.indexOf((h3Array[k + 1] as any).outerHTML, h3Pos + 1);
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

  const titleEl = doc.querySelector('title');
  const titleText = (titleEl?.textContent || '').toLowerCase();
  const inTitle = titleText.includes(ceLower);

  const h1El = doc.querySelector('h1');
  const h1Text = (h1El?.textContent || '').toLowerCase();
  const inH1 = h1Text.includes(ceLower);

  const firstH2 = doc.querySelector('h2');
  const firstH2Text = (firstH2?.textContent || '').toLowerCase();
  const inFirstH2 = firstH2Text.includes(ceLower);

  const metaDesc = doc.querySelector('meta[name="description"]');
  const metaDescText = (metaDesc?.getAttribute('content') || '').toLowerCase();
  const inMetaDescription = metaDescText.includes(ceLower);

  const fullText = stripTags(doc.body?.innerHTML || '');
  const totalMentions = countEntityMentions(fullText, centralEntity);
  const mainContentMentions = countEntityMentions(mainContentText, centralEntity);
  const sidebarMentions = countEntityMentions(sidebarText, centralEntity);
  const footerMentions = countEntityMentions(footerText, centralEntity);

  const mainLower = mainContentText.toLowerCase();
  const firstIdx = mainLower.indexOf(ceLower);
  const firstMentionPosition = firstIdx >= 0 ? firstIdx / Math.max(mainLower.length, 1) : 1;

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

  let mainContentNodes = 0;
  const mainEl = doc.querySelector('main') || doc.querySelector('article') || doc.querySelector('[role="main"]');
  if (mainEl) {
    function countMainNodes(node: any) {
      mainContentNodes++;
      if (node.childNodes) {
        for (const child of node.childNodes) {
          countMainNodes(child);
        }
      }
    }
    countMainNodes(mainEl);
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

  const { regions, mainContentText, mainContentWordCount } = extractRegions(doc, stripTags(doc.body?.innerHTML || ''));

  const sidebarResult = extractRegionText(doc, ['aside', '[role="complementary"]']);
  const footerResult = extractRegionText(doc, ['footer', '[role="contentinfo"]']);

  const headingTree = buildHeadingTree(doc, centralEntity);
  const sections = buildSectionAnalysis(doc, centralEntity);
  const entityProminence = measureEntityProminence(
    doc, mainContentText, sidebarResult.text, footerResult.text, centralEntity
  );
  const schemaMarkup = extractSchemaMarkup(doc);
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
