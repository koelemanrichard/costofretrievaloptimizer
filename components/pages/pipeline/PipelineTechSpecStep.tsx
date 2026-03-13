import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { usePipeline } from '../../../hooks/usePipeline';
import { useAppState } from '../../../state/appState';
import { getSupabaseClient } from '../../../services/supabaseClient';
import ApprovalGate from '../../pipeline/ApprovalGate';
import {
  generateTechSpec,
  type TechSpecDeliverable,
  type TechSpecResult,
} from '../../../services/techSpecGenerationService';
import { mergeMapBusinessInfo } from '../../../utils/helpers';
import type { EnrichedTopic, ContentBrief } from '../../../types';

// ──── Icon Components ────

function FileIcon({ type }: { type: 'csv' | 'json' | 'html' | 'xml' | 'txt' | 'md' }) {
  const colors: Record<string, string> = {
    csv: 'text-green-400',
    json: 'text-amber-400',
    html: 'text-blue-400',
    xml: 'text-purple-400',
    txt: 'text-gray-400',
    md: 'text-cyan-400',
  };

  return (
    <span className={`text-xs font-bold font-mono uppercase ${colors[type] ?? 'text-gray-400'}`}>
      {type}
    </span>
  );
}

// ──── Deliverable Card ────

function DeliverableCard({
  deliverable,
  generated,
  onDownload,
}: {
  deliverable: { name: string; format: string };
  generated?: TechSpecDeliverable;
  onDownload?: (d: TechSpecDeliverable) => void;
}) {
  const fmt = (generated?.format ?? deliverable.format).toLowerCase() as
    'csv' | 'json' | 'html' | 'xml' | 'txt' | 'md';

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg bg-gray-900 border border-gray-600 flex items-center justify-center flex-shrink-0">
        <FileIcon type={fmt} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-200 truncate">{deliverable.name}</p>
        <p className="text-xs text-gray-500">{deliverable.format}</p>
        {generated && (
          <p className="text-xs text-green-400 mt-0.5">
            {generated.content.length.toLocaleString()} chars
          </p>
        )}
      </div>
      <button
        type="button"
        disabled={!generated || !onDownload}
        onClick={() => generated && onDownload && onDownload(generated)}
        className={`text-xs border rounded px-3 py-1.5 transition-colors ${
          generated && onDownload
            ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-500 cursor-pointer'
            : 'bg-gray-700 text-gray-500 border-gray-600 cursor-not-allowed'
        }`}
      >
        Download
      </button>
    </div>
  );
}

// ──── Schema Preview Panel ────

function SchemaPreviewPanel({ content }: { content?: string }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">XML Sitemap Preview</h3>
      <div className="bg-gray-900 border border-gray-700 rounded-md p-4 min-h-[300px] max-h-[400px] overflow-y-auto">
        <pre className="text-xs text-gray-400 font-mono whitespace-pre-wrap">
          {content ?? `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

  <!-- Sitemap will be generated here after running the tech spec generator. -->
  <!-- Includes all topic URLs with priority and changefreq values. -->

</urlset>`}
        </pre>
      </div>
    </div>
  );
}

// ──── JSON-LD Schema Preview (T1) ────

