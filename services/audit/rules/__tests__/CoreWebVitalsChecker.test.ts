import { describe, it, expect } from 'vitest';
import { CoreWebVitalsChecker, CoreWebVitalsInput } from '../CoreWebVitalsChecker';

describe('CoreWebVitalsChecker', () => {
  const checker = new CoreWebVitalsChecker();

  // ===========================================================================
  // Rule 320 — LCP (Largest Contentful Paint)
  // ===========================================================================

  it('reports no LCP issue when LCP ≤ 2.5s (rule 320 — good)', () => {
    const issues = checker.validate({ lcp: 2000 });
    expect(issues.find(i => i.ruleId === 'rule-320')).toBeUndefined();
  });

  it('reports LCP needs improvement when 2.5s < LCP ≤ 4s (rule 320 — needs improvement)', () => {
    const issues = checker.validate({ lcp: 3500 });
    const issue = issues.find(i => i.ruleId === 'rule-320');
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe('critical');
    expect(issue!.title).toContain('needs improvement');
  });

  it('reports LCP poor when LCP > 4s (rule 320 — poor)', () => {
    const issues = checker.validate({ lcp: 5200 });
    const issue = issues.find(i => i.ruleId === 'rule-320');
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe('critical');
    expect(issue!.title).toContain('poor');
    expect(issue!.description).toContain('5.2s');
  });

  // ===========================================================================
  // Rule 321 — INP / FID
  // ===========================================================================

  it('reports no INP issue when INP ≤ 200ms (rule 321 — good)', () => {
    const issues = checker.validate({ inp: 150 });
    expect(issues.find(i => i.ruleId === 'rule-321')).toBeUndefined();
  });

  it('reports INP needs improvement when 200ms < INP ≤ 500ms (rule 321 — needs improvement)', () => {
    const issues = checker.validate({ inp: 350 });
    const issue = issues.find(i => i.ruleId === 'rule-321');
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe('critical');
    expect(issue!.title).toContain('needs improvement');
    expect(issue!.title).toContain('INP');
  });

  it('reports INP poor when INP > 500ms (rule 321 — poor)', () => {
    const issues = checker.validate({ inp: 750 });
    const issue = issues.find(i => i.ruleId === 'rule-321');
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe('critical');
    expect(issue!.title).toContain('poor');
  });

  it('uses FID as fallback when INP is not provided (rule 321)', () => {
    const issues = checker.validate({ fid: 600 });
    const issue = issues.find(i => i.ruleId === 'rule-321');
    expect(issue).toBeDefined();
    expect(issue!.title).toContain('FID');
  });

  // ===========================================================================
  // Rule 322 — CLS (Cumulative Layout Shift)
  // ===========================================================================

  it('reports no CLS issue when CLS ≤ 0.1 (rule 322 — good)', () => {
    const issues = checker.validate({ cls: 0.05 });
    expect(issues.find(i => i.ruleId === 'rule-322')).toBeUndefined();
  });

  it('reports CLS needs improvement when 0.1 < CLS ≤ 0.25 (rule 322 — needs improvement)', () => {
    const issues = checker.validate({ cls: 0.18 });
    const issue = issues.find(i => i.ruleId === 'rule-322');
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe('critical');
    expect(issue!.title).toContain('needs improvement');
  });

  it('reports CLS poor when CLS > 0.25 (rule 322 — poor)', () => {
    const issues = checker.validate({ cls: 0.42 });
    const issue = issues.find(i => i.ruleId === 'rule-322');
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe('critical');
    expect(issue!.title).toContain('poor');
    expect(issue!.description).toContain('0.420');
  });

  // ===========================================================================
  // Rule 323 — FCP (First Contentful Paint)
  // ===========================================================================

  it('reports FCP issue when FCP > 1.8s (rule 323)', () => {
    const issues = checker.validate({ fcp: 2500 });
    const issue = issues.find(i => i.ruleId === 'rule-323');
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe('high');
    expect(issue!.title).toContain('needs improvement');
  });

  it('reports FCP slow when FCP > 3s (rule 323)', () => {
    const issues = checker.validate({ fcp: 4000 });
    const issue = issues.find(i => i.ruleId === 'rule-323');
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe('high');
    expect(issue!.title).toContain('slow');
  });

  // ===========================================================================
  // Rule 324 — TTFB (Time To First Byte)
  // ===========================================================================

  it('reports TTFB issue when TTFB > 800ms (rule 324)', () => {
    const issues = checker.validate({ ttfb: 1200 });
    const issue = issues.find(i => i.ruleId === 'rule-324');
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe('high');
    expect(issue!.title).toContain('needs improvement');
  });

  it('reports TTFB slow when TTFB > 1.8s (rule 324)', () => {
    const issues = checker.validate({ ttfb: 2500 });
    const issue = issues.find(i => i.ruleId === 'rule-324');
    expect(issue).toBeDefined();
    expect(issue!.title).toContain('slow');
  });

  // ===========================================================================
  // Rule 325 — TBT (Total Blocking Time)
  // ===========================================================================

  it('reports TBT issue when TBT > 200ms (rule 325)', () => {
    const issues = checker.validate({ tbt: 400 });
    const issue = issues.find(i => i.ruleId === 'rule-325');
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe('medium');
    expect(issue!.title).toContain('needs improvement');
  });

  it('reports TBT high when TBT > 600ms (rule 325)', () => {
    const issues = checker.validate({ tbt: 800 });
    const issue = issues.find(i => i.ruleId === 'rule-325');
    expect(issue).toBeDefined();
    expect(issue!.title).toContain('high');
  });

  // ===========================================================================
  // Rule 326 — Speed Index
  // ===========================================================================

  it('reports Speed Index issue when > 3.4s (rule 326)', () => {
    const issues = checker.validate({ speedIndex: 4500 });
    const issue = issues.find(i => i.ruleId === 'rule-326');
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe('medium');
    expect(issue!.title).toContain('needs improvement');
  });

  // ===========================================================================
  // Rule 327 — DOM Size
  // ===========================================================================

  it('reports DOM size issue when nodes ≥ 1500 (rule 327)', () => {
    const issues = checker.validate({ domNodes: 2200 });
    const issue = issues.find(i => i.ruleId === 'rule-327');
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe('low');
    expect(issue!.description).toContain('2200');
  });

  // ===========================================================================
  // Rule 328 — JS Payload
  // ===========================================================================

  it('reports JS payload issue when ≥ 300KB (rule 328)', () => {
    const issues = checker.validate({ jsPayloadKb: 450 });
    const issue = issues.find(i => i.ruleId === 'rule-328');
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe('medium');
    expect(issue!.description).toContain('450KB');
  });

  // ===========================================================================
  // Rule 329 — CSS Payload
  // ===========================================================================

  it('reports CSS payload issue when ≥ 100KB (rule 329)', () => {
    const issues = checker.validate({ cssPayloadKb: 150 });
    const issue = issues.find(i => i.ruleId === 'rule-329');
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe('medium');
    expect(issue!.description).toContain('150KB');
  });

  // ===========================================================================
  // Rule 330 — Third-Party Impact
  // ===========================================================================

  it('reports third-party impact when > 30% of total JS (rule 330)', () => {
    const issues = checker.validate({ thirdPartyJsKb: 200, totalJsKb: 400 });
    const issue = issues.find(i => i.ruleId === 'rule-330');
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe('low');
    expect(issue!.description).toContain('50%');
  });

  it('does not flag third-party when ≤ 30% of total JS (rule 330)', () => {
    const issues = checker.validate({ thirdPartyJsKb: 50, totalJsKb: 400 });
    expect(issues.find(i => i.ruleId === 'rule-330')).toBeUndefined();
  });

  // ===========================================================================
  // Rule 331 — Render-Blocking Resources
  // ===========================================================================

  it('reports render-blocking issue when count > 3 (rule 331)', () => {
    const issues = checker.validate({ renderBlockingCount: 6 });
    const issue = issues.find(i => i.ruleId === 'rule-331');
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe('medium');
    expect(issue!.description).toContain('6');
  });

  // ===========================================================================
  // Rule 332 — Font Loading
  // ===========================================================================

  it('reports font-display missing on Google Fonts links (rule 332)', () => {
    const html =
      '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto">' +
      '<style>@font-face { font-family: "Custom"; src: url("custom.woff2"); }</style>';
    const issues = checker.validate({ html });
    const issue = issues.find(i => i.ruleId === 'rule-332');
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe('low');
    // 1 link + 1 @font-face block = 2 missing
    expect(issue!.description).toContain('2 font resource(s)');
  });

  it('does not flag fonts with font-display: swap (rule 332)', () => {
    const html =
      '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto&display=swap">' +
      '<style>@font-face { font-family: "Custom"; src: url("c.woff2"); font-display: swap; }</style>';
    const issues = checker.validate({ html });
    expect(issues.find(i => i.ruleId === 'rule-332')).toBeUndefined();
  });

  // ===========================================================================
  // Rule 333 — Image fetchpriority
  // ===========================================================================

  it('reports missing fetchpriority when LCP > 2.5s and no image has it (rule 333)', () => {
    const html = '<img src="hero.webp" alt="Hero"><img src="detail.webp" alt="Detail">';
    const issues = checker.validate({ lcp: 3500, html });
    const issue = issues.find(i => i.ruleId === 'rule-333');
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe('medium');
  });

  it('does not flag fetchpriority when LCP ≤ 2.5s (rule 333)', () => {
    const html = '<img src="hero.webp" alt="Hero">';
    const issues = checker.validate({ lcp: 2000, html });
    expect(issues.find(i => i.ruleId === 'rule-333')).toBeUndefined();
  });

  it('does not flag fetchpriority when an image has it (rule 333)', () => {
    const html = '<img src="hero.webp" alt="Hero" fetchpriority="high">';
    const issues = checker.validate({ lcp: 3500, html });
    expect(issues.find(i => i.ruleId === 'rule-333')).toBeUndefined();
  });

  // ===========================================================================
  // Combined: all good metrics — no issues
  // ===========================================================================

  it('returns zero issues when all metrics are within good thresholds', () => {
    const input: CoreWebVitalsInput = {
      lcp: 2000,
      inp: 150,
      cls: 0.05,
      fcp: 1500,
      ttfb: 500,
      tbt: 100,
      speedIndex: 2800,
      domNodes: 1000,
      jsPayloadKb: 200,
      cssPayloadKb: 60,
      thirdPartyJsKb: 50,
      totalJsKb: 200,
      renderBlockingCount: 2,
      html:
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto&display=swap">' +
        '<img src="hero.webp" alt="Hero" fetchpriority="high">',
    };
    const issues = checker.validate(input);
    expect(issues).toHaveLength(0);
  });

  // ===========================================================================
  // Combined: all poor metrics — triggers all available rules
  // ===========================================================================

  it('triggers issues for all rules when all metrics are poor', () => {
    const input: CoreWebVitalsInput = {
      lcp: 6000,
      inp: 800,
      cls: 0.5,
      fcp: 5000,
      ttfb: 3000,
      tbt: 900,
      speedIndex: 7000,
      domNodes: 3000,
      jsPayloadKb: 500,
      cssPayloadKb: 200,
      thirdPartyJsKb: 300,
      totalJsKb: 500,
      renderBlockingCount: 8,
      html:
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto">' +
        '<img src="hero.webp" alt="Hero">',
    };
    const issues = checker.validate(input);
    const ruleIds = issues.map(i => i.ruleId);

    expect(ruleIds).toContain('rule-320'); // LCP
    expect(ruleIds).toContain('rule-321'); // INP
    expect(ruleIds).toContain('rule-322'); // CLS
    expect(ruleIds).toContain('rule-323'); // FCP
    expect(ruleIds).toContain('rule-324'); // TTFB
    expect(ruleIds).toContain('rule-325'); // TBT
    expect(ruleIds).toContain('rule-326'); // Speed Index
    expect(ruleIds).toContain('rule-327'); // DOM size
    expect(ruleIds).toContain('rule-328'); // JS payload
    expect(ruleIds).toContain('rule-329'); // CSS payload
    expect(ruleIds).toContain('rule-330'); // Third-party
    expect(ruleIds).toContain('rule-331'); // Render-blocking
    expect(ruleIds).toContain('rule-332'); // Font loading
    expect(ruleIds).toContain('rule-333'); // Image fetchpriority
  });

  // ===========================================================================
  // Edge case: empty input (no metrics provided)
  // ===========================================================================

  it('returns zero issues when no metrics are provided (empty input)', () => {
    const issues = checker.validate({});
    expect(issues).toHaveLength(0);
  });
});
