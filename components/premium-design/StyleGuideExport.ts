// =============================================================================
// StyleGuideExport — Generate downloadable standalone HTML style guide document
// =============================================================================
// Reference-inspired export with sticky nav, branded header, interactive hover
// demos, color tiers, variant grouping, and quick reference table.

import type { StyleGuide, StyleGuideElement, StyleGuideCategory, StyleGuideColor } from '../../types/styleGuide';

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

const CATEGORY_ORDER: StyleGuideCategory[] = [
  'typography', 'buttons', 'cards', 'navigation', 'accordions',
  'section-breaks', 'backgrounds', 'images', 'tables', 'forms', 'icons',
];

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function cssPropsToString(css: Record<string, string>): string {
  return Object.entries(css)
    .map(([k, v]) => `  ${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v};`)
    .join('\n');
}

/** Detect the primary brand color from approved colors */
function detectBrandColor(colors: StyleGuideColor[]): string {
  // Prefer 'brand' or 'interactive' usage, then highest-frequency non-neutral
  const brand = colors.find(c => c.usage === 'brand' || c.usage === 'interactive');
  if (brand) return brand.hex;

  const nonNeutral = colors.find(c =>
    c.usage !== 'neutral' && c.usage !== 'background (white)' && c.usage !== 'text (dark)'
  );
  if (nonNeutral) return nonNeutral.hex;

  return '#7c3aed'; // fallback purple
}

/** Determine the correct preview background for an element */
function getPreviewBackground(el: StyleGuideElement): string {
  if (el.suggestedBackground) return el.suggestedBackground;
  if (el.ancestorBackground?.backgroundColor) {
    const bg = el.ancestorBackground.backgroundColor;
    if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
  }
  if (el.ancestorBackground?.backgroundImage) {
    const bgImg = el.ancestorBackground.backgroundImage;
    if (bgImg !== 'none' && bgImg.includes('gradient')) return bgImg;
  }
  const textColor = el.computedCss.color || '';
  const match = textColor.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (match) {
    const avg = (parseInt(match[1]) + parseInt(match[2]) + parseInt(match[3])) / 3;
    if (avg > 180) return '#1a1a2e';
  }
  return '#fff';
}

/** Classify color into tier: brand, text, neutral, other */
function getColorTier(c: StyleGuideColor): 'brand' | 'text' | 'neutral' | 'other' {
  const u = c.usage.toLowerCase();
  if (u.includes('brand') || u.includes('interactive') || u.includes('heading')) return 'brand';
  if (u.includes('text')) return 'text';
  if (u.includes('neutral') || u.includes('background')) return 'neutral';
  return 'other';
}

// =============================================================================
// Builder Functions
// =============================================================================

function buildNavigation(
  groups: Map<StyleGuideCategory, StyleGuideElement[]>,
  hasColors: boolean,
): string {
  const links: string[] = [];
  if (hasColors) links.push('<a href="#sg-colors">Colors</a>');
  for (const cat of CATEGORY_ORDER) {
    if (groups.has(cat)) {
      const id = `sg-${cat}`;
      links.push(`<a href="#${id}">${CATEGORY_LABELS[cat]}</a>`);
    }
  }
  links.push('<a href="#sg-quick-ref">Quick Reference</a>');
  return `<nav class="sg-nav">${links.join('\n    ')}</nav>`;
}

function buildHeader(
  guide: StyleGuide,
  approvedCount: number,
  colorCount: number,
  brandColor: string,
): string {
  return `<header class="sg-header">
  <h1><span style="background: linear-gradient(135deg, ${brandColor}, ${brandColor}aa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">Style Guide</span> — ${escapeHtml(guide.hostname)}</h1>
  <p>
    ${approvedCount} elements &middot; ${colorCount} colors
    ${guide.pagesScanned ? `&middot; ${guide.pagesScanned} pages scanned` : ''}
    &middot; Source: <a href="${escapeHtml(guide.sourceUrl)}" style="color: ${brandColor};">${escapeHtml(guide.sourceUrl)}</a>
    &middot; ${new Date(guide.extractedAt).toLocaleDateString()}
  </p>
  ${guide.googleFontFamilies.length > 0 ? `<p class="sg-fonts">Fonts: ${guide.googleFontFamilies.join(', ')}</p>` : ''}
</header>`;
}

