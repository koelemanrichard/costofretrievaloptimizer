// components/audit/SemanticSeoChecklist.tsx
import React, { useState, useCallback } from 'react';
import { SEMANTIC_SEO_CHECKLIST, getFluffWordsKillList, type ChecklistItem } from '../../config/semanticSeoChecklist';

interface AuditRuleResult {
  passed: boolean;
}

interface SemanticSeoChecklistProps {
  showKillList?: boolean;
  auditResults?: Record<string, AuditRuleResult>;
  onCheckChange?: (itemId: string, checked: boolean) => void;
}

export const SemanticSeoChecklist: React.FC<SemanticSeoChecklistProps> = ({
  showKillList: initialShowKillList = false,
  auditResults,
  onCheckChange,
}) => {
  const [manualChecks, setManualChecks] = useState<Set<string>>(new Set());
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set(['setup']));
  const [showKillList, setShowKillList] = useState(initialShowKillList);

  const isChecked = useCallback((item: ChecklistItem): boolean => {
    if (item.autoCheckable && item.auditRuleId && auditResults?.[item.auditRuleId]) {
      return auditResults[item.auditRuleId].passed;
    }
    return manualChecks.has(item.id);
  }, [auditResults, manualChecks]);

  const toggleCheck = useCallback((itemId: string) => {
    setManualChecks(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      onCheckChange?.(itemId, next.has(itemId));
      return next;
    });
  }, [onCheckChange]);

  const togglePhase = useCallback((phaseId: string) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      if (next.has(phaseId)) next.delete(phaseId);
      else next.add(phaseId);
      return next;
    });
  }, []);

  const killList = getFluffWordsKillList();

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-200 flex items-center gap-2">
          <span className="text-cyan-400 text-base">☑</span>
          Semantic SEO Checklist
        </h3>
        <button
          onClick={() => setShowKillList(!showKillList)}
          className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
        >
          {showKillList ? 'Hide' : 'Show'} Fluff Words
        </button>
      </div>

      {SEMANTIC_SEO_CHECKLIST.map(phase => {
        const isExpanded = expandedPhases.has(phase.id);
        const phaseChecked = phase.items.filter(i => isChecked(i)).length;
        const pct = Math.round((phaseChecked / phase.items.length) * 100);

        return (
          <div key={phase.id} className="border-b border-gray-700 last:border-b-0">
            <button
              onClick={() => togglePhase(phase.id)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-gray-750 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-xs">{isExpanded ? '▾' : '▸'}</span>
                <span className="text-xs font-medium text-gray-300">{phase.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 bg-gray-700 rounded-full h-1">
                  <div
                    className={`h-1 rounded-full transition-all ${
                      pct === 100 ? 'bg-green-500' : pct > 0 ? 'bg-cyan-500' : 'bg-gray-600'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={`text-xs font-mono w-10 text-right ${
                  pct === 100 ? 'text-green-400' : 'text-gray-500'
                }`}>
                  {phaseChecked}/{phase.items.length}
                </span>
              </div>
            </button>
            {isExpanded && (
              <div className="px-4 pb-3 space-y-1">
                {phase.items.map(item => {
                  const checked = isChecked(item);
                  const isAutoChecked = item.autoCheckable && item.auditRuleId && auditResults?.[item.auditRuleId];
                  const autoFailed = isAutoChecked && !auditResults![item.auditRuleId!].passed;

                  return (
                    <label
                      key={item.id}
                      className="flex items-start gap-2.5 cursor-pointer py-0.5 group"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCheck(item.id)}
                        disabled={!!isAutoChecked}
                        className="mt-0.5 rounded border-gray-600 bg-gray-700 text-green-500 focus:ring-green-500 disabled:opacity-60"
                      />
                      <span className={`text-xs leading-relaxed ${
                        checked ? 'text-gray-500 line-through' :
                        autoFailed ? 'text-red-400' :
                        'text-gray-300 group-hover:text-gray-200'
                      }`}>
                        {item.label}
                        {isAutoChecked && (
                          <span className={`ml-1.5 text-[10px] px-1 py-0.5 rounded ${
                            checked ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                          }`}>
                            auto
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {showKillList && (
        <div className="px-4 py-3 border-t border-gray-700 bg-gray-850">
          <h4 className="text-xs font-medium text-red-400 mb-2">Fluff Words Kill List</h4>
          <div className="flex flex-wrap gap-1">
            {killList.map(word => (
              <span
                key={word}
                className="text-[10px] bg-red-900/30 text-red-300 px-1.5 py-0.5 rounded font-mono"
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
