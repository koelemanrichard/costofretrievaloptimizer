// deno-lint-ignore-file no-explicit-any

/**
 * PageSpeed Integration Edge Function
 *
 * Fetches Google PageSpeed Insights / CrUX data for audit enrichment:
 * - Core Web Vitals (LCP, INP, CLS)
 * - Performance score
 * - Opportunities and diagnostics
 *
 * Uses the PageSpeed Insights API (free, API key optional for higher quota).
 */

function getEnvVar(name: string): string {
  const Deno = (globalThis as any).Deno;
  const value = Deno.env.get(name);
  if (!value) {
    console.warn(`Environment variable ${name} is not set.`);
  }
  return value || "";
}

const ALLOWED_ORIGINS = [
  'https://holistic-seo-topical-map-generator.vercel.app',
  'https://app.cutthecrap.net',
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
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

const Deno = (globalThis as any).Deno;

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  try {
    const { url, strategy, categories } = await req.json();

    if (!url) {
      return json({ error: "Missing url parameter" }, 400, origin);
    }

    const apiKey = getEnvVar("GOOGLE_PAGESPEED_API_KEY");
    const deviceStrategy = strategy || 'mobile';
    const categoryList = categories || ['performance', 'accessibility', 'seo'];

    // Build PageSpeed Insights API URL
    const params = new URLSearchParams({
      url,
      strategy: deviceStrategy,
    });

    for (const cat of categoryList) {
      params.append('category', cat);
    }

    if (apiKey) {
      params.set('key', apiKey);
    }

    const psiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`;

    const psiResponse = await fetch(psiUrl);

    if (!psiResponse.ok) {
      const errorText = await psiResponse.text();
      return json({
        error: `PageSpeed API error: ${psiResponse.status}`,
        details: errorText,
      }, psiResponse.status, origin);
    }

    const psiData = await psiResponse.json();

    // Extract Core Web Vitals from CrUX data
    const loadingExperience = psiData.loadingExperience || {};
    const metrics = loadingExperience.metrics || {};

    const coreWebVitals = {
      lcp: extractMetric(metrics, 'LARGEST_CONTENTFUL_PAINT_MS'),
      inp: extractMetric(metrics, 'INTERACTION_TO_NEXT_PAINT'),
      cls: extractMetric(metrics, 'CUMULATIVE_LAYOUT_SHIFT_SCORE'),
      fcp: extractMetric(metrics, 'FIRST_CONTENTFUL_PAINT_MS'),
      ttfb: extractMetric(metrics, 'EXPERIMENTAL_TIME_TO_FIRST_BYTE'),
    };

    // Extract Lighthouse scores
    const categories_result: any = {};
    for (const [key, value] of Object.entries(psiData.lighthouseResult?.categories || {})) {
      categories_result[key] = {
        score: Math.round(((value as any).score || 0) * 100),
        title: (value as any).title,
      };
    }

    // Extract key audits/opportunities
    const audits = psiData.lighthouseResult?.audits || {};
    const opportunities: any[] = [];
    const diagnostics: any[] = [];

    for (const [id, audit] of Object.entries(audits)) {
      const a = audit as any;
      if (!a.score || a.score >= 0.9) continue;

      const item = {
        id,
        title: a.title,
        description: a.description,
        score: Math.round((a.score || 0) * 100),
        displayValue: a.displayValue,
      };

      if (a.details?.type === 'opportunity') {
        opportunities.push({
          ...item,
          savings: a.details?.overallSavingsMs,
        });
      } else {
        diagnostics.push(item);
      }
    }

    // Sort by impact
    opportunities.sort((a, b) => (b.savings || 0) - (a.savings || 0));

    return json({
      ok: true,
      url,
      strategy: deviceStrategy,
      coreWebVitals,
      categories: categories_result,
      opportunities: opportunities.slice(0, 10),
      diagnostics: diagnostics.slice(0, 10),
      overallCategory: loadingExperience.overall_category || 'NONE',
    }, 200, origin);

  } catch (error: any) {
    console.error("PageSpeed integration error:", error);
    return json({ error: error.message }, 500, origin);
  }
});

function extractMetric(metrics: any, key: string): any {
  const metric = metrics[key];
  if (!metric) return null;

  return {
    percentile: metric.percentile,
    category: metric.category, // 'FAST', 'AVERAGE', 'SLOW'
    distributions: metric.distributions?.map((d: any) => ({
      min: d.min,
      max: d.max,
      proportion: Math.round((d.proportion || 0) * 100),
    })),
  };
}
