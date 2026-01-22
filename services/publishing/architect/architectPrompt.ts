/**
 * AI Architect Prompt Builder
 *
 * Constructs prompts for the AI Layout Architect to analyze content
 * and generate layout blueprints.
 *
 * @module services/publishing/architect/architectPrompt
 */

import type {
  ArchitectInput,
  ComponentType,
  LayoutBlueprint,
  VisualStyle,
  ContentPacing,
  SectionEmphasis,
} from './blueprintTypes';

// ============================================================================
// COMPONENT DESCRIPTIONS (for AI context)
// ============================================================================

const COMPONENT_DESCRIPTIONS: Record<ComponentType, string> = {
  // Core content
  'prose': 'Standard paragraph text, ideal for narrative content',
  'lead-paragraph': 'Emphasized first paragraph, larger text for intros',
  'pull-quote': 'Highlighted quote from the content, draws attention',
  'highlight-box': 'Important information in a colored box',
  'callout': 'Attention-grabbing aside with icon, for tips/warnings/notes',

  // List presentations
  'bullet-list': 'Standard unordered list, good for general items',
  'numbered-list': 'Ordered list for sequences without process emphasis',
  'checklist': 'List with checkmarks, good for requirements/features',
  'icon-list': 'Each item has a unique icon, visually engaging',
  'card-grid': 'Items as cards in a grid, great for features/benefits',
  'masonry-grid': 'Pinterest-style varied height cards',
  'feature-list': 'Feature name + description pairs, for product features',
  'stat-cards': 'Numbers/statistics prominently displayed in cards',

  // Process & structure
  'timeline-vertical': 'Vertical timeline for processes, classic look',
  'timeline-horizontal': 'Horizontal timeline, good for fewer steps',
  'timeline-zigzag': 'Alternating left/right timeline, very visual',
  'steps-numbered': 'Simple numbered steps, clean and minimal',
  'steps-icons': 'Steps with custom icons, more visual interest',
  'accordion': 'Collapsible sections, good for FAQs or long content',
  'tabs': 'Tabbed content, good for categories or comparisons',

  // Comparison & data
  'comparison-table': 'Side-by-side feature comparison table',
  'pros-cons': 'Two-column pros and cons layout',
  'pricing-table': 'Pricing tiers comparison',
  'spec-table': 'Technical specifications table',
  'data-table': 'Generic data table with sorting',

  // Trust & social proof
  'testimonial-single': 'Single large testimonial quote',
  'testimonial-grid': 'Multiple testimonials in grid',
  'testimonial-carousel': 'Rotating testimonials slider',
  'logo-cloud': 'Client/partner logos display',
  'trust-badges': 'Certifications, awards, security badges',
  'case-study-card': 'Brief case study summary card',

  // Media & visual
  'image-hero': 'Large hero image with overlay text',
  'image-gallery': 'Multiple images in gallery layout',
  'before-after': 'Before/after comparison slider',
  'video-embed': 'Embedded video with thumbnail',
  'image-with-caption': 'Image with descriptive caption',

  // Conversion
  'cta-banner': 'Full-width call-to-action banner',
  'cta-inline': 'Inline CTA within content flow',
  'cta-sticky': 'Sticky CTA that follows scroll',
  'lead-magnet-box': 'Newsletter/download offer box',

  // Navigation & structure
  'toc-sidebar': 'Table of contents in sidebar',
  'toc-inline': 'Table of contents inline with content',
  'author-box': 'Author bio and credentials',
  'related-content': 'Related articles/products cards',
  'breadcrumb': 'Navigation breadcrumb trail',

  // Specialized
  'faq-accordion': 'FAQ with expandable answers',
  'faq-cards': 'FAQ as individual cards',
  'key-takeaways': 'Summary points at top/bottom',
  'summary-box': 'TL;DR or executive summary',
  'sources-section': 'Citations and references list',
};

// ============================================================================
// VISUAL STYLE DESCRIPTIONS
// ============================================================================

