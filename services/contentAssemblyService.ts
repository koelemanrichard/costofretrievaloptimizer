/**
 * Content Assembly Service
 *
 * Canonical service for assembling and converting content.
 * This is the SINGLE SOURCE OF TRUTH for all content assembly operations.
 *
 * IMPORTANT: All components should use this service instead of implementing
 * their own markdown→HTML converters. This eliminates the duplicate
 * converters that existed in DraftingModal.tsx.
 *
 * Created: January 13, 2026
 */

// =============================================================================
// Types
// =============================================================================

export interface AssemblyOptions {
  /** Use semantic HTML sections (recommended for SEO) */
  semantic?: boolean;
  /** Map of image URLs to embedded base64 data */
  imageUrlMap?: Map<string, string>;
  /** URL of the hero/OG image (should not be lazy-loaded for LCP) */
  ogImageUrl?: string;
  /** Default image dimensions for CLS prevention */
  defaultImageWidth?: number;
  defaultImageHeight?: number;
}

export interface FullHtmlOptions extends AssemblyOptions {
  /** Article title */
  title: string;
  /** Meta description */
  metaDescription?: string;
  /** Target keyword */
  targetKeyword?: string;
  /** Language code (default: 'en') */
  language?: string;
  /** Author name */
  authorName?: string;
  /** Canonical URL */
  canonicalUrl?: string;
  /** Publish date (default: now) */
  publishDate?: Date;
  /** Word count (calculated if not provided) */
  wordCount?: number;
  /** JSON-LD schema script */
  schemaScript?: string;
  /** Open Graph tags */
  ogTags?: string;
  /** LCP preload tag */
  lcpPreload?: string;
  /** Centerpiece annotation (first paragraph summary) */
  centerpiece?: string;
}

// =============================================================================
// Basic Markdown to HTML Converter
// =============================================================================

/**
 * Convert markdown to basic HTML using regex replacements.
 * Use this for simple previews where semantic structure isn't needed.
 */
export function convertMarkdownToBasicHtml(md: string): string {
  let html = md
    // Headers
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold and italic
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Images with alt text - wrap in figure with figcaption
    .replace(/!\[([^\]]+)\]\(([^)]+)\)/g, (match, alt, src) => {
      if (alt && alt.length > 5) {
        return `<figure><img src="${src}" alt="${alt}" loading="lazy" /><figcaption>${alt}</figcaption></figure>`;
      }
      return `<img src="${src}" alt="${alt || ''}" loading="lazy" />`;
    })
    // Images without alt text
    .replace(/!\[\]\(([^)]+)\)/g, '<img src="$1" alt="" loading="lazy" />')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr />')
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // Unordered lists - use temporary marker
    .replace(/^- (.+)$/gm, '<uli>$1</uli>')
    // Ordered lists - use temporary marker
    .replace(/^\d+\. (.+)$/gm, '<oli>$1</oli>')
    // Paragraphs
    .split('\n')
    .map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('<')) return line;
      return `<p>${line}</p>`;
    })
    .join('\n');

  // Wrap consecutive unordered list items in <ul>
  html = html.replace(/(<uli>[\s\S]*?<\/uli>\n?)+/g, (match) => {
    const items = match.replace(/<\/?uli>/g, (tag) => tag === '<uli>' ? '<li>' : '</li>');
    return `<ul>\n${items}</ul>`;
  });

  // Wrap consecutive ordered list items in <ol>
  html = html.replace(/(<oli>[\s\S]*?<\/oli>\n?)+/g, (match) => {
    const items = match.replace(/<\/?oli>/g, (tag) => tag === '<oli>' ? '<li>' : '</li>');
    return `<ol>\n${items}</ol>`;
  });

  // Merge consecutive blockquotes
  html = html.replace(/(<blockquote>[^<]+<\/blockquote>\n?)+/g, (match) => {
    const content = match.replace(/<\/?blockquote>/g, '').trim().split('\n').join('<br/>');
    return `<blockquote>${content}</blockquote>`;
  });

  return html;
}

