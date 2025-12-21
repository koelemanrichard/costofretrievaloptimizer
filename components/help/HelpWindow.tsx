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

/**
 * Generate full help documentation as HTML for export
 */
const generateFullHelpHTML = (categories: HelpCategoryWithArticles[]): string => {
  const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Holistic SEO Topical Map Generator - Help Documentation</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 900px; margin: 0 auto; padding: 40px 20px; }
    h1 { font-size: 2.5rem; color: #1a1a1a; margin-bottom: 1rem; border-bottom: 3px solid #0891b2; padding-bottom: 0.5rem; }
    h2 { font-size: 1.8rem; color: #1a1a1a; margin: 2rem 0 1rem; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5rem; }
    h3 { font-size: 1.4rem; color: #374151; margin: 1.5rem 0 0.75rem; }
    h4 { font-size: 1.1rem; color: #4b5563; margin: 1rem 0 0.5rem; }
    p { margin: 0.5rem 0; }
    ul, ol { margin: 0.5rem 0 0.5rem 1.5rem; }
    li { margin: 0.25rem 0; }
    code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
    pre { background: #1f2937; color: #f9fafb; padding: 1rem; border-radius: 8px; overflow-x: auto; margin: 1rem 0; }
    pre code { background: none; padding: 0; color: inherit; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { border: 1px solid #e5e7eb; padding: 0.75rem; text-align: left; }
    th { background: #f9fafb; font-weight: 600; }
    blockquote { border-left: 4px solid #0891b2; padding-left: 1rem; margin: 1rem 0; color: #4b5563; font-style: italic; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 2rem 0; }
    .toc { background: #f9fafb; padding: 1.5rem; border-radius: 8px; margin: 2rem 0; }
    .toc h2 { margin-top: 0; border: none; }
    .toc ul { list-style: none; margin: 0; padding: 0; }
    .toc li { margin: 0.5rem 0; }
    .toc a { color: #0891b2; text-decoration: none; }
    .toc a:hover { text-decoration: underline; }
    .category-header { background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%); color: white; padding: 1.5rem; border-radius: 8px; margin: 3rem 0 1.5rem; }
    .category-header h2 { color: white; border: none; margin: 0; }
    .article { margin-bottom: 3rem; page-break-inside: avoid; }
    .article-meta { color: #6b7280; font-size: 0.875rem; margin-bottom: 1rem; }
    .footer { margin-top: 3rem; padding-top: 2rem; border-top: 2px solid #e5e7eb; color: #6b7280; text-align: center; }
    @media print {
      body { max-width: none; }
      .category-header { break-before: page; }
      .toc { break-after: page; }
    }
  </style>
</head>
<body>
  <header>
    <h1>Holistic SEO Topical Map Generator</h1>
    <p style="font-size: 1.25rem; color: #6b7280;">Complete Help Documentation</p>
    <p style="color: #9ca3af; font-size: 0.875rem;">Generated: ${now}</p>
  </header>

  <nav class="toc">
    <h2>Table of Contents</h2>
    <ul>
`;

  // Generate Table of Contents
  categories.forEach(category => {
    html += `      <li><strong>${category.name}</strong>
        <ul>
`;
    category.articles.forEach(article => {
      const anchor = `${category.slug}-${article.slug}`;
      html += `          <li><a href="#${anchor}">${article.title}</a></li>
`;
    });
    html += `        </ul>
      </li>
`;
  });

  html += `    </ul>
  </nav>

  <main>
`;

  // Generate content for each category and article
  categories.forEach(category => {
    html += `    <section>
      <div class="category-header">
        <h2>${category.name}</h2>
        ${category.description ? `<p>${category.description}</p>` : ''}
      </div>
`;

    category.articles.forEach(article => {
      const anchor = `${category.slug}-${article.slug}`;
      // Convert markdown to basic HTML (simplified)
      const contentHtml = article.content
        .replace(/^### (.*$)/gm, '<h4>$1</h4>')
        .replace(/^## (.*$)/gm, '<h3>$1</h3>')
        .replace(/^# (.*$)/gm, '<h3>$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/^- (.*$)/gm, '<li>$1</li>')
        .replace(/\n\n/g, '</p><p>');

      html += `      <article class="article" id="${anchor}">
        <h3>${article.title}</h3>
        <div class="article-meta">
          ${article.summary ? `<p>${article.summary}</p>` : ''}
        </div>
        <div class="article-content">
          ${contentHtml}
        </div>
      </article>
      <hr>
`;
    });

    html += `    </section>
`;
  });

  html += `  </main>

  <footer class="footer">
    <p>Holistic SEO Topical Map Generator - Help Documentation</p>
    <p>Generated on ${now}</p>
  </footer>
</body>
</html>`;

  return html;
};

/**
 * Download helper function
 */
const downloadAsFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Generate full help documentation as Markdown
 */
const generateFullHelpMarkdown = (categories: HelpCategoryWithArticles[]): string => {
  const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  let md = `# Holistic SEO Topical Map Generator\n\n`;
  md += `## Complete Help Documentation\n\n`;
  md += `*Generated: ${now}*\n\n`;
  md += `---\n\n`;

  // Table of Contents
  md += `## Table of Contents\n\n`;
  categories.forEach(category => {
    md += `### ${category.name}\n`;
    category.articles.forEach(article => {
      const anchor = `${category.slug}-${article.slug}`.replace(/[^a-z0-9-]/g, '-');
      md += `- [${article.title}](#${anchor})\n`;
    });
    md += `\n`;
  });

  md += `---\n\n`;

  // Content
  categories.forEach(category => {
    md += `# ${category.name}\n\n`;
    if (category.description) {
      md += `*${category.description}*\n\n`;
    }

    category.articles.forEach(article => {
      const anchor = `${category.slug}-${article.slug}`.replace(/[^a-z0-9-]/g, '-');
      md += `<a name="${anchor}"></a>\n\n`;
      md += `## ${article.title}\n\n`;
      if (article.summary) {
        md += `> ${article.summary}\n\n`;
      }
      md += `${article.content}\n\n`;
      md += `---\n\n`;
    });
  });

  md += `\n---\n\n`;
  md += `*Holistic SEO Topical Map Generator - Help Documentation*\n`;
  md += `*Generated on ${now}*\n`;

  return md;
};

/**
 * Open print dialog for all documentation (for PDF export)
 */
const openPrintAllDocumentation = (categories: HelpCategoryWithArticles[]) => {
  const html = generateFullHelpHTML(categories);

  // Create a blob URL for the HTML content
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  // Open in new window
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    // Wait for the window to load, then trigger print
    printWindow.onload = () => {
      // Give extra time for styles to apply
      setTimeout(() => {
        printWindow.print();
        // Clean up blob URL after printing (with delay to ensure print dialog has opened)
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 1000);
      }, 800);
    };
  } else {
    // Fallback: if popup was blocked, offer direct download
    URL.revokeObjectURL(url);
    downloadAsFile(html, 'holistic-seo-help-documentation-print.html', 'text/html');
    alert('Pop-up blocked. The HTML file has been downloaded instead. Open it in a browser and use Print > Save as PDF.');
  }
};

// =============================================================================
// EXPORT DROPDOWN
// =============================================================================

interface ExportDropdownProps {
  categories: HelpCategoryWithArticles[];
}

const ExportDropdown: React.FC<ExportDropdownProps> = ({ categories }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleExportMarkdown = () => {
    const md = generateFullHelpMarkdown(categories);
    downloadAsFile(md, 'holistic-seo-help-documentation.md', 'text/markdown');
    setIsOpen(false);
  };

  const handleExportHTML = () => {
    const html = generateFullHelpHTML(categories);
    downloadAsFile(html, 'holistic-seo-help-documentation.html', 'text/html');
    setIsOpen(false);
  };

  const handlePrintAllPDF = () => {
    openPrintAllDocumentation(categories);
    setIsOpen(false);
  };

  return (
    <div className="relative print:hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors text-sm"
        title="Export Documentation"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <span>Export All</span>
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          {/* Dropdown menu */}
          <div className="absolute right-0 top-full mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 overflow-hidden">
            <div className="p-2">
              <p className="text-xs text-gray-500 uppercase tracking-wide px-3 py-2">Download Complete Documentation</p>

              <button
                onClick={handleExportMarkdown}
                className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-300 hover:bg-gray-700 hover:text-white rounded-md transition-colors"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div>
                  <div className="font-medium">Markdown (.md)</div>
                  <div className="text-xs text-gray-500">Raw text with formatting</div>
                </div>
              </button>

              <button
                onClick={handleExportHTML}
                className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-300 hover:bg-gray-700 hover:text-white rounded-md transition-colors"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                <div>
                  <div className="font-medium">HTML (.html)</div>
                  <div className="text-xs text-gray-500">Styled web page format</div>
                </div>
              </button>

              <div className="border-t border-gray-700 my-2" />

              <button
                onClick={handlePrintAllPDF}
                className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-300 hover:bg-gray-700 hover:text-white rounded-md transition-colors"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <div>
                  <div className="font-medium">Print to PDF</div>
                  <div className="text-xs text-gray-500">All pages in one document</div>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

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
          <div className="flex items-center justify-between gap-4">
            <HelpBreadcrumbs
              category={currentCategory || undefined}
              article={currentArticle || undefined}
              onNavigate={onNavigate}
            />
            {/* Export Dropdown Menu */}
            <ExportDropdown categories={categories} />
          </div>
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
