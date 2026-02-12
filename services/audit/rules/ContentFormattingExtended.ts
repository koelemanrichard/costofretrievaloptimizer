/**
 * ContentFormattingExtended
 *
 * Extended content formatting validation: list/table formatting details and visual hierarchy.
 *
 * List/Table Rules:
 *   211 - List item consistency (no item >3x longer than average)
 *   212 - List item punctuation consistency (all with periods, or none)
 *   213 - List item parallelism (same grammatical form)
 *   214 - List size (3-10 items, complementing rule 215)
 *   215 - Nested list depth (max 2 levels)
 *   216 - Table header descriptiveness (no generic "Column 1" headers)
 *   217 - Table cell alignment (numeric columns suggest right-align)
 *   218 - Table caption presence
 *   219 - Table complexity (max 7 columns, 20 rows)
 *
 * Visual Hierarchy Rules:
 *   220 - Scannable content (heading/break every 300 words max)
 *   221 - Emphasis usage (<strong>/<em> max 5% of text)
 *   222 - Blockquote usage (should contain actual quotes)
 *   223 - Content variety (>1000 word articles need 3+ content types)
 *   224 - Whitespace distribution (no paragraph >150 words)
 */

export interface ContentFormattingIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  exampleFix?: string;
}

/** Parsed list structure used internally */
interface ParsedList {
  type: 'ul' | 'ol';
  items: string[];
  rawHtml: string;
  nestingDepth: number;
}

/** Parsed table structure used internally */
interface ParsedTable {
  headers: string[];
  rows: string[][];
  hasCaption: boolean;
  rawHtml: string;
}

// Common verb infinitives for parallelism detection
const COMMON_VERBS = new Set([
  'add', 'apply', 'avoid', 'build', 'check', 'choose', 'click', 'close',
  'configure', 'connect', 'consider', 'copy', 'create', 'define', 'delete',
  'deploy', 'design', 'determine', 'disable', 'download', 'edit', 'enable',
  'enter', 'ensure', 'evaluate', 'examine', 'execute', 'find', 'follow',
  'generate', 'get', 'go', 'identify', 'implement', 'import', 'include',
  'install', 'keep', 'learn', 'locate', 'log', 'make', 'manage', 'monitor',
  'move', 'navigate', 'note', 'open', 'optimize', 'paste', 'perform',
  'place', 'plan', 'prepare', 'press', 'prevent', 'provide', 'read',
  'reduce', 'remove', 'replace', 'report', 'require', 'restart', 'review',
  'run', 'save', 'scan', 'scroll', 'search', 'select', 'set', 'specify',
  'start', 'stop', 'submit', 'switch', 'test', 'try', 'turn', 'type',
  'understand', 'update', 'upload', 'use', 'verify', 'view', 'visit',
  'wait', 'write',
]);

export class ContentFormattingExtended {
  validate(html: string, text?: string): ContentFormattingIssue[] {
    const issues: ContentFormattingIssue[] = [];

    if (!html || html.trim().length === 0) return issues;

    // List rules (211-215)
    const lists = this.extractLists(html);
    this.checkListItemConsistency(lists, issues);     // Rule 211
    this.checkListItemPunctuation(lists, issues);     // Rule 212
    this.checkListItemParallelism(lists, issues);     // Rule 213
    this.checkListSize(lists, issues);                // Rule 214
    this.checkNestedListDepth(html, issues);          // Rule 215

    // Table rules (216-219)
    const tables = this.extractTables(html);
    this.checkTableHeaderDescriptiveness(tables, issues); // Rule 216
    this.checkTableCellAlignment(tables, issues);         // Rule 217
    this.checkTableCaption(tables, issues);               // Rule 218
    this.checkTableComplexity(tables, issues);            // Rule 219

    // Visual hierarchy rules (220-224)
    const plainText = text || this.stripHtml(html);
    this.checkScannableContent(html, plainText, issues);  // Rule 220
    this.checkEmphasisUsage(html, plainText, issues);     // Rule 221
    this.checkBlockquoteUsage(html, issues);              // Rule 222
    this.checkContentVariety(html, plainText, issues);    // Rule 223
    this.checkWhitespaceDistribution(html, issues);       // Rule 224

    return issues;
  }

