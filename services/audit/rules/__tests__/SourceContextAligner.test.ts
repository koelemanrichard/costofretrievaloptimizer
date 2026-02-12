import { describe, it, expect } from 'vitest';
import { SourceContextAligner } from '../SourceContextAligner';

const defaultContext = {
  businessName: 'TechCo',
  industry: 'software development',
  targetAudience: 'developers',
  coreServices: ['web development', 'cloud consulting'],
  uniqueSellingPoints: ['open source', 'enterprise support'],
};

const defaultSpec = {
  centralEntity: 'React hooks',
  pillarTopic: 'React development',
  targetKeywords: ['useEffect', 'useState', 'custom hooks', 'React performance'],
  requiredAttributes: ['lifecycle', 'state management', 'side effects', 'memoization'],
};

describe('SourceContextAligner', () => {
  const aligner = new SourceContextAligner();

  // -------------------------------------------------------------------------
  // Rule 6-CE — Central entity presence
  // -------------------------------------------------------------------------

  it('detects missing central entity', () => {
    const issues = aligner.validate(
      'This article discusses web development patterns and best practices for building apps.',
      defaultContext,
      defaultSpec
    );
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-6-ce' }));
  });

  it('passes when central entity present', () => {
    const issues = aligner.validate(
      'React hooks are a powerful feature for web development. UseEffect and useState are common.',
      defaultContext,
      defaultSpec
    );
    expect(issues.find(i => i.ruleId === 'rule-6-ce')).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Rule 6-Business — Business/industry alignment
  // -------------------------------------------------------------------------

  it('detects no business alignment', () => {
    const issues = aligner.validate(
      'React hooks are a great tool for building user interfaces.',
      { ...defaultContext, coreServices: ['plumbing', 'heating'], industry: 'construction' },
      defaultSpec
    );
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-6-business' }));
  });

  it('passes when industry is mentioned', () => {
    const issues = aligner.validate(
      'React hooks are essential in software development for building modern UIs.',
      defaultContext,
      defaultSpec
    );
    expect(issues.find(i => i.ruleId === 'rule-6-business')).toBeUndefined();
  });

  it('passes when a core service is mentioned', () => {
    const issues = aligner.validate(
      'React hooks simplify web development patterns and component logic.',
      defaultContext,
      defaultSpec
    );
    expect(issues.find(i => i.ruleId === 'rule-6-business')).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Rule 6-Keywords — Target keyword coverage
  // -------------------------------------------------------------------------

  it('detects low keyword coverage', () => {
    const issues = aligner.validate(
      'React hooks let you use state. This is about software development and web development.',
      defaultContext,
      { ...defaultSpec, targetKeywords: ['useEffect', 'useState', 'custom hooks', 'React performance', 'optimization', 'render cycle'] }
    );
    // Only "useState" appears -> 1/6 = ~17% < 50%
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-6-keywords' }));
  });

  it('passes when keyword coverage is sufficient', () => {
    const issues = aligner.validate(
      'React hooks use useEffect and useState. Custom hooks improve React performance in web development.',
      defaultContext,
      defaultSpec
    );
    // All 4 keywords present -> 100% >= 50%
    expect(issues.find(i => i.ruleId === 'rule-6-keywords')).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Rule 6-Attributes — Required attribute coverage
  // -------------------------------------------------------------------------

  it('detects low attribute coverage', () => {
    const issues = aligner.validate(
      'React hooks are a feature in software development for web development. They enable state management.',
      defaultContext,
      defaultSpec
    );
    // Only "state management" of 4 attributes = 25% < 30%
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-6-attributes' }));
  });

  it('passes when attribute coverage is sufficient', () => {
    const issues = aligner.validate(
      'React hooks handle lifecycle and state management. Side effects are managed with useEffect. Web development benefits.',
      defaultContext,
      defaultSpec
    );
    // "lifecycle", "state management", "side effects" = 3/4 = 75% >= 30%
    expect(issues.find(i => i.ruleId === 'rule-6-attributes')).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Fully aligned content — no issues
  // -------------------------------------------------------------------------

  it('passes fully aligned content', () => {
    const content = 'React hooks revolutionize web development at TechCo. ' +
      'useEffect handles side effects while useState manages state management. ' +
      'Custom hooks enable lifecycle control. React performance through memoization.';
    const issues = aligner.validate(content, defaultContext, defaultSpec);
    expect(issues).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------

  it('handles empty target keywords gracefully', () => {
    const issues = aligner.validate(
      'React hooks are great for web development.',
      defaultContext,
      { ...defaultSpec, targetKeywords: [] }
    );
    expect(issues.find(i => i.ruleId === 'rule-6-keywords')).toBeUndefined();
  });

  it('handles empty required attributes gracefully', () => {
    const issues = aligner.validate(
      'React hooks are great for web development.',
      defaultContext,
      { ...defaultSpec, requiredAttributes: [] }
    );
    expect(issues.find(i => i.ruleId === 'rule-6-attributes')).toBeUndefined();
  });

  it('is case-insensitive for central entity matching', () => {
    const issues = aligner.validate(
      'REACT HOOKS are powerful in web development.',
      defaultContext,
      defaultSpec
    );
    expect(issues.find(i => i.ruleId === 'rule-6-ce')).toBeUndefined();
  });
});
