// deno-lint-ignore-file no-explicit-any
/**
 * Brand Discovery Edge Function
 *
 * Phase 1 of the brand replication pipeline: Visual discovery using AI vision models.
 * Analyzes screenshots of a brand's website to discover reusable component patterns.
 *
 * Accepts POST request with:
 * - brandUrl: string (website to analyze)
 * - brandId: string (identifier)
 * - pagesToAnalyze?: string[] (optional specific pages)
 * - screenshots?: Screenshot[] (pre-captured screenshots with base64Data)
 * - aiProvider: 'anthropic' | 'gemini'
 * - apiKey: string (AI API key for vision analysis)
 * - options?: DiscoveryOptions
 *
 * Returns DiscoveryOutput with discovered components.
 */

import { ENDPOINTS } from '../_shared/serviceConfig.ts';

const Deno = (globalThis as any).Deno;

// --- Constants ---

const ANTHROPIC_API_URL = ENDPOINTS.ANTHROPIC;
const GEMINI_API_URL = ENDPOINTS.GEMINI_BETA;

// Timeout for AI calls (2 minutes)
const AI_TIMEOUT_MS = 120000;

// --- CORS Headers ---

const ALLOWED_ORIGINS = [
  'https://holistic-seo-topical-map-generator.vercel.app',
  'https://cost-of-retreival-reducer.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
];

function corsHeaders(requestOrigin?: string | null) {
  const origin = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)
    ? requestOrigin
    : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  };
}

function json(body: any, status = 200, origin?: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}

// --- Types (matching interfaces/phase1-discovery.ts) ---

interface Screenshot {
  url: string;
  path: string;
  timestamp: string;
  viewport: { width: number; height: number };
  base64Data?: string;
  mimeType?: string;
}

interface DiscoveredComponent {
  id: string;
  name: string;
  purpose: string;
  visualDescription: string;
  usageContext: string;
  sourceScreenshots: string[];
  occurrences: number;
  confidence: number;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

interface DiscoveryOutput {
  brandId: string;
  brandUrl: string;
  analyzedPages: string[];
  screenshots: Screenshot[];
  discoveredComponents: DiscoveredComponent[];
  rawAnalysis: string;
  timestamp: string;
  status: 'success' | 'partial' | 'failed';
  errors?: string[];
}

interface DiscoveryRequest {
  brandUrl: string;
  brandId: string;
  pagesToAnalyze?: string[];
  screenshots?: Screenshot[];
  aiProvider: 'anthropic' | 'gemini';
  apiKey: string;
  options?: {
    customPrompt?: string;
    model?: string;
    minOccurrences?: number;
    confidenceThreshold?: number;
    debug?: boolean;
  };
}

// --- Discovery Prompt ---

const DISCOVERY_PROMPT = `You are a senior UI/UX designer analyzing a website to extract its visual component library.

Analyze the provided screenshots and identify DISTINCT visual component patterns used on this website.

For each component pattern you discover:
1. Give it a descriptive name (e.g., "Service Card", "Emergency CTA", "Testimonial Block")
2. Describe its visual characteristics in detail (colors, spacing, typography, icons, borders, shadows)
3. Explain its PURPOSE - what information does it communicate?
4. Describe its USAGE CONTEXT - where on the site is it used and for what type of content?
5. Note how many times you see it across the pages (occurrences)
6. Rate your confidence that this is a distinct, reusable component (0.0-1.0)

Focus on components that:
- Appear multiple times across different pages
- Have consistent styling
- Serve a clear communication purpose
- Could be reused for similar content

Do NOT include:
- One-off decorative elements
- Basic HTML elements without custom styling
- Navigation or footer elements (unless they contain notable components)

Return your analysis as JSON:
{
  "components": [
    {
      "name": "Component Name",
      "purpose": "What this component communicates",
      "visualDescription": "Detailed visual characteristics",
      "usageContext": "Where and when this is used",
      "occurrences": 3,
      "confidence": 0.9
    }
  ],
  "brandObservations": "Overall notes about the brand's visual language"
}`;

// --- AI Calling Functions ---

interface AIImage {
  base64: string;
  mimeType: string;
  url: string;
}

async function callAnthropic(
  prompt: string,
  images: AIImage[],
  apiKey: string,
  model: string = 'claude-sonnet-4-20250514'
): Promise<string> {
  const content: any[] = images.map(img => ({
    type: 'image',
    source: {
      type: 'base64',
      media_type: img.mimeType,
      data: img.base64,
    },
  }));
  content.push({ type: 'text', text: prompt });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 8192,
        messages: [{ role: 'user', content }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const textBlock = data.content?.find((block: any) => block.type === 'text');
    return textBlock?.text || '';
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Anthropic API request timed out');
    }
    throw error;
  }
}