const VISUAL_STYLE_DESCRIPTIONS: Record<VisualStyle, string> = {
  'editorial': 'Clean, magazine-like layout. Strong typography focus, generous whitespace, subtle colors. Best for informational/educational content.',
  'marketing': 'Conversion-focused design. Bold CTAs, benefit-oriented sections, testimonials prominent. Best for commercial intent pages.',
  'minimal': 'Sparse, lots of whitespace, very clean. Text-focused, few visual elements. Best for technical/professional content.',
  'bold': 'Strong colors, dramatic shadows, large headings. High visual impact. Best for brand differentiation.',
  'warm-modern': 'Friendly, approachable, soft edges and warm colors. Best for consumer-focused, lifestyle content.',
};

// ============================================================================
// PROMPT BUILDER
// ============================================================================

/**
 * Build the system prompt for the AI Architect
 */
export function buildSystemPrompt(): string {
  return `You are an AI Layout Architect specializing in creating beautiful, contextually-appropriate layouts for SEO content. Your job is to analyze article content and business context, then produce a Layout Blueprint that specifies exactly how each section should be visually presented.

## Your Core Principles

1. **SEO Preservation is Sacred**: You NEVER modify the actual content text, headings, keywords, or semantic structure. You only decide HOW content is PRESENTED visually.

2. **Context-Aware Design**: Every design decision should reflect:
   - The business's industry and tone
   - The target audience's expectations
   - The content's intent and buyer journey stage
   - Current design trends for the niche

3. **Visual Variety with Consistency**: Articles shouldn't look identical, but should feel like they belong together. Vary component choices based on content, while maintaining brand coherence.

4. **Reader Experience First**: Optimize for readability, scannability, and engagement. Dense content needs more whitespace. Process content benefits from visual steps.

## Available Components

${Object.entries(COMPONENT_DESCRIPTIONS)
  .map(([key, desc]) => `- **${key}**: ${desc}`)
  .join('\n')}

## Visual Styles

${Object.entries(VISUAL_STYLE_DESCRIPTIONS)
  .map(([key, desc]) => `- **${key}**: ${desc}`)
  .join('\n')}

## Output Format

You must return a valid JSON object matching the LayoutBlueprint schema. Be concise but provide reasoning for key decisions.`;
}

/**
 * Build the user prompt with article content and context
 */
