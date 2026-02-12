/**
 * Performance Trend Chart Component
 *
 * A dual Y-axis SVG chart that overlays audit score trends with GSC
 * performance metrics (clicks and impressions). Displays a correlation
 * coefficient badge and an insight summary below the chart.
 *
 * Pure SVG — no external charting dependencies.
 */

import React, { useMemo } from 'react';
import type { PerformanceCorrelation } from '../../services/audit/types';

export interface PerformanceTrendChartProps {
    correlation: PerformanceCorrelation;
    width?: number;
    height?: number;
}

const PADDING_LEFT = 50;
const PADDING_RIGHT = 60;
const PADDING_TOP = 30;
const PADDING_BOTTOM = 40;

/** Format a date string as "MMM DD" (e.g. "Jan 15"). */
function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return `${months[date.getMonth()]} ${String(date.getDate()).padStart(2, '0')}`;
}

/** Compute a "nice" max value for a right-axis scale. */
function niceMax(value: number): number {
    if (value <= 0) return 10;
    const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
    const normalized = value / magnitude;
    if (normalized <= 1) return magnitude;
    if (normalized <= 2) return 2 * magnitude;
    if (normalized <= 5) return 5 * magnitude;
    return 10 * magnitude;
}

/** Return badge colour class for a given correlation coefficient. */
function correlationColor(r: number): string {
    if (r > 0.5) return '#22c55e'; // green-500
    if (r < -0.5) return '#ef4444'; // red-500
    return '#eab308'; // yellow-500
}

function correlationTextColor(r: number): string {
    if (r > 0.5) return 'text-green-400';
    if (r < -0.5) return 'text-red-400';
    return 'text-yellow-400';
}

