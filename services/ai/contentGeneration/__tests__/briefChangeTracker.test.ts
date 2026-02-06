import { describe, it, expect } from 'vitest';
import type { BriefChangeLogEntry, BriefGenerationSummary } from '../../../../types';
import { BriefChangeTracker, ImageAdditionCriteria } from '../briefChangeTracker';

describe('BriefChangeLog Types', () => {
  it('should have correct BriefChangeLogEntry shape', () => {
    const entry: BriefChangeLogEntry = {
      id: 'test-id',
      timestamp: '2026-02-06T10:00:00Z',
      pass: 6,
      change_type: 'image_added',
      section_key: 'section-0',
      field: 'image',
      original_value: null,
      new_value: 'Test image description',
      reason: 'Section > 300 words without visual',
      criteria_met: ['word_count_threshold', 'process_content']
    };

    expect(entry.change_type).toBe('image_added');
    expect(entry.criteria_met).toContain('word_count_threshold');
  });

  it('should have correct BriefGenerationSummary shape', () => {
    const summary: BriefGenerationSummary = {
      total_changes: 3,
      images_added: 2,
      images_modified: 1,
      sections_modified: 0,
      last_updated: '2026-02-06T10:00:00Z'
    };

    expect(summary.total_changes).toBe(3);
  });
});

describe('BriefChangeTracker', () => {
  describe('evaluateImageAddition', () => {
    it('should reject addition when word count is low', () => {
      const result = BriefChangeTracker.evaluateImageAddition(
        'Short content with only a few words.',
        'Test Section',
        false,
        false
      );

      expect(result.justified).toBe(false);
      expect(result.criteria.wordCountThreshold).toBe(false);
    });

    it('should justify addition for long section with process content', () => {
      const longContent = 'Step 1: First do this action now. '.repeat(50); // ~350+ words
      const result = BriefChangeTracker.evaluateImageAddition(
        longContent,
        'How to Configure WiFi',
        false,
        false
      );

      expect(result.justified).toBe(true);
      expect(result.criteria.wordCountThreshold).toBe(true);
      expect(result.criteria.processContent).toBe(true);
      expect(result.reason).toContain('words without visual');
    });

    it('should justify addition for featured snippet target', () => {
      const result = BriefChangeTracker.evaluateImageAddition(
        'Some content about the topic.',
        'What is WiFi Security',
        false,
        true // isFeaturedSnippetTarget
      );

      expect(result.justified).toBe(true);
      expect(result.criteria.featuredSnippetTarget).toBe(true);
    });

    it('should reject when brief already has image', () => {
      const longContent = 'Step 1: First do this. '.repeat(50);
      const result = BriefChangeTracker.evaluateImageAddition(
        longContent,
        'How to Configure',
        true, // briefHasImage
        false
      );

      expect(result.justified).toBe(false);
    });
  });

  describe('logImageAdded', () => {
    it('should create correct log entry', () => {
      // Mock Supabase client
      const mockSupabase = {} as any;
      const tracker = new BriefChangeTracker('brief-123', mockSupabase);

      const criteria: ImageAdditionCriteria = {
        wordCountThreshold: true,
        processContent: true,
        featuredSnippetTarget: false,
        userExperienceValue: true
      };

      tracker.logImageAdded(6, 'section-2', 'Process diagram', criteria, 'Long section needs visual');

      const changes = tracker.getChanges();
      expect(changes).toHaveLength(1);
      expect(changes[0].change_type).toBe('image_added');
      expect(changes[0].section_key).toBe('section-2');
      expect(changes[0].criteria_met).toContain('word_count_threshold');
      expect(changes[0].criteria_met).toContain('process_content');
    });
  });

  describe('getSummary', () => {
    it('should calculate correct summary', () => {
      const mockSupabase = {} as any;
      const tracker = new BriefChangeTracker('brief-123', mockSupabase);

      const criteria: ImageAdditionCriteria = {
        wordCountThreshold: true,
        processContent: false,
        featuredSnippetTarget: false,
        userExperienceValue: true
      };

      tracker.logImageAdded(6, 'section-1', 'Image 1', criteria, 'Reason 1');
      tracker.logImageAdded(6, 'section-2', 'Image 2', criteria, 'Reason 2');
      tracker.logImageModified(6, 'section-0', 'Old desc', 'New desc', 'Quality improvement');

      const summary = tracker.getSummary();
      expect(summary.total_changes).toBe(3);
      expect(summary.images_added).toBe(2);
      expect(summary.images_modified).toBe(1);
    });
  });
});
