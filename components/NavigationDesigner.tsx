
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
  NavigationSegment,
  DynamicNavigationConfig,
  NAPData,
  HreflangConfig,
} from '../types';
import { v4 as uuidv4 } from 'uuid';
import {
  previewNavigationForAllSegments,
  createDefaultConfig,
  GeneratedNavigation,
  analyzeQualityNodes,
  validateNavigationSEO,
  generateDynamicNavigation,
  analyzeNavigationNGrams,
  analyzeAnchorRepetition,
  estimateNavigationDOMSize,
} from '../services/navigationService';
import { createDefaultHreflangConfig } from '../services/hreflangService';
import { SEOPillars, SemanticTriple, ContentBrief } from '../types';

// New components
import NavigationVisualPreview from './navigation/NavigationVisualPreview';
import HreflangConfigurator from './navigation/HreflangConfigurator';

interface NavigationDesignerProps {
  navigation: NavigationStructure | null;
  foundationPages: FoundationPage[];
  topics: EnrichedTopic[];
  isLoading?: boolean;
  onSave: (navigation: NavigationStructure) => Promise<void>;
  onDiscard: () => void;
  // Regeneration and semantic context
  onRegenerate?: () => Promise<void>;
  isRegenerating?: boolean;
  pillars?: SEOPillars;
  eavs?: SemanticTriple[];
  // Additional data for enhanced features
  briefs?: Record<string, ContentBrief>;
  napData?: NAPData;
}

const MAX_HEADER_LINKS = 10;
const MAX_FOOTER_LINKS = 30;
const MAX_TOTAL_LINKS = 150;

// Character limits for navigation UX
const NAV_ITEM_IDEAL_CHARS = 15;
const NAV_ITEM_MAX_CHARS = 20;
const NAV_ITEM_WARNING_CHARS = 25;

// Helper to get character count color indicator
const getCharCountColor = (length: number): string => {
  if (length > NAV_ITEM_WARNING_CHARS) return 'text-red-400';
  if (length > NAV_ITEM_MAX_CHARS) return 'text-amber-400';
  if (length > NAV_ITEM_IDEAL_CHARS) return 'text-yellow-400';
  return 'text-gray-500';
};

/**
 * SEO Insights Panel - Shows data quality and navigation validation
 */
