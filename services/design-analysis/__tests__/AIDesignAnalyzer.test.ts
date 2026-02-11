import { describe, it, expect } from 'vitest';
import { AIDesignAnalyzer } from '../AIDesignAnalyzer';

describe('AIDesignAnalyzer', () => {
  describe('generateExtractionPrompt', () => {
    it('should generate valid extraction prompt', () => {
      const analyzer = new AIDesignAnalyzer({
        provider: 'gemini',
        apiKey: 'test-key'
      });

      const prompt = analyzer.generateExtractionPrompt();

      expect(prompt).toContain('senior brand designer');
      expect(prompt).toContain('Design DNA');
      expect(prompt).toContain('Colors');
      expect(prompt).toContain('Typography');
      expect(prompt).toContain('Spacing');
      expect(prompt).toContain('Shapes');
      expect(prompt).toContain('Visual Effects');
      expect(prompt).toContain('Personality');
      expect(prompt).toContain('JSON');
    });
  });

  describe('constructor', () => {
    it('should accept gemini provider', () => {
      const analyzer = new AIDesignAnalyzer({
        provider: 'gemini',
        apiKey: 'test-key'
      });
      expect(analyzer).toBeDefined();
    });

    it('should accept anthropic provider', () => {
      const analyzer = new AIDesignAnalyzer({
        provider: 'anthropic',
        apiKey: 'test-key'
      });
      expect(analyzer).toBeDefined();
    });
  });

  describe('getProviderInfo', () => {
    it('should return correct model for gemini provider', () => {
      const analyzer = new AIDesignAnalyzer({
        provider: 'gemini',
        apiKey: 'test-key'
      });

      const info = analyzer.getProviderInfo();
      expect(info.provider).toBe('gemini');
      expect(info.model).toBe('gemini-2.5-flash');
    });

    it('should return correct model for anthropic provider', () => {
      const analyzer = new AIDesignAnalyzer({
        provider: 'anthropic',
        apiKey: 'test-key'
      });

      const info = analyzer.getProviderInfo();
      expect(info.provider).toBe('anthropic');
      expect(info.model).toBe('claude-sonnet-4-5-20250929');
    });

    it('should allow custom model override', () => {
      const analyzer = new AIDesignAnalyzer({
        provider: 'gemini',
        apiKey: 'test-key',
        model: 'gemini-1.5-pro'
      });

      const info = analyzer.getProviderInfo();
      expect(info.model).toBe('gemini-1.5-pro');
    });
  });

  describe('parseAIResponse', () => {
    it('should parse clean JSON response', () => {
      const analyzer = new AIDesignAnalyzer({
        provider: 'gemini',
        apiKey: 'test-key'
      });

      const response = '{"colors": {"primary": {"hex": "#FF0000"}}}';
      const result = analyzer.parseAIResponse(response);

      expect(result).toEqual({ colors: { primary: { hex: '#FF0000' } } });
    });

    it('should extract JSON from markdown code blocks', () => {
      const analyzer = new AIDesignAnalyzer({
        provider: 'gemini',
        apiKey: 'test-key'
      });

      const response = `Here is the analysis:
\`\`\`json
{"colors": {"primary": {"hex": "#00FF00"}}}
\`\`\`
That's the result.`;

      const result = analyzer.parseAIResponse(response);
      expect(result).toEqual({ colors: { primary: { hex: '#00FF00' } } });
    });

    it('should throw error for invalid JSON', () => {
      const analyzer = new AIDesignAnalyzer({
        provider: 'gemini',
        apiKey: 'test-key'
      });

      const response = 'This is not JSON at all';

      expect(() => analyzer.parseAIResponse(response)).toThrow('Failed to extract JSON from AI response');
    });

    it('should handle nested JSON objects', () => {
      const analyzer = new AIDesignAnalyzer({
        provider: 'gemini',
        apiKey: 'test-key'
      });

      const nestedJson = {
        colors: {
          primary: { hex: '#FF0000', usage: 'buttons', confidence: 95 },
          secondary: { hex: '#0000FF', usage: 'accents', confidence: 85 }
        },
        typography: {
          headingFont: { family: 'Inter', weight: 700 }
        }
      };

      const response = JSON.stringify(nestedJson);
      const result = analyzer.parseAIResponse(response);

      expect(result).toEqual(nestedJson);
    });
  });

  describe('generateValidationPrompt', () => {
    it('should generate prompt with extracted colors', () => {
      const analyzer = new AIDesignAnalyzer({
        provider: 'gemini',
        apiKey: 'test-key'
      });

      const colors = {
        primary: '#FF0000',
        secondary: '#00FF00'
      };

      const prompt = analyzer.generateValidationPrompt(colors);

      expect(prompt).toContain('#FF0000');
      expect(prompt).toContain('#00FF00');
      expect(prompt).toContain('Validate');
      expect(prompt).toContain('JSON');
    });
  });
});
