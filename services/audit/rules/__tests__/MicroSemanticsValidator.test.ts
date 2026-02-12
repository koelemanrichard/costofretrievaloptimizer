import { describe, it, expect } from 'vitest';
import { MicroSemanticsValidator } from '../MicroSemanticsValidator';

describe('MicroSemanticsValidator', () => {
  const validator = new MicroSemanticsValidator();

  // ---------------------------------------------------------------------------
  // Rule 57 — Mixed modality
  // ---------------------------------------------------------------------------

  it('detects mixed modality (rule 57)', () => {
    const text = Array(8).fill('The product is great but it could also might be useful in certain cases.').join(' ');
    const issues = validator.validate(text);
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-57' }));
  });

  // ---------------------------------------------------------------------------
  // Rule 58 — Excessive hedging
  // ---------------------------------------------------------------------------

  it('detects excessive hedging (rule 58)', () => {
    const sentences = [
      'Products could improve your workflow.',
      'Tools might help with efficiency.',
      'Solutions could potentially reduce costs.',
      'Features may offer better performance.',
      'Options could provide more flexibility.',
      'Services might enhance productivity.',
    ];
    const issues = validator.validate(sentences.join(' '));
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-58' }));
  });

  it('passes clear factual modality', () => {
    const text = 'React hooks are powerful. They enable state management. Components render efficiently. The API is well-designed. Performance is excellent. Documentation is comprehensive.';
    const issues = validator.validate(text);
    expect(issues.find(i => i.ruleId === 'rule-57')).toBeUndefined();
    expect(issues.find(i => i.ruleId === 'rule-58')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Rule 61 — Predicate specificity
  // ---------------------------------------------------------------------------

  it('detects vague predicates (rule 61)', () => {
    const text = 'You can do the thing to make stuff happen. Then get the output and do more with it. Users do things and make progress. They get results when they do the work. Developers make and do stuff daily. Teams get things done quickly.';
    const issues = validator.validate(text);
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-61' }));
  });

  it('passes specific predicates', () => {
    const text = 'React hooks transform component architecture. useState manages local state. useEffect orchestrates side effects. useContext propagates shared data. useMemo optimizes computations. useCallback memoizes functions.';
    const issues = validator.validate(text);
    expect(issues.find(i => i.ruleId === 'rule-61')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Rule 73 — SPO sentence structure
  // ---------------------------------------------------------------------------

  it('detects weak sentence starters (rule 73)', () => {
    const text = 'There are many options. It is important to note. There is a possibility. It was designed well. This is about performance. There are several features available. It is recommended to use the latest version.';
    const issues = validator.validate(text);
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-73' }));
  });

  it('passes SPO sentence structure', () => {
    const text = 'React hooks enable state management. Developers write cleaner code. Components render faster. The API simplifies complex logic. Performance improves significantly. Users benefit directly.';
    const issues = validator.validate(text);
    expect(issues.find(i => i.ruleId === 'rule-73')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  it('returns no issues for empty text', () => {
    const issues = validator.validate('');
    expect(issues).toHaveLength(0);
  });

  it('returns no issues for short text (under threshold)', () => {
    const text = 'This is short. Only two sentences here.';
    const issues = validator.validate(text);
    expect(issues).toHaveLength(0);
  });
});
