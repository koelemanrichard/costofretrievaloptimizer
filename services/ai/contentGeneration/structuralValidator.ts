// services/ai/contentGeneration/structuralValidator.ts
import { ContentGenerationSection } from '../../../types';

/**
 * Structural Element Snapshot
 *
 * Captures the structural composition of content at a specific pass.
 * Used for:
 * - Tracking what changed in each pass
 * - Detecting regressions (element loss)
 * - UI visualization in PassDiffViewer
 */
export interface StructuralSnapshot {
  passNumber: number;
  timestamp: string;
  elements: {
    images: number;
    lists: number;
    tables: number;
    h2Count: number;
    h3Count: number;
    wordCount: number;
  };
  sectionSnapshots: Record<string, {
    images: number;
    lists: number;
    tables: number;
    wordCount: number;
  }>;
}

/**
 * Diff between two snapshots
 */
export interface SnapshotDiff {
  passNumber: number;
  hasRegressions: boolean;
  hasImprovements: boolean;
  changes: {
    images: number;  // Positive = added, negative = removed
    lists: number;
    tables: number;
    h2Count: number;
    h3Count: number;
    wordCount: number;
  };
  regressions: string[];  // Human-readable regression descriptions
  improvements: string[];  // Human-readable improvement descriptions
  sectionChanges: Record<string, {
    images: number;
    lists: number;
    tables: number;
    wordCount: number;
  }>;
}

/**
 * Count image placeholders in content.
 * Matches pattern: [IMAGE: description | alt text]
 */
function countImages(content: string): number {
  const matches = content.match(/\[IMAGE:[^\]]+\]/g);
  return matches ? matches.length : 0;
}

/**
 * Count list blocks in content (both Markdown and HTML).
 */
function countLists(content: string): number {
  // Count markdown list blocks (consecutive lines starting with - or *)
  const markdownListBlocks = (content.match(/(?:^|\n)[-*]\s+[^\n]+(?:\n[-*]\s+[^\n]+)*/gm) || []).length;
  // Count HTML lists
  const htmlLists = (content.match(/<[ou]l>/gi) || []).length;
  return Math.max(markdownListBlocks, htmlLists);
}

/**
 * Count tables in content (both Markdown and HTML).
 */
function countTables(content: string): number {
  // Markdown tables: rows with |---|
  const markdownTables = (content.match(/\|[-:]+\|/g) || []).length;
  // HTML tables
  const htmlTables = (content.match(/<table>/gi) || []).length;
  return Math.max(markdownTables, htmlTables);
}

/**
 * Count headings in content.
 */
