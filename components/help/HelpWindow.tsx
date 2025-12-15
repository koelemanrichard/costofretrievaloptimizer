/**
 * HelpWindow.tsx
 *
 * Main help viewer component with sidebar navigation and content area.
 * This is the root component rendered in the help window.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  HelpCategoryWithArticles,
  HelpArticleFull,
  HelpNavigationState,
  HelpSearchResult
} from '../../types/help';
import {
  getCategoriesWithArticles,
  getArticleBySlug,
  searchArticles
} from '../../services/helpService';
import { HelpSidebar } from './HelpSidebar';
import { HelpArticleView } from './HelpArticleView';
import { HelpSearch } from './HelpSearch';
import { HelpBreadcrumbs } from './HelpBreadcrumbs';

interface HelpWindowProps {
  supabase: SupabaseClient;
  navigation: HelpNavigationState;
  onNavigate: (categorySlug?: string, articleSlug?: string) => void;
}

export const HelpWindow: React.FC<HelpWindowProps> = ({
  supabase,
  navigation,
  onNavigate
}) => {
  const [categories, setCategories] = useState<HelpCategoryWithArticles[]>([]);
  const [currentArticle, setCurrentArticle] = useState<HelpArticleFull | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<HelpSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await getCategoriesWithArticles(supabase);
        setCategories(data);
      } catch (err) {
        console.error('Failed to load categories:', err);
        setError('Failed to load help categories');
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, [supabase]);

  // Load article when navigation changes
  useEffect(() => {
    const loadArticle = async () => {
      if (!navigation.categorySlug || !navigation.articleSlug) {
        setCurrentArticle(null);
        return;
      }

      setLoading(true);
      try {
        const article = await getArticleBySlug(
          supabase,
          navigation.categorySlug,
          navigation.articleSlug
        );
        setCurrentArticle(article);
      } catch (err) {
        console.error('Failed to load article:', err);
        setError('Failed to load article');
      } finally {
        setLoading(false);
      }
    };

    loadArticle();
  }, [supabase, navigation.categorySlug, navigation.articleSlug]);

  // Handle search
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchArticles(supabase, query);
      setSearchResults(results);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  }, [supabase]);

  // Handle search result click
  const handleSearchResultClick = useCallback((result: HelpSearchResult) => {
    setSearchQuery('');
    setSearchResults([]);
    onNavigate(result.category_slug, result.slug);
  }, [onNavigate]);

  // Get current category
  const currentCategory = navigation.categorySlug
    ? categories.find(c => c.slug === navigation.categorySlug)
    : null;

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-8 max-w-lg text-center">
          <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-semibold text-white mb-2">Error</h2>
          <p className="text-gray-300 mb-4">{error}</p>
          <button
            onClick={() => setError(null)}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Sidebar */}
      <HelpSidebar
        categories={categories}
        currentCategorySlug={navigation.categorySlug}
        currentArticleSlug={navigation.articleSlug}
        onNavigate={onNavigate}
        searchComponent={
          <HelpSearch
            query={searchQuery}
            results={searchResults}
            isSearching={isSearching}
            onSearch={handleSearch}
            onResultClick={handleSearchResultClick}
          />
        }
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur border-b border-gray-800 px-8 py-4">
          <HelpBreadcrumbs
            category={currentCategory || undefined}
            article={currentArticle || undefined}
            onNavigate={onNavigate}
          />
        </header>

        {/* Content */}
        <div className="px-8 py-6 max-w-4xl">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : currentArticle ? (
            <HelpArticleView
              article={currentArticle}
              supabase={supabase}
              onNavigate={onNavigate}
            />
          ) : navigation.categorySlug && currentCategory ? (
            // Show category overview
            <div>
              <h1 className="text-3xl font-bold text-white mb-4">{currentCategory.name}</h1>
              {currentCategory.description && (
                <p className="text-gray-400 mb-8">{currentCategory.description}</p>
              )}
              <div className="grid gap-4">
                {currentCategory.articles.map(article => (
                  <button
                    key={article.id}
                    onClick={() => onNavigate(currentCategory.slug, article.slug)}
                    className="block text-left p-4 bg-gray-800/50 hover:bg-gray-800 rounded-lg border border-gray-700 transition-colors"
                  >
                    <h3 className="text-lg font-medium text-white mb-1">{article.title}</h3>
                    {article.summary && (
                      <p className="text-gray-400 text-sm">{article.summary}</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Show welcome/home
            <WelcomeView categories={categories} onNavigate={onNavigate} />
          )}
        </div>
      </main>
    </div>
  );
};

// =============================================================================
// WELCOME VIEW
// =============================================================================

interface WelcomeViewProps {
  categories: HelpCategoryWithArticles[];
  onNavigate: (categorySlug?: string, articleSlug?: string) => void;
}

const WelcomeView: React.FC<WelcomeViewProps> = ({ categories, onNavigate }) => {
  // Find quick start guide if it exists
  const quickStartCategory = categories.find(c => c.slug === 'getting-started');
  const quickStartArticle = quickStartCategory?.articles.find(a => a.slug === 'quick-start-guide');

  return (
    <div>
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="w-20 h-20 bg-cyan-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">
          Help Documentation
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Learn how to use the Holistic SEO Topical Map Generator to create comprehensive content strategies.
        </p>
      </div>

      {/* Quick Start */}
      {quickStartArticle && (
        <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-800/50 rounded-xl p-6 mb-12">
          <h2 className="text-lg font-semibold text-white mb-2">New here?</h2>
          <p className="text-gray-300 mb-4">
            Get started with our quick start guide to learn the basics.
          </p>
          <button
            onClick={() => onNavigate('getting-started', 'quick-start-guide')}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors inline-flex items-center gap-2"
          >
            <span>Quick Start Guide</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Categories Grid */}
      <h2 className="text-2xl font-semibold text-white mb-6">Browse Topics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => onNavigate(category.slug)}
            className="text-left p-5 bg-gray-800/50 hover:bg-gray-800 rounded-xl border border-gray-700 transition-all hover:border-gray-600"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                <CategoryIcon icon={category.icon} />
              </div>
              <div>
                <h3 className="text-lg font-medium text-white mb-1">{category.name}</h3>
                {category.description && (
                  <p className="text-gray-400 text-sm line-clamp-2">{category.description}</p>
                )}
                <p className="text-gray-500 text-xs mt-2">
                  {category.articles.length} article{category.articles.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// =============================================================================
// CATEGORY ICON
// =============================================================================

const CategoryIcon: React.FC<{ icon?: string }> = ({ icon }) => {
  // Simple icon mapping
  const iconMap: Record<string, React.ReactElement> = {
    'rocket': (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    ),
    'folder': (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    ),
    'map': (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    ),
    'list-tree': (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    ),
    'file-text': (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    ),
    'pen-tool': (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    ),
    'chart-bar': (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    ),
    'globe': (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    ),
    'download': (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    ),
    'settings': (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    ),
    'help-circle': (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
    'graduation-cap': (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
    )
  };

  const path = iconMap[icon || ''] || iconMap['help-circle'];

  return (
    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {path}
    </svg>
  );
};

export default HelpWindow;
