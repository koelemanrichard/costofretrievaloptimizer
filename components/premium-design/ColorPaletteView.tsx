// =============================================================================
// ColorPaletteView — Color swatch grid with approval controls
// =============================================================================

import React from 'react';
import type { StyleGuideColor } from '../../types/styleGuide';

interface ColorPaletteViewProps {
  colors: StyleGuideColor[];
  onApprove: (hex: string) => void;
  onReject: (hex: string) => void;
}

/** Group colors by usage category */
function groupColors(colors: StyleGuideColor[]): Record<string, StyleGuideColor[]> {
  const groups: Record<string, StyleGuideColor[]> = {};
  for (const color of colors) {
    const group = color.usage.includes('brand') || color.usage.includes('interactive')
      ? 'Brand & Interactive'
      : color.usage.includes('heading') || color.usage.includes('text')
        ? 'Text & Headings'
        : color.usage.includes('background') || color.usage.includes('neutral')
          ? 'Neutral & Background'
          : 'Other';
    if (!groups[group]) groups[group] = [];
    groups[group].push(color);
  }
  return groups;
}

const ColorSwatch: React.FC<{
  color: StyleGuideColor;
  onApprove: () => void;
  onReject: () => void;
}> = ({ color, onApprove, onReject }) => {
  const isApproved = color.approvalStatus === 'approved';
  const isRejected = color.approvalStatus === 'rejected';

  const borderColor = isApproved
    ? 'border-green-500/40'
    : isRejected
      ? 'border-red-500/40 opacity-50'
      : 'border-zinc-700';

  return (
    <div className={`rounded-lg border ${borderColor} bg-zinc-800/50 p-2 transition-all`}>
      {/* Color circle */}
      <div className="flex items-center gap-2.5 mb-2">
        <div
          className="w-8 h-8 rounded-full border border-zinc-600 shrink-0"
          style={{ backgroundColor: color.hex }}
        />
        <div className="min-w-0">
          <p className="text-xs text-zinc-200 font-mono">{color.hex}</p>
          <p className="text-[10px] text-zinc-500 truncate" title={color.usage}>
            {color.usage}
          </p>
        </div>
      </div>

      {/* Source and frequency */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-zinc-600 truncate" title={color.source}>
          {color.source}
        </span>
        <span className="text-[10px] text-zinc-600 shrink-0">
          {color.frequency}x
        </span>
      </div>

      {/* Approval buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={onApprove}
          className={`flex-1 px-1.5 py-0.5 text-[10px] rounded transition-colors ${
            isApproved
              ? 'bg-green-600/20 text-green-400'
              : 'bg-zinc-700/50 text-zinc-500 hover:text-green-400'
          }`}
        >
          {isApproved ? 'Approved' : 'Approve'}
        </button>
        <button
          onClick={onReject}
          className={`flex-1 px-1.5 py-0.5 text-[10px] rounded transition-colors ${
            isRejected
              ? 'bg-red-600/20 text-red-400'
              : 'bg-zinc-700/50 text-zinc-500 hover:text-red-400'
          }`}
        >
          {isRejected ? 'Rejected' : 'Reject'}
        </button>
      </div>
    </div>
  );
};

export const ColorPaletteView: React.FC<ColorPaletteViewProps> = ({
  colors,
  onApprove,
  onReject,
}) => {
  const groups = groupColors(colors);
  const groupOrder = ['Brand & Interactive', 'Text & Headings', 'Neutral & Background', 'Other'];

  if (colors.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-zinc-500">No colors detected</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groupOrder.map(groupName => {
        const groupColors = groups[groupName];
        if (!groupColors || groupColors.length === 0) return null;
        return (
          <div key={groupName}>
            <h4 className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
              {groupName}
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {groupColors.map(color => (
                <ColorSwatch
                  key={color.hex}
                  color={color}
                  onApprove={() => onApprove(color.hex)}
                  onReject={() => onReject(color.hex)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ColorPaletteView;
