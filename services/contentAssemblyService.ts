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

  // Helper to flush table HTML
  const flushTable = () => {
    if (tableHeaders.length > 0 || tableBody.length > 0) {
      html += '<table>\n';
      if (tableHeaders.length > 0) {
        html += '<thead><tr>' + tableHeaders.map(h => `<th scope="col">${h}</th>`).join('') + '</tr></thead>\n';
      }
      if (tableBody.length > 0) {
        html += '<tbody>' + tableBody.map(row => '<tr>' + row.map(c => `<td>${c}</td>`).join('') + '</tr>').join('\n') + '</tbody>\n';
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
    canonicalUrl = '',
    publishDate = new Date(),
    schemaScript = '',
    ogTags = '',
    lcpPreload = '',
    centerpiece = '',
  } = options;

  // Calculate word count
  const wordCount = options.wordCount ?? markdown.split(/\s+/).filter(Boolean).length;

  // Convert content to semantic HTML
  const contentHtml = convertMarkdownToSemanticHtml(markdown, options);

  // Build the full document
  return `<!DOCTYPE html>
<html lang="${language}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="${metaDescription.replace(/"/g, '&quot;')}">
${targetKeyword ? `<meta name="keywords" content="${targetKeyword}">` : ''}
<meta name="robots" content="index, follow">
${authorName ? `<meta name="author" content="${authorName.replace(/"/g, '&quot;')}">` : ''}
<title>${title}</title>
${canonicalUrl ? `<link rel="canonical" href="${canonicalUrl}">` : '<!-- Add canonical URL when publishing -->'}
${lcpPreload}
${ogTags}
${schemaScript}
<style>*{box-sizing:border-box}body{font-family:Georgia,'Times New Roman',serif;line-height:1.8;max-width:750px;margin:0 auto;padding:2rem;color:#2d2d2d;background:#fafafa}main{display:block}article{display:block}section{margin-bottom:2rem}h1{font-size:2.2rem;color:#1a1a1a;margin-top:0;margin-bottom:0.5rem;line-height:1.2}h2{font-size:1.5rem;color:#1a1a1a;margin-top:2.5rem;border-bottom:2px solid #e0e0e0;padding-bottom:0.5rem}h3{font-size:1.25rem;color:#333;margin-top:2rem}h4{font-size:1.1rem;color:#444;margin-top:1.5rem}p{margin:1rem 0}img{max-width:100%;height:auto;border-radius:8px;margin:1.5rem 0;box-shadow:0 4px 12px rgba(0,0,0,0.1)}figure{margin:2rem 0;text-align:center}figcaption{font-size:0.9rem;color:#666;font-style:italic;margin-top:0.5rem}table{border-collapse:collapse;width:100%;margin:1.5rem 0;font-size:0.95rem}th,td{border:1px solid #ddd;padding:0.75rem;text-align:left}th{background:#f0f0f0;font-weight:600}tr:nth-child(even){background:#f9f9f9}code{background:#f0f0f0;padding:0.2em 0.4em;border-radius:3px;font-size:0.9em;font-family:'Consolas',monospace}pre{background:#f5f5f5;padding:1rem;border-radius:8px;overflow-x:auto}blockquote{border-left:4px solid #0066cc;margin:1.5rem 0;padding:0.5rem 1rem;background:#f9f9f9;font-style:italic}a{color:#0066cc;text-decoration:none}a:hover{text-decoration:underline}ul,ol{padding-left:1.5rem;margin:1rem 0}li{margin:0.5rem 0}.byline{color:#666;font-size:0.9rem;margin-bottom:1.5rem;padding-bottom:1rem;border-bottom:1px solid #e0e0e0}hr{border:none;border-top:1px solid #e0e0e0;margin:2rem 0}</style>
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
 * Strip H1 from markdown content (for preview that shows title separately)
 */
export function stripH1FromMarkdown(markdown: string): string {
  return markdown.replace(/^# .+\n?/m, '');
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
};