// =============================================================================
// Semantic Markdown to HTML Converter
// =============================================================================

/**
 * Convert markdown to semantic HTML with proper sections, tables, and lists.
 * This is the preferred converter for SEO-optimized output.
 *
 * Features:
 * - Wraps H2 sections in <section> tags
 * - Proper table handling with <thead>, <tbody>, scope="col"
 * - Proper list state tracking
 * - Image handling with lazy loading (except hero/LCP image)
 * - Support for embedded base64 images
 */
export function convertMarkdownToSemanticHtml(md: string, options: AssemblyOptions = {}): string {
  const {
    imageUrlMap = new Map(),
    ogImageUrl = '',
    defaultImageWidth = 800,
    defaultImageHeight = 450,
  } = options;

  const lines = md.split('\n');
  let html = '';
  let inSection = false;
  let inTable = false;
  let tableHeaders: string[] = [];
  let tableBody: string[][] = [];
  let currentListType: 'none' | 'ul' | 'ol' = 'none';

  // Helper to close current list if open
  const closeList = () => {
    if (currentListType !== 'none') {
      html += currentListType === 'ol' ? '</ol>\n' : '</ul>\n';
      currentListType = 'none';
    }
  };

  // Helper to convert inline markdown (bold, italic, code) in a string
  const processInlineMarkdown = (text: string): string => {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  };

  // Helper to flush table HTML
  const flushTable = () => {
    if (tableHeaders.length > 0 || tableBody.length > 0) {
      html += '<table>\n';
      if (tableHeaders.length > 0) {
        // Process inline markdown in table headers
        html += '<thead><tr>' + tableHeaders.map(h => `<th scope="col">${processInlineMarkdown(h)}</th>`).join('') + '</tr></thead>\n';
      }
      if (tableBody.length > 0) {
        // Process inline markdown in table cells
        html += '<tbody>' + tableBody.map(row => '<tr>' + row.map(c => `<td>${processInlineMarkdown(c)}</td>`).join('') + '</tr>').join('\n') + '</tbody>\n';
      }
      html += '</table>\n';
    }
    tableHeaders = [];
    tableBody = [];
    inTable = false;
  };

  // Helper to parse a markdown table row
  const parseTableRow = (line: string): string[] => {
    return line.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());
  };

  // Helper to check if line is a table separator
  const isTableSeparator = (line: string): boolean => {
    return /^\|?[\s:-]+\|[\s|:-]+\|?$/.test(line.trim());
  };

  // Helper to process image
  const processImage = (alt: string, src: string): string => {
    const embeddedSrc = imageUrlMap.get(src) || src;
    const isHero = src === ogImageUrl;
    const loadingAttr = isHero ? '' : ' loading="lazy"';
    const dimensionAttrs = ` width="${defaultImageWidth}" height="${defaultImageHeight}"`;

    if (alt && alt.length > 5) {
      return `<figure><img src="${embeddedSrc}" alt="${alt}"${dimensionAttrs}${loadingAttr}><figcaption>${alt}</figcaption></figure>`;
    }
    return `<img src="${embeddedSrc}" alt="${alt || ''}"${dimensionAttrs}${loadingAttr}>`;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const h2Match = line.match(/^## (.+)$/);
    const h3Match = line.match(/^### (.+)$/);
    const h4Match = line.match(/^#### (.+)$/);

    // Check if this is a table line
    const isTableLine = line.trim().startsWith('|') && line.includes('|');

    // Handle table parsing
    if (isTableLine) {
      if (!inTable) {
        inTable = true;
        tableHeaders = parseTableRow(line);
      } else if (isTableSeparator(line)) {
        continue;
      } else {
        tableBody.push(parseTableRow(line));
      }
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Close previous section if starting new H2
    if (h2Match) {
      closeList();
      if (inSection) {
        html += '</section>\n';
      }
      html += `<section>\n<h2>${h2Match[1]}</h2>\n`;
      inSection = true;
      continue;
    }

    // H3 within section
    if (h3Match) {
      closeList();
      html += `<h3>${h3Match[1]}</h3>\n`;
      continue;
    }

    // H4 within section
    if (h4Match) {
      closeList();
      html += `<h4>${h4Match[1]}</h4>\n`;
      continue;
    }

    // Process inline formatting
    let processedLine = line
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');

    // Process images
    processedLine = processedLine.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
      return processImage(alt, src);
    });

    // Process links
    processedLine = processedLine.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Horizontal rules
    if (processedLine.trim() === '---') {
      closeList();
      html += '<hr>\n';
      continue;
    }

    // Blockquotes
    if (processedLine.startsWith('> ')) {
      closeList();
      html += `<blockquote>${processedLine.substring(2)}</blockquote>\n`;
      continue;
    }

    // Unordered Lists
    const ulMatch = processedLine.match(/^- (.+)$/);
    if (ulMatch) {
      if (currentListType !== 'ul') {
        closeList();
        html += '<ul>\n';
        currentListType = 'ul';
      }
      html += `<li>${ulMatch[1]}</li>\n`;
      continue;
    }

    // Ordered Lists
    const olMatch = processedLine.match(/^\d+\. (.+)$/);
    if (olMatch) {
      if (currentListType !== 'ol') {
        closeList();
        html += '<ol>\n';
        currentListType = 'ol';
      }
      html += `<li>${olMatch[1]}</li>\n`;
      continue;
    }

    // Close list if we hit non-list content
    closeList();

    // Paragraphs
    const trimmed = processedLine.trim();
    if (trimmed && !trimmed.startsWith('<')) {
      html += `<p>${processedLine}</p>\n`;
    } else if (trimmed) {
      html += processedLine + '\n';
    }
  }

  // Flush any remaining table
  if (inTable) {
    flushTable();
  }

  // Close any remaining open list
  closeList();

  // Close final section
  if (inSection) {
    html += '</section>\n';
  }

  // Convert IMAGE placeholders to styled figure elements
  html = convertImagePlaceholders(html);

  return html;
}

// =============================================================================
// Main Convert Function
// =============================================================================

/**
 * Convert markdown to HTML using the specified mode.
 * This is the canonical conversion function that should be used everywhere.
 */
export function convertToHtml(markdown: string, options: AssemblyOptions = {}): string {
  if (options.semantic !== false) {
    return convertMarkdownToSemanticHtml(markdown, options);
  }
  return convertMarkdownToBasicHtml(markdown);
}

// =============================================================================
// Slug Generation
// =============================================================================

/**
 * Generate a URL-friendly slug from a title.
 * Handles special characters, accents, and multi-language text.
 */
export function generateSlug(title: string): string {
  if (!title) return 'article';
  return title
    .toLowerCase()
    // Replace accented characters with ASCII equivalents
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Replace special Dutch/German characters
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ä/g, 'a')
    .replace(/ë/g, 'e')
    .replace(/ï/g, 'i')
    .replace(/ß/g, 'ss')
    // Replace spaces and underscores with hyphens
    .replace(/[\s_]+/g, '-')
    // Remove any character that's not alphanumeric or hyphen
    .replace(/[^a-z0-9-]/g, '')
    // Remove multiple consecutive hyphens
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Limit length for URLs
    .substring(0, 80);
}

