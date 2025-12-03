// services/ai/contentGeneration/passes/auditChecks.test.ts
import { describe, it, expect } from 'vitest';
import { runAlgorithmicAudit } from './auditChecks';
import { ContentBrief, BusinessInfo } from '../../../../types';

// Helper to create minimal test fixtures
const createMockBrief = (overrides: Partial<ContentBrief> = {}): ContentBrief => ({
  title: 'Test Article Title',
  metaDescription: 'Test meta description',
  outline: '## Introduction\n## Section 1',
  keyTakeaways: ['Takeaway 1'],
  targetWordCount: 1500,
  ...overrides
} as ContentBrief);

const createMockBusinessInfo = (overrides: Partial<BusinessInfo> = {}): BusinessInfo => ({
  seedKeyword: 'test keyword',
  domain: 'example.com',
  projectName: 'Test Project',
  industry: 'Technology',
  model: 'B2B',
  valueProp: 'Test value',
  audience: 'Test audience',
  expertise: 'Expert',
  language: 'en',
  targetMarket: 'US',
  aiProvider: 'anthropic',
  aiModel: 'claude-3-sonnet',
  supabaseUrl: 'https://test.supabase.co',
  supabaseAnonKey: 'test-key',
  ...overrides
} as BusinessInfo);

describe('runAlgorithmicAudit', () => {
  it('returns array of audit results', () => {
    const draft = '## Introduction\n\nTest keyword is a concept that means something specific.';
    const brief = createMockBrief();
    const info = createMockBusinessInfo();

    const results = runAlgorithmicAudit(draft, brief, info);

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    results.forEach(r => {
      expect(r).toHaveProperty('ruleName');
      expect(r).toHaveProperty('isPassing');
      expect(r).toHaveProperty('details');
    });
  });
});

describe('checkLLMSignaturePhrases', () => {
  it('fails when draft contains LLM signature phrases', () => {
    const draft = `## Introduction

Overall, test keyword is important. It's important to note that this concept delves into many areas.
In conclusion, we have explored the world of test keywords.`;
    const brief = createMockBrief();
    const info = createMockBusinessInfo();

    const results = runAlgorithmicAudit(draft, brief, info);
    const llmCheck = results.find(r => r.ruleName === 'LLM Phrase Detection');

    expect(llmCheck).toBeDefined();
    expect(llmCheck?.isPassing).toBe(false);
    expect(llmCheck?.details).toContain('overall');
  });

  it('passes when draft has no LLM signature phrases', () => {
    const draft = `## Introduction

Test keyword represents a specific methodology. This approach provides measurable benefits.
The framework enables efficient implementation.`;
    const brief = createMockBrief();
    const info = createMockBusinessInfo();

    const results = runAlgorithmicAudit(draft, brief, info);
    const llmCheck = results.find(r => r.ruleName === 'LLM Phrase Detection');

    expect(llmCheck).toBeDefined();
    expect(llmCheck?.isPassing).toBe(true);
  });
});

describe('checkPredicateConsistency', () => {
  it('fails when H1 uses negative predicates but H2s use positive', () => {
    const draft = `## Risks of Test Keyword

Test keyword has some concerns.

## Benefits of Test Keyword

Here are the advantages.

## Advantages of Test Keyword

More positive aspects.`;
    const brief = createMockBrief({ title: 'Risks of Test Keyword' });
    const info = createMockBusinessInfo();

    const results = runAlgorithmicAudit(draft, brief, info);
    const predicateCheck = results.find(r => r.ruleName === 'Predicate Consistency');

    expect(predicateCheck).toBeDefined();
    expect(predicateCheck?.isPassing).toBe(false);
  });

  it('passes when heading predicates are consistent', () => {
    const draft = `## Benefits of Test Keyword

Test keyword provides many advantages.

## Advantages of Test Keyword

Additional positive aspects.

## Improvements from Test Keyword

Enhanced outcomes.`;
    const brief = createMockBrief({ title: 'Benefits of Test Keyword' });
    const info = createMockBusinessInfo();

    const results = runAlgorithmicAudit(draft, brief, info);
    const predicateCheck = results.find(r => r.ruleName === 'Predicate Consistency');

    expect(predicateCheck).toBeDefined();
    expect(predicateCheck?.isPassing).toBe(true);
  });

  it('passes for instructional content with how-to headings', () => {
    const draft = `## How to Use Test Keyword

Follow these steps.

## Steps for Test Keyword

The process involves.

## Guide to Test Keyword Implementation

Implementation details.`;
    const brief = createMockBrief({ title: 'How to Use Test Keyword' });
    const info = createMockBusinessInfo();

    const results = runAlgorithmicAudit(draft, brief, info);
    const predicateCheck = results.find(r => r.ruleName === 'Predicate Consistency');

    expect(predicateCheck).toBeDefined();
    expect(predicateCheck?.isPassing).toBe(true);
  });
});

describe('checkCoverageWeight', () => {
  it('fails when minor section exceeds 50% of content', () => {
    const draft = `## Introduction

Short intro about test keyword.

## Main Topic

Brief main content.

## Appendix Notes

${'This is appendix content that goes on and on. '.repeat(50)}
More appendix details that dominate the article.
${'Additional appendix text filling up space. '.repeat(30)}`;
    const brief = createMockBrief();
    const info = createMockBusinessInfo();

    const results = runAlgorithmicAudit(draft, brief, info);
    const coverageCheck = results.find(r => r.ruleName === 'Content Coverage Weight');

    expect(coverageCheck).toBeDefined();
    expect(coverageCheck?.isPassing).toBe(false);
  });

  it('passes when content is well-balanced', () => {
    const draft = `## Introduction

${'Introduction content with good detail about test keyword. '.repeat(10)}

## Main Topic

${'Main content providing substantial value about the topic. '.repeat(15)}

## Secondary Topic

${'Secondary content with reasonable detail. '.repeat(12)}

## Conclusion

${'Conclusion wrapping up the main points effectively. '.repeat(8)}`;
    const brief = createMockBrief();
    const info = createMockBusinessInfo();

    const results = runAlgorithmicAudit(draft, brief, info);
    const coverageCheck = results.find(r => r.ruleName === 'Content Coverage Weight');

    expect(coverageCheck).toBeDefined();
    expect(coverageCheck?.isPassing).toBe(true);
  });
});
