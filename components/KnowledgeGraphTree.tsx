/**
 * KnowledgeGraphTree Component
 *
 * Displays EAVs as a collapsible hierarchy tree:
 * Central Entity (root)
 *   └── Predicate/Attribute (branch)
 *       └── Value (leaf)
 *
 * Color-coded by category (ROOT=blue, UNIQUE=purple, RARE=orange, COMMON=gray)
 */

import React, { useState, useMemo } from 'react';
import { SemanticTriple, AttributeCategory } from '../types';
import { normalizeCategory } from '../utils/eavAnalytics';

interface KnowledgeGraphTreeProps {
  eavs: SemanticTriple[];
  centralEntity?: string;
  onSelectTriple?: (triple: SemanticTriple) => void;
}

// Category color scheme
const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  ROOT: { bg: 'bg-blue-900/30', text: 'text-blue-300', border: 'border-blue-700/50' },
  UNIQUE: { bg: 'bg-purple-900/30', text: 'text-purple-300', border: 'border-purple-700/50' },
  RARE: { bg: 'bg-orange-900/30', text: 'text-orange-300', border: 'border-orange-700/50' },
  COMMON: { bg: 'bg-gray-800/30', text: 'text-gray-300', border: 'border-gray-700/50' },
  UNCATEGORIZED: { bg: 'bg-gray-800/30', text: 'text-gray-400', border: 'border-gray-700/50' }
};

// Icons for tree nodes
const ChevronIcon: React.FC<{ isOpen: boolean; className?: string }> = ({ isOpen, className = '' }) => (
  <svg
    className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''} ${className}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const EntityIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg className={`w-4 h-4 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);

const AttributeIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg className={`w-4 h-4 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

const ValueIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg className={`w-4 h-4 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// Tree node for a value (leaf)
const ValueNode: React.FC<{
  triple: SemanticTriple;
  onSelect?: (triple: SemanticTriple) => void;
}> = ({ triple, onSelect }) => {
  const category = normalizeCategory(triple.predicate?.category);
  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.UNCATEGORIZED;

  return (
    <div
      className={`ml-8 pl-3 py-1.5 border-l-2 ${colors.border} cursor-pointer hover:bg-gray-700/30 rounded-r transition-colors`}
      onClick={() => onSelect?.(triple)}
    >
      <div className="flex items-center gap-2">
        <ValueIcon className={colors.text} />
        <span className={`text-sm font-medium ${colors.text}`}>
          {String(triple.object.value)}
        </span>
        {triple.object.unit && (
          <span className="text-xs text-gray-500">{triple.object.unit}</span>
        )}
        {triple.lexical?.synonyms && triple.lexical.synonyms.length > 0 && (
          <span className="text-xs text-gray-500 italic ml-1">
            (syn: {triple.lexical.synonyms.slice(0, 2).join(', ')})
          </span>
        )}
      </div>
    </div>
  );
};

// Tree node for an attribute/predicate (branch)
const AttributeNode: React.FC<{
  relation: string;
  category: AttributeCategory | 'UNCATEGORIZED';
  triples: SemanticTriple[];
  onSelectTriple?: (triple: SemanticTriple) => void;
  defaultOpen?: boolean;
}> = ({ relation, category, triples, onSelectTriple, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.UNCATEGORIZED;

  return (
    <div className="ml-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 w-full py-1.5 px-2 rounded ${colors.bg} hover:opacity-80 transition-opacity`}
      >
        <ChevronIcon isOpen={isOpen} className="text-gray-400" />
        <AttributeIcon className={colors.text} />
        <span className={`text-sm font-mono ${colors.text}`}>{relation}</span>
        <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>
          {category}
        </span>
        <span className="text-xs text-gray-500">({triples.length})</span>
      </button>

      {isOpen && (
        <div className="mt-1 space-y-1">
          {triples.map((triple, idx) => (
            <ValueNode key={idx} triple={triple} onSelect={onSelectTriple} />
          ))}
        </div>
      )}
    </div>
  );
};

