// services/styleguide-generator/extraction/HttpExtractor.ts
// Extracts brand data from a website using HTTP fetch.
// Routes ALL external requests through the fetch-proxy edge function to avoid CORS.
// Parses HTML + CSS for colors, fonts, spacing, shapes.

import type { BusinessInfo } from '../../../types';

export interface RawHttpExtraction {
  html: string;
  title: string;
  description: string;
  headings: { level: number; text: string }[];
  links: { href: string; text: string; isInternal: boolean }[];
  images: { src: string; alt: string }[];
  colors: ExtractedCssColor[];
  fonts: ExtractedCssFont[];
  sizes: ExtractedCssSize[];
  spacings: string[];
  radii: string[];
  shadows: string[];
  googleFontsUrls: string[];
  pagesAnalyzed: string[];
}

export interface ExtractedCssColor {
  hex: string;
  property: string;  // color, background-color, border-color, etc.
  count: number;
}

export interface ExtractedCssFont {
  family: string;
  weights: number[];
  source: string;  // heading, body, nav, etc.
}

export interface ExtractedCssSize {
  element: string;  // h1, h2, p, etc.
  size: string;
}

// ============================================================================
// CSS PARSING UTILITIES
// ============================================================================

/**
 * Extract hex colors from CSS/HTML content with context-aware weighting.
 *
 * Colors in background-color/background properties get 3x weight because
 * they define visual brand identity (buttons, hero sections, banners).
 * Colors in button/CTA selectors get an extra 5x boost.
 * Raw text-color occurrences count at 1x (link color, heading color, etc.).
 */
