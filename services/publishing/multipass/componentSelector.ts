import type { ContentAnalysis, ComponentSelection } from '../../../types/publishing';

/**
 * Component recommendations by content type and personality
 * Each content type maps to personality-specific component choices
 */
const COMPONENT_RECOMMENDATIONS: Record<string, Record<string, { primary: string; alternatives: string[] }>> = {
  process: {
    'modern-minimal': { primary: 'steps-numbered', alternatives: ['timeline-vertical', 'numbered-list'] },
    'bold-editorial': { primary: 'timeline-vertical', alternatives: ['steps-numbered', 'checklist'] },
    'corporate-professional': { primary: 'steps-numbered', alternatives: ['timeline-horizontal', 'numbered-list'] },
    'warm-friendly': { primary: 'timeline-vertical', alternatives: ['steps-numbered', 'icon-list'] },
    'tech-clean': { primary: 'steps-numbered', alternatives: ['timeline-vertical', 'code-steps'] },
    'default': { primary: 'timeline-vertical', alternatives: ['steps-numbered', 'numbered-list'] }
  },
  comparison: {
    'modern-minimal': { primary: 'comparison-table', alternatives: ['card-grid', 'spec-table'] },
    'bold-editorial': { primary: 'card-grid', alternatives: ['comparison-table', 'side-by-side'] },
    'corporate-professional': { primary: 'comparison-table', alternatives: ['spec-table', 'card-grid'] },
    'warm-friendly': { primary: 'card-grid', alternatives: ['comparison-table', 'icon-comparison'] },
    'tech-clean': { primary: 'spec-table', alternatives: ['comparison-table', 'card-grid'] },
    'default': { primary: 'card-grid', alternatives: ['comparison-table', 'spec-table'] }
  },
  faq: {
    'modern-minimal': { primary: 'faq-accordion', alternatives: ['faq-list', 'qa-cards'] },
    'bold-editorial': { primary: 'faq-accordion', alternatives: ['qa-cards', 'faq-list'] },
    'corporate-professional': { primary: 'faq-accordion', alternatives: ['faq-list', 'qa-cards'] },
    'warm-friendly': { primary: 'faq-accordion', alternatives: ['qa-cards', 'faq-list'] },
    'tech-clean': { primary: 'faq-accordion', alternatives: ['faq-list', 'qa-cards'] },
    'default': { primary: 'faq-accordion', alternatives: ['faq-list', 'qa-cards'] }
  },
  definition: {
    'modern-minimal': { primary: 'highlight-box', alternatives: ['callout', 'prose'] },
    'bold-editorial': { primary: 'pull-quote', alternatives: ['highlight-box', 'callout'] },
    'corporate-professional': { primary: 'callout', alternatives: ['highlight-box', 'prose'] },
    'warm-friendly': { primary: 'highlight-box', alternatives: ['callout', 'card'] },
    'tech-clean': { primary: 'callout', alternatives: ['code-block', 'highlight-box'] },
    'default': { primary: 'highlight-box', alternatives: ['callout', 'prose'] }
  },
  statistics: {
    'modern-minimal': { primary: 'stat-cards', alternatives: ['data-grid', 'prose'] },
    'bold-editorial': { primary: 'stat-highlight', alternatives: ['stat-cards', 'infographic'] },
    'corporate-professional': { primary: 'stat-cards', alternatives: ['data-table', 'chart'] },
    'warm-friendly': { primary: 'stat-cards', alternatives: ['icon-stats', 'progress-bars'] },
    'tech-clean': { primary: 'data-grid', alternatives: ['stat-cards', 'metric-dashboard'] },
    'default': { primary: 'stat-cards', alternatives: ['data-grid', 'prose'] }
  },
  list: {
    'modern-minimal': { primary: 'bullet-list', alternatives: ['icon-list', 'checklist'] },
    'bold-editorial': { primary: 'icon-list', alternatives: ['card-grid', 'bullet-list'] },
    'corporate-professional': { primary: 'bullet-list', alternatives: ['numbered-list', 'checklist'] },
    'warm-friendly': { primary: 'icon-list', alternatives: ['checklist', 'card-grid'] },
    'tech-clean': { primary: 'checklist', alternatives: ['bullet-list', 'icon-list'] },
    'default': { primary: 'bullet-list', alternatives: ['icon-list', 'checklist'] }
  },
  prose: {
    'modern-minimal': { primary: 'prose', alternatives: ['lead-paragraph', 'columns'] },
    'bold-editorial': { primary: 'lead-paragraph', alternatives: ['prose', 'drop-cap'] },
    'corporate-professional': { primary: 'prose', alternatives: ['lead-paragraph', 'blockquote'] },
    'warm-friendly': { primary: 'prose', alternatives: ['lead-paragraph', 'callout'] },
    'tech-clean': { primary: 'prose', alternatives: ['lead-paragraph', 'code-prose'] },
    'default': { primary: 'prose', alternatives: ['lead-paragraph'] }
  },
  narrative: {
    'modern-minimal': { primary: 'prose', alternatives: ['story-block', 'lead-paragraph'] },
    'bold-editorial': { primary: 'story-block', alternatives: ['prose', 'pull-quote'] },
    'corporate-professional': { primary: 'prose', alternatives: ['case-study-card', 'blockquote'] },
    'warm-friendly': { primary: 'story-block', alternatives: ['prose', 'testimonial'] },
    'tech-clean': { primary: 'prose', alternatives: ['example-block', 'lead-paragraph'] },
    'default': { primary: 'prose', alternatives: ['lead-paragraph', 'story-block'] }
  }
};

