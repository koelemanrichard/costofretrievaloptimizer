/**
 * PlatformSelector Component
 *
 * Allows users to select which social media platforms to create posts for.
 * Includes platform icons, colors, and post count configuration.
 */

import React from 'react';
import type {
  SocialMediaPlatform,
  PlatformSelection,
  SocialTemplateType
} from '../../../types/social';
import { SOCIAL_PLATFORM_CONFIG } from '../../../types/social';

interface PlatformSelectorProps {
  selections: PlatformSelection[];
  onChange: (selections: PlatformSelection[]) => void;
  hubPlatform: SocialMediaPlatform;
  onHubPlatformChange: (platform: SocialMediaPlatform) => void;
  maxSpokePosts?: number;
}

const PLATFORM_ORDER: SocialMediaPlatform[] = [
  'linkedin',
  'twitter',
  'facebook',
  'instagram',
  'pinterest'
];

const PLATFORM_ICONS: Record<SocialMediaPlatform, React.ReactNode> = {
  linkedin: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  ),
  twitter: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
  facebook: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  ),
  instagram: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  ),
  pinterest: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.627 0-12 5.372-12 12 0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146 1.124.347 2.317.535 3.554.535 6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/>
    </svg>
  )
};

export const PlatformSelector: React.FC<PlatformSelectorProps> = ({
  selections,
  onChange,
  hubPlatform,
  onHubPlatformChange,
  maxSpokePosts = 7
}) => {
  const handleTogglePlatform = (platform: SocialMediaPlatform) => {
    const existing = selections.find(s => s.platform === platform);
    if (existing) {
      // Remove platform
      const updated = selections.filter(s => s.platform !== platform);
      onChange(updated);
      // If removing hub platform, set new hub
      if (platform === hubPlatform && updated.length > 0) {
        onHubPlatformChange(updated[0].platform);
      }
    } else {
      // Add platform with default settings
      const newSelection: PlatformSelection = {
        platform,
        enabled: true,
        template_type: 'hub_announcement',
        post_count: 1
      };
      onChange([...selections, newSelection]);
      // If first platform, set as hub
      if (selections.length === 0) {
        onHubPlatformChange(platform);
      }
    }
  };

  const handleSetAsHub = (platform: SocialMediaPlatform) => {
    onHubPlatformChange(platform);
  };

  const handlePostCountChange = (platform: SocialMediaPlatform, count: number) => {
    const updated = selections.map(s =>
      s.platform === platform
        ? { ...s, post_count: Math.max(1, Math.min(count, maxSpokePosts)) }
        : s
    );
    onChange(updated);
  };

  const enabledPlatforms = selections.filter(s => s.enabled);
  const totalPosts = enabledPlatforms.reduce((sum, s) => sum + s.post_count, 0);

  return (
    <div className="space-y-4">
      {/* Hub-Spoke Strategy Explainer */}
      <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-medium text-blue-300 mb-1">Hub & Spoke Strategy</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              <strong className="text-blue-400">Hub post:</strong> Your main announcement on your primary platform - typically the longest, most comprehensive version that links to your article.
              <br />
              <strong className="text-blue-400">Spoke posts:</strong> Supporting posts on other platforms that highlight specific aspects (key takeaways, stats, questions) and link back to the hub or article.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              This strategy maximizes reach while maintaining semantic consistency across platforms.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300">Select Platforms</h3>
        <span className="text-xs text-gray-500">
          {enabledPlatforms.length} platforms, {totalPosts} posts
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {PLATFORM_ORDER.map(platform => {
          const config = SOCIAL_PLATFORM_CONFIG[platform];
          const selection = selections.find(s => s.platform === platform);
          const isEnabled = !!selection;
          const isHub = platform === hubPlatform;

          return (
            <div
              key={platform}
              className={`relative rounded-lg border-2 transition-all ${
                isEnabled
                  ? isHub
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-600 bg-gray-800'
                  : 'border-gray-700 bg-gray-900 opacity-60'
              }`}
            >
              {/* Platform toggle button */}
              <button
                type="button"
                onClick={() => handleTogglePlatform(platform)}
                className="w-full p-3 flex items-center gap-3 text-left"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: isEnabled ? config.color : '#374151' }}
                >
                  <span className="text-white">{PLATFORM_ICONS[platform]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${isEnabled ? 'text-white' : 'text-gray-400'}`}>
                    {config.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {isHub ? 'Hub platform' : isEnabled ? 'Spoke platform' : 'Click to add'}
                  </p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  isEnabled ? 'border-green-500 bg-green-500' : 'border-gray-600'
                }`}>
                  {isEnabled && (
                    <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>

              {/* Platform options when enabled */}
              {isEnabled && (
                <div className="px-3 pb-3 pt-0 space-y-2 border-t border-gray-700 mt-2">
                  {/* Hub toggle */}
                  <button
                    type="button"
                    onClick={() => handleSetAsHub(platform)}
                    disabled={isHub}
                    title={isHub
                      ? 'This is your hub platform - the primary post that other posts link to'
                      : 'Make this your hub platform - best for your largest audience or where you want to drive discussion'
                    }
                    className={`w-full text-left text-xs px-2 py-1.5 rounded flex items-center gap-1.5 ${
                      isHub
                        ? 'bg-blue-600 text-white cursor-default'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3" />
                      {isHub && <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />}
                    </svg>
                    {isHub ? 'Hub Platform (Primary)' : 'Set as Hub'}
                  </button>

                  {/* Post count (only for non-hub platforms) */}
                  {!isHub && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-400 flex-1">Posts:</label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handlePostCountChange(platform, (selection?.post_count || 1) - 1)}
                          disabled={selection?.post_count === 1}
                          className="w-6 h-6 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50 flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className="w-6 text-center text-sm text-white">
                          {selection?.post_count || 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handlePostCountChange(platform, (selection?.post_count || 1) + 1)}
                          disabled={selection?.post_count === maxSpokePosts}
                          className="w-6 h-6 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50 flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Hub badge */}
              {isHub && (
                <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                  HUB
                </div>
              )}
            </div>
          );
        })}
      </div>

      {enabledPlatforms.length === 0 && (
        <p className="text-center text-gray-500 text-sm py-4">
          Select at least one platform to create social posts
        </p>
      )}
    </div>
  );
};

export default PlatformSelector;
