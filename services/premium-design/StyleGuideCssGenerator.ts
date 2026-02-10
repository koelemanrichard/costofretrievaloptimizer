// =============================================================================
// StyleGuideCssGenerator — Convert approved style guide → article CSS
// =============================================================================
// Uses REAL computed values from approved elements — no AI guessing.

import type { StyleGuide, StyleGuideElement, StyleGuideColor } from '../../types/styleGuide';

/** Convert camelCase to kebab-case */
function toKebab(str: string): string {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase();
}

/** Extract specific CSS props as a declaration block */
function cssBlock(css: Record<string, string>, props: string[]): string {
  return props
    .filter(p => css[p] && css[p] !== 'normal' && css[p] !== 'none' && css[p] !== '0px' && css[p] !== 'rgba(0, 0, 0, 0)')
    .map(p => `  ${toKebab(p)}: ${css[p]};`)
    .join('\n');
}

/** Find first approved element matching category + optional subcategory */
function findApproved(elements: StyleGuideElement[], category: string, subcategory?: string): StyleGuideElement | undefined {
  return elements.find(el =>
    el.approvalStatus === 'approved' &&
    el.category === category &&
    (!subcategory || el.subcategory === subcategory)
  );
}

/** Find all approved elements for a category */
function findAllApproved(elements: StyleGuideElement[], category: string): StyleGuideElement[] {
  return elements.filter(el => el.approvalStatus === 'approved' && el.category === category);
}

/** Get approved colors by usage pattern */
function getColorByUsage(colors: StyleGuideColor[], pattern: string): string | undefined {
  const color = colors.find(c =>
    c.approvalStatus === 'approved' && c.usage.toLowerCase().includes(pattern)
  );
  return color?.hex;
}

