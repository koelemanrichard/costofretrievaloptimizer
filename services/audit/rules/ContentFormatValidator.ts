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
}