async function callGemini(
  prompt: string,
  images: AIImage[],
  apiKey: string,
  model: string = 'gemini-2.0-flash'
): Promise<string> {
  const parts: any[] = images.map(img => ({
    inline_data: {
      mime_type: img.mimeType,
      data: img.base64,
    },
  }));
  parts.push({ text: prompt });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const url = `${GEMINI_API_URL}/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          maxOutputTokens: 8192,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Gemini API request timed out');
    }
    throw error;
  }
}

// --- Response Parsing ---

interface AnalysisResult {
  components: Array<{
    name: string;
    purpose: string;
    visualDescription: string;
    usageContext: string;
    occurrences: number;
    confidence: number;
  }>;
  brandObservations: string;
}

function parseAnalysis(response: string): AnalysisResult {
  // Extract JSON from response (might be wrapped in markdown code blocks)
  const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error('Could not parse AI response as JSON');
  }

  const jsonStr = jsonMatch[1] || jsonMatch[0];
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    throw new Error(`Failed to parse JSON from AI response: ${e}`);
  }
}

// --- Screenshot Service Integration (TODO) ---
// For now, screenshots must be provided in the request.
// Future enhancement: integrate with screenshotone.com, browserless.io, or similar.

async function captureScreenshotsExternal(
  _urls: string[],
  _apiKey?: string
): Promise<Screenshot[]> {
  // TODO: Implement external screenshot service integration
  // Options:
  // 1. screenshotone.com - Simple API, pay-per-screenshot
  // 2. browserless.io - Headless Chrome as a service
  // 3. urlbox.io - Screenshot API with many options
  // 4. Custom Playwright service deployed separately
  throw new Error(
    'External screenshot capture not yet implemented. Please provide pre-captured screenshots with base64Data in the request.'
  );
}

// --- Main Analysis Function ---

async function analyzeScreenshots(
  screenshots: Screenshot[],
  aiProvider: 'anthropic' | 'gemini',
  apiKey: string,
  options?: {
    customPrompt?: string;
    model?: string;
    minOccurrences?: number;
    confidenceThreshold?: number;
  }
): Promise<{
  components: DiscoveredComponent[];
  rawAnalysis: string;
}> {
  const prompt = options?.customPrompt ?? DISCOVERY_PROMPT;
  const minOccurrences = options?.minOccurrences ?? 1;
  const confidenceThreshold = options?.confidenceThreshold ?? 0.5;

  // Prepare images for AI
  const images = screenshots
    .filter(s => s.base64Data)
    .map(s => ({
      url: s.url,
      base64: s.base64Data!,
      mimeType: s.mimeType ?? 'image/png',
    }));

  if (images.length === 0) {
    throw new Error(
      'No screenshots with base64Data provided. Screenshots must include base64Data for visual analysis.'
    );
  }

  console.log(`[brand-discovery] Analyzing ${images.length} screenshots with ${aiProvider}`);

  // Call AI based on provider
  let response: string;
  if (aiProvider === 'anthropic') {
    response = await callAnthropic(prompt, images, apiKey, options?.model);
  } else {
    response = await callGemini(prompt, images, apiKey, options?.model);
  }

  // Parse response
  const analysis = parseAnalysis(response);

  // Convert to DiscoveredComponent format and filter by thresholds
  const components = analysis.components
    .filter(c => c.occurrences >= minOccurrences)
    .filter(c => c.confidence >= confidenceThreshold)
    .map((c, index) => ({
      id: `discovered-${Date.now()}-${index}`,
      name: c.name,
      purpose: c.purpose,
      visualDescription: c.visualDescription,
      usageContext: c.usageContext,
      sourceScreenshots: screenshots.map(s => s.url),
      occurrences: c.occurrences,
      confidence: c.confidence,
    }));

  return {
    components,
    rawAnalysis: response,
  };
}

// --- Main Handler ---

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const startTime = Date.now();

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, origin);
  }

  try {
    // Parse request
    let body: DiscoveryRequest;
    try {
      const rawBody = await req.text();
      if (!rawBody || rawBody.trim() === '') {
        return json({ error: 'Empty request body' }, 400, origin);
      }
      body = JSON.parse(rawBody);
    } catch (parseError: any) {
      console.error('[brand-discovery] JSON parse error:', parseError.message);
      return json({
        error: 'Invalid JSON in request body',
        details: parseError.message
      }, 400, origin);
    }

    // Validate required fields
    const { brandUrl, brandId, aiProvider, apiKey, screenshots, pagesToAnalyze, options } = body;

    if (!brandUrl) {
      return json({ error: 'brandUrl is required' }, 400, origin);
    }
    if (!brandId) {
      return json({ error: 'brandId is required' }, 400, origin);
    }
    if (!aiProvider || !['anthropic', 'gemini'].includes(aiProvider)) {
      return json({ error: 'aiProvider must be "anthropic" or "gemini"' }, 400, origin);
    }
    if (!apiKey) {
      return json({ error: 'apiKey is required for AI vision analysis' }, 400, origin);
    }

    console.log(`[brand-discovery] Starting discovery for brand ${brandId} at ${brandUrl}`);
    console.log(`[brand-discovery] AI provider: ${aiProvider}, screenshots provided: ${screenshots?.length ?? 0}`);

    // Determine screenshots to analyze
    let screenshotsToAnalyze: Screenshot[] = screenshots || [];

    // If no screenshots provided but pagesToAnalyze given, try to capture
    if (screenshotsToAnalyze.length === 0 && pagesToAnalyze && pagesToAnalyze.length > 0) {
      try {
        screenshotsToAnalyze = await captureScreenshotsExternal(pagesToAnalyze);
      } catch (e: any) {
        console.error('[brand-discovery] Screenshot capture failed:', e.message);
        return json({
          error: 'No screenshots provided and external capture not available',
          details: e.message,
          suggestion: 'Please provide screenshots with base64Data in the request body'
        }, 400, origin);
      }
    }

    // If still no screenshots, try the brandUrl
    if (screenshotsToAnalyze.length === 0) {
      try {
        screenshotsToAnalyze = await captureScreenshotsExternal([brandUrl]);
      } catch (e: any) {
        console.error('[brand-discovery] Screenshot capture failed:', e.message);
        return json({
          error: 'No screenshots available for analysis',
          details: e.message,
          suggestion: 'Please provide screenshots with base64Data in the request body. Each screenshot should have: url, path, timestamp, viewport, and base64Data (the image encoded as base64).'
        }, 400, origin);
      }
    }

    // Validate screenshots have base64Data
    const validScreenshots = screenshotsToAnalyze.filter(s => s.base64Data);
    if (validScreenshots.length === 0) {
      return json({
        error: 'No valid screenshots with base64Data provided',
        suggestion: 'Screenshots must include base64Data field containing the base64-encoded image data'
      }, 400, origin);
    }

    // Perform analysis
    const { components, rawAnalysis } = await analyzeScreenshots(
      validScreenshots,
      aiProvider,
      apiKey,
      options
    );

    const elapsed = Date.now() - startTime;
    console.log(`[brand-discovery] Analysis complete in ${elapsed}ms. Found ${components.length} components.`);

    // Build response
    const output: DiscoveryOutput = {
      brandId,
      brandUrl,
      analyzedPages: validScreenshots.map(s => s.url),
      screenshots: validScreenshots.map(s => ({
        url: s.url,
        path: s.path,
        timestamp: s.timestamp,
        viewport: s.viewport,
        // Don't return base64Data in response to reduce payload size
        mimeType: s.mimeType,
      })),
      discoveredComponents: components,
      rawAnalysis,
      timestamp: new Date().toISOString(),
      status: components.length > 0 ? 'success' : 'partial',
    };

    if (components.length === 0) {
      output.errors = ['No components met the confidence threshold. Try adjusting minOccurrences or confidenceThreshold.'];
    }

    return json(output, 200, origin);

  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.error(`[brand-discovery] Error after ${elapsed}ms:`, error);

    // Provide helpful error messages
    let errorMessage = error.message || 'Internal server error';
    let suggestion = '';

    if (errorMessage.includes('Anthropic API error (401)')) {
      suggestion = 'Your Anthropic API key may be invalid. Please check your API key.';
    } else if (errorMessage.includes('Gemini API error (401)')) {
      suggestion = 'Your Gemini API key may be invalid. Please check your API key.';
    } else if (errorMessage.includes('timed out')) {
      suggestion = 'The AI analysis took too long. Try with fewer or smaller screenshots.';
    } else if (errorMessage.includes('parse')) {
      suggestion = 'The AI response could not be parsed. This may be a temporary issue - please try again.';
    }

    return json({
      error: errorMessage,
      suggestion,
      elapsed_ms: elapsed,
      status: 'failed'
    }, 500, origin);
  }
});
