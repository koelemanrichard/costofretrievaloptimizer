import React, { useState, useEffect, useCallback, useRef } from 'react';
import { usePipeline } from '../../../hooks/usePipeline';
import { useAppState } from '../../../state/appState';
import ApprovalGate from '../../pipeline/ApprovalGate';
import * as migrationService from '../../../services/migrationService';
import { researchBusiness, BusinessResearchResult } from '../../../services/ai/businessResearch';
import { getSupabaseClient } from '../../../services/supabaseClient';
import BusinessInfoForm from '../../BusinessInfoForm';
import { BusinessInfo, WEBSITE_TYPE_CONFIG } from '../../../types';

// ──── Discovery Event Types ────

interface DiscoveryEvent {
  id: string;
  message: string;
  type: 'scanning' | 'found' | 'detected' | 'analyzing' | 'complete' | 'warning' | 'error';
  detail?: string;
  timestamp: number;
}

// ──── Snapshot Card ────

function SnapshotCard({ label, value, icon, color = 'gray' }: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'green' | 'blue' | 'amber' | 'gray';
}) {
  const colorMap: Record<string, string> = {
    green: 'text-green-400 border-green-700/50',
    blue: 'text-blue-400 border-blue-700/50',
    amber: 'text-amber-400 border-amber-700/50',
    gray: 'text-gray-400 border-gray-700',
  };

  return (
    <div className={`bg-gray-800 border rounded-lg p-4 ${colorMap[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={colorMap[color].split(' ')[0]}>{icon}</span>
        <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-2xl font-semibold ${colorMap[color].split(' ')[0]}`}>{value}</p>
    </div>
  );
}

// ──── Discovery Narrative Feed ────

