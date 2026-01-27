// deno-lint-ignore-file no-explicit-any
/**
 * Brand Extract Pages Edge Function
 *
 * Extracts brand design data from multiple pages using Apify.
 * Captures screenshots and extracts colors, typography, and components.
 *
 * Accepts: { urls: string[], apifyToken: string, projectId?: string }
 * Returns: { extractions: PageExtraction[] }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// --- Utility Functions ---

function corsHeaders(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

function getEnvVar(name: string): string {
  const Deno = (globalThis as any).Deno;
  const value = Deno.env.get(name);
  if (!value) {
    console.warn(`Environment variable ${name} is not set.`);
  }
  return value;
}

function json(body: any, status = 200, origin = "*") {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}

// --- Types ---

interface PageExtraction {
  url: string;
  screenshotBase64?: string;
  /** RAW HTML of the page - needed for literal component extraction */
  rawHtml?: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  colorSources: Record<string, string>;
  typography: {
    heading: string;
    body: string;
    baseSize: string;
  };
  components: {
    button: { borderRadius: string; source: string };
    shadow: { style: string; source: string };
  };
  images: Array<{
    src: string;
    alt: string;
    role: 'hero' | 'logo' | 'content' | 'background';
  }>;
  error?: string;
}

// --- Apify Helper Functions ---

const API_BASE_URL = 'https://api.apify.com/v2';
const PLAYWRIGHT_SCRAPER_ACTOR_ID = 'apify/playwright-scraper';

interface ApifyRun {
  id: string;
  status: 'READY' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMED-OUT' | 'ABORTING' | 'ABORTED';
  defaultDatasetId: string;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runApifyActor(actorId: string, apiToken: string, runInput: any): Promise<any[]> {
  const startRunUrl = `${API_BASE_URL}/acts/${actorId.replace('/', '~')}/runs?token=${apiToken}`;

  console.log('[Apify] Starting actor:', actorId, 'with', runInput.startUrls?.length || 0, 'URLs');

  const startResponse = await fetch(startRunUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(runInput)
  });

  if (!startResponse.ok) {
    const errorText = await startResponse.text();
    throw new Error(`Apify start run failed (${startResponse.status}): ${errorText}`);
  }

  const { data: runDetails }: { data: ApifyRun } = await startResponse.json();

  let run = runDetails;
  console.log('[Apify] Run started with ID:', run.id);

  // Wait for completion (up to 5 minutes for multi-page extractions)
  const maxRetries = 60;
  for (let i = 0; i < maxRetries; i++) {
    await sleep(5000);
    const statusUrl = `${API_BASE_URL}/actor-runs/${run.id}?token=${apiToken}`;
    const statusResponse = await fetch(statusUrl);
    if (!statusResponse.ok) {
      throw new Error(`Apify status check failed: ${statusResponse.statusText}`);
    }
    const { data: currentRun }: { data: ApifyRun } = await statusResponse.json();
    run = currentRun;
    console.log('[Apify] Status:', run.status, `(${i + 1}/${maxRetries})`);
    if (run.status === 'SUCCEEDED') break;
    if (['FAILED', 'TIMED-OUT', 'ABORTED'].includes(run.status)) {
      throw new Error(`Apify run failed: ${run.status}`);
    }
  }

  if (run.status !== 'SUCCEEDED') throw new Error('Apify run timed out');

  const resultsUrl = `${API_BASE_URL}/datasets/${run.defaultDatasetId}/items?token=${apiToken}&format=json`;
  const resultsResponse = await fetch(resultsUrl);
  if (!resultsResponse.ok) throw new Error(`Failed to fetch results: ${resultsResponse.statusText}`);

  return resultsResponse.json();
}

// --- Main Extraction Logic ---

