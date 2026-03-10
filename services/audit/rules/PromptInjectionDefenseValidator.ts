/**
 * PromptInjectionDefenseValidator
 *
 * Detects prompt injection attack vectors in published HTML content.
 * Checks for hidden text, zero-width characters, tiny fonts, off-screen
 * positioning, and UGC separation issues that could be exploited to
 * inject instructions into AI crawlers / LLM-based search engines.
 */

export interface InjectionIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  exampleFix?: string;
}

export class PromptInjectionDefenseValidator {
  validate(html: string): InjectionIssue[] {
    const issues: InjectionIssue[] = [];

    issues.push(...this.checkHiddenText(html));
    issues.push(...this.checkZeroWidthChars(html));
    issues.push(...this.checkTinyFont(html));
    issues.push(...this.checkOffScreen(html));
    issues.push(...this.checkUgcSeparation(html));

    return issues;
  }

  /**
   * Check for display:none, visibility:hidden, or opacity:0 on elements with text content.
   */
  private checkHiddenText(html: string): InjectionIssue[] {
    const issues: InjectionIssue[] = [];

    // Match elements with inline style containing hiding properties and text content
    const hiddenPatterns = [
      { regex: /<(\w+)\b[^>]*style\s*=\s*["'][^"']*display\s*:\s*none[^"']*["'][^>]*>[^<]+/gi, label: 'display:none' },
      { regex: /<(\w+)\b[^>]*style\s*=\s*["'][^"']*visibility\s*:\s*hidden[^"']*["'][^>]*>[^<]+/gi, label: 'visibility:hidden' },
      { regex: /<(\w+)\b[^>]*style\s*=\s*["'][^"']*opacity\s*:\s*0\b[^"']*["'][^>]*>[^<]+/gi, label: 'opacity:0' },
    ];

    for (const { regex, label } of hiddenPatterns) {
      const match = regex.exec(html);
      if (match) {
        issues.push({
          ruleId: 'rule-injection-hidden-text',
          severity: 'high',
          title: 'Hidden text detected (potential prompt injection vector)',
          description: `Found text content in an element using ${label}. Hidden text can be used to inject instructions into AI crawlers and LLM-based search systems.`,
          affectedElement: match[0].substring(0, 120),
          exampleFix: 'Remove hidden text or use aria-hidden="true" for legitimate decorative elements.',
        });
      }
    }

    return issues;
  }

  /**
   * Scan for zero-width characters that could hide injected content.
   * U+200B (Zero Width Space), U+200C-U+200F, U+FEFF (BOM), U+2060 (Word Joiner)
   */
  private checkZeroWidthChars(html: string): InjectionIssue[] {
    const issues: InjectionIssue[] = [];

    // Strip tags first to only check text content
    const textContent = html.replace(/<[^>]+>/g, '');
    const zeroWidthRegex = /[\u200B-\u200F\uFEFF\u2060]/g;
    const matches = textContent.match(zeroWidthRegex);

    if (matches && matches.length > 0) {
      issues.push({
        ruleId: 'rule-injection-zero-width',
        severity: 'high',
        title: 'Zero-width characters detected in content',
        description: `Found ${matches.length} zero-width character(s) in text content. These invisible characters can hide injected instructions from human readers while being processed by AI systems.`,
        exampleFix: 'Remove all zero-width characters (U+200B-U+200F, U+FEFF, U+2060) from content.',
      });
    }

    return issues;
  }

  /**
   * Check for extremely small font sizes (0-5px) that hide text from humans.
   */
  private checkTinyFont(html: string): InjectionIssue[] {
    const issues: InjectionIssue[] = [];

    const tinyFontRegex = /<(\w+)\b[^>]*style\s*=\s*["'][^"']*font-size\s*:\s*([0-5])px[^"']*["'][^>]*>[^<]+/gi;
    const match = tinyFontRegex.exec(html);

    if (match) {
      issues.push({
        ruleId: 'rule-injection-tiny-font',
        severity: 'medium',
        title: 'Extremely small font size detected (potential hidden text)',
        description: `Found text content with font-size:${match[2]}px. Text at this size is invisible to humans but readable by AI crawlers, making it a potential injection vector.`,
        affectedElement: match[0].substring(0, 120),
        exampleFix: 'Use a minimum font-size of 12px for visible text, or remove the element if it should not be displayed.',
      });
    }

    return issues;
  }

  /**
   * Check for off-screen positioned elements that hide text.
   */
  private checkOffScreen(html: string): InjectionIssue[] {
    const issues: InjectionIssue[] = [];

    const offScreenRegex = /<(\w+)\b[^>]*style\s*=\s*["'][^"']*position\s*:\s*(?:absolute|fixed)[^"']*(?:left|top)\s*:\s*-\d{4,}[^"']*["'][^>]*>[^<]+/gi;
    const match = offScreenRegex.exec(html);

    if (match) {
      issues.push({
        ruleId: 'rule-injection-offscreen',
        severity: 'medium',
        title: 'Off-screen positioned text detected',
        description: 'Found text content positioned far off-screen using absolute/fixed positioning with large negative offsets. This technique can hide injected content from human readers.',
        affectedElement: match[0].substring(0, 120),
        exampleFix: 'Use clip-rect or sr-only CSS class for legitimate screen-reader-only text instead of negative positioning.',
      });
    }

    return issues;
  }

  /**
   * Check that user-generated content sections (comments, reviews) are properly
   * separated from editorial content using semantic HTML (<aside>).
   */
  private checkUgcSeparation(html: string): InjectionIssue[] {
    const issues: InjectionIssue[] = [];

    // Look for UGC indicators
    const ugcPatterns = /class\s*=\s*["'][^"']*\b(?:comments|reviews|user-content|ugc)\b[^"']*["']|id\s*=\s*["'](?:comments|reviews)["']/gi;
    const hasUgc = ugcPatterns.test(html);

    if (!hasUgc) return issues;

    // Check if UGC sections are wrapped in <aside>
    // Simple heuristic: check if an <aside> exists that contains the UGC indicator
    const asideRegex = /<aside\b[^>]*>[\s\S]*?(?:class\s*=\s*["'][^"']*\b(?:comments|reviews|user-content|ugc)\b|id\s*=\s*["'](?:comments|reviews)["'])[\s\S]*?<\/aside>/gi;
    const ugcInAside = asideRegex.test(html);

    if (!ugcInAside) {
      issues.push({
        ruleId: 'rule-injection-ugc-separation',
        severity: 'medium',
        title: 'User-generated content not semantically separated',
        description: 'Comments or reviews section detected without proper semantic separation. UGC should be wrapped in <aside> to signal to AI systems that this content is not editorial.',
        exampleFix: 'Wrap UGC sections in <aside role="complementary"> to separate them from editorial content.',
      });
    }

    return issues;
  }
}
