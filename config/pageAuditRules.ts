// config/pageAuditRules.ts
// Audit rules based on Koray's Holistic SEO Framework

export interface AuditRule {
  id: string;
  phase: 'technical' | 'semantic' | 'linkStructure' | 'contentQuality' | 'visualSchema';
  name: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';

  // Threshold configuration
  threshold?: {
    type: 'max' | 'min' | 'range' | 'boolean' | 'ai';
    value?: number;
    min?: number;
    max?: number;
    unit?: string;
  };

  // Remediation template
  remediation: string;

  // Impact on scoring (weight)
  weight: number;
}

// ============================================
// PHASE 0: TECHNICAL (Cost of Retrieval)
// ============================================

export const TECHNICAL_RULES: AuditRule[] = [
  {
    id: 'tech-ttfb',
    phase: 'technical',
    name: 'Time to First Byte (TTFB)',
    description: 'Server response time should be under 200ms (optimal < 100ms)',
    priority: 'critical',
    threshold: { type: 'max', value: 200, unit: 'ms' },
    remediation: 'Optimize server response time, consider CDN, enable caching, upgrade hosting',
    weight: 20,
  },
  {
    id: 'tech-dom-size',
    phase: 'technical',
    name: 'DOM Size',
    description: 'Document Object Model should have fewer than 1500 nodes',
    priority: 'high',
    threshold: { type: 'max', value: 1500, unit: 'nodes' },
    remediation: 'Reduce DOM complexity, remove unnecessary elements, lazy-load content',
    weight: 15,
  },
  {
    id: 'tech-html-size',
    phase: 'technical',
    name: 'HTML Response Size',
    description: 'HTML document should be under 100KB for efficient crawling',
    priority: 'medium',
    threshold: { type: 'max', value: 100, unit: 'KB' },
    remediation: 'Minify HTML, remove inline styles/scripts, externalize resources',
    weight: 10,
  },
  {
    id: 'tech-status-code',
    phase: 'technical',
    name: 'HTTP Status Code',
    description: 'Page should return 200 OK status',
    priority: 'critical',
    threshold: { type: 'range', min: 200, max: 299 },
    remediation: 'Fix server errors, update redirects, ensure page is accessible',
    weight: 25,
  },
  {
    id: 'tech-canonical',
    phase: 'technical',
    name: 'Canonical Tag',
    description: 'Page should have a valid canonical tag',
    priority: 'high',
    threshold: { type: 'boolean' },
    remediation: 'Add canonical tag pointing to the preferred URL version',
    weight: 15,
  },
  {
    id: 'tech-robots',
    phase: 'technical',
    name: 'Robots Meta Tag',
    description: 'Page should be indexable (no noindex directive)',
    priority: 'critical',
    threshold: { type: 'boolean' },
    remediation: 'Remove noindex directive if page should be indexed',
    weight: 15,
  },
];

// ============================================
// PHASE 1: SEMANTIC FOUNDATION
// ============================================

export const SEMANTIC_RULES: AuditRule[] = [
  {
    id: 'sem-ce-presence',
    phase: 'semantic',
    name: 'Central Entity Presence',
    description: 'Page should clearly identify and feature the Central Entity',
    priority: 'critical',
    threshold: { type: 'ai' },
    remediation: 'Ensure the Central Entity appears prominently in title, H1, and opening paragraph',
    weight: 25,
  },
  {
    id: 'sem-sc-alignment',
    phase: 'semantic',
    name: 'Source Context Alignment',
    description: 'Content should align with the defined Source Context (business model)',
    priority: 'high',
    threshold: { type: 'ai' },
    remediation: 'Adjust content angle to match business context and monetization model',
    weight: 20,
  },
  {
    id: 'sem-csi-reflection',
    phase: 'semantic',
    name: 'Central Search Intent Reflection',
    description: 'Page should reflect the Central Search Intent in headings and content',
    priority: 'high',
    threshold: { type: 'ai' },
    remediation: 'Include the primary action verb/intent in H1 and key sections',
    weight: 20,
  },
  {
    id: 'sem-section-classification',
    phase: 'semantic',
    name: 'Section Classification',
    description: 'Page should be clearly classifiable as Core Section or Author Section',
    priority: 'medium',
    threshold: { type: 'ai' },
    remediation: 'Clarify page purpose: monetization (Core) or informational authority (Author)',
    weight: 15,
  },
  {
    id: 'sem-ngram-consistency',
    phase: 'semantic',
    name: 'N-gram Consistency',
    description: 'Key phrases should appear consistently throughout the page',
    priority: 'medium',
    threshold: { type: 'ai' },
    remediation: 'Ensure consistent use of key terms in headings, body, and meta elements',
    weight: 20,
  },
];

