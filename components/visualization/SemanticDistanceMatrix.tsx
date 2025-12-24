/**
 * SemanticDistanceMatrix - Heatmap visualization of semantic distances
 *
 * Displays a matrix showing semantic distance between topics/entities.
 * Color coding:
 * - Green (0.0-0.2): Nearly identical - cannibalization risk
 * - Blue (0.3-0.5): Ideal linking range - strongly related
 * - Yellow (0.5-0.7): Moderate linking range - good for support
 * - Orange (0.7-0.85): Loosely related - link sparingly
 * - Red (0.85-1.0): Too different - avoid linking
 *
 * Features:
 * - Interactive cell tooltips with recommendations
 * - Row/column headers with topic names
 * - Zoom and scroll for large matrices
 * - Click to see bridging suggestions
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { SemanticDistanceResult } from '../../lib/knowledgeGraph';

// ============================================
// TYPES
// ============================================

export interface MatrixItem {
  id: string;
  label: string;
  type?: 'core' | 'outer' | 'eav';
}

export interface MatrixCell {
  rowIndex: number;
  colIndex: number;
  distance: number;
  shouldLink: boolean;
  recommendation: string;
  details?: SemanticDistanceResult;
}

export interface SemanticDistanceMatrixProps {
  /** Items to compare (topics, entities, or EAVs) */
  items: MatrixItem[];

  /** Pre-calculated distance matrix (optional - will use simple calculation if not provided) */
  distanceMatrix?: number[][];

  /** Full distance results with recommendations */
  distanceResults?: Map<string, SemanticDistanceResult>;

  /** Callback when a cell is clicked */
  onCellClick?: (cell: MatrixCell, rowItem: MatrixItem, colItem: MatrixItem) => void;

  /** Show diagonal cells (self-comparison) */
  showDiagonal?: boolean;

  /** Maximum items before truncation warning */
  maxItems?: number;

  /** Cell size in pixels */
  cellSize?: number;

  /** Title for the matrix */
  title?: string;
}

// ============================================
// CONSTANTS
// ============================================

const DISTANCE_THRESHOLDS = {
  cannibalization: 0.2,
  idealMin: 0.3,
  idealMid: 0.5,
  idealMax: 0.7,
  loosely: 0.85,
};

