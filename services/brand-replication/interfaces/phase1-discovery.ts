// services/brand-replication/interfaces/phase1-discovery.ts

export interface DiscoveryInput {
  brandUrl: string;
  brandId: string;
  pagesToAnalyze?: string[];
  options?: {
    maxPages?: number;
    includeScreenshots?: boolean;
    viewport?: { width: number; height: number };
    waitForSelector?: string;
    timeout?: number;
  };
}

export interface Screenshot {
  url: string;
  path: string;
  timestamp: string;
  viewport: { width: number; height: number };
}

export interface DiscoveredComponent {
  id: string;
  name: string;
  purpose: string;
  visualDescription: string;
  usageContext: string;
  sourceScreenshots: string[];
  occurrences: number;
  confidence: number;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

export interface DiscoveryOutput {
  brandId: string;
  brandUrl: string;
  analyzedPages: string[];
  screenshots: Screenshot[];
  discoveredComponents: DiscoveredComponent[];
  rawAnalysis: string;
  timestamp: string;
  status: 'success' | 'partial' | 'failed';
  errors?: string[];
}

export interface DiscoveryConfig {
  customPrompt?: string;
  aiProvider: 'anthropic' | 'gemini';
  apiKey: string;
  model?: string;
  debug?: boolean;
  minOccurrences: number;
  confidenceThreshold: number;
  screenshotDir: string;
}
