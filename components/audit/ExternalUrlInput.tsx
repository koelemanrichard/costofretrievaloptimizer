import React, { useState, useCallback } from 'react';
import { Label } from '../ui/Label';

type Provider = 'jina' | 'firecrawl' | 'apify' | 'direct';

export interface ExternalUrlInputProps {
  onSubmit: (config: {
    url: string;
    provider: Provider;
    discoverRelated: boolean;
  }) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

const PROVIDER_OPTIONS: { value: Provider; label: string }[] = [
  { value: 'jina', label: 'Jina (Fast)' },
  { value: 'firecrawl', label: 'Firecrawl (Thorough)' },
  { value: 'apify', label: 'Apify (Full crawl)' },
  { value: 'direct', label: 'Direct (fetch)' },
];

const validateUrl = (input: string): boolean => {
  try {
    const parsed = new URL(input);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

export const ExternalUrlInput: React.FC<ExternalUrlInputProps> = ({
  onSubmit,
  isLoading = false,
  disabled = false,
}) => {
  const [url, setUrl] = useState('');
  const [provider, setProvider] = useState<Provider>('jina');
  const [discoverRelated, setDiscoverRelated] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUrl(value);
    if (urlError && (value === '' || validateUrl(value))) {
      setUrlError(null);
    }
  }, [urlError]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateUrl(url)) {
        setUrlError('Please enter a valid URL (http or https)');
        return;
      }

      setUrlError(null);
      onSubmit({ url, provider, discoverRelated });
    },
    [url, provider, discoverRelated, onSubmit],
  );

  const isDisabled = disabled || isLoading;
  const isSubmitDisabled = isDisabled || url.trim() === '' || !validateUrl(url);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* URL Input */}
      <div>
        <Label htmlFor="external-url-input">URL to Audit</Label>
        <input
          id="external-url-input"
          type="url"
          value={url}
          onChange={handleUrlChange}
          placeholder="https://example.com/page"
          disabled={isDisabled}
          className={`w-full rounded-md border bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 ${
            urlError
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-700 focus:border-blue-500 focus:ring-blue-500'
          } ${isDisabled ? 'cursor-not-allowed opacity-50' : ''}`}
        />
        {urlError && (
          <p className="mt-1 text-xs text-red-400" data-testid="url-error">
            {urlError}
          </p>
        )}
      </div>

      {/* Provider Selector */}
      <div>
        <Label htmlFor="provider-select">Scraping Provider</Label>
        <select
          id="provider-select"
          value={provider}
          onChange={(e) => setProvider(e.target.value as Provider)}
          disabled={isDisabled}
          className={`w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
            isDisabled ? 'cursor-not-allowed opacity-50' : ''
          }`}
        >
          {PROVIDER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Discover Related Checkbox */}
      <div className="flex items-start gap-2">
        <input
          id="discover-related"
          type="checkbox"
          checked={discoverRelated}
          onChange={(e) => setDiscoverRelated(e.target.checked)}
          disabled={isDisabled}
          className="mt-0.5 h-4 w-4 rounded border-gray-600 bg-gray-800 text-orange-500 focus:ring-orange-500"
        />
        <div>
          <label htmlFor="discover-related" className="text-sm text-gray-300">
            Discover related pages
          </label>
          <p className="text-xs text-gray-500">
            Also audit linked pages from the same domain
          </p>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitDisabled}
        className={`w-full rounded-md px-4 py-2 text-sm font-medium text-white transition-colors ${
          isSubmitDisabled
            ? 'cursor-not-allowed bg-orange-800 opacity-50'
            : 'bg-orange-600 hover:bg-orange-700'
        }`}
      >
        {isLoading ? (
          <span className="inline-flex items-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Running Audit...
          </span>
        ) : (
          'Run Audit'
        )}
      </button>
    </form>
  );
};
