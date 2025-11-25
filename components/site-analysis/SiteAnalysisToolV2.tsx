// components/site-analysis/SiteAnalysisToolV2.tsx
// V2 Site Analysis Tool with pillar discovery, Supabase persistence, and dual extraction

import React, { useState, useEffect, useMemo } from 'react';
import { useAppState } from '../../state/appState';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import { getSupabaseClient } from '../../services/supabaseClient';
import {
  SiteAnalysisProject,
  SiteAnalysisStatus,
  DiscoveredPillars,
  BusinessInfo,
} from '../../types';
import {
  createProjectV2,
  deleteProjectV2,
  loadProject,
  initFromUrlV2,
  initFromSitemapV2,
  initFromSinglePageV2,
  initFromGscV2,
  extractProjectContent,
  copyPillarsFromLinkedMap,
  validateProjectPillars,
  buildProjectGraphV2,
  auditProjectV2,
  updateProjectStatus,
  updateProjectPillars,
} from '../../services/siteAnalysisServiceV2';
import { ExtractionProgress } from '../../services/pageExtractionService';
import * as aiService from '../../services/aiService';
import { CandidateEntity, SourceContextOption } from '../../types';
import { ProjectSetupV2 } from './ProjectSetupV2';
import { CrawlProgressV2 } from './CrawlProgressV2';
import { PillarValidation } from './PillarValidation';
import { AuditDashboardV2 } from './AuditDashboardV2';
import { PageAuditDetailV2 } from './PageAuditDetailV2';

// View modes following the workflow
type ViewMode =
  | 'project_list'    // List existing projects
  | 'setup'           // Create new project
  | 'extracting'      // Crawling/extracting content
  | 'pillars'         // Pillar discovery/validation
  | 'analyzing'       // Running audits
  | 'results'         // Dashboard view
  | 'page_detail';    // Single page detail

interface SiteAnalysisToolV2Props {
  onClose?: () => void;
}

