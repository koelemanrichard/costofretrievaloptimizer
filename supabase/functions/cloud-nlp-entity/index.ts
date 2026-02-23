// deno-lint-ignore-file no-explicit-any

/**
 * Cloud NLP Entity Edge Function
 *
 * Analyzes text using Google Cloud Natural Language API to extract entities
 * with salience scores. Used for Central Entity prominence measurement.
 *
 * Auth: API key from request body OR GOOGLE_CLOUD_NLP_API_KEY env var.
 * Cost: ~$1/1000 documents (5K free/month).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { logUsage } from '../_shared/usage.ts'
import { ENDPOINTS } from '../_shared/serviceConfig.ts'

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

const MAX_TEXT_LENGTH = 10000; // API max is 1MB but we truncate to 10K chars

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
    const { text, language, apiKey: bodyApiKey } = body;

    if (!text) {
      return json({ error: "Missing text parameter" }, 400, origin);
    }

    // Resolve API key: body param > env var
    const apiKey = bodyApiKey || Deno.env.get('GOOGLE_CLOUD_NLP_API_KEY');
    if (!apiKey) {
      return json({ error: "No Google Cloud NLP API key configured" }, 400, origin);
    }

    // Truncate text to limit
    const truncatedText = text.length > MAX_TEXT_LENGTH
      ? text.substring(0, MAX_TEXT_LENGTH)
      : text;

    const startTime = Date.now();

    // Call Google Cloud NLP API
    const nlpUrl = `${ENDPOINTS.GOOGLE_CLOUD_NLP}?key=${apiKey}`;
    const response = await fetch(nlpUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document: {
          type: 'PLAIN_TEXT',
          content: truncatedText,
          language: language || undefined,
        },
        encodingType: 'UTF8',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[cloud-nlp] API error:', response.status, errorText);
      return json({
        error: `Cloud NLP API error: ${response.status}`,
        detail: errorText,
      }, response.status === 403 ? 403 : 502, origin);
    }

    const data = await response.json();
    const entities = (data.entities || []).map((entity: any) => ({
      name: entity.name,
      type: entity.type,
      salience: entity.salience || 0,
      mentions: (entity.mentions || []).map((m: any) => ({
        text: m.text?.content,
        type: m.type,
        beginOffset: m.text?.beginOffset,
      })),
      metadata: entity.metadata || {},
    }));

    // Sort by salience descending
    entities.sort((a: any, b: any) => b.salience - a.salience);

    // Log usage — prefer auto-injected SUPABASE_* env vars
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');
    const projectUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('PROJECT_URL');
    if (serviceRoleKey && projectUrl) {
      const serviceClient = createClient(projectUrl, serviceRoleKey);
      logUsage(serviceClient, {
        provider: 'google',
        model: 'cloud-nlp-entity',
        operation: 'entity-salience',
        operationDetail: `${entities.length} entities extracted from ${truncatedText.length} chars`,
        tokensIn: Math.ceil(truncatedText.length / 4), // approximate token count
        tokensOut: entities.length,
        durationMs: Date.now() - startTime,
        success: true,
      }).catch(() => {});
    }

    return json({
      ok: true,
      entities,
      language: data.language || language || 'unknown',
      textLength: truncatedText.length,
      truncated: text.length > MAX_TEXT_LENGTH,
    }, 200, origin);

  } catch (error: any) {
    console.error("[cloud-nlp] Error:", error);
    return json({ error: error.message }, 500, origin);
  }
});
