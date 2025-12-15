// components/navigation/NavigationVisualPreview.tsx
// Main orchestrator for realistic navigation preview
// Uses existing previewNavigationForAllSegments() from navigationService

import React, { useState, useMemo } from 'react';
import {
  NavigationStructure,
  NavigationSegment,
  EnrichedTopic,
  FoundationPage,
  DynamicNavigationConfig,
  NAPData,
} from '../../types';
import { previewNavigationForAllSegments, GeneratedNavigation } from '../../services/navigationService';
import DeviceFrameWrapper, { DeviceType } from './preview/DeviceFrameWrapper';
import HeaderPreview from './preview/HeaderPreview';
import FooterPreview from './preview/FooterPreview';
import SegmentPreviewSelector from './preview/SegmentPreviewSelector';

interface NavigationVisualPreviewProps {
  navigation: NavigationStructure;
  topics: EnrichedTopic[];
  foundationPages: FoundationPage[];
  config: DynamicNavigationConfig;
  napData?: NAPData;
  brandColors?: {
    primary: string;
    secondary: string;
    text: string;
  };
}

const NavigationVisualPreview: React.FC<NavigationVisualPreviewProps> = ({
  navigation,
  topics,
  foundationPages,
  config,
  napData,
  brandColors,
}) => {
  const [selectedSegment, setSelectedSegment] = useState<NavigationSegment>('core_section');
  const [device, setDevice] = useState<DeviceType>('desktop');

  // Generate navigation preview for all segments
  const segmentPreviews = useMemo(() => {
    return previewNavigationForAllSegments(topics, foundationPages, navigation, config);
  }, [topics, foundationPages, navigation, config]);

  // Get the preview for the selected segment
  const currentPreview: GeneratedNavigation = segmentPreviews[selectedSegment] || {
    headerLinks: navigation.header?.primary_nav || [],
    footerLinks: [],
    breadcrumbs: [{ text: 'Home', url: '/' }],
  };

  // Calculate stats for each segment
  const segmentStats = useMemo(() => {
    const stats: Record<NavigationSegment, { headerLinks: number; footerLinks: number; sidebarLinks?: number }> = {
      core_section: { headerLinks: 0, footerLinks: 0 },
      author_section: { headerLinks: 0, footerLinks: 0 },
      pillar: { headerLinks: 0, footerLinks: 0 },
      cluster: { headerLinks: 0, footerLinks: 0 },
      foundation: { headerLinks: 0, footerLinks: 0 },
    };

    for (const segment of Object.keys(stats) as NavigationSegment[]) {
      const preview = segmentPreviews[segment];
      if (preview) {
        stats[segment] = {
          headerLinks: preview.headerLinks.length,
          footerLinks: preview.footerLinks.length,
          sidebarLinks: preview.sidebarLinks?.length,
        };
      }
    }

    return stats;
  }, [segmentPreviews]);

  // Build footer sections from the current preview
  const footerSections = useMemo(() => {
    // Group footer links into sections
    const sections = navigation.footer?.sections || [];

    // If dynamic navigation generated different footer links, create a "Dynamic" section
    if (currentPreview.footerLinks.length > 0) {
      // Check if the preview links differ from base navigation
      const baseFooterLinkIds = new Set(
        sections.flatMap(s => s.links.map(l => l.id))
      );
      const previewLinkIds = currentPreview.footerLinks.map(l => l.id);
      const hasDynamicLinks = previewLinkIds.some(id => !baseFooterLinkIds.has(id));

      if (hasDynamicLinks && config.enabled) {
        return [
          ...sections,
          {
            id: 'dynamic-context',
            heading: 'Related Pages',
            links: currentPreview.footerLinks.filter(l => !baseFooterLinkIds.has(l.id)),
          },
        ];
      }
    }

    return sections;
  }, [navigation.footer?.sections, currentPreview.footerLinks, config.enabled]);

  const isMobile = device === 'mobile';

  return (
    <div className="bg-gray-900 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Navigation Preview</h3>
          <p className="text-sm text-gray-400 mt-1">
            Realistic mockup of how navigation appears on different page types
          </p>
        </div>

        {/* Dynamic navigation status badge */}
        <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${
          config.enabled
            ? 'bg-green-900/50 text-green-400 border border-green-700'
            : 'bg-gray-700 text-gray-400'
        }`}>
          {config.enabled ? '✓ Dynamic Navigation Active' : 'Static Navigation'}
        </div>
      </div>

      {/* Segment selector */}
      <SegmentPreviewSelector
        selectedSegment={selectedSegment}
        onSegmentChange={setSelectedSegment}
        segmentStats={segmentStats}
      />

      {/* Device frame with preview */}
      <DeviceFrameWrapper device={device} onDeviceChange={setDevice}>
        <div className="min-h-full flex flex-col">
          {/* Header */}
          <HeaderPreview
            logoAltText={navigation.header?.logo_alt_text || 'Company Logo'}
            primaryNav={currentPreview.headerLinks}
            ctaButton={navigation.header?.cta_button}
            isMobile={isMobile}
            brandColors={brandColors}
          />

          {/* Main content area with breadcrumbs */}
          <main className="flex-1 bg-gray-50 p-6">
            {/* Breadcrumbs */}
            {currentPreview.breadcrumbs.length > 0 && (
              <nav className="mb-4 text-sm">
                <ol className="flex items-center space-x-2">
                  {currentPreview.breadcrumbs.map((crumb, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && <span className="text-gray-400">/</span>}
                      {crumb.url ? (
                        <a href="#" className="text-blue-600 hover:underline" onClick={e => e.preventDefault()}>
                          {crumb.text}
                        </a>
                      ) : (
                        <span className="text-gray-600">{crumb.text}</span>
                      )}
                    </React.Fragment>
                  ))}
                </ol>
              </nav>
            )}

            {/* Content placeholder */}
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <div className="text-4xl mb-4">📄</div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                {selectedSegment === 'core_section' && 'Monetization Page Content'}
                {selectedSegment === 'author_section' && 'Informational Content'}
                {selectedSegment === 'pillar' && 'Pillar Page Content'}
                {selectedSegment === 'cluster' && 'Cluster Topic Content'}
                {selectedSegment === 'foundation' && 'Foundation Page Content'}
              </h2>
              <p className="text-gray-500 text-sm max-w-md mx-auto">
                This area represents the main content of the page.
                Navigation changes based on page type to optimize PageRank flow.
              </p>

              {/* Sidebar preview (if available) */}
              {currentPreview.sidebarLinks && currentPreview.sidebarLinks.length > 0 && !isMobile && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Sidebar Links ({currentPreview.sidebarLinks.length})
                  </h4>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {currentPreview.sidebarLinks.slice(0, 6).map((link, idx) => (
                      <span
                        key={link.id || idx}
                        className={`px-2 py-1 rounded text-xs ${
                          link.prominence === 'high'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {link.text}
                      </span>
                    ))}
                    {currentPreview.sidebarLinks.length > 6 && (
                      <span className="px-2 py-1 text-xs text-gray-400">
                        +{currentPreview.sidebarLinks.length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </main>

          {/* Footer */}
          <FooterPreview
            sections={footerSections}
            legalLinks={navigation.footer?.legal_links || []}
            napData={napData}
            showNap={navigation.footer?.nap_display ?? true}
            copyrightText={navigation.footer?.copyright_text || ''}
            isMobile={isMobile}
            brandColors={brandColors}
          />
        </div>
      </DeviceFrameWrapper>

      {/* Link annotations (contextual bridges) */}
      {currentPreview.linkAnnotations && currentPreview.linkAnnotations.size > 0 && (
        <div className="mt-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h4 className="text-sm font-medium text-white mb-3">
            Contextual Bridge Hints
          </h4>
          <p className="text-xs text-gray-400 mb-3">
            Suggested annotation text for links (helps with semantic relevance):
          </p>
          <div className="space-y-2">
            {Array.from(currentPreview.linkAnnotations.entries()).slice(0, 5).map(([topicId, annotation]) => {
              const topic = topics.find(t => t.id === topicId);
              return (
                <div key={topicId} className="flex items-start gap-2 text-xs">
                  <span className="text-gray-500">→</span>
                  <span className="text-blue-400">{topic?.title || topicId}:</span>
                  <span className="text-gray-400 italic">"{annotation}"</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-white">{currentPreview.headerLinks.length}</div>
          <div className="text-xs text-gray-400">Header Links</div>
          <div className={`text-xs mt-1 ${currentPreview.headerLinks.length > 10 ? 'text-yellow-500' : 'text-green-500'}`}>
            {currentPreview.headerLinks.length <= 10 ? '✓ Optimal' : '⚠ Consider reducing'}
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-white">{currentPreview.footerLinks.length}</div>
          <div className="text-xs text-gray-400">Footer Links</div>
          <div className={`text-xs mt-1 ${currentPreview.footerLinks.length > 30 ? 'text-yellow-500' : 'text-green-500'}`}>
            {currentPreview.footerLinks.length <= 30 ? '✓ Within limit' : '⚠ Over 30'}
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-white">
            {currentPreview.headerLinks.length + currentPreview.footerLinks.length + (currentPreview.sidebarLinks?.length || 0)}
          </div>
          <div className="text-xs text-gray-400">Total Nav Links</div>
          <div className={`text-xs mt-1 ${
            (currentPreview.headerLinks.length + currentPreview.footerLinks.length) > 50
              ? 'text-yellow-500'
              : 'text-green-500'
          }`}>
            {(currentPreview.headerLinks.length + currentPreview.footerLinks.length) <= 50
              ? '✓ Good PageRank concentration'
              : '⚠ May dilute PageRank'
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default NavigationVisualPreview;
