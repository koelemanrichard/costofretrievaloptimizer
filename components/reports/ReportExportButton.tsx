/**
 * ReportExportButton
 *
 * Reusable button component for triggering report generation
 */

import React, { useState } from 'react';
import { ReportType } from '../../types/reports';

interface ReportExportButtonProps {
  reportType: ReportType;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
  disabled?: boolean;
}

const reportLabels: Record<ReportType, string> = {
  'topical-map': 'Generate Report',
  'content-brief': 'Export Brief Report',
  'article-draft': 'Export Quality Report',
  'migration': 'Generate Migration Report'
};

export const ReportExportButton: React.FC<ReportExportButtonProps> = ({
  reportType,
  onClick,
  variant = 'secondary',
  size = 'md',
  label,
  className = '',
  disabled = false
}) => {
  const buttonLabel = label || reportLabels[reportType];

  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-600 text-gray-200 hover:bg-gray-700 focus:ring-gray-500 border border-gray-500',
    ghost: 'bg-transparent text-gray-400 hover:bg-gray-800 hover:text-white focus:ring-gray-500',
    icon: 'bg-transparent text-gray-400 hover:text-white hover:bg-gray-800 focus:ring-gray-500 rounded-full'
  };

  const sizeClasses = {
    sm: variant === 'icon' ? 'p-1.5' : 'px-3 py-1.5 text-sm rounded-md gap-1.5',
    md: variant === 'icon' ? 'p-2' : 'px-4 py-2 text-sm rounded-lg gap-2',
    lg: variant === 'icon' ? 'p-2.5' : 'px-5 py-2.5 text-base rounded-lg gap-2'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const ReportIcon = () => (
    <svg
      className={iconSizes[size]}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );

  if (variant === 'icon') {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        title={buttonLabel}
      >
        <ReportIcon />
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      <ReportIcon />
      {buttonLabel}
    </button>
  );
};

/**
 * Hook for managing report modal state
 */
export const useReportModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  return {
    isOpen,
    openModal,
    closeModal
  };
};

export default ReportExportButton;
