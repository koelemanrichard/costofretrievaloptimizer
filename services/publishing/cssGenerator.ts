/**
 * CSS Generation Engine
 *
 * Generates production-quality CSS from design tokens with:
 * - CSS custom properties from design personalities
 * - Component styles with proper cascade
 * - Dark mode support
 * - Responsive adjustments
 * - Animations and transitions
 *
 * @module services/publishing/cssGenerator
 */

import type { DesignPersonality } from '../../config/designTokens/personalities';
import { resolvePersonalityToTokens, tokensToCSS, type ResolvedTokens } from './tokenResolver';

// ============================================================================
// TYPES
// ============================================================================

export interface CssGenerationOptions {
  personalityId: string;
  darkMode?: boolean;
  minify?: boolean;
  includeReset?: boolean;
  includeAnimations?: boolean;
  customOverrides?: Partial<ResolvedTokens>;
}

export interface GeneratedCss {
  css: string;
  tokens: ResolvedTokens;
  size: number;
}

// ============================================================================
// MAIN GENERATOR
// ============================================================================

/**
 * Generate complete design system CSS from personality
 */
export function generateDesignSystemCss(options: CssGenerationOptions): GeneratedCss {
  const {
    personalityId,
    darkMode = true,
    minify = false,
    includeReset = true,
    includeAnimations = true,
    customOverrides,
  } = options;

  const tokens = resolvePersonalityToTokens(personalityId);

  // Apply custom overrides
  const finalTokens = customOverrides
    ? { ...tokens, ...customOverrides }
    : tokens;

  const cssBlocks: string[] = [];

  // 1. CSS Custom Properties
  cssBlocks.push(generateTokenVariables(finalTokens));

  // 2. Scoped reset
  if (includeReset) {
    cssBlocks.push(generateScopedReset());
  }

  // 3. Typography system
  cssBlocks.push(generateTypographyStyles());

  // 4. Layout utilities
  cssBlocks.push(generateLayoutUtilities());

  // 5. Component styles
  cssBlocks.push(generateComponentStyles());

  // 6. Dark mode support
  if (darkMode) {
    cssBlocks.push(generateDarkModeStyles());
  }

  // 7. Responsive styles
  cssBlocks.push(generateResponsiveStyles());

  // 8. Animations
  if (includeAnimations) {
    cssBlocks.push(generateAnimations());
  }

  // 9. Interactive elements (FAQ, ToC)
  cssBlocks.push(generateInteractiveStyles());

  const css = cssBlocks.join('\n\n');
  const finalCss = minify ? minifyCss(css) : css;

  return {
    css: finalCss,
    tokens: finalTokens,
    size: finalCss.length,
  };
}

// ============================================================================
// TOKEN VARIABLES
// ============================================================================

function generateTokenVariables(tokens: ResolvedTokens): string {
  return `/* ============================================
   CTC Design System - CSS Custom Properties
   Generated from design personality tokens
   ============================================ */

${tokensToCSS(tokens, '.ctc-root, .ctc-styled')}

:root {
  ${Object.entries(tokens)
    .filter(([key]) => key.startsWith('--ctc-'))
    .map(([key, value]) => `${key}: ${value};`)
    .join('\n  ')}
}`;
}

// ============================================================================
// SCOPED RESET
// ============================================================================

function generateScopedReset(): string {
  return `/* ============================================
   Scoped Reset - Prevents style leakage
   ============================================ */

.ctc-root,
.ctc-styled {
  box-sizing: border-box;
  line-height: var(--ctc-line-height-body, 1.6);
  font-family: var(--ctc-font-body);
  color: var(--ctc-text);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.ctc-root *,
.ctc-styled *,
.ctc-root *::before,
.ctc-styled *::before,
.ctc-root *::after,
.ctc-styled *::after {
  box-sizing: inherit;
}

.ctc-root img,
.ctc-styled img {
  max-width: 100%;
  height: auto;
  display: block;
}

.ctc-root a,
.ctc-styled a {
  color: inherit;
  text-decoration: inherit;
}

.ctc-root button,
.ctc-styled button {
  font: inherit;
  color: inherit;
  background: none;
  border: none;
  cursor: pointer;
}`;
}

// ============================================================================
// TYPOGRAPHY STYLES
// ============================================================================

