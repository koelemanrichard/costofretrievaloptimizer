import { describe, it, expect } from 'vitest';
import { analyzeContent } from '../contentAnalyzer';

describe('contentAnalyzer (Pass 1)', () => {
  describe('analyzeContent', () => {
    it('should identify section types correctly', () => {
      const markdown = `
# Main Title

Introduction paragraph here.

## Features Comparison

| Feature | Plan A | Plan B |
|---------|--------|--------|
| Price | $10 | $20 |

## How It Works

1. Step one
2. Step two
3. Step three

## FAQ

**Q: What is this?**
A: This is a test.
      `;

      const result = analyzeContent(markdown);

      expect(result.sections.length).toBeGreaterThan(0);
      expect(result.sections.find(s => s.contentType === 'comparison')).toBeDefined();
      expect(result.sections.find(s => s.contentType === 'process')).toBeDefined();
      expect(result.sections.find(s => s.contentType === 'faq')).toBeDefined();
    });

    it('should calculate word count and read time', () => {
      const markdown = '# Title\n\n' + 'word '.repeat(500);
      const result = analyzeContent(markdown);

      expect(result.totalWordCount).toBeGreaterThan(400);
      expect(result.estimatedReadTime).toBeGreaterThan(0);
    });

    it('should identify semantic importance', () => {
      const markdown = `
# Hero Title

The most important intro.

## Key Feature

Important content.

## Additional Details

Supporting information.
      `;

      const result = analyzeContent(markdown);

      expect(result.sections[0].semanticImportance).toBe('hero');
    });

    it('should detect tables correctly', () => {
      const markdown = `
## Comparison Table

| Header 1 | Header 2 |
|----------|----------|
| Value 1  | Value 2  |
      `;

      const result = analyzeContent(markdown);

      expect(result.sections[0].hasTable).toBe(true);
    });

    it('should detect lists correctly', () => {
      const markdown = `
## Features

- Feature one
- Feature two
- Feature three
      `;

      const result = analyzeContent(markdown);

      expect(result.sections[0].hasList).toBe(true);
    });

    it('should detect quotes correctly', () => {
      const markdown = `
## Testimonial

> This is a great product!
      `;

      const result = analyzeContent(markdown);

      expect(result.sections[0].hasQuote).toBe(true);
    });

    it('should handle content before first heading', () => {
      const markdown = `Some intro text before any heading.

# Main Title

Content here.
      `;

      const result = analyzeContent(markdown);

      expect(result.sections.length).toBeGreaterThanOrEqual(1);
    });
  });
});
