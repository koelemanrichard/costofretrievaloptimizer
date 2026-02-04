/**
 * useBrandExtraction Hook
 *
 * Orchestrates the full brand extraction flow from URL discovery
 * through component extraction using server-side edge functions.
 *
 * Uses Apify via edge functions to avoid CORS issues:
 * - brand-url-discovery: Discovers URLs from a domain
 * - brand-extract-pages: Extracts design data from multiple pages
 */

import { useState, useCallback } from 'react';
import type { UrlSuggestion } from '../services/brand-extraction/UrlDiscoveryService';
import { ExtractionAnalyzer } from '../services/brand-extraction/ExtractionAnalyzer';
import { ComponentLibrary } from '../services/brand-extraction/ComponentLibrary';
import type { ExtractedComponent, ExtractedTokens } from '../types/brandExtraction';
import { useSupabase } from '../services/supabaseClient';

// ============================================================================
// TYPES
// ============================================================================

export type ExtractionPhase =
  | 'idle'
  | 'discovering'
  | 'selecting'
  | 'extracting'
  | 'analyzing'
  | 'complete'
  | 'error';

export interface ExtractionProgress {
  phase: ExtractionPhase;
  currentUrl?: string;
  completedUrls: number;
  totalUrls: number;
  message: string;
}

export interface UseBrandExtractionResult {
  // State
  phase: ExtractionPhase;
  progress: ExtractionProgress;
  suggestions: UrlSuggestion[];
  selectedUrls: string[];
  extractedComponents: ExtractedComponent[];
  extractedTokens: Omit<ExtractedTokens, 'id' | 'projectId' | 'extractedAt'> | null;
  screenshotBase64: string | null;
  error: string | null;
  hasStoredExtractions: boolean;

