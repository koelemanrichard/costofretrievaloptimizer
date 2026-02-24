import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { usePipeline } from '../../../hooks/usePipeline';
import { useAppState } from '../../../state/appState';
import ApprovalGate from '../../pipeline/ApprovalGate';
import StepDialogue from '../../pipeline/StepDialogue';
import CascadeWarning from '../../pipeline/CascadeWarning';
import { getSupabaseClient } from '../../../services/supabaseClient';
import { suggestPillarsFromBusinessInfo } from '../../../services/ai/pillarSuggestion';
import { detectCascadeImpact, createEmptyDialogueContext } from '../../../services/ai/dialogueEngine';
import type { DialogueContext, ExtractedData, CascadeImpact } from '../../../types/dialogue';

// ──── Tag Input (for CSI predicates) ────

function TagInput({ tags, onAdd, onRemove, placeholder, accentColor = 'blue' }: {
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (index: number) => void;
  placeholder: string;
  accentColor?: 'blue' | 'amber' | 'sky';
}) {
  const [input, setInput] = useState('');

  const colorMap = {
    blue: { bg: 'bg-blue-600/20', text: 'text-blue-300', border: 'border-blue-500/30', btn: 'text-blue-400 hover:text-blue-200', ring: 'focus-within:ring-blue-500' },
    amber: { bg: 'bg-amber-600/20', text: 'text-amber-300', border: 'border-amber-500/30', btn: 'text-amber-400 hover:text-amber-200', ring: 'focus-within:ring-amber-500' },
    sky: { bg: 'bg-sky-600/20', text: 'text-sky-300', border: 'border-sky-500/30', btn: 'text-sky-400 hover:text-sky-200', ring: 'focus-within:ring-sky-500' },
  };
  const c = colorMap[accentColor];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      onAdd(input.trim());
      setInput('');
    }
    if (e.key === 'Backspace' && !input && tags.length > 0) {
      onRemove(tags.length - 1);
    }
  };

  return (
    <div className={`flex flex-wrap gap-2 bg-gray-900 border border-gray-600 rounded-md px-3 py-2 min-h-[42px] focus-within:ring-2 ${c.ring} focus-within:border-transparent`}>
      {tags.map((tag, i) => (
        <span
          key={i}
          className={`inline-flex items-center gap-1 ${c.bg} ${c.text} border ${c.border} rounded px-2 py-0.5 text-xs`}
        >
          {tag}
          <button
            type="button"
            onClick={() => onRemove(i)}
            className={`${c.btn} ml-0.5`}
          >
            &times;
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] bg-transparent text-sm text-gray-200 placeholder-gray-500 focus:outline-none"
      />
    </div>
  );
}

// ──── Ordered Priority List (for SC priorities) ────

function OrderedPriorityList({ items, onAdd, onRemove, onReorder, placeholder, accentColor = 'sky' }: {
  items: string[];
  onAdd: (item: string) => void;
  onRemove: (index: number) => void;
  onReorder: (from: number, to: number) => void;
  placeholder: string;
  accentColor?: 'sky' | 'amber';
}) {
  const [input, setInput] = useState('');

  const colorMap = {
    sky: { num: 'text-sky-400', bg: 'bg-sky-600/10', border: 'border-sky-500/20', text: 'text-sky-200', btn: 'text-sky-400 hover:text-sky-200', ring: 'focus-within:ring-sky-500' },
    amber: { num: 'text-amber-400', bg: 'bg-amber-600/10', border: 'border-amber-500/20', text: 'text-amber-200', btn: 'text-amber-400 hover:text-amber-200', ring: 'focus-within:ring-amber-500' },
  };
  const c = colorMap[accentColor];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      onAdd(input.trim());
      setInput('');
    }
  };

  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div
          key={i}
          className={`flex items-center gap-2 ${c.bg} border ${c.border} rounded-md px-3 py-1.5 group`}
        >
          <span className={`text-xs font-bold ${c.num} w-5 text-right flex-shrink-0`}>{i + 1}.</span>
          <span className={`text-sm ${c.text} flex-1`}>{item}</span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {i > 0 && (
              <button
                type="button"
                onClick={() => onReorder(i, i - 1)}
                className={`${c.btn} text-xs px-1`}
                title="Move up"
              >
                &uarr;
              </button>
            )}
            {i < items.length - 1 && (
              <button
                type="button"
                onClick={() => onReorder(i, i + 1)}
                className={`${c.btn} text-xs px-1`}
                title="Move down"
              >
                &darr;
              </button>
            )}
            <button
              type="button"
              onClick={() => onRemove(i)}
              className={`${c.btn} text-xs px-1`}
              title="Remove"
            >
              &times;
            </button>
          </div>
        </div>
      ))}
      <div className={`flex bg-gray-900 border border-gray-600 rounded-md px-3 py-1.5 focus-within:ring-2 ${c.ring} focus-within:border-transparent`}>
        <span className="text-xs font-bold text-gray-600 w-5 text-right flex-shrink-0 pt-0.5">{items.length + 1}.</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 ml-2 bg-transparent text-sm text-gray-200 placeholder-gray-500 focus:outline-none"
        />
      </div>
    </div>
  );
}

