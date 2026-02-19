// services/ai/contentGeneration/passes/__tests__/pass6Visuals.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { filterVisualSections } from '../pass6Visuals';
import { ContentGenerationSection, ContentFormatBudget, ContentBrief } from '../../../../../types';

/**
 * Helper to create a minimal ContentFormatBudget for testing.
 */
function createBudget(overrides?: { maxImageSections?: number }): ContentFormatBudget {
  return {
    currentStats: {
      totalSections: 10,
      sectionsWithLists: 2,
      sectionsWithTables: 1,
      sectionsWithImages: 3,
      proseToStructuredRatio: 0.7,
    },
    sectionClassifications: [],
    sectionsNeedingOptimization: {
      lists: [],
      tables: [],
      images: [],
      discourse: [],
    },
    constraints: {
      maxListSections: 4,
      maxTableSections: 2,
      maxImageSections: overrides?.maxImageSections ?? 5,
      targetProseRatio: 0.7,
    },
  };
}

/**
 * Helper to create a mock section.
 */
function createSection(key: string, opts?: { content?: string; heading?: string }): ContentGenerationSection {
  return {
    id: key,
    job_id: 'test-job',
    section_key: key,
    section_heading: opts?.heading ?? `Heading for ${key}`,
    section_order: 0,
    current_content: opts?.content ?? 'Some default content for the section.',
    current_pass: 1,
    pass_contents: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as ContentGenerationSection;
}

/**
 * Verify that pass6Visuals.ts imports visual-semantics prompt builders
 * with correct naming, not the legacy pass-4-numbered builders.
 *
 * Pass 6 in the execution order is Visual Semantics.
 * It must import visual-semantics prompt builders, not pass-4-named ones.
 */
describe('pass6Visuals prompt builder imports', () => {
  const pass6Source = readFileSync(
    resolve(__dirname, '..', 'pass6Visuals.ts'),
    'utf-8'
  );

  it('should NOT import buildPass4Prompt (wrong pass number)', () => {
    expect(pass6Source).not.toMatch(/buildPass4Prompt/);
  });

  it('should NOT import buildPass4BatchPrompt (wrong pass number)', () => {
    expect(pass6Source).not.toMatch(/buildPass4BatchPrompt/);
  });

  it('should import buildVisualSemanticsPrompt', () => {
    expect(pass6Source).toMatch(/buildVisualSemanticsPrompt/);
  });

  it('should import buildVisualSemanticsBatchPrompt', () => {
    expect(pass6Source).toMatch(/buildVisualSemanticsBatchPrompt/);
  });

  it('should use buildVisualSemanticsPrompt as the promptBuilder', () => {
    // The promptBuilder property should reference the visual semantics builder
    expect(pass6Source).toMatch(/promptBuilder:\s*buildVisualSemanticsPrompt/);
  });

  it('should use buildVisualSemanticsBatchPrompt as the buildBatchPrompt', () => {
    // The buildBatchPrompt property should reference the visual semantics batch builder
    expect(pass6Source).toMatch(/buildBatchPrompt:\s*buildVisualSemanticsBatchPrompt/);
  });
});

/**
 * Verify that the prompt builder module exports the visual-semantics builders.
 */
describe('sectionOptimizationPromptBuilder exports', () => {
  it('should export buildVisualSemanticsPrompt', async () => {
    const module = await import('../../rulesEngine/prompts/sectionOptimizationPromptBuilder');
    expect(module.buildVisualSemanticsPrompt).toBeDefined();
    expect(typeof module.buildVisualSemanticsPrompt).toBe('function');
  });

  it('should export buildVisualSemanticsBatchPrompt', async () => {
    const module = await import('../../rulesEngine/prompts/sectionOptimizationPromptBuilder');
    expect(module.buildVisualSemanticsBatchPrompt).toBeDefined();
    expect(typeof module.buildVisualSemanticsBatchPrompt).toBe('function');
  });
});

/**
 * Tests for format budget enforcement in filterVisualSections.
 */
describe('filterVisualSections - format budget enforcement', () => {
  it('should be exported as a named function', () => {
    expect(typeof filterVisualSections).toBe('function');
  });

  it('should include brief-designated sections', () => {
    const sections = [
      createSection('intro'),
      createSection('section-1'),
      createSection('section-2'),
    ];
    const budget = createBudget({ maxImageSections: 10 });
    const brief = {
      enhanced_visual_semantics: {
        section_images: { 'section-1': { description: 'test' } },
      },
    } as unknown as ContentBrief;

    const result = filterVisualSections(sections, budget, brief);

    // intro is always included, section-1 is brief-designated
    expect(result.some(s => s.section_key === 'intro')).toBe(true);
    expect(result.some(s => s.section_key === 'section-1')).toBe(true);
  });

  it('should include sections with existing images', () => {
    const sections = [
      createSection('section-with-image', { content: 'Text with [IMAGE: a photo] placeholder' }),
      createSection('section-without-image', { content: 'Just plain text.' }),
    ];
    const budget = createBudget({ maxImageSections: 10 });
    const brief = { enhanced_visual_semantics: {} } as unknown as ContentBrief;

    const result = filterVisualSections(sections, budget, brief);

    expect(result.some(s => s.section_key === 'section-with-image')).toBe(true);
  });

  it('should cap total sections at maxImageSections', () => {
    // Create 10 sections, all with existing images (so all qualify)
    const sections = Array.from({ length: 10 }, (_, i) =>
      createSection(`section-${i}`, { content: '[IMAGE: test image]' })
    );
    const budget = createBudget({ maxImageSections: 3 });
    const brief = { enhanced_visual_semantics: {} } as unknown as ContentBrief;

    const result = filterVisualSections(sections, budget, brief);

    expect(result.length).toBe(3);
  });

  it('should prioritize brief-designated sections over auto-justified ones', () => {
    // Generate enough long content for auto-justification (300+ words with process content)
    const longProcessContent = 'Step 1: First do this action now for the process. '.repeat(70);

    const sections = [
      createSection('auto-1', { content: longProcessContent, heading: 'How to Configure' }),
      createSection('auto-2', { content: longProcessContent, heading: 'Step by Step Guide' }),
      createSection('brief-designated', { content: 'Short content.' }),
      createSection('auto-3', { content: longProcessContent, heading: 'How to Install' }),
    ];
    const budget = createBudget({ maxImageSections: 2 });
    const brief = {
      enhanced_visual_semantics: {
        section_images: { 'brief-designated': { description: 'A planned image' } },
      },
    } as unknown as ContentBrief;

    const result = filterVisualSections(sections, budget, brief);

    // brief-designated should always be included (priority tier)
    expect(result.some(s => s.section_key === 'brief-designated')).toBe(true);
    // Total should not exceed maxImageSections
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it('should allow unlimited sections when maxImageSections is not constrained', () => {
    // All sections have images
    const sections = Array.from({ length: 8 }, (_, i) =>
      createSection(`section-${i}`, { content: '[IMAGE: existing image]' })
    );
    // Set a very high maxImageSections
    const budget = createBudget({ maxImageSections: 100 });
    const brief = { enhanced_visual_semantics: {} } as unknown as ContentBrief;

    const result = filterVisualSections(sections, budget, brief);

    // All sections with images should pass through
    expect(result.length).toBe(8);
  });

  it('should return empty array when budget is 0', () => {
    const sections = [
      createSection('section-1', { content: '[IMAGE: test]' }),
      createSection('section-2', { content: '[IMAGE: test]' }),
    ];
    const budget = createBudget({ maxImageSections: 0 });
    const brief = { enhanced_visual_semantics: {} } as unknown as ContentBrief;

    const result = filterVisualSections(sections, budget, brief);

    expect(result.length).toBe(0);
  });

  it('should handle normalized section key matching for brief sections', () => {
    const sections = [
      createSection('my-section-key'),  // hyphenated
    ];
    const budget = createBudget({ maxImageSections: 5 });
    const brief = {
      enhanced_visual_semantics: {
        // Brief uses underscores, section uses hyphens
        section_images: { 'my_section_key': { description: 'test' } },
      },
    } as unknown as ContentBrief;

    const result = filterVisualSections(sections, budget, brief);

    expect(result.some(s => s.section_key === 'my-section-key')).toBe(true);
  });

  it('should count priority and auto-justified separately toward the same budget', () => {
    const longProcessContent = 'Step 1: First do this action now for the process. '.repeat(70);

    // 2 priority sections (have images), 3 auto-justified (long process content)
    const sections = [
      createSection('has-image-1', { content: '[IMAGE: existing]' }),
      createSection('has-image-2', { content: '[IMAGE: existing]' }),
      createSection('auto-1', { content: longProcessContent, heading: 'How to Setup' }),
      createSection('auto-2', { content: longProcessContent, heading: 'Step by Step Process' }),
      createSection('auto-3', { content: longProcessContent, heading: 'How to Configure' }),
    ];
    const budget = createBudget({ maxImageSections: 3 });
    const brief = { enhanced_visual_semantics: {} } as unknown as ContentBrief;

    const result = filterVisualSections(sections, budget, brief);

    // 2 priority + at most 1 auto-justified = 3 total
    expect(result.length).toBeLessThanOrEqual(3);
    // Both priority sections should be present
    expect(result.some(s => s.section_key === 'has-image-1')).toBe(true);
    expect(result.some(s => s.section_key === 'has-image-2')).toBe(true);
  });
});

/**
 * Source-level verification that budget tracking code exists.
 */
describe('format budget enforcement source verification', () => {
  const source = readFileSync(
    resolve(__dirname, '..', 'pass6Visuals.ts'),
    'utf-8'
  );

  it('should contain maxImageSections reference', () => {
    expect(source).toContain('maxImageSections');
  });

  it('should contain imagesAdded counter', () => {
    expect(source).toContain('imagesAdded');
  });

  it('should contain budgetUsed tracking', () => {
    expect(source).toContain('budgetUsed');
  });

  it('should export filterVisualSections function', () => {
    expect(source).toContain('export function filterVisualSections');
  });
});
