/**
 * Modal Component with Full Accessibility Support
 *
 * Features:
 * - ARIA roles and labels (role="dialog", aria-modal, aria-labelledby, aria-describedby)
 * - Focus trapping (Tab cycles within modal)
 * - Escape key to close
 * - Click outside to close (optional)
 * - Body scroll lock when open
 * - Auto-focus first focusable element
 * - Return focus to trigger element on close
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
 *
 * Created: 2024-12-19 - Accessibility Audit Implementation
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { Card } from './Card';

export interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Modal title - displayed in header and used for aria-labelledby */
  title: string;
  /** Optional description for aria-describedby */
  description?: string;
  /** Modal content */
  children: React.ReactNode;
  /** Max width class (default: max-w-2xl) */
  maxWidth?: 'max-w-sm' | 'max-w-md' | 'max-w-lg' | 'max-w-xl' | 'max-w-2xl' | 'max-w-3xl' | 'max-w-4xl' | 'max-w-5xl' | 'max-w-6xl' | 'max-w-7xl' | 'max-w-full';
  /** Z-index class (default: z-50) */
  zIndex?: 'z-40' | 'z-50' | 'z-[60]' | 'z-[70]' | 'z-[80]';
  /** Whether clicking outside closes the modal (default: true) */
  closeOnBackdropClick?: boolean;
  /** Whether pressing Escape closes the modal (default: true) */
  closeOnEscape?: boolean;
  /** Optional footer content (buttons, etc.) */
  footer?: React.ReactNode;
  /** Additional class for the card container */
  className?: string;
  /** Whether to show the default header (default: true) */
  showHeader?: boolean;
  /** Header icon (optional) */
  headerIcon?: React.ReactNode;
  /** Custom header content (replaces default header if provided) */
  customHeader?: React.ReactNode;
}

// Get all focusable elements within a container
const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  const focusableSelectors = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors));
};

// No-op function for fallback when onClose is not provided
const noop = () => {};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-2xl',
  zIndex = 'z-50',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  footer,
  className = '',
  showHeader = true,
  headerIcon,
  customHeader,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const titleId = `modal-title-${React.useId()}`;
  const descriptionId = description ? `modal-desc-${React.useId()}` : undefined;

  // Ensure onClose is always a function to prevent React deps comparison issues
  const safeOnClose = onClose || noop;

  // Store the previously focused element and lock body scroll
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';

      // Focus first focusable element in modal
      const timer = setTimeout(() => {
        if (modalRef.current) {
          const focusableElements = getFocusableElements(modalRef.current);
          if (focusableElements.length > 0) {
            focusableElements[0].focus();
          } else {
            modalRef.current.focus();
          }
        }
      }, 0);

      return () => {
        clearTimeout(timer);
        document.body.style.overflow = '';
        // Return focus to previous element
        if (previousActiveElement.current && previousActiveElement.current.focus) {
          previousActiveElement.current.focus();
        }
      };
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        safeOnClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, safeOnClose]);

  // Handle focus trapping
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key !== 'Tab' || !modalRef.current) return;

    const focusableElements = getFocusableElements(modalRef.current);
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift+Tab: if on first element, move to last
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab: if on last element, move to first
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }, []);

  // Handle backdrop click
  const handleBackdropClick = useCallback((event: React.MouseEvent) => {
    if (closeOnBackdropClick && event.target === event.currentTarget) {
      safeOnClose();
    }
  }, [closeOnBackdropClick, safeOnClose]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-70 ${zIndex} flex justify-center items-start p-2 sm:p-4 overflow-y-auto`}
      onClick={handleBackdropClick}
      role="presentation"
      aria-hidden="false"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={`w-full ${maxWidth} my-2 sm:my-8`}
      >
        <Card
          className={`flex flex-col max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-4rem)] ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {customHeader ? (
            customHeader
          ) : showHeader ? (
            <div className="sticky top-0 bg-gray-800 p-3 sm:p-4 border-b border-gray-700 flex items-center justify-between rounded-t-xl">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                {headerIcon}
                <h2 id={titleId} className="text-lg sm:text-xl font-bold text-white truncate">
                  {title}
                </h2>
              </div>
              <button
                type="button"
                onClick={safeOnClose}
                className="flex-shrink-0 text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
                aria-label="Close modal"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ) : null}

          {/* Description (if provided) */}
          {description && (
            <p id={descriptionId} className="sr-only">
              {description}
            </p>
          )}

          {/* Content */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-grow">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="p-3 sm:p-4 bg-gray-800 border-t border-gray-700 flex flex-col sm:flex-row justify-end gap-2 sm:gap-4 rounded-b-xl">
              {footer}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Modal;
