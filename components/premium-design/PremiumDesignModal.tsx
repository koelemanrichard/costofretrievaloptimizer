// =============================================================================
// PremiumDesignModal — Two-path export: Quick Export + Premium AI Design
// =============================================================================

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { EnrichedTopic, ContentBrief, TopicalMap } from '../../types';
import type { StyleGuide } from '../../types/styleGuide';
import { useAppState } from '../../state/appState';
import { getSupabaseClient } from '../../services/supabaseClient';
import { buildFullHtmlDocument, extractCenterpiece, cleanForExport, generateSlug } from '../../services/contentAssemblyService';
import { QUICK_EXPORT_CSS } from '../../services/quickExportStylesheet';
import {
  PremiumDesignOrchestrator,
  type PremiumDesignSession,
  type PremiumDesignConfig,
  type ValidationResult,
  type SavedPremiumDesign,
  loadLatestDesign,
  loadDesignHistory,
  savePremiumDesign,
} from '../../services/premium-design';
import { StyleGuideExtractor } from '../../services/design-analysis/StyleGuideExtractor';
import { StyleGuideGenerator, type AiRefineConfig } from '../../services/design-analysis/StyleGuideGenerator';
import { loadStyleGuide, saveStyleGuide, getHostnameFromUrl } from '../../services/design-analysis/styleGuidePersistence';
import { StyleGuideView } from './StyleGuideView';
import { generateStyleGuideHtml } from './StyleGuideExport';

// =============================================================================
// Types
// =============================================================================

interface PremiumDesignModalProps {
  isOpen: boolean;
  onClose: () => void;
  articleDraft: string;
  topic: EnrichedTopic;
  brief?: ContentBrief;
  topicalMap?: TopicalMap;
  projectId?: string;
  initialView?: 'fork' | 'premium-url';
}

type ModalView = 'fork' | 'quick-export' | 'premium-url' | 'extracting' | 'style-guide' | 'premium-design';
type PipelineStep = 'capturing' | 'generating-css' | 'rendering' | 'validating' | 'iterating' | 'complete' | 'error';

interface DesignHistoryEntry {
  id: string;
  version: number;
  final_score: number;
  target_url: string;
  iterations_count: number;
  created_at: string;
  status: 'complete' | 'error';
}

const PIPELINE_STEPS: { key: PipelineStep; label: string }[] = [
  { key: 'capturing', label: 'Capturing Target' },
  { key: 'generating-css', label: 'Generating CSS' },
  { key: 'rendering', label: 'Rendering Output' },
  { key: 'validating', label: 'Validating Match' },
  { key: 'complete', label: 'Complete' },
];

// =============================================================================
// Helpers
// =============================================================================

function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  return 'text-red-400';
}

