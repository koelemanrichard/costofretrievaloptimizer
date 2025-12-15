/**
 * HelpBreadcrumbs.tsx
 *
 * Navigation breadcrumb trail for help documentation.
 */

import React from 'react';
import { HelpCategory, HelpArticle } from '../../types/help';

interface HelpBreadcrumbsProps {
  category?: HelpCategory;
  article?: Pick<HelpArticle, 'title' | 'slug'>;
  onNavigate: (categorySlug?: string, articleSlug?: string) => void;
}

export const HelpBreadcrumbs: React.FC<HelpBreadcrumbsProps> = ({
  category,
  article,
  onNavigate
}) => {
  return (
    <nav className="flex items-center gap-2 text-sm">
      {/* Home */}
      <button
        onClick={() => onNavigate()}
        className="text-gray-400 hover:text-white transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      </button>

      {category && (
        <>
          <Separator />
          <button
            onClick={() => onNavigate(category.slug)}
            className={`transition-colors ${
              article
                ? 'text-gray-400 hover:text-white'
                : 'text-white font-medium'
            }`}
          >
            {category.name}
          </button>
        </>
      )}

      {article && (
        <>
          <Separator />
          <span className="text-white font-medium truncate max-w-xs">
            {article.title}
          </span>
        </>
      )}
    </nav>
  );
};

const Separator: React.FC = () => (
  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

export default HelpBreadcrumbs;
