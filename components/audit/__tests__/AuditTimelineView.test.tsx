/**
 * AuditTimelineView Tests
 *
 * Tests for the SVG-based audit timeline chart component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuditTimelineView, AuditTimelineSnapshot } from '../AuditTimelineView';

const makeSnapshots = (count: number): AuditTimelineSnapshot[] =>
    Array.from({ length: count }, (_, i) => ({
        id: `snap-${i + 1}`,
        createdAt: `2026-01-${String(i + 1).padStart(2, '0')}T12:00:00Z`,
        overallScore: 60 + i * 5,
        gscClicks: 100 + i * 20,
        gscImpressions: 500 + i * 50,
        ga4Pageviews: 200 + i * 30,
    }));

describe('AuditTimelineView', () => {
    it('renders SVG when snapshots are provided', () => {
        const snapshots = makeSnapshots(3);
        render(<AuditTimelineView snapshots={snapshots} />);

        const svg = screen.getByTestId('timeline-svg');
        expect(svg).toBeInTheDocument();
        expect(svg.tagName.toLowerCase()).toBe('svg');
    });

    it('shows empty message when no snapshots', () => {
        render(<AuditTimelineView snapshots={[]} />);

        expect(screen.getByTestId('empty-message')).toBeInTheDocument();
        expect(
            screen.getByText('No audit history yet. Run your first audit to start tracking.')
        ).toBeInTheDocument();

        // SVG should NOT be rendered
        expect(screen.queryByTestId('timeline-svg')).not.toBeInTheDocument();
    });

    it('renders the correct number of data points', () => {
        const snapshots = makeSnapshots(5);
        render(<AuditTimelineView snapshots={snapshots} />);

        for (const s of snapshots) {
            expect(screen.getByTestId(`data-point-${s.id}`)).toBeInTheDocument();
        }
    });

    it('calls onSelectSnapshot when a dot is clicked', () => {
        const snapshots = makeSnapshots(3);
        const onSelect = vi.fn();
        render(<AuditTimelineView snapshots={snapshots} onSelectSnapshot={onSelect} />);

        const point = screen.getByTestId('data-point-snap-2');
        // Click the visible circle (second child within the group)
        const circles = point.querySelectorAll('circle');
        fireEvent.click(circles[1]);

        expect(onSelect).toHaveBeenCalledTimes(1);
        expect(onSelect).toHaveBeenCalledWith('snap-2');
    });

    it('shows score trend text when there are at least 2 snapshots', () => {
        const snapshots = makeSnapshots(3);
        // Scores: 60, 65, 70 => trend = +5
        render(<AuditTimelineView snapshots={snapshots} />);

        const trend = screen.getByTestId('score-trend');
        expect(trend).toBeInTheDocument();
        expect(trend.textContent).toContain('Improved by +5 since last audit');
    });

    it('shows decline trend when score decreased', () => {
        const snapshots: AuditTimelineSnapshot[] = [
            { id: 'a', createdAt: '2026-01-01T00:00:00Z', overallScore: 80 },
            { id: 'b', createdAt: '2026-01-15T00:00:00Z', overallScore: 77 },
        ];
        render(<AuditTimelineView snapshots={snapshots} />);

        const trend = screen.getByTestId('score-trend');
        expect(trend.textContent).toContain('Declined by -3 since last audit');
    });

    it('shows need-more-data message when only 1 snapshot', () => {
        const snapshots = makeSnapshots(1);
        render(<AuditTimelineView snapshots={snapshots} />);

        const trend = screen.getByTestId('score-trend');
        expect(trend.textContent).toContain('Need at least 2 audits to show trend');
    });

    it('shows total audits count', () => {
        const snapshots = makeSnapshots(4);
        render(<AuditTimelineView snapshots={snapshots} />);

        const totalAudits = screen.getByTestId('total-audits');
        expect(totalAudits).toBeInTheDocument();
        expect(totalAudits.textContent).toBe('4');
    });

    it('shows date range', () => {
        const snapshots = makeSnapshots(3);
        render(<AuditTimelineView snapshots={snapshots} />);

        const dateRange = screen.getByTestId('date-range');
        expect(dateRange).toBeInTheDocument();
        expect(dateRange.textContent).toContain('Jan 01');
        expect(dateRange.textContent).toContain('Jan 03');
    });

    it('renders performance overlay when enabled and data exists', () => {
        const snapshots = makeSnapshots(3);
        const { container } = render(
            <AuditTimelineView snapshots={snapshots} showPerformanceOverlay />
        );

        // Should show GSC Clicks legend label
        expect(screen.getByText('GSC Clicks')).toBeInTheDocument();

        // Should render a dashed path for clicks
        const paths = container.querySelectorAll('path');
        // Score line + clicks line = at least 2 paths
        expect(paths.length).toBeGreaterThanOrEqual(2);
    });

    it('does not render performance overlay when disabled', () => {
        const snapshots = makeSnapshots(3);
        render(<AuditTimelineView snapshots={snapshots} showPerformanceOverlay={false} />);

        expect(screen.queryByText('GSC Clicks')).not.toBeInTheDocument();
    });
});
