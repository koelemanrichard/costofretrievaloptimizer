/**
 * Money Page 4 Pillars Configuration
 * Based on Koray Tugberk GÜBÜR's Semantic SEO Framework
 *
 * The 4 Pillars for commercial/transactional page optimization:
 * 1. Verbalization - Sales psychology language, benefit-focused copy
 * 2. Contextualization - Bridge from macro (industry) to micro (specific solution)
 * 3. Monetization - Clear value exchange, CTAs, pricing psychology
 * 4. Visualization - Visual proof (testimonials, before/after, trust badges)
 */

import type { MoneyPagePillar, PillarChecklistItem, MoneyPagePillarsConfig } from '../types';

/**
 * Complete checklist items for each pillar
 */
export const PILLAR_CHECKLISTS: Record<MoneyPagePillar, Omit<PillarChecklistItem, 'checked'>[]> = {
  verbalization: [
    // Headline & Copy
    { id: 'v1', label: 'Benefit-focused headline', description: 'Main headline emphasizes outcome/benefit, not just feature', weight: 15, category: 'headlines' },
    { id: 'v2', label: 'Power words in H1/H2', description: 'Uses persuasive language: "proven", "guaranteed", "exclusive"', weight: 10, category: 'headlines' },
    { id: 'v3', label: 'Subheadline supports main claim', description: 'Secondary headline reinforces or expands the primary benefit', weight: 8, category: 'headlines' },

    // Sales Psychology
    { id: 'v4', label: 'Social proof language', description: 'References to "thousands of customers", ratings, testimonials', weight: 12, category: 'psychology' },
    { id: 'v5', label: 'Urgency triggers', description: 'Time-sensitive language: "limited time", "today only", "act now"', weight: 8, category: 'psychology' },
    { id: 'v6', label: 'Scarcity indicators', description: 'Availability messaging: "only X left", "limited spots"', weight: 7, category: 'psychology' },
    { id: 'v7', label: 'Risk reversal language', description: 'Money-back guarantee, free trial, no-commitment messaging', weight: 10, category: 'psychology' },

    // Benefit Communication
    { id: 'v8', label: 'Features translated to benefits', description: 'Every feature is connected to a customer outcome', weight: 12, category: 'benefits' },
    { id: 'v9', label: 'Problem agitation', description: 'Acknowledges pain points before presenting solution', weight: 10, category: 'benefits' },
    { id: 'v10', label: 'Outcome visualization', description: 'Helps reader imagine success after using product/service', weight: 8, category: 'benefits' },
  ],

  contextualization: [
    // Market Context
    { id: 'c1', label: 'Industry context established', description: 'Opens with macro-level industry/market understanding', weight: 15, category: 'market' },
    { id: 'c2', label: 'Problem landscape defined', description: 'Clearly explains the problem space before solution', weight: 12, category: 'market' },
    { id: 'c3', label: 'Target audience identified', description: 'Content speaks directly to specific audience segment', weight: 10, category: 'market' },

    // Differentiation
    { id: 'c4', label: 'Competitor differentiation', description: 'Explains why this solution vs alternatives', weight: 12, category: 'differentiation' },
    { id: 'c5', label: 'Unique value proposition clear', description: 'One clear statement of what makes this different', weight: 15, category: 'differentiation' },
    { id: 'c6', label: 'Use case specificity', description: 'Explains specific scenarios where solution excels', weight: 10, category: 'differentiation' },

    // Authority Bridge
    { id: 'c7', label: 'Expert positioning', description: 'Establishes expertise/authority in the problem space', weight: 10, category: 'authority' },
    { id: 'c8', label: 'Methodology explanation', description: 'Explains how/why the solution works', weight: 8, category: 'authority' },
    { id: 'c9', label: 'Results/data backed claims', description: 'Statistics, studies, or case results support claims', weight: 8, category: 'authority' },
  ],

  monetization: [
    // CTA Strategy
    { id: 'm1', label: 'Primary CTA above fold', description: 'Main conversion action visible without scrolling', weight: 18, category: 'cta' },
    { id: 'm2', label: 'Multiple CTA placements', description: 'CTA repeated at strategic points throughout page', weight: 12, category: 'cta' },
    { id: 'm3', label: 'CTA action-oriented copy', description: 'Button text is specific: "Get Free Quote" vs "Submit"', weight: 10, category: 'cta' },
    { id: 'm4', label: 'Secondary CTA option', description: 'Lower commitment alternative for hesitant visitors', weight: 8, category: 'cta' },

    // Value Exchange
    { id: 'm5', label: 'Clear pricing/value proposition', description: 'Cost or value clearly communicated upfront', weight: 15, category: 'value' },
    { id: 'm6', label: 'ROI or value justification', description: 'Explains why the price is worth it', weight: 10, category: 'value' },
    { id: 'm7', label: 'Pricing psychology elements', description: 'Anchoring, bundling, or tier comparison', weight: 8, category: 'value' },

    // Conversion Elements
    { id: 'm8', label: 'Lead capture form', description: 'Form present for capturing leads/conversions', weight: 10, category: 'conversion' },
    { id: 'm9', label: 'Contact information visible', description: 'Phone, email, or chat easily accessible', weight: 5, category: 'conversion' },
    { id: 'm10', label: 'Checkout/booking flow clear', description: 'Next steps after CTA are obvious and simple', weight: 4, category: 'conversion' },

    // FAQ PageRank Strategy (Koray's methodology)
    { id: 'm11', label: 'FAQ section for PageRank flow', description: 'FAQ answers broader questions to capture additional queries without diluting main content', weight: 8, category: 'faq' },
    { id: 'm12', label: 'FAQ with internal links', description: 'FAQ answers link to relevant pages, distributing PageRank to supporting content', weight: 6, category: 'faq' },
    { id: 'm13', label: 'FAQPage schema markup', description: 'Structured data for FAQ section to enable rich results in SERP', weight: 5, category: 'faq' },
  ],

  visualization: [
    // Visual Proof
    { id: 'vis1', label: 'Hero image with entity relevance', description: 'Primary image reinforces page topic and entities', weight: 15, category: 'proof' },
    { id: 'vis2', label: 'Trust badges/certifications', description: 'Security seals, industry certifications, awards', weight: 12, category: 'proof' },
    { id: 'vis3', label: 'Customer testimonials with photos', description: 'Real testimonials with names/photos/companies', weight: 12, category: 'proof' },
    { id: 'vis4', label: 'Before/after or process visuals', description: 'Shows transformation or methodology', weight: 10, category: 'proof' },
    { id: 'vis5', label: 'Logo wall of clients/partners', description: 'Displays well-known clients or partnerships', weight: 8, category: 'proof' },

    // Product Visualization
    { id: 'vis6', label: 'Product/service screenshots', description: 'Clear visuals of what customer gets', weight: 10, category: 'product' },
    { id: 'vis7', label: 'Demo video or walkthrough', description: 'Video content showing product in action', weight: 10, category: 'product' },
    { id: 'vis8', label: 'Comparison tables/charts', description: 'Visual comparison of options or competitors', weight: 8, category: 'product' },

    // Brand Elements
    { id: 'vis9', label: 'Consistent brand imagery', description: 'Images align with brand colors and style', weight: 8, category: 'brand' },
    { id: 'vis10', label: 'Professional visual quality', description: 'High-quality images, not stock-looking', weight: 7, category: 'brand' },
  ],
};

