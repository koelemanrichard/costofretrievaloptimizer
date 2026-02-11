// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// --- START Inlined Utility Functions ---
// This code is normally in `_shared/utils.ts` but has been inlined
// to make this function a single, self-contained file for manual deployment.

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
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET, PUT, DELETE, PATCH",
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


const Deno = (globalThis as any).Deno;

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) })
  }

  // This is a placeholder implementation.
  try {
    const { project_id } = await req.json();
    console.log(`Placeholder: Starting analysis for project_id: ${project_id}`);
    
    // Initialize Supabase client
    const supabaseClient = createClient(
        getEnvVar('PROJECT_URL')!,
        getEnvVar('SERVICE_ROLE_KEY')!
    );

    // Simulate starting the process
    await supabaseClient.from('projects').update({ status: 'queued', status_message: 'Analysis has been queued.' }).eq('id', project_id);
    
    // Asynchronously invoke the next step (sitemap-discovery)
    fetch(`${getFunctionsBase(getEnvVar('PROJECT_URL'))}/sitemap-discovery`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getEnvVar('SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ project_id })
    }).catch(e => console.error(`Failed to invoke sitemap-discovery for project ${project_id}:`, e.message));

    return json({ ok: true, message: "Analysis started (placeholder).", data: { project_id } }, 202, origin);

  } catch (error) {
    console.error("Error in start-website-analysis:", error);
    return json({ ok: false, error: error.message }, 500, origin)
  }
})
