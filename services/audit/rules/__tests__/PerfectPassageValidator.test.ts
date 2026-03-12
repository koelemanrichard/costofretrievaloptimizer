import { describe, it, expect } from 'vitest';
import { PerfectPassageValidator } from '../PerfectPassageValidator';

describe('PerfectPassageValidator', () => {
  const validator = new PerfectPassageValidator();

  it('scores a perfect passage (question heading, direct answer, evidence, attribution) ≥80', () => {
    const html = `
      <h2>What does solar panel installation cost?</h2>
      <p>Solar panel installation costs between €5,000 and €12,000 for a typical residential setup depending on system size and roof complexity.</p>
      <p>According to the Solar Energy Association, prices have dropped 40% since 2018.</p>
    `;
    const result = validator.validate(html);
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.hasQuestionHeading).toBe(true);
    expect(result.hasDirectAnswer).toBe(true);
    expect(result.hasEvidence).toBe(true);
    expect(result.hasAttribution).toBe(true);
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].sectionScore).toBe(100);
  });

  it('detects missing question heading and scores lower', () => {
    const html = `
      <h2>Solar Panel Installation Costs</h2>
      <p>Installation costs range from €5,000 to €12,000 for residential setups depending on system size.</p>
      <p>According to industry reports, prices dropped 40% since 2018.</p>
    `;
    const result = validator.validate(html);
    expect(result.hasQuestionHeading).toBe(false);
    expect(result.score).toBeLessThan(80);
    expect(result.sections[0].headingIsQuestion).toBe(false);
    // Should still get direct answer + evidence + attribution = 75
    expect(result.sections[0].sectionScore).toBe(75);
  });

  it('detects missing direct answer when first paragraph is too short', () => {
    const html = `
      <h2>How much does it cost?</h2>
      <p>It varies.</p>
      <p>According to experts, costs are around €5,000 per year.</p>
    `;
    const result = validator.validate(html);
    expect(result.hasDirectAnswer).toBe(false);
    // 2 words → 1-100 range → 10 pts partial
    expect(result.sections[0].firstParagraphWords).toBe(2);
  });

  it('gives partial credit for first paragraph between 71-100 words', () => {
    const words = Array(80).fill('word').join(' ');
    const html = `
      <h2>What is solar energy?</h2>
      <p>Solar energy ${words} end.</p>
    `;
    const result = validator.validate(html);
    expect(result.hasDirectAnswer).toBe(false);
    // 80+ words → outside 10-70 optimal, but within 1-100 → 10 pts
    expect(result.sections[0].sectionScore).toBeGreaterThanOrEqual(35); // question(25) + partial answer(10)
  });

  it('detects answer capsule word count from first section', () => {
    const html = `
      <h2>What are the benefits?</h2>
      <p>Solar panels reduce electricity bills by up to 80% and increase property value significantly over time.</p>
      <h2>How do panels work?</h2>
      <p>Photovoltaic cells convert sunlight into direct current electricity through the semiconductor effect.</p>
    `;
    const result = validator.validate(html);
    expect(result.answerCapsuleWordCount).toBe(16);
    expect(result.sections).toHaveLength(2);
  });

  it('detects brand adjacency when brand name appears in HTML', () => {
    const html = `
      <h2>What is SolarCorp?</h2>
      <p>SolarCorp provides residential solar panel installation services across the Netherlands with certified technicians.</p>
    `;
    const result = validator.validate(html, 'SolarCorp');
    expect(result.hasBrandAdjacency).toBe(true);
  });

  it('returns false for brand adjacency when brand is absent', () => {
    const html = `
      <h2>What is solar energy?</h2>
      <p>Solar energy is a renewable source of electricity generated from sunlight.</p>
    `;
    const result = validator.validate(html, 'SolarCorp');
    expect(result.hasBrandAdjacency).toBe(false);
  });

  it('handles empty HTML gracefully', () => {
    const result = validator.validate('');
    expect(result.score).toBe(0);
    expect(result.hasQuestionHeading).toBe(false);
    expect(result.hasDirectAnswer).toBe(false);
    expect(result.hasEvidence).toBe(false);
    expect(result.hasAttribution).toBe(false);
    expect(result.answerCapsuleWordCount).toBe(0);
    expect(result.sections).toHaveLength(0);
  });

  it('handles HTML with no H2 sections', () => {
    const html = `<h1>Title</h1><p>Just a paragraph with no H2 sections.</p>`;
    const result = validator.validate(html);
    expect(result.score).toBe(0);
    expect(result.sections).toHaveLength(0);
  });

  it('detects Dutch question words', () => {
    const html = `
      <h2>Wat kost zonnepanelen installatie?</h2>
      <p>De installatie van zonnepanelen kost gemiddeld tussen de €5.000 en €12.000 afhankelijk van het type dak en de grootte van het systeem.</p>
      <p>Volgens het CBS zijn de kosten met 30% gedaald sinds 2020.</p>
    `;
    const result = validator.validate(html);
    expect(result.hasQuestionHeading).toBe(true);
    expect(result.hasEvidence).toBe(true);
    expect(result.hasAttribution).toBe(true);
    expect(result.sections[0].headingIsQuestion).toBe(true);
  });

  it('detects question mark heading even without question word', () => {
    const html = `
      <h2>Zonnepanelen op een plat dak?</h2>
      <p>Zonnepanelen kunnen uitstekend geplaatst worden op een plat dak met behulp van speciale montagesystemen en ballastconstructies.</p>
    `;
    const result = validator.validate(html);
    expect(result.hasQuestionHeading).toBe(true);
    expect(result.sections[0].headingIsQuestion).toBe(true);
  });

  it('detects numeric evidence with various unit formats', () => {
    const html = `
      <h2>How efficient are panels?</h2>
      <p>Modern panels achieve 22% efficiency in laboratory conditions.</p>
    `;
    const result = validator.validate(html);
    expect(result.hasEvidence).toBe(true);
    expect(result.sections[0].hasNumericEvidence).toBe(true);
  });

  it('computes average score across multiple sections', () => {
    const html = `
      <h2>What is solar energy?</h2>
      <p>Solar energy is the conversion of sunlight into electricity using photovoltaic panels installed on rooftops.</p>
      <p>According to NASA, the sun provides 173,000 terawatts of energy continuously.</p>
      <h2>Installation Guide</h2>
      <p>Steps for installation.</p>
    `;
    const result = validator.validate(html);
    // Section 1: question(25) + answer(25) + evidence(10 from "173,000 terawatts" - no unit match) + attribution(25)
    // Section 2: no question(0) + short answer partial(10) + no evidence(0) + no attribution(0)
    expect(result.sections).toHaveLength(2);
    expect(result.score).toBe(
      (result.sections[0].sectionScore + result.sections[1].sectionScore) / 2,
    );
  });
});