async function extractBrandFromPages(urls: string[], apifyToken: string): Promise<PageExtraction[]> {
  // Page function to extract design data and capture screenshot
  const pageFunction = `
    async function pageFunction(context) {
      const { request, page, log } = context;

      try {
        log.info('Processing:', request.url);
        await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
        await page.waitForTimeout(2000);

        // Dismiss cookie banners
        const cookieSelectors = [
          '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
          '#onetrust-accept-btn-handler',
          'button[id*="accept"]',
          '.cc-accept',
        ];
        for (const selector of cookieSelectors) {
          try {
            const btn = await page.$(selector);
            if (btn) { await btn.click(); await page.waitForTimeout(500); break; }
          } catch {}
        }

        // Capture screenshot
        const screenshot = await page.screenshot({ type: 'jpeg', quality: 80, fullPage: false });
        const screenshotBase64 = screenshot.toString('base64');

        // CRITICAL: Capture raw HTML for literal component extraction
        const rawHtml = await page.content();

        // Extract design data
        const designData = await page.evaluate(() => {
          // Helper functions
          const isNeutral = (c) => {
            if (!c || c.includes('rgba(0, 0, 0, 0)')) return true;
            let r, g, b;
            if (c.startsWith('#')) {
              const hex = c.replace('#', '');
              const fullHex = hex.length === 3 ? hex.split('').map(ch => ch + ch).join('') : hex;
              r = parseInt(fullHex.slice(0, 2), 16);
              g = parseInt(fullHex.slice(2, 4), 16);
              b = parseInt(fullHex.slice(4, 6), 16);
            } else {
              const match = c.match(/\\d+/g);
              if (!match || match.length < 3) return true;
              [r, g, b] = match.map(Number);
            }
            if (r === 255 && g === 255 && b === 255) return true;
            if (r === 0 && g === 0 && b === 0) return true;
            if (Math.abs(r - g) < 15 && Math.abs(g - b) < 15 && Math.abs(r - b) < 15) return true;
            return false;
          };

          const rgbToHex = (c) => {
            if (!c) return null;
            if (c.startsWith('#')) return c.toLowerCase();
            const match = c.match(/\\d+/g);
            if (!match || match.length < 3) return null;
            const [r, g, b] = match.map(Number);
            return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
          };

          // Color extraction
          const results = { primary: null, secondary: null, accent: null, background: null };
          const sources = { primary: 'fallback', secondary: 'fallback', accent: 'fallback', background: 'element' };

          // Try buttons
          const btnSelectors = ['.wp-block-button__link', '.elementor-button', 'button[class*="primary"]', '.btn-primary', 'a.button'];
          for (const sel of btnSelectors) {
            try {
              const btn = document.querySelector(sel);
              if (btn) {
                const bg = window.getComputedStyle(btn).backgroundColor;
                if (bg && !isNeutral(bg)) {
                  results.primary = bg;
                  sources.primary = 'button';
                  break;
                }
              }
            } catch {}
          }

          // Try links
          if (!results.primary) {
            const links = document.querySelectorAll('a[href]:not([class*="logo"])');
            for (const link of Array.from(links).slice(0, 20)) {
              const color = window.getComputedStyle(link).color;
              if (color && !isNeutral(color)) {
                results.primary = color;
                sources.primary = 'link_color';
                break;
              }
            }
          }

          // Heading color
          const h1 = document.querySelector('h1, h2');
          if (h1) {
            results.secondary = window.getComputedStyle(h1).color || '#18181b';
            sources.secondary = 'heading';
          }

          results.background = window.getComputedStyle(document.body).backgroundColor || '#ffffff';

          // Fallback
          if (!results.primary || isNeutral(results.primary)) {
            results.primary = 'rgb(234, 88, 12)';
            sources.primary = 'fallback';
          }
          if (!results.accent) {
            results.accent = results.primary;
            sources.accent = sources.primary;
          }

          // Convert to hex
          Object.keys(results).forEach(key => {
            const hex = rgbToHex(results[key]);
            if (hex) results[key] = hex;
          });

          // Typography
          const typoH1 = document.querySelector('h1, h2');
          const typography = {
            heading: typoH1 ? window.getComputedStyle(typoH1).fontFamily : 'system-ui, sans-serif',
            body: window.getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif',
            baseSize: window.getComputedStyle(document.body).fontSize || '16px'
          };

          // Components
          const btn = document.querySelector('button, .btn, a.button');
          const card = document.querySelector('.card, article');
          const components = {
            button: btn ? { borderRadius: window.getComputedStyle(btn).borderRadius || '4px', source: 'button' } : { borderRadius: '8px', source: 'fallback' },
            shadow: card ? { style: window.getComputedStyle(card).boxShadow || 'none', source: 'card' } : { style: '0 4px 6px rgba(0,0,0,0.1)', source: 'fallback' }
          };

          // Extract key images
          const images = [];
          // Hero image
          const heroImg = document.querySelector('[class*="hero"] img, .hero img, header img');
          if (heroImg) {
            images.push({ src: heroImg.src, alt: heroImg.alt || '', role: 'hero' });
          }
          // Logo
          const logo = document.querySelector('[class*="logo"] img, .logo img, header img[src*="logo"]');
          if (logo) {
            images.push({ src: logo.src, alt: logo.alt || '', role: 'logo' });
          }
          // Content images (first few)
          const contentImgs = document.querySelectorAll('main img, article img, .content img');
          contentImgs.forEach((img, i) => {
            if (i < 3 && img.src && !images.find(x => x.src === img.src)) {
              images.push({ src: img.src, alt: img.alt || '', role: 'content' });
            }
          });

          return { colors: results, colorSources: sources, typography, components, images };
        });

        return {
          url: request.url,
          screenshotBase64,
          rawHtml: rawHtml.substring(0, 500000), // Limit to 500KB to avoid payload issues
          ...designData
        };
      } catch (error) {
        log.error('Extraction failed:', error.message);
        return {
          url: request.url,
          error: error.message,
          colors: { primary: '#ea580c', secondary: '#18181b', accent: '#ea580c', background: '#ffffff' },
          colorSources: { primary: 'fallback', secondary: 'fallback', accent: 'fallback', background: 'fallback' },
          typography: { heading: 'system-ui, sans-serif', body: 'system-ui, sans-serif', baseSize: '16px' },
          components: {
            button: { borderRadius: '8px', source: 'fallback' },
            shadow: { style: '0 4px 6px rgba(0,0,0,0.1)', source: 'fallback' }
          },
          images: []
        };
      }
    }
  `;

  const runInput = {
    startUrls: urls.map(url => ({ url })),
    pageFunction,
    proxyConfiguration: { useApifyProxy: true },
    maxConcurrency: 3, // Process 3 pages at a time
    maxRequestsPerCrawl: urls.length,
    linkSelector: '', // Don't follow links
    navigationTimeoutSecs: 45,
    requestHandlerTimeoutSecs: 90,
    launchContext: {
      launchOptions: { headless: true },
    },
  };

  const results = await runApifyActor(PLAYWRIGHT_SCRAPER_ACTOR_ID, apifyToken, runInput);

  return results.map(item => ({
    url: item.url,
    screenshotBase64: item.screenshotBase64,
    rawHtml: item.rawHtml, // CRITICAL: Include raw HTML for literal component extraction
    colors: item.colors || { primary: '#ea580c', secondary: '#18181b', accent: '#ea580c', background: '#ffffff' },
    colorSources: item.colorSources || {},
    typography: item.typography || { heading: 'system-ui, sans-serif', body: 'system-ui, sans-serif', baseSize: '16px' },
    components: item.components || {
      button: { borderRadius: '8px', source: 'fallback' },
      shadow: { style: '0 4px 6px rgba(0,0,0,0.1)', source: 'fallback' }
    },
    images: item.images || [],
    error: item.error,
  }));
}

