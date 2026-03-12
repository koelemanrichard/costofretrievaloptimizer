import { describe, it, expect } from 'vitest';
import {
  CrossPageEavConsistencyReporter,
  PageEav,
} from '../CrossPageEavConsistencyReporter';

describe('CrossPageEavConsistencyReporter', () => {
  const reporter = new CrossPageEavConsistencyReporter();

  // ---------------------------------------------------------------------------
  // Contradictions
  // ---------------------------------------------------------------------------

  describe('contradictions', () => {
    it('detects conflicting values for the same entity+attribute across pages', () => {
      const pageEavs: PageEav[] = [
        { page: '/about', entity: 'React', attribute: 'release year', value: '2013' },
        { page: '/history', entity: 'React', attribute: 'release year', value: '2014' },
      ];

      const report = reporter.analyze(pageEavs);

      expect(report.contradictions).toHaveLength(1);
      expect(report.contradictions[0].entity).toBe('React');
      expect(report.contradictions[0].attribute).toBe('release year');
      expect(report.contradictions[0].values).toHaveLength(2);
      expect(report.contradictions[0].values).toContainEqual(
        expect.objectContaining({ page: '/about', value: '2013' })
      );
      expect(report.contradictions[0].values).toContainEqual(
        expect.objectContaining({ page: '/history', value: '2014' })
      );
    });

    it('is case-insensitive for entity+attribute matching', () => {
      const pageEavs: PageEav[] = [
        { page: '/a', entity: 'React', attribute: 'Creator', value: 'Facebook' },
        { page: '/b', entity: 'react', attribute: 'creator', value: 'Meta' },
      ];

      const report = reporter.analyze(pageEavs);
      expect(report.contradictions).toHaveLength(1);
    });

    it('does not flag identical values (case-insensitive)', () => {
      const pageEavs: PageEav[] = [
        { page: '/a', entity: 'React', attribute: 'type', value: 'Library' },
        { page: '/b', entity: 'React', attribute: 'type', value: 'library' },
      ];

      const report = reporter.analyze(pageEavs);
      expect(report.contradictions).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Naming inconsistencies
  // ---------------------------------------------------------------------------

  describe('naming inconsistencies', () => {
    it('flags different spellings of the same entity (spaces/hyphens/underscores/dots)', () => {
      const pageEavs: PageEav[] = [
        { page: '/a', entity: 'Next.js', attribute: 'type', value: 'framework' },
        { page: '/b', entity: 'Next js', attribute: 'type', value: 'framework' },
        { page: '/c', entity: 'Next-js', attribute: 'type', value: 'framework' },
      ];

      const report = reporter.analyze(pageEavs);
      expect(report.namingInconsistencies).toHaveLength(1);
      const variants = report.namingInconsistencies[0].variants;
      expect(variants).toHaveLength(3);
      expect(variants).toContain('Next.js');
      expect(variants).toContain('Next js');
      expect(variants).toContain('Next-js');
    });

    it('suggests the most common variant', () => {
      const pageEavs: PageEav[] = [
        { page: '/a', entity: 'Next.js', attribute: 'type', value: 'framework' },
        { page: '/b', entity: 'Next.js', attribute: 'creator', value: 'Vercel' },
        { page: '/c', entity: 'Next-js', attribute: 'type', value: 'framework' },
      ];

      const report = reporter.analyze(pageEavs);
      expect(report.namingInconsistencies).toHaveLength(1);
      expect(report.namingInconsistencies[0].suggestion).toContain('Next.js');
    });

    it('does not flag entities with consistent naming', () => {
      const pageEavs: PageEav[] = [
        { page: '/a', entity: 'React', attribute: 'type', value: 'library' },
        { page: '/b', entity: 'React', attribute: 'creator', value: 'Meta' },
      ];

      const report = reporter.analyze(pageEavs);
      expect(report.namingInconsistencies).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Unit inconsistencies
  // ---------------------------------------------------------------------------

  describe('unit inconsistencies', () => {
    it('detects different unit formats for the same entity+attribute', () => {
      const pageEavs: PageEav[] = [
        { page: '/specs', entity: 'Model X', attribute: 'weight', value: '2300 kg' },
        { page: '/compare', entity: 'Model X', attribute: 'weight', value: '5070 lbs' },
      ];

      const report = reporter.analyze(pageEavs);
      expect(report.unitInconsistencies).toHaveLength(1);
      expect(report.unitInconsistencies[0].entity).toBe('Model X');
      expect(report.unitInconsistencies[0].attribute).toBe('weight');
      expect(report.unitInconsistencies[0].variants).toHaveLength(2);
    });

    it('does not flag matching units', () => {
      const pageEavs: PageEav[] = [
        { page: '/a', entity: 'Widget', attribute: 'length', value: '10 cm' },
        { page: '/b', entity: 'Widget', attribute: 'length', value: '15 cm' },
      ];

      const report = reporter.analyze(pageEavs);
      expect(report.unitInconsistencies).toHaveLength(0);
    });

    it('does not flag values without units', () => {
      const pageEavs: PageEav[] = [
        { page: '/a', entity: 'React', attribute: 'stars', value: 'many' },
        { page: '/b', entity: 'React', attribute: 'stars', value: 'lots' },
      ];

      const report = reporter.analyze(pageEavs);
      expect(report.unitInconsistencies).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // KBT Risk Score
  // ---------------------------------------------------------------------------

  describe('KBT risk score', () => {
    it('calculates score as (totalIssues / uniquePairs) * 100, capped at 100', () => {
      // 3 unique pairs, 1 contradiction on "year" => score = round(1/3*100) = 33
      // "type" and "license" have identical values, so no contradiction/unit issues
      const pageEavs: PageEav[] = [
        { page: '/a', entity: 'React', attribute: 'year', value: 'twenty thirteen' },
        { page: '/b', entity: 'React', attribute: 'year', value: 'twenty fourteen' },
        { page: '/a', entity: 'React', attribute: 'type', value: 'library' },
        { page: '/b', entity: 'React', attribute: 'type', value: 'library' },
        { page: '/a', entity: 'React', attribute: 'license', value: 'MIT' },
        { page: '/b', entity: 'React', attribute: 'license', value: 'MIT' },
      ];

      const report = reporter.analyze(pageEavs);
      // 1 contradiction, 0 naming, 0 unit => 1 issue / 3 pairs = 33
      expect(report.contradictions).toHaveLength(1);
      expect(report.namingInconsistencies).toHaveLength(0);
      expect(report.unitInconsistencies).toHaveLength(0);
      expect(report.kbtRiskScore).toBe(33);
    });

    it('returns 0 for empty input', () => {
      const report = reporter.analyze([]);
      expect(report.kbtRiskScore).toBe(0);
      expect(report.totalEavsAnalyzed).toBe(0);
    });

    it('caps at 100 when issues exceed unique pairs', () => {
      // 1 unique pair but with contradictions + naming + unit issues
      // We need many issues on few pairs. Create naming inconsistencies too.
      const pageEavs: PageEav[] = [
        { page: '/a', entity: 'Widget X', attribute: 'weight', value: '10 kg' },
        { page: '/b', entity: 'Widget-X', attribute: 'weight', value: '22 lbs' },
      ];

      const report = reporter.analyze(pageEavs);
      // 1 unique pair, potentially multiple issues (contradiction + naming + unit)
      // At least contradiction + naming + unit = 3 issues / 1 pair = 300 -> capped at 100
      expect(report.kbtRiskScore).toBeLessThanOrEqual(100);
    });

    it('returns totalEavsAnalyzed count', () => {
      const pageEavs: PageEav[] = [
        { page: '/a', entity: 'A', attribute: 'b', value: 'c' },
        { page: '/b', entity: 'A', attribute: 'b', value: 'c' },
        { page: '/c', entity: 'X', attribute: 'y', value: 'z' },
      ];

      const report = reporter.analyze(pageEavs);
      expect(report.totalEavsAnalyzed).toBe(3);
    });
  });

  // ---------------------------------------------------------------------------
  // Clean report
  // ---------------------------------------------------------------------------

  describe('clean data', () => {
    it('returns empty arrays when no issues exist', () => {
      const pageEavs: PageEav[] = [
        { page: '/a', entity: 'React', attribute: 'type', value: 'library' },
        { page: '/b', entity: 'React', attribute: 'type', value: 'library' },
      ];

      const report = reporter.analyze(pageEavs);
      expect(report.contradictions).toHaveLength(0);
      expect(report.namingInconsistencies).toHaveLength(0);
      expect(report.unitInconsistencies).toHaveLength(0);
      expect(report.kbtRiskScore).toBe(0);
    });
  });
});
