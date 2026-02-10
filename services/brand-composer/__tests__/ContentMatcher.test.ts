import { describe, it, expect } from 'vitest';
import { ContentMatcher } from '../ContentMatcher';
import type { ExtractedComponent } from '../../../types/brandExtraction';

describe('ContentMatcher', () => {
  const mockComponents: ExtractedComponent[] = [
    {
      id: 'comp-1',
      extractionId: 'ext-1',
      projectId: 'proj-1',
      visualDescription: 'Hero section with large heading and subtitle',
      literalHtml: '<section class="hero"><h1></h1><p class="subtitle"></p></section>',
      literalCss: '.hero { background: blue; }',
      theirClassNames: ['hero'],
      contentSlots: [
        { name: 'heading', selector: 'h1', type: 'text', required: true },
        { name: 'subtitle', selector: '.subtitle', type: 'text', required: false }
      ],
      createdAt: new Date().toISOString()
    }
  ];

  describe('matchContentToComponent', () => {
    it('matches heading content to hero component', async () => {
      const matcher = new ContentMatcher(mockComponents);
      const content = { type: 'section' as const, heading: 'Welcome', headingLevel: 1, body: 'Introduction.' };

      const match = await matcher.matchContentToComponent(content);

      expect(match).not.toBeNull();
      expect(match?.component.id).toBe('comp-1');
      expect(match?.confidence).toBeGreaterThan(0.3);
    });
  });
});
