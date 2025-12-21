/**
 * KPStrategyPage.tsx
 *
 * Knowledge Panel (KP) Strategy page for defining entity identity
 * and tracking seed source status for Knowledge Panel building.
 *
 * Components:
 * 1. Entity Identity Form
 * 2. Seed Sources Tracker
 * 3. KP-Contributing Statements from EAVs
 */

import React, { useState, useMemo } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Select } from './ui/Select';
import { Textarea } from './ui/Textarea';
import { EntityIdentity, SemanticTriple, BusinessInfo, SeedSourceCategory } from '../types';
import {
  SEED_SOURCES,
  getSeedSourcesByCategory,
  getAllCategories,
  CATEGORY_LABELS,
  calculateCorroborationScore,
  getCorroborationStatus
} from '../config/seedSources';

interface KPStrategyPageProps {
  isOpen: boolean;
  onClose: () => void;
  businessInfo?: BusinessInfo;
  entityIdentity?: EntityIdentity;
  eavs?: SemanticTriple[];
  onSaveEntityIdentity?: (entityIdentity: EntityIdentity) => Promise<void>;
}

// Primary attribute options for desired KP subtitle
const PRIMARY_ATTRIBUTE_OPTIONS = [
  'Software Company',
  'Technology Company',
  'Consulting Firm',
  'Marketing Agency',
  'E-commerce Platform',
  'SaaS Provider',
  'Professional Services',
  'Healthcare Provider',
  'Financial Services',
  'Educational Institution',
  'Non-profit Organization',
  'Manufacturing Company',
  'Retail Company',
  'Media Company',
  'Other',
];

