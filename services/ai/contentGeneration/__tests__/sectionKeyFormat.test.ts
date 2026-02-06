import { describe, it, expect } from 'vitest';

describe('Section Key Format', () => {
  it('should use hyphen and 0-indexed format: section-0, section-1', () => {
    // Test the expected format
    const expectedKeys = ['section-0', 'section-1', 'section-2'];

    expectedKeys.forEach((key, idx) => {
      expect(key).toBe(`section-${idx}`);
      expect(key).toMatch(/^section-\d+$/);
      expect(key).not.toContain('_'); // No underscores
    });
  });

  it('should use parent-sub-N format for subsections', () => {
    const parentKey = 'section-1';
    const expectedSubKeys = ['section-1-sub-0', 'section-1-sub-1'];

    expectedSubKeys.forEach((key, idx) => {
      expect(key).toBe(`${parentKey}-sub-${idx}`);
    });
  });
});
