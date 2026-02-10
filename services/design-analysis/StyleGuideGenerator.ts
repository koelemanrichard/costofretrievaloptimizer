// =============================================================================
// StyleGuideGenerator — Transform raw Apify extraction into clean StyleGuide
// =============================================================================
// Assigns UUIDs, deduplicates, sorts by page region, generates labels,
// aggregates colors, and sets defaults.

import { v4 as uuidv4 } from 'uuid';
import type {
  StyleGuide,
  StyleGuideElement,
  StyleGuideColor,
  StyleGuideCategory,
  PageRegion,
} from '../../types/styleGuide';
import type { RawStyleGuideExtraction, RawExtractedElement } from './StyleGuideExtractor';

export interface AiRefineConfig {
  provider: 'gemini' | 'anthropic' | 'openai';
  apiKey: string;
  model?: string;
}

/** Page region sort order */
const REGION_ORDER: Record<PageRegion, number> = {
  header: 0,
  hero: 1,
  main: 2,
  sidebar: 3,
  footer: 4,
  unknown: 5,
};

/** Convert camelCase CSS property to kebab-case */
function camelToKebab(str: string): string {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase();
}

/** Convert RGB string to hex */
function rgbToHex(rgb: string): string | null {
  if (!rgb) return null;
  if (rgb.startsWith('#')) return rgb.toLowerCase();
  const match = rgb.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!match) return null;
  const [, r, g, b] = match;
  return '#' + [r, g, b].map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
}

/** Generate human-readable label for an element */
function generateLabel(raw: RawExtractedElement): string {
  const css = raw.computedCss;
  const tag = raw.elementTag.toUpperCase();
  const parts: string[] = [];

  // Tag or subcategory
  if (raw.category === 'typography') {
    parts.push(tag);
  } else if (raw.category === 'buttons') {
    parts.push('Button');
  } else if (raw.category === 'cards') {
    parts.push('Card');
  } else if (raw.category === 'navigation') {
    parts.push('Nav');
  } else {
    parts.push(raw.subcategory.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
  }

  // Font info for typography/buttons
  if (css.fontFamily) {
    const font = css.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
    const weight = css.fontWeight || '';
    const weightLabel =
      weight === '700' || weight === 'bold' ? 'Bold' :
      weight === '600' ? 'SemiBold' :
      weight === '500' ? 'Medium' :
      weight === '300' ? 'Light' : '';
    parts.push(`${font}${weightLabel ? ' ' + weightLabel : ''}`);
  }

  // Size
  if (css.fontSize) {
    parts.push(css.fontSize);
  }

  // Color (hex)
  if (css.color) {
    const hex = rgbToHex(css.color);
    if (hex) parts.push(hex);
  }

  return parts.join(' \u2014 ');
}

/** Hash computed CSS for deduplication */
function hashComputedCss(css: Record<string, string>): string {
  const keys = ['fontFamily', 'fontSize', 'fontWeight', 'color', 'backgroundColor',
    'borderRadius', 'padding', 'border', 'boxShadow', 'background'];
  return keys.map(k => css[k] || '').join('|');
}

/** Classify color usage based on context */
function classifyColorUsage(rgb: string, sources: string[]): string {
  const hex = rgbToHex(rgb);
  if (!hex) return 'unknown';

  // Check if neutral
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  if (r > 240 && g > 240 && b > 240) return 'background (white)';
  if (r < 30 && g < 30 && b < 30) return 'text (dark)';
  if (Math.abs(r - g) < 20 && Math.abs(g - b) < 20) return 'neutral';

  const srcStr = sources.join(' ');
  if (srcStr.includes('button') || srcStr.includes('a')) return 'interactive';
  if (srcStr.includes('h1') || srcStr.includes('h2')) return 'heading';
  return 'brand';
}

export const StyleGuideGenerator = {
  /**
   * Generate a clean StyleGuide from raw Apify extraction data.
   */
  generate(
    rawExtraction: RawStyleGuideExtraction,
    screenshotBase64: string | null,
    sourceUrl: string
  ): StyleGuide {
    const startTime = Date.now();
    let hostname = '';
    try {
      hostname = new URL(sourceUrl).hostname;
    } catch {
      hostname = sourceUrl;
    }

    // Process elements
    const seenHashes = new Set<string>();
    const elements: StyleGuideElement[] = [];

    for (const raw of rawExtraction.elements) {
      const hash = hashComputedCss(raw.computedCss);

      // Skip exact duplicates
      if (seenHashes.has(hash)) continue;
      seenHashes.add(hash);

      elements.push({
        id: uuidv4(),
        category: raw.category as StyleGuideCategory,
        subcategory: raw.subcategory,
        label: generateLabel(raw),
        pageRegion: (raw.pageRegion || 'unknown') as PageRegion,
        outerHtml: raw.outerHtml,
        computedCss: raw.computedCss,
        selfContainedHtml: raw.selfContainedHtml,
        selector: raw.selector,
        elementTag: raw.elementTag,
        classNames: raw.classNames || [],
        approvalStatus: 'approved', // Opt-out model: approved by default
      });
    }

    // Sort by page region
    elements.sort((a, b) => {
      const regionDiff = (REGION_ORDER[a.pageRegion] || 5) - (REGION_ORDER[b.pageRegion] || 5);
      if (regionDiff !== 0) return regionDiff;
      // Within same region, sort by category importance
      const catOrder: Record<string, number> = {
        typography: 0, buttons: 1, cards: 2, navigation: 3,
        accordions: 4, backgrounds: 5, 'section-breaks': 6,
        images: 7, tables: 8, forms: 9,
      };
      return (catOrder[a.category] ?? 99) - (catOrder[b.category] ?? 99);
    });

    // Aggregate colors from raw extraction's colorMap
    const colors: StyleGuideColor[] = [];
    const colorMapRaw = (rawExtraction as any).colorMap || {};
    const colorEntries = Object.entries(colorMapRaw) as [string, { count: number; sources: string[] }][];

    // Sort by frequency
    colorEntries.sort((a, b) => b[1].count - a[1].count);

    const seenHexColors = new Set<string>();
    for (const [rgb, data] of colorEntries) {
      if (colors.length >= 20) break;
      const hex = rgbToHex(rgb);
      if (!hex || seenHexColors.has(hex)) continue;
      seenHexColors.add(hex);

      colors.push({
        hex,
        rgb,
        usage: classifyColorUsage(rgb, data.sources),
        source: data.sources.join(', '),
        frequency: data.count,
        approvalStatus: 'approved',
      });
    }

    return {
      id: uuidv4(),
      hostname,
      sourceUrl,
      screenshotBase64: screenshotBase64 || undefined,
      extractedAt: new Date().toISOString(),
      elements,
      colors,
      googleFontsUrls: rawExtraction.googleFontsUrls || [],
      googleFontFamilies: rawExtraction.googleFontFamilies || [],
      isApproved: false,
      extractionDurationMs: rawExtraction.extractionDurationMs || (Date.now() - startTime),
      elementCount: elements.length,
      version: 1,
    };
  },

  /**
   * Refine an element using AI based on user comment and optional reference.
   * Returns updated selfContainedHtml and computedCss.
   */
  async refineElement(
    element: StyleGuideElement,
    userComment: string,
    referenceImage?: string,
    siteScreenshot?: string,
    aiConfig?: AiRefineConfig
  ): Promise<{ selfContainedHtml: string; computedCss: Record<string, string> }> {
    if (!aiConfig?.apiKey) {
      throw new Error('AI API key is required for element refinement');
    }

    const prompt = `You are a CSS/HTML expert. Refine the following HTML element based on the user's feedback.

CURRENT ELEMENT HTML:
\`\`\`html
${element.selfContainedHtml}
\`\`\`

CURRENT COMPUTED CSS:
${JSON.stringify(element.computedCss, null, 2)}

USER FEEDBACK: "${userComment}"

INSTRUCTIONS:
1. Modify the HTML element to match the user's feedback
2. Keep it as a single self-contained HTML element with inline styles
3. Preserve the general structure and content
4. Only change what the user asked for

Return ONLY the updated HTML element (no explanation, no markdown fences).`;

    const refined = await callRefineAI(aiConfig, prompt, siteScreenshot, referenceImage);

    // Extract the HTML from the response (strip any markdown fencing)
    let html = refined.trim();
    if (html.startsWith('```')) {
      html = html.replace(/^```(?:html)?\n?/, '').replace(/\n?```$/, '').trim();
    }

    if (!html || html.length < 10) {
      // Fallback: return original
      return { selfContainedHtml: element.selfContainedHtml, computedCss: element.computedCss };
    }

    // Parse updated inline styles to computedCss
    const styleMatch = html.match(/style="([^"]*)"/);
    const updatedCss: Record<string, string> = { ...element.computedCss };
    if (styleMatch) {
      const pairs = styleMatch[1].split(';').filter(Boolean);
      for (const pair of pairs) {
        const [prop, ...valParts] = pair.split(':');
        if (prop && valParts.length) {
          const camelProp = prop.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
          updatedCss[camelProp] = valParts.join(':').trim();
        }
      }
    }

    return { selfContainedHtml: html, computedCss: updatedCss };
  },
};

