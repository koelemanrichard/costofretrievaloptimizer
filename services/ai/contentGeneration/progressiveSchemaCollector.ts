// services/ai/contentGeneration/progressiveSchemaCollector.ts
// Collects schema-relevant data progressively during passes 1-8

import type { ProgressiveSchemaData, ContentBrief, BriefSection } from '../../../types';

/**
 * Initialize empty progressive schema data
 */
export function createEmptyProgressiveData(): ProgressiveSchemaData {
  return {
    passesContributed: [],
    lastUpdatedAt: new Date().toISOString()
  };
}

/**
 * Collect data from Pass 1 (Draft Generation)
 */
export function collectFromPass1(
  existingData: ProgressiveSchemaData,
  draftContent: string,
  brief: ContentBrief
): ProgressiveSchemaData {
  const sections = extractSectionsFromOutline(brief.structured_outline || []);

  return {
    ...existingData,
    mainEntity: extractMainEntity(draftContent, brief),
    headline: brief.title,
    description: brief.metaDescription,
    wordCount: countWords(draftContent),
    sections,
    passesContributed: [...(existingData.passesContributed || []), 1],
    lastUpdatedAt: new Date().toISOString()
  };
}

/**
 * Collect data from Pass 3 (Lists & Tables)
 */
export function collectFromPass3(
  existingData: ProgressiveSchemaData,
  content: string,
  brief: ContentBrief
): ProgressiveSchemaData {
  const hasPart = extractStructuredParts(content, brief);

  return {
    ...existingData,
    hasPart,
    passesContributed: [...(existingData.passesContributed || []), 3],
    lastUpdatedAt: new Date().toISOString()
  };
}

/**
 * Collect data from Pass 4 (Visual Semantics)
 */
export function collectFromPass4(
  existingData: ProgressiveSchemaData,
  content: string,
  brief: ContentBrief
): ProgressiveSchemaData {
  const images = extractImageData(content, brief);

  return {
    ...existingData,
    images,
    passesContributed: [...(existingData.passesContributed || []), 4],
    lastUpdatedAt: new Date().toISOString()
  };
}

/**
 * Collect data from Pass 5 (Micro Semantics)
 */
export function collectFromPass5(
  existingData: ProgressiveSchemaData,
  content: string,
  brief: ContentBrief
): ProgressiveSchemaData {
  const keywords = extractKeywords(content, brief);
  const entities = extractEntities(content);

  return {
    ...existingData,
    keywords,
    entities,
    passesContributed: [...(existingData.passesContributed || []), 5],
    lastUpdatedAt: new Date().toISOString()
  };
}

/**
 * Collect data from Pass 7 (Introduction Synthesis)
 */
export function collectFromPass7(
  existingData: ProgressiveSchemaData,
  content: string
): ProgressiveSchemaData {
  const abstractText = extractAbstract(content);

  return {
    ...existingData,
    abstractText,
    passesContributed: [...(existingData.passesContributed || []), 7],
    lastUpdatedAt: new Date().toISOString()
  };
}

/**
 * Collect data from Pass 8 (Final Audit)
 */
export function collectFromPass8(
  existingData: ProgressiveSchemaData,
  auditScore: number,
  readabilityScore?: number,
  finalDraftContent?: string
): ProgressiveSchemaData {
  return {
    ...existingData,
    qualityScore: auditScore,
    readabilityScore,
    // CRITICAL: Update wordCount with final content (Pass 1 wordCount is stale after all optimizations)
    wordCount: finalDraftContent ? countWords(finalDraftContent) : existingData.wordCount,
    passesContributed: [...(existingData.passesContributed || []), 8],
    lastUpdatedAt: new Date().toISOString()
  };
}

/**
 * Collect data from any pass (generic collector)
 */
export function collectFromPass(
  existingData: ProgressiveSchemaData,
  passNumber: number,
  content: string,
  brief: ContentBrief,
  additionalData?: Partial<ProgressiveSchemaData>
): ProgressiveSchemaData {
  let newData = { ...existingData };

  switch (passNumber) {
    case 1:
      newData = collectFromPass1(newData, content, brief);
      break;
    case 3:
      newData = collectFromPass3(newData, content, brief);
      break;
    case 4:
      newData = collectFromPass4(newData, content, brief);
      break;
    case 5:
      newData = collectFromPass5(newData, content, brief);
      break;
    case 7:
      newData = collectFromPass7(newData, content);
      break;
    default:
      // For passes 2, 6 - just update the timestamp
      newData.passesContributed = [...(newData.passesContributed || []), passNumber];
      newData.lastUpdatedAt = new Date().toISOString();
  }

  // Merge additional data if provided
  if (additionalData) {
    newData = { ...newData, ...additionalData };
  }

  return newData;
}

