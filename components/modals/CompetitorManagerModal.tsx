import React, { useState, useEffect, useId, useMemo } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Modal } from '../ui/Modal';
import { SmartLoader } from '../ui/FunLoaders';
import { useAppState } from '../../state/appState';
import { SerpResult, BusinessInfo } from '../../types';
import * as serpApiService from '../../services/serpApiService';
import { discoverCompetitorsWithAI } from '../../services/perplexityService';

type DiscoveryMethod = 'idle' | 'serp' | 'ai' | 'done';

interface CompetitorManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  competitors: string[];
  onSave: (newCompetitors: string[]) => Promise<void>;
}

const CompetitorManagerModal: React.FC<CompetitorManagerModalProps> = ({ isOpen, onClose, competitors, onSave }) => {
  const { state, dispatch } = useAppState();
  const [localCompetitors, setLocalCompetitors] = useState<string[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryMethod, setDiscoveryMethod] = useState<DiscoveryMethod>('idle');
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const sectionId = useId();

  // Get active map and pillars
  const activeMap = state.activeMapId ? state.topicalMaps[state.activeMapId] : null;
  const pillars = activeMap?.pillars;

  // Build effective business info (same logic as CompetitorRefinementWizard)
  const effectiveBusinessInfo = useMemo<BusinessInfo>(() => {
    const mapBusinessContext = activeMap?.business_info || {};
    const activeProject = state.activeProjectId ? state.projects.find(p => p.id === state.activeProjectId) : null;

    return {
      ...state.businessInfo,
      ...mapBusinessContext,
      domain: activeProject?.domain || state.businessInfo.domain,
      projectName: activeProject?.name || state.businessInfo.projectName,
      aiProvider: state.businessInfo.aiProvider,
      aiModel: state.businessInfo.aiModel,
    };
  }, [state.businessInfo, activeMap, state.activeProjectId, state.projects]);

  // Show discover section if pillars are configured (API key check happens on click)
  const canDiscover = !!pillars?.centralEntity;

  useEffect(() => {
    if (isOpen) {
      setLocalCompetitors(competitors || []);
      setNewUrl('');
      setIsDiscovering(false);
      setDiscoveryMethod('idle');
      setDiscoveryError(null);
    }
  }, [isOpen, competitors]);

  const handleAdd = () => {
    if (newUrl.trim() && !localCompetitors.includes(newUrl.trim())) {
      setLocalCompetitors([...localCompetitors, newUrl.trim()]);
      setNewUrl('');
    }
  };

  const handleRemove = (urlToRemove: string) => {
    setLocalCompetitors(localCompetitors.filter(url => url !== urlToRemove));
  };

  const handleDiscover = async () => {
    if (!pillars?.centralEntity) {
      setDiscoveryError('No SEO pillars configured. Please set up pillars first.');
      return;
    }

    // Check if any discovery method is available
    const hasDataForSeo = !!(effectiveBusinessInfo.dataForSeoLogin && effectiveBusinessInfo.dataForSeoPassword);
    const hasPerplexity = !!effectiveBusinessInfo.perplexityApiKey;

    if (!hasDataForSeo && !hasPerplexity) {
      setDiscoveryError('No API keys configured. Please configure DataForSEO or Perplexity API keys in Settings.');
      return;
    }

    setIsDiscovering(true);
    setDiscoveryError(null);
    setDiscoveryMethod('serp');

    let results: SerpResult[] = [];

    // Step 1: Try DataForSEO/SERP-based discovery
    if (hasDataForSeo) {
      try {
        console.log('[CompetitorManager] Starting SERP discovery...');
        results = await serpApiService.discoverInitialCompetitors(
          pillars.centralEntity,
          effectiveBusinessInfo,
          dispatch
        );
        console.log(`[CompetitorManager] SERP found ${results.length} competitors`);
      } catch (e) {
        console.warn('[CompetitorManager] SERP discovery failed:', e);
      }
    }

    // Step 2: If SERP returns empty and Perplexity is configured, try AI discovery
    if (results.length === 0 && hasPerplexity) {
      setDiscoveryMethod('ai');
      try {
        console.log('[CompetitorManager] SERP returned empty, falling back to AI discovery...');
        results = await discoverCompetitorsWithAI(
          pillars,
          effectiveBusinessInfo,
          dispatch
        );
        console.log(`[CompetitorManager] AI discovery found ${results.length} competitors`);
      } catch (e) {
        console.warn('[CompetitorManager] AI discovery also failed:', e);
        setDiscoveryError(e instanceof Error ? e.message : 'Failed to discover competitors via AI.');
      }
    }

    setDiscoveryMethod('done');

    if (results.length > 0) {
      // Add discovered competitors (excluding duplicates)
      const newUrls = results
        .map(r => r.link)
        .filter(url => !localCompetitors.includes(url));

      if (newUrls.length > 0) {
        setLocalCompetitors(prev => [...prev, ...newUrls]);
        console.log(`[CompetitorManager] Added ${newUrls.length} new competitors`);
      } else {
        setDiscoveryError('All discovered competitors are already in your list.');
      }
    } else if (!discoveryError) {
      setDiscoveryError('No competitors found. Try adding them manually.');
    }

    setIsDiscovering(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(localCompetitors);
      onClose();
    } catch (error) {
      console.error("Failed to save competitors:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const footer = (
    <div className="flex justify-end gap-4 w-full">
      <Button onClick={onClose} variant="secondary" disabled={isSaving || isDiscovering}>Cancel</Button>
      <Button onClick={handleSave} disabled={isSaving || isDiscovering}>
        {isSaving ? <SmartLoader context="loading" size="sm" showText={false} /> : 'Save Changes'}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Competitors"
      description="Add and manage competitor URLs for analysis"
      maxWidth="max-w-lg"
      footer={footer}
    >
      <div className="space-y-4">
        {/* Auto-discover section */}
        {canDiscover && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Auto-Discover Competitors</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Find competitors based on your SEO pillars: <span className="text-cyan-400">{pillars?.centralEntity}</span>
                </p>
              </div>
              <Button
                onClick={handleDiscover}
                variant="secondary"
                disabled={isDiscovering || isSaving}
                className="flex items-center gap-2"
              >
                {isDiscovering ? (
                  <>
                    <SmartLoader context="discovering" size="sm" showText={false} />
                    <span>{discoveryMethod === 'serp' ? 'SERP...' : discoveryMethod === 'ai' ? 'AI...' : 'Discovering...'}</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span>Discover</span>
                  </>
                )}
              </Button>
            </div>
            {discoveryError && (
              <p className="text-xs text-yellow-400 mt-2">{discoveryError}</p>
            )}
          </div>
        )}

        {/* Manual add section */}
        <div>
          <Label htmlFor={`${sectionId}-add`}>Add Competitor URL Manually</Label>
          <div className="flex gap-2">
            <Input
              id={`${sectionId}-add`}
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://example.com"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              disabled={isDiscovering}
            />
            <Button onClick={handleAdd} variant="secondary" disabled={!newUrl.trim() || isDiscovering}>Add</Button>
          </div>
        </div>

        {/* Competitors list */}
        <div>
          <h3 id={`${sectionId}-list-heading`} className="text-sm font-semibold text-gray-400 mb-2">
            Current Competitors ({localCompetitors.length})
          </h3>
          {localCompetitors.length === 0 ? (
            <p className="text-gray-500 italic text-sm">No competitors added yet. Use auto-discover or add manually.</p>
          ) : (
            <ul className="space-y-2" role="list" aria-labelledby={`${sectionId}-list-heading`}>
              {localCompetitors.map((url) => (
                <li key={url} className="flex justify-between items-center bg-gray-900/50 p-2 rounded border border-gray-700">
                  <span className="text-sm text-gray-300 truncate mr-2">{url}</span>
                  <button
                    onClick={() => handleRemove(url)}
                    className="text-red-400 hover:text-red-300 p-1"
                    aria-label={`Remove ${url}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default CompetitorManagerModal;