function JsonLdSchemaPreview({
  pillars,
  eavs,
  businessInfo,
}: {
  pillars?: { centralEntity?: string; sourceContext?: string };
  eavs?: Array<{ predicate?: { relation?: string }; object?: { value?: string | number } }>;
  businessInfo: {
    projectName?: string;
    domain?: string;
    industry?: string;
    language?: string;
    targetMarket?: string;
  };
}) {
  if (!pillars?.centralEntity && (!eavs || eavs.length === 0)) return null;

  // Extract EAV values for schema fields
  const findEav = (patterns: string[]): string | undefined => {
    if (!eavs) return undefined;
    for (const pattern of patterns) {
      const found = eavs.find(e =>
        e.predicate?.relation?.toLowerCase()?.includes(pattern.toLowerCase())
      );
      if (found?.object?.value) return String(found.object.value);
    }
    return undefined;
  };

  const foundingDate = findEav(['founded', 'founding', 'established', 'since', 'opgericht']);
  const employees = findEav(['employees', 'medewerkers', 'team size', 'staff']);
  const address = findEav(['address', 'location', 'adres', 'kantoor']);
  const certification = findEav(['certification', 'certificering', 'keurmerk', 'iso', 'accreditation']);
  const slogan = findEav(['slogan', 'tagline', 'motto']);

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: businessInfo.projectName || pillars?.centralEntity || '',
    url: businessInfo.domain ? (businessInfo.domain.startsWith('http') ? businessInfo.domain : `https://${businessInfo.domain}`) : '',
    ...(pillars?.sourceContext && { description: pillars.sourceContext }),
    ...(foundingDate && { foundingDate }),
    ...(employees && { numberOfEmployees: { '@type': 'QuantitativeValue', value: employees } }),
    ...(address && { address: { '@type': 'PostalAddress', streetAddress: address } }),
    ...(certification && { hasCredential: { '@type': 'EducationalOccupationalCredential', credentialCategory: certification } }),
    ...(slogan && { slogan }),
    ...(businessInfo.industry && { industry: businessInfo.industry }),
    ...(pillars?.centralEntity && { knowsAbout: pillars.centralEntity }),
    ...(businessInfo.language && { inLanguage: businessInfo.language }),
  };

  const schemaJson = JSON.stringify(schema, null, 2);
  const eavFieldCount = [foundingDate, employees, address, certification, slogan].filter(Boolean).length;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-200">JSON-LD Schema Preview</h3>
        {eavFieldCount > 0 && (
          <span className="text-[10px] bg-emerald-900/20 text-emerald-400 border border-emerald-700/30 rounded px-1.5 py-0.5">
            {eavFieldCount} business facts embedded
          </span>
        )}
      </div>
      <div className="bg-gray-900 border border-gray-700 rounded-md p-4 max-h-[350px] overflow-y-auto">
        <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">
          {`<script type="application/ld+json">\n${schemaJson}\n</script>`}
        </pre>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Schema populated with your verified business data. Hand this to your developer for implementation.
      </p>
    </div>
  );
}

// ──── Performance Targets Card (T2) ────

