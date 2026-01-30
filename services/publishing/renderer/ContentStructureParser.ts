/**
 * ContentStructureParser
 *
 * Intelligently extracts structure from prose content to enable
 * visual component rendering. This bridges the gap between
 * paragraph-based content and visually rich components.
 *
 * Without this, content like "First, do X. Then do Y. Finally, Z."
 * renders as prose even when ComponentRenderer expects a list.
 */

export interface ExtractedStructure {
  type: 'steps' | 'stats' | 'features' | 'checklist' | 'comparison' | 'prose';
  items: StructuredItem[];
  remainingProse: string;
  confidence: number;
}

export interface StructuredItem {
  text: string;
  value?: string;
  label?: string;
  icon?: string;
}

export class ContentStructureParser {
  /**
   * Analyze content and extract structure suitable for visual rendering
   */
  static analyze(content: string, targetComponent: string): ExtractedStructure {
    // Already has list structure - return as-is
    if (content.includes('<ul>') || content.includes('<ol>')) {
      return this.parseExistingList(content);
    }

    // Try to extract structure based on target component
    switch (targetComponent) {
      case 'timeline':
      case 'step-list':
        return this.extractSteps(content);
      case 'stat-highlight':
        return this.extractStats(content);
      case 'feature-grid':
        return this.extractFeatures(content);
      case 'checklist':
        return this.extractChecklist(content);
      default:
        return { type: 'prose', items: [], remainingProse: content, confidence: 0.3 };
    }
  }

  /**
   * Parse existing HTML list structure
   */
  private static parseExistingList(content: string): ExtractedStructure {
    const items: StructuredItem[] = [];
    const listItemRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let match;

    while ((match = listItemRegex.exec(content)) !== null) {
      items.push({ text: this.stripHtml(match[1]).trim() });
    }

    // Remove list from content to get remaining prose
    const remainingProse = content
      .replace(/<[ou]l[^>]*>[\s\S]*?<\/[ou]l>/gi, '')
      .trim();

    return {
      type: 'steps',
      items,
      remainingProse,
      confidence: 1,
    };
  }

  /**
   * Extract step-like structure from prose
   * Looks for: numbered patterns, sequence words, sentence breaks that imply steps
   * ENHANCED: Added more patterns and lowered thresholds for better extraction
   */
  private static extractSteps(content: string): ExtractedStructure {
    const text = this.stripHtml(content);
    const items: StructuredItem[] = [];

    // Pattern 1: Explicit numbered steps "1. First..." "2. Second..."
    const numberedPattern = /(?:^|\n)\s*(\d+)[.)]\s*([^.!?\n]+[.!?]?)/g;
    let match;
    while ((match = numberedPattern.exec(text)) !== null) {
      items.push({ text: match[2].trim() });
    }

    if (items.length >= 2) { // Lowered from 3 to 2
      const remainingProse = text.replace(numberedPattern, '').trim();
      return { type: 'steps', items, remainingProse, confidence: 0.9 };
    }

    // Pattern 2: Sequence words "First,... Second,... Third,..."
    const sequenceWords = [
      'eerst', 'ten eerste', 'vervolgens', 'daarna', 'ten tweede', 'ten derde', 'tot slot', 'tenslotte',
      'first', 'second', 'third', 'then', 'next', 'finally', 'lastly',
      'fase 1', 'fase 2', 'fase 3', 'stap 1', 'stap 2', 'stap 3',
      'begin met', 'start met', 'begin by', 'start by', 'start with',
    ];

