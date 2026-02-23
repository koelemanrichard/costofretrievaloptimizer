import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AuthGuard from './AuthGuard';
import ProjectLoader from './ProjectLoader';
import MapLoader from './MapLoader';
import TopicLoader from './TopicLoader';
import AppShell from '../layout/AppShell';
import { SmartLoader } from '../ui/FunLoaders';
import { useAppState } from '../../state/appState';
import type { PipelineStep } from '../../state/slices/pipelineSlice';

// Eagerly loaded (small/critical)
import { AuthScreen } from '../screens';

// Lazy loaded pages - these are the placeholder wrappers
// During Phase 1-2, most of these simply render the existing components
// They'll be replaced with proper page components in later phases

// Phase 2: Auth + Project + Map (wrappers around existing screens)
const ProjectsPage = lazy(() => import('../pages/ProjectsPage'));
const MapSelectionPage = lazy(() => import('../pages/MapSelectionPage'));
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));

// Phase 3: Setup wizard routes
const SetupWizardLayout = lazy(() => import('../pages/setup/SetupWizardLayout'));
const BusinessInfoPage = lazy(() => import('../pages/setup/BusinessInfoPage'));
const PillarsPage = lazy(() => import('../pages/setup/PillarsPage'));
const EavsPage = lazy(() => import('../pages/setup/EavsPage'));
const CompetitorsPage = lazy(() => import('../pages/setup/CompetitorsPage'));
const BlueprintPage = lazy(() => import('../pages/setup/BlueprintPage'));

// Product Catalog
const CatalogPage = lazy(() => import('../pages/setup/CatalogPage'));
const CatalogDashboardPage = lazy(() => import('../pages/map/CatalogDashboardPage'));

// Phase 4: Dashboard decomposition
const AuditPage = lazy(() => import('../pages/map/AuditPage'));
const InsightsPage = lazy(() => import('../pages/map/InsightsPage'));
const GapAnalysisPage = lazy(() => import('../pages/map/GapAnalysisPage'));
const QualityPage = lazy(() => import('../pages/map/QualityPage'));
const PlanningPage = lazy(() => import('../pages/map/PlanningPage'));
const CalendarPage = lazy(() => import('../pages/map/CalendarPage'));
const KPStrategyPage = lazy(() => import('../pages/strategy/KPStrategyPage'));
const EntityAuthorityPage = lazy(() => import('../pages/strategy/EntityAuthorityPage'));
const EntityHealthPage = lazy(() => import('../pages/strategy/EntityHealthPage'));

// Phase 5: Topic-level routes
const TopicDetailPage = lazy(() => import('../pages/topic/TopicDetailPage'));
const BriefPage = lazy(() => import('../pages/topic/BriefPage'));
const DraftPage = lazy(() => import('../pages/topic/DraftPage'));
const StylePage = lazy(() => import('../pages/topic/StylePage'));

// Pipeline routes
const PipelineLayout = lazy(() => import('../pages/pipeline/PipelineLayout'));
const PipelineCrawlStep = lazy(() => import('../pages/pipeline/PipelineCrawlStep'));
const PipelineGapStep = lazy(() => import('../pages/pipeline/PipelineGapStep'));
const PipelineStrategyStep = lazy(() => import('../pages/pipeline/PipelineStrategyStep'));
const PipelineEavsStep = lazy(() => import('../pages/pipeline/PipelineEavsStep'));
const PipelineMapStep = lazy(() => import('../pages/pipeline/PipelineMapStep'));
const PipelineBriefsStep = lazy(() => import('../pages/pipeline/PipelineBriefsStep'));
const PipelineContentStep = lazy(() => import('../pages/pipeline/PipelineContentStep'));
const PipelineAuditStep = lazy(() => import('../pages/pipeline/PipelineAuditStep'));
const PipelineTechSpecStep = lazy(() => import('../pages/pipeline/PipelineTechSpecStep'));
const PipelineExportStep = lazy(() => import('../pages/pipeline/PipelineExportStep'));

