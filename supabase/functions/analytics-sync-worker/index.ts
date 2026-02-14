// supabase/functions/analytics-sync-worker/index.ts
//
// Background sync worker for analytics data (GSC / GA4).
//
// Trigger modes:
//   POST {}                      -> cron mode: sync all properties that are due
//   POST { propertyId: "uuid" }  -> manual mode: sync a single property immediately
//
// Uses SERVICE_ROLE_KEY to bypass RLS (no user JWT required).
//
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { refreshGoogleToken } from '../_shared/googleAuth.ts'
import { decrypt, encrypt } from '../_shared/crypto.ts'

// ---------------------------------------------------------------------------
// Inlined Utility Functions (matches codebase convention)
// ---------------------------------------------------------------------------
const ALLOWED_ORIGINS = [
  'https://app.cutthecrap.net',
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
    "Access-Control-Allow-Methods": "POST, OPTIONS",
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
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

// ---------------------------------------------------------------------------
// Sync frequency intervals (milliseconds)
// ---------------------------------------------------------------------------
const FREQUENCY_INTERVALS: Record<string, number> = {
  hourly: 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

// ---------------------------------------------------------------------------
// Google API endpoints
// ---------------------------------------------------------------------------
const GSC_API_BASE = 'https://www.googleapis.com/webmasters/v3/sites';
const GA4_API_BASE = 'https://analyticsdata.googleapis.com/v1beta/properties';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface AnalyticsProperty {
  id: string;
  account_id: string;
  service: 'gsc' | 'ga4';
  property_id: string;
  property_name: string | null;
  sync_enabled: boolean;
  sync_frequency: string;
  last_synced_at: string | null;
}

interface AnalyticsAccount {
  id: string;
  user_id: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  token_expires_at: string | null;
}

interface SyncResult {
  propertyId: string;
  service: string;
  status: 'completed' | 'failed';
  rowsSynced: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Helper: determine if a property is due for sync
// ---------------------------------------------------------------------------
function isDueForSync(property: AnalyticsProperty): boolean {
  if (!property.last_synced_at) return true;

  const interval = FREQUENCY_INTERVALS[property.sync_frequency] ?? FREQUENCY_INTERVALS.daily;
  const lastSynced = new Date(property.last_synced_at).getTime();
  return Date.now() >= lastSynced + interval;
}

// ---------------------------------------------------------------------------
// Helper: get a valid access token, refreshing if expired or about to expire
// ---------------------------------------------------------------------------
async function getValidAccessToken(
  account: AnalyticsAccount,
  supabase: any
): Promise<string> {
  // Check if current token is still valid (with 5 min buffer)
  const tokenExpiresAt = account.token_expires_at
    ? new Date(account.token_expires_at).getTime()
    : 0;
  const isExpired = Date.now() >= tokenExpiresAt - 5 * 60 * 1000;

  if (!isExpired) {
    const accessToken = await decrypt(account.access_token_encrypted);
    if (accessToken) return accessToken;
  }

  // Token expired or decryption failed — refresh it
  const refreshToken = await decrypt(account.refresh_token_encrypted);
  if (!refreshToken) {
    throw new Error(`Failed to decrypt refresh token for account ${account.id}`);
  }

  const tokens = await refreshGoogleToken(refreshToken);

  // Persist the new access token and expiry
  const newAccessTokenEncrypted = await encrypt(tokens.access_token);
  const newExpiresAt = new Date(
    Date.now() + (tokens.expires_in || 3600) * 1000
  ).toISOString();

  await supabase
    .from('analytics_accounts')
    .update({
      access_token_encrypted: newAccessTokenEncrypted,
      token_expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', account.id);

  return tokens.access_token;
}

// ---------------------------------------------------------------------------
// Helper: create a sync log entry
// ---------------------------------------------------------------------------
async function createSyncLog(
  supabase: any,
  propertyId: string,
  syncType: 'full' | 'incremental'
): Promise<string> {
  const { data, error } = await supabase
    .from('analytics_sync_logs')
    .insert({
      property_id: propertyId,
      sync_type: syncType,
      status: 'started',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.error(`[analytics-sync-worker] Failed to create sync log:`, error);
    throw new Error(`Failed to create sync log: ${error.message}`);
  }

  return data.id;
}

// ---------------------------------------------------------------------------
// Helper: complete a sync log entry
// ---------------------------------------------------------------------------
async function completeSyncLog(
  supabase: any,
  logId: string,
  status: 'completed' | 'failed',
  rowsSynced: number,
  errorMessage?: string
): Promise<void> {
  const { error } = await supabase
    .from('analytics_sync_logs')
    .update({
      status,
      rows_synced: rowsSynced,
      error_message: errorMessage ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', logId);

  if (error) {
    console.error(`[analytics-sync-worker] Failed to update sync log ${logId}:`, error);
  }
}

// ---------------------------------------------------------------------------
// GSC data fetch
// ---------------------------------------------------------------------------
async function fetchGscData(
  accessToken: string,
  siteUrl: string,
  supabase: any,
  propertyDbId: string,
  syncLogId: string
): Promise<{ rows: any[]; rowCount: number }> {
  // Fetch last 7 days of search analytics
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  const response = await fetch(
    `${GSC_API_BASE}/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        dimensions: ['query', 'page', 'date'],
        rowLimit: 5000,
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`GSC API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const rows = data.rows || [];

  console.log(
    `[analytics-sync-worker] GSC: fetched ${rows.length} rows for ${siteUrl}`
  );

  // Persist rows to gsc_search_analytics table
  if (rows.length > 0) {
    const BATCH_SIZE = 500;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE).map((row: any) => ({
        property_id: propertyDbId,
        sync_log_id: syncLogId,
        date: row.keys[2],          // date dimension
        query: row.keys[0],         // query dimension
        page: row.keys[1],          // page dimension
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
      }));

      const { error: insertError } = await supabase
        .from('gsc_search_analytics')
        .upsert(batch, { onConflict: 'property_id,date,query,page' });

      if (insertError) {
        console.error(
          `[analytics-sync-worker] GSC insert batch ${i / BATCH_SIZE + 1} failed:`,
          insertError
        );
      }
    }
    console.log(
      `[analytics-sync-worker] GSC: persisted ${rows.length} rows for ${siteUrl}`
    );
  }

  return { rows, rowCount: rows.length };
}

// ---------------------------------------------------------------------------
// GA4 data fetch
// ---------------------------------------------------------------------------
async function fetchGa4Data(
  accessToken: string,
  propertyId: string,
  supabase: any,
  propertyDbId: string,
  syncLogId: string
): Promise<{ rows: any[]; rowCount: number }> {
  // Fetch last 7 days of traffic data
  const response = await fetch(
    `${GA4_API_BASE}/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        dimensions: [
          { name: 'pagePath' },
          { name: 'date' },
        ],
        metrics: [
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'screenPageViews' },
          { name: 'averageSessionDuration' },
          { name: 'bounceRate' },
        ],
        limit: '5000',
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`GA4 API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const rows = data.rows || [];

  console.log(
    `[analytics-sync-worker] GA4: fetched ${rows.length} rows for property ${propertyId}`
  );

  // Persist rows to ga4_traffic_data table
  if (rows.length > 0) {
    const BATCH_SIZE = 500;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE).map((row: any) => {
        // GA4 API returns dimensions in dimensionValues and metrics in metricValues
        const pagePath = row.dimensionValues?.[0]?.value || '';
        const date = row.dimensionValues?.[1]?.value || '';
        // Format YYYYMMDD to YYYY-MM-DD
        const formattedDate = date.length === 8
          ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`
          : date;

        return {
          property_id: propertyDbId,
          sync_log_id: syncLogId,
          date: formattedDate,
          page_path: pagePath,
          sessions: parseInt(row.metricValues?.[0]?.value || '0', 10),
          total_users: parseInt(row.metricValues?.[1]?.value || '0', 10),
          pageviews: parseInt(row.metricValues?.[2]?.value || '0', 10),
          avg_session_duration: parseFloat(row.metricValues?.[3]?.value || '0'),
          bounce_rate: parseFloat(row.metricValues?.[4]?.value || '0'),
        };
      });

      const { error: insertError } = await supabase
        .from('ga4_traffic_data')
        .upsert(batch, { onConflict: 'property_id,date,page_path' });

      if (insertError) {
        console.error(
          `[analytics-sync-worker] GA4 insert batch ${i / BATCH_SIZE + 1} failed:`,
          insertError
        );
      }
    }
    console.log(
      `[analytics-sync-worker] GA4: persisted ${rows.length} rows for property ${propertyId}`
    );
  }

  return { rows, rowCount: rows.length };
}

// ---------------------------------------------------------------------------
// Core: sync a single property
// ---------------------------------------------------------------------------
async function syncProperty(
  supabase: any,
  property: AnalyticsProperty,
  account: AnalyticsAccount
): Promise<SyncResult> {
  const logId = await createSyncLog(supabase, property.id, 'incremental');

  try {
    // 1. Get a valid access token (refreshing if needed)
    const accessToken = await getValidAccessToken(account, supabase);

    // 2. Fetch data from the appropriate API and persist to DB
    let rowCount = 0;

    if (property.service === 'gsc') {
      const result = await fetchGscData(accessToken, property.property_id, supabase, property.id, logId);
      rowCount = result.rowCount;
    } else if (property.service === 'ga4') {
      const result = await fetchGa4Data(accessToken, property.property_id, supabase, property.id, logId);
      rowCount = result.rowCount;
    } else {
      throw new Error(`Unsupported service: ${property.service}`);
    }

    // 3. Update last_synced_at on the property
    await supabase
      .from('analytics_properties')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', property.id);

    // 4. Mark sync log as completed
    await completeSyncLog(supabase, logId, 'completed', rowCount);

    console.log(
      `[analytics-sync-worker] Synced property ${property.id} (${property.service}): ${rowCount} rows`
    );

    return {
      propertyId: property.id,
      service: property.service,
      status: 'completed',
      rowsSynced: rowCount,
    };
  } catch (error) {
    const errorMsg = error.message || 'Unknown error during sync';
    console.error(
      `[analytics-sync-worker] Failed to sync property ${property.id}:`,
      errorMsg
    );

    await completeSyncLog(supabase, logId, 'failed', 0, errorMsg);

    return {
      propertyId: property.id,
      service: property.service,
      status: 'failed',
      rowsSynced: 0,
      error: errorMsg,
    };
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
const Deno = (globalThis as any).Deno;

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) });
  }

  if (req.method !== 'POST') {
    return json({ ok: false, error: 'Method not allowed' }, 405, origin);
  }

  try {
    // ----------------------------------------------------------------
    // 1. Parse request body (empty body = cron mode)
    // ----------------------------------------------------------------
    let body: any = {};
    try {
      const text = await req.text();
      if (text.trim()) {
        body = JSON.parse(text);
      }
    } catch {
      // Empty or invalid body is fine — treat as cron mode
    }

    const manualPropertyId: string | undefined = body.propertyId;

    // ----------------------------------------------------------------
    // 2. Create Supabase client with service role (bypasses RLS)
    // ----------------------------------------------------------------
    const supabase = createClient(
      getEnvVar('PROJECT_URL'),
      getEnvVar('SERVICE_ROLE_KEY')
    );

    // ----------------------------------------------------------------
    // 3. Query properties to sync
    // ----------------------------------------------------------------
    let properties: AnalyticsProperty[];

    if (manualPropertyId) {
      // Manual mode: sync a specific property regardless of schedule
      const { data, error } = await supabase
        .from('analytics_properties')
        .select('*')
        .eq('id', manualPropertyId)
        .single();

      if (error || !data) {
        return json(
          { ok: false, error: `Property not found: ${manualPropertyId}` },
          404,
          origin
        );
      }

      properties = [data];
    } else {
      // Cron mode: get all sync-enabled properties
      const { data, error } = await supabase
        .from('analytics_properties')
        .select('*')
        .eq('sync_enabled', true);

      if (error) {
        console.error('[analytics-sync-worker] Failed to query properties:', error);
        return json(
          { ok: false, error: `Failed to query properties: ${error.message}` },
          500,
          origin
        );
      }

      // Filter to only those due for sync
      properties = (data || []).filter(isDueForSync);
    }

    if (properties.length === 0) {
      console.log('[analytics-sync-worker] No properties due for sync.');
      return json(
        { ok: true, message: 'No properties due for sync.', results: [] },
        200,
        origin
      );
    }

    console.log(
      `[analytics-sync-worker] ${properties.length} propert${properties.length === 1 ? 'y' : 'ies'} to sync.`
    );

    // ----------------------------------------------------------------
    // 4. Fetch associated accounts (batch to avoid N+1)
    // ----------------------------------------------------------------
    const accountIds = [...new Set(properties.map((p) => p.account_id))];
    const { data: accounts, error: accountsError } = await supabase
      .from('analytics_accounts')
      .select('*')
      .in('id', accountIds);

    if (accountsError || !accounts) {
      console.error('[analytics-sync-worker] Failed to fetch accounts:', accountsError);
      return json(
        { ok: false, error: `Failed to fetch accounts: ${accountsError?.message}` },
        500,
        origin
      );
    }

    const accountMap = new Map<string, AnalyticsAccount>();
    for (const account of accounts) {
      accountMap.set(account.id, account);
    }

    // ----------------------------------------------------------------
    // 5. Sync each property (sequentially to respect rate limits)
    // ----------------------------------------------------------------
    const results: SyncResult[] = [];

    for (const property of properties) {
      const account = accountMap.get(property.account_id);

      if (!account) {
        console.error(
          `[analytics-sync-worker] Account ${property.account_id} not found for property ${property.id}`
        );
        results.push({
          propertyId: property.id,
          service: property.service,
          status: 'failed',
          rowsSynced: 0,
          error: `Account ${property.account_id} not found`,
        });
        continue;
      }

      const result = await syncProperty(supabase, property, account);
      results.push(result);
    }

    // ----------------------------------------------------------------
    // 6. Summarise and return
    // ----------------------------------------------------------------
    const succeeded = results.filter((r) => r.status === 'completed').length;
    const failed = results.filter((r) => r.status === 'failed').length;

    console.log(
      `[analytics-sync-worker] Finished: ${succeeded} succeeded, ${failed} failed out of ${results.length} total.`
    );

    return json(
      {
        ok: true,
        message: `Synced ${succeeded}/${results.length} properties.`,
        results,
      },
      200,
      origin
    );
  } catch (error) {
    console.error('[analytics-sync-worker] Unhandled error:', error);
    return json(
      { ok: false, error: error.message || 'Internal server error' },
      500,
      origin
    );
  }
});
