// services/tocService.ts
// Table of Contents Generator with URL fragments
// Generates TOC from content briefs with proper slug/hash links

import { ContentBrief, BriefSection } from '../types';

export interface TOCEntry {
  id: string;
  heading: string;
  level: number;
  slug: string;           // URL-safe #hash
  children: TOCEntry[];
}

export interface GeneratedTOC {
  entries: TOCEntry[];
  htmlOutput: string;
  markdownOutput: string;
  passageHints: string[];
  totalHeadings: number;
  maxDepth: number;
}

/**
 * Generate URL-safe slug from heading text
 * Follows common slug conventions for anchor IDs
 */
export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')      // Remove special chars
    .replace(/\s+/g, '-')          // Replace spaces with hyphens
    .replace(/-+/g, '-')           // Collapse multiple hyphens
    .replace(/^-|-$/g, '');        // Remove leading/trailing hyphens
};

/**
 * Ensure slug uniqueness by adding suffix if needed
 */
const ensureUniqueSlug = (slug: string, existingSlugs: Set<string>): string => {
  if (!existingSlugs.has(slug)) {
    existingSlugs.add(slug);
    return slug;
  }

  let counter = 1;
  let uniqueSlug = `${slug}-${counter}`;
  while (existingSlugs.has(uniqueSlug)) {
    counter++;
    uniqueSlug = `${slug}-${counter}`;
  }
  existingSlugs.add(uniqueSlug);
  return uniqueSlug;
};

/**
 * Build TOC entries from brief sections
 */
const buildTOCFromSections = (
  sections: BriefSection[],
  existingSlugs: Set<string>,
  parentLevel: number = 1
): TOCEntry[] => {
  const entries: TOCEntry[] = [];

  for (const section of sections) {
    const slug = ensureUniqueSlug(generateSlug(section.heading), existingSlugs);

    const entry: TOCEntry = {
      id: section.key || `toc-${slug}`,
      heading: section.heading,
      level: section.level || parentLevel + 1,
      slug,
      children: [],
    };

    // Process subsections recursively
    if (section.subsections && section.subsections.length > 0) {
      entry.children = buildTOCFromSections(
        section.subsections,
        existingSlugs,
        entry.level
      );
    }

    entries.push(entry);
  }

  return entries;
};

/**
 * Generate HTML output for TOC
 */
const generateHTML = (entries: TOCEntry[], depth: number = 0): string => {
  if (entries.length === 0) return '';

  const indent = '  '.repeat(depth);
  const childIndent = '  '.repeat(depth + 1);

  let html = `${indent}<ul class="toc-list toc-level-${depth + 1}">\n`;

  for (const entry of entries) {
    html += `${childIndent}<li class="toc-item">\n`;
    html += `${childIndent}  <a href="#${entry.slug}" class="toc-link">${escapeHTML(entry.heading)}</a>\n`;

    if (entry.children.length > 0) {
      html += generateHTML(entry.children, depth + 1);
    }

    html += `${childIndent}</li>\n`;
  }

  html += `${indent}</ul>`;
  return html;
};

/**
 * Generate Markdown output for TOC
 */
const generateMarkdown = (entries: TOCEntry[], depth: number = 0): string => {
  let md = '';
  const indent = '  '.repeat(depth);

  for (const entry of entries) {
    md += `${indent}- [${entry.heading}](#${entry.slug})\n`;

    if (entry.children.length > 0) {
      md += generateMarkdown(entry.children, depth + 1);
    }
  }

  return md;
};

/**
 * Escape HTML special characters
 */
const escapeHTML = (text: string): string => {
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => escapeMap[char] || char);
};

/**
 * Calculate max depth of TOC tree
 */
const calculateMaxDepth = (entries: TOCEntry[], currentDepth: number = 1): number => {
  let maxDepth = currentDepth;

  for (const entry of entries) {
    if (entry.children.length > 0) {
      const childDepth = calculateMaxDepth(entry.children, currentDepth + 1);
      maxDepth = Math.max(maxDepth, childDepth);
    }
  }

  return maxDepth;
};