// Standalone pages
const AdminPage = lazy(() => import('../pages/AdminPage'));
const QuotationPage = lazy(() => import('../pages/QuotationPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));

const STEP_PATH_MAP: Record<PipelineStep, string> = {
    crawl: 'crawl', gap_analysis: 'gap', strategy: 'strategy', eavs: 'eavs',
    map_planning: 'map', briefs: 'briefs', content: 'content', audit: 'audit',
    tech_spec: 'tech', export: 'export',
};

/** Redirects /pipeline to the current pipeline step instead of always to crawl. */
const PipelineStepRedirect: React.FC = () => {
    const { state } = useAppState();
    const path = STEP_PATH_MAP[state.pipeline.currentStep] || 'crawl';
    return <Navigate to={path} replace />;
};

const PageLoader: React.FC = () => (
    <div className="flex items-center justify-center min-h-[50vh]">
        <SmartLoader context="loading" size="md" />
    </div>
);

/**
 * AppRouter - Defines the complete URL route tree.
 * During migration (Phase 1), this coexists with the AppStep state machine.
 * After Phase 6, AppStep is removed and this is the sole navigation controller.
 */
const AppRouter: React.FC = () => {
    return (
        <Suspense fallback={<PageLoader />}>
            <Routes>
                {/* Public routes */}
                <Route element={<AppShell />}>
                    <Route path="/login" element={<AuthScreen />} />

                    {/* Protected routes */}
                    <Route element={<AuthGuard />}>
                        {/* Root level */}
                        <Route path="/projects" element={<ProjectsPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="/admin" element={<AdminPage />} />
                        <Route path="/tools/quotation" element={<QuotationPage />} />

                        {/* Project level */}
                        <Route path="/p/:projectId" element={<ProjectLoader />}>
                            <Route index element={<MapSelectionPage />} />

                            {/* Map level */}
                            <Route path="m/:mapId" element={<MapLoader />}>
                                <Route index element={<DashboardPage />} />

                                {/* Setup wizard */}
                                <Route path="setup" element={<SetupWizardLayout />}>
                                    <Route index element={<Navigate to="business" replace />} />
                                    <Route path="business" element={<BusinessInfoPage />} />
                                    <Route path="pillars" element={<PillarsPage />} />
                                    <Route path="eavs" element={<EavsPage />} />
                                    <Route path="competitors" element={<CompetitorsPage />} />
                                    <Route path="catalog" element={<CatalogPage />} />
                                    <Route path="blueprint" element={<BlueprintPage />} />
                                </Route>

                                {/* Pipeline */}
                                <Route path="pipeline" element={<PipelineLayout />}>
                                    <Route index element={<PipelineStepRedirect />} />
                                    <Route path="crawl" element={<PipelineCrawlStep />} />
                                    <Route path="gap" element={<PipelineGapStep />} />
                                    <Route path="strategy" element={<PipelineStrategyStep />} />
                                    <Route path="eavs" element={<PipelineEavsStep />} />
                                    <Route path="map" element={<PipelineMapStep />} />
                                    <Route path="briefs" element={<PipelineBriefsStep />} />
                                    <Route path="content" element={<PipelineContentStep />} />
                                    <Route path="audit" element={<PipelineAuditStep />} />
                                    <Route path="tech" element={<PipelineTechSpecStep />} />
                                    <Route path="export" element={<PipelineExportStep />} />
                                </Route>

                                {/* Topic routes */}
                                <Route path="topics/:topicId" element={<TopicLoader />}>
                                    <Route index element={<TopicDetailPage />} />
                                    <Route path="brief" element={<BriefPage />} />
                                    <Route path="draft" element={<DraftPage />} />
                                    <Route path="style" element={<StylePage />} />
                                </Route>

                                {/* Product Catalog */}
                                <Route path="catalog" element={<CatalogDashboardPage />} />

                                {/* Analysis & audit routes */}
                                <Route path="audit" element={<AuditPage />} />
                                <Route path="insights" element={<InsightsPage />} />
                                <Route path="gap-analysis" element={<GapAnalysisPage />} />
                                <Route path="quality" element={<QualityPage />} />

                                {/* Planning routes */}
                                <Route path="planning" element={<PlanningPage />} />
                                <Route path="calendar" element={<CalendarPage />} />

                                {/* Strategy routes */}
                                <Route path="strategy/kp" element={<KPStrategyPage />} />
                                <Route path="strategy/entity-authority" element={<EntityAuthorityPage />} />
                                <Route path="strategy/entity-health" element={<EntityHealthPage />} />
                            </Route>
                        </Route>

                        {/* Default redirect */}
                        <Route path="/" element={<Navigate to="/projects" replace />} />
                    </Route>

                    {/* 404 */}
                    <Route path="*" element={<NotFoundPage />} />
                </Route>
            </Routes>
        </Suspense>
    );
};

export default AppRouter;
