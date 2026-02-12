// supabase/functions/gsc-list-properties/index.ts
//
// Returns the list of GSC properties (sites) for a connected Google account.
// Decrypts the stored access token, refreshes if expired, calls GSC API.
//
// Expected request body: { accountId: string }
// Requires: Authorization header with Supabase JWT
//
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { decrypt, encrypt } from '../_shared/crypto.ts'
import { refreshGoogleToken } from '../_shared/googleAuth.ts'

const GSC_API = 'https://www.googleapis.com/webmasters/v3';

const ALLOWED_ORIGINS = [
  'https://holistic-seo-topical-map-generator.vercel.app',
  'https://app.cutthecrap.net',
  'https://cost-of-retreival-reducer.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
];

const Deno = (globalThis as any).Deno;

function corsHeaders(requestOrigin?: string | null) {
  const origin = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)
    ? requestOrigin
    : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

function json(body: any, status = 200, origin?: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

function getEnvVar(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`FATAL: Environment variable ${name} is not set.`);
  return value;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) });
  }

  try {
    // 1. Parse request
    const { accountId } = await req.json();
    if (!accountId) {
      return json({ ok: false, error: 'Missing accountId' }, 400, origin);
    }

    // 2. Authenticate the calling user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ ok: false, error: 'Missing authorization header' }, 401, origin);
    }

    const supabaseAuth = createClient(
      getEnvVar('PROJECT_URL'),
      getEnvVar('ANON_KEY'),
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return json({ ok: false, error: 'Authentication failed' }, 401, origin);
    }

    // 3. Fetch the account record (service role to read encrypted tokens)
    const serviceClient = createClient(
      getEnvVar('PROJECT_URL'),
      getEnvVar('SERVICE_ROLE_KEY')
    );

    const { data: account, error: fetchError } = await serviceClient
      .from('analytics_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', user.id) // Ensure the account belongs to this user
      .single();

    if (fetchError || !account) {
      return json({ ok: false, error: 'Account not found or access denied' }, 404, origin);
    }

    // 4. Decrypt the access token
    let accessToken = await decrypt(account.access_token_encrypted);
    if (!accessToken) {
      return json({ ok: false, error: 'Failed to decrypt access token' }, 500, origin);
    }

    // 5. Check if token is expired, refresh if needed
    const tokenExpiry = account.token_expires_at ? new Date(account.token_expires_at) : null;
    const isExpired = tokenExpiry && tokenExpiry.getTime() < Date.now() + 60000; // 1 min buffer

    if (isExpired && account.refresh_token_encrypted) {
      const refreshToken = await decrypt(account.refresh_token_encrypted);
      if (refreshToken) {
        try {
          const newTokens = await refreshGoogleToken(refreshToken);
          accessToken = newTokens.access_token;

          // Update stored tokens
          const newAccessEncrypted = await encrypt(accessToken);
          await serviceClient
            .from('analytics_accounts')
            .update({
              access_token_encrypted: newAccessEncrypted,
              token_expires_at: new Date(
                Date.now() + (newTokens.expires_in || 3600) * 1000
              ).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', accountId);
        } catch (refreshErr: any) {
          console.error('[gsc-list-properties] Token refresh failed:', refreshErr.message);
          return json(
            { ok: false, error: 'Token expired and refresh failed. Please reconnect.' },
            401,
            origin
          );
        }
      }
    }

    // 6. Call GSC API to list sites
    const gscResponse = await fetch(`${GSC_API}/sites`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!gscResponse.ok) {
      const errBody = await gscResponse.text();
      console.error('[gsc-list-properties] GSC API error:', gscResponse.status, errBody);
      return json(
        { ok: false, error: `GSC API error (${gscResponse.status})` },
        gscResponse.status === 401 ? 401 : 502,
        origin
      );
    }

    const gscData = await gscResponse.json();
    const properties = (gscData.siteEntry || []).map((entry: any) => ({
      siteUrl: entry.siteUrl,
      permissionLevel: entry.permissionLevel,
    }));

    return json({ ok: true, properties }, 200, origin);
  } catch (error: any) {
    console.error('[gsc-list-properties] Error:', error);
    return json({ ok: false, error: error.message || 'Internal server error' }, 500, origin);
  }
});
