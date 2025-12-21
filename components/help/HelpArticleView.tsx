/**
 * HelpArticleView.tsx
 *
 * Renders help article content with markdown support and screenshots.
 */

import React from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { HelpArticleFull, HelpArticlePreview } from '../../types/help';
import { getScreenshotUrl } from '../../services/helpService';
import { SimpleMarkdown } from '../ui/SimpleMarkdown';

interface HelpArticleViewProps {
  article: HelpArticleFull;
  supabase: SupabaseClient;
  onNavigate: (categorySlug?: string, articleSlug?: string) => void;
}

/**
 * Print to PDF button handler
 */
const handlePrintToPDF = () => {
  // Open print dialog which allows saving as PDF
  window.print();
};

export const HelpArticleView: React.FC<HelpArticleViewProps> = ({
  article,
  supabase,
  onNavigate
}) => {
  // Process content to replace screenshot placeholders with actual URLs
  const processedContent = React.useMemo(() => {
    let content = article.content;

    // Replace screenshot placeholders with actual URLs
    // Format: ![alt text](screenshot:id) or ![alt text](storage:path)
    article.screenshots.forEach(screenshot => {
      const url = getScreenshotUrl(supabase, screenshot.storage_path, screenshot.storage_bucket);
      // Replace various placeholder formats
      content = content.replace(
        new RegExp(`\\!\\[([^\\]]*?)\\]\\(screenshot:${screenshot.id}\\)`, 'g'),
        `![${screenshot.alt_text}](${url})`
      );
      content = content.replace(
        new RegExp(`\\!\\[([^\\]]*?)\\]\\(storage:${screenshot.storage_path}\\)`, 'g'),
        `![${screenshot.alt_text}](${url})`
      );
    });

    return content;
  }, [article.content, article.screenshots, supabase]);

  return (
    <article className="help-article">
      {/* Article Header */}
      <header className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-3">{article.title}</h1>
            {article.summary && (
              <p className="text-lg text-gray-400">{article.summary}</p>
            )}
            {article.published_at && (
              <p className="text-sm text-gray-500 mt-2">
                Last updated: {new Date(article.published_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            )}
          </div>
          {/* Print to PDF Button */}
          <button
            onClick={handlePrintToPDF}
            className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg border border-gray-700 transition-colors print:hidden"
            title="Print to PDF"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span className="text-sm">Print to PDF</span>
          </button>
        </div>
      </header>

      {/* Article Content */}
      <div className="prose prose-lg max-w-none">
        <SimpleMarkdown content={processedContent} />
      </div>

      {/* Screenshots Gallery (if any not inline) */}
      {article.screenshots.length > 0 && (
        <ScreenshotsSection
          screenshots={article.screenshots}
          supabase={supabase}
        />
      )}

      {/* Related Articles */}
      {article.related_articles && article.related_articles.length > 0 && (
        <RelatedArticlesSection
          articles={article.related_articles}
          onNavigate={onNavigate}
        />
      )}

      {/* Feature Keys (for debugging/admin) */}
      {article.feature_keys.length > 0 && (
        <div className="mt-12 pt-6 border-t border-gray-700">
          <p className="text-xs text-gray-500">
            Feature keys: {article.feature_keys.join(', ')}
          </p>
        </div>
      )}
    </article>
  );
};

// =============================================================================
// SCREENSHOTS SECTION
// =============================================================================

interface ScreenshotsSectionProps {
  screenshots: HelpArticleFull['screenshots'];
  supabase: SupabaseClient;
}

const ScreenshotsSection: React.FC<ScreenshotsSectionProps> = ({ screenshots, supabase }) => {
  // Only show screenshots that have captions (indicating they should be displayed separately)
  const captionedScreenshots = screenshots.filter(s => s.caption);

  if (captionedScreenshots.length === 0) return null;

  return (
    <section className="mt-12 pt-8 border-t border-gray-700">
      <h2 className="text-xl font-semibold text-white mb-6">Screenshots</h2>
      <div className="grid gap-6">
        {captionedScreenshots.map(screenshot => {
          const url = getScreenshotUrl(supabase, screenshot.storage_path, screenshot.storage_bucket);
          return (
            <figure key={screenshot.id} className="bg-gray-800/50 rounded-xl overflow-hidden">
              <img
                src={url}
                alt={screenshot.alt_text}
                width={screenshot.width}
                height={screenshot.height}
                className="w-full"
                loading="lazy"
              />
              <figcaption className="p-4 text-center text-gray-400 text-sm">
                {screenshot.caption}
              </figcaption>
            </figure>
          );
        })}
      </div>
    </section>
  );
};

// =============================================================================
// RELATED ARTICLES SECTION
// =============================================================================

interface RelatedArticlesSectionProps {
  articles: HelpArticlePreview[];
  onNavigate: (categorySlug?: string, articleSlug?: string) => void;
}

const RelatedArticlesSection: React.FC<RelatedArticlesSectionProps> = ({ articles, onNavigate }) => {
  return (
    <section className="mt-12 pt-8 border-t border-gray-700">
      <h2 className="text-xl font-semibold text-white mb-4">Related Articles</h2>
      <div className="grid gap-3">
        {articles.map(article => (
          <button
            key={article.id}
            onClick={() => onNavigate(article.category_slug, article.article_slug)}
            className="flex items-start gap-3 p-4 bg-gray-800/50 hover:bg-gray-800 rounded-lg border border-gray-700 text-left transition-colors"
          >
            <svg className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div>
              <h3 className="text-white font-medium">{article.title}</h3>
              {article.summary && (
                <p className="text-gray-400 text-sm mt-1 line-clamp-2">{article.summary}</p>
              )}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

export default HelpArticleView;
