// components/navigation/preview/FooterPreview.tsx
// Realistic multi-column footer preview component

import React from 'react';
import { FooterSection, NavigationLink, NAPData } from '../../../types';

interface FooterPreviewProps {
  sections: FooterSection[];
  legalLinks: NavigationLink[];
  napData?: NAPData;
  showNap: boolean;
  copyrightText: string;
  isMobile?: boolean;
  brandColors?: {
    primary: string;
    secondary: string;
    text: string;
  };
}

const FooterPreview: React.FC<FooterPreviewProps> = ({
  sections,
  legalLinks,
  napData,
  showNap,
  copyrightText,
  isMobile = false,
  brandColors = {
    primary: '#2563eb',
    secondary: '#1e40af',
    text: '#ffffff',
  },
}) => {
  // Calculate total links for display
  const totalFooterLinks = sections.reduce((acc, s) => acc + s.links.length, 0) + legalLinks.length;

  return (
    <footer className="bg-gray-900 text-gray-300 relative">
      {/* Link count indicator */}
      <div className="absolute top-2 right-2 bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded">
        {totalFooterLinks} links
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main footer sections */}
        <div className={`grid gap-8 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-4'}`}>
          {/* NAP Data Section (E-A-T) */}
          {showNap && napData && (
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
                Contact
              </h4>
              <div className="space-y-2 text-sm">
                <p className="font-medium text-white">{napData.company_name}</p>
                <p className="text-gray-400 whitespace-pre-line">{napData.address}</p>
                {napData.phone && (
                  <p>
                    <a href={`tel:${napData.phone}`} className="hover:text-white transition-colors">
                      {napData.phone}
                    </a>
                  </p>
                )}
                {napData.email && (
                  <p>
                    <a href={`mailto:${napData.email}`} className="hover:text-white transition-colors">
                      {napData.email}
                    </a>
                  </p>
                )}
                {napData.founded_year && (
                  <p className="text-gray-500 text-xs mt-2">
                    Est. {napData.founded_year}
                  </p>
                )}
              </div>

              {/* Multi-location support */}
              {napData.locations && napData.locations.length > 1 && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <p className="text-xs text-gray-500 mb-2">
                    {napData.locations.length} locations
                  </p>
                  {napData.locations.filter(l => !l.is_headquarters).slice(0, 2).map((loc, idx) => (
                    <p key={idx} className="text-xs text-gray-500">
                      {loc.name}: {loc.city || loc.address}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer link sections */}
          {sections.map((section, idx) => (
            <div key={section.id || idx}>
              <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
                {section.heading}
              </h4>
              <ul className="space-y-2">
                {section.links.map((link, linkIdx) => (
                  <li key={link.id || linkIdx}>
                    <a
                      href="#"
                      className={`text-sm hover:text-white transition-colors ${
                        link.prominence === 'high'
                          ? 'text-gray-200 font-medium'
                          : link.prominence === 'low'
                          ? 'text-gray-500'
                          : 'text-gray-400'
                      }`}
                      onClick={(e) => e.preventDefault()}
                    >
                      {link.text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar with legal links and copyright */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className={`flex ${isMobile ? 'flex-col space-y-4' : 'flex-row justify-between items-center'}`}>
            {/* Legal links */}
            <div className="flex flex-wrap gap-4">
              {legalLinks.map((link, idx) => (
                <a
                  key={link.id || idx}
                  href="#"
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  onClick={(e) => e.preventDefault()}
                >
                  {link.text}
                </a>
              ))}
            </div>

            {/* Copyright */}
            <p className="text-xs text-gray-500">
              {copyrightText || `© ${new Date().getFullYear()} Your Company. All rights reserved.`}
            </p>
          </div>
        </div>
      </div>

      {/* Schema.org LocalBusiness indicator */}
      {showNap && napData && (
        <div className="absolute bottom-2 left-2 text-xs text-gray-600 flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          LocalBusiness schema enabled
        </div>
      )}
    </footer>
  );
};

export default FooterPreview;
