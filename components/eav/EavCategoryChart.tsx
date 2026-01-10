/**
 * EavCategoryChart Component
 *
 * Visualizes the distribution of EAV categories (ROOT, UNIQUE, RARE, COMMON)
 * as a horizontal bar chart with color coding and percentages.
 */

import React from 'react';
import { SemanticTriple, AttributeCategory } from '../../types';
import {
  getCategoryDistribution,
  CategoryDistribution,
  CATEGORY_COLORS
} from '../../utils/eavAnalytics';

interface EavCategoryChartProps {
  eavs: SemanticTriple[];
  showLegend?: boolean;
  compact?: boolean;
}

// Category descriptions for tooltips/labels
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  ROOT: 'Core defining attributes (what it is)',
  UNIQUE: 'Differentiating features (what makes it special)',
  RARE: 'Detailed/technical attributes (depth)',
  COMMON: 'General/shared attributes',
  UNCATEGORIZED: 'Not yet categorized'
};

export const EavCategoryChart: React.FC<EavCategoryChartProps> = ({
  eavs,
  showLegend = true,
  compact = false
}) => {
  // Ensure eavs is always an array
  const safeEavs = eavs || [];
  const distribution = getCategoryDistribution(safeEavs);
  const total = safeEavs.length;

  if (total === 0) {
    return (
      <div className="text-center text-gray-500 py-4">
        <p className="text-sm">No EAVs to display</p>
      </div>
    );
  }

  return (
    <div className={`space-y-${compact ? '2' : '3'}`}>
      {/* Stacked bar visualization */}
      <div className="relative">
        <div className="flex h-6 rounded-md overflow-hidden bg-gray-700">
          {distribution.map((item) => (
            <div
              key={item.category}
              className="relative transition-all duration-300 hover:opacity-80"
              style={{
                width: `${item.percentage}%`,
                backgroundColor: item.color,
                minWidth: item.percentage > 0 ? '4px' : '0'
              }}
              title={`${item.category}: ${item.count} (${item.percentage}%)`}
            >
              {/* Show percentage if segment is wide enough */}
              {item.percentage >= 15 && !compact && (
                <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                  {item.percentage}%
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className={`flex flex-wrap gap-${compact ? '2' : '3'}`}>
          {distribution.map((item) => (
            <div
              key={item.category}
              className="flex items-center gap-1.5"
              title={CATEGORY_DESCRIPTIONS[item.category]}
            >
              <div
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className={`text-${compact ? 'xs' : 'sm'} text-gray-300`}>
                {item.category}
                <span className="text-gray-500 ml-1">
                  ({item.count})
                </span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Total count */}
      {!compact && (
        <div className="text-xs text-gray-500 text-right">
          Total: {total} EAVs
        </div>
      )}
    </div>
  );
};

/**
 * Compact inline version for smaller spaces
 */
export const EavCategoryChartInline: React.FC<{ eavs: SemanticTriple[] }> = ({ eavs }) => {
  // Ensure eavs is always an array
  const safeEavs = eavs || [];
  const distribution = getCategoryDistribution(safeEavs);

  if (safeEavs.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex h-2 w-24 rounded-full overflow-hidden bg-gray-700">
        {distribution.map((item) => (
          <div
            key={item.category}
            style={{
              width: `${item.percentage}%`,
              backgroundColor: item.color
            }}
            title={`${item.category}: ${item.count}`}
          />
        ))}
      </div>
      <span className="text-xs text-gray-500">{safeEavs.length} EAVs</span>
    </div>
  );
};

/**
 * Detailed breakdown list
 */
export const EavCategoryBreakdown: React.FC<{
  eavs: SemanticTriple[];
  onCategoryClick?: (category: AttributeCategory) => void;
}> = ({ eavs, onCategoryClick }) => {
  // Ensure eavs is always an array
  const safeEavs = eavs || [];
  const distribution = getCategoryDistribution(safeEavs);
  const total = safeEavs.length;

  // Ensure all main categories are shown, even if 0
  const allCategories: (AttributeCategory | 'UNCATEGORIZED')[] = ['ROOT', 'UNIQUE', 'RARE', 'COMMON'];
  const displayItems = allCategories.map(cat => {
    const found = distribution.find(d => d.category === cat);
    return found || {
      category: cat,
      count: 0,
      percentage: 0,
      color: CATEGORY_COLORS[cat]
    };
  });

  // Add uncategorized if present
  const uncategorized = distribution.find(d => d.category === 'UNCATEGORIZED');
  if (uncategorized) {
    displayItems.push(uncategorized);
  }

  return (
    <div className="space-y-2">
      {displayItems.map((item) => (
        <div
          key={item.category}
          className={`flex items-center gap-3 p-2 rounded-md transition-colors ${
            onCategoryClick ? 'cursor-pointer hover:bg-gray-700/50' : ''
          } ${item.count === 0 ? 'opacity-50' : ''}`}
          onClick={() => item.count > 0 && onCategoryClick?.(item.category as AttributeCategory)}
        >
          {/* Color indicator */}
          <div
            className="w-4 h-4 rounded flex-shrink-0"
            style={{ backgroundColor: item.color }}
          />

          {/* Category info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm text-white">
                {item.category}
              </span>
              <span className="text-sm text-gray-400">
                {item.count}
                {total > 0 && (
                  <span className="text-gray-400 ml-1">
                    ({item.percentage}%)
                  </span>
                )}
              </span>
            </div>
            <p className="text-xs text-gray-500 truncate">
              {CATEGORY_DESCRIPTIONS[item.category]}
            </p>
          </div>

          {/* Progress bar */}
          <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${item.percentage}%`,
                backgroundColor: item.color
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default EavCategoryChart;
