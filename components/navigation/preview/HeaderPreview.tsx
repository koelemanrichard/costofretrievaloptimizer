// components/navigation/preview/HeaderPreview.tsx
// Realistic header preview component for navigation mockup

import React, { useMemo } from 'react';
import { NavigationLink, NAPData } from '../../../types';

interface HeaderPreviewProps {
  logoAltText: string;
  primaryNav: NavigationLink[];
  ctaButton?: {
    text: string;
    target_topic_id?: string;
    target_foundation_page_id?: string;
    url?: string;
  };
  isMobile?: boolean;
  brandColors?: {
    primary: string;
    secondary: string;
    text: string;
  };
  showWarnings?: boolean;
}

// Character limits for navigation UX
const NAV_ITEM_MAX_CHARS = 20;
const NAV_ITEM_IDEAL_CHARS = 15;
const MAX_VISIBLE_ITEMS = 6;

const HeaderPreview: React.FC<HeaderPreviewProps> = ({
  logoAltText,
  primaryNav,
  ctaButton,
  isMobile = false,
  brandColors = {
    primary: '#2563eb',
    secondary: '#1e40af',
    text: '#ffffff',
  },
  showWarnings = true,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = React.useState(false);

  // Analyze navigation items for UX issues
  const navAnalysis = useMemo(() => {
    const longItems = primaryNav.filter(link => link.text.length > NAV_ITEM_MAX_CHARS);
    const warningItems = primaryNav.filter(link => link.text.length > NAV_ITEM_IDEAL_CHARS && link.text.length <= NAV_ITEM_MAX_CHARS);
    const visibleItems = primaryNav.slice(0, MAX_VISIBLE_ITEMS);
    const overflowItems = primaryNav.slice(MAX_VISIBLE_ITEMS);
    const totalNavWidth = primaryNav.reduce((sum, link) => sum + Math.min(link.text.length, NAV_ITEM_MAX_CHARS) * 8 + 24, 0);

    return {
      longItems,
      warningItems,
      visibleItems,
      overflowItems,
      hasOverflow: primaryNav.length > MAX_VISIBLE_ITEMS,
      hasLongItems: longItems.length > 0,
      estimatedWidth: totalNavWidth,
      willOverflow: totalNavWidth > 600
    };
  }, [primaryNav]);

  // Truncate text helper
  const truncateText = (text: string, maxLength: number = NAV_ITEM_MAX_CHARS) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 1) + '…';
  };

  // Determine link prominence styling
  const getProminenceStyle = (prominence: 'high' | 'medium' | 'low') => {
    switch (prominence) {
      case 'high':
        return 'font-semibold text-gray-900';
      case 'medium':
        return 'font-medium text-gray-700';
      case 'low':
        return 'font-normal text-gray-500';
      default:
        return 'font-medium text-gray-700';
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: brandColors.primary }}
                title={logoAltText}
              >
                LOGO
              </div>
              <span className="ml-2 text-sm text-gray-500 max-w-32 truncate" title={logoAltText}>
                {logoAltText || 'Logo Alt Text'}
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          {!isMobile && (
            <nav className="hidden md:flex items-center space-x-1">
              {navAnalysis.visibleItems.map((link, idx) => (
                <a
                  key={link.id || idx}
                  href="#"
                  className={`px-3 py-2 rounded-md text-sm hover:bg-gray-100 transition-colors max-w-[160px] truncate ${getProminenceStyle(
                    link.prominence
                  )} ${link.text.length > NAV_ITEM_MAX_CHARS ? 'border-b-2 border-amber-400' : ''}`}
                  onClick={(e) => e.preventDefault()}
                  title={link.text.length > NAV_ITEM_IDEAL_CHARS ? `${link.text} (${link.text.length} chars)` : link.text}
                >
                  {truncateText(link.text)}
                  {link.prominence === 'high' && (
                    <span className="ml-1 text-xs text-blue-600" title="High prominence (Quality Node)">
                      *
                    </span>
                  )}
                </a>
              ))}
              {/* "More" dropdown for overflow items */}
              {navAnalysis.hasOverflow && (
                <div className="relative">
                  <button
                    onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-1"
                  >
                    More
                    <svg className={`w-4 h-4 transition-transform ${moreMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    <span className="text-xs text-gray-400">+{navAnalysis.overflowItems.length}</span>
                  </button>
                  {moreMenuOpen && (
                    <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[180px] z-20">
                      {navAnalysis.overflowItems.map((link, idx) => (
                        <a
                          key={link.id || idx}
                          href="#"
                          className={`block px-4 py-2 text-sm hover:bg-gray-100 ${getProminenceStyle(link.prominence)}`}
                          onClick={(e) => e.preventDefault()}
                          title={link.text}
                        >
                          {truncateText(link.text, 30)}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </nav>
          )}

          {/* CTA Button & Mobile Menu Toggle */}
          <div className="flex items-center gap-3">
            {ctaButton && (
              <button
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: brandColors.primary }}
                onClick={(e) => e.preventDefault()}
              >
                {ctaButton.text}
              </button>
            )}

            {/* Mobile menu button */}
            {isMobile && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {isMobile && mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-gray-200">
            <nav className="flex flex-col space-y-1">
              {primaryNav.map((link, idx) => (
                <a
                  key={link.id || idx}
                  href="#"
                  className={`px-3 py-2 rounded-md text-sm ${getProminenceStyle(link.prominence)}`}
                  onClick={(e) => e.preventDefault()}
                >
                  {link.text}
                </a>
              ))}
            </nav>
          </div>
        )}
      </div>

      {/* Link count indicator */}
      <div className="absolute top-1 right-1 bg-gray-800 text-white text-xs px-2 py-0.5 rounded opacity-60">
        {primaryNav.length} links
      </div>

      {/* UX Warning Banner */}
      {showWarnings && (navAnalysis.hasLongItems || navAnalysis.willOverflow) && (
        <div className="bg-amber-50 border-t border-amber-200 px-4 py-2">
          <div className="flex items-start gap-2 text-amber-800 text-xs">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <span className="font-medium">Navigation UX Issues:</span>
              <ul className="mt-1 list-disc list-inside text-amber-700">
                {navAnalysis.hasLongItems && (
                  <li>{navAnalysis.longItems.length} item(s) exceed {NAV_ITEM_MAX_CHARS} chars (will be truncated)</li>
                )}
                {navAnalysis.hasOverflow && (
                  <li>{navAnalysis.overflowItems.length} item(s) moved to "More" dropdown</li>
                )}
                {navAnalysis.willOverflow && (
                  <li>Total nav width may overflow on smaller screens</li>
                )}
              </ul>
              <p className="mt-1 text-amber-600">Tip: Keep menu items under {NAV_ITEM_IDEAL_CHARS} chars for best UX.</p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default HeaderPreview;
