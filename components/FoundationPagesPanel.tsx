
import React, { useState, useCallback } from 'react';
import {
  FoundationPage,
  FoundationPageType,
  NAPData,
  BusinessInfo,
  SEOPillars,
  NavigationStructure,
  EnrichedTopic
} from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Loader } from './ui/Loader';
import { NAPForm } from './ui/NAPForm';
import { FoundationPageCard } from './ui/FoundationPageCard';
import NavigationDesigner from './NavigationDesigner';
import BrandKitEditor from './BrandKitEditor';
import { BrandKit } from '../types';

interface FoundationPagesPanelProps {
  foundationPages: FoundationPage[];
  napData?: NAPData;
  isLoading?: boolean;
  onSaveNAPData: (napData: NAPData) => Promise<void>;
  onUpdatePage: (pageId: string, updates: Partial<FoundationPage>) => Promise<void>;
  onDeletePage: (pageId: string) => Promise<void>;
  onRestorePage: (pageId: string) => Promise<void>;
  onGenerateMissingPages?: () => Promise<void>;
  businessInfo?: BusinessInfo;
  pillars?: SEOPillars;
  // Navigation props
  navigation?: NavigationStructure | null;
  topics?: EnrichedTopic[];
  onSaveNavigation?: (navigation: NavigationStructure) => Promise<void>;
  onGenerateNavigation?: () => void;
  onRegenerateNavigation?: () => Promise<void>;
  isGeneratingNavigation?: boolean;
  // Brand Kit
  onSaveBrandKit?: (brandKit: any) => Promise<void>;
}

// Page type order for consistent display
const PAGE_TYPE_ORDER: FoundationPageType[] = ['homepage', 'about', 'contact', 'privacy', 'terms', 'author'];

// Required foundation pages
const REQUIRED_PAGES: FoundationPageType[] = ['homepage', 'about', 'contact', 'privacy', 'terms'];

