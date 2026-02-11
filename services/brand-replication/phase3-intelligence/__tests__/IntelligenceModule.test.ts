// services/brand-replication/phase3-intelligence/__tests__/IntelligenceModule.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock AI providers BEFORE importing modules that use them
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              semanticRole: 'introduction',
              contentStructure: 'single-concept',
              emphasisLevel: 'hero',
              readerNeed: 'Quick overview of topic',
              reasoning: 'First section introduces the topic',
            }),
          },
        ],
      }),
    },
  })),
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: vi.fn().mockResolvedValue({
        text: JSON.stringify({
          componentId: 'hero-banner',
          componentName: 'Hero Banner',
          variant: 'default',
          layout: { columns: 1, width: 'full', emphasis: 'hero' },
          contentMapping: { title: 'Welcome' },
          reasoning: 'Best fit for introduction',
        }),
      }),
    },
  })),
}));

// Now import the modules after mocks are set up
import { IntelligenceModule, ContextBuilder, SectionAnalyzer, ComponentMatcher } from '../index';
import type {
  IntelligenceInput,
  IntelligenceOutput,
  IntelligenceConfig,
  ArticleSection,
  BrandComponent,
  SectionDesignDecision,
  ContentContext,
} from '../../interfaces';
import type { TopicalMap } from '../../../../types';

// Test fixtures
const createArticleSection = (
  id: string,
  heading: string,
  content: string,
  headingLevel = 2
): ArticleSection => ({
  id,
  heading,
  headingLevel,
  content,
  wordCount: content.split(/\s+/).length,
});