// =============================================================================
// Full HTML Document Builder
// =============================================================================

/**
 * Build a complete HTML document from markdown content.
 * Includes all SEO best practices: semantic tags, centerpiece, schema, etc.
 */
export function buildFullHtmlDocument(markdown: string, options: FullHtmlOptions): string {
  const {
    title,
    metaDescription = '',
    targetKeyword = '',
    language = 'en',
    authorName = '',
    publishDate = new Date(),
    schemaScript = '',
    ogTags = '',
    lcpPreload = '',
    centerpiece = '',
  } = options;

  // Generate canonical URL from title slug if not provided
  let canonicalUrl = options.canonicalUrl || '';
  if (!canonicalUrl || canonicalUrl.endsWith('/article/') || canonicalUrl.endsWith('/article')) {
    // Extract base domain from existing URL or use placeholder
    const baseDomain = canonicalUrl
      ? canonicalUrl.replace(/\/article\/?$/, '')
      : '';

    if (baseDomain) {
      const slug = generateSlug(title);
      canonicalUrl = `${baseDomain}/${slug}`;
    }
  }

  // Calculate word count
  const wordCount = options.wordCount ?? markdown.split(/\s+/).filter(Boolean).length;

  // Convert content to semantic HTML (includes IMAGE placeholder conversion)
  let contentHtml = convertMarkdownToSemanticHtml(markdown, options);

  // Check if we have IMAGE placeholders (to include placeholder styles)
  const hasImagePlaceholders = contentHtml.includes('class="image-placeholder"');

  // Detect and remove duplicate centerpiece from content
  // The centerpiece is rendered separately, so if the first paragraph duplicates it, remove it
  if (centerpiece && centerpiece.length > 20) {
    // Normalize text for comparison (remove markdown/html, lowercase, trim)
    const normalizeText = (text: string) => text
      .replace(/<[^>]+>/g, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

    const normalizedCenterpiece = normalizeText(centerpiece);

    // Find first paragraph in content
    const firstParagraphMatch = contentHtml.match(/<p>([^<]+)<\/p>/);
    if (firstParagraphMatch) {
      const firstParaText = normalizeText(firstParagraphMatch[1]);
      // If first paragraph starts with (or is very similar to) the centerpiece, remove it
      if (firstParaText.startsWith(normalizedCenterpiece.slice(0, 50)) ||
          normalizedCenterpiece.startsWith(firstParaText.slice(0, 50))) {
        // Remove the duplicate first paragraph
        contentHtml = contentHtml.replace(firstParagraphMatch[0], '');
      }
    }
  }

  // Build the full document
  return `<!DOCTYPE html>
<html lang="${language}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${metaDescription ? `<meta name="description" content="${metaDescription.replace(/"/g, '&quot;')}">` : '<!-- Add meta description when publishing -->'}
${targetKeyword ? `<meta name="keywords" content="${targetKeyword}">` : ''}
<meta name="robots" content="index, follow">
${authorName ? `<meta name="author" content="${authorName.replace(/"/g, '&quot;')}">` : ''}
<title>${title}</title>
${canonicalUrl ? `<link rel="canonical" href="${canonicalUrl}">` : '<!-- Add canonical URL when publishing -->'}
${lcpPreload}
${ogTags}
${schemaScript}
<style>*{box-sizing:border-box}body{font-family:Georgia,'Times New Roman',serif;line-height:1.8;max-width:750px;margin:0 auto;padding:2rem;color:#2d2d2d;background:#fafafa}main{display:block}article{display:block}section{margin-bottom:2rem}h1{font-size:2.2rem;color:#1a1a1a;margin-top:0;margin-bottom:0.5rem;line-height:1.2}h2{font-size:1.5rem;color:#1a1a1a;margin-top:2.5rem;border-bottom:2px solid #e0e0e0;padding-bottom:0.5rem}h3{font-size:1.25rem;color:#333;margin-top:2rem}h4{font-size:1.1rem;color:#444;margin-top:1.5rem}p{margin:1rem 0}img{max-width:100%;height:auto;border-radius:8px;margin:1.5rem 0;box-shadow:0 4px 12px rgba(0,0,0,0.1)}figure{margin:2rem 0;text-align:center}figcaption{font-size:0.9rem;color:#666;font-style:italic;margin-top:0.5rem}table{border-collapse:collapse;width:100%;margin:1.5rem 0;font-size:0.95rem}th,td{border:1px solid #ddd;padding:0.75rem;text-align:left}th{background:#f0f0f0;font-weight:600}tr:nth-child(even){background:#f9f9f9}code{background:#f0f0f0;padding:0.2em 0.4em;border-radius:3px;font-size:0.9em;font-family:'Consolas',monospace}pre{background:#f5f5f5;padding:1rem;border-radius:8px;overflow-x:auto}blockquote{border-left:4px solid #0066cc;margin:1.5rem 0;padding:0.5rem 1rem;background:#f9f9f9;font-style:italic}a{color:#0066cc;text-decoration:none}a:hover{text-decoration:underline}ul,ol{padding-left:1.5rem;margin:1rem 0}li{margin:0.5rem 0}.byline{color:#666;font-size:0.9rem;margin-bottom:1.5rem;padding-bottom:1rem;border-bottom:1px solid #e0e0e0}hr{border:none;border-top:1px solid #e0e0e0;margin:2rem 0}${hasImagePlaceholders ? '.image-placeholder{border:2px dashed #ccc;border-radius:8px;background:linear-gradient(135deg,#f5f5f5 0%,#fafafa 100%);padding:2rem;margin:1.5rem 0;text-align:center}.image-placeholder .placeholder-content{display:flex;flex-direction:column;align-items:center;gap:0.5rem;color:#999}.image-placeholder .placeholder-label{font-size:0.9rem;font-weight:500;color:#666}.image-placeholder figcaption{margin-top:1rem;font-size:0.85rem;color:#666;font-style:italic}' : ''}</style>
</head>
<body>
<main>
<article>
<header>
<h1>${title}</h1>
<p class="byline">${authorName ? `By <strong>${authorName}</strong> · ` : ''}<time datetime="${publishDate.toISOString()}">${publishDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time> · ${wordCount.toLocaleString()} words</p>
</header>
${centerpiece ? `<p><strong>${centerpiece}</strong></p>` : ''}
${contentHtml}
</article>
</main>
</body>
</html>`;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Extract centerpiece (first paragraph summary) from markdown content.
 * The centerpiece should be in the first 400 characters for SEO.
 */
export function extractCenterpiece(markdown: string, maxLength: number = 400): string {
  // Skip the H1 title if present
  const lines = markdown.split('\n');
  let startIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('#')) {
      startIndex = i + 1;
      continue;
    }
    if (line && !line.startsWith('!') && !line.startsWith('-') && !line.match(/^\d+\./)) {
      // Found first paragraph content
      break;
    }
    startIndex = i + 1;
  }

  // Get the first non-empty paragraph
  const remainingLines = lines.slice(startIndex);
  let centerpiece = '';

  for (const line of remainingLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#') || trimmed.startsWith('!') || trimmed.startsWith('-') || trimmed.match(/^\d+\./)) {
      break;
    }
    // Strip markdown formatting
    const cleaned = trimmed
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/`([^`]+)`/g, '$1');
    centerpiece += (centerpiece ? ' ' : '') + cleaned;
    if (centerpiece.length >= maxLength) break;
  }

  // Truncate at sentence boundary if too long
  if (centerpiece.length > maxLength) {
    const truncated = centerpiece.substring(0, maxLength);
    const lastSentence = truncated.lastIndexOf('.');
    if (lastSentence > maxLength * 0.5) {
      return truncated.substring(0, lastSentence + 1);
    }
    return truncated.trim() + '...';
  }

  return centerpiece;
}

/**
 * Strip ALL H1 headers from markdown content.
 * This ensures no duplicate H1s in the body when title is rendered separately.
 * Catches H1s anywhere in the document, not just at the start.
 */
export function stripH1FromMarkdown(markdown: string): string {
  // Remove ALL lines that are H1 headers (# followed by space, not ##)
  return markdown.replace(/^# [^#\n].*$/gm, '').replace(/\n{3,}/g, '\n\n');
}

/**
 * Calculate word count from markdown
 */
export function calculateWordCount(markdown: string): number {
  // Remove markdown syntax and count words
  const plainText = markdown
    .replace(/^#+\s+/gm, '') // Headers
    .replace(/\*\*(.+?)\*\*/g, '$1') // Bold
    .replace(/\*(.+?)\*/g, '$1') // Italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // Images
    .replace(/`([^`]+)`/g, '$1') // Inline code
    .replace(/```[\s\S]*?```/g, '') // Code blocks
    .replace(/^\s*[-*]\s+/gm, '') // List markers
    .replace(/^\s*\d+\.\s+/gm, '') // Ordered list markers
    .replace(/^\|.*\|$/gm, '') // Table rows
    .replace(/^---$/gm, ''); // HR

  return plainText.split(/\s+/).filter(Boolean).length;
}

// =============================================================================
// IMAGE Placeholder Processing
// =============================================================================

/**
 * Convert [IMAGE:...] placeholders to styled HTML figure elements.
 * This makes placeholders visible as proper image slots in the final HTML
 * rather than raw text that looks broken.
 *
 * Format: [IMAGE: Description text | alt="Alt text"]
 * Output: <figure class="image-placeholder">...</figure>
 */
export function convertImagePlaceholders(html: string): string {
  // Pattern matches [IMAGE: description | alt="text"] or [IMAGE: description]
  const placeholderPattern = /\[IMAGE:\s*([^\]|]+?)(?:\s*\|\s*alt="([^"]*)")?\]/g;

  return html.replace(placeholderPattern, (match, description, altText) => {
    const desc = description?.trim() || 'Image placeholder';
    const alt = altText?.trim() || desc;

    return `<figure class="image-placeholder" data-alt="${alt.replace(/"/g, '&quot;')}">
  <div class="placeholder-content">
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
    <span class="placeholder-label">Add Image</span>
  </div>
  <figcaption>${desc}</figcaption>
</figure>`;
  });
}

/**
 * CSS styles for image placeholders (to be injected into document)
 */
export const imagePlaceholderStyles = `
.image-placeholder {
  border: 2px dashed #ccc;
  border-radius: 8px;
  background: linear-gradient(135deg, #f5f5f5 0%, #fafafa 100%);
  padding: 2rem;
  margin: 1.5rem 0;
  text-align: center;
}
.image-placeholder .placeholder-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: #999;
}
.image-placeholder .placeholder-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: #666;
}
.image-placeholder figcaption {
  margin-top: 1rem;
  font-size: 0.85rem;
  color: #666;
  font-style: italic;
}
`;

// =============================================================================
// Content Validation for Export
// =============================================================================

export interface ExportValidationResult {
  valid: boolean;
  issues: string[];
  blockers: string[];  // Critical issues that should block export
  warnings: string[];  // Non-critical issues to warn about
}

/**
 * Validate content before export to HTML.
 * Checks for issues that would result in poor quality output.
 */
export function validateForExport(markdown: string): ExportValidationResult {
  const blockers: string[] = [];
  const warnings: string[] = [];

  // Check for unresolved IMAGE placeholders (warning, not blocker - users can add images in CMS)
  const imagePlaceholders = markdown.match(/\[IMAGE:[^\]]+\]/g);
  if (imagePlaceholders && imagePlaceholders.length > 0) {
    warnings.push(`${imagePlaceholders.length} unresolved [IMAGE:...] placeholder(s) - add images before publishing`);
  }

  // Check for other placeholders
  const todoPlaceholders = markdown.match(/\[TODO:[^\]]+\]/g);
  if (todoPlaceholders && todoPlaceholders.length > 0) {
    blockers.push(`${todoPlaceholders.length} unresolved [TODO:...] placeholder(s) found`);
  }

  const insertPlaceholders = markdown.match(/\[INSERT:[^\]]+\]/g);
  if (insertPlaceholders && insertPlaceholders.length > 0) {
    blockers.push(`${insertPlaceholders.length} unresolved [INSERT:...] placeholder(s) found`);
  }

  const mustachePlaceholders = markdown.match(/\{\{[^}]+\}\}/g);
  if (mustachePlaceholders && mustachePlaceholders.length > 0) {
    blockers.push(`${mustachePlaceholders.length} unresolved {{...}} placeholder(s) found`);
  }

  // Check for raw markdown H1 in body (after first line) - indicates formatting issues
  const lines = markdown.split('\n');
  const h1InBody = lines.slice(1).filter(line => /^#\s+[^#]/.test(line.trim()));
  if (h1InBody.length > 0) {
    warnings.push(`${h1InBody.length} H1 heading(s) found in body (should only be one at start)`);
  }

  // Check for duplicate headings
  const headings = markdown.match(/^#{2,4}\s+.+$/gm) || [];
  const headingCounts = new Map<string, number>();
  for (const h of headings) {
    const normalized = h.toLowerCase().trim();
    headingCounts.set(normalized, (headingCounts.get(normalized) || 0) + 1);
  }
  const duplicateHeadings = [...headingCounts.entries()].filter(([, count]) => count > 1);
  if (duplicateHeadings.length > 0) {
    warnings.push(`${duplicateHeadings.length} duplicate heading(s) detected`);
  }

  // Check for very short content (likely incomplete generation)
  const wordCount = calculateWordCount(markdown);
  if (wordCount < 300) {
    warnings.push(`Content is only ${wordCount} words (expected 500+ for quality article)`);
  }

  return {
    valid: blockers.length === 0,
    issues: [...blockers, ...warnings],
    blockers,
    warnings,
  };
}

/**
 * Clean content for export - removes/fixes common issues.
 */
export function cleanForExport(markdown: string): string {
  let cleaned = markdown;

  // CRITICAL: Remove ALL H1 headers - the HTML template adds its own H1
  // This prevents raw "# Title" from appearing in the body
  cleaned = stripH1FromMarkdown(cleaned);

  // Clean up excessive blank lines (more than 2 consecutive)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // Ensure content ends with single newline
  cleaned = cleaned.trimEnd() + '\n';

  return cleaned;
}

// =============================================================================
// Related Topics Section Generation
// =============================================================================

export interface RelatedTopicLink {
  title: string;
  slug?: string;
  reasoning?: string;
  anchorText?: string;
  annotation_text_hint?: string;
}

export interface AppendRelatedTopicsOptions {
  /** Article title for context */
  articleTitle: string;
  /** Central entity from topical map for semantic context */
  centralEntity?: string;
  /** Language code for i18n headers */
  language?: string;
  /** Related topics to link to */
  topics: RelatedTopicLink[];
}

/**
 * Generates a semantically correct "Related Topics" section with proper Contextual Bridges.
 *
 * Per Semantic SEO framework requirements:
 * - Links must have annotation text explaining relevance
 * - A Contextual Bridge must justify the transition
 * - Surrounding text must semantically support the link
 * - Target entity must be mentioned near the anchor
 */
export function generateRelatedTopicsMarkdown(options: AppendRelatedTopicsOptions): string {
  const { articleTitle, centralEntity, language = 'en', topics } = options;

  if (!topics || topics.length === 0) return '';

  // Limit to 5 links
  const topLinks = topics.slice(0, 5);

  // Language-aware section headers and bridge text
  // Per Semantic SEO: heading should follow "Why [Micro] Matters for [Macro]" or "Continue Exploring [Entity]"
  const i18n: Record<string, { headerPrefix: string; bridge: string; learnMore: string }> = {
    'nl': {
      headerPrefix: 'Ontdek Meer over',
      bridge: 'Deze onderwerpen bouwen voort op de concepten die in dit artikel worden besproken en bieden aanvullende inzichten:',
      learnMore: 'Lees meer over'
    },
    'de': {
      headerPrefix: 'Entdecken Sie Mehr über',
      bridge: 'Diese Themen bauen auf den in diesem Artikel besprochenen Konzepten auf und bieten zusätzliche Einblicke:',
      learnMore: 'Erfahren Sie mehr über'
    },
    'fr': {
      headerPrefix: 'Découvrez Plus sur',
      bridge: 'Ces sujets complètent les concepts abordés dans cet article et offrent des perspectives supplémentaires:',
      learnMore: 'En savoir plus sur'
    },
    'es': {
      headerPrefix: 'Descubra Más sobre',
      bridge: 'Estos temas complementan los conceptos discutidos en este artículo y ofrecen perspectivas adicionales:',
      learnMore: 'Más información sobre'
    },
    'it': {
      headerPrefix: 'Scopri di Più su',
      bridge: 'Questi argomenti completano i concetti discussi in questo articolo e offrono approfondimenti aggiuntivi:',
      learnMore: 'Per saperne di più su'
    },
    'pt': {
      headerPrefix: 'Descubra Mais sobre',
      bridge: 'Estes tópicos complementam os conceitos discutidos neste artigo e oferecem perspectivas adicionais:',
      learnMore: 'Saiba mais sobre'
    },
    'en': {
      headerPrefix: 'Continue Exploring',
      bridge: 'These topics build on the concepts discussed in this article and provide additional context:',
      learnMore: 'Read more about'
    }
  };

  const lang = i18n[language] || i18n['en'];
  const entity = centralEntity || articleTitle;

  // Build Contextual Bridge section per Semantic SEO requirements
  // Header follows pattern: "[Prefix] [Central Entity]" to tie back to macro context
  let section = `\n\n## ${lang.headerPrefix} ${entity}\n\n`;
  section += `${lang.bridge}\n\n`;

  for (const topic of topLinks) {
    const slug = topic.slug || generateSlug(topic.title);
    const url = `/topics/${slug}`;
    const anchorText = topic.anchorText || topic.title;

    const hasReasoning = topic.reasoning &&
                         !topic.reasoning.startsWith('Related') &&
                         topic.reasoning.length > 10;
    const annotationHint = topic.annotation_text_hint || '';

    if (hasReasoning || annotationHint) {
      // Use the provided reasoning/annotation as contextual bridge
      const context = annotationHint || topic.reasoning;
      section += `- **${topic.title}**: ${context} [${lang.learnMore} ${anchorText}](${url}).\n`;
    } else {
      // No annotation available - use clean link format without boilerplate
      // The bridge paragraph provides context; fake annotation text hurts SEO
      section += `- [${topic.title}](${url})\n`;
    }
  }

  return section;
}

