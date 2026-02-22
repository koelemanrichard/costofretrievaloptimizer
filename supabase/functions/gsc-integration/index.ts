// deno-lint-ignore-file no-explicit-any

/**
 * GSC Integration Edge Function
 *
 * Fetches Google Search Console data for audit/gap analysis enrichment:
 * - Search performance (impressions, clicks, CTR, position)
 *
 * Supports two auth modes:
 * 1. accountId — looks up encrypted token from analytics_accounts (preferred)
 * 2. accessToken — direct token pass-through (legacy)
 *
 * Requires: Authorization header with Supabase JWT (for accountId mode)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { decrypt, encrypt } from '../_shared/crypto.ts'
import { refreshGoogleToken } from '../_shared/googleAuth.ts'

const Deno = (globalThis as any).Deno;

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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
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

/**
 * Resolve access token from accountId (decrypt + refresh if expired)
 */
async function resolveAccessToken(
  accountId: string,
  authHeader: string,
  origin: string | null
): Promise<{ token: string } | { error: Response }> {
  const projectUrl = Deno.env.get('PROJECT_URL') || Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('ANON_KEY') || Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  console.log('[gsc] resolveAccessToken: accountId=', accountId, 'hasProjectUrl=', !!projectUrl, 'hasAnonKey=', !!anonKey, 'hasServiceRoleKey=', !!serviceRoleKey);

  if (!projectUrl || !anonKey || !serviceRoleKey) {
    console.error('[gsc] Missing env vars: projectUrl=', !!projectUrl, 'anonKey=', !!anonKey, 'serviceRoleKey=', !!serviceRoleKey);
    return { error: json({ error: 'Server configuration error', detail: `missing: ${!projectUrl ? 'PROJECT_URL ' : ''}${!anonKey ? 'ANON_KEY ' : ''}${!serviceRoleKey ? 'SERVICE_ROLE_KEY' : ''}` }, 500, origin) };
  }

  // Authenticate calling user
  const supabaseAuth = createClient(projectUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
  if (authError || !user) {
    console.error('[gsc] Auth failed:', authError?.message);
    return { error: json({ error: 'Authentication failed', detail: authError?.message }, 401, origin) };
  }
  console.log('[gsc] Authenticated user:', user.id);

  // Fetch account with service role (to read encrypted tokens)
  const serviceClient = createClient(projectUrl, serviceRoleKey);
  const { data: account, error: fetchError } = await serviceClient
    .from('analytics_accounts')
    .select('*')
    .eq('id', accountId)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !account) {
    console.error('[gsc] Account fetch failed:', fetchError?.message, 'accountId=', accountId, 'userId=', user.id);
    return { error: json({ error: 'Account not found or access denied', detail: fetchError?.message }, 404, origin) };
  }
  console.log('[gsc] Account found:', account.id, 'email=', account.account_email, 'expires=', account.token_expires_at);

  // Decrypt access token
  let accessToken: string | null;
  try {
    accessToken = await decrypt(account.access_token_encrypted);
  } catch (e: any) {
    console.error('[gsc] Token decryption threw:', e?.message);
    return { error: json({ error: 'Token decryption failed', detail: e?.message }, 500, origin) };
  }

  if (!accessToken) {
    console.error('[gsc] Decrypted token is null/empty');
    return { error: json({ error: 'No access token available' }, 500, origin) };
  }
  console.log('[gsc] Token decrypted successfully, length=', accessToken.length);

  // Refresh if expired
  const tokenExpiry = account.token_expires_at ? new Date(account.token_expires_at) : null;
  const isExpired = tokenExpiry && tokenExpiry.getTime() < Date.now() + 60000;
  console.log('[gsc] Token expiry check: expires=', tokenExpiry?.toISOString(), 'isExpired=', isExpired);

  if (isExpired && account.refresh_token_encrypted) {
    console.log('[gsc] Token expired, refreshing...');
    try {
      const refreshToken = await decrypt(account.refresh_token_encrypted);
      if (refreshToken) {
        const newTokens = await refreshGoogleToken(refreshToken);
        accessToken = newTokens.access_token;
        console.log('[gsc] Token refreshed successfully, new expiry in', newTokens.expires_in, 'seconds');

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
      } else {
        console.error('[gsc] Refresh token decryption returned null');
      }
    } catch (e: any) {
      console.error('[gsc] Token refresh failed:', e?.message);
      return { error: json({ error: 'Token refresh failed', detail: e?.message }, 500, origin) };
    }
  }

  return { token: accessToken };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  try {
    const body = await req.json();
    const { siteUrl, accessToken, accountId, startDate, endDate, dimensions, rowLimit } = body;
    console.log('[gsc] Request: siteUrl=', siteUrl, 'hasAccessToken=', !!accessToken, 'accountId=', accountId);

    if (!siteUrl) {
      return json({ error: "Missing siteUrl" }, 400, origin);
    }

    // Resolve access token: prefer accountId lookup, fall back to direct token
    let resolvedToken = accessToken;

    if (!resolvedToken && accountId) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return json({ error: 'Missing authorization header (required for accountId mode)' }, 401, origin);
      }
      const result = await resolveAccessToken(accountId, authHeader, origin);
      if ('error' in result) return result.error;
      resolvedToken = result.token;
    }

    if (!resolvedToken) {
      return json({ error: "Missing accessToken or accountId" }, 400, origin);
    }

    console.log('[gsc] Token resolved, calling GSC API for', siteUrl);

    // Default to last 28 days
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || (() => {
      const d = new Date();
      d.setDate(d.getDate() - 28);
      return d.toISOString().split('T')[0];
    })();

    // Query GSC Search Analytics API
    const gscResponse = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resolvedToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: start,
          endDate: end,
          dimensions: dimensions || ['query'],
          rowLimit: rowLimit || 1000,
          dimensionFilterGroups: [],
        }),
      }
    );

    if (!gscResponse.ok) {
      const errorText = await gscResponse.text();
      return json({
        error: `GSC API error: ${gscResponse.status}`,
        details: errorText,
      }, gscResponse.status, origin);
    }

    const gscData = await gscResponse.json();

    // Return raw rows — let the frontend transform as needed
    const rows = (gscData.rows || []).map((row: any) => ({
      keys: row.keys || [],
      query: row.keys?.[0] || '',
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: Math.round((row.position || 0) * 10) / 10,
    }));

    return json({
      ok: true,
      siteUrl,
      dateRange: { start, end },
      totalRows: rows.length,
      rows,
    }, 200, origin);

  } catch (error: any) {
    console.error("GSC integration error:", error);
    return json({ error: error.message }, 500, origin);
  }
});
