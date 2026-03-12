/**
 * Content Quality Phase Adapter
 *
 * Covers checklist categories C, D, E: micro-semantics, density, content format, flow.
 *
 * Uses:
 *   - MicroSemanticsValidator for modality, hedging, predicate specificity, SPO
 *   - AiAssistedRuleEngine (fallback) for experience indicators, examples, snippet optimization
 */

import { AuditPhase } from './AuditPhase';
import type { AuditPhaseName, AuditRequest, AuditPhaseResult, AuditFinding } from '../types';
import { MicroSemanticsValidator } from '../rules/MicroSemanticsValidator';
import { AiAssistedRuleEngine } from '../rules/AiAssistedRuleEngine';
import type { AiRuleInput } from '../rules/AiAssistedRuleEngine';
import { LanguageSpecificRules, type SupportedLanguage } from '../rules/LanguageSpecificRules';
import { PerfectPassageValidator } from '../rules/PerfectPassageValidator';
import { ChunkingResistanceValidator } from '../rules/ChunkingResistanceValidator';

export class ContentQualityPhase extends AuditPhase {
  readonly phaseName: AuditPhaseName = 'microSemantics';

  async execute(request: AuditRequest, content?: unknown): Promise<AuditPhaseResult> {
    const findings: AuditFinding[] = [];
    let totalChecks = 0;

    // Rules 57-58, 61, 73: Micro-semantics validation (modality, predicate specificity, SPO)
    const contentData = this.extractContent(content);
    if (contentData?.text) {
      totalChecks += 4; // modality, hedging, predicate specificity, SPO checks
      const microValidator = new MicroSemanticsValidator();
      const microIssues = microValidator.validate(contentData.text);
      for (const issue of microIssues) {
        findings.push(this.createFinding({
          ruleId: issue.ruleId,
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          affectedElement: issue.affectedElement,
          exampleFix: issue.exampleFix,
          whyItMatters: 'Sentence-level semantic quality affects how search engines parse and understand content.',
          category: 'Micro-Semantics',
        }));
      }
    }

    // Language-specific rules: filler words, compound splits, address mixing
    if (contentData?.text) {
      const langRules = new LanguageSpecificRules();
      const langCode = (request.language?.substring(0, 2) || 'en') as SupportedLanguage;
      const langIssues = langRules.validate(contentData.text, langCode);
      totalChecks += Math.max(1, langIssues.length);
      for (const issue of langIssues) {
        findings.push(this.createFinding({
          ruleId: issue.ruleId,
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          affectedElement: issue.affectedElement,
          exampleFix: issue.exampleFix,
          whyItMatters: 'Language-specific writing quality affects readability and search engine parsing for non-English markets.',
          category: 'Language Rules',
        }));
      }
    }

    // Rules 21-ai, 22-ai, 225-ai, 226-ai: AI-assisted fallback heuristic checks
    if (contentData?.text) {
      totalChecks += 4; // experience indicators, specific examples, snippet paragraph, how-to steps
      const aiEngine = new AiAssistedRuleEngine();
      const aiInput: AiRuleInput = {
        text: contentData.text,
        centralEntity: contentData.centralEntity,
        eavTriples: contentData.eavTriples,
        keyAttributes: contentData.keyAttributes,
        language: request.language,
      };
      const aiIssues = aiEngine.validateFallback(aiInput);
      for (const issue of aiIssues) {
        findings.push(this.createFinding({
          ruleId: issue.ruleId,
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          affectedElement: issue.affectedElement,
          exampleFix: issue.exampleFix,
          whyItMatters: 'Author expertise signals and featured snippet optimization improve E-E-A-T and SERP visibility.',
          category: 'Content Quality',
        }));
      }
    }

    // AI Visibility: Perfect Passage scoring (requires HTML for H2 section extraction)
    if (contentData?.html) {
      totalChecks += 2; // passage structure + direct answer checks
      const passageValidator = new PerfectPassageValidator();
      const passageResult = passageValidator.validate(contentData.html);
      for (const section of passageResult.sections) {
        if (section.sectionScore < 50) {
          findings.push(this.createFinding({
            ruleId: 'PASSAGE_LOW_SCORE',
            severity: section.sectionScore < 25 ? 'high' : 'medium',
            title: `Low AI passage score for "${section.heading}"`,
            description: `Section "${section.heading}" scored ${section.sectionScore}/100 for AI extractability. Missing: ${!section.headingIsQuestion ? 'question heading, ' : ''}${section.firstParagraphWords < 10 || section.firstParagraphWords > 70 ? 'optimal answer length, ' : ''}${!section.hasNumericEvidence ? 'numeric evidence, ' : ''}${!section.hasSourceCitation ? 'source citation' : ''}.`.replace(/, \.$/, '.'),
            affectedElement: section.heading,
            exampleFix: 'Rewrite the heading as a question, add a 10-70 word direct answer as the first paragraph, include numeric evidence, and cite sources.',
            whyItMatters: 'LLMs and RAG systems extract content in passage-sized chunks. Sections with question headings, direct answers, evidence, and citations are more likely to be selected and cited by AI systems.',
            category: 'AI Visibility',
          }));
        }
      }
    }

    // AI Visibility: Chunking resistance (cross-section references)
    if (contentData?.text) {
      totalChecks++; // chunking reference check
      const chunkingValidator = new ChunkingResistanceValidator();
      const chunkingIssues = chunkingValidator.validate(contentData.text, contentData.centralEntity);
      for (const issue of chunkingIssues) {
        findings.push(this.createFinding({
          ruleId: issue.ruleId,
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          affectedElement: issue.affectedElement,
          exampleFix: issue.exampleFix,
          whyItMatters: 'RAG systems extract content in isolated chunks. Cross-section references like "as mentioned above" break when the referenced content is not included in the same chunk.',
          category: 'AI Visibility',
        }));
      }

      // AI Visibility: Section length check for chunking
      totalChecks++; // section length check
      // Split text by double newlines as a proxy for section boundaries
      const textSections = contentData.text.split(/\n\n+/).filter(s => s.trim().length > 50);
      for (const sectionText of textSections) {
        const lengthIssues = chunkingValidator.validateSectionLength(sectionText);
        for (const issue of lengthIssues) {
          findings.push(this.createFinding({
            ruleId: issue.ruleId,
            severity: issue.severity,
            title: issue.title,
            description: issue.description,
            affectedElement: issue.affectedElement,
            exampleFix: issue.exampleFix,
            whyItMatters: 'RAG systems split content into fixed-size chunks. Sections over 500 words risk being split mid-paragraph, losing semantic boundaries and reducing retrieval accuracy.',
            category: 'AI Visibility',
          }));
        }
      }
    }

    return this.buildResult(findings, totalChecks);
  }

  private extractContent(content: unknown): {
    text: string;
    html?: string;
    centralEntity?: string;
    eavTriples?: Array<{ entity: string; attribute: string; value: string }>;
    keyAttributes?: string[];
  } | null {
    if (!content) return null;
    if (typeof content === 'string') return { text: content };
    if (typeof content === 'object' && 'text' in (content as Record<string, unknown>)) {
      const c = content as Record<string, unknown>;
      return {
        text: c.text as string,
        html: c.html as string | undefined,
        centralEntity: c.centralEntity as string | undefined,
        eavTriples: c.eavTriples as Array<{ entity: string; attribute: string; value: string }> | undefined,
        keyAttributes: c.rootAttributes as string[] | undefined,
      };
    }
    return null;
  }
}
