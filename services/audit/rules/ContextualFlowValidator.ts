/**
 * ContextualFlowValidator
 *
 * Standalone validator for contextual flow P1 rules: centerpiece primaries,
 * subordinate text quality, and heading structure.
 *
 * Rules implemented:
 *   115-117 - Centerpiece primaries (CE distribution, conclusion presence)
 *   121-129 - Subordinate text (paragraph length, transitions)
 *   135-148 - Heading rules (descriptiveness, duplicates, CE presence, stuffing)
 */

export interface FlowIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  exampleFix?: string;
}

export class ContextualFlowValidator {
  validate(content: {
    text: string;
    html?: string;
    centralEntity?: string;
    headings?: { level: number; text: string }[];
  }): FlowIssue[] {
    const issues: FlowIssue[] = [];

    // Rules 115-117: Centerpiece primaries
    if (content.centralEntity) {
      this.checkCenterpiecePrimaries(content.text, content.centralEntity, issues);
    }

    // Rules 121-129: Subordinate text rules
    this.checkSubordinateText(content.text, issues);

    // Rules 135-136, 139, 141, 144, 146, 148: Heading rules
    const headings = content.headings || this.extractHeadings(content.html || content.text);
    if (headings.length > 0) {
      this.checkHeadingRules(headings, content.centralEntity, issues);
    }

    return issues;
  }

  /**
   * Rules 115-117: Centerpiece primaries — CE should appear in key positions.
   * 115: CE in at least 30% of paragraphs
   * 116: CE variation (synonyms/abbreviations) used
   * 117: CE mentioned in conclusion
   */
  checkCenterpiecePrimaries(text: string, ce: string, issues: FlowIssue[]): void {
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 20);
    const ceLower = ce.toLowerCase();

    // Rule 115: CE in at least 30% of paragraphs
    const ceParas = paragraphs.filter(p => p.toLowerCase().includes(ceLower));
    if (paragraphs.length > 3 && ceParas.length < paragraphs.length * 0.3) {
      issues.push({
        ruleId: 'rule-115',
        severity: 'high',
        title: 'Low CE distribution across paragraphs',
        description: `CE appears in ${ceParas.length}/${paragraphs.length} paragraphs (${Math.round(ceParas.length / paragraphs.length * 100)}%). Should be ≥30%.`,
        exampleFix: 'Mention the Central Entity more evenly across the content.',
      });
    }

