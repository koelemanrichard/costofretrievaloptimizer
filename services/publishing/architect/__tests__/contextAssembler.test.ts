/**
 * Context Assembler Tests
 *
 * Tests for the v2.0 context assembly functionality that gathers
 * rich context for intelligent layout decisions.
 *
 * @module services/publishing/architect/__tests__/contextAssembler.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  assembleRichContext,
  toArchitectInput,
  type RichArchitectContext,
  type ParsedSection,
  type IndustryDesignNorms,
} from '../contextAssembler';
import type { BusinessInfo, ContentBrief } from '../../../../types';

// Test data
const mockBusinessInfo: Partial<BusinessInfo> = {
  domain: 'example.com',
  projectName: 'Test Project',
  industry: 'technology',
  model: 'saas',
  valueProp: 'AI-powered analytics platform',
  audience: 'Data scientists and analysts',
  expertise: 'Machine learning and data visualization',
  language: 'en',
};

const mockArticleContent = `
<h1>How to Analyze Data with AI</h1>

<p>Data analysis has evolved significantly with the advent of AI technologies.</p>

<h2>Benefits of AI-Powered Analytics</h2>
<ul>
  <li>Faster insights</li>
  <li>Pattern recognition</li>
  <li>Predictive capabilities</li>
</ul>

<h2>Step-by-Step Process</h2>
<ol>
  <li>Collect your data</li>
  <li>Clean and prepare</li>
  <li>Apply AI models</li>
  <li>Interpret results</li>
</ol>

<h2>Frequently Asked Questions</h2>
<p><strong>Q: How long does it take?</strong></p>
<p>A: Most analyses complete within minutes.</p>

<h2>Conclusion</h2>
<p>AI analytics is the future of data-driven decision making.</p>
`;

const mockBrief: Partial<ContentBrief> = {
  targetKeyword: 'AI data analysis',
  metaDescription: 'Learn how to analyze data with AI',
  searchIntent: 'informational',
};

describe('contextAssembler', () => {
  describe('assembleRichContext', () => {
    it('should return a RichArchitectContext object', async () => {
      const context = await assembleRichContext(
        mockArticleContent,
        'How to Analyze Data with AI',
        'test-topic-123',
        'test-project-123',
        {
          businessInfo: mockBusinessInfo as BusinessInfo,
        }
      );

      expect(context).toBeDefined();
      expect(context.content).toBeDefined();
      expect(context.brand).toBeDefined();
      expect(context.market).toBeDefined();
      expect(context.intent).toBeDefined();
      expect(context.performance).toBeDefined();
    });

    it('should parse sections from content', async () => {
      const context = await assembleRichContext(
        mockArticleContent,
        'How to Analyze Data with AI',
        'test-topic-123',
        'test-project-123',
        {
          businessInfo: mockBusinessInfo as BusinessInfo,
        }
      );

      expect(context.content.sections).toBeDefined();
      expect(context.content.sections.length).toBeGreaterThan(0);
    });

    it('should include industry norms in market context', async () => {
      const context = await assembleRichContext(
        mockArticleContent,
        'How to Analyze Data with AI',
        'test-topic-123',
        'test-project-123',
        {
          businessInfo: mockBusinessInfo as BusinessInfo,
        }
      );

      expect(context.market.industryNorms).toBeDefined();
      expect(context.market.industryNorms.preferredStyle).toBeDefined();
    });

    it('should include brand context from business info', async () => {
      const context = await assembleRichContext(
        mockArticleContent,
        'How to Analyze Data with AI',
        'test-topic-123',
        'test-project-123',
        {
          businessInfo: mockBusinessInfo as BusinessInfo,
        }
      );

      expect(context.brand).toBeDefined();
      expect(context.brand.industry).toBe('technology');
    });
  });

  describe('toArchitectInput', () => {
    it('should convert rich context to architect input format', async () => {
      const context = await assembleRichContext(
        mockArticleContent,
        'How to Analyze Data with AI',
        'test-topic-123',
        'test-project-123',
        {
          businessInfo: mockBusinessInfo as BusinessInfo,
        }
      );

      const input = toArchitectInput(context, mockArticleContent, 'How to Analyze Data with AI');

      expect(input).toBeDefined();
      expect(input.articleContent).toBeDefined();
      expect(input.business).toBeDefined();
      expect(input.contentSignals).toBeDefined();
    });

    it('should include business context', async () => {
      const context = await assembleRichContext(
        mockArticleContent,
        'Test Article',
        'test-topic',
        'test-project',
        {
          businessInfo: mockBusinessInfo as BusinessInfo,
        }
      );

      const input = toArchitectInput(context, mockArticleContent, 'Test Article');

      expect(input.business.name).toBeDefined();
      expect(input.business.industry).toBe('technology');
    });
  });

  describe('industry norms', () => {
    it('should return appropriate norms for technology industry', async () => {
      const context = await assembleRichContext(
        mockArticleContent,
        'Test',
        'id',
        'proj',
        {
          businessInfo: { ...mockBusinessInfo, industry: 'technology' } as BusinessInfo,
        }
      );

      expect(context.market.industryNorms.preferredStyle).toBeDefined();
    });

    it('should return appropriate norms for healthcare industry', async () => {
      const context = await assembleRichContext(
        mockArticleContent,
        'Test',
        'id',
        'proj',
        {
          businessInfo: { ...mockBusinessInfo, industry: 'healthcare' } as BusinessInfo,
        }
      );

      expect(context.market.industryNorms.preferredStyle).toBe('warm-modern');
    });

    it('should return default norms for unknown industry', async () => {
      const context = await assembleRichContext(
        mockArticleContent,
        'Test',
        'id',
        'proj',
        {
          businessInfo: { ...mockBusinessInfo, industry: 'unknown-industry' } as BusinessInfo,
        }
      );

      // Should have fallback norms
      expect(context.market.industryNorms).toBeDefined();
      expect(context.market.industryNorms.preferredStyle).toBeDefined();
    });
  });
});