function buildColorSection(colors: StyleGuideColor[]): string {
  if (colors.length === 0) return '';

  const tiers: Record<string, StyleGuideColor[]> = { brand: [], text: [], neutral: [], other: [] };
  for (const c of colors) {
    tiers[getColorTier(c)].push(c);
  }

  const tierLabels: Record<string, string> = {
    brand: 'Brand & Interactive',
    text: 'Text Colors',
    neutral: 'Neutral & Background',
    other: 'Other',
  };

  let html = `<section id="sg-colors" class="sg-section">
  <h2>Color Palette</h2>`;

  for (const [tier, tierColors] of Object.entries(tiers)) {
    if (tierColors.length === 0) continue;
    html += `
  <h3 class="sg-tier-label">${tierLabels[tier]}</h3>
  <div class="sg-color-grid">
    ${tierColors.map(c => `<div class="sg-color-swatch">
      <div class="sg-color-box" style="background-color: ${c.hex};"></div>
      <code>${c.hex}</code>
      <span class="sg-color-usage">${escapeHtml(c.usage)}</span>
      <span class="sg-color-freq">${c.frequency}x</span>
    </div>`).join('\n    ')}
  </div>`;
  }

  html += '\n</section>';
  return html;
}

function buildElementCard(el: StyleGuideElement): string {
  const bg = getPreviewBackground(el);
  const isGradient = bg.includes('gradient');
  const bgStyle = isGradient ? `background-image: ${bg};` : `background: ${bg};`;

  const qualityBadge = el.qualityScore !== undefined
    ? `<span class="sg-quality" style="background:${el.qualityScore >= 70 ? '#dcfce7' : el.qualityScore >= 40 ? '#fef3c7' : '#fee2e2'};color:${el.qualityScore >= 70 ? '#166534' : el.qualityScore >= 40 ? '#92400e' : '#991b1b'};">${el.qualityScore}%</span>`
    : '';

  const badges = [
    qualityBadge,
    el.aiGenerated ? '<span class="sg-badge sg-badge-ai">AI Generated</span>' : '',
    el.aiRepaired ? '<span class="sg-badge sg-badge-repaired">AI Repaired</span>' : '',
  ].filter(Boolean).join(' ');

  const hasHover = el.hoverCss && Object.keys(el.hoverCss).length > 0;

  return `<div class="sg-element">
    <div class="sg-element-header">
      <div>
        <h3>${escapeHtml(el.label)} ${badges}</h3>
        <span class="sg-meta">${escapeHtml(el.subcategory)} &middot; ${el.pageRegion}${el.sourcePageUrl ? ` &middot; ${escapeHtml(el.sourcePageUrl)}` : ''}</span>
      </div>
    </div>
    <div class="sg-preview" style="${bgStyle}">
      ${hasHover ? wrapWithHoverDemo(el.selfContainedHtml, el.hoverCss!, el.computedCss) : el.selfContainedHtml}
    </div>
    ${hasHover ? '<p class="sg-hover-hint">Hover over the element to see interactive state</p>' : ''}
    <details class="sg-code">
      <summary>CSS Properties</summary>
      <pre><code>${escapeHtml(cssPropsToString(el.computedCss))}</code></pre>
      ${hasHover ? `<p style="font-size:11px;color:#71717a;margin:8px 0 0;">:hover overrides</p>
      <pre><code>${escapeHtml(cssPropsToString(el.hoverCss!))}</code></pre>` : ''}
    </details>
  </div>`;
}

