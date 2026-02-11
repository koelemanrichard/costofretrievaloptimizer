/**
 * Content Adapter
 *
 * Converts ContentBrief and HTML into ArticleContent format for the unified renderer.
 *
 * @module services/publishing/renderer/contentAdapter
 */

import type { ContentBrief, BriefSection } from '../../../types';
import type { ArticleContent } from './index';

// ============================================================================
// BRIEF TO ARTICLE CONTENT
// ============================================================================

/**
 * Convert a ContentBrief to ArticleContent format.
 *
 * @param brief - The content brief to convert
 * @returns ArticleContent ready for rendering
 */
export function briefToArticleContent(brief: ContentBrief): ArticleContent {
  const sections: ArticleContent['sections'] = [];

  // Map structured_outline sections if available
  if (brief.structured_outline && Array.isArray(brief.structured_outline)) {
    brief.structured_outline.forEach((section, index) => {
      sections.push(...flattenBriefSection(section, index));
    });
  }

  return {
    title: brief.title,
    sections,
  };
}

/**
 * Flatten a BriefSection (and its subsections) into ArticleContent sections.
 *
 * @param section - The brief section to flatten
 * @param index - The section index for ID generation
 * @param parentIndex - Optional parent index for nested sections
 * @returns Array of flattened sections
 */
function flattenBriefSection(
  section: BriefSection,
  index: number,
  parentIndex?: number
): ArticleContent['sections'] {
  const sections: ArticleContent['sections'] = [];
  const sectionId = section.key ||
    (parentIndex !== undefined ? `section-${parentIndex}-${index}` : `section-${index}`);

  // Get heading from either field
  const heading = section.heading || section.section_heading || '';

  // Get heading level from either field, default to 2
  const headingLevel = section.level || section.heading_level || 2;

  // Build content from available fields
  const contentParts: string[] = [];

  if (section.content_brief) {
    contentParts.push(section.content_brief);
  }

  if (section.key_points && section.key_points.length > 0) {
    contentParts.push(section.key_points.join('\n'));
  }

  if (section.subordinate_text_hint) {
    contentParts.push(section.subordinate_text_hint);
  }

  if (section.methodology_note) {
    contentParts.push(`[${section.methodology_note}]`);
  }

  const content = contentParts.join('\n\n');
  const type = inferSectionType(section);

  sections.push({
    id: sectionId,
    heading,
    headingLevel,
    content,
    type,
  });

  // Process subsections recursively
  if (section.subsections && Array.isArray(section.subsections)) {
    section.subsections.forEach((subsection, subIndex) => {
      sections.push(...flattenBriefSection(subsection, subIndex, index));
    });
  }

  return sections;
}

// ============================================================================
// HTML TO ARTICLE CONTENT
// ============================================================================

/**
 * Convert HTML content to ArticleContent format by parsing headings.
 *
 * @param html - The HTML string to parse
 * @param title - The article title
 * @returns ArticleContent ready for rendering
 */
