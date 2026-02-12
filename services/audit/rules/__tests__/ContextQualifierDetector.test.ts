import { describe, it, expect } from 'vitest';
import { ContextQualifierDetector } from '../ContextQualifierDetector';

describe('ContextQualifierDetector', () => {
  const detector = new ContextQualifierDetector();

  // ---------------------------------------------------------------------------
  // Rule 85 — Temporal qualifiers for time-sensitive statements
  // ---------------------------------------------------------------------------

  it('detects statistics lacking temporal context (rule 85)', () => {
    const text = `
      About 65% of companies use cloud hosting.
      The average cost is $1,200 per month.
      Over 10,000 users rely on this platform.
      Roughly 42% of developers prefer TypeScript.
      Revenue reached $5 million last quarter was exciting.
    `;
    const issues = detector.validate(text);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-85', severity: 'medium' })
    );
  });

  it('passes statistics with temporal qualifiers (rule 85)', () => {
    const text = `
      As of 2024, about 65% of companies use cloud hosting.
      In Q3 2023, the average cost was $1,200 per month.
      Since 2020, over 10,000 users rely on this platform.
      Currently, 42% of developers prefer TypeScript.
    `;
    const issues = detector.validate(text);
    expect(issues.find((i) => i.ruleId === 'rule-85')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Rule 86 — Spatial/geographic qualifiers
  // ---------------------------------------------------------------------------

  it('detects location-dependent statements without geographic context (rule 86)', () => {
    const text = `
      The average salary for a software engineer is $120,000.
      Healthcare costs have been rising steadily.
      Tax regulations require annual filing by April 15.
      Minimum wage is set at $15 per hour.
    `;
    const issues = detector.validate(text);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-86', severity: 'medium' })
    );
  });

  it('passes location-dependent statements with geographic qualifiers (rule 86)', () => {
    const text = `
      In the US, the average salary for a software engineer is $120,000.
      Healthcare costs in Europe have been rising steadily.
      Globally, tax regulations vary by jurisdiction.
    `;
    const issues = detector.validate(text);
    expect(issues.find((i) => i.ruleId === 'rule-86')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Rule 87 — Conditional qualifiers for recommendations
  // ---------------------------------------------------------------------------

  it('detects unconditional recommendations (rule 87)', () => {
    const text = `
      You should use a CDN for your website.
      Teams must adopt CI/CD pipelines.
      We recommend daily standups.
      It is essential to write unit tests.
      Best practice is to use environment variables.
    `;
    const issues = detector.validate(text);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-87', severity: 'medium' })
    );
  });

  it('passes recommendations with conditional qualifiers (rule 87)', () => {
    const text = `
      If your site gets more than 10k visitors, you should use a CDN.
      When deploying to production, teams must adopt CI/CD pipelines.
      For teams larger than 5, we recommend daily standups.
      If you maintain a large codebase, it is essential to write unit tests.
    `;
    const issues = detector.validate(text);
    expect(issues.find((i) => i.ruleId === 'rule-87')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Rule 88 — Source attribution for claims
  // ---------------------------------------------------------------------------

  it('detects unattributed claims (rule 88)', () => {
    const text = `
      Studies show that remote work improves productivity.
      Research indicates a strong correlation between exercise and focus.
      Data shows a 30% improvement in retention rates.
    `;
    const issues = detector.validate(text);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-88', severity: 'low' })
    );
  });

  it('passes claims with proper attribution (rule 88)', () => {
    const text = `
      According to Gartner, remote work improves productivity.
      Based on a 2023 study from Stanford, exercise correlates with focus.
      As reported by McKinsey, retention rates improved by 30%.
    `;
    const issues = detector.validate(text);
    expect(issues.find((i) => i.ruleId === 'rule-88')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Rule 89 — Comparative context with baselines
  // ---------------------------------------------------------------------------

  it('detects comparisons without baselines (rule 89)', () => {
    const text = `
      This framework is faster and more efficient.
      The new approach is better for large-scale applications.
      Our solution is cheaper and more reliable.
    `;
    const issues = detector.validate(text);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-89', severity: 'low' })
    );
  });

  it('passes comparisons with baseline context (rule 89)', () => {
    const text = `
      This framework is 40% faster than Express.js.
      The new approach is better compared to the monolith pattern.
      Our solution is cheaper vs the industry average.
    `;
    const issues = detector.validate(text);
    expect(issues.find((i) => i.ruleId === 'rule-89')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Rule 90 — Audience qualifiers for advice
  // ---------------------------------------------------------------------------

  it('detects advice without audience specification (rule 90)', () => {
    const text = `
      You should learn TypeScript.
      We recommend starting with React.
      It's best to use a framework.
      You need to understand the basics first.
      Consider using Docker for deployment.
    `;
    const issues = detector.validate(text);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-90', severity: 'medium' })
    );
  });

  it('passes advice with audience qualifiers (rule 90)', () => {
    const text = `
      For beginners, you should learn TypeScript.
      For developers familiar with JavaScript, we recommend starting with React.
      If you're a designer, it's best to use a framework.
      For teams that need container orchestration, consider using Docker.
    `;
    const issues = detector.validate(text);
    expect(issues.find((i) => i.ruleId === 'rule-90')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Rule 91 — Version/edition qualifiers for technology mentions
  // ---------------------------------------------------------------------------

  it('detects unversioned technology mentions (rule 91)', () => {
    const text = `
      React provides a component-based architecture.
      You can use Node.js for the backend.
      PostgreSQL handles complex queries well.
      Docker simplifies deployment workflows.
      Python is great for data science.
    `;
    const issues = detector.validate(text);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-91', severity: 'low' })
    );
  });

  it('passes technology mentions with version numbers (rule 91)', () => {
    const text = `
      React 18 provides a component-based architecture.
      You can use Node.js 20 LTS for the backend.
      PostgreSQL 15 handles complex queries well.
      Docker 24.0 simplifies deployment workflows.
    `;
    const issues = detector.validate(text);
    expect(issues.find((i) => i.ruleId === 'rule-91')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Rule 92 — Methodology qualifiers for data claims
  // ---------------------------------------------------------------------------

  it('detects data claims without methodology (rule 92)', () => {
    const text = `
      Our survey found that 78% of teams use agile.
      The study revealed significant productivity gains.
      A benchmark showed 3x improvement in throughput.
    `;
    const issues = detector.validate(text);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-92', severity: 'low' })
    );
  });

  it('passes data claims with methodology context (rule 92)', () => {
    const text = `
      Based on a survey of 500 users conducted across 12 countries, 78% use agile.
      The study, using a sample of 1,200 participants, revealed productivity gains.
      Measured using Lighthouse 11, the benchmark showed 3x improvement.
    `;
    const issues = detector.validate(text);
    expect(issues.find((i) => i.ruleId === 'rule-92')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Rule 93 — Certainty qualifiers distinguishing facts from opinions
  // ---------------------------------------------------------------------------

  it('detects excessive certainty without hedging (rule 93)', () => {
    const text = `
      This is the best framework available.
      It always works perfectly in production.
      It never fails under heavy load.
      The outcome is guaranteed to be positive.
      This is undoubtedly the right choice.
      It is always the fastest option.
    `;
    const issues = detector.validate(text);
    expect(issues).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-93', severity: 'medium' })
    );
  });

  it('passes content with balanced certainty and hedging (rule 93)', () => {
    const text = `
      This tends to be a reliable framework.
      In most cases, it works well in production.
      Studies suggest it handles heavy load gracefully.
      It is likely a good choice for most teams.
      Generally, this approach offers solid performance.
    `;
    const issues = detector.validate(text);
    expect(issues.find((i) => i.ruleId === 'rule-93')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Combined — well-qualified content passes clean
  // ---------------------------------------------------------------------------

  it('returns no issues for well-qualified content', () => {
    const text = `
      As of 2024, in the US, React 18 is used by approximately 65% of frontend developers, according to the Stack Overflow Developer Survey conducted among 90,000 respondents.
      For beginners who are just getting started, we recommend learning TypeScript 5.3 if you plan to build large-scale applications.
      Compared to Angular 17, React 18 tends to offer faster initial rendering in most benchmarks, based on our testing using Lighthouse 11.
    `;
    const issues = detector.validate(text);
    expect(issues).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  it('handles empty input without errors', () => {
    const issues = detector.validate('');
    expect(issues).toHaveLength(0);
  });

  it('handles short content below thresholds without false positives', () => {
    const text = 'The cost is $500. You should use Docker.';
    const issues = detector.validate(text);
    // Only 1 stat without temporal, 1 location-dependent, 1 recommendation,
    // 1 unversioned tech -- all below their respective thresholds
    expect(issues).toHaveLength(0);
  });
});