// ──── Data Source Badge (J2) ────

function DataSourceBadge({ source }: { source: 'website' | 'ai' | 'competitor' | 'user' }) {
  const config = {
    website: { label: 'From website', bg: 'bg-emerald-600/15 text-emerald-400 border-emerald-500/30' },
    ai: { label: 'AI-suggested', bg: 'bg-purple-600/20 text-purple-300 border-purple-500/30' },
    competitor: { label: 'From competitors', bg: 'bg-blue-600/20 text-blue-300 border-blue-500/30' },
    user: { label: 'You entered', bg: 'bg-gray-600/20 text-gray-400 border-gray-500/30' },
  };
  const c = config[source];
  return (
    <span className={`inline-flex items-center gap-1 border rounded px-1.5 py-0.5 text-[9px] font-medium ${c.bg}`}>
      {c.label}
    </span>
  );
}

// ──── AI Badge ────

function AiBadge() {
  return <DataSourceBadge source="ai" />;
}

// ──── Auto-detected Badge ────

function AutoDetectedBadge() {
  return <DataSourceBadge source="website" />;
}

// ──── Business Context Card ────

function BusinessContextCard({ businessInfo }: {
  businessInfo: {
    seedKeyword?: string;
    industry?: string;
    domain?: string;
    audience?: string;
    language?: string;
    targetMarket?: string;
  };
}) {
  const items = [
    { label: 'Seed Keyword', value: businessInfo.seedKeyword },
    { label: 'Industry', value: businessInfo.industry },
    { label: 'Domain', value: businessInfo.domain },
    { label: 'Audience', value: businessInfo.audience },
    { label: 'Language', value: businessInfo.language },
    { label: 'Market', value: businessInfo.targetMarket },
  ].filter(item => item.value);

  if (items.length === 0) return null;

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
        Business Context (from Discover step)
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {items.map((item) => (
          <div key={item.label}>
            <p className="text-[10px] text-gray-500 uppercase">{item.label}</p>
            <p className="text-sm text-gray-300 truncate">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──── Content Areas Preview (Decision 4: Hybrid Naming) ────

function ContentAreasPreview({ contentAreas, contentAreaTypes, onUpdate, onUpdateTypes, industry }: {
  contentAreas: string[];
  contentAreaTypes?: Array<'revenue' | 'authority'>;
  onUpdate: (areas: string[]) => void;
  onUpdateTypes: (types: Array<'revenue' | 'authority'>) => void;
  industry?: string;
}) {
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaType, setNewAreaType] = useState<'revenue' | 'authority'>('authority');

  const handleAddArea = () => {
    if (!newAreaName.trim()) return;
    onUpdate([...contentAreas, newAreaName.trim()]);
    onUpdateTypes([...(contentAreaTypes ?? []), newAreaType]);
    setNewAreaName('');
  };

  const handleRemoveArea = (index: number) => {
    onUpdate(contentAreas.filter((_, i) => i !== index));
    onUpdateTypes((contentAreaTypes ?? []).filter((_, i) => i !== index));
  };

  const handleToggleType = (index: number) => {
    const types = [...(contentAreaTypes ?? [])];
    types[index] = types[index] === 'revenue' ? 'authority' : 'revenue';
    onUpdateTypes(types);
  };

  const industryLabel = industry || 'your business';
  const hasAreas = contentAreas.length > 0;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-gray-200">Content Areas</h3>
        {hasAreas && (
          <span className="text-xs text-gray-500">{contentAreas.length} areas</span>
        )}
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Each represents a distinct facet of your Central Entity. Core Section themes drive conversions; Author Section themes build authority.
      </p>

      {hasAreas ? (
        <div className="space-y-1.5">
          {contentAreas.map((area, i) => {
            const areaType = contentAreaTypes?.[i] ?? 'authority';
            const isRevenue = areaType === 'revenue';
            const borderColor = isRevenue ? 'border-emerald-500' : 'border-sky-500';
            const badgeClasses = isRevenue
              ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30'
              : 'bg-sky-600/20 text-sky-300 border-sky-500/30';
            const badgeLabel = isRevenue ? 'CS' : 'AS';
            const typeLabel = isRevenue ? 'Core Section' : 'Author Section';
            return (
              <div key={i} className={`flex items-center gap-2 bg-gray-900 border-l-4 ${borderColor} rounded-r-md px-3 py-2 group`}>
                <button
                  type="button"
                  onClick={() => handleToggleType(i)}
                  title={`Click to toggle — ${typeLabel}`}
                  className={`${badgeClasses} border rounded px-1.5 py-0.5 text-[10px] font-semibold flex-shrink-0 hover:opacity-80 transition-opacity`}
                >
                  {badgeLabel}
                </button>
                <span className="text-sm text-gray-200 flex-1">{area}</span>
                <span className={`text-[10px] ${isRevenue ? 'text-emerald-400/60' : 'text-sky-400/60'} hidden sm:inline`}>
                  {typeLabel}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveArea(i)}
                  className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                >
                  &times;
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty state — show the general CS/AS explanation */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-900 border-l-4 border-emerald-500 rounded-r-md px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 rounded px-1.5 py-0.5 text-[10px] font-semibold">CS</span>
              <span className="text-sm font-medium text-gray-200">Revenue pages</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Service/product pages, pricing, regional landing pages, and conversion-focused content for {industryLabel}.
            </p>
          </div>
          <div className="bg-gray-900 border-l-4 border-sky-500 rounded-r-md px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-sky-600/20 text-sky-300 border border-sky-500/30 rounded px-1.5 py-0.5 text-[10px] font-semibold">AS</span>
              <span className="text-sm font-medium text-gray-200">Authority pages</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Informational hubs, how-to guides, knowledge base articles, and E-E-A-T content for {industryLabel}.
            </p>
          </div>
        </div>
      )}

      {/* Add area input */}
      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-700/50">
        <select
          value={newAreaType}
          onChange={(e) => setNewAreaType(e.target.value as 'revenue' | 'authority')}
          className="bg-gray-900 border border-gray-600 rounded-md px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="authority">AS</option>
          <option value="revenue">CS</option>
        </select>
        <input
          type="text"
          value={newAreaName}
          onChange={(e) => setNewAreaName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddArea(); } }}
          placeholder="Add content area..."
          className="flex-1 bg-gray-900 border border-gray-600 rounded-md px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="button"
          onClick={handleAddArea}
          disabled={!newAreaName.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ──── Five Components Summary Card ────

function FiveComponentsSummaryCard({ ceName, scType, scPriorities, csiPredicates, csiText, contentAreas, contentAreaTypes, businessInfo, ceFromCrawl, aiSuggested }: {
  ceName: string;
  scType: string;
  scPriorities: string[];
  csiPredicates: string[];
  csiText: string;
  contentAreas: string[];
  contentAreaTypes?: Array<'revenue' | 'authority'>;
  businessInfo: {
    authorProfile?: { name?: string; credentials?: string };
    valueProp?: string;
    industry?: string;
  };
  ceFromCrawl?: boolean;
  aiSuggested?: boolean;
}) {
  if (!ceName || !scType) return null;

  const hasAuthor = !!businessInfo.authorProfile?.name;
  const hasCredentials = !!businessInfo.authorProfile?.credentials;
  const hasValueProp = !!businessInfo.valueProp;
  const industryLabel = businessInfo.industry || 'your business';

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Five Components Summary</h3>

      <div className="space-y-4">
        {/* CE */}
        <div className="bg-gray-900 border-l-4 border-emerald-500 rounded-r-md px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 rounded px-1.5 py-0.5 text-[10px] font-semibold">CE</span>
            <span className="text-sm font-semibold text-emerald-200">{ceName}</span>
            <DataSourceBadge source={ceFromCrawl ? 'website' : aiSuggested ? 'ai' : 'user'} />
          </div>
          <ul className="text-xs text-gray-400 space-y-0.5 mt-2 pl-4 list-disc">
            <li>Must appear in every H1, meta title, meta description</li>
            <li>Use as first word/phrase in title tags where possible</li>
            <li>N-gram variations allowed for natural language</li>
          </ul>
        </div>

        {/* SC */}
        <div className="bg-gray-900 border-l-4 border-sky-500 rounded-r-md px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-sky-600/20 text-sky-300 border border-sky-500/30 rounded px-1.5 py-0.5 text-[10px] font-semibold">SC</span>
            <span className="text-sm font-medium text-sky-200">{scType}</span>
            <DataSourceBadge source={aiSuggested ? 'ai' : 'user'} />
          </div>
          {businessInfo.industry && (
            <p className="text-xs text-gray-500 mt-1">Industry: {businessInfo.industry}</p>
          )}
          {scPriorities.length > 0 && (
            <div className="mt-2">
              <p className="text-[10px] text-gray-500 uppercase mb-1">Attribute Priorities</p>
              <ol className="space-y-0.5">
                {scPriorities.map((p, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs">
                    <span className="text-sky-400 font-bold w-4 text-right">{i + 1}.</span>
                    <span className="text-sky-200">{p}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs">
            <span className={hasAuthor ? 'text-green-400' : 'text-gray-600'}>
              {hasAuthor ? '\u2713' : '\u2717'} Author identity
            </span>
            <span className={hasCredentials ? 'text-green-400' : 'text-gray-600'}>
              {hasCredentials ? '\u2713' : '\u2717'} Credentials
            </span>
            <span className={hasValueProp ? 'text-green-400' : 'text-gray-600'}>
              {hasValueProp ? '\u2713' : '\u2717'} Value proposition
            </span>
          </div>
        </div>

        {/* CSI */}
        <div className="bg-gray-900 border-l-4 border-amber-500 rounded-r-md px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-amber-600/20 text-amber-300 border border-amber-500/30 rounded px-1.5 py-0.5 text-[10px] font-semibold">CSI</span>
            <span className="text-sm font-medium text-amber-200">
              {csiText || csiPredicates.join(', ') || 'Not defined'}
            </span>
          </div>
          {csiPredicates.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {csiPredicates.map((pred, i) => (
                <span
                  key={i}
                  className="bg-amber-900/20 text-amber-300 border border-amber-700/30 rounded px-2 py-0.5 text-[10px]"
                >
                  {pred}{i === 0 ? ' (primary)' : ''}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Content Areas */}
        {contentAreas.length > 0 ? (
          <div className="bg-gray-900 border-l-4 border-blue-500 rounded-r-md px-4 py-3">
            <p className="text-xs text-gray-300 mb-1.5">Content Areas</p>
            <div className="flex flex-wrap gap-1.5">
              {contentAreas.map((area, i) => {
                const areaType = contentAreaTypes?.[i] ?? 'authority';
                const isRevenue = areaType === 'revenue';
                const badgeBg = isRevenue
                  ? 'bg-emerald-900/20 text-emerald-400 border-emerald-700/30'
                  : 'bg-sky-900/20 text-sky-400 border-sky-700/30';
                const badgeLabel = isRevenue ? 'CS' : 'AS';
                return (
                  <span key={i} className={`${badgeBg} border rounded px-1.5 py-0.5 text-[10px] inline-flex items-center gap-1`}>
                    <span className="font-semibold">{badgeLabel}</span> {area}
                  </span>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-900 border-l-4 border-emerald-500 rounded-r-md px-4 py-3">
              <span className="bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 rounded px-1.5 py-0.5 text-[10px] font-semibold">CS</span>
              <p className="text-[10px] text-gray-500 mt-0.5">Revenue-driving content for {industryLabel}</p>
            </div>
            <div className="bg-gray-900 border-l-4 border-sky-500 rounded-r-md px-4 py-3">
              <span className="bg-sky-600/20 text-sky-300 border border-sky-500/30 rounded px-1.5 py-0.5 text-[10px] font-semibold">AS</span>
              <p className="text-[10px] text-gray-500 mt-0.5">Expertise &amp; E-E-A-T signals for {industryLabel}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ──── Main Component ────

const PipelineStrategyStep: React.FC = () => {
  const {
    autoApprove,
    advanceStep,
    approveGate,
    rejectGate,
    reviseStep,
    toggleAutoApprove,
    getStepState,
    setStepStatus,
    activeMap,
  } = usePipeline();
  const { state, dispatch } = useAppState();

  // Use per-map business_info merged with global state (per-map takes precedence)
  const effectiveBusinessInfo = useMemo(() => {
    const mapBI = activeMap?.business_info;
    return mapBI ? { ...state.businessInfo, ...mapBI } : state.businessInfo;
  }, [state.businessInfo, activeMap?.business_info]);

  const stepState = getStepState('strategy');
  const gate = stepState?.gate;

  // Initialise form from existing map pillars if available
  const existingPillars = activeMap?.pillars;

  const [ceName, setCeName] = useState(existingPillars?.centralEntity ?? '');
  const [scType, setScType] = useState(existingPillars?.sourceContext ?? '');
  const [csiText, setCsiText] = useState(existingPillars?.centralSearchIntent ?? '');
  const [scPriorities, setScPriorities] = useState<string[]>(
    existingPillars?.scPriorities?.length ? existingPillars.scPriorities
      : existingPillars?.primary_verb ? [existingPillars.primary_verb] : []
  );
  const [csiPredicates, setCsiPredicates] = useState<string[]>(
    existingPillars?.csiPredicates?.length ? existingPillars.csiPredicates
      : existingPillars?.auxiliary_verb ? [existingPillars.auxiliary_verb] : []
  );

  const [contentAreas, setContentAreas] = useState<string[]>(
    existingPillars?.contentAreas ?? []
  );
  const [contentAreaTypes, setContentAreaTypes] = useState<Array<'revenue' | 'authority'>>(
    existingPillars?.contentAreaTypes ?? []
  );

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [aiSuggested, setAiSuggested] = useState(false);
  const [suggestionReasoning, setSuggestionReasoning] = useState<string | null>(null);

  // ──── Dialogue Engine state ────
  const [dialogueContext, setDialogueContext] = useState<DialogueContext>(
    (activeMap?.dialogue_context as DialogueContext) || createEmptyDialogueContext()
  );
  const loadedDialogueCtx = (activeMap?.dialogue_context as DialogueContext) || null;
  const [dialogueComplete, setDialogueComplete] = useState(
    loadedDialogueCtx?.strategy?.status === 'complete' || loadedDialogueCtx?.strategy?.status === 'skipped'
  );
  const [showDialogue, setShowDialogue] = useState(
    loadedDialogueCtx?.strategy?.status === 'in_progress'
  );
  const [cascadeImpact, setCascadeImpact] = useState<CascadeImpact | null>(null);

  // J1: Adaptive display — show summary when data exists, editor when adjusting
  const hasStrategyData = !!existingPillars?.centralEntity && !!existingPillars?.sourceContext;
  const [isAdjusting, setIsAdjusting] = useState(!hasStrategyData);

  // Sync form if active map changes (e.g. after navigation)
  useEffect(() => {
    if (existingPillars) {
      setCeName(existingPillars.centralEntity ?? '');
      setScType(existingPillars.sourceContext ?? '');
      setCsiText(existingPillars.centralSearchIntent ?? '');
      setScPriorities(
        existingPillars.scPriorities?.length ? existingPillars.scPriorities
          : existingPillars.primary_verb ? [existingPillars.primary_verb] : []
      );
      setCsiPredicates(
        existingPillars.csiPredicates?.length ? existingPillars.csiPredicates
          : existingPillars.auxiliary_verb ? [existingPillars.auxiliary_verb] : []
      );
      setContentAreas(existingPillars.contentAreas ?? []);
      setContentAreaTypes(existingPillars.contentAreaTypes ?? []);
    }
  }, [activeMap?.id]);

  // G4: Pre-fill CE from seedKeyword if empty (immediate, before AI suggest)
  const hasBusinessContext = !!effectiveBusinessInfo.seedKeyword;
  const hasExistingPillars = !!existingPillars?.centralEntity;
  const [autoSuggestAttempted, setAutoSuggestAttempted] = useState(false);
  const [ceFromCrawl, setCeFromCrawl] = useState(false);

  useEffect(() => {
    if (!ceName && effectiveBusinessInfo.seedKeyword) {
      setCeName(effectiveBusinessInfo.seedKeyword);
      setCeFromCrawl(true);
    }
  }, [effectiveBusinessInfo.seedKeyword]);

  // Auto-suggest on mount when pillars are empty and business info is available
  useEffect(() => {
    if (!hasExistingPillars && hasBusinessContext && !autoSuggestAttempted && !isSuggesting) {
      setAutoSuggestAttempted(true);
      handleAiSuggest();
    }
  }, [hasExistingPillars, hasBusinessContext]);

  const handleAiSuggest = async () => {
    if (isSuggesting) return;
    setIsSuggesting(true);
    setSaveError(null);

    try {
      // Extract gap analysis data from the active map (if available from Step 2)
      const gapAnalysis = (activeMap?.analysis_state as any)?.gap_analysis;
      const gapContext = gapAnalysis ? {
        competitorEAVs: gapAnalysis.competitorEAVs?.slice(0, 30)?.map((e: any) => ({
          entity: e.entity, attribute: e.attribute, value: String(e.value)
        })),
        contentGaps: gapAnalysis.contentGaps?.slice(0, 15)?.map((g: any) => ({
          missingAttribute: g.missingAttribute, priority: g.priority,
          suggestedContent: g.suggestedContent
        })),
        topicsCovered: gapAnalysis.siteInventorySummary?.topicsCovered,
      } : undefined;

      const result = await suggestPillarsFromBusinessInfo(effectiveBusinessInfo, dispatch, gapContext);

      setCeName(result.centralEntity);
      setScType(result.sourceContext);
      setCsiText(result.centralSearchIntent);
      if (result.csiPredicates.length > 0) {
        setCsiPredicates(result.csiPredicates);
      }
      if (result.scPriorities.length > 0) {
        setScPriorities(result.scPriorities);
      }
      if (result.contentAreas.length > 0) {
        setContentAreas(result.contentAreas.map(a => a.name));
        setContentAreaTypes(result.contentAreas.map(a => a.type));
      }
      setAiSuggested(true);
      setSuggestionReasoning(result.reasoning);
      setShowDialogue(true);

      // Apply detected language/region to businessInfo if not already set
      const currentLang = effectiveBusinessInfo.language;
      const currentMarket = effectiveBusinessInfo.targetMarket;
      const needsLangUpdate = (!currentLang || currentLang === 'en') && result.detectedLanguage && result.detectedLanguage !== 'en';
      const needsMarketUpdate = (!currentMarket || currentMarket === 'United States') && result.detectedRegion && result.detectedRegion !== 'Global';

      if (needsLangUpdate || needsMarketUpdate) {
        const updatedInfo = { ...effectiveBusinessInfo };
        if (needsLangUpdate) updatedInfo.language = result.detectedLanguage;
        if (needsMarketUpdate) updatedInfo.targetMarket = result.detectedRegion;
        dispatch({ type: 'SET_BUSINESS_INFO', payload: updatedInfo });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI suggestion failed';
      setSaveError(message);
    } finally {
      setIsSuggesting(false);
    }
  };

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
    if (data.updatedFields) {
      const fields = data.updatedFields;
      const oldCE = ceName;
      const oldSC = scType;

      if (fields.centralEntity) setCeName(fields.centralEntity);
      if (fields.sourceContext) setScType(fields.sourceContext);
      if (fields.centralSearchIntent) setCsiText(fields.centralSearchIntent);
      if (fields.csiPredicates) setCsiPredicates(fields.csiPredicates);
      if (fields.scPriorities) setScPriorities(fields.scPriorities);

      // Cascade detection for CE/SC changes
      if (fields.centralEntity && fields.centralEntity !== oldCE) {
        const impact = detectCascadeImpact('centralEntity', fields.centralEntity, oldCE, {
          eavs: activeMap?.eavs as any[],
          topics: state.topicalMaps.find(m => m.id === state.activeMapId)?.topics as any[],
        });
        if (impact.hasImpact) setCascadeImpact(impact);
      }
      if (fields.sourceContext && fields.sourceContext !== oldSC) {
        const impact = detectCascadeImpact('sourceContext', fields.sourceContext, oldSC, {
          eavs: activeMap?.eavs as any[],
          topics: state.topicalMaps.find(m => m.id === state.activeMapId)?.topics as any[],
        });
        if (impact.hasImpact) setCascadeImpact(impact);
      }
    }

    // Update questionsAnswered (uses functional updater to avoid stale closure)
    setDialogueContext(prev => {
      const updated = { ...prev, strategy: { ...prev.strategy, status: 'in_progress' as const, questionsAnswered: prev.strategy.questionsAnswered + 1 } };
      persistDialogueContext(updated);
      return updated;
    });
  }, [ceName, scType, activeMap, state.topicalMaps, state.activeMapId, persistDialogueContext]);

  // Push confirmed answer to dialogue_context.answers[]
  const handleAnswerConfirmed = useCallback((answer: import('../../../types/dialogue').DialogueAnswer) => {
    setDialogueContext(prev => {
      const updated = { ...prev, strategy: { ...prev.strategy, answers: [...prev.strategy.answers, answer] } };
      persistDialogueContext(updated);
      return updated;
    });
  }, [persistDialogueContext]);

  const handleDialogueComplete = useCallback(() => {
    setDialogueComplete(true);
    setDialogueContext(prev => {
      const updated = { ...prev, strategy: { ...prev.strategy, status: 'complete' as const } };
      persistDialogueContext(updated);
      return updated;
    });
  }, [persistDialogueContext]);

  const handleCascadeAction = useCallback((action: 'update_all' | 'review' | 'cancel', _impact: CascadeImpact) => {
    setCascadeImpact(null);
    if (action === 'cancel') {
      // Revert — reload from existing pillars
      if (existingPillars) {
        setCeName(existingPillars.centralEntity ?? '');
        setScType(existingPillars.sourceContext ?? '');
      }
    }
    // 'update_all' and 'review' — handled by downstream regeneration in later steps
  }, [existingPillars]);

  const handleReorderPriorities = (from: number, to: number) => {
    const updated = [...scPriorities];
    const [item] = updated.splice(from, 1);
    updated.splice(to, 0, item);
    setScPriorities(updated);
  };

  const handleSaveStrategy = async () => {
    if (!ceName.trim()) {
      setSaveError('Central Entity name is required.');
      return;
    }
    if (!scType.trim()) {
      setSaveError('Source Context type is required.');
      return;
    }

    setSaveError(null);
    setIsSaving(true);
    setStepStatus('strategy', 'in_progress');

    const pillars = {
      centralEntity: ceName.trim(),
      sourceContext: scType.trim(),
      centralSearchIntent: csiText.trim() || csiPredicates.join(', '),
      primary_verb: scPriorities[0] ?? '',
      auxiliary_verb: csiPredicates[0] ?? '',
      csiPredicates: csiPredicates,
      scPriorities: scPriorities,
      contentAreas: contentAreas,
      contentAreaTypes: contentAreaTypes,
    };

    // Dispatch to global state
    if (state.activeMapId) {
      dispatch({
        type: 'UPDATE_MAP_DATA',
        payload: { mapId: state.activeMapId, data: { pillars } },
      });

      // Persist to Supabase
      try {
        const supabase = getSupabaseClient(
          effectiveBusinessInfo.supabaseUrl,
          effectiveBusinessInfo.supabaseAnonKey
        );
        const { error } = await supabase
          .from('topical_maps')
          .update({ pillars } as any)
          .eq('id', state.activeMapId);

        if (error) {
          console.warn('[Strategy] Supabase save error:', error.message);
          // Non-fatal — state is saved in memory
        }
      } catch (err) {
        console.warn('[Strategy] Supabase save failed:', err);
      }
    }

    setSavedSuccess(true);
    setIsSaving(false);
    setStepStatus('strategy', 'pending_approval');

    // Reset success flash after 3 seconds
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-200">Strategic Foundation</h2>
          <p className="text-sm text-gray-400 mt-1">
            Define the five core components: Central Entity, Source Context, and Central Search Intent
          </p>
        </div>
        <button
          type="button"
          onClick={handleAiSuggest}
          disabled={isSuggesting || !hasBusinessContext}
          className="flex items-center gap-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSuggesting ? (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          )}
          {isSuggesting ? 'Suggesting...' : 'AI Suggest'}
        </button>
      </div>

      {/* Business Context Card */}
      <BusinessContextCard businessInfo={effectiveBusinessInfo} />

      {/* AI Suggestion Banner */}
      {aiSuggested && !savedSuccess && (
        <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-4 flex items-start gap-3">
          <AiBadge />
          <div>
            <p className="text-sm text-purple-300">
              Pillars auto-suggested from your business context. Review and adjust before saving.
            </p>
            {suggestionReasoning && (
              <p className="text-xs text-purple-400/70 mt-1">{suggestionReasoning}</p>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {saveError && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
          <p className="text-sm text-red-300">{saveError}</p>
        </div>
      )}

      {/* Success */}
      {savedSuccess && (
        <div className="bg-green-900/20 border border-green-700 rounded-lg p-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm text-green-300">Strategy saved successfully.</p>
        </div>
      )}

      {/* Five Components Summary Card — prominent position before editor cards */}
      <FiveComponentsSummaryCard
        ceName={ceName}
        scType={scType}
        scPriorities={scPriorities}
        csiPredicates={csiPredicates}
        csiText={csiText}
        contentAreas={contentAreas}
        contentAreaTypes={contentAreaTypes}
        businessInfo={effectiveBusinessInfo}
        ceFromCrawl={ceFromCrawl}
        aiSuggested={aiSuggested}
      />

      {/* J1: Adaptive display — Adjust button when in summary mode */}
      {!isAdjusting && hasStrategyData && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setIsAdjusting(true)}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 px-5 py-2 rounded-md text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
            </svg>
            Adjust Strategy
          </button>
        </div>
      )}

      {/* Three-card strategy layout — only shown when adjusting or no data */}
      {isAdjusting && (<>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Central Entity (CE) — emerald accent */}
        <div className="bg-gray-800 border border-gray-700 border-l-4 border-l-emerald-500 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 rounded px-2 py-0.5 text-xs font-semibold">
              CE
            </span>
            <h3 className="text-sm font-semibold text-gray-200">Central Entity</h3>
            {aiSuggested && ceName && <AutoDetectedBadge />}
            {ceFromCrawl && !aiSuggested && ceName && (
              <span className="text-[9px] px-1.5 py-0.5 rounded border bg-green-900/20 text-green-400 border-green-700/40">
                From website
              </span>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Entity Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={ceName}
                onChange={(e) => setCeName(e.target.value)}
                placeholder="e.g., Electric Bikes"
                className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            {/* S2: CE evidence card */}
            {ceName && ceFromCrawl && (
              <div className="bg-emerald-900/10 border border-emerald-700/20 rounded-md px-3 py-2">
                <p className="text-[10px] text-emerald-400/80 uppercase font-medium mb-1">Evidence</p>
                <p className="text-[10px] text-gray-400">
                  Detected from your website content. This entity will anchor every page in your content plan.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Source Context (SC) — sky accent */}
        <div className="bg-gray-800 border border-gray-700 border-l-4 border-l-sky-500 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-sky-600/20 text-sky-300 border border-sky-500/30 rounded px-2 py-0.5 text-xs font-semibold">
              SC
            </span>
            <h3 className="text-sm font-semibold text-gray-200">Source Context</h3>
            {aiSuggested && scType && <AiBadge />}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Source Type <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={scType}
                onChange={(e) => setScType(e.target.value)}
                placeholder="e.g., E-commerce retailer"
                className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Attribute Priorities (ordered)
              </label>
              <OrderedPriorityList
                items={scPriorities}
                onAdd={(item) => setScPriorities([...scPriorities, item])}
                onRemove={(i) => setScPriorities(scPriorities.filter((_, idx) => idx !== i))}
                onReorder={handleReorderPriorities}
                placeholder="Type and press Enter..."
                accentColor="sky"
              />
              <p className="text-xs text-gray-500 mt-1">
                Order matters &mdash; highest priority first
              </p>
              {/* S4: Priority reasoning */}
              {scPriorities.length > 0 && aiSuggested && (
                <div className="mt-2 space-y-0.5">
                  {scPriorities.slice(0, 3).map((p, i) => (
                    <p key={i} className="text-[10px] text-sky-400/60">
                      {i + 1}. {p} — {i === 0 ? 'most searched attribute by your target audience' : i === 1 ? 'key differentiator in your industry' : 'supports conversion decisions'}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Central Search Intent (CSI) — amber accent */}
        <div className="bg-gray-800 border border-gray-700 border-l-4 border-l-amber-500 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-amber-600/20 text-amber-300 border border-amber-500/30 rounded px-2 py-0.5 text-xs font-semibold">
              CSI
            </span>
            <h3 className="text-sm font-semibold text-gray-200">Central Search Intent</h3>
            {aiSuggested && (csiText || csiPredicates.length > 0) && <AiBadge />}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Intent Description
              </label>
              <input
                type="text"
                value={csiText}
                onChange={(e) => setCsiText(e.target.value)}
                placeholder="e.g., buy, compare, or learn about"
                className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Predicates
              </label>
              <TagInput
                tags={csiPredicates}
                onAdd={(tag) => setCsiPredicates([...csiPredicates, tag])}
                onRemove={(i) => setCsiPredicates(csiPredicates.filter((_, idx) => idx !== i))}
                placeholder="e.g., buy, compare, reviews..."
                accentColor="amber"
              />
              <p className="text-xs text-gray-500 mt-1">
                Define the primary search predicates users combine with the CE
              </p>
              {/* S3: Search query preview under predicates */}
              {csiPredicates.length > 0 && ceName && (
                <div className="mt-3 bg-amber-900/10 border border-amber-700/20 rounded-md px-3 py-2">
                  <p className="text-[10px] text-amber-400/70 uppercase tracking-wider mb-1.5">
                    What people search for
                  </p>
                  <div className="space-y-1">
                    {csiPredicates.slice(0, 5).map((pred, i) => {
                      const ce = ceName.toLowerCase();
                      const p = pred.toLowerCase();
                      const queries = [
                        `${ce} ${p}`,
                        `${p} ${ce}`,
                        `beste ${ce} ${p}`.replace('beste beste', 'beste'),
                      ];
                      return (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-amber-400 text-xs font-mono mt-0.5 flex-shrink-0">{pred}:</span>
                          <span className="text-xs text-gray-400">
                            {queries.map((q, qi) => (
                              <span key={qi}>
                                {qi > 0 && <span className="text-gray-600 mx-1">&middot;</span>}
                                <span className="text-amber-200/70">&ldquo;{q}&rdquo;</span>
                              </span>
                            ))}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Areas (Decision 4: Hybrid Naming) */}
      <ContentAreasPreview
        contentAreas={contentAreas}
        contentAreaTypes={contentAreaTypes}
        onUpdate={setContentAreas}
        onUpdateTypes={setContentAreaTypes}
        industry={effectiveBusinessInfo.industry}
      />

      {/* Save Button */}
      <div className="flex justify-center gap-3">
        <button
          type="button"
          onClick={handleSaveStrategy}
          disabled={isSaving}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-2.5 rounded-md font-medium transition-colors flex items-center gap-2"
        >
          {isSaving && (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {isSaving ? 'Saving...' : 'Save Strategy'}
        </button>
        {hasStrategyData && (
          <button
            type="button"
            onClick={() => setIsAdjusting(false)}
            className="text-gray-400 hover:text-gray-300 px-4 py-2.5 text-sm transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
      </>)}

      {/* Cascade Warning */}
      {cascadeImpact && (
        <CascadeWarning impact={cascadeImpact} onAction={(action) => handleCascadeAction(action, cascadeImpact)} />
      )}

      {/* Intelligent Dialogue — Q&A before approval */}
      {showDialogue && !dialogueComplete && (
        <StepDialogue
          step="strategy"
          stepOutput={{ pillars: { centralEntity: ceName, sourceContext: scType, centralSearchIntent: csiText, csiPredicates, scPriorities, contentAreas } }}
          businessInfo={effectiveBusinessInfo}
          dialogueContext={dialogueContext}
          onDataExtracted={handleDialogueDataExtracted}
          onDialogueComplete={handleDialogueComplete}
          onCascadeAction={handleCascadeAction}
          onAnswerConfirmed={handleAnswerConfirmed}
        />
      )}

      {/* Approval Gate — G1, most critical (gated on dialogue completion) */}
      {gate && (dialogueComplete || !showDialogue) && (stepState?.status === 'pending_approval' || stepState?.approval?.status === 'rejected') && (
        <div className="bg-violet-900/10 border border-violet-700/40 rounded-lg p-1">
          <ApprovalGate
            step="strategy"
            gate={gate}
            approval={stepState?.approval}
            autoApprove={autoApprove}
            onApprove={() => approveGate('strategy')}
            onReject={(reason) => rejectGate('strategy', reason)}
            onRevise={() => reviseStep('strategy')}
            onToggleAutoApprove={toggleAutoApprove}
            summaryMetrics={[
              { label: 'Central Entity', value: ceName || '(not set)', color: ceName ? 'green' : 'amber' },
              { label: 'Source Context', value: scType || '(not set)', color: scType ? 'green' : 'amber' },
              { label: 'SC Priorities', value: scPriorities.length, color: scPriorities.length > 0 ? 'green' : 'amber' },
              { label: 'CSI Predicates', value: csiPredicates.length, color: csiPredicates.length > 0 ? 'green' : 'amber' },
            ]}
          />
        </div>
      )}
    </div>
  );
};

export default PipelineStrategyStep;
