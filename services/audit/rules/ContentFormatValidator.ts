/**
 * ContentFormatValidator
 *
 * Validates content formatting: correct list types, table structure, IR Zone optimization.
 *
 * Rules implemented:
 *   205 - How-to content should use <ol>, not <ul>
 *   206 - Comparison content should use <table>, not lists
 *   210 - List items should be concise (<=25 words per item)
 *   215 - Lists should have 3-10 items
 *   216 - Tables must have header row
 *   229 - IR Zone -- answer target query in first 400 chars
 *   230 - Lists should have an introductory definition sentence
 *   231 - Ordered vs unordered list correctness (sequential steps = ordered)
 *   232 - Table minimum dimensions (2+ columns, 2+ rows)
 *   233b - Table header row exists (<thead> or <th>)
 */

export interface FormatIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  exampleFix?: string;
}

export class ContentFormatValidator {
  validate(html: string, targetQuery?: string): FormatIssue[] {
    const issues: FormatIssue[] = [];

    this.checkListTypes(html, issues); // Rules 205-206
    this.checkListStructure(html, issues); // Rules 210, 215
    this.checkTableHeaders(html, issues); // Rule 216
    this.checkIrZone(html, targetQuery, issues); // Rule 229
    this.checkListIntroduction(html, issues); // Rule 230
    this.checkListTypeCorrectness(html, issues); // Rule 231
    this.checkTableDimensions(html, issues); // Rule 232
    this.checkTableHeaderRow(html, issues); // Rule 233b

    return issues;
  }

  /**
   * Rule 205: How-to content should use <ol>, not <ul>
   * Rule 206: Comparison content should use <table>, not lists
   */
  checkListTypes(html: string, issues: FormatIssue[]): void {
    const hasHowTo =
      /\b(how to|step[s]?|procedure|instructions?|guide)\b/i.test(html);
    const hasOl = /<ol\b/i.test(html);
    const hasUl = /<ul\b/i.test(html);

    if (hasHowTo && !hasOl && hasUl) {
      issues.push({
        ruleId: 'rule-205',
        severity: 'medium',
        title: 'How-to content uses unordered list',
        description:
          'Sequential/procedural content should use ordered lists (<ol>) instead of unordered (<ul>).',
        exampleFix: 'Convert step-by-step instructions to <ol> elements.',
      });
    }

    const hasComparison =
      /\b(comparison|versus|vs\.?|compare[ds]?|differ(ence|ent)|pros and cons)\b/i.test(
        html
      );
    const hasTable = /<table\b/i.test(html);

    if (hasComparison && !hasTable) {
      issues.push({
        ruleId: 'rule-206',
        severity: 'medium',
        title: 'Comparison content without table',
        description:
          'Comparison content benefits from tables for side-by-side presentation.',
        exampleFix:
          'Add a comparison table for feature-by-feature analysis.',
      });
    }
  }

  /**
   * Rule 210: List items should be concise (<=25 words per item)
   * Rule 215: Lists should have 3-10 items
   */
  checkListStructure(html: string, issues: FormatIssue[]): void {
    const listRegex = /<(ul|ol)\b[^>]*>([\s\S]*?)<\/\1>/gi;
    let match;
    let longItemCount = 0;
    let badLengthLists = 0;

    while ((match = listRegex.exec(html)) !== null) {
      const listHtml = match[2];
      const items = listHtml.match(/<li\b[^>]*>([\s\S]*?)<\/li>/gi) || [];

      // Rule 215: 3-10 items
      if (items.length > 0 && (items.length < 3 || items.length > 10)) {
        badLengthLists++;
      }

      // Rule 210: concise items
      for (const item of items) {
        const text = item.replace(/<[^>]+>/g, '').trim();
        if (text.split(/\s+/).length > 25) longItemCount++;
      }
    }

    if (longItemCount > 0) {
      issues.push({
        ruleId: 'rule-210',
        severity: 'low',
        title: 'Long list items',
        description: `${longItemCount} list item(s) exceed 25 words. Keep list items concise.`,
        exampleFix:
          'Shorten list items to key phrases. Move details to paragraphs.',
      });
    }

    if (badLengthLists > 0) {
      issues.push({
        ruleId: 'rule-215',
        severity: 'low',
        title: 'Lists with unusual item count',
        description: `${badLengthLists} list(s) have fewer than 3 or more than 10 items.`,
        exampleFix:
          'Aim for 3-10 items per list. Split long lists or combine short ones.',
      });
    }
  }

