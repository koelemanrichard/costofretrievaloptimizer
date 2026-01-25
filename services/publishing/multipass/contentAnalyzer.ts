import type { ContentAnalysis } from '../../../types/publishing';

/**
 * Pass 1: Analyze content structure for intelligent design decisions
 *
 * This analyzer examines markdown content to:
 * - Identify section types (process, comparison, FAQ, etc.)
 * - Calculate word counts and reading time
 * - Determine semantic importance of each section
 * - Detect special elements (tables, lists, quotes)
 */
export function analyzeContent(markdown: string): ContentAnalysis {
  const lines = markdown.split('\n');
  const sections: ContentAnalysis['sections'] = [];

  let currentSection: Partial<ContentAnalysis['sections'][0]> | null = null;
  let currentContent: string[] = [];
  let sectionIndex = 0;

  const finalizeSection = () => {
    if (currentSection && currentContent.length > 0) {
      const content = currentContent.join('\n');
      currentSection.wordCount = countWords(content);
      currentSection.hasTable = detectTable(content);
      currentSection.hasList = detectList(content);
      currentSection.hasQuote = detectQuote(content);
      currentSection.contentType = detectContentType(content, currentSection.heading || '');
      currentSection.semanticImportance = determineImportance(sectionIndex, currentSection.headingLevel || 2);
      sections.push(currentSection as ContentAnalysis['sections'][0]);
      sectionIndex++;
    }
    currentContent = [];
  };

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      finalizeSection();
      currentSection = {
        index: sectionIndex,
        heading: headingMatch[2],
        headingLevel: headingMatch[1].length,
      };
    } else if (currentSection) {
      currentContent.push(line);
    } else if (line.trim()) {
      // Content before first heading - create implicit section
      if (!currentSection) {
        currentSection = {
          index: sectionIndex,
          heading: '',
          headingLevel: 1,
        };
      }
      currentContent.push(line);
    }
  }

  finalizeSection();

  const totalWordCount = sections.reduce((sum, s) => sum + s.wordCount, 0);

  return {
    sections,
    totalWordCount,
    estimatedReadTime: Math.ceil(totalWordCount / 200) // ~200 wpm reading speed
  };
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

function detectTable(content: string): boolean {
  // Tables have | characters and a separator line with dashes
  return content.includes('|') && /\|[-:\s]+\|/.test(content);
}

function detectList(content: string): boolean {
  // Detect bullet lists (- or *) or numbered lists (1. 2. etc.)
  return /^[\s]*[-*]\s/m.test(content) || /^[\s]*\d+\.\s/m.test(content);
}

function detectQuote(content: string): boolean {
  // Detect markdown blockquotes
  return /^[\s]*>/m.test(content);
}

function detectContentType(content: string, heading: string): ContentAnalysis['sections'][0]['contentType'] {
  const headingLower = heading.toLowerCase();
  const contentLower = content.toLowerCase();

  // FAQ detection - check heading and Q&A patterns
  if (headingLower.includes('faq') ||
      headingLower.includes('frequently asked') ||
      headingLower.includes('question') ||
      /\*\*q[:\s]/i.test(content) ||
      /^q[:\s]/im.test(content)) {
    return 'faq';
  }

  // Comparison/table detection
  if (detectTable(content)) {
    if (headingLower.includes('compar') ||
        headingLower.includes('vs') ||
        headingLower.includes('difference') ||
        headingLower.includes('versus')) {
      return 'comparison';
    }
  }

  // Process/steps detection - numbered lists or step-related headings
  if (/^[\s]*\d+\.\s/m.test(content) ||
      headingLower.includes('step') ||
      headingLower.includes('how to') ||
      headingLower.includes('how it works') ||
      headingLower.includes('process') ||
      headingLower.includes('guide')) {
    return 'process';
  }

  // Definition detection
  if (headingLower.includes('what is') ||
      headingLower.includes('definition') ||
      headingLower.includes('meaning') ||
      headingLower.includes('what are')) {
    return 'definition';
  }

  // Statistics detection
  if (/\d+%/.test(content) ||
      headingLower.includes('statistic') ||
      headingLower.includes('data') ||
      headingLower.includes('number') ||
      headingLower.includes('facts') ||
      headingLower.includes('figures')) {
    return 'statistics';
  }

  // List content (bullet points without being a process)
  if (/^[\s]*[-*]\s/m.test(content) && !headingLower.includes('step')) {
    return 'list';
  }

  // Narrative content - stories, examples, case studies
  if (headingLower.includes('story') ||
      headingLower.includes('case study') ||
      headingLower.includes('example') ||
      headingLower.includes('journey')) {
    return 'narrative';
  }

  // Default to prose for general content
  return 'prose';
}

function determineImportance(
  index: number,
  headingLevel: number
): 'hero' | 'key' | 'supporting' {
  // First section or H1 = hero
  if (index === 0 || headingLevel === 1) {
    return 'hero';
  }

  // H2 sections in first few positions = key
  if (headingLevel === 2 && index <= 3) {
    return 'key';
  }

  // Everything else = supporting
  return 'supporting';
}
