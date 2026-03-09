/**
 * Chunking Resistance Validator
 *
 * Validates that content sections can be extracted in isolation by RAG systems
 * and still make complete sense. Checks for cross-section references, entity
 * re-introduction, and section length optimization.
 */

export interface ChunkingIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  exampleFix?: string;
}

const FORWARD_BACKWARD_PATTERNS = [
  /as mentioned above/i,
  /as discussed above/i,
  /as noted above/i,
  /as explained above/i,
  /as described above/i,
  /as stated above/i,
  /as we discussed/i,
  /as we mentioned/i,
  /see below/i,
  /see above/i,
  /in the previous section/i,
  /in the next section/i,
  /in the following section/i,
  /later in this article/i,
  /earlier in this article/i,
  /as discussed earlier/i,
  /as noted earlier/i,
  /we covered this in/i,
  /refer to the section/i,
];

export class ChunkingResistanceValidator {
  validate(html: string, entityName?: string): ChunkingIssue[] {
    const issues: ChunkingIssue[] = [];
    const sections = this.extractH2Sections(html);

    for (const section of sections) {
      // Check forward/backward references
      for (const pattern of FORWARD_BACKWARD_PATTERNS) {
        if (pattern.test(section.content)) {
          const match = section.content.match(pattern);
          issues.push({
            ruleId: 'rule-chunk-forward-ref',
            severity: 'medium',
            title: 'Cross-section reference breaks chunking',
            description: `Section "${section.heading}" contains "${match?.[0] || 'cross-reference'}". RAG systems may extract this section alone — the referenced content won't be available.`,
            affectedElement: section.heading,
            exampleFix: 'Replace the cross-reference with the actual fact or statement being referenced',
          });
          break; // One finding per section
        }
      }

      // Check entity re-introduction in first sentence
      if (entityName && section.firstSentence) {
        if (!section.firstSentence.toLowerCase().includes(entityName.toLowerCase())) {
          issues.push({
            ruleId: 'rule-chunk-entity-reintro',
            severity: 'medium',
            title: 'Entity not re-introduced in section',
            description: `First sentence of "${section.heading}" does not mention "${entityName}". When this section is extracted as a standalone chunk, the subject is unclear.`,
            affectedElement: section.heading,
            exampleFix: `Naturally include "${entityName}" in the opening sentence`,
          });
        }
      }

      // Check section length
      const wordCount = section.content.split(/\s+/).filter(w => w.length > 0).length;
      if (wordCount > 800) {
        issues.push({
          ruleId: 'rule-chunk-section-length',
          severity: 'low',
          title: 'Section may split across multiple RAG chunks',
          description: `Section "${section.heading}" is ${wordCount} words. Sections over 800 words risk being split by RAG chunking algorithms.`,
          affectedElement: section.heading,
          exampleFix: 'Split into 2-3 subsections (H3) of 200-500 words each',
        });
      } else if (wordCount < 100 && wordCount > 0) {
        issues.push({
          ruleId: 'rule-chunk-section-length',
          severity: 'low',
          title: 'Section too thin for standalone retrieval',
          description: `Section "${section.heading}" is only ${wordCount} words. Sections under 100 words may not provide sufficient context.`,
          affectedElement: section.heading,
          exampleFix: 'Expand with supporting evidence, examples, or merge into parent section',
        });
      }
    }

    return issues;
  }

  private extractH2Sections(html: string): Array<{
    heading: string;
    content: string;
    firstSentence: string;
  }> {
    const results: Array<{ heading: string; content: string; firstSentence: string }> = [];
    const h2Regex = /<h2[^>]*>(.*?)<\/h2>/gi;
    const matches = [...html.matchAll(h2Regex)];

    for (let i = 0; i < matches.length; i++) {
      const heading = matches[i][1].replace(/<[^>]+>/g, '').trim();
      const start = matches[i].index! + matches[i][0].length;
      const end = i + 1 < matches.length ? matches[i + 1].index! : html.length;
      const sectionHtml = html.slice(start, end);
      const content = sectionHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const sentenceMatch = content.match(/^[^.!?]+[.!?]/);
      const firstSentence = sentenceMatch ? sentenceMatch[0].trim() : content.slice(0, 200);
      results.push({ heading, content, firstSentence });
    }

    return results;
  }
}
