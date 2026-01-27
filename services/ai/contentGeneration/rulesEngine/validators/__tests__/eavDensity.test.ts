import { EAVDensityValidator } from '../eavDensity';

describe('EAVDensityValidator', () => {
  it('should pass sentences with Entity-Attribute-Value', () => {
    const content = 'German Shepherds require 60 minutes of daily exercise. The breed weighs between 50-90 pounds.';
    const violations = EAVDensityValidator.validate(content);

    expect(violations.filter(v => v.severity === 'error').length).toBe(0);
  });

  it('should flag sentences without clear EAV structure', () => {
    const content = 'It is good for everyone. Things happen all the time.';
    const violations = EAVDensityValidator.validate(content);

    expect(violations.length).toBeGreaterThan(0);
  });

  it('should provide EAV density score', async () => {
    const content = 'German Shepherds have a double coat. The outer coat is dense.';
    const score = await EAVDensityValidator.calculateDensity(content);

    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
