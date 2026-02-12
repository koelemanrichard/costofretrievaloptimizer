import { describe, it, expect } from 'vitest';
import { FillerReplacementAdvisor } from '../FillerReplacementAdvisor';

/**
 * Helper: generates padding text to push filler ratio above the 2% threshold.
 * Each "word" counts towards word count; we need fillers > 2% of total words.
 * For a single filler (1 word), we need total words < 50 to exceed 2%.
 * For multi-word fillers ("in order to" = 3 words), ratio is higher per match.
 *
 * Strategy: wrap filler phrase in ~30 plain words so the ratio is well above 2%.
 */
function withPadding(filler: string): string {
  return `The framework provides ${filler} the module handles data processing and rendering.`;
}

/**
 * Helper: generates a long clean text so a single filler falls below 2% threshold.
 */
function longCleanText(extraFiller: string): string {
  // ~100 words of clean text + 1 filler
  const clean =
    'The framework provides robust data processing capabilities for modern web applications. ' +
    'It supports multiple output formats and integrates with popular build tools. ' +
    'Teams can configure pipelines to match their specific deployment requirements. ' +
    'The architecture separates concerns into discrete layers for maintainability. ' +
    'Each layer communicates through well-defined interfaces and contracts. ' +
    'Performance benchmarks show consistent throughput under peak load conditions. ' +
    'The documentation covers installation setup configuration and advanced usage patterns. ' +
    'Error handling follows established conventions with descriptive messages and codes. ' +
    'The test suite validates critical paths with unit and integration tests. ' +
    'Continuous integration runs the full suite on every pull request submission. ' +
    'Monitoring dashboards track key metrics including latency and error rates across services. ';
  return clean + extraFiller;
}

