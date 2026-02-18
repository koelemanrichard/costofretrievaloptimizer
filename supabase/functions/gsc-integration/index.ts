// deno-lint-ignore-file no-explicit-any

/**
 * GSC Integration Edge Function
 *
 * Fetches Google Search Console data for audit enrichment:
 * - Search performance (impressions, clicks, CTR, position)
 * - Index coverage
 * - URL inspection
 *
 * Requires Google OAuth token stored in user settings.
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
    const { siteUrl, accessToken, startDate, endDate, dimensions, rowLimit } = await req.json();

    if (!siteUrl || !accessToken) {
      return json({ error: "Missing siteUrl or accessToken" }, 400, origin);
    }

    // Default to last 28 days
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || (() => {
      const d = new Date();
      d.setDate(d.getDate() - 28);
      return d.toISOString().split('T')[0];
    })();

    // Query GSC Search Analytics API
    const gscResponse = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: start,
          endDate: end,
          dimensions: dimensions || ['page', 'query'],
          rowLimit: rowLimit || 1000,
          dimensionFilterGroups: [],
        }),
      }
    );

    if (!gscResponse.ok) {
      const errorText = await gscResponse.text();
      return json({
        error: `GSC API error: ${gscResponse.status}`,
        details: errorText,
      }, gscResponse.status, origin);
    }

    const gscData = await gscResponse.json();

    // Process and return data
    const rows = (gscData.rows || []).map((row: any) => ({
      page: row.keys?.[0] || '',
      query: row.keys?.[1] || '',
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: Math.round((row.ctr || 0) * 10000) / 100, // Convert to percentage
      position: Math.round((row.position || 0) * 10) / 10,
    }));

    // Aggregate per-page metrics
    const pageMetrics = new Map<string, {
      clicks: number;
      impressions: number;
      avgPosition: number;
      positionCount: number;
      topQueries: { query: string; impressions: number; position: number }[];
    }>();

    for (const row of rows) {
      if (!pageMetrics.has(row.page)) {
        pageMetrics.set(row.page, {
          clicks: 0, impressions: 0, avgPosition: 0, positionCount: 0, topQueries: [],
        });
      }
      const pm = pageMetrics.get(row.page)!;
      pm.clicks += row.clicks;
      pm.impressions += row.impressions;
      pm.avgPosition += row.position;
      pm.positionCount++;
      pm.topQueries.push({ query: row.query, impressions: row.impressions, position: row.position });
    }

    // Finalize averages and sort queries
    const pages = [...pageMetrics.entries()].map(([url, metrics]) => ({
      url,
      clicks: metrics.clicks,
      impressions: metrics.impressions,
      avgPosition: Math.round((metrics.avgPosition / Math.max(metrics.positionCount, 1)) * 10) / 10,
      ctr: metrics.impressions > 0
        ? Math.round((metrics.clicks / metrics.impressions) * 10000) / 100
        : 0,
      topQueries: metrics.topQueries
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 10),
    }));

    return json({
      ok: true,
      siteUrl,
      dateRange: { start, end },
      totalRows: rows.length,
      pages: pages.sort((a: any, b: any) => b.impressions - a.impressions),
    }, 200, origin);

  } catch (error: any) {
    console.error("GSC integration error:", error);
    return json({ error: error.message }, 500, origin);
  }
});
