// deno-lint-ignore-file no-explicit-any

/**
 * Google Trends Edge Function
 *
 * Fetches Google Trends data via SerpAPI (Google has no official Trends API).
 * Returns interest over time, related queries, and rising queries.
 *
 * Auth: API key from request body OR SERPAPI_KEY env var.
 * Cost: ~$0.005/query (100 free searches/month on SerpAPI).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { logUsage } from '../_shared/usage.ts'

const Deno = (globalThis as any).Deno;

const ALLOWED_ORIGINS = [
  'https://holistic-seo-topical-map-generator.vercel.app',
  'https://app.cutthecrap.net',
  'https://cost-of-retreival-reducer.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:5173',
];

const SERPAPI_ENDPOINT = 'https://serpapi.com/search.json';

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
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  try {
    const body = await req.json();
    const { query, geo, timeRange, category, apiKey: bodyApiKey } = body;

    if (!query) {
      return json({ error: "Missing query parameter" }, 400, origin);
    }

    // Resolve API key: body param > env var
    const apiKey = bodyApiKey || Deno.env.get('SERPAPI_KEY');
    if (!apiKey) {
      return json({ error: "No SerpAPI key configured" }, 400, origin);
    }

    const startTime = Date.now();

    // Build SerpAPI request for Google Trends
    const params = new URLSearchParams({
      engine: 'google_trends',
      q: query,
      data_type: 'TIMESERIES',
      api_key: apiKey,
    });
    if (geo) params.set('geo', geo);
    if (timeRange) params.set('date', timeRange);
    if (category) params.set('cat', category);

    const response = await fetch(`${SERPAPI_ENDPOINT}?${params}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[google-trends] SerpAPI error:', response.status, errorText);
      return json({
        error: `SerpAPI error: ${response.status}`,
        detail: errorText,
      }, response.status === 401 ? 401 : 502, origin);
    }

    const data = await response.json();

    // Extract interest over time
    const interestOverTime = (data.interest_over_time?.timeline_data || []).map((point: any) => ({
      date: point.date || '',
      value: point.values?.[0]?.extracted_value ?? 0,
    }));

    // Extract related queries
    const relatedQueries = (data.related_queries?.top || []).map((q: any) => ({
      query: q.query || '',
      value: q.value || 0,
    }));

    // Extract rising queries
    const risingQueries = (data.related_queries?.rising || []).map((q: any) => ({
      query: q.query || '',
      value: q.value || 0,
      link: q.link || '',
    }));

    // Log usage — prefer auto-injected SUPABASE_* env vars
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');
    const projectUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('PROJECT_URL');
    if (serviceRoleKey && projectUrl) {
      const serviceClient = createClient(projectUrl, serviceRoleKey);
      logUsage(serviceClient, {
        provider: 'serpapi',
        model: 'google-trends',
        operation: 'trends-query',
        operationDetail: `query="${query}" geo=${geo || 'worldwide'}`,
        tokensIn: 0,
        tokensOut: 1,
        durationMs: Date.now() - startTime,
        success: true,
      }).catch(() => {});
    }

    return json({
      ok: true,
      query,
      geo: geo || 'worldwide',
      interestOverTime,
      relatedQueries,
      risingQueries,
    }, 200, origin);

  } catch (error: any) {
    console.error("[google-trends] Error:", error);
    return json({ error: error.message }, 500, origin);
  }
});
