// =============================================================================
// StyleGuideExport — Generate downloadable standalone HTML style guide document
// =============================================================================

import type { StyleGuide, StyleGuideElement, StyleGuideCategory } from '../../types/styleGuide';

const CATEGORY_LABELS: Record<StyleGuideCategory, string> = {
  typography: 'Typography',
  buttons: 'Buttons',
  cards: 'Cards',
  navigation: 'Navigation',
  accordions: 'Accordions & Tabs',
  'section-breaks': 'Dividers & Separators',
  backgrounds: 'Backgrounds',
  images: 'Image Styles',
  tables: 'Tables',
  forms: 'Form Elements',
  icons: 'Icons',
  colors: 'Colors',
};

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function cssPropsToString(css: Record<string, string>): string {
  return Object.entries(css)
    .map(([k, v]) => `  ${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v};`)
    .join('\n');
}

/**
 * Generate a self-contained HTML document showing all approved elements.
 */
export function generateStyleGuideHtml(styleGuide: StyleGuide): string {
  const approved = styleGuide.elements.filter(el => el.approvalStatus === 'approved');
  const approvedColors = styleGuide.colors.filter(c => c.approvalStatus === 'approved');

  // Group by category
  const groups = new Map<StyleGuideCategory, StyleGuideElement[]>();
  for (const el of approved) {
    const list = groups.get(el.category) || [];
    list.push(el);
    groups.set(el.category, list);
  }

  const fontsLink = styleGuide.googleFontsUrls.length > 0
    ? styleGuide.googleFontsUrls.map(url => `<link href="${url}" rel="stylesheet">`).join('\n    ')
    : '';

  // Build sections
  let sectionsHtml = '';

  // Colors section
  if (approvedColors.length > 0) {
    sectionsHtml += `
    <section class="sg-section">
      <h2>Colors</h2>
      <div class="sg-color-grid">
        ${approvedColors.map(c => `
        <div class="sg-color-swatch">
          <div class="sg-color-circle" style="background-color: ${c.hex}"></div>
          <div class="sg-color-info">
            <code>${c.hex}</code>
            <span class="sg-usage">${escapeHtml(c.usage)}</span>
          </div>
        </div>`).join('')}
      </div>
    </section>`;
  }

  // Element sections by category
  const categoryOrder: StyleGuideCategory[] = [
    'typography', 'buttons', 'cards', 'navigation', 'accordions',
    'section-breaks', 'backgrounds', 'images', 'tables', 'forms',
  ];

  for (const cat of categoryOrder) {
    const elements = groups.get(cat);
    if (!elements || elements.length === 0) continue;

    sectionsHtml += `
    <section class="sg-section">
      <h2>${CATEGORY_LABELS[cat] || cat}</h2>
      ${elements.map(el => `
      <div class="sg-element">
        <div class="sg-element-header">
          <h3>
            ${escapeHtml(el.label)}
            ${el.qualityScore !== undefined ? `<span class="sg-quality-badge" style="background:${el.qualityScore >= 70 ? '#22c55e22' : el.qualityScore >= 40 ? '#eab30822' : '#ef444422'};color:${el.qualityScore >= 70 ? '#22c55e' : el.qualityScore >= 40 ? '#eab308' : '#ef4444'};padding:2px 6px;border-radius:4px;font-size:11px;margin-left:8px;">${el.qualityScore}%</span>` : ''}
            ${el.aiGenerated ? '<span style="background:#a855f722;color:#a855f7;padding:2px 6px;border-radius:4px;font-size:11px;margin-left:8px;">AI Generated</span>' : ''}
          </h3>
          <span class="sg-meta">${el.subcategory} &middot; ${el.pageRegion}${el.sourcePageUrl ? ` &middot; ${escapeHtml(el.sourcePageUrl)}` : ''}</span>
        </div>
        <div class="sg-preview">
          ${el.selfContainedHtml}
        </div>
        <details class="sg-code">
          <summary>CSS Properties</summary>
          <pre><code>${escapeHtml(cssPropsToString(el.computedCss))}</code></pre>
        </details>
      </div>`).join('')}
    </section>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Style Guide — ${escapeHtml(styleGuide.hostname)}</title>
  ${fontsLink}
  <style>
    :root {
      --sg-bg: #fafafa;
      --sg-surface: #ffffff;
      --sg-border: #e5e7eb;
      --sg-text: #18181b;
      --sg-muted: #71717a;
      --sg-accent: #7c3aed;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background: var(--sg-bg);
      color: var(--sg-text);
      line-height: 1.6;
    }
    .sg-container { max-width: 900px; margin: 0 auto; padding: 40px 24px; }
    .sg-header {
      margin-bottom: 48px;
      padding-bottom: 24px;
      border-bottom: 2px solid var(--sg-border);
    }
    .sg-header h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .sg-header p { font-size: 14px; color: var(--sg-muted); }
    .sg-section { margin-bottom: 48px; }
    .sg-section > h2 {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 20px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--sg-border);
      color: var(--sg-accent);
    }
    .sg-element {
      background: var(--sg-surface);
      border: 1px solid var(--sg-border);
      border-radius: 8px;
      margin-bottom: 16px;
      overflow: hidden;
    }
    .sg-element-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: #f4f4f5;
      border-bottom: 1px solid var(--sg-border);
    }
    .sg-element-header h3 { font-size: 13px; font-weight: 600; }
    .sg-meta { font-size: 11px; color: var(--sg-muted); }
    .sg-preview { padding: 20px; background: #fff; }
    .sg-preview * { max-width: 100%; }
    .sg-preview img { max-height: 150px; }
    .sg-code { padding: 0 16px 12px; }
    .sg-code summary {
      font-size: 11px;
      color: var(--sg-muted);
      cursor: pointer;
      padding: 8px 0;
    }
    .sg-code pre {
      background: #f4f4f5;
      padding: 12px;
      border-radius: 6px;
      font-size: 12px;
      overflow-x: auto;
      line-height: 1.5;
    }
    .sg-color-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 12px;
    }
    .sg-color-swatch {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: var(--sg-surface);
      border: 1px solid var(--sg-border);
      border-radius: 8px;
    }
    .sg-color-circle {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 1px solid var(--sg-border);
      flex-shrink: 0;
    }
    .sg-color-info { min-width: 0; }
    .sg-color-info code { font-size: 13px; font-weight: 600; display: block; }
    .sg-usage { font-size: 11px; color: var(--sg-muted); }
    .sg-footer {
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid var(--sg-border);
      font-size: 12px;
      color: var(--sg-muted);
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="sg-container">
    <header class="sg-header">
      <h1>Style Guide &mdash; ${escapeHtml(styleGuide.hostname)}</h1>
      <p>
        ${approved.length} elements &middot; ${approvedColors.length} colors
        ${styleGuide.pagesScanned ? `&middot; ${styleGuide.pagesScanned} pages scanned` : ''}
        &middot; Extracted from <a href="${escapeHtml(styleGuide.sourceUrl)}">${escapeHtml(styleGuide.sourceUrl)}</a>
        &middot; ${new Date(styleGuide.extractedAt).toLocaleDateString()}
      </p>
      ${styleGuide.googleFontFamilies.length > 0
        ? `<p>Google Fonts: ${styleGuide.googleFontFamilies.join(', ')}</p>`
        : ''}
    </header>

    ${sectionsHtml}

    <footer class="sg-footer">
      Generated by Holistic SEO Style Guide Extractor &middot; v${styleGuide.version}
    </footer>
  </div>
</body>
</html>`;
}