export const PerformanceTrendChart: React.FC<PerformanceTrendChartProps> = ({
    correlation,
    width = 600,
    height = 300,
}) => {
    const { auditScoreTrend, clicksTrend, impressionsTrend, correlationCoefficient, insight } =
        correlation;

    const chartLeft = PADDING_LEFT;
    const chartRight = width - PADDING_RIGHT;
    const chartTop = PADDING_TOP;
    const chartBottom = height - PADDING_BOTTOM;
    const chartWidth = chartRight - chartLeft;
    const chartHeight = chartBottom - chartTop;

    // ---- Determine whether we have any data to render ----
    const hasData =
        auditScoreTrend.length > 0 ||
        clicksTrend.length > 0 ||
        impressionsTrend.length > 0;

    // ---- Collect all unique dates and use them as x-axis ----
    const allDates = useMemo(() => {
        const dateSet = new Set<string>();
        auditScoreTrend.forEach((d) => dateSet.add(d.date));
        clicksTrend.forEach((d) => dateSet.add(d.date));
        impressionsTrend.forEach((d) => dateSet.add(d.date));
        return Array.from(dateSet).sort();
    }, [auditScoreTrend, clicksTrend, impressionsTrend]);

    // ---- Right-axis scale: max of clicks & impressions ----
    const rightMax = useMemo(() => {
        const clickMax = clicksTrend.length > 0 ? Math.max(...clicksTrend.map((d) => d.value)) : 0;
        const impMax =
            impressionsTrend.length > 0 ? Math.max(...impressionsTrend.map((d) => d.value)) : 0;
        return niceMax(Math.max(clickMax, impMax, 1));
    }, [clicksTrend, impressionsTrend]);

    // ---- Helper: map index to x coordinate ----
    const xForIndex = (i: number): number => {
        if (allDates.length <= 1) return chartLeft + chartWidth / 2;
        return chartLeft + (i / (allDates.length - 1)) * chartWidth;
    };

    // ---- Helper: map score (0-100) to y coordinate (left axis) ----
    const yForScore = (score: number): number => {
        return chartBottom - (score / 100) * chartHeight;
    };

    // ---- Helper: map right-axis value to y coordinate ----
    const yForRight = (value: number): number => {
        return chartBottom - (value / rightMax) * chartHeight;
    };

    // ---- Build lookup maps by date for each series ----
    const scoreByDate = useMemo(() => {
        const map = new Map<string, number>();
        auditScoreTrend.forEach((d) => map.set(d.date, d.score));
        return map;
    }, [auditScoreTrend]);

    const clicksByDate = useMemo(() => {
        const map = new Map<string, number>();
        clicksTrend.forEach((d) => map.set(d.date, d.value));
        return map;
    }, [clicksTrend]);

    const impressionsByDate = useMemo(() => {
        const map = new Map<string, number>();
        impressionsTrend.forEach((d) => map.set(d.date, d.value));
        return map;
    }, [impressionsTrend]);

    // ---- Compute polyline points for each series ----
    const scorePoints = useMemo(() => {
        return allDates
            .map((date, i) => {
                const score = scoreByDate.get(date);
                if (score === undefined) return null;
                return { x: xForIndex(i), y: yForScore(score), date, value: score };
            })
            .filter(Boolean) as { x: number; y: number; date: string; value: number }[];
    }, [allDates, scoreByDate]);

    const clicksPoints = useMemo(() => {
        return allDates
            .map((date, i) => {
                const value = clicksByDate.get(date);
                if (value === undefined) return null;
                return { x: xForIndex(i), y: yForRight(value), date, value };
            })
            .filter(Boolean) as { x: number; y: number; date: string; value: number }[];
    }, [allDates, clicksByDate, rightMax]);

    const impressionsPoints = useMemo(() => {
        return allDates
            .map((date, i) => {
                const value = impressionsByDate.get(date);
                if (value === undefined) return null;
                return { x: xForIndex(i), y: yForRight(value), date, value };
            })
            .filter(Boolean) as { x: number; y: number; date: string; value: number }[];
    }, [allDates, impressionsByDate, rightMax]);

    // ---- Build polyline path strings ----
    const toPath = (pts: { x: number; y: number }[]): string =>
        pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    const scorePath = useMemo(() => toPath(scorePoints), [scorePoints]);
    const clicksPath = useMemo(() => toPath(clicksPoints), [clicksPoints]);
    const impressionsPath = useMemo(() => toPath(impressionsPoints), [impressionsPoints]);

    // ---- Left Y-axis labels (0, 25, 50, 75, 100) ----
    const leftYLabels = [0, 25, 50, 75, 100];

    // ---- Right Y-axis labels (5 evenly-spaced ticks) ----
    const rightYLabels = useMemo(() => {
        return [0, 0.25, 0.5, 0.75, 1].map((frac) => Math.round(frac * rightMax));
    }, [rightMax]);

    // ---- X-axis labels: up to 6 evenly-spaced ----
    const xLabels = useMemo(() => {
        if (allDates.length === 0) return [];
        if (allDates.length <= 6) {
            return allDates.map((date, i) => ({ x: xForIndex(i), label: formatDate(date) }));
        }
        const step = Math.floor((allDates.length - 1) / 5);
        const indices = [0];
        for (let i = step; i < allDates.length - 1; i += step) {
            indices.push(i);
        }
        indices.push(allDates.length - 1);
        return indices.map((idx) => ({
            x: xForIndex(idx),
            label: formatDate(allDates[idx]),
        }));
    }, [allDates]);

    // ---- Correlation badge ----
    const badgeColor = correlationColor(correlationCoefficient);
    const badgeTextClass = correlationTextColor(correlationCoefficient);

    if (!hasData) {
        return (
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center">
                <p className="text-gray-400" data-testid="empty-message">
                    No performance trend data available.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Chart container */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-300">
                        Audit Score vs. Performance
                    </h3>
                    {/* Correlation coefficient badge */}
                    <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeTextClass}`}
                        style={{ backgroundColor: `${badgeColor}20`, border: `1px solid ${badgeColor}40` }}
                        data-testid="correlation-badge"
                    >
                        r = {correlationCoefficient.toFixed(2)}
                    </span>
                </div>

                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    className="w-full h-auto"
                    role="img"
                    aria-label="Performance trend chart with dual Y-axis"
                    data-testid="performance-trend-svg"
                >
                    {/* Grid lines */}
                    {leftYLabels.map((val) => {
                        const y = yForScore(val);
                        return (
                            <line
                                key={`grid-${val}`}
                                x1={chartLeft}
                                y1={y}
                                x2={chartRight}
                                y2={y}
                                stroke="#374151"
                                strokeWidth="1"
                                strokeDasharray="4 4"
                            />
                        );
                    })}

                    {/* Left Y-axis labels (Audit Score) */}
                    {leftYLabels.map((val) => {
                        const y = yForScore(val);
                        return (
                            <text
                                key={`lylabel-${val}`}
                                x={chartLeft - 8}
                                y={y + 4}
                                textAnchor="end"
                                className="fill-blue-400"
                                fontSize="10"
                            >
                                {val}
                            </text>
                        );
                    })}

                    {/* Left Y-axis title */}
                    <text
                        x={12}
                        y={chartTop + chartHeight / 2}
                        textAnchor="middle"
                        className="fill-blue-400"
                        fontSize="10"
                        transform={`rotate(-90, 12, ${chartTop + chartHeight / 2})`}
                    >
                        Audit Score
                    </text>

                    {/* Right Y-axis labels (Clicks / Impressions) */}
                    {rightYLabels.map((val) => {
                        const y = yForRight(val);
                        return (
                            <text
                                key={`rylabel-${val}`}
                                x={chartRight + 8}
                                y={y + 4}
                                textAnchor="start"
                                className="fill-gray-400"
                                fontSize="10"
                            >
                                {val >= 1000 ? `${(val / 1000).toFixed(val >= 10000 ? 0 : 1)}k` : val}
                            </text>
                        );
                    })}

                    {/* Right Y-axis title */}
                    <text
                        x={width - 8}
                        y={chartTop + chartHeight / 2}
                        textAnchor="middle"
                        className="fill-gray-400"
                        fontSize="10"
                        transform={`rotate(90, ${width - 8}, ${chartTop + chartHeight / 2})`}
                    >
                        Clicks / Impressions
                    </text>

                    {/* X-axis labels */}
                    {xLabels.map((item, i) => (
                        <text
                            key={`xlabel-${i}`}
                            x={item.x}
                            y={chartBottom + 20}
                            textAnchor="middle"
                            className="fill-gray-500"
                            fontSize="10"
                        >
                            {item.label}
                        </text>
                    ))}

                    {/* Impressions line (orange, dashed) */}
                    {impressionsPath && (
                        <path
                            d={impressionsPath}
                            fill="none"
                            stroke="#f97316"
                            strokeWidth="1.5"
                            strokeDasharray="6 3"
                            opacity="0.7"
                            data-testid="impressions-line"
                        />
                    )}

                    {/* Clicks line (green, dashed) */}
                    {clicksPath && (
                        <path
                            d={clicksPath}
                            fill="none"
                            stroke="#22c55e"
                            strokeWidth="1.5"
                            strokeDasharray="4 2"
                            opacity="0.8"
                            data-testid="clicks-line"
                        />
                    )}

                    {/* Score line (blue, solid) */}
                    {scorePath && (
                        <path
                            d={scorePath}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            data-testid="score-line"
                        />
                    )}

                    {/* Score data points */}
                    {scorePoints.map((p, i) => (
                        <circle
                            key={`score-pt-${i}`}
                            cx={p.x}
                            cy={p.y}
                            r={3.5}
                            fill="#3b82f6"
                            stroke="#1d4ed8"
                            strokeWidth="1"
                            data-testid={`score-point-${i}`}
                        />
                    ))}

                    {/* Clicks data points */}
                    {clicksPoints.map((p, i) => (
                        <circle
                            key={`clicks-pt-${i}`}
                            cx={p.x}
                            cy={p.y}
                            r={3}
                            fill="#22c55e"
                            stroke="#16a34a"
                            strokeWidth="1"
                            data-testid={`clicks-point-${i}`}
                        />
                    ))}

                    {/* Impressions data points */}
                    {impressionsPoints.map((p, i) => (
                        <circle
                            key={`imp-pt-${i}`}
                            cx={p.x}
                            cy={p.y}
                            r={3}
                            fill="#f97316"
                            stroke="#ea580c"
                            strokeWidth="1"
                            data-testid={`impressions-point-${i}`}
                        />
                    ))}
                </svg>

                {/* Legend */}
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <div className="flex items-center gap-1.5">
                        <span className="w-3 h-0.5 bg-blue-500 inline-block" />
                        <span>Audit Score</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-3 h-0.5 bg-green-500 inline-block" />
                        <span>Clicks</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-3 h-0.5 bg-orange-500 inline-block opacity-70" />
                        <span>Impressions</span>
                    </div>
                </div>
            </div>

            {/* Insight text */}
            {insight && (
                <div
                    className="bg-gray-800/50 rounded-lg p-3 border border-gray-700 text-sm text-gray-300"
                    data-testid="insight-text"
                >
                    {insight}
                </div>
            )}
        </div>
    );
};

export default PerformanceTrendChart;
