/**
 * Brand Replication Pipeline Integration Tests
 *
 * End-to-end tests verifying the full brand replication pipeline:
 * discovery -> extraction -> composition
 *
 * @module services/__tests__/brandReplicationIntegration.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderContent, type ArticleContent } from '../publishing/renderer';
import { htmlToArticleContent } from '../publishing/renderer/contentAdapter';
import { ComponentLibrary } from '../brand-extraction/ComponentLibrary';
import { BrandAwareComposer } from '../brand-composer/BrandAwareComposer';
import type { ExtractedComponent, BrandReplicationOutput } from '../../types/brandExtraction';
import type { StyledContentOutput } from '../../types/publishing';

// ============================================================================
// MOCKS
// ============================================================================

// Mock Supabase client
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
        single: vi.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116' } }))
      })),
      upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'test-id' }, error: null }))
        }))
      }))
    }))
  }
}));

// ============================================================================
// TEST DATA FIXTURES
// ============================================================================

/**
 * Create a mock extracted component with literal CSS/HTML (no abstractions)
 */
function createMockComponent(overrides: Partial<ExtractedComponent> = {}): ExtractedComponent {
  return {
    id: 'comp-test-123',
    extractionId: 'ext-test-456',
    projectId: 'proj-test-789',
    visualDescription: 'Hero section with gradient background and CTA button',
    componentType: 'hero',
    literalHtml: `<section class="nfir-hero">
      <h1>Welcome to Our Service</h1>
      <p>Professional solutions for your needs</p>
      <a href="/contact" class="cta-btn">Get Started</a>
    </section>`,
    literalCss: `.nfir-hero {
      background: linear-gradient(135deg, #1a365d 0%, #2d4a7c 100%);
      padding: 80px 40px;
      text-align: center;
      color: #ffffff;
    }
    .nfir-hero h1 {
      font-family: Montserrat, sans-serif;
      font-weight: 700;
      font-size: 3rem;
      margin-bottom: 1.5rem;
    }
    .cta-btn {
      background: #e53e3e;
      color: #ffffff;
      padding: 16px 32px;
      border-radius: 8px;
      font-weight: 600;
      text-decoration: none;
    }`,
    theirClassNames: ['nfir-hero', 'cta-btn'],
    contentSlots: [
      { name: 'heading', selector: 'h1', type: 'text', required: true },
      { name: 'description', selector: 'p', type: 'text', required: false },
      { name: 'cta', selector: '.cta-btn', type: 'html', required: true }
    ],
    createdAt: new Date().toISOString(),
    ...overrides
  };
}

/**
 * Create mock article content for rendering
 */
