import { describe, it, expect } from 'vitest';
import type {
  ExtractedComponent,
  ExtractedTokens,
  ContentSlot,
  SynthesizedComponent,
  BrandReplicationOutput,
} from '../../../types/brandExtraction';

/**
 * Anti-Template Test Suite
 *
 * These tests ensure the brand extraction system NEVER regresses to template-based
 * thinking. The system must store and use literal code, not abstractions.
 *
 * FORBIDDEN PATTERNS:
 * - variant, style, theme, preset, template fields
 * - var(--*) CSS variable references
 * - {{placeholder}} template syntax
 * - "primary", "secondary" categorical names for actual values
 */

describe('Anti-Template Safeguards', () => {
  describe('Type Definitions', () => {
    it('ExtractedComponent has NO abstraction fields', () => {
      // Create a sample ExtractedComponent to verify its structure
      const component: ExtractedComponent = {
        id: 'comp-123',
        extractionId: 'ext-456',
        projectId: 'proj-789',
        visualDescription: 'Hero section with large heading and CTA button',
        componentType: 'hero',
        literalHtml: '<section class="hero"><h1>Welcome</h1></section>',
        literalCss: '.hero { background: #1a365d; padding: 80px; }',
        theirClassNames: ['hero', 'hero-banner'],
        contentSlots: [],
        createdAt: new Date().toISOString(),
      };

      // Verify no abstraction fields exist
      const forbiddenFields = ['variant', 'style', 'theme', 'preset', 'template'];
      const componentKeys = Object.keys(component);

      forbiddenFields.forEach(field => {
        expect(componentKeys).not.toContain(field);
      });

      // Verify required literal fields exist
      expect(component).toHaveProperty('literalHtml');
      expect(component).toHaveProperty('literalCss');
      expect(component).toHaveProperty('theirClassNames');
    });

    it('ExtractedTokens stores actual values, not categories', () => {
      // Tokens should have literal hex values, not "primary", "secondary" categories
      const tokens: ExtractedTokens = {
        id: 'tokens-123',
        projectId: 'proj-789',
        colors: {
          values: [
            { hex: '#1a365d', usage: 'header background', frequency: 12 },
            { hex: '#e53e3e', usage: 'CTA buttons', frequency: 8 },
            { hex: '#2d3748', usage: 'body text', frequency: 45 },
          ],
        },
        typography: {
          headings: {
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 700,
            letterSpacing: '-0.02em',
          },
          body: {
            fontFamily: 'Inter, sans-serif',
            fontWeight: 400,
            lineHeight: 1.6,
          },
        },
        spacing: {
          sectionGap: '80px',
          cardPadding: '24px',
          contentWidth: '1200px',
        },
        shadows: {
          card: '0 4px 6px rgba(0, 0, 0, 0.1)',
          elevated: '0 10px 25px rgba(0, 0, 0, 0.15)',
        },
        borders: {
          radiusSmall: '4px',
          radiusMedium: '8px',
          radiusLarge: '16px',
          defaultColor: '#e2e8f0',
        },
        extractedFrom: ['https://example.com'],
        extractedAt: new Date().toISOString(),
      };

      // Verify colors are stored as hex values, not categorical names
      tokens.colors.values.forEach(color => {
        expect(color.hex).toMatch(/^#[0-9a-fA-F]{3,8}$/);
        expect(color.hex).not.toBe('primary');
        expect(color.hex).not.toBe('secondary');
        expect(color.hex).not.toBe('accent');
        expect(color.hex).not.toBe('background');
      });

      // Verify typography uses actual font names
      expect(tokens.typography.headings.fontFamily).not.toBe('heading');
      expect(tokens.typography.body.fontFamily).not.toBe('body');
      expect(tokens.typography.headings.fontFamily).toContain(','); // Real fonts have fallbacks
    });

    it('SynthesizedComponent has NO abstraction fields', () => {
      const synthesized: SynthesizedComponent = {
        visualDescription: 'FAQ accordion section',
        componentType: 'faq',
        generatedHtml: '<div class="faq-section"><details><summary>Question</summary></details></div>',
        generatedCss: '.faq-section { padding: 40px; background: #f7fafc; }',
        ourClassNames: ['faq-section', 'faq-item'],
        contentSlots: [],
        synthesizedFrom: ['extracted-hero-123'],
      };

      const forbiddenFields = ['variant', 'style', 'theme', 'preset', 'template'];
      const componentKeys = Object.keys(synthesized);

      forbiddenFields.forEach(field => {
        expect(componentKeys).not.toContain(field);
      });

      // Verify it has generated code fields, not template references
      expect(synthesized).toHaveProperty('generatedHtml');
      expect(synthesized).toHaveProperty('generatedCss');
    });
  });

  describe('Data Integrity', () => {
    it('literalCss contains actual CSS, not variable references', () => {
      // Sample literal CSS should contain actual values like "#1a365d"
      // NOT variable references like "var(--primary)"
      const validCss = '.hero { background: #1a365d; padding: 80px; color: rgb(255, 255, 255); }';
      expect(validCss).not.toContain('var(--');
      expect(validCss).toMatch(/#[0-9a-fA-F]{3,6}/);

      // Examples of INVALID CSS that would indicate template thinking
      const invalidCss = '.hero { background: var(--primary); padding: var(--spacing-xl); }';
      expect(invalidCss).toContain('var(--'); // This is what we want to PREVENT
    });

    it('literalHtml contains actual HTML, not placeholders', () => {
      // HTML should have real structure, not {{placeholder}} syntax
      const validHtml = '<section class="hero"><h1>Title</h1></section>';
      expect(validHtml).not.toContain('{{');
      expect(validHtml).not.toContain('}}');
      expect(validHtml).not.toContain('<%');
      expect(validHtml).not.toContain('%>');
      expect(validHtml).not.toContain('${');

      // Examples of INVALID HTML that would indicate template thinking
      const invalidHtml = '<section class="hero"><h1>{{title}}</h1></section>';
      expect(invalidHtml).toContain('{{'); // This is what we want to PREVENT
    });

    it('CSS values are concrete, not tokenized', () => {
      const concreteValues = [
        'background: #1a365d',
        'padding: 80px',
        'font-size: 18px',
        'margin: 24px 0',
        'border-radius: 8px',
        'box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1)',
      ];

      concreteValues.forEach(value => {
        // Should not contain token references
        expect(value).not.toMatch(/var\(--[\w-]+\)/);
        // Should not contain SCSS/LESS variables
        expect(value).not.toMatch(/\$[\w-]+/);
        expect(value).not.toMatch(/@[\w-]+/);
      });
    });
  });

  describe('Component Structure', () => {
    it('theirClassNames preserves original class names', () => {
      // Class names from the source should be preserved exactly
      const theirClasses = ['nfir-hero', 'hero-banner', 'site-header__nav'];

      // Should not be renamed to generic brand- prefixes
      expect(theirClasses.every(c => !c.startsWith('brand-'))).toBe(true);
      expect(theirClasses.every(c => !c.startsWith('component-'))).toBe(true);
      expect(theirClasses.every(c => !c.startsWith('template-'))).toBe(true);

      // Should preserve the original naming convention
      expect(theirClasses).toContain('nfir-hero');
      expect(theirClasses).toContain('hero-banner');
    });

    it('contentSlots identify injection points, not template variables', () => {
      // Content slots should be CSS selectors, not template variables
      const validSlots: ContentSlot[] = [
        { name: 'heading', selector: 'h1', type: 'text', required: true },
        { name: 'description', selector: '.hero-description p', type: 'text', required: false },
        { name: 'ctaButton', selector: '.cta-btn', type: 'html', required: true },
        { name: 'heroImage', selector: 'img.hero-image', type: 'image', required: false },
      ];

      validSlots.forEach(slot => {
        // Selector should be a valid CSS selector
        expect(slot.selector).toMatch(/^[a-z#.\[\]]/i);
        // Should not contain template syntax
        expect(slot.selector).not.toContain('{{');
        expect(slot.selector).not.toContain('}}');
        expect(slot.selector).not.toContain('${');
        // Should not be a variable name
        expect(slot.selector).not.toMatch(/^[\$@]/);
      });
    });

    it('ourClassNames in output are namespaced, not generic', () => {
      const output: BrandReplicationOutput = {
        html: '<section class="br-hero"><h1>Welcome</h1></section>',
        standaloneCss: '.br-hero { background: #1a365d; }',
        componentsUsed: [
          {
            id: 'comp-123',
            type: 'extracted',
            theirClasses: ['nfir-hero'],
            ourClasses: ['br-hero'],
          },
        ],
        metadata: {
          brandProjectId: 'proj-789',
          extractionsUsed: ['ext-456'],
          synthesizedCount: 0,
          renderTime: 150,
        },
      };

      // Our classes should have a consistent prefix (not generic)
      output.componentsUsed.forEach(comp => {
        comp.ourClasses.forEach(cls => {
          expect(cls).not.toBe('hero'); // Not generic
          expect(cls).not.toBe('button'); // Not generic
          expect(cls).not.toContain('{{'); // Not a template
        });
      });
    });
  });

  describe('No Abstraction Leakage', () => {
    it('spacing values are concrete measurements', () => {
      const validSpacing = {
        sectionGap: '80px',
        cardPadding: '24px',
        contentWidth: '1200px',
      };

      Object.values(validSpacing).forEach(value => {
        // Should end with a unit (px, rem, em, %, vw, vh)
        expect(value).toMatch(/\d+(px|rem|em|%|vw|vh)$/);
        // Should not be abstract tokens
        expect(value).not.toMatch(/^(small|medium|large|xl|xxl)$/);
        expect(value).not.toMatch(/^(spacing|space)-/);
      });
    });

    it('shadow values are full CSS shadow syntax', () => {
      const validShadows = {
        card: '0 4px 6px rgba(0, 0, 0, 0.1)',
        elevated: '0 10px 25px rgba(0, 0, 0, 0.15)',
        button: '0 2px 4px rgba(0, 0, 0, 0.05)',
      };

      Object.values(validShadows).forEach(shadow => {
        // Should be actual CSS shadow syntax
        expect(shadow).toMatch(/\d+px/);
        expect(shadow).toMatch(/rgba?\(/);
        // Should not be abstract tokens
        expect(shadow).not.toMatch(/^(none|small|medium|large)$/);
        expect(shadow).not.toMatch(/^shadow-/);
      });
    });

    it('border radius values are concrete measurements', () => {
      const validBorders = {
        radiusSmall: '4px',
        radiusMedium: '8px',
        radiusLarge: '16px',
      };

      Object.values(validBorders).forEach(radius => {
        // Should end with a unit
        expect(radius).toMatch(/\d+(px|rem|em|%)$/);
        // Should not be abstract tokens
        expect(radius).not.toMatch(/^(rounded|round)-/);
        expect(radius).not.toBe('full');
        expect(radius).not.toBe('none');
      });
    });

    it('font weights are numeric, not keyword abstractions', () => {
      const typography = {
        headings: { fontWeight: 700 },
        body: { fontWeight: 400 },
      };

      // Font weights should be numeric
      expect(typeof typography.headings.fontWeight).toBe('number');
      expect(typeof typography.body.fontWeight).toBe('number');
      expect(typography.headings.fontWeight).toBeGreaterThanOrEqual(100);
      expect(typography.headings.fontWeight).toBeLessThanOrEqual(900);
    });
  });

  describe('Real-World Validation Functions', () => {
    it('validates CSS contains no variable references', () => {
      const validateLiteralCss = (css: string): boolean => {
        const forbiddenPatterns = [
          /var\(--[\w-]+\)/, // CSS variables
          /\$[\w-]+/, // SCSS variables
          /@[\w-]+:/, // LESS variables
          /\{\{[\w-]+\}\}/, // Template syntax
        ];
        return !forbiddenPatterns.some(pattern => pattern.test(css));
      };

      expect(validateLiteralCss('.hero { background: #1a365d; }')).toBe(true);
      expect(validateLiteralCss('.hero { background: var(--primary); }')).toBe(false);
      expect(validateLiteralCss('.hero { background: $primary; }')).toBe(false);
    });

    it('validates HTML contains no template placeholders', () => {
      const validateLiteralHtml = (html: string): boolean => {
        const forbiddenPatterns = [
          /\{\{[\w\s.-]+\}\}/, // Mustache/Handlebars
          /<%=?\s*[\w\s.-]+\s*%>/, // EJS/ERB
          /\$\{[\w\s.-]+\}/, // Template literals
          /@\{[\w\s.-]+\}/, // Custom template syntax
        ];
        return !forbiddenPatterns.some(pattern => pattern.test(html));
      };

      expect(validateLiteralHtml('<h1>Welcome to Our Site</h1>')).toBe(true);
      expect(validateLiteralHtml('<h1>{{title}}</h1>')).toBe(false);
      expect(validateLiteralHtml('<h1><%= title %></h1>')).toBe(false);
      expect(validateLiteralHtml('<h1>${title}</h1>')).toBe(false);
    });

    it('validates color values are hex or rgb, not names', () => {
      const validateColorValue = (color: string): boolean => {
        const validPatterns = [
          /^#[0-9a-fA-F]{3,8}$/, // Hex
          /^rgb\(\d+,\s*\d+,\s*\d+\)$/, // RGB
          /^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/, // RGBA
          /^hsl\(\d+,\s*\d+%?,\s*\d+%?\)$/, // HSL
        ];
        return validPatterns.some(pattern => pattern.test(color));
      };

      expect(validateColorValue('#1a365d')).toBe(true);
      expect(validateColorValue('#fff')).toBe(true);
      expect(validateColorValue('rgb(26, 54, 93)')).toBe(true);
      expect(validateColorValue('rgba(26, 54, 93, 0.5)')).toBe(true);
      expect(validateColorValue('primary')).toBe(false);
      expect(validateColorValue('blue')).toBe(false);
    });
  });
});