const SEOInsightsPanel: React.FC<{
  topics: EnrichedTopic[];
  foundationPages: FoundationPage[];
  navigation: NavigationStructure | null;
}> = ({ topics, foundationPages, navigation }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate data quality metrics
  const dataQuality = useMemo(() => {
    const total = topics.length;
    if (total === 0) return null;

    const withTopicClass = topics.filter(t => t.topic_class).length;
    const withClusterRole = topics.filter(t => t.cluster_role).length;
    const withQueryType = topics.filter(t => t.query_type).length;
    const withSearchVolume = topics.filter(t => t.metadata?.search_volume).length;
    const withMatchedEavs = topics.filter(t => t.metadata?.matched_eavs?.length > 0).length;
    const monetizationTopics = topics.filter(t => t.topic_class === 'monetization').length;
    const pillarTopics = topics.filter(t => t.cluster_role === 'pillar').length;
    const coreTopics = topics.filter(t => t.type === 'core').length;

    // Calculate overall readiness score
    const readinessScore = Math.round(
      (withTopicClass / total) * 30 +
      (withClusterRole / total) * 30 +
      (pillarTopics > 0 ? 20 : 0) +
      (monetizationTopics > 0 ? 20 : 0)
    );

    return {
      total,
      coreTopics,
      withTopicClass,
      withClusterRole,
      withQueryType,
      withSearchVolume,
      withMatchedEavs,
      monetizationTopics,
      pillarTopics,
      topicClassPct: Math.round((withTopicClass / total) * 100),
      clusterRolePct: Math.round((withClusterRole / total) * 100),
      queryTypePct: Math.round((withQueryType / total) * 100),
      readinessScore
    };
  }, [topics]);

  // Analyze Quality Nodes
  const qualityAnalysis = useMemo(() => {
    if (topics.length === 0) return null;
    return analyzeQualityNodes(topics);
  }, [topics]);

  // Validate current navigation
  const validation = useMemo(() => {
    if (!navigation) return null;
    // Create a minimal GeneratedNavigation from current state
    const currentNav: GeneratedNavigation = {
      headerLinks: navigation.header.primary_nav,
      footerLinks: navigation.footer.sections.flatMap(s => s.links).concat(navigation.footer.legal_links),
      breadcrumbs: [],
    };
    return validateNavigationSEO(currentNav, topics, foundationPages);
  }, [navigation, topics, foundationPages]);

  if (!dataQuality) return null;

  return (
    <Card className="p-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex justify-between items-center text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-white">SEO Insights</span>
          {validation && (
            <span className={`text-sm px-2 py-0.5 rounded ${
              validation.score >= 80 ? 'bg-green-500/20 text-green-400' :
              validation.score >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              Score: {validation.score}/100
            </span>
          )}
          {qualityAnalysis && (
            <span className="text-sm text-gray-400">
              {qualityAnalysis.qualityNodes.length} Quality Nodes
            </span>
          )}
        </div>
        <span className="text-gray-400">{isExpanded ? '▼' : '▶'}</span>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* Navigation Readiness */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-medium text-gray-400">Navigation Readiness</h4>
              <span className={`text-sm px-2 py-0.5 rounded ${
                dataQuality.readinessScore >= 80 ? 'bg-green-500/20 text-green-400' :
                dataQuality.readinessScore >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {dataQuality.readinessScore}% Ready
              </span>
            </div>

            {/* Primary Metrics - Pillars & Monetization (Most Important) */}
            <div className="grid grid-cols-2 gap-4 text-sm mb-3">
              <div className={`p-3 rounded border ${
                dataQuality.pillarTopics > 0 ? 'bg-purple-900/20 border-purple-500/30' : 'bg-gray-800 border-gray-700'
              }`}>
                <div className="flex justify-between items-start">
                  <div className="text-gray-400">Pillar Pages</div>
                  <span className="text-xs text-gray-500" title="Core topics with 3+ spokes that act as authority hubs">ℹ</span>
                </div>
                <div className={`text-2xl font-bold ${dataQuality.pillarTopics > 0 ? 'text-purple-400' : 'text-gray-500'}`}>
                  {dataQuality.pillarTopics}
                </div>
                <div className="text-xs text-gray-500">
                  {dataQuality.pillarTopics > 0
                    ? 'Authority hub pages for header navigation'
                    : 'No pillars - expand core topics to 3+ spokes'}
                </div>
              </div>
              <div className={`p-3 rounded border ${
                dataQuality.monetizationTopics > 0 ? 'bg-blue-900/20 border-blue-500/30' : 'bg-gray-800 border-gray-700'
              }`}>
                <div className="flex justify-between items-start">
                  <div className="text-gray-400">Monetization Pages</div>
                  <span className="text-xs text-gray-500" title="Pages targeting commercial keywords for conversion">ℹ</span>
                </div>
                <div className={`text-2xl font-bold ${dataQuality.monetizationTopics > 0 ? 'text-blue-400' : 'text-gray-500'}`}>
                  {dataQuality.monetizationTopics}
                </div>
                <div className="text-xs text-gray-500">
                  {dataQuality.monetizationTopics > 0
                    ? 'Money pages receive PageRank priority'
                    : 'No monetization pages detected'}
                </div>
              </div>
            </div>

            {/* Secondary Metrics */}
            <div className="grid grid-cols-4 gap-2 text-sm">
              <div className="bg-gray-800 p-2 rounded">
                <div className="text-xs text-gray-500">Classification</div>
                <div className={`font-semibold ${
                  dataQuality.topicClassPct >= 80 ? 'text-green-400' :
                  dataQuality.topicClassPct >= 50 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {dataQuality.topicClassPct}%
                </div>
              </div>
              <div className="bg-gray-800 p-2 rounded">
                <div className="text-xs text-gray-500">Cluster Roles</div>
                <div className={`font-semibold ${
                  dataQuality.clusterRolePct >= 80 ? 'text-green-400' :
                  dataQuality.clusterRolePct >= 50 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {dataQuality.clusterRolePct}%
                </div>
              </div>
              <div className="bg-gray-800 p-2 rounded">
                <div className="text-xs text-gray-500">Search Volume</div>
                <div className={`font-semibold ${
                  dataQuality.withSearchVolume > 0 ? 'text-green-400' : 'text-gray-500'
                }`}>
                  {dataQuality.withSearchVolume}/{dataQuality.total}
                </div>
              </div>
              <div className="bg-gray-800 p-2 rounded">
                <div className="text-xs text-gray-500">EAV Matches</div>
                <div className={`font-semibold ${
                  dataQuality.withMatchedEavs > 0 ? 'text-green-400' : 'text-gray-500'
                }`}>
                  {dataQuality.withMatchedEavs}/{dataQuality.total}
                </div>
              </div>
            </div>

            {/* Actionable Recommendations */}
            {dataQuality.readinessScore < 80 && (
              <div className="mt-3 p-2 bg-yellow-900/20 border border-yellow-500/30 rounded text-xs text-yellow-400">
                <strong>Improve navigation intelligence:</strong>
                <ul className="mt-1 space-y-0.5 list-disc list-inside">
                  {dataQuality.pillarTopics === 0 && (
                    <li>Expand core topics to 3+ spokes each to create pillars</li>
                  )}
                  {dataQuality.topicClassPct < 80 && (
                    <li>Run "Enrich Topic Metadata" to classify topics</li>
                  )}
                  {dataQuality.withSearchVolume === 0 && (
                    <li>Add DataForSEO credentials to fetch search volume</li>
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* Validation Issues */}
          {validation && (validation.issues.length > 0 || validation.recommendations.length > 0) && (
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-2">SEO Validation</h4>
              {validation.issues.length > 0 && (
                <ul className="space-y-1">
                  {validation.issues.map((issue, i) => (
                    <li key={i} className="text-sm text-red-400 flex items-start gap-2">
                      <span>⚠</span>
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
              )}
              {validation.recommendations.length > 0 && (
                <ul className="space-y-1 mt-2">
                  {validation.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-yellow-400 flex items-start gap-2">
                      <span>💡</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Quality Nodes Summary */}
          {qualityAnalysis && qualityAnalysis.qualityNodes.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-2">Quality Nodes (Prioritize in Navigation)</h4>
              <div className="flex flex-wrap gap-2">
                {qualityAnalysis.qualityNodes.slice(0, 8).map(qn => {
                  const topic = topics.find(t => t.id === qn.pageId);
                  return topic ? (
                    <span key={qn.pageId} className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                      {topic.title}
                    </span>
                  ) : null;
                })}
                {qualityAnalysis.qualityNodes.length > 8 && (
                  <span className="text-xs text-gray-500">+{qualityAnalysis.qualityNodes.length - 8} more</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

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
  onRegenerate,
  isRegenerating = false,
  pillars,
  eavs,
  briefs = {},
  napData,
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

  // Dynamic navigation state
  const [showDynamicPreview, setShowDynamicPreview] = useState(false);
  const [dynamicConfig, setDynamicConfig] = useState<DynamicNavigationConfig>(createDefaultConfig());
  const [previewSegment, setPreviewSegment] = useState<NavigationSegment>('core_section');

  // Enhanced features state
  const [activeTab, setActiveTab] = useState<'editor' | 'visual' | 'seo' | 'hreflang'>('editor');
  const [hreflangConfig, setHreflangConfig] = useState<HreflangConfig>(createDefaultHreflangConfig());

  // Update state when navigation prop changes (e.g., when switching maps)
  React.useEffect(() => {
    setHeaderLinks(navigation?.header.primary_nav || []);
    setCtaButton(navigation?.header.cta_button || null);
    setLogoAltText(navigation?.header.logo_alt_text || '');
    setFooterSections(navigation?.footer.sections || []);
    setLegalLinks(navigation?.footer.legal_links || []);
    setNapDisplay(navigation?.footer.nap_display ?? true);
    setCopyrightText(navigation?.footer.copyright_text || '');
    setHasChanges(false);
  }, [navigation]);

  // Calculate link counts
  const headerLinkCount = headerLinks.length + (ctaButton ? 1 : 0);
  const footerLinkCount = footerSections.reduce((sum, section) => sum + section.links.length, 0) + legalLinks.length;
  const totalLinkCount = headerLinkCount + footerLinkCount;

  // Compute dynamic navigation previews
  const dynamicPreviews = useMemo(() => {
    if (!navigation || !showDynamicPreview) return null;
    return previewNavigationForAllSegments(topics, foundationPages, navigation, dynamicConfig);
  }, [topics, foundationPages, navigation, dynamicConfig, showDynamicPreview]);

  // N-gram analysis for entity reinforcement
  const ngramAnalysis = useMemo(() => {
    if (!navigation || !pillars) return null;
    return analyzeNavigationNGrams(navigation, pillars);
  }, [navigation, pillars]);

  // Anchor text repetition analysis
  const anchorRepetition = useMemo(() => {
    if (!navigation) return null;
    return analyzeAnchorRepetition(topics, briefs, navigation);
  }, [navigation, topics, briefs]);

  // DOM size estimation
  const domEstimate = useMemo(() => {
    if (!navigation) return null;
    return estimateNavigationDOMSize(navigation, !!napData);
  }, [navigation, napData]);

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
      {/* Header with stats and tabs */}
      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Navigation Designer</h2>
          <div className="flex items-center gap-6">
            {/* Regenerate button */}
            {onRegenerate && (
              <Button
                variant="secondary"
                onClick={onRegenerate}
                disabled={isRegenerating}
                className="text-sm"
              >
                {isRegenerating ? 'Regenerating...' : '↻ Regenerate'}
              </Button>
            )}
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
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-t border-gray-700 pt-4">
          {[
            { id: 'editor', label: 'Editor', icon: '✏️' },
            { id: 'visual', label: 'Visual Preview', icon: '👁️' },
            { id: 'seo', label: 'SEO Analysis', icon: '📊' },
            { id: 'hreflang', label: 'Multilingual', icon: '🌐' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Tab Content */}
      {activeTab === 'editor' && (
        <>
          {/* SEO Insights Panel - Data Quality & Validation */}
          <SEOInsightsPanel topics={topics} foundationPages={foundationPages} navigation={navigation} />

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
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-400">Primary Navigation Links</label>
              <span className="text-xs text-gray-500">
                (Ideal: ≤{NAV_ITEM_IDEAL_CHARS} chars, Max: {NAV_ITEM_MAX_CHARS} chars)
              </span>
            </div>
            <Button
              variant="secondary"
              onClick={addHeaderLink}
              disabled={headerLinkCount >= MAX_HEADER_LINKS}
              className="text-sm"
            >
              + Add Link
            </Button>
          </div>

          {/* UX Warning for long items */}
          {headerLinks.some(link => link.text.length > NAV_ITEM_MAX_CHARS) && (
            <div className="mb-2 p-2 bg-amber-900/30 border border-amber-700/50 rounded text-xs text-amber-300">
              <span className="font-medium">⚠ UX Warning:</span> Some links exceed {NAV_ITEM_MAX_CHARS} characters and will be truncated in the header preview. Consider shortening them for better visitor experience.
            </div>
          )}

          <div className="space-y-2">
            {headerLinks.map((link, index) => (
              <div key={link.id || index} className="flex items-center gap-2 bg-gray-800 p-3 rounded-lg">
                <span className="text-gray-500 cursor-move">⋮⋮</span>
                <div className="flex-1 relative">
                  <Input
                    value={link.text}
                    onChange={(e) => updateHeaderLink(index, { text: e.target.value })}
                    placeholder="Link text"
                    className={`w-full ${link.text.length > NAV_ITEM_MAX_CHARS ? 'border-amber-500' : ''}`}
                  />
                  <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs ${getCharCountColor(link.text.length)}`} title={`Ideal: ${NAV_ITEM_IDEAL_CHARS} chars, Max: ${NAV_ITEM_MAX_CHARS} chars`}>
                    {link.text.length}
                  </span>
                </div>
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

      {/* Dynamic Navigation Preview */}
      <Card className="p-6">
        <button
          onClick={() => setShowDynamicPreview(!showDynamicPreview)}
          className="w-full flex justify-between items-center"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔀</span>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-white">Dynamic Navigation Preview</h3>
              <p className="text-sm text-gray-400">
                Preview how navigation changes based on page context
              </p>
            </div>
          </div>
          <span className="text-gray-400">{showDynamicPreview ? '▲' : '▼'}</span>
        </button>

        {showDynamicPreview && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            {/* Enable toggle */}
            <div className="flex items-center justify-between mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dynamicConfig.enabled}
                  onChange={(e) => setDynamicConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600"
                />
                <span className="text-sm font-medium text-white">Enable Dynamic Navigation</span>
              </label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={dynamicConfig.fallbackToStatic}
                    onChange={(e) => setDynamicConfig(prev => ({ ...prev, fallbackToStatic: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-800"
                  />
                  <span className="text-xs text-gray-400">Fallback to static nav</span>
                </label>
              </div>
            </div>

            {/* Segment selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-400 mb-2">Preview Segment</label>
              <div className="flex gap-2">
                {(['core_section', 'author_section', 'pillar', 'cluster', 'foundation'] as NavigationSegment[]).map(seg => (
                  <button
                    key={seg}
                    onClick={() => setPreviewSegment(seg)}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      previewSegment === seg
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    {seg.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview display */}
            {dynamicPreviews && dynamicPreviews[previewSegment] && (
              <div className="grid md:grid-cols-2 gap-4">
                {/* Header preview */}
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                    <span className="text-gray-400">📌</span> Header Links ({dynamicPreviews[previewSegment].headerLinks.length})
                  </h4>
                  <div className="space-y-1">
                    {dynamicPreviews[previewSegment].headerLinks.map((link, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className={`w-2 h-2 rounded-full ${
                          link.prominence === 'high' ? 'bg-blue-400' :
                          link.prominence === 'medium' ? 'bg-gray-400' : 'bg-gray-600'
                        }`} />
                        <span className="text-gray-300">{link.text}</span>
                        {link.target_foundation_page_id && (
                          <span className="text-xs text-purple-400">[FP]</span>
                        )}
                      </div>
                    ))}
                    {dynamicPreviews[previewSegment].headerLinks.length === 0 && (
                      <p className="text-gray-500 text-xs">No header links for this segment</p>
                    )}
                  </div>
                </div>

                {/* Sidebar preview */}
                {dynamicPreviews[previewSegment].sidebarLinks && (
                  <div className="bg-gray-900/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                      <span className="text-gray-400">📑</span> Sidebar Links ({dynamicPreviews[previewSegment].sidebarLinks?.length || 0})
                    </h4>
                    <div className="space-y-1">
                      {dynamicPreviews[previewSegment].sidebarLinks?.map((link, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span className={`w-2 h-2 rounded-full ${
                            link.prominence === 'high' ? 'bg-green-400' :
                            link.prominence === 'medium' ? 'bg-gray-400' : 'bg-gray-600'
                          }`} />
                          <span className="text-gray-300">{link.text}</span>
                        </div>
                      ))}
                      {(!dynamicPreviews[previewSegment].sidebarLinks || dynamicPreviews[previewSegment].sidebarLinks.length === 0) && (
                        <p className="text-gray-500 text-xs">No sidebar links for this segment</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Footer preview */}
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                    <span className="text-gray-400">📋</span> Footer Links ({dynamicPreviews[previewSegment].footerLinks.length})
                  </h4>
                  <div className="space-y-1">
                    {dynamicPreviews[previewSegment].footerLinks.map((link, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-300">{link.text}</span>
                        {link.target_foundation_page_id && (
                          <span className="text-xs text-purple-400">[FP]</span>
                        )}
                      </div>
                    ))}
                    {dynamicPreviews[previewSegment].footerLinks.length === 0 && (
                      <p className="text-gray-500 text-xs">No footer links for this segment</p>
                    )}
                  </div>
                </div>

                {/* Breadcrumbs preview */}
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                    <span className="text-gray-400">🧭</span> Breadcrumbs
                  </h4>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    {dynamicPreviews[previewSegment].breadcrumbs.map((crumb, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <span className="text-gray-600">›</span>}
                        <span className={crumb.url ? 'text-blue-400' : 'text-white'}>
                          {crumb.text}
                        </span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Explanation */}
            <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-200/80">
                <strong className="text-blue-300">How it works:</strong> Dynamic navigation adjusts links based on the visitor's current location.
                {previewSegment === 'core_section' && ' Core Section pages prioritize monetization topics and show cluster siblings.'}
                {previewSegment === 'author_section' && ' Author Section pages prioritize informational content and hide monetization links.'}
                {previewSegment === 'pillar' && ' Pillar pages show all child cluster topics for comprehensive internal linking.'}
                {previewSegment === 'cluster' && ' Cluster pages show parent pillar and sibling topics for topical relevance.'}
                {previewSegment === 'foundation' && ' Foundation pages show all pillars and other foundation pages for site-wide navigation.'}
              </p>
            </div>
          </div>
        )}
      </Card>
        </>
      )}

      {/* Visual Preview Tab */}
      {activeTab === 'visual' && navigation && (
        <NavigationVisualPreview
          navigation={navigation}
          topics={topics}
          foundationPages={foundationPages}
          config={dynamicConfig}
          napData={napData}
        />
      )}

      {/* SEO Analysis Tab */}
      {activeTab === 'seo' && (
        <div className="space-y-6">
          {/* DOM Size Monitoring */}
          {domEstimate && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span>📏</span>
                DOM Size Monitoring
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Gauge */}
                <div className="flex flex-col items-center">
                  <div className={`text-5xl font-bold ${
                    domEstimate.status === 'optimal' ? 'text-green-400' :
                    domEstimate.status === 'warning' ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {domEstimate.estimatedNodes}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">Estimated DOM Nodes</div>
                  <div className="w-full mt-4 bg-gray-700 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${
                        domEstimate.status === 'optimal' ? 'bg-green-500' :
                        domEstimate.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(100, (domEstimate.estimatedNodes / 200) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between w-full text-xs text-gray-500 mt-1">
                    <span>0</span>
                    <span>150 (optimal)</span>
                    <span>200+</span>
                  </div>
                </div>

                {/* Breakdown */}
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Breakdown</h4>
                  <div className="space-y-2">
                    {Object.entries(domEstimate.breakdown).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-gray-400">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span className="text-white">{value} nodes</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <div className="text-xs text-gray-400">Cost of Retrieval Score</div>
                    <div className={`text-2xl font-bold ${
                      domEstimate.corScore <= 70 ? 'text-green-400' :
                      domEstimate.corScore <= 100 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {domEstimate.corScore}%
                    </div>
                    <div className="text-xs text-gray-500">of navigation budget used</div>
                  </div>
                </div>
              </div>
              {/* Recommendations */}
              {domEstimate.recommendations.length > 0 && (
                <div className="mt-4 p-3 bg-gray-800 rounded-lg">
                  {domEstimate.recommendations.map((rec, i) => (
                    <p key={i} className="text-sm text-gray-300">{rec}</p>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* N-gram Analysis */}
          {ngramAnalysis && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span>🔤</span>
                Entity Reinforcement Analysis
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Score */}
                <div className="flex flex-col items-center bg-gray-800 rounded-lg p-6">
                  <div className={`text-5xl font-bold ${
                    ngramAnalysis.entityReinforcement >= 50 ? 'text-green-400' :
                    ngramAnalysis.entityReinforcement >= 30 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {ngramAnalysis.entityReinforcement}%
                  </div>
                  <div className="text-sm text-gray-400 mt-2">Entity Reinforcement Score</div>
                  <div className="mt-3 text-xs text-gray-500">
                    {ngramAnalysis.linksWithCentralEntity.length} of {ngramAnalysis.linksWithCentralEntity.length + ngramAnalysis.linksWithoutCentralEntity.length} links contain entity terms
                  </div>
                </div>

                {/* Entity words */}
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Central Entity Terms</h4>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {ngramAnalysis.centralEntityWords.length > 0 ? (
                      ngramAnalysis.centralEntityWords.map((word, i) => (
                        <span key={i} className="px-2 py-1 bg-blue-900/30 border border-blue-700 rounded text-xs text-blue-300">
                          {word}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">No central entity defined - set up SEO Pillars first</span>
                    )}
                  </div>

                  {ngramAnalysis.linksWithoutCentralEntity.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Links Missing Entity Terms</h4>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {ngramAnalysis.linksWithoutCentralEntity.slice(0, 5).map((link, i) => (
                          <div key={i} className="text-xs text-yellow-400 flex items-center gap-2">
                            <span>⚠</span>
                            <span>{link.text}</span>
                          </div>
                        ))}
                        {ngramAnalysis.linksWithoutCentralEntity.length > 5 && (
                          <div className="text-xs text-gray-500">+{ngramAnalysis.linksWithoutCentralEntity.length - 5} more</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Suggestions */}
              {ngramAnalysis.suggestions.length > 0 && (
                <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
                  {ngramAnalysis.suggestions.map((sug, i) => (
                    <p key={i} className="text-sm text-yellow-300">{sug}</p>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Anchor Repetition */}
          {anchorRepetition && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span>🔗</span>
                Anchor Text Diversity
              </h3>
              <div className="flex items-center gap-6 mb-4">
                <div className={`text-4xl font-bold ${
                  anchorRepetition.overallScore >= 80 ? 'text-green-400' :
                  anchorRepetition.overallScore >= 60 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {anchorRepetition.overallScore}%
                </div>
                <div className="text-sm text-gray-400">{anchorRepetition.summary}</div>
              </div>

              {anchorRepetition.violations.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-2 text-gray-400 font-medium">Target Page</th>
                        <th className="text-left py-2 text-gray-400 font-medium">Anchor Text</th>
                        <th className="text-left py-2 text-gray-400 font-medium">Count</th>
                        <th className="text-left py-2 text-gray-400 font-medium">Risk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {anchorRepetition.violations.slice(0, 5).map((v, i) => (
                        <tr key={i} className="border-b border-gray-800">
                          <td className="py-2 text-white">{v.targetTitle}</td>
                          <td className="py-2 text-gray-300 font-mono text-xs">"{v.anchor}"</td>
                          <td className="py-2 text-white">{v.count}x</td>
                          <td className="py-2">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              v.riskLevel === 'critical'
                                ? 'bg-red-900/50 text-red-400'
                                : 'bg-yellow-900/50 text-yellow-400'
                            }`}>
                              {v.riskLevel}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Diversification suggestions */}
              {anchorRepetition.diversificationSuggestions.length > 0 && (
                <div className="mt-4 p-4 bg-gray-800 rounded-lg">
                  <h4 className="text-sm font-medium text-white mb-3">Suggested Alternatives</h4>
                  {anchorRepetition.diversificationSuggestions.slice(0, 3).map((sug, i) => (
                    <div key={i} className="mb-3 last:mb-0">
                      <div className="text-xs text-gray-400">
                        Instead of "{sug.currentAnchor}" for {sug.targetTitle}:
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {sug.alternatives.map((alt, j) => (
                          <span key={j} className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">
                            {alt}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* Hreflang Tab */}
      {activeTab === 'hreflang' && (
        <HreflangConfigurator
          config={hreflangConfig}
          onConfigChange={setHreflangConfig}
        />
      )}

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
