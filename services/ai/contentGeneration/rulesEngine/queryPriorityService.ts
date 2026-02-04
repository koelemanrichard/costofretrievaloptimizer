// services/ai/contentGeneration/rulesEngine/queryPriorityService.ts

import { BriefSection, BusinessInfo, GscRow } from '../../../../types';
import { fetchKeywordSearchVolume } from '../../../serpApiService';

export class QueryPriorityService {
  /**
   * Enrich sections with query priority scores
   * Priority = (normalized_volume * 0.6) + (normalized_impressions * 0.4)
   */
  static async enrichWithPriority(
    sections: BriefSection[],
    businessInfo: BusinessInfo,
    gscData?: GscRow[]
  ): Promise<BriefSection[]> {
    // Extract keywords from section headings
    const keywords = sections.map(s => s.heading.toLowerCase());

    // Fetch search volume if credentials available
    let volumeMap = new Map<string, number>();

    if (businessInfo.dataforseoLogin && businessInfo.dataforseoPassword) {
      try {
        volumeMap = await fetchKeywordSearchVolume(
          keywords,
          businessInfo.dataforseoLogin,
          businessInfo.dataforseoPassword,
          this.getLocationCode(businessInfo.targetMarket),
          businessInfo.language,
          { supabaseUrl: businessInfo.supabaseUrl, supabaseAnonKey: businessInfo.supabaseAnonKey }
        );
      } catch (error) {
        console.warn('Could not fetch search volume, using GSC data only:', error);
      }
    }

    // Build impressions map from GSC data
    const impressionsMap = new Map<string, number>();
    if (gscData) {
      for (const row of gscData) {
        const query = row.query?.toLowerCase();
        if (query) {
          impressionsMap.set(query, row.impressions || 0);
        }
      }
    }

    // Calculate max values for normalization
    const maxVolume = Math.max(...volumeMap.values(), 1);
    const maxImpressions = Math.max(...impressionsMap.values(), 1);

    // Enrich sections with priority
    return sections.map(section => {
      const heading = section.heading.toLowerCase();

      const volume = volumeMap.get(heading) || 0;
      const impressions = this.findBestMatch(heading, impressionsMap) || 0;

      const normalizedVolume = volume / maxVolume;
      const normalizedImpressions = impressions / maxImpressions;

      const priority = Math.round(
        (normalizedVolume * 0.6 + normalizedImpressions * 0.4) * 100
      );

      return {
        ...section,
        query_priority: priority,
        related_queries: this.findRelatedQueries(heading, gscData),
      };
    });
  }

  /**
   * Get DataForSEO location code from target market
   */
  private static getLocationCode(targetMarket?: string): string {
    const marketCodes: Record<string, string> = {
      'US': '2840',
      'United States': '2840',
      'UK': '2826',
      'United Kingdom': '2826',
      'NL': '2528',
      'Netherlands': '2528',
      'DE': '2276',
      'Germany': '2276',
      'FR': '2250',
      'France': '2250',
      'ES': '2724',
      'Spain': '2724',
    };
    return marketCodes[targetMarket || ''] || '2840';
  }

  /**
   * Find best matching impressions for a heading using fuzzy matching
   */
  private static findBestMatch(heading: string, map: Map<string, number>): number {
    // Exact match
    if (map.has(heading)) return map.get(heading)!;

    // Partial match - find queries containing the heading words
    const headingWords = heading.split(/\s+/);
    let bestScore = 0;

    for (const [query, value] of map) {
      const matchingWords = headingWords.filter(w => query.includes(w));
      const score = matchingWords.length / headingWords.length;
      if (score > 0.5 && value > bestScore) {
        bestScore = value;
      }
    }

    return bestScore;
  }

  /**
   * Find related queries from GSC data that match the heading
   */
  private static findRelatedQueries(heading: string, gscData?: GscRow[]): string[] {
    if (!gscData) return [];

    const headingWords = heading.toLowerCase().split(/\s+/);

    return gscData
      .filter(row => {
        const query = row.query?.toLowerCase() || '';
        return headingWords.some(w => query.includes(w));
      })
      .sort((a, b) => (b.impressions || 0) - (a.impressions || 0))
      .slice(0, 5)
      .map(row => row.query || '');
  }
}