// --- Main Handler ---

const Deno = (globalThis as any).Deno;

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "*";

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) });
  }

  try {
    const { urls, apifyToken, projectId } = await req.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return json({ ok: false, error: 'urls array is required' }, 400, origin);
    }

    if (!apifyToken) {
      return json({ ok: false, error: 'apifyToken is required' }, 400, origin);
    }

    // Limit to 10 URLs max
    const limitedUrls = urls.slice(0, 10);
    console.log('[BrandExtractPages] Processing', limitedUrls.length, 'URLs');

    // Extract brand data from pages
    const extractions = await extractBrandFromPages(limitedUrls, apifyToken);

    console.log('[BrandExtractPages] Extracted data from', extractions.length, 'pages');

    // If projectId provided, save to database
    if (projectId) {
      try {
        const supabase = createClient(
          getEnvVar('PROJECT_URL')!,
          getEnvVar('SERVICE_ROLE_KEY')!
        );

        // Save extractions to brand_extractions table
        for (const extraction of extractions) {
          await supabase.from('brand_extractions').upsert({
            project_id: projectId,
            url: extraction.url,
            screenshot_base64: extraction.screenshotBase64?.substring(0, 100000), // Limit size
            colors: extraction.colors,
            color_sources: extraction.colorSources,
            typography: extraction.typography,
            components: extraction.components,
            images: extraction.images,
            extracted_at: new Date().toISOString(),
            error: extraction.error,
          }, { onConflict: 'project_id,url' });
        }

        console.log('[BrandExtractPages] Saved extractions to database');
      } catch (dbError) {
        console.error('[BrandExtractPages] Database save failed:', dbError);
        // Continue - extraction succeeded even if DB save failed
      }
    }

    return json({
      ok: true,
      extractions,
      metadata: {
        urlsProcessed: extractions.length,
        successCount: extractions.filter(e => !e.error).length,
        errorCount: extractions.filter(e => e.error).length,
      }
    }, 200, origin);

  } catch (error) {
    console.error('[BrandExtractPages] Error:', error);
    return json({
      ok: false,
      error: error.message || 'Page extraction failed'
    }, 500, origin);
  }
});
