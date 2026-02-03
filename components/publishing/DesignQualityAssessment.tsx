/**
 * Design Quality Assessment Component
 *
 * Comprehensive evaluation of output quality based on:
 * - Component variety and appropriate usage
 * - Visual hierarchy and emphasis distribution
 * - Business context fit
 * - Professional design patterns
 * - CTA placement and effectiveness
 * - Layout design elements
 *
 * Provides actionable suggestions with "Fix with AI" options.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '../ui/Button';

// ============================================================================
// Types
// ============================================================================

/**
 * Fix level indicates where the fix should be applied:
 * - 'output': Only this article's HTML output (temporary, single use)
 * - 'layout': Update layout patterns/blueprint (affects this content type)
 * - 'brand': Update brand design system CSS (affects all future articles)
 * - 'all': Update all levels for comprehensive fix
 */
export type FixLevel = 'output' | 'layout' | 'brand' | 'all';

export interface DesignIssue {
  id: string;
  category: 'component' | 'hierarchy' | 'business' | 'layout' | 'engagement' | 'branding';
  severity: 'critical' | 'major' | 'minor';
  title: string;
  description: string;
  currentState: string;
  recommendation: string;
  canAutoFix: boolean;
  autoFixPrompt?: string;
  manualSteps?: string[];
  /**
   * Indicates at what level this fix should be applied.
   * This helps the system understand if the fix is just for this output,
   * or should update layout patterns or brand styling for future designs.
   */
  fixLevel: FixLevel;
  /**
   * Specific instructions for updating brand CSS if fixLevel includes 'brand'
   */
  brandFixPrompt?: string;
  /**
   * Specific instructions for updating layout patterns if fixLevel includes 'layout'
   */
  layoutFixPrompt?: string;
}

export interface DesignQualityResult {
  overallScore: number;
  categoryScores: {
    componentVariety: number;
    visualHierarchy: number;
    businessFit: number;
    layoutDesign: number;
    engagement: number;
    brandConsistency: number;
  };
  issues: DesignIssue[];
  strengths: string[];
  summary: string;
  recommendation: 'excellent' | 'good' | 'needs-improvement' | 'rework-recommended';
}

interface DesignQualityAssessmentProps {
  html: string;
  css: string;
  businessContext?: {
    industry?: string;
    model?: string;
    audience?: string;
    valueProp?: string;
  };
  contentContext?: {
    title?: string;
    intent?: string;
    isCoreTopic?: boolean;
  };
  onAutoFix?: (issue: DesignIssue) => Promise<void>;
  onRegenerateWithInstructions?: (instructions: string) => Promise<void>;
  isFixing?: boolean;
  /** Called when the design quality score is computed, so the parent can display it */
  onScoreCalculated?: (result: DesignQualityResult) => void;
}

// ============================================================================
// Analysis Functions
// ============================================================================

