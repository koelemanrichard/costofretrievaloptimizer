

// deno-lint-ignore-file no-explicit-any
// --- START Inlined utility functions ---
function corsHeaders(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET, PUT, DELETE, PATCH",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}
function json(
  body: any,
  status = 200,
  origin = "*",
  headers: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
      ...headers,
    },
  });
}
// --- END Inlined utility functions ---

// --- Original function logic ---
import { parseHTML } from 'https://esm.sh/linkedom@0.16.11'

function extractJsonLd(document: any) {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    const schemas = [];
    for (const script of scripts) {
        try {
            schemas.push(JSON.parse(script.textContent));
        } catch (e) {
            console.warn("Failed to parse JSON-LD script:", e);
        }
    }
    return schemas;
}

// FIX: Changed Deno.serve to (globalThis as any).Deno.serve to avoid potential linting errors where the Deno global is not recognized.
;(globalThis as any).Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "*";
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) })
  }

  try {
    const { html } = await req.json()
    if (!html) {
        return json({ error: 'HTML content is required.' }, 400, origin)
    }

    const { document } = parseHTML(html)
    
    document.querySelectorAll('script, style, nav, footer, aside').forEach((el: any) => el.remove());
    
    const textContent = document.body?.textContent?.replace(/\s\s+/g, ' ').trim() || ''
    const wordCount = textContent.split(/\s+/).filter(Boolean).length

    const contentLayers = {
        title: document.querySelector('title')?.textContent || '',
        metaDescription: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
        h1: Array.from(document.querySelectorAll('h1')).map((h: any) => h.textContent.trim()),
        h2: Array.from(document.querySelectorAll('h2')).map((h: any) => h.textContent.trim()),
        jsonLd: extractJsonLd(document),
        rawText: textContent,
    }

    return json({ ok: true, contentLayers, wordCount }, 200, origin)
  } catch (error) {
    console.error('Content analyzer error:', error)
    return json({ ok: false, error: error.message }, 500, origin)
  }
})
