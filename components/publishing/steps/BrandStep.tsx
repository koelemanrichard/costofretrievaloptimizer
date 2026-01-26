// components/publishing/steps/BrandStep.tsx
/**
 * Brand Step (Step 1 of Style & Publish)
 *
 * Progressive disclosure brand detection:
 * - Minimal: URL input -> one-click detect -> summary view
 * - Expanded: Full Design DNA display with edit capabilities
 */
import React, { useState, useCallback, useRef } from 'react';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { AnalysisProgress } from '../AnalysisProgress';
import { DesignDNADisplay } from '../DesignDNADisplay';
import { useBrandDetection } from '../../../hooks/useBrandDetection';
import type { DesignDNA, BrandDesignSystem } from '../../../types/designDna';

interface BrandStepProps {
  defaultDomain?: string;
  apifyToken: string;
  geminiApiKey?: string;
  anthropicApiKey?: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  projectId?: string;
  onDetectionComplete: (result: {
    designDna: DesignDNA;
    designSystem: BrandDesignSystem;
    screenshotBase64: string;
  }) => void;
  onDesignDnaChange?: (dna: DesignDNA) => void;
}

export const BrandStep: React.FC<BrandStepProps> = ({
  defaultDomain,
  apifyToken,
  geminiApiKey,
  anthropicApiKey,
  supabaseUrl,
  supabaseAnonKey,
  projectId,
  onDetectionComplete,
  onDesignDnaChange,
}) => {
  const [targetUrl, setTargetUrl] = useState(defaultDomain || '');
  const [isExpanded, setIsExpanded] = useState(false);

  const detection = useBrandDetection({
    apifyToken,
    geminiApiKey,
    anthropicApiKey,
    supabaseUrl,
    supabaseAnonKey,
    projectId,
  });

  const handleDetect = useCallback(() => {
    if (!targetUrl) return;
    detection.detect(targetUrl);
  }, [targetUrl, detection]);

  // Track which detection result we've already notified parent about (prevents infinite loop)
  const lastNotifiedResultRef = useRef<typeof detection.result>(null);

  // Notify parent when detection completes (only once per unique result)
  React.useEffect(() => {
    if (detection.result && detection.result !== lastNotifiedResultRef.current) {
      lastNotifiedResultRef.current = detection.result;
      onDetectionComplete({
        designDna: detection.result.designDna,
        designSystem: detection.result.designSystem,
        screenshotBase64: detection.result.screenshotBase64,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onDetectionComplete intentionally excluded to prevent infinite loops
  }, [detection.result]);

  return (
    <div className="space-y-6">
      {/* Detection has not started or no result yet */}
      {!detection.result && (
        <div className="p-6 bg-gradient-to-br from-zinc-900/40 to-stone-900/20 rounded-2xl border border-zinc-500/30">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">&#10024;</span>
            <div>
              <h3 className="text-base font-bold text-white">AI Brand Detection</h3>
              <p className="text-xs text-zinc-400">
                One click extracts your brand's complete design system
              </p>
            </div>
          </div>

          {/* URL Input */}
          {!detection.isAnalyzing && (
            <div className="flex gap-2">
              <Input
                placeholder="https://your-website.com"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                className="flex-1 bg-gray-900/80 border-zinc-600/30"
                disabled={detection.isAnalyzing}
              />
              <Button
                onClick={handleDetect}
                disabled={detection.isAnalyzing || !targetUrl}
                className="min-w-[140px] bg-blue-600 hover:bg-blue-500"
              >
                Detect Brand
              </Button>
            </div>
          )}

          {/* Progress display */}
          {detection.isAnalyzing && (
            <div className="mt-4">
              <AnalysisProgress
                steps={detection.steps}
                progress={detection.progress}
                error={detection.error || undefined}
              />
            </div>
          )}

          {/* Error display */}
          {detection.error && !detection.isAnalyzing && (
            <div className="mt-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-300">{detection.error}</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => detection.reset()}
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Detection complete - show result */}
      {detection.result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-400">
              <span>&#9989;</span>
              <span className="font-medium">Brand Detected</span>
              {detection.result.fromCache && (
                <span className="text-xs text-gray-500">(from cache)</span>
              )}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => detection.reset()}
            >
              Re-detect
            </Button>
          </div>

          <DesignDNADisplay
            dna={detection.result.designDna}
            screenshotBase64={detection.result.screenshotBase64}
            sourceUrl={detection.result.sourceUrl}
            confidence={detection.result.confidence}
            isExpanded={isExpanded}
            onToggleExpand={() => setIsExpanded(!isExpanded)}
            onDnaChange={onDesignDnaChange}
          />
        </div>
      )}

      {/* Fallback: Manual configuration if no API keys */}
      {!apifyToken && (
        <div className="p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
          <p className="text-sm text-yellow-300">
            <strong>Note:</strong> Add an Apify API token in Settings to enable automatic brand detection.
          </p>
        </div>
      )}
    </div>
  );
};
