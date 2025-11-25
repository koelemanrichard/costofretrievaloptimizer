// components/site-analysis/SiteAnalysisTool.tsx
// Main component for the Site Analysis feature

import React, { useState } from 'react';
import { useAppState } from '../../state/appState';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import { SiteAnalysisProject } from '../../types';
import {
  createProject,
  initFromUrl,
  initFromSitemap,
  initFromGscCsv,
  crawlProject,
  auditProject,
  getProjectSummary,
  exportAuditResults,
} from '../../services/siteAnalysisService';
import { ProjectSetup } from './ProjectSetup';
import { CrawlProgress } from './CrawlProgress';
import { AuditDashboard } from './AuditDashboard';
import { PageAuditDetail } from './PageAuditDetail';

type ViewMode = 'setup' | 'crawling' | 'results' | 'detail';

interface SiteAnalysisToolProps {
  onClose?: () => void;
}

export const SiteAnalysisTool: React.FC<SiteAnalysisToolProps> = ({ onClose }) => {
  const { state, dispatch } = useAppState();
  const [viewMode, setViewMode] = useState<ViewMode>('setup');
  const [project, setProject] = useState<SiteAnalysisProject | null>(null);
  const [selectedPageUrl, setSelectedPageUrl] = useState<string | null>(null);
  const [crawlProgress, setCrawlProgress] = useState({ crawled: 0, total: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get API keys from state
  const jinaApiKey = state.businessInfo?.jinaApiKey || '';

  const handleStartProject = async (
    name: string,
    inputMethod: 'url' | 'sitemap' | 'gsc',
    inputData: string
  ) => {
    setError(null);
    setIsProcessing(true);

    try {
      // Create base project
      let newProject = createProject(name, '', inputMethod);

      // Initialize based on input method
      switch (inputMethod) {
        case 'url':
          newProject = await initFromUrl(newProject, inputData, dispatch);
          break;
        case 'sitemap':
          newProject = await initFromSitemap(newProject, inputData, dispatch);
          break;
        case 'gsc':
          newProject = await initFromGscCsv(newProject, inputData, dispatch);
          break;
      }

      setProject(newProject);

      // Check if we have API key for crawling
      if (!jinaApiKey) {
        setError('Jina.ai API key is required for content extraction. Please configure it in Settings.');
        setViewMode('setup');
        return;
      }

      // Start crawling
      setViewMode('crawling');
      setCrawlProgress({ crawled: 0, total: newProject.pages.length });

      const crawledProject = await crawlProject(
        newProject,
        jinaApiKey,
        dispatch,
        (crawled, total) => setCrawlProgress({ crawled, total })
      );

      // Run audits
      const auditedProject = auditProject(crawledProject, dispatch);
      setProject(auditedProject);
      setViewMode('results');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setViewMode('setup');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewPageDetail = (url: string) => {
    setSelectedPageUrl(url);
    setViewMode('detail');
  };

  const handleBackToResults = () => {
    setSelectedPageUrl(null);
    setViewMode('results');
  };

  const handleExport = () => {
    if (!project) return;

    const jsonData = exportAuditResults(project);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `site-audit-${project.domain}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setProject(null);
    setViewMode('setup');
    setError(null);
    setCrawlProgress({ crawled: 0, total: 0 });
    setSelectedPageUrl(null);
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Site Analysis</h1>
            <p className="text-gray-400 mt-1">
              Audit your pages against Koray's Holistic SEO Framework
            </p>
          </div>
          <div className="flex items-center gap-4">
            {project && viewMode === 'results' && (
              <>
                <Button onClick={handleExport} variant="secondary">
                  Export Results
                </Button>
                <Button onClick={handleReset} variant="secondary">
                  New Analysis
                </Button>
              </>
            )}
            {onClose && (
              <Button onClick={onClose} variant="secondary">
                Close
              </Button>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="mb-6 p-4 border-red-500/50 bg-red-900/20">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-200">{error}</span>
              <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </Card>
        )}

        {/* Main Content */}
        {viewMode === 'setup' && (
          <ProjectSetup
            onStartProject={handleStartProject}
            isProcessing={isProcessing}
          />
        )}

        {viewMode === 'crawling' && (
          <CrawlProgress
            project={project}
            crawled={crawlProgress.crawled}
            total={crawlProgress.total}
          />
        )}

        {viewMode === 'results' && project && (
          <AuditDashboard
            project={project}
            onViewPageDetail={handleViewPageDetail}
          />
        )}

        {viewMode === 'detail' && project && selectedPageUrl && (
          <PageAuditDetail
            page={project.pages.find(p => p.url === selectedPageUrl)!}
            onBack={handleBackToResults}
          />
        )}
      </div>
    </div>
  );
};

export default SiteAnalysisTool;
