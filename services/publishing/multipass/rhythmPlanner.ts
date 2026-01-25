import type { ContentAnalysis, ComponentSelection, VisualRhythmPlan } from '../../../types/publishing';

/**
 * Pass 3: Plan visual rhythm for engaging reading experience
 *
 * This planner determines:
 * - Emphasis levels for each section (hero-moment, featured, background, normal)
 * - Spacing between sections (tight, normal, breathe, dramatic)
 * - Visual anchor placement for long content
 * - Overall pacing of the article
 */
export function planVisualRhythm(
  analysis: ContentAnalysis,
  components: ComponentSelection[]
): VisualRhythmPlan {
  const sections: VisualRhythmPlan['sections'] = [];
  let lastEmphasis: VisualRhythmPlan['sections'][0]['emphasisLevel'] = 'normal';

  for (let i = 0; i < analysis.sections.length; i++) {
    const section = analysis.sections[i];

    // Determine emphasis level
    const emphasisLevel = determineEmphasis(section, i, lastEmphasis, analysis.sections.length);
    lastEmphasis = emphasisLevel;

    // Determine spacing before this section
    const spacingBefore = determineSpacing(section, emphasisLevel, i);

    // Determine if visual anchor needed
    const visualAnchor = section.wordCount > 400 ||
                         section.semanticImportance === 'key' ||
                         shouldAddAnchor(i, analysis.sections.length);

    sections.push({
      index: section.index,
      emphasisLevel,
      spacingBefore,
      visualAnchor
    });
  }

  return {
    sections,
    overallPacing: determineOverallPacing(analysis.totalWordCount, sections)
  };
}

/**
 * Determine the emphasis level for a section
 */
function determineEmphasis(
  section: ContentAnalysis['sections'][0],
  index: number,
  lastEmphasis: VisualRhythmPlan['sections'][0]['emphasisLevel'],
  totalSections: number
): VisualRhythmPlan['sections'][0]['emphasisLevel'] {
  // First section is always hero-moment
  if (index === 0 || section.semanticImportance === 'hero') {
    return 'hero-moment';
  }

  // Key sections get featured treatment
  if (section.semanticImportance === 'key') {
    // But avoid two featured in a row for visual variety
    if (lastEmphasis === 'featured' || lastEmphasis === 'hero-moment') {
      return 'background';
    }
    return 'featured';
  }

  // FAQ and comparison sections often benefit from background treatment
  // to visually separate them from regular prose
  if (section.contentType === 'faq' || section.contentType === 'comparison') {
    return 'background';
  }

  // Create rhythm: alternate between normal and background
  // Every 3rd supporting section gets background
  if (section.semanticImportance === 'supporting') {
    if (index % 3 === 0 && lastEmphasis !== 'background') {
      return 'background';
    }
  }

  return 'normal';
}

/**
 * Determine the spacing before a section
 */
function determineSpacing(
  section: ContentAnalysis['sections'][0],
  emphasisLevel: VisualRhythmPlan['sections'][0]['emphasisLevel'],
  index: number
): VisualRhythmPlan['sections'][0]['spacingBefore'] {
  // First section gets dramatic or breathe spacing
  if (index === 0) {
    return 'dramatic';
  }

  // Hero sections get dramatic spacing
  if (emphasisLevel === 'hero-moment') {
    return 'dramatic';
  }

  // Featured sections get breathing room
  if (emphasisLevel === 'featured') {
    return section.wordCount > 300 ? 'breathe' : 'normal';
  }

  // Short sections can be tight
  if (section.wordCount < 100) {
    return 'tight';
  }

  // Long prose sections need breathing room
  if (section.wordCount > 400 && section.contentType === 'prose') {
    return 'breathe';
  }

  // Background sections get slight separation
  if (emphasisLevel === 'background') {
    return 'normal';
  }

  return 'normal';
}

/**
 * Determine if a visual anchor should be placed at this section
 */
function shouldAddAnchor(index: number, totalSections: number): boolean {
  // Add visual anchors every 3-4 sections for long articles
  // This helps break up the content and maintain reader engagement
  if (totalSections > 5) {
    return index > 0 && index % 3 === 0;
  }
  return false;
}

/**
 * Determine the overall pacing of the article
 */
function determineOverallPacing(
  totalWordCount: number,
  sections: VisualRhythmPlan['sections']
): VisualRhythmPlan['overallPacing'] {
  const breatheSections = sections.filter(
    s => s.spacingBefore === 'breathe' || s.spacingBefore === 'dramatic'
  ).length;
  const ratio = sections.length > 0 ? breatheSections / sections.length : 0;

  // Long articles (2000+ words) should feel spacious
  if (totalWordCount > 2000) {
    return ratio > 0.3 ? 'spacious' : 'balanced';
  }

  // Short articles (under 500 words) can be dense
  if (totalWordCount < 500) {
    return 'dense';
  }

  // Medium length articles are balanced
  return 'balanced';
}