// ============================================
// PHASE 3: LINK STRUCTURE
// ============================================

export const LINK_STRUCTURE_RULES: AuditRule[] = [
  {
    id: 'link-count',
    phase: 'linkStructure',
    name: 'Internal Link Count',
    description: 'Page should have fewer than 150 internal links to preserve PageRank weight',
    priority: 'high',
    threshold: { type: 'max', value: 150, unit: 'links' },
    remediation: 'Reduce link count by removing low-value links, use dynamic loading for navigation',
    weight: 20,
  },
  {
    id: 'link-prominence',
    phase: 'linkStructure',
    name: 'Link Prominence',
    description: 'Important links should be in main content, not just navigation',
    priority: 'high',
    threshold: { type: 'min', value: 50, unit: '%' },
    remediation: 'Add contextual links within main content body, not just sidebars/footers',
    weight: 20,
  },
  {
    id: 'link-anchor-diversity',
    phase: 'linkStructure',
    name: 'Anchor Text Diversity',
    description: 'Anchor texts should be diverse (max 3 exact matches per page)',
    priority: 'medium',
    threshold: { type: 'max', value: 3, unit: 'repetitions' },
    remediation: 'Use varied anchor text with synonyms and natural language variations',
    weight: 15,
  },
  {
    id: 'link-annotation-text',
    phase: 'linkStructure',
    name: 'Annotation Text Quality',
    description: 'Text surrounding links should support their relevance',
    priority: 'medium',
    threshold: { type: 'ai' },
    remediation: 'Ensure link context includes terms relevant to the target page',
    weight: 15,
  },
  {
    id: 'link-contextual-bridge',
    phase: 'linkStructure',
    name: 'Contextual Bridge Presence',
    description: 'Links to different sections should have transitional context',
    priority: 'high',
    threshold: { type: 'ai' },
    remediation: 'Add transitional sentences that justify the connection between topics',
    weight: 20,
  },
  {
    id: 'link-no-generic',
    phase: 'linkStructure',
    name: 'No Generic Anchors',
    description: 'Avoid generic anchor text like "click here" or "read more"',
    priority: 'medium',
    threshold: { type: 'boolean' },
    remediation: 'Replace generic anchors with descriptive, keyword-rich text',
    weight: 10,
  },
];

// ============================================
// PHASE 4: CONTENT QUALITY (Microsemantics)
// ============================================

export const CONTENT_QUALITY_RULES: AuditRule[] = [
  {
    id: 'content-heading-vector',
    phase: 'contentQuality',
    name: 'Contextual Vector Integrity',
    description: 'Heading order (H1→Hx) should follow a logical, straight flow',
    priority: 'critical',
    threshold: { type: 'ai' },
    remediation: 'Reorganize headings to follow natural topic progression (Definition→Benefits→Risks→Solutions)',
    weight: 25,
  },
  {
    id: 'content-subordinate-text',
    phase: 'contentQuality',
    name: 'Subordinate Text Responsiveness',
    description: 'First sentence after each heading should directly answer the implied question',
    priority: 'high',
    threshold: { type: 'ai' },
    remediation: 'Rewrite opening sentences to be direct, responsive answers',
    weight: 20,
  },
  {
    id: 'content-discourse-integration',
    phase: 'contentQuality',
    name: 'Discourse Integration',
    description: 'Paragraphs should maintain flow with transitional phrases and mutual concepts',
    priority: 'high',
    threshold: { type: 'ai' },
    remediation: 'Add transition markers and connect concepts between paragraphs',
    weight: 20,
  },
  {
    id: 'content-eav-density',
    phase: 'contentQuality',
    name: 'EAV Information Density',
    description: 'Each sentence should deliver one clear fact (Entity-Attribute-Value)',
    priority: 'medium',
    threshold: { type: 'ai' },
    remediation: 'Break complex sentences into simple, factual declarations',
    weight: 15,
  },
  {
    id: 'content-format-match',
    phase: 'contentQuality',
    name: 'Content Format Match',
    description: 'Content format should match query type (lists for how-to, tables for comparison)',
    priority: 'medium',
    threshold: { type: 'ai' },
    remediation: 'Convert content to appropriate format: ordered lists, tables, or prose',
    weight: 10,
  },
  {
    id: 'content-no-fluff',
    phase: 'contentQuality',
    name: 'No Filler Content',
    description: 'Content should avoid unnecessary filler phrases and redundant statements',
    priority: 'medium',
    threshold: { type: 'ai' },
    remediation: 'Remove filler phrases, get to the point faster',
    weight: 10,
  },
];

