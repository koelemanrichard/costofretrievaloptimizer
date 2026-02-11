/**
 * CategoryTree - Collapsible tree showing catalog category hierarchy
 *
 * Left panel of the catalog manager. Shows categories in a tree structure
 * with product count badges, link status icons, and add/select actions.
 */

import React, { useState, useCallback } from 'react';
import type { CatalogCategory } from '../../types/catalog';
import type { EnrichedTopic } from '../../types';

interface CategoryTreeProps {
  categories: CatalogCategory[];
  selectedCategoryId: string | null;
  topics?: EnrichedTopic[];
  onSelectCategory: (categoryId: string | null) => void;
  onAddCategory: (parentId?: string) => void;
  onDeleteCategory: (categoryId: string) => void;
  onLinkClick?: (categoryId: string, event: React.MouseEvent) => void;
}

interface TreeNodeProps {
  category: CatalogCategory;
  children: CatalogCategory[];
  allCategories: CatalogCategory[];
  selectedId: string | null;
  depth: number;
  topics?: EnrichedTopic[];
  onSelect: (id: string) => void;
  onAdd: (parentId: string) => void;
  onDelete: (id: string) => void;
  onLinkClick?: (categoryId: string, event: React.MouseEvent) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  category,
  children,
  allCategories,
  selectedId,
  depth,
  topics,
  onSelect,
  onAdd,
  onDelete,
  onLinkClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = children.length > 0;
  const isSelected = selectedId === category.id;

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-1.5 px-2 rounded cursor-pointer text-sm transition-colors ${
          isSelected
            ? 'bg-blue-900/40 text-blue-300'
            : 'hover:bg-gray-800/50 text-gray-300'
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelect(category.id)}
      >
        {/* Expand/collapse toggle */}
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-300"
          >
            <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <span className="w-4" />
        )}

        {/* Category name */}
        <span className="flex-1 truncate">{category.name}</span>

        {/* Product count badge */}
        <span className="text-xs text-gray-500 tabular-nums">
          {category.product_count}
        </span>

        {/* Link status icon */}
        {(() => {
          const linkedTopic = category.linked_topic_id && topics
            ? topics.find(t => t.id === category.linked_topic_id)
            : null;
          const linkTitle = linkedTopic
            ? `Linked to: ${linkedTopic.title} — click to change`
            : 'Not linked — click to link';
          return (
            <button
              onClick={(e) => { e.stopPropagation(); onLinkClick?.(category.id, e); }}
              className={`w-3 h-3 flex-shrink-0 ${category.linked_topic_id ? 'text-green-500 hover:text-green-400' : 'text-gray-600 hover:text-gray-400'}`}
              title={linkTitle}
            >
              <svg fill="currentColor" viewBox="0 0 20 20"><path d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z"/></svg>
            </button>
          );
        })()}

        {/* Add subcategory button */}
        <button
          onClick={(e) => { e.stopPropagation(); onAdd(category.id); }}
          className="opacity-0 group-hover:opacity-100 w-4 h-4 text-gray-500 hover:text-blue-400"
          title="Add subcategory"
        >
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {children.map(child => (
            <TreeNode
              key={child.id}
              category={child}
              children={allCategories.filter(c => c.parent_category_id === child.id)}
              allCategories={allCategories}
              selectedId={selectedId}
              depth={depth + 1}
              topics={topics}
              onSelect={onSelect}
              onAdd={onAdd}
              onDelete={onDelete}
              onLinkClick={onLinkClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const CategoryTree: React.FC<CategoryTreeProps> = ({
  categories,
  selectedCategoryId,
  topics,
  onSelectCategory,
  onAddCategory,
  onDeleteCategory,
  onLinkClick,
}) => {
  const rootCategories = categories.filter(c => !c.parent_category_id && c.status === 'active');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <h3 className="text-sm font-medium text-gray-300">Categories</h3>
        <button
          onClick={() => onAddCategory()}
          className="text-xs text-blue-400 hover:text-blue-300"
        >
          + Add
        </button>
      </div>

      {/* "All Products" option */}
      <div
        className={`flex items-center gap-2 py-1.5 px-3 cursor-pointer text-sm transition-colors ${
          selectedCategoryId === null
            ? 'bg-blue-900/40 text-blue-300'
            : 'hover:bg-gray-800/50 text-gray-400'
        }`}
        onClick={() => onSelectCategory(null)}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
        <span>All Products</span>
      </div>

      {/* Category tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {rootCategories.length === 0 ? (
          <div className="px-3 py-4 text-center text-gray-500 text-xs">
            No categories yet.
            <br />
            Click "+ Add" or import a CSV.
          </div>
        ) : (
          rootCategories.map(cat => (
            <TreeNode
              key={cat.id}
              category={cat}
              children={categories.filter(c => c.parent_category_id === cat.id)}
              allCategories={categories}
              selectedId={selectedCategoryId}
              depth={0}
              topics={topics}
              onSelect={onSelectCategory}
              onAdd={onAddCategory}
              onDelete={onDeleteCategory}
              onLinkClick={onLinkClick}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default CategoryTree;