export const SiteAnalysisToolV2: React.FC<SiteAnalysisToolV2Props> = ({ onClose }) => {
  const { state, dispatch } = useAppState();

  // Use global state for persistence across tab navigation
  const viewMode = state.siteAnalysis.viewMode;
  const currentProject = state.siteAnalysis.currentProject;
  const selectedPageId = state.siteAnalysis.selectedPageId;
  const discoveredPillars = state.siteAnalysis.discoveredPillars;

  // Helper functions to update global state
  const setViewMode = (mode: ViewMode) => dispatch({ type: 'SET_SITE_ANALYSIS_VIEW_MODE', payload: mode });
  const setCurrentProject = (project: SiteAnalysisProject | null) => dispatch({ type: 'SET_SITE_ANALYSIS_PROJECT', payload: project });
  const setSelectedPageId = (pageId: string | null) => dispatch({ type: 'SET_SITE_ANALYSIS_SELECTED_PAGE', payload: pageId });
  const setDiscoveredPillars = (pillars: DiscoveredPillars | null) => dispatch({ type: 'SET_SITE_ANALYSIS_PILLARS', payload: pillars });

  // Local state that doesn't need persistence
  const [projects, setProjects] = useState<SiteAnalysisProject[]>([]);

  // Progress state (local - resets on navigation which is fine)
  const [extractionProgress, setExtractionProgress] = useState<ExtractionProgress | null>(null);

  // Pillar wizard state - for multi-step candidate selection
  const [entityCandidates, setEntityCandidates] = useState<CandidateEntity[]>([]);
  const [contextOptions, setContextOptions] = useState<SourceContextOption[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get Supabase client and API keys from state
  const supabase = useMemo(() => {
    if (state.businessInfo?.supabaseUrl && state.businessInfo?.supabaseAnonKey) {
      return getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
    }
    return null;
  }, [state.businessInfo?.supabaseUrl, state.businessInfo?.supabaseAnonKey]);

  const userId = state.user?.id;
  const apifyToken = state.businessInfo?.apifyToken || '';
  const jinaApiKey = state.businessInfo?.jinaApiKey || '';
  const neo4jConfig = {
    uri: state.businessInfo?.neo4jUri || '',
    user: state.businessInfo?.neo4jUser || '',
    password: state.businessInfo?.neo4jPassword || '',
  };

  // Proxy config for CORS-safe external fetches (sitemap discovery, etc.)
  const proxyConfig = useMemo(() => {
    if (state.businessInfo?.supabaseUrl && state.businessInfo?.supabaseAnonKey) {
      return {
        supabaseUrl: state.businessInfo.supabaseUrl,
        supabaseAnonKey: state.businessInfo.supabaseAnonKey,
      };
    }
    return undefined;
  }, [state.businessInfo?.supabaseUrl, state.businessInfo?.supabaseAnonKey]);

  // Get topical maps for linking (from state)
  const topicalMaps = state.topicalMaps || [];

  /**
   * Create a BusinessInfo context specific to the SITE BEING ANALYZED
   * This is critical - we must NOT use the user's global business info (their own company)
   * Instead, we build context from the crawled pages of the analyzed site
   */
  const buildSiteAnalysisContext = (project: SiteAnalysisProject): BusinessInfo => {
    // Extract information from crawled pages
    const pages = project.pages || [];
    const crawledPages = pages.filter(p => p.crawlStatus === 'crawled');

    // Gather titles, headings, and meta descriptions from crawled content
    const allTitles = crawledPages.map(p => p.title).filter(Boolean);
    const allH1s = crawledPages.map(p => p.h1).filter(Boolean);
    const allDescriptions = crawledPages.map(p => p.metaDescription).filter(Boolean);
    const allHeadings = crawledPages.flatMap(p => p.headings || []).slice(0, 50);

    // Build a content summary for the AI to understand the site
    const contentSummary = [
      `Page titles: ${allTitles.slice(0, 10).join(', ')}`,
      `Main headings (H1): ${allH1s.slice(0, 10).join(', ')}`,
      `Topics from headings: ${allHeadings.slice(0, 20).join(', ')}`,
      `Descriptions: ${allDescriptions.slice(0, 5).join(' | ')}`,
    ].join('\n');

    // Create a BusinessInfo that represents the ANALYZED SITE, not the user's company
    return {
      // Use API keys from global settings (needed to make AI calls)
      ...state.businessInfo,

      // Override with analyzed site information
      domain: project.domain,
      seedKeyword: project.name || project.domain,
      industry: '', // Let AI infer from content
      model: '', // Let AI infer
      audience: '', // Let AI infer
      valueProp: contentSummary, // Use crawled content as context
      expertise: '',
      targetMarket: '',
      language: 'en',

      // Clear author info - this is site analysis, not user's content
      authorName: '',
      authorBio: '',
      authorCredentials: '',
      uniqueDataAssets: `Content from ${crawledPages.length} crawled pages on ${project.domain}`,
    };
  };

  // Load existing projects on mount
  useEffect(() => {
    if (supabase && userId) {
      loadExistingProjects();
    }
  }, [supabase, userId]);

  const loadExistingProjects = async () => {
    if (!supabase || !userId) return;

    setIsLoading(true);
    try {
      // Cast to any for tables not in generated Supabase types
      const { data, error } = await (supabase as any)
        .from('site_analysis_projects')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setProjects(data?.map(mapDbProjectToModel) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  // Resume a project based on its status
  const resumeProject = async (project: SiteAnalysisProject) => {
    if (!supabase) return;

    setIsLoading(true);
    setError(null);

    try {
      const fullProject = await loadProject(supabase, project.id);
      setCurrentProject(fullProject);

      // Determine view based on project status
      switch (fullProject.status) {
        case 'created':
        case 'crawling':
          setViewMode('extracting');
          await startExtraction(fullProject);
          break;
        case 'extracting':
          setViewMode('extracting');
          await startExtraction(fullProject);
          break;
        case 'discovering_pillars':
          setViewMode('pillars');
          await runPillarDiscovery(fullProject);
          break;
        case 'awaiting_validation':
          setViewMode('pillars');
          break;
        case 'building_graph':
        case 'analyzing':
          setViewMode('analyzing');
          await runAnalysis(fullProject);
          break;
        case 'completed':
          setViewMode('results');
          break;
        case 'error':
          setError(fullProject.errorMessage || 'Project has an error');
          setViewMode('results');
          break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setIsLoading(false);
    }
  };

  // Create new project
  const handleCreateProject = async (
    name: string,
    domain: string,
    inputMethod: 'url' | 'sitemap' | 'gsc' | 'single_page',
    inputData: string,
    linkedMapId?: string
  ) => {
    if (!supabase || !userId) {
      setError('Not authenticated');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      // Create project in database
      let project = await createProjectV2(
        supabase,
        userId,
        name,
        domain,
        inputMethod,
        linkedMapId
      );

      // Initialize based on input method (pass proxyConfig to avoid CORS issues)
      switch (inputMethod) {
        case 'single_page':
          project = await initFromSinglePageV2(supabase, project, inputData, dispatch);
          break;
        case 'url':
          project = await initFromUrlV2(supabase, project, inputData, dispatch, proxyConfig);
          break;
        case 'sitemap':
          project = await initFromSitemapV2(supabase, project, inputData, dispatch, { proxyConfig });
          break;
        case 'gsc':
          project = await initFromGscV2(supabase, project, inputData, dispatch);
          break;
      }

      setCurrentProject(project);
      setViewMode('extracting');

      // Start extraction
      await startExtraction(project);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
      setViewMode('setup');
    } finally {
      setIsLoading(false);
    }
  };

  // Start content extraction
  const startExtraction = async (project: SiteAnalysisProject) => {
    if (!supabase) return;

    // Check for API keys
    if (!apifyToken && !jinaApiKey) {
      setError('At least one API key (Apify or Jina) is required for extraction');
      return;
    }

    setIsLoading(true);

    try {
      const updatedProject = await extractProjectContent(
        supabase,
        project,
        {
          apifyToken,
          jinaApiKey,
          useApify: !!apifyToken,
          useJina: !!jinaApiKey,
          proxyConfig, // Pass proxy config for CORS-safe Jina requests
        },
        dispatch,
        (progress) => setExtractionProgress(progress)
      );

      setCurrentProject(updatedProject);
      setExtractionProgress(null);

      // Move to pillar discovery
      if (updatedProject.linkedMapId) {
        // Copy pillars from linked topical map
        await copyPillarsFromLinkedMap(supabase, updatedProject.id, updatedProject.linkedMapId, dispatch);
        const refreshedProject = await loadProject(supabase, updatedProject.id);
        setCurrentProject(refreshedProject);
        setViewMode('pillars');
      } else {
        // Run AI pillar discovery
        setViewMode('pillars');
        await runPillarDiscovery(updatedProject);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extraction failed');
      if (supabase && project.id) {
        await updateProjectStatus(supabase, project.id, 'error', err instanceof Error ? err.message : 'Extraction failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Run pillar discovery - fetches CE candidates from AI
  const runPillarDiscovery = async (project: SiteAnalysisProject) => {
    if (!supabase) return;

    setIsLoading(true);
    setEntityCandidates([]);
    setContextOptions([]);

    try {
      await updateProjectStatus(supabase, project.id, 'discovering_pillars');

      dispatch({
        type: 'LOG_EVENT',
        payload: { service: 'SiteAnalysis', message: 'Fetching Central Entity candidates from AI...', status: 'info', timestamp: Date.now() }
      });

      // CRITICAL: Use site-specific context, NOT the user's global business info
      // This ensures AI analyzes the target site (e.g., bloxs.com) not the user's company
      const siteContext = buildSiteAnalysisContext(project);

      dispatch({
        type: 'LOG_EVENT',
        payload: { service: 'SiteAnalysis', message: `Analyzing site: ${project.domain}`, status: 'info', timestamp: Date.now() }
      });

      // Use the real AI service to get entity candidates
      const candidates = await aiService.suggestCentralEntityCandidates(
        siteContext,
        dispatch
      );

      setEntityCandidates(candidates);

      // Create initial discovered pillars structure with candidates
      const initialPillars: DiscoveredPillars = {
        centralEntity: {
          suggested: candidates[0]?.entity || extractDomainEntity(project.domain),
          type: 'Brand/Company',
          confidence: candidates[0]?.score || 0.5,
          evidence: candidates[0]?.reasoning ? [candidates[0].reasoning] : ['AI analysis of business context'],
          alternatives: candidates.slice(1).map(c => ({
            value: c.entity,
            confidence: c.score
          })),
        },
        sourceContext: {
          suggested: '',
          type: 'Industry',
          confidence: 0,
          evidence: [],
          alternatives: [],
        },
        centralSearchIntent: {
          suggested: '',
          confidence: 0,
          evidence: [],
          alternatives: [],
        },
      };

      setDiscoveredPillars(initialPillars);
      await updateProjectStatus(supabase, project.id, 'awaiting_validation');

      dispatch({
        type: 'LOG_EVENT',
        payload: { service: 'SiteAnalysis', message: `Found ${candidates.length} Central Entity candidates`, status: 'success', timestamp: Date.now() }
      });

      const refreshedProject = await loadProject(supabase, project.id);
      setCurrentProject(refreshedProject);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pillar discovery failed');
      if (supabase && project.id) {
        await updateProjectStatus(supabase, project.id, 'error', err instanceof Error ? err.message : 'Pillar discovery failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Source Context options based on selected Central Entity
  const fetchSourceContextOptions = async (centralEntity: string) => {
    if (!currentProject) {
      setError('No project selected');
      return [];
    }

    setIsLoading(true);
    try {
      dispatch({
        type: 'LOG_EVENT',
        payload: { service: 'SiteAnalysis', message: `Fetching Source Context options for "${centralEntity}"...`, status: 'info', timestamp: Date.now() }
      });

      // CRITICAL: Use site-specific context, NOT the user's global business info
      const siteContext = buildSiteAnalysisContext(currentProject);

      const options = await aiService.suggestSourceContextOptions(
        siteContext,
        centralEntity,
        dispatch
      );

      setContextOptions(options);

      dispatch({
        type: 'LOG_EVENT',
        payload: { service: 'SiteAnalysis', message: `Found ${options.length} Source Context options`, status: 'success', timestamp: Date.now() }
      });

      return options;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch context options');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Generate Central Search Intent based on CE and SC
  const generateSearchIntent = async (centralEntity: string, sourceContext: string) => {
    if (!currentProject) {
      setError('No project selected');
      return `Find information about ${centralEntity}`;
    }

    setIsLoading(true);
    try {
      dispatch({
        type: 'LOG_EVENT',
        payload: { service: 'SiteAnalysis', message: 'Generating Central Search Intent...', status: 'info', timestamp: Date.now() }
      });

      // CRITICAL: Use site-specific context, NOT the user's global business info
      const siteContext = buildSiteAnalysisContext(currentProject);

      const result = await aiService.suggestCentralSearchIntent(
        siteContext,
        centralEntity,
        sourceContext,
        dispatch
      );

      dispatch({
        type: 'LOG_EVENT',
        payload: { service: 'SiteAnalysis', message: 'Central Search Intent generated', status: 'success', timestamp: Date.now() }
      });

      return result.intent;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate search intent');
      return `Find information about ${centralEntity}`;
    } finally {
      setIsLoading(false);
    }
  };

  // Handle pillar validation
  const handleValidatePillars = async (
    pillars: {
      centralEntity: string;
      centralEntityType?: string;
      sourceContext: string;
      sourceContextType?: string;
      centralSearchIntent: string;
    }
  ) => {
    if (!supabase || !currentProject) return;

    setIsLoading(true);

    try {
      // Update pillars if modified
      await updateProjectPillars(supabase, currentProject.id, pillars, 'manual');

      // Mark as validated
      await validateProjectPillars(supabase, currentProject.id);

      const refreshedProject = await loadProject(supabase, currentProject.id);
      setCurrentProject(refreshedProject);

      // Move to analysis
      setViewMode('analyzing');
      await runAnalysis(refreshedProject);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Run analysis (graph building + audits)
  const runAnalysis = async (project: SiteAnalysisProject) => {
    if (!supabase) return;

    setIsLoading(true);

    try {
      // Build graph if Neo4j is configured
      if (neo4jConfig.uri && neo4jConfig.user && neo4jConfig.password) {
        await buildProjectGraphV2(project, neo4jConfig, dispatch);
      }

      // Run audits
      const auditedProject = await auditProjectV2(supabase, project, dispatch);
      setCurrentProject(auditedProject);
      setViewMode('results');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsLoading(false);
    }
  };

  // View page detail
  const handleViewPageDetail = (pageId: string) => {
    setSelectedPageId(pageId);
    setViewMode('page_detail');
  };

  // Back to results
  const handleBackToResults = () => {
    setSelectedPageId(null);
    setViewMode('results');
  };

  // Reset to project list
  const handleReset = () => {
    dispatch({ type: 'RESET_SITE_ANALYSIS' });
    setExtractionProgress(null);
    setError(null);
    loadExistingProjects();
  };

  // Delete project with cascade (removes all related pages, audits, tasks, etc.)
  const handleDeleteProject = async (projectId: string) => {
    if (!supabase) return;

    if (!confirm('Are you sure you want to delete this project and all its data (pages, audits, tasks)? This cannot be undone.')) {
      return;
    }

    try {
      await deleteProjectV2(supabase, projectId);
      dispatch({
        type: 'LOG_EVENT',
        payload: { service: 'SiteAnalysis', message: 'Project and all related data deleted', status: 'success', timestamp: Date.now() }
      });
      await loadExistingProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
    }
  };

  // Render status badge
  const renderStatusBadge = (status: SiteAnalysisStatus) => {
    const statusColors: Record<SiteAnalysisStatus, string> = {
      created: 'bg-gray-500',
      crawling: 'bg-blue-500',
      extracting: 'bg-blue-500',
      discovering_pillars: 'bg-purple-500',
      awaiting_validation: 'bg-yellow-500',
      building_graph: 'bg-indigo-500',
      analyzing: 'bg-cyan-500',
      completed: 'bg-green-500',
      error: 'bg-red-500',
    };

    const statusLabels: Record<SiteAnalysisStatus, string> = {
      created: 'Created',
      crawling: 'Crawling',
      extracting: 'Extracting',
      discovering_pillars: 'Discovering Pillars',
      awaiting_validation: 'Awaiting Validation',
      building_graph: 'Building Graph',
      analyzing: 'Analyzing',
      completed: 'Completed',
      error: 'Error',
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full text-white ${statusColors[status]}`}>
        {statusLabels[status]}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Site Analysis V2</h1>
            <p className="text-gray-400 mt-1">
              Holistic SEO audit with semantic pillar alignment
            </p>
          </div>
          <div className="flex items-center gap-4">
            {currentProject && viewMode !== 'project_list' && (
              <Button onClick={handleReset} variant="secondary">
                All Projects
              </Button>
            )}
            {viewMode === 'project_list' && (
              <Button onClick={() => setViewMode('setup')} variant="primary">
                New Analysis
              </Button>
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
              <svg className="w-6 h-6 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-200 flex-1">{error}</span>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </Card>
        )}

        {/* Loading Overlay */}
        {isLoading && viewMode !== 'extracting' && (
          <div className="flex items-center justify-center py-12">
            <Loader />
            <span className="ml-3 text-gray-400">Processing...</span>
          </div>
        )}

        {/* Project List View */}
        {viewMode === 'project_list' && !isLoading && (
          <div className="space-y-4">
            {projects.length === 0 ? (
              <Card className="p-8 text-center">
                <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="text-xl font-semibold text-white mb-2">No Analysis Projects Yet</h3>
                <p className="text-gray-400 mb-6">Start by creating a new site analysis to audit your pages.</p>
                <Button onClick={() => setViewMode('setup')} variant="primary">
                  Create First Analysis
                </Button>
              </Card>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-white">Your Projects</h2>
                {projects.map(project => (
                  <Card key={project.id} className="p-4 hover:border-purple-500/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-white">{project.name}</h3>
                          {renderStatusBadge(project.status)}
                        </div>
                        <p className="text-gray-400 text-sm mt-1">{project.domain}</p>
                        <p className="text-gray-500 text-xs mt-1">
                          Updated: {new Date(project.updatedAt).toLocaleDateString()}
                          {project.pageCount && ` • ${project.pageCount} pages`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => resumeProject(project)}
                          variant="secondary"
                        >
                          {project.status === 'completed' ? 'View' : 'Resume'}
                        </Button>
                        <button
                          onClick={() => handleDeleteProject(project.id)}
                          className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </>
            )}
          </div>
        )}

        {/* Setup View */}
        {viewMode === 'setup' && (
          <ProjectSetupV2
            onStartProject={handleCreateProject}
            onCancel={() => setViewMode('project_list')}
            isProcessing={isLoading}
            existingTopicalMaps={topicalMaps}
          />
        )}

        {/* Extraction View */}
        {viewMode === 'extracting' && currentProject && (
          <CrawlProgressV2
            project={currentProject}
            progress={extractionProgress}
          />
        )}

        {/* Pillar Validation View */}
        {viewMode === 'pillars' && currentProject && (
          <PillarValidation
            project={currentProject}
            discoveredPillars={discoveredPillars}
            entityCandidates={entityCandidates}
            contextOptions={contextOptions}
            onFetchContextOptions={fetchSourceContextOptions}
            onGenerateSearchIntent={generateSearchIntent}
            onValidate={handleValidatePillars}
            onSkip={() => {
              // Skip validation and proceed with defaults
              handleValidatePillars({
                centralEntity: currentProject.centralEntity || currentProject.domain,
                sourceContext: currentProject.sourceContext || '',
                centralSearchIntent: currentProject.centralSearchIntent || '',
              });
            }}
            isProcessing={isLoading}
          />
        )}

        {/* Analyzing View */}
        {viewMode === 'analyzing' && (
          <Card className="p-8 text-center">
            <Loader />
            <h3 className="text-xl font-semibold text-white mt-4">Analyzing Pages</h3>
            <p className="text-gray-400 mt-2">Building link graph and running audits...</p>
          </Card>
        )}

        {/* Results Dashboard */}
        {viewMode === 'results' && currentProject && (
          <AuditDashboardV2
            project={currentProject}
            onViewPageDetail={handleViewPageDetail}
            onReaudit={async () => {
              setViewMode('analyzing');
              await runAnalysis(currentProject);
            }}
          />
        )}

        {/* Page Detail View */}
        {viewMode === 'page_detail' && currentProject && selectedPageId && (
          <PageAuditDetailV2
            projectId={currentProject.id}
            pageId={selectedPageId}
            onBack={handleBackToResults}
          />
        )}
      </div>
    </div>
  );
};

// Helper functions
const mapDbProjectToModel = (db: any): SiteAnalysisProject => ({
  id: db.id,
  userId: db.user_id,
  name: db.name,
  domain: db.domain,
  status: db.status,
  errorMessage: db.error_message,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
  lastAuditAt: db.last_audit_at,
  inputMethod: db.input_method,
  sitemapUrl: db.sitemap_url,
  linkedMapId: db.linked_project_id,
  centralEntity: db.central_entity,
  centralEntityType: db.central_entity_type,
  sourceContext: db.source_context,
  sourceContextType: db.source_context_type,
  centralSearchIntent: db.central_search_intent,
  pillarsValidated: db.pillars_validated,
  pillarsValidatedAt: db.pillars_validated_at,
  pillarsSource: db.pillars_source,
  pageCount: db.page_count,
});

const extractDomainEntity = (domain: string): string => {
  // Extract main entity from domain name
  const parts = domain.split('.');
  if (parts.length >= 2) {
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  }
  return domain;
};

export default SiteAnalysisToolV2;
