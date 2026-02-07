// utils/sanitizeHtml.ts
import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content using DOMPurify to prevent XSS attacks.
 * Allows common content tags and safe attributes.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'b', 'i', 'u',
      'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'blockquote', 'code', 'pre',
      'span', 'div', 'section', 'article',
      'figure', 'figcaption',
      'mark', 'small', 'sub', 'sup',
      'dl', 'dt', 'dd',
      'hr',
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'id',
      'target', 'rel', 'width', 'height',
      'colspan', 'rowspan', 'scope',
    ],
    ALLOW_DATA_ATTR: false,
  });
}
