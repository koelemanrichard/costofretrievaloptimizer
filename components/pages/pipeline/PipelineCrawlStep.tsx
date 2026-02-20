import React, { useState, useEffect, useCallback, useRef } from 'react';
import { usePipeline } from '../../../hooks/usePipeline';
import { useAppState } from '../../../state/appState';
import ApprovalGate from '../../pipeline/ApprovalGate';
import * as migrationService from '../../../services/migrationService';
import { getSupabaseClient } from '../../../services/supabaseClient';
import BusinessInfoForm from '../../BusinessInfoForm';
import { BusinessInfo } from '../../../types';

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
    gray: 'text-gray-300',
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${colorMap[color]}`}>{value}</p>
    </div>
  );
}

// ──── Phase Indicator ────

function PhaseIndicator({ currentPhase, phases }: { currentPhase: number; phases: string[] }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {phases.map((phase, i) => (
        <React.Fragment key={phase}>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
            i === currentPhase
              ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
              : i < currentPhase
                ? 'bg-green-600/20 text-green-400 border border-green-700/50'
                : 'bg-gray-800 text-gray-500 border border-gray-700'
          }`}>
            <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold ${
              i === currentPhase
                ? 'bg-blue-600 text-white'
                : i < currentPhase
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-400'
            }`}>
              {i < currentPhase ? '\u2713' : i + 1}
            </span>
            {phase}
          </div>
          {i < phases.length - 1 && (
            <div className={`w-8 h-px ${i < currentPhase ? 'bg-green-600' : 'bg-gray-700'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ──── Types ────

type CrawlPhase = 'input' | 'discovering' | 'crawling' | 'done' | 'error';

interface CrawlResults {
  pagesFound: number;
  urlsCrawled: number;
  totalUrls: number;
  statusMessage: string;
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

  // ──── Crawl state ────
  const [url, setUrl] = useState(pipeline.siteUrl || '');
  const [crawlPhase, setCrawlPhase] = useState<CrawlPhase>('input');
  const [crawlResults, setCrawlResults] = useState<CrawlResults>({
    pagesFound: 0, urlsCrawled: 0, totalUrls: 0, statusMessage: 'Waiting to start...',
  });
  const [crawlError, setCrawlError] = useState('');

  // ──── Business context state ────
  const [contextSaved, setContextSaved] = useState(false);

  // ──── Restore previous state on mount ────
  useEffect(() => {
    const bizInfo = activeMap?.business_info;
    const hasExistingData = bizInfo?.seedKeyword && bizInfo?.industry;

    if (!isGreenfield && stepState?.status !== 'locked' && stepState?.status !== 'available') {
      if (hasExistingData) {
        setContextSaved(true);
      }
      if (stepState?.status === 'completed' || stepState?.status === 'pending_approval') {
        setCrawlPhase('done');
        const pageCount = (bizInfo as any)?.pagesFound ?? 0;
        if (pageCount > 0) {
          setCrawlResults({
            pagesFound: pageCount, urlsCrawled: pageCount, totalUrls: pageCount,
            statusMessage: `Previously crawled: ${pageCount} pages found.`,
          });
        }
      }
    }
  }, [activeMap?.id]);

  // ──── Crawl handler ────
  const handleStartCrawl = useCallback(async () => {
    if (!url.trim() || !state.activeProjectId) return;

    setCrawlPhase('discovering');
    setCrawlError('');
    setCrawlResults(r => ({ ...r, statusMessage: 'Discovering sitemap...' }));

    try {
      let sitemapUrl = url.trim();
      if (!sitemapUrl.endsWith('/sitemap.xml') && !sitemapUrl.includes('sitemap')) {
        sitemapUrl = sitemapUrl.replace(/\/+$/, '') + '/sitemap.xml';
      }

      const proxyConfig = {
        supabaseUrl: state.businessInfo.supabaseUrl,
        supabaseAnonKey: state.businessInfo.supabaseAnonKey,
      };

      const discoveredUrls = await migrationService.fetchAndParseSitemap(
        sitemapUrl,
        (msg) => setCrawlResults(r => ({ ...r, statusMessage: msg })),
        proxyConfig,
      );

      if (discoveredUrls.length === 0) {
        setCrawlError('No URLs found in sitemap. Check that your sitemap.xml is accessible.');
        setCrawlPhase('error');
        return;
      }

      setCrawlResults(r => ({
        ...r, pagesFound: discoveredUrls.length, totalUrls: discoveredUrls.length,
        statusMessage: `Found ${discoveredUrls.length} pages. Saving to inventory...`,
      }));

      setCrawlPhase('crawling');
      await migrationService.initializeInventory(
        state.activeProjectId, discoveredUrls,
        state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey,
        (current, total) => {
          setCrawlResults(r => ({
            ...r, urlsCrawled: current,
            statusMessage: `Saving pages... ${current}/${total}`,
          }));
        },
      );

      const finalResults: CrawlResults = {
        pagesFound: discoveredUrls.length, urlsCrawled: discoveredUrls.length,
        totalUrls: discoveredUrls.length,
        statusMessage: `Discovery complete. ${discoveredUrls.length} pages found.`,
      };
      setCrawlResults(finalResults);
      setCrawlPhase('done');
      setStepStatus('crawl', 'in_progress');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Crawl failed';
      setCrawlError(msg);
      setCrawlPhase('error');
    }
  }, [url, state.activeProjectId, state.businessInfo, setStepStatus]);

  // ──── Save business context (shared by both modes) ────
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
        pagesFound: crawlResults.pagesFound,
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
      setStepStatus('crawl', 'pending_approval');
    }
  }, [url, state, activeMap, crawlResults.pagesFound, dispatch, setStepStatus, advanceStep, isGreenfield]);

  // ──── Derived state ────
  const crawlDone = crawlPhase === 'done' && crawlResults.pagesFound > 0;
  const existingBizInfo = activeMap?.business_info;
  const progressPercent = crawlResults.totalUrls > 0
    ? Math.round((crawlResults.urlsCrawled / crawlResults.totalUrls) * 100)
    : 0;

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
            : 'Crawl your website — AI will analyze and extract business context automatically'}
        </p>
      </div>

      {/* ──── Greenfield Mode ──── */}
      {isGreenfield ? (
        <>
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
        </>
      ) : (
        <>
          {/* Phase indicator */}
          <PhaseIndicator
            currentPhase={contextSaved ? 2 : crawlDone ? 1 : 0}
            phases={['Crawl Site', 'Business Context', 'Approval']}
          />

          {/* ──── Section 1: Crawl ──── */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-200 mb-4">
              {crawlDone ? 'Crawl Results' : 'Website URL'}
            </h3>

            <div className="flex gap-3 mb-4">
              <input type="text" value={url} onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                disabled={crawlPhase === 'discovering' || crawlPhase === 'crawling'}
                className="flex-1 bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50" />
              <button type="button" onClick={handleStartCrawl}
                disabled={!url.trim() || crawlPhase === 'discovering' || crawlPhase === 'crawling'}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap">
                {crawlPhase === 'discovering' || crawlPhase === 'crawling'
                  ? 'Crawling...'
                  : crawlDone ? 'Re-Crawl' : 'Start Crawl'}
              </button>
            </div>

            {(crawlResults.pagesFound > 0 || crawlPhase !== 'input') && (
              <>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <MetricCard label="Pages Found" value={crawlResults.pagesFound} color={crawlResults.pagesFound > 0 ? 'green' : 'gray'} />
                  <MetricCard label="Saved" value={crawlResults.urlsCrawled} color={crawlResults.urlsCrawled > 0 ? 'blue' : 'gray'} />
                  <MetricCard label="Total" value={crawlResults.totalUrls} />
                </div>
                <div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${crawlDone ? 'bg-green-500' : 'bg-blue-600'}`}
                      style={{ width: `${crawlDone ? 100 : progressPercent}%` }}
                    />
                  </div>
                  <p className={`text-xs mt-1 ${crawlDone ? 'text-green-400' : 'text-gray-500'}`}>
                    {crawlResults.statusMessage}
                  </p>
                </div>
              </>
            )}

            {crawlError && (
              <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 mt-4">
                <p className="text-sm text-red-300">{crawlError}</p>
                <button type="button"
                  onClick={() => { setCrawlPhase('input'); setCrawlError(''); }}
                  className="mt-2 text-xs text-red-400 hover:text-red-300 underline">
                  Try again
                </button>
              </div>
            )}
          </div>

          {/* ──── Section 2: Business Context via reusable BusinessInfoForm ──── */}
          {crawlDone && !contextSaved && (
            <BusinessInfoForm
              onSave={handleSaveBusinessContext}
              onBack={() => {}}
              isLoading={false}
              title="Review Business Context"
              description="AI analyzed your site. Review and adjust the details below."
              submitLabel="Confirm & Continue"
              showBackButton={false}
              embedded={true}
              autoResearchUrl={url.trim()}
            />
          )}

          {/* ──── Context saved confirmation ──── */}
          {contextSaved && (
            <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4 flex items-center gap-3">
              <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="text-sm text-green-300 font-medium">Business context saved</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {existingBizInfo?.seedKeyword && `Topic: ${existingBizInfo.seedKeyword}`}
                  {existingBizInfo?.industry && ` | Industry: ${existingBizInfo.industry}`}
                  {existingBizInfo?.language && ` | Language: ${existingBizInfo.language}`}
                </p>
              </div>
            </div>
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
              onRevise={() => reviseStep('crawl')}
              onToggleAutoApprove={toggleAutoApprove}
              summaryMetrics={[
                { label: 'Pages Found', value: crawlResults.pagesFound, color: crawlResults.pagesFound > 0 ? 'green' : 'gray' },
                { label: 'Business Info', value: contextSaved ? 'Complete' : 'Missing', color: contextSaved ? 'green' : 'red' },
              ]}
            />
          )}
        </>
      )}
    </div>
  );
};

export default PipelineCrawlStep;