export function buildUserPrompt(input: ArchitectInput): string {
  const sections = extractContentSections(input.articleContent);

  return `## Article to Analyze

**Title**: ${input.articleTitle}

**Business Context**:
- Company: ${input.business.name}
- Industry: ${input.business.industry}
- Tone: ${input.business.tone}
- Target Audience: ${input.business.targetAudience}
- Positioning: ${input.business.positioning}
${input.business.uniqueSellingPoints ? `- USPs: ${input.business.uniqueSellingPoints.join(', ')}` : ''}

**Content Signals**:
- Page Type: ${input.contentSignals.pageType}
- Buyer Journey: ${input.contentSignals.buyerJourneyStage}
- Primary Intent: ${input.contentSignals.primaryIntent}
- Word Count: ${input.contentSignals.wordCount}
- Has Process Steps: ${input.contentSignals.hasProcessSteps}
- Has FAQ: ${input.contentSignals.hasFaq}
- Has Testimonials: ${input.contentSignals.hasTestimonials}
- Has Benefits: ${input.contentSignals.hasBenefits}
- Has Comparison: ${input.contentSignals.hasComparison}

${input.contentBrief ? `**Content Brief**:
- Target Keyword: ${input.contentBrief.targetKeyword}
- Meta Description: ${input.contentBrief.metaDescription}
- Intent: ${input.contentBrief.intent}` : ''}

**User Preferences**:
- Style Leaning: ${input.preferences.styleLeaning}
${input.preferences.avoidPatterns ? `- Avoid: ${input.preferences.avoidPatterns.join(', ')}` : ''}
${input.preferences.preferPatterns ? `- Prefer: ${input.preferences.preferPatterns.join(', ')}` : ''}

${input.marketContext ? `**Market Context**:
- Industry Norms: ${input.marketContext.industryNorms.join(', ')}
- Trending Patterns: ${input.marketContext.trendingPatterns.join(', ')}
- Audience Expectations: ${input.marketContext.audienceExpectations.join(', ')}` : ''}

${input.competitorContext ? `**Competitor Analysis**:
- Common Patterns: ${input.competitorContext.patterns.join(', ')}
- Their Strengths: ${input.competitorContext.strengths.join(', ')}
- Differentiation Opportunity: ${input.competitorContext.differentiationOpportunity}` : ''}

## Content Sections to Analyze

${sections.map((section, index) => `
### Section ${index + 1}: ${section.heading || '(Intro/No Heading)'}
Level: ${section.level}
Content Preview (first 500 chars):
${section.contentPreview}
---`).join('\n')}

## Task

Analyze this content and create a Layout Blueprint. For each section:
1. Choose the most appropriate component based on content type and context
2. Select variant and emphasis level
3. Provide brief reasoning

Consider:
- The introduction often works well as 'lead-paragraph' or 'prose'
- Lists of benefits → 'card-grid', 'icon-list', or 'feature-list'
- Process/steps → 'timeline-zigzag', 'steps-numbered', or 'timeline-vertical'
- FAQ content → 'faq-accordion' or 'faq-cards'
- Testimonials → appropriate testimonial component
- Dense informational text → 'prose' with 'balanced' or 'spacious' pacing

Return ONLY valid JSON matching this TypeScript interface:

\`\`\`typescript
interface LayoutBlueprint {
  version: '1.0';
  id: string;
  articleId: string;
  pageStrategy: {
    visualStyle: 'editorial' | 'marketing' | 'minimal' | 'bold' | 'warm-modern';
    pacing: 'dense' | 'balanced' | 'spacious';
    colorIntensity: 'subtle' | 'moderate' | 'vibrant';
    primaryGoal: 'inform' | 'convert' | 'engage' | 'educate';
    buyerJourneyStage: 'awareness' | 'consideration' | 'decision' | 'retention';
    reasoning: string;
  };
  sections: Array<{
    id: string;
    heading?: string;
    headingLevel: number;
    presentation: {
      component: ComponentType;
      variant: string;
      emphasis: 'background' | 'normal' | 'featured' | 'hero-moment';
      spacing: 'tight' | 'normal' | 'breathe';
      hasBackground: boolean;
      hasDivider: boolean;
    };
    reasoning: string;
    styleHints?: {
      icon?: string;
      accentColor?: string;
      columns?: 2 | 3 | 4;
      animateOnScroll?: boolean;
    };
  }>;
  globalElements: {
    showToc: boolean;
    tocPosition: 'sidebar' | 'inline' | 'floating';
    showAuthorBox: boolean;
    authorBoxPosition: 'top' | 'bottom' | 'both';
    ctaStrategy: {
      positions: Array<'after-intro' | 'mid-content' | 'before-faq' | 'end'>;
      intensity: 'subtle' | 'moderate' | 'prominent';
      style: 'inline' | 'banner' | 'floating';
    };
    showSources: boolean;
    showRelatedContent: boolean;
  };
  metadata: {
    generatedAt: string;
    modelUsed: string;
    generationDurationMs: number;
    sectionsAnalyzed: number;
    wordCount: number;
  };
}
\`\`\``;
}

// ============================================================================
// CONTENT EXTRACTION HELPERS
// ============================================================================

interface ExtractedSection {
  heading: string | null;
  level: number;
  contentPreview: string;
  fullContent: string;
}

/**
 * Extract sections from content for analysis
 */
