/**
 * HelpSidebar.tsx
 *
 * Left sidebar navigation for the help window.
 * Displays categories and their articles in a collapsible tree.
 */

import React, { useState } from 'react';
import { HelpCategoryWithArticles, HelpArticle } from '../../types/help';

interface HelpSidebarProps {
  categories: HelpCategoryWithArticles[];
  currentCategorySlug?: string;
  currentArticleSlug?: string;
  onNavigate: (categorySlug?: string, articleSlug?: string) => void;
  searchComponent?: React.ReactNode;
}

export const HelpSidebar: React.FC<HelpSidebarProps> = ({
  categories,
  currentCategorySlug,
  currentArticleSlug,
  onNavigate,
  searchComponent
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => {
    // Auto-expand the current category
    const initial = new Set<string>();
    if (currentCategorySlug) {
      initial.add(currentCategorySlug);
    }
    return initial;
  });

  // Expand current category when navigation changes
  React.useEffect(() => {
    if (currentCategorySlug && !expandedCategories.has(currentCategorySlug)) {
      setExpandedCategories(prev => new Set([...prev, currentCategorySlug]));
    }
  }, [currentCategorySlug]);

  const toggleCategory = (slug: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  };

  return (
    <aside className="w-72 bg-gray-800/50 border-r border-gray-700 flex flex-col h-screen sticky top-0">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <button
          onClick={() => onNavigate()}
          className="flex items-center gap-3 text-white hover:text-cyan-400 transition-colors"
        >
          <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="font-semibold">Help Center</span>
        </button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-700">
        {searchComponent}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {categories.map(category => (
            <CategoryItem
              key={category.id}
              category={category}
              isExpanded={expandedCategories.has(category.slug)}
              isCurrentCategory={category.slug === currentCategorySlug}
              currentArticleSlug={currentArticleSlug}
              onToggle={() => toggleCategory(category.slug)}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={() => window.close()}
          className="w-full px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Close Help
        </button>
      </div>
    </aside>
  );
};

// =============================================================================
// CATEGORY ITEM
// =============================================================================

interface CategoryItemProps {
  category: HelpCategoryWithArticles;
  isExpanded: boolean;
  isCurrentCategory: boolean;
  currentArticleSlug?: string;
  onToggle: () => void;
  onNavigate: (categorySlug?: string, articleSlug?: string) => void;
}

const CategoryItem: React.FC<CategoryItemProps> = ({
  category,
  isExpanded,
  isCurrentCategory,
  currentArticleSlug,
  onToggle,
  onNavigate
}) => {
  return (
    <li>
      <button
        onClick={() => {
          onToggle();
          onNavigate(category.slug);
        }}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
          isCurrentCategory
            ? 'bg-cyan-900/30 text-cyan-400'
            : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
        }`}
      >
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="flex-1 truncate text-sm font-medium">{category.name}</span>
        <span className="text-xs text-gray-500">{(category.articles || []).length}</span>
      </button>

      {/* Articles */}
      {isExpanded && (category.articles || []).length > 0 && (
        <ul className="ml-6 mt-1 space-y-0.5">
          {(category.articles || []).map(article => (
            <ArticleItem
              key={article.id}
              article={article}
              categorySlug={category.slug}
              isCurrent={article.slug === currentArticleSlug}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

// =============================================================================
// ARTICLE ITEM
// =============================================================================

interface ArticleItemProps {
  article: HelpArticle;
  categorySlug: string;
  isCurrent: boolean;
  onNavigate: (categorySlug?: string, articleSlug?: string) => void;
}

const ArticleItem: React.FC<ArticleItemProps> = ({
  article,
  categorySlug,
  isCurrent,
  onNavigate
}) => {
  return (
    <li>
      <button
        onClick={() => onNavigate(categorySlug, article.slug)}
        className={`w-full px-3 py-1.5 rounded-lg text-left text-sm transition-colors ${
          isCurrent
            ? 'bg-cyan-900/20 text-cyan-400'
            : 'text-gray-400 hover:bg-gray-700/30 hover:text-white'
        }`}
      >
        <span className="truncate block">{article.title}</span>
      </button>
    </li>
  );
};

export default HelpSidebar;