/**
 * Validate completeness of progressive data
 */
export function validateCompleteness(data: ProgressiveSchemaData): {
  isComplete: boolean;
  missingFields: string[];
  completedPasses: number[];
} {
  const missingFields: string[] = [];

  if (!data.mainEntity) missingFields.push('mainEntity');
  if (!data.headline) missingFields.push('headline');
  if (!data.description) missingFields.push('description');
  if (!data.wordCount) missingFields.push('wordCount');

  const completedPasses = data.passesContributed || [];

  return {
    isComplete: missingFields.length === 0,
    missingFields,
    completedPasses
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function extractMainEntity(content: string, brief: ContentBrief): string {
  // Use title as main entity, or extract from first heading
  const h1Match = content.match(/^#\s+(.+)$/m);
  return h1Match ? h1Match[1] : brief.title;
}

function countWords(content: string): number {
  // Remove markdown formatting
  const plainText = content
    .replace(/```[\s\S]*?```/g, '') // Code blocks
    .replace(/`[^`]+`/g, '')        // Inline code
    .replace(/!\[.*?\]\(.*?\)/g, '') // Images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
    .replace(/[#*_~`]/g, '')         // Markdown chars
    .replace(/\s+/g, ' ')            // Normalize whitespace
    .trim();

  return plainText.split(' ').filter(w => w.length > 0).length;
}

function extractSectionsFromOutline(
  outline: BriefSection[]
): Array<{ name: string; about: string; order: number }> {
  const sections: Array<{ name: string; about: string; order: number }> = [];

  function traverse(items: BriefSection[], order: number = 0) {
    for (const item of items) {
      sections.push({
        name: item.heading,
        about: item.subordinate_text_hint || '',
        order: item.order || order++
      });
      if (item.subsections?.length) {
        traverse(item.subsections, order);
      }
    }
  }

  traverse(outline);
  return sections;
}

function extractStructuredParts(
  content: string,
  brief: ContentBrief
): Array<{ type: 'ItemList' | 'HowToStep' | 'FAQPage' | 'Table'; name?: string; items: unknown[] }> {
  const parts: Array<{ type: 'ItemList' | 'HowToStep' | 'FAQPage' | 'Table'; name?: string; items: unknown[] }> = [];

  // Extract ordered lists (potential HowTo steps)
  const orderedListMatches = content.match(/^(\d+\.\s+.+)$/gm);
  if (orderedListMatches && orderedListMatches.length >= 3) {
    parts.push({
      type: 'HowToStep',
      items: orderedListMatches.map(item => ({
        text: item.replace(/^\d+\.\s+/, '')
      }))
    });
  }

  // Extract unordered lists (potential ItemList)
  const unorderedListMatches = content.match(/^[-*]\s+.+$/gm);
  if (unorderedListMatches && unorderedListMatches.length >= 3) {
    parts.push({
      type: 'ItemList',
      items: unorderedListMatches.map(item => ({
        text: item.replace(/^[-*]\s+/, '')
      }))
    });
  }

  // Detect FAQ patterns (questions followed by answers)
  const faqPattern = /^#+\s+([^?]+\?)\s*\n+([^#]+)/gm;
  const faqMatches = [...content.matchAll(faqPattern)];
  if (faqMatches.length >= 2) {
    parts.push({
      type: 'FAQPage',
      items: faqMatches.map(match => ({
        question: match[1].trim(),
        answer: match[2].trim()
      }))
    });
  }

  // Detect tables
  const tablePattern = /\|[^|]+\|/gm;
  const tableMatches = content.match(tablePattern);
  if (tableMatches && tableMatches.length >= 3) {
    parts.push({
      type: 'Table',
      items: tableMatches
    });
  }

  return parts;
}

function extractImageData(
  content: string,
  brief: ContentBrief
): Array<{ description: string; caption: string; contentUrl?: string; altText?: string }> {
  const images: Array<{ description: string; caption: string; contentUrl?: string; altText?: string }> = [];

  // Extract markdown images
  const imageMatches = [...content.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)];
  for (const match of imageMatches) {
    images.push({
      description: match[1] || '',
      caption: match[1] || '',
      contentUrl: match[2],
      altText: match[1]
    });
  }

  // Add visual semantics from brief
  if (brief.visual_semantics) {
    for (const visual of brief.visual_semantics) {
      images.push({
        description: visual.description,
        caption: visual.caption_data || visual.description
      });
    }
  }

  return images;
}

