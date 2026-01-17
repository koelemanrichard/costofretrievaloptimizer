
import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Loader } from '../ui/Loader';
import { KnowledgeNodes, ProgressText } from '../ui/FunLoaders';
import { SemanticTriple, BusinessInfo, SEOPillars } from '../../types';
import { safeString } from '../../utils/parsers';
import { useAppState } from '../../state/appState';
import * as aiService from '../../services/aiService';
import { autoClassifyEavs, getClassificationStats } from '../../services/ai/eavClassifier';
import { EavCategoryChartInline } from '../eav/EavCategoryChart';

interface EavManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  eavs: SemanticTriple[];
  onSave: (newEavs: SemanticTriple[]) => Promise<void>;
}

type ViewMode = 'list' | 'tree-subject' | 'tree-category';

interface TreeNode {
  id: string;
  label: string;
  children: { triple: SemanticTriple; index: number }[];
  isExpanded: boolean;
  color: string;
}

const EavManagerModal: React.FC<EavManagerModalProps> = ({ isOpen, onClose, eavs, onSave }) => {
  const { state, dispatch } = useAppState();
  const [localEavs, setLocalEavs] = useState<SemanticTriple[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const [expansionCount, setExpansionCount] = useState<number>(15);
  const [showExpansionConfig, setShowExpansionConfig] = useState(false);
  const [expandError, setExpandError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Form State
  const [newSubject, setNewSubject] = useState('');
  const [newPredicate, setNewPredicate] = useState('');
  const [newObject, setNewObject] = useState('');

  // Get active map and business info for AI expansion
  const activeMap = state.topicalMaps.find(m => m.id === state.activeMapId);
  const activeProject = state.projects.find(p => p.id === state.activeProjectId);

  // AI settings (provider, model, API keys) always come from global state, not map's business_info
  const effectiveBusinessInfo = useMemo<BusinessInfo>(() => {
    const mapBusinessInfo = activeMap?.business_info as Partial<BusinessInfo> || {};
    // Strip AI settings from map - they should come from global user_settings
    const { aiProvider: _, aiModel: __, geminiApiKey: _g, openAiApiKey: _o, anthropicApiKey: _a, perplexityApiKey: _p, openRouterApiKey: _or, ...mapBusinessContext } = mapBusinessInfo;
    return {
      ...state.businessInfo,
      domain: mapBusinessContext.domain || activeProject?.domain || state.businessInfo.domain,
      projectName: mapBusinessContext.projectName || activeProject?.project_name || state.businessInfo.projectName,
      ...mapBusinessContext,
      // AI settings ALWAYS from global
      aiProvider: state.businessInfo.aiProvider,
      aiModel: state.businessInfo.aiModel,
    };
  }, [state.businessInfo, activeMap, activeProject]);

  const pillars = activeMap?.pillars as SEOPillars | undefined;

  useEffect(() => {
    if (isOpen) {
      setLocalEavs(eavs || []);
      setNewSubject('');
      setNewPredicate('');
      setNewObject('');
      setExpandError(null);
      setSaveError(null);
      setExpandedNodes(new Set());
    }
  }, [isOpen, eavs]);

  // Build tree structure grouped by subject
  const subjectTree = useMemo((): TreeNode[] => {
    const groups = new Map<string, { triple: SemanticTriple; index: number }[]>();
    localEavs.forEach((triple, index) => {
      const key = safeString(triple.subject.label);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push({ triple, index });
    });

    const colors = [
      'border-blue-500', 'border-purple-500', 'border-green-500',
      'border-orange-500', 'border-pink-500', 'border-cyan-500',
      'border-yellow-500', 'border-red-500'
    ];

    return Array.from(groups.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .map(([label, children], i) => ({
        id: `subject-${label}`,
        label,
        children,
        isExpanded: expandedNodes.has(`subject-${label}`),
        color: colors[i % colors.length],
      }));
  }, [localEavs, expandedNodes]);

  // Build tree structure grouped by category
  const categoryTree = useMemo((): TreeNode[] => {
    const categoryConfig: Record<string, { label: string; color: string; order: number }> = {
      ROOT: { label: 'Root (Definitional)', color: 'border-blue-500', order: 1 },
      UNIQUE: { label: 'Unique (Differentiators)', color: 'border-purple-500', order: 2 },
      RARE: { label: 'Rare (Low Frequency)', color: 'border-orange-500', order: 3 },
      COMMON: { label: 'Common (Industry Standard)', color: 'border-gray-500', order: 4 },
      UNCLASSIFIED: { label: 'Unclassified', color: 'border-gray-600', order: 5 },
    };

    const groups = new Map<string, { triple: SemanticTriple; index: number }[]>();
    localEavs.forEach((triple, index) => {
      const category = triple.predicate.category || 'UNCLASSIFIED';
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push({ triple, index });
    });

    return Array.from(groups.entries())
      .sort((a, b) => (categoryConfig[a[0]]?.order || 99) - (categoryConfig[b[0]]?.order || 99))
      .map(([category, children]) => ({
        id: `category-${category}`,
        label: categoryConfig[category]?.label || category,
        children,
        isExpanded: expandedNodes.has(`category-${category}`),
        color: categoryConfig[category]?.color || 'border-gray-600',
      }));
  }, [localEavs, expandedNodes]);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const expandAllNodes = () => {
    const tree = viewMode === 'tree-subject' ? subjectTree : categoryTree;
    setExpandedNodes(new Set(tree.map(n => n.id)));
  };

  const collapseAllNodes = () => {
    setExpandedNodes(new Set());
  };

  const handleAdd = () => {
    if (newSubject.trim() && newPredicate.trim() && newObject.trim()) {
      const newTriple: SemanticTriple = {
        subject: { label: newSubject.trim(), type: 'Manual' },
        predicate: { relation: newPredicate.trim(), type: 'Manual' },
        object: { value: newObject.trim(), type: 'Manual' }
      };
      setLocalEavs([...localEavs, newTriple]);
      setNewSubject('');
      setNewPredicate('');
      setNewObject('');
    }
  };

  const handleDelete = (indexToRemove: number) => {
    setLocalEavs(localEavs.filter((_, index) => index !== indexToRemove));
  };

  const handleAIExpand = async (count?: number) => {
    if (!pillars) {
      setExpandError('No SEO pillars defined. Please complete the pillar wizard first.');
      return;
    }

    setIsExpanding(true);
    setExpandError(null);
    setShowExpansionConfig(false);

    try {
      const targetCount = count ?? expansionCount;
      const existingCount = localEavs.length;

      console.log(`[EAV Expansion] Starting: existing=${existingCount}, requesting=${targetCount}`);

      const newTriples = await aiService.expandSemanticTriples(
        effectiveBusinessInfo,
        pillars,
        localEavs,
        dispatch,
        targetCount
      );

      console.log(`[EAV Expansion] Received ${newTriples.length} new triples`);

      if (newTriples.length === 0) {
        setExpandError(`No new triples generated. The AI may have had trouble finding unique additions.`);
      } else {
        // Explicitly append new triples to existing ones
        setLocalEavs(currentEavs => {
          const combined = [...currentEavs, ...newTriples];
          console.log(`[EAV Expansion] Combined: ${currentEavs.length} + ${newTriples.length} = ${combined.length}`);
          return combined;
        });

        dispatch({
          type: 'LOG_EVENT',
          payload: {
            service: 'EavManager',
            message: `Added ${newTriples.length} new EAVs (total: ${existingCount + newTriples.length})`,
            status: 'info',
            timestamp: Date.now()
          }
        });
      }
    } catch (e) {
      console.error('[EAV Expansion] Error:', e);
      setExpandError(e instanceof Error ? e.message : 'Failed to expand semantic triples.');
    } finally {
      setIsExpanding(false);
    }
  };

  const handleCategorize = () => {
    const stats = getClassificationStats(localEavs);
    console.log(`[EAV Categorization] Before: ${stats.unclassified} uncategorized out of ${stats.total}`);

    if (stats.unclassified === 0) {
      setExpandError('All EAVs are already categorized.');
      return;
    }

    const categorized = autoClassifyEavs(localEavs);
    setLocalEavs(categorized);

    const newStats = getClassificationStats(categorized);
    console.log(`[EAV Categorization] After: ${newStats.unclassified} uncategorized, categories:`, newStats.byCategory);

    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'EavManager',
        message: `Categorized ${stats.unclassified} EAVs using heuristic rules`,
        status: 'info',
        timestamp: Date.now()
      }
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSave(localEavs);
      // onClose() is called by the parent after successful save
    } catch (error) {
      console.error("Failed to save EAVs:", error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save EAVs. Please try again.';
      setSaveError(errorMessage);
      // Don't close modal on error - let user retry
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle KP eligibility for an EAV
  const toggleKPEligibility = (index: number) => {
    setLocalEavs(prev => prev.map((eav, i) => {
      if (i !== index) return eav;
      const isCurrentlyEligible = eav.kpMetadata?.isKPEligible ?? false;
      return {
        ...eav,
        kpMetadata: {
          ...eav.kpMetadata,
          isKPEligible: !isCurrentlyEligible,
          // Initialize consensus tracking when flagged
          consensusScore: isCurrentlyEligible ? undefined : (eav.kpMetadata?.consensusScore ?? 0),
          seedSourcesConfirmed: isCurrentlyEligible ? undefined : (eav.kpMetadata?.seedSourcesConfirmed ?? []),
          seedSourcesRequired: isCurrentlyEligible ? undefined : (eav.kpMetadata?.seedSourcesRequired ?? ['wikipedia', 'wikidata']),
          // Auto-generate a statement based on the EAV
          generatedStatement: isCurrentlyEligible ? undefined :
            `${safeString(localEavs[index].subject.label)} ${safeString(localEavs[index].predicate.relation).toLowerCase().replace(/_/g, ' ')} ${safeString(localEavs[index].object.value)}.`
        }
      };
    }));
  };

  // Count KP-eligible EAVs
  const kpEligibleCount = localEavs.filter(eav => eav.kpMetadata?.isKPEligible).length;

  // Custom footer with status and buttons
  const modalFooter = (
    <div className="flex flex-col gap-2 w-full">
      {/* Save error message */}
      {saveError && (
        <div className="text-red-400 bg-red-900/20 p-2 rounded-md text-sm flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{saveError}</span>
        </div>
      )}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            {localEavs.length} triples
            {isExpanding && ' • Expanding...'}
          </span>
          {kpEligibleCount > 0 && (
            <span className="text-xs text-amber-400 bg-amber-900/30 px-2 py-0.5 rounded-full flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              {kpEligibleCount} KP
            </span>
          )}
        </div>
        <div className="flex gap-4">
          <Button onClick={onClose} variant="secondary" disabled={isSaving || isExpanding}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || isExpanding}>
            {isSaving ? <Loader className="w-5 h-5" /> : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Semantic Triples (E-A-V)"
      description="Add, edit, expand, and categorize Entity-Attribute-Value triples for your topical map"
      maxWidth="max-w-4xl"
      footer={modalFooter}
    >
          <div className="space-y-6">
            {/* Add New Section */}
            <div className="p-4 bg-gray-900/50 border border-gray-700 rounded-lg">
                <h3 className="text-sm font-semibold text-blue-400 mb-3">Add New Fact</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <Label htmlFor="new-subject" className="text-xs">Subject (Entity)</Label>
                        <Input 
                            id="new-subject"
                            value={newSubject}
                            onChange={(e) => setNewSubject(e.target.value)}
                            placeholder="e.g. Software"
                            className="!text-sm"
                        />
                    </div>
                    <div>
                        <Label htmlFor="new-predicate" className="text-xs">Predicate (Attribute)</Label>
                        <Input 
                            id="new-predicate"
                            value={newPredicate}
                            onChange={(e) => setNewPredicate(e.target.value)}
                            placeholder="e.g. HAS_FEATURE"
                            className="!text-sm"
                        />
                    </div>
                    <div>
                        <Label htmlFor="new-object" className="text-xs">Object (Value)</Label>
                        <div className="flex gap-2">
                            <Input 
                                id="new-object"
                                value={newObject}
                                onChange={(e) => setNewObject(e.target.value)}
                                placeholder="e.g. Automation"
                                className="!text-sm"
                                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                            />
                            <Button onClick={handleAdd} disabled={!newSubject || !newPredicate || !newObject} className="!py-1 !px-3">Add</Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Expansion Section */}
            {pillars && (
              <div className="p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-blue-400">AI Expansion</h3>
                    <p className="text-xs text-gray-400 mt-1">Generate additional semantic triples with AI</p>
                  </div>
                  <EavCategoryChartInline eavs={localEavs} />
                </div>

                {expandError && (
                  <div className="text-red-400 bg-red-900/20 p-2 rounded-md text-xs mb-3">{expandError}</div>
                )}

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <div className="flex items-center gap-1">
                      <Button
                        onClick={() => handleAIExpand()}
                        variant="secondary"
                        disabled={isExpanding || localEavs.length === 0}
                        className="flex-1 !py-2"
                      >
                        {isExpanding ? (
                          <span className="flex items-center gap-2">
                            <KnowledgeNodes size="sm" className="text-purple-400" />
                            <ProgressText
                              messages={['Expanding...', 'Analyzing semantics...', 'Building graph...', 'Almost ready...']}
                              interval={2000}
                            />
                          </span>
                        ) : (
                          `Expand +${expansionCount} with AI`
                        )}
                      </Button>
                      <button
                        onClick={() => setShowExpansionConfig(!showExpansionConfig)}
                        disabled={isExpanding}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                        title="Configure expansion count"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                      <Button
                        onClick={handleCategorize}
                        variant="secondary"
                        disabled={isExpanding || localEavs.length === 0}
                        className="!py-2"
                        title="Auto-categorize uncategorized EAVs using predicate patterns"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        Categorize
                      </Button>
                    </div>
                    {showExpansionConfig && (
                      <div className="absolute bottom-full left-0 mb-2 p-3 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-10 min-w-[220px]">
                        <label className="block text-xs text-gray-400 mb-2">Number of EAVs to generate:</label>
                        <input
                          type="number"
                          value={expansionCount}
                          onChange={(e) => setExpansionCount(Math.max(1, Math.min(500, parseInt(e.target.value) || 15)))}
                          min={1}
                          max={500}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                        />
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {[15, 50, 100, 200].map(preset => (
                            <button
                              key={preset}
                              onClick={() => setExpansionCount(preset)}
                              className={`px-2 py-1 text-xs rounded transition-colors ${expansionCount === preset ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Large counts use batched generation.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!pillars && (
              <div className="p-4 bg-amber-900/20 border border-amber-700/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-amber-200">
                    <strong>Note:</strong> Complete the SEO Pillar wizard to enable AI expansion.
                  </p>
                  <Button
                    onClick={handleCategorize}
                    variant="secondary"
                    disabled={localEavs.length === 0}
                    className="!py-1.5 !px-3 !text-xs"
                    title="Auto-categorize uncategorized EAVs using predicate patterns"
                  >
                    <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    Categorize EAVs
                  </Button>
                </div>
              </div>
            )}

            {/* View Toggle & List/Tree Section */}
            <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-400">Defined Triples ({localEavs.length})</h3>
                  <div className="flex items-center gap-2">
                    {viewMode !== 'list' && (
                      <div className="flex gap-1 mr-2">
                        <button
                          onClick={expandAllNodes}
                          className="text-xs px-2 py-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                        >
                          Expand All
                        </button>
                        <button
                          onClick={collapseAllNodes}
                          className="text-xs px-2 py-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                        >
                          Collapse All
                        </button>
                      </div>
                    )}
                    <div className="flex bg-gray-800 rounded-md p-0.5">
                      <button
                        onClick={() => setViewMode('list')}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          viewMode === 'list' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'
                        }`}
                        title="List View"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setViewMode('tree-subject')}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          viewMode === 'tree-subject' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'
                        }`}
                        title="Tree by Subject"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setViewMode('tree-category')}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          viewMode === 'tree-category' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'
                        }`}
                        title="Tree by Category"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {localEavs.length === 0 ? (
                    <p className="text-gray-500 italic text-sm">No semantic triples defined.</p>
                ) : viewMode === 'list' ? (
                    /* List View */
                    <div className="space-y-2">
                        {localEavs.map((triple, index) => (
                            <div key={index} className={`flex justify-between items-center bg-gray-800 p-3 rounded border group hover:border-gray-600 transition-colors ${
                              triple.kpMetadata?.isKPEligible ? 'border-amber-600/50' : 'border-gray-700'
                            }`}>
                                <div className="flex-grow grid grid-cols-3 gap-4 text-sm">
                                    <span className="font-semibold text-white break-words">{safeString(triple.subject.label)}</span>
                                    <span className="text-gray-400 text-center font-mono text-xs bg-gray-900 py-1 rounded">{safeString(triple.predicate.relation)}</span>
                                    <span className="text-blue-300 break-words">{safeString(triple.object.value)}</span>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {triple.predicate.category && (
                                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                                          triple.predicate.category === 'ROOT' ? 'bg-blue-900/50 text-blue-300' :
                                          triple.predicate.category === 'UNIQUE' ? 'bg-purple-900/50 text-purple-300' :
                                          triple.predicate.category === 'RARE' ? 'bg-orange-900/50 text-orange-300' :
                                          'bg-gray-700 text-gray-300'
                                      }`}>
                                          {triple.predicate.category}
                                      </span>
                                  )}
                                  {/* KP Toggle Button */}
                                  <button
                                      onClick={() => toggleKPEligibility(index)}
                                      className={`p-1.5 rounded transition-colors ${
                                        triple.kpMetadata?.isKPEligible
                                          ? 'bg-amber-600/30 text-amber-400 hover:bg-amber-600/40'
                                          : 'text-gray-500 hover:text-amber-400 hover:bg-gray-700'
                                      }`}
                                      title={triple.kpMetadata?.isKPEligible ? 'Remove from KP (click to unflag)' : 'Flag for Knowledge Panel'}
                                  >
                                      <svg className="w-4 h-4" fill={triple.kpMetadata?.isKPEligible ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                      </svg>
                                  </button>
                                  <button
                                      onClick={() => handleDelete(index)}
                                      className="text-red-400 hover:text-red-300 p-1 opacity-50 group-hover:opacity-100 transition-opacity"
                                      title="Delete"
                                  >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                  </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* Tree View */
                    <div className="space-y-2">
                        {(viewMode === 'tree-subject' ? subjectTree : categoryTree).map(node => (
                            <div key={node.id} className={`bg-gray-800 rounded border-l-4 ${node.color} overflow-hidden`}>
                                {/* Node Header */}
                                <button
                                    onClick={() => toggleNode(node.id)}
                                    className="w-full flex items-center justify-between p-3 hover:bg-gray-700/50 transition-colors text-left"
                                >
                                    <div className="flex items-center gap-2">
                                        <svg
                                            className={`w-4 h-4 text-gray-400 transition-transform ${node.isExpanded ? 'rotate-90' : ''}`}
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                        <span className="font-semibold text-white">{node.label}</span>
                                    </div>
                                    <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded-full">
                                        {node.children.length} {node.children.length === 1 ? 'fact' : 'facts'}
                                    </span>
                                </button>

                                {/* Expanded Children */}
                                {node.isExpanded && (
                                    <div className="border-t border-gray-700">
                                        {node.children.map(({ triple, index }) => (
                                            <div
                                                key={index}
                                                className={`flex items-center justify-between px-3 py-2 hover:bg-gray-700/30 group border-b border-gray-700/50 last:border-0 ${
                                                  triple.kpMetadata?.isKPEligible ? 'bg-amber-900/10' : ''
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 flex-grow min-w-0">
                                                    {viewMode === 'tree-category' && (
                                                        <span className="text-xs text-gray-500 truncate max-w-[120px]" title={safeString(triple.subject.label)}>
                                                            {safeString(triple.subject.label)}
                                                        </span>
                                                    )}
                                                    <span className="text-gray-400 font-mono text-xs bg-gray-900 px-2 py-0.5 rounded whitespace-nowrap">
                                                        {safeString(triple.predicate.relation)}
                                                    </span>
                                                    <span className="text-blue-300 text-sm truncate" title={String(triple.object.value)}>
                                                        {safeString(triple.object.value)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                                    {viewMode === 'tree-subject' && triple.predicate.category && (
                                                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                            triple.predicate.category === 'ROOT' ? 'bg-blue-900/50 text-blue-300' :
                                                            triple.predicate.category === 'UNIQUE' ? 'bg-purple-900/50 text-purple-300' :
                                                            triple.predicate.category === 'RARE' ? 'bg-orange-900/50 text-orange-300' :
                                                            'bg-gray-700 text-gray-300'
                                                        }`}>
                                                            {triple.predicate.category}
                                                        </span>
                                                    )}
                                                    {triple.predicate.classification && (
                                                        <span className="text-xs text-gray-500" title="Classification">
                                                            {triple.predicate.classification}
                                                        </span>
                                                    )}
                                                    {/* KP Toggle Button */}
                                                    <button
                                                        onClick={() => toggleKPEligibility(index)}
                                                        className={`p-1 rounded transition-colors ${
                                                          triple.kpMetadata?.isKPEligible
                                                            ? 'bg-amber-600/30 text-amber-400 hover:bg-amber-600/40'
                                                            : 'text-gray-500 hover:text-amber-400 hover:bg-gray-700 opacity-50 group-hover:opacity-100'
                                                        }`}
                                                        title={triple.kpMetadata?.isKPEligible ? 'Remove from KP' : 'Flag for KP'}
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill={triple.kpMetadata?.isKPEligible ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(index)}
                                                        className="text-red-400 hover:text-red-300 p-1 opacity-50 group-hover:opacity-100 transition-opacity"
                                                        title="Delete"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
          </div>
    </Modal>
  );
};

export default EavManagerModal;