/**
 * Critical items that MUST be present for a passing score
 */
export const CRITICAL_ITEMS: string[] = [
  'v1',   // Benefit-focused headline
  'c5',   // Unique value proposition
  'm1',   // Primary CTA above fold
  'vis1', // Hero image with entity relevance
];

/**
 * Default configuration for 4 Pillars analysis
 */
export const DEFAULT_PILLARS_CONFIG: MoneyPagePillarsConfig = {
  weights: {
    verbalization: 25,
    contextualization: 25,
    monetization: 30,
    visualization: 20,
  },
  passing_threshold: 70,
  critical_items: CRITICAL_ITEMS,
};

/**
 * Pillar descriptions for UI display
 */
export const PILLAR_DESCRIPTIONS: Record<MoneyPagePillar, { title: string; description: string; icon: string }> = {
  verbalization: {
    title: 'Verbalization',
    description: 'Sales psychology language and benefit-focused copy that persuades and converts',
    icon: '💬',
  },
  contextualization: {
    title: 'Contextualization',
    description: 'Bridge from macro industry context to your specific micro solution',
    icon: '🎯',
  },
  monetization: {
    title: 'Monetization',
    description: 'Clear value exchange, compelling CTAs, and pricing psychology',
    icon: '💰',
  },
  visualization: {
    title: 'Visualization',
    description: 'Visual proof elements: testimonials, before/after, trust badges',
    icon: '👁️',
  },
};

