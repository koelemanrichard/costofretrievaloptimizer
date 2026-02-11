/**
 * Phase B: Structural Enhancement Checks (20-22)
 *
 * Checks for macro/micro border, extractive summary alignment,
 * and query-format alignment.
 *
 * @module services/ai/contentGeneration/passes/auditChecks/structuralChecks
 */

import { ContentBrief, AuditRuleResult } from '../../../../../types';
import { getAuditPatterns } from '../auditPatternsMultilingual';

// ============================================================================
// Shared Constants
// ============================================================================

// Patterns that indicate supplementary/related content sections
export const SUPPLEMENTARY_HEADING_PATTERNS = [
  /related/i,
  /see also/i,
  /further reading/i,
  /additional/i,
  /more on/i,
  /learn more/i,
  /what is the (opposite|difference)/i,
  /how does .+ relate/i
];

// ============================================================================
// Check 20: Macro/Micro Border
// ============================================================================

export function checkMacroMicroBorder(draft: string): AuditRuleResult {
  // Find the position of supplementary section (if any)
  const lines = draft.split('\n');
  let supplementaryStartLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('##') && SUPPLEMENTARY_HEADING_PATTERNS.some(p => p.test(line))) {
      supplementaryStartLine = i;
      break;
    }
  }

  // If no supplementary section, check if there are links in first 70% of content
  const mainContentEndLine = supplementaryStartLine > 0
    ? supplementaryStartLine
    : Math.floor(lines.length * 0.7);

  const mainContent = lines.slice(0, mainContentEndLine).join('\n');

  // Count links in main content (excluding list items which may be intentional)
  const linksInMainContent: string[] = [];
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;

  while ((match = linkPattern.exec(mainContent)) !== null) {
    // Skip if in a list item (starts with - or *)
    const lineStart = mainContent.lastIndexOf('\n', match.index);
    const lineText = mainContent.substring(lineStart + 1, match.index);
    if (!lineText.trim().match(/^[-*\d.]/)) {
      linksInMainContent.push(match[1]);
    }
  }

  // Allow up to 2 inline links in main content, but flag if more
  if (linksInMainContent.length > 2 && supplementaryStartLine < 0) {
    return {
      ruleName: 'Macro/Micro Border',
      isPassing: false,
      details: `Found ${linksInMainContent.length} internal links in main content without a designated supplementary section.`,
      affectedTextSnippet: linksInMainContent.slice(0, 3).join(', '),
      remediation: 'Add a "Related Topics" or "See Also" section at the end for tangential links, keeping main content focused.'
    };
  }

  return {
    ruleName: 'Macro/Micro Border',
    isPassing: true,
    details: supplementaryStartLine > 0
      ? 'Content has proper macro/micro segmentation.'
      : 'Main content has minimal tangential links.'
  };
}

// ============================================================================
// Check 21: Extractive Summary Alignment
// ============================================================================

