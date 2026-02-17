export interface DetectedPageResult {
  inventoryId: string;
  url: string;
  detectedCE?: string;
  detectedSC?: string;
  detectedCSI?: string;
  language?: string;
}

export interface PillarSuggestion {
  centralEntity: string;
  centralEntityConfidence: number;
  centralEntityEvidence: string[];
  sourceContext: string;
  sourceContextConfidence: number;
  centralSearchIntent: string;
  centralSearchIntentConfidence: number;
  alternativeSuggestions: {
    centralEntity: string[];
    sourceContext: string[];
    centralSearchIntent: string[];
  };
  detectedLanguage: string;
  detectedRegion: string;
}

export class PillarDetectionService {
  aggregateFromDetections(results: DetectedPageResult[]): PillarSuggestion {
    const ceFreq = this.countFrequencies(results, 'detectedCE');
    const scFreq = this.countFrequencies(results, 'detectedSC');
    const csiFreq = this.countFrequencies(results, 'detectedCSI');
    const langFreq = this.countFrequencies(results, 'language');

    const totalWithCE = results.filter(r => r.detectedCE).length;
    const totalWithSC = results.filter(r => r.detectedSC).length;
    const totalWithCSI = results.filter(r => r.detectedCSI).length;

    const primaryCE = ceFreq[0]?.[0] || 'Unknown';
    const primarySC = scFreq[0]?.[0] || 'Unknown';
    const primaryCSI = csiFreq[0]?.[0] || 'Unknown';
    const primaryLang = langFreq[0]?.[0] || 'en';

    const ceConfidence = totalWithCE > 0 ? Math.round((ceFreq[0]?.[1] || 0) / totalWithCE * 100) : 0;
    const scConfidence = totalWithSC > 0 ? Math.round((scFreq[0]?.[1] || 0) / totalWithSC * 100) : 0;
    const csiConfidence = totalWithCSI > 0 ? Math.round((csiFreq[0]?.[1] || 0) / totalWithCSI * 100) : 0;

    const ceEvidence = results
      .filter(r => r.detectedCE === primaryCE)
      .map(r => r.url)
      .slice(0, 10);

    const altCE = ceFreq.slice(1, 4).map(([val]) => val);
    const altSC = scFreq.slice(1, 4).map(([val]) => val);
    const altCSI = csiFreq.slice(1, 4).map(([val]) => val);

    const detectedRegion = this.detectRegionFromUrls(results.map(r => r.url));

    return {
      centralEntity: primaryCE,
      centralEntityConfidence: ceConfidence,
      centralEntityEvidence: ceEvidence,
      sourceContext: primarySC,
      sourceContextConfidence: scConfidence,
      centralSearchIntent: primaryCSI,
      centralSearchIntentConfidence: csiConfidence,
      alternativeSuggestions: {
        centralEntity: altCE,
        sourceContext: altSC,
        centralSearchIntent: altCSI,
      },
      detectedLanguage: primaryLang,
      detectedRegion,
    };
  }

  private countFrequencies(
    results: DetectedPageResult[],
    field: keyof DetectedPageResult
  ): [string, number][] {
    const freq = new Map<string, number>();
    for (const r of results) {
      const val = r[field] as string | undefined;
      if (val) {
        freq.set(val, (freq.get(val) || 0) + 1);
      }
    }
    return Array.from(freq.entries()).sort((a, b) => b[1] - a[1]);
  }

  private detectRegionFromUrls(urls: string[]): string {
    const tldCount = new Map<string, number>();
    for (const url of urls) {
      try {
        const hostname = new URL(url).hostname;
        const tld = hostname.split('.').pop() || '';
        const regionMap: Record<string, string> = {
          nl: 'Netherlands', de: 'Germany', fr: 'France', es: 'Spain',
          uk: 'United Kingdom', be: 'Belgium', it: 'Italy',
        };
        if (regionMap[tld]) {
          tldCount.set(regionMap[tld], (tldCount.get(regionMap[tld]) || 0) + 1);
        }
      } catch { /* ignore invalid URLs */ }
    }

    if (tldCount.size === 0) return 'Global';
    return Array.from(tldCount.entries()).sort((a, b) => b[1] - a[1])[0][0];
  }
}
