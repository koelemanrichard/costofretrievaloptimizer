// deno-lint-ignore-file no-explicit-any
// --- START Inlined from _shared/utils.ts ---
const ALLOWED_ORIGINS = [
  'https://holistic-seo-topical-map-generator.vercel.app',
  'https://cost-of-retreival-reducer.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
];

export function corsHeaders(requestOrigin?: string | null) {
  const origin = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)
    ? requestOrigin
    : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET, PUT, DELETE, PATCH",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}

export function getEnvVar(name: string): string {
  const value = (globalThis as any).Deno.env.get(name);
  if (!value) {
    console.warn(`Environment variable ${name} is not set.`);
  }
  return value;
}

export function getSupabaseUrl(req: Request): string {
  // Prefer the environment variable for consistency in backend functions.
  const envUrl = getEnvVar("PROJECT_URL");
  if (envUrl) return envUrl;
  
  // Fallback for client-side headers if needed, though env var is better.
  const headerUrl = req.headers.get("x-supabase-api-base");
  if (headerUrl) return headerUrl;

  throw new Error(
    "Missing PROJECT_URL. It should be set as a secret for the function.",
  );
}

export function getFunctionsBase(supabaseUrl: string): string {
  return `${supabaseUrl}/functions/v1`;
}

export function json(
  body: any,
  status = 200,
  origin?: string | null,
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
// --- END Inlined from _shared/utils.ts ---

// --- Original function logic ---
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const APIFY_API_BASE = 'https://api.apify.com/v2'

;(globalThis as any).Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const { project_id, dataset_id, from_empty_crawl } = await req.json()
  const supabaseClient = createClient(
      getEnvVar('PROJECT_URL')!,
      getEnvVar('SERVICE_ROLE_KEY')!
  )
  try {
    if (!project_id) {
      return json({ ok: false, error: 'project_id is required' }, 400, origin)
    }

    if (from_empty_crawl) {
      await supabaseClient.from('projects').update({ status: 'semantic_mapping', status_message: 'Content analysis complete. Starting semantic mapping.' }).eq('id', project_id)
      await supabaseClient.functions.invoke('semantic-mapping-worker', { body: { project_id } });
      return json({ ok: true, message: "Skipping results processing due to empty crawl queue." }, 200, origin);
    }

    if (!dataset_id) {
      return json({ ok: false, error: 'dataset_id is required' }, 400, origin)
    }

    const { data: project, error: projectError } = await supabaseClient
      .from('projects')
      .select('apify_token')
      .eq('id', project_id)
      .single()

    if (projectError || !project) throw new Error(`Project not found: ${project_id}`)

    const apifyToken = project.apify_token || getEnvVar('APIFY_API_KEY')
    if (!apifyToken) throw new Error('Apify token is required.')

    const resultsUrl = `${APIFY_API_BASE}/datasets/${dataset_id}/items?token=${apifyToken}&format=json`
    const resultsResponse = await fetch(resultsUrl)
    if (!resultsResponse.ok) throw new Error(`Failed to fetch Apify dataset: ${resultsResponse.statusText}`)
    
    const crawledPages = await resultsResponse.json()
    
    const analysisPromises = crawledPages.map(async (page: any) => {
      if (!page.url || !page.html) return null;

      const { data: analysisData, error: analysisError } = await supabaseClient.functions.invoke('content-analyzer', {
          body: { html: page.html }
      });

      if (analysisError) {
          console.error(`Failed to analyze content for ${page.url}:`, analysisError.message);
          return null;
      }

      return {
          project_id,
          url: page.url,
          status: 'crawled',
          content_layers: analysisData.contentLayers,
          word_count: analysisData.wordCount,
          last_crawled_at: new Date().toISOString()
      };
    });

    const pageUpdates = (await Promise.all(analysisPromises)).filter(Boolean);
    
    if (pageUpdates.length > 0) {
        const { error: rpcError } = await supabaseClient.rpc('update_crawled_pages', { page_updates: pageUpdates as any });
        if (rpcError) throw rpcError;
    }
    
    await supabaseClient.from('projects').update({ status: 'semantic_mapping', status_message: 'Content analysis complete. Starting semantic mapping.' }).eq('id', project_id)

    await supabaseClient.functions.invoke('semantic-mapping-worker', { body: { project_id } })

    return json({ ok: true, message: `Processed ${pageUpdates.length} pages.` }, 200, origin)
  } catch (error) {
    console.error('Crawl results worker error:', error)
    if(project_id) {
      await supabaseClient.from('projects').update({ status: 'error', status_message: `Processing crawl results failed: ${error.message}` }).eq('id', project_id);
    }
    return json({ ok: false, error: error.message }, 500, origin)
  }
})