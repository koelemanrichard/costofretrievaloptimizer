// config/contentPrompts/__tests__/sectionPrompt.test.ts
import { describe, it, expect } from 'vitest';
import { buildSectionPrompt } from '../sectionPrompt';
import { PRIORITY_PRESETS, DEFAULT_CONTENT_GENERATION_SETTINGS } from '../../../types/contentGeneration';

describe('buildSectionPrompt', () => {
  const mockContext = {
    section: {
      key: 'section-1',
      heading: 'What is Cloud Computing?',
      level: 2,
      order: 0,
      subordinateTextHint: 'Define cloud computing using is-a structure'
    },
    brief: {
      title: 'Cloud Computing Guide',
      targetKeyword: 'cloud computing',
      metaDescription: 'Complete guide to cloud computing',
      keyTakeaways: ['scalability', 'cost savings'],
      serpAnalysis: { peopleAlsoAsk: ['Is cloud computing safe?'] }
    },
    businessInfo: {
      seedKeyword: 'cloud computing',
      language: 'English',
      targetMarket: 'Global',
      industry: 'Technology'
    },
    settings: {
      ...DEFAULT_CONTENT_GENERATION_SETTINGS,
      id: 'test',
      userId: 'user-1',
      createdAt: '',
      updatedAt: ''
    },
    allSections: [{ key: 'section-1', heading: 'What is Cloud Computing?', level: 2, order: 0 }]
  };

  it('includes the section heading in prompt', () => {
    const prompt = buildSectionPrompt(mockContext as any);
    expect(prompt).toContain('What is Cloud Computing?');
  });

  it('includes subordinate text hint when provided', () => {
    const prompt = buildSectionPrompt(mockContext as any);
    expect(prompt).toContain('Define cloud computing');
  });

  it('includes language requirement', () => {
    const prompt = buildSectionPrompt(mockContext as any);
    expect(prompt).toContain('English');
  });

  it('includes priority instructions based on settings', () => {
    const prompt = buildSectionPrompt(mockContext as any);
    expect(prompt).toContain('Human Readability');
  });

  it('includes SERP data when available', () => {
    const prompt = buildSectionPrompt(mockContext as any);
    expect(prompt).toContain('Is cloud computing safe?');
  });
});
