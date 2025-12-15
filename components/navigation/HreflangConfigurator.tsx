// components/navigation/HreflangConfigurator.tsx
// Multilingual/Hreflang Configuration UI

import React, { useState, useMemo } from 'react';
import {
  HreflangConfig,
  HreflangEntry,
  validateHreflangConfig,
  generateHreflangTags,
  formatHreflang,
  formatEntryDisplay,
  getLanguageName,
  getRegionName,
  COMMON_LANGUAGES,
  COMMON_REGIONS,
  createDefaultHreflangConfig,
} from '../../services/hreflangService';

interface HreflangConfiguratorProps {
  config: HreflangConfig;
  onConfigChange: (config: HreflangConfig) => void;
  baseUrl?: string;
}

const HreflangConfigurator: React.FC<HreflangConfiguratorProps> = ({
  config,
  onConfigChange,
  baseUrl = 'https://example.com',
}) => {
  const [activeTab, setActiveTab] = useState<'entries' | 'preview' | 'validation'>('entries');
  const [newEntry, setNewEntry] = useState<Partial<HreflangEntry>>({
    language: 'en',
    region: '',
    url: '',
    isDefault: false,
  });
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  // Validate configuration
  const validation = useMemo(() => {
    return validateHreflangConfig(config);
  }, [config]);

  // Generate output tags
  const generatedTags = useMemo(() => {
    return generateHreflangTags(config);
  }, [config]);

  const handleAddEntry = () => {
    if (!newEntry.language || !newEntry.url) return;

    const entry: HreflangEntry = {
      language: newEntry.language.toLowerCase(),
      url: newEntry.url,
      region: newEntry.region?.toUpperCase() || undefined,
      isDefault: newEntry.isDefault,
    };

    onConfigChange({
      ...config,
      entries: [...config.entries, entry],
    });

    // Reset form
    setNewEntry({
      language: 'en',
      region: '',
      url: '',
      isDefault: false,
    });
  };

  const handleRemoveEntry = (index: number) => {
    const newEntries = [...config.entries];
    newEntries.splice(index, 1);
    onConfigChange({ ...config, entries: newEntries });
  };

  const handleToggleEnabled = () => {
    onConfigChange({ ...config, enabled: !config.enabled });
  };

  const handleCopy = async (content: string, format: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedFormat(format);
      setTimeout(() => setCopiedFormat(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="bg-gray-900 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Hreflang Configuration</h3>
          <p className="text-sm text-gray-400 mt-1">
            Configure language/region versions for international SEO
          </p>
        </div>

        {/* Enable toggle */}
        <button
          onClick={handleToggleEnabled}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            config.enabled
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {config.enabled ? '✓ Enabled' : 'Disabled'}
        </button>
      </div>

      {/* Validation score */}
      <div className="flex items-center gap-4 mb-6 p-4 bg-gray-800 rounded-lg">
        <div className={`text-3xl font-bold ${
          validation.score >= 80 ? 'text-green-400' :
          validation.score >= 50 ? 'text-yellow-400' : 'text-red-400'
        }`}>
          {validation.score}%
        </div>
        <div className="flex-1">
          <div className="text-sm text-white">Validation Score</div>
          <div className="text-xs text-gray-400">
            {validation.isValid ? 'Configuration is valid' : 'Issues detected'}
          </div>
        </div>
        <div className="flex gap-2">
          <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">
            {config.entries.length} languages
          </span>
          {config.entries.some(e => e.isDefault) && (
            <span className="px-2 py-1 bg-blue-900/50 border border-blue-700 rounded text-xs text-blue-400">
              x-default set
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-gray-700 pb-2">
        {(['entries', 'preview', 'validation'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-t-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {tab === 'entries' && 'Language Entries'}
            {tab === 'preview' && 'Code Preview'}
            {tab === 'validation' && `Validation ${!validation.isValid ? '⚠️' : ''}`}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[400px]">
        {/* Entries tab */}
        {activeTab === 'entries' && (
          <div className="space-y-4">
            {/* Add new entry form */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="text-sm font-medium text-white mb-3">Add Language Version</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Language*</label>
                  <select
                    value={newEntry.language}
                    onChange={(e) => setNewEntry({ ...newEntry, language: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                  >
                    {Object.entries(COMMON_LANGUAGES).map(([code, name]) => (
                      <option key={code} value={code}>{name} ({code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Region (optional)</label>
                  <select
                    value={newEntry.region}
                    onChange={(e) => setNewEntry({ ...newEntry, region: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                  >
                    <option value="">No region</option>
                    {Object.entries(COMMON_REGIONS).map(([code, name]) => (
                      <option key={code} value={code}>{name} ({code})</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-400 mb-1">URL*</label>
                  <input
                    type="url"
                    value={newEntry.url}
                    onChange={(e) => setNewEntry({ ...newEntry, url: e.target.value })}
                    placeholder={`${baseUrl}/page`}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={newEntry.isDefault}
                    onChange={(e) => setNewEntry({ ...newEntry, isDefault: e.target.checked })}
                    className="rounded bg-gray-700 border-gray-600 text-blue-500"
                  />
                  Set as x-default (fallback)
                </label>
                <button
                  onClick={handleAddEntry}
                  disabled={!newEntry.language || !newEntry.url}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-sm text-white"
                >
                  Add Entry
                </button>
              </div>
            </div>

            {/* Entries list */}
            <div className="space-y-2">
              {config.entries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No language versions configured. Add your first entry above.
                </div>
              ) : (
                config.entries.map((entry, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{entry.isDefault ? '🌐' : '🔤'}</span>
                      <div>
                        <div className="text-white font-medium">
                          {formatEntryDisplay(entry)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {entry.url}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300 font-mono">
                        {formatHreflang(entry)}
                      </span>
                      <button
                        onClick={() => handleRemoveEntry(idx)}
                        className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Preview tab */}
        {activeTab === 'preview' && (
          <div className="space-y-4">
            {/* HTML output */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-white">HTML Link Tags</h4>
                <button
                  onClick={() => handleCopy(generatedTags.htmlTags, 'html')}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300"
                >
                  {copiedFormat === 'html' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap overflow-x-auto max-h-[150px] overflow-y-auto bg-gray-900 p-3 rounded">
                {generatedTags.htmlTags || '<!-- No entries configured -->'}
              </pre>
            </div>

            {/* HTTP Headers output */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-white">HTTP Link Headers</h4>
                <button
                  onClick={() => handleCopy(generatedTags.httpHeaders, 'headers')}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300"
                >
                  {copiedFormat === 'headers' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap overflow-x-auto max-h-[100px] overflow-y-auto bg-gray-900 p-3 rounded">
                {generatedTags.httpHeaders || '<!-- No entries configured -->'}
              </pre>
            </div>

            {/* Sitemap XML output */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-white">Sitemap XML (per URL)</h4>
                <button
                  onClick={() => handleCopy(generatedTags.sitemapXml, 'sitemap')}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300"
                >
                  {copiedFormat === 'sitemap' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap overflow-x-auto max-h-[150px] overflow-y-auto bg-gray-900 p-3 rounded">
                {generatedTags.sitemapXml || '<!-- No entries configured -->'}
              </pre>
            </div>
          </div>
        )}

        {/* Validation tab */}
        {activeTab === 'validation' && (
          <div className="space-y-4">
            {/* Format issues */}
            {validation.formatIssues.length > 0 && (
              <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-red-400 mb-2">Format Errors</h4>
                <ul className="space-y-1">
                  {validation.formatIssues.map((issue, idx) => (
                    <li key={idx} className="text-xs text-red-300 flex items-start gap-2">
                      <span className="text-red-500">✗</span>
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Duplicate issues */}
            {validation.duplicateIssues.length > 0 && (
              <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-yellow-400 mb-2">Duplicate Warnings</h4>
                <ul className="space-y-1">
                  {validation.duplicateIssues.map((issue, idx) => (
                    <li key={idx} className="text-xs text-yellow-300 flex items-start gap-2">
                      <span className="text-yellow-500">⚠</span>
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggestions */}
            {validation.suggestions.length > 0 && (
              <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-400 mb-2">Suggestions</h4>
                <ul className="space-y-1">
                  {validation.suggestions.map((suggestion, idx) => (
                    <li key={idx} className="text-xs text-blue-300 flex items-start gap-2">
                      <span className="text-blue-500">💡</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* All good message */}
            {validation.isValid && validation.suggestions.length === 0 && (
              <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4 text-center">
                <span className="text-4xl">✓</span>
                <p className="text-green-400 mt-2">Hreflang configuration is valid!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Help section */}
      <div className="mt-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
        <h4 className="text-sm font-medium text-white mb-2">About Hreflang</h4>
        <p className="text-xs text-gray-400">
          Hreflang tags tell search engines which language and region a page is intended for.
          This prevents duplicate content issues and ensures users see the right version.
          Each page should link to all its language variants, including itself (<strong>symmetry requirement</strong>).
        </p>
      </div>
    </div>
  );
};

export default HreflangConfigurator;