function wrapWithHoverDemo(
  html: string,
  hoverCss: Record<string, string>,
  computedCss: Record<string, string>,
): string {
  // Build CSS strings for mouseover/mouseout
  const hoverStyle = Object.entries(hoverCss)
    .map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}:${v}`)
    .join(';');

  const restoreStyle = Object.entries(hoverCss)
    .map(([k]) => {
      const orig = computedCss[k] || '';
      return `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}:${orig}`;
    })
    .join(';');

  // Wrap the HTML in a container with hover handlers
  return `<div class="sg-hover-demo"
    onmouseover="var el=this.querySelector('[data-hover-target]')||this.firstElementChild;if(el)el.style.cssText+=';${hoverStyle.replace(/'/g, "\\'")}'"
    onmouseout="var el=this.querySelector('[data-hover-target]')||this.firstElementChild;if(el){${Object.entries(hoverCss).map(([k]) => {
      const kebab = k.replace(/([A-Z])/g, '-$1').toLowerCase();
      const orig = computedCss[k] || '';
      return `el.style.setProperty('${kebab}','${orig.replace(/'/g, "\\'")}')`;
    }).join(';')}}"
  >${html}</div>`;
}

function buildElementSections(groups: Map<StyleGuideCategory, StyleGuideElement[]>): string {
  let html = '';

  for (const cat of CATEGORY_ORDER) {
    const elements = groups.get(cat);
    if (!elements || elements.length === 0) continue;

    // Group by subcategory
    const subgroups = new Map<string, StyleGuideElement[]>();
    for (const el of elements) {
      const sub = el.subcategory || 'general';
      const list = subgroups.get(sub) || [];
      list.push(el);
      subgroups.set(sub, list);
    }

    const useGrid = cat === 'buttons' || cat === 'cards' || cat === 'forms' || cat === 'icons';

    html += `
  <section id="sg-${cat}" class="sg-section">
    <h2>${CATEGORY_LABELS[cat]}</h2>`;

    for (const [sub, subElements] of subgroups) {
      if (subgroups.size > 1) {
        html += `\n    <h3 class="sg-subcategory">${escapeHtml(sub.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))}</h3>`;
      }

      if (useGrid) {
        html += '\n    <div class="sg-grid">';
      }

      for (const el of subElements) {
        html += '\n    ' + buildElementCard(el);
      }

      if (useGrid) {
        html += '\n    </div>';
      }
    }

    html += '\n  </section>';
  }

  return html;
}

function buildQuickReferenceTable(approved: StyleGuideElement[]): string {
  if (approved.length === 0) return '';

  const rows = approved.map(el => {
    const score = el.qualityScore !== undefined ? `${el.qualityScore}%` : '—';
    const scoreColor = el.qualityScore !== undefined
      ? (el.qualityScore >= 70 ? '#166534' : el.qualityScore >= 40 ? '#92400e' : '#991b1b')
      : '#71717a';
    return `<tr>
      <td>${escapeHtml(el.label)}</td>
      <td>${CATEGORY_LABELS[el.category as StyleGuideCategory] || el.category}</td>
      <td>${escapeHtml(el.subcategory)}</td>
      <td>${el.pageRegion}</td>
      <td style="color:${scoreColor};font-weight:600;">${score}</td>
    </tr>`;
  }).join('\n      ');

  return `<section id="sg-quick-ref" class="sg-section">
  <h2>Quick Reference</h2>
  <div class="sg-table-wrap">
    <table class="sg-table">
      <thead>
        <tr><th>Label</th><th>Category</th><th>Subcategory</th><th>Region</th><th>Quality</th></tr>
      </thead>
      <tbody>
      ${rows}
      </tbody>
    </table>
  </div>
