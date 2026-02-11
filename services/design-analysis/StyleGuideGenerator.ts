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
import { API_ENDPOINTS } from '../../config/apiEndpoints';

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
        elementScreenshotBase64: raw.elementScreenshotBase64,
        sourcePageUrl: raw.sourcePageUrl,
        hoverCss: raw.hoverCss,
        ancestorBackground: raw.ancestorBackground,
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
      pageScreenshots: rawExtraction.pageScreenshots,
      pagesScanned: rawExtraction.pagesScanned,
    };
  },

  /**
   * Validate extracted elements using AI vision.
   * Sends element screenshots + page screenshot to AI for quality scoring (0-100).
   * Auto-rejects elements scoring below 40.
   */
  async validateElements(
    guide: StyleGuide,
    aiConfig: AiRefineConfig,
    onProgress?: (validated: number, total: number) => void,
  ): Promise<StyleGuide> {
    const elementsWithScreenshots = guide.elements.filter(e => e.elementScreenshotBase64);
    const pageScreenshot = guide.screenshotBase64 || guide.pageScreenshots?.[0]?.base64;

    if (!pageScreenshot || elementsWithScreenshots.length === 0) {
      return guide;
    }

    // Batch elements for efficient AI calls (4 per batch)
    const batches = chunkArray(elementsWithScreenshots, 4);
    let validated = 0;

    for (const batch of batches) {
      const prompt = buildValidationPrompt(batch);
      try {
        const result = await callRefineAI(aiConfig, prompt, pageScreenshot);
        const scores = parseValidationScores(result, batch.length);

        for (let i = 0; i < batch.length; i++) {
          const el = guide.elements.find(e => e.id === batch[i].id);
          if (el && scores[i] !== undefined) {
            el.qualityScore = scores[i].score;
            el.aiValidated = true;
            el.validationReason = scores[i].reason || undefined;
            if (scores[i].score < 40) {
              el.approvalStatus = 'rejected';
            }
          }
        }
      } catch (err) {
        console.warn('[StyleGuideGenerator] Validation batch failed:', err);
      }

      validated += batch.length;
      onProgress?.(validated, elementsWithScreenshots.length);
    }

    return guide;
  },

  /**
   * Generate AI fallback elements for categories with 0 approved elements.
   * Uses page screenshot + brand colors/fonts to create matching HTML elements.
   */
  async generateFallbackElements(
    guide: StyleGuide,
    aiConfig: AiRefineConfig,
  ): Promise<{ guide: StyleGuide; fallbackCount: number }> {
    const pageScreenshot = guide.screenshotBase64 || guide.pageScreenshots?.[0]?.base64;
    if (!pageScreenshot) return { guide, fallbackCount: 0 };

    // Find categories with 0 approved elements
    const approvedByCategory = new Map<string, number>();
    for (const el of guide.elements) {
      if (el.approvalStatus === 'approved') {
        approvedByCategory.set(el.category, (approvedByCategory.get(el.category) || 0) + 1);
      }
    }

    const requiredCategories: StyleGuideCategory[] = [
      'typography', 'buttons', 'cards', 'navigation',
      'accordions', 'backgrounds', 'forms', 'tables',
    ];
    const missingCategories = requiredCategories.filter(cat => !approvedByCategory.get(cat));

    if (missingCategories.length === 0) return { guide, fallbackCount: 0 };

    const colorContext = guide.colors
      .filter(c => c.approvalStatus === 'approved')
      .slice(0, 6)
      .map(c => `${c.hex} (${c.usage})`)
      .join(', ');
    const fontContext = guide.googleFontFamilies.join(', ') || 'system-ui';

    const prompt = `You are an expert web designer analyzing a website screenshot (IMAGE 1).

The following design element categories could NOT be extracted from the DOM:
${missingCategories.map(c => `- ${c}`).join('\n')}

Website's detected colors: ${colorContext || 'not yet detected'}
Website's detected fonts: ${fontContext}

For EACH missing category, generate a realistic, pixel-accurate HTML element that matches this specific website's visual identity. Use ONLY inline styles. Include the site's exact colors and fonts.

Category requirements:
- **typography**: H1 heading + body paragraph in site's font and colors
- **buttons**: Primary CTA + secondary button matching site's button style (color, radius, shadow)
- **cards**: Content card with header, text, and styling matching the site
- **navigation**: Simplified nav with 4 items in site's nav style
- **accordions**: Expandable section with header + content panel
- **backgrounds**: Section with the site's accent color background
- **forms**: Input field + label in site's form style
- **tables**: Small 3x3 data table in site's table style

CRITICAL:
- Match the EXACT colors from the screenshot (not generic blue/gray)
- Match the EXACT font family visible in the screenshot
- Match border-radius, shadows, and spacing patterns from the site
- Each element MUST be self-contained (inline styles only, no external CSS)

Return ONLY a valid JSON array (no markdown, no explanation):
[{ "category": "...", "subcategory": "...", "label": "...", "selfContainedHtml": "...", "computedCss": {...} }]`;

    let fallbackCount = 0;
    try {
      const result = await callRefineAI(aiConfig, prompt, pageScreenshot);
      const fallbacks = parseFallbackElements(result);

      for (const fb of fallbacks) {
        const html = fb.selfContainedHtml || '';
        const usesApprovedColor = guide.colors
          .filter(c => c.approvalStatus === 'approved')
          .some(c => html.toLowerCase().includes(c.hex.toLowerCase()));
        const qualityScore = usesApprovedColor ? 70 : 55;

        guide.elements.push({
          id: uuidv4(),
          category: fb.category as StyleGuideCategory,
          subcategory: fb.subcategory || 'ai-fallback',
          label: (fb.label || fb.category) + ' (AI-generated)',
          pageRegion: 'main',
          outerHtml: html,
          computedCss: fb.computedCss || {},
          selfContainedHtml: html,
          selector: 'ai-generated',
          elementTag: 'div',
          classNames: [],
          approvalStatus: 'pending',
          aiGenerated: true,
          qualityScore,
        });
        fallbackCount++;
      }
    } catch (err) {
      console.warn('[StyleGuideGenerator] Fallback generation failed:', err);
    }

    guide.elementCount = guide.elements.length;
    return { guide, fallbackCount };
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

  /**
   * Visual Validation & Repair Loop — AI compares element screenshots against page screenshots
   * to detect mismatches, then repairs broken elements by regenerating HTML from screenshots.
   *
   * Phase 1: VISUAL VALIDATION — score each element 0-100 via image comparison
   *   Score >= 60 → approved
   *   Score 30-59 → repair queue
   *   Score < 30 → rejected
   * Phase 2: VISUAL REPAIR — regenerate HTML for elements scoring 30-59 (max 5)
   * Phase 3: FALLBACK GENERATION — handled separately (existing generateFallbackElements)
   */
  async visualValidateAndRepair(
    guide: StyleGuide,
    aiConfig: AiRefineConfig,
    onProgress?: (phase: 'validating' | 'repairing', done: number, total: number) => void,
  ): Promise<StyleGuide> {
    const elementsWithScreenshots = guide.elements.filter(e => e.elementScreenshotBase64);
    const pageScreenshot = guide.screenshotBase64 || guide.pageScreenshots?.[0]?.base64;

    if (!pageScreenshot || elementsWithScreenshots.length === 0) {
      return guide;
    }

    // Extract brand context for validation
    const brandColors = guide.colors
      .filter(c => c.approvalStatus === 'approved')
      .slice(0, 8)
      .map(c => `${c.hex} (${c.usage})`);
    const brandFonts = guide.googleFontFamilies.length > 0
      ? guide.googleFontFamilies
      : ['system-ui'];
    const brandContext = { colors: brandColors, fonts: brandFonts };

    // ── Phase 1: Visual Validation ──
    let validated = 0;
    const repairQueue: StyleGuideElement[] = [];

    for (const el of elementsWithScreenshots) {
      try {
        const result = await visualValidateElement(el, pageScreenshot, aiConfig, brandContext);
        const guideEl = guide.elements.find(e => e.id === el.id);
        if (guideEl) {
          guideEl.qualityScore = result.score;
          guideEl.aiValidated = true;
          guideEl.visualIssues = result.issues;
          guideEl.validationReason = result.reason || undefined;
          if (result.suggestedBackground) {
            guideEl.suggestedBackground = result.suggestedBackground;
          }

          if (result.score >= 60) {
            guideEl.approvalStatus = 'approved';
          } else if (result.score >= 30) {
            repairQueue.push(guideEl);
          } else {
            guideEl.approvalStatus = 'rejected';
          }
        }
      } catch (err) {
        console.warn('[StyleGuideGenerator] Visual validation failed for element:', el.id, err);
      }

      validated++;
      onProgress?.('validating', validated, elementsWithScreenshots.length);
    }

    // ── Phase 1.5: Structural Validation Sweep ──
    for (const el of guide.elements) {
      const structuralIssues = runStructuralValidation(el);
      if (structuralIssues.length > 0) {
        el.visualIssues = [...(el.visualIssues || []), ...structuralIssues];
        // Auto-reject elements that fail structural checks with very low content
        const textContent = el.selfContainedHtml.replace(/<[^>]*>/g, '').trim();
        if (textContent.length < 5 || /^<div[^>]*>\s*<\/div>$/i.test(el.selfContainedHtml.trim())) {
          el.approvalStatus = 'rejected';
          el.qualityScore = Math.min(el.qualityScore ?? 100, 10);
        }
      }
    }

    // ── Phase 2: Visual Repair (max 5 elements) ──
    const toRepair = repairQueue.slice(0, 5);
    let repaired = 0;

    for (const el of toRepair) {
      try {
        const repairedHtml = await repairElementVisually(el, pageScreenshot, aiConfig);
        if (repairedHtml && repairedHtml.length >= 10) {
          el.selfContainedHtml = repairedHtml;
          el.aiRepaired = true;
          el.approvalStatus = 'approved';
          // Bump score slightly since we repaired it
          el.qualityScore = Math.max(el.qualityScore || 0, 60);
        }
      } catch (err) {
        console.warn('[StyleGuideGenerator] Visual repair failed for element:', el.id, err);
      }

      repaired++;
      onProgress?.('repairing', repaired, toRepair.length);
    }

    return guide;
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

  const response = await fetch(API_ENDPOINTS.ANTHROPIC, {
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

  const response = await fetch(API_ENDPOINTS.OPENAI, {
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

// =============================================================================
// AI Validation & Fallback Helpers
// =============================================================================

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function buildValidationPrompt(elements: StyleGuideElement[]): string {
  const descriptions = elements.map((el, i) =>
    `Element ${i + 1}: Category="${el.category}", Subcategory="${el.subcategory}", Label="${el.label}", Tag=<${el.elementTag}>, Classes=[${el.classNames.slice(0, 3).join(', ')}]`
  ).join('\n');

  return `You are a design system expert. I'm showing you a screenshot of a website (IMAGE 1).

I extracted these ${elements.length} design elements from the site's DOM:

${descriptions}

For each element, score it 0-100 on whether it's a GENUINE, USEFUL design element of its stated category:
- 90-100: Perfect representative element (e.g., a real CTA button for "buttons" category)
- 70-89: Good element, minor issues (slightly wrong subcategory but still useful)
- 40-69: Questionable (might be a navigation item labeled as button, or a page wrapper labeled as card)
- 0-39: Wrong (cookie widget, consent banner, builder chrome, page wrapper, off-screen element)

Consider: Does this element represent a reusable design pattern from this website? Would a designer include it in a style guide?

Return ONLY valid JSON array:
[
  { "index": 1, "score": 85, "reason": "Real CTA button with brand styling" },
  { "index": 2, "score": 20, "reason": "Cookie consent widget, not a design element" }
]`;
}

function parseValidationScores(raw: string, expectedCount: number): { score: number; reason: string }[] {
  try {
    let text = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return Array(expectedCount).fill({ score: 50, reason: 'Parse failed' });
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return Array(expectedCount).fill({ score: 50, reason: 'Parse failed' });
    return parsed.map((item: any) => ({
      score: typeof item.score === 'number' ? item.score : 50,
      reason: item.reason || '',
    }));
  } catch {
    return Array(expectedCount).fill({ score: 50, reason: 'Parse failed' });
  }
}

function parseFallbackElements(raw: string): { category: string; subcategory: string; label: string; selfContainedHtml: string; computedCss: Record<string, string> }[] {
  try {
    let text = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item: any) => item.category && item.selfContainedHtml);
  } catch {
    return [];
  }
}

// =============================================================================
// Visual Validation & Repair Helpers
// =============================================================================

interface VisualValidationResult {
  score: number;
  issues: string[];
  suggestedBackground: string | null;
  reason: string | null;
}

interface BrandContext {
  colors: string[];
  fonts: string[];
}

/**
 * Validate a single element by sending both page screenshot (IMAGE 1) and
 * element screenshot (IMAGE 2) to the AI for visual comparison.
 * Includes brand context (colors & fonts) for richer validation.
 */
async function visualValidateElement(
  element: StyleGuideElement,
  pageScreenshot: string,
  aiConfig: AiRefineConfig,
  brandContext?: BrandContext,
): Promise<VisualValidationResult> {
  const brandSection = brandContext
    ? `\nBrand context for this site:
- Detected colors: ${brandContext.colors.join(', ') || 'unknown'}
- Detected fonts: ${brandContext.fonts.join(', ') || 'system-ui'}

Also check:
5. BRAND COLORS: Does the element use the site's brand colors?
6. BRAND FONTS: Does the element use the site's detected fonts?
7. REUSABILITY: Is this a reusable design pattern (not a one-off)?`
    : '';

  const prompt = `You are a web design QA inspector. I'm showing you:
- IMAGE 1: Full-page screenshot of a website
- IMAGE 2: Screenshot of a specific "${element.category}" element (${element.subcategory}) extracted from that page

Evaluate visual accuracy of how well this element could be reproduced as a standalone HTML snippet:
1. BACKGROUND: Does the element appear on a dark/colored section? If so, what background color is needed?
2. COLORS: Do the text and accent colors match what's visible on the page?
3. COMPLETENESS: Is the element truncated or missing visible parts?
4. LEGITIMACY: Is this a real design element (not cookie banner/popup/overlay)?
${brandSection}

Return ONLY valid JSON (no markdown):
{ "score": 0-100, "issues": ["issue1", "issue2"], "suggestedBackground": "rgb(R, G, B)" or null, "reason": "one-sentence explanation of score"${brandContext ? ', "brandColorMatch": true/false, "brandFontMatch": true/false' : ''} }

Score guide:
- 80-100: Element looks correct and complete
- 60-79: Minor issues (slightly off colors, small truncation)
- 30-59: Significant issues (wrong background, badly truncated, missing key parts)
- 0-29: Wrong element entirely (noise, popup, invisible)`;

  const result = await callRefineAI(aiConfig, prompt, pageScreenshot, element.elementScreenshotBase64);

  try {
    let text = result.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        score: typeof parsed.score === 'number' ? parsed.score : 50,
        issues: Array.isArray(parsed.issues) ? parsed.issues : [],
        suggestedBackground: parsed.suggestedBackground || null,
        reason: parsed.reason || null,
      };
    }
  } catch {
    // parse failed
  }

  return { score: 50, issues: ['Validation parse failed'], suggestedBackground: null, reason: null };
}

/**
 * Repair a broken element by asking AI to fix the existing HTML based on
 * detected issues, the element screenshot, and page context.
 */
async function repairElementVisually(
  element: StyleGuideElement,
  pageScreenshot: string,
  aiConfig: AiRefineConfig,
): Promise<string> {
  // Include current HTML (truncated) and issues for targeted repair
  const currentHtml = element.selfContainedHtml.length > 1500
    ? element.selfContainedHtml.substring(0, 1500) + '...'
    : element.selfContainedHtml;

  const cssContext = Object.entries(element.computedCss)
    .slice(0, 15)
    .map(([k, v]) => `${k}: ${v}`)
    .join('; ');

  const issuesContext = element.visualIssues?.length
    ? `\nDetected issues to fix:\n${element.visualIssues.map(i => `- ${i}`).join('\n')}`
    : '';

  const prompt = `You are an HTML/CSS expert. IMAGE 1 shows a full website page for context.
IMAGE 2 shows how a specific "${element.category}" element (${element.subcategory}) looks on that website.

Current HTML that needs repair:
\`\`\`html
${currentHtml}
\`\`\`

Current computed CSS: ${cssContext}
${issuesContext}

Fix the HTML to visually match IMAGE 2. Focus on fixing the specific issues listed above.
Include the correct background color, fonts, colors, spacing, and border styles.
The HTML must be self-contained — no external CSS, no class names, only inline styles.
Max 2000 characters.

Return ONLY the corrected HTML — no explanation, no markdown fences.`;

  const result = await callRefineAI(aiConfig, prompt, pageScreenshot, element.elementScreenshotBase64);

  // Clean any markdown fencing
  let html = result.trim();
  if (html.startsWith('```')) {
    html = html.replace(/^```(?:html)?\n?/, '').replace(/\n?```$/, '').trim();
  }

  return html;
}

/**
 * Structural validation sweep — programmatic checks that catch edge cases AI vision may miss.
 */
function runStructuralValidation(element: StyleGuideElement): string[] {
  const issues: string[] = [];
  const html = element.selfContainedHtml || '';
  const textContent = html.replace(/<[^>]*>/g, '').trim();

  // Auto-reject empty content
  if (textContent.length < 5 && !html.includes('<img') && !html.includes('<svg')) {
    issues.push('Empty or near-empty content');
  }

  // Auto-reject empty wrapper divs
  if (/^<div[^>]*>\s*<\/div>$/i.test(html.trim())) {
    issues.push('Empty wrapper div');
  }

  // Flag low contrast: text color too similar to background
  const textColor = element.computedCss.color;
  const bgColorCss = element.computedCss.backgroundColor ||
    element.ancestorBackground?.backgroundColor;
  if (textColor && bgColorCss) {
    const textRgb = parseRgb(textColor);
    const bgRgb = parseRgb(bgColorCss);
    if (textRgb && bgRgb) {
      const distance = Math.sqrt(
        (textRgb[0] - bgRgb[0]) ** 2 +
        (textRgb[1] - bgRgb[1]) ** 2 +
        (textRgb[2] - bgRgb[2]) ** 2
      );
      if (distance < 30) {
        issues.push('Low contrast: text and background colors too similar');
      }
    }
  }

  return issues;
}

/** Parse RGB values from a CSS color string */
function parseRgb(color: string): [number, number, number] | null {
  const match = color.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (match) return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
  if (color.startsWith('#') && color.length >= 7) {
    return [
      parseInt(color.slice(1, 3), 16),
      parseInt(color.slice(3, 5), 16),
      parseInt(color.slice(5, 7), 16),
    ];
  }
  return null;
}
