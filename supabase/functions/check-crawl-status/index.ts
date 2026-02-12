// deno-lint-ignore-file no-explicit-any
// --- START Inlined from _shared/utils.ts ---
const ALLOWED_ORIGINS = [
  'https://holistic-seo-topical-map-generator.vercel.app',
  'https://app.cutthecrap.net',
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
import { ENDPOINTS } from '../_shared/serviceConfig.ts'

const APIFY_API_BASE = ENDPOINTS.APIFY

;(globalThis as any).Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) })
  }

  try {
    const { project_id } = await req.json()
    if (!project_id) {
      return json({ ok: false, error: 'project_id is required' }, 400, origin)
    }

    const supabaseClient = createClient(
        getEnvVar('PROJECT_URL')!,
        getEnvVar('SERVICE_ROLE_KEY')!
    )

    const { data: session, error: sessionError } = await supabaseClient
      .from('crawl_sessions')
      .select('id, project_id')
      .eq('project_id', project_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (sessionError || !session) throw new Error(`No active crawl session found for project ${project_id}`)

    const runId = session.id;

    const { data: project } = await supabaseClient
      .from('projects')
      .select('apify_token')
      .eq('id', project_id)
      .single()
      
    const apifyToken = project?.apify_token || getEnvVar('APIFY_API_KEY')
    if (!apifyToken) throw new Error('Apify token is required.')

    const statusUrl = `${APIFY_API_BASE}/actor-runs/${runId}?token=${apifyToken}`
    const statusResponse = await fetch(statusUrl)
    if (!statusResponse.ok) throw new Error(`Failed to fetch Apify run status: ${statusResponse.statusText}`)
    
    const { data: runDetails } = await statusResponse.json()

    if (['SUCCEEDED', 'FAILED', 'TIMED_OUT', 'ABORTED'].includes(runDetails.status)) {
        const webhookPayload = {
            eventType: `ACTOR.RUN.${runDetails.status}`,
            resource: runDetails,
        }
        await supabaseClient.functions.invoke('apify-webhook-handler', { body: webhookPayload })
        return json({ ok: true, message: `Crawl is finished with status ${runDetails.status}. Processing results.` }, 200, origin)
    }

    return json({ ok: true, message: `Crawl is still in progress with status: ${runDetails.status}` }, 200, origin)
  } catch (error) {
    console.error('Check crawl status error:', error)
    return json({ ok: false, error: error.message }, 500, origin)
  }
})