const DISTANCE_COLORS = {
  cannibalization: { bg: '#22c55e', text: '#052e16' }, // green - danger
  idealStrong: { bg: '#3b82f6', text: '#1e3a5f' },     // blue - best
  idealModerate: { bg: '#eab308', text: '#422006' },   // yellow - good
  loosely: { bg: '#f97316', text: '#431407' },         // orange - caution
  tooDifferent: { bg: '#ef4444', text: '#450a0a' },    // red - avoid
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function getDistanceColor(distance: number): { bg: string; text: string } {
  if (distance < DISTANCE_THRESHOLDS.cannibalization) {
    return DISTANCE_COLORS.cannibalization;
  }
  if (distance < DISTANCE_THRESHOLDS.idealMid) {
    return DISTANCE_COLORS.idealStrong;
  }
  if (distance < DISTANCE_THRESHOLDS.idealMax) {
    return DISTANCE_COLORS.idealModerate;
  }
  if (distance < DISTANCE_THRESHOLDS.loosely) {
    return DISTANCE_COLORS.loosely;
  }
  return DISTANCE_COLORS.tooDifferent;
}

function getDistanceLabel(distance: number): string {
  if (distance < DISTANCE_THRESHOLDS.cannibalization) {
    return 'Cannibalization Risk';
  }
  if (distance < DISTANCE_THRESHOLDS.idealMin) {
    return 'Very Similar';
  }
  if (distance < DISTANCE_THRESHOLDS.idealMid) {
    return 'Ideal - Strong';
  }
  if (distance < DISTANCE_THRESHOLDS.idealMax) {
    return 'Ideal - Moderate';
  }
  if (distance < DISTANCE_THRESHOLDS.loosely) {
    return 'Loosely Related';
  }
  return 'Too Different';
}

function getRecommendation(distance: number): string {
  if (distance < DISTANCE_THRESHOLDS.cannibalization) {
    return 'Consider merging these topics or differentiating their content';
  }
  if (distance < DISTANCE_THRESHOLDS.idealMin) {
    return 'Very closely related - use contextual links sparingly';
  }
  if (distance < DISTANCE_THRESHOLDS.idealMid) {
    return 'Ideal for contextual linking - strongly related topics';
  }
  if (distance < DISTANCE_THRESHOLDS.idealMax) {
    return 'Good for supporting links - moderately related';
  }
  if (distance < DISTANCE_THRESHOLDS.loosely) {
    return 'Link only if highly relevant to user journey';
  }
  return 'Avoid linking - topics are semantically too distant';
}

/**
 * Simple word-based distance calculation when full KG is not available
 */
function calculateSimpleDistance(labelA: string, labelB: string): number {
  const wordsA = new Set(labelA.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const wordsB = new Set(labelB.toLowerCase().split(/\s+/).filter(w => w.length > 2));

  if (wordsA.size === 0 || wordsB.size === 0) return 1;

  const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;

  return 1 - (intersection / union);
}

// ============================================
// COMPONENT
// ============================================

export const SemanticDistanceMatrix: React.FC<SemanticDistanceMatrixProps> = ({
  items,
  distanceMatrix,
  distanceResults,
  onCellClick,
  showDiagonal = false,
  maxItems = 30,
  cellSize = 40,
  title = 'Semantic Distance Matrix',
}) => {
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Limit items if too many
  const displayItems = useMemo(() => {
    if (items.length > maxItems) {
      return items.slice(0, maxItems);
    }
    return items;
  }, [items, maxItems]);

  // Calculate or use provided distance matrix
  const matrix = useMemo<MatrixCell[][]>(() => {
    const n = displayItems.length;
    const result: MatrixCell[][] = [];

    for (let i = 0; i < n; i++) {
      const row: MatrixCell[] = [];
      for (let j = 0; j < n; j++) {
        let distance: number;
        let details: SemanticDistanceResult | undefined;

        if (i === j) {
          distance = 0;
        } else if (distanceMatrix) {
          distance = distanceMatrix[i][j];
        } else if (distanceResults) {
          const key = `${displayItems[i].id}:${displayItems[j].id}`;
          const altKey = `${displayItems[j].id}:${displayItems[i].id}`;
          details = distanceResults.get(key) || distanceResults.get(altKey);
          distance = details?.distance ?? calculateSimpleDistance(
            displayItems[i].label,
            displayItems[j].label
          );
        } else {
          distance = calculateSimpleDistance(displayItems[i].label, displayItems[j].label);
        }

        row.push({
          rowIndex: i,
          colIndex: j,
          distance: Math.round(distance * 100) / 100,
          shouldLink: distance >= 0.3 && distance <= 0.7,
          recommendation: details?.linkingRecommendation || getRecommendation(distance),
          details,
        });
      }
      result.push(row);
    }

    return result;
  }, [displayItems, distanceMatrix, distanceResults]);

  // Handle mouse move for tooltip
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setTooltipPos({ x: e.clientX, y: e.clientY });
  }, []);

  // Handle cell hover
  const handleCellHover = useCallback((row: number, col: number) => {
    setHoveredCell({ row, col });
  }, []);

  // Handle cell leave
  const handleCellLeave = useCallback(() => {
    setHoveredCell(null);
  }, []);

  // Handle cell click
  const handleCellClick = useCallback((cell: MatrixCell) => {
    if (onCellClick && cell.rowIndex !== cell.colIndex) {
      onCellClick(cell, displayItems[cell.rowIndex], displayItems[cell.colIndex]);
    }
  }, [onCellClick, displayItems]);

  // Get hovered cell data
  const hoveredCellData = hoveredCell ? matrix[hoveredCell.row]?.[hoveredCell.col] : null;

  // Calculate header width based on longest label
  const headerWidth = useMemo(() => {
    const maxLength = Math.max(...displayItems.map(item => item.label.length));
    return Math.min(Math.max(maxLength * 7, 80), 150);
  }, [displayItems]);

  return (
    <div className="relative" ref={containerRef} onMouseMove={handleMouseMove}>
      {/* Title */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="text-sm text-gray-400">
          Hover over cells to see linking recommendations
        </p>
        {items.length > maxItems && (
          <p className="text-sm text-yellow-400 mt-1">
            Showing first {maxItems} of {items.length} items
          </p>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-xs">
        <div className="flex items-center gap-1">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: DISTANCE_COLORS.cannibalization.bg }}
          />
          <span className="text-gray-400">Cannibalization</span>
        </div>
        <div className="flex items-center gap-1">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: DISTANCE_COLORS.idealStrong.bg }}
          />
          <span className="text-gray-400">Ideal (Strong)</span>
        </div>
        <div className="flex items-center gap-1">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: DISTANCE_COLORS.idealModerate.bg }}
          />
          <span className="text-gray-400">Ideal (Moderate)</span>
        </div>
        <div className="flex items-center gap-1">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: DISTANCE_COLORS.loosely.bg }}
          />
          <span className="text-gray-400">Loose</span>
        </div>
        <div className="flex items-center gap-1">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: DISTANCE_COLORS.tooDifferent.bg }}
          />
          <span className="text-gray-400">Too Different</span>
        </div>
      </div>

      {/* Matrix Container */}
      <div className="overflow-auto max-h-[600px] border border-gray-700 rounded-lg">
        <div className="inline-block min-w-full">
          {/* Header Row */}
          <div className="flex sticky top-0 z-10 bg-gray-900">
            {/* Empty corner cell */}
            <div
              className="flex-shrink-0 border-b border-r border-gray-700 bg-gray-900"
              style={{ width: headerWidth, height: cellSize }}
            />
            {/* Column headers */}
            {displayItems.map((item, colIndex) => (
              <div
                key={`col-${item.id}`}
                className="flex-shrink-0 border-b border-r border-gray-700 bg-gray-800 flex items-end justify-center pb-1 overflow-hidden"
                style={{ width: cellSize, height: cellSize }}
                title={item.label}
              >
                <span
                  className="text-xs text-gray-300 whitespace-nowrap origin-bottom-left transform -rotate-45 truncate"
                  style={{ maxWidth: cellSize * 2 }}
                >
                  {item.label.length > 10 ? item.label.substring(0, 10) + '...' : item.label}
                </span>
              </div>
            ))}
          </div>

          {/* Data Rows */}
          {matrix.map((row, rowIndex) => (
            <div key={`row-${displayItems[rowIndex].id}`} className="flex">
              {/* Row header */}
              <div
                className="flex-shrink-0 sticky left-0 z-10 border-b border-r border-gray-700 bg-gray-800 flex items-center px-2 overflow-hidden"
                style={{ width: headerWidth, height: cellSize }}
                title={displayItems[rowIndex].label}
              >
                <span className="text-xs text-gray-300 truncate">
                  {displayItems[rowIndex].label}
                </span>
              </div>

              {/* Data cells */}
              {row.map((cell, colIndex) => {
                const isDiagonal = rowIndex === colIndex;
                const isHovered =
                  hoveredCell?.row === rowIndex && hoveredCell?.col === colIndex;
                const colors = getDistanceColor(cell.distance);

                if (isDiagonal && !showDiagonal) {
                  return (
                    <div
                      key={`cell-${rowIndex}-${colIndex}`}
                      className="flex-shrink-0 border-b border-r border-gray-700 bg-gray-900"
                      style={{ width: cellSize, height: cellSize }}
                    />
                  );
                }

                return (
                  <div
                    key={`cell-${rowIndex}-${colIndex}`}
                    className={`flex-shrink-0 border-b border-r border-gray-700 flex items-center justify-center cursor-pointer transition-all ${
                      isHovered ? 'ring-2 ring-white ring-inset' : ''
                    }`}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: colors.bg,
                    }}
                    onMouseEnter={() => handleCellHover(rowIndex, colIndex)}
                    onMouseLeave={handleCellLeave}
                    onClick={() => handleCellClick(cell)}
                  >
                    <span
                      className="text-xs font-medium"
                      style={{ color: colors.text }}
                    >
                      {cell.distance.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {hoveredCellData && hoveredCell && hoveredCell.row !== hoveredCell.col && (
        <div
          className="fixed z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-3 max-w-xs pointer-events-none"
          style={{
            left: Math.min(tooltipPos.x + 15, window.innerWidth - 300),
            top: Math.min(tooltipPos.y + 15, window.innerHeight - 200),
          }}
        >
          <div className="space-y-2">
            <div className="text-sm font-medium text-white">
              {displayItems[hoveredCell.row].label}
              <span className="text-gray-400"> vs </span>
              {displayItems[hoveredCell.col].label}
            </div>

            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: getDistanceColor(hoveredCellData.distance).bg }}
              />
              <span className="text-sm text-gray-300">
                Distance: <strong>{hoveredCellData.distance.toFixed(2)}</strong>
              </span>
              <span
                className={`text-xs px-1.5 py-0.5 rounded ${
                  hoveredCellData.shouldLink
                    ? 'bg-green-900 text-green-300'
                    : 'bg-gray-700 text-gray-400'
                }`}
              >
                {getDistanceLabel(hoveredCellData.distance)}
              </span>
            </div>

            <div className="text-xs text-gray-400 border-t border-gray-700 pt-2">
              {hoveredCellData.recommendation}
            </div>

            {hoveredCellData.details && (
              <div className="text-xs text-gray-500 space-y-1">
                <div>Cosine: {hoveredCellData.details.cosineSimilarity}</div>
                <div>Context: {hoveredCellData.details.contextWeight}</div>
                <div>Co-occurrence: {hoveredCellData.details.coOccurrenceScore}</div>
              </div>
            )}

            {onCellClick && (
              <div className="text-xs text-blue-400 pt-1">Click for more options</div>
            )}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-gray-400">Cannibalization Risks</div>
          <div className="text-xl font-bold text-green-400">
            {matrix.flat().filter(c => c.rowIndex < c.colIndex && c.distance < DISTANCE_THRESHOLDS.cannibalization).length}
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-gray-400">Ideal Links</div>
          <div className="text-xl font-bold text-blue-400">
            {matrix.flat().filter(c => c.rowIndex < c.colIndex && c.shouldLink).length}
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-gray-400">Loose Connections</div>
          <div className="text-xl font-bold text-orange-400">
            {matrix.flat().filter(c => c.rowIndex < c.colIndex && c.distance >= DISTANCE_THRESHOLDS.idealMax && c.distance < DISTANCE_THRESHOLDS.loosely).length}
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-gray-400">No Link Recommended</div>
          <div className="text-xl font-bold text-red-400">
            {matrix.flat().filter(c => c.rowIndex < c.colIndex && c.distance >= DISTANCE_THRESHOLDS.loosely).length}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SemanticDistanceMatrix;
