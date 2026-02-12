// supabase/functions/get-settings/index.ts
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { decrypt } from '../_shared/crypto.ts';

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

const keysToDecrypt = [
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
    const supabaseAuthClient = createClient(
      getEnvVar('PROJECT_URL'),
      getEnvVar('ANON_KEY'),
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await supabaseAuthClient.auth.getUser();
    if (userError || !user) {
      throw new Error(`Authentication failed: ${userError?.message || 'No user found.'}`);
    }

    const serviceRoleClient = createClient(getEnvVar('PROJECT_URL'), getEnvVar('SERVICE_ROLE_KEY'));
    
    const { data, error: selectError } = await serviceRoleClient
        .from('user_settings')
        .select('settings_data')
        .eq('user_id', user.id)
        .single();

    if (selectError) {
        // If no row is found, it's not an error, just return an empty object.
        if (selectError.code === 'PGRST116') {
            return json({}, 200, origin);
        }
        throw selectError;
    }

    if (!data || !data.settings_data) {
        return json({}, 200, origin);
    }

    const settings = data.settings_data as Record<string, any>;
    const decryptedSettings: Record<string, any> = { ...settings };

    for (const key of keysToDecrypt) {
        if (settings[key]) {
            try {
                const decryptedValue = await decrypt(settings[key]);
                // We send back the decrypted value for the user to edit.
                // It's in a password field on the client.
                decryptedSettings[key] = decryptedValue;
            } catch (e) {
                console.warn(`Could not decrypt key "${key}" for user ${user.id}. It may be corrupted or was saved before encryption was implemented. Sending empty string.`);
                decryptedSettings[key] = "";
            }
        }
    }
    
    return json(decryptedSettings, 200, origin);

  } catch (error) {
    console.error("[get-settings] Function crashed:", error);
    return json({ ok: false, error: error.message }, 500, origin)
  }
})
