// supabase/functions/anthropic-proxy/index.ts
// Proxy for Anthropic API calls to avoid CORS issues in browser environments
// deno-lint-ignore-file no-explicit-any

const Deno = (globalThis as any).Deno;

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

function corsHeaders(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-anthropic-api-key",
  };
}

function json(body: any, status = 200, origin = "*") {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "*";

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

    // Get the request body
    const body = await req.json();

    // Validate required fields
    if (!body.model || !body.messages) {
      return json({ error: 'Missing required fields: model and messages' }, 400, origin);
    }

    // Forward the request to Anthropic
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
      }),
    });

    // Check for errors from Anthropic
    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      console.error('[anthropic-proxy] Anthropic API error:', errorText);
      return json(
        { error: `Anthropic API error: ${anthropicResponse.status} ${anthropicResponse.statusText}`, details: errorText },
        anthropicResponse.status,
        origin
      );
    }

    // Return the Anthropic response
    const data = await anthropicResponse.json();
    return json(data, 200, origin);

  } catch (error) {
    console.error('[anthropic-proxy] Function error:', error);
    return json({ error: error.message || 'Internal server error' }, 500, origin);
  }
});
