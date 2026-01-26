/**
 * Blueprint Renderer Tests - Brand Integration
 *
 * Tests for THE KEY FIX: ensuring BrandDesignSystem.compiledCss is actually
 * used in the rendered output, not just generated and ignored.
 *
 * @module services/publishing/renderer/__tests__/blueprintRenderer.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderBlueprint } from '../blueprintRenderer';
import type { BrandDesignSystem } from '../../../../types/designDna';
import type { LayoutBlueprint } from '../../architect/blueprintTypes';

// Mock console.log to suppress output during tests
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

// Mock a minimal blueprint
const mockBlueprint: LayoutBlueprint = {
  id: 'test-blueprint',
  version: '1.0',
  articleId: 'test-article',
  pageStrategy: {
    visualStyle: 'editorial',
    primaryGoal: 'inform',
    pacing: 'balanced',
    colorIntensity: 'moderate',
    buyerJourneyStage: 'awareness',
    reasoning: 'Test blueprint',
  },
  globalElements: {
    showToc: false,
    tocPosition: 'inline',
    showAuthorBox: false,
    authorBoxPosition: 'bottom',
    showSources: false,
    showRelatedContent: false,
    ctaStrategy: {
      intensity: 'subtle',
      positions: [],
      style: 'inline',
    },
  },
  sections: [
    {
      id: 'section-1',
      heading: 'Test Section',
      headingLevel: 2,
      sourceContent: '<p>Test content for the section.</p>',
      presentation: {
        component: 'prose',
        emphasis: 'normal',
        spacing: 'normal',
        hasBackground: false,
        hasDivider: false,
        variant: 'default',
      },
      styleHints: {},
      reasoning: 'Default prose section',
    },
  ],
  metadata: {
    generatedAt: new Date().toISOString(),
    modelUsed: 'test',
    generationDurationMs: 100,
    sectionsAnalyzed: 1,
    wordCount: 10,
  },
};

describe('BlueprintRenderer Brand Integration', () => {
  describe('compiledCss injection', () => {
    it('should inject compiledCss from BrandDesignSystem into output CSS', () => {
      const mockBrandSystem: Partial<BrandDesignSystem> = {
        compiledCss: '.ctc-brand-btn { background: blue; border-radius: 8px; }',
        tokens: { css: ':root { --ctc-primary: #0066cc; }', json: {} },
      };

      const result = renderBlueprint(
        mockBlueprint,
        'Test Article',
        { brandDesignSystem: mockBrandSystem as BrandDesignSystem }
      );

      expect(result.css).toContain('.ctc-brand-btn { background: blue;');
      expect(result.css).toContain(':root { --ctc-primary: #0066cc; }');
    });

    it('should include tokens.css before compiledCss for proper CSS variable ordering', () => {
      const mockBrandSystem: Partial<BrandDesignSystem> = {
        compiledCss: '.ctc-component { color: var(--ctc-primary); }',
        tokens: { css: ':root { --ctc-primary: #ff0000; }', json: {} },
      };

      const result = renderBlueprint(
        mockBlueprint,
        'Test Article',
        { brandDesignSystem: mockBrandSystem as BrandDesignSystem }
      );

      // Tokens (CSS variables) should come before component styles
      const tokensIndex = result.css.indexOf(':root { --ctc-primary: #ff0000; }');
      const componentIndex = result.css.indexOf('.ctc-component { color: var(--ctc-primary); }');

      expect(tokensIndex).toBeLessThan(componentIndex);
    });

    it('should prefer BrandDesignSystem over legacy designTokens when both provided', () => {
      const mockBrandSystem: Partial<BrandDesignSystem> = {
        compiledCss: '/* Brand CSS */',
        tokens: { css: ':root { --ctc-primary: #ff0000; }', json: {} },
      };

      const result = renderBlueprint(
        mockBlueprint,
        'Test Article',
        {
          brandDesignSystem: mockBrandSystem as BrandDesignSystem,
          designTokens: { colors: { primary: '#0000ff' } }, // Should be ignored
        }
      );

      // Should contain the brand system CSS
      expect(result.css).toContain('--ctc-primary: #ff0000');
      // The legacy blue color should NOT be in the CSS (we're using brand system)
      // Note: We need to check that it's NOT present as a CSS variable override
      expect(result.css).not.toContain('--ctc-primary: #0000ff');
    });

    it('should handle BrandDesignSystem with empty compiledCss gracefully', () => {
      const mockBrandSystem: Partial<BrandDesignSystem> = {
        compiledCss: '',
        tokens: { css: ':root { --ctc-primary: #123456; }', json: {} },
      };

      // Empty compiledCss should fall back to legacy behavior
      const result = renderBlueprint(
        mockBlueprint,
        'Test Article',
        { brandDesignSystem: mockBrandSystem as BrandDesignSystem }
      );

      // Should still work (fall back to generated CSS)
      expect(result.html).toBeTruthy();
      expect(result.css).toBeTruthy();
    });
  });

  describe('variantMappings', () => {
    it('should include mapped variant CSS classes in compiledCss', () => {
      // The variant mapping CSS classes are provided via compiledCss
      // The component library uses these classes for styling
      const mockBrandSystem: Partial<BrandDesignSystem> = {
        compiledCss: `
.ctc-card--corporate-clean {
  border-radius: 12px;
  background: var(--ctc-surface);
}
.ctc-card--corporate-clean .ctc-card-content {
  padding: 1.5rem;
}
        `.trim(),
        tokens: { css: '', json: {} },
        variantMappings: {
          card: { clean: 'ctc-card--corporate-clean' },
          hero: {},
          button: {},
          cta: {},
        },
      };

      const result = renderBlueprint(
        mockBlueprint,
        'Test Article',
        { brandDesignSystem: mockBrandSystem as BrandDesignSystem }
      );

      // The CSS output should include the variant class styles
      expect(result.css).toContain('.ctc-card--corporate-clean');
      expect(result.css).toContain('border-radius: 12px');
    });

    it('should use original variant when no mapping exists', () => {
      const blueprintWithCard: LayoutBlueprint = {
        ...mockBlueprint,
        sections: [
          {
            id: 'card-section',
            heading: 'Features',
            headingLevel: 2,
            sourceContent: '- Feature 1\n- Feature 2',
            presentation: {
              component: 'card-grid',
              emphasis: 'normal',
              spacing: 'normal',
              hasBackground: false,
              hasDivider: false,
              variant: 'minimal', // No mapping for this
            },
            styleHints: {},
            reasoning: 'Card grid section',
          },
        ],
      };

      const mockBrandSystem: Partial<BrandDesignSystem> = {
        compiledCss: '',
        tokens: { css: '', json: {} },
        variantMappings: {
          card: { modern: 'ctc-card--corporate-modern' }, // Only has 'modern' mapping
          hero: {},
          button: {},
          cta: {},
        },
      };

      const result = renderBlueprint(
        blueprintWithCard,
        'Test Card Article',
        { brandDesignSystem: mockBrandSystem as BrandDesignSystem }
      );

      // Should render without error
      expect(result.html).toBeTruthy();
      expect(result.html).toContain('card-section');
    });

    it('should map hero variants correctly', () => {
      const mockBrandSystem: Partial<BrandDesignSystem> = {
        compiledCss: '.ctc-hero--brand-elegant { padding: 5rem; }',
        tokens: { css: '', json: {} },
        variantMappings: {
          card: {},
          hero: { elegant: 'ctc-hero--brand-elegant' },
          button: {},
          cta: {},
        },
      };

      const result = renderBlueprint(
        mockBlueprint,
        'Test Article',
        { brandDesignSystem: mockBrandSystem as BrandDesignSystem }
      );

      // The hero variant mapping is available in CSS
      expect(result.css).toContain('.ctc-hero--brand-elegant');
    });
  });

  describe('fallback behavior', () => {
    it('should fall back to legacy designTokens when no BrandDesignSystem provided', () => {
      const result = renderBlueprint(
        mockBlueprint,
        'Test Article',
        {
          designTokens: {
            colors: { primary: '#123456' },
          },
        }
      );

      // Legacy designTokens should generate CSS with the color
      expect(result.css).toContain('--ctc-primary');
    });

    it('should work without any brand system (default behavior)', () => {
      const result = renderBlueprint(mockBlueprint, 'Test Article', {});

      expect(result.html).toBeTruthy();
      expect(result.css).toBeTruthy();
      // Should use default design system CSS
      expect(result.css).toContain('--ctc-');
    });

    it('should handle undefined brandDesignSystem gracefully', () => {
      const result = renderBlueprint(mockBlueprint, 'Test Article', {
        brandDesignSystem: undefined,
      });

      expect(result.html).toBeTruthy();
      expect(result.css).toBeTruthy();
    });
  });

  describe('CSS output structure', () => {
    it('should include brand design system comment when using brand CSS', () => {
      const mockBrandSystem: Partial<BrandDesignSystem> = {
        compiledCss: '.brand-specific { color: red; }',
        tokens: { css: ':root { --brand-color: blue; }', json: {} },
      };

      const result = renderBlueprint(
        mockBlueprint,
        'Test Article',
        { brandDesignSystem: mockBrandSystem as BrandDesignSystem }
      );

      expect(result.css).toContain('Brand Design System');
    });

    it('should preserve complete component styles from compiledCss', () => {
      const complexCSS = `
.ctc-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.ctc-card:hover {
  transform: translateY(-2px);
}
.ctc-button {
  background: var(--ctc-primary);
  padding: 12px 24px;
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
      `.trim();

      const mockBrandSystem: Partial<BrandDesignSystem> = {
        compiledCss: complexCSS,
        tokens: { css: '', json: {} },
      };

      const result = renderBlueprint(
        mockBlueprint,
        'Test Article',
        { brandDesignSystem: mockBrandSystem as BrandDesignSystem }
      );

      // All CSS should be preserved
      expect(result.css).toContain('.ctc-card {');
      expect(result.css).toContain('.ctc-card:hover {');
      expect(result.css).toContain('.ctc-button {');
      expect(result.css).toContain('@keyframes fadeIn');
    });
  });

  describe('metadata', () => {
    it('should include blueprint metadata in output', () => {
      const result = renderBlueprint(mockBlueprint, 'Test Article', {});

      expect(result.metadata.blueprint.id).toBe('test-blueprint');
      expect(result.metadata.blueprint.version).toBe('1.0');
      expect(result.metadata.blueprint.visualStyle).toBe('editorial');
    });

    it('should track components used', () => {
      const result = renderBlueprint(mockBlueprint, 'Test Article', {});

      expect(result.metadata.componentsUsed).toContain('hero');
      expect(result.metadata.componentsUsed).toContain('prose');
    });
  });
});