export const FoundationPagesPanel: React.FC<FoundationPagesPanelProps> = ({
  foundationPages,
  napData,
  isLoading = false,
  onSaveNAPData,
  onUpdatePage,
  onDeletePage,
  onRestorePage,
  onGenerateMissingPages,
  businessInfo,
  pillars,
  // Navigation props
  navigation,
  topics = [],
  onSaveNavigation,
  onGenerateNavigation,
  onRegenerateNavigation,
  isGeneratingNavigation = false,
  // Brand Kit
  onSaveBrandKit
}) => {
  const [expandedPageId, setExpandedPageId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pages' | 'nap' | 'navigation' | 'brandkit'>('pages');
  const [editingPage, setEditingPage] = useState<FoundationPage | null>(null);
  const [isSavingNAP, setIsSavingNAP] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [localBrandKit, setLocalBrandKit] = useState<BrandKit | undefined>(businessInfo?.brandKit);
  const [isSavingBrandKit, setIsSavingBrandKit] = useState(false);

  // Sort pages by type order
  const sortedPages = [...foundationPages].sort((a, b) => {
    return PAGE_TYPE_ORDER.indexOf(a.page_type) - PAGE_TYPE_ORDER.indexOf(b.page_type);
  });

  // Active and deleted pages
  const activePages = sortedPages.filter(p => !p.deleted_at);
  const deletedPages = sortedPages.filter(p => p.deleted_at);

  // Find missing required pages
  const existingTypes = new Set(activePages.map(p => p.page_type));
  const missingPages = REQUIRED_PAGES.filter(type => !existingTypes.has(type));

  // Calculate completion stats - based on actual active pages, not just required
  const totalPages = activePages.length;
  const completedCount = activePages.filter(page => {
    return page.title && page.slug && page.meta_description && page.h1_template;
  }).length;

  const handleSaveNAP = async (data: NAPData) => {
    setIsSavingNAP(true);
    try {
      await onSaveNAPData(data);
    } finally {
      setIsSavingNAP(false);
    }
  };

  const handleGenerateMissing = async () => {
    if (!onGenerateMissingPages) return;
    setIsGenerating(true);
    try {
      await onGenerateMissingPages();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveBrandKit = async () => {
    if (!onSaveBrandKit || !localBrandKit) return;
    setIsSavingBrandKit(true);
    try {
      await onSaveBrandKit(localBrandKit);
    } finally {
      setIsSavingBrandKit(false);
    }
  };

  const handleEditPage = useCallback((page: FoundationPage) => {
    setEditingPage(page);
  }, []);

  const handleDeletePage = useCallback(async (pageId: string) => {
    await onDeletePage(pageId);
  }, [onDeletePage]);

  const handleRestorePage = useCallback(async (pageId: string) => {
    await onRestorePage(pageId);
  }, [onRestorePage]);

  const handleToggleExpand = useCallback((pageId: string) => {
    setExpandedPageId(prev => prev === pageId ? null : pageId);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Website Structure</h2>
          <p className="text-gray-400 mt-1">
            Foundation pages and NAP data for E-A-T optimization
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Completion indicator */}
          <div className="text-right">
            <div className="text-sm text-gray-400">Completion</div>
            <div className="text-lg font-semibold text-white">
              {completedCount}/{totalPages} pages
            </div>
          </div>
          {/* Generate missing pages button */}
          {missingPages.length > 0 && onGenerateMissingPages && (
            <Button
              onClick={handleGenerateMissing}
              disabled={isGenerating || isLoading}
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <Loader className="w-4 h-4" />
                  Generating...
                </span>
              ) : (
                `Generate ${missingPages.length} Missing Pages`
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'pages'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('pages')}
        >
          Foundation Pages ({activePages.length})
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'nap'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('nap')}
        >
          NAP Data
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'navigation'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('navigation')}
        >
          Navigation
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'brandkit'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('brandkit')}
        >
          Brand Kit
        </button>
      </div>

      {/* Content */}
      {activeTab === 'pages' && (
        <div className="space-y-4">
          {/* Missing pages warning */}
          {missingPages.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-yellow-400 text-xl">⚠️</span>
                <div>
                  <h4 className="text-yellow-400 font-medium">Missing Foundation Pages</h4>
                  <p className="text-gray-300 text-sm mt-1">
                    The following recommended pages are missing:{' '}
                    {missingPages.map((type, i) => (
                      <span key={type}>
                        <span className="text-yellow-400">{type}</span>
                        {i < missingPages.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader className="w-8 h-8" />
            </div>
          )}

          {/* Active pages list */}
          {!isLoading && activePages.length === 0 && (
            <Card className="p-8 text-center">
              <p className="text-gray-400">No foundation pages yet.</p>
              {onGenerateMissingPages && (
                <Button
                  className="mt-4"
                  onClick={handleGenerateMissing}
                  disabled={isGenerating}
                >
                  {isGenerating ? 'Generating...' : 'Generate Foundation Pages'}
                </Button>
              )}
            </Card>
          )}

          {!isLoading && activePages.map(page => (
            <FoundationPageCard
              key={page.id}
              page={page}
              onEdit={handleEditPage}
              onDelete={handleDeletePage}
              onRestore={handleRestorePage}
              isExpanded={expandedPageId === page.id}
              onToggleExpand={() => handleToggleExpand(page.id)}
            />
          ))}

          {/* Deleted pages section */}
          {deletedPages.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-700">
              <button
                className="flex items-center gap-2 text-gray-400 hover:text-gray-300 text-sm"
                onClick={() => setShowDeleted(!showDeleted)}
              >
                <svg
                  className={`w-4 h-4 transform transition-transform ${showDeleted ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                Deleted Pages ({deletedPages.length})
              </button>

              {showDeleted && (
                <div className="mt-4 space-y-4">
                  {deletedPages.map(page => (
                    <FoundationPageCard
                      key={page.id}
                      page={page}
                      onEdit={handleEditPage}
                      onDelete={handleDeletePage}
                      onRestore={handleRestorePage}
                      isDeleted={true}
                      isExpanded={expandedPageId === page.id}
                      onToggleExpand={() => handleToggleExpand(page.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'nap' && (
        <Card className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white">NAP Data</h3>
            <p className="text-gray-400 text-sm mt-1">
              Name, Address, Phone - Critical for E-A-T and local SEO. This data will be consistent across all foundation pages.
            </p>
          </div>

          <NAPForm
            initialData={napData}
            onSave={handleSaveNAP}
            isLoading={isSavingNAP}
          />

          {/* NAP consistency tips */}
          <div className="mt-6 pt-6 border-t border-gray-700">
            <h4 className="text-sm font-medium text-gray-400 mb-3">NAP Consistency Tips</h4>
            <ul className="text-sm text-gray-500 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>Use the exact same company name format everywhere</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>Include full address with postal code</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>Use consistent phone format (e.g., +1 for US)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>Email should match your domain for credibility</span>
              </li>
            </ul>
          </div>
        </Card>
      )}

      {/* Navigation Tab */}
      {activeTab === 'navigation' && (
        <div>
          {/* Show generate button if navigation doesn't exist but we can generate it */}
          {!navigation && onGenerateNavigation && (
            <Card className="p-8 text-center">
              <p className="text-gray-400 mb-4">No navigation structure found for this map.</p>
              <Button
                onClick={onGenerateNavigation}
                disabled={isGeneratingNavigation}
              >
                {isGeneratingNavigation ? (
                  <span className="flex items-center gap-2">
                    <Loader className="w-4 h-4" />
                    Generating Navigation...
                  </span>
                ) : (
                  'Generate Navigation'
                )}
              </Button>
              <p className="text-sm text-gray-500 mt-3">
                This will create a default navigation structure based on your foundation pages and topics.
              </p>
            </Card>
          )}
          {/* Show designer if navigation exists */}
          {navigation && onSaveNavigation && (
            <NavigationDesigner
              navigation={navigation}
              foundationPages={foundationPages.filter(p => !p.deleted_at)}
              topics={topics}
              onSave={onSaveNavigation}
              onDiscard={() => setActiveTab('pages')}
              onRegenerate={onRegenerateNavigation}
              isRegenerating={isGeneratingNavigation}
              pillars={pillars}
            />
          )}
          {/* Fallback if neither condition is met */}
          {!navigation && !onGenerateNavigation && !onSaveNavigation && (
            <Card className="p-8 text-center">
              <p className="text-gray-400">Navigation editing is not available.</p>
              <p className="text-sm text-gray-500 mt-2">Complete the setup steps to enable navigation configuration.</p>
            </Card>
          )}
        </div>
      )}

      {/* Brand Kit Tab */}
      {activeTab === 'brandkit' && (
        <Card className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white">Brand Kit</h3>
            <p className="text-gray-400 text-sm mt-1">
              Configure your brand colors, logo, and visual identity for consistent image generation across all content.
            </p>
          </div>

          <BrandKitEditor
            brandKit={localBrandKit}
            onChange={setLocalBrandKit}
          />

          {onSaveBrandKit && (
            <div className="mt-6 pt-4 border-t border-gray-700 flex justify-end">
              <Button
                onClick={handleSaveBrandKit}
                disabled={isSavingBrandKit}
              >
                {isSavingBrandKit ? (
                  <span className="flex items-center gap-2">
                    <Loader className="w-4 h-4" />
                    Saving...
                  </span>
                ) : (
                  'Save Brand Kit'
                )}
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Edit Modal - Simplified inline for now */}
      {editingPage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-white">
                Edit {editingPage.page_type.charAt(0).toUpperCase() + editingPage.page_type.slice(1)} Page
              </h3>
              <button
                className="text-gray-400 hover:text-white"
                onClick={() => setEditingPage(null)}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                await onUpdatePage(editingPage.id, {
                  title: formData.get('title') as string,
                  slug: formData.get('slug') as string,
                  meta_description: formData.get('meta_description') as string,
                  h1_template: formData.get('h1_template') as string,
                  schema_type: formData.get('schema_type') as FoundationPage['schema_type']
                });
                setEditingPage(null);
              }}
            >
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                <input
                  name="title"
                  defaultValue={editingPage.title}
                  className="w-full bg-gray-800 border border-gray-600 text-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Slug</label>
                <input
                  name="slug"
                  defaultValue={editingPage.slug}
                  className="w-full bg-gray-800 border border-gray-600 text-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Meta Description</label>
                <textarea
                  name="meta_description"
                  defaultValue={editingPage.meta_description || ''}
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-600 text-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">H1 Template</label>
                <input
                  name="h1_template"
                  defaultValue={editingPage.h1_template || ''}
                  className="w-full bg-gray-800 border border-gray-600 text-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Schema Type</label>
                <select
                  name="schema_type"
                  defaultValue={editingPage.schema_type || ''}
                  className="w-full bg-gray-800 border border-gray-600 text-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Select schema type</option>
                  <option value="Organization">Organization</option>
                  <option value="AboutPage">AboutPage</option>
                  <option value="ContactPage">ContactPage</option>
                  <option value="WebPage">WebPage</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEditingPage(null)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
