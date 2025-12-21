/**
 * EntityAuthorityPage.tsx
 *
 * Entity Authority diagnostic/analysis page showing Knowledge Panel readiness and gaps.
 *
 * Components:
 * 1. Readiness Score Panel - Overall score with breakdown bars
 * 2. EAV Consensus Tracker - Table of EAVs with source confirmation
 * 3. Priority Actions - Auto-generated recommendations
 * 4. Brand Search Demand Chart (optional)
 */

import React, { useMemo, useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { EntityIdentity, SemanticTriple, BusinessInfo } from '../types';

interface EntityAuthorityPageProps {
  isOpen: boolean;
  onClose: () => void;
  businessInfo?: BusinessInfo;
  entityIdentity?: EntityIdentity;
  eavs?: SemanticTriple[];
  onOpenKPStrategy?: () => void;
}

// Category colors
const CATEGORY_COLORS = {
  UNIQUE: 'bg-purple-500',
  ROOT: 'bg-blue-500',
  RARE: 'bg-green-500',
  COMMON: 'bg-gray-500',
} as const;

// Priority action templates
interface PriorityAction {
  id: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  action?: string;
}

export const EntityAuthorityPage: React.FC<EntityAuthorityPageProps> = ({
  isOpen,
  onClose,
  businessInfo,
  entityIdentity,
  eavs = [],
  onOpenKPStrategy,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Calculate readiness scores
  const readinessScores = useMemo(() => {
    // Entity Identity completeness (0-100)
    let entityIdentityScore = 0;
    if (entityIdentity) {
      const fields = ['legalName', 'founderOrCEO', 'primaryAttribute', 'headquartersLocation'];
      const filledFields = fields.filter(f => entityIdentity[f as keyof EntityIdentity]);
      entityIdentityScore = Math.round((filledFields.length / fields.length) * 100);
    }

    // Seed Sources completeness (0-100)
    let seedSourcesScore = 0;
    if (entityIdentity?.existingSeedSources) {
      const sources = ['wikipedia', 'wikidata', 'crunchbase', 'linkedinCompany', 'googleBusinessProfile'];
      const filledSources = sources.filter(s => {
        const value = entityIdentity.existingSeedSources[s as keyof typeof entityIdentity.existingSeedSources];
        return value && (typeof value === 'boolean' ? value : value.length > 0);
      });
      seedSourcesScore = Math.round((filledSources.length / sources.length) * 100);
    }

    // EAV Consensus average (0-100)
    const kpEavs = eavs.filter(e => e.kpMetadata?.isKPEligible);
    const eavConsensusScore = kpEavs.length > 0
      ? Math.round(kpEavs.reduce((sum, e) => sum + (e.kpMetadata?.consensusScore || 0), 0) / kpEavs.length)
      : 0;

    // Content Coverage (based on total EAVs and their classification)
    const contentCoverageScore = Math.min(100, Math.round(eavs.length * 5)); // 5% per EAV, max 100%

    // Overall score (weighted average)
    const overallScore = Math.round(
      (entityIdentityScore * 0.25) +
      (seedSourcesScore * 0.30) +
      (eavConsensusScore * 0.25) +
      (contentCoverageScore * 0.20)
    );

    return {
      overall: overallScore,
      entityIdentity: entityIdentityScore,
      seedSources: seedSourcesScore,
      eavConsensus: eavConsensusScore,
      contentCoverage: contentCoverageScore,
    };
  }, [entityIdentity, eavs]);

  // Generate priority actions based on gaps
  const priorityActions = useMemo<PriorityAction[]>(() => {
    const actions: PriorityAction[] = [];

    // Check entity identity
    if (!entityIdentity?.legalName) {
      actions.push({
        id: 'entity-name',
        priority: 'HIGH',
        title: 'Define Legal Entity Name',
        description: 'Your entity needs a clear, official name for Knowledge Panel eligibility.',
        action: 'Open KP Strategy',
      });
    }

    if (!entityIdentity?.founderOrCEO) {
      actions.push({
        id: 'founder',
        priority: 'HIGH',
        title: 'Identify Key Person',
        description: 'Add founder/CEO information to establish E-A-T signals.',
        action: 'Open KP Strategy',
      });
    }

    // Check seed sources
    if (!entityIdentity?.existingSeedSources?.wikipedia) {
      actions.push({
        id: 'wikipedia',
        priority: 'HIGH',
        title: 'Create Wikipedia Entry',
        description: 'Wikipedia is the primary source for Knowledge Panel data.',
        action: 'Open KP Strategy',
      });
    }

    if (!entityIdentity?.existingSeedSources?.wikidata) {
      actions.push({
        id: 'wikidata',
        priority: 'MEDIUM',
        title: 'Create Wikidata Entry',
        description: 'Wikidata provides structured data for Google Knowledge Graph.',
        action: 'Open KP Strategy',
      });
    }

    if (!entityIdentity?.existingSeedSources?.crunchbase) {
      actions.push({
        id: 'crunchbase',
        priority: 'MEDIUM',
        title: 'Claim Crunchbase Profile',
        description: 'Crunchbase is a trusted source for business entity data.',
        action: 'Open KP Strategy',
      });
    }

    // Check EAVs
    const kpEavs = eavs.filter(e => e.kpMetadata?.isKPEligible);
    if (kpEavs.length < 5) {
      actions.push({
        id: 'eavs',
        priority: 'MEDIUM',
        title: 'Add More KP-Contributing EAVs',
        description: `Only ${kpEavs.length} EAVs marked for KP. Aim for at least 10.`,
      });
    }

    // Check brand search demand
    if (!entityIdentity?.brandSearchDemand || entityIdentity.brandSearchDemand < 100) {
      actions.push({
        id: 'brand-demand',
        priority: 'LOW',
        title: 'Build Brand Search Demand',
        description: 'Increase branded searches through PR and marketing activities.',
      });
    }

    return actions.sort((a, b) => {
      const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [entityIdentity, eavs]);

  // Filter EAVs by category
  const filteredEavs = useMemo(() => {
    const kpEavs = eavs.filter(e => e.kpMetadata?.isKPEligible);
    if (categoryFilter === 'all') return kpEavs;
    return kpEavs.filter(e => e.predicate.category === categoryFilter);
  }, [eavs, categoryFilter]);

  if (!isOpen) return null;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'text-red-400 bg-red-900/30 border-red-700';
      case 'MEDIUM': return 'text-orange-400 bg-orange-900/30 border-orange-700';
      case 'LOW': return 'text-yellow-400 bg-yellow-900/30 border-yellow-700';
      default: return 'text-gray-400 bg-gray-800 border-gray-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/95 overflow-auto">
      <div className="min-h-full p-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Entity Authority</h1>
              <p className="text-sm text-gray-400">
                Knowledge Panel readiness diagnostics and gap analysis
              </p>
            </div>
            <div className="flex gap-2">
              {onOpenKPStrategy && (
                <Button variant="secondary" onClick={onOpenKPStrategy}>
                  Open KP Strategy
                </Button>
              )}
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* Left Column: Readiness Score */}
            <div className="space-y-6">
              {/* Overall Score */}
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Readiness Score</h2>
                <div className="flex items-center justify-center mb-6">
                  <div className="relative">
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        className="text-gray-700"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={`${(readinessScores.overall / 100) * 352} 352`}
                        className={
                          readinessScores.overall >= 70 ? 'text-green-500' :
                          readinessScores.overall >= 40 ? 'text-yellow-500' :
                          'text-red-500'
                        }
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl font-bold text-white">{readinessScores.overall}</span>
                    </div>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="space-y-3">
                  {[
                    { label: 'Entity Identity', value: readinessScores.entityIdentity },
                    { label: 'Seed Sources', value: readinessScores.seedSources },
                    { label: 'EAV Consensus', value: readinessScores.eavConsensus },
                    { label: 'Content Coverage', value: readinessScores.contentCoverage },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>{item.label}</span>
                        <span>{item.value}%</span>
                      </div>
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            item.value >= 70 ? 'bg-green-500' :
                            item.value >= 40 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${item.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Priority Actions */}
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Priority Actions</h2>
                {priorityActions.length === 0 ? (
                  <p className="text-sm text-green-400">All checks passed! Great job.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {priorityActions.map(action => (
                      <div
                        key={action.id}
                        className={`p-3 rounded border ${getPriorityColor(action.priority)}`}
                      >
                        <div className="flex items-start gap-2">
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getPriorityColor(action.priority)}`}>
                            {action.priority}
                          </span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-white">{action.title}</p>
                            <p className="text-xs text-gray-400 mt-1">{action.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Right Column: EAV Consensus Tracker */}
            <div className="col-span-2">
              <Card className="p-6 h-full">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white">EAV Consensus Tracker</h2>
                    <p className="text-sm text-gray-400">
                      Track which EAVs are confirmed across seed sources
                    </p>
                  </div>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white"
                  >
                    <option value="all">All Categories</option>
                    <option value="UNIQUE">UNIQUE</option>
                    <option value="ROOT">ROOT</option>
                    <option value="RARE">RARE</option>
                    <option value="COMMON">COMMON</option>
                  </select>
                </div>

                {filteredEavs.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>No KP-eligible EAVs found.</p>
                    <p className="text-xs mt-1">Flag EAVs as KP-contributing in the EAV Manager.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left py-2 px-3 text-xs font-medium text-gray-400">Attribute</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-gray-400">Category</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-gray-400">Sources</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-gray-400">Consensus</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEavs.map((eav, index) => (
                          <tr key={`eav-${index}`} className="border-b border-gray-800">
                            <td className="py-3 px-3">
                              <p className="text-sm text-white">{eav.predicate.relation}</p>
                              <p className="text-xs text-gray-500">{eav.object.value}</p>
                            </td>
                            <td className="py-3 px-3">
                              <span className={`text-xs px-2 py-1 rounded ${CATEGORY_COLORS[eav.predicate.category as keyof typeof CATEGORY_COLORS] || 'bg-gray-500'} bg-opacity-20`}>
                                {eav.predicate.category || 'COMMON'}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span className="text-sm text-gray-300">
                                {eav.kpMetadata?.seedSourcesConfirmed?.length || 0} / {eav.kpMetadata?.seedSourcesRequired?.length || 0}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden w-20">
                                  <div
                                    className={`h-full rounded-full ${
                                      (eav.kpMetadata?.consensusScore || 0) >= 70 ? 'bg-green-500' :
                                      (eav.kpMetadata?.consensusScore || 0) >= 40 ? 'bg-yellow-500' :
                                      'bg-red-500'
                                    }`}
                                    style={{ width: `${eav.kpMetadata?.consensusScore || 0}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-400 w-8">
                                  {eav.kpMetadata?.consensusScore || 0}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Source Legend */}
                <div className="mt-4 pt-4 border-t border-gray-800">
                  <p className="text-xs text-gray-500 mb-2">Source Legend:</p>
                  <div className="flex flex-wrap gap-3">
                    <span className="text-xs text-gray-400">📖 Wikipedia</span>
                    <span className="text-xs text-gray-400">📊 Wikidata</span>
                    <span className="text-xs text-gray-400">💼 Crunchbase</span>
                    <span className="text-xs text-gray-400">🔗 LinkedIn</span>
                    <span className="text-xs text-gray-400">📍 GBP</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EntityAuthorityPage;