// =============================================================================
// AI Call Helpers for Element Refinement
// =============================================================================

async function callRefineAI(
  config: AiRefineConfig,
  prompt: string,
  image1?: string,
  image2?: string
): Promise<string> {
  switch (config.provider) {
    case 'gemini': return callGeminiRefine(config, prompt, image1, image2);
    case 'anthropic': return callClaudeRefine(config, prompt, image1, image2);
    case 'openai': return callOpenAIRefine(config, prompt, image1, image2);
    default: return callGeminiRefine(config, prompt, image1, image2);
  }
}

async function callGeminiRefine(config: AiRefineConfig, prompt: string, img1?: string, img2?: string): Promise<string> {
  const model = config.model || 'gemini-2.0-flash';
  const parts: any[] = [{ text: prompt }];
  if (img1) parts.push({ inlineData: { mimeType: 'image/jpeg', data: img1 } });
  if (img2) parts.push({ inlineData: { mimeType: 'image/jpeg', data: img2 } });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${config.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { maxOutputTokens: 4096, temperature: 0.3 },
      }),
    }
  );
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function callClaudeRefine(config: AiRefineConfig, prompt: string, img1?: string, img2?: string): Promise<string> {
  const model = config.model || 'claude-sonnet-4-20250514';
  const content: any[] = [{ type: 'text', text: prompt }];
  if (img1) content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: img1 } });
  if (img2) content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: img2 } });

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2024-01-01',
    },
    body: JSON.stringify({ model, max_tokens: 4096, messages: [{ role: 'user', content }] }),
  });
  const data = await response.json();
  return data.content?.[0]?.text || '';
}

async function callOpenAIRefine(config: AiRefineConfig, prompt: string, img1?: string, img2?: string): Promise<string> {
  const model = config.model || 'gpt-4o';
  const content: any[] = [{ type: 'text', text: prompt }];
  if (img1) content.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${img1}` } });
  if (img2) content.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${img2}` } });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({ model, max_tokens: 4096, messages: [{ role: 'user', content }] }),
  });
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}