function extractColors(content: string): ExtractedCssColor[] {
  const colorMap = new Map<string, { property: string; count: number }>();

  function addColor(hex: string | null, weight: number, property: string) {
    if (!hex || isBlackWhiteGray(hex)) return;
    const existing = colorMap.get(hex);
    if (existing) {
      existing.count += weight;
    } else {
      colorMap.set(hex, { property, count: weight });
    }
  }

  // ─── Pass 1: Global hex occurrences (base weight: 1) ──────────────
  const hexRegex = /#([0-9a-fA-F]{3}){1,2}\b/g;
  let match;
  while ((match = hexRegex.exec(content)) !== null) {
    addColor(normalizeHex(match[0]), 1, 'mixed');
  }

  // ─── Pass 2: rgb/rgba colors (base weight: 1) ─────────────────────
  const rgbRegex = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g;
  while ((match = rgbRegex.exec(content)) !== null) {
    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    addColor(hex, 1, 'mixed');
  }

  // ─── Pass 3: Background-color declarations (boost: +3) ────────────
  // Colors in background-color are brand-defining (buttons, headers, CTAs)
  const bgHexRegex = /background(?:-color)?\s*:\s*(?:[^;]*?)?(#[0-9a-fA-F]{3,8})\b/gi;
  while ((match = bgHexRegex.exec(content)) !== null) {
    addColor(normalizeHex(match[1]), 3, 'background');
  }
  // Also match rgb in background declarations
  const bgRgbRegex = /background(?:-color)?\s*:\s*(?:[^;]*?)?rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/gi;
  while ((match = bgRgbRegex.exec(content)) !== null) {
    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    addColor(hex, 3, 'background');
  }

  // ─── Pass 4: Button/CTA selector context (boost: +5) ──────────────
  // Colors inside selectors that match button/CTA patterns are strong brand signals
  const selectorBlockRegex = /([^{}]+)\{([^}]+)\}/g;
  const btnSelectorPattern = /(?:\.btn|\.button|\.cta|button|\.offerte|\.submit|\.action|input\[type=.submit)/i;
  while ((match = selectorBlockRegex.exec(content)) !== null) {
    const selector = match[1];
    const block = match[2];
    if (btnSelectorPattern.test(selector)) {
      // Extract colors from this block with boost
      const blockHexRegex = /#([0-9a-fA-F]{3}){1,2}\b/g;
      let blockMatch;
      while ((blockMatch = blockHexRegex.exec(block)) !== null) {
        addColor(normalizeHex(blockMatch[0]), 5, 'button');
      }
    }
  }

  return Array.from(colorMap.entries())
    .map(([hex, data]) => ({ hex, property: data.property, count: data.count }))
    .sort((a, b) => b.count - a.count);
}

function normalizeHex(hex: string): string | null {
  let h = hex.replace('#', '').toLowerCase();
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (h.length !== 6 || !/^[0-9a-f]{6}$/.test(h)) return null;
  return '#' + h;
}

function isBlackWhiteGray(hex: string): boolean {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  // If saturation is very low, it's a gray
  if (max - min < 20 && (max < 30 || min > 225)) return true;
  // Pure black/white
  if (r + g + b < 30 || r + g + b > 735) return true;
  return false;
}

/** Extract font families from CSS/HTML content */
function extractFonts(content: string): ExtractedCssFont[] {
  const fontMap = new Map<string, Set<number>>();

  // Match @font-face declarations (self-hosted fonts like Outfit, Poppins, etc.)
  // These are strong signals — they're deliberately loaded fonts, not fallbacks.
  const fontFaceRegex = /@font-face\s*\{([^}]+)\}/gi;
  let match;
  while ((match = fontFaceRegex.exec(content)) !== null) {
    const block = match[1];
    const familyMatch = block.match(/font-family\s*:\s*['"]?([^;'"}\n]+)/i);
    const weightMatch = block.match(/font-weight\s*:\s*(\d+)/i);
    if (familyMatch) {
      const family = familyMatch[1].trim().replace(/['"]/g, '');
      if (family && !isGenericFont(family)) {
        if (!fontMap.has(family)) fontMap.set(family, new Set());
        if (weightMatch) fontMap.get(family)!.add(parseInt(weightMatch[1]));
      }
    }
  }

  // Match font-family declarations
  const fontRegex = /font-family\s*:\s*['"]?([^;'"}\n]+)/gi;
  while ((match = fontRegex.exec(content)) !== null) {
    const families = match[1].split(',').map(f => f.trim().replace(/['"]/g, ''));
    for (const family of families) {
      if (family && !isGenericFont(family)) {
        if (!fontMap.has(family)) fontMap.set(family, new Set());
      }
    }
  }

  // Match font-weight declarations near font-family
  const weightRegex = /font-weight\s*:\s*(\d+)/gi;
  while ((match = weightRegex.exec(content)) !== null) {
    const weight = parseInt(match[1]);
    // Apply to all known fonts (rough heuristic)
    for (const weights of fontMap.values()) {
      weights.add(weight);
    }
  }

  // Extract Google Fonts from link tags (more reliable for weights)
  const gfRegex = /fonts\.googleapis\.com\/css2?\?[^"'\s>]+/g;
  while ((match = gfRegex.exec(content)) !== null) {
    const url = match[0];
    const familyRegex = /family=([^:&]+)(?::wght@([\d;]+))?/g;
    let fMatch;
    while ((fMatch = familyRegex.exec(url)) !== null) {
      const family = decodeURIComponent(fMatch[1]).replace(/\+/g, ' ');
      const weights = fMatch[2] ? fMatch[2].split(';').map(Number) : [400];
      if (!fontMap.has(family)) fontMap.set(family, new Set());
      for (const w of weights) fontMap.get(family)!.add(w);
    }
  }

  return Array.from(fontMap.entries()).map(([family, weights]) => ({
    family,
    weights: Array.from(weights).sort((a, b) => a - b),
    source: 'css',
  }));
}

function isGenericFont(f: string): boolean {
  const generics = ['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'inherit', 'initial'];
  return generics.includes(f.toLowerCase());
}

/** Extract font sizes mapped to elements */
function extractSizes(content: string): ExtractedCssSize[] {
  const sizes: ExtractedCssSize[] = [];
  const sizeRegex = /(h[1-6]|p|body|\.text-\w+)\s*\{[^}]*font-size\s*:\s*([^;}\n]+)/gi;
  let match;
  while ((match = sizeRegex.exec(content)) !== null) {
    sizes.push({ element: match[1].toLowerCase(), size: match[2].trim() });
  }
  return sizes;
}

/** Extract spacing values (padding, margin, gap) */
function extractSpacings(content: string): string[] {
  const spacings = new Set<string>();
  const regex = /(?:padding|margin|gap)\s*:\s*([^;}\n]+)/gi;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const values = match[1].trim().split(/\s+/);
    for (const v of values) {
      if (/^\d+(\.\d+)?(px|rem|em)$/.test(v)) spacings.add(v);
    }
  }
  return Array.from(spacings);
}

/** Extract border-radius values */
function extractRadii(content: string): string[] {
  const radii = new Set<string>();
  const regex = /border-radius\s*:\s*([^;}\n]+)/gi;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const values = match[1].trim().split(/\s+/);
    for (const v of values) {
      if (/^\d+(\.\d+)?(px|rem|em|%)$/.test(v)) radii.add(v);
    }
  }
  return Array.from(radii);
}

/** Extract box-shadow definitions */
function extractShadows(content: string): string[] {
  const shadows = new Set<string>();
  const regex = /box-shadow\s*:\s*([^;}\n]+)/gi;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const val = match[1].trim();
    if (val !== 'none') shadows.add(val);
  }
  return Array.from(shadows);
}

/** Extract Google Fonts URLs from link tags */
function extractGoogleFontsUrls(html: string): string[] {
  const urls: string[] = [];
  const regex = /href="(https?:\/\/fonts\.googleapis\.com\/css2?\?[^"]+)"/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}

// ============================================================================
// CONTENT CLEANING
// ============================================================================

/**
 * Strip non-CSS content from HTML before color/font extraction.
 * Removes <script>, <svg>, <noscript>, <canvas>, HTML comments,
 * JSON-LD blocks, and data-* attributes which contain noise hex values
 * that corrupt brand color detection.
 *
 * Keeps: <style> blocks, inline style="" attributes, <link> tags.
 */
function stripNonCssContent(html: string): string {
  return html
    // Remove script blocks (analytics, tracking, JS — full of hex noise)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    // Remove SVG content (icons, illustrations — full of color codes)
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, '')
    // Remove noscript blocks
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '')
    // Remove HTML comments (build hashes, version strings)
    .replace(/<!--[\s\S]*?-->/g, '')
    // Remove JSON-LD structured data (contains escaped content)
    .replace(/<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '')
    // Remove data-* attributes (often contain encoded colors, IDs)
    .replace(/\s+data-[\w-]+="[^"]*"/gi, '');
}