/**
 * Grade thresholds for overall score
 */
export const GRADE_THRESHOLDS = {
  A: 90,
  B: 80,
  C: 70,
  D: 60,
  F: 0,
} as const;

/**
 * Get grade letter from score
 */
export function getGradeFromScore(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= GRADE_THRESHOLDS.A) return 'A';
  if (score >= GRADE_THRESHOLDS.B) return 'B';
  if (score >= GRADE_THRESHOLDS.C) return 'C';
  if (score >= GRADE_THRESHOLDS.D) return 'D';
  return 'F';
}

/**
 * Improvement suggestions based on missing items
 */
export const IMPROVEMENT_SUGGESTIONS: Record<string, string> = {
  v1: 'Rewrite your headline to focus on the primary benefit customers will receive, not just features.',
  v4: 'Add social proof: customer counts, ratings, or brief testimonials near the top of the page.',
  v7: 'Include a risk-reversal element like "30-day money-back guarantee" or "Free trial, no credit card required".',
  c1: 'Open with a paragraph establishing the broader industry context before introducing your solution.',
  c4: 'Add a "Why Us" or "How We\'re Different" section comparing your approach to alternatives.',
  c5: 'Create a clear, one-sentence unique value proposition and make it prominent.',
  m1: 'Move your primary call-to-action button above the fold so visitors see it immediately.',
  m2: 'Add additional CTA buttons after key sections and at the bottom of the page.',
  m5: 'Be transparent about pricing or provide a clear next step to learn about costs.',
  m11: 'Add an FAQ section answering broader questions related to your service - this captures additional queries and passes PageRank without diluting your main content. Use questions slightly beyond the page\'s core topic.',
  m12: 'Include internal links within FAQ answers to relevant supporting pages. This distributes PageRank and helps users find related information while keeping them on your site.',
  m13: 'Add FAQPage schema markup to your FAQ section for rich results in Google. Use the @type FAQPage with Question and acceptedAnswer properties.',
  vis1: 'Replace generic images with visuals that directly relate to your product/service and target entities.',
  vis2: 'Add trust badges: security seals, certifications, or "As seen in" logos.',
  vis3: 'Include customer testimonials with real names and photos for authenticity.',
};

/**
 * FAQ PageRank Strategy Guidelines
 * Based on Koray's methodology for money pages
 */
export const FAQ_PAGERANK_GUIDELINES = {
  purpose: 'FAQ sections on money pages serve dual purpose: capture related queries AND distribute PageRank to supporting content without diluting commercial intent.',

  questionSelection: [
    'Answer questions slightly BROADER than the page\'s core topic',
    'Include questions that naturally lead to related content',
    'Address common objections that might prevent conversion',
    'Cover "before" and "after" stages of the customer journey',
  ],

  linkingStrategy: [
    'Each FAQ answer should contain 1-2 internal links to relevant pages',
    'Link to informational content from FAQ answers (passes PageRank to authority pages)',
    'Use descriptive anchor text that reinforces page topics',
    'Avoid linking to competitor comparison pages from commercial FAQ',
  ],

  schemaImplementation: {
    type: 'FAQPage',
    required: ['@type', 'mainEntity'],
    questionFormat: {
      '@type': 'Question',
      name: 'Question text here',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Answer text with links here',
      },
    },
  },

  example: {
    pageType: 'Service page for "Plumber in Amsterdam"',
    faqQuestions: [
      'How do I know if I need emergency plumbing?',
      'What should I check before calling a plumber?',
      'How often should pipes be inspected?',
      'What are signs of a hidden water leak?',
    ],
    linkTargets: [
      'Emergency plumbing guide (informational)',
      'DIY plumbing checklist (informational)',
      'Pipe maintenance schedule (informational)',
      'Water leak detection methods (informational)',
    ],
  },
};
