import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { usePipeline } from '../../../hooks/usePipeline';
import { useAppState } from '../../../state/appState';
import ApprovalGate from '../../pipeline/ApprovalGate';
import StepDialogue from '../../pipeline/StepDialogue';
import {
  detectIndustryType,
  calculateIndustryCoverage,
  generateEavsWithAI,
} from '../../../services/ai/eavService';
import type { EavGenerationContext } from '../../../services/ai/eavService';
import type { SemanticTriple } from '../../../types';
import type { DialogueContext, ExtractedData, CascadeImpact } from '../../../types/dialogue';
import { createEmptyDialogueContext } from '../../../services/ai/dialogueEngine';
import { getSupabaseClient } from '../../../services/supabaseClient';

// ──── Confidence Types (Decision 2) ────

type ConfidenceLevel = 'high' | 'medium' | 'low';

type DataSource = 'website' | 'ai' | 'competitor' | 'user';

interface EavWithConfidence {
  eav: Partial<SemanticTriple>;
  confidence: ConfidenceLevel;
  source?: string;
  dataSource: DataSource;
  confirmed: boolean;
}

const PENDING_MARKER = '\u{1F4CB}'; // 📋

function isPendingValue(eav: Partial<SemanticTriple>): boolean {
  const val = eav.object?.value;
  return !val || (typeof val === 'string' && val.includes(PENDING_MARKER));
}

function getConfidence(eav: Partial<SemanticTriple>): ConfidenceLevel {
  if (isPendingValue(eav)) return 'low';
  const source = (eav as any).source;
  const category = eav.predicate?.category ?? 'COMMON';

  // AI-populated values with good categories get medium (need user review)
  if (source === 'ai') {
    if (category === 'UNIQUE' || category === 'ROOT') return 'medium';
    return 'medium';
  }

  // User-confirmed or crawled values
  if (category === 'UNIQUE' || category === 'ROOT') return 'high';
  return 'medium';
}

function getConfidenceSource(eav: Partial<SemanticTriple>): string {
  if (isPendingValue(eav)) return 'Needs value — fill in from your business data';
  const source = (eav as any).source;
  if (source === 'ai') return 'AI-suggested — review and confirm';
  const category = eav.predicate?.category ?? 'COMMON';
  if (category === 'UNIQUE') return 'Core business differentiator';
  if (category === 'ROOT') return 'Primary business attribute';
  if (category === 'RARE') return 'Secondary attribute';
  return 'Standard attribute';
}

// ──── KBT Consistency Rules (E3) ────

