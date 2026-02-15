import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useBatchAudit } from '../../../hooks/useBatchAudit';
import type { SiteInventoryItem } from '../../../types';
import type { BatchAuditOptions } from '../../../services/audit/BatchAuditService';

interface AuditStepProps {
  projectId: string;
  mapId: string;
  inventory: SiteInventoryItem[];
  onComplete: () => void;
  onRefreshInventory: () => void;
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

export const AuditStep: React.FC<AuditStepProps> = ({
  projectId,
  mapId,
  inventory,
  onComplete,
  onRefreshInventory,
}) => {
  const { isRunning, progress, startBatch, cancelBatch, error } = useBatchAudit(projectId, mapId);

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

  const handleStart = useCallback(() => {
    const options: BatchAuditOptions = {
      concurrency,
      scrapingProvider,
      skipAlreadyAudited: true,
    };
    startBatch(inventory, options);
  }, [concurrency, scrapingProvider, inventory, startBatch]);

  const handleCancel = useCallback(() => {
    cancelBatch();
    // Refresh to pick up any partial results
    onRefreshInventory();
  }, [cancelBatch, onRefreshInventory]);

  const progressPercent = progress
    ? Math.round((progress.completed / Math.max(progress.total, 1)) * 100)
    : 0;

  const pendingCount = inventory.length - alreadyAuditedCount;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-white">Analyzing every page</h2>
        <p className="text-sm text-gray-400 mt-1">
          Run the Unified Audit on each inventory URL to measure content quality, EAV coverage, and
          technical health.
        </p>
      </div>

      {/* Config Section */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Batch Audit Controls</h3>
        <div className="flex flex-wrap items-end gap-4">
          {/* Scraping Provider */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Provider</label>
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

          {/* Concurrency */}
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

          {/* Action buttons */}
          <div className="flex gap-2 ml-auto">
            {!isRunning ? (
              <button
                onClick={handleStart}
                disabled={inventory.length === 0}
                className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                  inventory.length === 0
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer'
                }`}
              >
                {pendingCount < inventory.length ? 'Resume Audit' : 'Start Audit'}
                {pendingCount > 0 && (
                  <span className="ml-1.5 text-xs opacity-75">({pendingCount} pending)</span>
                )}
              </button>
            ) : (
              <button
                onClick={handleCancel}
                className="px-4 py-1.5 rounded text-sm font-medium bg-red-700 hover:bg-red-600 text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Status info */}
        {alreadyAuditedCount > 0 && !isRunning && !hasFinished && (
          <p className="mt-3 text-xs text-gray-500">
            {alreadyAuditedCount} of {inventory.length} URLs already audited.
            {pendingCount > 0 && ` ${pendingCount} remaining.`}
          </p>
        )}
      </div>

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

          {/* Bar */}
          <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Current URL / Phase */}
          {isRunning && progress.currentUrl && (
            <p className="text-xs text-gray-500 truncate">
              Current: {truncateUrl(progress.currentUrl, 60)}
              {progress.currentPhase && (
                <span className="ml-2 text-gray-600">
                  &mdash; {progress.currentPhase}
                </span>
              )}
            </p>
          )}

          {/* Errors during batch */}
          {progress.errors.length > 0 && (
            <p className="text-xs text-red-400 mt-1">
              {progress.errors.length} error{progress.errors.length !== 1 ? 's' : ''} encountered
            </p>
          )}
        </div>
      )}

      {/* Results Table */}
      {auditedItems.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-300">
              Results{isRunning ? ' (live-updating)' : ''}
            </h3>
            <span className="text-xs text-gray-500">{auditedItems.length} audited</span>
          </div>
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-800">
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-2 font-medium">URL</th>
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

                  return (
                    <tr key={item.id} className="hover:bg-gray-750/50">
                      <td className="px-4 py-2 text-gray-300 font-mono text-xs truncate max-w-xs" title={item.url}>
                        {truncateUrl(item.url)}
                      </td>
                      <td className="px-4 py-2 text-gray-400 text-right tabular-nums">
                        {item.gsc_clicks?.toLocaleString() ?? '--'}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${getQualityBg(bucket)}`}>
                          {score}
                          <span className={getQualityColor(bucket)}>
                            {bucket === 'good' ? '\u25CF' : bucket === 'needsWork' ? '\u25CF' : '\u25CF'}
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

      {/* Summary */}
      {auditedItems.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Summary</h3>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
              <span className="text-gray-300">
                Good (&ge;70): <span className="font-medium text-green-400">{summary.good}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" />
              <span className="text-gray-300">
                Needs Work (40-69): <span className="font-medium text-yellow-400">{summary.needsWork}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
              <span className="text-gray-300">
                Poor (&lt;40): <span className="font-medium text-red-400">{summary.poor}</span>
              </span>
            </div>
            <div className="ml-auto text-gray-300">
              Average score: <span className="font-semibold text-white">{summary.avg}/100</span>
            </div>
          </div>
        </div>
      )}

      {/* Skip button (when audit hasn't run or is incomplete) */}
      {!isRunning && !hasFinished && auditedItems.length === 0 && (
        <div className="text-center">
          <button
            onClick={onComplete}
            className="text-sm text-gray-500 hover:text-gray-400 underline underline-offset-2 transition-colors"
          >
            Skip audit and proceed without scores
          </button>
        </div>
      )}
    </div>
  );
};

export default AuditStep;