function countHeadings(content: string): { h2: number; h3: number } {
  const h2 = (content.match(/^##\s+[^\n]+/gm) || []).length;
  const h3 = (content.match(/^###\s+[^\n]+/gm) || []).length;
  return { h2, h3 };
}

/**
 * Count words in content.
 */
function countWords(content: string): number {
  return content.split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Capture a structural snapshot from a single content string.
 */
export function captureSnapshot(content: string, passNumber: number): StructuralSnapshot {
  const headings = countHeadings(content);

  return {
    passNumber,
    timestamp: new Date().toISOString(),
    elements: {
      images: countImages(content),
      lists: countLists(content),
      tables: countTables(content),
      h2Count: headings.h2,
      h3Count: headings.h3,
      wordCount: countWords(content)
    },
    sectionSnapshots: {}
  };
}

/**
 * Capture a structural snapshot from an array of sections.
 * Includes per-section breakdown for detailed analysis.
 */
export function captureFromSections(
  sections: ContentGenerationSection[],
  passNumber: number
): StructuralSnapshot {
  const sectionSnapshots: StructuralSnapshot['sectionSnapshots'] = {};
  let totalImages = 0;
  let totalLists = 0;
  let totalTables = 0;
  let totalH2 = 0;
  let totalH3 = 0;
  let totalWords = 0;

  for (const section of sections) {
    const content = section.current_content || '';
    const images = countImages(content);
    const lists = countLists(content);
    const tables = countTables(content);
    const headings = countHeadings(content);
    const words = countWords(content);

    sectionSnapshots[section.section_key] = {
      images,
      lists,
      tables,
      wordCount: words
    };

    totalImages += images;
    totalLists += lists;
    totalTables += tables;
    totalH2 += headings.h2;
    totalH3 += headings.h3;
    totalWords += words;
  }

  return {
    passNumber,
    timestamp: new Date().toISOString(),
    elements: {
      images: totalImages,
      lists: totalLists,
      tables: totalTables,
      h2Count: totalH2,
      h3Count: totalH3,
      wordCount: totalWords
    },
    sectionSnapshots
  };
}

/**
 * Compare two snapshots and produce a diff.
 */
export function compareSnapshots(
  before: StructuralSnapshot,
  after: StructuralSnapshot
): SnapshotDiff {
  const changes = {
    images: after.elements.images - before.elements.images,
    lists: after.elements.lists - before.elements.lists,
    tables: after.elements.tables - before.elements.tables,
    h2Count: after.elements.h2Count - before.elements.h2Count,
    h3Count: after.elements.h3Count - before.elements.h3Count,
    wordCount: after.elements.wordCount - before.elements.wordCount
  };

  const regressions: string[] = [];
  const improvements: string[] = [];

  // Check for regressions (element loss)
  if (changes.images < 0) {
    regressions.push(`Lost ${Math.abs(changes.images)} image(s)`);
  }
  if (changes.lists < 0) {
    regressions.push(`Lost ${Math.abs(changes.lists)} list(s)`);
  }
  if (changes.tables < 0) {
    regressions.push(`Lost ${Math.abs(changes.tables)} table(s)`);
  }
  if (changes.h2Count < 0) {
    regressions.push(`Lost ${Math.abs(changes.h2Count)} H2 heading(s)`);
  }
  if (changes.wordCount < before.elements.wordCount * -0.3 && before.elements.wordCount > 200) {
    regressions.push(`Significant word count reduction (${Math.round((changes.wordCount / before.elements.wordCount) * 100)}%)`);
  }

  // Check for improvements (element addition)
  if (changes.images > 0) {
    improvements.push(`Added ${changes.images} image(s)`);
  }
  if (changes.lists > 0) {
    improvements.push(`Added ${changes.lists} list(s)`);
  }
  if (changes.tables > 0) {
    improvements.push(`Added ${changes.tables} table(s)`);
  }
  if (changes.wordCount > 100) {
    improvements.push(`Added ${changes.wordCount} words`);
  }

  // Per-section changes
  const sectionChanges: SnapshotDiff['sectionChanges'] = {};
  const allSectionKeys = new Set([
    ...Object.keys(before.sectionSnapshots),
    ...Object.keys(after.sectionSnapshots)
  ]);

  for (const key of allSectionKeys) {
    const beforeSection = before.sectionSnapshots[key] || { images: 0, lists: 0, tables: 0, wordCount: 0 };
    const afterSection = after.sectionSnapshots[key] || { images: 0, lists: 0, tables: 0, wordCount: 0 };

    sectionChanges[key] = {
      images: afterSection.images - beforeSection.images,
      lists: afterSection.lists - beforeSection.lists,
      tables: afterSection.tables - beforeSection.tables,
      wordCount: afterSection.wordCount - beforeSection.wordCount
    };
  }

  return {
    passNumber: after.passNumber,
    hasRegressions: regressions.length > 0,
    hasImprovements: improvements.length > 0,
    changes,
    regressions,
    improvements,
    sectionChanges
  };
}

/**
 * Create an empty snapshot (for initial state).
 */
export function createEmptySnapshot(passNumber: number = 0): StructuralSnapshot {
  return {
    passNumber,
    timestamp: new Date().toISOString(),
    elements: {
      images: 0,
      lists: 0,
      tables: 0,
      h2Count: 0,
      h3Count: 0,
      wordCount: 0
    },
    sectionSnapshots: {}
  };
}

/**
 * Summarize a snapshot for logging.
 */
export function summarizeSnapshot(snapshot: StructuralSnapshot): string {
  const { elements } = snapshot;
  return `Pass ${snapshot.passNumber}: ${elements.wordCount} words, ${elements.images} images, ${elements.lists} lists, ${elements.tables} tables, ${elements.h2Count + elements.h3Count} headings`;
}

/**
 * Summarize a diff for logging.
 */
export function summarizeDiff(diff: SnapshotDiff): string {
  const parts: string[] = [];

  if (diff.changes.wordCount !== 0) {
    parts.push(`words: ${diff.changes.wordCount > 0 ? '+' : ''}${diff.changes.wordCount}`);
  }
  if (diff.changes.images !== 0) {
    parts.push(`images: ${diff.changes.images > 0 ? '+' : ''}${diff.changes.images}`);
  }
  if (diff.changes.lists !== 0) {
    parts.push(`lists: ${diff.changes.lists > 0 ? '+' : ''}${diff.changes.lists}`);
  }
  if (diff.changes.tables !== 0) {
    parts.push(`tables: ${diff.changes.tables > 0 ? '+' : ''}${diff.changes.tables}`);
  }

  const status = diff.hasRegressions ? '⚠️ REGRESSION' : (diff.hasImprovements ? '✓ IMPROVED' : '→ NO CHANGE');

  return `Pass ${diff.passNumber} ${status}: ${parts.join(', ') || 'no structural changes'}`;
}
