/**
 * ProgressTimeline
 *
 * Timeline visualization for multi-pass content generation progress
 */

import React from 'react';
import { TimelineItem, CHART_COLORS } from '../../../types/reports';

interface ProgressTimelineProps {
  items: TimelineItem[];
  title?: string;
  orientation?: 'horizontal' | 'vertical';
  compact?: boolean;
}

const getStatusColor = (status: TimelineItem['status']): string => {
  switch (status) {
    case 'completed':
      return CHART_COLORS.semantic.success;
    case 'in-progress':
      return CHART_COLORS.semantic.info;
    case 'failed':
      return CHART_COLORS.semantic.error;
    default:
      return CHART_COLORS.semantic.neutral;
  }
};

const getStatusIcon = (status: TimelineItem['status']): React.ReactNode => {
  switch (status) {
    case 'completed':
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      );
    case 'in-progress':
      return (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      );
    case 'failed':
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      );
    default:
      return <span className="w-2 h-2 rounded-full bg-current" />;
  }
};

export const ProgressTimeline: React.FC<ProgressTimelineProps> = ({
  items,
  title,
  orientation = 'vertical',
  compact = false
}) => {
  const completedCount = items.filter(i => i.status === 'completed').length;
  const progressPercentage = Math.round((completedCount / items.length) * 100);

  if (orientation === 'horizontal') {
    return (
      <div className="w-full">
        {title && (
          <h4 className="text-sm font-medium text-gray-700 mb-3">{title}</h4>
        )}
        <div className="relative">
          {/* Progress bar background */}
          <div className="absolute top-4 left-0 right-0 h-1 bg-gray-200 rounded-full" />

          {/* Progress bar fill */}
          <div
            className="absolute top-4 left-0 h-1 bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />

          {/* Timeline items */}
          <div className="relative flex justify-between">
            {items.map((item, index) => {
              const color = getStatusColor(item.status);
              return (
                <div
                  key={item.step}
                  className="flex flex-col items-center"
                  style={{ width: `${100 / items.length}%` }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white z-10"
                    style={{ backgroundColor: color }}
                  >
                    {getStatusIcon(item.status)}
                  </div>
                  {!compact && (
                    <>
                      <span className="text-xs font-medium text-gray-700 mt-2 text-center">
                        {item.label}
                      </span>
                      {item.description && (
                        <span className="text-xs text-gray-500 mt-0.5 text-center">
                          {item.description}
                        </span>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Vertical orientation
  return (
    <div className="w-full">
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-gray-700">{title}</h4>
          <span className="text-sm text-gray-500">
            {completedCount}/{items.length} complete
          </span>
        </div>
      )}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

        {/* Timeline items */}
        <div className="space-y-4">
          {items.map((item, index) => {
            const color = getStatusColor(item.status);
            const isLast = index === items.length - 1;

            return (
              <div key={item.step} className="relative flex items-start">
                {/* Circle/Icon */}
                <div
                  className="relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0"
                  style={{ backgroundColor: color }}
                >
                  {compact ? (
                    <span className="text-xs font-medium">{item.step}</span>
                  ) : (
                    getStatusIcon(item.status)
                  )}
                </div>

                {/* Content */}
                <div className="ml-4 flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${
                      item.status === 'completed' ? 'text-gray-900' :
                      item.status === 'in-progress' ? 'text-blue-600' :
                      item.status === 'failed' ? 'text-red-600' :
                      'text-gray-500'
                    }`}>
                      {item.label}
                    </span>
                    {item.timestamp && (
                      <span className="text-xs text-gray-400">{item.timestamp}</span>
                    )}
                  </div>
                  {!compact && item.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/**
 * Simple progress indicator for compact display
 */
export const ProgressIndicator: React.FC<{
  current: number;
  total: number;
  label?: string;
}> = ({ current, total, label }) => {
  const percentage = Math.round((current / total) * 100);

  return (
    <div className="flex items-center gap-3">
      {label && <span className="text-sm text-gray-600">{label}</span>}
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm font-medium text-gray-700">
        {current}/{total}
      </span>
    </div>
  );
};

export default ProgressTimeline;
