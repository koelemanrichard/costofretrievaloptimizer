// services/ai/frameSemanticsAnalyzer.ts

/**
 * FrameSemanticsAnalyzer
 *
 * Maps topics to FrameNet-inspired semantic frames to identify
 * uncovered frames in a topical map. Helps ensure comprehensive
 * coverage of all aspects of a domain.
 *
 * A semantic frame represents a structured situation or event with
 * defined roles (frame elements). For SEO, ensuring all relevant
 * frames are covered means comprehensive topical authority.
 */

export interface SemanticFrame {
  /** Frame name */
  name: string;
  /** Frame description */
  description: string;
  /** Core frame elements (required roles) */
  coreElements: string[];
  /** Non-core frame elements (optional roles) */
  peripheralElements: string[];
}

export interface FrameCoverageResult {
  /** Frame being analyzed */
  frame: SemanticFrame;
  /** Coverage score (0-1) */
  coverage: number;
  /** Which core elements are covered */
  coveredCore: string[];
  /** Which core elements are missing */
  missingCore: string[];
  /** Which peripheral elements are covered */
  coveredPeripheral: string[];
}

export interface FrameAnalysisReport {
  /** Total frames analyzed */
  totalFrames: number;
  /** Frames with full core coverage */
  fullyCovered: number;
  /** Frames with partial coverage */
  partiallyCovered: number;
  /** Frames with no coverage */
  uncovered: number;
  /** Overall frame coverage score */
  overallCoverage: number;
  /** Per-frame results */
  frameResults: FrameCoverageResult[];
  /** Suggested topics for uncovered frames */
  suggestions: string[];
}

/**
 * Generic semantic frames applicable to many domains.
 * These represent common information needs around any entity.
 */
const GENERIC_FRAMES: SemanticFrame[] = [
  {
    name: 'Definition',
    description: 'What the entity is',
    coreElements: ['entity', 'category', 'distinguishing features'],
    peripheralElements: ['history', 'etymology', 'alternative names'],
  },
  {
    name: 'Components',
    description: 'Parts and structure of the entity',
    coreElements: ['parts', 'relationships between parts', 'hierarchy'],
    peripheralElements: ['optional components', 'variations'],
  },
  {
    name: 'Process',
    description: 'How the entity works or is used',
    coreElements: ['steps', 'agent', 'goal'],
    peripheralElements: ['tools', 'duration', 'prerequisites', 'outcomes'],
  },
  {
    name: 'Comparison',
    description: 'How the entity differs from alternatives',
    coreElements: ['entity', 'alternative', 'differentiators'],
    peripheralElements: ['use cases', 'trade-offs', 'scenarios'],
  },
  {
    name: 'Benefits',
    description: 'Advantages and positive outcomes',
    coreElements: ['benefit', 'beneficiary', 'mechanism'],
    peripheralElements: ['evidence', 'quantification', 'conditions'],
  },
  {
    name: 'Risks',
    description: 'Potential problems and concerns',
    coreElements: ['risk', 'affected party', 'likelihood'],
    peripheralElements: ['mitigation', 'severity', 'prevention'],
  },
  {
    name: 'Cost',
    description: 'Financial and resource implications',
    coreElements: ['price', 'currency', 'what is included'],
    peripheralElements: ['discounts', 'alternatives', 'ROI', 'payment options'],
  },
  {
    name: 'Evaluation',
    description: 'How to judge or choose',
    coreElements: ['criteria', 'measurement', 'standards'],
    peripheralElements: ['best practices', 'benchmarks', 'tools'],
  },
  {
    name: 'Troubleshooting',
    description: 'Common problems and solutions',
    coreElements: ['problem', 'cause', 'solution'],
    peripheralElements: ['prevention', 'when to seek help', 'tools needed'],
  },
  {
    name: 'Future',
    description: 'Trends and evolution',
    coreElements: ['trend', 'timeline', 'impact'],
    peripheralElements: ['predictions', 'emerging technologies', 'preparation'],
  },
];

export class FrameSemanticsAnalyzer {
  /**
   * Analyze frame coverage for a set of topics.
   * Topics are matched against frame elements using keyword matching.
   */
  static analyze(
    topics: string[],
    customFrames?: SemanticFrame[]
  ): FrameAnalysisReport {
    const frames = customFrames || GENERIC_FRAMES;
    const topicsLower = topics.map(t => t.toLowerCase());
    const frameResults: FrameCoverageResult[] = [];

    let fullyCovered = 0;
    let partiallyCovered = 0;
    let uncovered = 0;

    for (const frame of frames) {
      const coveredCore: string[] = [];
      const missingCore: string[] = [];
      const coveredPeripheral: string[] = [];

      // Check core elements
      for (const element of frame.coreElements) {
        const elementWords = element.toLowerCase().split(/\s+/);
        const isCovered = topicsLower.some(topic =>
          elementWords.some(word => word.length > 3 && topic.includes(word))
        );
        if (isCovered) coveredCore.push(element);
        else missingCore.push(element);
      }

      // Check peripheral elements
      for (const element of frame.peripheralElements) {
        const elementWords = element.toLowerCase().split(/\s+/);
        const isCovered = topicsLower.some(topic =>
          elementWords.some(word => word.length > 3 && topic.includes(word))
        );
        if (isCovered) coveredPeripheral.push(element);
      }

      // Calculate coverage
      const totalElements = frame.coreElements.length + frame.peripheralElements.length;
      const coveredElements = coveredCore.length + coveredPeripheral.length;
      const coverage = totalElements > 0 ? coveredElements / totalElements : 0;

      if (missingCore.length === 0) fullyCovered++;
      else if (coveredCore.length > 0) partiallyCovered++;
      else uncovered++;

      frameResults.push({
        frame,
        coverage: Math.round(coverage * 100) / 100,
        coveredCore,
        missingCore,
        coveredPeripheral,
      });
    }

    // Generate suggestions for uncovered frames
    const suggestions: string[] = [];
    for (const result of frameResults) {
      if (result.missingCore.length > 0) {
        suggestions.push(
          `Frame "${result.frame.name}": Missing topics for ${result.missingCore.join(', ')}`
        );
      }
    }

    const overallCoverage = frames.length > 0
      ? frameResults.reduce((s, r) => s + r.coverage, 0) / frames.length
      : 0;

    return {
      totalFrames: frames.length,
      fullyCovered,
      partiallyCovered,
      uncovered,
      overallCoverage: Math.round(overallCoverage * 100) / 100,
      frameResults,
      suggestions: suggestions.slice(0, 20),
    };
  }

  /**
   * Get the generic frames. Useful for UI display.
   */
  static getGenericFrames(): SemanticFrame[] {
    return [...GENERIC_FRAMES];
  }
}
