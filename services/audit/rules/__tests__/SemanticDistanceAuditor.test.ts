import { describe, it, expect } from 'vitest';
import {
  SemanticDistanceAuditor,
  type SemanticDistanceInput,
} from '../SemanticDistanceAuditor';

describe('SemanticDistanceAuditor', () => {
  const auditor = new SemanticDistanceAuditor();

  // ---------------------------------------------------------------------------
  // Pre-computed distances — cannibalization detected
  // ---------------------------------------------------------------------------

  it('flags cannibalization when precomputed distance < 0.2', () => {
    const input: SemanticDistanceInput = {
      pageTopic: 'best running shoes for beginners',
      otherPages: [],
      precomputedDistances: [
        {
          url: '/running-shoes-beginners-guide',
          topic: 'running shoes for beginners guide',
          distance: 0.12,
        },
      ],
    };

    const issues = auditor.validate(input);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      ruleId: 'rule-203',
      severity: 'high',
      title: 'Keyword cannibalization risk',
    });
    expect(issues[0].description).toContain('0.12');
    expect(issues[0].affectedElement).toBe('/running-shoes-beginners-guide');
  });

  // ---------------------------------------------------------------------------
  // Pre-computed distances — potential overlap (medium severity)
  // ---------------------------------------------------------------------------

  it('flags potential overlap when precomputed distance is between 0.2 and 0.3', () => {
    const input: SemanticDistanceInput = {
      pageTopic: 'React state management patterns',
      otherPages: [],
      precomputedDistances: [
        {
          url: '/react-hooks-state',
          topic: 'React hooks for state',
          distance: 0.25,
        },
      ],
    };

    const issues = auditor.validate(input);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      ruleId: 'rule-203',
      severity: 'medium',
      title: 'Potential topic overlap',
    });
    expect(issues[0].description).toContain('0.25');
  });

  // ---------------------------------------------------------------------------
  // Pre-computed distances — no issues
  // ---------------------------------------------------------------------------

  it('returns no issues when precomputed distances are above 0.3', () => {
    const input: SemanticDistanceInput = {
      pageTopic: 'GraphQL API design',
      otherPages: [],
      precomputedDistances: [
        {
          url: '/rest-api-best-practices',
          topic: 'REST API best practices',
          distance: 0.65,
        },
        {
          url: '/database-indexing',
          topic: 'Database indexing strategies',
          distance: 0.85,
        },
      ],
    };

    const issues = auditor.validate(input);
    expect(issues).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Word-overlap fallback — similar topics (cannibalization)
  // ---------------------------------------------------------------------------

  it('detects cannibalization via word-overlap for near-identical topics', () => {
    const input: SemanticDistanceInput = {
      pageTopic: 'best running shoes for beginners',
      otherPages: [
        {
          url: '/running-shoes-beginners',
          topic: 'best running shoes for beginners guide',
        },
      ],
    };

    const issues = auditor.validate(input);
    expect(issues.length).toBeGreaterThanOrEqual(1);
    // Should flag as high severity cannibalization — these topics share almost all words
    const highSeverity = issues.filter((i) => i.severity === 'high');
    expect(highSeverity.length).toBeGreaterThanOrEqual(1);
    expect(highSeverity[0].ruleId).toBe('rule-203');
  });

  // ---------------------------------------------------------------------------
  // Word-overlap fallback — different topics (no issues)
  // ---------------------------------------------------------------------------

  it('returns no issues via word-overlap for clearly different topics', () => {
    const input: SemanticDistanceInput = {
      pageTopic: 'best running shoes for beginners',
      otherPages: [
        {
          url: '/python-machine-learning-tutorial',
          topic: 'Python machine learning tutorial advanced',
        },
      ],
    };

    const issues = auditor.validate(input);
    expect(issues).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Edge case: empty other pages
  // ---------------------------------------------------------------------------

  it('returns empty array when no other pages provided', () => {
    const input: SemanticDistanceInput = {
      pageTopic: 'React hooks tutorial',
      otherPages: [],
    };

    const issues = auditor.validate(input);
    expect(issues).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Edge case: empty page topic
  // ---------------------------------------------------------------------------

  it('returns empty array when pageTopic is empty', () => {
    const input: SemanticDistanceInput = {
      pageTopic: '',
      otherPages: [
        { url: '/some-page', topic: 'some topic' },
      ],
    };

    const issues = auditor.validate(input);
    expect(issues).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Edge case: identical topics
  // ---------------------------------------------------------------------------

  it('flags identical topics as cannibalization (distance = 0)', () => {
    const input: SemanticDistanceInput = {
      pageTopic: 'kubernetes deployment strategies',
      otherPages: [
        {
          url: '/k8s-deployment',
          topic: 'kubernetes deployment strategies',
        },
      ],
    };

    const issues = auditor.validate(input);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      ruleId: 'rule-203',
      severity: 'high',
      title: 'Keyword cannibalization risk',
    });
  });

  // ---------------------------------------------------------------------------
  // Multiple pages: mixed distances
  // ---------------------------------------------------------------------------

  it('handles multiple pages with mixed distances correctly', () => {
    const input: SemanticDistanceInput = {
      pageTopic: 'SEO content optimization',
      otherPages: [],
      precomputedDistances: [
        {
          url: '/seo-content-strategy',
          topic: 'SEO content strategy',
          distance: 0.15, // cannibalization
        },
        {
          url: '/seo-link-building',
          topic: 'SEO link building techniques',
          distance: 0.25, // overlap
        },
        {
          url: '/email-marketing',
          topic: 'Email marketing automation',
          distance: 0.80, // safe
        },
      ],
    };

    const issues = auditor.validate(input);
    expect(issues).toHaveLength(2);

    const highIssues = issues.filter((i) => i.severity === 'high');
    const mediumIssues = issues.filter((i) => i.severity === 'medium');

    expect(highIssues).toHaveLength(1);
    expect(highIssues[0].affectedElement).toBe('/seo-content-strategy');

    expect(mediumIssues).toHaveLength(1);
    expect(mediumIssues[0].affectedElement).toBe('/seo-link-building');
  });

  // ---------------------------------------------------------------------------
  // Boundary values
  // ---------------------------------------------------------------------------

  it('treats distance exactly at 0.2 as overlap (not cannibalization)', () => {
    const input: SemanticDistanceInput = {
      pageTopic: 'boundary test',
      otherPages: [],
      precomputedDistances: [
        { url: '/boundary-page', topic: 'boundary topic', distance: 0.2 },
      ],
    };

    const issues = auditor.validate(input);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('medium');
  });

  it('treats distance exactly at 0.3 as safe (no issue)', () => {
    const input: SemanticDistanceInput = {
      pageTopic: 'boundary test',
      otherPages: [],
      precomputedDistances: [
        { url: '/boundary-page', topic: 'boundary topic', distance: 0.3 },
      ],
    };

    const issues = auditor.validate(input);
    expect(issues).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Jaccard similarity helper — unit tests
  // ---------------------------------------------------------------------------

  it('computes Jaccard similarity correctly', () => {
    const setA = new Set(['react', 'hooks', 'state']);
    const setB = new Set(['react', 'hooks', 'tutorial']);

    // intersection = {react, hooks} = 2, union = {react, hooks, state, tutorial} = 4
    expect(auditor.jaccardSimilarity(setA, setB)).toBeCloseTo(0.5);
  });

  it('returns 0 for Jaccard similarity of two empty sets', () => {
    expect(auditor.jaccardSimilarity(new Set(), new Set())).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // Stop word filtering
  // ---------------------------------------------------------------------------

  it('filters stop words when extracting significant words', () => {
    const words = auditor.getSignificantWords(
      'the best running shoes for beginners in the world'
    );
    expect(words).not.toContain('the');
    expect(words).not.toContain('for');
    expect(words).not.toContain('in');
    expect(words).toContain('best');
    expect(words).toContain('running');
    expect(words).toContain('shoes');
    expect(words).toContain('beginners');
    expect(words).toContain('world');
  });
});
