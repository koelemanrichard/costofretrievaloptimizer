
import React, { useEffect, useState, useMemo } from 'react';
import { useAppState } from '../../state/appState';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import { SiteIngestionWizard } from './SiteIngestionWizard';
import { InventoryMatrix } from './InventoryMatrix';
import { TransitionKanban } from './TransitionKanban';
import { InventoryGraphView } from './InventoryGraphView';
import { StrategySelectionModal } from './StrategySelectionModal';
import { MigrationWorkbenchModal } from './MigrationWorkbenchModal';
import { ExportPanel, OverlayExportNode } from './ExportPanel';
import { AuthorityWizardContainer } from './AuthorityWizardContainer';
import { ExistingSiteWizardContainer } from './ExistingSiteWizardContainer';
import { SiteHealthSummary } from './SiteHealthSummary';
import TopicalMapDisplay from '../TopicalMapDisplay';
import { SiteInventoryItem, ActionType, EnrichedTopic } from '../../types';
import { useInventoryOperations } from '../../hooks/useInventoryOperations';
import { useTopicOperations } from '../../hooks/useTopicOperations';
import { useMapData } from '../../hooks/useMapData';
import { useOverlay } from '../../hooks/useOverlay';
import { ReportExportButton, ReportModal } from '../reports';
import { useMigrationReport } from '../../hooks/useReportGeneration';

type WizardPath = 'authority' | 'existing';