function ConsistencyRulesPanel({ eavs, confirmedIds }: {
  eavs: EavWithConfidence[];
  confirmedIds: Set<string>;
}) {
  const [expanded, setExpanded] = useState(false);

  // Generate canonical rules from confirmed EAVs that have values
  const rules = eavs
    .filter(e => {
      const id = (e.eav as any).id || '';
      return confirmedIds.has(id) && e.eav.object?.value;
    })
    .map(e => {
      const attr = e.eav.predicate?.relation || '';
      const value = String(e.eav.object?.value ?? '');
      const category = e.eav.predicate?.category ?? 'COMMON';

      // Generate forbidden variants based on value type
      const forbidden: string[] = [];
      // Year-based values
      const yearMatch = value.match(/\b(1[89]\d{2}|20[0-2]\d)\b/);
      if (yearMatch) {
        const year = parseInt(yearMatch[1]);
        const age = new Date().getFullYear() - year;
        forbidden.push(`${age}+ years`, `${age} years experience`, `founded decades ago`, `over ${Math.floor(age / 10) * 10} years`);
      }
      // Numeric values
      const numMatch = value.match(/^[\d,.]+/);
      if (numMatch && !yearMatch) {
        forbidden.push(`approximately ${value}`, `around ${value}`, `about ${value}`);
      }

      return {
        attribute: attr,
        canonical: value,
        forbidden,
        category,
      };
    })
    .filter(r => r.canonical.length > 0);

  if (rules.length === 0) return null;

  const categoryOrder = { UNIQUE: 0, ROOT: 1, RARE: 2, COMMON: 3 };
  const sortedRules = [...rules].sort((a, b) =>
    (categoryOrder[a.category as keyof typeof categoryOrder] ?? 3) -
    (categoryOrder[b.category as keyof typeof categoryOrder] ?? 3)
  );

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-800/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-gray-200">Consistency Rules</h3>
            <p className="text-[10px] text-gray-500">
              {sortedRules.length} canonical formulations generated from confirmed facts
            </p>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-gray-700/50 px-6 py-4 space-y-3">
          <p className="text-xs text-gray-400">
            These rules ensure every page says the same thing about the same fact. Use these exact formulations site-wide.
          </p>
          {sortedRules.map((rule, i) => (
            <div key={i} className="bg-gray-900 border border-gray-700/50 rounded-md px-4 py-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-medium text-gray-400">{rule.attribute}</span>
                {rule.category === 'UNIQUE' && (
                  <span className="text-[9px] bg-green-900/20 text-green-400 border border-green-700/30 rounded px-1 py-0.5">UNIQUE</span>
                )}
                {rule.category === 'ROOT' && (
                  <span className="text-[9px] bg-blue-900/20 text-blue-400 border border-blue-700/30 rounded px-1 py-0.5">ROOT</span>
                )}
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-400 text-xs font-medium flex-shrink-0 mt-0.5">Always say:</span>
                <span className="text-sm text-green-200">&ldquo;{rule.canonical}&rdquo;</span>
              </div>
              {rule.forbidden.length > 0 && (
                <div className="flex items-start gap-2 mt-1">
                  <span className="text-red-400 text-xs font-medium flex-shrink-0 mt-0.5">Never say:</span>
                  <div className="flex flex-wrap gap-1">
                    {rule.forbidden.map((f, j) => (
                      <span key={j} className="text-[10px] bg-red-900/15 text-red-300 border border-red-700/20 rounded px-1.5 py-0.5 line-through decoration-red-500/40">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ──── Metric Card ────

function MetricCard({ label, value, color = 'gray' }: {
  label: string;
  value: string | number;
  color?: 'green' | 'blue' | 'amber' | 'red' | 'gray';
}) {
  const colorMap: Record<string, string> = {
    green: 'text-green-400',
    blue: 'text-blue-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
    gray: 'text-gray-400',
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${colorMap[color]}`}>{value}</p>
    </div>
  );
}

// ──── Confidence Badge ────

function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  const config = {
    high: { label: 'HIGH', classes: 'bg-green-900/30 text-green-300 border-green-700/40' },
    medium: { label: 'MEDIUM', classes: 'bg-amber-900/30 text-amber-300 border-amber-700/40' },
    low: { label: 'LOW', classes: 'bg-red-900/30 text-red-300 border-red-700/40' },
  };
  const c = config[level];
  return (
    <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border ${c.classes}`}>
      {c.label}
    </span>
  );
}

// ──── Category Badge ────

function CategoryBadge({ category }: { category?: string }) {
  const cat = category ?? 'COMMON';
  const styles: Record<string, string> = {
    UNIQUE: 'bg-purple-900/20 text-purple-300 border-purple-700/40',
    ROOT: 'bg-blue-900/20 text-blue-300 border-blue-700/40',
    RARE: 'bg-green-900/20 text-green-300 border-green-700/40',
    COMMON: 'bg-gray-700 text-gray-400 border-gray-600',
  };
  return (
    <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border ${styles[cat] || styles.COMMON}`}>
      {cat}
    </span>
  );
}

// ──── Data Source Badge (J2) ────

function DataSourceBadge({ source }: { source: DataSource }) {
  const config = {
    website: { label: 'From website', bg: 'bg-emerald-600/15 text-emerald-400 border-emerald-500/30' },
    ai: { label: 'AI-suggested', bg: 'bg-purple-600/20 text-purple-300 border-purple-500/30' },
    competitor: { label: 'From competitors', bg: 'bg-blue-600/20 text-blue-300 border-blue-500/30' },
    user: { label: 'You entered', bg: 'bg-gray-600/20 text-gray-400 border-gray-500/30' },
  };
  const c = config[source];
  return (
    <span className={`inline-flex items-center border rounded px-1.5 py-0.5 text-[9px] font-medium ${c.bg}`}>
      {c.label}
    </span>
  );
}

// ──── Inline EAV Row (Decision 5) ────

function EavRow({
  item,
  onConfirm,
  onUpdateValue,
  onDismiss,
}: {
  item: EavWithConfidence;
  onConfirm: () => void;
  onUpdateValue: (value: string) => void;
  onDismiss: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(item.eav.object?.value ? String(item.eav.object.value) : '');
  const hasValue = !!item.eav.object?.value;

  const handleSaveEdit = () => {
    onUpdateValue(editValue);
    setIsEditing(false);
  };

  // Confirmed rows: compact green tint (Decision 5 — green stays visible)
  if (item.confirmed) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 bg-emerald-900/10 border border-emerald-700/20 rounded-md group transition-all">
        <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <span className="text-xs text-gray-400 font-mono flex-shrink-0 w-32 truncate">{item.eav.predicate?.relation ?? '\u2014'}</span>
        <span className="text-xs text-emerald-300 flex-1 truncate">{String(item.eav.object?.value)}</span>
        <DataSourceBadge source={item.dataSource} />
        <CategoryBadge category={item.eav.predicate?.category} />
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-gray-300"
          title="Edit"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
          </svg>
        </button>
      </div>
    );
  }

  // Editing mode
  if (isEditing) {
    return (
      <div className="px-4 py-3 bg-gray-800 border border-blue-700/50 rounded-md space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-mono">{item.eav.predicate?.relation ?? '\u2014'}</span>
          <DataSourceBadge source={item.dataSource} />
          <CategoryBadge category={item.eav.predicate?.category} />
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="flex-1 bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter value..."
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); }}
          />
          <button
            type="button"
            onClick={handleSaveEdit}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-xs font-medium"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="text-gray-400 hover:text-gray-300 px-2 py-1.5 text-xs"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Unconfirmed row with value (AMBER/GREEN band)
  if (hasValue) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-800 border border-gray-700 rounded-md hover:border-gray-600 transition-colors">
        <ConfidenceBadge level={item.confidence} />
        <span className="text-xs text-gray-400 font-mono flex-shrink-0 w-32 truncate">{item.eav.predicate?.relation ?? '\u2014'}</span>
        <span className="text-sm text-gray-200 flex-1">{String(item.eav.object?.value)}</span>
        <DataSourceBadge source={item.dataSource} />
        <CategoryBadge category={item.eav.predicate?.category} />
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={onConfirm}
            className="bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 px-2 py-1 rounded text-xs font-medium transition-colors"
            title="Confirm this fact"
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-gray-500 hover:text-gray-300 p-1 transition-colors"
            title="Edit value"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // No value — RED band (needs input)
  return (
    <div className="px-4 py-3 bg-gray-800 border border-red-700/30 rounded-md">
      <div className="flex items-center gap-3 mb-2">
        <ConfidenceBadge level="low" />
        <span className="text-xs text-gray-400 font-mono flex-shrink-0">{item.eav.predicate?.relation ?? '\u2014'}</span>
        <span className="text-xs text-gray-500 flex-1">{item.source}</span>
        <DataSourceBadge source={item.dataSource} />
        <CategoryBadge category={item.eav.predicate?.category} />
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="flex-1 bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter value..."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && editValue.trim()) {
              onUpdateValue(editValue.trim());
            }
          }}
        />
        <button
          type="button"
          onClick={() => { if (editValue.trim()) onUpdateValue(editValue.trim()); }}
          disabled={!editValue.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-3 py-1.5 rounded text-xs font-medium"
        >
          Add
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="text-gray-500 hover:text-gray-400 px-2 py-1.5 text-xs"
          title="Not applicable"
        >
          N/A
        </button>
      </div>
    </div>
  );
}

// ──── Contradiction Row (E6) ────

interface Contradiction {
  predicate: string;
  values: Array<{ value: string; index: number }>;
}

function ContradictionRow({
  contradiction,
  onResolve,
}: {
  contradiction: Contradiction;
  onResolve: (chosenIndex: number) => void;
}) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  return (
    <div className="px-4 py-3 bg-amber-900/10 border border-amber-700/40 rounded-md">
      <div className="flex items-center gap-2 mb-2">
        <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
        </svg>
        <span className="text-xs font-medium text-amber-300">Contradiction found</span>
        <span className="text-xs text-gray-400 font-mono">{contradiction.predicate}</span>
      </div>
      <p className="text-xs text-gray-400 mb-2">
        Your website says different things about this fact. Which is correct?
      </p>
      <div className="space-y-1.5">
        {contradiction.values.map((v, i) => (
          <label
            key={i}
            className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${
              selectedIdx === i
                ? 'bg-emerald-900/20 border border-emerald-700/40'
                : 'bg-gray-900 border border-gray-700 hover:border-gray-600'
            }`}
          >
            <input
              type="radio"
              name={`contradiction-${contradiction.predicate}`}
              checked={selectedIdx === i}
              onChange={() => setSelectedIdx(i)}
              className="accent-emerald-500"
            />
            <span className={`text-sm ${selectedIdx === i ? 'text-emerald-200' : 'text-gray-300'}`}>
              {v.value}
            </span>
          </label>
        ))}
      </div>
      {selectedIdx !== null && (
        <button
          type="button"
          onClick={() => onResolve(contradiction.values[selectedIdx].index)}
          className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
        >
          Use this value
        </button>
      )}
    </div>
  );
}

// ──── Competitor Gap Row (E2+G2) ────

function CompetitorGapRow({
  attribute,
  competitorCount,
  onAddValue,
  onDismiss,
}: {
  attribute: string;
  competitorCount: number;
  onAddValue: (value: string) => void;
  onDismiss: () => void;
}) {
  const [value, setValue] = useState('');

  return (
    <div className="px-4 py-3 bg-gray-800 border border-red-700/30 rounded-md">
      <div className="flex items-center gap-2 mb-2">
        <ConfidenceBadge level="low" />
        <DataSourceBadge source="competitor" />
        <span className="text-xs text-gray-400 font-mono flex-shrink-0">{attribute}</span>
        <span className="text-[10px] text-red-400 flex-1">
          {competitorCount} competitor{competitorCount > 1 ? 's' : ''} mention this — you don&apos;t
        </span>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Add your value..."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && value.trim()) onAddValue(value.trim());
          }}
        />
        <button
          type="button"
          onClick={() => { if (value.trim()) onAddValue(value.trim()); }}
          disabled={!value.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-3 py-1.5 rounded text-xs font-medium"
        >
          Add
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="text-gray-500 hover:text-gray-400 px-2 py-1.5 text-xs"
          title="Not applicable to my business"
        >
          N/A
        </button>
      </div>
    </div>
  );
}

// ──── Main Component ────

const PipelineEavsStep: React.FC = () => {
  const {
    autoApprove,
    approveGate,
    rejectGate,
    reviseStep,
    toggleAutoApprove,
    getStepState,
    setStepStatus,
    activeMap,
  } = usePipeline();
  const { state, dispatch } = useAppState();

  // Merge per-map businessInfo overrides with global state (per-map takes precedence)
  const effectiveBusinessInfo = useMemo(() => {
    const mapBI = activeMap?.business_info;
    return mapBI ? { ...state.businessInfo, ...mapBI } : state.businessInfo;
  }, [state.businessInfo, activeMap?.business_info]);

  const stepState = getStepState('eavs');
  const gate = stepState?.gate;

  // Load existing EAVs from active map
  const existingEavs: SemanticTriple[] = activeMap?.eavs ?? state.topicalMaps.find(m => m.id === state.activeMapId)?.eavs ?? [];

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedEavs, setGeneratedEavs] = useState<Partial<SemanticTriple>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [dismissedGaps, setDismissedGaps] = useState<Set<string>>(new Set());
  const [autoGenerateAttempted, setAutoGenerateAttempted] = useState(false);

  // ──── Dialogue Engine state ────
  const [dialogueContext, setDialogueContext] = useState<DialogueContext>(
    (activeMap?.dialogue_context as DialogueContext) || createEmptyDialogueContext()
  );
  const loadedDialogueCtx = (activeMap?.dialogue_context as DialogueContext) || null;
  const [dialogueComplete, setDialogueComplete] = useState(
    loadedDialogueCtx?.eavs?.status === 'complete' || loadedDialogueCtx?.eavs?.status === 'skipped'
  );
  const [showDialogue, setShowDialogue] = useState(
    loadedDialogueCtx?.eavs?.status === 'in_progress'
  );

  // J1: Adaptive display — summary when data exists, editor when adjusting
  const hasEavData = existingEavs.length > 0;
  const [isAdjusting, setIsAdjusting] = useState(!hasEavData);

  // Use existing map EAVs if available, fallback to generated
  const rawEavs = existingEavs.length > 0 ? existingEavs : generatedEavs;

  // Determine data source for J2 badges
  const hasCrawlData = !!(activeMap?.analysis_state as any)?.crawl || !!(activeMap?.analysis_state as any)?.discovery;
  const getEavDataSource = (eav: Partial<SemanticTriple>, id: string): DataSource => {
    if (id.startsWith('eav-gap-')) return 'competitor';
    if ((eav as any).source === 'ai') return 'ai';
    if (hasEavData && hasCrawlData) return 'website';
    return 'ai';
  };

  // ── Build confidence-sorted list (Decision 2) ──
  const eavsWithConfidence: EavWithConfidence[] = rawEavs
    .map((eav, i) => {
      const id = (eav as any).id || `eav-${i}`;
      if (dismissedIds.has(id)) return null;
      return {
        eav,
        confidence: getConfidence(eav),
        source: getConfidenceSource(eav),
        dataSource: getEavDataSource(eav, id),
        confirmed: confirmedIds.has(id),
      };
    })
    .filter(Boolean) as EavWithConfidence[];

  // Sort: confirmed (compact, green) at top, then HIGH → MEDIUM → LOW
  const sortedEavs = [...eavsWithConfidence].sort((a, b) => {
    // Confirmed items first (compact, but still visible per Decision 5)
    if (a.confirmed && !b.confirmed) return -1;
    if (!a.confirmed && b.confirmed) return 1;

    // Within unconfirmed: sort by confidence (HIGH first)
    const order = { high: 0, medium: 1, low: 2 };
    const orderDiff = order[a.confidence] - order[b.confidence];
    if (orderDiff !== 0) return orderDiff;

    // Within same confidence: sort by category importance
    const catOrder: Record<string, number> = { UNIQUE: 0, ROOT: 1, RARE: 2, COMMON: 3 };
    return (catOrder[a.eav.predicate?.category ?? 'COMMON'] ?? 3) - (catOrder[b.eav.predicate?.category ?? 'COMMON'] ?? 3);
  });

  // E6: Detect contradictions — same predicate, different values
  const contradictions: Contradiction[] = [];
  const predicateValueMap = new Map<string, Array<{ value: string; index: number }>>();
  rawEavs.forEach((eav, i) => {
    const predicate = eav.predicate?.relation?.toLowerCase()?.trim();
    const value = String(eav.object?.value ?? '').trim();
    if (!predicate || !value) return;
    if (!predicateValueMap.has(predicate)) predicateValueMap.set(predicate, []);
    predicateValueMap.get(predicate)!.push({ value, index: i });
  });
  predicateValueMap.forEach((values, predicate) => {
    const uniqueValues = new Set(values.map(v => v.value.toLowerCase()));
    if (uniqueValues.size > 1) {
      // Dedupe — keep first occurrence of each unique value
      const seen = new Set<string>();
      const deduped = values.filter(v => {
        const lower = v.value.toLowerCase();
        if (seen.has(lower)) return false;
        seen.add(lower);
        return true;
      });
      contradictions.push({ predicate, values: deduped });
    }
  });

  // G2+E2: Competitor gap attributes from gap analysis (stored in analysis_state)
  const gapAnalysis = (activeMap?.analysis_state as any)?.gap_analysis;
  const gapFindings = gapAnalysis?.contentGaps ?? [];
  const competitorGaps: Array<{ attribute: string; competitorCount: number }> = [];
  if (Array.isArray(gapFindings)) {
    for (const gap of gapFindings) {
      const attr = typeof gap === 'string' ? gap : gap?.missingAttribute || gap?.attribute || '';
      if (attr && typeof attr === 'string') {
        // Check if this attribute is already in our EAVs
        const alreadyExists = rawEavs.some(e =>
          e.predicate?.relation?.toLowerCase()?.includes(attr.toLowerCase()) ||
          attr.toLowerCase().includes(e.predicate?.relation?.toLowerCase() ?? '')
        );
        if (!alreadyExists) {
          const count = typeof gap === 'object' ? (gap?.frequency || gap?.foundInCompetitors?.length || 1) : 1;
          competitorGaps.push({ attribute: attr, competitorCount: count });
        }
      }
    }
  }
  const activeCompetitorGaps = competitorGaps.filter(g => !dismissedGaps.has(g.attribute));

  // Counts
  const confirmedCount = sortedEavs.filter(e => e.confirmed).length;
  const highCount = sortedEavs.filter(e => !e.confirmed && e.confidence === 'high').length;
  const mediumCount = sortedEavs.filter(e => !e.confirmed && e.confidence === 'medium').length;
  const lowCount = sortedEavs.filter(e => !e.confirmed && e.confidence === 'low').length;

  // ── Handlers ──
  const handleConfirm = useCallback((index: number) => {
    const eav = rawEavs[index] as any;
    const id = eav?.id || `eav-${index}`;
    setConfirmedIds(prev => new Set(prev).add(id));
  }, [rawEavs]);

  const handleDismiss = useCallback((index: number) => {
    const eav = rawEavs[index] as any;
    const id = eav?.id || `eav-${index}`;
    setDismissedIds(prev => new Set(prev).add(id));
  }, [rawEavs]);

  const handleUpdateValue = useCallback((index: number, value: string) => {
    // Update the EAV value in state and persist
    const updatedEavs = [...rawEavs];
    const eav = { ...updatedEavs[index] };
    eav.object = { ...(eav.object || { type: 'Value' as const }), value } as any;
    updatedEavs[index] = eav;

    if (existingEavs.length > 0) {
      // Update in map state
      if (state.activeMapId) {
        dispatch({
          type: 'UPDATE_MAP_DATA',
          payload: {
            mapId: state.activeMapId,
            data: { eavs: updatedEavs as SemanticTriple[] },
          },
        });
      }
    } else {
      setGeneratedEavs(updatedEavs);
    }

    // Auto-confirm after setting value
    const eavId = (eav as any).id || `eav-${index}`;
    setConfirmedIds(prev => new Set(prev).add(eavId));
  }, [rawEavs, existingEavs, state.activeMapId, dispatch]);

  const handleConfirmAll = useCallback(() => {
    const newConfirmed = new Set(confirmedIds);
    rawEavs.forEach((eav, i) => {
      if (eav.object?.value) {
        const id = (eav as any).id || `eav-${i}`;
        newConfirmed.add(id);
      }
    });
    setConfirmedIds(newConfirmed);
  }, [rawEavs, confirmedIds]);

  // E6: Resolve contradiction — keep chosen value, dismiss duplicates
  const handleResolveContradiction = useCallback((contradiction: Contradiction, chosenIndex: number) => {
    const chosenValue = contradiction.values.find(v => v.index === chosenIndex)?.value;
    if (!chosenValue) return;

    // Dismiss non-chosen duplicates
    contradiction.values.forEach(v => {
      if (v.index !== chosenIndex) {
        const eav = rawEavs[v.index] as any;
        const id = eav?.id || `eav-${v.index}`;
        setDismissedIds(prev => new Set(prev).add(id));
      }
    });

    // Confirm the chosen one
    const chosenEav = rawEavs[chosenIndex] as any;
    const chosenId = chosenEav?.id || `eav-${chosenIndex}`;
    setConfirmedIds(prev => new Set(prev).add(chosenId));
  }, [rawEavs]);

  // G2+E2: Add value from competitor gap
  const handleAddCompetitorGap = useCallback((attribute: string, value: string) => {
    const newEav: Partial<SemanticTriple> = {
      subject: { label: activeMap?.pillars?.centralEntity || '', type: 'Entity' as const },
      predicate: { relation: attribute, type: 'Property' as const, category: 'COMMON' as const },
      object: { value, type: 'Value' as const },
    };

    const newId = `eav-gap-${attribute}`;
    (newEav as any).id = newId;

    if (existingEavs.length > 0 && state.activeMapId) {
      const updated = [...rawEavs, newEav] as SemanticTriple[];
      dispatch({
        type: 'UPDATE_MAP_DATA',
        payload: { mapId: state.activeMapId, data: { eavs: updated } },
      });
    } else {
      setGeneratedEavs(prev => [...prev, newEav]);
    }

    setConfirmedIds(prev => new Set(prev).add(newId));
    setDismissedGaps(prev => new Set(prev).add(attribute));
  }, [rawEavs, existingEavs, state.activeMapId, activeMap?.pillars?.centralEntity, dispatch]);

  const handleDismissGap = useCallback((attribute: string) => {
    setDismissedGaps(prev => new Set(prev).add(attribute));
  }, []);

  const handleGenerateEavs = async () => {
    const pillars = activeMap?.pillars;

    if (!pillars?.centralEntity) {
      setError('Central Entity is required. Complete the Strategy step first.');
      return;
    }

    setError(null);
    setIsGenerating(true);
    setStepStatus('eavs', 'in_progress');
    setConfirmedIds(new Set());
    setDismissedIds(new Set());

    try {
      // Build context from pillars + gap analysis
      const gapAnalysis = (activeMap?.analysis_state as any)?.gap_analysis;
      const ctx: EavGenerationContext = {
        pillars: {
          centralEntity: pillars.centralEntity,
          sourceContext: pillars.sourceContext,
          centralSearchIntent: pillars.centralSearchIntent,
          csiPredicates: pillars.csiPredicates,
          scPriorities: pillars.scPriorities,
          contentAreas: pillars.contentAreas,
        },
        competitorEAVs: gapAnalysis?.competitorEAVs,
        contentGaps: gapAnalysis?.contentGaps,
      };

      const result = await generateEavsWithAI(effectiveBusinessInfo, ctx, dispatch, dialogueContext);

      setGeneratedEavs(result.eavs);

      // Persist to state + Supabase
      if (state.activeMapId) {
        dispatch({
          type: 'UPDATE_MAP_DATA',
          payload: { mapId: state.activeMapId, data: { eavs: result.eavs } },
        });

        try {
          const supabase = getSupabaseClient(effectiveBusinessInfo.supabaseUrl, effectiveBusinessInfo.supabaseAnonKey);
          await supabase
            .from('topical_maps')
            .update({ eavs: result.eavs } as any)
            .eq('id', state.activeMapId);
        } catch (err) {
          console.warn('[EAVs] Supabase save failed:', err);
        }
      }

      setStepStatus('eavs', 'pending_approval');
      setShowDialogue(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'EAV generation failed';
      setError(message);
      setStepStatus('eavs', 'in_progress');
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Save confirmed state to Supabase ──
  const handleSaveConfirmed = useCallback(async () => {
    if (!state.activeMapId) return;

    const updatedEavs = rawEavs.filter((_, i) => {
      const id = (_ as any).id || `eav-${i}`;
      return !dismissedIds.has(id);
    });

    dispatch({
      type: 'UPDATE_MAP_DATA',
      payload: { mapId: state.activeMapId, data: { eavs: updatedEavs as SemanticTriple[] } },
    });

    try {
      const supabase = getSupabaseClient(effectiveBusinessInfo.supabaseUrl, effectiveBusinessInfo.supabaseAnonKey);
      await supabase
        .from('topical_maps')
        .update({ eavs: updatedEavs } as any)
        .eq('id', state.activeMapId);
    } catch {
      // Non-fatal
    }

    setStepStatus('eavs', 'pending_approval');
  }, [rawEavs, dismissedIds, state.activeMapId, effectiveBusinessInfo, dispatch, setStepStatus]);

  // ──── Dialogue Engine handlers ────

  const persistDialogueContext = useCallback(async (updated: DialogueContext) => {
    setDialogueContext(updated);
    if (state.activeMapId) {
      dispatch({ type: 'UPDATE_MAP_DATA', payload: { mapId: state.activeMapId, data: { dialogue_context: updated } } });
      try {
        const supabase = getSupabaseClient(effectiveBusinessInfo.supabaseUrl, effectiveBusinessInfo.supabaseAnonKey);
        await supabase.from('topical_maps').update({ dialogue_context: updated } as any).eq('id', state.activeMapId);
      } catch { /* non-fatal */ }
    }
  }, [state.activeMapId, effectiveBusinessInfo.supabaseUrl, effectiveBusinessInfo.supabaseAnonKey, dispatch]);

  const handleDialogueDataExtracted = useCallback((data: ExtractedData) => {
    // Add new EAV triples from dialogue answers
    if (data.newTriples?.length && state.activeMapId) {
      const updated = [...rawEavs, ...data.newTriples] as SemanticTriple[];
      dispatch({ type: 'UPDATE_MAP_DATA', payload: { mapId: state.activeMapId, data: { eavs: updated } } });
      setGeneratedEavs(prev => [...prev, ...data.newTriples!]);

      // Also persist to Supabase
      (async () => {
        try {
          const supabase = getSupabaseClient(effectiveBusinessInfo.supabaseUrl, effectiveBusinessInfo.supabaseAnonKey);
          await supabase.from('topical_maps').update({ eavs: updated } as any).eq('id', state.activeMapId);
        } catch { /* non-fatal */ }
      })();
    }

    // Update questionsAnswered (uses functional updater to avoid stale closure)
    setDialogueContext(prev => {
      const updated = { ...prev, eavs: { ...prev.eavs, status: 'in_progress' as const, questionsAnswered: prev.eavs.questionsAnswered + 1 } };
      persistDialogueContext(updated);
      return updated;
    });
  }, [rawEavs, state.activeMapId, effectiveBusinessInfo, dispatch, persistDialogueContext]);

  // Push confirmed answer to dialogue_context.answers[]
  const handleAnswerConfirmed = useCallback((answer: import('../../../types/dialogue').DialogueAnswer) => {
    setDialogueContext(prev => {
      const updated = { ...prev, eavs: { ...prev.eavs, answers: [...prev.eavs.answers, answer] } };
      persistDialogueContext(updated);
      return updated;
    });
  }, [persistDialogueContext]);

  const handleDialogueComplete = useCallback(() => {
    setDialogueComplete(true);
    setDialogueContext(prev => {
      const updated = { ...prev, eavs: { ...prev.eavs, status: 'complete' as const } };
      persistDialogueContext(updated);
      return updated;
    });
  }, [persistDialogueContext]);

  const handleCascadeAction = useCallback((_action: 'update_all' | 'review' | 'cancel', _impact: CascadeImpact) => {
    // EAV step cascade actions are handled by regeneration
  }, []);

  // Industry coverage
  const industryType = detectIndustryType(effectiveBusinessInfo);
  const coverage = rawEavs.length > 0
    ? calculateIndustryCoverage(rawEavs as SemanticTriple[], industryType)
    : null;

  const totalTriples = rawEavs.length - dismissedIds.size;
  const withValues = rawEavs.filter(e => e.object?.value && !isPendingValue(e)).length;
  const needValue = rawEavs.filter(e => isPendingValue(e)).length;
  const needReview = withValues - confirmedCount;

  // Layer grouping for UI
  const ceEavs = sortedEavs.filter(e => {
    const id = (e.eav as any).id || '';
    return id.startsWith('eav-ce-') || (!id.startsWith('eav-sc-') && !id.startsWith('eav-gap-'));
  });
  const scEavs = sortedEavs.filter(e => {
    const id = (e.eav as any).id || '';
    return id.startsWith('eav-sc-');
  });

  // Map real index from sorted items back to rawEavs index
  const getRealIndex = (item: EavWithConfidence): number => {
    return rawEavs.indexOf(item.eav);
  };

  // Auto-trigger generation when step loads with pillars but no EAV data
  const hasPillars = !!activeMap?.pillars?.centralEntity;
  const handleGenerateRef = useRef(handleGenerateEavs);
  handleGenerateRef.current = handleGenerateEavs;
  useEffect(() => {
    if (!hasEavData && hasPillars && !autoGenerateAttempted && !isGenerating) {
      setAutoGenerateAttempted(true);
      handleGenerateRef.current();
    }
  }, [hasEavData, hasPillars, autoGenerateAttempted, isGenerating]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-200">Business Facts</h2>
        <p className="text-sm text-gray-400 mt-1">
          Verify the facts about your business. Confirmed facts will be used consistently across all content.
        </p>
      </div>

      {/* Prerequisite check */}
      {!activeMap?.pillars?.centralEntity && (
        <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-amber-300">
            Complete the Strategy step first — Central Entity is required to generate business facts.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="Total Facts" value={totalTriples} color={totalTriples > 0 ? 'blue' : 'gray'} />
        <MetricCard label="Confirmed" value={confirmedCount} color={confirmedCount > 0 ? 'green' : 'gray'} />
        <MetricCard label="Need Review" value={needReview > 0 ? needReview : 0} color={needReview > 0 ? 'amber' : 'green'} />
        <MetricCard label="Need Input" value={needValue} color={needValue > 0 ? 'red' : 'green'} />
      </div>

      {/* Industry coverage */}
      {coverage && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Industry Coverage ({industryType})
            </span>
            <span className="text-sm font-semibold text-blue-400">{coverage.score}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${coverage.score}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {coverage.highPriorityCovered}/{coverage.highPriorityTotal} high-priority attributes covered
          </p>
        </div>
      )}

      {/* J1: Adaptive display — summary mode with Adjust button */}
      {!isAdjusting && hasEavData && totalTriples > 0 && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setIsAdjusting(true)}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 px-5 py-2 rounded-md text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
            </svg>
            Edit Business Facts
          </button>
        </div>
      )}

      {/* ── Confidence-sorted EAV list (Decision 2 + 5) — only in adjust mode ── */}
      {isAdjusting && sortedEavs.length > 0 && (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {confirmedCount > 0 && (
                <span className="flex items-center gap-1 text-emerald-400">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {confirmedCount} confirmed
                </span>
              )}
              {highCount > 0 && <span className="text-green-400">{highCount} high</span>}
              {mediumCount > 0 && <span className="text-amber-400">{mediumCount} medium</span>}
              {lowCount > 0 && <span className="text-red-400">{lowCount} need input</span>}
            </div>
            {withValues > confirmedCount && (
              <button
                type="button"
                onClick={handleConfirmAll}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
              >
                Confirm all with values
              </button>
            )}
          </div>

          {/* Contradiction rows (E6) */}
          {contradictions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 pt-2">
                <div className="h-px flex-1 bg-amber-700/30" />
                <span className="text-[10px] text-amber-400 font-medium uppercase tracking-wider">
                  {contradictions.length} contradiction{contradictions.length > 1 ? 's' : ''} found
                </span>
                <div className="h-px flex-1 bg-amber-700/30" />
              </div>
              {contradictions.map((c) => (
                <ContradictionRow
                  key={`contradiction-${c.predicate}`}
                  contradiction={c}
                  onResolve={(idx) => handleResolveContradiction(c, idx)}
                />
              ))}
            </div>
          )}

          {/* Layer 1: Central Entity Facts */}
          {ceEavs.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-blue-700/30" />
                <span className="text-[10px] text-blue-400 font-medium uppercase tracking-wider">
                  Central Entity Facts ({ceEavs.length})
                </span>
                <div className="h-px flex-1 bg-blue-700/30" />
              </div>
              {ceEavs.map((item) => {
                const realIdx = getRealIndex(item);
                return (
                  <EavRow
                    key={(item.eav as any).id || `eav-${realIdx}`}
                    item={item}
                    onConfirm={() => handleConfirm(realIdx)}
                    onUpdateValue={(v) => handleUpdateValue(realIdx, v)}
                    onDismiss={() => handleDismiss(realIdx)}
                  />
                );
              })}
            </div>
          )}

          {/* Layer 2: Business Facts (Source Context) */}
          {scEavs.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-purple-700/30" />
                <span className="text-[10px] text-purple-400 font-medium uppercase tracking-wider">
                  Business Facts ({scEavs.length})
                </span>
                <div className="h-px flex-1 bg-purple-700/30" />
              </div>
              {scEavs.map((item) => {
                const realIdx = getRealIndex(item);
                return (
                  <EavRow
                    key={(item.eav as any).id || `eav-${realIdx}`}
                    item={item}
                    onConfirm={() => handleConfirm(realIdx)}
                    onUpdateValue={(v) => handleUpdateValue(realIdx, v)}
                    onDismiss={() => handleDismiss(realIdx)}
                  />
                );
              })}
            </div>
          )}

          {/* Competitor Gap Rows (E2+G2) */}
          {activeCompetitorGaps.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-red-700/30" />
                <span className="text-[10px] text-red-400 font-medium uppercase tracking-wider">
                  Competitor insights — {activeCompetitorGaps.length} attribute{activeCompetitorGaps.length > 1 ? 's' : ''} your competitors mention
                </span>
                <div className="h-px flex-1 bg-red-700/30" />
              </div>
              {activeCompetitorGaps.map((gap) => (
                <CompetitorGapRow
                  key={`gap-${gap.attribute}`}
                  attribute={gap.attribute}
                  competitorCount={gap.competitorCount}
                  onAddValue={(v) => handleAddCompetitorGap(gap.attribute, v)}
                  onDismiss={() => handleDismissGap(gap.attribute)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Generate / Save Buttons — shown when adjusting or no data */}
      {(isAdjusting || !hasEavData) && (
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={handleGenerateEavs}
            disabled={isGenerating || !activeMap?.pillars?.centralEntity}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-md font-medium transition-colors flex items-center gap-2"
          >
            {isGenerating && (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {isGenerating ? 'Generating...' : totalTriples > 0 ? 'Regenerate Facts' : 'Generate Business Facts'}
          </button>
          {totalTriples > 0 && confirmedCount > 0 && (
            <button
              type="button"
              onClick={handleSaveConfirmed}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-md font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Save {confirmedCount} Confirmed Facts
            </button>
          )}
        </div>
      )}

      {/* Intelligent Dialogue — replaces static Data Requests */}
      {showDialogue && !dialogueComplete && totalTriples > 0 && (
        <StepDialogue
          step="eavs"
          stepOutput={{ eavs: rawEavs, pendingCount: needValue }}
          businessInfo={effectiveBusinessInfo}
          dialogueContext={dialogueContext}
          onDataExtracted={handleDialogueDataExtracted}
          onDialogueComplete={handleDialogueComplete}
          onCascadeAction={handleCascadeAction}
          onAnswerConfirmed={handleAnswerConfirmed}
        />
      )}

      {/* KBT Consistency Rules (E3) — always show when confirmed */}
      {confirmedCount > 0 && (
        <ConsistencyRulesPanel eavs={sortedEavs} confirmedIds={confirmedIds} />
      )}

      {/* Empty state */}
      {totalTriples === 0 && !isGenerating && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
          <svg className="w-10 h-10 text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
          </svg>
          <p className="text-sm text-gray-500">Generate business facts from your strategy to get started</p>
        </div>
      )}

      {/* Approval Gate (gated on dialogue completion) */}
      {gate && (dialogueComplete || !showDialogue) && (stepState?.status === 'pending_approval' || stepState?.approval?.status === 'rejected') && (
        <ApprovalGate
          step="eavs"
          gate={gate}
          approval={stepState?.approval}
          autoApprove={autoApprove}
          onApprove={() => approveGate('eavs')}
          onReject={(reason) => rejectGate('eavs', reason)}
          onRevise={() => reviseStep('eavs')}
          onToggleAutoApprove={toggleAutoApprove}
          summaryMetrics={[
            { label: 'Total Facts', value: totalTriples, color: totalTriples > 0 ? 'green' : 'gray' },
            { label: 'With Values', value: withValues, color: withValues > 0 ? 'green' : 'gray' },
            { label: 'Need Input', value: needValue, color: needValue > 0 ? 'amber' : 'green' },
          ]}
        />
      )}
    </div>
  );
};

export default PipelineEavsStep;