// ============================================
// PHASE 5: VISUAL & SCHEMA
// ============================================

export const VISUAL_SCHEMA_RULES: AuditRule[] = [
  {
    id: 'visual-hierarchy',
    phase: 'visualSchema',
    name: 'Visual Hierarchy',
    description: 'Heading sizes should descend (H1 > H2 > H3) visually',
    priority: 'medium',
    threshold: { type: 'boolean' },
    remediation: 'Adjust CSS to ensure heading font sizes decrease with hierarchy level',
    weight: 15,
  },
  {
    id: 'visual-image-alt',
    phase: 'visualSchema',
    name: 'Image Alt Text Quality',
    description: 'Alt text should be descriptive and not repeat H1 verbatim',
    priority: 'medium',
    threshold: { type: 'ai' },
    remediation: 'Write unique, descriptive alt text using synonyms not in the H1',
    weight: 15,
  },
  {
    id: 'visual-schema-present',
    phase: 'visualSchema',
    name: 'Schema Markup Present',
    description: 'Page should have valid JSON-LD structured data',
    priority: 'high',
    threshold: { type: 'boolean' },
    remediation: 'Add appropriate schema markup (Article, FAQ, Product, Organization)',
    weight: 25,
  },
  {
    id: 'visual-schema-complete',
    phase: 'visualSchema',
    name: 'Schema Completeness',
    description: 'Schema should include all required and recommended fields',
    priority: 'medium',
    threshold: { type: 'ai' },
    remediation: 'Add missing schema fields: author, datePublished, image, etc.',
    weight: 20,
  },
  {
    id: 'visual-schema-valid',
    phase: 'visualSchema',
    name: 'Schema Validation',
    description: 'Schema markup should pass validation without errors',
    priority: 'high',
    threshold: { type: 'boolean' },
    remediation: 'Fix schema syntax errors and invalid property values',
    weight: 25,
  },
];

// ============================================
// ALL RULES COMBINED
// ============================================

export const ALL_AUDIT_RULES: AuditRule[] = [
  ...TECHNICAL_RULES,
  ...SEMANTIC_RULES,
  ...LINK_STRUCTURE_RULES,
  ...CONTENT_QUALITY_RULES,
  ...VISUAL_SCHEMA_RULES,
];

// Get rules by phase
export const getRulesByPhase = (phase: AuditRule['phase']): AuditRule[] => {
  return ALL_AUDIT_RULES.filter(rule => rule.phase === phase);
};

// Get rule by ID
export const getRuleById = (id: string): AuditRule | undefined => {
  return ALL_AUDIT_RULES.find(rule => rule.id === id);
};

// Calculate phase weight
export const getPhaseWeight = (phase: AuditRule['phase']): number => {
  return getRulesByPhase(phase).reduce((sum, rule) => sum + rule.weight, 0);
};

// Phase metadata
export const PHASE_CONFIG = {
  technical: {
    name: 'Technical (CoR)',
    description: 'Cost of Retrieval - Server performance and crawlability',
    weight: 0.20,
  },
  semantic: {
    name: 'Semantic Foundation',
    description: 'Central Entity, Source Context, and Search Intent alignment',
    weight: 0.25,
  },
  linkStructure: {
    name: 'Link Structure',
    description: 'Internal linking, anchor text, and PageRank flow',
    weight: 0.20,
  },
  contentQuality: {
    name: 'Content Quality',
    description: 'Microsemantics, contextual vectors, and EAV density',
    weight: 0.25,
  },
  visualSchema: {
    name: 'Visual & Schema',
    description: 'Visual hierarchy, images, and structured data',
    weight: 0.10,
  },
};
