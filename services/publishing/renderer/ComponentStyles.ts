/**
 * ComponentStyles
 *
 * Agency-quality CSS for all component types.
 * Creates the "wow factor" with:
 * - Rich visual treatments
 * - Smooth animations
 * - Professional typography
 * - Responsive layouts
 *
 * These styles work alongside or as fallback for brand compiledCss.
 */

export interface ComponentStylesOptions {
  primaryColor: string;
  primaryDark: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  textMuted: string;
  backgroundColor: string;
  surfaceColor: string;
  borderColor: string;
  headingFont: string;
  bodyFont: string;
  radiusSmall: string;
  radiusMedium: string;
  radiusLarge: string;
  personality?: 'corporate' | 'creative' | 'luxurious' | 'friendly' | 'bold' | 'minimal';
}

const DEFAULT_OPTIONS: ComponentStylesOptions = {
  primaryColor: '#3b82f6',
  primaryDark: '#1e40af',
  secondaryColor: '#64748b',
  accentColor: '#f59e0b',
  textColor: '#1f2937',
  textMuted: '#6b7280',
  backgroundColor: '#ffffff',
  surfaceColor: '#f9fafb',
  borderColor: '#e5e7eb',
  headingFont: 'system-ui, -apple-system, sans-serif',
  bodyFont: 'system-ui, -apple-system, sans-serif',
  radiusSmall: '4px',
  radiusMedium: '8px',
  radiusLarge: '16px',
};

/**
 * Calculate relative luminance of a hex color (0 = black, 1 = white)
 * Uses the WCAG 2.0 formula
 */