function NarrativeFeed({ events, isActive }: { events: DiscoveryEvent[]; isActive: boolean }) {
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [events.length]);

  const iconMap: Record<DiscoveryEvent['type'], { icon: string; color: string }> = {
    scanning: { icon: '\u2026', color: 'text-blue-400' },
    found: { icon: '\u2713', color: 'text-green-400' },
    detected: { icon: '\u25C9', color: 'text-emerald-400' },
    analyzing: { icon: '\u21BB', color: 'text-amber-400' },
    complete: { icon: '\u2714', color: 'text-green-400' },
    warning: { icon: '!', color: 'text-amber-400' },
    error: { icon: '\u2717', color: 'text-red-400' },
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden h-full">
      <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2">
        {isActive && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
          </span>
        )}
        <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
          {isActive ? 'Discovering...' : 'Discovery Log'}
        </h3>
      </div>
      <div ref={feedRef} className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
        {events.length === 0 && (
          <p className="text-xs text-gray-500 italic">Waiting to start...</p>
        )}
        {events.map((event, i) => {
          const { icon, color } = iconMap[event.type];
          return (
            <div
              key={event.id}
              className="flex items-start gap-2 animate-fadeIn"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <span className={`text-xs font-bold mt-0.5 w-4 text-center flex-shrink-0 ${
                !isActive && (event.type === 'analyzing' || event.type === 'scanning') ? 'text-green-400' : color
              }`}>
                {event.type === 'analyzing' && isActive ? (
                  <svg className="w-3 h-3 animate-spin inline" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : !isActive && (event.type === 'analyzing' || event.type === 'scanning') ? '\u2713' : icon}
              </span>
              <div className="min-w-0">
                <p className="text-sm text-gray-300">{event.message}</p>
                {event.detail && (
                  <p className="text-xs text-gray-500 mt-0.5">{event.detail}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ──── Profile Field ────

interface ProfileFieldData {
  key: string;
  label: string;
  value: string;
  source: 'website' | 'ai' | 'user';
}

function ProfileCard({ fields, isLoading }: { fields: ProfileFieldData[]; isLoading: boolean }) {
  const sourceConfig: Record<string, { label: string; color: string }> = {
    website: { label: 'From website', color: 'text-green-400 bg-green-900/20 border-green-700/40' },
    ai: { label: 'AI-suggested', color: 'text-purple-400 bg-purple-900/20 border-purple-700/40' },
    user: { label: 'You entered', color: 'text-gray-400 bg-gray-800 border-gray-700' },
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden h-full">
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Business Profile</h3>
        {isLoading && (
          <span className="text-[10px] text-blue-400 flex items-center gap-1">
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Populating...
          </span>
        )}
      </div>
      <div className="p-4 space-y-3">
        {fields.length === 0 && (
          <div className="text-center py-8">
            <p className="text-xs text-gray-500 italic">Fields will appear as data is discovered...</p>
          </div>
        )}
        {fields.map((field) => {
          const src = sourceConfig[field.source];
          return (
            <div key={field.key} className="animate-fadeIn">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">{field.label}</p>
                <span className={`text-[9px] px-1.5 py-0.5 rounded border ${src.color}`}>
                  {src.label}
                </span>
              </div>
              <p className="text-sm text-gray-200">{field.value || <span className="text-gray-600 italic">Not detected</span>}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ──── Site Snapshot Summary (C3) ────

function SiteSnapshot({ pagesFound, language, industry, websiteType }: {
  pagesFound: number;
  language?: string;
  industry?: string;
  websiteType?: string;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <SnapshotCard
        label="Pages Discovered"
        value={pagesFound}
        color={pagesFound > 0 ? 'green' : 'gray'}
        icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        }
      />
      <SnapshotCard
        label="Language"
        value={language || '--'}
        color={language ? 'blue' : 'gray'}
        icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
          </svg>
        }
      />
      <SnapshotCard
        label="Industry"
        value={industry || '--'}
        color={industry ? 'amber' : 'gray'}
        icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
          </svg>
        }
      />
      <SnapshotCard
        label="Website Type"
        value={websiteType ? (WEBSITE_TYPE_CONFIG[websiteType as keyof typeof WEBSITE_TYPE_CONFIG]?.label || websiteType) : '--'}
        color={websiteType ? 'green' : 'gray'}
        icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
          </svg>
        }
      />
    </div>
  );
}

// ──── Review Card ────

function BusinessReviewCard({
  bizInfo,
  url,
  onEdit,
}: {
  bizInfo: Partial<BusinessInfo>;
  url: string;
  onEdit: () => void;
}) {
  return (
    <div className="bg-gray-800 border border-green-700/50 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-6 py-3 bg-green-900/20 border-b border-green-700/30">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-semibold text-green-300">Business Profile — Review Before Approval</span>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs text-blue-400 hover:text-blue-300 underline"
        >
          Edit Details
        </button>
      </div>
      <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 text-sm">
        <FieldDisplay label="Domain" value={bizInfo.domain || url.replace(/^https?:\/\//, '').replace(/\/+$/, '')} />
        <FieldDisplay label="Seed Keyword / Topic" value={bizInfo.seedKeyword} />
        <FieldDisplay label="Industry" value={bizInfo.industry} />
        <FieldDisplay label="Language" value={bizInfo.language} />
        <FieldDisplay label="Target Market" value={bizInfo.targetMarket} />
        <FieldDisplay
          label="Website Type"
          value={bizInfo.websiteType
            ? (WEBSITE_TYPE_CONFIG[bizInfo.websiteType as keyof typeof WEBSITE_TYPE_CONFIG]?.label || bizInfo.websiteType)
            : undefined}
        />
        <FieldDisplay label="Value Proposition" value={bizInfo.valueProp} span={3} />
        <FieldDisplay label="Target Audience" value={bizInfo.audience} span={3} />
        {bizInfo.authorProfile?.name && (
          <FieldDisplay
            label="Author"
            value={`${bizInfo.authorProfile.name}${bizInfo.authorProfile.credentials ? ` — ${bizInfo.authorProfile.credentials}` : ''}`}
            span={3}
          />
        )}
      </div>
    </div>
  );
}

function FieldDisplay({ label, value, span }: { label: string; value?: string; span?: number }) {
  const spanClass = span === 3 ? 'col-span-2 md:col-span-3' : '';
  return (
    <div className={spanClass}>
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-gray-200">{value || <span className="text-gray-600 italic">Not set</span>}</p>
    </div>
  );
}

// ──── Main Component ────

const PipelineCrawlStep: React.FC = () => {
  const {
    pipeline,
    isGreenfield,
    autoApprove,
    setStepStatus,
    advanceStep,
    approveGate,
    rejectGate,
    reviseStep,
    toggleAutoApprove,
    getStepState,
    activeMap,
  } = usePipeline();

  const { state, dispatch } = useAppState();
  const stepState = getStepState('crawl');
  const gate = stepState?.gate;

  // ──── State ────
  const [url, setUrl] = useState(pipeline.siteUrl || '');
  const [discoveryPhase, setDiscoveryPhase] = useState<'input' | 'discovering' | 'done' | 'error' | 'editing'>('input');
  const [discoveryEvents, setDiscoveryEvents] = useState<DiscoveryEvent[]>([]);
  const [profileFields, setProfileFields] = useState<ProfileFieldData[]>([]);
  const [pagesFound, setPagesFound] = useState(0);
  const [contextSaved, setContextSaved] = useState(false);
  const [discoveryError, setDiscoveryError] = useState('');
  const [researchResult, setResearchResult] = useState<BusinessResearchResult | null>(null);

  // Ref to prevent double-runs
  const discoveryRunningRef = useRef(false);

  // ──── Event helper ────
  const addEvent = useCallback((message: string, type: DiscoveryEvent['type'], detail?: string) => {
    setDiscoveryEvents(prev => [...prev, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      message,
      type,
      detail,
      timestamp: Date.now(),
    }]);
  }, []);

  // ──── Add profile field helper ────
  const addProfileField = useCallback((key: string, label: string, value: string, source: ProfileFieldData['source'] = 'ai') => {
    setProfileFields(prev => {
      const existing = prev.findIndex(f => f.key === key);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { key, label, value, source };
        return updated;
      }
      return [...prev, { key, label, value, source }];
    });
  }, []);

  // ──── Restore previous state on mount ────
  useEffect(() => {
    const bizInfo = activeMap?.business_info;
    const hasExistingData = bizInfo?.seedKeyword && bizInfo?.industry;

    if (!isGreenfield && stepState?.status !== 'locked' && stepState?.status !== 'available') {
      if (hasExistingData) {
        setContextSaved(true);
        setDiscoveryPhase('done');
      }
      if (stepState?.status === 'completed' || stepState?.status === 'pending_approval') {
        setDiscoveryPhase('done');
        const pageCount = (bizInfo as any)?.pagesFound ?? 0;
        setPagesFound(pageCount);
      }
    }
  }, [activeMap?.id]);

  // ──── Unified Discovery Handler (C1+C2) ────
  const handleStartDiscovery = useCallback(async () => {
    if (!url.trim() || !state.activeProjectId || discoveryRunningRef.current) return;

    discoveryRunningRef.current = true;
    setDiscoveryPhase('discovering');
    setDiscoveryError('');
    setDiscoveryEvents([]);
    setProfileFields([]);
    setPagesFound(0);

    addEvent('Starting website discovery...', 'scanning');

    // ── Run crawl + research in parallel ──
    let crawledPages = 0;
    let researchData: BusinessResearchResult | null = null;

    const crawlPromise = (async () => {
      try {
        let sitemapUrl = url.trim();
        if (!sitemapUrl.endsWith('/sitemap.xml') && !sitemapUrl.includes('sitemap')) {
          sitemapUrl = sitemapUrl.replace(/\/+$/, '') + '/sitemap.xml';
        }

        addEvent('Scanning sitemap...', 'scanning', sitemapUrl);

        const proxyConfig = {
          supabaseUrl: state.businessInfo.supabaseUrl,
          supabaseAnonKey: state.businessInfo.supabaseAnonKey,
        };

        const discoveredUrls = await migrationService.fetchAndParseSitemap(
          sitemapUrl,
          (msg) => {
            // Parse progress messages for narrative events
            if (msg.includes('Found')) {
              addEvent(msg, 'found');
            }
          },
          proxyConfig,
        );

        if (discoveredUrls.length === 0) {
          addEvent('No pages found in sitemap', 'warning', 'The sitemap may be empty or inaccessible.');
          return 0;
        }

        crawledPages = discoveredUrls.length;
        setPagesFound(crawledPages);
        addEvent(`Found ${crawledPages} pages`, 'found');

        // Save to inventory
        addEvent('Saving page inventory...', 'scanning');
        await migrationService.initializeInventory(
          state.activeProjectId!, discoveredUrls,
          state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey,
          () => {},
        );
        addEvent('Page inventory saved', 'complete');

        return crawledPages;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Crawl failed';
        addEvent(`Sitemap scan failed: ${msg}`, 'warning', 'Continuing with AI research...');
        return 0;
      }
    })();

    const researchPromise = (async () => {
      try {
        addEvent('Analyzing website content...', 'analyzing');

        const result = await researchBusiness(url.trim(), state.businessInfo, dispatch);
        researchData = result;
        setResearchResult(result);

        // Populate profile fields from research results (staggered for visual effect)
        const suggestions = result.suggestions;
        const fieldMap: Array<{ key: keyof BusinessInfo; label: string }> = [
          { key: 'seedKeyword', label: 'Main Topic' },
          { key: 'industry', label: 'Industry' },
          { key: 'language', label: 'Language' },
          { key: 'region', label: 'Region' },
          { key: 'targetMarket', label: 'Target Market' },
          { key: 'audience', label: 'Target Audience' },
          { key: 'valueProp', label: 'Value Proposition' },
        ];

        const source: ProfileFieldData['source'] = result.source === 'scraped' || result.source === 'combined' ? 'website' : 'ai';

        for (let i = 0; i < fieldMap.length; i++) {
          const { key, label } = fieldMap[i];
          const val = suggestions[key];
          if (val && String(val).trim()) {
            // Stagger field appearance
            await new Promise(resolve => setTimeout(resolve, 200));
            addProfileField(key, label, String(val), source);

            // Add narrative event for key discoveries
            if (key === 'language') {
              addEvent(`Detected language: ${val}`, 'detected');
            } else if (key === 'industry') {
              addEvent(`Detected industry: ${val}`, 'detected');
            } else if (key === 'seedKeyword') {
              addEvent(`Main topic: ${val}`, 'detected');
            } else if (key === 'region') {
              addEvent(`Region: ${val}`, 'detected');
            }
          }
        }

        // Author info
        if (suggestions.authorName) {
          addProfileField('authorName', 'Author', String(suggestions.authorName), source);
        }

        if (result.confidence === 'high') {
          addEvent('High confidence — data extracted from your website', 'complete');
        } else if (result.confidence === 'medium') {
          addEvent('Medium confidence — some fields may need verification', 'warning');
        }

        return result;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Research failed';
        addEvent(`Research failed: ${msg}`, 'error');
        return null;
      }
    })();

    // Wait for both to complete
    const [pages] = await Promise.all([crawlPromise, researchPromise]);

    // Final narrative
    addEvent('Discovery complete', 'complete', `${pages} pages found, business profile populated.`);
    setDiscoveryPhase('done');
    setStepStatus('crawl', 'in_progress');
    discoveryRunningRef.current = false;
  }, [url, state.activeProjectId, state.businessInfo, dispatch, setStepStatus, addEvent, addProfileField]);

  // ──── Save business context ────
  const handleSaveBusinessContext = useCallback(async (formData: Partial<BusinessInfo>) => {
    const domain = url.trim().replace(/\/+$/, '').replace(/^https?:\/\//, '');

    const updatedBusinessInfo = {
      ...state.businessInfo,
      ...formData,
      ...(domain ? { domain } : {}),
    };
    dispatch({ type: 'SET_BUSINESS_INFO', payload: updatedBusinessInfo });

    if (state.activeMapId) {
      const mapBizInfo = {
        ...activeMap?.business_info,
        ...formData,
        ...(domain ? { domain } : {}),
        pagesFound,
      };

      dispatch({
        type: 'UPDATE_MAP_DATA',
        payload: { mapId: state.activeMapId, data: { business_info: mapBizInfo } },
      });

      try {
        const supabase = getSupabaseClient(
          state.businessInfo.supabaseUrl,
          state.businessInfo.supabaseAnonKey
        );
        await supabase
          .from('topical_maps')
          .update({ business_info: mapBizInfo } as any)
          .eq('id', state.activeMapId);
      } catch {
        // Non-fatal
      }
    }

    if (isGreenfield) {
      setStepStatus('crawl', 'completed');
      advanceStep('crawl');
    } else {
      setContextSaved(true);
      setDiscoveryPhase('done');
      setStepStatus('crawl', 'pending_approval');
    }
  }, [url, state, activeMap, pagesFound, dispatch, setStepStatus, advanceStep, isGreenfield]);

  // ──── Quick-save from discovery (apply research + save) ────
  const handleConfirmDiscovery = useCallback(async () => {
    if (!researchResult?.suggestions) return;

    const domain = url.trim().replace(/\/+$/, '').replace(/^https?:\/\//, '');
    const suggestions = researchResult.suggestions;

    // Build merged business info
    const formData: Partial<BusinessInfo> = {
      seedKeyword: suggestions.seedKeyword || state.businessInfo.seedKeyword,
      industry: suggestions.industry || state.businessInfo.industry,
      language: suggestions.language || state.businessInfo.language,
      region: suggestions.region || state.businessInfo.region,
      targetMarket: suggestions.targetMarket || state.businessInfo.targetMarket,
      audience: suggestions.audience || state.businessInfo.audience,
      valueProp: suggestions.valueProp || state.businessInfo.valueProp,
      domain,
    };

    // Author profile
    if (suggestions.authorName) {
      formData.authorProfile = {
        name: suggestions.authorName || '',
        bio: suggestions.authorBio || '',
        credentials: suggestions.authorCredentials || '',
        socialUrls: [],
        stylometry: 'INSTRUCTIONAL_CLEAR' as any,
      };
    }

    await handleSaveBusinessContext(formData);
  }, [researchResult, url, state.businessInfo, handleSaveBusinessContext]);

  // ──── Derived state ────
  const existingBizInfo = activeMap?.business_info;
  const showNarrative = discoveryPhase === 'discovering' || (discoveryPhase === 'done' && discoveryEvents.length > 0 && !contextSaved);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-200">
          {isGreenfield ? 'Business Foundation' : 'Website Discovery'}
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          {isGreenfield
            ? 'Define your business context and seed keywords'
            : 'Enter your URL \u2014 the system will analyze your website and build your business profile automatically'}
        </p>
      </div>

      {/* ──── Greenfield Mode (C4: keyword inference) ──── */}
      {isGreenfield ? (
        <div className="space-y-6">
          {/* C4: Inference hint from seed keyword */}
          {state.businessInfo.seedKeyword && (
            <div className="bg-blue-900/15 border border-blue-700/30 rounded-lg px-5 py-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                <span className="text-sm font-medium text-blue-300">Keyword Analysis</span>
              </div>
              <p className="text-xs text-gray-400">
                Starting from <span className="text-blue-200 font-medium">&ldquo;{state.businessInfo.seedKeyword}&rdquo;</span>.
                {state.businessInfo.language && <> Detected language: <span className="text-blue-200">{state.businessInfo.language}</span>.</>}
                {state.businessInfo.industry && <> Industry: <span className="text-blue-200">{state.businessInfo.industry}</span>.</>}
                {' '}Fill in the details below to refine the AI&apos;s understanding of your business.
              </p>
            </div>
          )}
          <BusinessInfoForm
            onSave={handleSaveBusinessContext}
            onBack={() => {}}
            isLoading={false}
            title="Define Your Business"
            description="Provide core details for AI to build your SEO strategy."
            submitLabel="Save & Continue"
            showBackButton={false}
            embedded={true}
          />
        </div>
      ) : (
        <>
          {/* ──── URL Input ──── */}
          {(discoveryPhase === 'input' || discoveryPhase === 'error') && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-gray-200 mb-4">Website URL</h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="flex-1 bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyDown={(e) => { if (e.key === 'Enter' && url.trim()) handleStartDiscovery(); }}
                />
                <button
                  type="button"
                  onClick={handleStartDiscovery}
                  disabled={!url.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
                >
                  Discover
                </button>
              </div>
              {discoveryError && (
                <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 mt-4">
                  <p className="text-sm text-red-300">{discoveryError}</p>
                  <button type="button"
                    onClick={() => { setDiscoveryPhase('input'); setDiscoveryError(''); }}
                    className="mt-2 text-xs text-red-400 hover:text-red-300 underline">
                    Try again
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ──── Discovery Phase: Two-column narrative + profile (C1+C2) ──── */}
          {showNarrative && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <NarrativeFeed
                events={discoveryEvents}
                isActive={discoveryPhase === 'discovering'}
              />
              <ProfileCard
                fields={profileFields}
                isLoading={discoveryPhase === 'discovering'}
              />
            </div>
          )}

          {/* ──── Site Snapshot Summary (C3) ──── */}
          {discoveryPhase === 'done' && (
            <SiteSnapshot
              pagesFound={pagesFound}
              language={researchResult?.suggestions?.language || existingBizInfo?.language}
              industry={researchResult?.suggestions?.industry || existingBizInfo?.industry}
              websiteType={existingBizInfo?.websiteType}
            />
          )}

          {/* ──── Quick-confirm or Edit toggle ──── */}
          {discoveryPhase === 'done' && !contextSaved && researchResult && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleConfirmDiscovery}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-md font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Confirm Business Profile
              </button>
              <button
                type="button"
                onClick={() => setDiscoveryPhase('editing')}
                className="border border-gray-600 text-gray-300 hover:bg-gray-800 px-5 py-2.5 rounded-md font-medium transition-colors"
              >
                Edit Details
              </button>
            </div>
          )}

          {/* ──── Full edit form (when user clicks Edit) ──── */}
          {discoveryPhase === 'editing' && (
            <BusinessInfoForm
              onSave={(formData) => {
                handleSaveBusinessContext(formData);
                setContextSaved(true);
                setDiscoveryPhase('done');
              }}
              onBack={() => {
                // Go back to review card if already saved, or discovery results if not
                if (contextSaved) {
                  setDiscoveryPhase('done');
                } else {
                  setDiscoveryPhase('done');
                }
              }}
              isLoading={false}
              title="Edit Business Profile"
              description="Review and correct the details below. Fields were pre-filled from your website."
              submitLabel="Save Changes"
              showBackButton={true}
              embedded={true}
            />
          )}

          {/* ──── Context saved — review card ──── */}
          {contextSaved && existingBizInfo && (
            <BusinessReviewCard
              bizInfo={existingBizInfo}
              url={url}
              onEdit={() => {
                setContextSaved(false);
                setDiscoveryPhase('editing');
              }}
            />
          )}

          {/* ──── Approval Gate ──── */}
          {gate && (stepState?.status === 'pending_approval' || stepState?.approval?.status === 'rejected') && (
            <ApprovalGate
              step="crawl"
              gate={gate}
              approval={stepState?.approval}
              autoApprove={autoApprove}
              onApprove={() => approveGate('crawl')}
              onReject={(reason) => rejectGate('crawl', reason)}
              onRevise={() => {
                reviseStep('crawl');
                setContextSaved(false);
                setDiscoveryPhase('editing');
              }}
              onToggleAutoApprove={toggleAutoApprove}
              summaryMetrics={[
                { label: 'Pages Found', value: pagesFound, color: pagesFound > 0 ? 'green' : 'gray' },
                { label: 'Business Info', value: contextSaved ? 'Complete' : 'Needs Review', color: contextSaved ? 'green' : 'amber' },
                { label: 'Confidence', value: researchResult?.confidence || '--', color: researchResult?.confidence === 'high' ? 'green' : researchResult?.confidence === 'medium' ? 'amber' : 'gray' },
              ]}
            />
          )}
        </>
      )}
    </div>
  );
};

export default PipelineCrawlStep;