/**
 * Normalize a font family name from @font-face declarations.
 * Strips weight/style suffixes and normalizes casing.
 *
 * Examples:
 *   'outfit-bold' → 'Outfit'
 *   'OpenSans-Regular' → 'Open Sans'
 *   'Montserrat-SemiBold' → 'Montserrat'
 *   'roboto_condensed_bold' → 'Roboto Condensed'
 */
function normalizeFontFaceName(name: string): string {
  let cleaned = name.trim().replace(/['"]/g, '');

  // Remove common weight/style suffixes (case-insensitive)
  cleaned = cleaned
    .replace(/[-_](Extra)?Bold(Italic)?$/i, '')
    .replace(/[-_](Semi)?Bold$/i, '')
    .replace(/[-_](Extra)?Light(Italic)?$/i, '')
    .replace(/[-_]Regular$/i, '')
    .replace(/[-_]Medium$/i, '')
    .replace(/[-_]Italic$/i, '')
    .replace(/[-_]Thin$/i, '')
    .replace(/[-_]Black$/i, '')
    .replace(/[-_](Ultra)?Condensed$/i, '')
    .replace(/[-_]Expanded$/i, '');

  // Split on camelCase, hyphens, or underscores and rejoin with spaces
  cleaned = cleaned
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();

  // Title-case each word
  cleaned = cleaned
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  return cleaned;
}

// ============================================================================
// HTTP EXTRACTOR
// ============================================================================

/**
 * Fetch a URL through the Supabase fetch-proxy edge function to avoid CORS.
 * This is the ONLY way to fetch external websites from browser-side code.
 */
async function fetchViaProxy(
  targetUrl: string,
  businessInfo: BusinessInfo,
): Promise<string> {
  const bi = businessInfo as unknown as Record<string, unknown>;
  const supabaseUrl = (bi.supabaseUrl as string) || (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SUPABASE_URL : '') || '';
  const supabaseKey = (bi.supabaseAnonKey as string) || (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SUPABASE_ANON_KEY : '') || '';

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('[HttpExtractor] Missing Supabase credentials for fetch-proxy');
  }

  const proxyUrl = `${supabaseUrl}/functions/v1/fetch-proxy`;

  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      url: targetUrl,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StyleguideBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,*/*',
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Proxy request failed: ${response.status} - ${errorText}`);
  }

  const proxyResult = await response.json();

  if (!proxyResult.ok) {
    throw new Error(`Proxy fetch error: ${proxyResult.status} - ${proxyResult.statusText}`);
  }

  return typeof proxyResult.body === 'string' ? proxyResult.body : JSON.stringify(proxyResult.body);
}

/** Extract external stylesheet URLs from HTML */
function extractStylesheetUrls(html: string, baseUrl: string): string[] {
  const urls: string[] = [];
  // Match <link rel="stylesheet" href="...">
  const regex = /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    urls.push(match[1]);
  }
  // Also match reverse attribute order: href before rel
  const regex2 = /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']stylesheet["'][^>]*>/gi;
  while ((match = regex2.exec(html)) !== null) {
    if (!urls.includes(match[1])) urls.push(match[1]);
  }

  // Resolve relative URLs
  return urls.map(u => {
    if (u.startsWith('http')) return u;
    if (u.startsWith('//')) return 'https:' + u;
    if (u.startsWith('/')) return baseUrl.replace(/\/$/, '') + u;
    return baseUrl.replace(/\/$/, '') + '/' + u;
  });
}

