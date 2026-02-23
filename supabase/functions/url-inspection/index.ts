// deno-lint-ignore-file no-explicit-any

/**
 * URL Inspection Edge Function
 *
 * Inspects URLs via the Google Search Console URL Inspection API.
 * Returns indexing status, crawl details, and page fetch state.
 *
 * Auth: Uses accountId to resolve OAuth token (same as gsc-integration).
 * Rate limit: 2,000/day — batches with 100ms delay, max 50 per invocation.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { decrypt, encrypt } from '../_shared/crypto.ts'
import { refreshGoogleToken } from '../_shared/googleAuth.ts'
import { logUsage } from '../_shared/usage.ts'

const Deno = (globalThis as any).Deno;

const ALLOWED_ORIGINS = [
  'https://holistic-seo-topical-map-generator.vercel.app',
  'https://app.cutthecrap.net',
  'https://cost-of-retreival-reducer.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:5173',
];

const URL_INSPECTION_ENDPOINT = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect';
const MAX_URLS_PER_INVOCATION = 50;
const DELAY_BETWEEN_CALLS_MS = 100;

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
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
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
  // Prefer auto-injected SUPABASE_* env vars (always correct) over custom secrets (may be stale)
  const projectUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('PROJECT_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');

  if (!projectUrl || !anonKey || !serviceRoleKey) {
    return { error: json({ error: 'Server configuration error' }, 500, origin) };
  }

  const supabaseAuth = createClient(projectUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
  if (authError || !user) {
    return { error: json({ error: 'Authentication failed', detail: authError?.message }, 401, origin) };
  }

  const serviceClient = createClient(projectUrl, serviceRoleKey);
  const { data: account, error: fetchError } = await serviceClient
    .from('analytics_accounts')
    .select('*')
    .eq('id', accountId)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !account) {
    return { error: json({ error: 'Account not found or access denied', relink: true }, 404, origin) };
  }

  let accessToken: string | null;
  try {
    accessToken = await decrypt(account.access_token_encrypted);
  } catch (e: any) {
    return { error: json({ error: 'Token decryption failed', detail: e?.message }, 500, origin) };
  }

  if (!accessToken) {
    return { error: json({ error: 'No access token available — please re-link your Google account', code: 'TOKEN_INVALID', relink: true }, 401, origin) };
  }

  // Refresh if expired
  const tokenExpiry = account.token_expires_at ? new Date(account.token_expires_at) : null;
  const isExpired = tokenExpiry && tokenExpiry.getTime() < Date.now() + 60000;

  if (isExpired) {
    if (!account.refresh_token_encrypted) {
      return { error: json({ error: 'Token expired — please re-link your Google account', code: 'TOKEN_EXPIRED', relink: true }, 401, origin) };
    }
    try {
      const refreshToken = await decrypt(account.refresh_token_encrypted);
      if (!refreshToken) {
        return { error: json({ error: 'Refresh token invalid', code: 'REFRESH_TOKEN_INVALID', relink: true }, 401, origin) };
      }
      const newTokens = await refreshGoogleToken(refreshToken);
      accessToken = newTokens.access_token;

      const newAccessEncrypted = await encrypt(accessToken);
      await serviceClient
        .from('analytics_accounts')
        .update({
          access_token_encrypted: newAccessEncrypted,
          token_expires_at: new Date(Date.now() + (newTokens.expires_in || 3600) * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', accountId);
    } catch (e: any) {
      const isAuthError = e?.message?.includes('invalid_grant') || e?.message?.includes('Token has been expired or revoked');
      return { error: json({
        error: isAuthError ? 'Google authorization revoked — please re-link' : `Token refresh failed: ${e?.message}`,
        code: isAuthError ? 'AUTH_REVOKED' : 'REFRESH_FAILED',
        relink: isAuthError,
      }, isAuthError ? 401 : 500, origin) };
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
    const { urls, siteUrl, accountId } = body;

    if (!urls?.length || !siteUrl || !accountId) {
      return json({ error: "Missing urls, siteUrl, or accountId" }, 400, origin);
    }

    // Resolve access token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing authorization header' }, 401, origin);
    }

    const tokenResult = await resolveAccessToken(accountId, authHeader, origin);
    if ('error' in tokenResult) return tokenResult.error;
    const accessToken = tokenResult.token;

    // Limit URLs per invocation
    const urlsToInspect = urls.slice(0, MAX_URLS_PER_INVOCATION);
    const results: any[] = [];
    const startTime = Date.now();

    for (let i = 0; i < urlsToInspect.length; i++) {
      const url = urlsToInspect[i];
      try {
        const response = await fetch(URL_INSPECTION_ENDPOINT, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inspectionUrl: url,
            siteUrl: siteUrl,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          results.push({
            url,
            error: `HTTP ${response.status}: ${errorText}`,
            verdict: 'ERROR',
            indexingState: 'UNKNOWN',
          });
        } else {
          const data = await response.json();
          const inspectionResult = data.inspectionResult || {};
          const indexStatus = inspectionResult.indexStatusResult || {};
          results.push({
            url,
            verdict: indexStatus.verdict || 'UNKNOWN',
            indexingState: indexStatus.indexingState || 'UNKNOWN',
            lastCrawlTime: indexStatus.lastCrawlTime || null,
            pageFetchState: indexStatus.pageFetchState || null,
            robotsTxtState: indexStatus.robotsTxtState || null,
            coverageState: indexStatus.coverageState || null,
          });
        }
      } catch (e: any) {
        results.push({
          url,
          error: e.message,
          verdict: 'ERROR',
          indexingState: 'UNKNOWN',
        });
      }

      // Rate limiting between calls
      if (i < urlsToInspect.length - 1) {
        await new Promise(r => setTimeout(r, DELAY_BETWEEN_CALLS_MS));
      }
    }

    // Log usage
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');
    const projectUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('PROJECT_URL');
    if (serviceRoleKey && projectUrl) {
      const serviceClient = createClient(projectUrl, serviceRoleKey);
      logUsage(serviceClient, {
        provider: 'google',
        model: 'url-inspection',
        operation: 'url-inspection',
        operationDetail: `${results.length} URLs inspected`,
        tokensIn: 0,
        tokensOut: results.length,
        durationMs: Date.now() - startTime,
        success: true,
      }).catch(() => {});
    }

    return json({
      ok: true,
      siteUrl,
      totalInspected: results.length,
      totalRequested: urls.length,
      results,
    }, 200, origin);

  } catch (error: any) {
    console.error("[url-inspection] Error:", error);
    return json({ error: error.message }, 500, origin);
  }
});
