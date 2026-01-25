# UX Redesign: Progressive Disclosure Brand Detection

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the Style & Publish modal from 6 confusing steps to 3 smart steps with progressive disclosure, connecting the new AI Vision services.

**Architecture:**
- Step 1 (Brand): One-click detection → minimal result display → expandable power user view
- Step 2 (Preview): Live preview → collapsible panels for Layout/Blueprint adjustments
- Step 3 (Publish): WordPress/export options (unchanged)

**Tech Stack:** React, TypeScript, TailwindCSS, existing AI services

---

## Phase 1: Connect New Services to Modal

### Task 1.1: Create Analysis Progress Component

**Files:**
- Create: `components/publishing/AnalysisProgress.tsx`

**Step 1: Create the component**

```typescript
// components/publishing/AnalysisProgress.tsx
import React from 'react';

export interface AnalysisStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'complete' | 'error';
}

interface AnalysisProgressProps {
  steps: AnalysisStep[];
  progress: number; // 0-100
  error?: string;
}

export const AnalysisProgress: React.FC<AnalysisProgressProps> = ({
  steps,
  progress,
  error,
}) => {
  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map(step => (
          <div key={step.id} className="flex items-center gap-2 text-sm">
            {step.status === 'complete' && (
              <span className="text-green-400">✓</span>
            )}
            {step.status === 'active' && (
              <span className="text-blue-400 animate-pulse">●</span>
            )}
            {step.status === 'pending' && (
              <span className="text-gray-500">○</span>
            )}
            {step.status === 'error' && (
              <span className="text-red-400">✕</span>
            )}
            <span className={
              step.status === 'complete' ? 'text-gray-300' :
              step.status === 'active' ? 'text-white' :
              step.status === 'error' ? 'text-red-400' :
              'text-gray-500'
            }>
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}
    </div>
  );
};
```

**Step 2: Commit**

```bash
git add components/publishing/AnalysisProgress.tsx
git commit -m "feat(publishing): add AnalysisProgress component

Step-by-step progress display for brand detection with:
- Progress bar with percentage
- Individual step status indicators
- Error display

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 1.2: Create Design DNA Display Component

**Files:**
- Create: `components/publishing/DesignDNADisplay.tsx`

**Step 1: Create the component**

```typescript
// components/publishing/DesignDNADisplay.tsx
import React, { useState } from 'react';
import type { DesignDNA } from '../../types/designDna';

