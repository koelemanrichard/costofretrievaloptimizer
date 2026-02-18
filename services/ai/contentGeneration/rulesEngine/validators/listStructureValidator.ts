// services/ai/contentGeneration/rulesEngine/validators/listStructureValidator.ts

import { ValidationViolation, SectionGenerationContext } from '../../../../../types';

interface ExtractedList {
  type: 'ordered' | 'unordered';
  items: string[];
  position: number;
}

const MIN_LIST_ITEMS = 3;
const MAX_LIST_ITEMS = 7;

export class ListStructureValidator {
  /**
   * Extract lists from HTML and markdown content
   */
  static extractLists(content: string): ExtractedList[] {
    const lists: ExtractedList[] = [];

    // Extract HTML lists
    const htmlListRegex = /<(ul|ol)>([\s\S]*?)<\/\1>/gi;
    let match;
    while ((match = htmlListRegex.exec(content)) !== null) {
      const listType = match[1].toLowerCase() === 'ol' ? 'ordered' : 'unordered';
      const listContent = match[2];
      const items = this.extractListItems(listContent);
      if (items.length > 0) {
        lists.push({ type: listType, items, position: match.index });
      }
    }

    // Extract markdown unordered lists (- or *)
    const mdUnorderedRegex = /(?:^|\n)((?:[-*]\s+.+\n?)+)/g;
    while ((match = mdUnorderedRegex.exec(content)) !== null) {
      const items = match[1].split('\n')
        .map(line => line.replace(/^[-*]\s+/, '').trim())
        .filter(item => item.length > 0);
      if (items.length > 0) {
        lists.push({ type: 'unordered', items, position: match.index });
      }
    }

    // Extract markdown ordered lists (1. 2. etc)
    const mdOrderedRegex = /(?:^|\n)((?:\d+\.\s+.+\n?)+)/g;
    while ((match = mdOrderedRegex.exec(content)) !== null) {
      const items = match[1].split('\n')
        .map(line => line.replace(/^\d+\.\s+/, '').trim())
        .filter(item => item.length > 0);
      if (items.length > 0) {
        lists.push({ type: 'ordered', items, position: match.index });
      }
    }

    return lists;
  }

  private static extractListItems(listContent: string): string[] {
    const itemRegex = /<li>([\s\S]*?)<\/li>/gi;
    const items: string[] = [];
    let match;
    while ((match = itemRegex.exec(listContent)) !== null) {
      const text = match[1].replace(/<[^>]*>/g, '').trim();
      if (text.length > 0) items.push(text);
    }
    return items;
  }

  /**
   * Detect the grammatical pattern of a list item's first word
   */
  private static detectPattern(item: string): string {
    const firstWord = item.split(/\s+/)[0]?.toLowerCase() || '';

    // Check for infinitive pattern (starts with "to ")
    if (item.toLowerCase().startsWith('to ')) return 'infinitive';

    // Common verb endings
    if (firstWord.endsWith('ing')) return 'gerund';
    if (firstWord.endsWith('ed')) return 'past';

    // Common imperative verbs
    const imperatives = [
      'install', 'configure', 'run', 'create', 'add', 'remove', 'update',
      'check', 'verify', 'ensure', 'use', 'set', 'get', 'make', 'take',
      'find', 'select', 'click', 'open', 'close', 'save', 'delete',
      'copy', 'paste', 'move', 'test', 'build', 'deploy', 'start', 'stop'
    ];
    if (imperatives.includes(firstWord)) return 'imperative';

    // Noun patterns (articles)
    if (['a', 'an', 'the'].includes(firstWord)) return 'noun-phrase';

    return 'other';
  }

  /**
   * Check if list items have parallel structure
   */
  static checkParallelStructure(items: string[]): { isParallel: boolean; dominantPattern: string; violations: string[] } {
    if (items.length < 2) return { isParallel: true, dominantPattern: 'N/A', violations: [] };

    const patterns = items.map(item => this.detectPattern(item));
    const patternCounts: Record<string, number> = {};

    patterns.forEach(p => {
      patternCounts[p] = (patternCounts[p] || 0) + 1;
    });

    const dominantPattern = Object.entries(patternCounts)
      .sort((a, b) => b[1] - a[1])[0][0];

    const dominantCount = patternCounts[dominantPattern];
    const threshold = Math.ceil(items.length * 0.7); // 70% should match

    const violations = items.filter((item, i) => patterns[i] !== dominantPattern);

    return {
      isParallel: dominantCount >= threshold,
      dominantPattern,
      violations,
    };
  }

  /**
   * Check if a list has a proper introductory sentence before it.
   * Lists must be introduced with a complete sentence ending in colon or period.
   */
  static checkIntroductorySentence(content: string, listPosition: number): boolean {
    // Get text before the list
    const textBefore = content.substring(0, listPosition).trimEnd();
    if (textBefore.length === 0) return false;

    // Get the last line before the list
    const lines = textBefore.split('\n').filter(l => l.trim().length > 0);
    const lastLine = lines[lines.length - 1]?.trim() || '';

    // Should end with colon or be a complete sentence
    if (lastLine.endsWith(':')) return true;
    if (/[.!?]$/.test(lastLine) && lastLine.split(/\s+/).length >= 3) return true;

    // Check for heading (which serves as introduction)
    if (/^#{1,6}\s+/.test(lastLine)) return true;
    if (/<h[1-6]/i.test(lastLine)) return true;

    return false;
  }

  /**
   * Validate list structure rules K4, K5, and K6
   */
  static validate(content: string, context: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    const lists = this.extractLists(content);

    for (const list of lists) {
      // K6: Introductory sentence validation
      if (!this.checkIntroductorySentence(content, list.position)) {
        violations.push({
          rule: 'K6_LIST_INTRO',
          text: `List at position ${list.position} lacks introductory sentence`,
          position: list.position,
          suggestion: 'Every list must be preceded by a complete introductory sentence. Add a sentence ending with ":" or "." before the list.',
          severity: 'warning',
        });
      }

      // K4: Item count validation
      if (list.items.length < MIN_LIST_ITEMS) {
        violations.push({
          rule: 'K4_LIST_ITEM_COUNT',
          text: `List has ${list.items.length} items, minimum is ${MIN_LIST_ITEMS}`,
          position: list.position,
          suggestion: `Add ${MIN_LIST_ITEMS - list.items.length} more items to the list, or convert to prose if fewer items are appropriate.`,
          severity: 'warning',
        });
      }

      if (list.items.length > MAX_LIST_ITEMS) {
        violations.push({
          rule: 'K4_LIST_ITEM_COUNT',
          text: `List has ${list.items.length} items, maximum is ${MAX_LIST_ITEMS}`,
          position: list.position,
          suggestion: `Split into multiple lists or consolidate items. Lists with more than ${MAX_LIST_ITEMS} items are harder to scan.`,
          severity: 'warning',
        });
      }

      // K5: Parallel structure validation
      if (list.items.length >= 3) {
        const parallelCheck = this.checkParallelStructure(list.items);
        if (!parallelCheck.isParallel) {
          violations.push({
            rule: 'K5_PARALLEL_STRUCTURE',
            text: `List items lack parallel structure. Dominant pattern: ${parallelCheck.dominantPattern}`,
            position: list.position,
            suggestion: `Rewrite list items to use consistent grammatical structure. Non-parallel items: "${parallelCheck.violations.slice(0, 2).join('", "')}"`,
            severity: 'warning',
          });
        }
      }
    }

    return violations;
  }
}
