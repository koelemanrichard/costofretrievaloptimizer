// services/styleguide-generator/sections/BaseSectionTemplate.ts
// Shared HTML scaffolding for every styleguide section.
// Each section follows a consistent structure: title → description → tip → demo → class ref → code → warning.

import type { SectionCategory } from '../types';

export interface SectionBlock {
  description: string;
  tip?: string;
  demoHtml: string;
  classRefs?: string[];
  cssCode?: string;
  warning?: string;
}

/**
 * Wrap section content in the standard styleguide section structure.
 *
 * Every section in the styleguide uses this consistent HTML pattern,
 * ensuring uniform styling and navigation behavior.
 */
export function wrapSection(
  id: number,
  title: string,
  category: SectionCategory,
  block: SectionBlock,
): string {
  const anchorId = `section-${id}`;
  const parts: string[] = [];

  parts.push(`<div class="sg-section" id="${anchorId}">`);
  parts.push(`  <h2 class="sg-section-title">${id}. ${escapeHtml(title)}</h2>`);
  parts.push(`  <p class="sg-description">${escapeHtml(block.description)}</p>`);

  if (block.tip) {
    parts.push(`  <div class="sg-tip">`);
    parts.push(`    <strong>&#128208; Elementor:</strong> ${escapeHtml(block.tip)}`);
    parts.push(`  </div>`);
  }

  if (block.demoHtml) {
    parts.push(`  <div class="sg-demo">`);
    parts.push(`    ${block.demoHtml}`);  // Raw HTML — not escaped
    parts.push(`  </div>`);
  }

  if (block.classRefs && block.classRefs.length > 0) {
    parts.push(`  <div class="sg-class-ref">`);
    for (const cls of block.classRefs) {
      parts.push(`    <code>.${escapeHtml(cls)}</code>`);
    }
    parts.push(`  </div>`);
  }

  if (block.cssCode) {
    parts.push(`  <div class="sg-code">`);
    parts.push(`    <pre><code>${escapeHtml(block.cssCode)}</code></pre>`);
    parts.push(`  </div>`);
  }

  if (block.warning) {
    parts.push(`  <div class="sg-warning">`);
    parts.push(`    <strong>Note:</strong> ${escapeHtml(block.warning)}`);
    parts.push(`  </div>`);
  }

  parts.push(`</div>`);

  return parts.join('\n');
}

/**
 * Escape HTML special characters to prevent injection in text content.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