export function htmlToArticleContent(html: string, title: string): ArticleContent {
  const sections: ArticleContent['sections'] = [];

  // Detect content format: HTML vs Markdown
  const hasHtmlHeadings = /<h[2-6][^>]*>/i.test(html);
  const hasMarkdownHeadings = /^#{2,6}\s+/m.test(html);

  // If content is in Markdown format, use markdown parser
  if (hasMarkdownHeadings && !hasHtmlHeadings) {
    console.log('[htmlToArticleContent] Using MARKDOWN parser');
    return markdownToArticleContent(html, title);
  }

  console.log('[htmlToArticleContent] Using HTML parser');

  // Regex to match heading tags (h2-h6) with their content
  const headingRegex = /<h([2-6])([^>]*)>([\s\S]*?)<\/h\1>/gi;

  let lastIndex = 0;
  let sectionIndex = 0;
  let match: RegExpExecArray | null;

  // Find content before the first heading (intro section)
  const firstHeadingMatch = headingRegex.exec(html);
  if (firstHeadingMatch && firstHeadingMatch.index > 0) {
    const introContent = html.substring(0, firstHeadingMatch.index).trim();
    if (introContent) {
      sections.push({
        id: 'section-intro',
        content: introContent,
        type: 'intro',
      });
    }
    lastIndex = firstHeadingMatch.index;
  }

  // Reset regex
  headingRegex.lastIndex = 0;

  // Collect all heading positions
  const headings: Array<{
    level: number;
    text: string;
    index: number;
    endIndex: number;
  }> = [];

  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1], 10);
    const headingHtml = match[3];
    // Strip inner HTML tags from heading text
    const headingText = stripHtmlTags(headingHtml).trim();

    headings.push({
      level,
      text: headingText,
      index: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  // Create sections from headings
  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    const nextHeading = headings[i + 1];

    // Content starts after the heading tag and ends at the next heading (or end of html)
    const contentStart = heading.endIndex;
    const contentEnd = nextHeading ? nextHeading.index : html.length;
    const content = html.substring(contentStart, contentEnd).trim();

    const sectionId = `section-${sectionIndex++}`;
    const type = inferSectionTypeFromHeading(heading.text);

    sections.push({
      id: sectionId,
      heading: heading.text,
      headingLevel: heading.level,
      content,
      type,
    });
  }

  // If no h2-h6 headings found, try including h1 headings as section markers
  if (headings.length === 0 && html.trim()) {
    console.log('[htmlToArticleContent] No h2-h6 headings found, trying h1 headings as section markers');
    const h1Regex = /<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/gi;
    let h1Match: RegExpExecArray | null;
    while ((h1Match = h1Regex.exec(html)) !== null) {
      const level = parseInt(h1Match[1], 10);
      const headingText = stripHtmlTags(h1Match[3]).trim();
      headings.push({
        level: level === 1 ? 2 : level, // Demote h1 to h2 for sections (article title is the real h1)
        text: headingText,
        index: h1Match.index,
        endIndex: h1Match.index + h1Match[0].length,
      });
    }

    // Re-process sections from these headings
    if (headings.length > 0) {
      console.log(`[htmlToArticleContent] Found ${headings.length} headings including h1, re-parsing sections`);
      for (let i = 0; i < headings.length; i++) {
        const heading = headings[i];
        const nextHeading = headings[i + 1];
        const contentStart = heading.endIndex;
        const contentEnd = nextHeading ? nextHeading.index : html.length;
        const content = html.substring(contentStart, contentEnd).trim();
        sections.push({
          id: `section-${sectionIndex++}`,
          heading: heading.text,
          headingLevel: heading.level,
          content,
          type: inferSectionTypeFromHeading(heading.text),
        });
      }
    }
  }

  // Final fallback: still no headings
  if (sections.length === 0 && html.trim()) {
    console.warn('[htmlToArticleContent] NO HEADINGS FOUND AT ALL - treating entire content as single section');
    sections.push({
      id: 'section-0',
      content: html.trim(),
      type: 'section',
    });
  }

  return {
    title,
    sections,
  };
}

/**
 * Strip HTML tags from a string.
 *
 * @param html - HTML string to strip
 * @returns Plain text without HTML tags
 */
function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

// ============================================================================
// MARKDOWN TO ARTICLE CONTENT
// ============================================================================

/**
 * Convert Markdown content to ArticleContent format by parsing markdown headings (## and ###).
 *
 * @param markdown - The markdown string to parse
 * @param title - The article title
 * @returns ArticleContent ready for rendering
 */
