/**
 * FillerReplacementAdvisor
 *
 * Detects common filler words and wordy phrases, suggesting concise replacements.
 * Only flags when total filler count exceeds 2% of word count (avoids noise on short texts).
 *
 * Rules implemented:
 *   100 - "Very" / "Really" -- suggest removal or stronger adjective
 *   101 - "Just" / "Simply" -- usually unnecessary, suggest removal
 *   102 - "Basically" / "Essentially" -- remove or rephrase
 *   103 - "Actually" / "Literally" -- often misused, suggest removal
 *   104 - "In order to" -- replace with "to"
 *   105 - "Due to the fact that" -- replace with "because"
 *   106 - "At this point in time" / "At the present time" -- replace with "now" / "currently"
 *   107 - "It is important to note that" -- remove, just state the note
 *   108 - "In the event that" -- replace with "if"
 *   109 - "A large number of" -- replace with "many"
 *   110 - "Has the ability to" -- replace with "can"
 *   111 - "In spite of the fact that" -- replace with "although"
 *   112 - "For the purpose of" -- replace with "to"
 */

export interface FillerReplacement {
  pattern: RegExp;
  replacement: string;
  ruleId: string;
}

export interface FillerIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  exampleFix?: string;
}

interface RuleMeta {
  ruleId: string;
  title: string;
  exampleOriginal: string;
  exampleReplacement: string;
}

export class FillerReplacementAdvisor {
  private readonly fillers: FillerReplacement[] = [
    { pattern: /\bvery\s+(\w+)/gi, replacement: '[stronger adjective]', ruleId: 'rule-100' },
    { pattern: /\breally\s+(\w+)/gi, replacement: '[stronger adjective]', ruleId: 'rule-100' },
    { pattern: /\bjust\s+/gi, replacement: '', ruleId: 'rule-101' },
    { pattern: /\bsimply\s+/gi, replacement: '', ruleId: 'rule-101' },
    { pattern: /\bbasically\b/gi, replacement: '', ruleId: 'rule-102' },
    { pattern: /\bessentially\b/gi, replacement: '', ruleId: 'rule-102' },
    { pattern: /\bactually\b/gi, replacement: '', ruleId: 'rule-103' },
    { pattern: /\bliterally\b/gi, replacement: '', ruleId: 'rule-103' },
    { pattern: /\bin order to\b/gi, replacement: 'to', ruleId: 'rule-104' },
    { pattern: /\bdue to the fact that\b/gi, replacement: 'because', ruleId: 'rule-105' },
    { pattern: /\bat this point in time\b/gi, replacement: 'now', ruleId: 'rule-106' },
    { pattern: /\bat the present time\b/gi, replacement: 'currently', ruleId: 'rule-106' },
    { pattern: /\bit is important to note that\b/gi, replacement: '', ruleId: 'rule-107' },
    { pattern: /\bin the event that\b/gi, replacement: 'if', ruleId: 'rule-108' },
    { pattern: /\ba large number of\b/gi, replacement: 'many', ruleId: 'rule-109' },
    { pattern: /\bhas the ability to\b/gi, replacement: 'can', ruleId: 'rule-110' },
    { pattern: /\bin spite of the fact that\b/gi, replacement: 'although', ruleId: 'rule-111' },
    { pattern: /\bfor the purpose of\b/gi, replacement: 'to', ruleId: 'rule-112' },
  ];

  private readonly ruleMeta: Record<string, RuleMeta> = {
    'rule-100': {
      ruleId: 'rule-100',
      title: '"Very" / "Really" filler detected',
      exampleOriginal: 'very fast',
      exampleReplacement: 'rapid',
    },
    'rule-101': {
      ruleId: 'rule-101',
      title: '"Just" / "Simply" filler detected',
      exampleOriginal: 'just add the file',
      exampleReplacement: 'add the file',
    },
    'rule-102': {
      ruleId: 'rule-102',
      title: '"Basically" / "Essentially" filler detected',
      exampleOriginal: 'basically it works',
      exampleReplacement: 'it works',
    },
    'rule-103': {
      ruleId: 'rule-103',
      title: '"Actually" / "Literally" filler detected',
      exampleOriginal: 'actually the process is simple',
      exampleReplacement: 'the process is simple',
    },
    'rule-104': {
      ruleId: 'rule-104',
      title: '"In order to" filler detected',
      exampleOriginal: 'in order to install',
      exampleReplacement: 'to install',
    },
    'rule-105': {
      ruleId: 'rule-105',
      title: '"Due to the fact that" filler detected',
      exampleOriginal: 'due to the fact that it rains',
      exampleReplacement: 'because it rains',
    },
    'rule-106': {
      ruleId: 'rule-106',
      title: '"At this point in time" / "At the present time" filler detected',
      exampleOriginal: 'at this point in time',
      exampleReplacement: 'now',
    },
    'rule-107': {
      ruleId: 'rule-107',
      title: '"It is important to note that" filler detected',
      exampleOriginal: 'it is important to note that React uses a virtual DOM',
      exampleReplacement: 'React uses a virtual DOM',
    },
    'rule-108': {
      ruleId: 'rule-108',
      title: '"In the event that" filler detected',
      exampleOriginal: 'in the event that the server fails',
      exampleReplacement: 'if the server fails',
    },
    'rule-109': {
      ruleId: 'rule-109',
      title: '"A large number of" filler detected',
      exampleOriginal: 'a large number of users',
      exampleReplacement: 'many users',
    },
    'rule-110': {
      ruleId: 'rule-110',
      title: '"Has the ability to" filler detected',
      exampleOriginal: 'has the ability to process data',
      exampleReplacement: 'can process data',
    },
    'rule-111': {
      ruleId: 'rule-111',
      title: '"In spite of the fact that" filler detected',
      exampleOriginal: 'in spite of the fact that the API changed',
      exampleReplacement: 'although the API changed',
    },
    'rule-112': {
      ruleId: 'rule-112',
      title: '"For the purpose of" filler detected',
      exampleOriginal: 'for the purpose of testing',
      exampleReplacement: 'to test / for testing',
    },
  };

