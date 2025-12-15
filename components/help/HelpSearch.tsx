/**
 * HelpSearch.tsx
 *
 * Search input with dropdown results for help documentation.
 */

import React, { useState, useRef, useEffect } from 'react';
import { HelpSearchResult } from '../../types/help';

interface HelpSearchProps {
  query: string;
  results: HelpSearchResult[];
  isSearching: boolean;
  onSearch: (query: string) => void;
  onResultClick: (result: HelpSearchResult) => void;
}

export const HelpSearch: React.FC<HelpSearchProps> = ({
  query,
  results,
  isSearching,
  onSearch,
  onResultClick
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [localQuery, setLocalQuery] = useState(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external query changes
  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  // Handle input change with debounce
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalQuery(value);

    // Debounce search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      onSearch(value);
    }, 300);
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  // Clear search
  const handleClear = () => {
    setLocalQuery('');
    onSearch('');
    inputRef.current?.focus();
  };

  const showDropdown = isFocused && (results.length > 0 || (localQuery.trim() && !isSearching));

  return (
    <div ref={containerRef} className="relative">
      {/* Search Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={localQuery}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search help..."
          className="w-full pl-10 pr-10 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
        />

        {/* Search Icon */}
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>

        {/* Loading/Clear Button */}
        {localQuery && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
          >
            {isSearching ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-50 max-h-80 overflow-y-auto">
          {results.length > 0 ? (
            <ul>
              {results.map(result => (
                <li key={result.id}>
                  <button
                    onClick={() => {
                      onResultClick(result);
                      setIsFocused(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-gray-700/50 transition-colors border-b border-gray-700/50 last:border-b-0"
                  >
                    <div className="flex items-start gap-3">
                      <svg className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{result.title}</p>
                        {result.summary && (
                          <p className="text-gray-400 text-sm truncate">{result.summary}</p>
                        )}
                        <p className="text-gray-500 text-xs mt-1">
                          in {result.category_slug.replace(/-/g, ' ')}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-8 text-center">
              <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-400">No results found for "{localQuery}"</p>
              <p className="text-gray-500 text-sm mt-1">Try different keywords</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HelpSearch;
