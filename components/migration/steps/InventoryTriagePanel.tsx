import React, { useState, useMemo, useCallback } from 'react';
import type { SiteInventoryItem } from '../../../types';
import {
  classifyInventory,
  getCategoryLabel,
  getCategoryColor,
  getCategoryBgColor,
  type UrlCategory,
} from '../../../utils/urlClassifier';

// ── Props ─────────────────────────────────────────────────────────────────────

interface InventoryTriagePanelProps {
  inventory: SiteInventoryItem[];
  onStartAnalysis: (filtered: SiteInventoryItem[]) => void;
  onSkip: () => void;
  isRunning: boolean;
}

// ── Preset definitions ──────────────────────────────────────────────────────

type PresetId = 'strategic' | 'high-traffic' | 'full';

interface Preset {
  id: PresetId;
  label: string;
  description: string;
  enabledCategories: Record<UrlCategory, boolean>;
  trafficThreshold: number;
  maxPages?: number;
}

const ALL_CATEGORIES: UrlCategory[] = [
  'content', 'product', 'category', 'legal', 'pagination', 'media', 'uncategorized',
];

const DEFAULT_ENABLED: Record<UrlCategory, boolean> = {
  content: true,
  product: true,
  category: true,
  legal: true,
  pagination: false,
  media: false,
  uncategorized: true,
};

const PRESETS: Preset[] = [
  {
    id: 'strategic',
    label: 'Strategic only',
    description: 'Content + Product pages with traffic',
    enabledCategories: {
      content: true, product: true, category: false,
      legal: false, pagination: false, media: false, uncategorized: false,
    },
    trafficThreshold: 1,
  },
  {
    id: 'high-traffic',
    label: 'High-traffic first',
    description: 'Top 100 pages by clicks',
    enabledCategories: {
      content: true, product: true, category: true,
      legal: true, pagination: true, media: true, uncategorized: true,
    },
    trafficThreshold: 0,
    maxPages: 100,
  },
  {
    id: 'full',
    label: 'Full audit',
    description: 'Everything enabled',
    enabledCategories: {
      content: true, product: true, category: true,
      legal: true, pagination: true, media: true, uncategorized: true,
    },
    trafficThreshold: 0,
  },
];

// ── Category Card ───────────────────────────────────────────────────────────

const CategoryCard: React.FC<{
  category: UrlCategory;
  items: SiteInventoryItem[];
  enabled: boolean;
  onToggle: () => void;
  hasGsc: boolean;
}> = ({ category, items, enabled, onToggle, hasGsc }) => {
  const totalClicks = items.reduce((sum, i) => sum + (i.gsc_clicks ?? 0), 0);

  return (
    <label
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors select-none ${
        enabled
          ? 'bg-gray-800 border-gray-600 hover:border-gray-500'
          : 'bg-gray-800/30 border-gray-700/50 opacity-60 hover:opacity-80'
      }`}
    >
      <input
        type="checkbox"
        checked={enabled}
        onChange={onToggle}
        className="accent-blue-500 w-3.5 h-3.5 flex-shrink-0"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-sm font-medium ${getCategoryColor(category)}`}>
            {getCategoryLabel(category)}
          </span>
          <span className="text-sm font-semibold text-white tabular-nums">{items.length}</span>
        </div>
        <div className="text-xs text-gray-500 mt-0.5 tabular-nums">
          {hasGsc
            ? `${totalClicks.toLocaleString()} clicks`
            : '-- clicks'}
        </div>
      </div>
    </label>
  );
};

// ── Main Component ──────────────────────────────────────────────────────────

