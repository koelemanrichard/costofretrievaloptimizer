// components/toc/TOCGenerator.tsx
// Table of Contents Generator UI Component

import React, { useState, useMemo } from 'react';
import { ContentBrief } from '../../types';
import {
  generateTOCFromBrief,
  generateTOCFromMarkdown,
  generateTOCSchema,
  GeneratedTOC,
  TOCEntry,
} from '../../services/tocService';

interface TOCGeneratorProps {
  brief?: ContentBrief;
  markdown?: string;
  baseUrl?: string;
  onCopy?: (format: 'html' | 'markdown' | 'schema') => void;
}

const TOCGenerator: React.FC<TOCGeneratorProps> = ({
  brief,
  markdown,
  baseUrl = 'https://example.com/page',
  onCopy,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'html' | 'markdown' | 'schema'>('preview');
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  // Generate TOC from brief or markdown
  const toc: GeneratedTOC | null = useMemo(() => {
    if (brief) {
      return generateTOCFromBrief(brief);
    }
    if (markdown) {
      return generateTOCFromMarkdown(markdown);
    }
    return null;
  }, [brief, markdown]);

  // Generate schema output
  const schemaOutput = useMemo(() => {
    if (!toc || toc.entries.length === 0) return '';
    const schema = generateTOCSchema(toc.entries, baseUrl);
    return JSON.stringify(schema, null, 2);
  }, [toc, baseUrl]);

  const handleCopy = async (format: 'html' | 'markdown' | 'schema') => {
    if (!toc) return;

    let content = '';
    switch (format) {
      case 'html':
        content = toc.htmlOutput;
        break;
      case 'markdown':
        content = toc.markdownOutput;
        break;
      case 'schema':
        content = schemaOutput;
        break;
    }

    try {
      await navigator.clipboard.writeText(content);
      setCopiedFormat(format);
      setTimeout(() => setCopiedFormat(null), 2000);
      onCopy?.(format);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Render TOC tree recursively
  const renderTOCTree = (entries: TOCEntry[], depth: number = 0) => {
    return (
      <ul className={`${depth === 0 ? '' : 'ml-4 mt-1'} space-y-1`}>
        {entries.map((entry) => (
          <li key={entry.id}>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-xs">
                H{entry.level}
              </span>
              <a
                href={`#${entry.slug}`}
                className="text-blue-400 hover:text-blue-300 hover:underline"
                onClick={(e) => e.preventDefault()}
              >
                {entry.heading}
              </a>
              <span className="text-gray-600 text-xs font-mono">
                #{entry.slug}
              </span>
            </div>
            {entry.children.length > 0 && renderTOCTree(entry.children, depth + 1)}
          </li>
        ))}
      </ul>
    );
  };

  if (!toc) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 text-center text-gray-500">
        <div className="text-4xl mb-4">📋</div>
        <p>No content available to generate TOC.</p>
        <p className="text-sm mt-2">Provide a content brief or markdown to generate a table of contents.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Table of Contents</h3>
          <p className="text-sm text-gray-400 mt-1">
            {toc.totalHeadings} headings across {toc.maxDepth} levels
          </p>
        </div>

        {/* Quick stats */}
        <div className="flex gap-2">
          <span className="px-3 py-1.5 bg-gray-800 rounded-lg text-xs text-gray-300">
            {toc.totalHeadings} headings
          </span>
          <span className="px-3 py-1.5 bg-gray-800 rounded-lg text-xs text-gray-300">
            {toc.maxDepth} levels deep
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-gray-700 pb-2">
        {(['preview', 'html', 'markdown', 'schema'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-t-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {tab === 'preview' && 'Preview'}
            {tab === 'html' && 'HTML'}
            {tab === 'markdown' && 'Markdown'}
            {tab === 'schema' && 'Schema.org'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-gray-800 rounded-lg p-4 min-h-[300px] max-h-[500px] overflow-y-auto">
        {activeTab === 'preview' && (
          <div className="text-sm">
            {toc.entries.length > 0 ? (
              renderTOCTree(toc.entries)
            ) : (
              <p className="text-gray-500">No headings found.</p>
            )}
          </div>
        )}

        {activeTab === 'html' && (
          <div className="relative">
            <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap overflow-x-auto">
              {toc.htmlOutput || '<p>No HTML output</p>'}
            </pre>
            <button
              onClick={() => handleCopy('html')}
              className="absolute top-2 right-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300"
            >
              {copiedFormat === 'html' ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        )}

        {activeTab === 'markdown' && (
          <div className="relative">
            <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap overflow-x-auto">
              {toc.markdownOutput || '<!-- No markdown output -->'}
            </pre>
            <button
              onClick={() => handleCopy('markdown')}
              className="absolute top-2 right-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300"
            >
              {copiedFormat === 'markdown' ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        )}

        {activeTab === 'schema' && (
          <div className="relative">
            <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap overflow-x-auto">
              {schemaOutput || '{}'}
            </pre>
            <button
              onClick={() => handleCopy('schema')}
              className="absolute top-2 right-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300"
            >
              {copiedFormat === 'schema' ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        )}
      </div>

      {/* Passage hints */}
      {toc.passageHints.length > 0 && (
        <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
          <h4 className="text-sm font-medium text-yellow-400 mb-2">
            Featured Snippet Opportunities
          </h4>
          <ul className="space-y-1">
            {toc.passageHints.map((hint, idx) => (
              <li key={idx} className="text-xs text-yellow-300/80 flex items-start gap-2">
                <span className="text-yellow-500">💡</span>
                <span>{hint}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Usage instructions */}
      <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
        <h4 className="text-sm font-medium text-white mb-2">Implementation</h4>
        <p className="text-xs text-gray-400">
          Add ID attributes matching the slugs to your headings (e.g., <code className="bg-gray-700 px-1 rounded">&lt;h2 id="introduction"&gt;</code>).
          The TOC links will then enable smooth in-page navigation and may enhance passage indexing.
        </p>
      </div>
    </div>
  );
};

export default TOCGenerator;
