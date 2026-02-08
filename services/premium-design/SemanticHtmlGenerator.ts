// =============================================================================
// SemanticHtmlGenerator — Converts markdown draft to design-ready semantic HTML
// =============================================================================
// Produces rich HTML5 with semantic elements, data-* attributes, and structural
// wrappers that give the AI CSS generator enough surface area to create
// agency-quality visual designs.
//
// Phase 3: Section intelligence via SectionAnalyzer — each section gets a
// content role, semantic weight, and emphasis level derived from the brief.

import { convertMarkdownToSemanticHtml } from '../contentAssemblyService';
import { injectHeadingIds, generateTableOfContentsHtml } from '../quickExportStylesheet';
import { SectionAnalyzer } from '../layout-engine/SectionAnalyzer';
import type { ContentType as LayoutContentType } from '../layout-engine/types';
import type { BriefSection } from '../../types';
import type { BusinessContext } from './types';

type ContentType =
  | 'prose' | 'faq' | 'comparison' | 'timeline' | 'steps' | 'checklist' | 'cta'
  | 'introduction' | 'explanation' | 'summary' | 'testimonial' | 'definition' | 'list' | 'data';

type Emphasis = 'hero' | 'featured' | 'standard' | 'supporting' | 'minimal';

interface SectionInfo {
  id: string;
  heading: string;
  headingLevel: number;
  contentType: ContentType;
  html: string;
  semanticWeight: number;
  emphasis: Emphasis;
  contentZone: string;
}

/** Map SectionAnalyzer ContentType to our local ContentType */
function mapContentType(ct: LayoutContentType): ContentType {
  return ct as ContentType;
}

/** Map semantic weight (1-5) to emphasis level */
function weightToEmphasis(weight: number): Emphasis {
  if (weight >= 5) return 'hero';
  if (weight >= 4) return 'featured';
  if (weight >= 3) return 'standard';
  if (weight >= 2) return 'supporting';
  return 'minimal';
}

