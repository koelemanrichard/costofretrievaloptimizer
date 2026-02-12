import React from 'react';

interface AuditButtonProps {
  url: string;
  projectId?: string;
  variant?: 'icon' | 'icon-text' | 'text';
  size?: 'sm' | 'md';
  onClick?: (url: string) => void;
  className?: string;
}

const MagnifyingGlassIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
      clipRule="evenodd"
    />
  </svg>
);

export const AuditButton: React.FC<AuditButtonProps> = ({
  url,
  projectId: _projectId,
  variant = 'icon',
  size = 'sm',
  onClick,
  className = '',
}) => {
  const sizeClasses = size === 'sm' ? 'text-xs p-1' : 'text-sm p-1.5';

  const baseClasses = [
    'inline-flex items-center gap-1',
    'text-orange-400 hover:text-orange-300',
    'bg-gray-800 hover:bg-gray-700',
    'border border-gray-700 rounded',
    'transition-colors duration-150',
    sizeClasses,
  ].join(' ');

  const handleClick = () => {
    onClick?.(url);
  };

  return (
    <button
      type="button"
      className={`${baseClasses} ${className}`}
      onClick={handleClick}
      title={`Audit ${url}`}
    >
      {(variant === 'icon' || variant === 'icon-text') && (
        <MagnifyingGlassIcon className="w-4 h-4" />
      )}
      {(variant === 'icon-text' || variant === 'text') && (
        <span>Audit</span>
      )}
    </button>
  );
};