/**
 * Pass 2: Select optimal components for each section based on content type and personality
 *
 * @param analysis - The content analysis from Pass 1
 * @param personality - The design personality (e.g., 'modern-minimal', 'bold-editorial')
 * @returns Array of component selections with alternatives and reasoning
 */
export function selectComponents(
  analysis: ContentAnalysis,
  personality: string = 'modern-minimal'
): ComponentSelection[] {
  return analysis.sections.map(section => {
    const contentType = section.contentType;
    const recs = COMPONENT_RECOMMENDATIONS[contentType] || COMPONENT_RECOMMENDATIONS['prose'];
    const personalityRecs = recs[personality] || recs['default'];

    // Generate reasoning based on selection
    const reasoning = generateReasoning(section, personalityRecs.primary, personality);

    return {
      sectionIndex: section.index,
      selectedComponent: personalityRecs.primary,
      reasoning,
      alternatives: personalityRecs.alternatives
    };
  });
}

/**
 * Generate human-readable reasoning for why a component was selected
 */
function generateReasoning(
  section: ContentAnalysis['sections'][0],
  component: string,
  personality: string
): string {
  const reasons: string[] = [];

  // Content type reasoning
  reasons.push(`Content type "${section.contentType}" works well with ${component}`);

  // Personality-specific reasoning
  if (personality === 'bold-editorial') {
    if (component.includes('timeline')) {
      reasons.push('Editorial style benefits from dramatic vertical flow');
    } else if (component.includes('card')) {
      reasons.push('Editorial style emphasizes visual hierarchy with cards');
    }
  } else if (personality === 'modern-minimal') {
    if (component.includes('table')) {
      reasons.push('Minimal style pairs well with clean data presentation');
    } else if (component === 'prose') {
      reasons.push('Minimal style favors clean typography');
    }
  } else if (personality === 'tech-clean') {
    if (component.includes('code') || component.includes('spec')) {
      reasons.push('Tech style benefits from structured, technical presentation');
    }
  }

  // Semantic importance reasoning
  if (section.semanticImportance === 'hero') {
    reasons.push('Hero section receives emphasis treatment');
  } else if (section.semanticImportance === 'key') {
    reasons.push('Key section given prominent visual weight');
  }

  // Content features reasoning
  if (section.hasTable && component.includes('table')) {
    reasons.push('Table content preserved with tabular component');
  }
  if (section.hasList && (component.includes('list') || component.includes('steps'))) {
    reasons.push('List content enhanced with appropriate list component');
  }

  return reasons.join('. ') + '.';
}
