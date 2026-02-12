// supabase/functions/anthropic-proxy/index.ts
// Proxy for Anthropic API calls to avoid CORS issues in browser environments
// Supports both regular and streaming requests
// deno-lint-ignore-file no-explicit-any

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit } from '../_shared/rateLimit.ts';
import { ENDPOINTS } from '../_shared/serviceConfig.ts';

const Deno = (globalThis as any).Deno;

const ANTHROPIC_API_URL = ENDPOINTS.ANTHROPIC;
// Supabase Edge Functions Pro plan limits:
// - Request timeout: 150 seconds
// - Wall clock timeout: 400 seconds
// Set internal timeout to 145 seconds to maximize Pro plan limit while leaving buffer for response handling
const FETCH_TIMEOUT_MS = 145000; // 145 seconds

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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-anthropic-api-key, x-stream-response",
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
    // Get the API key from the request header
    const apiKey = req.headers.get('x-anthropic-api-key');
    if (!apiKey) {
      return json({ error: 'Missing Anthropic API key' }, 400, origin);
    }

    // --- User auth & rate limiting ---
    // Authenticate the calling user via Supabase JWT (if present) and enforce
    // per-user rate limits.  If auth headers are missing or invalid, the
    // request still proceeds (the API-key check above is the primary gate)
    // but rate limiting is skipped.
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('PROJECT_URL');
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('ANON_KEY');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');

        if (supabaseUrl && supabaseAnonKey && serviceRoleKey) {
          const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } },
          });
          const { data: { user } } = await supabaseAuth.auth.getUser();

          if (user) {
            const supabaseService = createClient(supabaseUrl, serviceRoleKey);
            const rateCheck = await checkRateLimit(supabaseService, user.id, 'anthropic-proxy', 60, 1);
            if (!rateCheck.allowed) {
              return json({
                ok: false,
                error: 'Rate limit exceeded. Please wait before making more requests.',
                remaining: rateCheck.remaining,
                reset_at: rateCheck.resetAt,
              }, 429, origin);
            }
          }
        }
      } catch (rateLimitError: any) {
        // Fail open — if rate-limit plumbing errors, allow the request
        console.warn('[anthropic-proxy] Rate limit check failed, allowing request:', rateLimitError?.message);
      }
    }

    // Get the request body with better error handling
    let body: any;
    try {
      const rawBody = await req.text();
      if (!rawBody || rawBody.trim() === '') {
        return json({ error: 'Empty request body' }, 400, origin);
      }
      body = JSON.parse(rawBody);
    } catch (parseError: any) {
      console.error('[anthropic-proxy] JSON parse error:', parseError.message);
      return json({
        error: 'Invalid JSON in request body',
        details: 'The request body could not be parsed as JSON.'
      }, 400, origin);
    }

    // Validate required fields
    if (!body.model || !body.messages) {
      return json({ error: 'Missing required fields: model and messages' }, 400, origin);
    }

    // Check if client wants streaming
    const wantStreaming = body.stream === true;

    console.log(`[anthropic-proxy] Starting request to model: ${body.model}, max_tokens: ${body.max_tokens || 4096}, streaming: ${wantStreaming}`);

    // Create AbortController for timeout management
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.error(`[anthropic-proxy] Request timed out after ${FETCH_TIMEOUT_MS}ms`);
    }, FETCH_TIMEOUT_MS);

    try {
      // Forward the request to Anthropic with timeout
      const anthropicResponse = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: body.model,
          max_tokens: body.max_tokens || 4096,
          messages: body.messages,
          system: body.system,
          stream: wantStreaming,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const elapsed = Date.now() - startTime;
      console.log(`[anthropic-proxy] Anthropic responded in ${elapsed}ms with status ${anthropicResponse.status}`);

      // Check for errors from Anthropic
      if (!anthropicResponse.ok) {
        const errorText = await anthropicResponse.text();
        console.error('[anthropic-proxy] Anthropic API error:', anthropicResponse.status, errorText);

        // Parse error for better messages
        let errorMessage = `Anthropic API error: ${anthropicResponse.status}`;
        let suggestion = '';

        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error?.message) {
            errorMessage = errorJson.error.message;
          }
        } catch {
          // Use raw text if not JSON
        }

        // Provide helpful suggestions based on status code
        switch (anthropicResponse.status) {
          case 401:
            suggestion = 'Your Anthropic API key may be invalid or expired. Please check your API key in Settings.';
            if (errorText.includes('invalid_api_key') || errorText.includes('Could not resolve authentication')) {
              errorMessage = 'Invalid Anthropic API key';
            }
            break;
          case 400:
            if (errorText.includes('model')) {
              suggestion = `The model "${body.model}" may not exist. Valid models include: claude-3-5-sonnet-20241022, claude-3-opus-20240229, claude-3-haiku-20240307`;
            }
            break;
          case 429:
            suggestion = 'Rate limit exceeded. Please wait a moment before retrying, or switch to Gemini.';
            break;
          case 529:
            suggestion = 'Anthropic API is currently overloaded. Please try again later or switch to Gemini.';
            break;
        }

        return json(
          {
            error: errorMessage,
            suggestion,
            details: 'AI provider returned an error. Check server logs for details.'
          },
          anthropicResponse.status,
          origin
        );
      }

      // If streaming, return the stream directly
      if (wantStreaming && anthropicResponse.body) {
        console.log('[anthropic-proxy] Returning streaming response');
        return new Response(anthropicResponse.body, {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            ...corsHeaders(origin),
          },
        });
      }

      // Return the Anthropic response as JSON
      const data = await anthropicResponse.json();
      return json(data, 200, origin);

    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      if (fetchError.name === 'AbortError') {
        const elapsed = Date.now() - startTime;
        console.error(`[anthropic-proxy] Request aborted due to timeout after ${elapsed}ms`);
        return json({
          error: `Request timed out after ${Math.round(elapsed / 1000)} seconds. This can happen with complex content generation requests.`,
          suggestion: 'Try breaking your request into smaller parts, use streaming mode, or switch to Gemini which is typically faster.'
        }, 504, origin);
      }

      throw fetchError;
    }

  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    const errorDetails = {
      message: error.message || 'Unknown error',
      name: error.name || 'Error',
      stack: error.stack?.split('\n').slice(0, 3).join('\n') || 'No stack trace',
    };
    console.error(`[anthropic-proxy] Function error after ${elapsed}ms:`, errorDetails);
    return json({
      error: 'Internal server error',
      details: 'An unexpected error occurred. Check server logs for details.'
    }, 500, origin);
  }
});
