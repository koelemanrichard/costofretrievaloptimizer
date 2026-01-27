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

  // Actions
  discoverUrls: (domain: string) => Promise<void>;
  toggleUrlSelection: (url: string) => void;
  selectAllUrls: () => void;
  clearSelection: () => void;
  startExtraction: () => Promise<void>;
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

      const discovered: UrlSuggestion[] = data.urls || [];

      setSuggestions(discovered);

      // Auto-select top 5 suggestions
      const topUrls = discovered.slice(0, 5).map(s => s.url);
      setSelectedUrls(topUrls);

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
            const extractionId = crypto.randomUUID();
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

              await library.saveComponent(fullComponent);
              setExtractedComponents(prev => [...prev, fullComponent]);
            }

            // Save tokens from AI analysis to database
            if (analysisResult.tokens) {
              const tokensId = crypto.randomUUID();
              await useSupabase().from('brand_tokens').upsert({
                id: tokensId,
                project_id: projectId,
                colors: analysisResult.tokens.colors,
                typography: analysisResult.tokens.typography,
                spacing: analysisResult.tokens.spacing,
                shadows: analysisResult.tokens.shadows,
                borders: analysisResult.tokens.borders,
                gradients: analysisResult.tokens.gradients,
                extracted_from: analysisResult.tokens.extractedFrom,
                extracted_at: new Date().toISOString()
              });
            }
          } catch (analyzeErr) {
            console.warn(`[useBrandExtraction] AI analysis failed for ${url}:`, analyzeErr);

            // FALLBACK: Extract components directly from raw HTML when AI fails
            // This ensures BrandAwareComposer has components to work with
            if (extraction.rawHtml) {
              console.log('[useBrandExtraction] Using fallback HTML extraction');

              // Extract style content from HTML
              const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
              let extractedCss = '';
              let match;
              while ((match = styleRegex.exec(extraction.rawHtml)) !== null) {
                extractedCss += match[1] + '\n';
              }

              // Extract major sections as components (header, main, sections, footer)
              const sectionSelectors = [
                { regex: /<header[^>]*>([\s\S]*?)<\/header>/i, type: 'header' },
                { regex: /<main[^>]*>([\s\S]*?)<\/main>/i, type: 'main' },
                { regex: /<section[^>]*class="[^"]*hero[^"]*"[^>]*>([\s\S]*?)<\/section>/i, type: 'hero' },
                { regex: /<footer[^>]*>([\s\S]*?)<\/footer>/i, type: 'footer' },
              ];

              const extractionId = crypto.randomUUID();

              for (const sel of sectionSelectors) {
                const sectionMatch = extraction.rawHtml.match(sel.regex);
                if (sectionMatch) {
                  const fullComponent: ExtractedComponent = {
                    id: crypto.randomUUID(),
                    extractionId,
                    projectId,
                    visualDescription: `${sel.type} section extracted from ${url}`,
                    componentType: sel.type,
                    literalHtml: sectionMatch[0],
                    literalCss: extractedCss, // Full CSS for now
                    theirClassNames: [],
                    contentSlots: [{ name: 'content', selector: '*', type: 'html', required: true }],
                    createdAt: new Date().toISOString()
                  };

                  await library.saveComponent(fullComponent);
                  setExtractedComponents(prev => [...prev, fullComponent]);
                  console.log(`[useBrandExtraction] Saved fallback ${sel.type} component`);
                }
              }
            }
          }
        }

        // Also save the basic tokens from edge function extraction
        if (extraction.colors) {
          const tokensId = crypto.randomUUID();
          await useSupabase().from('brand_tokens').upsert({
            id: tokensId,
            project_id: projectId,
            colors: extraction.colors,
            typography: extraction.typography,
            extracted_from: [url],
            extracted_at: new Date().toISOString()
          }, { onConflict: 'project_id' }); // Merge with existing

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

      // Complete
      setPhase('complete');
      setProgress({
        phase: 'complete',
        completedUrls: extractions.length,
        totalUrls: extractions.length,
        message: `Extraction complete! Processed ${extractions.length} pages.`
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

    // Actions
    discoverUrls,
    toggleUrlSelection,
    selectAllUrls,
    clearSelection,
    startExtraction,
    reset
  };
}
