import { describe, it, expect } from 'vitest';
import { ChunkingResistanceValidator } from '../ChunkingResistanceValidator';

describe('ChunkingResistanceValidator', () => {
  const validator = new ChunkingResistanceValidator();

  it('flags forward references like "as mentioned above"', () => {
    const html = `<h2>Benefits</h2><p>As mentioned above, solar energy reduces costs significantly for homeowners.</p>`;
    const issues = validator.validate(html, 'Solar energy');
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-chunk-forward-ref' }));
  });

  it('flags "see below" references', () => {
    const html = `<h2>Overview</h2><p>Solar energy provides many benefits, see below for details on each advantage.</p>`;
    const issues = validator.validate(html, 'Solar energy');
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-chunk-forward-ref' }));
  });

  it('flags missing entity in first sentence of H2 section', () => {
    const html = `<h2>Key Benefits</h2><p>It provides significant cost savings for homeowners across the country.</p>`;
    const issues = validator.validate(html, 'Solar energy');
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-chunk-entity-reintro' }));
  });

  it('passes when entity is in first sentence', () => {
    const html = `<h2>Key Benefits</h2><p>Solar energy provides significant cost savings for homeowners across the country.</p>`;
    const issues = validator.validate(html, 'Solar energy');
    expect(issues.filter(i => i.ruleId === 'rule-chunk-entity-reintro')).toHaveLength(0);
  });

  it('flags sections over 800 words', () => {
    const longContent = Array(850).fill('word').join(' ');
    const html = `<h2>Long Section</h2><p>${longContent}</p>`;
    const issues = validator.validate(html, 'Solar energy');
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-chunk-section-length' }));
  });

  it('flags sections under 100 words', () => {
    const html = `<h2>Short Section</h2><p>Very brief content here.</p>`;
    const issues = validator.validate(html, 'Solar energy');
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-chunk-section-length' }));
  });

  it('passes clean content with no cross-references', () => {
    const html = `
      <h2>What is Solar Energy?</h2>
      <p>Solar energy is the radiant light and heat from the Sun harnessed using photovoltaic cells and thermal collectors. Modern solar panels convert sunlight directly into electricity through the photovoltaic effect. This technology provides clean renewable power for residential commercial and industrial applications worldwide with growing adoption rates.</p>
      <h2>How Solar Panels Work</h2>
      <p>Solar panels work by converting photons from sunlight into electrical current through semiconductor materials. Each panel contains multiple photovoltaic cells made from silicon wafers that generate direct current when exposed to light. An inverter then converts this direct current into alternating current suitable for home use and grid connection.</p>
    `;
    const issues = validator.validate(html, 'Solar energy');
    expect(issues.filter(i => i.ruleId === 'rule-chunk-forward-ref')).toHaveLength(0);
  });
});
