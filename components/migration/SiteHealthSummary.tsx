import React, { useMemo } from 'react';
import type { SiteInventoryItem } from '../../types';

interface SiteHealthSummaryProps {
  inventory: SiteInventoryItem[];
}

export const SiteHealthSummary: React.FC<SiteHealthSummaryProps> = ({ inventory }) => {
  const metrics = useMemo(() => {
    if (inventory.length === 0) return null;

    // Quality distribution
    const withAudit = inventory.filter(i => i.audit_score != null);
    const avgQuality = withAudit.length > 0
      ? Math.round(withAudit.reduce((sum, i) => sum + (i.audit_score ?? 0), 0) / withAudit.length)
      : null;
    const qualityGood = withAudit.filter(i => (i.audit_score ?? 0) >= 70).length;
    const qualityNeedsWork = withAudit.filter(i => (i.audit_score ?? 0) >= 40 && (i.audit_score ?? 0) < 70).length;
    const qualityPoor = withAudit.filter(i => (i.audit_score ?? 0) < 40).length;

    // COR distribution
    const withCor = inventory.filter(i => i.cor_score != null);
    const avgCor = withCor.length > 0
      ? Math.round(withCor.reduce((sum, i) => sum + (i.cor_score ?? 0), 0) / withCor.length)
      : null;

    // Action breakdown
    const actionCounts: Record<string, number> = {};
    for (const item of inventory) {
      const action = item.recommended_action || item.action;
      if (action) {
        actionCounts[action] = (actionCounts[action] || 0) + 1;
      }
    }

    // Urgent items: low quality + active traffic
    const urgentItems = inventory.filter(
      i => (i.audit_score != null && i.audit_score < 40) && (i.gsc_clicks ?? 0) > 0
    ).length;

    return {
      total: inventory.length,
      avgQuality,
      qualityGood,
      qualityNeedsWork,
      qualityPoor,
      audited: withAudit.length,
      avgCor,
      corCount: withCor.length,
      actionCounts,
      urgentItems,
    };
  }, [inventory]);

  if (!metrics || metrics.total === 0) return null;

  const qualityPercent = metrics.avgQuality != null ? metrics.avgQuality : 0;
  const corPercent = metrics.avgCor != null ? metrics.avgCor : 0;

  const ACTION_LABELS: Record<string, { label: string; color: string }> = {
    KEEP:          { label: 'Keep',     color: 'bg-green-400' },
    OPTIMIZE:      { label: 'Optimize', color: 'bg-lime-400' },
    REWRITE:       { label: 'Rewrite',  color: 'bg-yellow-400' },
    MERGE:         { label: 'Merge',    color: 'bg-blue-400' },
    REDIRECT_301:  { label: 'Redirect', color: 'bg-purple-400' },
    PRUNE_410:     { label: 'Prune',    color: 'bg-red-400' },
    CANONICALIZE:  { label: 'Canon.',   color: 'bg-gray-400' },
    CREATE_NEW:    { label: 'Create',   color: 'bg-cyan-400' },
  };

  const hasActions = Object.keys(metrics.actionCounts).length > 0;

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg px-5 py-3 flex-shrink-0">
      <div className="flex items-start gap-8 flex-wrap">
        {/* Page count */}
        <div className="text-xs text-gray-400">
          <span className="text-sm font-bold text-white">{metrics.total}</span> pages
          {metrics.audited < metrics.total && (
            <span className="text-gray-500 ml-1">({metrics.audited} analyzed)</span>
          )}
        </div>

        {/* Quality */}
        {metrics.avgQuality != null && (
          <div className="text-xs">
            <div className="text-gray-500 mb-1">Quality</div>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${qualityPercent}%`,
                    backgroundColor: qualityPercent >= 70 ? '#4ade80' : qualityPercent >= 40 ? '#facc15' : '#f87171',
                  }}
                />
              </div>
              <span className="font-bold text-white text-sm">{metrics.avgQuality}</span>
            </div>
            <div className="flex gap-2 mt-1 text-[10px] text-gray-500">
              <span className="text-green-400">{metrics.qualityGood} good</span>
              <span className="text-yellow-400">{metrics.qualityNeedsWork} fair</span>
              <span className="text-red-400">{metrics.qualityPoor} poor</span>
            </div>
          </div>
        )}

        {/* COR */}
        {metrics.avgCor != null && (
          <div className="text-xs">
            <div className="text-gray-500 mb-1">Cost of Retrieval</div>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${corPercent}%`,
                    backgroundColor: corPercent <= 30 ? '#4ade80' : corPercent <= 70 ? '#facc15' : '#f87171',
                  }}
                />
              </div>
              <span className="font-bold text-white text-sm">{metrics.avgCor}</span>
            </div>
          </div>
        )}

        {/* Action breakdown */}
        {hasActions && (
          <div className="text-xs">
            <div className="text-gray-500 mb-1">Actions</div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
              {Object.entries(metrics.actionCounts).map(([action, count]) => {
                const info = ACTION_LABELS[action];
                return (
                  <span key={action} className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${info?.color || 'bg-gray-400'}`} />
                    <span className="text-gray-300">{count} {info?.label || action}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Urgent warning */}
        {metrics.urgentItems > 0 && (
          <div className="text-xs bg-red-900/20 border border-red-800/30 rounded px-3 py-1.5 text-red-300 ml-auto">
            {metrics.urgentItems} page{metrics.urgentItems > 1 ? 's' : ''} need urgent attention
            <span className="text-red-400/70 ml-1">(low quality + active traffic)</span>
          </div>
        )}
      </div>
    </div>
  );
};
