import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { SiteInventoryItem } from '../../../types';
import type { BatchAuditProgress, BatchAuditOptions } from '../../../services/audit/BatchAuditService';
import { InventoryTriagePanel } from './InventoryTriagePanel';
import {
  classifyUrl,
  getCategoryLabel,
  getCategoryColor,
  getCategoryBgColor,
  type UrlCategory,
} from '../../../utils/urlClassifier';

interface AuditStepProps {
  projectId: string;
  mapId: string;
  inventory: SiteInventoryItem[];
  onComplete: () => void;
  onRefreshInventory: () => void;
  // Lifted audit state from useBatchAudit (lives in AuthorityWizardContainer)
  isRunning: boolean;
  progress: BatchAuditProgress | null;
  startBatch: (items: SiteInventoryItem[], options?: BatchAuditOptions) => Promise<void>;
  cancelBatch: () => void;
  auditError: string | null;
}

type ScrapingProvider = 'jina' | 'firecrawl' | 'apify' | 'direct';
type QualityBucket = 'good' | 'needsWork' | 'poor';

function getQualityBucket(score: number): QualityBucket {
  if (score >= 70) return 'good';
  if (score >= 40) return 'needsWork';
  return 'poor';
}

function getQualityColor(bucket: QualityBucket): string {
  switch (bucket) {
    case 'good': return 'text-green-400';
    case 'needsWork': return 'text-yellow-400';
    case 'poor': return 'text-red-400';
  }
}

function getQualityBg(bucket: QualityBucket): string {
  switch (bucket) {
    case 'good': return 'bg-green-900/30 text-green-400';
    case 'needsWork': return 'bg-yellow-900/30 text-yellow-400';
    case 'poor': return 'bg-red-900/30 text-red-400';
  }
}

function getCwvLabel(assessment?: string): { label: string; className: string } {
  switch (assessment) {
    case 'good': return { label: 'Good', className: 'text-green-400' };
    case 'needs-improvement': return { label: 'Needs Work', className: 'text-yellow-400' };
    case 'poor': return { label: 'Poor', className: 'text-red-400' };
    default: return { label: '--', className: 'text-gray-500' };
  }
}

function truncateUrl(url: string, maxLen = 50): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname + parsed.search;
    if (path.length <= maxLen) return path;
    return path.slice(0, maxLen - 3) + '...';
  } catch {
    if (url.length <= maxLen) return url;
    return url.slice(0, maxLen - 3) + '...';
  }
}

// ── Category Quality Stats ────────────────────────────────────────────────────

interface CategoryQuality {
  category: UrlCategory;
  pages: number;
  avgScore: number;
  worstScore: number;
  needsWork: number;
}

function computeCategoryQuality(items: SiteInventoryItem[]): CategoryQuality[] {
  const groups = new Map<UrlCategory, SiteInventoryItem[]>();
  for (const item of items) {
    const { category } = classifyUrl(item.url);
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category)!.push(item);
  }

  const results: CategoryQuality[] = [];
  for (const [category, catItems] of groups) {
    if (catItems.length === 0) continue;
    const scores = catItems.map(i => i.audit_score ?? 0);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const worstScore = Math.min(...scores);
    const needsWork = catItems.filter(i => (i.audit_score ?? 0) < 70).length;
    results.push({ category, pages: catItems.length, avgScore, worstScore, needsWork });
  }

  // Sort by pages descending
  return results.sort((a, b) => b.pages - a.pages);
}

// ── Priority Insights ─────────────────────────────────────────────────────────

interface PriorityInsights {
  critical: number;  // score < 40 and clicks > 0
  high: number;      // score 40-60 and clicks > 100
  medium: number;    // score 40-60 and clicks <= 100
  good: number;      // score >= 70
}

function computePriorityInsights(items: SiteInventoryItem[]): PriorityInsights {
  let critical = 0, high = 0, medium = 0, good = 0;
  for (const item of items) {
    const score = item.audit_score ?? 0;
    const clicks = item.gsc_clicks ?? 0;
    if (score >= 70) { good++; }
    else if (score < 40 && clicks > 0) { critical++; }
    else if (score < 70 && clicks > 100) { high++; }
    else { medium++; }
  }
  return { critical, high, medium, good };
}

// ── Main Component ────────────────────────────────────────────────────────────

