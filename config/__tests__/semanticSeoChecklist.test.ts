import { describe, test, expect } from 'vitest';
import { SEMANTIC_SEO_CHECKLIST, getChecklistByPhase, getFluffWordsKillList } from '../semanticSeoChecklist';

describe('semanticSeoChecklist', () => {
  test('has all 6 phases', () => {
    expect(SEMANTIC_SEO_CHECKLIST).toHaveLength(6);
  });

  test('each phase has items', () => {
    for (const phase of SEMANTIC_SEO_CHECKLIST) {
      expect(phase.items.length).toBeGreaterThan(0);
    }
  });

  test('each phase has unique id', () => {
    const ids = SEMANTIC_SEO_CHECKLIST.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('each item has unique id across all phases', () => {
    const allIds = SEMANTIC_SEO_CHECKLIST.flatMap(p => p.items.map(i => i.id));
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  test('total items is 40+', () => {
    const total = SEMANTIC_SEO_CHECKLIST.reduce((sum, phase) => sum + phase.items.length, 0);
    expect(total).toBeGreaterThanOrEqual(40);
  });

  test('getChecklistByPhase returns correct phase', () => {
    const writing = getChecklistByPhase('writing-sentence');
    expect(writing).toBeDefined();
    expect(writing!.items.length).toBeGreaterThanOrEqual(8);
  });

  test('getChecklistByPhase returns undefined for unknown phase', () => {
    expect(getChecklistByPhase('nonexistent')).toBeUndefined();
  });

  test('fluff words kill list includes English, Dutch, and German', () => {
    const list = getFluffWordsKillList();
    expect(list.length).toBeGreaterThanOrEqual(30);
    // English
    expect(list).toContain('actually');
    expect(list).toContain('basically');
    // Dutch
    expect(list).toContain('eigenlijk');
    expect(list).toContain('gewoon');
    // German
    expect(list).toContain('eigentlich');
    expect(list).toContain('quasi');
  });

  test('all items have required fields', () => {
    for (const phase of SEMANTIC_SEO_CHECKLIST) {
      for (const item of phase.items) {
        expect(item.id).toBeTruthy();
        expect(item.label).toBeTruthy();
        expect(item.category).toBeTruthy();
        expect(typeof item.autoCheckable).toBe('boolean');
      }
    }
  });

  test('autoCheckable items with auditRuleId have valid rule references', () => {
    const withRules = SEMANTIC_SEO_CHECKLIST.flatMap(p => p.items).filter(i => i.auditRuleId);
    expect(withRules.length).toBeGreaterThan(0);
    for (const item of withRules) {
      expect(item.autoCheckable).toBe(true);
      expect(item.auditRuleId).toBeTruthy();
    }
  });
});
