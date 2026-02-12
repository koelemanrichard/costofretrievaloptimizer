import { describe, it, expect, vi } from 'vitest';
import {
  AiAssistedRuleEngine,
  type AiEvaluator,
  type AiRuleInput,
} from '../AiAssistedRuleEngine';

describe('AiAssistedRuleEngine', () => {
  const engine = new AiAssistedRuleEngine();

  // -----------------------------------------------------------------------
  // Rule definitions
  // -----------------------------------------------------------------------

  it('getRuleDefinitions returns all 14 rules', () => {
    const defs = engine.getRuleDefinitions();
    expect(defs.length).toBe(14);
  });

  it('every rule has ruleId, severity, title, category, promptTemplate', () => {
    for (const rule of engine.getRuleDefinitions()) {
      expect(rule.ruleId).toBeTruthy();
      expect(rule.severity).toMatch(/^(critical|high|medium|low)$/);
      expect(rule.title).toBeTruthy();
      expect(rule.category).toBeTruthy();
      expect(rule.promptTemplate).toBeTruthy();
    }
  });

  it('rule IDs are unique', () => {
    const ids = engine.getRuleDefinitions().map((r) => r.ruleId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('getRuleDefinitions returns a copy (not the internal array)', () => {
    const defs1 = engine.getRuleDefinitions();
    const defs2 = engine.getRuleDefinitions();
    expect(defs1).not.toBe(defs2);
    expect(defs1).toEqual(defs2);
  });

  // -----------------------------------------------------------------------
  // Fallback checks (no AI needed)
  // -----------------------------------------------------------------------

  it('fallback: rule-21-ai detects missing first-person pronouns', () => {
    const input: AiRuleInput = {
      text: 'The product delivers excellent performance. Users report high satisfaction with the results.',
    };
    const issues = engine.validateFallback(input);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-21-ai' }),
    );
  });

  it('fallback: rule-21-ai passes when first-person pronouns present', () => {
    const input: AiRuleInput = {
      text: 'I tested this product extensively. We found that it performs well under load.',
    };
    const issues = engine.validateFallback(input);
    expect(issues.find((i) => i.ruleId === 'rule-21-ai')).toBeUndefined();
  });

  it('fallback: rule-22-ai detects missing specific examples', () => {
    const input: AiRuleInput = {
      text: 'this tool is good and helps people do things faster and better in many ways',
    };
    const issues = engine.validateFallback(input);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-22-ai' }),
    );
  });

  it('fallback: rule-22-ai passes when code blocks or numbers present', () => {
    const input: AiRuleInput = {
      text: 'Performance improved by 42% after applying the optimization. ```const x = 1;```',
    };
    const issues = engine.validateFallback(input);
    expect(issues.find((i) => i.ruleId === 'rule-22-ai')).toBeUndefined();
  });

  it('fallback: rule-225-ai detects missing featured snippet paragraph', () => {
    const input: AiRuleInput = {
      text: 'Short intro. Another short sentence.',
    };
    const issues = engine.validateFallback(input);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-225-ai' }),
    );
  });

  it('fallback: rule-225-ai passes when a definition paragraph of 40-60 words exists', () => {
    // Build a paragraph of ~50 words starting with a definition pattern
    const paragraph =
      'Topical authority is a measure of how comprehensively a website covers a specific subject area. ' +
      'It is determined by the depth and breadth of content, the quality of internal linking, ' +
      'and the semantic relationships between pages. Sites with high topical authority rank better for related queries.';
    const input: AiRuleInput = { text: paragraph };
    const issues = engine.validateFallback(input);
    expect(issues.find((i) => i.ruleId === 'rule-225-ai')).toBeUndefined();
  });

  it('fallback: rule-226-ai detects missing ordered list for how-to query', () => {
    const input: AiRuleInput = {
      text: 'First you do this, then you do that, finally you finish.',
      targetKeyword: 'how to bake a cake',
    };
    const issues = engine.validateFallback(input);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-226-ai' }),
    );
  });

  it('fallback: rule-226-ai passes when ordered list has 3+ items for how-to', () => {
    const input: AiRuleInput = {
      text: '<ol><li>Step one</li><li>Step two</li><li>Step three</li></ol>',
      targetKeyword: 'how to bake a cake',
    };
    const issues = engine.validateFallback(input);
    expect(issues.find((i) => i.ruleId === 'rule-226-ai')).toBeUndefined();
  });

  it('fallback: rule-226-ai skips non-how-to queries', () => {
    const input: AiRuleInput = {
      text: 'Some content without lists.',
      targetKeyword: 'best laptops 2024',
    };
    const issues = engine.validateFallback(input);
    expect(issues.find((i) => i.ruleId === 'rule-226-ai')).toBeUndefined();
  });

  // -----------------------------------------------------------------------
  // AI evaluator integration
  // -----------------------------------------------------------------------

  it('validate calls evaluator for each rule and collects failures', async () => {
    const evaluator: AiEvaluator = vi.fn().mockResolvedValue({
      passed: false,
      details: 'Content does not meet criteria.',
    });

    const input: AiRuleInput = {
      text: 'Sample content',
      centralEntity: 'Widget X',
    };
    const issues = await engine.validate(input, evaluator);

    // All 14 rules should produce issues since evaluator always returns failed
    expect(issues.length).toBe(14);
    expect(evaluator).toHaveBeenCalledTimes(14);
    for (const issue of issues) {
      expect(issue.description).toBe('Content does not meet criteria.');
    }
  });

  it('validate returns no issues when all rules pass', async () => {
    const evaluator: AiEvaluator = vi.fn().mockResolvedValue({
      passed: true,
      details: 'Looks good.',
    });

    const input: AiRuleInput = { text: 'Excellent content.' };
    const issues = await engine.validate(input, evaluator);
    expect(issues.length).toBe(0);
  });

  it('validate falls back to heuristic when evaluator throws', async () => {
    const evaluator: AiEvaluator = vi
      .fn()
      .mockRejectedValue(new Error('API down'));

    // Text without first-person pronouns triggers rule-21-ai fallback
    const input: AiRuleInput = {
      text: 'The product has many features that benefit users.',
    };
    const issues = await engine.validate(input, evaluator);

    // Should have at least the fallback issues (rules with fallbackCheck that fire)
    const fallbackRuleIds = issues.map((i) => i.ruleId);
    expect(fallbackRuleIds).toContain('rule-21-ai');
  });

  it('validate includes correct ruleId and severity from definitions', async () => {
    const evaluator: AiEvaluator = vi.fn().mockResolvedValue({
      passed: false,
      details: 'Failed check.',
    });

    const input: AiRuleInput = { text: 'Content' };
    const issues = await engine.validate(input, evaluator);

    const rule7 = issues.find((i) => i.ruleId === 'rule-7-ai');
    expect(rule7).toBeDefined();
    expect(rule7!.severity).toBe('high');
    expect(rule7!.title).toBe('SC attributes not prioritized for Central Entity');

    const rule72 = issues.find((i) => i.ruleId === 'rule-72-ai');
    expect(rule72).toBeDefined();
    expect(rule72!.severity).toBe('low');
  });
});
