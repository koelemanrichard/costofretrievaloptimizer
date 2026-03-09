import { describe, it, expect } from 'vitest';
import { reviewBriefQuality } from '../briefQualityReview';
import type { ContentBrief, EnrichedTopic, BusinessInfo, SEOPillars } from '../../../types';
import type { BriefSection } from '../../../types/content';

function makeTopic(overrides: Partial<EnrichedTopic> = {}): EnrichedTopic {
  return {
    id: 'test-1',
    map_id: 'map-1',
    parent_topic_id: null,
    title: 'Test Topic',
    slug: 'test-topic',
    description: 'A test topic',
    type: 'core',
    freshness: 'EVERGREEN' as any,
    ...overrides,
  };
}

function makeSection(overrides: Partial<BriefSection> = {}): BriefSection {
  return {
    heading: 'Test Section',
    level: 2,
    subordinate_text_hint: 'A concrete direct answer about the topic.',
    ...overrides,
  };
}

function makeBrief(overrides: Partial<ContentBrief> = {}): ContentBrief {
  return {
    title: 'Test Brief Title',
    slug: 'test-brief-title',
    metaDescription: 'A detailed meta description for the test brief that is long enough.',
    keyTakeaways: ['Takeaway one', 'Takeaway two', 'Takeaway three'],
    structured_outline: [
      makeSection({ heading: 'What Is Test Topic', level: 2 }),
      makeSection({ heading: 'Benefits of Test Topic', level: 2 }),
      makeSection({ heading: 'How to Use Test Topic', level: 2 }),
      makeSection({ heading: 'Test Topic vs Alternatives', level: 2 }),
      makeSection({ heading: 'Conclusion', level: 2 }),
    ],
    contextualBridge: {
      content: 'Bridge content connecting macro context to the article topic with sufficient length.',
      links: [
        { targetTopic: 'Related Topic A', anchorText: 'related topic a' },
        { targetTopic: 'Related Topic B', anchorText: 'related topic b' },
      ],
    },
    featured_snippet_target: {
      question: 'What is test topic?',
      target_type: 'PARAGRAPH',
    },
    ...overrides,
  } as ContentBrief;
}

const defaultBusinessInfo = {
  domain: 'example.com',
  projectName: 'Test Project',
  language: 'en',
  region: 'US',
  targetMarket: 'Global',
  industry: 'Technology',
  model: 'B2B SaaS',
  valueProp: 'Best testing framework',
  audience: 'Developers',
  expertise: 'Software engineering',
  seedKeyword: 'test topic',
} as BusinessInfo;

const defaultPillars: SEOPillars = {
  centralEntity: 'Test Topic',
  sourceContext: 'Software Development',
  centralSearchIntent: 'informational',
};