const MigrationDashboardContainer: React.FC = () => {
    const { state, dispatch } = useAppState();
    const { activeProjectId, businessInfo, activeMapId } = state;

    const {
        inventory,
        isLoadingInventory,
        refreshInventory,
        updateAction,
        updateStatus,
        markOptimized,
        mapInventoryItem,
        promoteToCore
    } = useInventoryOperations(activeProjectId, businessInfo, dispatch, activeMapId, state.user?.id);

    const [showWizard, setShowWizard] = useState(false);
    const [viewType, setViewType] = useState<'WIZARD' | 'MATRIX' | 'KANBAN'>('WIZARD');
    const [showGraph, setShowGraph] = useState(false);
    const [wizardPath, setWizardPath] = useState<WizardPath>(
        state.migrationWizardPath === 'existing' ? 'existing' : 'authority'
    );

    // Consume the one-time migration wizard path signal from state
    useEffect(() => {
        if (state.migrationWizardPath) {
            dispatch({ type: 'SET_MIGRATION_WIZARD_PATH', payload: null });
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Strategy Modal State
    const [showStrategyModal, setShowStrategyModal] = useState(false);
    const [pendingSource, setPendingSource] = useState<SiteInventoryItem | null>(null);
    const [pendingTarget, setPendingTarget] = useState<EnrichedTopic | null>(null);

    const [workbenchItem, setWorkbenchItem] = useState<SiteInventoryItem | null>(null);

    // Overlay for export
    const overlay = useOverlay();

    // Check wizard
    useEffect(() => {
        if (!isLoadingInventory && inventory.length === 0 && activeProjectId) {
             if (inventory.length === 0) {
                setShowWizard(true);
            }
        }
    }, [inventory.length, isLoadingInventory, activeProjectId]);

    // Fetch Target Map - Use unified hook
    const activeMap = state.topicalMaps.find(m => m.id === activeMapId);

    // Reusing the centralized data fetching logic
    useMapData(activeMapId, activeMap, businessInfo, dispatch);

    const targetTopics = useMemo(() => activeMap?.topics || [], [activeMap?.topics]);
    const targetBriefs = useMemo(() => activeMap?.briefs || {}, [activeMap?.briefs]);

    // Report generation hook
    const reportHook = useMigrationReport(
        inventory,
        targetTopics,
        state.projects.find(p => p.id === activeProjectId)?.project_name,
        businessInfo?.domain
    );

    // Topic Operations Hook for Editing/Deleting in Migration View
    const { handleUpdateTopic, handleDeleteTopic } = useTopicOperations(
        activeMapId,
        businessInfo,
        targetTopics,
        dispatch,
        state.user
    );

    const handleWizardComplete = () => {
        setShowWizard(false);
        refreshInventory();
    };

    // Handlers for Drag & Drop
    const handleInventoryDrop = (inventoryId: string, topicId: string) => {
        const source = inventory.find(i => i.id === inventoryId);
        const target = targetTopics.find(t => t.id === topicId);

        if (source && target) {
            setPendingSource(source);
            setPendingTarget(target);
            setShowStrategyModal(true);
        }
    };

    const handleConfirmStrategy = async (action: ActionType) => {
        if (pendingSource && pendingTarget) {
            await mapInventoryItem(pendingSource.id, pendingTarget.id, action);
            setShowStrategyModal(false);
            setPendingSource(null);
            setPendingTarget(null);
        }
    };

    const handleOpenWorkbench = (item: SiteInventoryItem) => {
        setWorkbenchItem(item);
    };

    const handleCreateBrief = (topicId: string) => {
        const topic = targetTopics.find(t => t.id === topicId);
        if (topic) {
            dispatch({ type: 'SET_ACTIVE_BRIEF_TOPIC', payload: topic });
        }
        dispatch({ type: 'SET_VIEW_MODE', payload: 'CREATION' });
    };

    const coreTopics = targetTopics.filter(t => t.type === 'core');
    const outerTopics = targetTopics.filter(t => t.type === 'outer');
    const allTopics = [...coreTopics, ...outerTopics];

    const linkedBrief = workbenchItem?.mapped_topic_id ? targetBriefs[workbenchItem.mapped_topic_id] : null;

    // Task 11: Pass strategic context to MigrationWorkbenchModal
    const mappedTopic = workbenchItem?.mapped_topic_id
        ? allTopics.find(t => t.id === workbenchItem.mapped_topic_id) ?? null
        : null;

    const competingPages = workbenchItem?.mapped_topic_id
        ? inventory.filter(i => i.mapped_topic_id === workbenchItem.mapped_topic_id && i.id !== workbenchItem.id)
        : [];

    // Task 14: Convert overlay nodes to export format
    const overlayExportNodes: OverlayExportNode[] | undefined = useMemo(() => {
        if (overlay.nodes.length === 0) return undefined;
        return overlay.nodes.map(node => ({
            topicTitle: node.title,
            status: node.status,
            statusColor: node.statusColor,
            matchedPages: node.matchedPages.map(p => ({
                url: p.url,
                alignmentScore: p.alignmentScore,
                gscClicks: p.gscClicks,
                auditScore: p.auditScore,
            })),
        }));
    }, [overlay.nodes]);

    // Compute overlay when we have both topics and inventory with mappings
    useEffect(() => {
        if (allTopics.length > 0 && inventory.length > 0) {
            const hasMappings = inventory.some(i => i.mapped_topic_id);
            if (hasMappings) {
                overlay.compute(allTopics, inventory);
            }
        }
    }, [allTopics, inventory, overlay]);

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col space-y-4 max-w-full w-full">
            <header className="flex justify-between items-center flex-shrink-0 px-4">
              <div>
                <h1 className="text-2xl font-bold text-white">Migration Workbench</h1>
                <p className="text-sm text-gray-400">Map your existing inventory to the target strategy.</p>
              </div>
              <div className="flex gap-3">
                  <ExportPanel inventory={inventory} topics={allTopics} overlayNodes={overlayExportNodes} />

                  <div className="bg-gray-800 p-1 rounded-lg flex text-xs">
                      <button
                        onClick={() => setViewType('WIZARD')}
                        className={`px-3 py-1.5 rounded ${viewType === 'WIZARD' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                      >
                          Guided
                      </button>
                      <button
                        onClick={() => setViewType('MATRIX')}
                        className={`px-3 py-1.5 rounded ${viewType === 'MATRIX' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                      >
                          Table
                      </button>
                      <button
                        onClick={() => setViewType('KANBAN')}
                        className={`px-3 py-1.5 rounded ${viewType === 'KANBAN' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                      >
                          Board
                      </button>
                  </div>
                  <Button onClick={() => setShowWizard(true)} className="text-xs py-2">
                      Import Data
                  </Button>
                  {reportHook.canGenerate && (
                      <ReportExportButton
                          reportType="migration"
                          onClick={reportHook.open}
                          variant="secondary"
                          size="sm"
                          className="text-xs py-2 bg-indigo-700 hover:bg-indigo-600"
                      />
                  )}
              </div>
            </header>

            {inventory.length > 0 && (
                <div className="flex-shrink-0 px-4">
                    <SiteHealthSummary inventory={inventory} />
                </div>
            )}

            <div className="flex-grow flex gap-4 overflow-hidden px-4 pb-4">
                {viewType === 'WIZARD' ? (
                    <div className="w-full flex flex-col">
                        {/* Wizard path selector */}
                        <div className="flex-shrink-0 flex items-center gap-2 mb-3">
                            <div className="bg-gray-800 p-1 rounded-lg flex text-xs">
                                <button
                                    onClick={() => setWizardPath('authority')}
                                    className={`px-3 py-1.5 rounded transition-colors ${
                                        wizardPath === 'authority'
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    New Strategy
                                </button>
                                <button
                                    onClick={() => setWizardPath('existing')}
                                    className={`px-3 py-1.5 rounded transition-colors ${
                                        wizardPath === 'existing'
                                            ? 'bg-green-600 text-white'
                                            : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    Optimize Existing Site
                                </button>
                            </div>
                            <span className="text-xs text-gray-500">
                                {wizardPath === 'authority'
                                    ? 'Build a new topical map from scratch'
                                    : 'Analyze and optimize your existing website'}
                            </span>
                        </div>

                        {wizardPath === 'authority' ? (
                            <AuthorityWizardContainer
                                projectId={activeProjectId || ''}
                                mapId={activeMapId || ''}
                                inventory={inventory}
                                topics={allTopics}
                                isLoadingInventory={isLoadingInventory}
                                onRefreshInventory={refreshInventory}
                                onOpenWorkbench={handleOpenWorkbench}
                                onCreateBrief={handleCreateBrief}
                            />
                        ) : (
                            <ExistingSiteWizardContainer
                                projectId={activeProjectId || ''}
                                mapId={activeMapId || ''}
                                inventory={inventory}
                                topics={allTopics}
                                isLoadingInventory={isLoadingInventory}
                                onRefreshInventory={refreshInventory}
                                onOpenWorkbench={handleOpenWorkbench}
                                onCreateBrief={handleCreateBrief}
                            />
                        )}
                    </div>
                ) : (
                <>
                <div className={`${viewType === 'KANBAN' ? 'w-full' : 'w-1/2'} flex flex-col min-w-[400px]`}>
                    {isLoadingInventory ? (
                        <div className="flex-grow flex items-center justify-center bg-gray-800/30 border border-gray-700 rounded-lg">
                            <Loader />
                        </div>
                    ) : (
                        <>
                            {viewType === 'MATRIX' && !showGraph && (
                                <InventoryMatrix
                                    inventory={inventory}
                                    onSelect={(item) => handleOpenWorkbench(item)}
                                    onAction={updateAction}
                                    onPromote={promoteToCore}
                                    onShowGraph={() => setShowGraph(true)}
                                />
                            )}
                            {viewType === 'MATRIX' && showGraph && (
                                <div className="flex flex-col h-full">
                                    <div className="flex-shrink-0 flex items-center gap-2 mb-2">
                                        <button
                                            onClick={() => setShowGraph(false)}
                                            className="text-xs text-gray-400 hover:text-white bg-gray-800 px-2 py-1 rounded"
                                        >
                                            &larr; Back to Table
                                        </button>
                                        <span className="text-xs text-gray-500">Graph View</span>
                                    </div>
                                    <InventoryGraphView inventory={inventory} />
                                </div>
                            )}
                            {viewType === 'KANBAN' && (
                                <TransitionKanban
                                    inventory={inventory}
                                    onStatusChange={updateStatus}
                                    onSelect={handleOpenWorkbench}
                                />
                            )}
                        </>
                    )}
                </div>

                {viewType !== 'KANBAN' && (
                    <div className="w-1/2 flex flex-col min-w-[400px] bg-gray-900/30 border-l-2 border-gray-800 pl-4">
                        <div className="flex justify-between items-center mb-4 flex-shrink-0">
                            <h3 className="text-lg font-bold text-blue-300">Target Strategy (Ideal Map)</h3>
                            {!activeMapId && <span className="text-xs text-red-400">No Map Selected</span>}
                        </div>

                        <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
                            {activeMapId ? (
                                <TopicalMapDisplay
                                    coreTopics={coreTopics}
                                    outerTopics={outerTopics}
                                    briefs={targetBriefs}
                                    onSelectTopicForBrief={() => {}}
                                    onExpandCoreTopic={() => {}}
                                    expandingCoreTopicId={null}
                                    onExecuteMerge={() => {}}
                                    canExpandTopics={false}
                                    canGenerateBriefs={false}
                                    onUpdateTopic={handleUpdateTopic}
                                    onDeleteTopic={handleDeleteTopic}
                                    onInventoryDrop={handleInventoryDrop}
                                />
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 border-2 border-dashed border-gray-800 rounded-lg">
                                    <p>Select a Topical Map from the main menu to see the target strategy.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                </>
                )}
            </div>

            <SiteIngestionWizard
                isOpen={showWizard}
                onClose={() => setShowWizard(false)}
                onComplete={handleWizardComplete}
                inventoryCount={inventory.length}
            />

            <StrategySelectionModal
                isOpen={showStrategyModal}
                onClose={() => setShowStrategyModal(false)}
                onConfirm={handleConfirmStrategy}
                sourceItem={pendingSource}
                targetTopic={pendingTarget}
                businessInfo={businessInfo}
            />

            <MigrationWorkbenchModal
                isOpen={!!workbenchItem}
                onClose={() => setWorkbenchItem(null)}
                inventoryItem={workbenchItem}
                linkedBrief={linkedBrief}
                onMarkOptimized={markOptimized}
                mappedTopic={mappedTopic}
                competingPages={competingPages}
            />

            {/* Report Modal */}
            {reportHook.data && (
                <ReportModal
                    isOpen={reportHook.isOpen}
                    onClose={reportHook.close}
                    reportType="migration"
                    data={reportHook.data}
                    projectName={state.projects.find(p => p.id === activeProjectId)?.project_name}
                />
            )}
        </div>
    );
};

export default MigrationDashboardContainer;
