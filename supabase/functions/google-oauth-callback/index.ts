// supabase/functions/google-oauth-callback/index.ts
//
// Handles the Google OAuth callback: exchanges the authorization code for tokens,
// fetches the user's email, encrypts tokens, and stores them in analytics_accounts.
//
// Expected request body: { code: string, state: string, redirectUri?: string }
// Requires: Authorization header with Supabase JWT
//
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encrypt } from '../_shared/crypto.ts'
import { exchangeGoogleCode, fetchGoogleEmail } from '../_shared/googleAuth.ts'

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

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) });
  }

  try {
    // ----------------------------------------------------------------
    // 1. Parse and validate request body
    // ----------------------------------------------------------------
    const { code, state, redirectUri } = await req.json();

    if (!code || !state) {
      return json(
        { ok: false, error: 'Missing required parameters: code and state' },
        400,
        origin
      );
    }

    // ----------------------------------------------------------------
    // 2. Authenticate the calling user via Supabase JWT
    // ----------------------------------------------------------------
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ ok: false, error: 'Missing authorization header' }, 401, origin);
    }

    const supabaseAuthClient = createClient(
      getEnvVar('PROJECT_URL'),
      getEnvVar('ANON_KEY'),
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseAuthClient.auth.getUser();
    if (authError || !user) {
      return json(
        { ok: false, error: `Authentication failed: ${authError?.message || 'No user found.'}` },
        401,
        origin
      );
    }

    // ----------------------------------------------------------------
    // 3. Exchange authorization code for tokens
    // ----------------------------------------------------------------
    const effectiveRedirectUri = redirectUri
      || `${Deno.env.get('APP_URL') || 'http://localhost:5173'}/oauth-callback.html`;

    const tokens = await exchangeGoogleCode(code, effectiveRedirectUri);

    // ----------------------------------------------------------------
    // 4. Fetch the Google account email
    // ----------------------------------------------------------------
    const email = await fetchGoogleEmail(tokens.access_token);

    // ----------------------------------------------------------------
    // 5. Encrypt tokens using the shared AES-GCM encryption
    // ----------------------------------------------------------------
    const accessTokenEncrypted = await encrypt(tokens.access_token);
    const refreshTokenEncrypted = tokens.refresh_token
      ? await encrypt(tokens.refresh_token)
      : null;

    // ----------------------------------------------------------------
    // 6. Store in analytics_accounts (service role bypasses RLS)
    // ----------------------------------------------------------------
    const serviceRoleClient = createClient(
      getEnvVar('PROJECT_URL'),
      getEnvVar('SERVICE_ROLE_KEY')
    );

    const scopes = (tokens.scope || '').split(' ').filter(Boolean);

    const { error: upsertError } = await serviceRoleClient
      .from('analytics_accounts')
      .upsert(
        {
          user_id: user.id,
          provider: 'google',
          account_email: email,
          access_token_encrypted: accessTokenEncrypted,
          refresh_token_encrypted: refreshTokenEncrypted,
          token_expires_at: new Date(
            Date.now() + (tokens.expires_in || 3600) * 1000
          ).toISOString(),
          scopes,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,provider,account_email' }
      );

    if (upsertError) {
      console.error('[google-oauth-callback] Upsert error:', upsertError);
      return json(
        { ok: false, error: `Failed to store tokens: ${upsertError.message}` },
        500,
        origin
      );
    }

    // ----------------------------------------------------------------
    // 7. Return success
    // ----------------------------------------------------------------
    console.log(`[google-oauth-callback] Tokens stored for user ${user.id}, email ${email}`);

    return json(
      {
        ok: true,
        email,
        scopes,
      },
      200,
      origin
    );
  } catch (error) {
    console.error('[google-oauth-callback] Function crashed:', error);
    return json(
      { ok: false, error: error.message || 'Internal server error' },
      500,
      origin
    );
  }
});
