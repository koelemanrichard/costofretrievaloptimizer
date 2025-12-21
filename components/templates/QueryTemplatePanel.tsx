/**
 * Query Template Panel Component
 * Provides UI for managing query templates and generating location-based topics
 * for LOCAL SEO scaling.
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { QueryTemplate, LocationEntity, ExpandedTemplateResult } from '../../types';
import { QUERY_TEMPLATES, ECOMMERCE_TEMPLATES, ALL_TEMPLATES, getEcommerceTemplates, generateEcommerceContentNetwork } from '../../config/queryTemplateLibrary';
import {
  parseTemplate,
  previewTemplateExpansion,
  createCustomTemplate,
  validateTemplatePattern,
  suggestTemplates,
  getTemplatesByPopularity,
  getTemplatesByOpportunity,
  getTemplatePopularity,
  formatSearchVolume,
  getVolumeTier,
  getVolumeTierColor,
  recordTemplateUsage,
  getUsageAnalytics,
  getUsageSummary,
  getSuggestedVariableValues,
} from '../../services/queryTemplateService';
import {
  getAllLocations,
  generateLocationVariants,
  prioritizeByPopulation,
  loadPresetLocations,
  clearLocations,
  generateVariantsWithAliases,
  getLocationAliases,
} from '../../services/locationVariantService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface QueryTemplatePanelProps {
  mapId: string;
  parentTopicId?: string;
  businessInfo?: { industry?: string; region?: string; websiteType?: string };
  onGenerateTopics: (result: ExpandedTemplateResult) => void;
  onOpenLocationManager: () => void;
  compact?: boolean;
}

// =============================================================================
// HELP PANEL - Explains Local SEO use case
// =============================================================================

const LocalSEOHelpPanel: React.FC<{
  onDismiss: () => void;
  dismissed: boolean;
}> = ({ onDismiss, dismissed }) => {
  if (dismissed) return null;

  return (
    <div className="p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg space-y-3">
      <div className="flex justify-between items-start">
        <h4 className="text-sm font-bold text-blue-300">When to Use Query Templates</h4>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-white text-xs"
        >
          Dismiss
        </button>
      </div>
      <p className="text-xs text-gray-300">
        Query Templates help you <strong>scale Local SEO</strong> by generating location-specific
        topic variations from a single pattern.
      </p>
      <div className="bg-black/30 rounded p-3 space-y-2">
        <p className="text-xs text-gray-400">Example:</p>
        <p className="text-sm font-mono text-cyan-300">Best [Service] in [City]</p>
        <p className="text-xs text-gray-400 mt-2">Generates:</p>
        <ul className="text-xs text-gray-300 space-y-1 ml-4 list-disc">
          <li>Best Plumber in Amsterdam</li>
          <li>Best Plumber in Rotterdam</li>
          <li>Best Plumber in Utrecht</li>
          <li>...and more</li>
        </ul>
      </div>
      <p className="text-[10px] text-gray-500">
        Perfect for service businesses targeting multiple cities or regions.
      </p>
    </div>
  );
};

// =============================================================================
// TEMPLATE SELECTOR (with popularity indicators)
// =============================================================================

const TemplateSelector: React.FC<{
  templates: QueryTemplate[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  suggestedIds?: string[];
  sortBy?: 'category' | 'popularity' | 'opportunity';
}> = ({ templates, selectedId, onSelect, suggestedIds = [], sortBy = 'category' }) => {
  const sortedTemplates = useMemo(() => {
    if (sortBy === 'popularity') {
      return getTemplatesByPopularity().filter(t => templates.some(tt => tt.id === t.id));
    }
    if (sortBy === 'opportunity') {
      return getTemplatesByOpportunity()
        .filter(t => templates.some(tt => tt.id === t.id))
        .map(t => templates.find(tt => tt.id === t.id)!)
        .filter(Boolean);
    }
    return templates;
  }, [templates, sortBy]);

  const groupedTemplates = useMemo(() => {
    if (sortBy !== 'category') {
      return { 'All Templates': sortedTemplates };
    }
    const groups: Record<string, QueryTemplate[]> = {};
    for (const template of sortedTemplates) {
      const category = template.category || 'other';
      if (!groups[category]) groups[category] = [];
      groups[category].push(template);
    }
    return groups;
  }, [sortedTemplates, sortBy]);

  return (
    <div className="space-y-2">
      <label className="block text-xs text-gray-400 font-bold uppercase">Select Template</label>
      <select
        value={selectedId || ''}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
      >
        <option value="">-- Choose a template --</option>
        {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
          <optgroup key={category} label={category.toUpperCase()}>
            {categoryTemplates.map(template => {
              const popularity = getTemplatePopularity(template.id);
              const volumeLabel = popularity
                ? ` [${formatSearchVolume(popularity.estimated_monthly_volume)}]`
                : '';
              return (
                <option key={template.id} value={template.id}>
                  {suggestedIds.includes(template.id) ? '★ ' : ''}
                  {template.name}{volumeLabel}
                </option>
              );
            })}
          </optgroup>
        ))}
      </select>
    </div>
  );
};

// =============================================================================
// POPULARITY INDICATOR
// =============================================================================

const PopularityIndicator: React.FC<{ templateId: string }> = ({ templateId }) => {
  const popularity = getTemplatePopularity(templateId);
  if (!popularity) return null;

  const tier = getVolumeTier(popularity.estimated_monthly_volume);
  const color = getVolumeTierColor(tier);
  const trendIcon = popularity.volume_trend === 'rising' ? '↑' :
                    popularity.volume_trend === 'declining' ? '↓' : '→';
  const competitionColors = {
    low: 'text-green-400',
    medium: 'text-amber-400',
    high: 'text-red-400',
  };

  return (
    <div className="flex items-center gap-3 p-2 bg-gray-800/50 rounded text-xs">
      <div className="flex items-center gap-1">
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="text-gray-300">
          {formatSearchVolume(popularity.estimated_monthly_volume)}/mo
        </span>
        <span className={popularity.volume_trend === 'rising' ? 'text-green-400' :
                        popularity.volume_trend === 'declining' ? 'text-red-400' : 'text-gray-500'}>
          {trendIcon}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-gray-500">Competition:</span>
        <span className={competitionColors[popularity.competition_level]}>
          {popularity.competition_level}
        </span>
      </div>
    </div>
  );
};

// =============================================================================
// USAGE ANALYTICS PANEL
// =============================================================================

const UsageAnalyticsPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const analytics = getUsageAnalytics();
  const summary = getUsageSummary();

  return (
    <div className="p-4 bg-gray-800 rounded-lg border border-gray-600 space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-bold text-white">Usage Analytics</h4>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-sm">×</button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-gray-900 rounded text-center">
          <p className="text-2xl font-bold text-blue-400">{summary.totalTemplatesUsed}</p>
          <p className="text-[10px] text-gray-500">Templates Used</p>
        </div>
        <div className="p-3 bg-gray-900 rounded text-center">
          <p className="text-2xl font-bold text-green-400">{summary.totalTopicsGenerated}</p>
          <p className="text-[10px] text-gray-500">Topics Generated</p>
        </div>
        <div className="p-3 bg-gray-900 rounded text-center">
          <p className="text-2xl font-bold text-amber-400">{summary.avgTopicsPerUse}</p>
          <p className="text-[10px] text-gray-500">Avg per Use</p>
        </div>
      </div>

      {/* Trend */}
      <div className="flex items-center gap-2 p-2 bg-gray-900 rounded">
        <span className="text-xs text-gray-400">Usage Trend:</span>
        <span className={`text-sm font-medium ${
          analytics.usage_trend === 'increasing' ? 'text-green-400' :
          analytics.usage_trend === 'decreasing' ? 'text-red-400' : 'text-gray-300'
        }`}>
          {analytics.usage_trend === 'increasing' ? '↑ Increasing' :
           analytics.usage_trend === 'decreasing' ? '↓ Decreasing' : '→ Stable'}
        </span>
      </div>

      {/* Most used */}
      {analytics.most_used_templates.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 font-bold">Most Used Templates</p>
          <div className="space-y-1">
            {analytics.most_used_templates.slice(0, 5).map((item, i) => {
              const template = ALL_TEMPLATES.find(t => t.id === item.template_id);
              return (
                <div key={item.template_id} className="flex justify-between items-center text-xs p-1">
                  <span className="text-gray-300">{i + 1}. {template?.name || item.template_id}</span>
                  <span className="text-blue-400">{item.uses} uses</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Suggested templates */}
      {analytics.suggested_templates.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 font-bold">Try These Templates</p>
          <div className="flex flex-wrap gap-1">
            {analytics.suggested_templates.slice(0, 3).map(t => (
              <span key={t.id} className="text-[10px] px-2 py-1 bg-blue-900/30 text-blue-300 rounded">
                {t.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// E-COMMERCE NETWORK GENERATOR
// =============================================================================

const EcommerceNetworkGenerator: React.FC<{
  mapId: string;
  parentTopicId?: string;
  onGenerate: (topics: Array<{ template: QueryTemplate; variables: Record<string, string>; level: number }>) => void;
  onClose: () => void;
}> = ({ mapId, parentTopicId, onGenerate, onClose }) => {
  const [category, setCategory] = useState('');
  const [brands, setBrands] = useState('');
  const [audiences, setAudiences] = useState('');
  const [materials, setMaterials] = useState('');
  const [useCases, setUseCases] = useState('');

  const handleGenerate = () => {
    if (!category.trim()) return;

    const network = generateEcommerceContentNetwork(category.trim(), {
      includeBrands: brands.split('\n').filter(Boolean).map(s => s.trim()),
      includeAudiences: audiences.split('\n').filter(Boolean).map(s => s.trim()),
      includeMaterials: materials.split('\n').filter(Boolean).map(s => s.trim()),
      includeUseCases: useCases.split('\n').filter(Boolean).map(s => s.trim()),
      year: new Date().getFullYear().toString(),
    });

    onGenerate(network);
  };

  const previewCount = useMemo(() => {
    if (!category.trim()) return 0;
    const brandCount = brands.split('\n').filter(Boolean).length;
    const audienceCount = audiences.split('\n').filter(Boolean).length;
    const materialCount = materials.split('\n').filter(Boolean).length;
    const useCaseCount = useCases.split('\n').filter(Boolean).length;
    // Base topics (pillar, types, year, size, cheap, luxury, care×2) = 8
    // + brands + audiences + materials + use cases
    return 8 + brandCount + audienceCount + materialCount + useCaseCount;
  }, [category, brands, audiences, materials, useCases]);

  return (
    <div className="p-4 bg-gray-800 rounded-lg border border-purple-700/50 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="text-sm font-bold text-purple-300">E-commerce Content Network</h4>
          <p className="text-[10px] text-gray-400">Generate complete product category coverage</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-sm">×</button>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Product Category *</label>
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="e.g., Running Shoes, Laptops, Coffee Machines"
          className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-purple-500 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-gray-400">Brands (one per line)</label>
          <textarea
            value={brands}
            onChange={(e) => setBrands(e.target.value)}
            placeholder="Nike&#10;Adidas&#10;New Balance"
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-xs focus:border-purple-500 focus:outline-none min-h-[60px] font-mono"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-400">Target Audiences</label>
          <textarea
            value={audiences}
            onChange={(e) => setAudiences(e.target.value)}
            placeholder="Beginners&#10;Professionals&#10;Women"
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-xs focus:border-purple-500 focus:outline-none min-h-[60px] font-mono"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-400">Materials</label>
          <textarea
            value={materials}
            onChange={(e) => setMaterials(e.target.value)}
            placeholder="Mesh&#10;Leather&#10;Gore-Tex"
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-xs focus:border-purple-500 focus:outline-none min-h-[60px] font-mono"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-400">Use Cases</label>
          <textarea
            value={useCases}
            onChange={(e) => setUseCases(e.target.value)}
            placeholder="Marathon&#10;Trail Running&#10;Daily Training"
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-xs focus:border-purple-500 focus:outline-none min-h-[60px] font-mono"
          />
        </div>
      </div>

      {category && (
        <div className="p-2 bg-purple-900/20 rounded text-xs text-purple-300">
          Will generate approximately <strong>{previewCount}</strong> topics across 7 hierarchy levels
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button onClick={onClose} variant="secondary" className="text-sm">
          Cancel
        </Button>
        <Button
          onClick={handleGenerate}
          variant="primary"
          disabled={!category.trim()}
          className="text-sm bg-purple-600 hover:bg-purple-500"
        >
          Generate Network
        </Button>
      </div>
    </div>
  );
};

// =============================================================================
// ALIAS OPTIONS
// =============================================================================

const AliasOptions: React.FC<{
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  aliasLimit: number;
  onLimitChange: (limit: number) => void;
  selectedLocations: string[];
}> = ({ enabled, onToggle, aliasLimit, onLimitChange, selectedLocations }) => {
  // Count total aliases that would be added
  const aliasCount = useMemo(() => {
    if (!enabled) return 0;
    return selectedLocations.reduce((count, locName) => {
      const aliases = getLocationAliases(locName);
      return count + Math.min(aliases.length, aliasLimit);
    }, 0);
  }, [enabled, selectedLocations, aliasLimit]);

  return (
    <div className="p-3 bg-amber-900/20 border border-amber-700/50 rounded space-y-2">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-amber-500 focus:ring-amber-500"
          />
          <span className="text-sm text-amber-300">Include Location Aliases</span>
        </label>
        {enabled && (
          <select
            value={aliasLimit}
            onChange={(e) => onLimitChange(parseInt(e.target.value))}
            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs"
          >
            <option value="1">1 alias per city</option>
            <option value="2">2 aliases per city</option>
            <option value="3">3 aliases per city</option>
            <option value="5">5 aliases per city</option>
          </select>
        )}
      </div>
      {enabled && (
        <p className="text-[10px] text-amber-400">
          Will add ~{aliasCount} alias variants (NYC → New York, HTown → Houston, etc.)
        </p>
      )}
    </div>
  );
};

// =============================================================================
// LOCATION CHECKBOX LIST (replaces multi-select dropdown)
// =============================================================================

const LocationCheckboxList: React.FC<{
  locations: LocationEntity[];
  selectedNames: string[];
  onSelectionChange: (names: string[]) => void;
  region?: string;
  onLoadPreset: (preset: 'netherlands' | 'us' | 'uk') => void;
}> = ({ locations, selectedNames, onSelectionChange, region, onLoadPreset }) => {
  const handleToggle = (name: string) => {
    if (selectedNames.includes(name)) {
      onSelectionChange(selectedNames.filter(n => n !== name));
    } else {
      onSelectionChange([...selectedNames, name]);
    }
  };

  const handleSelectAll = () => {
    onSelectionChange(locations.map(l => l.name));
  };

  const handleClear = () => {
    onSelectionChange([]);
  };

  const handleSelectTop10 = () => {
    const top10 = prioritizeByPopulation(locations, 10);
    onSelectionChange(top10.map(l => l.name));
  };

  // Detect suggested preset from region
  const suggestedPreset = useMemo(() => {
    if (!region) return null;
    const r = region.toLowerCase();
    if (r.includes('netherlands') || r.includes('nederland') || r.includes('dutch')) return 'netherlands';
    if (r.includes('united states') || r.includes('usa') || r.includes('america')) return 'us';
    if (r.includes('united kingdom') || r.includes('uk') || r.includes('britain') || r.includes('england')) return 'uk';
    return null;
  }, [region]);

  // If no locations, show empty state with preset loaders
  if (locations.length === 0) {
    return (
      <div className="p-4 bg-amber-900/20 border border-amber-700/50 rounded space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-amber-400">!</span>
          <p className="text-sm text-amber-300">No locations loaded</p>
        </div>
        <p className="text-xs text-gray-400">
          Load a preset or add locations manually to generate location-based topics.
        </p>
        {region && (
          <p className="text-xs text-gray-300">
            Your region: <strong>{region}</strong>
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {suggestedPreset && (
            <Button
              onClick={() => onLoadPreset(suggestedPreset)}
              variant="primary"
              className="text-xs"
            >
              Load {suggestedPreset === 'netherlands' ? 'Netherlands' : suggestedPreset === 'us' ? 'US' : 'UK'} Cities (Recommended)
            </Button>
          )}
          <Button onClick={() => onLoadPreset('netherlands')} variant="secondary" className="text-xs">
            Netherlands
          </Button>
          <Button onClick={() => onLoadPreset('us')} variant="secondary" className="text-xs">
            United States
          </Button>
          <Button onClick={() => onLoadPreset('uk')} variant="secondary" className="text-xs">
            United Kingdom
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm text-gray-300">
          City <span className="text-[10px] text-gray-500">({selectedNames.length} selected)</span>
        </label>
        <div className="flex gap-1">
          <button
            onClick={handleSelectAll}
            className="text-[10px] text-blue-400 hover:text-blue-300 px-2 py-0.5 rounded bg-blue-900/30"
          >
            All
          </button>
          <button
            onClick={handleSelectTop10}
            className="text-[10px] text-blue-400 hover:text-blue-300 px-2 py-0.5 rounded bg-blue-900/30"
          >
            Top 10
          </button>
          <button
            onClick={handleClear}
            className="text-[10px] text-gray-400 hover:text-gray-300 px-2 py-0.5 rounded bg-gray-800"
          >
            Clear
          </button>
        </div>
      </div>
      <div className="bg-gray-800 border border-gray-600 rounded max-h-[200px] overflow-y-auto">
        {locations.map(loc => (
          <label
            key={loc.id}
            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-700/50 cursor-pointer border-b border-gray-700/50 last:border-0"
          >
            <input
              type="checkbox"
              checked={selectedNames.includes(loc.name)}
              onChange={() => handleToggle(loc.name)}
              className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
            />
            <span className="text-sm text-gray-300 flex-1">{loc.name}</span>
            {loc.population && (
              <span className="text-[10px] text-gray-500">
                {(loc.population / 1000).toFixed(0)}k
              </span>
            )}
          </label>
        ))}
      </div>
    </div>
  );
};

// =============================================================================
// SERVICE INPUT (with better UX)
// =============================================================================

const ServiceInput: React.FC<{
  placeholder: string;
  values: string[];
  onChange: (values: string[]) => void;
  exampleValues?: string[];
}> = ({ placeholder, values, onChange, exampleValues }) => {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <label className="text-sm text-gray-300">{placeholder}</label>
        <span className="text-[10px] text-gray-500">Service</span>
      </div>
      <textarea
        value={values.join('\n')}
        onChange={(e) => {
          const newValues = e.target.value.split('\n').filter(v => v.trim());
          onChange(newValues);
        }}
        placeholder={`Enter ${placeholder.toLowerCase()} values (one per line)\n\nExamples:\n${exampleValues?.slice(0, 3).join('\n') || 'Plumber\nElectrician\nHVAC Repair'}`}
        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none min-h-[100px] font-mono"
      />
      <p className="text-[10px] text-gray-500">
        Enter one service per line. Each service will be combined with each location.
      </p>
    </div>
  );
};

// =============================================================================
// VARIABLE INPUTS (improved)
// =============================================================================

const VariableInputs: React.FC<{
  template: QueryTemplate;
  variables: Record<string, string[]>;
  locations: LocationEntity[];
  region?: string;
  onVariableChange: (name: string, values: string[]) => void;
  onLoadPreset: (preset: 'netherlands' | 'us' | 'uk') => void;
}> = ({ template, variables, locations, region, onVariableChange, onLoadPreset }) => {
  return (
    <div className="space-y-4">
      <label className="block text-xs text-gray-400 font-bold uppercase">Template Variables</label>
      {template.placeholders.map(placeholder => {
        const isLocation = ['City', 'Region', 'Neighborhood', 'AdministrativeArea'].includes(placeholder.entity_type) ||
          placeholder.name.toLowerCase().includes('city') ||
          placeholder.name.toLowerCase().includes('location');

        if (isLocation) {
          return (
            <LocationCheckboxList
              key={placeholder.name}
              locations={locations}
              selectedNames={variables[placeholder.name] || []}
              onSelectionChange={(names) => onVariableChange(placeholder.name, names)}
              region={region}
              onLoadPreset={onLoadPreset}
            />
          );
        }

        return (
          <ServiceInput
            key={placeholder.name}
            placeholder={placeholder.name}
            values={variables[placeholder.name] || []}
            onChange={(values) => onVariableChange(placeholder.name, values)}
            exampleValues={placeholder.example_values}
          />
        );
      })}
    </div>
  );
};

// =============================================================================
// PREVIEW
// =============================================================================

const QueryPreview: React.FC<{
  queries: string[];
  maxDisplay?: number;
}> = ({ queries, maxDisplay = 10 }) => {
  const [showAll, setShowAll] = useState(false);
  const displayedQueries = showAll ? queries : queries.slice(0, maxDisplay);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="block text-xs text-gray-400 font-bold uppercase">Preview ({queries.length} topics)</label>
        {queries.length > maxDisplay && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            {showAll ? 'Show less' : `Show all ${queries.length}`}
          </button>
        )}
      </div>
      <div className="bg-gray-800 rounded border border-gray-700 max-h-[200px] overflow-y-auto">
        {displayedQueries.length > 0 ? (
          <ul className="divide-y divide-gray-700">
            {displayedQueries.map((query, i) => (
              <li key={i} className="px-3 py-2 text-sm text-gray-300">
                {query}
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-3 py-4 text-sm text-gray-500 text-center">
            Select services and locations to preview generated topics
          </p>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// CUSTOM TEMPLATE CREATOR
// =============================================================================

const CustomTemplateCreator: React.FC<{
  onCreateTemplate: (template: QueryTemplate) => void;
  onCancel: () => void;
}> = ({ onCreateTemplate, onCancel }) => {
  const [name, setName] = useState('');
  const [pattern, setPattern] = useState('');
  const [searchIntent, setSearchIntent] = useState<QueryTemplate['search_intent']>('informational');
  const [errors, setErrors] = useState<string[]>([]);

  const handleCreate = () => {
    const validation = validateTemplatePattern(pattern);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    if (!name.trim()) {
      setErrors(['Template name is required']);
      return;
    }

    const template = createCustomTemplate(name, pattern, '', searchIntent);
    onCreateTemplate(template);
  };

  return (
    <div className="p-4 bg-gray-800 rounded-lg border border-gray-600 space-y-4">
      <h4 className="text-sm font-bold text-white">Create Custom Template</h4>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Template Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Local Service Query"
          className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Pattern (use [Placeholder] syntax)</label>
        <input
          type="text"
          value={pattern}
          onChange={(e) => { setPattern(e.target.value); setErrors([]); }}
          placeholder="e.g., Best [Service] in [City]"
          className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none font-mono"
        />
        <p className="text-[10px] text-gray-500">
          Detected placeholders: {parseTemplate(pattern).map(p => p.name).join(', ') || 'none'}
        </p>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Search Intent</label>
        <select
          value={searchIntent}
          onChange={(e) => setSearchIntent(e.target.value as QueryTemplate['search_intent'])}
          className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="informational">Informational</option>
          <option value="transactional">Transactional</option>
          <option value="commercial">Commercial</option>
          <option value="navigational">Navigational</option>
        </select>
      </div>

      {errors.length > 0 && (
        <div className="p-2 bg-red-900/30 border border-red-700 rounded text-xs text-red-300">
          {errors.map((err, i) => <p key={i}>{err}</p>)}
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <Button onClick={onCancel} variant="secondary" className="text-sm">
          Cancel
        </Button>
        <Button onClick={handleCreate} variant="primary" className="text-sm">
          Create Template
        </Button>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const QueryTemplatePanel: React.FC<QueryTemplatePanelProps> = ({
  mapId,
  parentTopicId,
  businessInfo,
  onGenerateTopics,
  onOpenLocationManager,
  compact = false,
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [variables, setVariables] = useState<Record<string, string[]>>({});
  const [showCustomCreator, setShowCustomCreator] = useState(false);
  const [customTemplates, setCustomTemplates] = useState<QueryTemplate[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [helpDismissed, setHelpDismissed] = useState(false);
  const [locationVersion, setLocationVersion] = useState(0); // Force re-render when locations change

  // New state for enhanced features
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showEcommerceGenerator, setShowEcommerceGenerator] = useState(false);
  const [sortBy, setSortBy] = useState<'category' | 'popularity' | 'opportunity'>('category');
  const [includeAliases, setIncludeAliases] = useState(false);
  const [aliasLimit, setAliasLimit] = useState(2);

  // Get all templates including custom ones and e-commerce
  const allTemplates = useMemo(() => {
    return [...QUERY_TEMPLATES, ...ECOMMERCE_TEMPLATES, ...customTemplates];
  }, [customTemplates]);

  // Get suggested templates based on business context
  const suggestedTemplateIds = useMemo(() => {
    if (!businessInfo) return [];
    return suggestTemplates(businessInfo).map(t => t.id);
  }, [businessInfo]);

  // Get locations from store (reactive to locationVersion)
  const locations = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _ = locationVersion; // Trigger re-computation
    const all = getAllLocations();
    return prioritizeByPopulation(all);
  }, [locationVersion]);

  // Selected template
  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId) return null;
    return allTemplates.find(t => t.id === selectedTemplateId) || null;
  }, [selectedTemplateId, allTemplates]);

  // Generate preview queries
  const previewQueries = useMemo(() => {
    if (!selectedTemplate) return [];

    // Build variable options for preview
    const varOptions: Record<string, string[]> = {};
    for (const placeholder of selectedTemplate.placeholders) {
      varOptions[placeholder.name] = variables[placeholder.name] || [];
    }

    return previewTemplateExpansion(selectedTemplate.id, varOptions, 50);
  }, [selectedTemplate, variables]);

  // Handle variable change
  const handleVariableChange = useCallback((name: string, values: string[]) => {
    setVariables(prev => ({ ...prev, [name]: values }));
  }, []);

  // Handle loading preset locations
  const handleLoadPreset = useCallback((preset: 'netherlands' | 'us' | 'uk') => {
    clearLocations();
    loadPresetLocations(preset);
    setLocationVersion(v => v + 1);
  }, []);

  // Handle custom template creation
  const handleCreateCustomTemplate = useCallback((template: QueryTemplate) => {
    setCustomTemplates(prev => [...prev, template]);
    setSelectedTemplateId(template.id);
    setShowCustomCreator(false);
  }, []);

  // Handle topic generation
  const handleGenerate = useCallback(async () => {
    if (!selectedTemplate || previewQueries.length === 0) return;

    setIsGenerating(true);
    try {
      // Get selected locations
      const locationPlaceholder = selectedTemplate.placeholders.find(p =>
        ['City', 'Region', 'Neighborhood'].includes(p.entity_type) ||
        p.name.toLowerCase().includes('city')
      );

      const selectedLocNames = locationPlaceholder
        ? variables[locationPlaceholder.name] || []
        : [];

      const selectedLocations = locations.filter(l =>
        selectedLocNames.includes(l.name)
      );

      const locationsToUse = selectedLocations.length === 0 && locations.length > 0
        ? locations.slice(0, 50)
        : selectedLocations;

      let result;

      // Use alias-enhanced generation if enabled
      if (includeAliases && locationsToUse.length > 0) {
        result = generateVariantsWithAliases(
          selectedTemplate,
          locationsToUse,
          mapId,
          parentTopicId,
          {
            maxVariants: 100,
            includeAliases: true,
            aliasLimit: aliasLimit,
          }
        );
      } else {
        result = generateLocationVariants(
          selectedTemplate,
          locationsToUse,
          mapId,
          parentTopicId
        );
      }

      // Record usage for analytics
      recordTemplateUsage(
        selectedTemplate.id,
        mapId,
        { locations: locationsToUse.map(l => l.name).join(', ') },
        result.generated_topics.length
      );

      onGenerateTopics(result);
    } finally {
      setIsGenerating(false);
    }
  }, [selectedTemplate, locations, variables, mapId, parentTopicId, onGenerateTopics, previewQueries.length, includeAliases, aliasLimit]);

  // Compact mode for inline use
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <select
          value={selectedTemplateId || ''}
          onChange={(e) => setSelectedTemplateId(e.target.value)}
          className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:border-blue-500 focus:outline-none"
        >
          <option value="">Template...</option>
          {allTemplates.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <Button
          onClick={handleGenerate}
          variant="secondary"
          disabled={!selectedTemplate || isGenerating}
          className="text-xs"
        >
          {isGenerating ? 'Generating...' : 'Generate'}
        </Button>
      </div>
    );
  }

  // Get selected location names for alias count
  const selectedLocationNames = useMemo(() => {
    const locationPlaceholder = selectedTemplate?.placeholders.find(p =>
      ['City', 'Region', 'Neighborhood'].includes(p.entity_type) ||
      p.name.toLowerCase().includes('city')
    );
    return locationPlaceholder ? (variables[locationPlaceholder.name] || []) : [];
  }, [selectedTemplate, variables]);

  return (
    <Card className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-white">Query Templates</h3>
          <p className="text-xs text-gray-400">
            Generate location-based topics for <strong>Local SEO</strong> scaling
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={onOpenLocationManager}
            variant="secondary"
            className="text-xs"
          >
            Locations ({locations.length})
          </Button>
          <Button
            onClick={() => setShowEcommerceGenerator(!showEcommerceGenerator)}
            variant="secondary"
            className="text-xs text-purple-300 border-purple-700"
          >
            {showEcommerceGenerator ? 'Cancel' : 'E-commerce'}
          </Button>
          <Button
            onClick={() => setShowAnalytics(!showAnalytics)}
            variant="secondary"
            className="text-xs"
          >
            {showAnalytics ? 'Close' : 'Analytics'}
          </Button>
          <Button
            onClick={() => setShowCustomCreator(!showCustomCreator)}
            variant="secondary"
            className="text-xs"
          >
            {showCustomCreator ? 'Cancel' : '+ Custom'}
          </Button>
        </div>
      </div>

      {/* Analytics Panel */}
      {showAnalytics && (
        <UsageAnalyticsPanel onClose={() => setShowAnalytics(false)} />
      )}

      {/* E-commerce Network Generator */}
      {showEcommerceGenerator && (
        <EcommerceNetworkGenerator
          mapId={mapId}
          parentTopicId={parentTopicId}
          onGenerate={(network) => {
            // Convert network to ExpandedTemplateResult format
            const topics = network.map(item => {
              let query = item.template.pattern;
              for (const [key, value] of Object.entries(item.variables)) {
                query = query.replace(`[${key}]`, value);
              }
              return {
                id: `ecom-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                map_id: mapId,
                parent_topic_id: parentTopicId || null,
                title: query,
                slug: query.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                description: item.template.description,
                type: 'outer' as const,
                topic_class: item.template.suggested_topic_class || 'informational',
                metadata: {
                  generated_from_template: item.template.id,
                  template_variables: item.variables,
                  hierarchy_level: item.level,
                },
              };
            });

            onGenerateTopics({
              original_template: network[0]?.template || ECOMMERCE_TEMPLATES[0],
              variable_combinations: network.map(n => n.variables),
              generated_queries: topics.map(t => t.title),
              generated_topics: topics,
              parent_topic_id: parentTopicId,
            });

            setShowEcommerceGenerator(false);
          }}
          onClose={() => setShowEcommerceGenerator(false)}
        />
      )}

      {/* Help Panel */}
      <LocalSEOHelpPanel
        dismissed={helpDismissed}
        onDismiss={() => setHelpDismissed(true)}
      />

      {showCustomCreator ? (
        <CustomTemplateCreator
          onCreateTemplate={handleCreateCustomTemplate}
          onCancel={() => setShowCustomCreator(false)}
        />
      ) : (
        <>
          {/* Sort options */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Sort by:</span>
            {(['category', 'popularity', 'opportunity'] as const).map(opt => (
              <button
                key={opt}
                onClick={() => setSortBy(opt)}
                className={`text-xs px-2 py-1 rounded ${
                  sortBy === opt
                    ? 'bg-blue-900/50 text-blue-300'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {opt === 'category' ? 'Category' :
                 opt === 'popularity' ? 'Volume' : 'Opportunity'}
              </button>
            ))}
          </div>

          <TemplateSelector
            templates={allTemplates}
            selectedId={selectedTemplateId}
            onSelect={setSelectedTemplateId}
            suggestedIds={suggestedTemplateIds}
            sortBy={sortBy}
          />

          {selectedTemplate && (
            <>
              <div className="p-3 bg-gray-800/50 rounded border border-gray-700 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-white font-medium">{selectedTemplate.name}</p>
                    <p className="text-xs text-gray-400">{selectedTemplate.description}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded ${
                    selectedTemplate.search_intent === 'transactional' ? 'bg-green-900/50 text-green-300' :
                    selectedTemplate.search_intent === 'commercial' ? 'bg-amber-900/50 text-amber-300' :
                    'bg-blue-900/50 text-blue-300'
                  }`}>
                    {selectedTemplate.search_intent}
                  </span>
                </div>
                <p className="font-mono text-sm text-cyan-300 bg-black/30 px-2 py-1 rounded">
                  {selectedTemplate.pattern}
                </p>
                <PopularityIndicator templateId={selectedTemplate.id} />
              </div>

              <VariableInputs
                template={selectedTemplate}
                variables={variables}
                locations={locations}
                region={businessInfo?.region}
                onVariableChange={handleVariableChange}
                onLoadPreset={handleLoadPreset}
              />

              {/* Alias options - show if there are location placeholders */}
              {selectedTemplate.placeholders.some(p =>
                ['City', 'Region', 'Neighborhood'].includes(p.entity_type) ||
                p.name.toLowerCase().includes('city')
              ) && locations.length > 0 && (
                <AliasOptions
                  enabled={includeAliases}
                  onToggle={setIncludeAliases}
                  aliasLimit={aliasLimit}
                  onLimitChange={setAliasLimit}
                  selectedLocations={selectedLocationNames}
                />
              )}

              <QueryPreview queries={previewQueries} />

              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => {
                    setSelectedTemplateId(null);
                    setVariables({});
                  }}
                  variant="secondary"
                >
                  Clear
                </Button>
                <Button
                  onClick={handleGenerate}
                  variant="primary"
                  disabled={isGenerating || previewQueries.length === 0}
                >
                  {isGenerating ? 'Generating...' : `Generate ${previewQueries.length} Topics`}
                </Button>
              </div>
            </>
          )}

          {!selectedTemplate && (
            <div className="p-8 text-center text-gray-500">
              <p className="text-sm">Select a template to get started</p>
              <p className="text-xs mt-1">
                Templates help you scale Local SEO by generating location-specific topics
              </p>
            </div>
          )}
        </>
      )}
    </Card>
  );
};

export default QueryTemplatePanel;