  // ---------------------------------------------------------------------------
  // List Rules (211-215)
  // ---------------------------------------------------------------------------

  /**
   * Rule 211: List item consistency.
   * All items in a list should have similar length (no item >3x longer than average).
   */
  private checkListItemConsistency(
    lists: ParsedList[],
    issues: ContentFormattingIssue[]
  ): void {
    let inconsistentCount = 0;

    for (const list of lists) {
      if (list.items.length < 2) continue;

      const lengths = list.items.map(item => this.stripHtml(item).trim().length);
      const avgLength = lengths.reduce((sum, l) => sum + l, 0) / lengths.length;
      if (avgLength === 0) continue;

      const hasOutlier = lengths.some(l => l > avgLength * 3);
      if (hasOutlier) inconsistentCount++;
    }

    if (inconsistentCount > 0) {
      issues.push({
        ruleId: 'rule-211',
        severity: 'low',
        title: 'Inconsistent list item length',
        description: `${inconsistentCount} list(s) have items where one item is more than 3x longer than the average. This reduces readability.`,
        exampleFix: 'Shorten overly long items or move detail to a sub-list or follow-up paragraph.',
      });
    }
  }

  /**
   * Rule 212: List item punctuation consistency.
   * All items should end with a period, or none should.
   */
  private checkListItemPunctuation(
    lists: ParsedList[],
    issues: ContentFormattingIssue[]
  ): void {
    let inconsistentCount = 0;

    for (const list of lists) {
      if (list.items.length < 2) continue;

      const endings = list.items.map(item => {
        const text = this.stripHtml(item).trim();
        return text.endsWith('.');
      });

      const withPeriod = endings.filter(e => e).length;
      // Inconsistent = some have periods, some do not (not all or none)
      if (withPeriod > 0 && withPeriod < endings.length) {
        inconsistentCount++;
      }
    }

    if (inconsistentCount > 0) {
      issues.push({
        ruleId: 'rule-212',
        severity: 'low',
        title: 'Inconsistent list item punctuation',
        description: `${inconsistentCount} list(s) have mixed ending punctuation. Some items end with a period while others do not.`,
        exampleFix: 'Use consistent punctuation: either end all list items with a period, or none.',
      });
    }
  }

  /**
   * Rule 213: List item parallelism.
   * List items should start with the same grammatical form.
   */
  private checkListItemParallelism(
    lists: ParsedList[],
    issues: ContentFormattingIssue[]
  ): void {
    let nonParallelCount = 0;

    for (const list of lists) {
      if (list.items.length < 3) continue;

      const forms = list.items.map(item => {
        const text = this.stripHtml(item).trim();
        return this.classifyGrammaticalForm(text);
      });

      // Count dominant form
      const formCounts = new Map<string, number>();
      for (const form of forms) {
        formCounts.set(form, (formCounts.get(form) || 0) + 1);
      }

      let dominantCount = 0;
      for (const count of formCounts.values()) {
        if (count > dominantCount) dominantCount = count;
      }

      // If dominant form covers less than 60% of items, flag
      if (dominantCount / forms.length < 0.6) {
        nonParallelCount++;
      }
    }

    if (nonParallelCount > 0) {
      issues.push({
        ruleId: 'rule-213',
        severity: 'medium',
        title: 'List items lack parallelism',
        description: `${nonParallelCount} list(s) have items that start with different grammatical forms. Parallel structure improves readability.`,
        exampleFix: 'Start all list items with the same grammatical form (e.g., all verbs: "Install...", "Configure...", "Test...").',
      });
    }
  }