export const StyleGuideCssGenerator = {
  /**
   * Generate article CSS from an approved style guide.
   * Maps approved elements to article selectors using real computed values.
   */
  generate(styleGuide: StyleGuide): string {
    const approved = styleGuide.elements.filter(el => el.approvalStatus === 'approved');
    const approvedColors = styleGuide.colors.filter(c => c.approvalStatus === 'approved');

    const sections: string[] = [];

    // ── Google Fonts import ──
    if (styleGuide.googleFontsUrls.length > 0) {
      sections.push(styleGuide.googleFontsUrls.map(url => `@import url('${url}');`).join('\n'));
    }

    // ── CSS Custom Properties from colors ──
    const brandColor = getColorByUsage(approvedColors, 'brand') || getColorByUsage(approvedColors, 'interactive');
    const textColor = getColorByUsage(approvedColors, 'text') || getColorByUsage(approvedColors, 'heading');
    const bgColor = getColorByUsage(approvedColors, 'background');
    const neutralColor = getColorByUsage(approvedColors, 'neutral');

    const vars: string[] = [];
    if (brandColor) vars.push(`  --sg-primary: ${brandColor};`);
    if (textColor) vars.push(`  --sg-text: ${textColor};`);
    if (bgColor) vars.push(`  --sg-background: ${bgColor};`);
    if (neutralColor) vars.push(`  --sg-neutral: ${neutralColor};`);

    // Extract font families from typography elements
    const h1El = findApproved(approved, 'typography', 'h1');
    const bodyEl = findApproved(approved, 'typography', 'body-text');
    const headingFont = h1El?.computedCss.fontFamily;
    const bodyFont = bodyEl?.computedCss.fontFamily;

    if (headingFont) vars.push(`  --sg-heading-font: ${headingFont};`);
    if (bodyFont) vars.push(`  --sg-body-font: ${bodyFont};`);

    if (vars.length > 0) {
      sections.push(`:root {\n${vars.join('\n')}\n}`);
    }

    // ── Typography ──
    const typoProps = ['fontFamily', 'fontSize', 'fontWeight', 'color', 'lineHeight', 'letterSpacing', 'textTransform'];

    // H1
    if (h1El) {
      sections.push(`.article-header h1, h1 {\n${cssBlock(h1El.computedCss, typoProps)}\n}`);
    }

    // H2
    const h2El = findApproved(approved, 'typography', 'h2');
    if (h2El) {
      sections.push(`.section-heading, h2 {\n${cssBlock(h2El.computedCss, typoProps)}\n}`);
    }

    // H3
    const h3El = findApproved(approved, 'typography', 'h3');
    if (h3El) {
      sections.push(`h3 {\n${cssBlock(h3El.computedCss, typoProps)}\n}`);
    }

    // H4
    const h4El = findApproved(approved, 'typography', 'h4');
    if (h4El) {
      sections.push(`h4 {\n${cssBlock(h4El.computedCss, typoProps)}\n}`);
    }

    // Body text
    if (bodyEl) {
      sections.push(`body, p, .prose {\n${cssBlock(bodyEl.computedCss, ['fontFamily', 'fontSize', 'fontWeight', 'color', 'lineHeight'])}\n}`);
    }

    // Links
    const linkEl = findApproved(approved, 'typography', 'links');
    if (linkEl) {
      sections.push(`a {\n${cssBlock(linkEl.computedCss, ['color', 'textDecoration', 'fontWeight'])}\n}`);
    }

    // Lists
    const listEl = findApproved(approved, 'typography', 'lists');
    if (listEl) {
      sections.push(`ul, ol {\n${cssBlock(listEl.computedCss, ['listStyleType', 'padding', 'margin', 'color'])}\n}`);
    }

    // ── Buttons ──
    const btnEls = findAllApproved(approved, 'buttons');
    if (btnEls.length > 0) {
      const btn = btnEls[0];
      const btnProps = ['background', 'backgroundColor', 'color', 'border', 'borderRadius',
        'padding', 'fontFamily', 'fontSize', 'fontWeight', 'boxShadow', 'textTransform', 'letterSpacing'];
      sections.push(`.cta-banner a, .cta-button, button.primary, .btn-primary {\n${cssBlock(btn.computedCss, btnProps)}\n  cursor: pointer;\n  display: inline-block;\n  text-decoration: none;\n}`);
    }

    // ── Cards ──
    const cardEls = findAllApproved(approved, 'cards');
    if (cardEls.length > 0) {
      const card = cardEls[0];
      const cardProps = ['background', 'backgroundColor', 'border', 'borderRadius', 'boxShadow', 'padding', 'overflow'];
      sections.push(`.feature-card, .card, .info-card {\n${cssBlock(card.computedCss, cardProps)}\n}`);
    }

    // ── Backgrounds ──
    const bgEls = findAllApproved(approved, 'backgrounds');
    if (bgEls.length > 0) {
      const bg = bgEls[0];
      sections.push(`.accent-section, .highlighted-section {\n${cssBlock(bg.computedCss, ['background', 'backgroundColor', 'backgroundImage', 'padding', 'borderRadius'])}\n}`);
    }

    // ── Section breaks ──
    const dividerEl = findApproved(approved, 'section-breaks');
    if (dividerEl) {
      sections.push(`hr, .divider {\n${cssBlock(dividerEl.computedCss, ['border', 'borderTop', 'borderBottom', 'height', 'background', 'backgroundColor', 'margin', 'marginTop', 'marginBottom'])}\n}`);
    }

    // ── Tables ──
    const tableEl = findApproved(approved, 'tables');
    if (tableEl) {
      sections.push(`table {\n${cssBlock(tableEl.computedCss, ['borderCollapse', 'border', 'fontFamily', 'fontSize'])}\n  width: 100%;\n}`);
    }

    // ── Forms ──
    const formEl = findApproved(approved, 'forms');
    if (formEl) {
      sections.push(`input, select, textarea {\n${cssBlock(formEl.computedCss, ['border', 'borderRadius', 'padding', 'background', 'backgroundColor', 'fontFamily', 'fontSize', 'color'])}\n}`);
    }

    // ── Images ──
    const imgEl = findApproved(approved, 'images');
    if (imgEl) {
      sections.push(`article img, .content img {\n${cssBlock(imgEl.computedCss, ['borderRadius', 'boxShadow', 'border'])}\n  max-width: 100%;\n  height: auto;\n}`);
    }

    return sections.join('\n\n');
  },
};
