// supabase/functions/get-api-key/index.ts
// Edge function for secure API key retrieval from Vault
//
// This function resolves the correct API key to use based on the hierarchy:
// Project BYOK > Organization BYOK > Organization Platform > Fallback to user settings
//
// IMPORTANT: This function should only be called by other edge functions
// It returns the decrypted API key which should NEVER be exposed to the client
//
// For client-side calls, use the 'info_only' parameter to get billing context only
//
// deno-lint-ignore-file no-explicit-any

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// --- Utility Functions ---
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
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-key",
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

function getOptionalEnvVar(name: string): string | undefined {
  const Deno = (globalThis as any).Deno;
  return Deno.env.get(name);
}

function json(body: any, status = 200, origin?: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}

const Deno = (globalThis as any).Deno;

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) });
  }

  try {
    const body = await req.json();
    const { project_id, provider, info_only = false } = body;

    if (!project_id) {
      return json({ ok: false, error: 'Missing project_id parameter' }, 400, origin);
    }

    if (!provider) {
      return json({ ok: false, error: 'Missing provider parameter' }, 400, origin);
    }

    // Validate provider
    const validProviders = ['anthropic', 'openai', 'google', 'perplexity', 'openrouter'];
    if (!validProviders.includes(provider)) {
      return json({ ok: false, error: `Invalid provider: ${provider}` }, 400, origin);
    }

    // Check if this is an internal call (from another edge function)
    const internalKey = req.headers.get('x-internal-key');
    const isInternalCall = internalKey === getOptionalEnvVar('INTERNAL_FUNCTION_KEY');

    // 1. Authenticate user (for access control)
    const supabaseAuthClient = createClient(
      getEnvVar('PROJECT_URL'),
      getEnvVar('ANON_KEY'),
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await supabaseAuthClient.auth.getUser();
    if (userError || !user) {
      return json({ ok: false, error: `Authentication failed: ${userError?.message || 'No user found.'}` }, 401, origin);
    }

    // 2. Create service role client for privileged operations
    const serviceClient = createClient(
      getEnvVar('PROJECT_URL'),
      getEnvVar('SERVICE_ROLE_KEY')
    );

    // 3. Verify user has access to this project
    const { data: projectMember, error: memberError } = await serviceClient
      .from('project_members')
      .select('role')
      .eq('project_id', project_id)
      .eq('user_id', user.id)
      .single();

    // Also check if user is org member (may have implicit project access)
    const { data: project } = await serviceClient
      .from('projects')
      .select('organization_id, project_name')
      .eq('id', project_id)
      .single();

    let hasAccess = !!projectMember;

    if (!hasAccess && project?.organization_id) {
      const { data: orgMember } = await serviceClient
        .from('organization_members')
        .select('role')
        .eq('organization_id', project.organization_id)
        .eq('user_id', user.id)
        .single();

      hasAccess = !!orgMember;
    }

    if (!hasAccess) {
      return json({ ok: false, error: 'You do not have access to this project' }, 403, origin);
    }

    // 4. Resolve the API key using the database function
    const { data: keyInfo, error: keyError } = await serviceClient.rpc('resolve_api_key', {
      p_project_id: project_id,
      p_provider: provider,
    });

    if (keyError) {
      console.error('[get-api-key] resolve_api_key error:', keyError);
      return json({ ok: false, error: 'Failed to resolve API key' }, 500, origin);
    }

    // If no key found in hierarchy, check user's personal settings as fallback
    if (!keyInfo || keyInfo.length === 0) {
      // Check user_settings for personal API key (legacy support)
      const { data: userSettings } = await serviceClient
        .from('user_settings')
        .select('api_keys')
        .eq('user_id', user.id)
        .single();

      const providerKeyMap: Record<string, string> = {
        anthropic: 'anthropic_api_key',
        openai: 'openai_api_key',
        google: 'gemini_api_key',
        perplexity: 'perplexity_api_key',
        openrouter: 'openrouter_api_key',
      };

      const settingsKey = providerKeyMap[provider];
      const personalKey = userSettings?.api_keys?.[settingsKey];

      if (personalKey) {
        // Return personal key info (user manages their own keys)
        if (info_only) {
          return json({
            ok: true,
            key_source: 'user_settings',
            billable_to: 'user',
            billable_id: user.id,
            organization_id: project?.organization_id || null,
          }, 200, origin);
        }

        // Only return actual key for internal calls
        if (!isInternalCall) {
          return json({ ok: false, error: 'Direct key retrieval not allowed from client' }, 403, origin);
        }

        return json({
          ok: true,
          api_key: personalKey,
          key_source: 'user_settings',
          billable_to: 'user',
          billable_id: user.id,
          organization_id: project?.organization_id || null,
        }, 200, origin);
      }

      return json({
        ok: false,
        error: `No ${provider} API key configured for this project`,
        suggestion: 'Configure an API key in organization settings or add one to your personal settings',
      }, 404, origin);
    }

    const resolvedKey = keyInfo[0];

    // If info_only, return just the billing context
    if (info_only) {
      return json({
        ok: true,
        key_source: resolvedKey.key_source,
        billable_to: resolvedKey.billable_to,
        billable_id: resolvedKey.billable_id,
        organization_id: project?.organization_id || null,
      }, 200, origin);
    }

    // For full key retrieval, require internal call
    if (!isInternalCall) {
      return json({ ok: false, error: 'Direct key retrieval not allowed from client' }, 403, origin);
    }

    // 5. Decrypt the key from Vault
    if (!resolvedKey.encrypted_key) {
      return json({ ok: false, error: 'No encrypted key found' }, 500, origin);
    }

    const { data: decryptedKey, error: decryptError } = await serviceClient.rpc('get_secret', {
      p_secret_id: resolvedKey.encrypted_key,
    });

    if (decryptError) {
      console.error('[get-api-key] Vault decryption error:', decryptError);
      return json({ ok: false, error: 'Failed to decrypt API key' }, 500, origin);
    }

    // 6. Return the key with billing context
    return json({
      ok: true,
      api_key: decryptedKey,
      key_source: resolvedKey.key_source,
      billable_to: resolvedKey.billable_to,
      billable_id: resolvedKey.billable_id,
      organization_id: project?.organization_id || null,
    }, 200, origin);

  } catch (error) {
    console.error('[get-api-key] Function error:', error);
    return json({ ok: false, error: error.message || 'Internal server error' }, 500, origin);
  }
});
