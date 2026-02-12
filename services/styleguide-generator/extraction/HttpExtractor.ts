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

/** Extract hex colors from CSS/HTML content */
function extractColors(content: string): ExtractedCssColor[] {
  const colorMap = new Map<string, { property: string; count: number }>();

  // Match hex colors (3 and 6 digit)
  const hexRegex = /#([0-9a-fA-F]{3}){1,2}\b/g;
  let match;
  while ((match = hexRegex.exec(content)) !== null) {
    const hex = normalizeHex(match[0]);
    if (hex && !isBlackWhiteGray(hex)) {
      const existing = colorMap.get(hex);
      if (existing) {
        existing.count++;
      } else {
        colorMap.set(hex, { property: 'mixed', count: 1 });
      }
    }
  }

  // Match rgb/rgba colors
  const rgbRegex = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g;
  while ((match = rgbRegex.exec(content)) !== null) {
    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    if (!isBlackWhiteGray(hex)) {
      const existing = colorMap.get(hex);
      if (existing) {
        existing.count++;
      } else {
        colorMap.set(hex, { property: 'mixed', count: 1 });
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

  // Match font-family declarations
  const fontRegex = /font-family\s*:\s*['"]?([^;'"}\n]+)/gi;
  let match;
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

/**
 * Extract brand data from a website using HTTP fetch.
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

  // Parse CSS values from HTML content
  const combinedContent = html;
  const colors = extractColors(combinedContent);
  const fonts = extractFonts(combinedContent);
  const sizes = extractSizes(combinedContent);
  const spacings = extractSpacings(combinedContent);
  const radii = extractRadii(combinedContent);
  const shadows = extractShadows(combinedContent);
  const googleFontsUrls = extractGoogleFontsUrls(html);

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
