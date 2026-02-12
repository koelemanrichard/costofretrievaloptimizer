const GA4_API_BASE = 'https://analyticsdata.googleapis.com/v1beta';
const GA4_ADMIN_API_BASE = 'https://analyticsadmin.googleapis.com/v1beta';

export interface Ga4PageMetrics {
  pageviews: number;
  sessions: number;
  bounceRate: number;
  avgSessionDuration: number;
  period: { start: string; end: string };
}

export interface Ga4Property {
  propertyId: string;
  displayName: string;
  websiteUrl?: string;
}

export class Ga4ApiAdapter {
  /**
   * Get page-level metrics for a specific page path.
   */
  async getPageMetrics(
    propertyId: string,
    pagePath: string,
    dateRange: { start: string; end: string },
    accessToken: string
  ): Promise<Ga4PageMetrics> {
    const body = {
      dateRanges: [{ startDate: dateRange.start, endDate: dateRange.end }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'sessions' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
      ],
      dimensionFilter: {
        filter: {
          fieldName: 'pagePath',
          stringFilter: { value: pagePath, matchType: 'EXACT' },
        },
      },
    };

    const response = await this.callDataApi(propertyId, body, accessToken);
    const row = response.rows?.[0];

    return {
      pageviews: parseInt(row?.metricValues?.[0]?.value || '0', 10),
      sessions: parseInt(row?.metricValues?.[1]?.value || '0', 10),
      bounceRate: parseFloat(row?.metricValues?.[2]?.value || '0'),
      avgSessionDuration: parseFloat(row?.metricValues?.[3]?.value || '0'),
      period: dateRange,
    };
  }

  /**
   * Get daily pageview trend for a page.
   */
  async getPageviewsTrend(
    propertyId: string,
    pagePath: string,
    days: number,
    accessToken: string
  ): Promise<{ date: string; pageviews: number }[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const body = {
      dateRanges: [{
        startDate: this.formatDate(startDate),
        endDate: this.formatDate(endDate),
      }],
      dimensions: [{ name: 'date' }, { name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
      dimensionFilter: {
        filter: {
          fieldName: 'pagePath',
          stringFilter: { value: pagePath, matchType: 'EXACT' },
        },
      },
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    };

    const response = await this.callDataApi(propertyId, body, accessToken);

    return (response.rows || []).map((row: any) => ({
      date: row.dimensionValues?.[0]?.value || '',
      pageviews: parseInt(row.metricValues?.[0]?.value || '0', 10),
    }));
  }

  /**
   * List available GA4 properties for the authenticated account.
   */
  async listProperties(accessToken: string): Promise<Ga4Property[]> {
    const response = await fetch(`${GA4_ADMIN_API_BASE}/accountSummaries`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`GA4 Admin API error: ${response.status}`);
    }

    const data = await response.json();
    const properties: Ga4Property[] = [];

    for (const account of data.accountSummaries || []) {
      for (const prop of account.propertySummaries || []) {
        properties.push({
          propertyId: prop.property?.replace('properties/', '') || '',
          displayName: prop.displayName || '',
          websiteUrl: undefined, // Not available in accountSummaries
        });
      }
    }

    return properties;
  }

  private async callDataApi(propertyId: string, body: object, accessToken: string): Promise<any> {
    const url = `${GA4_API_BASE}/properties/${propertyId}:runReport`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => '');
      throw new Error(`GA4 Data API error ${response.status}: ${error}`);
    }

    return response.json();
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