  /**
   * Rule 216: Tables must have header row
   */
  checkTableHeaders(html: string, issues: FormatIssue[]): void {
    const tableRegex = /<table\b[^>]*>([\s\S]*?)<\/table>/gi;
    let match;
    let noHeaderCount = 0;

    while ((match = tableRegex.exec(html)) !== null) {
      const tableHtml = match[1];
      const hasThead = /<thead\b/i.test(tableHtml);
      const hasTh = /<th\b/i.test(tableHtml);
      if (!hasThead && !hasTh) noHeaderCount++;
    }

    if (noHeaderCount > 0) {
      issues.push({
        ruleId: 'rule-216',
        severity: 'high',
        title: 'Tables missing headers',
        description: `${noHeaderCount} table(s) lack header rows (<thead> or <th> elements).`,
        exampleFix:
          'Add <thead> with <th> elements to define column headers.',
      });
    }
  }

  /**
   * Rule 229: IR Zone -- answer target query in first 400 chars
   */
  checkIrZone(
    html: string,
    targetQuery: string | undefined,
    issues: FormatIssue[]
  ): void {
    if (!targetQuery) return;
    const text = html
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const first400 = text.slice(0, 400).toLowerCase();
    const queryWords = targetQuery
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);

    const matchedWords = queryWords.filter((w) => first400.includes(w));
    if (queryWords.length > 0 && matchedWords.length < queryWords.length * 0.5) {
      issues.push({
        ruleId: 'rule-229',
        severity: 'high',
        title: 'Target query not answered in IR Zone',
        description:
          'The first 400 characters do not address the target query terms.',
        exampleFix:
          'Provide a direct answer to the target query in the opening text.',
      });
    }
  }

  /**
   * Rule 230: Lists should have an introductory definition sentence.
   * A paragraph or heading should precede each list to provide context.
   */
  checkListIntroduction(html: string, issues: FormatIssue[]): void {
    // Find all <ul> and <ol> tags and check what immediately precedes them.
    // A list without a preceding <p>, <h1>-<h6>, or text is missing an intro.
    const listStartPattern = /<(ul|ol)\b[^>]*>/gi;
    let match;
    let listsWithoutIntro = 0;
    let totalLists = 0;

    while ((match = listStartPattern.exec(html)) !== null) {
      totalLists++;
      const positionBefore = match.index;
      // Look at the 200 characters before the list tag
      const before = html.slice(Math.max(0, positionBefore - 200), positionBefore).trim();

      // Check if there's a closing paragraph, heading, or definition element just before the list
      const hasIntro =
        /<\/(p|h[1-6]|dt|dd|div|figcaption)>\s*$/i.test(before) ||
        /:\s*$/i.test(before); // Ends with colon (common intro pattern)

      if (!hasIntro) {
        listsWithoutIntro++;
      }
    }

    if (listsWithoutIntro > 0 && totalLists > 0) {
      issues.push({
        ruleId: 'rule-230',
        severity: 'low',
        title: 'Lists missing introductory sentence',
        description:
          `${listsWithoutIntro} of ${totalLists} list(s) are not preceded by an introductory paragraph or heading. ` +
          'Lists should be introduced with a definition sentence that provides context. ' +
          'This helps search engines understand the purpose of the list and improves featured snippet eligibility.',
        exampleFix:
          'Add a brief introductory sentence before each list, e.g., ' +
          '"The key benefits include:" followed by the <ul> or <ol>.',
      });
    }
  }

  /**
   * Rule 231: Ordered vs unordered list correctness.
   * Sequential/procedural steps should use <ol>, not <ul>.
   */
  checkListTypeCorrectness(html: string, issues: FormatIssue[]): void {
    // Find <ul> lists whose items contain sequential step indicators
    const ulRegex = /<ul\b[^>]*>([\s\S]*?)<\/ul>/gi;
    let match;
    let incorrectUlCount = 0;

    const stepPatterns = [
      /\bstep\s*\d/i,
      /\bfirst(ly)?\b/i,
      /\bthen\b/i,
      /\bnext\b/i,
      /\bfinally\b/i,
      /\bafter\s+that\b/i,
      /\bfollowed\s+by\b/i,
      /^\s*\d+[\.\)]/,
    ];

    while ((match = ulRegex.exec(html)) !== null) {
      const listContent = match[1];
      const items = listContent.match(/<li\b[^>]*>([\s\S]*?)<\/li>/gi) || [];

      if (items.length < 3) continue;

      // Count how many items contain sequential indicators
      let sequentialItems = 0;
      for (const item of items) {
        const text = item.replace(/<[^>]+>/g, '').trim();
        if (stepPatterns.some((pattern) => pattern.test(text))) {
          sequentialItems++;
        }
      }

      // If more than half the items have sequential indicators, this should be <ol>
      if (sequentialItems >= items.length * 0.5) {
        incorrectUlCount++;
      }
    }

    if (incorrectUlCount > 0) {
      issues.push({
        ruleId: 'rule-231',
        severity: 'medium',
        title: 'Sequential content uses unordered list',
        description:
          `${incorrectUlCount} unordered list(s) contain sequential/procedural content ` +
          '(e.g., "step 1", "first", "then", "next", "finally"). ' +
          'Sequential steps should use ordered lists (<ol>) to convey the correct order semantically. ' +
          'Search engines use list type to understand content structure for featured snippets.',
        exampleFix:
          'Change <ul> to <ol> for step-by-step or sequential content.',
      });
    }
  }

  /**
   * Rule 232: Table minimum dimensions (2+ columns, 2+ rows).
   * Tables with fewer than 2 columns or 2 rows are likely misusing the <table> element.
   */
  checkTableDimensions(html: string, issues: FormatIssue[]): void {
    const tableRegex = /<table\b[^>]*>([\s\S]*?)<\/table>/gi;
    let match;
    let underSizedTables = 0;

    while ((match = tableRegex.exec(html)) !== null) {
      const tableHtml = match[1];

      // Count rows (<tr> elements)
      const rows = (tableHtml.match(/<tr\b/gi) || []).length;

      // Count columns in the first row (max of <td> + <th> in any single row)
      const firstRowMatch = tableHtml.match(/<tr\b[^>]*>([\s\S]*?)<\/tr>/i);
      let maxCols = 0;
      if (firstRowMatch) {
        const cellCount =
          (firstRowMatch[1].match(/<(td|th)\b/gi) || []).length;
        maxCols = cellCount;
      }

      if (rows < 2 || maxCols < 2) {
        underSizedTables++;
      }
    }

    if (underSizedTables > 0) {
      issues.push({
        ruleId: 'rule-232',
        severity: 'low',
        title: 'Tables with insufficient dimensions',
        description:
          `${underSizedTables} table(s) have fewer than 2 columns or 2 rows. ` +
          'Tables should have at least 2 columns and 2 rows of data to justify tabular formatting. ' +
          'Single-column or single-row tables are better presented as lists or definition lists. ' +
          'Properly structured tables are more likely to be selected for featured snippets.',
        exampleFix:
          'If the data is truly tabular, ensure at least 2 columns and 2 data rows. ' +
          'Otherwise, convert to a list (<ul>/<ol>) or definition list (<dl>).',
      });
    }
  }

  /**
   * Rule 233b: Table header row exists (<thead> or <th>).
   * Complements rule 216 with a more specific check that validates
   * each table individually and reports the count.
   */
  checkTableHeaderRow(html: string, issues: FormatIssue[]): void {
    const tableRegex = /<table\b[^>]*>([\s\S]*?)<\/table>/gi;
    let match;
    let tablesWithoutHeaders = 0;
    let totalTables = 0;

    while ((match = tableRegex.exec(html)) !== null) {
      totalTables++;
      const tableHtml = match[1];

      const hasThead = /<thead\b/i.test(tableHtml);
      const hasTh = /<th\b/i.test(tableHtml);

      // Check first row for header cells
      const firstRowMatch = tableHtml.match(/<tr\b[^>]*>([\s\S]*?)<\/tr>/i);
      const firstRowHasTh = firstRowMatch ? /<th\b/i.test(firstRowMatch[1]) : false;

      if (!hasThead && !hasTh && !firstRowHasTh) {
        tablesWithoutHeaders++;
      }
    }

    if (tablesWithoutHeaders > 0) {
      issues.push({
        ruleId: 'rule-233b',
        severity: 'medium',
        title: 'Tables missing header row',
        description:
          `${tablesWithoutHeaders} of ${totalTables} table(s) have no header row (<thead> or <th> elements). ` +
          'Every data table should have a header row that defines the columns. ' +
          'Without headers, tables are not accessible to screen readers and ' +
          'search engines cannot interpret the data structure for featured snippets.',
        exampleFix:
          'Add a header row using <thead><tr><th>Column 1</th><th>Column 2</th></tr></thead> ' +
          'as the first child of each <table>.',
      });
    }
  }
}
