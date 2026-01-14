/**
 * Content Validator
 *
 * Utilities for detecting and fixing content quality issues:
 * - Duplicate sections and paragraphs
 * - Unresolved placeholders
 * - Raw markdown leakage
 * - Structural anomalies
 *
 * Created: January 14, 2026
 */

// =============================================================================
// Types
// =============================================================================

export interface DuplicateReport {
  hasDuplicates: boolean;
  duplicateHeadings: Array<{ heading: string; count: number; positions: number[] }>;
  duplicateParagraphs: Array<{ fingerprint: string; count: number; positions: number[] }>;
  duplicateImages: Array<{ altText: string; count: number }>;
  totalDuplicates: number;
}

export interface PlaceholderReport {
  hasUnresolved: boolean;
  imagePlaceholders: string[];
  otherPlaceholders: string[];
  totalUnresolved: number;
}

export interface ValidationResult {
  valid: boolean;
  issues: string[];
  duplicateReport?: DuplicateReport;
  placeholderReport?: PlaceholderReport;
  fixedContent?: string;
}

// =============================================================================
// Duplicate Detection
// =============================================================================

/**
 * Detect duplicate sections and paragraphs in content.
 * Identifies repeated headings, paragraphs, and images.
 */
export function detectDuplicateSections(content: string): DuplicateReport {
  const lines = content.split('\n');
  const headingCounts = new Map<string, { count: number; positions: number[] }>();
  const paragraphFingerprints = new Map<string, { count: number; positions: number[] }>();
  const imageCounts = new Map<string, number>();

  // Track headings
  const headingPattern = /^(#{2,4})\s+(.+)$/;
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(headingPattern);
    if (match) {
      const heading = match[2].trim().toLowerCase();
      const existing = headingCounts.get(heading) || { count: 0, positions: [] };
      existing.count++;
      existing.positions.push(i + 1);
      headingCounts.set(heading, existing);
    }
  }

  // Track paragraphs (group consecutive non-empty, non-heading lines)
  let currentParagraph = '';
  let paragraphStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip headings, images, lists, tables
    if (line.startsWith('#') || line.startsWith('![') || line.startsWith('[IMAGE:') ||
        line.startsWith('-') || line.startsWith('*') || line.startsWith('|') ||
        line.match(/^\d+\./)) {
      if (currentParagraph.length > 100) {
        const fingerprint = normalizeForFingerprint(currentParagraph);
        const existing = paragraphFingerprints.get(fingerprint) || { count: 0, positions: [] };
        existing.count++;
        existing.positions.push(paragraphStart + 1);
        paragraphFingerprints.set(fingerprint, existing);
      }
      currentParagraph = '';
      continue;
    }

    if (line === '') {
      if (currentParagraph.length > 100) {
        const fingerprint = normalizeForFingerprint(currentParagraph);
        const existing = paragraphFingerprints.get(fingerprint) || { count: 0, positions: [] };
        existing.count++;
        existing.positions.push(paragraphStart + 1);
        paragraphFingerprints.set(fingerprint, existing);
      }
      currentParagraph = '';
    } else {
      if (currentParagraph === '') {
        paragraphStart = i;
      }
      currentParagraph += ' ' + line;
    }
  }

  // Track images
  const imagePattern = /!\[([^\]]+)\]\([^)]+\)/g;
  let imageMatch;
  while ((imageMatch = imagePattern.exec(content)) !== null) {
    const altText = imageMatch[1];
    imageCounts.set(altText, (imageCounts.get(altText) || 0) + 1);
  }

  // Build report
  const duplicateHeadings = [...headingCounts.entries()]
    .filter(([, data]) => data.count > 1)
    .map(([heading, data]) => ({ heading, count: data.count, positions: data.positions }));

  const duplicateParagraphs = [...paragraphFingerprints.entries()]
    .filter(([, data]) => data.count > 1)
    .map(([fingerprint, data]) => ({ fingerprint: fingerprint.substring(0, 80) + '...', count: data.count, positions: data.positions }));

  const duplicateImages = [...imageCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([altText, count]) => ({ altText: altText.substring(0, 60), count }));

  const totalDuplicates = duplicateHeadings.length + duplicateParagraphs.length + duplicateImages.length;

  return {
    hasDuplicates: totalDuplicates > 0,
    duplicateHeadings,
    duplicateParagraphs,
    duplicateImages,
    totalDuplicates
  };
}

