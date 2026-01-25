// hooks/useBrandDetection.ts
import { useState, useCallback } from 'react';
import { BrandDiscoveryService } from '../services/design-analysis/BrandDiscoveryService';
import { AIDesignAnalyzer } from '../services/design-analysis/AIDesignAnalyzer';
import { BrandDesignSystemGenerator } from '../services/design-analysis/BrandDesignSystemGenerator';
import {
  initBrandDesignSystemStorage,
  saveDesignDNA,
  saveBrandDesignSystem,
  getDesignDNA,
  getBrandDesignSystem,
  hasDesignSystemForHash,
} from '../services/design-analysis/brandDesignSystemStorage';
import type { DesignDNA, DesignDNAExtractionResult, BrandDesignSystem } from '../types/designDna';
import type { AnalysisStep } from '../components/publishing/AnalysisProgress';

interface UseBrandDetectionConfig {
  apifyToken: string;
  geminiApiKey?: string;
  anthropicApiKey?: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  projectId?: string;
}

interface BrandDetectionState {
  isAnalyzing: boolean;
  progress: number;
  steps: AnalysisStep[];
  error: string | null;
  result: {
    designDna: DesignDNA;
    designSystem: BrandDesignSystem;
    screenshotBase64: string;
    sourceUrl: string;
    confidence: number;
    fromCache: boolean;
  } | null;
}

const INITIAL_STEPS: AnalysisStep[] = [
  { id: 'screenshot', label: 'Capturing screenshot', status: 'pending' },
  { id: 'colors', label: 'Extracting colors', status: 'pending' },
  { id: 'typography', label: 'Detecting typography', status: 'pending' },
  { id: 'dna', label: 'Analyzing design DNA', status: 'pending' },
  { id: 'generate', label: 'Generating unique styles', status: 'pending' },
];

export function useBrandDetection(config: UseBrandDetectionConfig) {
  const [state, setState] = useState<BrandDetectionState>({
    isAnalyzing: false,
    progress: 0,
    steps: INITIAL_STEPS,
    error: null,
    result: null,
  });

  const updateStep = useCallback((stepId: string, status: AnalysisStep['status']) => {
    setState(prev => ({
      ...prev,
      steps: prev.steps.map(s => s.id === stepId ? { ...s, status } : s),
    }));
  }, []);

  const detect = useCallback(async (url: string) => {
    if (!url) return;

    setState({
      isAnalyzing: true,
      progress: 0,
      steps: INITIAL_STEPS.map(s => ({ ...s, status: 'pending' })),
      error: null,
      result: null,
    });

    try {
      // Initialize storage
      initBrandDesignSystemStorage(config.supabaseUrl, config.supabaseAnonKey);

      // Step 1: Capture screenshot and extract basic colors via DOM
      updateStep('screenshot', 'active');
      setState(prev => ({ ...prev, progress: 10 }));

      const discoveryReport = await BrandDiscoveryService.analyze(url, config.apifyToken);
      if (!discoveryReport || !discoveryReport.screenshotBase64) {
        throw new Error('Failed to capture website screenshot');
      }

      updateStep('screenshot', 'complete');
      updateStep('colors', 'active');
      setState(prev => ({ ...prev, progress: 25 }));

      // Step 2: Use AI Vision to extract full Design DNA
      updateStep('colors', 'complete');
      updateStep('typography', 'active');
      setState(prev => ({ ...prev, progress: 40 }));

      const aiProvider = config.geminiApiKey ? 'gemini' : 'anthropic';
      const apiKey = config.geminiApiKey || config.anthropicApiKey;

      if (!apiKey) {
        throw new Error('Gemini or Anthropic API key required for AI analysis');
      }

      const analyzer = new AIDesignAnalyzer({
        provider: aiProvider,
        apiKey,
      });

      updateStep('typography', 'complete');
      updateStep('dna', 'active');
      setState(prev => ({ ...prev, progress: 55 }));

      const dnaResult: DesignDNAExtractionResult = await analyzer.extractDesignDNA(
        discoveryReport.screenshotBase64,
        url
      );

      updateStep('dna', 'complete');
      setState(prev => ({ ...prev, progress: 70 }));

      // Step 3: Check cache before generating
      const generator = new BrandDesignSystemGenerator({
        provider: aiProvider,
        apiKey,
      });

      const dnaHash = generator.computeDesignDnaHash(dnaResult.designDna);

      let designSystem: BrandDesignSystem;
      let fromCache = false;

      if (config.projectId) {
        const hasCache = await hasDesignSystemForHash(config.projectId, dnaHash);
        if (hasCache) {
          const cached = await getBrandDesignSystem(config.projectId);
          if (cached) {
            designSystem = cached;
            fromCache = true;
            updateStep('generate', 'complete');
            setState(prev => ({ ...prev, progress: 100 }));
          }
        }
      }

      // Step 4: Generate design system if not cached
      if (!fromCache) {
        updateStep('generate', 'active');
        setState(prev => ({ ...prev, progress: 85 }));

        const domain = url.replace(/^https?:\/\//, '').split('/')[0];
        designSystem = await generator.generate(dnaResult.designDna, domain, url);

        updateStep('generate', 'complete');
        setState(prev => ({ ...prev, progress: 95 }));

        // Save to database
        if (config.projectId) {
          const dnaId = await saveDesignDNA(config.projectId, dnaResult);
          await saveBrandDesignSystem(config.projectId, dnaId, designSystem);
        }

        setState(prev => ({ ...prev, progress: 100 }));
      }

      // Success!
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        result: {
          designDna: dnaResult.designDna,
          designSystem: designSystem!,
          screenshotBase64: discoveryReport.screenshotBase64,
          sourceUrl: url,
          confidence: dnaResult.designDna.confidence?.overall || 90,
          fromCache,
        },
      }));

    } catch (error) {
      console.error('[useBrandDetection] Error:', error);

      // Mark current active step as error
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        error: error instanceof Error ? error.message : 'Unknown error during analysis',
        steps: prev.steps.map(s => s.status === 'active' ? { ...s, status: 'error' } : s),
      }));
    }
  }, [config, updateStep]);

  const reset = useCallback(() => {
    setState({
      isAnalyzing: false,
      progress: 0,
      steps: INITIAL_STEPS,
      error: null,
      result: null,
    });
  }, []);

  return {
    ...state,
    detect,
    reset,
  };
}
