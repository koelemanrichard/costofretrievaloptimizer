// services/ai/contextualEditing/__tests__/imagePromptGenerator.test.ts
import { describe, it, expect } from 'vitest';
import {
  suggestImageStyle,
  suggestAspectRatio,
  generateAltText,
  determinePlacement
} from '../imagePromptGenerator';

describe('imagePromptGenerator', () => {
  describe('suggestImageStyle', () => {
    it('suggests diagram for how-to content', () => {
      const style = suggestImageStyle('How to install a heat pump step by step');
      expect(style).toBe('diagram');
    });

    it('suggests photograph for location content', () => {
      const style = suggestImageStyle('Our office in Breda city center');
      expect(style).toBe('photograph');
    });

    it('suggests infographic for data/statistics', () => {
      const style = suggestImageStyle('Energy savings statistics show 40% reduction');
      expect(style).toBe('infographic');
    });

    it('suggests diagram for process content', () => {
      const style = suggestImageStyle('The process of solar panel installation');
      expect(style).toBe('diagram');
    });

    it('suggests illustration for concept content', () => {
      const style = suggestImageStyle('The concept of sustainable energy benefits');
      expect(style).toBe('illustration');
    });

    it('defaults to photograph for general content', () => {
      const style = suggestImageStyle('Our team works hard to deliver quality');
      expect(style).toBe('photograph');
    });
  });

  describe('suggestAspectRatio', () => {
    it('suggests 16:9 for hero/banner images', () => {
      const ratio = suggestAspectRatio('hero');
      expect(ratio).toBe('16:9');
    });

    it('suggests 4:3 for content images', () => {
      const ratio = suggestAspectRatio('content');
      expect(ratio).toBe('4:3');
    });

    it('suggests 1:1 for inline images', () => {
      const ratio = suggestAspectRatio('inline');
      expect(ratio).toBe('1:1');
    });
  });

  describe('generateAltText', () => {
    it('includes key entities from context', () => {
      const alt = generateAltText(
        'Professional heat pump installation in Breda',
        'Heat Pump Installation Services'
      );
      // Alt text includes key phrases separated by ' - '
      expect(alt.toLowerCase()).toContain('heat');
      expect(alt.toLowerCase()).toContain('pump');
    });

    it('includes section heading keywords', () => {
      const alt = generateAltText(
        'Our team installing solar panels',
        'Solar Panel Installation Guide'
      );
      expect(alt.toLowerCase()).toContain('solar');
    });

    it('provides fallback when no key phrases found', () => {
      const alt = generateAltText(
        'the quick brown fox',
        'Section Title'
      );
      // Heading words are included, separated by ' - '
      expect(alt.toLowerCase()).toContain('section');
      expect(alt.toLowerCase()).toContain('title');
    });
  });

  describe('determinePlacement', () => {
    it('places after paragraph by default', () => {
      const placement = determinePlacement('Some content text', 'section-1');
      expect(placement.position).toBe('after_paragraph');
    });

    it('includes rationale for placement', () => {
      const placement = determinePlacement('Content about heat pumps', 'section-2');
      expect(placement.rationale).toBeTruthy();
      expect(placement.rationale.length).toBeGreaterThan(0);
    });

    it('includes section key in placement', () => {
      const placement = determinePlacement('Some content', 'my-section-key');
      expect(placement.sectionKey).toBe('my-section-key');
    });
  });
});