export const AuditStep: React.FC<AuditStepProps> = ({
  projectId,
  mapId,
  inventory,
  onComplete,
  onRefreshInventory,
  isRunning,
  progress,
  startBatch,
  cancelBatch,
  auditError: error,
}) => {

  // Config state
  const [scrapingProvider, setScrapingProvider] = useState<ScrapingProvider>('jina');
  const [concurrency, setConcurrency] = useState(2);
  const [hasFinished, setHasFinished] = useState(false);

  // Detect if audit was previously completed (inventory already has audit scores)
  const alreadyAuditedCount = useMemo(
    () => inventory.filter(item => item.audit_score != null).length,
    [inventory],
  );

  // Audited items for the results table -- sorted by quality score ascending (worst first)
  const auditedItems = useMemo(
    () =>
      inventory
        .filter(item => item.audit_score != null)
        .sort((a, b) => (a.audit_score ?? 0) - (b.audit_score ?? 0)),
    [inventory],
  );

  // Summary stats
  const summary = useMemo(() => {
    const items = auditedItems;
    if (items.length === 0) return { good: 0, needsWork: 0, poor: 0, avg: 0 };
    const good = items.filter(i => (i.audit_score ?? 0) >= 70).length;
    const poor = items.filter(i => (i.audit_score ?? 0) < 40).length;
    const needsWork = items.length - good - poor;
    const avg = Math.round(items.reduce((sum, i) => sum + (i.audit_score ?? 0), 0) / items.length);
    return { good, needsWork, poor, avg };
  }, [auditedItems]);

  // CWV summary
  const cwvSummary = useMemo(() => {
    const withCwv = auditedItems.filter(i => i.cwv_assessment);
    if (withCwv.length === 0) return null;
    const good = withCwv.filter(i => i.cwv_assessment === 'good').length;
    const needsWork = withCwv.filter(i => i.cwv_assessment === 'needs-improvement').length;
    const poor = withCwv.filter(i => i.cwv_assessment === 'poor').length;
    const goodPercent = Math.round((good / withCwv.length) * 100);
    return { good, needsWork, poor, total: withCwv.length, goodPercent };
  }, [auditedItems]);

  // Category quality breakdown
  const categoryQuality = useMemo(
    () => auditedItems.length > 0 ? computeCategoryQuality(auditedItems) : [],
    [auditedItems],
  );

  // Priority insights
  const priorityInsights = useMemo(
    () => auditedItems.length > 0 ? computePriorityInsights(auditedItems) : null,
    [auditedItems],
  );

  // Auto-complete: if all items are already audited, mark step as done
  useEffect(() => {
    if (inventory.length > 0 && alreadyAuditedCount === inventory.length && !isRunning) {
      setHasFinished(true);
      onComplete();
    }
  }, [inventory.length, alreadyAuditedCount, isRunning, onComplete]);

  // Track completion: when batch finishes, refresh inventory and notify parent
  const prevIsRunning = React.useRef(isRunning);
  useEffect(() => {
    if (prevIsRunning.current && !isRunning && !error) {
      setHasFinished(true);
      onRefreshInventory();
      onComplete();
    }
    prevIsRunning.current = isRunning;
  }, [isRunning, error, onComplete, onRefreshInventory]);

  // Accept optional filtered array from triage panel
  const handleStart = useCallback((filteredItems?: SiteInventoryItem[]) => {
    const options: BatchAuditOptions = {
      concurrency,
      scrapingProvider,
      skipAlreadyAudited: true,
    };
    startBatch(filteredItems || inventory, options);
  }, [concurrency, scrapingProvider, inventory, startBatch]);

  const handleCancel = useCallback(() => {
    cancelBatch();
    onRefreshInventory();
  }, [cancelBatch, onRefreshInventory]);

  const progressPercent = progress
    ? Math.round((progress.completed / Math.max(progress.total, 1)) * 100)
    : 0;

  const pendingCount = inventory.length - alreadyAuditedCount;

  const [showAdvanced, setShowAdvanced] = useState(false);

  // Determine rendering mode
  const showTriagePanel = !isRunning && !hasFinished && alreadyAuditedCount === 0;
  const showResumeMode = !isRunning && !hasFinished && alreadyAuditedCount > 0;
  const showResults = auditedItems.length > 0;

  return (
    <div className="px-4 py-3 space-y-3">
      {/* ── Mode 1: Pre-analysis Triage Panel ─────────────────────────────── */}
      {showTriagePanel && (
        <InventoryTriagePanel
          inventory={inventory}
          onStartAnalysis={handleStart}
          onSkip={onComplete}
          isRunning={isRunning}
        />
      )}

      {/* ── Mode 2: Resume (some pages already audited) ──────────────────── */}
      {showResumeMode && (
        <>
          <div>
            <h2 className="text-lg font-semibold text-white">Analyzing every page</h2>
            <p className="text-sm text-gray-400 mt-1">
              We'll analyze each page's content quality and technical health. This takes about 10 seconds per page.
            </p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex gap-2">
                <button
                  onClick={() => handleStart()}
                  disabled={inventory.length === 0}
                  className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    inventory.length === 0
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer'
                  }`}
                >
                  Resume Audit ({pendingCount} remaining)
                </button>
              </div>

              <p className="text-xs text-gray-500">
                {alreadyAuditedCount} of {inventory.length} already audited.
              </p>

              {/* Advanced Settings Toggle */}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="ml-auto text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {showAdvanced ? 'Hide Settings' : 'Settings'}
              </button>
            </div>

            {showAdvanced && (
              <div className="mt-4 pt-4 border-t border-gray-700 flex flex-wrap items-end gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400">Scraping Provider</label>
                  <select
                    value={scrapingProvider}
                    onChange={(e) => setScrapingProvider(e.target.value as ScrapingProvider)}
                    disabled={isRunning}
                    className="bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <option value="jina">Jina</option>
                    <option value="firecrawl">Firecrawl</option>
                    <option value="apify">Apify</option>
                    <option value="direct">Direct</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400">Concurrency: {concurrency}</label>
                  <input
                    type="range"
                    min={1}
                    max={4}
                    value={concurrency}
                    onChange={(e) => setConcurrency(Number(e.target.value))}
                    disabled={isRunning}
                    className="w-32 accent-blue-600"
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Mode 3: Running ──────────────────────────────────────────────── */}
      {isRunning && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Analyzing every page</h2>
              <p className="text-sm text-gray-400 mt-1">Analysis in progress...</p>
            </div>
            <button
              onClick={handleCancel}
              className="px-5 py-2 rounded-lg text-sm font-medium bg-red-700 hover:bg-red-600 text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm">
          <span className="font-medium">Error:</span> {error}
        </div>
      )}

      {/* Progress Bar */}
      {(isRunning || hasFinished) && progress && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-300 font-medium">Progress</span>
            <span className="text-gray-400">
              {progress.completed}/{progress.total} pages ({progressPercent}%)
            </span>
          </div>

          <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {isRunning && progress.currentUrl && (
            <p className="text-xs text-gray-500 truncate">
              Current: {truncateUrl(progress.currentUrl, 60)}
              {progress.currentPhase && (
                <span className="ml-2 text-gray-600">
                  &mdash; {progress.currentPhase}
                </span>
              )}
              <span className="ml-2 text-gray-600">
                (via {scrapingProvider.charAt(0).toUpperCase() + scrapingProvider.slice(1)})
              </span>
            </p>
          )}

          {progress.errors.length > 0 && (
            <p className="text-xs text-red-400 mt-1">
              {progress.errors.length} error{progress.errors.length !== 1 ? 's' : ''} encountered
            </p>
          )}
        </div>
      )}

      {/* ── Post-Analysis: Health Overview Cards ─────────────────────────── */}
      {showResults && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {/* Avg Quality */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Avg Quality</div>
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-bold ${getQualityColor(getQualityBucket(summary.avg))}`}>
                {summary.avg}
              </span>
              <span className="text-xs text-gray-500">/100</span>
            </div>
            <div className="flex gap-2 mt-1.5 text-[10px]">
              <span className="text-green-400">{summary.good} good</span>
              <span className="text-yellow-400">{summary.needsWork} fair</span>
              <span className="text-red-400">{summary.poor} poor</span>
            </div>
          </div>

          {/* CWV Health */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">CWV Health</div>
            {cwvSummary ? (
              <>
                <div className="flex items-baseline gap-1">
                  <span className={`text-2xl font-bold ${cwvSummary.goodPercent >= 70 ? 'text-green-400' : cwvSummary.goodPercent >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {cwvSummary.goodPercent}%
                  </span>
                  <span className="text-xs text-gray-500">Good</span>
                </div>
                <div className="flex gap-2 mt-1.5 text-[10px]">
                  <span className="text-green-400">{cwvSummary.good} good</span>
                  <span className="text-yellow-400">{cwvSummary.needsWork} fair</span>
                  <span className="text-red-400">{cwvSummary.poor} poor</span>
                </div>
              </>
            ) : (
              <span className="text-sm text-gray-500">--</span>
            )}
          </div>

          {/* Pages Analyzed */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Pages Analyzed</div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-white">{auditedItems.length}</span>
              <span className="text-xs text-gray-500">of {inventory.length}</span>
            </div>
            <div className="mt-1.5">
              <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${Math.round((auditedItems.length / Math.max(inventory.length, 1)) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Coverage */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Coverage</div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-white">
                {Math.round((auditedItems.length / Math.max(inventory.length, 1)) * 100)}%
              </span>
            </div>
            <div className="text-[10px] text-gray-500 mt-1.5">of total inventory</div>
          </div>
        </div>
      )}

      {/* ── Post-Analysis: Category Quality Breakdown ────────────────────── */}
      {showResults && categoryQuality.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700">
            <h3 className="text-sm font-medium text-gray-300">Quality by Page Type</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-700/50">
                  <th className="px-4 py-2 font-medium">Category</th>
                  <th className="px-4 py-2 font-medium text-right">Pages</th>
                  <th className="px-4 py-2 font-medium text-right">Avg Score</th>
                  <th className="px-4 py-2 font-medium text-right">Worst</th>
                  <th className="px-4 py-2 font-medium text-right">Need Work</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {categoryQuality.map(cq => (
                  <tr key={cq.category} className="hover:bg-gray-750/50">
                    <td className="px-4 py-2">
                      <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getCategoryBgColor(cq.category)}`} />
                        <span className={`text-sm ${getCategoryColor(cq.category)}`}>
                          {getCategoryLabel(cq.category)}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right text-gray-300 tabular-nums">{cq.pages}</td>
                    <td className="px-4 py-2 text-right">
                      <span className={`font-medium ${getQualityColor(getQualityBucket(cq.avgScore))}`}>
                        {cq.avgScore}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span className={`${getQualityColor(getQualityBucket(cq.worstScore))}`}>
                        {cq.worstScore}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right text-gray-400 tabular-nums">
                      {cq.needsWork > 0 ? `${cq.needsWork} pages` : '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Post-Analysis: Priority Insights ─────────────────────────────── */}
      {showResults && priorityInsights && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Priority Overview</h3>
          <div className="flex flex-wrap gap-4 text-sm">
            {priorityInsights.critical > 0 && (
              <span className="inline-flex items-center gap-1.5 text-gray-300">
                <span className="text-red-400">&#9679;</span>
                {priorityInsights.critical} critical
                <span className="text-gray-500 text-xs">(low quality + traffic)</span>
              </span>
            )}
            {priorityInsights.high > 0 && (
              <span className="inline-flex items-center gap-1.5 text-gray-300">
                <span className="text-orange-400">&#9679;</span>
                {priorityInsights.high} high priority
                <span className="text-gray-500 text-xs">(score 40-69, &gt;100 clicks)</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 text-gray-300">
              <span className="text-yellow-400">&#9679;</span>
              {priorityInsights.medium} medium priority
            </span>
            <span className="inline-flex items-center gap-1.5 text-gray-300">
              <span className="text-green-400">&#9679;</span>
              {priorityInsights.good} looking good
              <span className="text-gray-500 text-xs">(score &ge;70)</span>
            </span>
          </div>
        </div>
      )}

      {/* ── Results Table (with Category column) ─────────────────────────── */}
      {showResults && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-300">
              Results{isRunning ? ' (live-updating)' : ''}
            </h3>
            <span className="text-xs text-gray-500">{auditedItems.length} audited</span>
          </div>
          <div className="overflow-x-auto max-h-[45vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-800">
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-2 font-medium">URL</th>
                  <th className="px-4 py-2 font-medium">Category</th>
                  <th className="px-4 py-2 font-medium text-right">Clicks</th>
                  <th className="px-4 py-2 font-medium text-right">Quality</th>
                  <th className="px-4 py-2 font-medium text-right">CWV</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {auditedItems.map((item) => {
                  const score = item.audit_score ?? 0;
                  const bucket = getQualityBucket(score);
                  const cwv = getCwvLabel(item.cwv_assessment);
                  const { category } = classifyUrl(item.url);

                  return (
                    <tr key={item.id} className="hover:bg-gray-750/50">
                      <td className="px-4 py-2 text-gray-300 font-mono text-xs truncate max-w-xs" title={item.url}>
                        {truncateUrl(item.url)}
                      </td>
                      <td className="px-4 py-2">
                        <span className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getCategoryBgColor(category)}`} />
                          <span className={`text-xs ${getCategoryColor(category)}`}>
                            {getCategoryLabel(category)}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-400 text-right tabular-nums">
                        {item.gsc_clicks?.toLocaleString() ?? '--'}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${getQualityBg(bucket)}`}>
                          {score}
                          <span className={getQualityColor(bucket)}>
                            {'\u25CF'}
                          </span>
                        </span>
                      </td>
                      <td className={`px-4 py-2 text-right text-xs ${cwv.className}`}>
                        {cwv.label}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditStep;