function getScoreBg(score: number): string {
  if (score >= 80) return 'bg-green-900/30 border-green-500/30';
  if (score >= 60) return 'bg-yellow-900/30 border-yellow-500/30';
  return 'bg-red-900/30 border-red-500/30';
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

// =============================================================================
// Sub-components
// =============================================================================

const DesignProgress: React.FC<{ status: PipelineStep; iteration: number; maxIterations: number }> = ({
  status,
  iteration,
  maxIterations,
}) => {
  const activeIndex = PIPELINE_STEPS.findIndex(s => s.key === status);
  const isIterating = status === 'iterating';

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {PIPELINE_STEPS.map((step, i) => {
          const isActive = i === activeIndex || (isIterating && step.key === 'generating-css');
          const isDone = i < activeIndex;
          return (
            <React.Fragment key={step.key}>
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium border ${
                    isDone
                      ? 'bg-green-500/20 border-green-500/50 text-green-400'
                      : isActive
                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-400 animate-pulse'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                  }`}
                >
                  {isDone ? '\u2713' : i + 1}
                </div>
                <span className={`text-xs ${isActive ? 'text-blue-400' : isDone ? 'text-green-400' : 'text-zinc-500'}`}>
                  {step.label}
                </span>
              </div>
              {i < PIPELINE_STEPS.length - 1 && (
                <div className={`flex-1 h-px ${isDone ? 'bg-green-500/30' : 'bg-zinc-700'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {(isIterating || status === 'validating') && iteration > 1 && (
        <p className="text-xs text-zinc-400">Refinement {iteration} of {maxIterations}</p>
      )}
    </div>
  );
};

const ScoreDimension: React.FC<{ label: string; score: number; notes: string }> = ({ label, score, notes }) => (
  <div className="flex items-center gap-3">
    <div className="w-24 text-xs text-zinc-400">{label}</div>
    <div className="flex-1">
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
    <span className={`text-xs font-medium w-8 text-right ${getScoreColor(score)}`}>{score}</span>
  </div>
);

const ComparisonView: React.FC<{
  targetScreenshot: string;
  outputScreenshot: string;
  score: number;
  validation?: ValidationResult;
}> = ({ targetScreenshot, outputScreenshot, score, validation }) => (
  <div className="space-y-3">
    <div className="grid grid-cols-2 gap-3">
      <div>
        <p className="text-xs text-zinc-500 mb-1">Target Website</p>
        <div className="border border-zinc-700 rounded-lg overflow-hidden bg-white">
          <img
            src={`data:image/jpeg;base64,${targetScreenshot}`}
            alt="Target website"
            className="w-full h-auto"
          />
        </div>
      </div>
      <div>
        <p className="text-xs text-zinc-500 mb-1">Generated Output</p>
        <div className="border border-zinc-700 rounded-lg overflow-hidden bg-white">
          <img
            src={`data:image/jpeg;base64,${outputScreenshot}`}
            alt="Generated output"
            className="w-full h-auto"
          />
        </div>
      </div>
    </div>
    {validation && (
      <div className={`p-3 rounded-lg border ${getScoreBg(score)} space-y-2`}>
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-400 uppercase tracking-wide">Brand Match</span>
          <span className={`text-lg font-bold ${getScoreColor(score)}`}>{score}%</span>
        </div>
        <ScoreDimension label="Colors" score={validation.colorMatch.score} notes={validation.colorMatch.notes} />
        <ScoreDimension label="Typography" score={validation.typographyMatch.score} notes={validation.typographyMatch.notes} />
        <ScoreDimension label="Spacing" score={validation.spacingMatch.score} notes={validation.spacingMatch.notes} />
        <ScoreDimension label="Visual Depth" score={validation.visualDepth.score} notes={validation.visualDepth.notes} />
        <ScoreDimension label="Brand Fit" score={validation.brandFit.score} notes={validation.brandFit.notes} />
        <ScoreDimension label="Layout" score={validation.layoutSophistication?.score ?? 50} notes={validation.layoutSophistication?.notes ?? ''} />
      </div>
    )}
  </div>
);

const SavedDesignPreview: React.FC<{
  design: SavedPremiumDesign;
  onDownload: (html: string, prefix?: string) => void;
  onCopy: (html: string) => void;
  onRegenerate: () => void;
}> = ({ design, onDownload, onCopy, onRegenerate }) => (
  <div className="space-y-4">
    <div className="p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-zinc-400">
          Saved Design v{design.version} &middot; {formatDate(design.created_at)}
        </span>
        <span className={`text-sm font-bold ${getScoreColor(design.final_score)}`}>
          {design.final_score}% match
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <span>{design.target_url}</span>
        <span>&middot;</span>
        <span>{design.iterations_count} iteration{design.iterations_count !== 1 ? 's' : ''}</span>
      </div>
    </div>

    {/* Preview iframe */}
    <div className="border border-zinc-700 rounded-lg overflow-hidden bg-white" style={{ maxHeight: '50vh' }}>
      <iframe
        srcDoc={design.final_html}
        title="Saved Design Preview"
        className="w-full border-0"
        style={{ height: '50vh' }}
        sandbox="allow-same-origin allow-scripts"
      />
    </div>

    {/* Screenshots if available */}
    {design.target_screenshot && design.output_screenshot && (
      <ComparisonView
        targetScreenshot={design.target_screenshot}
        outputScreenshot={design.output_screenshot}
        score={design.final_score}
        validation={design.validation_result || undefined}
      />
    )}

    {/* Actions */}
    <div className="flex items-center gap-3 justify-between border-t border-zinc-800 pt-4">
      <button
        onClick={onRegenerate}
        className="px-3 py-1.5 text-xs bg-red-900/30 hover:bg-red-900/50 border border-red-500/30 text-red-400 rounded-lg transition-colors"
      >
        Re-generate Design
      </button>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onCopy(design.final_html)}
          className="px-3 py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg transition-colors"
        >
          Copy HTML
        </button>
        <button
          onClick={() => onDownload(design.final_html, 'premium')}
          className="px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
        >
          Download Premium HTML
        </button>
      </div>
    </div>
  </div>
);

// =============================================================================
// Main Component
// =============================================================================

export const PremiumDesignModal: React.FC<PremiumDesignModalProps> = ({
  isOpen,
  onClose,
  articleDraft,
  topic,
  brief,
  topicalMap,
  projectId,
  initialView = 'fork',
}) => {
  const { state, dispatch } = useAppState();
  const [view, setView] = useState<ModalView>(initialView);
  const [targetUrl, setTargetUrl] = useState(
    topicalMap?.business_info?.domain || ''
  );
  const [session, setSession] = useState<PremiumDesignSession | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [quickExportHtml, setQuickExportHtml] = useState('');
  const orchestratorRef = useRef<PremiumDesignOrchestrator | null>(null);

  // Saved design state
  const [savedDesign, setSavedDesign] = useState<SavedPremiumDesign | null>(null);
  const [designHistory, setDesignHistory] = useState<DesignHistoryEntry[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [forceRegenerate, setForceRegenerate] = useState(false);

  // Style guide mode — entered from "Style Guide" menu, skips saved design preview
  const [styleGuideMode, setStyleGuideMode] = useState(initialView === 'premium-url');

  // Style guide state
  const [styleGuide, setStyleGuide] = useState<StyleGuide | null>(null);
  const [isExtractingGuide, setIsExtractingGuide] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [isRefiningElement, setIsRefiningElement] = useState(false);
  const [extractionPhase, setExtractionPhase] = useState<string>('');
  const [extractionProgress, setExtractionProgress] = useState<string>('');

  // Get Supabase client helper
  const getSupabase = useCallback(() => {
    const bi = state.businessInfo;
    if (!bi?.supabaseUrl || !bi?.supabaseAnonKey) return null;
    try {
      return getSupabaseClient(bi.supabaseUrl, bi.supabaseAnonKey);
    } catch {
      return null;
    }
  }, [state.businessInfo]);

  // Get AI config for validation/fallback
  const getAiConfig = useCallback((): AiRefineConfig | null => {
    const bi = state.businessInfo;
    if (bi?.geminiApiKey) return { provider: 'gemini', apiKey: bi.geminiApiKey };
    if (bi?.anthropicApiKey) return { provider: 'anthropic', apiKey: bi.anthropicApiKey };
    if (bi?.openAiApiKey) return { provider: 'openai', apiKey: bi.openAiApiKey };
    return null;
  }, [state.businessInfo]);

  // Load saved design when modal opens
  useEffect(() => {
    if (!isOpen || !topic?.id) return;

    const loadSaved = async () => {
      const supabase = getSupabase();
      const userId = state.user?.id;
      if (!supabase || !userId) return;

      setIsLoadingSaved(true);
      try {
        const [latest, history] = await Promise.all([
          loadLatestDesign(supabase, userId, topic.id),
          loadDesignHistory(supabase, userId, topic.id),
        ]);

        if (latest && latest.status === 'complete') {
          setSavedDesign(latest);
        }
        setDesignHistory(history as DesignHistoryEntry[]);
      } catch (err) {
        console.error('[PremiumDesignModal] Failed to load saved design:', err);
      } finally {
        setIsLoadingSaved(false);
      }
    };

    loadSaved();
  }, [isOpen, topic?.id, getSupabase, state.user?.id]);

  // Reset state when modal closes
  // Reset to initialView when modal opens/closes; also react to initialView changes while open
  useEffect(() => {
    if (!isOpen) {
      setView(initialView);
      setSession(null);
      setForceRegenerate(false);
      setStyleGuide(null);
      setExtractionError(null);
      setStyleGuideMode(initialView === 'premium-url');
    }
  }, [isOpen, initialView]);

  // When initialView changes while modal is already open, navigate to it
  useEffect(() => {
    if (isOpen) {
      setView(initialView);
      setStyleGuideMode(initialView === 'premium-url');
    }
  }, [initialView]); // eslint-disable-line react-hooks/exhaustive-deps

  // Generate Quick Export HTML
  const generateQuickExport = useCallback(() => {
    if (!brief) return;
    const cleaned = cleanForExport(articleDraft);
    const centerpiece = extractCenterpiece(cleaned, 300) || brief.metaDescription || '';
    const html = buildFullHtmlDocument(cleaned, {
      title: brief.title,
      metaDescription: brief.metaDescription,
      targetKeyword: brief.targetKeyword,
      centerpiece,
      authorName: topicalMap?.business_info?.authorName || '',
      language: topicalMap?.business_info?.language || 'en',
    });
    setQuickExportHtml(html);
    setView('quick-export');
  }, [articleDraft, brief, topicalMap]);

  // Start Premium Design pipeline
  const startPremiumDesign = useCallback(async () => {
    if (!brief || !targetUrl.trim()) return;

    const bi = state.businessInfo;
    const apiKey = bi?.geminiApiKey || bi?.anthropicApiKey || bi?.openAiApiKey || '';
    const provider: PremiumDesignConfig['aiProvider'] =
      bi?.geminiApiKey ? 'gemini' :
      bi?.anthropicApiKey ? 'anthropic' :
      bi?.openAiApiKey ? 'openai' : 'gemini';

    if (!apiKey) {
      dispatch({ type: 'SET_ERROR', payload: 'No AI API key configured. Add a Gemini, Anthropic, or OpenAI key in Settings.' });
      return;
    }

    const config: PremiumDesignConfig = {
      targetScore: 85,
      maxIterations: 3,
      aiProvider: provider,
      apiKey,
      apifyToken: bi?.apifyToken || '',
      proxyConfig: bi?.supabaseUrl && bi?.supabaseAnonKey
        ? { supabaseUrl: bi.supabaseUrl, supabaseAnonKey: bi.supabaseAnonKey }
        : undefined,
    };

    if (!config.apifyToken) {
      dispatch({ type: 'SET_ERROR', payload: 'Apify API token required for website capture. Add it in Settings.' });
      return;
    }

    setIsRunning(true);
    setSavedDesign(null);
    const orchestrator = new PremiumDesignOrchestrator(config);
    orchestratorRef.current = orchestrator;

    // Build persistence options
    const supabase = getSupabase();
    const userId = state.user?.id;
    const persistenceOpts = supabase && userId ? {
      supabase,
      userId,
      topicId: topic.id,
      briefId: brief.id,
      mapId: topicalMap?.id,
    } : undefined;

    try {
      const result = await orchestrator.run(
        articleDraft,
        brief.title,
        targetUrl,
        (progressSession) => setSession(structuredClone(progressSession)),
        {
          industry: topicalMap?.business_info?.industry || '',
          audience: topicalMap?.business_info?.audience || '',
          articlePurpose: 'informational',
        },
        persistenceOpts,
        brief?.structured_outline
      );
      setSession(result);

      // Update saved design state if it was persisted
      if ((result as any).savedDesign) {
        setSavedDesign((result as any).savedDesign);
        // Refresh history
        if (supabase && userId) {
          const history = await loadDesignHistory(supabase, userId, topic.id);
          setDesignHistory(history as DesignHistoryEntry[]);
        }
      }
    } catch (err) {
      console.error('[PremiumDesignModal] Pipeline error:', err);
      dispatch({ type: 'SET_ERROR', payload: `Design pipeline failed: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setIsRunning(false);
    }
  }, [brief, targetUrl, articleDraft, topicalMap, state.businessInfo, state.user?.id, topic, dispatch, getSupabase]);

  // Handle re-generate
  const handleRegenerate = useCallback(() => {
    setSavedDesign(null);
    setSession(null);
    setForceRegenerate(true);
    setView('premium-url');
  }, []);

  // Download final HTML
  const handleDownload = useCallback((html: string, prefix: string = '') => {
    const slug = brief?.slug || generateSlug(brief?.title || topic.title) || 'article';
    const filename = prefix ? `${slug}-${prefix}.html` : `${slug}.html`;
    downloadFile(new Blob([html], { type: 'text/html' }), filename);
    dispatch({ type: 'SET_NOTIFICATION', payload: `Downloaded: ${filename}` });
  }, [brief, topic, dispatch]);

  // Copy HTML to clipboard
  const handleCopy = useCallback(async (html: string) => {
    try {
      await navigator.clipboard.writeText(html);
      dispatch({ type: 'SET_NOTIFICATION', payload: 'HTML copied to clipboard' });
    } catch {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to copy to clipboard' });
    }
  }, [dispatch]);

  // Start style guide extraction
  const startStyleGuideExtraction = useCallback(async () => {
    if (!targetUrl.trim()) return;
    const bi = state.businessInfo;
    const apifyToken = bi?.apifyToken || '';
    if (!apifyToken) {
      dispatch({ type: 'SET_ERROR', payload: 'Apify API token required for style guide extraction. Add it in Settings.' });
      return;
    }

    setIsExtractingGuide(true);
    setExtractionError(null);
    setView('extracting');

    // Check cache first
    const supabase = getSupabase();
    const userId = state.user?.id;
    const hostname = getHostnameFromUrl(targetUrl);

    if (supabase && userId) {
      try {
        const cached = await loadStyleGuide(supabase, userId, hostname);
        if (cached) {
          console.log('[PremiumDesignModal] Loaded cached style guide for:', hostname);
          setStyleGuide(cached.style_guide);
          setView('style-guide');
          setIsExtractingGuide(false);
          return;
        }
      } catch (err) {
        console.warn('[PremiumDesignModal] Failed to load cached style guide:', err);
      }
    }

    try {
      const proxyConfig = bi?.supabaseUrl && bi?.supabaseAnonKey
        ? { supabaseUrl: bi.supabaseUrl, supabaseAnonKey: bi.supabaseAnonKey }
        : undefined;

      setExtractionPhase('');
      setExtractionProgress('');
      const rawExtraction = await StyleGuideExtractor.extractStyleGuide(targetUrl, apifyToken, proxyConfig);
      let guide = StyleGuideGenerator.generate(rawExtraction, rawExtraction.screenshotBase64, targetUrl);

      // AI Validation: score elements using vision
      const aiConfig = getAiConfig();
      if (aiConfig && guide.elements.some(e => e.elementScreenshotBase64)) {
        setExtractionPhase('validating');
        guide = await StyleGuideGenerator.validateElements(guide, aiConfig, (done, total) => {
          setExtractionProgress(`Validating ${done}/${total} elements...`);
        });
      }

      // AI Fallback: generate missing category elements
      if (aiConfig) {
        setExtractionPhase('enriching');
        setExtractionProgress('');
        guide = await StyleGuideGenerator.generateFallbackElements(guide, aiConfig);
      }

      setStyleGuide(guide);
      setView('style-guide');

      // Save to cache
      if (supabase && userId) {
        try {
          await saveStyleGuide(supabase, userId, guide);
        } catch (err) {
          console.warn('[PremiumDesignModal] Failed to save style guide:', err);
        }
      }
    } catch (err) {
      console.error('[PremiumDesignModal] Style guide extraction failed:', err);
      setExtractionError(err instanceof Error ? err.message : String(err));
      setView('premium-url');
    } finally {
      setIsExtractingGuide(false);
      setExtractionPhase('');
      setExtractionProgress('');
    }
  }, [targetUrl, state.businessInfo, state.user?.id, dispatch, getSupabase, getAiConfig]);

  // Handle style guide approval → continue to premium design pipeline
  const handleStyleGuideApproved = useCallback(async (approvedGuide: StyleGuide) => {
    setStyleGuide(approvedGuide);

    // Save approved guide
    const supabase = getSupabase();
    const userId = state.user?.id;
    if (supabase && userId) {
      try {
        await saveStyleGuide(supabase, userId, approvedGuide);
      } catch (err) {
        console.warn('[PremiumDesignModal] Failed to save approved style guide:', err);
      }
    }

    // Start the premium design pipeline with the approved style guide
    if (!brief) return;
    const bi = state.businessInfo;
    const apiKey = bi?.geminiApiKey || bi?.anthropicApiKey || bi?.openAiApiKey || '';
    const provider: PremiumDesignConfig['aiProvider'] =
      bi?.geminiApiKey ? 'gemini' :
      bi?.anthropicApiKey ? 'anthropic' :
      bi?.openAiApiKey ? 'openai' : 'gemini';

    if (!apiKey) {
      dispatch({ type: 'SET_ERROR', payload: 'No AI API key configured.' });
      return;
    }

    const config: PremiumDesignConfig = {
      targetScore: 85,
      maxIterations: 3,
      aiProvider: provider,
      apiKey,
      apifyToken: bi?.apifyToken || '',
      proxyConfig: bi?.supabaseUrl && bi?.supabaseAnonKey
        ? { supabaseUrl: bi.supabaseUrl, supabaseAnonKey: bi.supabaseAnonKey }
        : undefined,
    };

    setView('premium-design');
    setIsRunning(true);
    setSavedDesign(null);
    const orchestrator = new PremiumDesignOrchestrator(config);
    orchestratorRef.current = orchestrator;

    const persistenceOpts = supabase && userId ? {
      supabase,
      userId,
      topicId: topic.id,
      briefId: brief.id,
      mapId: topicalMap?.id,
    } : undefined;

    try {
      const result = await orchestrator.run(
        articleDraft,
        brief.title,
        targetUrl,
        (progressSession) => setSession(structuredClone(progressSession)),
        {
          industry: topicalMap?.business_info?.industry || '',
          audience: topicalMap?.business_info?.audience || '',
          articlePurpose: 'informational',
        },
        persistenceOpts,
        brief?.structured_outline,
        approvedGuide
      );
      setSession(result);

      if ((result as any).savedDesign) {
        setSavedDesign((result as any).savedDesign);
        if (supabase && userId) {
          const history = await loadDesignHistory(supabase, userId, topic.id);
          setDesignHistory(history as DesignHistoryEntry[]);
        }
      }
    } catch (err) {
      console.error('[PremiumDesignModal] Pipeline error:', err);
      dispatch({ type: 'SET_ERROR', payload: `Design pipeline failed: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setIsRunning(false);
    }
  }, [brief, targetUrl, articleDraft, topicalMap, state.businessInfo, state.user?.id, topic, dispatch, getSupabase]);

  // Handle AI element refinement
  const handleRefineElement = useCallback(async (elementId: string) => {
    if (!styleGuide) return;
    const element = styleGuide.elements.find(e => e.id === elementId);
    if (!element?.userComment) return;

    const bi = state.businessInfo;
    const apiKey = bi?.geminiApiKey || bi?.anthropicApiKey || bi?.openAiApiKey || '';
    const provider =
      bi?.geminiApiKey ? 'gemini' :
      bi?.anthropicApiKey ? 'anthropic' :
      bi?.openAiApiKey ? 'openai' : 'gemini';

    if (!apiKey) return;

    setIsRefiningElement(true);
    try {
      const result = await StyleGuideGenerator.refineElement(
        element,
        element.userComment,
        element.referenceImageBase64,
        styleGuide.screenshotBase64,
        { provider: provider as 'gemini' | 'anthropic' | 'openai', apiKey }
      );
      setStyleGuide({
        ...styleGuide,
        elements: styleGuide.elements.map(el =>
          el.id === elementId
            ? { ...el, selfContainedHtml: result.selfContainedHtml, computedCss: result.computedCss }
            : el
        ),
      });
    } catch (err) {
      console.error('[PremiumDesignModal] Element refinement failed:', err);
    } finally {
      setIsRefiningElement(false);
    }
  }, [styleGuide, state.businessInfo]);

  // Handle style guide export
  const handleStyleGuideExport = useCallback(() => {
    if (!styleGuide) return;
    const html = generateStyleGuideHtml(styleGuide);
    const filename = `${styleGuide.hostname}-style-guide.html`;
    downloadFile(new Blob([html], { type: 'text/html' }), filename);
    dispatch({ type: 'SET_NOTIFICATION', payload: `Downloaded: ${filename}` });
  }, [styleGuide, dispatch]);

  if (!isOpen) return null;

  const latestIteration = session?.iterations[session.iterations.length - 1];
  const hasSavedDesign = savedDesign && !forceRegenerate;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
          <h2 className="text-sm font-medium text-zinc-200">
            {view === 'fork' ? 'Export & Design'
              : view === 'quick-export' ? 'Quick Export'
              : view === 'style-guide' ? 'Style Guide Review'
              : view === 'extracting' ? 'Extracting Style Guide...'
              : view === 'premium-url' && styleGuideMode ? 'Style Guide Extraction'
              : view === 'premium-url' ? 'Premium Design Studio'
              : 'Premium Design Studio'}
          </h2>
          <div className="flex items-center gap-2">
            {view !== 'fork' && (
              <button
                onClick={() => {
                  if (view === 'style-guide') { setView('premium-url'); }
                  else if (view === 'premium-design' && !isRunning) { setView('style-guide'); }
                  else { setView('fork'); setSession(null); setForceRegenerate(false); setStyleGuide(null); }
                }}
                className="text-xs text-zinc-400 hover:text-zinc-200 px-2 py-1"
                disabled={isRunning || isExtractingGuide}
              >
                Back
              </button>
            )}
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-200 p-1"
              disabled={isRunning}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* ── Fork Screen ── */}
          {view === 'fork' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto mt-4">
                {/* Quick Export Card */}
                <button
                  onClick={generateQuickExport}
                  className="p-6 rounded-xl border border-zinc-700 hover:border-zinc-500 bg-zinc-800/50 hover:bg-zinc-800 text-left transition-all group"
                >
                  <div className="text-2xl mb-3">&#9889;</div>
                  <h3 className="text-sm font-medium text-zinc-200 mb-1">Quick Export</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Professional HTML with responsive design, dark mode, TOC, and print styles. Instant download.
                  </p>
                  <span className="text-xs text-blue-400 mt-3 block group-hover:text-blue-300">
                    Instant &rarr;
                  </span>
                </button>

                {/* Premium Design Card */}
                <button
                  onClick={() => setView('premium-url')}
                  className="p-6 rounded-xl border border-zinc-700 hover:border-purple-500/50 bg-zinc-800/50 hover:bg-zinc-800 text-left transition-all group relative"
                >
                  <div className="text-2xl mb-3">&#127912;</div>
                  <h3 className="text-sm font-medium text-zinc-200 mb-1">Premium Design</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    AI generates a custom CSS stylesheet matching your brand website. Validated with visual comparison.
                  </p>
                  <span className="text-xs text-purple-400 mt-3 block group-hover:text-purple-300">
                    {hasSavedDesign ? `Saved v${savedDesign.version} (${savedDesign.final_score}%)` : 'AI-powered'} &rarr;
                  </span>
                  {hasSavedDesign && (
                    <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-green-500" title="Saved design available" />
                  )}
                </button>
              </div>

              {/* Design History */}
              {designHistory.length > 0 && (
                <div className="max-w-2xl mx-auto">
                  <p className="text-xs text-zinc-500 mb-2">Design History ({designHistory.length} version{designHistory.length !== 1 ? 's' : ''})</p>
                  <div className="space-y-1">
                    {designHistory.slice(0, 5).map((entry) => (
                      <div key={entry.id} className="flex items-center gap-3 p-2 bg-zinc-800/30 rounded-lg text-xs">
                        <span className="text-zinc-500 w-10">v{entry.version}</span>
                        <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              entry.final_score >= 80 ? 'bg-green-500' :
                              entry.final_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${entry.final_score}%` }}
                          />
                        </div>
                        <span className={`font-medium ${getScoreColor(entry.final_score)}`}>
                          {entry.final_score}%
                        </span>
                        <span className="text-zinc-600 w-28 text-right">{formatDate(entry.created_at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isLoadingSaved && (
                <p className="text-xs text-zinc-500 text-center animate-pulse">Loading saved designs...</p>
              )}
            </div>
          )}

          {/* ── Quick Export View ── */}
          {view === 'quick-export' && quickExportHtml && (
            <div className="space-y-4">
              {/* Preview */}
              <div className="border border-zinc-700 rounded-lg overflow-hidden bg-white" style={{ maxHeight: '60vh' }}>
                <iframe
                  srcDoc={quickExportHtml}
                  title="Quick Export Preview"
                  className="w-full border-0"
                  style={{ height: '60vh' }}
                  sandbox="allow-same-origin allow-scripts"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => handleCopy(quickExportHtml)}
                  className="px-3 py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg transition-colors"
                >
                  Copy HTML
                </button>
                <button
                  onClick={() => handleDownload(quickExportHtml)}
                  className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                >
                  Download HTML
                </button>
              </div>
            </div>
          )}

          {/* ── Premium URL Input View ── */}
          {view === 'premium-url' && (
            <div className="space-y-5">
              {/* Show saved design if available and not forcing regeneration (skip in style guide mode) */}
              {hasSavedDesign && !session && !styleGuideMode && (
                <SavedDesignPreview
                  design={savedDesign}
                  onDownload={handleDownload}
                  onCopy={handleCopy}
                  onRegenerate={handleRegenerate}
                />
              )}

              {/* URL Input — always visible in style guide mode */}
              {(!hasSavedDesign || styleGuideMode) && (
                <div className="space-y-3 max-w-lg mx-auto mt-4">
                  {forceRegenerate && (
                    <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg mb-2">
                      <p className="text-xs text-yellow-400">
                        Starting fresh. A new version will be created (previous versions are kept).
                      </p>
                    </div>
                  )}
                  {extractionError && (
                    <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg mb-2">
                      <p className="text-xs text-red-400">Extraction failed: {extractionError}</p>
                    </div>
                  )}
                  <label className="block text-xs text-zinc-400">Target Website URL</label>
                  <input
                    type="url"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-xs text-zinc-500">
                    We'll extract actual design elements from this website. You can review and approve each element before generating your article design.
                  </p>
                  <button
                    onClick={startStyleGuideExtraction}
                    disabled={!targetUrl.trim() || isExtractingGuide}
                    className="w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {isExtractingGuide ? 'Extracting...' : 'Extract Style Guide'}
                  </button>
                  <button
                    onClick={startPremiumDesign}
                    disabled={!targetUrl.trim() || isRunning || isExtractingGuide}
                    className="w-full px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 text-xs rounded-lg transition-colors"
                  >
                    Skip Style Guide (legacy pipeline)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Extracting View ── */}
          {view === 'extracting' && (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-zinc-300">
                {extractionPhase === 'validating'
                  ? extractionProgress || 'Validating elements with AI...'
                  : extractionPhase === 'enriching'
                    ? 'Generating missing design elements...'
                    : `Extracting design elements from ${targetUrl}...`}
              </p>
              {extractionPhase === '' && (
                <p className="text-xs text-zinc-500">Scanning up to 4 pages... this may take 60-90 seconds</p>
              )}
              {extractionPhase === 'validating' && (
                <p className="text-xs text-zinc-500">AI is scoring each element for quality</p>
              )}
              {extractionPhase === 'enriching' && (
                <p className="text-xs text-zinc-500">Creating fallback elements for empty categories</p>
              )}
            </div>
          )}

          {/* ── Style Guide Review View ── */}
          {view === 'style-guide' && styleGuide && (
            <div style={{ minHeight: '50vh' }}>
              <StyleGuideView
                styleGuide={styleGuide}
                onApprove={handleStyleGuideApproved}
                onReextract={() => {
                  setStyleGuide(null);
                  startStyleGuideExtraction();
                }}
                onExport={handleStyleGuideExport}
                onRefineElement={handleRefineElement}
                isRefining={isRefiningElement}
                onChange={setStyleGuide}
              />
            </div>
          )}

          {/* ── Premium Design View ── */}
          {view === 'premium-design' && (
            <div className="space-y-5">

              {/* Pipeline Progress */}
              {session && session.status !== 'complete' && session.status !== 'error' && (
                <div className="space-y-4">
                  <DesignProgress
                    status={session.status}
                    iteration={session.currentIteration}
                    maxIterations={3}
                  />

                  {/* Show comparison once we have screenshots */}
                  {latestIteration && session.targetScreenshot && (
                    <ComparisonView
                      targetScreenshot={session.targetScreenshot}
                      outputScreenshot={latestIteration.screenshotBase64}
                      score={latestIteration.validationResult.overallScore}
                      validation={latestIteration.validationResult}
                    />
                  )}

                  {/* Accept early button */}
                  {latestIteration && (
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          if (session) {
                            const updatedSession = { ...session, status: 'complete' as const, finalHtml: session.finalHtml };
                            setSession(updatedSession);
                            setIsRunning(false);
                          }
                        }}
                        className="px-3 py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg transition-colors"
                      >
                        Accept Current Design
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Error State */}
              {session?.status === 'error' && (
                <div className="space-y-4">
                  <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                    <p className="text-sm text-red-400">Pipeline failed: {session.errorMessage}</p>
                    <p className="text-xs text-zinc-400 mt-1">Falling back to Quick Export styling.</p>
                  </div>
                  {session.finalHtml && (
                    <div className="flex items-center gap-3 justify-end">
                      <button
                        onClick={() => handleCopy(session.finalHtml)}
                        className="px-3 py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg transition-colors"
                      >
                        Copy Fallback HTML
                      </button>
                      <button
                        onClick={() => handleDownload(session.finalHtml, 'fallback')}
                        className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                      >
                        Download Fallback HTML
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Complete State */}
              {session?.status === 'complete' && (
                <div className="space-y-4">
                  {/* Saved confirmation */}
                  {savedDesign && (
                    <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-lg flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <p className="text-xs text-green-400">
                        Design saved as version {savedDesign.version}. It will be available next time you open this topic.
                      </p>
                    </div>
                  )}

                  {/* Final comparison */}
                  {latestIteration && session.targetScreenshot && (
                    <ComparisonView
                      targetScreenshot={session.targetScreenshot}
                      outputScreenshot={latestIteration.screenshotBase64}
                      score={session.finalScore}
                      validation={latestIteration.validationResult}
                    />
                  )}

                  {/* Iteration History */}
                  {session.iterations.length > 1 && (
                    <details className="group">
                      <summary className="text-xs text-zinc-400 cursor-pointer hover:text-zinc-300">
                        Iteration History ({session.iterations.length} iterations)
                      </summary>
                      <div className="mt-2 space-y-2">
                        {session.iterations.map((iter, i) => (
                          <div key={i} className="flex items-center gap-3 p-2 bg-zinc-800/50 rounded-lg">
                            <span className="text-xs text-zinc-500 w-16">Round {iter.iteration}</span>
                            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  iter.validationResult.overallScore >= 80 ? 'bg-green-500' :
                                  iter.validationResult.overallScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${iter.validationResult.overallScore}%` }}
                              />
                            </div>
                            <span className={`text-xs font-medium ${getScoreColor(iter.validationResult.overallScore)}`}>
                              {iter.validationResult.overallScore}%
                            </span>
                            <span className="text-xs text-zinc-600">
                              {(iter.durationMs / 1000).toFixed(1)}s
                            </span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3 justify-between border-t border-zinc-800 pt-4">
                    <button
                      onClick={handleRegenerate}
                      className="px-3 py-1.5 text-xs bg-red-900/30 hover:bg-red-900/50 border border-red-500/30 text-red-400 rounded-lg transition-colors"
                    >
                      Re-generate
                    </button>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleCopy(session.finalHtml)}
                        className="px-3 py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg transition-colors"
                      >
                        Copy HTML
                      </button>
                      <button
                        onClick={() => handleDownload(session.finalHtml, 'premium')}
                        className="px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
                      >
                        Download Premium HTML
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PremiumDesignModal;