function extractKeyTermsFromHeading(heading: string, language?: string): string[] {
  // Remove common words and extract meaningful terms using language-specific stop words
  const patterns = getAuditPatterns(language || 'en');
  const stopWords = patterns.stopWords;
  const words = heading
    .toLowerCase()
    .replace(/^#+\s*/, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.includes(w));
  return words;
}

export function checkExtractiveSummaryAlignment(draft: string, language?: string): AuditRuleResult {
  const patterns = getAuditPatterns(language || 'en');
  const genericHeadings = patterns.genericHeadings;

  // Extract introduction - look for generic or language-specific intro headings
  const introPatterns = genericHeadings.filter(h =>
    h.includes('intro') || h.includes('inleid') || h.includes('einleit') || h.includes('introd')
  );
  const introPattern = new RegExp(`## (?:${introPatterns.join('|')})\\n\\n([\\s\\S]*?)(?=\\n## )`, 'i');
  const introMatch = draft.match(introPattern);

  if (!introMatch) {
    return {
      ruleName: 'Extractive Summary Alignment',
      isPassing: true,
      details: 'No introduction section found to validate.'
    };
  }

  const intro = introMatch[1].toLowerCase();

  // Extract H2 headings (excluding Introduction and supplementary headings)
  const h2Headings = (draft.match(/^## .+$/gm) || [])
    .filter(h => !genericHeadings.some(g => h.toLowerCase().includes(g)))
    .filter(h => !SUPPLEMENTARY_HEADING_PATTERNS.some(p => p.test(h)));

  if (h2Headings.length < 2) {
    return {
      ruleName: 'Extractive Summary Alignment',
      isPassing: true,
      details: 'Not enough H2 sections to validate alignment.'
    };
  }

  // Check if intro mentions key terms from each H2
  const missingTopics: string[] = [];

  h2Headings.forEach(h2 => {
    const keyTerms = extractKeyTermsFromHeading(h2, language);
    const hasAnyTerm = keyTerms.some(term => intro.includes(term));
    if (!hasAnyTerm && keyTerms.length > 0) {
      missingTopics.push(h2.replace(/^## /, ''));
    }
  });

  // Allow up to 1 missing topic
  if (missingTopics.length > 1) {
    return {
      ruleName: 'Extractive Summary Alignment',
      isPassing: false,
      details: `Introduction does not preview ${missingTopics.length} H2 topics: ${missingTopics.slice(0, 2).join(', ')}`,
      affectedTextSnippet: missingTopics[0],
      remediation: 'Rewrite introduction to mention or preview all major sections covered in the article.'
    };
  }

  return {
    ruleName: 'Extractive Summary Alignment',
    isPassing: true,
    details: 'Introduction properly previews all major sections.'
  };
}

// ============================================================================
// Check 22: Query-Format Alignment
// ============================================================================

type QueryIntentType = 'list' | 'instructional' | 'comparison' | 'definitional' | 'neutral';

function classifyQueryIntent(title: string, language?: string): QueryIntentType {
  const patterns = getAuditPatterns(language || 'en');
  const queryPatterns = patterns.queryPatterns;
  const lower = title.toLowerCase();

  // List patterns (multilingual)
  if (queryPatterns.list.some(p => p.test(lower))) {
    return 'list';
  }

  // Instructional patterns (multilingual)
  if (queryPatterns.instructional.some(p => p.test(lower))) {
    return 'instructional';
  }

  // Comparison patterns (multilingual)
  if (queryPatterns.comparison.some(p => p.test(lower))) {
    return 'comparison';
  }

  // Definitional patterns (multilingual)
  if (queryPatterns.definitional.some(p => p.test(lower))) {
    return 'definitional';
  }

  return 'neutral';
}

export function checkQueryFormatAlignment(draft: string, brief: ContentBrief, language?: string): AuditRuleResult {
  const patterns = getAuditPatterns(language || 'en');
  const definitiveVerbsPattern = patterns.definitiveVerbsPattern;
  const intent = classifyQueryIntent(brief.title, language);

  if (intent === 'neutral') {
    return {
      ruleName: 'Query-Format Alignment',
      isPassing: true,
      details: 'Neutral query intent; format is flexible.'
    };
  }

  const hasUnorderedList = /(?:^|\n)[-*]\s+.+(?:\n[-*]\s+.+){2,}/m.test(draft);
  const hasOrderedList = /(?:^|\n)\d+\.\s+.+(?:\n\d+\.\s+.+){2,}/m.test(draft);
  const hasTable = /\|.+\|.+\|/.test(draft);

  let isPassing = true;
  let details = '';
  let remediation = '';

  switch (intent) {
    case 'list':
      if (!hasUnorderedList && !hasOrderedList) {
        isPassing = false;
        details = `"${brief.title}" implies a list format but no list found in content.`;
        remediation = 'Add an unordered list to enumerate the types/examples mentioned in the title.';
      } else {
        details = 'List query has appropriate list format.';
      }
      break;

    case 'instructional':
      if (!hasOrderedList) {
        isPassing = false;
        details = `Instructional query should use numbered steps but no ordered list found.`;
        remediation = 'Convert steps to a numbered list (1. First step, 2. Second step, etc.).';
      } else {
        details = 'Instructional query has numbered steps.';
      }
      break;

    case 'comparison':
      if (!hasTable && !hasUnorderedList) {
        isPassing = false;
        details = `Comparison query should use a table or structured comparison.`;
        remediation = 'Add a comparison table or bullet-point comparison of features.';
      } else {
        details = 'Comparison query has structured comparison format.';
      }
      break;

    case 'definitional': {
      // Check first 400 chars for definition pattern using language-specific patterns
      const first400 = draft.substring(0, 400);
      const hasDefinition = definitiveVerbsPattern.test(first400);
      if (!hasDefinition) {
        isPassing = false;
        details = `Definitional query should start with a clear definition.`;
        remediation = 'Begin with "[Entity] is..." or equivalent definition in the first paragraph.';
      } else {
        details = 'Definitional query starts with proper definition.';
      }
      break;
    }
  }

  return {
    ruleName: 'Query-Format Alignment',
    isPassing,
    details,
    remediation: isPassing ? undefined : remediation
  };
}
