// components/merge/MergeEavsStep.tsx
import React, { useMemo, useState } from 'react';
import { TopicalMap, SemanticTriple, EavDecision } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface MergeEavsStepProps {
  sourceMaps: TopicalMap[];
  eavDecisions: EavDecision[];
  onDecisionChange: (decision: EavDecision) => void;
  onBulkAction: (action: 'include_all' | 'exclude_all', mapId?: string) => void;
}

const EAV_CATEGORIES = ['UNIQUE', 'ROOT', 'RARE', 'COMMON'] as const;
const CATEGORY_COLORS: Record<string, string> = {
  UNIQUE: 'bg-purple-900/50 text-purple-300',
  ROOT: 'bg-blue-900/50 text-blue-300',
  RARE: 'bg-green-900/50 text-green-300',
  COMMON: 'bg-gray-700 text-gray-300',
};

const MergeEavsStep: React.FC<MergeEavsStepProps> = ({
  sourceMaps,
  eavDecisions,
  onDecisionChange,
  onBulkAction,
}) => {
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterMap, setFilterMap] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Build EAV list with source info
  const eavsWithSource = useMemo(() => {
    const result: { eav: SemanticTriple; mapId: string; mapName: string; eavId: string }[] = [];

    sourceMaps.forEach(map => {
      (map.eavs || []).forEach((eav, idx) => {
        const eavId = `${map.id}_${idx}`;
        result.push({
          eav,
          mapId: map.id,
          mapName: map.name,
          eavId,
        });
      });
    });

    return result;
  }, [sourceMaps]);

  // Find duplicates (same subject + predicate + object across maps)
  const duplicates = useMemo(() => {
    const seen = new Map<string, string[]>();
    eavsWithSource.forEach(({ eav, eavId }) => {
      const key = `${eav.subject.label}|${eav.predicate.relation}|${eav.object.value}`;
      const existing = seen.get(key) || [];
      seen.set(key, [...existing, eavId]);
    });
    return new Map([...seen.entries()].filter(([, ids]) => ids.length > 1));
  }, [eavsWithSource]);

  // Filter EAVs
  const filteredEavs = useMemo(() => {
    return eavsWithSource.filter(({ eav, mapId }) => {
      if (filterCategory && eav.predicate.category !== filterCategory) return false;
      if (filterMap && mapId !== filterMap) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!eav.subject.label.toLowerCase().includes(query) &&
            !eav.predicate.relation.toLowerCase().includes(query) &&
            !String(eav.object.value).toLowerCase().includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [eavsWithSource, filterCategory, filterMap, searchQuery]);

  // Get decision for an EAV
  const getDecision = (eavId: string): EavDecision => {
    return eavDecisions.find(d => d.eavId === eavId) || {
      eavId,
      sourceMapId: '',
      action: 'include',
    };
  };

  // Stats
  const stats = useMemo(() => {
    const included = eavDecisions.filter(d => d.action === 'include').length;
    const excluded = eavDecisions.filter(d => d.action === 'exclude').length;
    const total = eavsWithSource.length;
    return { included, excluded, pending: total - included - excluded, total };
  }, [eavDecisions, eavsWithSource]);

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
        <div className="flex gap-4 text-sm">
          <span className="text-gray-400">Total: <span className="text-white">{stats.total}</span></span>
          <span className="text-green-400">Included: {stats.included}</span>
          <span className="text-red-400">Excluded: {stats.excluded}</span>
          <span className="text-yellow-400">Pending: {stats.pending}</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => onBulkAction('include_all')}>
            Include All
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onBulkAction('exclude_all')}>
            Exclude All
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search EAVs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-3 py-1.5 bg-gray-800 border border-gray-600 rounded text-white text-sm flex-1 min-w-[200px]"
        />
        <select
          value={filterCategory || ''}
          onChange={(e) => setFilterCategory(e.target.value || null)}
          className="px-3 py-1.5 bg-gray-800 border border-gray-600 rounded text-white text-sm"
        >
          <option value="">All Categories</option>
          {EAV_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <select
          value={filterMap || ''}
          onChange={(e) => setFilterMap(e.target.value || null)}
          className="px-3 py-1.5 bg-gray-800 border border-gray-600 rounded text-white text-sm"
        >
          <option value="">All Maps</option>
          {sourceMaps.map(map => (
            <option key={map.id} value={map.id}>{map.name}</option>
          ))}
        </select>
      </div>

      {/* Duplicate Warning */}
      {duplicates.size > 0 && (
        <div className="p-3 bg-yellow-900/20 border border-yellow-700 rounded text-sm text-yellow-300">
          {duplicates.size} duplicate EAV(s) detected across maps. Only one copy will be included.
        </div>
      )}

      {/* EAV List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {filteredEavs.map(({ eav, mapId, mapName, eavId }) => {
          const decision = getDecision(eavId);
          const isDuplicate = [...duplicates.values()].some(ids => ids.includes(eavId) && ids[0] !== eavId);

          return (
            <Card
              key={eavId}
              className={`p-3 cursor-pointer transition-colors ${
                decision.action === 'exclude' || isDuplicate
                  ? 'opacity-50 bg-gray-900'
                  : 'hover:bg-gray-700/50'
              }`}
              onClick={() => {
                if (!isDuplicate) {
                  onDecisionChange({
                    ...decision,
                    eavId,
                    sourceMapId: mapId,
                    action: decision.action === 'include' ? 'exclude' : 'include',
                  });
                }
              }}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={decision.action === 'include' && !isDuplicate}
                  disabled={isDuplicate}
                  onChange={() => {}}
                  className="mt-1 w-4 h-4"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-white">{eav.subject.label}</span>
                    <span className="text-gray-500">→</span>
                    <span className="text-blue-300">{eav.predicate.relation}</span>
                    <span className="text-gray-500">:</span>
                    <span className="text-green-300">{String(eav.object.value)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded ${CATEGORY_COLORS[eav.predicate.category || 'COMMON']}`}>
                      {eav.predicate.category || 'COMMON'}
                    </span>
                    <span className="text-xs text-gray-500">from {mapName}</span>
                    {isDuplicate && (
                      <span className="text-xs text-yellow-400">(duplicate - auto-excluded)</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredEavs.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          {eavsWithSource.length === 0
            ? 'No EAVs found in selected maps'
            : 'No EAVs match the current filters'}
        </div>
      )}
    </div>
  );
};

export default MergeEavsStep;
