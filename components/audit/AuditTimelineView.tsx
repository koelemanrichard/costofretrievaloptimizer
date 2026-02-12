/**
 * Audit Timeline View Component
 *
 * Displays a timeline chart of audit scores over time using a pure SVG approach.
 * Supports an optional performance overlay (GSC clicks) and clickable data points
 * that trigger snapshot selection.
 */

import React, { useMemo } from 'react';

export interface AuditTimelineSnapshot {
    id: string;
    createdAt: string;
    overallScore: number;
    gscClicks?: number;
    gscImpressions?: number;
    ga4Pageviews?: number;
}

export interface AuditTimelineViewProps {
    snapshots: AuditTimelineSnapshot[];
    showPerformanceOverlay?: boolean;
    onSelectSnapshot?: (snapshotId: string) => void;
}

/** Format a date string as "MMM DD" (e.g. "Jan 15"). */
function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${String(date.getDate()).padStart(2, '0')}`;
}

const SVG_WIDTH = 600;
const SVG_HEIGHT = 300;
const PADDING = 40;

export const AuditTimelineView: React.FC<AuditTimelineViewProps> = ({
    snapshots,
    showPerformanceOverlay = false,
    onSelectSnapshot,
}) => {
    const maxScore = 100;

    // Map data points to SVG coordinates
    const points = useMemo(() => {
        if (snapshots.length === 0) return [];
        if (snapshots.length === 1) {
            return [
                {
                    x: SVG_WIDTH / 2,
                    y: SVG_HEIGHT - PADDING - (snapshots[0].overallScore / maxScore) * (SVG_HEIGHT - 2 * PADDING),
                    ...snapshots[0],
                },
            ];
        }
        return snapshots.map((s, i) => ({
            x: PADDING + (i / (snapshots.length - 1)) * (SVG_WIDTH - 2 * PADDING),
            y: SVG_HEIGHT - PADDING - (s.overallScore / maxScore) * (SVG_HEIGHT - 2 * PADDING),
            ...s,
        }));
    }, [snapshots]);

    // Compute optional GSC clicks overlay points (right-axis scale)
    const clicksPoints = useMemo(() => {
        if (!showPerformanceOverlay || snapshots.length === 0) return [];
        const clickValues = snapshots.map((s) => s.gscClicks ?? 0);
        const maxClicks = Math.max(...clickValues, 1);
        if (snapshots.length === 1) {
            return [
                {
                    x: SVG_WIDTH / 2,
                    y: SVG_HEIGHT - PADDING - (clickValues[0] / maxClicks) * (SVG_HEIGHT - 2 * PADDING),
                    clicks: clickValues[0],
                },
            ];
        }
        return snapshots.map((s, i) => ({
            x: PADDING + (i / (snapshots.length - 1)) * (SVG_WIDTH - 2 * PADDING),
            y: SVG_HEIGHT - PADDING - ((s.gscClicks ?? 0) / maxClicks) * (SVG_HEIGHT - 2 * PADDING),
            clicks: s.gscClicks ?? 0,
        }));
    }, [snapshots, showPerformanceOverlay]);

    // Score trend calculation
    const scoreTrend = useMemo(() => {
        if (snapshots.length < 2) return null;
        const latest = snapshots[snapshots.length - 1].overallScore;
        const previous = snapshots[snapshots.length - 2].overallScore;
        return latest - previous;
    }, [snapshots]);

    // Date range
    const dateRange = useMemo(() => {
        if (snapshots.length === 0) return null;
        if (snapshots.length === 1) return formatDate(snapshots[0].createdAt);
        return `${formatDate(snapshots[0].createdAt)} - ${formatDate(snapshots[snapshots.length - 1].createdAt)}`;
    }, [snapshots]);

    // Build polyline path string
    const linePath = useMemo(() => {
        if (points.length === 0) return '';
        return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    }, [points]);

    const clicksLinePath = useMemo(() => {
        if (clicksPoints.length === 0) return '';
        return clicksPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    }, [clicksPoints]);

    // Y-axis labels (0, 25, 50, 75, 100)
    const yLabels = [0, 25, 50, 75, 100];

    // X-axis: pick up to 6 evenly-spaced labels
    const xLabels = useMemo(() => {
        if (snapshots.length === 0) return [];
        if (snapshots.length <= 6) {
            return points.map((p) => ({ x: p.x, label: formatDate(p.createdAt) }));
        }
        const step = Math.floor((snapshots.length - 1) / 5);
        const indices = [0];
        for (let i = step; i < snapshots.length - 1; i += step) {
            indices.push(i);
        }
        indices.push(snapshots.length - 1);
        return indices.map((idx) => ({
            x: points[idx].x,
            label: formatDate(snapshots[idx].createdAt),
        }));
    }, [snapshots, points]);

    if (snapshots.length === 0) {
        return (
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center">
                <p className="text-gray-400" data-testid="empty-message">
                    No audit history yet. Run your first audit to start tracking.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* SVG Chart */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                <svg
                    viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                    className="w-full h-auto"
                    role="img"
                    aria-label="Audit score timeline chart"
                    data-testid="timeline-svg"
                >
                    {/* Grid lines */}
                    {yLabels.map((val) => {
                        const y = SVG_HEIGHT - PADDING - (val / maxScore) * (SVG_HEIGHT - 2 * PADDING);
                        return (
                            <g key={`grid-${val}`}>
                                <line
                                    x1={PADDING}
                                    y1={y}
                                    x2={SVG_WIDTH - PADDING}
                                    y2={y}
                                    stroke="#374151"
                                    strokeWidth="1"
                                    strokeDasharray="4 4"
                                />
                                <text
                                    x={PADDING - 8}
                                    y={y + 4}
                                    textAnchor="end"
                                    className="fill-gray-500"
                                    fontSize="11"
                                >
                                    {val}
                                </text>
                            </g>
                        );
                    })}

                    {/* X-axis labels */}
                    {xLabels.map((item, i) => (
                        <text
                            key={`xlabel-${i}`}
                            x={item.x}
                            y={SVG_HEIGHT - PADDING + 20}
                            textAnchor="middle"
                            className="fill-gray-500"
                            fontSize="10"
                        >
                            {item.label}
                        </text>
                    ))}

                    {/* GSC Clicks line (secondary) */}
                    {showPerformanceOverlay && clicksLinePath && (
                        <path
                            d={clicksLinePath}
                            fill="none"
                            stroke="#8b5cf6"
                            strokeWidth="1.5"
                            strokeDasharray="6 3"
                            opacity="0.6"
                        />
                    )}

                    {/* Score line */}
                    {linePath && (
                        <path
                            d={linePath}
                            fill="none"
                            stroke="#06b6d4"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    )}

                    {/* Data points (clickable) */}
                    {points.map((p) => (
                        <g key={p.id} data-testid={`data-point-${p.id}`}>
                            {/* Larger invisible hit area */}
                            <circle
                                cx={p.x}
                                cy={p.y}
                                r={12}
                                fill="transparent"
                                style={{ cursor: onSelectSnapshot ? 'pointer' : 'default' }}
                                onClick={() => onSelectSnapshot?.(p.id)}
                            />
                            {/* Visible dot */}
                            <circle
                                cx={p.x}
                                cy={p.y}
                                r={4}
                                fill="#06b6d4"
                                stroke="#0e7490"
                                strokeWidth="1.5"
                                style={{ cursor: onSelectSnapshot ? 'pointer' : 'default' }}
                                onClick={() => onSelectSnapshot?.(p.id)}
                            />
                            {/* Tooltip-style score label */}
                            <text
                                x={p.x}
                                y={p.y - 10}
                                textAnchor="middle"
                                className="fill-gray-300"
                                fontSize="10"
                                fontWeight="bold"
                            >
                                {p.overallScore}
                            </text>
                        </g>
                    ))}
                </svg>

                {/* Legend */}
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <div className="flex items-center gap-1.5">
                        <span className="w-3 h-0.5 bg-cyan-500 inline-block" />
                        <span>Audit Score</span>
                    </div>
                    {showPerformanceOverlay && (
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-0.5 bg-purple-500 inline-block opacity-60" />
                            <span>GSC Clicks</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Stats below chart */}
            <div className="grid grid-cols-3 gap-4">
                {/* Score trend */}
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                    <div className="text-sm text-gray-400 mb-1">Score Trend</div>
                    {scoreTrend !== null ? (
                        <div
                            className={`text-lg font-bold ${
                                scoreTrend > 0
                                    ? 'text-green-400'
                                    : scoreTrend < 0
                                    ? 'text-red-400'
                                    : 'text-gray-400'
                            }`}
                            data-testid="score-trend"
                        >
                            {scoreTrend > 0
                                ? `Improved by +${scoreTrend} since last audit`
                                : scoreTrend < 0
                                ? `Declined by ${scoreTrend} since last audit`
                                : 'No change since last audit'}
                        </div>
                    ) : (
                        <div className="text-sm text-gray-500" data-testid="score-trend">
                            Need at least 2 audits to show trend
                        </div>
                    )}
                </div>

                {/* Total audits */}
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                    <div className="text-sm text-gray-400 mb-1">Total Audits</div>
                    <div className="text-2xl font-bold text-white" data-testid="total-audits">
                        {snapshots.length}
                    </div>
                </div>

                {/* Date range */}
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                    <div className="text-sm text-gray-400 mb-1">Date Range</div>
                    <div className="text-sm font-medium text-gray-300" data-testid="date-range">
                        {dateRange}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuditTimelineView;
