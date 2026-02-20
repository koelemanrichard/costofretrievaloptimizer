import React, { useState, useCallback } from 'react';
import { usePipeline } from '../../../hooks/usePipeline';
import { useAppState } from '../../../state/appState';
import ApprovalGate from '../../pipeline/ApprovalGate';
import {
  generateTechSpec,
  type TechSpecDeliverable,
  type TechSpecResult,
} from '../../../services/techSpecGenerationService';
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

  const { state } = useAppState();

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TechSpecResult | null>(null);

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
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Tech spec generation failed: ${message}`);
      setStepStatus('tech_spec', 'available');
    } finally {
      setIsGenerating(false);
    }
  }, [activeMap, setStepStatus]);

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