function extractKeywords(content: string, brief: ContentBrief): string[] {
  const keywords: string[] = [];

  // Add target keyword
  if (brief.targetKeyword) {
    keywords.push(brief.targetKeyword);
  }

  // Extract from key takeaways
  if (brief.keyTakeaways) {
    keywords.push(...brief.keyTakeaways.slice(0, 5));
  }

  // Extract from EAVs
  if (brief.contextualVectors) {
    for (const vector of brief.contextualVectors.slice(0, 5)) {
      if (vector.subject?.label) {
        keywords.push(vector.subject.label);
      }
    }
  }

  // Remove duplicates
  return [...new Set(keywords)];
}

function extractEntities(content: string): string[] {
  const entities: string[] = [];

  // Extract capitalized multi-word phrases (proper nouns)
  const properNounMatches = content.match(/[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)+/g);
  if (properNounMatches) {
    entities.push(...properNounMatches.slice(0, 10));
  }

  // Extract single capitalized words that appear multiple times
  const capitalizedWords = content.match(/\b[A-Z][a-zA-Z]{3,}\b/g);
  if (capitalizedWords) {
    const wordCounts = new Map<string, number>();
    for (const word of capitalizedWords) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }

    // Add words that appear 2+ times
    for (const [word, count] of wordCounts) {
      if (count >= 2 && !isCommonWord(word)) {
        entities.push(word);
      }
    }
  }

  // Remove duplicates
  return [...new Set(entities)].slice(0, 15);
}

function extractAbstract(content: string): string {
  // Try to find introduction section
  const introMatch = content.match(/^#\s+[^\n]+\n+([^#]+)/);
  if (introMatch) {
    return introMatch[1]
      .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
      .trim()
      .slice(0, 500);
  }

  // Fall back to first paragraph
  const firstParagraph = content.match(/^([^#\n][^\n]+)/m);
  if (firstParagraph) {
    return firstParagraph[1].trim().slice(0, 500);
  }

  return '';
}

function isCommonWord(word: string): boolean {
  const commonWords = new Set([
    'The', 'This', 'That', 'These', 'Those', 'What', 'When', 'Where', 'Which',
    'Who', 'Why', 'How', 'Can', 'Could', 'Would', 'Should', 'Will', 'Have',
    'Has', 'Had', 'Are', 'Was', 'Were', 'Been', 'Being', 'Being', 'Does',
    'Did', 'Done', 'Make', 'Made', 'Take', 'Took', 'Come', 'Came', 'Give',
    'Gave', 'Find', 'Found', 'Know', 'Knew', 'Think', 'Thought', 'See', 'Saw',
    'Want', 'Need', 'Use', 'Used', 'Try', 'Tried', 'Tell', 'Told', 'Ask',
    'Asked', 'Work', 'Worked', 'Seem', 'Seemed', 'Feel', 'Felt', 'Leave',
    'Left', 'Call', 'Called', 'Keep', 'Kept', 'Let', 'Begin', 'Began',
    'Show', 'Showed', 'Hear', 'Heard', 'Play', 'Played', 'Run', 'Ran',
    'Move', 'Moved', 'Live', 'Lived', 'Believe', 'Hold', 'Bring', 'Brought',
    'Write', 'Wrote', 'Provide', 'Sit', 'Sat', 'Stand', 'Stood', 'Lose',
    'Lost', 'Pay', 'Paid', 'Meet', 'Met', 'Include', 'Continue', 'Set',
    'Learn', 'Learned', 'Change', 'Changed', 'Lead', 'Led', 'Understand',
    'Watch', 'Watched', 'Follow', 'Followed', 'Stop', 'Stopped', 'Create',
    'Speak', 'Spoke', 'Read', 'Allow', 'Allowed', 'Add', 'Added', 'Spend',
    'Spent', 'Grow', 'Grew', 'Open', 'Opened', 'Walk', 'Walked', 'Win', 'Won',
    'Offer', 'Offered', 'Remember', 'Love', 'Loved', 'Consider', 'Appear',
    'Buy', 'Bought', 'Wait', 'Waited', 'Serve', 'Served', 'Die', 'Died',
    'Send', 'Sent', 'Expect', 'Build', 'Built', 'Stay', 'Stayed', 'Fall',
    'Fell', 'Cut', 'Reach', 'Reached', 'Kill', 'Killed', 'Remain', 'Suggest',
    'Raise', 'Raised', 'Pass', 'Passed', 'Sell', 'Sold', 'Require', 'Report',
    'Decide', 'Pull', 'Pulled'
  ]);

  return commonWords.has(word);
}