export const InventoryTriagePanel: React.FC<InventoryTriagePanelProps> = ({
  inventory,
  onStartAnalysis,
  onSkip,
  isRunning,
}) => {
  const [enabledCategories, setEnabledCategories] = useState<Record<UrlCategory, boolean>>(DEFAULT_ENABLED);
  const [trafficThreshold, setTrafficThreshold] = useState(0);
  const [activePreset, setActivePreset] = useState<PresetId | null>(null);

  // Classify the full inventory
  const categoryGroups = useMemo(() => classifyInventory(inventory), [inventory]);

  // Detect GSC data presence
  const hasGsc = useMemo(
    () => inventory.some(i => i.gsc_clicks != null && i.gsc_clicks > 0),
    [inventory],
  );

  // Traffic intelligence stats
  const trafficStats = useMemo(() => {
    if (!hasGsc) return null;
    const withGsc = inventory.filter(i => i.gsc_clicks != null);
    const total = inventory.length;
    const totalClicks = inventory.reduce((s, i) => s + (i.gsc_clicks ?? 0), 0);
    const zeroImpressions = inventory.filter(i => (i.gsc_impressions ?? 0) === 0).length;

    // Pareto: sort by clicks desc, find how many pages account for 80% of clicks
    const sorted = [...inventory].sort((a, b) => (b.gsc_clicks ?? 0) - (a.gsc_clicks ?? 0));
    let cumClicks = 0;
    let paretoCount = 0;
    const paretoTarget = totalClicks * 0.8;
    for (const item of sorted) {
      cumClicks += item.gsc_clicks ?? 0;
      paretoCount++;
      if (cumClicks >= paretoTarget) break;
    }
    const paretoPercent = totalClicks > 0 ? Math.round((cumClicks / totalClicks) * 100) : 0;

    return {
      withGscCount: withGsc.length,
      withGscPercent: Math.round((withGsc.length / total) * 100),
      zeroImpressions,
      paretoCount,
      paretoPercent,
      totalClicks,
    };
  }, [inventory, hasGsc]);

  // Compute filtered items using pre-classified groups
  const filteredItems = useMemo(() => {
    // Use the pre-classified groups to build a Set of included item IDs
    const includedIds = new Set<string>();
    for (const cat of ALL_CATEGORIES) {
      if (enabledCategories[cat]) {
        for (const item of categoryGroups.get(cat) ?? []) {
          includedIds.add(item.id);
        }
      }
    }

    let items = inventory.filter(i => includedIds.has(i.id));

    // Apply traffic threshold
    if (trafficThreshold > 0 && hasGsc) {
      items = items.filter(i => (i.gsc_clicks ?? 0) >= trafficThreshold);
    }

    // For high-traffic preset, limit to top 100 by clicks
    if (activePreset === 'high-traffic') {
      items = [...items]
        .sort((a, b) => (b.gsc_clicks ?? 0) - (a.gsc_clicks ?? 0))
        .slice(0, 100);
    }

    return items;
  }, [inventory, enabledCategories, trafficThreshold, hasGsc, activePreset, categoryGroups]);

  const excludedCount = inventory.length - filteredItems.length;
  const estMinutes = Math.ceil((filteredItems.length * 10) / 60);

  // Handlers
  const toggleCategory = useCallback((cat: UrlCategory) => {
    setActivePreset(null);
    setEnabledCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  }, []);

  const applyPreset = useCallback((preset: Preset) => {
    setActivePreset(preset.id);
    setEnabledCategories({ ...preset.enabledCategories });
    setTrafficThreshold(preset.trafficThreshold);
  }, []);

  const handleThresholdChange = useCallback((value: number) => {
    setActivePreset(null);
    setTrafficThreshold(value);
  }, []);

  const handleStart = useCallback(() => {
    onStartAnalysis(filteredItems);
  }, [onStartAnalysis, filteredItems]);

  // Max clicks for the slider range
  const maxClicks = useMemo(() => {
    if (!hasGsc) return 0;
    return Math.max(...inventory.map(i => i.gsc_clicks ?? 0), 0);
  }, [inventory, hasGsc]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-white">Understand your inventory</h2>
        <p className="text-sm text-gray-400 mt-1">
          {inventory.length} pages imported. Review before analyzing.
        </p>
      </div>

      {/* Quick Strategy Presets */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="text-xs text-gray-400 mb-2 font-medium">Quick Strategy</div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                activePreset === preset.id
                  ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                  : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:border-gray-500 hover:text-white'
              }`}
              title={preset.description}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Page Breakdown */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="text-xs text-gray-400 mb-3 font-medium">Page Breakdown</div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {ALL_CATEGORIES.map(cat => (
            <CategoryCard
              key={cat}
              category={cat}
              items={categoryGroups.get(cat) ?? []}
              enabled={enabledCategories[cat]}
              onToggle={() => toggleCategory(cat)}
              hasGsc={hasGsc}
            />
          ))}
        </div>
      </div>

      {/* Traffic Intelligence */}
      {hasGsc && trafficStats ? (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="text-xs text-gray-400 mb-2 font-medium">Traffic Intelligence</div>
          <div className="space-y-1.5 text-sm text-gray-300">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
              GSC data: {trafficStats.withGscCount}/{inventory.length} pages ({trafficStats.withGscPercent}%)
            </div>
            {trafficStats.totalClicks > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                Top {trafficStats.paretoCount} pages account for {trafficStats.paretoPercent}% of all traffic
              </div>
            )}
            {trafficStats.zeroImpressions > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-500 flex-shrink-0" />
                {trafficStats.zeroImpressions} pages have zero impressions
              </div>
            )}
          </div>

          {/* Traffic threshold slider */}
          <div className="mt-3 pt-3 border-t border-gray-700/50">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-gray-400">Min. clicks filter</label>
              <span className="text-xs text-gray-500 tabular-nums">{trafficThreshold}</span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.min(maxClicks, 500)}
              value={trafficThreshold}
              onChange={(e) => handleThresholdChange(Number(e.target.value))}
              className="w-full accent-blue-600 h-1.5"
            />
          </div>
        </div>
      ) : (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
          <p className="text-xs text-gray-500 italic">
            Import GSC data in Step 1 for traffic intelligence and smart filtering.
          </p>
        </div>
      )}

      {/* Analysis Scope Summary */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="text-xs text-gray-400 mb-2 font-medium">Analysis Scope</div>
        <div className="space-y-1 text-sm">
          <div className="text-gray-300">
            Analyzing: <span className="font-semibold text-white">{filteredItems.length} pages</span>
          </div>
          {excludedCount > 0 && (
            <div className="text-gray-500">
              Excluded: {excludedCount} pages
              {!enabledCategories.pagination && !enabledCategories.media && ' (pagination, media)'}
            </div>
          )}
          <div className="text-gray-500">
            Estimated time: ~{estMinutes} minute{estMinutes !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleStart}
          disabled={filteredItems.length === 0 || isRunning}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            filteredItems.length === 0 || isRunning
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer'
          }`}
        >
          Start Analysis ({filteredItems.length} pages)
        </button>
        <button
          onClick={onSkip}
          className="text-sm text-gray-500 hover:text-gray-400 underline underline-offset-2 transition-colors"
        >
          Skip audit
        </button>
      </div>
    </div>
  );
};

export default InventoryTriagePanel;