    const sentences = text.split(/(?<=[.!?])\s+/);
    const sequenceItems: StructuredItem[] = [];

    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();
      if (sequenceWords.some(word => lower.includes(word))) {
        sequenceItems.push({ text: sentence.trim() });
      }
    }

    if (sequenceItems.length >= 2) { // Lowered from 3 to 2
      return { type: 'steps', items: sequenceItems, remainingProse: '', confidence: 0.7 };
    }

    // Pattern 3: Semicolon-separated items (common in Dutch)
    if (text.includes(';')) {
      const semicolonItems = text.split(';').map(s => s.trim()).filter(s => s.length > 10);
      if (semicolonItems.length >= 2) { // Lowered from 3 to 2
        return {
          type: 'steps',
          items: semicolonItems.map(t => ({ text: t })),
          remainingProse: '',
          confidence: 0.6,
        };
      }
    }

    // Pattern 4: Action verbs at sentence start (common in step instructions)
    const actionVerbs = [
      'identificeer', 'analyseer', 'controleer', 'zorg', 'maak', 'voer', 'test', 'configureer',
      'identify', 'analyze', 'check', 'ensure', 'create', 'perform', 'test', 'configure',
      'install', 'setup', 'download', 'click', 'select', 'open', 'run', 'execute',
      'bepaal', 'implementeer', 'documenteer', 'evalueer', 'monitor', 'update',
      'gebruik', 'use', 'apply', 'assess', 'review', 'validate', 'verify',
    ];

    const actionItems: StructuredItem[] = [];
    for (const sentence of sentences) {
      const firstWord = sentence.trim().split(/\s+/)[0]?.toLowerCase().replace(/[.,!?:;]$/, '');
      if (firstWord && actionVerbs.includes(firstWord)) {
        actionItems.push({ text: sentence.trim() });
      }
    }

    if (actionItems.length >= 3) {
      return { type: 'steps', items: actionItems, remainingProse: '', confidence: 0.55 };
    }

    // Pattern 5: Multiple short paragraphs (likely a list in prose form)
    // If we have 3+ short sentences (< 120 chars) that stand alone, treat as items
    const shortSentences = sentences.filter(s => s.trim().length > 15 && s.trim().length < 120);
    if (shortSentences.length >= 4 && shortSentences.length <= 12) {
      return {
        type: 'steps',
        items: shortSentences.map(t => ({ text: t.trim() })),
        remainingProse: '',
        confidence: 0.45,
      };
    }

    return { type: 'prose', items: [], remainingProse: content, confidence: 0.3 };
  }

  /**
   * Extract statistics from content
   * Looks for: percentages, numbers with labels, metrics
   */
  private static extractStats(content: string): ExtractedStructure {
    const text = this.stripHtml(content);
    const items: StructuredItem[] = [];

    // Pattern: "156% increase" "50 miljoen" "€1.2 miljard" "95% of users"
    const statPatterns = [
      // Percentage with context
      /(\d+(?:[.,]\d+)?%)\s+(?:toename|stijging|daling|van|of|increase|decrease|growth|in)\s+([^.!?,;]+)/gi,
      // Number with unit and label
      /(\d+(?:[.,]\d+)?\s*(?:miljoen|miljard|duizend|million|billion|thousand)?)\s+([a-zA-Z][^.!?,;]+)/gi,
      // Currency amounts
      /(€|£|\$)\s*(\d+(?:[.,]\d+)?(?:\s*(?:miljoen|miljard|k|m|bn))?)\s+([^.!?,;]+)/gi,
      // "X out of Y" patterns
      /(\d+)\s+(?:van de|van|out of|of)\s+(\d+)\s+([^.!?,;]+)/gi,
    ];

    for (const pattern of statPatterns) {
      let match;
      pattern.lastIndex = 0;
      while ((match = pattern.exec(text)) !== null) {
        if (pattern.source.includes('€|£|\\$')) {
          // Currency pattern
          items.push({
            text: match[3].trim(),
            value: `${match[1]}${match[2]}`,
            label: match[3].trim(),
          });
        } else if (pattern.source.includes('van de|van|out of')) {
          // Ratio pattern
          items.push({
            text: `${match[1]}/${match[2]} ${match[3]}`,
            value: `${match[1]}/${match[2]}`,
            label: match[3].trim(),
          });
        } else {
          items.push({
            text: `${match[1]} ${match[2]}`,
            value: match[1],
            label: match[2].trim(),
          });
        }
      }
    }

    // Deduplicate
    const uniqueItems = items.filter((item, idx, arr) =>
      arr.findIndex(i => i.value === item.value) === idx
    );

    if (uniqueItems.length >= 2) {
      return { type: 'stats', items: uniqueItems.slice(0, 4), remainingProse: content, confidence: 0.8 };
    }

    return { type: 'prose', items: [], remainingProse: content, confidence: 0.3 };
  }

  /**
   * Extract feature-like items from content
   * Looks for: benefit statements, capability descriptions
   * ENHANCED: More patterns and lower thresholds
   */
  private static extractFeatures(content: string): ExtractedStructure {
    const text = this.stripHtml(content);
    const items: StructuredItem[] = [];

    // Pattern 1: Bold text as feature headers
    const boldPattern = /<strong>([^<]+)<\/strong>/gi;
    let match;
    while ((match = boldPattern.exec(content)) !== null) {
      // Get the sentence containing this bold text
      const boldText = match[1];
      const fullMatch = content.substring(
        Math.max(0, match.index - 20),
        content.indexOf('.', match.index + match[0].length) + 1
      );
      items.push({
        text: this.stripHtml(fullMatch).trim(),
        label: boldText,
      });
    }

    if (items.length >= 2) { // Lowered from 3 to 2
      return { type: 'features', items, remainingProse: '', confidence: 0.8 };
    }

    // Pattern 2: Colon-separated definitions "Feature: description"
    const colonPattern = /([A-Z][^:]+):\s*([^.!?]+[.!?])/g;
    while ((match = colonPattern.exec(text)) !== null) {
      if (match[1].length < 50) { // Reasonable feature name length
        items.push({
          text: match[2].trim(),
          label: match[1].trim(),
        });
      }
    }

    if (items.length >= 2) { // Lowered from 3 to 2
      return { type: 'features', items, remainingProse: '', confidence: 0.7 };
    }

    // Pattern 3: Sentences starting with benefit words
    const benefitIndicators = [
      'biedt', 'zorgt', 'maakt', 'helpt', 'verbetert', 'verhoogt', 'verlaagt', 'vermindert',
      'provides', 'offers', 'ensures', 'enables', 'helps', 'improves', 'increases', 'reduces',
      'allows', 'supports', 'delivers', 'includes', 'features', 'contains',
    ];

    const sentences = text.split(/(?<=[.!?])\s+/);
    const benefitItems: StructuredItem[] = [];

    for (const sentence of sentences) {
      const words = sentence.trim().toLowerCase().split(/\s+/);
      // Check if any of the first 3 words is a benefit indicator
      if (words.slice(0, 3).some(w => benefitIndicators.includes(w.replace(/[.,!?:;]$/, '')))) {
        benefitItems.push({ text: sentence.trim() });
      }
    }

    if (benefitItems.length >= 3) {
      return { type: 'features', items: benefitItems, remainingProse: '', confidence: 0.55 };
    }

    // Pattern 4: Multiple paragraphs that all look like feature descriptions
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 20 && p.trim().length < 200);
    if (paragraphs.length >= 2 && paragraphs.length <= 8) {
      return {
        type: 'features',
        items: paragraphs.map(p => ({ text: p.trim() })),
        remainingProse: '',
        confidence: 0.4,
      };
    }

    return { type: 'prose', items: [], remainingProse: content, confidence: 0.3 };
  }

  /**
   * Extract checklist items from content
   * Looks for: requirement statements, must-have items
   * ENHANCED: More indicators and lower thresholds
   */
  private static extractChecklist(content: string): ExtractedStructure {
    const text = this.stripHtml(content);
    const items: StructuredItem[] = [];

    // Pattern: Imperative or requirement language
    const checklistIndicators = [
      'moet', 'moeten', 'dient', 'vereist', 'noodzakelijk', 'essentieel', 'verplicht',
      'must', 'should', 'need', 'require', 'essential', 'necessary', 'mandatory',
      'zorg ervoor', 'controleer', 'ensure', 'verify', 'check', 'confirm',
      'belangrijk', 'important', 'critical', 'key', 'tip', 'advice', 'recommend',
      'include', 'bevatten', 'cover', 'address', 'handle',
    ];

    const sentences = text.split(/(?<=[.!?])\s+/);
    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();
      if (checklistIndicators.some(ind => lower.includes(ind))) {
        items.push({ text: sentence.trim() });
      }
    }

    if (items.length >= 2) { // Lowered from 3 to 2
      return { type: 'checklist', items, remainingProse: '', confidence: 0.7 };
    }

    // Pattern 2: Multiple short actionable sentences
    const shortActionable = sentences.filter(s =>
      s.trim().length > 10 && s.trim().length < 100 &&
      /^[A-Z]/.test(s.trim()) // Starts with capital
    );

    if (shortActionable.length >= 4) {
      return {
        type: 'checklist',
        items: shortActionable.map(t => ({ text: t.trim() })),
        remainingProse: '',
        confidence: 0.45,
      };
    }

    return { type: 'prose', items: [], remainingProse: content, confidence: 0.3 };
  }

  /**
   * Convert extracted structure back to HTML for component rendering
   */
  static toComponentHtml(structure: ExtractedStructure): string {
    if (structure.type === 'prose' || structure.items.length === 0) {
      return structure.remainingProse;
    }

    let listHtml = '<ul>\n';
    for (const item of structure.items) {
      if (structure.type === 'stats' && item.value && item.label) {
        // Format for stat-highlight: "value - label"
        listHtml += `  <li>${item.value} - ${item.label}</li>\n`;
      } else {
        listHtml += `  <li>${item.text}</li>\n`;
      }
    }
    listHtml += '</ul>';

    // Include remaining prose if any
    if (structure.remainingProse && structure.remainingProse.trim()) {
      return structure.remainingProse + '\n' + listHtml;
    }

    return listHtml;
  }

  /**
   * Strip HTML tags from content
   */
  private static stripHtml(html: string): string {
    return html
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

export default ContentStructureParser;