function generateTypographyStyles(): string {
  return `/* ============================================
   Typography System
   ============================================ */

.ctc-styled {
  font-size: var(--ctc-text-base);
  line-height: var(--ctc-line-height-body);
}

/* Headings */
.ctc-styled h1,
.ctc-styled h2,
.ctc-styled h3,
.ctc-styled h4,
.ctc-styled h5,
.ctc-styled h6 {
  font-family: var(--ctc-font-display);
  font-weight: var(--ctc-heading-weight);
  letter-spacing: var(--ctc-heading-letter-spacing);
  text-transform: var(--ctc-heading-case);
  line-height: 1.25;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  color: var(--ctc-text);
}

.ctc-styled h1 { font-size: var(--ctc-text-5xl); }
.ctc-styled h2 { font-size: var(--ctc-text-3xl); }
.ctc-styled h3 { font-size: var(--ctc-text-2xl); }
.ctc-styled h4 { font-size: var(--ctc-text-xl); }
.ctc-styled h5 { font-size: var(--ctc-text-lg); }
.ctc-styled h6 { font-size: var(--ctc-text-base); }

/* Paragraphs */
.ctc-styled p {
  margin-bottom: var(--ctc-paragraph-spacing);
  color: var(--ctc-text-secondary);
}

/* Links */
.ctc-styled a:not(.ctc-btn) {
  color: var(--ctc-primary);
  text-decoration: underline;
  text-underline-offset: 2px;
  transition: color var(--ctc-duration-fast) var(--ctc-ease-default);
}

.ctc-styled a:not(.ctc-btn):hover {
  color: var(--ctc-primary-dark);
}

/* Lists */
.ctc-styled ul,
.ctc-styled ol {
  margin: 1em 0;
  padding-left: 1.5em;
}

.ctc-styled li {
  margin-bottom: 0.5em;
  color: var(--ctc-text-secondary);
}

.ctc-styled ul > li {
  list-style-type: disc;
}

.ctc-styled ol > li {
  list-style-type: decimal;
}

/* Blockquotes */
.ctc-styled blockquote:not(.ctc-testimonial) {
  border-left: 4px solid var(--ctc-primary);
  padding-left: 1.5em;
  margin: 1.5em 0;
  font-style: italic;
  color: var(--ctc-text-muted);
}

/* Code */
.ctc-styled code:not(pre code) {
  font-family: var(--ctc-font-mono);
  font-size: 0.875em;
  background: var(--ctc-surface);
  padding: 0.125em 0.375em;
  border-radius: var(--ctc-radius-sm);
}

.ctc-styled pre {
  font-family: var(--ctc-font-mono);
  font-size: 0.875em;
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 1em;
  border-radius: var(--ctc-radius-lg);
  overflow-x: auto;
  margin: 1.5em 0;
}

.ctc-styled pre code {
  background: none;
  padding: 0;
}

/* Tables */
.ctc-styled table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.5em 0;
  font-size: 0.875em;
}

.ctc-styled th,
.ctc-styled td {
  padding: 0.75em 1em;
  border-bottom: 1px solid var(--ctc-border);
  text-align: left;
}

.ctc-styled th {
  font-weight: 600;
  background: var(--ctc-surface);
  color: var(--ctc-text);
}

.ctc-styled tr:hover td {
  background: var(--ctc-surface);
}

/* Horizontal rule */
.ctc-styled hr {
  border: none;
  height: 1px;
  background: var(--ctc-border);
  margin: 2em 0;
}`;
}

// ============================================================================
// LAYOUT UTILITIES
// ============================================================================