/**
 * Appends a Related Topics section to existing markdown content if not already present.
 * Returns the updated markdown.
 */
export function appendRelatedTopicsToContent(
  markdown: string,
  options: AppendRelatedTopicsOptions
): string {
  // Check if content already has a Related Topics section
  const hasRelatedSection = /##\s*(Expand Your Understanding|Continue Exploring|Related Topics|Ontdek Meer over|Entdecken Sie Mehr|Découvrez Plus|Descubra Más|Scopri di Più|Verdiep Je Kennis|Verwandte Themen|Approfondissez|Profundice|Approfondisci|Aprofunde)/i.test(markdown);

  if (hasRelatedSection) {
    console.log('[appendRelatedTopicsToContent] Content already has Related Topics section, skipping');
    return markdown;
  }

  const relatedSection = generateRelatedTopicsMarkdown(options);
  if (!relatedSection) {
    return markdown;
  }

  return markdown.trimEnd() + relatedSection;
}

// =============================================================================
// Export Default
// =============================================================================

export default {
  convertToHtml,
  convertMarkdownToBasicHtml,
  convertMarkdownToSemanticHtml,
  buildFullHtmlDocument,
  extractCenterpiece,
  stripH1FromMarkdown,
  calculateWordCount,
  validateForExport,
  cleanForExport,
  generateRelatedTopicsMarkdown,
  appendRelatedTopicsToContent,
};
