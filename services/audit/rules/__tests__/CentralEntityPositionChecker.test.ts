import { describe, it, expect } from 'vitest';
import { CentralEntityPositionChecker } from '../CentralEntityPositionChecker';

describe('CentralEntityPositionChecker', () => {
  const checker = new CentralEntityPositionChecker();

  // ---------------------------------------------------------------------------
  // Rule 4 — CE in first 2 sentences
  // ---------------------------------------------------------------------------

  it('detects CE missing from first 2 sentences (rule 4)', () => {
    const issues = checker.validate({
      text: 'This is the first sentence. And the second sentence. React hooks are mentioned later.',
      centralEntity: 'React hooks',
    });
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-4' }));
  });

  it('passes when CE in first sentence (rule 4)', () => {
    const issues = checker.validate({
      text: 'React hooks are a powerful feature. They enable functional components.',
      centralEntity: 'React hooks',
    });
    expect(issues.find((i) => i.ruleId === 'rule-4')).toBeUndefined();
  });

  it('passes when CE in second sentence (rule 4)', () => {
    const issues = checker.validate({
      text: 'Modern development has evolved. React hooks changed everything.',
      centralEntity: 'React hooks',
    });
    expect(issues.find((i) => i.ruleId === 'rule-4')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Rule 5 — CE in first sentence
  // ---------------------------------------------------------------------------

  it('detects CE missing from first sentence (rule 5)', () => {
    const issues = checker.validate({
      text: 'Modern development has evolved. React hooks changed everything.',
      centralEntity: 'React hooks',
    });
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-5' }));
  });

  it('passes when CE in first sentence (rule 5)', () => {
    const issues = checker.validate({
      text: 'React hooks are a powerful feature. They enable functional components.',
      centralEntity: 'React hooks',
    });
    expect(issues.find((i) => i.ruleId === 'rule-5')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Rule 7 — Source Context attribute coverage
  // ---------------------------------------------------------------------------

  it('detects low SC attribute coverage (rule 7)', () => {
    const issues = checker.validate({
      text: 'React hooks are useful for building apps.',
      centralEntity: 'React hooks',
      sourceContextAttributes: ['performance', 'scalability', 'maintainability', 'testing'],
    });
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-7' }));
  });

  it('passes when SC attribute coverage is sufficient', () => {
    const issues = checker.validate({
      text: 'React hooks improve performance and scalability. They also help with maintainability.',
      centralEntity: 'React hooks',
      sourceContextAttributes: ['performance', 'scalability', 'maintainability', 'testing'],
    });
    // 3/4 = 75% >= 50%
    expect(issues.find((i) => i.ruleId === 'rule-7')).toBeUndefined();
  });

  it('skips SC check when no attributes provided', () => {
    const issues = checker.validate({
      text: 'React hooks are useful.',
      centralEntity: 'React hooks',
    });
    expect(issues.find((i) => i.ruleId === 'rule-7')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Rule 8 — CS/AS classification signals
  // ---------------------------------------------------------------------------

  it('detects missing CS/AS classification signals (rule 8)', () => {
    const issues = checker.validate({
      text: 'React hooks are useful for building apps. They simplify components.',
      centralEntity: 'React hooks',
    });
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-8' }));
  });

  it('passes when general overview signal present', () => {
    const issues = checker.validate({
      text: 'React hooks provide an overview of state management. They simplify components.',
      centralEntity: 'React hooks',
    });
    expect(issues.find((i) => i.ruleId === 'rule-8')).toBeUndefined();
  });

  it('passes when specific detail signal present', () => {
    const issues = checker.validate({
      text: 'React hooks offer 50% performance improvement for functional components.',
      centralEntity: 'React hooks',
    });
    expect(issues.find((i) => i.ruleId === 'rule-8')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Rule 11 — CSI predicate coverage
  // ---------------------------------------------------------------------------

  it('detects low CSI predicate coverage (rule 11)', () => {
    const issues = checker.validate({
      text: 'React hooks are modern.',
      centralEntity: 'React hooks',
      csiPredicates: ['useState', 'useEffect', 'useContext', 'useReducer', 'useMemo'],
    });
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-11' }));
  });

  it('passes when CSI predicate coverage is sufficient', () => {
    const issues = checker.validate({
      text: 'React hooks include useState, useEffect, and useContext for state management.',
      centralEntity: 'React hooks',
      csiPredicates: ['useState', 'useEffect', 'useContext', 'useReducer', 'useMemo'],
    });
    // 3/5 = 60% >= 30%
    expect(issues.find((i) => i.ruleId === 'rule-11')).toBeUndefined();
  });

  it('skips CSI check when no predicates provided', () => {
    const issues = checker.validate({
      text: 'React hooks are modern.',
      centralEntity: 'React hooks',
    });
    expect(issues.find((i) => i.ruleId === 'rule-11')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Fully passing content — no issues
  // ---------------------------------------------------------------------------

  it('passes well-structured content', () => {
    const issues = checker.validate({
      text: 'React hooks provide an overview of state management. They offer 50% performance improvement for functional components. UseState and useEffect are core.',
      centralEntity: 'React hooks',
      sourceContextAttributes: ['state management', 'performance'],
      csiPredicates: ['useState', 'useEffect'],
    });
    expect(issues).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  it('handles empty text gracefully', () => {
    const issues = checker.validate({
      text: '',
      centralEntity: 'React hooks',
    });
    // Should detect CE missing from first sentences
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-4' }));
  });

  it('is case-insensitive for CE matching', () => {
    const issues = checker.validate({
      text: 'REACT HOOKS are a powerful feature. They enable components.',
      centralEntity: 'React hooks',
    });
    expect(issues.find((i) => i.ruleId === 'rule-4')).toBeUndefined();
    expect(issues.find((i) => i.ruleId === 'rule-5')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // splitSentences helper
  // ---------------------------------------------------------------------------

  it('splits sentences correctly', () => {
    const sentences = checker.splitSentences('First sentence. Second sentence! Third? Fourth.');
    expect(sentences).toEqual([
      'First sentence.',
      'Second sentence!',
      'Third?',
      'Fourth.',
    ]);
  });

  it('handles single sentence', () => {
    const sentences = checker.splitSentences('Only one sentence.');
    expect(sentences).toEqual(['Only one sentence.']);
  });
});