  // Actions
  discoverUrls: (domain: string) => Promise<void>;
  toggleUrlSelection: (url: string) => void;
  selectAllUrls: () => void;
  clearSelection: () => void;
  startExtraction: () => Promise<void>;
  reanalyze: () => Promise<void>;
  checkStoredExtractions: () => Promise<boolean>;
  loadSavedSuggestions: () => Promise<boolean>;
  reset: () => void;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialProgress: ExtractionProgress = {
  phase: 'idle',
  completedUrls: 0,
  totalUrls: 0,
  message: 'Ready to start'
};

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useBrandExtraction(
  projectId: string,
  aiProvider: 'gemini' | 'anthropic',
  apiKey: string,
  apifyToken?: string
): UseBrandExtractionResult {
  // State
  const [phase, setPhase] = useState<ExtractionPhase>('idle');
  const [progress, setProgress] = useState<ExtractionProgress>(initialProgress);
  const [suggestions, setSuggestions] = useState<UrlSuggestion[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
  const [extractedComponents, setExtractedComponents] = useState<ExtractedComponent[]>([]);
  const [extractedTokens, setExtractedTokens] = useState<Omit<ExtractedTokens, 'id' | 'projectId' | 'extractedAt'> | null>(null);
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasStoredExtractions, setHasStoredExtractions] = useState<boolean>(false);

  /**
   * Discover URLs from a domain using server-side edge function
   * Auto-selects top 5 suggestions after discovery
   */
  const discoverUrls = useCallback(async (domain: string) => {
    setPhase('discovering');
    setError(null);
    setProgress({
      phase: 'discovering',
      completedUrls: 0,
      totalUrls: 0,
      message: `Discovering pages on ${domain}...`
    });

    try {
      if (!apifyToken) {
        throw new Error('Apify token is required for URL discovery');
      }

      // Call edge function for URL discovery (avoids CORS)
      const { data, error: fnError } = await useSupabase().functions.invoke('brand-url-discovery', {
        body: { domain, apifyToken }
      });

      if (fnError) {
        throw new Error(fnError.message || 'URL discovery failed');
      }

      if (!data?.ok) {
        throw new Error(data?.error || 'URL discovery returned no results');
      }

      const discovered: UrlSuggestion[] = (data.urls || []).filter(
        (s: UrlSuggestion) => !s.url.includes('@')
      );

      setSuggestions(discovered);

      // Auto-select top 5 suggestions
      const topUrls = discovered.slice(0, 5).map(s => s.url);
      setSelectedUrls(topUrls);

      // Persist discovered suggestions to database (best-effort)
      try {
        const supabase = useSupabase();
        // Delete old suggestions for this project first
        await supabase.from('brand_url_suggestions').delete().eq('project_id', projectId);
        // Insert new ones
        if (discovered.length > 0) {
          const rows = discovered.map(s => ({
            project_id: projectId,
            suggested_url: s.url,
            page_type: s.pageType,
            discovered_from: s.discoveredFrom,
            prominence_score: Math.round(s.prominenceScore) / 100, // 0-100 → 0.00-1.00
            visual_context: s.visualContext || null,
            selected: topUrls.includes(s.url),
            extracted: false,
          }));
          await supabase.from('brand_url_suggestions').insert(rows);
          console.log(`[useBrandExtraction] Saved ${rows.length} URL suggestions to database`);
        }
      } catch (saveErr) {
        console.warn('[useBrandExtraction] Failed to save URL suggestions:', saveErr);
      }

      setPhase('selecting');
      setProgress({
        phase: 'selecting',
        completedUrls: 0,
        totalUrls: discovered.length,
        message: `Found ${discovered.length} pages. Select pages to extract.`
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to discover URLs';
      setError(message);
      setPhase('error');
      setProgress({
        phase: 'error',
        completedUrls: 0,
        totalUrls: 0,
        message: `Error: ${message}`
      });
    }
  }, [apifyToken]);

  /**
   * Toggle URL selection
   */
  const toggleUrlSelection = useCallback((url: string) => {
    setSelectedUrls(prev => {
      if (prev.includes(url)) {
        return prev.filter(u => u !== url);
      } else {
        return [...prev, url];
      }
    });
  }, []);

  /**
   * Select all suggested URLs
   */
  const selectAllUrls = useCallback(() => {
    setSelectedUrls(suggestions.map(s => s.url));
  }, [suggestions]);

  /**
   * Clear all selections
   */
  const clearSelection = useCallback(() => {
    setSelectedUrls([]);
  }, []);

  /**
   * Start extraction process for selected URLs using server-side edge function
   */
  const startExtraction = useCallback(async () => {
    if (selectedUrls.length === 0) {
      setError('No URLs selected');
      return;
    }

    if (!apifyToken) {
      setError('Apify token is required for extraction');
      return;
    }

    setPhase('extracting');
    setError(null);
    setExtractedComponents([]);
    setExtractedTokens(null);
    setScreenshotBase64(null);

    const totalUrls = selectedUrls.length;
    const analyzer = new ExtractionAnalyzer({ provider: aiProvider, apiKey });
    const library = new ComponentLibrary(projectId);

    // Track tokens across all extractions - we'll merge them
    let mergedTokens: Omit<ExtractedTokens, 'id' | 'projectId' | 'extractedAt'> | null = null;
    let firstScreenshot: string | null = null;

    try {
      // Update progress - extracting (batch mode)
      setProgress({
        phase: 'extracting',
        completedUrls: 0,
        totalUrls,
        message: `Extracting design data from ${totalUrls} pages via Apify...`
      });

      // Call edge function for batch extraction (uses Apify)
      const { data, error: fnError } = await useSupabase().functions.invoke('brand-extract-pages', {
        body: {
          urls: selectedUrls,
          apifyToken,
          projectId
        }
      });

      if (fnError) {
        throw new Error(fnError.message || 'Extraction failed');
      }

      if (!data?.ok) {
        throw new Error(data?.error || 'Extraction returned no results');
      }

      const extractions = data.extractions || [];
      console.log('[useBrandExtraction] Received', extractions.length, 'extractions');

      // Process each extraction with AI analysis
      for (let i = 0; i < extractions.length; i++) {
        const extraction = extractions[i];
        const url = extraction.url;

        // Update progress - analyzing
        setPhase('analyzing');
        setProgress({
          phase: 'analyzing',
          currentUrl: url,
          completedUrls: i,
          totalUrls: extractions.length,
          message: `Analyzing design ${i + 1}/${extractions.length}: ${url}`
        });

        // Skip if extraction had an error
        if (extraction.error) {
          console.warn(`[useBrandExtraction] Skipping failed extraction: ${url}`, extraction.error);
          continue;
        }

        // If we have a screenshot, analyze with AI for component extraction
        if (extraction.screenshotBase64) {
          // Save first screenshot for preview
          if (!firstScreenshot) {
            firstScreenshot = extraction.screenshotBase64;
            setScreenshotBase64(extraction.screenshotBase64);
          }

          try {
            // Pass raw HTML for literal component extraction (critical for BrandAwareComposer)
            const analysisResult = await analyzer.analyze({
              screenshotBase64: extraction.screenshotBase64,
              rawHtml: extraction.rawHtml || '' // Use HTML from edge function if available
            });
            console.log('[useBrandExtraction] AI analysis complete, components:', analysisResult.components.length);

            // Track tokens from first successful AI analysis
            if (analysisResult.tokens && !mergedTokens) {
              mergedTokens = analysisResult.tokens;
              setExtractedTokens(analysisResult.tokens);
              console.log('[useBrandExtraction] Extracted tokens:', analysisResult.tokens);
            }

            // Save components to ComponentLibrary
            // Use extractionId from edge function (required for FK constraint)
            const extractionId = (extraction as unknown as { extractionId?: string }).extractionId;
            if (!extractionId) {
              console.warn('[useBrandExtraction] No extractionId from edge function, skipping component save');
            } else {
              for (const component of analysisResult.components) {
                const fullComponent: ExtractedComponent = {
                  id: crypto.randomUUID(),
                  extractionId,
                  projectId,
                  visualDescription: component.visualDescription,
                  componentType: component.componentType,
                  literalHtml: component.literalHtml,
                  literalCss: component.literalCss,
                  theirClassNames: component.theirClassNames,
                  contentSlots: component.contentSlots,
                  boundingBox: component.boundingBox,
                  createdAt: new Date().toISOString()
                };

                // Always add to in-memory state (for UI display and DesignDNA conversion)
                setExtractedComponents(prev => [...prev, fullComponent]);

                // Attempt DB save separately (non-blocking)
                try {
                  await library.saveComponent(fullComponent);
                } catch (saveErr) {
                  console.warn(`[useBrandExtraction] Failed to save component to DB (will use in-memory):`, saveErr);
                }
              }
            }

            // Save tokens from AI analysis to database
            if (analysisResult.tokens) {
              try {
                await useSupabase().from('brand_tokens').upsert({
                  project_id: projectId,
                  colors: analysisResult.tokens.colors || {},
                  typography: analysisResult.tokens.typography || {},
                  spacing: analysisResult.tokens.spacing || {},
                  shadows: analysisResult.tokens.shadows || {},
                  borders: analysisResult.tokens.borders || {},
                  gradients: analysisResult.tokens.gradients || null,
                  extracted_from: analysisResult.tokens.extractedFrom,
                  extracted_at: new Date().toISOString()
                }, { onConflict: 'project_id' });
              } catch (tokenSaveErr) {
                console.warn('[useBrandExtraction] Failed to save tokens to DB:', tokenSaveErr);
              }
            }
          } catch (analyzeErr) {
            console.warn(`[useBrandExtraction] AI analysis failed for ${url}:`, analyzeErr);

            // FALLBACK: Extract components directly from raw HTML when AI fails
            // This ensures BrandAwareComposer has components to work with
            if (extraction.rawHtml) {
              console.log('[useBrandExtraction] Using fallback HTML extraction');

              // Use the extractionId returned from edge function if available
              // The edge function now saves to brand_extractions and returns the ID
              const extractionId = (extraction as unknown as { extractionId?: string }).extractionId;

              if (!extractionId) {
                console.warn('[useBrandExtraction] No extractionId from edge function, skipping fallback component extraction');
                // Edge function didn't return ID, can't save components due to FK constraint
                // Components will be saved on next extraction when edge function returns ID
              } else {
                // Extract style content from HTML
                const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
                let extractedCss = '';
                let match;
                while ((match = styleRegex.exec(extraction.rawHtml)) !== null) {
                  extractedCss += match[1] + '\n';
                }

                // Also try to extract linked stylesheets' content (if available in rawHtml)
                // For now, use what we have

                // Extract class names from the HTML
                const classRegex = /class="([^"]+)"/gi;
                const allClasses = new Set<string>();
                let classMatch;
                while ((classMatch = classRegex.exec(extraction.rawHtml)) !== null) {
                  classMatch[1].split(/\s+/).forEach(cls => {
                    if (cls && !cls.startsWith('js-') && cls.length > 2) {
                      allClasses.add(cls);
                    }
                  });
                }

                // Extract major sections as components (header, main, sections, footer)
                const sectionSelectors = [
                  { regex: /<header[^>]*>([\s\S]*?)<\/header>/i, type: 'header' },
                  { regex: /<main[^>]*>([\s\S]*?)<\/main>/i, type: 'main' },
                  { regex: /<section[^>]*class="[^"]*hero[^"]*"[^>]*>([\s\S]*?)<\/section>/i, type: 'hero' },
                  { regex: /<nav[^>]*>([\s\S]*?)<\/nav>/i, type: 'navigation' },
                  { regex: /<footer[^>]*>([\s\S]*?)<\/footer>/i, type: 'footer' },
                  { regex: /<article[^>]*>([\s\S]*?)<\/article>/i, type: 'article' },
                  { regex: /<aside[^>]*>([\s\S]*?)<\/aside>/i, type: 'sidebar' },
                ];

                for (const sel of sectionSelectors) {
                  const sectionMatch = extraction.rawHtml.match(sel.regex);
                  if (sectionMatch) {
                    // Extract class names from this specific section
                    const sectionClasses: string[] = [];
                    const sectionClassRegex = /class="([^"]+)"/gi;
                    let scMatch;
                    while ((scMatch = sectionClassRegex.exec(sectionMatch[0])) !== null) {
                      scMatch[1].split(/\s+/).forEach(cls => {
                        if (cls && !sectionClasses.includes(cls)) {
                          sectionClasses.push(cls);
                        }
                      });
                    }

                    const fullComponent: ExtractedComponent = {
                      id: crypto.randomUUID(),
                      extractionId,
                      projectId,
                      visualDescription: `${sel.type} section extracted from ${url}`,
                      componentType: sel.type,
                      literalHtml: sectionMatch[0],
                      literalCss: extractedCss,
                      theirClassNames: sectionClasses.slice(0, 20), // Limit class names
                      contentSlots: [{ name: 'content', selector: '*', type: 'html', required: true }],
                      createdAt: new Date().toISOString()
                    };

                    // Always add to in-memory state
                    setExtractedComponents(prev => [...prev, fullComponent]);

                    try {
                      await library.saveComponent(fullComponent);
                      console.log(`[useBrandExtraction] Saved fallback ${sel.type} component`);
                    } catch (saveErr) {
                      console.warn(`[useBrandExtraction] Failed to save ${sel.type} component to DB:`, saveErr);
                    }
                  }
                }
              }
            }
          }
        }

        // Also save the basic tokens from edge function extraction
        if (extraction.colors) {
          try {
            await useSupabase().from('brand_tokens').upsert({
              project_id: projectId,
              colors: extraction.colors || {},
              typography: extraction.typography || {},
              spacing: extraction.spacing || { sectionGap: '48px', cardPadding: '24px', contentWidth: '1200px' },
              shadows: extraction.shadows || { card: '0 1px 3px rgba(0,0,0,0.1)', elevated: '0 4px 6px rgba(0,0,0,0.1)' },
              borders: extraction.borders || { radiusSmall: '4px', radiusMedium: '8px', radiusLarge: '16px', defaultColor: '#e5e7eb' },
              gradients: extraction.gradients || null,
              extracted_from: [url],
              extracted_at: new Date().toISOString()
            }, { onConflict: 'project_id' });
          } catch (tokenSaveErr) {
            console.warn('[useBrandExtraction] Failed to save edge function tokens to DB:', tokenSaveErr);
          }

          // CRITICAL: If AI analysis didn't provide tokens, use edge function extraction as fallback
          // Edge function returns colors as object: {primary, secondary, accent, background}
          if (!mergedTokens && (extraction.colors || extraction.typography)) {
            console.log('[useBrandExtraction] Using edge function extraction as token fallback');

            // Convert colors object to values array
            const colorsObj = extraction.colors || {};
            const colorValues = [
              { hex: colorsObj.primary || '#3b82f6', usage: 'primary', frequency: 0.4 },
              { hex: colorsObj.secondary || '#1f2937', usage: 'secondary', frequency: 0.3 },
              { hex: colorsObj.accent || '#f59e0b', usage: 'accent', frequency: 0.2 },
              { hex: colorsObj.background || '#ffffff', usage: 'background', frequency: 0.1 },
            ].filter(c => c.hex); // Remove any undefined colors

            const fallbackTokens: Omit<ExtractedTokens, 'id' | 'projectId' | 'extractedAt'> = {
              colors: {
                values: colorValues
              },
              typography: {
                headings: {
                  fontFamily: extraction.typography?.heading || 'system-ui',
                  fontWeight: 700,
                },
                body: {
                  fontFamily: extraction.typography?.body || 'system-ui',
                  fontWeight: 400,
                  lineHeight: 1.6,
                }
              },
              spacing: {
                sectionGap: '48px',
                cardPadding: '24px',
                contentWidth: '1200px'
              },
              shadows: {
                card: extraction.components?.shadow?.style || '0 1px 3px rgba(0,0,0,0.1)',
                elevated: '0 4px 6px rgba(0,0,0,0.1)'
              },
              borders: {
                radiusSmall: '4px',
                radiusMedium: extraction.components?.button?.borderRadius || '8px',
                radiusLarge: '16px',
                defaultColor: '#e5e7eb'
              },
              gradients: {},
              extractedFrom: [url]
            };
            mergedTokens = fallbackTokens;
            setExtractedTokens(fallbackTokens);
            console.log('[useBrandExtraction] Fallback tokens set:', fallbackTokens.colors?.values?.length, 'colors from edge function');
          }
        }
      }

      // Mark extracted URLs in database (best-effort)
      try {
        const supabase = useSupabase();
        for (const url of selectedUrls) {
          await supabase
            .from('brand_url_suggestions')
            .update({ selected: true, extracted: true })
            .eq('project_id', projectId)
            .eq('suggested_url', url);
        }
        console.log('[useBrandExtraction] Marked', selectedUrls.length, 'URLs as extracted in database');
      } catch (markErr) {
        console.warn('[useBrandExtraction] Failed to mark extracted URLs:', markErr);
      }

      // Complete
      setPhase('complete');
      setProgress({
        phase: 'complete',
        completedUrls: totalUrls,
        totalUrls,
        message: `Extraction complete! Processed ${totalUrls} page${totalUrls !== 1 ? 's' : ''}.`
      });

      console.log('[useBrandExtraction] Extraction complete, tokens:', mergedTokens ? 'present' : 'none');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Extraction failed';
      setError(message);
      setPhase('error');
      setProgress({
        phase: 'error',
        completedUrls: progress.completedUrls,
        totalUrls,
        message: `Error: ${message}`
      });
    }
  }, [selectedUrls, projectId, aiProvider, apiKey, apifyToken, progress.completedUrls]);

  /**
   * Check if there are stored extractions in the database that can be re-analyzed
   */
  const checkStoredExtractions = useCallback(async (): Promise<boolean> => {
    try {
      const { data, error: queryError } = await useSupabase()
        .from('brand_extractions')
        .select('id, source_url, screenshot_base64, raw_html')
        .eq('project_id', projectId)
        .limit(1);

      if (queryError) {
        console.warn('[useBrandExtraction] Failed to check stored extractions:', queryError);
        return false;
      }

      const hasData = !!(data && data.length > 0 && data[0].screenshot_base64);
      setHasStoredExtractions(hasData);
      return hasData;
    } catch (err) {
      console.warn('[useBrandExtraction] Error checking stored extractions:', err);
      return false;
    }
  }, [projectId]);

  /**
   * Re-analyze existing extractions from database (without re-crawling)
   * This is faster and cheaper than full re-extraction
   */
  const reanalyze = useCallback(async () => {
    setPhase('analyzing');
    setError(null);
    setExtractedComponents([]);

    try {
      // Fetch existing extractions from database
      const { data: extractions, error: queryError } = await useSupabase()
        .from('brand_extractions')
        .select('id, source_url, screenshot_base64, raw_html, computed_styles')
        .eq('project_id', projectId);

      if (queryError) {
        throw new Error(queryError.message || 'Failed to load stored extractions');
      }

      if (!extractions || extractions.length === 0) {
        throw new Error('No stored extractions found. Please run full extraction first.');
      }

      console.log('[useBrandExtraction] Re-analyzing', extractions.length, 'stored extractions');

      setProgress({
        phase: 'analyzing',
        completedUrls: 0,
        totalUrls: extractions.length,
        message: `Re-analyzing ${extractions.length} stored pages...`
      });

      const analyzer = new ExtractionAnalyzer({ provider: aiProvider, apiKey });
      const library = new ComponentLibrary(projectId);

      // Clear existing components for this project
      await library.clearAll();

      let mergedTokens: Omit<ExtractedTokens, 'id' | 'projectId' | 'extractedAt'> | null = null;
      let firstScreenshot: string | null = null;

      for (let i = 0; i < extractions.length; i++) {
        const extraction = extractions[i];
        const url = extraction.source_url;

        setProgress({
          phase: 'analyzing',
          currentUrl: url,
          completedUrls: i,
          totalUrls: extractions.length,
          message: `Re-analyzing ${i + 1}/${extractions.length}: ${url}`
        });

        // Skip if no screenshot
        if (!extraction.screenshot_base64) {
          console.warn(`[useBrandExtraction] No screenshot for ${url}, skipping`);
          continue;
        }

        // Save first screenshot for preview
        if (!firstScreenshot) {
          firstScreenshot = extraction.screenshot_base64;
          setScreenshotBase64(extraction.screenshot_base64);
        }

        try {
          // Run AI analysis on stored screenshot + raw HTML
          const analysisResult = await analyzer.analyze({
            screenshotBase64: extraction.screenshot_base64,
            rawHtml: extraction.raw_html || ''
          });

          console.log('[useBrandExtraction] Re-analysis complete, components:', analysisResult.components.length);

          // Track tokens
          if (analysisResult.tokens && !mergedTokens) {
            mergedTokens = analysisResult.tokens;
            setExtractedTokens(analysisResult.tokens);
          }

          // Save components
          for (const component of analysisResult.components) {
            const fullComponent: ExtractedComponent = {
              id: crypto.randomUUID(),
              extractionId: extraction.id,
              projectId,
              visualDescription: component.visualDescription,
              componentType: component.componentType,
              literalHtml: component.literalHtml,
              literalCss: component.literalCss,
              theirClassNames: component.theirClassNames,
              contentSlots: component.contentSlots,
              boundingBox: component.boundingBox,
              createdAt: new Date().toISOString()
            };

            try {
              await library.saveComponent(fullComponent);
              setExtractedComponents(prev => [...prev, fullComponent]);
            } catch (saveErr) {
              console.warn('[useBrandExtraction] Failed to save component:', saveErr);
            }
          }
        } catch (analyzeErr) {
          console.warn(`[useBrandExtraction] Re-analysis failed for ${url}:`, analyzeErr);
        }
      }

      // Complete
      setPhase('complete');
      setProgress({
        phase: 'complete',
        completedUrls: extractions.length,
        totalUrls: extractions.length,
        message: `Re-analysis complete! Processed ${extractions.length} pages.`
      });

      console.log('[useBrandExtraction] Re-analysis complete');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Re-analysis failed';
      setError(message);
      setPhase('error');
      setProgress({
        phase: 'error',
        completedUrls: 0,
        totalUrls: 0,
        message: `Error: ${message}`
      });
    }
  }, [projectId, aiProvider, apiKey]);

  /**
   * Load previously saved URL suggestions from the database.
   * Populates suggestions and selectedUrls state from persisted data.
   * Returns true if saved suggestions were found.
   */
  const loadSavedSuggestions = useCallback(async (): Promise<boolean> => {
    try {
      const { data, error: queryError } = await useSupabase()
        .from('brand_url_suggestions')
        .select('*')
        .eq('project_id', projectId)
        .order('prominence_score', { ascending: false });

      if (queryError) {
        console.warn('[useBrandExtraction] Failed to load saved suggestions:', queryError);
        return false;
      }

      if (!data || data.length === 0) {
        return false;
      }

      // Convert DB rows back to UrlSuggestion[], filtering out email URLs
      const loaded: UrlSuggestion[] = data
        .filter(row => !row.suggested_url.includes('@'))
        .map(row => ({
          url: row.suggested_url,
          pageType: row.page_type as UrlSuggestion['pageType'],
          discoveredFrom: row.discovered_from as UrlSuggestion['discoveredFrom'],
          prominenceScore: (row.prominence_score ?? 0.5) * 100, // 0.00-1.00 → 0-100
          visualContext: row.visual_context || '',
        }));

      const selected = data
        .filter(row => row.selected && !row.suggested_url.includes('@'))
        .map(row => row.suggested_url);

      setSuggestions(loaded);
      setSelectedUrls(selected);
      setPhase('selecting');
      setProgress({
        phase: 'selecting',
        completedUrls: 0,
        totalUrls: loaded.length,
        message: `Loaded ${loaded.length} previously discovered pages`,
      });

      console.log('[useBrandExtraction] Loaded', loaded.length, 'saved suggestions from database');
      return true;
    } catch (err) {
      console.warn('[useBrandExtraction] Error loading saved suggestions:', err);
      return false;
    }
  }, [projectId]);

  /**
   * Reset to idle state
   */
  const reset = useCallback(() => {
    setPhase('idle');
    setProgress(initialProgress);
    setSuggestions([]);
    setSelectedUrls([]);
    setExtractedComponents([]);
    setExtractedTokens(null);
    setScreenshotBase64(null);
    setError(null);
    setHasStoredExtractions(false);
  }, []);

  return {
    // State
    phase,
    progress,
    suggestions,
    selectedUrls,
    extractedComponents,
    extractedTokens,
    screenshotBase64,
    error,
    hasStoredExtractions,

    // Actions
    discoverUrls,
    toggleUrlSelection,
    selectAllUrls,
    clearSelection,
    startExtraction,
    reanalyze,
    checkStoredExtractions,
    loadSavedSuggestions,
    reset
  };
}