// Tree node for a subject entity (root-level group)
const EntityNode: React.FC<{
  entityLabel: string;
  attributes: Map<string, { category: AttributeCategory | 'UNCATEGORIZED'; triples: SemanticTriple[] }>;
  onSelectTriple?: (triple: SemanticTriple) => void;
  defaultOpen?: boolean;
}> = ({ entityLabel, attributes, onSelectTriple, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const attributeCount = Array.from(attributes.values()).reduce((sum, attr) => sum + attr.triples.length, 0);

  return (
    <div className="border border-gray-700/50 rounded-lg overflow-hidden mb-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full py-2 px-3 bg-gray-800 hover:bg-gray-700/80 transition-colors"
      >
        <ChevronIcon isOpen={isOpen} className="text-gray-400" />
        <EntityIcon className="text-cyan-400" />
        <span className="text-sm font-semibold text-white">{entityLabel}</span>
        <span className="ml-auto text-xs text-gray-500">
          {attributes.size} attributes • {attributeCount} values
        </span>
      </button>

      {isOpen && (
        <div className="p-2 bg-gray-900/50 space-y-2">
          {Array.from(attributes.entries()).map(([relation, data]) => (
            <AttributeNode
              key={relation}
              relation={relation}
              category={data.category}
              triples={data.triples}
              onSelectTriple={onSelectTriple}
              defaultOpen={data.triples.length <= 3}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Main component
export const KnowledgeGraphTree: React.FC<KnowledgeGraphTreeProps> = ({
  eavs,
  centralEntity,
  onSelectTriple
}) => {
  // Group EAVs by subject, then by predicate
  const treeData = useMemo(() => {
    const entityMap = new Map<string, Map<string, { category: AttributeCategory | 'UNCATEGORIZED'; triples: SemanticTriple[] }>>();

    eavs.forEach(triple => {
      const subjectLabel = triple.subject?.label || 'Unknown Entity';
      const relation = triple.predicate?.relation || 'has_attribute';
      const category = normalizeCategory(triple.predicate?.category);

      if (!entityMap.has(subjectLabel)) {
        entityMap.set(subjectLabel, new Map());
      }

      const attributeMap = entityMap.get(subjectLabel)!;
      if (!attributeMap.has(relation)) {
        attributeMap.set(relation, { category, triples: [] });
      }

      attributeMap.get(relation)!.triples.push(triple);
    });

    return entityMap;
  }, [eavs]);

  // Sort entities: central entity first, then alphabetically
  const sortedEntities = useMemo(() => {
    const entries = Array.from(treeData.entries());
    return entries.sort(([a], [b]) => {
      if (centralEntity) {
        if (a.toLowerCase() === centralEntity.toLowerCase()) return -1;
        if (b.toLowerCase() === centralEntity.toLowerCase()) return 1;
      }
      return a.localeCompare(b);
    });
  }, [treeData, centralEntity]);

  if (eavs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <EntityIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No semantic triples to display</p>
        <p className="text-xs mt-1">Add EAVs to see the knowledge graph tree</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-4 p-2 bg-gray-800/50 rounded-lg">
        <span className="text-xs text-gray-400 mr-2">Categories:</span>
        {Object.entries(CATEGORY_COLORS).map(([category, colors]) => (
          category !== 'UNCATEGORIZED' && (
            <span
              key={category}
              className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}
            >
              {category}
            </span>
          )
        ))}
      </div>

      {/* Tree */}
      <div className="max-h-[500px] overflow-y-auto pr-2">
        {sortedEntities.map(([entityLabel, attributes]) => (
          <EntityNode
            key={entityLabel}
            entityLabel={entityLabel}
            attributes={attributes}
            onSelectTriple={onSelectTriple}
            defaultOpen={entityLabel.toLowerCase() === centralEntity?.toLowerCase()}
          />
        ))}
      </div>

      {/* Stats */}
      <div className="text-xs text-gray-500 pt-2 border-t border-gray-700/50">
        {sortedEntities.length} entities • {eavs.length} total triples
      </div>
    </div>
  );
};

export default KnowledgeGraphTree;