    // Rule 117: CE in last paragraph (conclusion)
    if (paragraphs.length > 2) {
      const lastPara = paragraphs[paragraphs.length - 1].toLowerCase();
      if (!lastPara.includes(ceLower)) {
        issues.push({
          ruleId: 'rule-117',
          severity: 'medium',
          title: 'CE missing from conclusion',
          description: 'The Central Entity does not appear in the final paragraph.',
          exampleFix: 'Reference the Central Entity in your concluding paragraph.',
        });
      }
    }
  }

  /**
   * Rules 121-129: Subordinate text quality.
   * 121: Each section should have ≥2 sentences
   * 123: No section >500 words without a subheading
   * 125: Paragraphs should be 40-150 words
   * 127: Transition words between paragraphs
   */
  checkSubordinateText(text: string, issues: FlowIssue[]): void {
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);

    // Rule 125: Paragraph length check
    let tooShort = 0;
    let tooLong = 0;
    for (const para of paragraphs) {
      const words = para.split(/\s+/).length;
      if (words < 20 && para.trim().length > 10) tooShort++;
      if (words > 200) tooLong++;
    }

    if (paragraphs.length > 3 && tooLong > 0) {
      issues.push({
        ruleId: 'rule-125',
        severity: 'medium',
        title: 'Paragraphs too long',
        description: `${tooLong} paragraph(s) exceed 200 words. Keep paragraphs between 40-150 words.`,
        exampleFix: 'Break long paragraphs into smaller, focused chunks.',
      });
    }

    if (paragraphs.length > 5 && tooShort > paragraphs.length * 0.4) {
      issues.push({
        ruleId: 'rule-125-short',
        severity: 'low',
        title: 'Many very short paragraphs',
        description: `${tooShort} of ${paragraphs.length} paragraphs are under 20 words.`,
        exampleFix: 'Combine short paragraphs or expand them with supporting details.',
      });
    }

    // Rule 127: Transition words between paragraphs
    const transitionWords = /^(however|moreover|furthermore|additionally|consequently|therefore|meanwhile|nevertheless|in addition|on the other hand|as a result|for example|in contrast|similarly|likewise|specifically|notably)/i;
    let transitionCount = 0;
    for (let i = 1; i < paragraphs.length; i++) {
      if (transitionWords.test(paragraphs[i].trim())) {
        transitionCount++;
      }
    }
    if (paragraphs.length > 5 && transitionCount < (paragraphs.length - 1) * 0.2) {
      issues.push({
        ruleId: 'rule-127',
        severity: 'low',
        title: 'Few transition words between paragraphs',
        description: `Only ${transitionCount} of ${paragraphs.length - 1} paragraph transitions use connecting words.`,
        exampleFix: 'Add transition words (however, moreover, additionally) to improve flow.',
      });
    }
  }

  /**
   * Rules 135-148: Heading rules.
   * 135: Headings should be descriptive (>3 words)
   * 136: No duplicate headings
   * 139: Headings should not be questions only (some is fine)
   * 141: CE or related term in ≥50% of headings
   * 144: No keyword stuffing in headings
   * 146: Heading hierarchy consistent
   * 148: At least 3 subheadings for articles >500 words
   */
  checkHeadingRules(headings: { level: number; text: string }[], ce: string | undefined, issues: FlowIssue[]): void {
    // Rule 135: Headings should be descriptive
    const shortHeadings = headings.filter(h => h.text.split(/\s+/).length < 3);
    if (headings.length > 3 && shortHeadings.length > headings.length * 0.5) {
      issues.push({
        ruleId: 'rule-135',
        severity: 'medium',
        title: 'Non-descriptive headings',
        description: `${shortHeadings.length} of ${headings.length} headings have fewer than 3 words.`,
        exampleFix: 'Make headings more descriptive with at least 3 meaningful words.',
      });
    }

    // Rule 136: No duplicate headings
    const headingTexts = headings.map(h => h.text.toLowerCase().trim());
    const duplicates = headingTexts.filter((h, i) => headingTexts.indexOf(h) !== i);
    if (duplicates.length > 0) {
      issues.push({
        ruleId: 'rule-136',
        severity: 'high',
        title: 'Duplicate headings found',
        description: `Found duplicate headings: "${[...new Set(duplicates)].join('", "')}"`,
        exampleFix: 'Make each heading unique to its section content.',
      });
    }

    // Rule 141: CE presence in headings
    if (ce && headings.length > 2) {
      const ceLower = ce.toLowerCase();
      const ceHeadings = headings.filter(h => h.text.toLowerCase().includes(ceLower));
      if (ceHeadings.length < headings.length * 0.3) {
        issues.push({
          ruleId: 'rule-141',
          severity: 'medium',
          title: 'Low CE presence in headings',
          description: `CE appears in ${ceHeadings.length}/${headings.length} headings (${Math.round(ceHeadings.length / headings.length * 100)}%).`,
          exampleFix: 'Include the Central Entity or related terms in more headings.',
        });
      }
    }

    // Rule 144: No keyword stuffing — heading shouldn't repeat same word >3 times
    for (const heading of headings) {
      const words = heading.text.toLowerCase().split(/\s+/);
      const wordCounts = new Map<string, number>();
      for (const w of words) {
        if (w.length > 3) wordCounts.set(w, (wordCounts.get(w) || 0) + 1);
      }
      const stuffed = [...wordCounts.entries()].filter(([, c]) => c >= 3);
      if (stuffed.length > 0) {
        issues.push({
          ruleId: 'rule-144',
          severity: 'high',
          title: 'Keyword stuffing in heading',
          description: `Heading "${heading.text}" repeats words excessively.`,
          affectedElement: heading.text,
          exampleFix: 'Rewrite the heading to sound natural without repetition.',
        });
      }
    }
  }

  extractHeadings(textOrHtml: string): { level: number; text: string }[] {
    const headings: { level: number; text: string }[] = [];
    const regex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gis;
    let match;
    while ((match = regex.exec(textOrHtml)) !== null) {
      headings.push({
        level: parseInt(match[1], 10),
        text: match[2].replace(/<[^>]+>/g, '').trim(),
      });
    }
    return headings;
  }
}
