/**
 * AiAssistedRuleEngine
 *
 * Rules that require LLM analysis for deep semantic evaluation.
 * The engine defines check criteria and expected I/O, but actual LLM calls
 * are delegated to an injected evaluator function.
 *
 * Each rule includes:
 *   - A promptTemplate filled with input context
 *   - An optional fallbackCheck for heuristic validation when no AI is available
 *
 * Rule groups implemented:
 *   SC Attribute Priority:     rules 7-ai, 14-ai
 *   Author Expertise (EEAT):   rules 21-ai, 22-ai, 23-ai, 24-ai
 *   EAV Explicitness:          rules 34-ai, 47-ai
 *   Frame Semantics:           rules 69-ai, 72-ai
 *   Featured Snippet Opt.:     rules 225-ai, 226-ai, 228-ai
 *   Related Content:           rule  230-ai
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Injected function that delegates to an LLM provider. */
export type AiEvaluator = (
  prompt: string,
  context: string,
) => Promise<{ passed: boolean; details: string }>;

export interface AiRuleDefinition {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  category: string;
  promptTemplate: string;
  fallbackCheck?: (input: AiRuleInput) => AiRuleIssue | null;
}

export interface AiRuleInput {
  text: string;
  centralEntity?: string;
  targetKeyword?: string;
  keyAttributes?: string[];
  eavTriples?: Array<{ entity: string; attribute: string; value: string }>;
  headings?: string[];
  authorInfo?: { name?: string; bio?: string };
  language?: string;
  region?: string;
}

export interface AiRuleIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  exampleFix?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getLanguageNameForRule(language: string | undefined): string {
  if (!language) return 'English';
  const map: Record<string, string> = {
    en: 'English', nl: 'Dutch', de: 'German', fr: 'French', es: 'Spanish',
    it: 'Italian', pt: 'Portuguese', pl: 'Polish', ru: 'Russian', zh: 'Chinese',
    ja: 'Japanese', ko: 'Korean', ar: 'Arabic', hi: 'Hindi', tr: 'Turkish',
    sv: 'Swedish', da: 'Danish', no: 'Norwegian', fi: 'Finnish', cs: 'Czech',
    english: 'English', dutch: 'Dutch', german: 'German', french: 'French',
    spanish: 'Spanish', italian: 'Italian', portuguese: 'Portuguese',
  };
  const normalized = language.trim().toLowerCase().split('-')[0].split('_')[0];
  return map[normalized] || language.charAt(0).toUpperCase() + language.slice(1);
}

function buildContext(input: AiRuleInput): string {
  const parts: string[] = [];
  if (input.language) {
    const langName = getLanguageNameForRule(input.language);
    parts.push(`**OUTPUT LANGUAGE: ${langName}${input.region ? ` (${input.region})` : ''}** — All descriptions and suggestions MUST be in ${langName}. Only JSON keys remain in English.`);
  }
  if (input.centralEntity) parts.push(`Central Entity: ${input.centralEntity}`);
  if (input.targetKeyword) parts.push(`Target Keyword: ${input.targetKeyword}`);
  if (input.keyAttributes?.length)
    parts.push(`Key Attributes: ${input.keyAttributes.join(', ')}`);
  if (input.eavTriples?.length)
    parts.push(
      `EAV Triples:\n${input.eavTriples
        .map((t) => `  ${t.entity} | ${t.attribute} | ${t.value}`)
        .join('\n')}`,
    );
  if (input.headings?.length)
    parts.push(`Headings: ${input.headings.join(' | ')}`);
  if (input.authorInfo)
    parts.push(
      `Author: ${input.authorInfo.name ?? 'unknown'}${input.authorInfo.bio ? ` — ${input.authorInfo.bio}` : ''}`,
    );
  parts.push(`\n--- Content ---\n${input.text}`);
  return parts.join('\n');
}

function fillTemplate(template: string, input: AiRuleInput): string {
  return template
    .replace('{{centralEntity}}', input.centralEntity ?? 'the topic')
    .replace('{{targetKeyword}}', input.targetKeyword ?? 'the target query')
    .replace(
      '{{keyAttributes}}',
      input.keyAttributes?.join(', ') ?? 'key attributes',
    )
    .replace('{{language}}', getLanguageNameForRule(input.language));
}

