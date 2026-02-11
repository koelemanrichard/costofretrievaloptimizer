import { describe, it, expect } from 'vitest';
import { EavTextValidator } from '../EavTextValidator';

describe('EavTextValidator', () => {
  const validator = new EavTextValidator();

  // -------------------------------------------------------------------------
  // Rule 33 — Low EAV triple coverage
  // -------------------------------------------------------------------------

  it('detects low EAV triple coverage (rule 33)', () => {
    const issues = validator.validate({
      text: 'This product is great for users.',
      eavs: [
        { entity: 'Widget X', attribute: 'weight', value: '500g' },
        { entity: 'Widget X', attribute: 'color', value: 'blue' },
        { entity: 'Widget X', attribute: 'price', value: '$29.99' },
      ],
    });
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-33' }));
  });

  it('passes good EAV coverage', () => {
    const issues = validator.validate({
      text: 'Widget X has a weight of 500g. Widget X comes in blue color. Widget X price is $29.99.',
      eavs: [
        { entity: 'Widget X', attribute: 'weight', value: '500g' },
        { entity: 'Widget X', attribute: 'color', value: 'blue' },
        { entity: 'Widget X', attribute: 'price', value: '$29.99' },
      ],
    });
    expect(issues.find(i => i.ruleId === 'rule-33')).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Rule 37 — Excessive pronoun usage
  // -------------------------------------------------------------------------

  it('detects excessive pronoun usage (rule 37)', () => {
    const issues = validator.validate({
      text: 'It is great. They love it because it helps them. It makes their life easier. They can use it daily. It improves their results significantly. They recommend it to everyone they know.',
    });
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-37' }));
  });

  it('passes named entity usage', () => {
    const issues = validator.validate({
      text: 'React hooks enable state management. React hooks simplify component logic. React hooks improve code readability.',
    });
    expect(issues.find(i => i.ruleId === 'rule-37')).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Rule 40 — Quantitative values missing units
  // -------------------------------------------------------------------------

  it('detects numbers without units (rule 40)', () => {
    const issues = validator.validate({
      text: 'The product weighs 500 and costs 2999 with a length of 1200 and width of 800 in a batch of 100.',
    });
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-40' }));
  });

  it('passes numbers with units', () => {
    const issues = validator.validate({
      text: 'The product weighs 500g and costs $29.99 with dimensions 120cm by 80cm.',
    });
    expect(issues.find(i => i.ruleId === 'rule-40')).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Rule 45 — Incomplete root attribute coverage
  // -------------------------------------------------------------------------

  it('detects missing root attributes (rule 45)', () => {
    const issues = validator.validate({
      text: 'This discusses the weight and color of the product.',
      rootAttributes: ['weight', 'color', 'material', 'dimensions'],
    });
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-45' }));
  });

  it('passes complete root attributes', () => {
    const issues = validator.validate({
      text: 'The product has specific weight, color, material composition, and precise dimensions.',
      rootAttributes: ['weight', 'color', 'material', 'dimensions'],
    });
    expect(issues.find(i => i.ruleId === 'rule-45')).toBeUndefined();
  });
});