function generateLayoutUtilities(): string {
  return `/* ============================================
   Layout Utilities
   ============================================ */

/* Container */
.ctc-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--ctc-space-4);
}

.ctc-container--narrow {
  max-width: 768px;
}

.ctc-container--wide {
  max-width: 1400px;
}

/* Layout with sidebar */
.ctc-layout--with-sidebar {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: var(--ctc-space-8);
  align-items: start;
}

@media (max-width: 1024px) {
  .ctc-layout--with-sidebar {
    grid-template-columns: 1fr;
  }

  .ctc-layout--with-sidebar > .ctc-toc--sidebar {
    display: none;
  }
}

/* Section spacing */
.ctc-section {
  margin-bottom: var(--ctc-space-12);
}

/* Grid utilities */
.ctc-grid {
  display: grid;
  gap: var(--ctc-space-6);
}

.ctc-grid-2 { grid-template-columns: repeat(2, 1fr); }
.ctc-grid-3 { grid-template-columns: repeat(3, 1fr); }
.ctc-grid-4 { grid-template-columns: repeat(4, 1fr); }

@media (max-width: 768px) {
  .ctc-grid-2,
  .ctc-grid-3,
  .ctc-grid-4 {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .ctc-grid-3,
  .ctc-grid-4 {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Flexbox utilities */
.ctc-flex { display: flex; }
.ctc-flex-col { flex-direction: column; }
.ctc-items-center { align-items: center; }
.ctc-items-start { align-items: flex-start; }
.ctc-justify-center { justify-content: center; }
.ctc-justify-between { justify-content: space-between; }
.ctc-gap-2 { gap: var(--ctc-space-2); }
.ctc-gap-4 { gap: var(--ctc-space-4); }
.ctc-gap-6 { gap: var(--ctc-space-6); }
.ctc-gap-8 { gap: var(--ctc-space-8); }
.ctc-flex-wrap { flex-wrap: wrap; }`;
}

// ============================================================================
// COMPONENT STYLES
// ============================================================================

