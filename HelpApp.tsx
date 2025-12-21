/**
 * HelpApp.tsx
 *
 * Entry point for the help documentation window.
 * This runs in a separate browser tab/window from the main application.
 */

import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { HelpWindow } from './components/help/HelpWindow';
import { HelpNavigationState } from './types/help';

// =============================================================================
// SUPABASE INITIALIZATION
// =============================================================================

// Try to get Supabase credentials from various sources
function getSupabaseCredentials(): { url: string; key: string } | null {
  // Try Vite environment variables first (from .env.local)
  const viteUrl = import.meta.env.VITE_SUPABASE_URL;
  const viteKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (viteUrl && viteKey) {
    return { url: viteUrl, key: viteKey };
  }

  // Try localStorage (shared from main app)
  const storedUrl = localStorage.getItem('supabaseUrl');
  const storedKey = localStorage.getItem('supabaseAnonKey');

  if (storedUrl && storedKey) {
    return { url: storedUrl, key: storedKey };
  }

  // Fallback to hardcoded defaults (update these if env vars aren't available)
  const defaultUrl = 'https://shtqshmmsrmtquuhyupl.supabase.co';
  const defaultKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  if (defaultUrl && defaultKey) {
    return { url: defaultUrl, key: defaultKey };
  }

  return null;
}

// =============================================================================
// URL HASH NAVIGATION
// =============================================================================

function parseHashNavigation(): HelpNavigationState {
  const hash = window.location.hash.slice(1); // Remove leading #

  if (!hash || hash === '/') {
    return {};
  }

  // Parse format: #/category-slug or #/category-slug/article-slug
  const parts = hash.split('/').filter(Boolean);

  if (parts.length === 1) {
    return { categorySlug: parts[0] };
  }

  if (parts.length >= 2) {
    return {
      categorySlug: parts[0],
      articleSlug: parts[1]
    };
  }

  return {};
}

function buildHashUrl(categorySlug?: string, articleSlug?: string): string {
  if (!categorySlug) return '#/';
  if (!articleSlug) return `#/${categorySlug}`;
  return `#/${categorySlug}/${articleSlug}`;
}

// =============================================================================
// HELP APP ROOT COMPONENT
// =============================================================================

const HelpAppRoot: React.FC = () => {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [navigation, setNavigation] = useState<HelpNavigationState>(parseHashNavigation);
  const [error, setError] = useState<string | null>(null);

  // Initialize Supabase client
  useEffect(() => {
    const credentials = getSupabaseCredentials();
    if (credentials) {
      try {
        const client = createClient(credentials.url, credentials.key);
        setSupabase(client);
      } catch (err) {
        setError('Failed to initialize database connection');
        console.error('Supabase init error:', err);
      }
    } else {
      setError('Database credentials not found. Please configure Supabase in the main application first.');
    }
  }, []);

  // Handle hash change navigation
  useEffect(() => {
    const handleHashChange = () => {
      setNavigation(parseHashNavigation());
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Navigation handler
  const navigate = useCallback((categorySlug?: string, articleSlug?: string) => {
    const newHash = buildHashUrl(categorySlug, articleSlug);
    window.location.hash = newHash;
  }, []);

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-8 max-w-lg text-center">
          <svg className="w-16 h-16 text-red-400 mx-auto mb-4\" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-semibold text-white mb-2">Connection Error</h2>
          <p className="text-gray-300 mb-4">{error}</p>
          <button
            onClick={() => window.close()}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Close Window
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (!supabase) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading help documentation...</p>
        </div>
      </div>
    );
  }

  return (
    <HelpWindow
      supabase={supabase}
      navigation={navigation}
      onNavigate={navigate}
    />
  );
};

// =============================================================================
// MOUNT APPLICATION
// =============================================================================

const rootElement = document.getElementById('help-root');
if (!rootElement) {
  throw new Error("Could not find help-root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <HelpAppRoot />
  </React.StrictMode>
);
