// Implemented the update-settings Supabase Edge Function to securely handle saving user settings, including encryption of sensitive API keys.
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encrypt } from '../_shared/crypto.ts';

// --- START Inlined Utility Functions ---
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
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

function getEnvVar(name: string): string {
  const Deno = (globalThis as any).Deno;
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`FATAL: Environment variable ${name} is not set.`);
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

const keysToEncrypt = [
    'dataforseoLogin', 'dataforseoPassword', 'apifyToken',
    'infranodusApiKey', 'jinaApiKey', 'firecrawlApiKey',
    'apitemplateApiKey', 'geminiApiKey', 'openAiApiKey', 'anthropicApiKey',
    'perplexityApiKey', 'openRouterApiKey', 'neo4jUri',
    'neo4jUser', 'neo4jPassword', 'cloudinaryApiKey', 'markupGoApiKey'
];

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) })
  }
  
  try {
    const newSettings = await req.json();
    
    // 1. Authenticate user
    const supabaseAuthClient = createClient(
      getEnvVar('PROJECT_URL'),
      getEnvVar('ANON_KEY'),
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await supabaseAuthClient.auth.getUser();
    if (userError || !user) {
      throw new Error(`Authentication failed: ${userError?.message || 'No user found.'}`);
    }

    // 2. Encrypt sensitive fields
    const encryptedSettings = { ...newSettings };
    for (const key of keysToEncrypt) {
        // Only encrypt if a non-empty value is provided. This prevents encrypting empty strings on every save.
        if (newSettings[key]) {
            encryptedSettings[key] = await encrypt(newSettings[key]);
        }
    }
    
    // 3. Upsert settings into database
    const serviceRoleClient = createClient(getEnvVar('PROJECT_URL'), getEnvVar('SERVICE_ROLE_KEY'));
    
    const { error: upsertError } = await serviceRoleClient
      .from('user_settings')
      .upsert({
        user_id: user.id,
        settings_data: encryptedSettings,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (upsertError) {
      console.error("Supabase upsert error:", upsertError);
      throw new Error(`Could not save settings: ${upsertError.message}`);
    }
    
    // 4. Return success response (without sensitive data)
    const safeSettings = { ...encryptedSettings };
    keysToEncrypt.forEach(key => {
        if(safeSettings[key]) {
            safeSettings[key] = '[ENCRYPTED]'; // Return a placeholder instead of the encrypted value
        }
    });
    
    return json({ ok: true, message: "Settings saved successfully.", settings: safeSettings }, 200, origin);

  } catch (error) {
    console.error("[update-settings] Function crashed:", error);
    return json({ ok: false, error: error.message }, 500, origin)
  }
})