function generateComponentStyles(): string {
  return `/* ============================================
   Component Styles
   ============================================ */

/* ========== BUTTONS ========== */
.ctc-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--ctc-space-2);
  font-weight: 600;
  transition: all var(--ctc-duration-fast) var(--ctc-ease-default);
  cursor: pointer;
  text-decoration: none;
  border: none;
}

.ctc-btn:focus-visible {
  outline: 2px solid var(--ctc-primary);
  outline-offset: 2px;
}

.ctc-btn--primary {
  background: var(--ctc-primary);
  color: var(--ctc-text-inverse);
}

.ctc-btn--primary:hover {
  background: var(--ctc-primary-dark);
  transform: translateY(-1px);
  box-shadow: var(--ctc-shadow-md);
}

.ctc-btn--secondary {
  background: transparent;
  color: var(--ctc-primary);
  border: 2px solid var(--ctc-primary);
}

.ctc-btn--secondary:hover {
  background: var(--ctc-primary);
  color: var(--ctc-text-inverse);
}

.ctc-btn--ghost {
  background: transparent;
  color: var(--ctc-primary);
}

.ctc-btn--ghost:hover {
  background: color-mix(in srgb, var(--ctc-primary) 10%, transparent);
}

.ctc-btn--white {
  background: white;
  color: var(--ctc-primary);
}

.ctc-btn--white:hover {
  background: var(--ctc-surface);
  transform: translateY(-1px);
}

.ctc-btn--outline {
  background: transparent;
  border: 2px solid currentColor;
}

.ctc-btn--outline:hover {
  background: currentColor;
  color: var(--ctc-background);
}

/* ========== HERO ========== */
.ctc-hero {
  position: relative;
  overflow: hidden;
}

.ctc-hero--gradient {
  background: var(--ctc-gradient-hero);
  color: var(--ctc-text-inverse);
}

.ctc-hero--gradient .ctc-hero-title {
  color: white;
}

.ctc-hero-bg-effects {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.ctc-hero-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.3;
}

.ctc-hero-orb--1 {
  width: 400px;
  height: 400px;
  background: white;
  top: -100px;
  left: 10%;
}

.ctc-hero-orb--2 {
  width: 300px;
  height: 300px;
  background: white;
  bottom: -100px;
  right: 20%;
  opacity: 0.2;
}

.ctc-hero--solid {
  background: var(--ctc-surface);
}

.ctc-hero-image-bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
}

.ctc-hero--image-overlay::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.8));
}

/* ========== CARDS ========== */
.ctc-card {
  background: var(--ctc-surface);
  border-radius: var(--ctc-radius-xl);
  transition: all var(--ctc-duration-fast) var(--ctc-ease-default);
}

.ctc-card--flat {
  border: 1px solid var(--ctc-border);
}

.ctc-card--raised {
  box-shadow: var(--ctc-shadow-md);
}

.ctc-card--floating {
  box-shadow: var(--ctc-shadow-xl);
}

.ctc-card--floating:hover {
  box-shadow: var(--ctc-shadow-2xl);
  transform: translateY(-4px);
}

.ctc-card--outlined {
  border: 1px solid var(--ctc-border);
}

.ctc-card--glass {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* ========== KEY TAKEAWAYS ========== */
.ctc-takeaways--box {
  background: var(--ctc-surface);
  border-left: 4px solid var(--ctc-primary);
  padding: var(--ctc-space-6);
  border-radius: var(--ctc-radius-lg);
}

.ctc-takeaways--cards {
  background: linear-gradient(135deg, var(--ctc-primary) 0%, var(--ctc-primary-dark) 100%);
  color: white;
  padding: var(--ctc-space-8);
  border-radius: var(--ctc-radius-2xl);
}

/* ========== TIMELINE ========== */
.ctc-timeline--zigzag .ctc-timeline-line::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(to bottom, var(--ctc-primary), var(--ctc-primary-light));
  transform: translateX(-50%);
}

.ctc-timeline-node {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
}

@media (max-width: 768px) {
  .ctc-timeline--zigzag .ctc-timeline-line::before {
    left: 24px;
  }

  .ctc-timeline--zigzag .ctc-timeline-step {
    flex-direction: row !important;
  }

  .ctc-timeline--zigzag .ctc-timeline-card {
    margin-left: var(--ctc-space-16) !important;
    margin-right: 0 !important;
    padding-right: 0 !important;
    padding-left: 0 !important;
    text-align: left !important;
  }

  .ctc-timeline--zigzag .ctc-timeline-node {
    left: 24px;
  }
}

/* ========== TESTIMONIALS ========== */
.ctc-testimonial--card {
  background: var(--ctc-surface);
  padding: var(--ctc-space-8);
  border-radius: var(--ctc-radius-xl);
  box-shadow: var(--ctc-shadow-lg);
  border-left: 4px solid var(--ctc-primary);
}

.ctc-testimonial--minimal {
  padding-left: var(--ctc-space-6);
  border-left: 4px solid color-mix(in srgb, var(--ctc-primary) 30%, transparent);
  font-style: italic;
}

.ctc-testimonial--featured {
  background: linear-gradient(135deg, color-mix(in srgb, var(--ctc-primary) 5%, transparent), transparent);
  padding: var(--ctc-space-8);
  border-radius: var(--ctc-radius-2xl);
}

.ctc-quote-mark {
  font-family: Georgia, serif;
}

/* ========== FAQ ========== */
.ctc-faq--accordion {
  border-top: 1px solid var(--ctc-border);
}

.ctc-faq-trigger {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  text-align: left;
  padding: var(--ctc-space-5) 0;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: var(--ctc-text-lg);
  font-weight: 600;
  color: var(--ctc-text);
  transition: color var(--ctc-duration-fast);
}

.ctc-faq-trigger:hover {
  color: var(--ctc-primary);
}

.ctc-faq-icon {
  font-size: var(--ctc-text-2xl);
  font-weight: 300;
  color: var(--ctc-primary);
  transition: transform var(--ctc-duration-fast);
}

.ctc-faq-item[open] .ctc-faq-icon,
.ctc-faq-trigger[aria-expanded="true"] .ctc-faq-icon {
  transform: rotate(45deg);
}

.ctc-faq-answer {
  color: var(--ctc-text-secondary);
  line-height: 1.7;
}

.ctc-faq-answer[hidden] {
  display: none;
}

/* ========== CTA SECTIONS ========== */
.ctc-cta-section {
  text-align: center;
}

.ctc-cta--gradient {
  background: var(--ctc-gradient-cta);
  color: white;
  padding: var(--ctc-space-12) var(--ctc-space-8);
}

.ctc-cta--solid {
  background: var(--ctc-primary);
  color: var(--ctc-text-inverse);
}

.ctc-cta--outlined {
  background: transparent;
  border: 2px solid var(--ctc-primary);
  color: var(--ctc-text);
}

.ctc-cta--bold-contrast {
  background: var(--ctc-text);
  color: var(--ctc-background);
}

.ctc-cta--gradient-glow {
  background: var(--ctc-gradient-hero);
  color: white;
  box-shadow: 0 0 60px color-mix(in srgb, var(--ctc-primary) 50%, transparent);
}

.ctc-cta--warm-gradient {
  background: linear-gradient(90deg, var(--ctc-primary) 0%, var(--ctc-accent) 50%, var(--ctc-secondary) 100%);
  color: white;
}

/* ========== AUTHOR BOX ========== */
.ctc-author--horizontal {
  display: flex;
  gap: var(--ctc-space-4);
  align-items: center;
  padding: var(--ctc-space-6);
  background: var(--ctc-surface);
  border-radius: var(--ctc-radius-xl);
}

.ctc-author--vertical {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: var(--ctc-space-6);
  background: var(--ctc-surface);
  border-radius: var(--ctc-radius-xl);
}

.ctc-author--compact {
  display: flex;
  gap: var(--ctc-space-3);
  align-items: center;
}

/* ========== TABLE OF CONTENTS ========== */
.ctc-toc--sidebar {
  position: sticky;
  top: var(--ctc-space-4);
  max-height: calc(100vh - var(--ctc-space-8));
  overflow-y: auto;
  background: var(--ctc-surface);
  padding: var(--ctc-space-4);
  border-radius: var(--ctc-radius-lg);
}

.ctc-toc--inline {
  background: var(--ctc-surface);
  padding: var(--ctc-space-6);
  border-radius: var(--ctc-radius-lg);
  margin-bottom: var(--ctc-space-8);
}

.ctc-toc--floating {
  position: fixed;
  right: var(--ctc-space-4);
  top: 50%;
  transform: translateY(-50%);
  background: var(--ctc-surface);
  padding: var(--ctc-space-4);
  border-radius: var(--ctc-radius-lg);
  box-shadow: var(--ctc-shadow-xl);
  z-index: 50;
}

.ctc-toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.ctc-toc-link {
  color: var(--ctc-text-secondary);
  text-decoration: none;
  transition: color var(--ctc-duration-fast);
  display: block;
  padding: var(--ctc-space-1) 0;
  font-size: var(--ctc-text-sm);
}

.ctc-toc-link:hover,
.ctc-toc-link.active {
  color: var(--ctc-primary);
}

.ctc-toc-list--collapsed {
  display: none;
}`;
}

