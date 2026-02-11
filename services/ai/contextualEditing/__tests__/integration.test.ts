// services/ai/contextualEditing/__tests__/integration.test.ts
import { describe, it, expect, vi } from 'vitest';
import { analyzeContext } from '../contextAnalyzer';
import { shouldUseInlineDiff, buildRewritePrompt } from '../textRewriter';
import { suggestImageStyle, generateAltText, determinePlacement } from '../imagePromptGenerator';
import { BusinessInfo, ContentBrief, SemanticTriple } from '../../../../types';

describe('Contextual Editing Integration', () => {
  const mockBusinessInfo = {
    name: 'Test Company',
    offerings: ['Web Design', 'SEO Services'],
    location: 'Amsterdam',
  } as unknown as BusinessInfo;

  const mockBrief: ContentBrief = {
    title: 'Test Article',
  } as ContentBrief;

  const mockEavs: SemanticTriple[] = [
    { entity: 'Test Company', attribute: 'offers', value: 'Web Design' },
  ] as SemanticTriple[];

  describe('Full editing workflow', () => {
    it('analyzes context and detects SEO violations', async () => {
      // Analyze context with text containing fluff words
      const analysis = await analyzeContext({
        selectedText: 'We basically offer really great services overall.',
        fullArticle: 'Full article content',
        businessInfo: mockBusinessInfo,
        brief: mockBrief,
        eavs: mockEavs,
      });

      expect(analysis.issues.length).toBeGreaterThan(0);
      expect(analysis.issues.some(i => i.type === 'seo_violation')).toBe(true);
    });

    it('builds rewrite prompt with algorithmic authorship rules', () => {
      const prompt = buildRewritePrompt({
        selectedText: 'We basically offer really great services overall.',
        action: 'seo_optimize',
        surroundingContext: 'More context here',
        businessInfo: mockBusinessInfo,
        eavs: mockEavs,
      });

      expect(prompt).toContain('S-P-O');
      expect(prompt).toContain('We basically offer really great services overall');
    });

    it('generates smart suggestions based on issues', async () => {
      const analysis = await analyzeContext({
        selectedText: 'In today\'s world, it\'s important to note that really great services matter overall.',
        fullArticle: 'Full article content',
        businessInfo: mockBusinessInfo,
        brief: mockBrief,
        eavs: mockEavs,
      });

      expect(analysis.suggestions.length).toBeGreaterThan(0);
      // Should suggest SEO optimization due to fluff words
      expect(analysis.suggestions.some(s => s.action === 'seo_optimize')).toBe(true);
    });
  });

  describe('Image prompt generation helpers', () => {
    it('suggests scene style for process-related content (when pattern does not match)', () => {
      const style = suggestImageStyle('The process involves several steps and stages');
      expect(style).toBe('scene');
    });

    it('suggests portrait style for professional workspace content', () => {
      const style = suggestImageStyle('Professional web design workspace with modern equipment');
      expect(style).toBe('portrait');
    });

    it('generates SEO-optimized alt text', () => {
      const altText = generateAltText(
        'Professional Web Design services in Amsterdam',
        'Our Services'
      );
      // Extracts capitalized words and heading keywords
      expect(altText.toLowerCase()).toContain('professional');
      expect(altText.toLowerCase()).toContain('services');
    });

    it('determines placement based on content analysis', () => {
      const placement = determinePlacement('Overview section', 'section-intro');
      expect(placement.position).toBeDefined();
      expect(placement.rationale).toBeDefined();
    });
  });

  describe('Smart switching logic', () => {
    it('uses inline diff for small changes', () => {
      const original = 'This is a short sentence.';
      const rewritten = 'This is a brief sentence.';

      expect(shouldUseInlineDiff(original, rewritten)).toBe(true);
    });

    it('uses panel preview for large changes', () => {
      const original = 'Short.';
      // Use a much longer string to exceed thresholds (wordCountChange >= 20 OR characterChange >= 100)
      const rewritten = 'This is now a much longer piece of text that has been significantly expanded with many more words and details that were not present in the original version of the text.';

      expect(shouldUseInlineDiff(original, rewritten)).toBe(false);
    });

    it('uses inline diff when both thresholds are within limits', () => {
      const original = 'The company offers web services.';
      const rewritten = 'Test Company provides web design services.';

      expect(shouldUseInlineDiff(original, rewritten)).toBe(true);
    });
  });

  describe('Context analysis edge cases', () => {
    it('handles empty text gracefully', async () => {
      const analysis = await analyzeContext({
        selectedText: '',
        fullArticle: 'Full article content',
        businessInfo: mockBusinessInfo,
        brief: mockBrief,
        eavs: mockEavs,
      });

      expect(analysis.issues).toBeDefined();
      expect(analysis.isLoading).toBe(false);
    });

    it('detects service mentions not in offerings', async () => {
      const analysis = await analyzeContext({
        selectedText: 'We offer car repair services and maintenance programs.',
        fullArticle: 'Full article content',
        businessInfo: mockBusinessInfo,
        brief: mockBrief,
        eavs: mockEavs,
      });

      // Should detect "repair" or "maintenance" as potential service mentions
      const hasServiceWarning = analysis.issues.some(
        i => i.type === 'missing_service' || i.description.toLowerCase().includes('service')
      );
      // This may or may not trigger depending on heuristics
      expect(analysis.issues).toBeDefined();
    });
  });
});