describe('FillerReplacementAdvisor', () => {
  const advisor = new FillerReplacementAdvisor();

  // ---------------------------------------------------------------------------
  // Rule 100 — "Very" / "Really"
  // ---------------------------------------------------------------------------

  it('detects "very" filler and suggests stronger adjective (rule-100)', () => {
    const text = withPadding('a very fast and very good solution that is very important to note.');
    const issues = advisor.validate(text);
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-100' }));

    const suggestions = advisor.getSuggestions(text);
    const rule100 = suggestions.filter(s => s.ruleId === 'rule-100');
    expect(rule100.length).toBeGreaterThanOrEqual(3);
    // Check known mapping
    const fastSuggestion = rule100.find(s => s.original.toLowerCase().includes('very fast'));
    expect(fastSuggestion?.suggested).toBe('rapid');
  });

  it('detects "really" filler (rule-100)', () => {
    const text = withPadding('a really good and really bad outcome in the system.');
    const issues = advisor.validate(text);
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-100' }));

    const suggestions = advisor.getSuggestions(text);
    const rule100 = suggestions.filter(s => s.ruleId === 'rule-100');
    expect(rule100.length).toBeGreaterThanOrEqual(2);
  });

  // ---------------------------------------------------------------------------
  // Rule 101 — "Just" / "Simply"
  // ---------------------------------------------------------------------------

  it('detects "just" filler (rule-101)', () => {
    const text = withPadding('you just add the file and just run the command to just start it.');
    const issues = advisor.validate(text);
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-101' }));
  });

  it('detects "simply" filler (rule-101)', () => {
    const text = withPadding('simply run the installer and simply follow the prompts.');
    const issues = advisor.validate(text);
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-101' }));
  });

  // ---------------------------------------------------------------------------
  // Rule 102 — "Basically" / "Essentially"
  // ---------------------------------------------------------------------------

  it('detects "basically" / "essentially" filler (rule-102)', () => {
    const text = withPadding('basically it works and essentially it is fine.');
    const issues = advisor.validate(text);
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-102' }));
  });

  // ---------------------------------------------------------------------------
  // Rule 103 — "Actually" / "Literally"
  // ---------------------------------------------------------------------------

  it('detects "actually" / "literally" filler (rule-103)', () => {
    const text = withPadding('this actually works and is literally the best approach.');
    const issues = advisor.validate(text);
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-103' }));
  });

  // ---------------------------------------------------------------------------
  // Rule 104 — "In order to"
  // ---------------------------------------------------------------------------

  it('detects "in order to" and suggests "to" (rule-104)', () => {
    const text = withPadding('in order to install the package run in order to configure it.');
    const suggestions = advisor.getSuggestions(text);
    const rule104 = suggestions.filter(s => s.ruleId === 'rule-104');
    expect(rule104.length).toBeGreaterThanOrEqual(2);
    expect(rule104[0].suggested).toBe('to');
  });

  // ---------------------------------------------------------------------------
  // Rule 105 — "Due to the fact that"
  // ---------------------------------------------------------------------------

  it('detects "due to the fact that" and suggests "because" (rule-105)', () => {
    const text = withPadding('due to the fact that it rains the event is cancelled.');
    const suggestions = advisor.getSuggestions(text);
    const rule105 = suggestions.filter(s => s.ruleId === 'rule-105');
    expect(rule105).toHaveLength(1);
    expect(rule105[0].suggested).toBe('because');
  });

  // ---------------------------------------------------------------------------
  // Rule 106 — "At this point in time" / "At the present time"
  // ---------------------------------------------------------------------------

  it('detects "at this point in time" and suggests "now" (rule-106)', () => {
    const text = withPadding('at this point in time the feature is stable.');
    const suggestions = advisor.getSuggestions(text);
    const rule106 = suggestions.filter(s => s.ruleId === 'rule-106');
    expect(rule106).toHaveLength(1);
    expect(rule106[0].suggested).toBe('now');
  });

  it('detects "at the present time" and suggests "currently" (rule-106)', () => {
    const text = withPadding('at the present time the API supports JSON and XML.');
    const suggestions = advisor.getSuggestions(text);
    const rule106 = suggestions.filter(s => s.ruleId === 'rule-106');
    expect(rule106).toHaveLength(1);
    expect(rule106[0].suggested).toBe('currently');
  });

  // ---------------------------------------------------------------------------
  // Rule 107 — "It is important to note that"
  // ---------------------------------------------------------------------------

  it('detects "it is important to note that" (rule-107)', () => {
    const text = withPadding('it is important to note that React uses a virtual DOM.');
    const suggestions = advisor.getSuggestions(text);
    const rule107 = suggestions.filter(s => s.ruleId === 'rule-107');
    expect(rule107).toHaveLength(1);
    expect(rule107[0].suggested).toBe('(remove)');
  });

  // ---------------------------------------------------------------------------
  // Rule 108 — "In the event that"
  // ---------------------------------------------------------------------------

  it('detects "in the event that" and suggests "if" (rule-108)', () => {
    const text = withPadding('in the event that the server fails restart the service.');
    const suggestions = advisor.getSuggestions(text);
    const rule108 = suggestions.filter(s => s.ruleId === 'rule-108');
    expect(rule108).toHaveLength(1);
    expect(rule108[0].suggested).toBe('if');
  });

  // ---------------------------------------------------------------------------
  // Rule 109 — "A large number of"
  // ---------------------------------------------------------------------------

  it('detects "a large number of" and suggests "many" (rule-109)', () => {
    const text = withPadding('a large number of users reported the issue last week.');
    const suggestions = advisor.getSuggestions(text);
    const rule109 = suggestions.filter(s => s.ruleId === 'rule-109');
    expect(rule109).toHaveLength(1);
    expect(rule109[0].suggested).toBe('many');
  });

  // ---------------------------------------------------------------------------
  // Rule 110 — "Has the ability to"
  // ---------------------------------------------------------------------------

  it('detects "has the ability to" and suggests "can" (rule-110)', () => {
    const text = withPadding('the system has the ability to process large datasets.');
    const suggestions = advisor.getSuggestions(text);
    const rule110 = suggestions.filter(s => s.ruleId === 'rule-110');
    expect(rule110).toHaveLength(1);
    expect(rule110[0].suggested).toBe('can');
  });

  // ---------------------------------------------------------------------------
  // Rule 111 — "In spite of the fact that"
  // ---------------------------------------------------------------------------

  it('detects "in spite of the fact that" and suggests "although" (rule-111)', () => {
    const text = withPadding('in spite of the fact that the API changed the code still works.');
    const suggestions = advisor.getSuggestions(text);
    const rule111 = suggestions.filter(s => s.ruleId === 'rule-111');
    expect(rule111).toHaveLength(1);
    expect(rule111[0].suggested).toBe('although');
  });

  // ---------------------------------------------------------------------------
  // Rule 112 — "For the purpose of"
  // ---------------------------------------------------------------------------

  it('detects "for the purpose of" and suggests "to" (rule-112)', () => {
    const text = withPadding('for the purpose of testing we created a mock server.');
    const suggestions = advisor.getSuggestions(text);
    const rule112 = suggestions.filter(s => s.ruleId === 'rule-112');
    expect(rule112).toHaveLength(1);
    expect(rule112[0].suggested).toBe('to');
  });

  // ---------------------------------------------------------------------------
  // Combined test — multiple rules fire
  // ---------------------------------------------------------------------------

  it('flags multiple rules when several fillers appear', () => {
    const text =
      'Basically in order to install you just run the command. ' +
      'The tool is very fast and has the ability to process data. ' +
      'Due to the fact that it is lightweight it works well.';
    const issues = advisor.validate(text);
    // Should fire at least rules 102 (basically), 104 (in order to), 101 (just), 100 (very fast), 110 (has the ability to), 105 (due to the fact that)
    const ruleIds = issues.map(i => i.ruleId);
    expect(ruleIds).toContain('rule-102');
    expect(ruleIds).toContain('rule-104');
    expect(ruleIds).toContain('rule-101');
    expect(ruleIds).toContain('rule-100');
    expect(ruleIds).toContain('rule-110');
    expect(ruleIds).toContain('rule-105');
  });

  // ---------------------------------------------------------------------------
  // Clean text — no fillers
  // ---------------------------------------------------------------------------

  it('returns no issues for clean text', () => {
    const text =
      'The framework processes data through well-defined pipelines. ' +
      'Each module communicates via typed interfaces. ' +
      'Performance benchmarks confirm consistent throughput under load.';
    const issues = advisor.validate(text);
    expect(issues).toHaveLength(0);
  });

  it('returns no issues for empty text', () => {
    expect(advisor.validate('')).toHaveLength(0);
    expect(advisor.validate('   ')).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Threshold test — 1 filler in long text does not trigger
  // ---------------------------------------------------------------------------

  it('does not flag when filler ratio is below 2% threshold', () => {
    // ~100 words of clean text + 1 filler word -> ~1% ratio
    const text = longCleanText('The system is very fast.');
    const issues = advisor.validate(text);
    expect(issues).toHaveLength(0);
    // But getSuggestions still finds the match (no threshold gating)
    const suggestions = advisor.getSuggestions(text);
    expect(suggestions.length).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // getSuggestions shape validation
  // ---------------------------------------------------------------------------

  it('returns correctly shaped suggestion objects', () => {
    const text = withPadding('in order to install the tool.');
    const suggestions = advisor.getSuggestions(text);
    expect(suggestions.length).toBeGreaterThanOrEqual(1);
    const first = suggestions.find(s => s.ruleId === 'rule-104')!;
    expect(first).toBeDefined();
    expect(first).toHaveProperty('original');
    expect(first).toHaveProperty('suggested');
    expect(first).toHaveProperty('ruleId');
    expect(first.original.toLowerCase()).toContain('in order to');
    expect(first.suggested).toBe('to');
  });

  // ---------------------------------------------------------------------------
  // Issue shape validation
  // ---------------------------------------------------------------------------

  it('includes all required fields in issues', () => {
    const text =
      'You just add the file and just run it and just start the server and just deploy it.';
    const issues = advisor.validate(text);
    expect(issues.length).toBeGreaterThanOrEqual(1);
    const issue = issues.find(i => i.ruleId === 'rule-101')!;
    expect(issue).toBeDefined();
    expect(issue.severity).toBe('low');
    expect(issue.title).toBeTruthy();
    expect(issue.description).toContain('occurrence');
    expect(issue.affectedElement).toBeTruthy();
    expect(issue.exampleFix).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // Case insensitivity
  // ---------------------------------------------------------------------------

  it('detects fillers regardless of casing', () => {
    const text = withPadding('BASICALLY the API works. In Order To configure it run setup.');
    const suggestions = advisor.getSuggestions(text);
    const ruleIds = suggestions.map(s => s.ruleId);
    expect(ruleIds).toContain('rule-102');
    expect(ruleIds).toContain('rule-104');
  });
});
