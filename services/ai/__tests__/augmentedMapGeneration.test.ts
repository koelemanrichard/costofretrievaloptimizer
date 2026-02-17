import { describe, it, expect, vi } from 'vitest';
import { AugmentedMapGenerator } from '../augmentedMapGeneration';

describe('AugmentedMapGenerator', () => {
  it('should produce topics from both existing clusters and AI-identified gaps', async () => {
    const mockAI = vi.fn().mockResolvedValue({
      gapTopics: [
        { title: 'CMS Migration Guide', type: 'core', description: 'Guide for migrating between CMS platforms' },
        { title: 'CMS Security Best Practices', type: 'outer', description: 'Security hardening guide' },
      ],
    });

    const generator = new AugmentedMapGenerator({ generateGapsFn: mockAI });

    const result = await generator.generate({
      clusters: [
        {
          suggestedTopicTitle: 'Enterprise CMS',
          pages: [{ id: '1', url: '/cms', detectedCE: 'Enterprise CMS' }],
          coreOrOuter: 'core',
          detectedCE: 'Enterprise CMS',
          avgAlignmentScore: 80,
          totalTraffic: 500,
        },
      ],
      orphans: [],
      suggestedHierarchy: [],
      pillars: { centralEntity: 'Enterprise CMS', sourceContext: 'Software Company', centralSearchIntent: 'Buy CMS' },
    });

    const existingTopics = result.topics.filter(t => t.source === 'discovered');
    const gapTopics = result.topics.filter(t => t.source === 'generated');

    expect(existingTopics.length).toBeGreaterThan(0);
    expect(gapTopics.length).toBeGreaterThan(0);
    expect(existingTopics[0].coveredByInventoryIds).toContain('1');
  });

  it('should handle AI gap analysis failure gracefully', async () => {
    const mockAI = vi.fn().mockRejectedValue(new Error('AI error'));
    const generator = new AugmentedMapGenerator({ generateGapsFn: mockAI });

    const result = await generator.generate({
      clusters: [
        {
          suggestedTopicTitle: 'CMS',
          pages: [{ id: '1', url: '/cms' }],
          coreOrOuter: 'core',
          detectedCE: 'CMS',
          avgAlignmentScore: 70,
          totalTraffic: 100,
        },
      ],
      orphans: [],
      suggestedHierarchy: [],
      pillars: { centralEntity: 'CMS', sourceContext: 'Tech', centralSearchIntent: 'Learn CMS' },
    });

    expect(result.topics.length).toBe(1); // Only discovered
    expect(result.gapCount).toBe(0);
  });

  it('should set parent-child relationships from hierarchy', async () => {
    const mockAI = vi.fn().mockResolvedValue({ gapTopics: [] });
    const generator = new AugmentedMapGenerator({ generateGapsFn: mockAI });

    const result = await generator.generate({
      clusters: [
        { suggestedTopicTitle: 'CMS', pages: [{ id: '1', url: '/cms' }], coreOrOuter: 'core', detectedCE: 'CMS', avgAlignmentScore: 80, totalTraffic: 500 },
        { suggestedTopicTitle: 'Enterprise CMS', pages: [{ id: '2', url: '/enterprise' }], coreOrOuter: 'core', detectedCE: 'Enterprise CMS', avgAlignmentScore: 70, totalTraffic: 200 },
      ],
      orphans: [],
      suggestedHierarchy: [{ parentCluster: 'CMS', childClusters: ['Enterprise CMS'] }],
      pillars: { centralEntity: 'CMS', sourceContext: 'Tech', centralSearchIntent: 'Learn CMS' },
    });

    const parent = result.topics.find(t => t.title === 'CMS');
    const child = result.topics.find(t => t.title === 'Enterprise CMS');
    expect(child?.parent_topic_id).toBe(parent?.id);
  });
});