/**
 * Count total headings in TOC
 */
const countHeadings = (entries: TOCEntry[]): number => {
  let count = entries.length;
  for (const entry of entries) {
    count += countHeadings(entry.children);
  }
  return count;
};

/**
 * Generate passage hints for Featured Snippet targeting
 * Based on common questions/patterns in headings
 */
const generatePassageHints = (entries: TOCEntry[]): string[] => {
  const hints: string[] = [];
  const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which'];
  const actionWords = ['steps', 'guide', 'tips', 'ways', 'methods', 'best'];

  const processEntry = (entry: TOCEntry) => {
    const lowerHeading = entry.heading.toLowerCase();

    // Question-based headings are great for Featured Snippets
    if (questionWords.some(w => lowerHeading.startsWith(w))) {
      hints.push(`Section "${entry.heading}" targets a question query - ensure first 40-60 words directly answer it.`);
    }

    // List-based headings
    if (actionWords.some(w => lowerHeading.includes(w))) {
      hints.push(`Section "${entry.heading}" likely targets list snippet - use numbered or bulleted list.`);
    }

    // Process children
    entry.children.forEach(processEntry);
  };

  entries.forEach(processEntry);

  return hints.slice(0, 5); // Limit to top 5 hints
};

/**
 * Generate complete TOC from a content brief
 */
export const generateTOCFromBrief = (brief: ContentBrief): GeneratedTOC => {
  const existingSlugs = new Set<string>();

  // Start with the title as H1
  const titleSlug = ensureUniqueSlug(generateSlug(brief.title), existingSlugs);

  // Build entries from structured outline
  const sections = brief.structured_outline || [];
  const entries = buildTOCFromSections(sections, existingSlugs);

  // Generate outputs
  const htmlOutput = generateHTML(entries);
  const markdownOutput = generateMarkdown(entries);
  const passageHints = generatePassageHints(entries);
  const totalHeadings = countHeadings(entries);
  const maxDepth = entries.length > 0 ? calculateMaxDepth(entries) : 0;

  return {
    entries,
    htmlOutput,
    markdownOutput,
    passageHints,
    totalHeadings,
    maxDepth,
  };
};

/**
 * Generate TOC from raw markdown content
 * Extracts headings using regex
 */
export const generateTOCFromMarkdown = (markdown: string): GeneratedTOC => {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const sections: BriefSection[] = [];
  let match;

  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    const heading = match[2].trim();

    sections.push({
      heading,
      level,
      key: `md-${sections.length}`,
    });
  }

  const existingSlugs = new Set<string>();
  const entries = buildTOCFromSections(sections, existingSlugs);

  const htmlOutput = generateHTML(entries);
  const markdownOutput = generateMarkdown(entries);
  const passageHints = generatePassageHints(entries);
  const totalHeadings = countHeadings(entries);
  const maxDepth = entries.length > 0 ? calculateMaxDepth(entries) : 0;

  return {
    entries,
    htmlOutput,
    markdownOutput,
    passageHints,
    totalHeadings,
    maxDepth,
  };
};

/**
 * Generate schema.org ItemList for TOC (for rich results)
 */
export const generateTOCSchema = (
  entries: TOCEntry[],
  baseUrl: string
): object => {
  const flattenEntries = (items: TOCEntry[]): TOCEntry[] => {
    const result: TOCEntry[] = [];
    for (const item of items) {
      result.push(item);
      if (item.children.length > 0) {
        result.push(...flattenEntries(item.children));
      }
    }
    return result;
  };

  const flatEntries = flattenEntries(entries);

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Table of Contents",
    "itemListElement": flatEntries.map((entry, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": entry.heading,
      "url": `${baseUrl}#${entry.slug}`,
    })),
  };
};

export default {
  generateSlug,
  generateTOCFromBrief,
  generateTOCFromMarkdown,
  generateTOCSchema,
};