  /**
   * Rule 214: List size.
   * Lists should have 3-10 items. Too few = use prose, too many = split.
   */
  private checkListSize(
    lists: ParsedList[],
    issues: ContentFormattingIssue[]
  ): void {
    let badSizeCount = 0;

    for (const list of lists) {
      if (list.items.length < 3 || list.items.length > 10) {
        badSizeCount++;
      }
    }

    if (badSizeCount > 0) {
      issues.push({
        ruleId: 'rule-214',
        severity: 'low',
        title: 'List with suboptimal item count',
        description: `${badSizeCount} list(s) have fewer than 3 or more than 10 items.`,
        exampleFix: 'Lists with 1-2 items should be rewritten as prose. Lists with 10+ items should be grouped into sublists.',
      });
    }
  }

  /**
   * Rule 215: Nested list depth.
   * Lists should not nest more than 2 levels deep.
   */
  private checkNestedListDepth(
    html: string,
    issues: ContentFormattingIssue[]
  ): void {
    // Find all list opening/closing tags and track depth
    const tagRegex = /<(\/)?(?:ul|ol)\b[^>]*>/gi;
    let depth = 0;
    let maxDepth = 0;
    let match;

    while ((match = tagRegex.exec(html)) !== null) {
      if (match[1]) {
        // Closing tag
        depth = Math.max(0, depth - 1);
      } else {
        // Opening tag
        depth++;
        if (depth > maxDepth) maxDepth = depth;
      }
    }

    if (maxDepth > 2) {
      issues.push({
        ruleId: 'rule-215',
        severity: 'medium',
        title: 'Deeply nested lists',
        description: `Lists are nested ${maxDepth} levels deep (max recommended: 2). Deep nesting harms readability.`,
        exampleFix: 'Flatten nested lists by using headings or separate sections for sub-topics.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Table Rules (216-219)
  // ---------------------------------------------------------------------------

  /**
   * Rule 216: Table header descriptiveness.
   * Extends existing rule: all columns should have descriptive headers, not generic ones.
   */
  private checkTableHeaderDescriptiveness(
    tables: ParsedTable[],
    issues: ContentFormattingIssue[]
  ): void {
    const genericPatterns = [
      /^column\s*\d+$/i,
      /^col\s*\d+$/i,
      /^header\s*\d+$/i,
      /^field\s*\d+$/i,
      /^$/,     // empty header
    ];

    let genericCount = 0;

    for (const table of tables) {
      for (const header of table.headers) {
        const trimmed = header.trim();
        if (genericPatterns.some(p => p.test(trimmed))) {
          genericCount++;
        }
      }
    }

    if (genericCount > 0) {
      issues.push({
        ruleId: 'rule-216',
        severity: 'medium',
        title: 'Generic or empty table headers',
        description: `${genericCount} table header(s) use generic names like "Column 1" or are empty. Headers should be descriptive.`,
        affectedElement: '<th>',
        exampleFix: 'Replace generic headers with descriptive labels (e.g., "Column 1" -> "Feature Name").',
      });
    }
  }

  /**
   * Rule 217: Table cell alignment.
   * Numeric columns should be right-aligned.
   */
  private checkTableCellAlignment(
    tables: ParsedTable[],
    issues: ContentFormattingIssue[]
  ): void {
    let numericColumnCount = 0;

    for (const table of tables) {
      if (table.rows.length === 0) continue;

      const columnCount = Math.max(
        table.headers.length,
        ...table.rows.map(r => r.length)
      );

      for (let col = 0; col < columnCount; col++) {
        const cellValues = table.rows
          .map(row => (row[col] || '').trim())
          .filter(v => v.length > 0);

        if (cellValues.length === 0) continue;

        const numericCells = cellValues.filter(v =>
          /^[\d$%,.\-+]+$/.test(v.replace(/\s/g, ''))
        );

        // If >50% of cells in this column are numeric, suggest right alignment
        if (numericCells.length > cellValues.length * 0.5) {
          // Check if the table HTML contains right-align for this area
          // We simplify: just flag if numeric columns exist without checking style
          numericColumnCount++;
        }
      }
    }

    if (numericColumnCount > 0) {
      issues.push({
        ruleId: 'rule-217',
        severity: 'low',
        title: 'Numeric columns may need right-alignment',
        description: `${numericColumnCount} table column(s) contain predominantly numeric data and may benefit from right-alignment for readability.`,
        affectedElement: '<td>',
        exampleFix: 'Add style="text-align: right" to numeric column cells or use a CSS class.',
      });
    }
  }

  /**
   * Rule 218: Table caption.
   * Tables should have a <caption> element.
   */
  private checkTableCaption(
    tables: ParsedTable[],
    issues: ContentFormattingIssue[]
  ): void {
    const noCaptionCount = tables.filter(t => !t.hasCaption).length;

    if (noCaptionCount > 0) {
      issues.push({
        ruleId: 'rule-218',
        severity: 'low',
        title: 'Tables missing caption',
        description: `${noCaptionCount} table(s) lack a <caption> element. Captions improve accessibility and SEO.`,
        affectedElement: '<table>',
        exampleFix: 'Add <caption>Description of table content</caption> as the first child of <table>.',
      });
    }
  }

  /**
   * Rule 219: Table complexity.
   * Tables with >7 columns or >20 rows should be simplified or paginated.
   */
  private checkTableComplexity(
    tables: ParsedTable[],
    issues: ContentFormattingIssue[]
  ): void {
    let complexCount = 0;
    const details: string[] = [];

    for (const table of tables) {
      const cols = Math.max(
        table.headers.length,
        ...table.rows.map(r => r.length),
        0
      );
      const rows = table.rows.length;

      if (cols > 7 || rows > 20) {
        complexCount++;
        details.push(`${cols} columns x ${rows} rows`);
      }
    }

    if (complexCount > 0) {
      issues.push({
        ruleId: 'rule-219',
        severity: 'medium',
        title: 'Overly complex table',
        description: `${complexCount} table(s) exceed recommended complexity (max 7 columns, 20 rows): ${details.join('; ')}.`,
        affectedElement: '<table>',
        exampleFix: 'Split large tables into smaller focused tables or add pagination/scrolling.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Visual Hierarchy Rules (220-224)
  // ---------------------------------------------------------------------------

  /**
   * Rule 220: Scannable content.
   * Content should have a heading or visual break every 300 words max.
   */
  private checkScannableContent(
    html: string,
    plainText: string,
    issues: ContentFormattingIssue[]
  ): void {
    // Split HTML by headings, <hr>, lists, tables, images, blockquotes
    const breakPattern = /<(?:h[1-6]|hr|ul|ol|table|img|blockquote)\b/gi;
    const segments = html.split(breakPattern);

    let longSegmentCount = 0;

    for (const segment of segments) {
      const text = this.stripHtml(segment).trim();
      const wordCount = this.countWords(text);
      if (wordCount > 300) {
        longSegmentCount++;
      }
    }

    if (longSegmentCount > 0) {
      issues.push({
        ruleId: 'rule-220',
        severity: 'medium',
        title: 'Long content blocks without visual breaks',
        description: `${longSegmentCount} content section(s) exceed 300 words without a heading, list, table, or other visual break.`,
        exampleFix: 'Add subheadings, lists, or images to break up long text sections every 200-300 words.',
      });
    }
  }

  /**
   * Rule 221: Emphasis usage.
   * <strong> and <em> should be used sparingly (max 5% of text).
   */
  private checkEmphasisUsage(
    html: string,
    plainText: string,
    issues: ContentFormattingIssue[]
  ): void {
    const totalTextLength = plainText.replace(/\s+/g, '').length;
    if (totalTextLength === 0) return;

    // Extract text inside <strong>, <b>, <em>, <i>
    const emphasisRegex = /<(?:strong|b|em|i)\b[^>]*>([\s\S]*?)<\/(?:strong|b|em|i)>/gi;
    let emphasisLength = 0;
    let match;

    while ((match = emphasisRegex.exec(html)) !== null) {
      const inner = this.stripHtml(match[1]).replace(/\s+/g, '');
      emphasisLength += inner.length;
    }

    const emphasisRatio = emphasisLength / totalTextLength;

    if (emphasisRatio > 0.05) {
      issues.push({
        ruleId: 'rule-221',
        severity: 'low',
        title: 'Excessive emphasis formatting',
        description: `${Math.round(emphasisRatio * 100)}% of text is wrapped in <strong> or <em> (max recommended: 5%). Over-emphasis reduces its effectiveness.`,
        exampleFix: 'Reserve bold and italic for truly important terms. Remove emphasis from routine text.',
      });
    }
  }

  /**
   * Rule 222: Blockquote usage.
   * <blockquote> should contain actual quotes, not be used for styling.
   */
  private checkBlockquoteUsage(
    html: string,
    issues: ContentFormattingIssue[]
  ): void {
    const blockquoteRegex = /<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi;
    let suspiciousCount = 0;
    let match;

    while ((match = blockquoteRegex.exec(html)) !== null) {
      const content = this.stripHtml(match[1]).trim();
      if (content.length === 0) continue;

      // Look for indicators of an actual quote
      const hasQuotationMarks = /[""\u201C\u201D\u2018\u2019]/.test(content);
      const hasAttribution = /\u2014|--|—|[-–]\s*[A-Z]/.test(content);
      const hasCiteTag = /<cite\b/i.test(match[1]);
      const hasSaidPattern = /\b(said|wrote|stated|according to|noted|remarked)\b/i.test(content);

      if (!hasQuotationMarks && !hasAttribution && !hasCiteTag && !hasSaidPattern) {
        suspiciousCount++;
      }
    }

    if (suspiciousCount > 0) {
      issues.push({
        ruleId: 'rule-222',
        severity: 'low',
        title: 'Blockquote may not contain actual quotes',
        description: `${suspiciousCount} <blockquote> element(s) lack quotation marks, attribution, or <cite>. Blockquotes should contain actual quotations, not be used for visual styling.`,
        affectedElement: '<blockquote>',
        exampleFix: 'Add quotation marks and attribution to blockquotes, or use a different element for visual styling.',
      });
    }
  }

  /**
   * Rule 223: Content variety.
   * Articles >1000 words should use at least 3 different content types.
   */
  private checkContentVariety(
    html: string,
    plainText: string,
    issues: ContentFormattingIssue[]
  ): void {
    const wordCount = this.countWords(plainText);
    if (wordCount < 1000) return;

    const contentTypes = new Set<string>();

    // Check for different content types
    if (/<p\b/i.test(html)) contentTypes.add('paragraphs');
    if (/<(?:ul|ol)\b/i.test(html)) contentTypes.add('lists');
    if (/<table\b/i.test(html)) contentTypes.add('tables');
    if (/<(?:pre|code)\b/i.test(html)) contentTypes.add('code');
    if (/<img\b/i.test(html)) contentTypes.add('images');
    if (/<blockquote\b/i.test(html)) contentTypes.add('blockquotes');
    if (/<(?:iframe|video|audio)\b/i.test(html)) contentTypes.add('media');

    if (contentTypes.size < 3) {
      issues.push({
        ruleId: 'rule-223',
        severity: 'medium',
        title: 'Low content variety',
        description: `This ${wordCount}-word article uses only ${contentTypes.size} content type(s) (${[...contentTypes].join(', ')}). Long articles should use at least 3 different content types for engagement.`,
        exampleFix: 'Add lists, tables, images, code blocks, or blockquotes to break up long prose-only content.',
      });
    }
  }

  /**
   * Rule 224: Whitespace distribution.
   * No wall of text -- paragraphs >150 words without a break.
   */
  private checkWhitespaceDistribution(
    html: string,
    issues: ContentFormattingIssue[]
  ): void {
    // Extract paragraphs
    const paragraphRegex = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
    let wallCount = 0;
    let match;

    while ((match = paragraphRegex.exec(html)) !== null) {
      const text = this.stripHtml(match[1]).trim();
      const wordCount = this.countWords(text);
      if (wordCount > 150) {
        wallCount++;
      }
    }

    if (wallCount > 0) {
      issues.push({
        ruleId: 'rule-224',
        severity: 'low',
        title: 'Wall of text detected',
        description: `${wallCount} paragraph(s) exceed 150 words. Long unbroken paragraphs reduce readability.`,
        exampleFix: 'Break long paragraphs into shorter ones (50-100 words). Use lists or subheadings to add visual breathing room.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Extraction helpers
  // ---------------------------------------------------------------------------

  /** Extract all lists from HTML */
  private extractLists(html: string): ParsedList[] {
    const lists: ParsedList[] = [];
    // Match top-level lists only (not nested)
    const listRegex = /<(ul|ol)\b[^>]*>([\s\S]*?)<\/\1>/gi;
    let match;

    while ((match = listRegex.exec(html)) !== null) {
      const type = match[1].toLowerCase() as 'ul' | 'ol';
      const listHtml = match[2];
      const items: string[] = [];

      const itemRegex = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
      let itemMatch;
      while ((itemMatch = itemRegex.exec(listHtml)) !== null) {
        items.push(itemMatch[1]);
      }

      lists.push({
        type,
        items,
        rawHtml: match[0],
        nestingDepth: 1,
      });
    }

    return lists;
  }

  /** Extract all tables from HTML */
  private extractTables(html: string): ParsedTable[] {
    const tables: ParsedTable[] = [];
    const tableRegex = /<table\b[^>]*>([\s\S]*?)<\/table>/gi;
    let match;

    while ((match = tableRegex.exec(html)) !== null) {
      const tableHtml = match[1];
      const hasCaption = /<caption\b/i.test(tableHtml);

      // Extract headers from <th> elements
      const headers: string[] = [];
      const thRegex = /<th\b[^>]*>([\s\S]*?)<\/th>/gi;
      let thMatch;
      while ((thMatch = thRegex.exec(tableHtml)) !== null) {
        headers.push(this.stripHtml(thMatch[1]).trim());
      }

      // Extract rows
      const rows: string[][] = [];
      const trRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
      let trMatch;
      while ((trMatch = trRegex.exec(tableHtml)) !== null) {
        const rowHtml = trMatch[1];
        // Skip header rows (rows that contain <th>)
        if (/<th\b/i.test(rowHtml)) continue;

        const cells: string[] = [];
        const tdRegex = /<td\b[^>]*>([\s\S]*?)<\/td>/gi;
        let tdMatch;
        while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
          cells.push(this.stripHtml(tdMatch[1]).trim());
        }
        if (cells.length > 0) {
          rows.push(cells);
        }
      }

      tables.push({
        headers,
        rows,
        hasCaption,
        rawHtml: match[0],
      });
    }

    return tables;
  }

  /** Strip HTML tags from string */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /** Count words in text */
  private countWords(text: string): number {
    const trimmed = text.trim();
    if (trimmed.length === 0) return 0;
    return trimmed.split(/\s+/).length;
  }

  /**
   * Classify the grammatical form of the first word/phrase of a list item.
   * Returns: 'verb', 'noun', 'adjective', 'gerund', 'determiner', 'other'
   */
  private classifyGrammaticalForm(text: string): string {
    const firstWord = text.split(/\s+/)[0]?.toLowerCase() || '';

    // Gerund (-ing)
    if (/^[a-z]+ing$/i.test(firstWord) && firstWord.length > 4) {
      return 'gerund';
    }

    // Verb (imperative)
    if (COMMON_VERBS.has(firstWord)) {
      return 'verb';
    }

    // Determiner / article
    if (['a', 'an', 'the', 'this', 'that', 'these', 'those', 'each', 'every', 'all'].includes(firstWord)) {
      return 'determiner';
    }

    // Check for common adjective patterns
    if (/^(new|old|big|small|great|best|good|bad|high|low|long|short|full|empty|easy|hard|fast|slow|simple|complex|basic|advanced)$/i.test(firstWord)) {
      return 'adjective';
    }

    // Default: noun phrase
    return 'noun';
  }
}