/**
 * Normalize text for fingerprint comparison.
 * Removes whitespace variations and converts to lowercase.
 */
function normalizeForFingerprint(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim()
    .substring(0, 200);
}

// =============================================================================
// Deduplication
// =============================================================================

/**
 * Remove duplicate content from article.
 * Keeps first occurrence of duplicate sections/paragraphs.
 */
export function deduplicateContent(content: string): { content: string; removedCount: number; log: string[] } {
  const log: string[] = [];
  let removedCount = 0;

  // Split into sections by H2 headings
  const sectionPattern = /^## /gm;
  const parts = content.split(sectionPattern);

  if (parts.length <= 1) {
    // No H2 sections, try paragraph-level deduplication
    return deduplicateParagraphs(content);
  }

  // Reconstruct with H2 markers
  const sections: string[] = [];
  if (parts[0].trim()) {
    sections.push(parts[0].trim()); // Content before first H2
  }
  for (let i = 1; i < parts.length; i++) {
    sections.push('## ' + parts[i].trim());
  }

  // Track seen section fingerprints
  const seenSections = new Map<string, number>();
  const dedupedSections: string[] = [];

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const fingerprint = normalizeForFingerprint(section.substring(0, 500));

    const firstOccurrence = seenSections.get(fingerprint);
    if (firstOccurrence !== undefined) {
      log.push(`[Dedup] Removed duplicate section at position ${i} (duplicate of section ${firstOccurrence}): ${section.substring(0, 60)}...`);
      removedCount++;
      continue;
    }

    seenSections.set(fingerprint, i);
    dedupedSections.push(section);
  }

  // Also deduplicate paragraphs within each section
  const finalSections = dedupedSections.map(section => {
    const result = deduplicateParagraphs(section);
    removedCount += result.removedCount;
    log.push(...result.log);
    return result.content;
  });

  return {
    content: finalSections.join('\n\n'),
    removedCount,
    log
  };
}

/**
 * Deduplicate paragraphs within content.
 */
function deduplicateParagraphs(content: string): { content: string; removedCount: number; log: string[] } {
  const log: string[] = [];
  let removedCount = 0;

  const lines = content.split('\n');
  const seenParagraphs = new Set<string>();
  const result: string[] = [];

  let currentParagraph: string[] = [];

  const flushParagraph = () => {
    if (currentParagraph.length === 0) return;

    const paragraph = currentParagraph.join('\n');
    const fingerprint = normalizeForFingerprint(paragraph);

    // Only deduplicate substantial paragraphs
    if (paragraph.length > 150 && seenParagraphs.has(fingerprint)) {
      log.push(`[Dedup] Removed duplicate paragraph: ${paragraph.substring(0, 50)}...`);
      removedCount++;
    } else {
      if (paragraph.length > 150) {
        seenParagraphs.add(fingerprint);
      }
      result.push(paragraph);
    }

    currentParagraph = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Structural elements break paragraphs
    if (trimmed === '' || trimmed.startsWith('#') || trimmed.startsWith('![') ||
        trimmed.startsWith('[IMAGE:') || trimmed.startsWith('|') ||
        trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.match(/^\d+\./)) {
      flushParagraph();
      result.push(line);
    } else {
      currentParagraph.push(line);
    }
  }

  flushParagraph();

  return {
    content: result.join('\n'),
    removedCount,
    log
  };
}

// =============================================================================
// Placeholder Detection
// =============================================================================

/**
 * Detect unresolved placeholders in content.
 */
