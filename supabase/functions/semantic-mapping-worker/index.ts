// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { decrypt } from '../_shared/crypto.ts';

// --- START Inlined Utility Functions ---
function corsHeaders(origin = "*") {
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
  origin = "*",
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
  const origin = req.headers.get("origin") ?? "*";
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

    // --- SECURE KEY FETCHING & DECRYPTION ---
    const { data: project, error: projectError } = await supabaseClient.from('projects').select('user_id').eq('id', project_id).single();
    if (projectError || !project) throw new Error(`Project not found: ${project_id}`);
    
    const { data: settings, error: settingsError } = await supabaseClient.from('settings').select('*').eq('user_id', project.user_id).single();
    if (settingsError || !settings) throw new Error(`AI settings not found for the project's owner.`);

    const settingName = `${settings.ai_provider}_api_key_encrypted`; // e.g., 'openai_api_key_encrypted'
    const encryptedKey = (settings as Record<string, any>)[settingName];
    if (!encryptedKey) throw new Error(`API key for provider '${settings.ai_provider}' is not configured.`);
    
    const apiKey = await decrypt(encryptedKey);
    if (!apiKey) throw new Error(`Failed to decrypt API key for provider '${settings.ai_provider}'.`);
    // --- END SECURE KEY FETCHING & DECRYPTION ---

    console.log(`Placeholder: Starting semantic mapping for project ${project_id} using ${settings.ai_provider}.`);

    // Here you would fetch all pages and send to the selected AI provider using the decrypted API key for analysis.
    // For now, we'll just update the status and trigger the next worker.

    await supabaseClient.from('projects').update({ 
        status: 'gap_analysis', 
        status_message: 'Semantic mapping complete. Starting gap analysis.' 
    }).eq('id', project_id);
    
    fetch(`${getFunctionsBase(getEnvVar('PROJECT_URL'))}/gap-analysis-worker`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getEnvVar('SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id })
    }).catch(e => console.error(`Failed to invoke gap-analysis-worker for project ${project_id}:`, e.message));

    return json({ ok: true, message: "Semantic mapping complete (placeholder). Gap analysis initiated." }, 202, origin);

  } catch (error) {
    console.error('Semantic mapping worker error:', error.message);
    if(project_id) {
      await supabaseClient.from('projects').update({ status: 'error', status_message: `Semantic mapping failed: ${error.message}` }).eq('id', project_id);
    }
    return json({ ok: false, error: error.message }, 500, origin)
  }
})