describe('briefQualityReview — Answer Capsules', () => {
  const topic = makeTopic();
  const allTopics = [
    topic,
    makeTopic({ id: 'rel-a', title: 'Related Topic A' }),
    makeTopic({ id: 'rel-b', title: 'Related Topic B' }),
  ];

  it('scores higher on formatCompliance when H2 sections have valid answer capsules', () => {
    const briefWithCapsules = makeBrief({
      structured_outline: [
        makeSection({
          heading: 'What Is Test Topic',
          level: 2,
          answer_capsule: { text_hint: 'A direct answer about what test topic is and why it matters.', target_length: 50 },
        }),
        makeSection({
          heading: 'Benefits of Test Topic',
          level: 2,
          answer_capsule: { text_hint: 'The key benefits include improved performance and reliability.', target_length: 45 },
        }),
        makeSection({
          heading: 'How to Use Test Topic',
          level: 2,
          answer_capsule: { text_hint: 'Follow these steps to implement test topic effectively.', target_length: 55 },
        }),
        makeSection({
          heading: 'Test Topic vs Alternatives',
          level: 2,
          answer_capsule: { text_hint: 'Test topic outperforms alternatives in speed and cost.', target_length: 60 },
        }),
        makeSection({
          heading: 'Conclusion',
          level: 2,
          answer_capsule: { text_hint: 'In summary test topic provides significant advantages.', target_length: 40 },
        }),
      ],
    });

    const briefWithoutCapsules = makeBrief();

    const reportWith = reviewBriefQuality(briefWithCapsules, topic, defaultBusinessInfo, defaultPillars, allTopics);
    const reportWithout = reviewBriefQuality(briefWithoutCapsules, topic, defaultBusinessInfo, defaultPillars, allTopics);

    expect(reportWith.componentScores.formatCompliance).toBeGreaterThan(
      reportWithout.componentScores.formatCompliance
    );
  });

  it('scores lower on formatCompliance when no H2 sections have answer capsules', () => {
    const briefWithoutCapsules = makeBrief();

    const report = reviewBriefQuality(briefWithoutCapsules, topic, defaultBusinessInfo, defaultPillars, allTopics);

    // Without capsules, the answer capsule check fails → 30% of formatCompliance is 0
    // With featured snippet passing (40%) and no website type (30%), max is 70
    expect(report.componentScores.formatCompliance).toBeLessThanOrEqual(70);
  });

  it('passes answer capsule check when at least half of H2 sections have valid capsules', () => {
    const briefPartialCapsules = makeBrief({
      structured_outline: [
        makeSection({
          heading: 'Section A',
          level: 2,
          answer_capsule: { text_hint: 'Direct answer for section A.', target_length: 50 },
        }),
        makeSection({
          heading: 'Section B',
          level: 2,
          answer_capsule: { text_hint: 'Direct answer for section B.', target_length: 45 },
        }),
        makeSection({
          heading: 'Section C',
          level: 2,
          answer_capsule: { text_hint: 'Direct answer for section C.', target_length: 60 },
        }),
        makeSection({ heading: 'Section D', level: 2 }),
        makeSection({ heading: 'Section E', level: 2 }),
      ],
    });

    const report = reviewBriefQuality(briefPartialCapsules, topic, defaultBusinessInfo, defaultPillars, allTopics);

    // 3/5 = 60% >= 50% threshold → passes
    const capsuleCheck = report.checks.find(c => c.name === 'Answer Capsules');
    expect(capsuleCheck).toBeDefined();
    expect(capsuleCheck!.passed).toBe(true);
  });

  it('fails answer capsule check when target_length is out of 40-70 range', () => {
    const briefBadLength = makeBrief({
      structured_outline: [
        makeSection({
          heading: 'Section A',
          level: 2,
          answer_capsule: { text_hint: 'Too short.', target_length: 20 },
        }),
        makeSection({
          heading: 'Section B',
          level: 2,
          answer_capsule: { text_hint: 'Too long answer.', target_length: 100 },
        }),
      ],
    });

    const report = reviewBriefQuality(briefBadLength, topic, defaultBusinessInfo, defaultPillars, allTopics);

    const capsuleCheck = report.checks.find(c => c.name === 'Answer Capsules');
    expect(capsuleCheck).toBeDefined();
    expect(capsuleCheck!.passed).toBe(false);
    expect(capsuleCheck!.suggestion).toContain('answer_capsule');
  });

  it('skips answer capsule check when no H2 sections exist', () => {
    const briefNoH2 = makeBrief({
      structured_outline: [
        makeSection({ heading: 'Sub heading', level: 3 }),
        makeSection({ heading: 'Another sub', level: 3 }),
      ],
    });

    const report = reviewBriefQuality(briefNoH2, topic, defaultBusinessInfo, defaultPillars, allTopics);

    const capsuleCheck = report.checks.find(c => c.name === 'Answer Capsules');
    expect(capsuleCheck).toBeDefined();
    expect(capsuleCheck!.passed).toBe(true);
    expect(capsuleCheck!.details).toBe('No H2 sections');
  });
});