// ============================================================================
// DARK MODE
// ============================================================================

function generateDarkModeStyles(): string {
  return `/* ============================================
   Dark Mode Support
   ============================================ */

@media (prefers-color-scheme: dark) {
  .ctc-root:not([data-theme="light"]),
  .ctc-styled:not([data-theme="light"]) {
    --ctc-background: #0f172a;
    --ctc-surface: #1e293b;
    --ctc-surface-elevated: #334155;
    --ctc-text: #f1f5f9;
    --ctc-text-secondary: #cbd5e1;
    --ctc-text-muted: #94a3b8;
    --ctc-border: #334155;
    --ctc-border-subtle: #1e293b;
  }
}

[data-theme="dark"] {
  --ctc-background: #0f172a;
  --ctc-surface: #1e293b;
  --ctc-surface-elevated: #334155;
  --ctc-text: #f1f5f9;
  --ctc-text-secondary: #cbd5e1;
  --ctc-text-muted: #94a3b8;
  --ctc-border: #334155;
  --ctc-border-subtle: #1e293b;
}`;
}

// ============================================================================
// RESPONSIVE STYLES
// ============================================================================

function generateResponsiveStyles(): string {
  return `/* ============================================
   Responsive Adjustments
   ============================================ */

@media (max-width: 768px) {
  .ctc-styled h1 { font-size: var(--ctc-text-4xl); }
  .ctc-styled h2 { font-size: var(--ctc-text-2xl); }
  .ctc-styled h3 { font-size: var(--ctc-text-xl); }

  .ctc-hero--centered {
    padding: var(--ctc-space-12) var(--ctc-space-4);
  }

  .ctc-hero-title {
    font-size: var(--ctc-text-3xl) !important;
  }

  .ctc-hero-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .ctc-hero-actions .ctc-btn {
    width: 100%;
    justify-content: center;
  }

  .ctc-cta-section {
    padding: var(--ctc-space-8) var(--ctc-space-4);
  }

  .ctc-testimonials-grid {
    grid-template-columns: 1fr !important;
  }

  .ctc-benefits-grid .ctc-card {
    text-align: left;
  }

  .ctc-toc--floating {
    display: none;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .ctc-hero--split {
    grid-template-columns: 1fr;
    text-align: center;
  }
}`;
}