function markdownToArticleContent(markdown: string, title: string): ArticleContent {
  const sections: ArticleContent['sections'] = [];

  // Regex to match markdown headings (## to ######)
  const headingRegex = /^(#{2,6})\s+(.+)$/gm;

  // Collect all heading positions
  const headings: Array<{
    level: number;
    text: string;
    index: number;
    endIndex: number;
  }> = [];

  let match: RegExpExecArray | null;
  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length; // Number of # characters
    const headingText = match[2].trim();

    headings.push({
      level,
      text: headingText,
      index: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  console.log('[markdownToArticleContent] Found', headings.length, 'markdown headings');

  // Find content before the first heading (intro section)
  if (headings.length > 0 && headings[0].index > 0) {
    const introContent = markdown.substring(0, headings[0].index).trim();
    if (introContent) {
      sections.push({
        id: 'section-intro',
        content: introContent,
        type: 'intro',
      });
    }
  }

  // Create sections from headings
  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    const nextHeading = headings[i + 1];

    // Content starts after the heading line and ends at the next heading (or end of markdown)
    const contentStart = heading.endIndex;
    const contentEnd = nextHeading ? nextHeading.index : markdown.length;
    const content = markdown.substring(contentStart, contentEnd).trim();

    const sectionId = `section-${i}`;
    const type = inferSectionTypeFromHeading(heading.text);

    sections.push({
      id: sectionId,
      heading: heading.text,
      headingLevel: heading.level,
      content,
      type,
    });
  }

  // If no ##+ headings found, try including # headings as section markers
  if (headings.length === 0 && markdown.trim()) {
    console.log('[markdownToArticleContent] No ##+ headings found, trying # headings');
    const h1MdRegex = /^(#{1,6})\s+(.+)$/gm;
    let h1Match: RegExpExecArray | null;
    while ((h1Match = h1MdRegex.exec(markdown)) !== null) {
      const level = Math.max(2, h1Match[1].length); // Demote # to ## level
      headings.push({
        level,
        text: h1Match[2].trim(),
        index: h1Match.index,
        endIndex: h1Match.index + h1Match[0].length,
      });
    }
    // Re-process with these headings
    if (headings.length > 0) {
      for (let i = 0; i < headings.length; i++) {
        const heading = headings[i];
        const nextHeading = headings[i + 1];
        const contentStart = heading.endIndex;
        const contentEnd = nextHeading ? nextHeading.index : markdown.length;
        const content = markdown.substring(contentStart, contentEnd).trim();
        sections.push({
          id: `section-${i}`,
          heading: heading.text,
          headingLevel: heading.level,
          content,
          type: inferSectionTypeFromHeading(heading.text),
        });
      }
    }
  }

  // Final fallback: still no headings
  if (sections.length === 0 && markdown.trim()) {
    console.warn('[markdownToArticleContent] NO HEADINGS FOUND AT ALL');
    sections.push({ id: 'section-0', content: markdown.trim(), type: 'section' });
  }

  return {
    title,
    sections,
  };
}

// ============================================================================
// SECTION TYPE INFERENCE
// ============================================================================

/**
 * Extended section type for type inference with optional is_faq field
 */
interface SectionWithFaq extends BriefSection {
  is_faq?: boolean;
}

/**
 * Infer the section type from a BriefSection.
 *
 * @param section - The section to analyze
 * @returns Inferred section type string
 */
export function inferSectionType(section: SectionWithFaq): string {
  // Check is_faq flag first
  if (section.is_faq) {
    return 'faq';
  }

  // Check content_type if exists
  if (section.content_type) {
    const contentType = section.content_type.toLowerCase();
    if (contentType === 'faq' || contentType === 'question') {
      return 'faq';
    }
    if (contentType === 'cta' || contentType === 'contact') {
      return 'cta';
    }
    if (contentType === 'features' || contentType === 'benefits') {
      return 'features';
    }
    // Return content_type directly if it's a known type
    if (['intro', 'section', 'conclusion', 'hero', 'testimonial'].includes(contentType)) {
      return contentType;
    }
  }

  // Infer from heading text
  const heading = (section.heading || section.section_heading || '').toLowerCase();
  return inferSectionTypeFromHeading(heading);
}

/**
 * Infer section type from heading text.
 *
 * @param heading - The heading text to analyze
 * @returns Inferred section type string
 */
function inferSectionTypeFromHeading(heading: string): string {
  const headingLower = heading.toLowerCase();

  // FAQ patterns
  if (
    headingLower.includes('faq') ||
    headingLower.includes('frequently asked') ||
    headingLower.includes('question') ||
    headingLower.includes('q&a') ||
    headingLower.includes('vragen') // Dutch: questions
  ) {
    return 'faq';
  }

  // CTA/Contact patterns
  if (
    headingLower.includes('contact') ||
    headingLower.includes('get in touch') ||
    headingLower.includes('reach out') ||
    headingLower.includes('call to action') ||
    headingLower.includes('sign up') ||
    headingLower.includes('get started') ||
    headingLower.includes('neem contact') // Dutch: contact
  ) {
    return 'cta';
  }

  // Features/Benefits patterns
  if (
    headingLower.includes('feature') ||
    headingLower.includes('benefit') ||
    headingLower.includes('advantage') ||
    headingLower.includes('why choose') ||
    headingLower.includes('what you get') ||
    headingLower.includes('voordelen') // Dutch: benefits
  ) {
    return 'features';
  }

  // Introduction patterns
  if (
    headingLower.includes('introduction') ||
    headingLower.includes('overview') ||
    headingLower.includes('inleiding') // Dutch: introduction
  ) {
    return 'intro';
  }

  // Conclusion patterns
  if (
    headingLower.includes('conclusion') ||
    headingLower.includes('summary') ||
    headingLower.includes('final thoughts') ||
    headingLower.includes('conclusie') // Dutch: conclusion
  ) {
    return 'conclusion';
  }

  // Default
  return 'section';
}

// ============================================================================
// SEO HEADING STRUCTURE VALIDATION
// ============================================================================

export interface HeadingValidationResult {
  isValid: boolean;
  hasH1: boolean;
  h1Count: number;
  hierarchy: Array<{ level: number; text: string }>;
  issues: string[];
}

export function validateHeadingStructure(html: string): HeadingValidationResult {
  const issues: string[] = [];
  const hierarchy: Array<{ level: number; text: string }> = [];

  const h1Regex = /<h1[^>]*>([\s\S]*?)<\/h1>/gi;
  const h1Count = [...html.matchAll(h1Regex)].length;
  if (h1Count === 0) issues.push('Missing H1 tag');
  else if (h1Count > 1) issues.push(`Multiple H1 tags (${h1Count}) — only 1 per page`);

  const allHeadingsRegex = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match: RegExpExecArray | null;
  let lastLevel = 0;
  while ((match = allHeadingsRegex.exec(html)) !== null) {
    const level = parseInt(match[1], 10);
    const text = match[2].replace(/<[^>]*>/g, '').trim();
    hierarchy.push({ level, text });
    if (lastLevel > 0 && level > lastLevel + 1) {
      issues.push(`Heading skip: h${lastLevel} → h${level} near "${text.substring(0, 50)}"`);
    }
    lastLevel = level;
  }

  return { isValid: issues.length === 0, hasH1: h1Count >= 1, h1Count, hierarchy, issues };
}
