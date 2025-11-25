// supabase/functions/fetch-proxy/index.ts
// Generic proxy for external URL fetching to avoid CORS issues in browser environments
// deno-lint-ignore-file no-explicit-any

const Deno = (globalThis as any).Deno;

function corsHeaders(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    const body = await req.json();
    const { url, method = 'GET', headers: customHeaders = {} } = body;

    if (!url) {
      return json({ error: 'Missing required field: url' }, 400, origin);
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return json({ error: 'Invalid URL format' }, 400, origin);
    }

    // Default headers for web requests
    const fetchHeaders: Record<string, string> = {
      'User-Agent': 'HolisticSEO-SiteAnalyzer/1.0',
      'Accept': '*/*',
      ...customHeaders,
    };

    // Make the request
    const response = await fetch(url, {
      method: method.toUpperCase(),
      headers: fetchHeaders,
      redirect: 'follow',
    });

    // Get response details
    const contentType = response.headers.get('content-type') || '';
    const isText = contentType.includes('text') ||
                   contentType.includes('xml') ||
                   contentType.includes('json') ||
                   contentType.includes('html');

    let responseBody: any;
    if (isText) {
      responseBody = await response.text();
    } else {
      // For binary content, return base64
      const buffer = await response.arrayBuffer();
      responseBody = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    }

    return json({
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      contentType,
      body: responseBody,
      isBase64: !isText,
    }, 200, origin);

  } catch (error: any) {
    console.error('[fetch-proxy] Error:', error);
    return json({
      error: error.message || 'Fetch failed',
      ok: false,
      status: 0,
    }, 200, origin); // Return 200 with error in body so client can handle
  }
});