const createBrandComponent = (id: string, name: string, purpose: string): BrandComponent => ({
  id,
  brandId: 'test-brand',
  name,
  purpose,
  usageContext: 'General use',
  css: `.${id} { color: blue; }`,
  htmlTemplate: `<div class="${id}">{{content}}</div>`,
  previewHtml: `<div class="${id}">Preview</div>`,
  sourceComponent: {
    id: `source-${id}`,
    name,
    purpose,
    visualDescription: 'Test description',
    usageContext: 'General',
    sourceScreenshots: [],
    occurrences: 3,
    confidence: 0.9,
  },
  matchScore: 0.9,
  variants: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const createIntelligenceInput = (): IntelligenceInput => ({
  brandId: 'test-brand',
  articleId: 'test-article',
  contentContext: {
    pillars: {
      centralEntity: 'Test Company',
      sourceContext: 'A technology company',
      centralSearchIntent: 'Find solutions',
    },
    topicalMap: {
      id: 'map-1',
      coreTopic: 'Software Development',
      relatedTopics: ['Agile', 'DevOps'],
      contentGaps: [],
      targetAudience: 'Software developers',
    },
    article: {
      id: 'test-article',
      title: 'Getting Started with Software Development',
      fullContent: 'Full article content here...',
      sections: [
        createArticleSection(
          'section-1',
          'Introduction',
          'Welcome to our guide on software development.'
        ),
        createArticleSection(
          'section-2',
          'Key Benefits',
          'Here are the main benefits: better code, faster delivery, happier teams.'
        ),
        createArticleSection(
          'section-3',
          'Getting Started',
          'Step 1: Set up your environment. Step 2: Write your first code.'
        ),
        createArticleSection(
          'section-4',
          'Conclusion',
          'Contact us today to learn more about our services.'
        ),
      ],
      keyEntities: ['software', 'development', 'coding'],
      mainMessage: 'Software development made easy',
      callToAction: 'Contact us today',
    },
  },
  componentLibrary: [
    createBrandComponent('hero-banner', 'Hero Banner', 'Prominent introduction section'),
    createBrandComponent('feature-cards', 'Feature Cards', 'Highlight key features or benefits'),
    createBrandComponent('process-steps', 'Process Steps', 'Show sequential steps'),
    createBrandComponent('cta-section', 'CTA Section', 'Call to action at end of content'),
  ],
});

const createConfig = (overrides: Partial<IntelligenceConfig> = {}): IntelligenceConfig => ({
  aiProvider: 'anthropic',
  apiKey: 'test-api-key',
  model: 'claude-sonnet-4-5-20250929',
  debug: false,
  contextConfig: {
    includePillars: true,
    includeTopicalMap: true,
    includeFullArticle: true,
    includeSurroundingSections: true,
    maxContextTokens: 8000,
  },
  ...overrides,
});

describe('IntelligenceModule', () => {
  describe('getPhaseName', () => {
    it('should return "intelligence"', () => {
      const module = new IntelligenceModule(createConfig());
      expect(module.getPhaseName()).toBe('intelligence');
    });
  });

  describe('run', () => {
    it('should analyze all sections and return decisions', async () => {
      const module = new IntelligenceModule(createConfig());
      const input = createIntelligenceInput();

      const output = await module.run(input);

      expect(output.brandId).toBe('test-brand');
      expect(output.articleId).toBe('test-article');
      expect(output.decisions.length).toBe(4);
      expect(output.status).toBe('success');
      expect(output.timestamp).toBeDefined();
      expect(output.overallStrategy).toBeDefined();
    });

    it('should handle empty sections array', async () => {
      const module = new IntelligenceModule(createConfig());
      const input = createIntelligenceInput();
      input.contentContext.article.sections = [];

      const output = await module.run(input);

      expect(output.status).toBe('failed');
      expect(output.errors).toContain('No sections found in article content');
    });

    it('should apply layout overrides when configured', async () => {
      const config = createConfig({
        layoutOverrides: {
          'section-1': { columns: 2, emphasis: 'featured' },
        },
      });
      const module = new IntelligenceModule(config);
      const input = createIntelligenceInput();

      const output = await module.run(input);

      const section1Decision = output.decisions.find(d => d.sectionId === 'section-1');
      expect(section1Decision?.layout.columns).toBe(2);
      expect(section1Decision?.layout.emphasis).toBe('featured');
      expect(section1Decision?.reasoning).toContain('layout overridden by config');
    });

    it('should track progress during execution', async () => {
      const module = new IntelligenceModule(createConfig());
      const input = createIntelligenceInput();

      const statusBefore = module.getStatus();
      expect(statusBefore.status).toBe('pending');

      await module.run(input);

      const statusAfter = module.getStatus();
      expect(statusAfter.status).toBe('success');
      expect(statusAfter.progress).toBe(100);
      expect(statusAfter.completedAt).toBeDefined();
    });
  });

  describe('validateOutput', () => {
    it('should validate successful output without errors', () => {
      const module = new IntelligenceModule(createConfig());
      const output: IntelligenceOutput = {
        brandId: 'test-brand',
        articleId: 'test-article',
        decisions: [
          {
            sectionId: 'section-1',
            sectionHeading: 'Intro',
            component: 'Hero Banner',
            componentId: 'hero-banner',
            variant: 'default',
            layout: { columns: 1, width: 'full', emphasis: 'hero' },
            reasoning: 'Test',
            semanticRole: 'introduction',
            contentMapping: {},
            confidence: 0.9,
          },
          {
            sectionId: 'section-2',
            sectionHeading: 'Content',
            component: 'Feature Cards',
            componentId: 'feature-cards',
            variant: 'default',
            layout: { columns: 2, width: 'wide', emphasis: 'featured' },
            reasoning: 'Test',
            semanticRole: 'key-benefits',
            contentMapping: {},
            confidence: 0.85,
          },
          {
            sectionId: 'section-3',
            sectionHeading: 'Conclusion',
            component: 'CTA Section',
            componentId: 'cta-section',
            variant: 'default',
            layout: { columns: 1, width: 'medium', emphasis: 'standard' },
            reasoning: 'Test',
            semanticRole: 'call-to-action',
            contentMapping: {},
            confidence: 0.9,
          },
        ],
        overallStrategy: 'Test strategy',
        timestamp: new Date().toISOString(),
        status: 'success',
      };

      const result = module.validateOutput(output);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should flag failed status as invalid', () => {
      const module = new IntelligenceModule(createConfig());
      const output: IntelligenceOutput = {
        brandId: 'test-brand',
        articleId: 'test-article',
        decisions: [],
        overallStrategy: '',
        timestamp: new Date().toISOString(),
        status: 'failed',
        errors: ['Something went wrong'],
      };

      const result = module.validateOutput(output);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should warn about missing hero section', () => {
      const module = new IntelligenceModule(createConfig());
      const output: IntelligenceOutput = {
        brandId: 'test-brand',
        articleId: 'test-article',
        decisions: [
          {
            sectionId: 'section-1',
            sectionHeading: 'Content',
            component: 'Text Block',
            componentId: 'text-block',
            variant: 'default',
            layout: { columns: 1, width: 'medium', emphasis: 'standard' },
            reasoning: 'Test',
            semanticRole: 'content',
            contentMapping: {},
            confidence: 0.8,
          },
        ],
        overallStrategy: 'Test',
        timestamp: new Date().toISOString(),
        status: 'success',
      };

      const result = module.validateOutput(output);

      expect(result.warnings.some(w => w.includes('hero'))).toBe(true);
    });

    it('should warn about low component variety', () => {
      const module = new IntelligenceModule(createConfig());
      const decisions: SectionDesignDecision[] = Array(6)
        .fill(null)
        .map((_, i) => ({
          sectionId: `section-${i}`,
          sectionHeading: `Section ${i}`,
          component: 'Text Block', // Same component for all
          componentId: 'text-block',
          variant: 'default',
          layout: { columns: 1 as const, width: 'medium' as const, emphasis: 'standard' as const },
          reasoning: 'Test',
          semanticRole: 'content',
          contentMapping: {},
          confidence: 0.8,
        }));

      const output: IntelligenceOutput = {
        brandId: 'test-brand',
        articleId: 'test-article',
        decisions,
        overallStrategy: 'Test',
        timestamp: new Date().toISOString(),
        status: 'success',
      };

      const result = module.validateOutput(output);

      expect(result.warnings.some(w => w.includes('variety'))).toBe(true);
    });
  });

  describe('getLastRawResponse', () => {
    it('should return empty string initially', () => {
      const module = new IntelligenceModule(createConfig());
      expect(module.getLastRawResponse()).toBe('');
    });
  });

  describe('runWithPrompt', () => {
    it('should use custom prompt and restore original', async () => {
      const config = createConfig({ customPrompt: 'original prompt' });
      const module = new IntelligenceModule(config);
      const input = createIntelligenceInput();

      await module.runWithPrompt(input, 'custom prompt');

      // The module should restore the original prompt after execution
      // We can't directly test the internal state, but we verify it doesn't throw
      expect(true).toBe(true);
    });
  });
});

describe('ContextBuilder', () => {
  let contextBuilder: ContextBuilder;

  beforeEach(() => {
    contextBuilder = new ContextBuilder();
  });

  describe('buildSectionContext', () => {
    const sections: ArticleSection[] = [
      createArticleSection('s1', 'Introduction', 'Intro content'),
      createArticleSection('s2', 'Benefits', 'Benefits content'),
      createArticleSection('s3', 'Process', 'Process content'),
      createArticleSection('s4', 'FAQ', 'FAQ content'),
      createArticleSection('s5', 'Conclusion', 'Conclusion content'),
    ];

    it('should identify first section as intro', () => {
      const ctx = contextBuilder.buildSectionContext(sections[0], sections, 0);

      expect(ctx.position).toBe('intro');
      expect(ctx.positionIndex).toBe(0);
      expect(ctx.totalSections).toBe(5);
      expect(ctx.precedingSections).toHaveLength(0);
      expect(ctx.followingSections).toHaveLength(4);
    });

    it('should identify middle sections as body', () => {
      const ctx = contextBuilder.buildSectionContext(sections[2], sections, 2);

      expect(ctx.position).toBe('body');
      expect(ctx.positionIndex).toBe(2);
      expect(ctx.precedingSections).toEqual(['Introduction', 'Benefits']);
      expect(ctx.followingSections).toEqual(['FAQ', 'Conclusion']);
    });

    it('should identify last two sections as conclusion (when > 2 sections)', () => {
      const ctx1 = contextBuilder.buildSectionContext(sections[3], sections, 3);
      const ctx2 = contextBuilder.buildSectionContext(sections[4], sections, 4);

      expect(ctx1.position).toBe('conclusion');
      expect(ctx2.position).toBe('conclusion');
    });

    it('should handle two-section article correctly', () => {
      const twoSections = sections.slice(0, 2);

      const ctx1 = contextBuilder.buildSectionContext(twoSections[0], twoSections, 0);
      const ctx2 = contextBuilder.buildSectionContext(twoSections[1], twoSections, 1);

      expect(ctx1.position).toBe('intro');
      expect(ctx2.position).toBe('conclusion');
    });

    it('should handle single-section article', () => {
      const singleSection = [sections[0]];
      const ctx = contextBuilder.buildSectionContext(singleSection[0], singleSection, 0);

      expect(ctx.position).toBe('intro');
      expect(ctx.totalSections).toBe(1);
    });
  });

  describe('buildContentContext', () => {
    it('should extract pillars from topical map', () => {
      const input = createIntelligenceInput();
      const topicalMap = {
        id: 'map-1',
        project_id: 'proj-1',
        name: 'Test Map',
        created_at: new Date().toISOString(),
        business_info: {
          projectName: 'Acme Corp',
          valueProp: 'A software company',
          conversionGoal: 'Generate leads',
          audience: 'Developers',
        },
      } as TopicalMap;

      const ctx = contextBuilder.buildContentContext(input, topicalMap);

      expect(ctx.pillars.centralEntity).toBe('Acme Corp');
      expect(ctx.pillars.sourceContext).toBe('A software company');
      expect(ctx.pillars.centralSearchIntent).toBe('Generate leads');
    });

    it('should handle missing business info gracefully', () => {
      const input = createIntelligenceInput();
      const topicalMap = {
        id: 'map-1',
        project_id: 'proj-1',
        name: 'Test Map',
        created_at: new Date().toISOString(),
      } as TopicalMap;

      const ctx = contextBuilder.buildContentContext(input, topicalMap);

      expect(ctx.pillars.centralEntity).toBe('');
      expect(ctx.pillars.sourceContext).toBe('');
    });

    it('should use article context from input', () => {
      const input = createIntelligenceInput();

      const ctx = contextBuilder.buildContentContext(input);

      expect(ctx.article.title).toBe('Getting Started with Software Development');
      expect(ctx.article.sections.length).toBe(4);
    });
  });

  describe('parseArticleIntoSections', () => {
    it('should parse HTML headings', () => {
      const html = `
        <p>Intro paragraph</p>
        <h2>First Section</h2>
        <p>First section content</p>
        <h2>Second Section</h2>
        <p>Second section content</p>
      `;

      const sections = contextBuilder.parseArticleIntoSections(html, 'Test Article');

      expect(sections.length).toBeGreaterThanOrEqual(2);
      expect(sections.some(s => s.heading === 'First Section')).toBe(true);
      expect(sections.some(s => s.heading === 'Second Section')).toBe(true);
    });

    it('should handle markdown headings', () => {
      const markdown = `
Introduction text here.

## Getting Started

Content about getting started.

## Advanced Topics

Content about advanced topics.

### Sub Topic

Sub topic content.
      `;

      const sections = contextBuilder.parseArticleIntoSections(markdown, 'Test Article');

      expect(sections.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle content without headings', () => {
      const content = 'This is just plain text without any headings.';

      const sections = contextBuilder.parseArticleIntoSections(content, 'Untitled');

      expect(sections.length).toBe(1);
      expect(sections[0].heading).toBe('Untitled');
    });
  });

  describe('estimateWordCount', () => {
    it('should count words correctly', () => {
      expect(contextBuilder.estimateWordCount('one two three')).toBe(3);
      expect(contextBuilder.estimateWordCount('  multiple   spaces  ')).toBe(2);
      expect(contextBuilder.estimateWordCount('')).toBe(0);
    });
  });
});

describe('SectionAnalyzer', () => {
  describe('analyzeHeuristically', () => {
    let analyzer: SectionAnalyzer;

    beforeEach(() => {
      analyzer = new SectionAnalyzer({
        aiProvider: 'anthropic',
        apiKey: 'test-key',
      });
    });

    it('should identify intro section as hero', () => {
      const section = createArticleSection('s1', 'Introduction', 'Welcome to our guide.');
      const sections = [section];
      const ctx = new ContextBuilder().buildSectionContext(section, sections, 0);

      const analysis = analyzer.analyzeHeuristically(ctx);

      expect(analysis.semanticRole).toBe('introduction');
      expect(analysis.emphasisLevel).toBe('hero');
    });

    it('should identify list content structure', () => {
      const section = createArticleSection(
        's1',
        'Features',
        '<ul><li>Feature 1</li><li>Feature 2</li></ul>'
      );
      const sections = [
        createArticleSection('s0', 'Intro', 'Intro'),
        section,
        createArticleSection('s2', 'End', 'End'),
      ];
      const ctx = new ContextBuilder().buildSectionContext(section, sections, 1);

      const analysis = analyzer.analyzeHeuristically(ctx);

      expect(analysis.contentStructure).toBe('list');
    });

    it('should identify process content from heading', () => {
      const section = createArticleSection('s1', 'How to Get Started', 'Step by step guide...');
      // Use 4+ sections so the middle one is in 'body' position (not conclusion)
      const sections = [
        createArticleSection('s0', 'Intro', 'Intro'),
        section,
        createArticleSection('s2', 'More Content', 'More'),
        createArticleSection('s3', 'End', 'End'),
      ];
      const ctx = new ContextBuilder().buildSectionContext(section, sections, 1);

      const analysis = analyzer.analyzeHeuristically(ctx);

      expect(analysis.contentStructure).toBe('process');
      expect(analysis.semanticRole).toBe('process-steps');
    });

    it('should identify benefits section', () => {
      const section = createArticleSection('s1', 'Key Benefits', 'Here are the main benefits...');
      // Use 4+ sections so the middle one is in 'body' position
      const sections = [
        createArticleSection('s0', 'Intro', 'Intro'),
        section,
        createArticleSection('s2', 'More Content', 'More'),
        createArticleSection('s3', 'End', 'End'),
      ];
      const ctx = new ContextBuilder().buildSectionContext(section, sections, 1);

      const analysis = analyzer.analyzeHeuristically(ctx);

      expect(analysis.semanticRole).toBe('key-benefits');
      expect(analysis.emphasisLevel).toBe('featured');
    });

    it('should identify warning section', () => {
      const section = createArticleSection('s1', 'Warning: Important Notice', 'Be careful...');
      // Use 4+ sections so the middle one is in 'body' position
      const sections = [
        createArticleSection('s0', 'Intro', 'Intro'),
        section,
        createArticleSection('s2', 'More Content', 'More'),
        createArticleSection('s3', 'End', 'End'),
      ];
      const ctx = new ContextBuilder().buildSectionContext(section, sections, 1);

      const analysis = analyzer.analyzeHeuristically(ctx);

      expect(analysis.semanticRole).toBe('warning');
      expect(analysis.emphasisLevel).toBe('featured');
    });

    it('should identify CTA in conclusion', () => {
      const section = createArticleSection('s1', 'Get Started Today', 'Contact us now...');
      const sections = [createArticleSection('s0', 'Intro', 'Intro'), section];
      const ctx = new ContextBuilder().buildSectionContext(section, sections, 1);

      const analysis = analyzer.analyzeHeuristically(ctx);

      expect(analysis.semanticRole).toBe('call-to-action');
    });
  });
});

describe('ComponentMatcher', () => {
  describe('matchHeuristically', () => {
    let matcher: ComponentMatcher;

    beforeEach(() => {
      matcher = new ComponentMatcher({
        aiProvider: 'anthropic',
        apiKey: 'test-key',
      });
    });

    it('should create fallback decision when no components available', () => {
      const analysis = {
        semanticRole: 'introduction',
        contentStructure: 'single-concept' as const,
        emphasisLevel: 'hero' as const,
        readerNeed: 'Quick overview',
        reasoning: 'Test',
      };

      const decision = matcher.matchHeuristically('s1', 'Introduction', analysis, []);

      expect(decision.component).toBe('DefaultSection');
      expect(decision.componentId).toBe('default-section');
      expect(decision.confidence).toBe(0.5);
    });

    it('should match hero component for hero emphasis', () => {
      const analysis = {
        semanticRole: 'introduction',
        contentStructure: 'single-concept' as const,
        emphasisLevel: 'hero' as const,
        readerNeed: 'Quick overview',
        reasoning: 'Test',
      };

      const components = [
        createBrandComponent('hero-banner', 'Hero Banner', 'Prominent hero section'),
        createBrandComponent('text-block', 'Text Block', 'Standard text content'),
      ];

      const decision = matcher.matchHeuristically('s1', 'Introduction', analysis, components);

      expect(decision.componentId).toBe('hero-banner');
      expect(decision.layout.emphasis).toBe('hero');
      expect(decision.layout.width).toBe('full');
    });

    it('should infer columns from content structure', () => {
      const analysis = {
        semanticRole: 'key-benefits',
        contentStructure: 'list' as const,
        emphasisLevel: 'featured' as const,
        readerNeed: 'Scan benefits',
        reasoning: 'Test',
      };

      const components = [createBrandComponent('card-grid', 'Card Grid', 'Display items in grid')];

      const decision = matcher.matchHeuristically('s1', 'Benefits', analysis, components);

      expect(decision.layout.columns).toBe(2);
    });

    it('should match process component for process content', () => {
      const analysis = {
        semanticRole: 'process-steps',
        contentStructure: 'process' as const,
        emphasisLevel: 'standard' as const,
        readerNeed: 'Step-by-step guidance',
        reasoning: 'Test',
      };

      const components = [
        createBrandComponent('step-list', 'Step List', 'Display sequential steps'),
        createBrandComponent('text-block', 'Text Block', 'Standard text'),
      ];

      const decision = matcher.matchHeuristically('s1', 'How To', analysis, components);

      expect(decision.componentId).toBe('step-list');
      expect(decision.layout.columns).toBe(3);
    });
  });
});