export function detectUnresolvedPlaceholders(content: string): PlaceholderReport {
  const imagePlaceholders: string[] = [];
  const otherPlaceholders: string[] = [];

  // [IMAGE: description | alt text] pattern
  const imagePattern = /\[IMAGE:[^\]]+\]/g;
  let match;
  while ((match = imagePattern.exec(content)) !== null) {
    imagePlaceholders.push(match[0]);
  }

  // Other common placeholder patterns
  const patterns = [
    /\[TODO:[^\]]+\]/g,
    /\[PLACEHOLDER:[^\]]+\]/g,
    /\[INSERT:[^\]]+\]/g,
    /\{\{[^}]+\}\}/g,
  ];

  for (const pattern of patterns) {
    while ((match = pattern.exec(content)) !== null) {
      otherPlaceholders.push(match[0]);
    }
  }

  const totalUnresolved = imagePlaceholders.length + otherPlaceholders.length;

  return {
    hasUnresolved: totalUnresolved > 0,
    imagePlaceholders,
    otherPlaceholders,
    totalUnresolved
  };
}

// =============================================================================
// H1 Handling
// =============================================================================

/**
 * Strip markdown H1 from content.
 * Useful when H1 is added separately by the template.
 */
export function stripH1FromMarkdown(content: string): string {
  // Remove H1 at the start of content
  return content.replace(/^#\s+[^\n]+\n*/, '').trim();
}

/**
 * Ensure content has exactly one H1 at the start.
 * If multiple H1s exist, keeps only the first.
 */
export function normalizeH1(content: string, title?: string): string {
  // Remove all H1s
  const withoutH1 = content.replace(/^#\s+[^\n]+\n*/gm, '').trim();

  // Add H1 at start if title provided
  if (title) {
    return `# ${title}\n\n${withoutH1}`;
  }

  return withoutH1;
}

// =============================================================================
// Full Validation
// =============================================================================

/**
 * Comprehensive content validation for export readiness.
 * Returns issues and optionally fixes content.
 */
export function validateContentForExport(content: string, options: { autoFix?: boolean } = {}): ValidationResult {
  const issues: string[] = [];

  // Check for duplicates
  const duplicateReport = detectDuplicateSections(content);
  if (duplicateReport.hasDuplicates) {
    if (duplicateReport.duplicateHeadings.length > 0) {
      issues.push(`${duplicateReport.duplicateHeadings.length} duplicate heading(s) found`);
    }
    if (duplicateReport.duplicateParagraphs.length > 0) {
      issues.push(`${duplicateReport.duplicateParagraphs.length} duplicate paragraph(s) found`);
    }
    if (duplicateReport.duplicateImages.length > 0) {
      issues.push(`${duplicateReport.duplicateImages.length} duplicate image(s) found`);
    }
  }

  // Check for unresolved placeholders
  const placeholderReport = detectUnresolvedPlaceholders(content);
  if (placeholderReport.hasUnresolved) {
    if (placeholderReport.imagePlaceholders.length > 0) {
      issues.push(`${placeholderReport.imagePlaceholders.length} unresolved IMAGE placeholder(s)`);
    }
    if (placeholderReport.otherPlaceholders.length > 0) {
      issues.push(`${placeholderReport.otherPlaceholders.length} other placeholder(s)`);
    }
  }

  // Check for raw markdown that should have been converted
  const rawH1Pattern = /^# [^\n]+$/m;
  const hasRawH1AfterFirstLine = content.split('\n').slice(1).some(line => rawH1Pattern.test(line));
  if (hasRawH1AfterFirstLine) {
    issues.push('Possible duplicate H1 heading in content body');
  }

  // Auto-fix if requested
  let fixedContent: string | undefined;
  if (options.autoFix && issues.length > 0) {
    const dedupResult = deduplicateContent(content);
    fixedContent = dedupResult.content;

    // Log what was fixed
    if (dedupResult.removedCount > 0) {
      console.log(`[ContentValidator] Auto-fixed ${dedupResult.removedCount} duplicate(s)`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    duplicateReport,
    placeholderReport,
    fixedContent
  };
}