function hexLuminance(hex: string): number {
  if (!hex) return 0.5;
  const clean = hex.replace('#', '');
  if (clean.length < 6) return 0.5;
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Darken a hex color by a given amount (0-1)
 */
function darkenHex(hex: string, amount: number): string {
  if (!hex) return '#000000';
  const clean = hex.replace('#', '');
  const r = Math.max(0, Math.round(parseInt(clean.substring(0, 2), 16) * (1 - amount)));
  const g = Math.max(0, Math.round(parseInt(clean.substring(2, 4), 16) * (1 - amount)));
  const b = Math.max(0, Math.round(parseInt(clean.substring(4, 6), 16) * (1 - amount)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Validate and fix color options to prevent broken output.
 * Common issue: brand extraction swaps primaryDark/primaryLight.
 */
function sanitizeColors(o: ComponentStylesOptions): ComponentStylesOptions {
  const result = { ...o };

  const primaryLum = hexLuminance(result.primaryColor);
  const darkLum = hexLuminance(result.primaryDark);

  // If primaryDark is LIGHTER than primaryColor, it's wrong.
  // Generate a proper dark variant.
  if (darkLum > primaryLum + 0.05) {
    result.primaryDark = darkenHex(result.primaryColor, 0.35);
  }

  // If primaryDark is too light (luminance > 0.5), it can't serve as heading text color
  if (hexLuminance(result.primaryDark) > 0.5) {
    result.primaryDark = darkenHex(result.primaryColor, 0.35);
  }

  // If textColor is too light for readability
  if (hexLuminance(result.textColor) > 0.5) {
    result.textColor = '#1f2937';
  }

  return result;
}

export function generateComponentStyles(options: Partial<ComponentStylesOptions> = {}): string {
  const raw = { ...DEFAULT_OPTIONS, ...options };
  const o = sanitizeColors(raw);

  // ---------------------------------------------------------------------------
  // Personality-driven visual parameters
  // ---------------------------------------------------------------------------
  const personality = o.personality || 'corporate';

  const visualParams = {
    corporate: {
      radius: { sm: '2px', md: '4px', lg: '6px' },
      shadow: { card: '0 1px 4px rgba(0,0,0,0.06)', hover: '0 4px 12px rgba(0,0,0,0.08)' },
      heroStyle: 'clean-light' as const,
      pageBg: '#ffffff',
      sectionCard: false, // Corporate sites use flat layout, not card-per-section
      animationDuration: '0.2s',
    },
    creative: {
      radius: { sm: '8px', md: '12px', lg: '20px' },
      shadow: { card: '0 4px 16px rgba(0,0,0,0.08)', hover: '0 8px 30px rgba(0,0,0,0.12)' },
      heroStyle: 'gradient-vibrant' as const,
      pageBg: `${o.primaryColor}08`,
      sectionCard: true,
      animationDuration: '0.4s',
    },
    luxurious: {
      radius: { sm: '0px', md: '2px', lg: '4px' },
      shadow: { card: '0 2px 20px rgba(0,0,0,0.04)', hover: '0 10px 40px rgba(0,0,0,0.08)' },
      heroStyle: 'gradient-elegant' as const,
      pageBg: '#faf9f7',
      sectionCard: true,
      animationDuration: '0.5s',
    },
    friendly: {
      radius: { sm: '8px', md: '12px', lg: '16px' },
      shadow: { card: '0 2px 8px rgba(0,0,0,0.06)', hover: '0 6px 20px rgba(0,0,0,0.1)' },
      heroStyle: 'solid-warm' as const,
      pageBg: '#ffffff',
      sectionCard: true,
      animationDuration: '0.3s',
    },
    bold: {
      radius: { sm: '4px', md: '8px', lg: '12px' },
      shadow: { card: '0 4px 16px rgba(0,0,0,0.1)', hover: '0 12px 40px rgba(0,0,0,0.15)' },
      heroStyle: 'gradient-dark' as const,
      pageBg: '#ffffff',
      sectionCard: true,
      animationDuration: '0.2s',
    },
    minimal: {
      radius: { sm: '0px', md: '0px', lg: '2px' },
      shadow: { card: 'none', hover: '0 1px 4px rgba(0,0,0,0.04)' },
      heroStyle: 'flat' as const,
      pageBg: '#ffffff',
      sectionCard: false,
      animationDuration: '0.15s',
    },
  }[personality];

  // Override radius values when personality is provided
  if (o.personality) {
    o.radiusSmall = visualParams.radius.sm;
    o.radiusMedium = visualParams.radius.md;
    o.radiusLarge = visualParams.radius.lg;
  }

  // Page background: personality-driven (corporate/minimal = white, others = tinted)
  const pageBg = visualParams.pageBg;
  // Dark navy variant used only for bold/creative hero styles
  const navyDark = darkenHex(o.primaryColor, 0.65);

  // Brand divider: repeating dash pattern for corporate/bold; solid line for others
  const useDashPattern = personality === 'corporate' || personality === 'bold';
  const brandDividerBg = useDashPattern
    ? `repeating-linear-gradient(90deg, ${o.primaryColor} 0px, ${o.primaryColor} 18px, transparent 18px, transparent 24px, ${o.accentColor} 24px, ${o.accentColor} 30px, transparent 30px, transparent 36px)`
    : `linear-gradient(90deg, ${o.primaryColor} 0%, ${o.primaryColor} 60%, ${o.accentColor} 100%)`;

  // Last-step accent: only apply distinct accent styling when accent differs visually from primary
  const accentLum = hexLuminance(o.accentColor);
  const primaryLum = hexLuminance(o.primaryColor);
  const accentDiffersFromPrimary = Math.abs(accentLum - primaryLum) > 0.05 || o.accentColor.toLowerCase() !== o.primaryColor.toLowerCase();

  return `
/* ==========================================================================
   COMPONENT STYLES - Brand-Matched Visual Components
   ========================================================================== */

/* ------------------------------------------------------------------------- */
/* PAGE-LEVEL: Light tinted background from brand primary                    */
/* ------------------------------------------------------------------------- */

body,
.article-body,
.styled-article {
  background: ${pageBg};
  min-height: 100vh;
}

/* ------------------------------------------------------------------------- */
/* SECTION STRUCTURE & LAYOUT                                                */
/* ------------------------------------------------------------------------- */

.section {
  position: relative;
  margin: 0;
  padding: calc(var(--padding-multiplier, 1) * 2rem) 0;
}

.section-container {
  max-width: var(--section-max-width, 860px);
  margin: 0 auto;
  padding: 0 1.5rem;
}

.section-content {
  margin-top: 1.5rem;
}

${visualParams.sectionCard ? `
/* Elevated content cards on tinted background */
.section:not(.emphasis-hero) .section-container {
  background: ${o.backgroundColor};
  border-radius: ${visualParams.radius.lg};
  padding: 2.5rem 2.5rem;
  box-shadow: ${visualParams.shadow.card};
}` : `
/* Clean flat layout - sections flow on white background */
.section:not(.emphasis-hero) .section-container {
  padding: 1rem 1.5rem;
}`}

/* Layout Width Classes */
.layout-narrow .section-container { max-width: 680px; }
.layout-medium .section-container { max-width: 860px; }
.layout-wide .section-container { max-width: 1100px; }
.layout-full .section-container { max-width: 100%; padding: 0 2rem; }

/* Column Layout Classes */
.columns-2-column .prose { column-count: 2; column-gap: 2rem; }
.columns-3-column .prose { column-count: 3; column-gap: 1.5rem; }
.columns-asymmetric-left .section-content { display: grid; grid-template-columns: 1fr 2fr; gap: 2rem; }
.columns-asymmetric-right .section-content { display: grid; grid-template-columns: 2fr 1fr; gap: 2rem; }

/* Spacing Classes */
.spacing-before-tight { padding-top: 1rem; }
.spacing-before-normal { padding-top: 2rem; }
.spacing-before-generous { padding-top: 3rem; }
.spacing-before-dramatic { padding-top: 5rem; }

.spacing-after-tight { padding-bottom: 1rem; }
.spacing-after-normal { padding-bottom: 2rem; }
.spacing-after-generous { padding-bottom: 3rem; }
.spacing-after-dramatic { padding-bottom: 5rem; }

/* ------------------------------------------------------------------------- */
/* HEADINGS WITH DECORATION                                                  */
/* ------------------------------------------------------------------------- */

.section-heading {
  font-family: ${o.headingFont};
  font-weight: 700;
  color: ${o.textColor};
  line-height: 1.25;
  margin: 0 0 1.25rem 0;
  position: relative;
}

.heading-xl { font-size: 2rem; }
.heading-lg { font-size: 1.75rem; }
.heading-md { font-size: 1.375rem; }
.heading-sm { font-size: 1.125rem; }

/* Heading decoration - subtle, not dominant */
.heading-decorated {
  display: flex;
  align-items: center;
  gap: 0;
}

.heading-decorated .heading-accent {
  display: none;
}

/* ------------------------------------------------------------------------- */
/* EMPHASIS LEVELS - Visual Impact Scaling                                   */
/* ------------------------------------------------------------------------- */

${visualParams.heroStyle === 'clean-light' ? `
/* ===== ARTICLE HEADER - Clean Professional (Corporate/Minimal) ===== */
.article-header {
  background: ${o.backgroundColor};
  padding: 3.5rem 2.5rem 2rem;
  text-align: left;
  position: relative;
  border-bottom: 3px solid ${o.primaryColor};
}

.article-header h1 {
  font-family: ${o.headingFont};
  font-size: 2.5rem;
  font-weight: 800;
  color: ${o.primaryDark};
  line-height: 1.15;
  margin: 0;
  max-width: 900px;
  letter-spacing: -0.02em;
}

.article-header p,
.article-header .subtitle {
  color: ${o.textMuted};
  font-size: 1.1rem;
  margin-top: 0.75rem;
}

.article-header .article-subtitle {
  color: ${o.textColor};
  font-size: 1.15rem;
  line-height: 1.6;
  margin-top: 1rem;
  max-width: 700px;
}

.article-meta {
  display: flex;
  gap: 1.5rem;
  margin-top: 1.25rem;
  color: ${o.textMuted};
  font-size: 0.875rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
` : visualParams.heroStyle === 'flat' ? `
/* ===== ARTICLE HEADER - Flat Minimal ===== */
.article-header {
  background: ${o.backgroundColor};
  padding: 3rem 2.5rem 2rem;
  text-align: left;
  position: relative;
}

.article-header h1 {
  font-family: ${o.headingFont};
  font-size: 2.25rem;
  font-weight: 700;
  color: ${o.textColor};
  line-height: 1.2;
  margin: 0;
  max-width: 900px;
}

.article-header p,
.article-header .subtitle {
  color: ${o.textMuted};
  font-size: 1.1rem;
  margin-top: 0.75rem;
}

.article-header .article-subtitle {
  color: ${o.textColor};
  font-size: 1.1rem;
  line-height: 1.6;
  margin-top: 0.75rem;
  max-width: 700px;
}

.article-meta {
  display: flex;
  gap: 1.5rem;
  margin-top: 1rem;
  color: ${o.textMuted};
  font-size: 0.875rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
` : `
/* ===== ARTICLE HEADER - Dark/Gradient Hero ===== */
.article-header {
  background: ${visualParams.heroStyle === 'gradient-elegant' ? `linear-gradient(135deg, ${navyDark} 0%, ${o.primaryDark} 100%)` : visualParams.heroStyle === 'gradient-vibrant' ? `linear-gradient(135deg, ${o.primaryColor} 0%, ${o.primaryDark} 100%)` : visualParams.heroStyle === 'solid-warm' ? o.primaryColor : navyDark};
  padding: 3rem 2.5rem 2.5rem;
  text-align: left;
  position: relative;
}

.article-header::after {
  content: '';
  display: block;
  margin-top: 1.5rem;
  height: 4px;
  background: ${brandDividerBg};
}

.article-header h1 {
  font-family: ${o.headingFont};
  font-size: 2.25rem;
  font-weight: 800;
  color: white;
  line-height: 1.2;
  margin: 0;
  max-width: 900px;
  letter-spacing: -0.02em;
}

.article-header p,
.article-header .subtitle {
  color: rgba(255, 255, 255, 0.8);
  font-size: 1.1rem;
  margin-top: 0.75rem;
}

.article-header .article-subtitle {
  color: rgba(255, 255, 255, 0.85);
  font-size: 1.15rem;
  line-height: 1.6;
  margin-top: 1rem;
  max-width: 700px;
}

.article-meta {
  display: flex;
  gap: 1.5rem;
  margin-top: 1.25rem;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.875rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
`}

/* Accent CTA button in header */
.article-header .cta-button,
.cta-button-orange {
  display: inline-block;
  background: ${o.primaryColor};
  color: white;
  padding: 0.875rem 2rem;
  border-radius: ${visualParams.radius.md};
  font-weight: 700;
  font-size: 0.95rem;
  text-decoration: none;
  margin-top: 1.5rem;
  transition: all ${visualParams.animationDuration} ease;
  border: none;
  cursor: pointer;
}

.article-header .cta-button:hover,
.cta-button-orange:hover {
  background: ${o.primaryDark};
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* ===== ARTICLE TOC - Clean Sidebar Style ===== */
.article-toc {
  background: ${o.backgroundColor};
  border: 1px solid ${o.borderColor};
  border-radius: ${o.radiusMedium};
  padding: 1.5rem 2rem;
  margin: 2rem auto 3rem;
  max-width: 860px;
}

.article-toc ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  counter-reset: toc-counter;
}

.article-toc li {
  padding: 0.4rem 0;
  counter-increment: toc-counter;
}

.article-toc a {
  color: ${o.primaryColor};
  text-decoration: none;
  font-size: 0.9rem;
  line-height: 1.4;
  display: block;
  transition: color ${visualParams.animationDuration} ease;
}

.article-toc a:hover {
  color: ${o.primaryDark};
  text-decoration: underline;
}

/* ===== INTRO / TITLE SECTION ===== */
/* Hidden when article-header already shows the title */
section.section-introduction,
.section.section-introduction {
  display: none;
}

/* Hero Emphasis - Accent section using brand colors */
.emphasis-hero {
  padding: 3rem 0;
  position: relative;
  overflow: hidden;
  color: ${visualParams.heroStyle === 'clean-light' || visualParams.heroStyle === 'flat' ? o.textColor : 'white'};
  margin: 1rem 0;
}

${visualParams.sectionCard ? `
.emphasis-hero::before {
  content: '';
  display: block;
  height: 4px;
  margin-bottom: 2rem;
  background: ${brandDividerBg};
}` : `
.emphasis-hero::before {
  content: '';
  display: block;
  height: 2px;
  margin-bottom: 2rem;
  background: ${o.primaryColor}30;
}`}

.emphasis-hero .section-heading {
  font-size: 1.875rem;
  margin-bottom: 1.5rem;
}

.emphasis-hero .hero-lead {
  max-width: 720px;
  margin: 0 auto;
}

.emphasis-hero .hero-text {
  font-size: 1.125rem;
  line-height: 1.7;
}

${visualParams.heroStyle !== 'clean-light' && visualParams.heroStyle !== 'flat' ? `
/* Dark hero: white text on gradient background */
.emphasis-hero .section-heading { color: white; }
.emphasis-hero .section-content { color: rgba(255, 255, 255, 0.92); }
.emphasis-hero .section-content p { color: rgba(255, 255, 255, 0.92); }
.emphasis-hero .hero-text { color: rgba(255, 255, 255, 0.92); }

.emphasis-hero .step-item,
.emphasis-hero .card,
.emphasis-hero .feature-card,
.emphasis-hero .checklist-item {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.2);
  color: white;
}

.emphasis-hero .step-content,
.emphasis-hero .card-body,
.emphasis-hero .feature-content,
.emphasis-hero .checklist-text,
.emphasis-hero .timeline-body,
.emphasis-hero .feature-desc {
  color: rgba(255, 255, 255, 0.92);
}

.emphasis-hero .prose { color: rgba(255, 255, 255, 0.92); }
.emphasis-hero .prose p { color: rgba(255, 255, 255, 0.92); }
` : ''}

/* Featured Emphasis - Clean white, subtle separator */
.emphasis-featured {
  background: ${o.backgroundColor};
  padding: 2.5rem 0;
  position: relative;
}

.emphasis-featured::before {
  display: none;
}

.emphasis-featured .section-heading {
  font-size: 1.875rem;
  color: ${o.textColor};
}

/* Standard Emphasis - Clean white with generous spacing */
.emphasis-standard {
  background: ${o.backgroundColor};
  padding: 2.5rem 0;
}

.emphasis-standard .section-heading {
  color: ${o.textColor};
}

/* Supporting Emphasis */
.emphasis-supporting {
  background: ${o.backgroundColor};
  padding: 2rem 0;
}

.emphasis-supporting .section-heading {
  font-size: 1.25rem;
  color: ${o.textColor};
}

/* Minimal Emphasis */
.emphasis-minimal {
  background: ${o.backgroundColor};
  padding: 1.5rem 0;
}

.emphasis-minimal .section-heading {
  font-size: 1.125rem;
  color: ${o.textMuted};
}

${visualParams.sectionCard ? `
/* Signature Brand Divider - applied between major sections (card layouts) */
.section + .section.emphasis-featured {
  border-top: none;
  position: relative;
}

.section + .section.emphasis-featured::before {
  content: '';
  display: block;
  height: 4px;
  margin-bottom: 1.5rem;
  background: ${brandDividerBg};
}
` : `
/* Clean separator between sections (flat layout) */
.section + .section.emphasis-featured {
  border-top: none;
  position: relative;
}
`}

/* Clear separator line between standard sections */
.section.emphasis-standard + .section.emphasis-standard {
  border-top: 1px solid ${o.borderColor};
  padding-top: 3rem;
}

/* ------------------------------------------------------------------------- */
/* HERO COMPONENT                                                            */
/* ------------------------------------------------------------------------- */

.section-hero .hero-content {
  text-align: center;
}

.section-hero .hero-lead {
  max-width: 800px;
  margin: 0 auto 2rem;
}

.section-hero .hero-text {
  font-size: 1.375rem;
  line-height: 1.8;
  color: ${o.textColor};
}

.section-hero .hero-details {
  display: flex;
  justify-content: center;
  gap: 2rem;
  flex-wrap: wrap;
  margin-top: 2rem;
}

/* ------------------------------------------------------------------------- */
/* CARD COMPONENT                                                            */
/* ------------------------------------------------------------------------- */

.card {
  background: ${o.backgroundColor};
  border-radius: ${o.radiusLarge};
  overflow: hidden;
  transition: transform ${visualParams.animationDuration} ease, box-shadow ${visualParams.animationDuration} ease;
  border: 1px solid ${o.borderColor};
}

.card-elevation-0 { box-shadow: none; }
.card-elevation-1 { box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04); }
.card-elevation-2 { box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06); }
.card-elevation-3 { box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08); }

.card:hover {
  border-color: ${o.primaryColor};
}

.card-body {
  padding: 1.75rem;
}

.card-body p:first-child { margin-top: 0; }
.card-body p:last-child { margin-bottom: 0; }

/* ------------------------------------------------------------------------- */
/* FEATURE GRID                                                              */
/* ------------------------------------------------------------------------- */

.feature-grid {
  display: grid;
  gap: 1.5rem;
  margin-top: 2rem;
}

.feature-grid.columns-2 { grid-template-columns: repeat(2, 1fr); }
.feature-grid.columns-3 { grid-template-columns: repeat(3, 1fr); }

.feature-card {
  background: ${o.backgroundColor};
  border-radius: ${o.radiusLarge};
  padding: 2rem 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  border: 1px solid ${o.borderColor};
  box-shadow: ${visualParams.shadow.card};
  transition: all ${visualParams.animationDuration} ease;
}

.feature-card:hover {
  border-color: ${o.primaryColor};
  box-shadow: ${visualParams.shadow.hover};
}

.feature-icon {
  flex-shrink: 0;
  width: 4rem;
  height: 4rem;
  background: transparent;
  color: ${o.primaryColor};
  border: 2px solid ${o.primaryColor};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.feature-content {
  flex: 1;
  color: ${o.textColor};
  line-height: 1.6;
}

.feature-title {
  font-weight: 700;
  color: ${o.primaryColor};
  margin-bottom: 0.5rem;
  font-size: 1rem;
  font-family: ${o.headingFont};
}

.feature-desc {
  font-size: 0.875rem;
  color: ${o.textColor};
  line-height: 1.6;
}

/* ------------------------------------------------------------------------- */
/* TIMELINE                                                                  */
/* ------------------------------------------------------------------------- */

.timeline {
  position: relative;
  padding-left: 3rem;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 1rem;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(180deg, ${o.primaryColor} 0%, ${o.accentColor} 100%);
}

.timeline-item {
  position: relative;
  padding-bottom: 2rem;
}

.timeline-item:last-child {
  padding-bottom: 0;
}

.timeline-marker {
  position: absolute;
  left: -3rem;
  top: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.timeline-number {
  width: 2.5rem;
  height: 2.5rem;
  background: linear-gradient(135deg, ${o.primaryColor}, ${o.primaryDark});
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1rem;
  z-index: 1;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.2);
}

.timeline-content {
  background: ${o.backgroundColor};
  border-radius: ${o.radiusLarge};
  padding: 1.5rem;
  border: 1px solid ${o.borderColor};
  margin-left: 0.5rem;
}

.timeline-body {
  color: ${o.textColor};
  line-height: 1.6;
}

/* ------------------------------------------------------------------------- */
/* STEP LIST                                                                 */
/* ------------------------------------------------------------------------- */

.step-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.step-item {
  display: flex;
  gap: 1.25rem;
  align-items: flex-start;
  padding: 1.5rem;
  background: ${o.backgroundColor};
  border-radius: ${o.radiusLarge};
  border: 1px solid ${o.borderColor};
  box-shadow: ${visualParams.shadow.card};
  transition: all ${visualParams.animationDuration} ease;
}

.step-item:hover {
  border-color: ${o.primaryColor};
}

/* Last step item gets accent highlight when accent differs from primary */
${accentDiffersFromPrimary ? `
.step-list .step-item:last-child {
  background: ${o.accentColor};
  border-color: ${o.accentColor};
  color: white;
}

.step-list .step-item:last-child .step-number {
  background: white;
  color: ${o.accentColor};
}

.step-list .step-item:last-child .step-content {
  color: white;
}
` : `
.step-list .step-item:last-child {
  border-color: ${o.primaryColor};
}
`}

.step-indicator {
  flex-shrink: 0;
}

.step-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  background: ${o.primaryColor};
  color: white;
  border-radius: 50%;
  font-weight: 700;
  font-size: 1rem;
}

.step-large .step-number {
  width: 3.5rem;
  height: 3.5rem;
  font-size: 1.5rem;
}

.step-content {
  flex: 1;
  padding-top: 0.25rem;
  line-height: 1.6;
  color: ${o.textColor};
}

/* ------------------------------------------------------------------------- */
/* FAQ ACCORDION                                                             */
/* ------------------------------------------------------------------------- */

.faq-accordion {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.faq-item {
  background: ${o.backgroundColor};
  border: 1px solid ${o.borderColor};
  border-radius: ${o.radiusMedium};
  overflow: hidden;
  box-shadow: ${visualParams.shadow.card};
  transition: all ${visualParams.animationDuration} ease;
}

.faq-item:hover {
  border-color: ${o.primaryColor};
  box-shadow: ${visualParams.shadow.hover};
}

.faq-question {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.25rem;
  cursor: pointer;
  font-weight: 600;
  color: ${o.textColor};
  font-family: ${o.headingFont};
}

.faq-icon {
  flex-shrink: 0;
  width: 1.75rem;
  height: 1.75rem;
  background: ${o.primaryColor};
  color: white;
  border-radius: ${o.radiusSmall};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
}

.faq-question-text {
  flex: 1;
}

.faq-toggle {
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${o.primaryColor};
  font-size: 1.25rem;
  font-weight: 300;
}

.faq-answer {
  display: flex;
  gap: 0.75rem;
  padding: 0 1.25rem 1.25rem;
  padding-left: 3.75rem;
  color: ${o.textMuted};
  line-height: 1.7;
}

.faq-answer-icon {
  flex-shrink: 0;
  width: 1.75rem;
  height: 1.75rem;
  background: ${o.surfaceColor};
  color: ${o.secondaryColor};
  border-radius: ${o.radiusSmall};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
}

.faq-answer-text {
  flex: 1;
}

/* ------------------------------------------------------------------------- */
/* COMPARISON TABLE                                                          */
/* ------------------------------------------------------------------------- */

.comparison-table-wrapper {
  overflow-x: auto;
  margin: 1.5rem 0;
  border-radius: ${o.radiusMedium};
  box-shadow: ${visualParams.shadow.card};
}

.comparison-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
}

.comparison-table thead {
  background: ${navyDark};
  color: white;
}

.comparison-table th {
  padding: 1rem 1.25rem;
  text-align: left;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.comparison-table td {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid ${o.borderColor};
  color: ${o.textColor};
}

.comparison-table .row-even {
  background: ${o.backgroundColor};
}

.comparison-table .row-odd {
  background: ${o.surfaceColor};
}

.comparison-table tbody tr:hover {
  background: rgba(59, 130, 246, 0.05);
}

/* ------------------------------------------------------------------------- */
/* TESTIMONIAL CARD                                                          */
/* ------------------------------------------------------------------------- */

.testimonial-card {
  position: relative;
  background: ${o.surfaceColor};
  border-radius: ${o.radiusLarge};
  padding: 2.5rem;
  text-align: center;
}

.testimonial-quote-mark {
  position: absolute;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  font-size: 5rem;
  font-family: Georgia, serif;
  color: ${o.primaryColor};
  opacity: 0.15;
  line-height: 1;
}

.testimonial-text {
  font-size: 1.25rem;
  font-style: italic;
  line-height: 1.8;
  color: ${o.textColor};
  margin: 0;
  position: relative;
  z-index: 1;
}

.testimonial-attribution {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 2px solid ${o.primaryColor};
  display: inline-block;
}

.testimonial-author {
  font-weight: 600;
  color: ${o.primaryDark};
}

/* ------------------------------------------------------------------------- */
/* KEY TAKEAWAYS                                                             */
/* ------------------------------------------------------------------------- */

.key-takeaways {
  background: ${o.backgroundColor};
  border-radius: ${o.radiusLarge};
  padding: 2rem;
  border: 1px solid ${o.borderColor};
  border-top: 4px solid ${o.accentColor};
  position: relative;
  overflow: hidden;
}

.key-takeaways::before {
  display: none;
}

.takeaways-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.takeaways-icon {
  font-size: 1.5rem;
}

.takeaways-title {
  font-family: ${o.headingFont};
  font-size: 1.25rem;
  font-weight: 700;
  color: ${o.primaryDark};
}

.takeaways-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.takeaway-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.takeaway-icon {
  flex-shrink: 0;
  font-size: 1rem;
}

.takeaway-text {
  flex: 1;
  line-height: 1.6;
  color: ${o.textColor};
}

/* ------------------------------------------------------------------------- */
/* CTA BANNER                                                                */
/* ------------------------------------------------------------------------- */

.cta-banner {
  background: ${navyDark};
  color: white;
  border-radius: ${o.radiusLarge};
  padding: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
  flex-wrap: wrap;
}

.cta-hero {
  padding: 3rem;
  text-align: center;
  flex-direction: column;
}

.cta-content {
  flex: 1;
  min-width: 250px;
}

.cta-text {
  font-size: 1.125rem;
  line-height: 1.6;
  margin: 0;
}

.cta-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.cta-button {
  padding: 0.875rem 1.5rem;
  border-radius: ${o.radiusSmall};
  font-weight: 600;
  text-decoration: none;
  transition: all ${visualParams.animationDuration} ease;
  white-space: nowrap;
}

.cta-primary {
  background: ${o.accentColor};
  color: white;
}

.cta-primary:hover {
  background: ${darkenHex(o.accentColor, 0.1)};
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.cta-secondary {
  background: transparent;
  color: white;
  border: 2px solid white;
}

.cta-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* ------------------------------------------------------------------------- */
/* STAT HIGHLIGHT                                                            */
/* ------------------------------------------------------------------------- */

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1.5rem;
  margin: 1.5rem 0;
}

.stat-item {
  text-align: center;
  padding: 1.5rem;
  background: ${o.backgroundColor};
  border-radius: ${o.radiusLarge};
  border: 1px solid ${o.borderColor};
  border-bottom: 4px solid ${o.accentColor};
}

.stat-value {
  display: block;
  font-size: 2.5rem;
  font-weight: 800;
  color: ${navyDark};
  line-height: 1;
  margin-bottom: 0.5rem;
  font-family: ${o.headingFont};
}

.stat-label {
  font-size: 0.875rem;
  color: ${o.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* ------------------------------------------------------------------------- */
/* CHECKLIST                                                                 */
/* ------------------------------------------------------------------------- */

.checklist {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.checklist-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  background: ${o.surfaceColor};
  border-radius: ${o.radiusLarge};
  border: 1px solid ${o.borderColor};
  transition: all ${visualParams.animationDuration} ease;
}

.checklist-item:hover {
  border-color: ${o.primaryColor};
}

.checklist-check {
  flex-shrink: 0;
  width: 1.75rem;
  height: 1.75rem;
  background: ${o.primaryColor};
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 700;
}

.checklist-text {
  flex: 1;
  line-height: 1.6;
  color: ${o.textColor};
}

/* ------------------------------------------------------------------------- */
/* BLOCKQUOTE                                                                */
/* ------------------------------------------------------------------------- */

.blockquote {
  position: relative;
  padding: 1.5rem 2rem;
  margin: 2rem 0;
  background: ${o.surfaceColor};
  border-left: 5px solid ${o.accentColor};
  border-radius: 0 ${o.radiusLarge} ${o.radiusLarge} 0;
}

.blockquote-hero {
  padding: 2.5rem;
  text-align: center;
  border-left: none;
  border-top: 5px solid ${o.primaryColor};
  border-radius: ${o.radiusMedium};
}

.blockquote p {
  font-size: 1.125rem;
  font-style: italic;
  line-height: 1.8;
  color: ${o.textMuted};
  margin: 0;
}

.blockquote-featured {
  background: linear-gradient(135deg, ${o.surfaceColor}, ${o.backgroundColor});
  padding: 2rem;
  box-shadow: ${visualParams.shadow.card};
}

/* ------------------------------------------------------------------------- */
/* DEFINITION BOX                                                            */
/* ------------------------------------------------------------------------- */

.definition-box {
  display: flex;
  gap: 1rem;
  padding: 1.75rem;
  background: ${o.surfaceColor};
  border-radius: ${o.radiusLarge};
  border: 1px solid ${o.borderColor};
  border-left: 4px solid ${o.primaryColor};
  margin: 1.5rem 0;
}

.definition-icon {
  flex-shrink: 0;
  font-size: 1.5rem;
}

.definition-content {
  flex: 1;
  color: ${o.textColor};
  line-height: 1.7;
}

/* ------------------------------------------------------------------------- */
/* PROSE (Default Text Content)                                              */
/* ------------------------------------------------------------------------- */

.prose {
  color: ${o.textColor};
  line-height: 1.8;
  font-size: 1rem;
}

.prose p {
  margin-bottom: 1.5rem;
}

.prose p:last-child {
  margin-bottom: 0;
}

.prose a {
  color: ${o.primaryColor};
  text-decoration: underline;
  text-underline-offset: 2px;
}

.prose a:hover {
  color: ${o.primaryDark};
}

.prose strong {
  font-weight: 600;
  color: ${o.primaryDark};
}

.prose ul, .prose ol {
  padding-left: 1.5rem;
  margin-bottom: 1.25rem;
}

.prose li {
  margin-bottom: 0.5rem;
}

.prose-columns-2-column { column-count: 2; column-gap: 2rem; }
.prose-columns-3-column { column-count: 3; column-gap: 1.5rem; }

/* ------------------------------------------------------------------------- */
/* ALERT BOX - Warnings, risks, important notes                              */
/* ------------------------------------------------------------------------- */

.alert-box {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  padding: 1.25rem 1.5rem;
  background: ${o.accentColor}0a;
  border-left: 4px solid ${o.accentColor};
  border-radius: 0 ${o.radiusMedium} ${o.radiusMedium} 0;
  margin: 1.5rem 0;
  color: ${o.textColor};
  line-height: 1.6;
}

.alert-box-icon {
  flex-shrink: 0;
  font-size: 1.25rem;
  margin-top: 0.1rem;
}

.alert-box-content {
  flex: 1;
}

.alert-box-content p { margin: 0; }
.alert-box-content p + p { margin-top: 0.75rem; }

.alert-box-title {
  font-weight: 700;
  color: ${o.accentColor};
  margin-bottom: 0.5rem;
  font-family: ${o.headingFont};
}

/* Severity variants */
.alert-box--warning {
  background: ${o.accentColor}0a;
  border-left-color: ${o.accentColor};
}

.alert-box--info {
  background: ${o.primaryColor}08;
  border-left-color: ${o.primaryColor};
}

.alert-box--success {
  background: #10b98108;
  border-left-color: #10b981;
}

.alert-box--info .alert-box-title { color: ${o.primaryColor}; }
.alert-box--success .alert-box-title { color: #10b981; }

/* ------------------------------------------------------------------------- */
/* INFO BOX - Contextual information, tips, definitions                      */
/* ------------------------------------------------------------------------- */

.info-box {
  padding: 1.5rem 2rem;
  background: ${o.primaryColor}06;
  border-radius: ${o.radiusMedium};
  margin: 1.5rem 0;
  color: ${o.textColor};
  line-height: 1.7;
}

.info-box p { margin: 0; }
.info-box p + p { margin-top: 0.75rem; }

.info-box-title {
  font-weight: 700;
  color: ${o.primaryDark};
  margin-bottom: 0.5rem;
  font-family: ${o.headingFont};
}

.info-box--highlight {
  background: ${o.accentColor}08;
  border-left: 4px solid ${o.accentColor};
  border-radius: 0 ${o.radiusMedium} ${o.radiusMedium} 0;
}

/* ------------------------------------------------------------------------- */
/* LEAD PARAGRAPH - First paragraph with visual accent                       */
/* ------------------------------------------------------------------------- */

.lead-paragraph {
  border-left: 4px solid ${o.primaryColor};
  padding: 0.5rem 0 0.5rem 1.5rem;
  margin: 1.5rem 0;
}

.lead-text {
  font-size: 1.125rem;
  line-height: 1.7;
  color: ${o.textColor};
}

/* ------------------------------------------------------------------------- */
/* SECTION VISUAL RHYTHM - Alternating backgrounds & accent borders          */
/* ------------------------------------------------------------------------- */

${visualParams.sectionCard ? `
/* Alternating subtle background tints for visual rhythm (card-based layouts) */
.section:nth-child(even):not(.emphasis-hero) .section-container {
  background: ${o.surfaceColor};
}

/* Featured sections get left accent border for visual distinction */
.emphasis-featured .section-container {
  border-left: 4px solid ${o.primaryColor};
}
` : `
/* Flat layout: no alternating backgrounds, clean border separation */
`}

${visualParams.heroStyle === 'clean-light' || visualParams.heroStyle === 'flat' ? `
/* Hero sections get subtle brand tint for clean personalities */
.emphasis-hero {
  background: ${o.primaryColor}0a;
  color: ${o.textColor};
}

.emphasis-hero .section-heading {
  color: ${o.primaryDark};
}

.emphasis-hero .section-content,
.emphasis-hero .section-content p,
.emphasis-hero .prose,
.emphasis-hero .prose p,
.emphasis-hero .hero-text {
  color: ${o.textColor};
}

.emphasis-hero .step-item,
.emphasis-hero .card,
.emphasis-hero .feature-card,
.emphasis-hero .checklist-item {
  background: ${o.backgroundColor};
  border-color: ${o.borderColor};
  color: ${o.textColor};
}

.emphasis-hero .step-content,
.emphasis-hero .card-body,
.emphasis-hero .feature-content,
.emphasis-hero .checklist-text,
.emphasis-hero .timeline-body,
.emphasis-hero .feature-desc {
  color: ${o.textColor};
}
` : `
/* Hero sections get gradient background using brand colors (bold/creative) */
.emphasis-hero {
  background: linear-gradient(135deg, ${navyDark} 0%, ${darkenHex(o.primaryColor, 0.45)} 100%);
}
`}

/* Visual break line between emphasis level transitions */
.emphasis-standard + .emphasis-featured,
.emphasis-supporting + .emphasis-featured,
.emphasis-featured + .emphasis-standard {
  border-top: 1px solid ${o.borderColor};
  margin-top: 0.5rem;
}

/* Step-number sizing scoped by emphasis level */
.step-medium .step-number {
  width: 3rem;
  height: 3rem;
  font-size: 1.25rem;
}

/* ------------------------------------------------------------------------- */
/* RESPONSIVE ADJUSTMENTS                                                    */
/* ------------------------------------------------------------------------- */

@media (max-width: 1024px) {
  .feature-grid.columns-3 { grid-template-columns: repeat(2, 1fr); }
  .columns-3-column .prose { column-count: 2; }
  .cta-banner { flex-direction: column; text-align: center; }
  .cta-actions { justify-content: center; }
}

@media (max-width: 768px) {
  .section-container { padding: 0 1rem; }

  .heading-xl { font-size: 2rem; }
  .heading-lg { font-size: 1.5rem; }

  .emphasis-hero { padding: 2.5rem 0; }
  .emphasis-hero .section-heading { font-size: 2rem; }

  .emphasis-featured { padding: 2rem; margin: 1rem 0; }

  .feature-grid.columns-2,
  .feature-grid.columns-3 { grid-template-columns: 1fr; }

  .columns-2-column .prose,
  .columns-3-column .prose,
  .prose-columns-2-column,
  .prose-columns-3-column { column-count: 1; }

  .columns-asymmetric-left .section-content,
  .columns-asymmetric-right .section-content { grid-template-columns: 1fr; }

  .timeline { padding-left: 2.5rem; }
  .timeline-marker { left: -2.5rem; }

  .stat-grid { grid-template-columns: repeat(2, 1fr); }
  .stat-value { font-size: 2rem; }

  .testimonial-card { padding: 2rem 1.5rem; }
  .testimonial-text { font-size: 1.125rem; }

  .key-takeaways { padding: 1.5rem; }

  .cta-banner { padding: 1.5rem; }
  .cta-actions { width: 100%; }
  .cta-button { width: 100%; text-align: center; }
}

@media (max-width: 480px) {
  .step-item { flex-direction: column; gap: 0.75rem; }
  .step-indicator { align-self: flex-start; }

  .faq-question { padding: 1rem; }
  .faq-answer { padding: 0 1rem 1rem; padding-left: 1rem; }

  .stat-grid { grid-template-columns: 1fr; }
}
`;
}

export default generateComponentStyles;