function extractContentSections(content: string): ExtractedSection[] {
  const sections: ExtractedSection[] = [];
  const isHtml = content.includes('<');

  if (isHtml) {
    // HTML content - split by h2 tags
    const h2Pattern = /<h2[^>]*>([^<]*)<\/h2>/gi;
    const parts = content.split(h2Pattern);

    // First part is intro (before first H2)
    if (parts[0].trim()) {
      sections.push({
        heading: null,
        level: 0,
        contentPreview: stripHtml(parts[0]).slice(0, 500),
        fullContent: parts[0],
      });
    }

    // Process each H2 section
    for (let i = 1; i < parts.length; i += 2) {
      const heading = parts[i]?.trim();
      const sectionContent = parts[i + 1]?.trim();

      if (heading && sectionContent) {
        sections.push({
          heading,
          level: 2,
          contentPreview: stripHtml(sectionContent).slice(0, 500),
          fullContent: sectionContent,
        });
      }
    }
  } else {
    // Markdown content - split by ## headings
    const lines = content.split('\n');
    let currentSection: ExtractedSection | null = null;
    let currentContent: string[] = [];

    for (const line of lines) {
      const h2Match = line.match(/^##\s+(.+)$/);
      const h3Match = line.match(/^###\s+(.+)$/);

      if (h2Match) {
        // Save previous section
        if (currentSection || currentContent.length > 0) {
          sections.push({
            heading: currentSection?.heading || null,
            level: currentSection?.level || 0,
            contentPreview: currentContent.join('\n').slice(0, 500),
            fullContent: currentContent.join('\n'),
          });
        }
        currentSection = { heading: h2Match[1], level: 2, contentPreview: '', fullContent: '' };
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }

    // Save last section
    if (currentSection || currentContent.length > 0) {
      sections.push({
        heading: currentSection?.heading || null,
        level: currentSection?.level || 0,
        contentPreview: currentContent.join('\n').slice(0, 500),
        fullContent: currentContent.join('\n'),
      });
    }
  }

  return sections;
}

/**
 * Strip HTML tags from content
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================================================
// RESPONSE PARSING
// ============================================================================

/**
 * Parse AI response into a LayoutBlueprint
 */
export function parseArchitectResponse(
  response: string,
  articleId: string,
  startTime: number,
  wordCount: number
): LayoutBlueprint {
  // Extract JSON from response (may be wrapped in markdown code block)
  let jsonStr = response;

  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }

  try {
    const parsed = JSON.parse(jsonStr);

    // Ensure required fields
    const blueprint: LayoutBlueprint = {
      version: '1.0',
      id: parsed.id || `blueprint-${Date.now()}`,
      articleId: articleId,
      pageStrategy: parsed.pageStrategy || getDefaultPageStrategy(),
      sections: (parsed.sections || []).map((s: any, index: number) => ({
        id: s.id || `section-${index}`,
        sourceContent: '', // Will be filled by caller
        heading: s.heading,
        headingLevel: s.headingLevel || 2,
        presentation: {
          component: s.presentation?.component || 'prose',
          variant: s.presentation?.variant || 'default',
          emphasis: s.presentation?.emphasis || 'normal',
          spacing: s.presentation?.spacing || 'normal',
          hasBackground: s.presentation?.hasBackground || false,
          hasDivider: s.presentation?.hasDivider || false,
        },
        reasoning: s.reasoning || '',
        styleHints: s.styleHints,
      })),
      globalElements: parsed.globalElements || getDefaultGlobalElements(),
      metadata: {
        generatedAt: new Date().toISOString(),
        modelUsed: parsed.metadata?.modelUsed || 'unknown',
        generationDurationMs: Date.now() - startTime,
        sectionsAnalyzed: parsed.sections?.length || 0,
        wordCount: wordCount,
      },
    };

    return blueprint;
  } catch (error) {
    console.error('Failed to parse architect response:', error);
    throw new Error(`Failed to parse AI response as JSON: ${error}`);
  }
}

/**
 * Default page strategy when parsing fails
 */
function getDefaultPageStrategy(): LayoutBlueprint['pageStrategy'] {
  return {
    visualStyle: 'editorial',
    pacing: 'balanced',
    colorIntensity: 'moderate',
    primaryGoal: 'inform',
    buyerJourneyStage: 'awareness',
    reasoning: 'Default strategy applied due to parsing issues.',
  };
}

/**
 * Default global elements when parsing fails
 */
function getDefaultGlobalElements(): LayoutBlueprint['globalElements'] {
  return {
    showToc: true,
    tocPosition: 'inline',
    showAuthorBox: true,
    authorBoxPosition: 'bottom',
    ctaStrategy: {
      positions: ['end'],
      intensity: 'moderate',
      style: 'banner',
    },
    showSources: true,
    showRelatedContent: false,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export { COMPONENT_DESCRIPTIONS, VISUAL_STYLE_DESCRIPTIONS };
