// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// --- START Inlined Utility Functions ---
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
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

function getEnvVar(name: string): string {
  const Deno = (globalThis as any).Deno;
  const value = Deno.env.get(name);
  if (!value) {
    console.warn(`Environment variable ${name} is not set.`);
  }
  return value;
}

function getFunctionsBase(supabaseUrl: string): string {
    const envUrl = getEnvVar("PROJECT_URL");
    if(!supabaseUrl && envUrl) supabaseUrl = envUrl;
    return `${supabaseUrl}/functions/v1`;
}

function json(
  body: any,
  status = 200,
  origin?: string | null,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}
// --- END Inlined Utility Functions ---

const APIFY_API_BASE = 'https://api.apify.com/v2';
const WEBSITE_CRAWLER_ACTOR_ID = 'apify/website-content-crawler';

const Deno = (globalThis as any).Deno;

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) })
  }
  
  const { project_id } = await req.json()
  const supabaseClient = createClient(
      getEnvVar('PROJECT_URL')!,
      getEnvVar('SERVICE_ROLE_KEY')!
  )

  try {
    if (!project_id) {
      return json({ ok: false, error: 'project_id is required' }, 400, origin)
    }
    
    const { data: project, error: projectError } = await supabaseClient.from('projects').select('domain, apify_token').eq('id', project_id).single();
    if (projectError || !project) throw new Error(`Project not found: ${project_id}`);
    
    const apifyToken = project.apify_token || getEnvVar('APIFY_API_KEY');
    if (!apifyToken) throw new Error('Apify token is required to start a crawl.');

    // Get pages to crawl
    const { data: pages, error: pagesError } = await supabaseClient.from('pages').select('url').eq('project_id', project_id).eq('status', 'queued');
    if (pagesError) throw pagesError;

    if (!pages || pages.length === 0) {
        await supabaseClient.from('projects').update({ status: 'semantic_mapping', status_message: 'No new pages to crawl. Proceeding to analysis.' }).eq('id', project_id);
        // Trigger next worker directly
        await supabaseClient.functions.invoke('crawl-results-worker', { body: { project_id, from_empty_crawl: true } });
        return json({ ok: true, message: "No pages to crawl, skipping to next step." }, 202, origin);
    }

    const startUrls = pages.map(p => ({ url: p.url }));
    
    // Prepare Apify actor run
    const runInput = {
        startUrls,
        "crawlerType": "cheerio",
        "maxCrawlDepth": 0,
        "maxCrawlPages": startUrls.length,
        "proxyConfiguration": { "useApifyProxy": true },
        "customDataFunction": `async ({ request, body }) => {
            return {
                url: request.url,
                html: body
            };
        };`
    };

    const functionsBase = getFunctionsBase(getEnvVar('PROJECT_URL'));
    const webhookUrl = `${functionsBase}/apify-webhook-handler`;
    
    const startRunUrl = `${APIFY_API_BASE}/acts/${WEBSITE_CRAWLER_ACTOR_ID.replace('/', '~')}/runs?token=${apifyToken}&webhooks=[{"event_types":["ACTOR.RUN.SUCCEEDED","ACTOR.RUN.FAILED","ACTOR.RUN.TIMED_OUT"],"request_url":"${webhookUrl}"}]`;

    const startResponse = await fetch(startRunUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(runInput)
    });

    if (!startResponse.ok) {
        const errorText = await startResponse.text();
        throw new Error(`Apify start run failed: ${errorText}`);
    }
    
    const { data: runDetails } = await startResponse.json();

    // Save crawl session
    const { error: sessionError } = await supabaseClient
        .from('crawl_sessions')
        .insert({
            id: runDetails.id,
            project_id,
            domain: project.domain,
            status: 'RUNNING',
            status_message: 'Crawl initiated on Apify.',
        });

    if (sessionError) {
        console.error("Failed to save crawl session:", sessionError);
        // Don't fail the whole request, but log it.
    }

    // Update project status
    await supabaseClient.from('projects').update({ status: 'crawling', status_message: `Crawling ${startUrls.length} pages... (Run ID: ${runDetails.id})` }).eq('id', project_id);
    
    return json({ ok: true, message: "Crawl started successfully.", data: { runId: runDetails.id } }, 202, origin);

  } catch (error) {
    console.error('Crawl worker error:', error.message);
    if(project_id) {
      await supabaseClient.from('projects').update({ status: 'error', status_message: `Crawl worker failed: ${error.message}` }).eq('id', project_id);
    }
    return json({ ok: false, error: error.message }, 500, origin)
  }
})