export function analyzeDesignQuality(
  html: string,
  css: string,
  businessContext?: DesignQualityAssessmentProps['businessContext'],
  contentContext?: DesignQualityAssessmentProps['contentContext']
): DesignQualityResult {
  const issues: DesignIssue[] = [];
  const strengths: string[] = [];

  // ==========================================================================
  // CRITICAL FIX: Check ACTUAL rendered component structures, not just declarations
  // A section can have data-component="timeline" but still render as prose fallback
  // ==========================================================================

  // Parse DECLARED component usage from HTML attributes
  const componentMatches = html.match(/data-component="([^"]+)"/g) || [];
  const declaredComponents = componentMatches.map(m => m.replace('data-component="', '').replace('"', ''));

  // Check for ACTUAL visual component structures (not prose fallbacks)
  const actualVisualComponents = {
    timeline: (html.match(/class="[^"]*timeline-item[^"]*"/g) || []).length,
    featureGrid: (html.match(/class="[^"]*feature-card[^"]*"/g) || []).length,
    stepList: (html.match(/class="[^"]*step-item[^"]*"/g) || []).length,
    checklist: (html.match(/class="[^"]*checklist-item[^"]*"/g) || []).length,
    statHighlight: (html.match(/class="[^"]*stat-item[^"]*"/g) || []).length,
    faq: (html.match(/class="[^"]*faq-item[^"]*"/g) || []).length,
    testimonial: (html.match(/class="[^"]*testimonial-card[^"]*"/g) || []).length,
    keyTakeaways: (html.match(/class="[^"]*takeaway-item[^"]*"|class="[^"]*key-takeaways[^"]*"/g) || []).length,
    cards: (html.match(/class="[^"]*card card-elevation[^"]*"/g) || []).length,
    tables: (html.match(/<table[^>]*class="[^"]*comparison-table[^"]*"/g) || []).length,
    hero: (html.match(/class="[^"]*hero-content[^"]*"/g) || []).length,
  };

  const totalActualVisuals = Object.values(actualVisualComponents).reduce((a, b) => a + b, 0);

  // Count declared vs actually rendered
  const visualComponentTypes = ['timeline', 'step-list', 'feature-grid', 'stat-highlight',
    'checklist', 'faq-accordion', 'testimonial-card', 'key-takeaways', 'card', 'comparison-table', 'hero'];
  const declaredVisuals = declaredComponents.filter(c => visualComponentTypes.includes(c)).length;
  const proseInDeclared = declaredComponents.filter(c => c === 'prose').length;

  // Calculate actual prose ratio (sections that are just paragraphs)
  const proseDivCount = (html.match(/<div class="prose[^"]*">/g) || []).length;
  const plainParagraphSections = (html.match(/<section[^>]*>[\s\S]*?<\/section>/g) || [])
    .filter(section => {
      // Section is mostly prose if it has no visual component structures inside
      const hasVisualStructure =
        section.includes('timeline-item') ||
        section.includes('feature-card') ||
        section.includes('step-item') ||
        section.includes('checklist-item') ||
        section.includes('stat-item') ||
        section.includes('faq-item') ||
        section.includes('testimonial-card') ||
        section.includes('takeaway-item') ||
        section.includes('card-elevation') ||
        section.includes('comparison-table') ||
        section.includes('hero-content');
      return !hasVisualStructure;
    }).length;

  // Log for debugging
  console.log('[DesignQualityAssessment] Component analysis:', {
    declaredComponents: declaredComponents,
    declaredVisuals,
    actualVisualComponents,
    totalActualVisuals,
    plainParagraphSections,
    proseDivCount,
  });

  // Use actual visual components for scoring, not declared ones
  const components = declaredComponents; // Keep for other checks
  const uniqueComponents = [...new Set(declaredComponents)];

  // Parse emphasis levels
  const emphasisMatches = html.match(/emphasis-(hero|featured|standard|supporting|minimal)/g) || [];
  const emphasisCounts = {
    hero: emphasisMatches.filter(e => e === 'emphasis-hero').length,
    featured: emphasisMatches.filter(e => e === 'emphasis-featured').length,
    standard: emphasisMatches.filter(e => e === 'emphasis-standard').length,
    supporting: emphasisMatches.filter(e => e === 'emphasis-supporting').length,
    minimal: emphasisMatches.filter(e => e === 'emphasis-minimal').length,
  };

  // Count sections
  const sectionCount = (html.match(/<section/g) || []).length;

  // Check for CTAs
  const hasCta = html.includes('ctc-cta') || html.includes('cta-banner') || html.includes('ctc-button--primary');
  const ctaCount = (html.match(/ctc-button--primary|cta-banner|section-cta/g) || []).length;

  // Check for visual elements
  const hasGradients = css.includes('gradient') || html.includes('bg-gradient');
  const hasBackgrounds = html.includes('has-background');
  const hasAccentBorders = html.includes('has-accent-border');
  const hasAnimations = html.includes('has-animation');

  // Check for hero section
  const hasHero = emphasisCounts.hero > 0 || html.includes('section-hero');

  // Check for lists styled as components
  const hasStyledLists = components.includes('checklist') || components.includes('feature-grid') || components.includes('icon-list');

  // Check for tables/comparison
  const hasTables = html.includes('<table') || components.includes('comparison-table');

  // Check for FAQ/accordion
  const hasFaq = components.includes('faq-accordion') || html.includes('ctc-faq');

  // Check for testimonials/quotes
  const hasQuotes = components.includes('testimonial-card') || components.includes('blockquote') || html.includes('ctc-quote');

  // Check for stats/metrics
  const hasStats = components.includes('stat-highlight') || html.includes('ctc-stat');

  // Check for key takeaways
  const hasKeyTakeaways = components.includes('key-takeaways') || html.includes('takeaway');

  // ============================================================================
  // COMPONENT VARIETY ASSESSMENT
  // ==========================================================================
  // CRITICAL FIX: Use ACTUAL rendered components, not declared component types
  // A section with data-component="timeline" might render as prose fallback

  let componentVarietyScore = 0;

  // Calculate ACTUAL prose ratio based on sections that rendered as plain paragraphs
  const actualProseRatio = sectionCount > 0 ? plainParagraphSections / sectionCount : 1;

  // Also check if declared visual components actually rendered
  const declaredVisualsButRenderedAsProse = declaredVisuals > 0 && totalActualVisuals === 0;

  // Critical: Components declared but not actually rendered
  if (declaredVisualsButRenderedAsProse) {
    issues.push({
      id: 'visual-components-not-rendered',
      category: 'component',
      severity: 'critical',
      title: 'Visual components falling back to plain text',
      description: `${declaredVisuals} sections are configured as visual components (timeline, feature-grid, etc.) but rendered as plain text. This happens when content lacks structured data like bullet points or numbered lists.`,
      currentState: `${declaredVisuals} declared visual components rendered as prose (0 actual visual structures found)`,
      recommendation: 'The content needs to be restructured with bullet points, numbered lists, or explicit markers that the component renderer can parse. Alternatively, regenerate with AI to add proper list structure.',
      canAutoFix: true,
      fixLevel: 'output', // This is content structure issue, not layout/brand
      autoFixPrompt: 'The visual components (timelines, feature grids, step lists, etc.) are configured but the content lacks proper structure for rendering. Restructure the content to use explicit bullet points for features, numbered lists for steps, and clear question/answer formatting for FAQs. Each section that should be a timeline needs items like: "1. First step... 2. Second step...". Feature grids need bullet lists with feature descriptions.',
      manualSteps: [
        'Identify timeline sections → ensure content has numbered steps (1. 2. 3.)',
        'Identify feature-grid sections → convert paragraphs to bullet point lists',
        'Identify step-list sections → use explicit numbered format',
        'Identify stat-highlight sections → format as "95% - Description" or bullet list',
        'Ensure each visual component has parseable list structure'
      ]
    });
    componentVarietyScore = 5; // Critical failure - visual components declared but none rendered
  } else if (actualProseRatio > 0.8) {
    issues.push({
      id: 'too-much-prose',
      category: 'component',
      severity: 'critical',
      title: 'Content is mostly plain text blocks',
      description: `${Math.round(actualProseRatio * 100)}% of sections are plain prose. Professional designs use diverse visual components to break up text and highlight key information.`,
      currentState: `${plainParagraphSections} of ${sectionCount} sections are plain text (only ${totalActualVisuals} visual component structures found)`,
      recommendation: 'Transform key sections into visual components: timelines for processes, feature grids for benefits, stat highlights for metrics, and checklists for requirements.',
      canAutoFix: true,
      fixLevel: 'layout', // Affects layout patterns for content structure
      autoFixPrompt: 'Analyze this content and convert appropriate prose sections into visual components. Use timelines for sequential processes, feature grids for lists of benefits or capabilities, stat highlights for important metrics, checklists for requirements, and key-takeaways boxes for conclusions. IMPORTANT: Ensure the content is structured with bullet points or numbered lists so the component renderer can parse it.',
      layoutFixPrompt: 'Update layout blueprint component selection rules: reduce prose usage to max 30% of sections, prioritize timeline for process content, feature-grid for lists, stat-highlight for metrics.',
      manualSteps: [
        'Identify sections that describe processes → convert to timeline with numbered steps',
        'Find lists of features/benefits → convert to feature-grid with bullet points',
        'Locate statistics or metrics → convert to stat-highlight with "value - label" format',
        'Find requirements or checklists → convert to checklist with bullet points',
        'Add key-takeaways box at the end of major sections'
      ]
    });
    componentVarietyScore = 10; // >80% prose is very poor
  } else if (actualProseRatio > 0.6) {
    issues.push({
      id: 'moderate-prose',
      category: 'component',
      severity: 'major',
      title: 'Limited component variety',
      description: 'While some visual components are used, more variety would improve engagement and readability.',
      currentState: `${totalActualVisuals} visual component structures found, ${plainParagraphSections} prose sections`,
      recommendation: 'Add more visual interest with stat highlights for key metrics, blockquotes for important statements, and feature grids for grouped content.',
      canAutoFix: true,
      fixLevel: 'layout', // Update layout component selection
      autoFixPrompt: 'Add more visual variety to this content. Insert stat highlights for key metrics, use blockquotes for important statements, and convert grouped items to feature grids. Focus on sections that currently feel text-heavy. Ensure all content has proper list structure for parsing.',
      layoutFixPrompt: 'Increase component variety in layout patterns: add stat-highlight and blockquote components to preferred components list.'
    });
    componentVarietyScore = 30; // 60-80% prose is below target
  } else {
    // Good: actual visual components are rendering
    const actualVisualCount = Object.entries(actualVisualComponents).filter(([_, v]) => v > 0).length;
    strengths.push(`Good component variety with ${actualVisualCount} different visual component types actually rendered`);
    componentVarietyScore = 80;
  }

  // Bonus for specific components - BUT only if they actually rendered with visual structures
  // (not just declared in data-component attributes)
  if (hasStyledLists && actualVisualComponents.featureGrid > 0) componentVarietyScore += 5;
  if (hasStats && actualVisualComponents.statHighlight > 0) componentVarietyScore += 5;
  if (hasQuotes && actualVisualComponents.testimonial > 0) componentVarietyScore += 3;
  if (hasFaq && actualVisualComponents.faq > 0) componentVarietyScore += 5;

  // If visual components declared but none rendered, cap at 10 regardless of bonuses
  if (declaredVisualsButRenderedAsProse) {
    componentVarietyScore = Math.min(componentVarietyScore, 10);
  }

  componentVarietyScore = Math.min(100, componentVarietyScore);

  // ============================================================================
  // VISUAL HIERARCHY ASSESSMENT
  // ============================================================================

  let visualHierarchyScore = 0;

  // Check hero presence
  if (!hasHero && sectionCount > 5) {
    issues.push({
      id: 'missing-hero',
      category: 'hierarchy',
      severity: 'critical',
      title: 'No hero section',
      description: 'Professional articles start with a visually impactful hero section that sets the tone and captures attention.',
      currentState: 'Article starts without visual impact',
      recommendation: 'Add a hero section with a bold headline, brief intro, and optionally a key statistic or visual element.',
      canAutoFix: true,
      fixLevel: 'all', // Needs both layout (hero structure) and brand (hero styling)
      autoFixPrompt: 'Add a compelling hero section at the start of this article. Include the main headline with large typography, a brief 1-2 sentence hook, and if appropriate, a key statistic or visual element. Use gradient background or brand colors for impact.',
      layoutFixPrompt: 'Add hero section to layout blueprint defaults for all articles. Set first section emphasis to "hero" level.',
      brandFixPrompt: 'Ensure brand design system includes hero component styling with gradient backgrounds using brand colors.',
      manualSteps: [
        'Go to Layout step and enable Hero section',
        'Configure hero with gradient background',
        'Add a compelling subtitle or key metric'
      ]
    });
    visualHierarchyScore = 35;
  } else if (hasHero) {
    strengths.push('Strong hero section establishes visual hierarchy');
    visualHierarchyScore = 70;
  } else {
    visualHierarchyScore = 50;
  }

  // Check emphasis distribution
  const totalEmphasis = Object.values(emphasisCounts).reduce((a, b) => a + b, 0);
  const featuredRatio = totalEmphasis > 0 ? (emphasisCounts.hero + emphasisCounts.featured) / totalEmphasis : 0;

  if (featuredRatio < 0.1 && sectionCount > 5) {
    issues.push({
      id: 'flat-hierarchy',
      category: 'hierarchy',
      severity: 'major',
      title: 'Visual hierarchy is flat',
      description: 'All sections have similar visual weight. Key information should stand out with featured styling.',
      currentState: `Only ${Math.round(featuredRatio * 100)}% of sections are emphasized`,
      recommendation: 'Identify 2-3 key sections and give them featured emphasis with colored backgrounds, larger headings, or accent borders.',
      canAutoFix: true,
      fixLevel: 'layout', // Emphasis is a layout decision
      autoFixPrompt: 'Analyze the content and identify the 2-3 most important sections. Apply featured emphasis to these with colored backgrounds, accent borders, or larger typography. The introduction, key findings, and conclusion typically deserve emphasis.',
      layoutFixPrompt: 'Update visual emphasis defaults: set 15-25% of sections to featured emphasis, targeting introduction, key findings, and conclusions.',
      manualSteps: [
        'Identify the most important 2-3 sections',
        'In Layout step, set these sections to "featured" emphasis',
        'Consider adding background colors or accent borders'
      ]
    });
    visualHierarchyScore = Math.max(visualHierarchyScore - 20, 30);
  } else if (featuredRatio > 0.1) {
    visualHierarchyScore += 15;
  }

  // Check for visual variety elements
  if (hasGradients || hasBackgrounds) visualHierarchyScore += 10;
  if (hasAccentBorders) visualHierarchyScore += 5;
  if (hasAnimations) visualHierarchyScore += 5;

  visualHierarchyScore = Math.min(100, visualHierarchyScore);

  // ============================================================================
  // BUSINESS FIT ASSESSMENT
  // ============================================================================

  let businessFitScore = 60; // Default baseline

  // Check CTAs for business context
  if (!hasCta && sectionCount > 3) {
    issues.push({
      id: 'missing-cta',
      category: 'business',
      severity: 'critical',
      title: 'No call-to-action elements',
      description: 'Business content should guide readers toward next steps. CTAs help convert readers into leads or customers.',
      currentState: 'No CTAs found in the content',
      recommendation: 'Add strategic CTAs: one after the introduction, one mid-content, and one at the conclusion. Match CTA style to the business model.',
      canAutoFix: true,
      fixLevel: 'all', // CTAs need layout positioning AND brand styling
      autoFixPrompt: `Add strategic call-to-action elements to this content. Place CTAs after the introduction, mid-content, and at the conclusion. The business is ${businessContext?.model || 'B2B'} in ${businessContext?.industry || 'technology'}. Use action-oriented text that matches the content context.`,
      layoutFixPrompt: 'Update layout defaults to include CTA banners at positions: after-intro, mid-content, end. Set CTA intensity based on business model.',
      brandFixPrompt: 'Ensure brand design system includes CTA button styling with proper brand colors, hover states, and contrast.',
      manualSteps: [
        'Go to Layout step and enable CTA banners',
        'Configure primary CTA text (e.g., "Get Started", "Contact Us")',
        'Set CTA positions: after-intro, mid-content, end'
      ]
    });
    businessFitScore = 40;
  } else if (ctaCount >= 2) {
    strengths.push('Strategic CTA placement guides user journey');
    businessFitScore = 80;
  }

  // Check if content matches business industry
  if (businessContext?.industry) {
    const industry = businessContext.industry.toLowerCase();

    // Security/tech industries should have checklists, technical data
    if ((industry.includes('security') || industry.includes('tech') || industry.includes('cyber')) && !hasStyledLists) {
      issues.push({
        id: 'industry-mismatch-security',
        category: 'business',
        severity: 'major',
        title: 'Missing technical credibility elements',
        description: 'Security and tech content needs checklists, specifications, and technical data presentation to establish credibility.',
        currentState: 'Content lacks technical presentation elements',
        recommendation: 'Add checklists for requirements/best practices, comparison tables for technologies, and stat highlights for metrics.',
        canAutoFix: true,
        fixLevel: 'layout', // Component selection is a layout decision
        autoFixPrompt: 'This is technical/security content. Add checklists for requirements and best practices, comparison tables where technologies are compared, and stat highlights for key metrics. Use professional, authoritative styling.',
        layoutFixPrompt: 'For technical/security content, prioritize checklist, comparison-table, and stat-highlight components. Increase component variety for authoritative appearance.',
      });
      businessFitScore -= 15;
    }
  }

  businessFitScore = Math.min(100, Math.max(0, businessFitScore));

  // ============================================================================
  // LAYOUT DESIGN ASSESSMENT
  // ============================================================================

  let layoutDesignScore = 50;

  // Check for width variety
  const widthMatches = html.match(/width-(narrow|medium|wide|full)/g) || [];
  const uniqueWidths = [...new Set(widthMatches)];

  if (uniqueWidths.length <= 1 && sectionCount > 5) {
    issues.push({
      id: 'monotonous-widths',
      category: 'layout',
      severity: 'minor',
      title: 'Monotonous section widths',
      description: 'All sections use the same width. Varying widths creates visual rhythm and helps important content stand out.',
      currentState: `Only ${uniqueWidths.length} width variation${uniqueWidths.length !== 1 ? 's' : ''}`,
      recommendation: 'Use full-width for hero sections, wide for featured content, and medium for standard text to create visual rhythm.',
      canAutoFix: true,
      fixLevel: 'layout', // Width is a layout decision
      autoFixPrompt: 'Vary the section widths to create visual rhythm. Use full-width for the hero, wide for featured sections, medium for standard content, and narrow for focused text like quotes. This creates visual interest and guides the reader.',
      layoutFixPrompt: 'Update width rules: hero=full, featured=wide, standard=medium, quotes=narrow. Aim for 3+ width variations per article.'
    });
    layoutDesignScore = 40;
  } else {
    layoutDesignScore = 65;
  }

  // Check for column variety
  const hasMultiColumn = html.includes('columns-2') || html.includes('columns-3') || html.includes('grid-cols');

  if (!hasMultiColumn && sectionCount > 8) {
    issues.push({
      id: 'single-column-only',
      category: 'layout',
      severity: 'major',
      title: 'Single-column layout throughout',
      description: 'All content is in a single column. Multi-column layouts help present related information side-by-side and improve scannability.',
      currentState: 'No multi-column sections found',
      recommendation: 'Use 2-column layouts for comparisons, 3-column grids for feature cards, and asymmetric layouts for featured content with sidebar elements.',
      canAutoFix: true,
      fixLevel: 'layout', // Column structure is a layout decision
      autoFixPrompt: 'Add multi-column layouts where appropriate. Use 2-column for before/after comparisons, 3-column grids for features or services, and asymmetric layouts for content with supporting sidebar information. This improves visual interest and information density.',
      layoutFixPrompt: 'Enable multi-column layouts: feature-grid uses 3-column, comparisons use 2-column, asymmetric for sidebar content. Aim for at least 20% of sections to be multi-column.',
      manualSteps: [
        'Identify content that can be displayed side-by-side',
        'Convert feature lists to 3-column grids',
        'Use 2-column for comparison content'
      ]
    });
    layoutDesignScore -= 20;
  } else if (hasMultiColumn) {
    strengths.push('Multi-column layouts improve content density');
    layoutDesignScore += 20;
  }

  layoutDesignScore = Math.min(100, Math.max(0, layoutDesignScore));

  // ============================================================================
  // ENGAGEMENT ASSESSMENT
  // ============================================================================

  let engagementScore = 50;

  // Check for interactive elements
  if (hasFaq) {
    strengths.push('FAQ accordion increases engagement');
    engagementScore += 15;
  }

  // Check for visual breaks
  const visualBreakCount = (hasStats ? 1 : 0) + (hasQuotes ? 1 : 0) + (hasKeyTakeaways ? 1 : 0);

  if (visualBreakCount === 0 && sectionCount > 6) {
    issues.push({
      id: 'no-visual-breaks',
      category: 'engagement',
      severity: 'major',
      title: 'No visual break elements',
      description: 'Long content needs visual breaks like pull quotes, stat highlights, or key takeaway boxes to maintain reader engagement.',
      currentState: 'No visual break elements found',
      recommendation: 'Add stat highlights for important numbers, pull quotes for key statements, and key-takeaway boxes to summarize sections.',
      canAutoFix: true,
      fixLevel: 'all', // Needs layout (component placement) AND brand (styling)
      autoFixPrompt: 'Add visual break elements throughout this content. Insert stat highlights for important metrics or numbers, pull quotes for impactful statements, and key-takeaway boxes at the end of major sections. These help readers scan and remember key information.',
      layoutFixPrompt: 'Add visual break components every 3-4 sections: stat-highlight for metrics, blockquote for statements, key-takeaways at section ends.',
      brandFixPrompt: 'Ensure brand design system has styled stat-highlight, blockquote, and key-takeaways components with appropriate brand colors.',
      manualSteps: [
        'Identify key statistics → convert to stat highlights',
        'Find impactful quotes → add as blockquotes',
        'Summarize each major section with key-takeaway box'
      ]
    });
    engagementScore = 35;
  } else {
    engagementScore += visualBreakCount * 10;
  }

  // Check for table of contents
  const hasToc = html.includes('ctc-toc') || html.includes('table-of-contents');
  if (hasToc) {
    strengths.push('Table of contents aids navigation');
    engagementScore += 10;
  } else if (sectionCount > 10) {
    issues.push({
      id: 'missing-toc',
      category: 'engagement',
      severity: 'minor',
      title: 'No table of contents',
      description: 'Long articles benefit from a table of contents for easy navigation.',
      currentState: 'No TOC found',
      recommendation: 'Add a table of contents at the beginning to help readers navigate.',
      canAutoFix: true,
      fixLevel: 'layout', // TOC is a layout structure decision
      autoFixPrompt: 'Add a table of contents after the introduction that links to all major sections. Style it to match the brand.',
      layoutFixPrompt: 'Enable TOC generation for articles with 8+ sections. Place after hero/intro section.',
    });
    engagementScore -= 5;
  }

  engagementScore = Math.min(100, Math.max(0, engagementScore));

  // ============================================================================
  // BRAND CONSISTENCY ASSESSMENT
  // ============================================================================

  let brandConsistencyScore = 60;

  // Check if CSS variables are used
  const usesVariables = css.includes('--ctc-') || css.includes('var(--');
  if (usesVariables) {
    brandConsistencyScore = 75;
    strengths.push('Consistent use of brand CSS variables');
  }

  // Check for consistent component styling
  const hasCtcClasses = html.includes('ctc-');
  if (hasCtcClasses) {
    brandConsistencyScore += 10;
  }

  // Validate that CSS actually contains visual styles for rendered HTML elements
  // We check not just for selector presence, but for VISUAL properties (background, border, box-shadow)
  // vs purely structural properties (display, flex, gap, padding)
  const visualCssProperties = ['background', 'border', 'box-shadow', 'color:', 'gradient'];
  const componentCssChecks = [
    { htmlClass: 'feature-card', cssSelector: '.feature-card' },
    { htmlClass: 'timeline-item', cssSelector: '.timeline-item' },
    { htmlClass: 'step-item', cssSelector: '.step-item' },
    { htmlClass: 'faq-item', cssSelector: '.faq-item' },
    { htmlClass: 'stat-item', cssSelector: '.stat-item' },
    { htmlClass: 'checklist-item', cssSelector: '.checklist-item' },
  ];

  let styledComponentCount = 0;
  let unstyledComponentCount = 0;
  let structuralOnlyComponentCount = 0;
  for (const check of componentCssChecks) {
    if (html.includes(check.htmlClass)) {
      if (css.includes(check.cssSelector)) {
        // Check if the CSS rule for this selector contains VISUAL properties
        // Extract the CSS rule block for this selector
        const selectorEscaped = check.cssSelector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const ruleRegex = new RegExp(selectorEscaped + '\\s*\\{([^}]+)\\}', 'g');
        const ruleMatches = [...css.matchAll(ruleRegex)];
        const allRuleContent = ruleMatches.map(m => m[1]).join(' ');

        const hasVisualProperty = visualCssProperties.some(prop => allRuleContent.includes(prop));
        if (hasVisualProperty) {
          styledComponentCount++;
        } else {
          structuralOnlyComponentCount++;
        }
      } else {
        unstyledComponentCount++;
      }
    }
  }

  if (unstyledComponentCount > 0 && styledComponentCount === 0) {
    issues.push({
      id: 'unstyled-components',
      category: 'branding',
      severity: 'critical',
      title: 'Visual components have no CSS styling',
      description: `${unstyledComponentCount} component type(s) exist in HTML but have no matching CSS rules. Components will render as plain unstyled text.`,
      currentState: `${unstyledComponentCount} component types without CSS styles`,
      recommendation: 'Ensure the CSS pipeline includes component visual styles (backgrounds, borders, colors) alongside structural CSS.',
      canAutoFix: false,
      fixLevel: 'brand',
    });
    brandConsistencyScore = Math.max(brandConsistencyScore - 25, 10);
  } else if (structuralOnlyComponentCount > 0 && styledComponentCount === 0) {
    issues.push({
      id: 'css-structural-only',
      category: 'branding',
      severity: 'critical',
      title: 'Component CSS contains only structural properties',
      description: `${structuralOnlyComponentCount} component type(s) have CSS rules but they only contain structural properties (display, flex, gap) without visual styling (background, border, box-shadow). Components will look unstyled.`,
      currentState: `${structuralOnlyComponentCount} component types with structural-only CSS (no backgrounds, borders, or shadows)`,
      recommendation: 'Add visual CSS properties (background, border, box-shadow, color) to component style rules. Structural CSS alone does not create visual design.',
      canAutoFix: false,
      fixLevel: 'brand',
    });
    brandConsistencyScore = Math.max(brandConsistencyScore - 20, 15);
  } else if (styledComponentCount > 0) {
    brandConsistencyScore += 5;
  }

  // Check that brand colors appear in CSS values (not just declarations)
  const hexColorPattern = /#[0-9a-fA-F]{3,8}/g;
  const cssColors = css.match(hexColorPattern) || [];
  const uniqueCssColors = [...new Set(cssColors.map(c => c.toLowerCase()))];
  if (uniqueCssColors.length < 3) {
    brandConsistencyScore = Math.max(brandConsistencyScore - 10, 10);
  }

  brandConsistencyScore = Math.min(100, brandConsistencyScore);

  // ============================================================================
  // CALCULATE OVERALL SCORE
  // ============================================================================

  const categoryScores = {
    componentVariety: componentVarietyScore,
    visualHierarchy: visualHierarchyScore,
    businessFit: businessFitScore,
    layoutDesign: layoutDesignScore,
    engagement: engagementScore,
    brandConsistency: brandConsistencyScore,
  };

  // Weighted average - prioritize component variety and visual hierarchy
  const weights = {
    componentVariety: 0.25,
    visualHierarchy: 0.20,
    businessFit: 0.10,
    layoutDesign: 0.20,
    engagement: 0.15,
    brandConsistency: 0.10,
  };

  const overallScore = Math.round(
    Object.entries(categoryScores).reduce(
      (sum, [key, score]) => sum + score * (weights[key as keyof typeof weights] || 0),
      0
    )
  );

  // Determine recommendation
  let recommendation: DesignQualityResult['recommendation'];
  if (overallScore >= 80) {
    recommendation = 'excellent';
  } else if (overallScore >= 65) {
    recommendation = 'good';
  } else if (overallScore >= 45) {
    recommendation = 'needs-improvement';
  } else {
    recommendation = 'rework-recommended';
  }

  // Generate summary
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const majorCount = issues.filter(i => i.severity === 'major').length;

  let summary = '';
  if (criticalCount > 0) {
    summary = `Found ${criticalCount} critical issue${criticalCount > 1 ? 's' : ''} that significantly impact design quality. `;
  }
  if (majorCount > 0) {
    summary += `${majorCount} major improvement${majorCount > 1 ? 's' : ''} recommended. `;
  }
  if (strengths.length > 0) {
    summary += `Strengths: ${strengths.slice(0, 2).join(', ')}.`;
  }
  if (!summary) {
    summary = 'Design meets professional quality standards.';
  }

  return {
    overallScore,
    categoryScores,
    issues: issues.sort((a, b) => {
      const severityOrder = { critical: 0, major: 1, minor: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    }),
    strengths,
    summary,
    recommendation,
  };
}

// ============================================================================
// Component
// ============================================================================

export const DesignQualityAssessment: React.FC<DesignQualityAssessmentProps> = ({
  html,
  css,
  businessContext,
  contentContext,
  onAutoFix,
  onRegenerateWithInstructions,
  isFixing = false,
  onScoreCalculated,
}) => {
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  const [fixingIssue, setFixingIssue] = useState<string | null>(null);
  const [showAllIssues, setShowAllIssues] = useState(false);

  // Analyze design quality
  const assessment = useMemo(
    () => analyzeDesignQuality(html, css, businessContext, contentContext),
    [html, css, businessContext, contentContext]
  );

  // Notify parent of score when assessment changes
  useEffect(() => {
    onScoreCalculated?.(assessment);
  }, [assessment, onScoreCalculated]);

  // Handle auto-fix
  const handleAutoFix = useCallback(async (issue: DesignIssue) => {
    if (!onAutoFix) return;
    setFixingIssue(issue.id);
    try {
      await onAutoFix(issue);
    } finally {
      setFixingIssue(null);
    }
  }, [onAutoFix]);

  // Handle regenerate with all fixes
  const handleRegenerateWithFixes = useCallback(async () => {
    if (!onRegenerateWithInstructions) return;

    const criticalAndMajor = assessment.issues.filter(i => i.severity !== 'minor');
    const instructions = criticalAndMajor
      .filter(i => i.canAutoFix && i.autoFixPrompt)
      .map(i => i.autoFixPrompt)
      .join('\n\n');

    await onRegenerateWithInstructions(instructions);
  }, [assessment.issues, onRegenerateWithInstructions]);

  // Colors based on score
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-900/30 border-green-500/30';
    if (score >= 60) return 'bg-yellow-900/30 border-yellow-500/30';
    if (score >= 40) return 'bg-orange-900/30 border-orange-500/30';
    return 'bg-red-900/30 border-red-500/30';
  };

  const getSeverityColor = (severity: DesignIssue['severity']) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-900/30 border-red-500/30';
      case 'major': return 'text-orange-400 bg-orange-900/30 border-orange-500/30';
      case 'minor': return 'text-yellow-400 bg-yellow-900/30 border-yellow-500/30';
    }
  };

  const displayedIssues = showAllIssues ? assessment.issues : assessment.issues.slice(0, 3);
  const hiddenCount = assessment.issues.length - displayedIssues.length;

  return (
    <div className="space-y-4">
      {/* Overall Score Header */}
      <div className={`p-4 rounded-lg border ${getScoreBg(assessment.overallScore)}`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className={`text-3xl font-bold ${getScoreColor(assessment.overallScore)}`}>
                {assessment.overallScore}%
              </div>
              <div>
                <h3 className="text-white font-medium">Design Quality Score</h3>
                <p className="text-sm text-zinc-400">{assessment.summary}</p>
              </div>
            </div>
          </div>

          {/* Quick action button */}
          {assessment.recommendation === 'rework-recommended' && onRegenerateWithInstructions && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRegenerateWithFixes}
              disabled={isFixing}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              {isFixing ? 'Fixing...' : '🔧 Fix All Issues with AI'}
            </Button>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {Object.entries(assessment.categoryScores).map(([key, score]) => {
            const labels: Record<string, string> = {
              componentVariety: 'Component Variety',
              visualHierarchy: 'Visual Hierarchy',
              businessFit: 'Business Fit',
              layoutDesign: 'Layout Design',
              engagement: 'Engagement',
              brandConsistency: 'Brand Consistency',
            };
            return (
              <div key={key} className="text-center">
                <div className={`text-lg font-semibold ${getScoreColor(score)}`}>{score}%</div>
                <div className="text-xs text-zinc-500">{labels[key]}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step-by-Step Improvement Guide */}
      {assessment.issues.length > 0 && (
        <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
          <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
            <span>📋</span>
            Step-by-Step Improvement Guide
          </h4>

          <div className="space-y-3">
            {displayedIssues.map((issue, index) => (
              <div
                key={issue.id}
                className={`p-3 rounded-lg border ${getSeverityColor(issue.severity)}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium uppercase opacity-75">
                        Step {index + 1} • {issue.severity}
                      </span>
                    </div>
                    <h5 className="font-medium mt-1">{issue.title}</h5>
                    <p className="text-sm opacity-80 mt-1">{issue.description}</p>

                    {/* Expanded details */}
                    {expandedIssue === issue.id && (
                      <div className="mt-3 space-y-2 text-sm">
                        <div className="p-2 bg-black/20 rounded">
                          <div className="text-xs text-zinc-500 uppercase mb-1">Current State</div>
                          <div>{issue.currentState}</div>
                        </div>
                        <div className="p-2 bg-black/20 rounded">
                          <div className="text-xs text-zinc-500 uppercase mb-1">Recommendation</div>
                          <div>{issue.recommendation}</div>
                        </div>
                        {issue.manualSteps && (
                          <div className="p-2 bg-black/20 rounded">
                            <div className="text-xs text-zinc-500 uppercase mb-1">Manual Steps</div>
                            <ol className="list-decimal list-inside space-y-1">
                              {issue.manualSteps.map((step, i) => (
                                <li key={i} className="text-zinc-300">{step}</li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setExpandedIssue(expandedIssue === issue.id ? null : issue.id)}
                      className="px-2 py-1 text-xs rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
                    >
                      {expandedIssue === issue.id ? 'Less' : 'More'}
                    </button>
                    {issue.canAutoFix && onAutoFix && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleAutoFix(issue)}
                        disabled={isFixing || fixingIssue === issue.id}
                        className="text-xs whitespace-nowrap"
                      >
                        {fixingIssue === issue.id ? '...' : '🤖 Fix'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAllIssues(true)}
                className="w-full py-2 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Show {hiddenCount} more issue{hiddenCount > 1 ? 's' : ''}...
              </button>
            )}
          </div>
        </div>
      )}

      {/* Strengths */}
      {assessment.strengths.length > 0 && (
        <div className="p-3 bg-green-900/20 rounded-lg border border-green-500/20">
          <h4 className="text-sm font-medium text-green-400 mb-2">✓ Strengths</h4>
          <ul className="space-y-1">
            {assessment.strengths.map((strength, i) => (
              <li key={i} className="text-sm text-green-300/80 flex items-start gap-2">
                <span>•</span>
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default DesignQualityAssessment;
