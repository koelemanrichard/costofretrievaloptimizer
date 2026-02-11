// deno-lint-ignore-file no-explicit-any

// This is a placeholder implementation for the gap-analysis-worker function.
// In a real scenario, this function would:
// 1. Fetch the semantic mapping results for the project.
// 2. Make AI calls to generate an "ideal" topical map based on the central entity.
// 3. Compare the ideal map with the current map to identify gaps.
// 4. Generate a final report and save it to the project's `analysis_result` column.
// 5. Update the project status to "complete".

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
  
  const { project_id } = await req.json()
  const supabaseClient = createClient(
      getEnvVar('PROJECT_URL')!,
      getEnvVar('SERVICE_ROLE_KEY')!
  )

  try {
    if (!project_id) {
      return json({ ok: false, error: 'project_id is required' }, 400, origin)
    }

    console.log(`Placeholder: Starting gap analysis for project ${project_id}`);

    // Simulate analysis and report generation
    const placeholderReport = {
        summary: "The website has a strong foundation but is missing key informational content around advanced features and competitor comparisons.",
        content_gaps: [
            { topic: "Advanced Feature X Guide", reasoning: "No content exists to explain this core feature." },
            { topic: "Product vs. Competitor Y", reasoning: "Users are searching for comparisons but find no direct answer on the site." }
        ],
        content_to_keep: [ "Homepage", "About Us" ],
        content_to_improve: [ { page: "/blog/old-post", reason: "Outdated information and thin content." }]
    };

    // Update project with final results and status
    const { error } = await supabaseClient.from('projects').update({ 
        status: 'complete', 
        status_message: 'Analysis complete. Report is available.',
        analysis_result: placeholderReport
    }).eq('id', project_id);

    if (error) throw error;
    
    return json({ ok: true, message: "Gap analysis complete (placeholder).", report: placeholderReport }, 200, origin);

  } catch (error) {
    console.error('Gap analysis worker error:', error.message);
    if(project_id) {
      await supabaseClient.from('projects').update({ status: 'error', status_message: `Gap analysis failed: ${error.message}` }).eq('id', project_id);
    }
    return json({ ok: false, error: error.message }, 500, origin)
  }
})