interface DesignDNADisplayProps {
  dna: DesignDNA;
  screenshotBase64?: string;
  sourceUrl: string;
  confidence: number;
  onEdit?: (section: 'colors' | 'typography' | 'shapes' | 'personality') => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export const DesignDNADisplay: React.FC<DesignDNADisplayProps> = ({
  dna,
  screenshotBase64,
  sourceUrl,
  confidence,
  onEdit,
  isExpanded,
  onToggleExpand,
}) => {
  const [showFullScreenshot, setShowFullScreenshot] = useState(false);

  // Extract domain for display
  const domain = sourceUrl.replace(/^https?:\/\//, '').split('/')[0];

  return (
    <div className="space-y-4">
      {/* Collapsed View - Always visible */}
      <div className="flex gap-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
        {/* Screenshot thumbnail */}
        {screenshotBase64 && (
          <button
            onClick={() => setShowFullScreenshot(true)}
            className="w-24 h-24 rounded-lg overflow-hidden border border-gray-600 hover:border-blue-500 transition-colors flex-shrink-0"
          >
            <img
              src={`data:image/jpeg;base64,${screenshotBase64}`}
              alt="Website screenshot"
              className="w-full h-full object-cover object-top"
            />
          </button>
        )}

        {/* Summary info */}
        <div className="flex-1 min-w-0">
          <div className="text-sm text-gray-400 mb-1">{domain}</div>

          {/* Color palette dots */}
          <div className="flex items-center gap-1 mb-2">
            <div
              className="w-5 h-5 rounded-full border border-white/20"
              style={{ backgroundColor: dna.colors.primary.hex }}
              title={`Primary: ${dna.colors.primary.hex}`}
            />
            <div
              className="w-5 h-5 rounded-full border border-white/20"
              style={{ backgroundColor: dna.colors.secondary.hex }}
              title={`Secondary: ${dna.colors.secondary.hex}`}
            />
            <div
              className="w-5 h-5 rounded-full border border-white/20"
              style={{ backgroundColor: dna.colors.accent.hex }}
              title={`Accent: ${dna.colors.accent.hex}`}
            />
            <div
              className="w-5 h-5 rounded-full border border-white/20"
              style={{ backgroundColor: dna.colors.neutrals.dark }}
              title={`Neutral: ${dna.colors.neutrals.dark}`}
            />
            <div
              className="w-5 h-5 rounded-full border border-white/20"
              style={{ backgroundColor: dna.colors.neutrals.light }}
              title={`Light: ${dna.colors.neutrals.light}`}
            />
            <span className="text-xs text-gray-500 ml-2">
              {dna.typography.headingFont.family} + {dna.typography.bodyFont.family}
            </span>
          </div>

          {/* Personality & confidence */}
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-300 capitalize">{dna.personality.overall} vibe</span>
            <span className="text-gray-500">•</span>
            <span className="text-green-400">{confidence}% confidence</span>
          </div>
        </div>

        {/* Expand/collapse button */}
        <button
          onClick={onToggleExpand}
          className="text-sm text-blue-400 hover:text-blue-300 whitespace-nowrap"
        >
          {isExpanded ? 'Hide Details ▲' : 'Show Details ▼'}
        </button>
      </div>

      {/* Expanded View - Power User Details */}
      {isExpanded && (
        <div className="space-y-4 pl-4 border-l-2 border-gray-700">
          {/* Colors Section */}
          <div className="p-4 bg-gray-800/30 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-white">Colors</h4>
              {onEdit && (
                <button
                  onClick={() => onEdit('colors')}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Edit
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: dna.colors.primary.hex }} />
                  <span className="text-gray-300">{dna.colors.primary.hex}</span>
                </div>
                <span className="text-gray-500">Primary • {dna.colors.primary.usage}</span>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: dna.colors.secondary.hex }} />
                  <span className="text-gray-300">{dna.colors.secondary.hex}</span>
                </div>
                <span className="text-gray-500">Secondary • {dna.colors.secondary.usage}</span>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: dna.colors.accent.hex }} />
                  <span className="text-gray-300">{dna.colors.accent.hex}</span>
                </div>
                <span className="text-gray-500">Accent • {dna.colors.accent.usage}</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-700">
              <div className="text-xs text-gray-500 mb-2">Neutrals</div>
              <div className="flex gap-1">
                {Object.entries(dna.colors.neutrals).map(([key, value]) => (
                  <div
                    key={key}
                    className="w-6 h-6 rounded border border-white/10"
                    style={{ backgroundColor: value }}
                    title={`${key}: ${value}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Typography Section */}
          <div className="p-4 bg-gray-800/30 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-white">Typography</h4>
              {onEdit && (
                <button
                  onClick={() => onEdit('typography')}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Edit
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-500">Headings:</span>
                <span className="text-gray-300 ml-2">
                  {dna.typography.headingFont.family} {dna.typography.headingFont.weight}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Body:</span>
                <span className="text-gray-300 ml-2">
                  {dna.typography.bodyFont.family} {dna.typography.bodyFont.weight}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Scale:</span>
                <span className="text-gray-300 ml-2">{dna.typography.scaleRatio}</span>
              </div>
              <div>
                <span className="text-gray-500">Base size:</span>
                <span className="text-gray-300 ml-2">{dna.typography.baseSize}</span>
              </div>
            </div>
          </div>

          {/* Shapes & Effects Section */}
          <div className="p-4 bg-gray-800/30 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-white">Shapes & Effects</h4>
              {onEdit && (
                <button
                  onClick={() => onEdit('shapes')}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Edit
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-500">Corners:</span>
                <span className="text-gray-300 ml-2 capitalize">{dna.shapes.borderRadius.style}</span>
              </div>
              <div>
                <span className="text-gray-500">Shadows:</span>
                <span className="text-gray-300 ml-2 capitalize">{dna.effects.shadows.intensity}</span>
              </div>
              <div>
                <span className="text-gray-500">Buttons:</span>
                <span className="text-gray-300 ml-2 capitalize">{dna.shapes.buttonStyle}</span>
              </div>
              <div>
                <span className="text-gray-500">Cards:</span>
                <span className="text-gray-300 ml-2 capitalize">{dna.shapes.cardStyle}</span>
              </div>
            </div>
          </div>

          {/* Personality Section */}
          <div className="p-4 bg-gray-800/30 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-white">Brand Personality</h4>
              {onEdit && (
                <button
                  onClick={() => onEdit('personality')}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Edit
                </button>
              )}
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-300 capitalize mb-3">
                Overall: {dna.personality.overall}
              </div>
              {/* Formality bar */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500 w-20">Formality</span>
                <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${(dna.personality.formality / 5) * 100}%` }}
                  />
                </div>
                <span className="text-gray-400 w-8">{dna.personality.formality}/5</span>
              </div>
              {/* Energy bar */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500 w-20">Energy</span>
                <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500"
                    style={{ width: `${(dna.personality.energy / 5) * 100}%` }}
                  />
                </div>
                <span className="text-gray-400 w-8">{dna.personality.energy}/5</span>
              </div>
              {/* Warmth bar */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500 w-20">Warmth</span>
                <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500"
                    style={{ width: `${(dna.personality.warmth / 5) * 100}%` }}
                  />
                </div>
                <span className="text-gray-400 w-8">{dna.personality.warmth}/5</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full screenshot modal */}
      {showFullScreenshot && screenshotBase64 && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-8"
          onClick={() => setShowFullScreenshot(false)}
        >
          <div className="max-w-4xl max-h-full overflow-auto rounded-lg">
            <img
              src={`data:image/jpeg;base64,${screenshotBase64}`}
              alt="Website screenshot"
              className="w-full h-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
};
```

**Step 2: Commit**

```bash
git add components/publishing/DesignDNADisplay.tsx
git commit -m "feat(publishing): add DesignDNADisplay component

Progressive disclosure Design DNA display with:
- Collapsed view: screenshot, color dots, fonts, personality, confidence
- Expanded view: full color palette, typography, shapes, personality bars
- Clickable screenshot for full-size modal
- Edit buttons per section for power users

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 1.3: Create Brand Detection Hook

**Files:**
- Create: `hooks/useBrandDetection.ts`

**Step 1: Create the hook**

```typescript
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
```

**Step 2: Commit**

```bash
git add hooks/useBrandDetection.ts
git commit -m "feat(hooks): add useBrandDetection hook

Orchestrates the full brand detection flow:
- Screenshot capture via BrandDiscoveryService
- AI Vision DNA extraction via AIDesignAnalyzer
- Design system generation via BrandDesignSystemGenerator
- Caching via brandDesignSystemStorage
- Step-by-step progress tracking

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 2: Redesign Brand Step

### Task 2.1: Create New BrandStep Component

**Files:**
- Create: `components/publishing/steps/BrandStep.tsx`

**Step 1: Create the component**

```typescript
// components/publishing/steps/BrandStep.tsx
/**
 * Brand Step (Step 1 of Style & Publish)
 *
 * Progressive disclosure brand detection:
 * - Minimal: URL input → one-click detect → summary view
 * - Expanded: Full Design DNA display with edit capabilities
 */
import React, { useState, useCallback } from 'react';
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
  const [editingSection, setEditingSection] = useState<string | null>(null);

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

  // Notify parent when detection completes
  React.useEffect(() => {
    if (detection.result) {
      onDetectionComplete({
        designDna: detection.result.designDna,
        designSystem: detection.result.designSystem,
        screenshotBase64: detection.result.screenshotBase64,
      });
    }
  }, [detection.result, onDetectionComplete]);

  const handleEdit = useCallback((section: 'colors' | 'typography' | 'shapes' | 'personality') => {
    setEditingSection(section);
    // TODO: Open inline editor for the section
  }, []);

  return (
    <div className="space-y-6">
      {/* Detection has not started or no result yet */}
      {!detection.result && (
        <div className="p-6 bg-gradient-to-br from-zinc-900/40 to-stone-900/20 rounded-2xl border border-zinc-500/30">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">✨</span>
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
              <span>✅</span>
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
            onEdit={handleEdit}
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
```

**Step 2: Commit**

```bash
git add components/publishing/steps/BrandStep.tsx
git commit -m "feat(publishing): add new BrandStep component

Progressive disclosure brand detection step:
- Minimal view: URL input, one-click detect, summary
- Progress: Step-by-step analysis indicators
- Result: DesignDNADisplay with expand/collapse
- Error handling with retry option

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 3: Simplify Modal to 3 Steps

### Task 3.1: Create Layout Panel Component

**Files:**
- Create: `components/publishing/panels/LayoutPanel.tsx`

Extract the layout configuration into a collapsible panel that can be embedded in the Preview step.

**Step 1: Create the component**

```typescript
// components/publishing/panels/LayoutPanel.tsx
/**
 * Layout Panel
 *
 * Collapsible panel for layout configuration.
 * Extracted from LayoutConfigStep for use in Preview step.
 */
import React, { useState } from 'react';
import { Button } from '../../ui/Button';
import { Select } from '../../ui/Select';
import type { LayoutConfiguration, ContentTypeTemplate } from '../../../types/publishing';

interface LayoutPanelProps {
  layout: LayoutConfiguration;
  onChange: (updates: Partial<LayoutConfiguration>) => void;
  onTemplateChange: (template: ContentTypeTemplate) => void;
}

export const LayoutPanel: React.FC<LayoutPanelProps> = ({
  layout,
  onChange,
  onTemplateChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleComponent = (key: keyof LayoutConfiguration['components'], enabled: boolean) => {
    onChange({
      components: {
        ...layout.components,
        [key]: {
          ...layout.components[key],
          enabled,
        },
      },
    });
  };

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-gray-800/50 hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span>📐</span>
          <span className="font-medium text-white">Adjust Layout</span>
        </div>
        <span className="text-gray-400">{isExpanded ? '▲' : '▼'}</span>
      </button>

      {isExpanded && (
        <div className="p-4 space-y-4 border-t border-gray-700">
          {/* Template selection */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Template</label>
            <Select
              value={layout.template}
              onChange={(e) => onTemplateChange(e.target.value as ContentTypeTemplate)}
            >
              <option value="blog-article">Blog Article</option>
              <option value="landing-page">Landing Page</option>
              <option value="service-page">Service Page</option>
              <option value="ecommerce-product">Product Page</option>
            </Select>
          </div>

          {/* Component toggles */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Components</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(layout.components).map(([key, config]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={(e) => toggleComponent(key as keyof LayoutConfiguration['components'], e.target.checked)}
                    className="rounded border-gray-600"
                  />
                  <span className="text-gray-300 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
```

**Step 2: Commit**

```bash
git add components/publishing/panels/LayoutPanel.tsx
git commit -m "feat(publishing): add LayoutPanel component

Collapsible layout configuration panel for Preview step:
- Template selection dropdown
- Component toggle checkboxes
- Expand/collapse functionality

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 3.2: Create Blueprint Panel Component

**Files:**
- Create: `components/publishing/panels/BlueprintPanel.tsx`

Extract blueprint editing into a collapsible panel.

**Step 1: Create the component**

```typescript
// components/publishing/panels/BlueprintPanel.tsx
/**
 * Blueprint Panel
 *
 * Collapsible panel for section-level blueprint adjustments.
 * Simplified version of BlueprintStep for embedding in Preview.
 */
import React, { useState } from 'react';
import { Select } from '../../ui/Select';
import type { LayoutBlueprint, SectionDesign } from '../../../services/publishing';

interface BlueprintPanelProps {
  blueprint: LayoutBlueprint | null;
  onBlueprintChange: (blueprint: LayoutBlueprint) => void;
  isGenerating?: boolean;
  onRegenerate?: () => void;
}

export const BlueprintPanel: React.FC<BlueprintPanelProps> = ({
  blueprint,
  onBlueprintChange,
  isGenerating,
  onRegenerate,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!blueprint) {
    return null;
  }

  const updateSection = (sectionId: string, updates: Partial<SectionDesign['presentation']>) => {
    const updatedSections = blueprint.sections.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          presentation: {
            ...section.presentation,
            ...updates,
          },
        };
      }
      return section;
    });

    onBlueprintChange({
      ...blueprint,
      sections: updatedSections,
    });
  };

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-gray-800/50 hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span>🏗️</span>
          <span className="font-medium text-white">Adjust Sections</span>
          <span className="text-xs text-gray-500">({blueprint.sections.length} sections)</span>
        </div>
        <span className="text-gray-400">{isExpanded ? '▲' : '▼'}</span>
      </button>

      {isExpanded && (
        <div className="p-4 space-y-3 border-t border-gray-700 max-h-80 overflow-y-auto">
          {blueprint.sections.map((section, index) => (
            <div key={section.id} className="p-3 bg-gray-800/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white truncate">
                  {section.heading || `Section ${index + 1}`}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={section.presentation.emphasis}
                  onChange={(e) => updateSection(section.id, { emphasis: e.target.value as SectionDesign['presentation']['emphasis'] })}
                  className="text-xs"
                >
                  <option value="normal">Normal</option>
                  <option value="featured">Featured</option>
                  <option value="background">Background</option>
                  <option value="hero-moment">Hero Moment</option>
                </Select>
                <Select
                  value={section.presentation.spacing}
                  onChange={(e) => updateSection(section.id, { spacing: e.target.value as SectionDesign['presentation']['spacing'] })}
                  className="text-xs"
                >
                  <option value="tight">Tight</option>
                  <option value="normal">Normal</option>
                  <option value="breathe">Breathe</option>
                </Select>
              </div>
            </div>
          ))}

          {onRegenerate && (
            <button
              onClick={onRegenerate}
              disabled={isGenerating}
              className="w-full mt-2 p-2 text-sm text-blue-400 hover:text-blue-300 border border-blue-500/30 rounded-lg hover:bg-blue-500/10 transition-colors disabled:opacity-50"
            >
              {isGenerating ? 'Regenerating...' : '↻ Regenerate Blueprint'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
```

**Step 2: Commit**

```bash
git add components/publishing/panels/BlueprintPanel.tsx
git commit -m "feat(publishing): add BlueprintPanel component

Collapsible blueprint editing panel for Preview step:
- Section list with emphasis/spacing controls
- Regenerate blueprint button
- Scrollable for long article blueprints

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 3.3: Update StylePublishModal to 3 Steps

**Files:**
- Modify: `components/publishing/StylePublishModal.tsx`

**Step 1: Update the modal**

This is a significant refactor. Key changes:
- Change STEPS array from 6 to 3 steps
- Replace BrandStyleStep with BrandStep
- Merge LayoutConfigStep and BlueprintStep into PreviewStep as panels
- Remove DesignGenerationStep (happens automatically)
- Update navigation logic

The implementation should:
1. Use the new `useBrandDetection` hook
2. Pass detection results to preview/publish
3. Auto-generate blueprint after detection completes
4. Show panels in preview step

**Step 2: Test the flow**

Run: `npm run dev`
Navigate to Style & Publish modal and verify:
- 3 steps shown in progress bar
- Brand detection works with progress
- Preview shows with collapsible panels
- Publish works as before

**Step 3: Commit**

```bash
git add components/publishing/StylePublishModal.tsx
git commit -m "refactor(publishing): simplify modal to 3 steps

Major UX refactor:
- Step 1: Brand (one-click detection with progressive disclosure)
- Step 2: Preview (with collapsible Layout/Blueprint panels)
- Step 3: Publish (unchanged)

Connects new AI Vision services:
- AIDesignAnalyzer for Design DNA extraction
- BrandDesignSystemGenerator for unique CSS
- brandDesignSystemStorage for caching

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 4: Update Preview Step with Panels

### Task 4.1: Enhance PreviewStep with Collapsible Panels

**Files:**
- Modify: `components/publishing/steps/PreviewStep.tsx`

**Step 1: Update the component**

Add the LayoutPanel and BlueprintPanel as collapsible sections below the preview iframe. Include a hint message for users who want to proceed without changes.

**Step 2: Commit**

```bash
git add components/publishing/steps/PreviewStep.tsx
git commit -m "feat(publishing): enhance PreviewStep with collapsible panels

Add adjustment panels to Preview step:
- LayoutPanel for template/component configuration
- BlueprintPanel for section-level adjustments
- Hint message for proceeding without changes
- Panels collapsed by default

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Summary

This implementation plan covers:

1. **Phase 1** - Connect new AI Vision services (Tasks 1.1-1.3)
   - AnalysisProgress component for step-by-step feedback
   - DesignDNADisplay component with progressive disclosure
   - useBrandDetection hook orchestrating the full flow

2. **Phase 2** - Redesign Brand Step (Task 2.1)
   - New BrandStep component with minimal/expanded views

3. **Phase 3** - Simplify to 3 Steps (Tasks 3.1-3.3)
   - LayoutPanel collapsible component
   - BlueprintPanel collapsible component
   - StylePublishModal refactor from 6 to 3 steps

4. **Phase 4** - Enhanced Preview (Task 4.1)
   - PreviewStep with embedded panels

**Next Steps After This Plan:**
- Add inline editors for Design DNA sections
- Add keyboard shortcuts for power users
- Add "Apply to all articles" option for project-wide styling
