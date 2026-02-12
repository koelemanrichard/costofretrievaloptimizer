import { describe, it, expect } from 'vitest';
import { InformationDensityValidator } from '../InformationDensityValidator';

describe('InformationDensityValidator', () => {
  const validator = new InformationDensityValidator();

  // -------------------------------------------------------------------------
  // Rule 94 — Redundant repetition
  // -------------------------------------------------------------------------

  it('detects redundant repetition (rule 94)', () => {
    const text =
      'React hooks manage state in components.\n\nReact hooks handle state management in functional components.\n\nOther paragraph here.';
    const issues = validator.validate(text);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-94' })
    );
  });

  it('passes non-redundant content', () => {
    const text =
      'React hooks enable state management.\n\nTypeScript provides type safety for large codebases.\n\nTesting ensures code reliability.';
    const issues = validator.validate(text);
    expect(issues.find((i) => i.ruleId === 'rule-94')).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Rule 95 — Filler paragraphs
  // -------------------------------------------------------------------------

  it('detects filler paragraphs (rule 95)', () => {
    const text =
      "React hooks are useful.\n\nIn today's world, it goes without saying that technology evolves.\n\nMore content here.";
    const issues = validator.validate(text);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-95' })
    );
  });

  // -------------------------------------------------------------------------
  // Rule 96 — Vague statements
  // -------------------------------------------------------------------------

  it('detects vague statements (rule 96)', () => {
    const words =
      'Many experts believe that some users typically experience various benefits when using this tool. ' +
      'Generally, several studies show that numerous people often find it extremely useful for daily tasks. ' +
      'Usually, various sources confirm that really many experts think it is very important to adopt early. ' +
      'Some people believe several studies generally show typically good results with various extremely significant benefits. ' +
      'It is believed that many users sometimes find the platform really helpful for various projects. ' +
      'Numerous experts say that often the results are incredibly positive and totally worth the investment. ' +
      'Several sources typically recommend this approach as it usually leads to very good outcomes for many teams.';
    const issues = validator.validate(words);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-96' })
    );
  });

  it('passes specific statements', () => {
    const text =
      'React hooks reduce boilerplate by 40% compared to class components. The useState hook manages local state with a 2-element tuple return. Performance benchmarks show 15ms render times.';
    const issues = validator.validate(text);
    expect(issues.find((i) => i.ruleId === 'rule-96')).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Rule 98 — Preamble detection
  // -------------------------------------------------------------------------

  it('detects preamble (rule 98)', () => {
    const text =
      'In this article, we will explore React hooks and their benefits for modern development.';
    const issues = validator.validate(text);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-98' })
    );
  });

  it('passes direct answer opening', () => {
    const text =
      'React hooks are functions that let you use state and lifecycle features in functional components.';
    const issues = validator.validate(text);
    expect(issues.find((i) => i.ruleId === 'rule-98')).toBeUndefined();
  });
});