// ---------------------------------------------------------------------------
// Fallback helper utilities
// ---------------------------------------------------------------------------

function countWordParagraphs(text: string, minWords: number, maxWords: number): string[] {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return paragraphs.filter((p) => {
    const wordCount = p.split(/\s+/).length;
    return wordCount >= minWords && wordCount <= maxWords;
  });
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class AiAssistedRuleEngine {
  private rules: AiRuleDefinition[];

  constructor() {
    this.rules = this.defineRules();
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /** Run all rules with an AI evaluator. */
  async validate(
    input: AiRuleInput,
    evaluator: AiEvaluator,
  ): Promise<AiRuleIssue[]> {
    const context = buildContext(input);
    const issues: AiRuleIssue[] = [];

    for (const rule of this.rules) {
      const prompt = fillTemplate(rule.promptTemplate, input);
      try {
        const result = await evaluator(prompt, context);
        if (!result.passed) {
          issues.push({
            ruleId: rule.ruleId,
            severity: rule.severity,
            title: rule.title,
            description: result.details,
          });
        }
      } catch {
        // If AI call fails, fall back to heuristic if available
        if (rule.fallbackCheck) {
          const fallbackIssue = rule.fallbackCheck(input);
          if (fallbackIssue) issues.push(fallbackIssue);
        }
      }
    }

    return issues;
  }

  /** Run only fallback (non-AI) checks -- useful when no AI provider is available. */
  validateFallback(input: AiRuleInput): AiRuleIssue[] {
    const issues: AiRuleIssue[] = [];
    for (const rule of this.rules) {
      if (rule.fallbackCheck) {
        const issue = rule.fallbackCheck(input);
        if (issue) issues.push(issue);
      }
    }
    return issues;
  }

  /** Get all rule definitions. */
  getRuleDefinitions(): AiRuleDefinition[] {
    return [...this.rules];
  }

  // -----------------------------------------------------------------------
  // Rule Definitions
  // -----------------------------------------------------------------------

  private defineRules(): AiRuleDefinition[] {
    return [
      // -------------------------------------------------------------------
      // SC Attribute Priority (rules 7, 14)
      // -------------------------------------------------------------------
      {
        ruleId: 'rule-7-ai',
        severity: 'high',
        title: 'SC attributes not prioritized for Central Entity',
        category: 'SC Attribute Priority',
        promptTemplate:
          'Analyze whether the content prioritizes Supporting Content (SC) attributes that support the Central Entity "{{centralEntity}}". ' +
          'Check if the most important attributes ({{keyAttributes}}) are covered in depth. ' +
          'Respond with { "passed": true/false, "details": "..." }.',
      },
      {
        ruleId: 'rule-14-ai',
        severity: 'medium',
        title: 'Contextual sections lack original analysis',
        category: 'SC Attribute Priority',
        promptTemplate:
          'Evaluate whether the Contextual Sections (CS) in this content provide unique value through original analysis, ' +
          'rather than simply restating common knowledge about "{{centralEntity}}". ' +
          'Respond with { "passed": true/false, "details": "..." }.',
      },

      // -------------------------------------------------------------------
      // Author Expertise / EEAT (rules 21-24)
      // -------------------------------------------------------------------
      {
        ruleId: 'rule-21-ai',
        severity: 'medium',
        title: 'Missing first-person experience indicators',
        category: 'Author Expertise',
        promptTemplate:
          'Does the content contain first-person experience indicators such as "in my experience", "I tested", "we found", ' +
          '"I noticed", "in practice"? These EEAT signals demonstrate real experience. ' +
          'Respond with { "passed": true/false, "details": "..." }.',
        fallbackCheck: (input: AiRuleInput): AiRuleIssue | null => {
          const patterns = /\b(I\s|we\s|my\s|our\s)/i;
          if (!patterns.test(input.text)) {
            return {
              ruleId: 'rule-21-ai',
              severity: 'medium',
              title: 'Missing first-person experience indicators',
              description:
                'No first-person pronouns (I, we, my, our) detected. ' +
                'First-person experience signals improve E-E-A-T perception.',
              exampleFix:
                'Include phrases like "In my experience...", "We tested...", "I found that...".',
            };
          }
          return null;
        },
      },
      {
        ruleId: 'rule-22-ai',
        severity: 'medium',
        title: 'Lacking specific non-obvious examples',
        category: 'Author Expertise',
        promptTemplate:
          'Does the content provide specific, non-obvious examples that demonstrate expertise about "{{centralEntity}}"? ' +
          'Look for concrete data points, named tools/products, code samples, or specific scenarios. ' +
          'Respond with { "passed": true/false, "details": "..." }.',
        fallbackCheck: (input: AiRuleInput): AiRuleIssue | null => {
          const hasCodeBlocks = /```|<code|<pre/i.test(input.text);
          const hasNumbers = /\b\d{2,}\b/.test(input.text);
          const hasProperNouns = /\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)+\b/.test(input.text);
          if (!hasCodeBlocks && !hasNumbers && !hasProperNouns) {
            return {
              ruleId: 'rule-22-ai',
              severity: 'medium',
              title: 'Lacking specific non-obvious examples',
              description:
                'No code blocks, specific numbers, or proper nouns detected. ' +
                'Expertise is best demonstrated through concrete, specific examples.',
              exampleFix:
                'Add specific data points, named tools, code snippets, or real-world scenarios.',
            };
          }
          return null;
        },
      },
      {
        ruleId: 'rule-23-ai',
        severity: 'medium',
        title: 'No unique insights beyond top-10 results',
        category: 'Author Expertise',
        promptTemplate:
          'Does the content include unique insights about "{{centralEntity}}" that are not easily found in the top-10 search results for "{{targetKeyword}}"? ' +
          'Look for original data, contrarian viewpoints, insider knowledge, or proprietary methodologies. ' +
          'Respond with { "passed": true/false, "details": "..." }.',
      },
      {
        ruleId: 'rule-24-ai',
        severity: 'low',
        title: 'Missing edge cases, caveats, or limitations',
        category: 'Author Expertise',
        promptTemplate:
          'Does the author demonstrate depth by discussing edge cases, caveats, or limitations related to "{{centralEntity}}"? ' +
          'Expert content typically addresses "when this does NOT work", "common pitfalls", or "exceptions to the rule". ' +
          'Respond with { "passed": true/false, "details": "..." }.',
      },

      // -------------------------------------------------------------------
      // EAV Explicitness (rules 34, 47)
      // -------------------------------------------------------------------
      {
        ruleId: 'rule-34-ai',
        severity: 'high',
        title: 'EAV triples not explicitly stated',
        category: 'EAV Explicitness',
        promptTemplate:
          'Are Entity-Attribute-Value triples explicitly stated in the content rather than merely implied? ' +
          'Each key fact about "{{centralEntity}}" should be a clear declarative statement (e.g., "X weighs 500g") ' +
          'rather than vague references. Respond with { "passed": true/false, "details": "..." }.',
      },
      {
        ruleId: 'rule-47-ai',
        severity: 'high',
        title: 'Missing EAV category coverage',
        category: 'EAV Explicitness',
        promptTemplate:
          'Does the content contain attributes from all required EAV categories: UNIQUE, ROOT, RARE, and COMMON? ' +
          'For "{{centralEntity}}", verify that the content covers differentiating (UNIQUE), foundational (ROOT), ' +
          'uncommon but valuable (RARE), and expected (COMMON) attributes. ' +
          'Respond with { "passed": true/false, "details": "..." }.',
      },

      // -------------------------------------------------------------------
      // Frame Semantics (rules 69, 72)
      // -------------------------------------------------------------------
      {
        ruleId: 'rule-69-ai',
        severity: 'medium',
        title: 'Inappropriate semantic frames for topic',
        category: 'Frame Semantics',
        promptTemplate:
          'Does the content use appropriate semantic frames for "{{centralEntity}}"? ' +
          'For example, commercial-intent content should use transaction frames (buy, price, compare), ' +
          'informational content should use explanation frames (because, how, why). ' +
          'Respond with { "passed": true/false, "details": "..." }.',
      },
      {
        ruleId: 'rule-72-ai',
        severity: 'low',
        title: 'Generic predicates used instead of domain-specific verbs',
        category: 'Frame Semantics',
        promptTemplate:
          'Are predicates specific enough? Check whether the content overuses generic verbs like "has", "is", "does", "makes" ' +
          'when domain-specific verbs exist for "{{centralEntity}}". ' +
          'For example, prefer "catalyzes" over "causes", "renders" over "makes". ' +
          'Respond with { "passed": true/false, "details": "..." }.',
      },

      // -------------------------------------------------------------------
      // Featured Snippet Optimization (rules 225, 226, 228)
      // -------------------------------------------------------------------
      {
        ruleId: 'rule-225-ai',
        severity: 'high',
        title: 'No featured snippet candidate paragraph',
        category: 'Featured Snippet Optimization',
        promptTemplate:
          'Is there a 40-60 word direct answer paragraph that could be extracted as a Google featured snippet for "{{targetKeyword}}"? ' +
          'The paragraph should begin with a definition or direct answer pattern. ' +
          'Respond with { "passed": true/false, "details": "..." }.',
        fallbackCheck: (input: AiRuleInput): AiRuleIssue | null => {
          const definitionPattern =
            /^([\w\s]+(?:is|are|refers to|means|describes|represents|involves)\s)/im;
          const candidates = countWordParagraphs(input.text, 40, 60);
          const hasDefinition = candidates.some((p) =>
            definitionPattern.test(p),
          );
          if (!hasDefinition) {
            return {
              ruleId: 'rule-225-ai',
              severity: 'high',
              title: 'No featured snippet candidate paragraph',
              description:
                'No paragraph of 40-60 words starting with a definition pattern was found. ' +
                'A concise direct-answer paragraph improves featured snippet eligibility.',
              exampleFix:
                'Add a 40-60 word paragraph that starts with "[Topic] is..." or "[Topic] refers to...".',
            };
          }
          return null;
        },
      },
      {
        ruleId: 'rule-226-ai',
        severity: 'medium',
        title: 'How-to query missing numbered steps',
        category: 'Featured Snippet Optimization',
        promptTemplate:
          'For "how-to" queries about "{{targetKeyword}}", is there a numbered step list (at least 3 steps) ' +
          'that Google could extract as a featured snippet? ' +
          'Respond with { "passed": true/false, "details": "..." }.',
        fallbackCheck: (input: AiRuleInput): AiRuleIssue | null => {
          const isHowTo = /\bhow\s+to\b/i.test(
            input.targetKeyword ?? input.text,
          );
          if (!isHowTo) return null;

          const olPattern = /<ol\b[^>]*>([\s\S]*?)<\/ol>/i;
          const olMatch = input.text.match(olPattern);
          if (!olMatch) {
            return {
              ruleId: 'rule-226-ai',
              severity: 'medium',
              title: 'How-to query missing numbered steps',
              description:
                'Content targets a how-to query but contains no ordered list (<ol>). ' +
                'Numbered step lists are essential for how-to featured snippets.',
              exampleFix:
                'Add an <ol> with at least 3 numbered steps for the how-to process.',
            };
          }
          const items = olMatch[1].match(/<li\b/gi) || [];
          if (items.length < 3) {
            return {
              ruleId: 'rule-226-ai',
              severity: 'medium',
              title: 'How-to query missing numbered steps',
              description: `Ordered list has only ${items.length} item(s). At least 3 steps are needed for a featured snippet.`,
              exampleFix:
                'Expand the step list to include at least 3 distinct steps.',
            };
          }
          return null;
        },
      },
      {
        ruleId: 'rule-228-ai',
        severity: 'medium',
        title: 'Comparison query missing comparison table',
        category: 'Featured Snippet Optimization',
        promptTemplate:
          'For comparison queries about "{{targetKeyword}}", is there a well-structured comparison table ' +
          'that Google could feature? The table should have headers and at least two comparable items. ' +
          'Respond with { "passed": true/false, "details": "..." }.',
      },

      // -------------------------------------------------------------------
      // Related Content Relevance (rule 230)
      // -------------------------------------------------------------------
      {
        ruleId: 'rule-230-ai',
        severity: 'low',
        title: 'Related articles section has irrelevant suggestions',
        category: 'Related Content Relevance',
        promptTemplate:
          'If a "related articles" or "further reading" section exists in the content, are the suggested articles ' +
          'semantically relevant to the current topic "{{centralEntity}}"? ' +
          'Irrelevant suggestions waste link equity and confuse topical signals. ' +
          'Respond with { "passed": true/false, "details": "..." }.',
      },
    ];
  }
}
