/**
 * PerformanceTrendChart Tests
 *
 * Tests for the dual Y-axis SVG performance trend chart component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PerformanceTrendChart } from '../PerformanceTrendChart';
import type { PerformanceCorrelation } from '../../../services/audit/types';

/** Build a sample PerformanceCorrelation with `count` data points. */
function makeCorrelation(
    count: number,
    overrides?: Partial<PerformanceCorrelation>
): PerformanceCorrelation {
    const auditScoreTrend = Array.from({ length: count }, (_, i) => ({
        date: `2026-01-${String(i + 1).padStart(2, '0')}`,
        score: 60 + i * 5,
    }));
    const clicksTrend = Array.from({ length: count }, (_, i) => ({
        date: `2026-01-${String(i + 1).padStart(2, '0')}`,
        value: 100 + i * 30,
    }));
    const impressionsTrend = Array.from({ length: count }, (_, i) => ({
        date: `2026-01-${String(i + 1).padStart(2, '0')}`,
        value: 500 + i * 100,
    }));
    return {
        auditScoreTrend,
        clicksTrend,
        impressionsTrend,
        correlationCoefficient: 0.85,
        insight: 'Audit score improvements correlate with increased clicks.',
        ...overrides,
    };
}

describe('PerformanceTrendChart', () => {
    it('renders SVG element', () => {
        const correlation = makeCorrelation(4);
        render(<PerformanceTrendChart correlation={correlation} />);

        const svg = screen.getByTestId('performance-trend-svg');
        expect(svg).toBeInTheDocument();
        expect(svg.tagName.toLowerCase()).toBe('svg');
    });

    it('shows correlation coefficient badge', () => {
        const correlation = makeCorrelation(3, { correlationCoefficient: 0.85 });
        render(<PerformanceTrendChart correlation={correlation} />);

        const badge = screen.getByTestId('correlation-badge');
        expect(badge).toBeInTheDocument();
        expect(badge.textContent).toContain('r = 0.85');
    });

    it('shows insight text', () => {
        const correlation = makeCorrelation(3, {
            insight: 'Strong positive correlation between audit score and clicks.',
        });
        render(<PerformanceTrendChart correlation={correlation} />);

        const insightEl = screen.getByTestId('insight-text');
        expect(insightEl).toBeInTheDocument();
        expect(insightEl.textContent).toContain(
            'Strong positive correlation between audit score and clicks.'
        );
    });

    it('renders data points for each trend line', () => {
        const count = 5;
        const correlation = makeCorrelation(count);
        render(<PerformanceTrendChart correlation={correlation} />);

        // Score points
        for (let i = 0; i < count; i++) {
            expect(screen.getByTestId(`score-point-${i}`)).toBeInTheDocument();
        }
        // Clicks points
        for (let i = 0; i < count; i++) {
            expect(screen.getByTestId(`clicks-point-${i}`)).toBeInTheDocument();
        }
        // Impressions points
        for (let i = 0; i < count; i++) {
            expect(screen.getByTestId(`impressions-point-${i}`)).toBeInTheDocument();
        }
    });

    it('renders trend line paths', () => {
        const correlation = makeCorrelation(3);
        render(<PerformanceTrendChart correlation={correlation} />);

        expect(screen.getByTestId('score-line')).toBeInTheDocument();
        expect(screen.getByTestId('clicks-line')).toBeInTheDocument();
        expect(screen.getByTestId('impressions-line')).toBeInTheDocument();
    });

    it('handles empty data gracefully', () => {
        const correlation: PerformanceCorrelation = {
            auditScoreTrend: [],
            clicksTrend: [],
            impressionsTrend: [],
            correlationCoefficient: 0,
            insight: '',
        };
        render(<PerformanceTrendChart correlation={correlation} />);

        expect(screen.getByTestId('empty-message')).toBeInTheDocument();
        expect(
            screen.getByText('No performance trend data available.')
        ).toBeInTheDocument();

        // SVG should NOT be rendered
        expect(screen.queryByTestId('performance-trend-svg')).not.toBeInTheDocument();
    });

    it('color-codes correlation badge green for positive correlation (> 0.5)', () => {
        const correlation = makeCorrelation(3, { correlationCoefficient: 0.72 });
        render(<PerformanceTrendChart correlation={correlation} />);

        const badge = screen.getByTestId('correlation-badge');
        expect(badge.className).toContain('text-green-400');
        expect(badge.textContent).toContain('r = 0.72');
    });

    it('color-codes correlation badge yellow for weak correlation (-0.5 to 0.5)', () => {
        const correlation = makeCorrelation(3, { correlationCoefficient: 0.15 });
        render(<PerformanceTrendChart correlation={correlation} />);

        const badge = screen.getByTestId('correlation-badge');
        expect(badge.className).toContain('text-yellow-400');
        expect(badge.textContent).toContain('r = 0.15');
    });

    it('color-codes correlation badge red for negative correlation (< -0.5)', () => {
        const correlation = makeCorrelation(3, { correlationCoefficient: -0.68 });
        render(<PerformanceTrendChart correlation={correlation} />);

        const badge = screen.getByTestId('correlation-badge');
        expect(badge.className).toContain('text-red-400');
        expect(badge.textContent).toContain('r = -0.68');
    });

    it('accepts custom width and height props', () => {
        const correlation = makeCorrelation(3);
        render(
            <PerformanceTrendChart correlation={correlation} width={800} height={400} />
        );

        const svg = screen.getByTestId('performance-trend-svg');
        expect(svg.getAttribute('viewBox')).toBe('0 0 800 400');
    });

    it('renders legend labels for all three series', () => {
        const correlation = makeCorrelation(3);
        render(<PerformanceTrendChart correlation={correlation} />);

        // "Audit Score" appears both as Y-axis title (SVG text) and legend label
        const auditScoreElements = screen.getAllByText('Audit Score');
        expect(auditScoreElements.length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('Clicks')).toBeInTheDocument();
        expect(screen.getByText('Impressions')).toBeInTheDocument();
    });

    it('does not render insight section when insight is empty', () => {
        const correlation = makeCorrelation(3, { insight: '' });
        render(<PerformanceTrendChart correlation={correlation} />);

        expect(screen.queryByTestId('insight-text')).not.toBeInTheDocument();
    });
});
