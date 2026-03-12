/**
 * PerfectPassageValidator
 *
 * Scores HTML content sections for AI/LLM visibility. For each H2 section,
 * checks four dimensions (25 pts each):
 *   1. Question heading — H2 starts with question word or ends with ?
 *   2. Direct answer — First paragraph is 10-70 words
 *   3. Numeric evidence — Any paragraph contains numbers + units
 *   4. Source citation — Any paragraph contains citation patterns
 *
 * Overall score = average of section scores (0-100).
 */

export interface PassageSectionResult {
  heading: string;
  headingIsQuestion: boolean;
  firstParagraphWords: number;
  hasNumericEvidence: boolean;
  hasSourceCitation: boolean;
  sectionScore: number;
}

export interface PassageValidationResult {
  /** 0-100 average of section scores */
  score: number;
  /** Any section has a question heading */
  hasQuestionHeading: boolean;
  /** Any section has a 10-70 word first paragraph */
  hasDirectAnswer: boolean;
  /** Any section has numeric evidence */
  hasEvidence: boolean;
  /** Any section has a source citation */
  hasAttribution: boolean;
  /** brandName appears anywhere in the HTML (case-insensitive) */
  hasBrandAdjacency: boolean;
  /** First section's first paragraph word count */
  answerCapsuleWordCount: number;
  sections: PassageSectionResult[];
}

/**
 * Question words that signal a question heading when they appear at the start.
 * Covers Dutch, English, and German.
 */
const QUESTION_WORDS = [
  'wat', 'hoe', 'hoeveel', 'wanneer', 'waarom', 'welk', 'welke',
  'what', 'how', 'when', 'why', 'which', 'where', 'does', 'is', 'can',
];

/**
 * Regex matching a number followed by a unit token.
 * Supports currency symbols, %, and common Dutch/English/German units.
 */
const NUMERIC_EVIDENCE_REGEX =
  /\d+(?:[.,]\d+)?\s*(?:€|%|\$|£|kg|m²|m2|jaar|euro|dollar|procent|meter|liter|km|cm|mm|gb|mb|tb|kwh|ton|uur|dagen|weken|maanden|minutes|hours|days|weeks|months|years|pounds|kilograms|meters|liters|percent)/i;

/**
 * Citation / attribution patterns (Dutch, English, German).
 */
const CITATION_REGEX =
  /\b(?:volgens|bron:|according to|source:|laut|quelle:)\b/i;

export class PerfectPassageValidator {
  validate(html: string, brandName?: string): PassageValidationResult {
    const sections = this.extractH2Sections(html);

    if (sections.length === 0) {
      return {
        score: 0,
        hasQuestionHeading: false,
        hasDirectAnswer: false,
        hasEvidence: false,
        hasAttribution: false,
        hasBrandAdjacency: this.checkBrandAdjacency(html, brandName),
        answerCapsuleWordCount: 0,
        sections: [],
      };
    }

    const sectionResults: PassageSectionResult[] = sections.map((section) => {
      const headingIsQuestion = this.isQuestionHeading(section.heading);
      const firstParagraphWords = this.countWords(section.firstParagraph);
      const hasNumericEvidence = section.paragraphs.some((p) =>
        NUMERIC_EVIDENCE_REGEX.test(p),
      );
      const hasSourceCitation = section.paragraphs.some((p) =>
        CITATION_REGEX.test(p),
      );

      let sectionScore = 0;

      // Dimension 1: Question heading (25 pts)
      if (headingIsQuestion) {
        sectionScore += 25;
      }

      // Dimension 2: Direct answer (25 pts optimal, 10 pts acceptable)
      if (firstParagraphWords >= 10 && firstParagraphWords <= 70) {
        sectionScore += 25;
      } else if (firstParagraphWords >= 1 && firstParagraphWords <= 100) {
        sectionScore += 10;
      }

      // Dimension 3: Numeric evidence (25 pts)
      if (hasNumericEvidence) {
        sectionScore += 25;
      }

      // Dimension 4: Source citation (25 pts)
      if (hasSourceCitation) {
        sectionScore += 25;
      }

      return {
        heading: section.heading,
        headingIsQuestion,
        firstParagraphWords,
        hasNumericEvidence,
        hasSourceCitation,
        sectionScore,
      };
    });

    const totalScore =
      sectionResults.reduce((sum, s) => sum + s.sectionScore, 0) /
      sectionResults.length;

    return {
      score: Math.round(totalScore * 100) / 100,
      hasQuestionHeading: sectionResults.some((s) => s.headingIsQuestion),
      hasDirectAnswer: sectionResults.some(
        (s) => s.firstParagraphWords >= 10 && s.firstParagraphWords <= 70,
      ),
      hasEvidence: sectionResults.some((s) => s.hasNumericEvidence),
      hasAttribution: sectionResults.some((s) => s.hasSourceCitation),
      hasBrandAdjacency: this.checkBrandAdjacency(html, brandName),
      answerCapsuleWordCount: sectionResults[0]?.firstParagraphWords ?? 0,
      sections: sectionResults,
    };
  }

  private isQuestionHeading(heading: string): boolean {
    const trimmed = heading.trim();
    if (trimmed.endsWith('?')) return true;
    const firstWord = trimmed.split(/\s+/)[0]?.toLowerCase() ?? '';
    return QUESTION_WORDS.includes(firstWord);
  }

  private countWords(text: string): number {
    if (!text) return 0;
    return text.split(/\s+/).filter((w) => w.length > 0).length;
  }

  private checkBrandAdjacency(html: string, brandName?: string): boolean {
    if (!brandName) return false;
    return html.toLowerCase().includes(brandName.toLowerCase());
  }

  private extractH2Sections(
    html: string,
  ): Array<{
    heading: string;
    firstParagraph: string;
    paragraphs: string[];
  }> {
    const results: Array<{
      heading: string;
      firstParagraph: string;
      paragraphs: string[];
    }> = [];

    const h2Regex = /<h2[^>]*>(.*?)<\/h2>/gi;
    const matches: Array<{ heading: string; index: number; fullLength: number }> = [];
    let match;

    while ((match = h2Regex.exec(html)) !== null) {
      matches.push({
        heading: match[1].replace(/<[^>]+>/g, '').trim(),
        index: match.index,
        fullLength: match[0].length,
      });
    }

    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index + matches[i].fullLength;
      const end = i + 1 < matches.length ? matches[i + 1].index : html.length;
      const sectionHtml = html.slice(start, end);

      const paragraphs: string[] = [];
      const pRegex = /<p[^>]*>(.*?)<\/p>/gis;
      let pMatch;
      while ((pMatch = pRegex.exec(sectionHtml)) !== null) {
        const text = pMatch[1].replace(/<[^>]+>/g, '').trim();
        if (text) paragraphs.push(text);
      }

      results.push({
        heading: matches[i].heading,
        firstParagraph: paragraphs[0] ?? '',
        paragraphs,
      });
    }

    return results;
  }
}
