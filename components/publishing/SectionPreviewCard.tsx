/**
 * Section Preview Card
 *
 * A compact card showing section details from the layout blueprint.
 * Displays section heading, semantic weight (as stars), layout parameters,
 * component type, and AI reasoning.
 *
 * @module components/publishing/SectionPreviewCard
 */

import React from 'react';
import type { BlueprintSection } from '../../services/layout-engine/types';

// ============================================================================
// Types
// ============================================================================

interface SectionPreviewCardProps {
  section: BlueprintSection;
  isHighlighted?: boolean;
  onClick?: () => void;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Map semantic weight (1-5) to star display
 */
const weightToStars = (weight: number): string => {
  const filled = Math.min(5, Math.max(1, Math.round(weight)));
  return '\u2605'.repeat(filled) + '\u2606'.repeat(5 - filled);
};

/**
 * Map emphasis level to color class
 */
const emphasisColors: Record<string, string> = {
  hero: 'text-yellow-400',
  featured: 'text-blue-400',
  standard: 'text-zinc-300',
  supporting: 'text-zinc-500',
  minimal: 'text-zinc-600',
};

/**
 * Map emphasis level to badge styles
 */
const emphasisBadgeStyles: Record<string, string> = {
  hero: 'bg-yellow-900/30 text-yellow-400',
  featured: 'bg-blue-900/30 text-blue-400',
  standard: 'bg-zinc-800 text-zinc-400',
  supporting: 'bg-zinc-800/50 text-zinc-500',
  minimal: 'bg-zinc-900/50 text-zinc-600',
};

// ============================================================================
// Component
// ============================================================================

export const SectionPreviewCard: React.FC<SectionPreviewCardProps> = ({
  section,
  isHighlighted = false,
  onClick,
}) => {
  const emphasisColor = emphasisColors[section.emphasis.level] || 'text-zinc-400';
  const badgeStyle = emphasisBadgeStyles[section.emphasis.level] || 'bg-zinc-800 text-zinc-400';

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={`
        p-4 rounded-lg border transition-all
        ${isHighlighted
          ? 'border-blue-500 bg-blue-900/20'
          : 'border-zinc-700 bg-zinc-900/40 hover:border-zinc-600'
        }
        ${onClick ? 'cursor-pointer' : ''}
      `}
    >
      {/* Header: Stars + Heading */}
      <div className="flex items-start gap-3">
        <span className={`text-sm font-mono ${emphasisColor}`}>
          {weightToStars(section.semanticWeight)}
        </span>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-white text-sm truncate">
            {section.heading || `Section ${section.order + 1}`}
          </h4>

          {/* Layout Info */}
          <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400 flex-wrap">
            <span className={`px-1.5 py-0.5 rounded ${badgeStyle}`}>
              {section.emphasis.level}
            </span>
            <span className="text-zinc-600">&middot;</span>
            <span>{section.layout.width}</span>
            <span className="text-zinc-600">&middot;</span>
            <span>{section.component.primaryComponent}</span>
          </div>

          {/* Reasoning */}
          {section.component.reasoning && (
            <p className="mt-2 text-xs text-zinc-500 italic line-clamp-2">
              &ldquo;{section.component.reasoning}&rdquo;
            </p>
          )}
        </div>
      </div>

      {/* Content Zone Indicator (for supplementary sections) */}
      {section.contentZone === 'SUPPLEMENTARY' && (
        <div className="mt-2 pt-2 border-t border-zinc-800">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
            Supplementary Content
          </span>
        </div>
      )}
    </div>
  );
};

export default SectionPreviewCard;