function createMockArticleContent(): ArticleContent {
  return {
    title: 'Professional Cleaning Services',
    sections: [
      {
        id: 'section-intro',
        heading: 'Introduction',
        headingLevel: 2,
        content: '<p>We provide top-quality cleaning services for homes and businesses.</p>'
      },
      {
        id: 'section-services',
        heading: 'Our Services',
        headingLevel: 2,
        content: '<ul><li>Residential cleaning</li><li>Commercial cleaning</li><li>Deep cleaning</li></ul>'
      },
      {
        id: 'section-faq',
        heading: 'Frequently Asked Questions',
        headingLevel: 2,
        content: '<div itemscope itemtype="https://schema.org/FAQPage"><div itemprop="mainEntity">Q: How often?</div></div>'
      }
    ]
  };
}

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Brand Replication Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // FULL PIPELINE TESTS
  // ==========================================================================

  describe('Full Pipeline: discovery -> extraction -> composition', () => {
    it('routes to BrandAwareComposer when extractions exist', async () => {
      // Arrange: Mock ComponentLibrary to return extracted components
      const mockComponent = createMockComponent();
      const mockGetAll = vi.fn().mockResolvedValue([mockComponent]);

      vi.spyOn(ComponentLibrary.prototype, 'getAll').mockImplementation(mockGetAll);

      const articleContent = createMockArticleContent();

      // Act: Call renderContent with a project that has brand extraction
      const result = await renderContent(articleContent, {
        projectId: 'proj-with-extraction',
        aiApiKey: 'test-api-key',
        aiProvider: 'gemini'
      });

      // Assert: Verify the BrandAwareComposer path was taken
      expect(mockGetAll).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.html).toBeTruthy();
      expect(result.css).toBeTruthy();

      // BrandAwareComposer produces HTML with brand-article wrapper
      expect(result.html).toContain('brand-article');
    });

    it('passes extracted components to BrandAwareComposer correctly', async () => {
      // Arrange: Create multiple extracted components
      const heroComponent = createMockComponent({
        id: 'comp-hero',
        componentType: 'hero',
        visualDescription: 'Hero section with gradient'
      });

      const sectionComponent = createMockComponent({
        id: 'comp-section',
        componentType: 'section',
        visualDescription: 'Content section with card styling',
        literalCss: `.content-card {
          background: #ffffff;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }`
      });

      vi.spyOn(ComponentLibrary.prototype, 'getAll').mockResolvedValue([
        heroComponent,
        sectionComponent
      ]);

      // Act
      const composer = new BrandAwareComposer({
        projectId: 'proj-multi-components',
        aiProvider: 'gemini',
        apiKey: 'test-key'
      });

      const result = await composer.compose(createMockArticleContent());

      // Assert: Output should contain brand styling
      expect(result.html).toContain('brand-article');
      expect(result.standaloneCss).toBeTruthy();
      expect(result.metadata.brandProjectId).toBe('proj-multi-components');
    });

    it('includes metadata about components used', async () => {
      // Arrange
      const mockComponent = createMockComponent();
      vi.spyOn(ComponentLibrary.prototype, 'getAll').mockResolvedValue([mockComponent]);

      // Act
      const composer = new BrandAwareComposer({
        projectId: 'proj-test',
        aiProvider: 'gemini',
        apiKey: 'test-key'
      });

      const result = await composer.compose(createMockArticleContent());

      // Assert
      expect(result.metadata).toBeDefined();
      expect(result.metadata.brandProjectId).toBe('proj-test');
      expect(result.metadata.renderTime).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.metadata.extractionsUsed)).toBe(true);
    });
  });

  // ==========================================================================
  // FALLBACK BEHAVIOR TESTS
  // ==========================================================================

  describe('Fallback Behavior', () => {
    it('uses BlueprintRenderer when no brand extraction exists', async () => {
      // Arrange: Mock ComponentLibrary to return empty array
      vi.spyOn(ComponentLibrary.prototype, 'getAll').mockResolvedValue([]);

      const articleContent = createMockArticleContent();

      // Act & Assert: Should throw because no blueprint provided and no extraction
      await expect(
        renderContent(articleContent, {
          projectId: 'proj-no-extraction',
          aiApiKey: 'test-api-key'
        })
      ).rejects.toThrow('No brand extraction and no blueprint provided');
    });

    it('falls back gracefully when component retrieval fails', async () => {
      // Arrange: Mock ComponentLibrary to throw an error
      vi.spyOn(ComponentLibrary.prototype, 'getAll').mockRejectedValue(
        new Error('Database connection failed')
      );

      const articleContent = createMockArticleContent();

      // Act & Assert: Should fall back to BlueprintRenderer path
      // and fail because no blueprint provided
      await expect(
        renderContent(articleContent, {
          projectId: 'proj-error',
          aiApiKey: 'test-api-key'
        })
      ).rejects.toThrow();
    });

    it('produces fallback CSS when no components match', async () => {
      // Arrange: Return components but none match the content
      vi.spyOn(ComponentLibrary.prototype, 'getAll').mockResolvedValue([]);

      const composer = new BrandAwareComposer({
        projectId: 'proj-no-match',
        aiProvider: 'gemini',
        apiKey: 'test-key'
      });

      // Act
      const result = await composer.compose(createMockArticleContent());

      // Assert: Should produce fallback CSS
      expect(result.standaloneCss).toBeTruthy();
      expect(result.standaloneCss).toContain('brand-article');
      expect(result.metadata.synthesizedCount).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // ANTI-TEMPLATE ENFORCEMENT TESTS
  // ==========================================================================

  describe('Anti-Template Enforcement', () => {
    it('extracted components have literal HTML without placeholders', () => {
      const component = createMockComponent();

      // Verify no template placeholders in HTML
      expect(component.literalHtml).not.toContain('{{');
      expect(component.literalHtml).not.toContain('}}');
      expect(component.literalHtml).not.toContain('<%');
      expect(component.literalHtml).not.toContain('%>');
      expect(component.literalHtml).not.toContain('${');

      // Should have actual HTML structure
      expect(component.literalHtml).toContain('<section');
      expect(component.literalHtml).toContain('</section>');
    });

    it('extracted components have literal CSS without variables', () => {
      const component = createMockComponent();

      // Verify no CSS variable references
      expect(component.literalCss).not.toContain('var(--');
      expect(component.literalCss).not.toContain('$'); // SCSS variables

      // Should have actual CSS values
      expect(component.literalCss).toContain('#'); // Hex colors
      expect(component.literalCss).toContain('px'); // Pixel values
    });

    it('CSS contains actual color values like hex codes', () => {
      const component = createMockComponent();

      // Verify actual hex color values are present
      const hexColorPattern = /#[0-9a-fA-F]{3,8}/g;
      const hexMatches = component.literalCss.match(hexColorPattern);

      expect(hexMatches).toBeTruthy();
      expect(hexMatches!.length).toBeGreaterThan(0);

      // Verify colors are not abstract names
      expect(component.literalCss).not.toMatch(/:\s*primary\s*[;}\s]/);
      expect(component.literalCss).not.toMatch(/:\s*secondary\s*[;}\s]/);
    });

    it('font families are literal strings with fallbacks', () => {
      const component = createMockComponent();

      // Verify actual font family declarations
      expect(component.literalCss).toContain('Montserrat');
      expect(component.literalCss).toContain('sans-serif');

      // Should not be abstract references
      expect(component.literalCss).not.toContain('var(--font');
      expect(component.literalCss).not.toContain('$font');
    });

    it('preserves original class names from source', () => {
      const component = createMockComponent();

      // Class names should be the original ones from the source
      expect(component.theirClassNames).toContain('nfir-hero');
      expect(component.theirClassNames).toContain('cta-btn');

      // Should not be generic/renamed
      expect(component.theirClassNames.every(c => !c.startsWith('component-'))).toBe(true);
      expect(component.theirClassNames.every(c => !c.startsWith('template-'))).toBe(true);
    });

    it('validates CSS contains no variable references at runtime', () => {
      // Validation function that would be used during extraction
      const validateLiteralCss = (css: string): boolean => {
        const forbiddenPatterns = [
          /var\(--[\w-]+\)/, // CSS variables
          /\$[\w-]+/, // SCSS variables
          /@[\w-]+:/, // LESS variables
          /\{\{[\w-]+\}\}/, // Template syntax
        ];
        return !forbiddenPatterns.some(pattern => pattern.test(css));
      };

      const component = createMockComponent();
      expect(validateLiteralCss(component.literalCss)).toBe(true);

      // Test that invalid CSS would fail
      const invalidCss = '.hero { background: var(--primary); }';
      expect(validateLiteralCss(invalidCss)).toBe(false);
    });
  });

  // ==========================================================================
  // OUTPUT QUALITY TESTS
  // ==========================================================================

  describe('Output Quality', () => {
    it('preserves SEO semantic markup in output', async () => {
      vi.spyOn(ComponentLibrary.prototype, 'getAll').mockResolvedValue([]);

      const composer = new BrandAwareComposer({
        projectId: 'proj-seo',
        aiProvider: 'gemini',
        apiKey: 'test-key'
      });

      const contentWithSchema = {
        title: 'Test Article',
        sections: [{
          id: 'faq-section',
          heading: 'FAQ',
          headingLevel: 2,
          content: '<div itemscope itemtype="https://schema.org/FAQPage"><div itemprop="mainEntity">Q1</div></div>'
        }]
      };

      const result = await composer.compose(contentWithSchema);

      // SEO markup should be preserved
      expect(result.html).toContain('itemscope');
      expect(result.html).toContain('FAQPage');
      expect(result.html).toContain('itemprop');
    });

    it('escapes HTML in headings to prevent XSS', async () => {
      vi.spyOn(ComponentLibrary.prototype, 'getAll').mockResolvedValue([]);

      const composer = new BrandAwareComposer({
        projectId: 'proj-xss',
        aiProvider: 'gemini',
        apiKey: 'test-key'
      });

      const contentWithScript = {
        title: '<script>alert("xss")</script>Test',
        sections: [{
          id: 'section-1',
          heading: '<img onerror="alert(1)" src="x">Heading',
          headingLevel: 2,
          content: '<p>Content</p>'
        }]
      };

      const result = await composer.compose(contentWithScript);

      // Script tags should be escaped in titles/headings
      expect(result.html).not.toContain('<script>');
      expect(result.html).toContain('&lt;script&gt;');

      // Malicious img tag should be escaped - quotes become &quot;
      // The output will have: &lt;img onerror=&quot;alert(1)&quot; src=&quot;x&quot;&gt;
      expect(result.html).toContain('&lt;img');
      // Verify that the onerror is not rendered as an actual attribute
      // (it should be escaped as &quot;onerror=&quot; not as unescaped quotes)
      expect(result.html).toContain('&quot;');
    });

    it('generates standalone CSS that can be embedded', async () => {
      const component = createMockComponent();
      vi.spyOn(ComponentLibrary.prototype, 'getAll').mockResolvedValue([component]);

      const composer = new BrandAwareComposer({
        projectId: 'proj-css',
        aiProvider: 'gemini',
        apiKey: 'test-key'
      });

      const result = await composer.compose(createMockArticleContent());

      // CSS should be complete and standalone
      expect(result.standaloneCss).toBeTruthy();
      expect(result.standaloneCss.length).toBeGreaterThan(100);

      // Should contain class definitions
      expect(result.standaloneCss).toContain('{');
      expect(result.standaloneCss).toContain('}');
    });
  });

  // ==========================================================================
  // CONTENT ADAPTER TESTS
  // ==========================================================================

  describe('Content Adapter: htmlToArticleContent', () => {
    it('parses HTML with headings into sections', () => {
      const html = `
        <p>Introduction paragraph.</p>
        <h2>First Section</h2>
        <p>First section content.</p>
        <h2>Second Section</h2>
        <p>Second section content.</p>
      `;

      const result = htmlToArticleContent(html, 'Test Article');

      expect(result.title).toBe('Test Article');
      expect(result.sections.length).toBeGreaterThanOrEqual(2);

      // Should have extracted headings
      const headings = result.sections
        .filter(s => s.heading)
        .map(s => s.heading);

      expect(headings).toContain('First Section');
      expect(headings).toContain('Second Section');
    });

    it('handles HTML without headings', () => {
      const html = '<p>Just some content without any headings.</p>';

      const result = htmlToArticleContent(html, 'Simple Article');

      expect(result.title).toBe('Simple Article');
      expect(result.sections.length).toBe(1);
      expect(result.sections[0].content).toContain('Just some content');
    });

    it('preserves content between headings', () => {
      const html = `
        <h2>Features</h2>
        <ul>
          <li>Feature 1</li>
          <li>Feature 2</li>
        </ul>
        <p>Additional feature info.</p>
        <h2>Pricing</h2>
        <p>Pricing details.</p>
      `;

      const result = htmlToArticleContent(html, 'Product Page');

      const featuresSection = result.sections.find(s => s.heading === 'Features');
      expect(featuresSection).toBeDefined();
      expect(featuresSection!.content).toContain('<ul>');
      expect(featuresSection!.content).toContain('Feature 1');
      expect(featuresSection!.content).toContain('Additional feature info');
    });

    it('infers section types from heading text', () => {
      const html = `
        <h2>Frequently Asked Questions</h2>
        <p>FAQ content here.</p>
        <h2>Contact Us</h2>
        <p>Contact info.</p>
      `;

      const result = htmlToArticleContent(html, 'Info Page');

      const faqSection = result.sections.find(s => s.heading === 'Frequently Asked Questions');
      const contactSection = result.sections.find(s => s.heading === 'Contact Us');

      expect(faqSection?.type).toBe('faq');
      expect(contactSection?.type).toBe('cta');
    });
  });

  // ==========================================================================
  // COMPONENT LIBRARY INTEGRATION
  // ==========================================================================

  describe('ComponentLibrary Integration', () => {
    it('saves and retrieves components correctly', async () => {
      const mockComponent = createMockComponent();

      // Mock the save operation
      const mockUpsert = vi.fn().mockResolvedValue({ error: null });
      const mockSupabase = await import('../../lib/supabase');
      vi.mocked(mockSupabase.supabase.from).mockReturnValue({
        upsert: mockUpsert,
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [mockComponent], error: null })
        })
      } as any);

      const library = new ComponentLibrary('proj-123');

      // Save should not throw
      await expect(library.saveComponent(mockComponent)).resolves.not.toThrow();

      // Get all should return the component
      const components = await library.getAll();
      expect(Array.isArray(components)).toBe(true);
    });

    it('finds matching components by description', async () => {
      const heroComponent = createMockComponent({
        visualDescription: 'Hero section with large heading and gradient background'
      });

      vi.spyOn(ComponentLibrary.prototype, 'getAll').mockResolvedValue([heroComponent]);

      const library = new ComponentLibrary('proj-match');
      const match = await library.findMatchingComponent('hero section with heading');

      expect(match).toBeDefined();
      expect(match!.component.componentType).toBe('hero');
      expect(match!.confidence).toBeGreaterThan(0);
    });

    it('returns null when no components match', async () => {
      const heroComponent = createMockComponent({
        visualDescription: 'Hero section with gradient'
      });

      vi.spyOn(ComponentLibrary.prototype, 'getAll').mockResolvedValue([heroComponent]);

      const library = new ComponentLibrary('proj-nomatch');
      const match = await library.findMatchingComponent('footer navigation links');

      // Low match score should result in null
      expect(match === null || match.confidence < 0.3).toBe(true);
    });
  });
});

