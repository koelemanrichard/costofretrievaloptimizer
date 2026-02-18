// services/ai/contentGeneration/rulesEngine/__tests__/ruleRegistry.test.ts
import { RuleRegistry, QualityRule, RuleCategory, RuleSeverity } from '../ruleRegistry';

describe('RuleRegistry', () => {
  it('should return all rules', () => {
    const rules = RuleRegistry.getAllRules();
    expect(rules.length).toBeGreaterThanOrEqual(131);
  });

  it('should get rule by ID', () => {
    const rule = RuleRegistry.getRule('A1');
    expect(rule).toBeDefined();
    expect(rule?.id).toBe('A1');
    expect(rule?.category).toBe('Central Entity');
  });

  it('should get rules by category', () => {
    const rules = RuleRegistry.getRulesByCategory('Central Entity');
    expect(rules.length).toBe(7);
    expect(rules.every(r => r.category === 'Central Entity')).toBe(true);
  });

  it('should get critical rules', () => {
    const rules = RuleRegistry.getCriticalRules();
    expect(rules.every(r => r.isCritical)).toBe(true);
    expect(rules.some(r => r.id === 'A1')).toBe(true);
  });

  it('should get rules by severity', () => {
    const errorRules = RuleRegistry.getRulesBySeverity('error');
    expect(errorRules.every(r => r.severity === 'error')).toBe(true);
    expect(errorRules.length).toBeGreaterThan(0);

    const warningRules = RuleRegistry.getRulesBySeverity('warning');
    expect(warningRules.every(r => r.severity === 'warning')).toBe(true);
  });

  it('should return all categories', () => {
    const categories = RuleRegistry.getCategories();
    expect(categories).toContain('Central Entity');
    expect(categories).toContain('Introduction');
    expect(categories).toContain('EAV Integration');
    expect(categories).toContain('Sentence Structure');
    expect(categories).toContain('Headings');
    expect(categories).toContain('Paragraphs');
    expect(categories).toContain('Word Count');
    expect(categories).toContain('Vocabulary');
    expect(categories).toContain('Modality');
    expect(categories).toContain('YMYL');
    expect(categories).toContain('Lists');
    expect(categories).toContain('Tables');
    expect(categories).toContain('Images');
    expect(categories).toContain('Contextual Flow');
    expect(categories).toContain('Format Codes');
    expect(categories).toContain('Schema');
    expect(categories).toContain('Audit');
    expect(categories).toContain('Systemic');
    expect(categories).toContain('Internal Linking');
    expect(categories).toContain('Query Intelligence');
    expect(categories.length).toBe(20);
  });

  it('should return correct rule count', () => {
    const count = RuleRegistry.getRuleCount();
    expect(count).toBeGreaterThanOrEqual(113);
    expect(count).toBe(RuleRegistry.getAllRules().length);
  });

  it('should have correct category counts', () => {
    expect(RuleRegistry.getRulesByCategory('Central Entity').length).toBe(7);
    expect(RuleRegistry.getRulesByCategory('Introduction').length).toBe(8);
    expect(RuleRegistry.getRulesByCategory('EAV Integration').length).toBe(8);
    expect(RuleRegistry.getRulesByCategory('Sentence Structure').length).toBe(13);
    expect(RuleRegistry.getRulesByCategory('Headings').length).toBe(9);
    expect(RuleRegistry.getRulesByCategory('Paragraphs').length).toBe(6);
    expect(RuleRegistry.getRulesByCategory('Word Count').length).toBe(5);
    expect(RuleRegistry.getRulesByCategory('Vocabulary').length).toBe(13);
    expect(RuleRegistry.getRulesByCategory('Modality').length).toBe(5);
    expect(RuleRegistry.getRulesByCategory('YMYL').length).toBe(9);
    expect(RuleRegistry.getRulesByCategory('Lists').length).toBe(8);
    expect(RuleRegistry.getRulesByCategory('Tables').length).toBe(7);
    expect(RuleRegistry.getRulesByCategory('Images').length).toBe(7);
    expect(RuleRegistry.getRulesByCategory('Contextual Flow').length).toBe(6);
    expect(RuleRegistry.getRulesByCategory('Format Codes').length).toBe(6);
    expect(RuleRegistry.getRulesByCategory('Schema').length).toBe(10);
    expect(RuleRegistry.getRulesByCategory('Audit').length).toBe(6);
    expect(RuleRegistry.getRulesByCategory('Systemic').length).toBe(5);
    expect(RuleRegistry.getRulesByCategory('Internal Linking').length).toBe(3);
    expect(RuleRegistry.getRulesByCategory('Query Intelligence').length).toBe(2);
  });

  it('should have key critical rules defined correctly', () => {
    // A1: Entity in title
    const a1 = RuleRegistry.getRule('A1');
    expect(a1).toBeDefined();
    expect(a1?.severity).toBe('error');
    expect(a1?.isCritical).toBe(true);

    // A2: Entity in H1
    const a2 = RuleRegistry.getRule('A2');
    expect(a2).toBeDefined();
    expect(a2?.severity).toBe('error');
    expect(a2?.isCritical).toBe(true);

    // B1: Centerpiece in 100 words
    const b1 = RuleRegistry.getRule('B1');
    expect(b1).toBeDefined();
    expect(b1?.severity).toBe('error');
    expect(b1?.isCritical).toBe(true);

    // E1: Single H1
    const e1 = RuleRegistry.getRule('E1');
    expect(e1).toBeDefined();
    expect(e1?.severity).toBe('error');
    expect(e1?.isCritical).toBe(true);

    // E2: No level skip
    const e2 = RuleRegistry.getRule('E2');
    expect(e2).toBeDefined();
    expect(e2?.severity).toBe('error');
    expect(e2?.isCritical).toBe(true);

    // H3: No LLM signatures
    const h3 = RuleRegistry.getRule('H3');
    expect(h3).toBeDefined();
    expect(h3?.severity).toBe('error');
    expect(h3?.isCritical).toBe(true);

    // J2: YMYL disclaimer required
    const j2 = RuleRegistry.getRule('J2');
    expect(j2).toBeDefined();
    expect(j2?.severity).toBe('error');
    expect(j2?.isCritical).toBe(true);

    // M1: No heading-para gap for images
    const m1 = RuleRegistry.getRule('M1');
    expect(m1).toBeDefined();
    expect(m1?.severity).toBe('error');
    expect(m1?.isCritical).toBe(true);

    // Q4: Critical threshold 50%
    const q4 = RuleRegistry.getRule('Q4');
    expect(q4).toBeDefined();
    expect(q4?.severity).toBe('error');
    expect(q4?.isCritical).toBe(true);
  });

  it('should have systemic rules with validator names', () => {
    // S1: Output language
    const s1 = RuleRegistry.getRule('S1');
    expect(s1).toBeDefined();
    expect(s1?.severity).toBe('error');
    expect(s1?.isCritical).toBe(true);
    expect(s1?.validatorName).toBe('LanguageOutputValidator');

    // S3: Pillar alignment
    const s3 = RuleRegistry.getRule('S3');
    expect(s3).toBeDefined();
    expect(s3?.severity).toBe('warning');
    expect(s3?.isCritical).toBe(true);
    expect(s3?.validatorName).toBe('PillarAlignmentValidator');
  });

  it('should return undefined for non-existent rule', () => {
    const rule = RuleRegistry.getRule('Z99');
    expect(rule).toBeUndefined();
  });

  it('should return empty array for non-existent category', () => {
    const rules = RuleRegistry.getRulesByCategory('NonExistent' as RuleCategory);
    expect(rules).toEqual([]);
  });

  it('should have unique rule IDs', () => {
    const rules = RuleRegistry.getAllRules();
    const ids = rules.map(r => r.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have all required fields for each rule', () => {
    const rules = RuleRegistry.getAllRules();
    rules.forEach(rule => {
      expect(rule.id).toBeDefined();
      expect(rule.id.length).toBeGreaterThan(0);
      expect(rule.category).toBeDefined();
      expect(rule.name).toBeDefined();
      expect(rule.name.length).toBeGreaterThan(0);
      expect(rule.description).toBeDefined();
      expect(rule.description.length).toBeGreaterThan(0);
      expect(['error', 'warning', 'info']).toContain(rule.severity);
      expect(typeof rule.isCritical).toBe('boolean');
    });
  });
});
