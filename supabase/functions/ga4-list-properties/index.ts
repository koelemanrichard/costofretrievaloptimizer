// supabase/functions/ga4-list-properties/index.ts
//
// Returns the list of GA4 properties for a connected Google account.
// Uses the Google Analytics Admin API to list account summaries.
// Decrypts the stored access token, refreshes if expired, calls Admin API.
//
// Expected request body: { accountId: string }
// Requires: Authorization header with Supabase JWT
//
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { decrypt, encrypt } from '../_shared/crypto.ts'
import { refreshGoogleToken } from '../_shared/googleAuth.ts'

const GA4_ADMIN_API = 'https://analyticsadmin.googleapis.com/v1beta/accountSummaries';

const ALLOWED_ORIGINS = [
  'https://holistic-seo-topical-map-generator.vercel.app',
  'https://app.cutthecrap.net',
  'https://cost-of-retreival-reducer.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
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

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) });
  }

  try {
    // 1. Parse request
    let accountId: string;
    try {
      const body = await req.json();
      accountId = body.accountId;
    } catch (parseErr: any) {
      return json({ ok: false, error: 'Invalid request body', detail: parseErr.message }, 200, origin);
    }

    if (!accountId) {
      return json({ ok: false, error: 'Missing accountId' }, 200, origin);
    }

    // 2. Read env vars
    const projectUrl = Deno.env.get('PROJECT_URL') || Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('ANON_KEY') || Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!projectUrl || !anonKey || !serviceRoleKey) {
      return json({
        ok: false,
        error: 'Server configuration error',
        detail: `Missing: ${!projectUrl ? 'PROJECT_URL ' : ''}${!anonKey ? 'ANON_KEY ' : ''}${!serviceRoleKey ? 'SERVICE_ROLE_KEY' : ''}`.trim(),
      }, 200, origin);
    }

    // 3. Authenticate the calling user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ ok: false, error: 'Missing authorization header' }, 200, origin);
    }

    const supabaseAuth = createClient(projectUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return json({ ok: false, error: 'Authentication failed', detail: authError?.message }, 200, origin);
    }

    // 4. Fetch the account record (service role to read encrypted tokens)
    const serviceClient = createClient(projectUrl, serviceRoleKey);

    const { data: account, error: fetchError } = await serviceClient
      .from('analytics_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !account) {
      return json({
        ok: false,
        error: 'Account not found or access denied',
        detail: fetchError?.message || `accountId=${accountId}, userId=${user.id}`,
      }, 200, origin);
    }

    // 5. Check if account has analytics.readonly scope
    const scopes: string[] = account.scopes || [];
    console.log(`[ga4-list-properties] Account ${accountId} stored scopes: [${scopes.join(', ')}]`);
    const hasAnalyticsScope = scopes.some((s: string) =>
      s.includes('analytics.readonly') || s.includes('analytics')
    );
    if (!hasAnalyticsScope) {
      return json({
        ok: false,
        error: `GA4 access not granted. Stored scopes: [${scopes.join(', ')}]. Please re-connect your Google account to grant Analytics access.`,
        relink: true,
        storedScopes: scopes,
      }, 200, origin);
    }

    // 6. Decrypt the access token
    let accessToken: string | null;
    try {
      accessToken = await decrypt(account.access_token_encrypted);
    } catch (decryptErr: any) {
      return json({ ok: false, error: 'Token decryption failed', detail: decryptErr.message }, 200, origin);
    }

    if (!accessToken) {
      return json({ ok: false, error: 'Failed to decrypt access token (null result)' }, 200, origin);
    }

    // 7. Check if token is expired, refresh if needed
    const tokenExpiry = account.token_expires_at ? new Date(account.token_expires_at) : null;
    const isExpired = tokenExpiry && tokenExpiry.getTime() < Date.now() + 60000;

    if (isExpired && account.refresh_token_encrypted) {
      let refreshToken: string | null;
      try {
        refreshToken = await decrypt(account.refresh_token_encrypted);
      } catch (decryptErr: any) {
        return json({ ok: false, error: 'Refresh token decryption failed', detail: decryptErr.message }, 200, origin);
      }

      if (refreshToken) {
        try {
          const newTokens = await refreshGoogleToken(refreshToken);
          accessToken = newTokens.access_token;

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
          const isAuthRevoked = refreshErr.message?.includes('invalid_grant') ||
            refreshErr.message?.includes('Token has been expired or revoked');
          return json(
            {
              ok: false,
              error: isAuthRevoked
                ? 'Google authorization expired — please re-connect your Google account'
                : 'Token refresh failed',
              detail: refreshErr.message,
              relink: isAuthRevoked,
            },
            200,
            origin
          );
        }
      }
    }

    // 8. Call GA4 Admin API to list account summaries
    const ga4Response = await fetch(GA4_ADMIN_API, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!ga4Response.ok) {
      const errBody = await ga4Response.text();
      console.error('[ga4-list-properties] GA4 Admin API error:', ga4Response.status, errBody);

      let friendlyError = `GA4 Admin API error (${ga4Response.status})`;
      let detail = errBody.substring(0, 500);
      let relink = false;
      let apiNotEnabled = false;
      try {
        const parsed = JSON.parse(errBody);
        const gErr = parsed?.error;
        if (gErr?.message) {
          friendlyError = gErr.message;
          detail = '';
          // Detect "API not enabled" — this is a project config issue, not an auth issue
          if (gErr.message.includes('has not been used in project') ||
              gErr.message.includes('is disabled') ||
              gErr.status === 'PERMISSION_DENIED' && gErr.message.includes('analyticsadmin')) {
            apiNotEnabled = true;
          }
        }
      } catch { /* keep raw body as detail */ }

      if (apiNotEnabled) {
        friendlyError = 'Google Analytics Admin API is not enabled in your Google Cloud project. Enable it at console.cloud.google.com → APIs & Services → Enable "Google Analytics Admin API"';
        relink = false;
      } else if (ga4Response.status === 401) {
        friendlyError = 'Google authorization expired — please re-connect your Google account';
        relink = true;
      } else if (ga4Response.status === 403) {
        // 403 can mean insufficient scope OR API not enabled — show the actual Google error
        friendlyError = `GA4 access denied: ${friendlyError}`;
        relink = true;
      }

      return json({ ok: false, error: friendlyError, detail, relink, apiNotEnabled }, 200, origin);
    }

    const ga4Data = await ga4Response.json();

    // Parse accountSummaries into a flat list of properties
    const properties: { propertyId: string; displayName: string; accountName: string }[] = [];
    for (const summary of ga4Data.accountSummaries || []) {
      const accountName = summary.displayName || summary.account || '';
      for (const prop of summary.propertySummaries || []) {
        // property is like "properties/123456" — extract the ID
        const propertyId = prop.property?.replace('properties/', '') || prop.property || '';
        properties.push({
          propertyId,
          displayName: prop.displayName || propertyId,
          accountName,
        });
      }
    }

    return json({ ok: true, properties }, 200, origin);
  } catch (error: any) {
    console.error('[ga4-list-properties] Unhandled error:', error);
    return json({ ok: false, error: 'Internal server error', detail: error.message }, 200, origin);
  }
});
