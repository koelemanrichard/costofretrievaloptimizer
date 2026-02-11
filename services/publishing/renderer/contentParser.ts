/**
 * Content Parser
 *
 * Parses content strings into structured blocks for semantic HTML generation.
 * Handles markdown headings, images, tables, lists, blockquotes, and paragraphs.
 *
 * @module services/publishing/renderer/contentParser
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ParsedContent {
  type: 'paragraph' | 'heading' | 'list' | 'table' | 'image' | 'blockquote';
  level?: number; // for headings
  items?: string[]; // for lists
  rows?: string[][]; // for tables
  headers?: string[]; // for tables
  src?: string; // for images
  alt?: string; // for images
  text?: string; // for paragraph/blockquote
  raw: string;
}

// ============================================================================
// CONTENT PARSING
// ============================================================================

/**
 * Parse content string into structured blocks
 * This analyzes WHAT the content contains, not which template to use
 */
export function parseContent(content: string): ParsedContent[] {
  const blocks: ParsedContent[] = [];

  // Split by double newlines to get blocks
  const rawBlocks = content.split(/\n\n+/).filter(b => b.trim());

  for (const raw of rawBlocks) {
    const trimmed = raw.trim();

    // Check for markdown heading
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/m);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2],
        raw: trimmed
      });
      continue;
    }

    // Check for image (markdown or HTML)
    const imgMatch = trimmed.match(/!\[([^\]]*)\]\(([^)]+)\)|<img[^>]+src=["']([^"']+)["'][^>]*>/);
    if (imgMatch) {
      blocks.push({
        type: 'image',
        alt: imgMatch[1] || '',
        src: imgMatch[2] || imgMatch[3] || '',
        raw: trimmed
      });
      continue;
    }

    // Check for markdown table
    if (trimmed.includes('|') && trimmed.split('\n').length > 1) {
      const tableData = parseMarkdownTable(trimmed);
      if (tableData) {
        blocks.push({
          type: 'table',
          headers: tableData.headers,
          rows: tableData.rows,
          raw: trimmed
        });
        continue;
      }
    }

    // Check for list (markdown)
    if (/^[\*\-\+]\s+/m.test(trimmed) || /^\d+\.\s+/m.test(trimmed)) {
      const items = trimmed
        .split('\n')
        .filter(line => /^[\*\-\+\d\.]\s*/.test(line.trim()))
        .map(line => line.replace(/^[\*\-\+]\s+/, '').replace(/^\d+\.\s+/, '').trim());

      if (items.length > 0) {
        blocks.push({
          type: 'list',
          items,
          raw: trimmed
        });
        continue;
      }
    }

    // Check for blockquote
    if (trimmed.startsWith('>')) {
      blocks.push({
        type: 'blockquote',
        text: trimmed.replace(/^>\s*/gm, ''),
        raw: trimmed
      });
      continue;
    }

    // Default: paragraph
    blocks.push({
      type: 'paragraph',
      text: trimmed,
      raw: trimmed
    });
  }

  return blocks;
}

/**
 * Parse markdown table into structured data
 */
export function parseMarkdownTable(content: string): { headers: string[]; rows: string[][] } | null {
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length < 2) return null;

  // First line is headers
  const headers = lines[0].split('|').map(h => h.trim()).filter(h => h);

  // Skip separator line (contains ---)
  const dataLines = lines.slice(1).filter(l => !l.includes('---'));

  const rows = dataLines.map(line =>
    line.split('|').map(cell => cell.trim()).filter(c => c)
  );

  return { headers, rows };
}

/**
 * Process inline markdown (bold, italic, links)
 */
export function processInlineMarkdown(text: string): string {
  let result = text;

  // Bold: **text** or __text__
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // Italic: *text* or _text_
  result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  result = result.replace(/_([^_]+)_/g, '<em>$1</em>');

  // Links: [text](url)
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  return result;
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Render a parsed block to HTML - dynamic, not templated
 */
export function renderBlock(block: ParsedContent): string {
  switch (block.type) {
    case 'heading':
      return `<h${block.level}>${processInlineMarkdown(block.text || '')}</h${block.level}>`;

    case 'paragraph':
      return `<p>${processInlineMarkdown(block.text || '')}</p>`;

    case 'image':
      return `<figure><img src="${block.src}" alt="${escapeHtml(block.alt || '')}" loading="lazy"><figcaption>${escapeHtml(block.alt || '')}</figcaption></figure>`;

    case 'list': {
      const listItems = (block.items || [])
        .map(item => `<li>${processInlineMarkdown(item)}</li>`)
        .join('\n');
      return `<ul>${listItems}</ul>`;
    }

    case 'table':
      return renderTable(block.headers || [], block.rows || []);

    case 'blockquote':
      return `<blockquote><p>${processInlineMarkdown(block.text || '')}</p></blockquote>`;

    default:
      return `<p>${processInlineMarkdown(block.raw)}</p>`;
  }
}

/**
 * Render table from data - built dynamically
 */
export function renderTable(headers: string[], rows: string[][]): string {
  const headerCells = headers.map(h => `<th>${processInlineMarkdown(h)}</th>`).join('');
  const headerRow = `<tr>${headerCells}</tr>`;

  const bodyRows = rows.map(row => {
    const cells = row.map(cell => `<td>${processInlineMarkdown(cell)}</td>`).join('');
    return `<tr>${cells}</tr>`;
  }).join('\n');

  return `
<div class="table-wrapper">
  <table>
    <thead>${headerRow}</thead>
    <tbody>${bodyRows}</tbody>
  </table>
</div>`;
}
