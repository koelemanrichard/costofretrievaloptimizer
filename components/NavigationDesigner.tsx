
// components/NavigationDesigner.tsx
// Visual Navigation Designer for header and footer configuration

import React, { useState, useCallback, useMemo } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Loader } from './ui/Loader';
import {
  NavigationStructure,
  NavigationLink,
  FooterSection,
  FoundationPage,
  EnrichedTopic,
} from '../types';
import { v4 as uuidv4 } from 'uuid';

interface NavigationDesignerProps {
  navigation: NavigationStructure | null;
  foundationPages: FoundationPage[];
  topics: EnrichedTopic[];
  isLoading?: boolean;
  onSave: (navigation: NavigationStructure) => Promise<void>;
  onDiscard: () => void;
}

const MAX_HEADER_LINKS = 10;
const MAX_FOOTER_LINKS = 30;
const MAX_TOTAL_LINKS = 150;

const EMPTY_LINK: Omit<NavigationLink, 'id'> = {
  text: '',
  prominence: 'medium',
};

const NavigationDesigner: React.FC<NavigationDesignerProps> = ({
  navigation,
  foundationPages,
  topics,
  isLoading = false,
  onSave,
  onDiscard,
}) => {
  // Initialize state from navigation or defaults
  const [headerLinks, setHeaderLinks] = useState<NavigationLink[]>(
    navigation?.header.primary_nav || []
  );
  const [ctaButton, setCtaButton] = useState<NavigationStructure['header']['cta_button'] | null>(
    navigation?.header.cta_button || null
  );
  const [logoAltText, setLogoAltText] = useState(navigation?.header.logo_alt_text || '');
  const [footerSections, setFooterSections] = useState<FooterSection[]>(
    navigation?.footer.sections || []
  );
  const [legalLinks, setLegalLinks] = useState<NavigationLink[]>(
    navigation?.footer.legal_links || []
  );
  const [napDisplay, setNapDisplay] = useState(navigation?.footer.nap_display ?? true);
  const [copyrightText, setCopyrightText] = useState(navigation?.footer.copyright_text || '');

  const [isSaving, setIsSaving] = useState(false);
  const [editingLink, setEditingLink] = useState<{ location: string; index: number } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Calculate link counts
  const headerLinkCount = headerLinks.length + (ctaButton ? 1 : 0);
  const footerLinkCount = footerSections.reduce((sum, section) => sum + section.links.length, 0) + legalLinks.length;
  const totalLinkCount = headerLinkCount + footerLinkCount;

  // Get available targets for link selection
  const availableTargets = useMemo(() => {
    const foundationTargets = foundationPages
      .filter(p => !p.deleted_at)
      .map(p => ({
        id: p.id,
        type: 'foundation' as const,
        label: p.title,
        slug: p.slug,
      }));

    const coreTopics = topics
      .filter(t => t.type === 'core')
      .map(t => ({
        id: t.id,
        type: 'topic' as const,
        label: t.title,
        slug: t.slug,
      }));

    return { foundationTargets, coreTopics };
  }, [foundationPages, topics]);

  // Mark as changed
  const markChanged = useCallback(() => {
    setHasChanges(true);
  }, []);

  // Header link handlers
  const addHeaderLink = useCallback(() => {
    if (headerLinkCount >= MAX_HEADER_LINKS) return;
    const newLink: NavigationLink = {
      id: uuidv4(),
      ...EMPTY_LINK,
      text: 'New Link',
    };
    setHeaderLinks(prev => [...prev, newLink]);
    markChanged();
  }, [headerLinkCount, markChanged]);

  const updateHeaderLink = useCallback((index: number, updates: Partial<NavigationLink>) => {
    setHeaderLinks(prev => prev.map((link, i) =>
      i === index ? { ...link, ...updates } : link
    ));
    markChanged();
  }, [markChanged]);

  const removeHeaderLink = useCallback((index: number) => {
    setHeaderLinks(prev => prev.filter((_, i) => i !== index));
    markChanged();
  }, [markChanged]);

  const moveHeaderLink = useCallback((fromIndex: number, toIndex: number) => {
    setHeaderLinks(prev => {
      const newLinks = [...prev];
      const [moved] = newLinks.splice(fromIndex, 1);
      newLinks.splice(toIndex, 0, moved);
      return newLinks;
    });
    markChanged();
  }, [markChanged]);

  // CTA button handlers
  const toggleCTA = useCallback(() => {
    setCtaButton(prev => prev ? null : { text: 'Contact Us' });
    markChanged();
  }, [markChanged]);

  const updateCTA = useCallback((updates: Partial<NonNullable<typeof ctaButton>>) => {
    setCtaButton(prev => prev ? { ...prev, ...updates } : null);
    markChanged();
  }, [markChanged]);

  // Footer section handlers
  const addFooterSection = useCallback(() => {
    const newSection: FooterSection = {
      id: uuidv4(),
      heading: 'New Section',
      links: [],
    };
    setFooterSections(prev => [...prev, newSection]);
    markChanged();
  }, [markChanged]);

  const updateFooterSection = useCallback((index: number, updates: Partial<FooterSection>) => {
    setFooterSections(prev => prev.map((section, i) =>
      i === index ? { ...section, ...updates } : section
    ));
    markChanged();
  }, [markChanged]);

  const removeFooterSection = useCallback((index: number) => {
    setFooterSections(prev => prev.filter((_, i) => i !== index));
    markChanged();
  }, [markChanged]);

  const addFooterLink = useCallback((sectionIndex: number) => {
    const newLink: NavigationLink = {
      id: uuidv4(),
      ...EMPTY_LINK,
      text: 'New Link',
    };
    setFooterSections(prev => prev.map((section, i) =>
      i === sectionIndex
        ? { ...section, links: [...section.links, newLink] }
        : section
    ));
    markChanged();
  }, [markChanged]);

  const updateFooterLink = useCallback((sectionIndex: number, linkIndex: number, updates: Partial<NavigationLink>) => {
    setFooterSections(prev => prev.map((section, i) =>
      i === sectionIndex
        ? {
            ...section,
            links: section.links.map((link, j) =>
              j === linkIndex ? { ...link, ...updates } : link
            ),
          }
        : section
    ));
    markChanged();
  }, [markChanged]);

  const removeFooterLink = useCallback((sectionIndex: number, linkIndex: number) => {
    setFooterSections(prev => prev.map((section, i) =>
      i === sectionIndex
        ? { ...section, links: section.links.filter((_, j) => j !== linkIndex) }
        : section
    ));
    markChanged();
  }, [markChanged]);

  // Legal links handlers
  const addLegalLink = useCallback(() => {
    const newLink: NavigationLink = {
      id: uuidv4(),
      ...EMPTY_LINK,
      text: 'Legal Link',
    };
    setLegalLinks(prev => [...prev, newLink]);
    markChanged();
  }, [markChanged]);

  const updateLegalLink = useCallback((index: number, updates: Partial<NavigationLink>) => {
    setLegalLinks(prev => prev.map((link, i) =>
      i === index ? { ...link, ...updates } : link
    ));
    markChanged();
  }, [markChanged]);

  const removeLegalLink = useCallback((index: number) => {
    setLegalLinks(prev => prev.filter((_, i) => i !== index));
    markChanged();
  }, [markChanged]);

  // Save handler
  const handleSave = useCallback(async () => {
    if (!navigation) return;

    setIsSaving(true);
    try {
      const updatedNavigation: NavigationStructure = {
        ...navigation,
        header: {
          logo_alt_text: logoAltText,
          primary_nav: headerLinks,
          cta_button: ctaButton || undefined,
        },
        footer: {
          sections: footerSections,
          legal_links: legalLinks,
          nap_display: napDisplay,
          copyright_text: copyrightText,
        },
      };
      await onSave(updatedNavigation);
      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  }, [navigation, logoAltText, headerLinks, ctaButton, footerSections, legalLinks, napDisplay, copyrightText, onSave]);

  // Link count warning colors
  const getCountColor = (count: number, max: number) => {
    const ratio = count / max;
    if (ratio >= 1) return 'text-red-400';
    if (ratio >= 0.8) return 'text-yellow-400';
    return 'text-green-400';
  };

  if (!navigation) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-400">No navigation structure found.</p>
        <p className="text-sm text-gray-500 mt-2">Generate a topical map first to create navigation.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Link Count Summary */}
      <Card className="p-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Navigation Designer</h2>
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-gray-400">Header: </span>
              <span className={getCountColor(headerLinkCount, MAX_HEADER_LINKS)}>
                {headerLinkCount}/{MAX_HEADER_LINKS}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Footer: </span>
              <span className={getCountColor(footerLinkCount, MAX_FOOTER_LINKS)}>
                {footerLinkCount}/{MAX_FOOTER_LINKS}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Total: </span>
              <span className={getCountColor(totalLinkCount, MAX_TOTAL_LINKS)}>
                {totalLinkCount}/{MAX_TOTAL_LINKS}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Header Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Header Navigation</h3>

        {/* Logo Alt Text */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-400 mb-1">Logo Alt Text</label>
          <Input
            value={logoAltText}
            onChange={(e) => { setLogoAltText(e.target.value); markChanged(); }}
            placeholder="Company Logo"
            className="max-w-md"
          />
        </div>

        {/* Primary Navigation Links */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-gray-400">Primary Navigation Links</label>
            <Button
              variant="secondary"
              onClick={addHeaderLink}
              disabled={headerLinkCount >= MAX_HEADER_LINKS}
              className="text-sm"
            >
              + Add Link
            </Button>
          </div>

          <div className="space-y-2">
            {headerLinks.map((link, index) => (
              <div key={link.id || index} className="flex items-center gap-2 bg-gray-800 p-3 rounded-lg">
                <span className="text-gray-500 cursor-move">⋮⋮</span>
                <Input
                  value={link.text}
                  onChange={(e) => updateHeaderLink(index, { text: e.target.value })}
                  placeholder="Link text"
                  className="flex-1"
                />
                <select
                  value={link.target_foundation_page_id || link.target_topic_id || 'external'}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'external') {
                      updateHeaderLink(index, { target_foundation_page_id: undefined, target_topic_id: undefined });
                    } else if (availableTargets.foundationTargets.find(t => t.id === value)) {
                      updateHeaderLink(index, { target_foundation_page_id: value, target_topic_id: undefined, external_url: undefined });
                    } else {
                      updateHeaderLink(index, { target_topic_id: value, target_foundation_page_id: undefined, external_url: undefined });
                    }
                  }}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                >
                  <option value="external">External URL</option>
                  <optgroup label="Foundation Pages">
                    {availableTargets.foundationTargets.map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Core Topics">
                    {availableTargets.coreTopics.map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </optgroup>
                </select>
                {!link.target_foundation_page_id && !link.target_topic_id && (
                  <Input
                    value={link.external_url || ''}
                    onChange={(e) => updateHeaderLink(index, { external_url: e.target.value })}
                    placeholder="https://..."
                    className="w-48"
                  />
                )}
                <div className="flex gap-1">
                  <button
                    onClick={() => index > 0 && moveHeaderLink(index, index - 1)}
                    disabled={index === 0}
                    className="p-1 text-gray-400 hover:text-white disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => index < headerLinks.length - 1 && moveHeaderLink(index, index + 1)}
                    disabled={index === headerLinks.length - 1}
                    className="p-1 text-gray-400 hover:text-white disabled:opacity-30"
                  >
                    ↓
                  </button>
                </div>
                <button
                  onClick={() => removeHeaderLink(index)}
                  className="p-1 text-red-400 hover:text-red-300"
                >
                  ✕
                </button>
              </div>
            ))}
            {headerLinks.length === 0 && (
              <p className="text-gray-500 text-sm py-4 text-center border border-dashed border-gray-700 rounded-lg">
                No header links yet. Click "Add Link" to start.
              </p>
            )}
          </div>
        </div>

        {/* CTA Button */}
        <div className="border-t border-gray-700 pt-4">
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!ctaButton}
                onChange={toggleCTA}
                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600"
              />
              <span className="text-sm font-medium text-white">Include CTA Button</span>
            </label>
          </div>
          {ctaButton && (
            <div className="flex gap-2 mt-2">
              <Input
                value={ctaButton.text}
                onChange={(e) => updateCTA({ text: e.target.value })}
                placeholder="Button text"
                className="w-48"
              />
              <select
                value={ctaButton.target_foundation_page_id || ctaButton.target_topic_id || 'external'}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'external') {
                    updateCTA({ target_foundation_page_id: undefined, target_topic_id: undefined });
                  } else if (availableTargets.foundationTargets.find(t => t.id === value)) {
                    updateCTA({ target_foundation_page_id: value, target_topic_id: undefined, url: undefined });
                  } else {
                    updateCTA({ target_topic_id: value, target_foundation_page_id: undefined, url: undefined });
                  }
                }}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
              >
                <option value="external">External URL</option>
                <optgroup label="Foundation Pages">
                  {availableTargets.foundationTargets.map(t => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </optgroup>
              </select>
              {!ctaButton.target_foundation_page_id && !ctaButton.target_topic_id && (
                <Input
                  value={ctaButton.url || ''}
                  onChange={(e) => updateCTA({ url: e.target.value })}
                  placeholder="https://..."
                  className="flex-1"
                />
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Footer Section */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Footer Sections</h3>
          <Button variant="secondary" onClick={addFooterSection} className="text-sm">
            + Add Section
          </Button>
        </div>

        <div className="space-y-4">
          {footerSections.map((section, sectionIndex) => (
            <div key={section.id || sectionIndex} className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Input
                  value={section.heading}
                  onChange={(e) => updateFooterSection(sectionIndex, { heading: e.target.value })}
                  placeholder="Section heading"
                  className="flex-1 font-medium"
                />
                <button
                  onClick={() => removeFooterSection(sectionIndex)}
                  className="p-1 text-red-400 hover:text-red-300"
                >
                  Remove Section
                </button>
              </div>

              <div className="space-y-2 ml-4">
                {section.links.map((link, linkIndex) => (
                  <div key={link.id || linkIndex} className="flex items-center gap-2">
                    <span className="text-gray-500 text-sm">•</span>
                    <Input
                      value={link.text}
                      onChange={(e) => updateFooterLink(sectionIndex, linkIndex, { text: e.target.value })}
                      placeholder="Link text"
                      className="flex-1"
                    />
                    <button
                      onClick={() => removeFooterLink(sectionIndex, linkIndex)}
                      className="p-1 text-red-400 hover:text-red-300 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <Button
                  variant="secondary"
                  onClick={() => addFooterLink(sectionIndex)}
                  className="text-xs mt-2"
                >
                  + Add Link
                </Button>
              </div>
            </div>
          ))}
          {footerSections.length === 0 && (
            <p className="text-gray-500 text-sm py-4 text-center border border-dashed border-gray-700 rounded-lg">
              No footer sections yet. Click "Add Section" to organize footer links.
            </p>
          )}
        </div>

        {/* Legal Links */}
        <div className="border-t border-gray-700 mt-4 pt-4">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-gray-400">Legal Links</label>
            <Button variant="secondary" onClick={addLegalLink} className="text-xs">
              + Add Legal Link
            </Button>
          </div>
          <div className="space-y-2">
            {legalLinks.map((link, index) => (
              <div key={link.id || index} className="flex items-center gap-2">
                <Input
                  value={link.text}
                  onChange={(e) => updateLegalLink(index, { text: e.target.value })}
                  placeholder="e.g., Privacy Policy"
                  className="flex-1"
                />
                <button
                  onClick={() => removeLegalLink(index)}
                  className="p-1 text-red-400 hover:text-red-300"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* NAP Display Toggle */}
        <div className="border-t border-gray-700 mt-4 pt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={napDisplay}
              onChange={(e) => { setNapDisplay(e.target.checked); markChanged(); }}
              className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600"
            />
            <span className="text-sm font-medium text-white">Display NAP Data in Footer</span>
          </label>
          <p className="text-xs text-gray-500 mt-1 ml-6">
            Show company name, address, phone in footer for E-A-T
          </p>
        </div>

        {/* Copyright Text */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-400 mb-1">Copyright Text</label>
          <Input
            value={copyrightText}
            onChange={(e) => { setCopyrightText(e.target.value); markChanged(); }}
            placeholder="© 2024 Your Company. All rights reserved."
          />
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button
          variant="secondary"
          onClick={onDiscard}
          disabled={isSaving}
        >
          {hasChanges ? 'Discard Changes' : 'Close'}
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
        >
          {isSaving ? (
            <span className="flex items-center gap-2">
              <Loader className="w-4 h-4" />
              Saving...
            </span>
          ) : (
            'Save Navigation'
          )}
        </Button>
      </div>
    </div>
  );
};

export default NavigationDesigner;
