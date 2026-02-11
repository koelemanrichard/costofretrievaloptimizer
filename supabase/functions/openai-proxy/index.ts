// supabase/functions/openai-proxy/index.ts
// Proxy for OpenAI API calls to avoid CORS issues in browser environments
// Supports both regular and streaming requests
// deno-lint-ignore-file no-explicit-any

const Deno = (globalThis as any).Deno;

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
// Supabase Edge Functions Pro plan limits:
// - Request timeout: 150 seconds
// - Wall clock timeout: 400 seconds
// Set internal timeout to 145 seconds to maximize Pro plan limit while leaving buffer for response handling
const FETCH_TIMEOUT_MS = 145000; // 145 seconds

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
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-openai-api-key, x-stream-response",
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
    const apiKey = req.headers.get('x-openai-api-key');
    if (!apiKey) {
      return json({ error: 'Missing OpenAI API key' }, 400, origin);
    }

    // Get the request body
    const body = await req.json();

    // Validate required fields
    if (!body.model || !body.messages) {
      return json({ error: 'Missing required fields: model and messages' }, 400, origin);
    }

    // Check if client wants streaming
    const wantStreaming = body.stream === true;

    console.log(`[openai-proxy] Starting request to model: ${body.model}, streaming: ${wantStreaming}`);

    // Create AbortController for timeout management
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.error(`[openai-proxy] Request timed out after ${FETCH_TIMEOUT_MS}ms`);
    }, FETCH_TIMEOUT_MS);

    try {
      // Build the request body for OpenAI
      const openaiBody: any = {
        model: body.model,
        messages: body.messages,
        stream: wantStreaming,
      };

      // Handle max_tokens vs max_completion_tokens based on model
      if (body.max_tokens) {
        // For o1/o3 models, use max_completion_tokens
        if (body.model.startsWith('o1') || body.model.startsWith('o3')) {
          openaiBody.max_completion_tokens = body.max_tokens;
        } else {
          openaiBody.max_tokens = body.max_tokens;
        }
      }

      // Add optional parameters if provided
      if (body.temperature !== undefined) openaiBody.temperature = body.temperature;
      if (body.top_p !== undefined) openaiBody.top_p = body.top_p;
      if (body.response_format) openaiBody.response_format = body.response_format;

      // Forward the request to OpenAI with timeout
      const openaiResponse = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(openaiBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const elapsed = Date.now() - startTime;
      console.log(`[openai-proxy] OpenAI responded in ${elapsed}ms with status ${openaiResponse.status}`);

      // Check for errors from OpenAI
      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        console.error('[openai-proxy] OpenAI API error:', openaiResponse.status, errorText);

        // Parse error for better messages
        let errorMessage = `OpenAI API error: ${openaiResponse.status}`;
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
        switch (openaiResponse.status) {
          case 401:
            suggestion = 'Your OpenAI API key may be invalid or expired. Please check your API key in Settings.';
            if (errorText.includes('invalid_api_key') || errorText.includes('Incorrect API key')) {
              errorMessage = 'Invalid OpenAI API key';
            }
            break;
          case 400:
            if (errorText.includes('model')) {
              suggestion = `The model "${body.model}" may not exist or you may not have access to it.`;
            }
            break;
          case 429:
            suggestion = 'Rate limit exceeded. Please wait a moment before retrying, or switch to another provider.';
            break;
          case 500:
          case 502:
          case 503:
            suggestion = 'OpenAI API is experiencing issues. Please try again later or switch to another provider.';
            break;
        }

        return json(
          {
            error: errorMessage,
            suggestion,
            details: errorText,
            model_requested: body.model
          },
          openaiResponse.status,
          origin
        );
      }

      // If streaming, return the stream directly
      if (wantStreaming && openaiResponse.body) {
        console.log('[openai-proxy] Returning streaming response');
        return new Response(openaiResponse.body, {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            ...corsHeaders(origin),
          },
        });
      }

      // Return the OpenAI response as JSON
      const data = await openaiResponse.json();
      return json(data, 200, origin);

    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      if (fetchError.name === 'AbortError') {
        const elapsed = Date.now() - startTime;
        console.error(`[openai-proxy] Request aborted due to timeout after ${elapsed}ms`);
        return json({
          error: `Request timed out after ${Math.round(elapsed / 1000)} seconds. This can happen with complex content generation requests.`,
          suggestion: 'Try breaking your request into smaller parts, use streaming mode, or switch to another provider.',
          timeout_ms: elapsed
        }, 504, origin);
      }

      throw fetchError;
    }

  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.error(`[openai-proxy] Function error after ${elapsed}ms:`, error);
    return json({
      error: error.message || 'Internal server error',
      elapsed_ms: elapsed
    }, 500, origin);
  }
});
