import type { PerformanceSnapshot } from '../types';

const GSC_API_BASE = 'https://www.googleapis.com/webmasters/v3';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

export interface GscQueryParams {
  siteUrl: string;
  startDate: string;
  endDate: string;
  dimensions: ('query' | 'page' | 'country' | 'device' | 'date')[];
  accessToken: string;
  rowLimit?: number;
  startRow?: number;
  dimensionFilterGroups?: object[];
}

export interface GscRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscQueryRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export class GscApiAdapter {
  private readonly clientId: string;

  constructor(clientId?: string) {
    this.clientId = clientId || (typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID : '') || '';
  }

  /**
   * Generate Google OAuth authorization URL for Search Console access.
   * Optionally include additional scopes (e.g. GA4 analytics.readonly).
   */
  getAuthorizationUrl(
    projectId: string,
    redirectUri: string,
    additionalScopes?: string[]
  ): string {
    if (!this.clientId) {
      console.error('[GscApiAdapter] Missing VITE_GOOGLE_CLIENT_ID — set it in .env.local to enable Google OAuth');
    }
    const scopes = [
      'https://www.googleapis.com/auth/webmasters.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/analytics.readonly',
      ...(additionalScopes || []),
    ];
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state: projectId,
    });
    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Fetch search analytics data from GSC API.
   */
  async getSearchAnalytics(params: GscQueryParams): Promise<GscRow[]> {
    const body = {
      startDate: params.startDate,
      endDate: params.endDate,
      dimensions: params.dimensions,
      rowLimit: params.rowLimit || 1000,
      startRow: params.startRow || 0,
      dimensionFilterGroups: params.dimensionFilterGroups || [],
    };

    const response = await this.callGscApi(
      `/sites/${encodeURIComponent(params.siteUrl)}/searchAnalytics/query`,
      body,
      params.accessToken
    );

    return (response.rows || []).map((row: any) => ({
      keys: row.keys || [],
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0,
    }));
  }

  /**
   * Get performance data for a specific page URL over N days.
   */
  async getPagePerformance(url: string, days: number, accessToken: string): Promise<PerformanceSnapshot> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const siteUrl = new URL(url).origin;

    const rows = await this.getSearchAnalytics({
      siteUrl,
      startDate: this.formatDate(startDate),
      endDate: this.formatDate(endDate),
      dimensions: ['page'],
      accessToken,
      dimensionFilterGroups: [{
        filters: [{ dimension: 'page', expression: url, operator: 'equals' }],
      }],
    });

    const totals = rows.reduce(
      (acc, row) => ({
        clicks: acc.clicks + row.clicks,
        impressions: acc.impressions + row.impressions,
      }),
      { clicks: 0, impressions: 0 }
    );

    const avgPosition = rows.length > 0
      ? rows.reduce((sum, r) => sum + r.position, 0) / rows.length
      : 0;

    const ctr = totals.impressions > 0 ? totals.clicks / totals.impressions : 0;

    return {
      clicks: totals.clicks,
      impressions: totals.impressions,
      ctr: Math.round(ctr * 10000) / 10000,
      position: Math.round(avgPosition * 10) / 10,
      period: {
        start: this.formatDate(startDate),
        end: this.formatDate(endDate),
      },
    };
  }

  /**
   * Get top queries for a specific page.
   */
  async getTopQueries(pageUrl: string, limit: number, accessToken: string): Promise<GscQueryRow[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 28);

    const siteUrl = new URL(pageUrl).origin;

    const rows = await this.getSearchAnalytics({
      siteUrl,
      startDate: this.formatDate(startDate),
      endDate: this.formatDate(endDate),
      dimensions: ['query'],
      accessToken,
      rowLimit: limit,
      dimensionFilterGroups: [{
        filters: [{ dimension: 'page', expression: pageUrl, operator: 'equals' }],
      }],
    });

    return rows.map(row => ({
      query: row.keys[0] || '',
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    }));
  }

  /**
   * Get daily click trend for a page.
   */
  async getClickTrend(pageUrl: string, days: number, accessToken: string): Promise<{ date: string; clicks: number }[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const siteUrl = new URL(pageUrl).origin;

    const rows = await this.getSearchAnalytics({
      siteUrl,
      startDate: this.formatDate(startDate),
      endDate: this.formatDate(endDate),
      dimensions: ['date'],
      accessToken,
      dimensionFilterGroups: [{
        filters: [{ dimension: 'page', expression: pageUrl, operator: 'equals' }],
      }],
    });

    return rows.map(row => ({
      date: row.keys[0] || '',
      clicks: row.clicks,
    }));
  }

  /**
   * List all sites/properties available in the user's GSC account.
   */
  async listSites(accessToken: string): Promise<{ siteUrl: string; permissionLevel: string }[]> {
    const response = await fetch(`${GSC_API_BASE}/sites`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new Error(`GSC API error: ${response.status}`);
    const data = await response.json();
    return (data.siteEntry || []).map((entry: any) => ({
      siteUrl: entry.siteUrl,
      permissionLevel: entry.permissionLevel,
    }));
  }

  private async callGscApi(endpoint: string, body: object, accessToken: string): Promise<any> {
    const response = await fetch(`${GSC_API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const error = await response.text().catch(() => '');
      throw new Error(`GSC API error ${response.status}: ${error}`);
    }
    return response.json();
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
