import React, { useState, useEffect } from 'react';
import { usePipeline } from '../../../hooks/usePipeline';
import { useAppState } from '../../../state/appState';
import ApprovalGate from '../../pipeline/ApprovalGate';
import * as migrationService from '../../../services/migrationService';
import { getSupabaseClient } from '../../../services/supabaseClient';

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

function PhaseIndicator({ currentPhase }: { currentPhase: number }) {
  const phases = ['URL Input', 'Crawl', 'Results'];
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

// ──── Greenfield Mode ────

function GreenfieldForm({ onSubmit }: { onSubmit: (data: {
  seedKeyword: string;
  businessType: string;
  language: string;
  description: string;
  domainUrl: string;
}) => void }) {
  const [seedKeyword, setSeedKeyword] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [language, setLanguage] = useState('en');
  const [description, setDescription] = useState('');
  const [domainUrl, setDomainUrl] = useState('');

  const canSubmit = seedKeyword.trim() && businessType && description.trim();

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-5">
        {/* Seed Keyword */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Seed Keyword <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={seedKeyword}
            onChange={(e) => setSeedKeyword(e.target.value)}
            placeholder="e.g., electric bikes"
            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Business Type / Industry */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Business Type / Industry <span className="text-red-400">*</span>
          </label>
          <select
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select industry...</option>
            <option value="ecommerce">E-commerce</option>
            <option value="saas">SaaS</option>
            <option value="b2b">B2B Services</option>
            <option value="blog">Blog / Publisher</option>
            <option value="local">Local Business</option>
            <option value="education">Education</option>
            <option value="healthcare">Healthcare</option>
            <option value="finance">Finance</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Language */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Language <span className="text-red-400">*</span>
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="en">English</option>
            <option value="nl">Dutch</option>
            <option value="de">German</option>
            <option value="fr">French</option>
            <option value="es">Spanish</option>
          </select>
        </div>

        {/* Business Description */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Business Description <span className="text-red-400">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your business in 2-3 sentences..."
            rows={3}
            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
          />
        </div>

        {/* Domain URL (optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Domain URL <span className="text-gray-500 text-xs">(optional)</span>
          </label>
          <input
            type="text"
            value={domainUrl}
            onChange={(e) => setDomainUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => canSubmit && onSubmit({ seedKeyword, businessType, language, description, domainUrl })}
          disabled={!canSubmit}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-md font-medium transition-colors"
        >
          Save & Continue
        </button>
      </div>
    </div>
  );
}

// ──── Existing Site Mode ────

type CrawlPhase = 'input' | 'discovering' | 'crawling' | 'done' | 'error';

interface CrawlResults {
  pagesFound: number;
  urlsCrawled: number;
  totalUrls: number;
  statusMessage: string;
}

function ExistingSiteForm({
  initialUrl,
  onCrawlComplete,
}: {
  initialUrl: string;
  onCrawlComplete: (results: CrawlResults) => void;
}) {
  const { state } = useAppState();
  const { businessInfo, activeProjectId } = state;
  const [url, setUrl] = useState(initialUrl || '');
  const [phase, setPhase] = useState<CrawlPhase>('input');
  const [results, setResults] = useState<CrawlResults>({
    pagesFound: 0,
    urlsCrawled: 0,
    totalUrls: 0,
    statusMessage: 'Waiting to start...',
  });
  const [errorMsg, setErrorMsg] = useState('');

  // Pre-populate URL from pipeline state
  useEffect(() => {
    if (initialUrl && !url) setUrl(initialUrl);
  }, [initialUrl]);

  const phaseIndex = phase === 'input' ? 0 : phase === 'discovering' ? 1 : phase === 'crawling' ? 1 : 2;

  const handleStartCrawl = async () => {
    if (!url.trim() || !activeProjectId) return;

    setPhase('discovering');
    setErrorMsg('');
    setResults(r => ({ ...r, statusMessage: 'Discovering sitemap...' }));

    try {
      // Step 1: Parse sitemap to discover URLs
      let sitemapUrl = url.trim();
      if (!sitemapUrl.endsWith('/sitemap.xml') && !sitemapUrl.includes('sitemap')) {
        sitemapUrl = sitemapUrl.replace(/\/+$/, '') + '/sitemap.xml';
      }

      const proxyConfig = {
        supabaseUrl: businessInfo.supabaseUrl,
        supabaseAnonKey: businessInfo.supabaseAnonKey,
      };

      const discoveredUrls = await migrationService.fetchAndParseSitemap(
        sitemapUrl,
        (msg) => setResults(r => ({ ...r, statusMessage: msg })),
        proxyConfig,
      );

      if (discoveredUrls.length === 0) {
        setErrorMsg('No URLs found in sitemap. Check that your sitemap.xml is accessible.');
        setPhase('error');
        return;
      }

      setResults(r => ({
        ...r,
        pagesFound: discoveredUrls.length,
        totalUrls: discoveredUrls.length,
        statusMessage: `Found ${discoveredUrls.length} pages. Saving to inventory...`,
      }));

      // Step 2: Save URLs to site_inventory
      setPhase('crawling');
      await migrationService.initializeInventory(
        activeProjectId,
        discoveredUrls,
        businessInfo.supabaseUrl,
        businessInfo.supabaseAnonKey,
        (current, total) => {
          setResults(r => ({
            ...r,
            urlsCrawled: current,
            statusMessage: `Saving pages... ${current}/${total}`,
          }));
        },
      );

      const finalResults: CrawlResults = {
        pagesFound: discoveredUrls.length,
        urlsCrawled: discoveredUrls.length,
        totalUrls: discoveredUrls.length,
        statusMessage: `Discovery complete. ${discoveredUrls.length} pages found.`,
      };
      setResults(finalResults);
      setPhase('done');
      onCrawlComplete(finalResults);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Crawl failed';
      setErrorMsg(msg);
      setPhase('error');
    }
  };

  const progressPercent = results.totalUrls > 0
    ? Math.round((results.urlsCrawled / results.totalUrls) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <PhaseIndicator currentPhase={phaseIndex} />

      {/* URL Input */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Website URL
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            disabled={phase === 'discovering' || phase === 'crawling'}
            className="flex-1 bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleStartCrawl}
            disabled={!url.trim() || phase === 'discovering' || phase === 'crawling'}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
          >
            {phase === 'discovering' || phase === 'crawling' ? 'Crawling...' : phase === 'done' ? 'Re-Crawl' : 'Start Crawl'}
          </button>
        </div>
        {phase === 'done' && (
          <p className="text-xs text-green-400 mt-2">Sitemap will be fetched at: {url.replace(/\/+$/, '')}/sitemap.xml</p>
        )}
      </div>

      {/* Crawl Progress */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-sm font-medium text-gray-300 mb-4">Crawl Progress</h3>
        <div className="grid grid-cols-3 gap-4">
          <MetricCard label="Pages Found" value={results.pagesFound} color={results.pagesFound > 0 ? 'green' : 'gray'} />
          <MetricCard label="Saved" value={results.urlsCrawled} color={results.urlsCrawled > 0 ? 'blue' : 'gray'} />
          <MetricCard label="Total" value={results.totalUrls} />
        </div>
        <div className="mt-4">
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${phase === 'done' ? 'bg-green-500' : 'bg-blue-600'}`}
              style={{ width: `${phase === 'done' ? 100 : progressPercent}%` }}
            />
          </div>
          <p className={`text-xs mt-1 ${phase === 'done' ? 'text-green-400' : 'text-gray-500'}`}>
            {results.statusMessage}
          </p>
        </div>
      </div>

      {/* Error */}
      {errorMsg && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
          <p className="text-sm text-red-300">{errorMsg}</p>
          <button
            type="button"
            onClick={() => { setPhase('input'); setErrorMsg(''); }}
            className="mt-2 text-xs text-red-400 hover:text-red-300 underline"
          >
            Try again
          </button>
        </div>
      )}
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
  const [crawlResults, setCrawlResults] = useState<CrawlResults | null>(null);

  const handleGreenfieldSubmit = async (data: {
    seedKeyword: string;
    businessType: string;
    language: string;
    description: string;
    domainUrl: string;
  }) => {
    // Save business info to global state
    const updatedBusinessInfo = {
      ...state.businessInfo,
      seedKeyword: data.seedKeyword,
      industry: data.businessType,
      language: data.language,
      valueProp: data.description,
      domain: data.domainUrl,
    };
    dispatch({ type: 'SET_BUSINESS_INFO', payload: updatedBusinessInfo });

    // Also save to the active map's business_info
    if (state.activeMapId) {
      dispatch({
        type: 'UPDATE_MAP_DATA',
        payload: {
          mapId: state.activeMapId,
          data: {
            business_info: {
              ...activeMap?.business_info,
              seedKeyword: data.seedKeyword,
              industry: data.businessType,
              language: data.language,
              valueProp: data.description,
              domain: data.domainUrl,
            },
          },
        },
      });

      // Persist to Supabase
      try {
        const supabase = getSupabaseClient(
          state.businessInfo.supabaseUrl,
          state.businessInfo.supabaseAnonKey
        );
        await supabase
          .from('topical_maps')
          .update({
            business_info: {
              ...activeMap?.business_info,
              seedKeyword: data.seedKeyword,
              industry: data.businessType,
              language: data.language,
              valueProp: data.description,
              domain: data.domainUrl,
            },
          } as any)
          .eq('id', state.activeMapId);
      } catch {
        // Non-fatal — state is saved in memory
      }
    }

    setStepStatus('crawl', 'completed');
    advanceStep('crawl');
  };

  const handleCrawlComplete = (results: CrawlResults) => {
    setCrawlResults(results);
    setStepStatus('crawl', 'pending_approval');
  };

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
            : 'Crawl and analyze your existing website'}
        </p>
      </div>

      {/* Content */}
      {isGreenfield ? (
        <GreenfieldForm onSubmit={handleGreenfieldSubmit} />
      ) : (
        <ExistingSiteForm
          initialUrl={pipeline.siteUrl || ''}
          onCrawlComplete={handleCrawlComplete}
        />
      )}

      {/* Approval Gate (existing site mode only) */}
      {!isGreenfield && gate && (stepState?.status === 'pending_approval' || stepState?.approval?.status === 'rejected') && (
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
            { label: 'Pages Found', value: crawlResults?.pagesFound ?? 0, color: crawlResults ? 'green' : 'gray' },
            { label: 'Saved to Inventory', value: crawlResults?.urlsCrawled ?? 0, color: crawlResults ? 'blue' : 'gray' },
          ]}
        />
      )}
    </div>
  );
};

export default PipelineCrawlStep;