  /** Minimum filler-to-word ratio (2%) before issues are reported. */
  private readonly THRESHOLD_RATIO = 0.02;

  /**
   * Validate text for filler words. Returns one issue per unique rule triggered.
   * Only reports when total filler count exceeds 2% of word count.
   */
  validate(text: string): FillerIssue[] {
    if (!text || !text.trim()) return [];

    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    const suggestions = this.getSuggestions(text);

    if (suggestions.length === 0) return [];

    // Threshold check: only flag if total fillers exceed 2% of word count
    if (wordCount > 0 && suggestions.length / wordCount < this.THRESHOLD_RATIO) {
      return [];
    }

    // Group by ruleId
    const grouped = new Map<string, typeof suggestions>();
    for (const s of suggestions) {
      const existing = grouped.get(s.ruleId) || [];
      existing.push(s);
      grouped.set(s.ruleId, existing);
    }

    const issues: FillerIssue[] = [];
    for (const [ruleId, instances] of grouped) {
      const meta = this.ruleMeta[ruleId];
      if (!meta) continue;

      const sampleOriginal = instances[0].original;
      const sampleSuggested = instances[0].suggested || '(remove)';

      issues.push({
        ruleId,
        severity: 'low',
        title: meta.title,
        description:
          `Found ${instances.length} occurrence(s). ` +
          `Example: "${sampleOriginal}" -> "${sampleSuggested}".`,
        affectedElement: instances.map(i => i.original).slice(0, 3).join(', '),
        exampleFix: `"${meta.exampleOriginal}" -> "${meta.exampleReplacement}"`,
      });
    }

    return issues;
  }

  /**
   * Get specific replacement suggestions for auto-fix support.
   * Returns every individual match found, regardless of threshold.
   */
  getSuggestions(
    text: string
  ): Array<{ original: string; suggested: string; ruleId: string }> {
    if (!text || !text.trim()) return [];

    const results: Array<{ original: string; suggested: string; ruleId: string }> = [];

    for (const filler of this.fillers) {
      // Reset regex state (global flag means lastIndex must be reset)
      const regex = new RegExp(filler.pattern.source, filler.pattern.flags);
      let match: RegExpExecArray | null;

      while ((match = regex.exec(text)) !== null) {
        const original = match[0];
        let suggested: string;

        if (filler.replacement === '') {
          suggested = '(remove)';
        } else if (filler.replacement === '[stronger adjective]') {
          // For "very/really X", suggest a stronger form
          const adjective = match[1] || '';
          suggested = this.suggestStrongerAdjective(adjective);
        } else {
          suggested = filler.replacement;
        }

        results.push({ original, suggested, ruleId: filler.ruleId });
      }
    }

    return results;
  }

  /**
   * Suggests a stronger adjective to replace "very/really X" patterns.
   * Falls back to just the adjective if no known mapping exists.
   */
  private suggestStrongerAdjective(adjective: string): string {
    const mappings: Record<string, string> = {
      fast: 'rapid',
      good: 'excellent',
      bad: 'terrible',
      big: 'enormous',
      small: 'tiny',
      important: 'essential',
      hard: 'arduous',
      easy: 'effortless',
      happy: 'ecstatic',
      sad: 'devastated',
      cold: 'freezing',
      hot: 'scorching',
      tired: 'exhausted',
      hungry: 'starving',
      large: 'massive',
      nice: 'wonderful',
      smart: 'brilliant',
      strong: 'powerful',
      weak: 'feeble',
      old: 'ancient',
      new: 'novel',
      clean: 'spotless',
      dirty: 'filthy',
      quiet: 'silent',
      loud: 'deafening',
      simple: 'straightforward',
    };

    const lower = adjective.toLowerCase();
    return mappings[lower] || adjective;
  }
}
