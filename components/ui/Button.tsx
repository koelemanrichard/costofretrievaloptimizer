

/**
 * Button Component
 *
 * A touch-friendly button component with multiple variants and sizes.
 * All sizes meet WCAG minimum touch target guidelines (44x44px on mobile).
 *
 * Updated: 2024-12-20 - Mobile responsiveness improvements
 */

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  /** Full width button */
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  ...props
}) => {
  // Base classes including touch-friendly minimum tap target (min-h-[44px])
  const baseClasses = [
    'font-semibold rounded-lg transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'touch-manipulation', // Improves touch response
    fullWidth ? 'w-full' : '',
  ].filter(Boolean).join(' ');

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 active:bg-blue-800',
    secondary: 'bg-gray-600 text-gray-200 hover:bg-gray-700 focus:ring-gray-500 active:bg-gray-800',
    ghost: 'bg-transparent text-gray-400 hover:bg-gray-800 hover:text-white focus:ring-gray-500 active:bg-gray-700',
  };

  // Size classes with touch-friendly minimum heights
  // WCAG recommends 44x44px minimum touch target
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm min-h-[36px] sm:min-h-[32px]', // Larger on mobile
    md: 'px-4 py-2.5 sm:px-6 sm:py-3 min-h-[44px]', // Meets touch target
    lg: 'px-6 py-3 sm:px-8 sm:py-4 text-lg min-h-[48px]', // Generous touch target
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className || ''}`}
      {...props}
    >
      {children}
    </button>
  );
};