/** Normalize text for heading comparison */
function normalizeForComparison(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Word-overlap heading similarity (0-1) */
function headingSimilarityScore(heading1: string, heading2: string): number {
  const n1 = normalizeForComparison(heading1);
  const n2 = normalizeForComparison(heading2);
  if (n1 === n2) return 1.0;
  const words1 = n1.split(' ').filter(w => w.length > 0);
  const words2 = n2.split(' ').filter(w => w.length > 0);
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  const overlap = [...set1].filter(w => set2.has(w)).length;
  const total = Math.max(set1.size, set2.size);
  return total === 0 ? 0 : overlap / total;
}

export class SemanticHtmlGenerator {
  generate(
    markdown: string,
    title: string,
    businessContext?: BusinessContext,
    structuredOutline?: BriefSection[]
  ): string {
    let baseHtml = convertMarkdownToSemanticHtml(markdown, { semantic: true });
    baseHtml = injectHeadingIds(baseHtml);
    const tocHtml = generateTableOfContentsHtml(baseHtml);
    const sections = this.splitIntoSections(baseHtml, structuredOutline);

    // Build semantic article with design-friendly structure
    const sectionCount = sections.length;
    const enrichmentAttrs = ['data-feature-grid', 'data-pull-quote', 'data-step-list', 'data-highlight-box', 'data-comparison-table'];
    const sectionsHtml = sections
      .map((s, i) => {
        // Mark alternating sections for visual rhythm
        const variant = i % 3 === 1 ? ' data-variant="surface"' : '';
        // Universal hooks: index and count on every section
        const indexAttrs = ` data-section-index="${i}" data-section-count="${sectionCount}"`;
        // Mark prose-only sections (no enrichment hooks)
        const hasSomeEnrichment = enrichmentAttrs.some(attr => s.html.includes(attr));
        const proseAttr = (!hasSomeEnrichment && (s.contentType === 'prose' || s.contentType === 'explanation')) ? ' data-prose-section' : '';
        // Section intelligence attributes
        const roleAttr = ` data-section-role="${s.contentType}"`;
        const weightAttr = ` data-semantic-weight="${s.semanticWeight}"`;
        const emphasisAttr = ` data-emphasis="${s.emphasis}"`;
        const zoneAttr = s.contentZone !== 'MAIN' ? ` data-content-zone="${s.contentZone}"` : '';
        return `<section data-section-id="${s.id}" data-content-type="${s.contentType}"${variant}${indexAttrs}${proseAttr}${roleAttr}${weightAttr}${emphasisAttr}${zoneAttr}>\n<div data-section-inner>\n${s.html}\n</div>\n</section>`;
      })
      .join('\n\n');

    // CTA section at the bottom
    const ctaHtml = businessContext?.ctaText
      ? `\n<section data-content-type="cta" data-section-role="cta" data-semantic-weight="3" data-emphasis="featured">\n<div data-section-inner>\n<p>${this.esc(businessContext.ctaText)}</p>\n${businessContext.ctaUrl ? `<a href="${this.esc(businessContext.ctaUrl)}" data-cta-button>${this.esc(businessContext.ctaText)}</a>` : ''}\n</div>\n</section>`
      : '';

    // Wrap in article with header and footer zones
    const heroSubtitle = businessContext?.industry && businessContext?.audience
      ? `\n<p data-hero-subtitle>${this.esc(businessContext.industry)} &middot; ${this.esc(businessContext.audience)}</p>`
      : '';

    // Smart TOC post-processing
    const processedToc = this.processSmartToc(tocHtml, sectionCount);

    return `<article>
<header data-hero>
<div data-hero-content>
<h1>${this.esc(title)}</h1>${heroSubtitle}
</div>
</header>
${processedToc ? processedToc + '\n' : ''}
<div data-content-body>
${sectionsHtml}${ctaHtml}
</div>
<footer data-article-footer>
<p data-footer-text>Published article</p>
</footer>
</article>`;
  }

  private splitIntoSections(html: string, structuredOutline?: BriefSection[]): SectionInfo[] {
    const sections: SectionInfo[] = [];
    const h2Regex = /(<h2[^>]*>[\s\S]*?<\/h2>)/gi;
    const parts = html.split(h2Regex);
    let sectionIndex = 0;

    // Track used brief sections to avoid duplicate matching
    const usedBriefIndices = new Set<number>();

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (!part) continue;

      const headingMatch = part.match(/<h2[^>]*id="([^"]*)"[^>]*>([\s\S]*?)<\/h2>/i);

      if (headingMatch) {
        const headingId = headingMatch[1];
        const headingText = headingMatch[2].replace(/<[^>]+>/g, '').trim();
        const bodyContent = (i + 1 < parts.length && !parts[i + 1].match(/^<h2/i)) ? parts[i + 1].trim() : '';
        if (bodyContent) i++;

        const fullHtml = part + '\n' + bodyContent;

        // Match to brief section for enrichment
        const briefSection = structuredOutline
          ? this.findMatchingBriefSection(headingText, structuredOutline, usedBriefIndices)
          : undefined;

        // Use SectionAnalyzer for content type detection (70+ patterns)
        const contentType = mapContentType(
          SectionAnalyzer.detectContentType(headingText, fullHtml, briefSection?.format_code)
        );

        // Calculate semantic weight
        const semanticWeight = this.calculateWeight(contentType, sectionIndex, briefSection, sections.length === 0);

        sections.push({
          id: headingId || `section-${sectionIndex}`,
          heading: headingText,
          headingLevel: 2,
          contentType,
          html: this.wrapContentType(this.enrichSectionHtml(fullHtml, contentType), contentType),
          semanticWeight,
          emphasis: weightToEmphasis(semanticWeight),
          contentZone: briefSection?.content_zone || 'MAIN',
        });
        sectionIndex++;
      } else if (sectionIndex === 0) {
        sections.push({
          id: 'intro',
          heading: '',
          headingLevel: 0,
          contentType: 'introduction',
          html: part,
          semanticWeight: 3,
          emphasis: 'standard',
          contentZone: 'MAIN',
        });
        sectionIndex++;
      } else {
        if (sections.length > 0) {
          sections[sections.length - 1].html += '\n' + part;
        }
      }
    }

    if (sections.length === 0) {
      sections.push({
        id: 'content', heading: '', headingLevel: 0, contentType: 'prose', html,
        semanticWeight: 3, emphasis: 'standard', contentZone: 'MAIN',
      });
    }

    // Apply first-MAIN-section boost (featured)
    const firstMainIdx = sections.findIndex(s => s.contentZone === 'MAIN' && s.heading);
    if (firstMainIdx >= 0 && sections[firstMainIdx].semanticWeight < 5) {
      const boosted = Math.min(5, sections[firstMainIdx].semanticWeight + 1);
      sections[firstMainIdx].semanticWeight = boosted;
      sections[firstMainIdx].emphasis = weightToEmphasis(boosted);
    }

    return sections;
  }

  /** Calculate semantic weight using brief data or position-based fallback */
  private calculateWeight(
    contentType: ContentType,
    index: number,
    briefSection?: BriefSection,
    isFirstSection?: boolean
  ): number {
    // With brief data: use SectionAnalyzer's calculation
    if (briefSection?.attribute_category) {
      return SectionAnalyzer.calculateSemanticWeight({
        attributeCategory: briefSection.attribute_category,
        isCoreTopic: false,
        hasFSTarget: briefSection.format_code === 'FS',
        answersMainIntent: false,
      });
    }

    // Fallback: position + content-type based weighting
    let weight = 3; // base

    if (isFirstSection || index === 0) weight += 1;
    if (contentType === 'introduction' || contentType === 'definition') weight += 0.5;
    if (contentType === 'summary' || contentType === 'faq') weight -= 0.5;

    return Math.max(1, Math.min(5, weight));
  }

  /** Find the best matching brief section by heading similarity (>= 70%) */
  private findMatchingBriefSection(
    heading: string,
    briefSections: BriefSection[],
    usedIndices: Set<number>
  ): BriefSection | undefined {
    if (!heading) return undefined;

    let bestMatch: { index: number; score: number } | null = null;

    for (let i = 0; i < briefSections.length; i++) {
      if (usedIndices.has(i)) continue;

      const bs = briefSections[i];
      const score = Math.max(
        headingSimilarityScore(heading, bs.heading),
        bs.section_heading ? headingSimilarityScore(heading, bs.section_heading) : 0
      );

      if (score >= 0.7 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { index: i, score };
      }
    }

    if (bestMatch) {
      usedIndices.add(bestMatch.index);
      return briefSections[bestMatch.index];
    }

    return undefined;
  }

  /** Smart TOC: add data-toc-count, strip H3s for 8+ sections, add compact for 12+ */
  private processSmartToc(tocHtml: string, sectionCount: number): string {
    if (!tocHtml) return '';

    let result = tocHtml;

    // Count H2-level TOC entries (H2 <li> tags have NO class, H3 have class="toc-h3")
    const allLiCount = (result.match(/<li/g) || []).length;
    const h3Count = (result.match(/<li class="toc-h3"/g) || []).length;
    const h2Count = allLiCount - h3Count;

    // Add data-toc-count to the nav
    result = result.replace(/<nav class="toc">/, `<nav class="toc" data-toc-count="${h2Count}">`);

    // 8+ H2s: strip H3 entries for readability
    if (h2Count >= 8) {
      result = result.replace(/<li class="toc-h3"[^>]*>[\s\S]*?<\/li>/gi, '');
    }

    // 12+ H2s: add compact attribute for 2-column CSS treatment
    if (h2Count >= 12) {
      result = result.replace(/<nav class="toc"/, '<nav class="toc" data-toc-compact');
    }

    return result;
  }

  private wrapContentType(html: string, contentType: ContentType): string {
    if (contentType === 'faq' && !html.includes('<details')) {
      return html.replace(
        /<(h[34])[^>]*>([\s\S]*?\?)<\/\1>\s*(<p>[\s\S]*?<\/p>)/gi,
        '<details><summary>$2</summary>\n$3\n</details>'
      );
    }
    return html;
  }

  private enrichSectionHtml(html: string, contentType: ContentType): string {
    let result = html;

    // 1. Feature grid — <ul> with 3-8 short items (each <li> < 120 chars, no nested lists)
    result = result.replace(/<ul>([\s\S]*?)<\/ul>/gi, (match, inner: string) => {
      const items = inner.match(/<li>[\s\S]*?<\/li>/gi) || [];
      if (items.length < 3 || items.length > 8) return match;
      if (inner.includes('<ul') || inner.includes('<ol')) return match;
      const allShort = items.every(li => li.replace(/<[^>]+>/g, '').length < 120);
      if (!allShort) return match;
      return `<ul data-feature-grid>${inner}</ul>`;
    });

    // 2. Pull quote — <blockquote> with short text (< 150 chars)
    result = result.replace(/<blockquote>([\s\S]*?)<\/blockquote>/gi, (match, inner: string) => {
      const textLength = inner.replace(/<[^>]+>/g, '').trim().length;
      if (textLength > 0 && textLength < 150) {
        return `<blockquote data-pull-quote>${inner}</blockquote>`;
      }
      return match;
    });

    // 3. Step list — For 'steps' content type, add to <ol>
    if (contentType === 'steps') {
      result = result.replace(/<ol>/gi, '<ol data-step-list>');
    }

    // 4. Highlight box — <p> starting with key phrases
    result = result.replace(
      /<p><strong>(Key takeaway|Important|Belangrijk|Let op|Opmerking|Tip)[:.]?<\/strong>([\s\S]*?)<\/p>/gi,
      '<div data-highlight-box><p><strong>$1:</strong>$2</p></div>'
    );

    // 5. Comparison table — For 'comparison' content type, wrap <table>
    if (contentType === 'comparison') {
      result = result.replace(/<table>([\s\S]*?)<\/table>/gi, '<div data-comparison-table><table>$1</table></div>');
    }

    // 6. Intro text — first <p> after each <h2> gets data-intro-text
    result = result.replace(/<\/h2>\s*\n?<p>/,  '</h2>\n<p data-intro-text>');

    return result;
  }

  private esc(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