</section>`;
}

// =============================================================================
// Main Export Function
// =============================================================================

/**
 * Generate a self-contained HTML document showing all approved elements.
 * Professional quality with sticky nav, interactive hover demos, color tiers,
 * variant grouping, and quick reference table.
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

  const brandColor = detectBrandColor(approvedColors);

  const fontsLink = styleGuide.googleFontsUrls.length > 0
    ? styleGuide.googleFontsUrls.map(url => `<link href="${url}" rel="stylesheet">`).join('\n    ')
    : '';

  const headerHtml = buildHeader(styleGuide, approved.length, approvedColors.length, brandColor);
  const navHtml = buildNavigation(groups, approvedColors.length > 0);
  const colorSectionHtml = buildColorSection(approvedColors);
  const elementSectionsHtml = buildElementSections(groups);
  const quickRefHtml = buildQuickReferenceTable(approved);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Style Guide — ${escapeHtml(styleGuide.hostname)}</title>
  ${fontsLink}
  <style>
    :root {
      --sg-brand: ${brandColor};
      --sg-bg: #f8f8fa;
      --sg-surface: #ffffff;
      --sg-border: #e4e4e7;
      --sg-border-light: #f4f4f5;
      --sg-text: #18181b;
      --sg-muted: #71717a;
      --sg-dark: #27272a;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background: var(--sg-bg);
      color: var(--sg-text);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }

    /* Header */
    .sg-header {
      background: var(--sg-dark);
      color: white;
      padding: 48px 32px;
      text-align: center;
    }
    .sg-header h1 {
      font-size: 32px;
      font-weight: 800;
      letter-spacing: -0.025em;
      margin-bottom: 8px;
    }
    .sg-header p {
      color: #a1a1aa;
      font-size: 14px;
      margin: 4px 0;
    }
    .sg-header a { color: var(--sg-brand); text-decoration: none; }
    .sg-header a:hover { text-decoration: underline; }
    .sg-fonts { font-size: 13px !important; color: #71717a !important; margin-top: 8px !important; }

    /* Sticky Nav */
    .sg-nav {
      background: white;
      border-bottom: 1px solid var(--sg-border);
      padding: 14px 32px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .sg-nav a {
      display: inline-block;
      padding: 6px 14px;
      background: var(--sg-border-light);
      color: #3f3f46;
      text-decoration: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      transition: all 0.2s;
    }
    .sg-nav a:hover {
      background: ${brandColor}18;
      color: ${brandColor};
    }

    /* Container */
    .sg-container { max-width: 1100px; margin: 0 auto; padding: 32px 24px 80px; }

    /* Sections */
    .sg-section { margin-bottom: 56px; }
    .sg-section > h2 {
      font-size: 24px;
      font-weight: 800;
      color: var(--sg-dark);
      margin-bottom: 8px;
      padding-top: 24px;
      padding-bottom: 8px;
      border-bottom: 2px solid var(--sg-border);
      letter-spacing: -0.025em;
    }
    .sg-tier-label {
      font-size: 15px;
      font-weight: 700;
      color: var(--sg-muted);
      margin: 20px 0 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .sg-subcategory {
      font-size: 16px;
      font-weight: 700;
      color: var(--sg-muted);
      margin: 24px 0 12px;
      padding-left: 2px;
    }

    /* Element Cards */
    .sg-element {
      background: var(--sg-surface);
      border: 1px solid var(--sg-border);
      border-radius: 16px;
      margin-bottom: 20px;
      overflow: hidden;
    }
    .sg-element-header {
      padding: 14px 20px;
      border-bottom: 1px solid var(--sg-border-light);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .sg-element-header h3 {
      font-size: 14px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .sg-meta { font-size: 11px; color: var(--sg-muted); margin-top: 4px; display: block; }
    .sg-quality {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
    }
    .sg-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
    }
    .sg-badge-ai { background: #f3e8ff; color: #7c3aed; }
    .sg-badge-repaired { background: #e0f2fe; color: #0284c7; }

    /* Preview */
    .sg-preview {
      padding: 24px;
      min-height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .sg-preview * { max-width: 100%; }
    .sg-preview img { max-height: 180px; }
    .sg-hover-demo { cursor: pointer; transition: all 0.2s; }
    .sg-hover-hint {
      text-align: center;
      font-size: 11px;
      color: var(--sg-muted);
      font-style: italic;
      padding: 4px 0 8px;
      border-top: 1px solid var(--sg-border-light);
    }

    /* Code */
    .sg-code { padding: 0 20px 14px; }
    .sg-code summary {
      font-size: 11px;
      color: var(--sg-muted);
      cursor: pointer;
      padding: 8px 0;
      font-weight: 600;
    }
    .sg-code pre {
      background: #f4f4f5;
      padding: 14px;
      border-radius: 8px;
      font-size: 12px;
      overflow-x: auto;
      line-height: 1.5;
    }

    /* Color Grid */
    .sg-color-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 16px;
      margin-bottom: 20px;
    }
    .sg-color-swatch {
      text-align: center;
      padding: 12px;
      background: var(--sg-surface);
      border: 1px solid var(--sg-border);
      border-radius: 12px;
    }
    .sg-color-box {
      width: 100%;
      height: 48px;
      border-radius: 8px;
      border: 1px solid rgba(0,0,0,0.08);
      margin-bottom: 8px;
    }
    .sg-color-swatch code {
      font-size: 13px;
      font-weight: 700;
      display: block;
      margin-bottom: 2px;
    }
    .sg-color-usage {
      font-size: 11px;
      color: var(--sg-muted);
      display: block;
    }
    .sg-color-freq {
      font-size: 10px;
      color: #a1a1aa;
      display: block;
    }

    /* Grid layouts for buttons, cards, forms */
    .sg-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
      gap: 20px;
    }
    .sg-grid .sg-element { margin-bottom: 0; }

    /* Quick Reference Table */
    .sg-table-wrap { overflow-x: auto; }
    .sg-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .sg-table th {
      background: #f4f4f5;
      padding: 10px 14px;
      text-align: left;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--sg-muted);
      border-bottom: 2px solid var(--sg-border);
    }
    .sg-table td {
      padding: 10px 14px;
      border-bottom: 1px solid var(--sg-border-light);
    }
    .sg-table tbody tr:hover { background: #fafafa; }

    /* Footer */
    .sg-footer {
      margin-top: 56px;
      padding-top: 24px;
      border-top: 1px solid var(--sg-border);
      font-size: 12px;
      color: var(--sg-muted);
      text-align: center;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .sg-header { padding: 32px 20px; }
      .sg-header h1 { font-size: 24px; }
      .sg-container { padding: 20px 16px 60px; }
      .sg-nav { padding: 12px 16px; }
      .sg-grid { grid-template-columns: 1fr; }
      .sg-color-grid { grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); }
      .sg-element-header { flex-direction: column; align-items: flex-start; }
      .sg-preview { padding: 16px; }
    }
  </style>
</head>
<body>
  ${headerHtml}
  ${navHtml}

  <div class="sg-container">
    ${colorSectionHtml}
    ${elementSectionsHtml}
    ${quickRefHtml}

    <footer class="sg-footer">
      Generated by Holistic SEO Style Guide Extractor &middot; v${styleGuide.version}
      &middot; ${new Date(styleGuide.extractedAt).toLocaleDateString()}
    </footer>
  </div>
</body>
</html>`;
}
