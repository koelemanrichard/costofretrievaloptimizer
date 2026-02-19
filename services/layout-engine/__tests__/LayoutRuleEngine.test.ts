import { describe, it, expect } from 'vitest';
import { LayoutRuleEngine } from '../LayoutRuleEngine';
import type { LayoutConstraints, LayoutViolation } from '../LayoutRuleEngine';

// =============================================================================
// getLayoutConstraints
// =============================================================================

describe('LayoutRuleEngine', () => {
  describe('getLayoutConstraints', () => {
    it('should return ordered-list requirement for steps content', () => {
      const constraints = LayoutRuleEngine.getLayoutConstraints('steps', 'ordered-list');
      expect(constraints.requiredFormat).toBe('ordered-list');
    });

    it('should return table requirement for comparison content', () => {
      const constraints = LayoutRuleEngine.getLayoutConstraints('comparison', 'table');
      expect(constraints.requiredFormat).toBe('table');
    });

    it('should require intro sentence for list content', () => {
      const constraints = LayoutRuleEngine.getLayoutConstraints('list', 'unordered-list');
      expect(constraints.requiresIntroSentence).toBe(true);
    });

    it('should set maxParagraphWords to 150', () => {
      const constraints = LayoutRuleEngine.getLayoutConstraints('explanation', 'prose');
      expect(constraints.maxParagraphWords).toBe(150);
    });

    it('should require heading every 300 words', () => {
      const constraints = LayoutRuleEngine.getLayoutConstraints('explanation', 'prose');
      expect(constraints.requiresHeadingEvery).toBe(300);
    });

    it('should set maxListItems to 10 for steps content', () => {
      const constraints = LayoutRuleEngine.getLayoutConstraints('steps');
      expect(constraints.maxListItems).toBe(10);
    });

    it('should set minTableColumns to 2 for comparison content', () => {
      const constraints = LayoutRuleEngine.getLayoutConstraints('comparison');
      expect(constraints.minTableColumns).toBe(2);
    });

    it('should set preferredComponent to faq-accordion for faq content', () => {
      const constraints = LayoutRuleEngine.getLayoutConstraints('faq');
      expect(constraints.preferredComponent).toBe('faq-accordion');
    });

    it('should set preferredComponent to definition-box for definition content', () => {
      const constraints = LayoutRuleEngine.getLayoutConstraints('definition');
      expect(constraints.preferredComponent).toBe('definition-box');
    });

    it('should always require lazy loading (Rule 265)', () => {
      const constraints = LayoutRuleEngine.getLayoutConstraints('explanation');
      expect(constraints.requiresLazyLoading).toBe(true);
    });

    it('should always require responsive images (Rule 263)', () => {
      const constraints = LayoutRuleEngine.getLayoutConstraints('data');
      expect(constraints.requiresResponsiveImages).toBe(true);
    });

    it('should always require image captions (Rule 267)', () => {
      const constraints = LayoutRuleEngine.getLayoutConstraints('summary');
      expect(constraints.requiresImageCaption).toBe(true);
    });

    it('should apply universal constraints for content types without specific rules', () => {
      const constraints = LayoutRuleEngine.getLayoutConstraints('testimonial');
      expect(constraints.requiresHeadingEvery).toBe(300);
      expect(constraints.maxParagraphWords).toBe(150);
      expect(constraints.requiresLazyLoading).toBe(true);
      expect(constraints.requiresResponsiveImages).toBe(true);
      expect(constraints.requiresImageCaption).toBe(true);
      // No content-type-specific constraints
      expect(constraints.requiredFormat).toBeUndefined();
      expect(constraints.preferredComponent).toBeUndefined();
    });

    it('should let format-specific constraints override content-type constraints', () => {
      // Steps content defaults to ordered-list, but if format is 'prose', prose wins
      const constraints = LayoutRuleEngine.getLayoutConstraints('steps', 'prose');
      expect(constraints.requiredFormat).toBe('prose');
    });

    it('should apply content-type constraints when no format is provided', () => {
      const constraints = LayoutRuleEngine.getLayoutConstraints('steps');
      expect(constraints.requiredFormat).toBe('ordered-list');
      expect(constraints.requiresIntroSentence).toBe(true);
    });

    it('should handle unknown format gracefully', () => {
      const constraints = LayoutRuleEngine.getLayoutConstraints('explanation', 'unknown-format');
      // Should still have universal constraints, no format-specific overrides
      expect(constraints.requiresHeadingEvery).toBe(300);
      expect(constraints.maxParagraphWords).toBe(150);
    });
  });

  // ===========================================================================
  // validateRenderedOutput
  // ===========================================================================

  describe('validateRenderedOutput', () => {
    it('should flag images without alt text', () => {
      const html = '<article><img src="test.jpg"></article>';
      const violations = LayoutRuleEngine.validateRenderedOutput(html);
      expect(violations.some(v => v.rule === 'img-alt-text')).toBe(true);
    });

    it('should flag images between heading and first paragraph', () => {
      const html = '<article><h2>Title</h2><img src="test.jpg"><p>Content</p></article>';
      const violations = LayoutRuleEngine.validateRenderedOutput(html);
      expect(violations.some(v => v.rule === 'img-placement')).toBe(true);
    });

    it('should pass for properly placed images', () => {
      const html = '<article><h2>Title</h2><p>Content</p><img src="test.jpg" alt="Description"></article>';
      const violations = LayoutRuleEngine.validateRenderedOutput(html);
      expect(violations.filter(v => v.rule === 'img-placement')).toHaveLength(0);
    });

    it('should not flag images with alt attribute', () => {
      const html = '<img src="photo.jpg" alt="A photo">';
      const violations = LayoutRuleEngine.validateRenderedOutput(html);
      expect(violations.filter(v => v.rule === 'img-alt-text')).toHaveLength(0);
    });

    it('should flag multiple images without alt text', () => {
      const html = '<img src="a.jpg"><img src="b.jpg"><img src="c.jpg" alt="ok">';
      const violations = LayoutRuleEngine.validateRenderedOutput(html);
      const altViolations = violations.filter(v => v.rule === 'img-alt-text');
      expect(altViolations).toHaveLength(2);
    });

    it('should flag multiple heading-then-image violations', () => {
      const html = '<h2>First</h2><img src="a.jpg"><h3>Second</h3><img src="b.jpg">';
      const violations = LayoutRuleEngine.validateRenderedOutput(html);
      const placementViolations = violations.filter(v => v.rule === 'img-placement');
      expect(placementViolations).toHaveLength(2);
    });

    it('should return empty array for valid HTML', () => {
      const html = '<article><h2>Title</h2><p>Content here.</p><img src="photo.jpg" alt="Photo"></article>';
      const violations = LayoutRuleEngine.validateRenderedOutput(html);
      expect(violations).toHaveLength(0);
    });

    it('should return empty array for HTML with no images', () => {
      const html = '<article><h2>Title</h2><p>Just text content.</p></article>';
      const violations = LayoutRuleEngine.validateRenderedOutput(html);
      expect(violations).toHaveLength(0);
    });

    it('should set severity to high for img-alt-text violations', () => {
      const html = '<img src="test.jpg">';
      const violations = LayoutRuleEngine.validateRenderedOutput(html);
      const v = violations.find(v => v.rule === 'img-alt-text');
      expect(v?.severity).toBe('high');
    });

    it('should set severity to critical for img-placement violations', () => {
      const html = '<h2>Heading</h2><img src="test.jpg">';
      const violations = LayoutRuleEngine.validateRenderedOutput(html);
      const v = violations.find(v => v.rule === 'img-placement');
      expect(v?.severity).toBe('critical');
    });

    it('should truncate element to 100 chars in violation', () => {
      const longSrc = 'x'.repeat(200);
      const html = `<img src="${longSrc}">`;
      const violations = LayoutRuleEngine.validateRenderedOutput(html);
      const v = violations.find(v => v.rule === 'img-alt-text');
      expect(v?.element?.length).toBeLessThanOrEqual(100);
    });

    it('should handle heading with whitespace before image', () => {
      const html = '<h3>Title</h3>  \n  <img src="test.jpg">';
      const violations = LayoutRuleEngine.validateRenderedOutput(html);
      expect(violations.some(v => v.rule === 'img-placement')).toBe(true);
    });

    it('should handle self-closing img tags', () => {
      const html = '<img src="test.jpg" />';
      const violations = LayoutRuleEngine.validateRenderedOutput(html);
      expect(violations.some(v => v.rule === 'img-alt-text')).toBe(true);
    });

    it('should not flag img with empty alt (alt="" is valid)', () => {
      const html = '<img src="decorative.jpg" alt="">';
      const violations = LayoutRuleEngine.validateRenderedOutput(html);
      expect(violations.filter(v => v.rule === 'img-alt-text')).toHaveLength(0);
    });
  });
});
