
// components/ui/NavigationPreview.tsx
// Live preview of navigation structure (header and footer)

import React, { useState } from 'react';
import { NavigationStructure, NavigationLink, NAPData } from '../../types';
import { Card } from './Card';

interface NavigationPreviewProps {
  navigation: NavigationStructure;
  napData?: NAPData;
  companyName?: string;
}

export const NavigationPreview: React.FC<NavigationPreviewProps> = ({
  navigation,
  napData,
  companyName = 'Company Name',
}) => {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  const renderLink = (link: NavigationLink, index: number) => (
    <a
      key={link.id || index}
      href="#"
      onClick={(e) => e.preventDefault()}
      className="text-gray-300 hover:text-white transition-colors text-sm"
    >
      {link.text || 'Untitled'}
    </a>
  );

  const renderHeader = () => (
    <header className="bg-gray-900 border-b border-gray-700">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className={`flex items-center ${viewMode === 'mobile' ? 'flex-col gap-3' : 'justify-between'}`}>
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-sm">
              {companyName.charAt(0).toUpperCase()}
            </div>
            <span className="text-white font-semibold text-sm">
              {navigation.header.logo_alt_text || companyName}
            </span>
          </div>

          {/* Navigation Links */}
          <nav className={`flex items-center gap-4 ${viewMode === 'mobile' ? 'flex-wrap justify-center' : ''}`}>
            {navigation.header.primary_nav.map((link, index) => renderLink(link, index))}

            {/* CTA Button */}
            {navigation.header.cta_button && (
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-sm font-medium transition-colors">
                {navigation.header.cta_button.text || 'Contact'}
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );

  const renderFooter = () => (
    <footer className="bg-gray-900 border-t border-gray-700">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Footer Sections */}
        {navigation.footer.sections.length > 0 && (
          <div className={`grid gap-6 mb-6 ${
            viewMode === 'mobile'
              ? 'grid-cols-1'
              : `grid-cols-${Math.min(navigation.footer.sections.length, 4)}`
          }`}
          style={{
            gridTemplateColumns: viewMode === 'desktop'
              ? `repeat(${Math.min(navigation.footer.sections.length, 4)}, minmax(0, 1fr))`
              : undefined
          }}
          >
            {navigation.footer.sections.map((section, index) => (
              <div key={section.id || index}>
                <h4 className="text-white font-semibold text-sm mb-3">{section.heading}</h4>
                <ul className="space-y-2">
                  {section.links.map((link, linkIndex) => (
                    <li key={link.id || linkIndex}>
                      <a
                        href="#"
                        onClick={(e) => e.preventDefault()}
                        className="text-gray-400 hover:text-gray-300 text-sm transition-colors"
                      >
                        {link.text || 'Untitled'}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* NAP Data */}
        {navigation.footer.nap_display && napData && (
          <div className="border-t border-gray-700 pt-4 mb-4">
            <div className={`flex ${viewMode === 'mobile' ? 'flex-col gap-2' : 'gap-6'} text-sm text-gray-400`}>
              {napData.company_name && (
                <span className="font-medium text-gray-300">{napData.company_name}</span>
              )}
              {napData.address && <span>{napData.address}</span>}
              {napData.phone && <span>{napData.phone}</span>}
              {napData.email && <span>{napData.email}</span>}
            </div>
          </div>
        )}

        {/* Legal Links & Copyright */}
        <div className={`flex ${viewMode === 'mobile' ? 'flex-col gap-2' : 'justify-between items-center'} border-t border-gray-700 pt-4`}>
          <div className="flex gap-4">
            {navigation.footer.legal_links.map((link, index) => (
              <a
                key={link.id || index}
                href="#"
                onClick={(e) => e.preventDefault()}
                className="text-gray-500 hover:text-gray-400 text-xs transition-colors"
              >
                {link.text || 'Legal'}
              </a>
            ))}
          </div>
          <p className="text-gray-500 text-xs">
            {navigation.footer.copyright_text || `© ${new Date().getFullYear()} ${companyName}. All rights reserved.`}
          </p>
        </div>
      </div>
    </footer>
  );

  return (
    <Card className="overflow-hidden">
      {/* View Mode Toggle */}
      <div className="flex justify-between items-center p-3 bg-gray-800 border-b border-gray-700">
        <span className="text-sm font-medium text-gray-400">Preview</span>
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode('desktop')}
            className={`px-3 py-1 text-xs rounded ${
              viewMode === 'desktop'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            Desktop
          </button>
          <button
            onClick={() => setViewMode('mobile')}
            className={`px-3 py-1 text-xs rounded ${
              viewMode === 'mobile'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            Mobile
          </button>
        </div>
      </div>

      {/* Preview Container */}
      <div className={`bg-gray-950 ${viewMode === 'mobile' ? 'max-w-sm mx-auto' : ''}`}>
        {renderHeader()}

        {/* Content Placeholder */}
        <main className="min-h-32 flex items-center justify-center bg-gray-900/50">
          <span className="text-gray-600 text-sm">Page Content</span>
        </main>

        {renderFooter()}
      </div>
    </Card>
  );
};

export default NavigationPreview;
