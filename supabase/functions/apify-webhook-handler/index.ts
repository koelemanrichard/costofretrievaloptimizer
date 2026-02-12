// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// --- START Inlined from _shared/utils.ts ---
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
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}

function getEnvVar(name: string): string {
  const value = (globalThis as any).Deno.env.get(name);
  if (!value) {
    console.warn(`Environment variable ${name} is not set.`);
  }
  return value;
}

function getFunctionsBase(supabaseUrl: string): string {
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
// --- END Inlined from _shared/utils.ts ---

;(globalThis as any).Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) })
  }

  try {
    const payload = await req.json();
    const { eventType, resource } = payload;
    const runId = resource?.id;
    const datasetId = resource?.defaultDatasetId;

    if (!eventType || !resource || !runId) {
        return json({ ok: false, error: 'Invalid Apify webhook payload. Missing eventType, resource, or resource.id' }, 400, origin);
    }

    const supabaseClient = createClient(
        getEnvVar('PROJECT_URL')!,
        getEnvVar('SERVICE_ROLE_KEY')!
    );

    const { data: session, error: sessionError } = await supabaseClient
      .from('crawl_sessions')
      .select('project_id')
      .eq('id', runId)
      .single();

    if (sessionError) {
      console.warn(`Webhook for run ID ${runId} received, but no matching session was found. It might have been processed already or is invalid. Error: ${sessionError.message}`);
      // Acknowledge the webhook to prevent Apify from retrying.
      return json({ ok: true, message: 'Webhook acknowledged but no matching session found.' }, 200, origin);
    }
    
    const projectId = session.project_id;
    const isSuccess = eventType === 'ACTOR.RUN.SUCCEEDED';
    const status = isSuccess ? 'processing_crawl_results' : 'error';
    const statusMessage = isSuccess 
        ? `Crawl complete. Found ${resource.output.itemsCount} pages. Processing results...` 
        : `Crawl failed with status: ${eventType}. Run ID: ${runId}`;

    // Update crawl session in discovery schema
    await supabaseClient
      .from('crawl_sessions')
      .update({ 
          status: resource.status, // Use status from resource for more detail (e.g., SUCCEEDED, FAILED)
          status_message: statusMessage,
          finished_at: new Date(resource.finishedAt).toISOString()
      })
      .eq('id', runId);
    
    // Update main project status
    await supabaseClient
      .from('projects')
      .update({ status, status_message: statusMessage })
      .eq('id', projectId);

    if (isSuccess) {
        // Trigger the next worker
        // Use invoke to handle async call more reliably inside edge function
        await supabaseClient.functions.invoke('crawl-results-worker', {
            body: { project_id: projectId, dataset_id: datasetId }
        })
    }

    return json({ ok: true, message: 'Webhook processed successfully.' }, 200, origin);

  } catch (error) {
    console.error('Apify webhook handler error:', error.message, error.stack);
    // Even if we fail, return 200 to prevent Apify retries for a hook that will likely fail again.
    // The error is logged for debugging.
    return json({ ok: false, error: `Internal Server Error: ${error.message}` }, 200, origin);
  }
});