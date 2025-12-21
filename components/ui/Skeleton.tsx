/**
 * Skeleton - Animated placeholder for loading states
 *
 * Provides visual feedback while content is loading, improving perceived performance.
 * Supports various shapes and sizes for different content types.
 *
 * Created: 2024-12-20 - Skeleton loader system
 */

import React from 'react';

interface SkeletonProps {
  /** Width of the skeleton. Can be Tailwind class or CSS value */
  className?: string;
  /** Height - defaults to h-4 */
  height?: string;
  /** Whether to use rounded corners (default: true) */
  rounded?: boolean;
  /** Whether to animate (default: true) */
  animate?: boolean;
}

/**
 * Basic skeleton element with pulse animation
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  className = 'w-full',
  height = 'h-4',
  rounded = true,
  animate = true,
}) => {
  return (
    <div
      className={`
        bg-gray-700
        ${height}
        ${className}
        ${rounded ? 'rounded' : ''}
        ${animate ? 'animate-pulse' : ''}
      `}
      role="status"
      aria-label="Loading..."
    />
  );
};

/**
 * Skeleton for text content - multiple lines
 */
export const SkeletonText: React.FC<{
  lines?: number;
  className?: string;
}> = ({ lines = 3, className = '' }) => {
  return (
    <div className={`space-y-2 ${className}`} role="status" aria-label="Loading text...">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={i === lines - 1 ? 'w-3/4' : 'w-full'}
        />
      ))}
    </div>
  );
};

/**
 * Skeleton for card content
 */
export const SkeletonCard: React.FC<{
  className?: string;
  showImage?: boolean;
  lines?: number;
}> = ({ className = '', showImage = false, lines = 3 }) => {
  return (
    <div
      className={`bg-gray-800 border border-gray-700 rounded-lg p-4 ${className}`}
      role="status"
      aria-label="Loading card..."
    >
      {showImage && (
        <Skeleton className="w-full mb-4" height="h-40" />
      )}
      <Skeleton className="w-2/3 mb-3" height="h-6" />
      <SkeletonText lines={lines} />
    </div>
  );
};

/**
 * Skeleton for table rows
 */
export const SkeletonTable: React.FC<{
  rows?: number;
  columns?: number;
  className?: string;
}> = ({ rows = 5, columns = 4, className = '' }) => {
  return (
    <div className={`space-y-2 ${className}`} role="status" aria-label="Loading table...">
      {/* Header */}
      <div className="flex gap-4 pb-2 border-b border-gray-700">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="flex-1" height="h-5" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 py-2">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className="flex-1"
              height="h-4"
            />
          ))}
        </div>
      ))}
    </div>
  );
};

/**
 * Skeleton for list items
 */
export const SkeletonList: React.FC<{
  items?: number;
  showIcon?: boolean;
  className?: string;
}> = ({ items = 5, showIcon = true, className = '' }) => {
  return (
    <div className={`space-y-3 ${className}`} role="status" aria-label="Loading list...">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          {showIcon && <Skeleton className="w-8 flex-shrink-0" height="h-8" />}
          <div className="flex-1 space-y-1">
            <Skeleton className="w-3/4" height="h-4" />
            <Skeleton className="w-1/2" height="h-3" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Skeleton for avatar with text
 */
export const SkeletonAvatar: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}> = ({ size = 'md', showText = true, className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  return (
    <div className={`flex items-center gap-3 ${className}`} role="status" aria-label="Loading profile...">
      <Skeleton
        className={`${sizeClasses[size]} flex-shrink-0 rounded-full`}
        height=""
        rounded={false}
      />
      {showText && (
        <div className="flex-1 space-y-1">
          <Skeleton className="w-32" height="h-4" />
          <Skeleton className="w-24" height="h-3" />
        </div>
      )}
    </div>
  );
};

/**
 * Skeleton for dashboard stat cards
 */
export const SkeletonStats: React.FC<{
  count?: number;
  className?: string;
}> = ({ count = 4, className = '' }) => {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`} role="status" aria-label="Loading statistics...">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <Skeleton className="w-1/3 mb-2" height="h-3" />
          <Skeleton className="w-2/3" height="h-8" />
        </div>
      ))}
    </div>
  );
};

/**
 * Skeleton for topic/brief item in lists
 */
export const SkeletonTopicItem: React.FC<{
  className?: string;
}> = ({ className = '' }) => {
  return (
    <div
      className={`bg-gray-800/50 border border-gray-700 rounded-lg p-4 ${className}`}
      role="status"
      aria-label="Loading topic..."
    >
      <div className="flex items-start gap-3">
        <Skeleton className="w-5 flex-shrink-0" height="h-5" />
        <div className="flex-1">
          <Skeleton className="w-3/4 mb-2" height="h-5" />
          <Skeleton className="w-1/2 mb-3" height="h-3" />
          <div className="flex gap-2">
            <Skeleton className="w-16" height="h-6" rounded />
            <Skeleton className="w-20" height="h-6" rounded />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Skeleton;