// ============================================================================
// ANIMATIONS
// ============================================================================

function generateAnimations(): string {
  return `/* ============================================
   Animations
   ============================================ */

@keyframes ctc-fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes ctc-scale-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes ctc-slide-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes ctc-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.ctc-animate-fade-in {
  animation: ctc-fade-in var(--ctc-duration-normal) var(--ctc-ease-enter) forwards;
}

.ctc-animate-scale-in {
  animation: ctc-scale-in var(--ctc-duration-normal) var(--ctc-ease-emphasis) forwards;
}

.ctc-animate-slide-up {
  animation: ctc-slide-up var(--ctc-duration-slow) var(--ctc-ease-enter) forwards;
}

/* Staggered animations */
.ctc-stagger > * {
  opacity: 0;
  animation: ctc-fade-in var(--ctc-duration-normal) var(--ctc-ease-enter) forwards;
}

.ctc-stagger > *:nth-child(1) { animation-delay: 0ms; }
.ctc-stagger > *:nth-child(2) { animation-delay: 100ms; }
.ctc-stagger > *:nth-child(3) { animation-delay: 200ms; }
.ctc-stagger > *:nth-child(4) { animation-delay: 300ms; }
.ctc-stagger > *:nth-child(5) { animation-delay: 400ms; }
.ctc-stagger > *:nth-child(6) { animation-delay: 500ms; }

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}`;
}

// ============================================================================
// INTERACTIVE STYLES
// ============================================================================

function generateInteractiveStyles(): string {
  return `/* ============================================
   Interactive Element Styles
   ============================================ */

/* Progress Bar */
.ctc-progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--ctc-border);
  z-index: 1000;
}

.ctc-progress-fill {
  height: 100%;
  background: var(--ctc-primary);
  width: 0%;
  transition: width 100ms ease;
}

/* Focus styles */
.ctc-styled *:focus-visible {
  outline: 2px solid var(--ctc-primary);
  outline-offset: 2px;
}

/* Selection */
.ctc-styled ::selection {
  background: color-mix(in srgb, var(--ctc-primary) 20%, transparent);
  color: var(--ctc-text);
}

/* Smooth scrolling */
.ctc-styled {
  scroll-behavior: smooth;
}

/* Skip link */
.ctc-skip-link {
  position: absolute;
  top: -100%;
  left: 50%;
  transform: translateX(-50%);
  background: var(--ctc-primary);
  color: var(--ctc-text-inverse);
  padding: var(--ctc-space-2) var(--ctc-space-4);
  border-radius: var(--ctc-radius-md);
  z-index: 9999;
  transition: top var(--ctc-duration-fast);
}

.ctc-skip-link:focus {
  top: var(--ctc-space-2);
}`;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Minify CSS by removing comments and excess whitespace
 */
function minifyCss(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
    .replace(/\s+/g, ' ') // Collapse whitespace
    .replace(/\s*([{}:;,])\s*/g, '$1') // Remove space around delimiters
    .replace(/;}/g, '}') // Remove last semicolon
    .trim();
}

/**
 * Generate CSS for a specific component only
 */
export function generateComponentCss(componentName: string): string {
  const componentMap: Record<string, () => string> = {
    button: () => `
.ctc-btn { display: inline-flex; align-items: center; justify-content: center; gap: var(--ctc-space-2); font-weight: 600; transition: all var(--ctc-duration-fast) var(--ctc-ease-default); cursor: pointer; text-decoration: none; border: none; }
.ctc-btn--primary { background: var(--ctc-primary); color: var(--ctc-text-inverse); }
.ctc-btn--primary:hover { background: var(--ctc-primary-dark); }
`,
    hero: () => `
.ctc-hero { position: relative; overflow: hidden; }
.ctc-hero--gradient { background: var(--ctc-gradient-hero); color: var(--ctc-text-inverse); }
`,
    card: () => `
.ctc-card { background: var(--ctc-surface); border-radius: var(--ctc-radius-xl); transition: all var(--ctc-duration-fast) var(--ctc-ease-default); }
.ctc-card--raised { box-shadow: var(--ctc-shadow-md); }
`,
  };

  return componentMap[componentName]?.() || '';
}