// ============================================================================
// DATA VALIDATION HELPERS (for test clarity)
// ============================================================================

describe('Brand Extraction Data Validation', () => {
  describe('validateLiteralCss', () => {
    const validateLiteralCss = (css: string): boolean => {
      const forbiddenPatterns = [
        /var\(--[\w-]+\)/, // CSS variables
        /\$[\w-]+/, // SCSS variables
        /@[\w-]+:/, // LESS variables
        /\{\{[\w-]+\}\}/, // Template syntax
      ];
      return !forbiddenPatterns.some(pattern => pattern.test(css));
    };

    it('accepts literal CSS values', () => {
      expect(validateLiteralCss('.hero { background: #1a365d; }')).toBe(true);
      expect(validateLiteralCss('.btn { padding: 16px 32px; }')).toBe(true);
      expect(validateLiteralCss('.text { color: rgba(0, 0, 0, 0.8); }')).toBe(true);
    });

    it('rejects CSS variable references', () => {
      expect(validateLiteralCss('.hero { background: var(--primary); }')).toBe(false);
      expect(validateLiteralCss('.btn { padding: var(--spacing-md); }')).toBe(false);
    });

    it('rejects SCSS variables', () => {
      expect(validateLiteralCss('.hero { background: $primary-color; }')).toBe(false);
    });

    it('rejects template syntax', () => {
      expect(validateLiteralCss('.hero { background: {{primaryColor}}; }')).toBe(false);
    });
  });

  describe('validateLiteralHtml', () => {
    const validateLiteralHtml = (html: string): boolean => {
      const forbiddenPatterns = [
        /\{\{[\w\s.-]+\}\}/, // Mustache/Handlebars
        /<%=?\s*[\w\s.-]+\s*%>/, // EJS/ERB
        /\$\{[\w\s.-]+\}/, // Template literals
        /@\{[\w\s.-]+\}/, // Custom template syntax
      ];
      return !forbiddenPatterns.some(pattern => pattern.test(html));
    };

    it('accepts literal HTML', () => {
      expect(validateLiteralHtml('<h1>Welcome to Our Site</h1>')).toBe(true);
      expect(validateLiteralHtml('<section class="hero"><p>Content</p></section>')).toBe(true);
    });

    it('rejects mustache placeholders', () => {
      expect(validateLiteralHtml('<h1>{{title}}</h1>')).toBe(false);
    });

    it('rejects EJS placeholders', () => {
      expect(validateLiteralHtml('<h1><%= title %></h1>')).toBe(false);
    });

    it('rejects template literal syntax', () => {
      expect(validateLiteralHtml('<h1>${title}</h1>')).toBe(false);
    });
  });

  describe('validateColorValue', () => {
    const validateColorValue = (color: string): boolean => {
      const validPatterns = [
        /^#[0-9a-fA-F]{3,8}$/, // Hex
        /^rgb\(\d+,\s*\d+,\s*\d+\)$/, // RGB
        /^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/, // RGBA
        /^hsl\(\d+,\s*\d+%?,\s*\d+%?\)$/, // HSL
      ];
      return validPatterns.some(pattern => pattern.test(color));
    };

    it('accepts hex colors', () => {
      expect(validateColorValue('#1a365d')).toBe(true);
      expect(validateColorValue('#fff')).toBe(true);
      expect(validateColorValue('#FF5733')).toBe(true);
    });

    it('accepts rgb/rgba colors', () => {
      expect(validateColorValue('rgb(26, 54, 93)')).toBe(true);
      expect(validateColorValue('rgba(26, 54, 93, 0.5)')).toBe(true);
    });

    it('rejects named colors', () => {
      expect(validateColorValue('primary')).toBe(false);
      expect(validateColorValue('secondary')).toBe(false);
      expect(validateColorValue('blue')).toBe(false);
    });
  });
});