export const KPStrategyPage: React.FC<KPStrategyPageProps> = ({
  isOpen,
  onClose,
  businessInfo,
  entityIdentity: initialEntityIdentity,
  eavs = [],
  onSaveEntityIdentity,
}) => {
  // Entity Identity form state
  const [entityIdentity, setEntityIdentity] = useState<Partial<EntityIdentity>>(
    initialEntityIdentity || {
      legalName: businessInfo?.projectName || '',
      founderOrCEO: '',
      primaryAttribute: '',
      existingSeedSources: {},
    }
  );
  const [isSaving, setIsSaving] = useState(false);

  // KP-Contributing EAVs
  const kpEligibleEavs = useMemo(() => {
    return eavs.filter(eav => eav.kpMetadata?.isKPEligible);
  }, [eavs]);

  // Selected statements for export
  const [selectedStatements, setSelectedStatements] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const handleInputChange = (field: keyof EntityIdentity, value: any) => {
    setEntityIdentity(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSeedSourceChange = (sourceId: string, value: string | boolean) => {
    setEntityIdentity(prev => ({
      ...prev,
      existingSeedSources: {
        ...prev.existingSeedSources,
        [sourceId]: value,
      },
    }));
  };

  const getSeedSourceStatus = (sourceId: string): 'missing' | 'claimed' | 'verified' => {
    const value = entityIdentity.existingSeedSources?.[sourceId as keyof typeof entityIdentity.existingSeedSources];
    if (!value) return 'missing';
    if (typeof value === 'boolean') return value ? 'claimed' : 'missing';
    return value ? 'verified' : 'missing';
  };

  const handleSave = async () => {
    if (!onSaveEntityIdentity) return;
    setIsSaving(true);
    try {
      await onSaveEntityIdentity(entityIdentity as EntityIdentity);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatementSelection = (eavId: string) => {
    setSelectedStatements(prev => {
      const next = new Set(prev);
      if (next.has(eavId)) {
        next.delete(eavId);
      } else {
        next.add(eavId);
      }
      return next;
    });
  };

  const handleExportStatements = () => {
    const statements = kpEligibleEavs
      .filter((eav, index) => selectedStatements.has(`eav-${index}`))
      .map(eav => eav.kpMetadata?.generatedStatement || `${eav.subject.label} ${eav.predicate.relation}: ${eav.object.value}`)
      .join('\n\n');

    navigator.clipboard.writeText(statements);
    alert('Statements copied to clipboard!');
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/95 overflow-auto">
      <div className="min-h-full p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">KP Strategy</h1>
              <p className="text-sm text-gray-400">
                Define your entity identity and track seed sources for Knowledge Panel building
              </p>
            </div>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>

          <div className="space-y-6">
            {/* Section 1: Entity Identity Form */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Entity Identity</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="legalName">Legal Name</Label>
                  <Input
                    id="legalName"
                    value={entityIdentity.legalName || ''}
                    onChange={(e) => handleInputChange('legalName', e.target.value)}
                    placeholder="Official registered name"
                  />
                </div>
                <div>
                  <Label htmlFor="foundedYear">Founded Year</Label>
                  <Input
                    id="foundedYear"
                    type="number"
                    value={entityIdentity.foundedYear || ''}
                    onChange={(e) => handleInputChange('foundedYear', parseInt(e.target.value) || undefined)}
                    placeholder="e.g., 2020"
                  />
                </div>
                <div>
                  <Label htmlFor="headquartersLocation">Headquarters Location</Label>
                  <Input
                    id="headquartersLocation"
                    value={entityIdentity.headquartersLocation || ''}
                    onChange={(e) => handleInputChange('headquartersLocation', e.target.value)}
                    placeholder="City, Country"
                  />
                </div>
                <div>
                  <Label htmlFor="founderOrCEO">Founder / CEO</Label>
                  <Input
                    id="founderOrCEO"
                    value={entityIdentity.founderOrCEO || ''}
                    onChange={(e) => handleInputChange('founderOrCEO', e.target.value)}
                    placeholder="Key person for E-A-T"
                  />
                </div>
                <div>
                  <Label htmlFor="founderCredential">Founder Credential</Label>
                  <Input
                    id="founderCredential"
                    value={entityIdentity.founderCredential || ''}
                    onChange={(e) => handleInputChange('founderCredential', e.target.value)}
                    placeholder="Primary credential (e.g., PhD, MBA)"
                  />
                </div>
                <div>
                  <Label htmlFor="primaryAttribute">Primary Attribute (KP Subtitle)</Label>
                  <Select
                    id="primaryAttribute"
                    value={entityIdentity.primaryAttribute || ''}
                    onChange={(e) => handleInputChange('primaryAttribute', e.target.value)}
                  >
                    <option value="">Select desired KP subtitle...</option>
                    {PRIMARY_ATTRIBUTE_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label htmlFor="brandSearchDemand">Brand Search Demand (Monthly)</Label>
                  <Input
                    id="brandSearchDemand"
                    type="number"
                    value={entityIdentity.brandSearchDemand || ''}
                    onChange={(e) => handleInputChange('brandSearchDemand', parseInt(e.target.value) || undefined)}
                    placeholder="Monthly branded searches"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Entity Identity'}
                </Button>
              </div>
            </Card>

            {/* Section 2: Seed Sources Tracker */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Seed Sources Tracker</h2>
              <p className="text-sm text-gray-400 mb-4">
                Track and manage your presence on authoritative seed sources. Aim for 20+ corroborating sources.
              </p>

              {/* Corroboration Score */}
              {(() => {
                const scoreResult = calculateCorroborationScore(entityIdentity.existingSeedSources || {});
                const statusInfo = getCorroborationStatus(scoreResult.score);
                return (
                  <div className="mb-6 p-4 bg-gray-800/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-300">Corroboration Score</span>
                      <span className={`text-sm font-medium ${
                        statusInfo.color === 'green' ? 'text-green-400' :
                        statusInfo.color === 'blue' ? 'text-blue-400' :
                        statusInfo.color === 'yellow' ? 'text-yellow-400' :
                        statusInfo.color === 'orange' ? 'text-orange-400' :
                        'text-red-400'
                      }`}>
                        {scoreResult.score}% - {statusInfo.label}
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          statusInfo.color === 'green' ? 'bg-green-500' :
                          statusInfo.color === 'blue' ? 'bg-blue-500' :
                          statusInfo.color === 'yellow' ? 'bg-yellow-500' :
                          statusInfo.color === 'orange' ? 'bg-orange-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${scoreResult.score}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                      <span>{scoreResult.sourcesFound} sources tracked</span>
                      <span>{statusInfo.description}</span>
                    </div>
                    {scoreResult.missingHighPriority.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-700">
                        <span className="text-xs text-gray-400">Priority missing: </span>
                        <span className="text-xs text-yellow-400">
                          {scoreResult.missingHighPriority.slice(0, 3).map(s => s.name).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Sources by Category */}
              <div className="space-y-4">
                {getAllCategories().map(category => {
                  const sources = getSeedSourcesByCategory(category);
                  const categoryInfo = CATEGORY_LABELS[category];
                  return (
                    <details key={category} className="group" open={category === 'authority' || category === 'business'}>
                      <summary className="cursor-pointer flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-400 group-open:rotate-90 transition-transform">▶</span>
                          <span className="text-sm font-medium text-white">{categoryInfo.label}</span>
                          <span className="text-xs text-gray-500">({sources.length})</span>
                        </div>
                        <span className="text-xs text-gray-500">{categoryInfo.description}</span>
                      </summary>
                      <div className="mt-2 ml-4 space-y-2">
                        {sources.map(source => {
                          const status = getSeedSourceStatus(source.id);
                          const value = entityIdentity.existingSeedSources?.[source.id as keyof typeof entityIdentity.existingSeedSources];
                          const urlValue = typeof value === 'string' ? value : '';

                          return (
                            <div
                              key={source.id}
                              className="flex items-center gap-3 p-2 bg-gray-900/50 rounded border border-gray-800"
                            >
                              {/* Source Info */}
                              <div className="flex items-center gap-2 w-36">
                                <span>{source.icon}</span>
                                <span className="text-sm text-white truncate">{source.name}</span>
                              </div>

                              {/* Weight Badge */}
                              <div className="w-8">
                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                  source.kpWeight >= 8 ? 'bg-green-900/50 text-green-400' :
                                  source.kpWeight >= 6 ? 'bg-blue-900/50 text-blue-400' :
                                  'bg-gray-800 text-gray-400'
                                }`}>
                                  {source.kpWeight}
                                </span>
                              </div>

                              {/* Status Badge */}
                              <div className="w-20">
                                <span className={`text-xs px-2 py-1 rounded ${
                                  status === 'verified' ? 'bg-green-900/50 text-green-400' :
                                  status === 'claimed' ? 'bg-yellow-900/50 text-yellow-400' :
                                  'bg-gray-800 text-gray-500'
                                }`}>
                                  {status.toUpperCase()}
                                </span>
                              </div>

                              {/* Input / Checkbox */}
                              <div className="flex-1">
                                {source.id === 'googleBusinessProfile' ? (
                                  <label className="flex items-center gap-2 text-sm text-gray-300">
                                    <input
                                      type="checkbox"
                                      checked={!!value}
                                      onChange={(e) => handleSeedSourceChange(source.id, e.target.checked)}
                                      className="rounded border-gray-600 bg-gray-800"
                                    />
                                    Claimed
                                  </label>
                                ) : (
                                  <Input
                                    value={urlValue}
                                    onChange={(e) => handleSeedSourceChange(source.id, e.target.value)}
                                    placeholder="Enter URL..."
                                    className="text-xs h-7"
                                  />
                                )}
                              </div>

                              {/* Action Link */}
                              <div className="w-16 text-right">
                                {status === 'missing' ? (
                                  <a
                                    href={source.createUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-400 hover:text-blue-300"
                                  >
                                    Create →
                                  </a>
                                ) : urlValue ? (
                                  <a
                                    href={urlValue}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-400 hover:text-blue-300"
                                  >
                                    View →
                                  </a>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  );
                })}
              </div>
            </Card>

            {/* Section 3: KP-Contributing Statements */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">KP-Contributing Statements</h2>
                  <p className="text-sm text-gray-400">
                    Declarative statements generated from your EAVs that can be used for seed source profiles
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={handleExportStatements}
                  disabled={selectedStatements.size === 0}
                >
                  Export Selected ({selectedStatements.size})
                </Button>
              </div>

              {kpEligibleEavs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No KP-eligible EAVs found.</p>
                  <p className="text-xs mt-1">Flag EAVs as KP-contributing in the EAV Manager to see them here.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {kpEligibleEavs.map((eav, index) => {
                    const eavKey = `eav-${index}`;
                    return (
                      <div
                        key={eavKey}
                        className={`p-3 rounded border cursor-pointer transition-all ${
                          selectedStatements.has(eavKey)
                            ? 'bg-blue-900/30 border-blue-500'
                            : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                        }`}
                        onClick={() => toggleStatementSelection(eavKey)}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedStatements.has(eavKey)}
                            readOnly
                            className="mt-1"
                          />
                          <div>
                            <p className="text-sm text-white">
                              {eav.kpMetadata?.generatedStatement ||
                                `${eav.subject.label} ${eav.predicate.relation}: ${eav.object.value}`}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Consensus: {eav.kpMetadata?.consensusScore || 0}% |
                              Sources: {eav.kpMetadata?.seedSourcesConfirmed?.length || 0}/{eav.kpMetadata?.seedSourcesRequired?.length || 0}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KPStrategyPage;