function PerformanceTargetsCard() {
  const targets = [
    { metric: 'TTFB', target: '< 150ms', note: 'Time to First Byte — use CDN, optimize server response' },
    { metric: 'LCP', target: '< 2.5s', note: 'Largest Contentful Paint — optimize hero images, defer non-critical CSS' },
    { metric: 'INP', target: '< 200ms', note: 'Interaction to Next Paint — minimize JS execution, use requestIdleCallback' },
    { metric: 'CLS', target: '< 0.1', note: 'Cumulative Layout Shift — set explicit dimensions on images/embeds' },
  ];

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Performance Targets (Core Web Vitals)</h3>
      <div className="space-y-2">
        {targets.map(t => (
          <div key={t.metric} className="flex items-center gap-3 bg-gray-900 border border-gray-700 rounded-md px-3 py-2">
            <code className="text-xs font-mono font-bold text-blue-300 w-12 flex-shrink-0">{t.metric}</code>
            <span className="text-xs font-semibold text-green-400 w-16 flex-shrink-0">{t.target}</span>
            <span className="text-[11px] text-gray-500">{t.note}</span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-gray-600 mt-3">
        Share this card with your developer. All targets based on Google's "Good" thresholds.
      </p>
    </div>
  );
}

// ──── Navigation Spec (T3) ────

function NavigationSpecCard({ topics }: {
  topics: Array<{ title: string; cluster_role?: string; topic_class?: string | null; slug?: string }>;
}) {
  if (topics.length === 0) return null;

  const hubs = topics.filter(t => t.cluster_role === 'pillar');
  const headerItems = hubs.slice(0, 7);
  const footerItems = hubs;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Navigation Structure</h3>

      {/* Header nav wireframe */}
      <div className="bg-gray-900 border border-gray-700 rounded-md p-4 mb-4">
        <p className="text-[10px] text-gray-500 uppercase mb-2">Header Navigation (max 7 items)</p>
        <div className="flex flex-wrap gap-2">
          <span className="text-[11px] bg-gray-700 text-gray-300 rounded px-2.5 py-1 border border-gray-600 font-medium">Home</span>
          {headerItems.map((hub, i) => (
            <span key={i} className="text-[11px] bg-gray-700 text-gray-300 rounded px-2.5 py-1 border border-gray-600">
              {hub.title.length > 25 ? hub.title.slice(0, 22) + '...' : hub.title}
            </span>
          ))}
          <span className="text-[11px] bg-gray-700 text-gray-300 rounded px-2.5 py-1 border border-gray-600 font-medium">Contact</span>
        </div>
      </div>

      {/* Footer nav wireframe */}
      <div className="bg-gray-900 border border-gray-700 rounded-md p-4">
        <p className="text-[10px] text-gray-500 uppercase mb-2">Footer Navigation</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <p className="text-[10px] text-gray-400 font-semibold mb-1">Services</p>
            {footerItems.filter(h => h.topic_class === 'monetization').slice(0, 4).map((h, i) => (
              <p key={i} className="text-[10px] text-gray-500">{h.title}</p>
            ))}
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-semibold mb-1">Knowledge</p>
            {footerItems.filter(h => h.topic_class !== 'monetization').slice(0, 4).map((h, i) => (
              <p key={i} className="text-[10px] text-gray-500">{h.title}</p>
            ))}
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-semibold mb-1">Legal</p>
            <p className="text-[10px] text-gray-500">Privacy Policy</p>
            <p className="text-[10px] text-gray-500">Terms of Service</p>
            <p className="text-[10px] text-gray-500">Cookie Settings</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──── Image Specification Card (T4) ────

function ImageSpecCard({ centralEntity }: { centralEntity?: string }) {
  const entity = centralEntity || 'your-brand';
  const rules = [
    { rule: 'Format', value: 'WebP or AVIF (fallback: JPEG)', note: 'Use <picture> element with format fallbacks' },
    { rule: 'Max width', value: '1200px', note: 'Hero images. Content images: 800px max' },
    { rule: 'Lazy loading', value: 'loading="lazy"', note: 'All images below the fold. Hero image: eager' },
    { rule: 'Alt text', value: 'Visual semantics', note: 'Use alt text from content generation (vocabulary-extending)' },
    { rule: 'File naming', value: `${entity.toLowerCase().replace(/\s+/g, '-')}-[topic]-[descriptor].webp`, note: 'Entity-prefixed for brand signal' },
    { rule: 'Aspect ratio', value: 'Set width + height', note: 'Prevents CLS — always specify dimensions' },
  ];

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Image Implementation Spec</h3>
      <div className="space-y-2">
        {rules.map(r => (
          <div key={r.rule} className="flex items-start gap-3 text-xs">
            <span className="text-gray-400 font-medium w-24 flex-shrink-0">{r.rule}</span>
            <code className="text-blue-300 font-mono text-[11px] flex-shrink-0">{r.value}</code>
            <span className="text-gray-500 text-[10px]">{r.note}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──── Prerequisite Banner ────

function PrerequisiteBanner({ message }: { message: string }) {
  return (
    <div className="bg-amber-900/20 border border-amber-500/40 rounded-lg p-4 flex items-start gap-3">
      <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
      <p className="text-sm text-amber-300">{message}</p>
    </div>
  );
}

// ──── Static deliverable definitions (for layout when not yet generated) ────

const DELIVERABLE_DEFS: Array<{ name: string; format: string }> = [
  { name: 'URL List', format: 'CSV' },
  { name: 'Redirect Map', format: 'CSV' },
  { name: 'Meta Tag Templates', format: 'CSV' },
  { name: 'XML Sitemap', format: 'XML' },
  { name: 'robots.txt', format: 'TXT' },
  { name: 'Navigation Spec', format: 'Markdown' },
  { name: 'Performance Targets', format: 'Markdown' },
  { name: 'Image Spec', format: 'CSV' },
];

// ──── Main Component ────

const PipelineTechSpecStep: React.FC = () => {
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

  // Merge per-map business_info overrides with global state
  const effectiveBusinessInfo = useMemo(() => {
    const mapBI = activeMap?.business_info;
    return mergeMapBusinessInfo(state.businessInfo, mapBI);
  }, [activeMap?.business_info, state.businessInfo]);

  // Load persisted tech spec result from analysis_state on mount
  const persistedResult = (activeMap?.analysis_state as any)?.tech_spec_result as TechSpecResult | null | undefined;

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TechSpecResult | null>(persistedResult ?? null);

  // Sync from persisted data when activeMap changes (e.g. page refresh)
  useEffect(() => {
    if (persistedResult && !result) {
      setResult(persistedResult);
    }
  }, [persistedResult]); // eslint-disable-line react-hooks/exhaustive-deps -- only re-sync when persisted data changes

  const stepState = getStepState('tech_spec');
  const gate = stepState?.gate;

  // Prerequisites check
  const mapStep = getStepState('map_planning');
  const hasTopics = (activeMap?.topics?.length ?? 0) > 0;
  const mapDone = mapStep?.status === 'completed' || hasTopics;

  // ──── Download helper ────

  const handleDownload = useCallback((deliverable: TechSpecDeliverable) => {
    const mimeTypes: Record<string, string> = {
      csv: 'text/csv',
      xml: 'application/xml',
      txt: 'text/plain',
      md: 'text/markdown',
      json: 'application/json',
      html: 'text/html',
    };
    const mime = mimeTypes[deliverable.format] ?? 'text/plain';
    const blob = new Blob([deliverable.content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = deliverable.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // ──── Download all as separate files ────

  const handleDownloadAll = useCallback(() => {
    if (!result) return;
    for (const d of result.deliverables) {
      handleDownload(d);
    }
  }, [result, handleDownload]);

  // ──── Generate handler ────

  const handleGenerate = useCallback(async () => {
    if (!activeMap) {
      setError('No active topical map found.');
      return;
    }

    const topics: EnrichedTopic[] = activeMap.topics ?? [];
    if (topics.length === 0) {
      setError('No topics found. Complete the Map Planning step first.');
      return;
    }

    const briefs: Record<string, ContentBrief> = activeMap.briefs ?? {};

    setIsGenerating(true);
    setError(null);
    setStepStatus('tech_spec', 'in_progress');

    try {
      const techSpec = await generateTechSpec(activeMap, topics, briefs);
      setResult(techSpec);
      setStepStatus('tech_spec', 'pending_approval');

      // Persist to analysis_state
      const activeMapId = state.activeMapId;
      if (activeMapId) {
        const currentAnalysisState = (activeMap?.analysis_state as Record<string, unknown>) ?? {};
        const updatedAnalysisState = { ...currentAnalysisState, tech_spec_result: techSpec };

        dispatch({
          type: 'UPDATE_MAP_DATA',
          payload: { mapId: activeMapId, data: { analysis_state: updatedAnalysisState } as any },
        });

        try {
          const sbUrl = effectiveBusinessInfo.supabaseUrl;
          const sbKey = effectiveBusinessInfo.supabaseAnonKey;
          if (sbUrl && sbKey) {
            const supabase = getSupabaseClient(sbUrl, sbKey);
            const { error: dbErr } = await supabase.from('topical_maps')
              .update({ analysis_state: updatedAnalysisState } as any)
              .eq('id', activeMapId);
            if (dbErr) console.warn('[TechSpec] Failed to persist tech spec result:', dbErr);
          }
        } catch (persistErr) {
          console.warn('[TechSpec] Failed to persist tech spec result:', persistErr);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Tech spec generation failed: ${message}`);
      setStepStatus('tech_spec', 'available');
    } finally {
      setIsGenerating(false);
    }
  }, [activeMap, setStepStatus, state.activeMapId, effectiveBusinessInfo, dispatch]);

  // ──── Derive stats ────

  const sitemapDeliverable = result?.deliverables.find(d => d.format === 'xml');
  const deliverableCount = result?.deliverables.length ?? 0;
  const urlCount = (() => {
    if (!result) return 0;
    const urlList = result.deliverables.find(d => d.filename === 'url-list.csv');
    if (!urlList) return 0;
    // Count rows minus header
    return Math.max(0, urlList.content.split('\n').length - 1);
  })();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-200">Technical Implementation</h2>
        <p className="text-sm text-gray-400 mt-1">
          Downloadable deliverables for developer handoff: URLs, redirects, schema, sitemaps, and more
        </p>
      </div>

      {/* Prerequisites */}
      {!mapDone && (
        <PrerequisiteBanner message="Complete the Map Planning step first to generate technical deliverables from your topic structure." />
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/40 rounded-lg p-4">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Deliverable Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-300">Deliverables</h3>
          {result && (
            <span className="text-xs text-green-400 font-medium">
              {deliverableCount}/{DELIVERABLE_DEFS.length} generated
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {DELIVERABLE_DEFS.map((def) => {
            const generated = result?.deliverables.find(
              d => d.name === def.name
            );
            return (
              <DeliverableCard
                key={def.name}
                deliverable={def}
                generated={generated}
                onDownload={generated ? handleDownload : undefined}
              />
            );
          })}
        </div>
      </div>

      {/* Result Stats */}
      {result && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Files Generated</p>
            <p className="text-2xl font-semibold text-green-400">{deliverableCount}</p>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">URLs Mapped</p>
            <p className="text-2xl font-semibold text-blue-400">{urlCount}</p>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Generated</p>
            <p className="text-sm font-medium text-gray-300 mt-1">
              {new Date(result.generatedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}

      {/* Sitemap / Schema Preview */}
      <SchemaPreviewPanel content={sitemapDeliverable?.content} />

      {/* JSON-LD Schema with Real Data (T1) */}
      <JsonLdSchemaPreview
        pillars={activeMap?.pillars}
        eavs={activeMap?.eavs}
        businessInfo={state.businessInfo}
      />

      {/* Performance Targets (T2) */}
      <PerformanceTargetsCard />

      {/* Navigation Spec (T3) */}
      <NavigationSpecCard topics={activeMap?.topics ?? []} />

      {/* Image Spec (T4) */}
      <ImageSpecCard centralEntity={activeMap?.pillars?.centralEntity} />

      {/* Action Buttons */}
      <div className="flex items-center gap-3 justify-center">
        <button
          type="button"
          disabled={isGenerating || !mapDone}
          onClick={handleGenerate}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-md font-medium transition-colors ${
            isGenerating || !mapDone
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isGenerating ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating...
            </>
          ) : (
            'Generate Tech Spec'
          )}
        </button>

        {result && (
          <button
            type="button"
            onClick={handleDownloadAll}
            className="flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white px-6 py-2.5 rounded-md font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download All Files
          </button>
        )}
      </div>

      {/* Approval Gate */}
      {gate && (stepState?.status === 'pending_approval' || stepState?.approval?.status === 'rejected') && (
        <ApprovalGate
          step="tech_spec"
          gate={gate}
          approval={stepState?.approval}
          autoApprove={autoApprove}
          onApprove={() => approveGate('tech_spec')}
          onReject={(reason) => rejectGate('tech_spec', reason)}
          onRevise={() => reviseStep('tech_spec')}
          onToggleAutoApprove={toggleAutoApprove}
          summaryMetrics={[
            {
              label: 'Deliverables',
              value: `${deliverableCount}/${DELIVERABLE_DEFS.length}`,
              color: deliverableCount === DELIVERABLE_DEFS.length ? 'green' : 'gray',
            },
            { label: 'URLs Mapped', value: urlCount, color: urlCount > 0 ? 'blue' : 'gray' },
            {
              label: 'Generated',
              value: result ? new Date(result.generatedAt).toLocaleDateString() : '--',
              color: result ? 'green' : 'gray',
            },
          ]}
        />
      )}
    </div>
  );
};

export default PipelineTechSpecStep;
