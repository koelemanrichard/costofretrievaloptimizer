// components/navigation/preview/SegmentPreviewSelector.tsx
// Tab selector for 5 navigation segment types

import React from 'react';
import { NavigationSegment } from '../../../types';

interface SegmentPreviewSelectorProps {
  selectedSegment: NavigationSegment;
  onSegmentChange: (segment: NavigationSegment) => void;
  segmentStats?: Record<NavigationSegment, { headerLinks: number; footerLinks: number; sidebarLinks?: number }>;
}

const SEGMENT_INFO: Record<NavigationSegment, { label: string; description: string; icon: string; color: string }> = {
  core_section: {
    label: 'Core Section',
    description: 'Monetization pages (money pages)',
    icon: '💰',
    color: 'bg-green-600',
  },
  author_section: {
    label: 'Author Section',
    description: 'Informational content pages',
    icon: '📝',
    color: 'bg-blue-600',
  },
  pillar: {
    label: 'Pillar',
    description: 'Hub pages with 3+ spokes',
    icon: '🏛️',
    color: 'bg-purple-600',
  },
  cluster: {
    label: 'Cluster',
    description: 'Supporting topic pages',
    icon: '🔗',
    color: 'bg-orange-600',
  },
  foundation: {
    label: 'Foundation',
    description: 'About, Contact, Legal pages',
    icon: '🏠',
    color: 'bg-gray-600',
  },
};

const SegmentPreviewSelector: React.FC<SegmentPreviewSelectorProps> = ({
  selectedSegment,
  onSegmentChange,
  segmentStats,
}) => {
  const segments: NavigationSegment[] = ['core_section', 'author_section', 'pillar', 'cluster', 'foundation'];

  return (
    <div className="mb-6">
      <div className="text-sm text-gray-400 mb-2">Preview navigation for page type:</div>
      <div className="flex flex-wrap gap-2">
        {segments.map((segment) => {
          const info = SEGMENT_INFO[segment];
          const stats = segmentStats?.[segment];
          const isSelected = segment === selectedSegment;

          return (
            <button
              key={segment}
              onClick={() => onSegmentChange(segment)}
              className={`flex flex-col items-start px-4 py-3 rounded-lg border-2 transition-all min-w-[140px] ${
                isSelected
                  ? `border-blue-500 ${info.color} text-white`
                  : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600 hover:bg-gray-750'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{info.icon}</span>
                <span className="font-medium text-sm">{info.label}</span>
              </div>
              <span className={`text-xs ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                {info.description}
              </span>
              {stats && (
                <div className={`flex gap-2 mt-2 text-xs ${isSelected ? 'text-white/70' : 'text-gray-500'}`}>
                  <span>H: {stats.headerLinks}</span>
                  <span>F: {stats.footerLinks}</span>
                  {stats.sidebarLinks !== undefined && <span>S: {stats.sidebarLinks}</span>}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected segment details */}
      <div className="mt-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
        <div className="flex items-center gap-2 mb-2">
          <span className={`px-2 py-1 rounded text-xs font-medium text-white ${SEGMENT_INFO[selectedSegment].color}`}>
            {SEGMENT_INFO[selectedSegment].icon} {SEGMENT_INFO[selectedSegment].label}
          </span>
        </div>
        <p className="text-sm text-gray-400">
          {selectedSegment === 'core_section' && (
            <>
              <strong className="text-gray-300">PageRank Priority:</strong> High. Header shows pillar + monetization pages.
              Footer includes foundation + pillar links. Quality Nodes get prominent placement.
            </>
          )}
          {selectedSegment === 'author_section' && (
            <>
              <strong className="text-gray-300">PageRank Strategy:</strong> Links to Core Section for authority flow.
              Header shows pillar + informational pages. Sidebar displays cluster siblings.
            </>
          )}
          {selectedSegment === 'pillar' && (
            <>
              <strong className="text-gray-300">Authority Hub:</strong> Shows all child clusters in sidebar.
              Header displays other pillars. Distributes PageRank to cluster pages.
            </>
          )}
          {selectedSegment === 'cluster' && (
            <>
              <strong className="text-gray-300">Supporting Content:</strong> Links to parent pillar + siblings.
              Header shows pillar pages. Sidebar displays related cluster topics.
            </>
          )}
          {selectedSegment === 'foundation' && (
            <>
              <strong className="text-gray-300">E-A-T Pages:</strong> About, Contact, Privacy, Terms.
              Header shows pillar + foundation pages. Minimal sidebar links.
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default SegmentPreviewSelector;