/** Extract CSS variable declarations that look like brand colors */
function extractCssVariableColors(content: string): ExtractedCssColor[] {
  const results: ExtractedCssColor[] = [];
  // Match CSS custom properties with hex values: --some-color: #abc123
  const varRegex = /--([\w-]*(?:color|primary|secondary|accent|brand|main|bg|background|text|heading|link|btn|button)[\w-]*)\s*:\s*(#[0-9a-fA-F]{3,8})\b/gi;
  let match;
  while ((match = varRegex.exec(content)) !== null) {
    const hex = normalizeHex(match[2]);
    if (hex && !isBlackWhiteGray(hex)) {
      // CSS variable colors get a boost — they're intentional brand choices
      results.push({ hex, property: `var(--${match[1]})`, count: 10 });
    }
  }
  return results;
}

/**
 * Extract brand data from a website using HTTP fetch.
 * Fetches the HTML page AND external stylesheets for accurate brand extraction.
 * Routes through fetch-proxy edge function to avoid CORS issues.
 */
export async function extractViaHttp(
  domain: string,
  businessInfo: BusinessInfo,
): Promise<RawHttpExtraction> {
  const url = domain.startsWith('http') ? domain : `https://${domain}`;

  let html = '';
  let title = '';
  let description = '';
  const headings: { level: number; text: string }[] = [];
  const links: { href: string; text: string; isInternal: boolean }[] = [];
  const images: { src: string; alt: string }[] = [];

  // Fetch via proxy (avoids CORS — NEVER fetch external sites directly from browser)
  try {
    html = await fetchViaProxy(url, businessInfo);
    // Extract title from HTML
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    title = titleMatch?.[1]?.trim() || '';
    // Extract meta description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    description = descMatch?.[1]?.trim() || '';
  } catch (e) {
    console.warn('[HttpExtractor] Proxy fetch failed:', e);
  }

  // Fetch external stylesheets (up to 5) for accurate color/font extraction.
  // Most brand colors live in external CSS, not inline HTML.
  let externalCss = '';
  if (html) {
    const baseUrl = url.replace(/^(https?:\/\/[^/]+).*$/, '$1');
    const stylesheetUrls = extractStylesheetUrls(html, baseUrl);
    // Skip Google Fonts CSS (handled separately), skip very long query strings (tracking)
    const cssUrls = stylesheetUrls
      .filter(u => !u.includes('fonts.googleapis.com') && u.length < 500)
      .slice(0, 5);

    const cssResults = await Promise.allSettled(
      cssUrls.map(cssUrl => fetchViaProxy(cssUrl, businessInfo))
    );

    for (const result of cssResults) {
      if (result.status === 'fulfilled' && result.value) {
        externalCss += '\n' + result.value;
      }
    }
  }

  // Extract Google Fonts URLs BEFORE stripping (they're in <link> tags)
  const googleFontsUrls = extractGoogleFontsUrls(html);

  // Strip non-CSS noise (scripts, SVGs, comments, data-attributes)
  // CRITICAL: without this, hex values from JavaScript, SVG icons, analytics
  // scripts, etc. corrupt the brand color detection.
  const cleanedHtml = stripNonCssContent(html);

  // Combine cleaned HTML + external CSS for comprehensive parsing
  const combinedContent = cleanedHtml + '\n' + externalCss;
  const colors = extractColors(combinedContent);
  let fonts = extractFonts(combinedContent);
  const sizes = extractSizes(combinedContent);
  const spacings = extractSpacings(combinedContent);
  const radii = extractRadii(combinedContent);
  const shadows = extractShadows(combinedContent);

  // Normalize @font-face family names (strip weight suffixes: 'outfit-bold' → 'Outfit')
  // and deduplicate variants of the same font family
  const normalizedFontMap = new Map<string, Set<number>>();
  for (const font of fonts) {
    const normalName = normalizeFontFaceName(font.family);
    if (!normalizedFontMap.has(normalName)) {
      normalizedFontMap.set(normalName, new Set(font.weights));
    } else {
      for (const w of font.weights) normalizedFontMap.get(normalName)!.add(w);
    }
  }
  fonts = Array.from(normalizedFontMap.entries()).map(([family, weights]) => ({
    family,
    weights: Array.from(weights).sort((a, b) => a - b),
    source: 'css',
  }));

  // Extract CSS variable colors (intentional brand choices, weighted higher)
  const cssVarColors = extractCssVariableColors(combinedContent);
  for (const vc of cssVarColors) {
    const existing = colors.find(c => c.hex === vc.hex);
    if (existing) {
      existing.count += vc.count; // Boost existing color
    } else {
      colors.push(vc);
    }
  }
  // Re-sort after boosting
  colors.sort((a, b) => b.count - a.count);

  return {
    html,
    title,
    description,
    headings,
    links,
    images,
    colors,
    fonts,
    sizes,
    spacings,
    radii,
    shadows,
    googleFontsUrls,
    pagesAnalyzed: [url],
  };
}

// ============================================================================
// TEST EXPORTS — exposed for unit testing of CSS parsing logic
// ============================================================================
export const _testUtils = {
  extractColors,
  extractFonts,
  extractCssVariableColors,
  normalizeHex,
  isBlackWhiteGray,
  stripNonCssContent,
  normalizeFontFaceName,
};
