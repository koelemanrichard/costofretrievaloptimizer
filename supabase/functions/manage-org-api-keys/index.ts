// supabase/functions/manage-org-api-keys/index.ts
// Edge function for securely managing organization API keys via Vault
//
// Actions:
//   - store: Store a new API key in Vault
//   - update: Rotate an existing API key
//   - delete: Remove an API key from Vault
//   - status: Get key status (without exposing the key)
//
// deno-lint-ignore-file no-explicit-any

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// --- Utility Functions ---
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

function json(body: any, status = 200, origin?: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}

// Validate API key format based on provider
function validateApiKey(provider: string, key: string): { valid: boolean; error?: string } {
  const patterns: Record<string, { prefix: string; minLength: number }> = {
    anthropic: { prefix: 'sk-ant-', minLength: 40 },
    openai: { prefix: 'sk-', minLength: 20 },
    google: { prefix: 'AIza', minLength: 30 },
    perplexity: { prefix: 'pplx-', minLength: 30 },
    openrouter: { prefix: 'sk-or-', minLength: 30 },
  };

  const pattern = patterns[provider];
  if (!pattern) {
    return { valid: false, error: `Unknown provider: ${provider}` };
  }

  if (!key.startsWith(pattern.prefix)) {
    return { valid: false, error: `${provider} keys should start with "${pattern.prefix}"` };
  }

  if (key.length < pattern.minLength) {
    return { valid: false, error: `${provider} key appears too short` };
  }

  return { valid: true };
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
    const { action, organization_id, provider, api_key } = body;

    if (!action) {
      return json({ ok: false, error: 'Missing action parameter' }, 400, origin);
    }

    if (!organization_id) {
      return json({ ok: false, error: 'Missing organization_id parameter' }, 400, origin);
    }

    // 1. Authenticate user
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

    // 3. Verify user has admin access to the organization
    const { data: membership, error: memberError } = await serviceClient
      .from('organization_members')
      .select('role')
      .eq('organization_id', organization_id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !membership) {
      return json({ ok: false, error: 'You are not a member of this organization' }, 403, origin);
    }

    if (!['owner', 'admin'].includes(membership.role)) {
      return json({ ok: false, error: 'Only organization owners and admins can manage API keys' }, 403, origin);
    }

    // 4. Handle actions
    switch (action) {
      case 'store': {
        if (!provider || !api_key) {
          return json({ ok: false, error: 'Missing provider or api_key parameter' }, 400, origin);
        }

        // Validate key format
        const validation = validateApiKey(provider, api_key);
        if (!validation.valid) {
          return json({ ok: false, error: validation.error }, 400, origin);
        }

        // Check if key already exists for this provider
        const { data: existingKey } = await serviceClient
          .from('organization_api_keys')
          .select('id, vault_secret_id')
          .eq('organization_id', organization_id)
          .eq('provider', provider)
          .single();

        if (existingKey) {
          // Rotate existing key
          const secretName = `org_${organization_id}_${provider}`;
          const { data: newSecretId, error: rotateError } = await serviceClient
            .rpc('rotate_secret', {
              p_old_secret_id: existingKey.vault_secret_id,
              p_new_secret: api_key
            });

          if (rotateError) {
            console.error('[manage-org-api-keys] Rotate secret error:', rotateError);
            return json({ ok: false, error: 'Failed to rotate API key' }, 500, origin);
          }

          // Update the key record
          const { error: updateError } = await serviceClient
            .from('organization_api_keys')
            .update({
              vault_secret_id: newSecretId,
              key_source: 'byok',
              is_active: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingKey.id);

          if (updateError) {
            console.error('[manage-org-api-keys] Update key record error:', updateError);
            return json({ ok: false, error: 'Failed to update key record' }, 500, origin);
          }

          // Log audit event
          await serviceClient.rpc('log_audit_event', {
            p_org_id: organization_id,
            p_action: 'api_key.rotated',
            p_target_type: 'api_key',
            p_target_id: existingKey.id,
            p_new_value: { provider }
          });

          return json({ ok: true, message: `${provider} API key updated successfully` }, 200, origin);
        } else {
          // Store new key in Vault
          const secretName = `org_${organization_id}_${provider}`;
          const { data: secretId, error: storeError } = await serviceClient
            .rpc('store_secret', {
              p_secret: api_key,
              p_name: secretName,
              p_description: `${provider} API key for organization ${organization_id}`
            });

          if (storeError) {
            console.error('[manage-org-api-keys] Store secret error:', storeError);
            return json({ ok: false, error: 'Failed to store API key securely' }, 500, origin);
          }

          // Create key record
          const { data: newKey, error: insertError } = await serviceClient
            .from('organization_api_keys')
            .insert({
              organization_id,
              provider,
              vault_secret_id: secretId,
              key_source: 'byok',
              is_active: true,
              created_by: user.id
            })
            .select('id')
            .single();

          if (insertError) {
            console.error('[manage-org-api-keys] Insert key record error:', insertError);
            // Try to clean up the vault secret
            await serviceClient.rpc('delete_secret', { p_secret_id: secretId });
            return json({ ok: false, error: 'Failed to create key record' }, 500, origin);
          }

          // Log audit event
          await serviceClient.rpc('log_audit_event', {
            p_org_id: organization_id,
            p_action: 'api_key.created',
            p_target_type: 'api_key',
            p_target_id: newKey.id,
            p_new_value: { provider }
          });

          return json({ ok: true, message: `${provider} API key stored successfully` }, 200, origin);
        }
      }

      case 'delete': {
        if (!provider) {
          return json({ ok: false, error: 'Missing provider parameter' }, 400, origin);
        }

        // Get existing key
        const { data: existingKey, error: fetchError } = await serviceClient
          .from('organization_api_keys')
          .select('id, vault_secret_id')
          .eq('organization_id', organization_id)
          .eq('provider', provider)
          .single();

        if (fetchError || !existingKey) {
          return json({ ok: false, error: 'No API key found for this provider' }, 404, origin);
        }

        // Delete from Vault
        const { error: deleteSecretError } = await serviceClient
          .rpc('delete_secret', { p_secret_id: existingKey.vault_secret_id });

        if (deleteSecretError) {
          console.error('[manage-org-api-keys] Delete secret error:', deleteSecretError);
          // Continue anyway to remove the record
        }

        // Delete the key record
        const { error: deleteError } = await serviceClient
          .from('organization_api_keys')
          .delete()
          .eq('id', existingKey.id);

        if (deleteError) {
          console.error('[manage-org-api-keys] Delete key record error:', deleteError);
          return json({ ok: false, error: 'Failed to delete key record' }, 500, origin);
        }

        // Log audit event
        await serviceClient.rpc('log_audit_event', {
          p_org_id: organization_id,
          p_action: 'api_key.deleted',
          p_target_type: 'api_key',
          p_old_value: { provider }
        });

        return json({ ok: true, message: `${provider} API key removed successfully` }, 200, origin);
      }

      case 'status': {
        // Get all key statuses for the organization
        const { data: keys, error: keysError } = await serviceClient
          .from('organization_api_keys')
          .select('provider, key_source, is_active, usage_this_month, last_used_at')
          .eq('organization_id', organization_id);

        if (keysError) {
          console.error('[manage-org-api-keys] Fetch keys error:', keysError);
          return json({ ok: false, error: 'Failed to fetch key status' }, 500, origin);
        }

        // Map to status format
        const providers = ['anthropic', 'openai', 'google', 'perplexity', 'openrouter'];
        const statuses = providers.map(p => {
          const key = keys?.find(k => k.provider === p);
          return {
            provider: p,
            hasKey: !!key && key.key_source === 'byok',
            keySource: key?.key_source || 'inherit',
            isActive: key?.is_active ?? false,
            usageThisMonth: key?.usage_this_month,
            lastUsedAt: key?.last_used_at
          };
        });

        return json({ ok: true, statuses }, 200, origin);
      }

      default:
        return json({ ok: false, error: `Unknown action: ${action}` }, 400, origin);
    }

  } catch (error) {
    console.error('[manage-org-api-keys] Function error:', error);
    return json({ ok: false, error: error.message || 'Internal server error' }, 500, origin);
  }
});
