/**
 * Location Manager Modal Component
 * Provides UI for managing location entities for Local SEO template expansion
 */

import React, { useState, useMemo, useCallback } from 'react';
import type { LocationEntity } from '../../types';
import {
  getAllLocations,
  addLocation,
  removeLocation,
  clearLocations,
  buildLocationTree,
  prioritizeByPopulation,
  loadPresetLocations,
  importLocationsFromCSV,
  exportLocationsToCSV,
  LocationTreeNode,
  getLocationAliases,
  LOCATION_ALIASES,
} from '../../services/locationVariantService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface LocationManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationsChange?: () => void;
}

/**
 * Single location row in the list
 */
const LocationRow: React.FC<{
  location: LocationEntity;
  depth?: number;
  onRemove: (id: string) => void;
  showAliases?: boolean;
}> = ({ location, depth = 0, onRemove, showAliases = false }) => {
  const typeColors: Record<LocationEntity['type'], string> = {
    country: 'bg-purple-900/50 text-purple-300',
    region: 'bg-blue-900/50 text-blue-300',
    city: 'bg-green-900/50 text-green-300',
    neighborhood: 'bg-amber-900/50 text-amber-300',
    district: 'bg-teal-900/50 text-teal-300',
  };

  // Get aliases for this location
  const aliases = getLocationAliases(location.name);

  return (
    <div className="hover:bg-gray-800/50 rounded transition-colors">
      <div
        className="flex items-center justify-between p-2"
        style={{ paddingLeft: `${12 + depth * 20}px` }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {depth > 0 && (
            <span className="text-gray-600 text-sm">└</span>
          )}
          <span className="text-white text-sm truncate">{location.name}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${typeColors[location.type]}`}>
            {location.type}
          </span>
          {location.population && (
            <span className="text-[10px] text-gray-500">
              {(location.population / 1000).toFixed(0)}k
            </span>
          )}
          {aliases.length > 0 && (
            <span className="text-[10px] text-cyan-400" title={aliases.join(', ')}>
              +{aliases.length} aliases
            </span>
          )}
        </div>
        <button
          onClick={() => onRemove(location.id)}
          className="text-gray-500 hover:text-red-400 text-sm px-2"
          title="Remove location"
        >
          x
        </button>
      </div>
      {showAliases && aliases.length > 0 && (
        <div
          className="px-2 pb-2 flex flex-wrap gap-1"
          style={{ paddingLeft: `${32 + depth * 20}px` }}
        >
          {aliases.map((alias, i) => (
            <span
              key={i}
              className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-900/30 text-cyan-400 border border-cyan-700/30"
            >
              {alias}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Recursive tree node renderer
 */
const TreeNode: React.FC<{
  node: LocationTreeNode;
  depth?: number;
  onRemove: (id: string) => void;
}> = ({ node, depth = 0, onRemove }) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div>
      <div
        className="flex items-center justify-between p-2 hover:bg-gray-800/50 rounded transition-colors cursor-pointer"
        style={{ paddingLeft: `${12 + depth * 20}px` }}
        onClick={() => node.children.length > 0 && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {node.children.length > 0 && (
            <span className="text-gray-500 text-xs w-4">
              {expanded ? '▼' : '▶'}
            </span>
          )}
          {node.children.length === 0 && depth > 0 && (
            <span className="text-gray-600 text-sm w-4">└</span>
          )}
          <span className="text-white text-sm truncate">{node.location.name}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
            node.location.type === 'country' ? 'bg-purple-900/50 text-purple-300' :
            node.location.type === 'region' ? 'bg-blue-900/50 text-blue-300' :
            node.location.type === 'city' ? 'bg-green-900/50 text-green-300' :
            'bg-amber-900/50 text-amber-300'
          }`}>
            {node.location.type}
          </span>
          {node.children.length > 0 && (
            <span className="text-[10px] text-gray-500">
              ({node.children.length} children)
            </span>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(node.location.id); }}
          className="text-gray-500 hover:text-red-400 text-sm px-2"
          title="Remove location"
        >
          x
        </button>
      </div>
      {expanded && node.children.map(child => (
        <TreeNode
          key={child.location.id}
          node={child}
          depth={depth + 1}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
};

/**
 * Add location form
 */
const AddLocationForm: React.FC<{
  locations: LocationEntity[];
  onAdd: (location: Omit<LocationEntity, 'id'>) => void;
  onCancel: () => void;
}> = ({ locations, onAdd, onCancel }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<LocationEntity['type']>('city');
  const [population, setPopulation] = useState('');
  const [parentId, setParentId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAdd({
      name: name.trim(),
      type,
      population: population ? parseInt(population, 10) : undefined,
      parent_location_id: parentId || undefined,
    });

    setName('');
    setPopulation('');
  };

  // Filter parent options by hierarchy
  const parentOptions = useMemo(() => {
    const validParentTypes: Record<LocationEntity['type'], LocationEntity['type'][]> = {
      country: [],
      region: ['country'],
      city: ['region', 'country'],
      neighborhood: ['city', 'district'],
      district: ['city', 'region'],
    };

    return locations.filter(l => validParentTypes[type].includes(l.type));
  }, [locations, type]);

  return (
    <form onSubmit={handleSubmit} className="p-3 bg-gray-800 rounded-lg border border-gray-600 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-gray-400">Location Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Amsterdam"
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-400">Type</label>
          <select
            value={type}
            onChange={(e) => { setType(e.target.value as LocationEntity['type']); setParentId(''); }}
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="city">City</option>
            <option value="region">Region</option>
            <option value="district">District</option>
            <option value="neighborhood">Neighborhood</option>
            <option value="country">Country</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-gray-400">Population (optional)</label>
          <input
            type="number"
            value={population}
            onChange={(e) => setPopulation(e.target.value)}
            placeholder="e.g., 872680"
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-400">Parent Location</label>
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
            disabled={parentOptions.length === 0}
          >
            <option value="">None</option>
            {parentOptions.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button onClick={onCancel} variant="secondary" type="button" className="text-sm">
          Cancel
        </Button>
        <Button type="submit" variant="primary" className="text-sm">
          Add Location
        </Button>
      </div>
    </form>
  );
};

/**
 * Import/Export panel
 */
const ImportExportPanel: React.FC<{
  locations: LocationEntity[];
  onImport: (csv: string) => void;
  onClear: () => void;
}> = ({ locations, onImport, onClear }) => {
  const [csvInput, setCsvInput] = useState('');
  const [showImport, setShowImport] = useState(false);

  const handleExport = () => {
    const csv = exportLocationsToCSV(locations);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'locations.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    if (csvInput.trim()) {
      onImport(csvInput);
      setCsvInput('');
      setShowImport(false);
    }
  };

  return (
    <div className="space-y-3">
      {showImport ? (
        <div className="space-y-2">
          <textarea
            value={csvInput}
            onChange={(e) => setCsvInput(e.target.value)}
            placeholder="Paste CSV data here...&#10;name,type,population,lat,lng,parent_id&#10;Amsterdam,city,872680,52.37,4.90,"
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none font-mono min-h-[100px]"
          />
          <div className="flex gap-2">
            <Button onClick={handleImport} variant="primary" className="text-sm">
              Import CSV
            </Button>
            <Button onClick={() => setShowImport(false)} variant="secondary" className="text-sm">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setShowImport(true)} variant="secondary" className="text-xs">
            Import CSV
          </Button>
          <Button onClick={handleExport} variant="secondary" className="text-xs" disabled={locations.length === 0}>
            Export CSV
          </Button>
          <Button onClick={onClear} variant="secondary" className="text-xs text-red-400 hover:text-red-300" disabled={locations.length === 0}>
            Clear All
          </Button>
        </div>
      )}
    </div>
  );
};

/**
 * Preset loader
 */
const PresetLoader: React.FC<{
  onLoadPreset: (country: 'netherlands' | 'us' | 'uk') => void;
}> = ({ onLoadPreset }) => {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400">Load preset:</span>
      <button
        onClick={() => onLoadPreset('netherlands')}
        className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
      >
        Netherlands
      </button>
      <button
        onClick={() => onLoadPreset('us')}
        className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
      >
        US
      </button>
      <button
        onClick={() => onLoadPreset('uk')}
        className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
      >
        UK
      </button>
    </div>
  );
};

/**
 * Main Location Manager Modal
 */
export const LocationManagerModal: React.FC<LocationManagerModalProps> = ({
  isOpen,
  onClose,
  onLocationsChange,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('list');
  const [filter, setFilter] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [showAliases, setShowAliases] = useState(false);

  // Force refresh locations from store
  const locations = useMemo(() => getAllLocations(), [refreshKey]);

  const triggerRefresh = useCallback(() => {
    setRefreshKey(k => k + 1);
    onLocationsChange?.();
  }, [onLocationsChange]);

  // Filter locations
  const filteredLocations = useMemo(() => {
    if (!filter) return locations;
    const lower = filter.toLowerCase();
    return locations.filter(l =>
      l.name.toLowerCase().includes(lower) ||
      l.type.toLowerCase().includes(lower)
    );
  }, [locations, filter]);

  // Build tree for tree view
  const locationTree = useMemo(() => {
    return buildLocationTree(filteredLocations);
  }, [filteredLocations]);

  // Count locations with aliases
  const aliasStats = useMemo(() => {
    let locationsWithAliases = 0;
    let totalAliases = 0;
    locations.forEach(loc => {
      const aliases = getLocationAliases(loc.name);
      if (aliases.length > 0) {
        locationsWithAliases++;
        totalAliases += aliases.length;
      }
    });
    return { locationsWithAliases, totalAliases };
  }, [locations]);

  // Handlers
  const handleAddLocation = useCallback((loc: Omit<LocationEntity, 'id'>) => {
    addLocation(loc);
    setShowAddForm(false);
    triggerRefresh();
  }, [triggerRefresh]);

  const handleRemoveLocation = useCallback((id: string) => {
    removeLocation(id);
    triggerRefresh();
  }, [triggerRefresh]);

  const handleClearAll = useCallback(() => {
    if (confirm('Are you sure you want to remove all locations?')) {
      clearLocations();
      triggerRefresh();
    }
  }, [triggerRefresh]);

  const handleLoadPreset = useCallback((country: 'netherlands' | 'us' | 'uk') => {
    loadPresetLocations(country);
    triggerRefresh();
  }, [triggerRefresh]);

  const handleImportCSV = useCallback((csv: string) => {
    importLocationsFromCSV(csv, true);
    triggerRefresh();
  }, [triggerRefresh]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">Location Manager</h2>
            <div className="flex items-center gap-3 mt-0.5">
              <p className="text-xs text-gray-400">{locations.length} locations</p>
              {aliasStats.totalAliases > 0 && (
                <p className="text-xs text-cyan-400">
                  {aliasStats.locationsWithAliases} with aliases ({aliasStats.totalAliases} total)
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none hover:text-white">&times;</button>
        </header>

        <div className="p-4 border-b border-gray-700 space-y-3 flex-shrink-0">
          {/* Actions row */}
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button
                onClick={() => setShowAddForm(!showAddForm)}
                variant={showAddForm ? 'secondary' : 'primary'}
                className="text-sm"
              >
                {showAddForm ? 'Cancel' : '+ Add Location'}
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAliases}
                  onChange={(e) => setShowAliases(e.target.checked)}
                  className="rounded border-gray-600 w-3.5 h-3.5"
                />
                <span>Show aliases</span>
              </label>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`text-xs px-2 py-1 rounded ${viewMode === 'list' ? 'bg-blue-900/50 text-blue-300' : 'text-gray-400 hover:text-white'}`}
                >
                  List
                </button>
                <button
                  onClick={() => setViewMode('tree')}
                  className={`text-xs px-2 py-1 rounded ${viewMode === 'tree' ? 'bg-blue-900/50 text-blue-300' : 'text-gray-400 hover:text-white'}`}
                >
                  Tree
                </button>
              </div>
            </div>
          </div>

          {/* Presets and import/export */}
          <div className="flex justify-between items-center">
            <PresetLoader onLoadPreset={handleLoadPreset} />
            <ImportExportPanel
              locations={locations}
              onImport={handleImportCSV}
              onClear={handleClearAll}
            />
          </div>

          {/* Add form */}
          {showAddForm && (
            <AddLocationForm
              locations={locations}
              onAdd={handleAddLocation}
              onCancel={() => setShowAddForm(false)}
            />
          )}

          {/* Filter */}
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter locations..."
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filteredLocations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-sm">No locations added yet</p>
              <p className="text-xs mt-1">
                Add locations manually or load a preset to get started
              </p>
            </div>
          ) : viewMode === 'tree' ? (
            <div className="space-y-0.5">
              {locationTree.map(node => (
                <TreeNode
                  key={node.location.id}
                  node={node}
                  onRemove={handleRemoveLocation}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-0.5">
              {prioritizeByPopulation(filteredLocations).map(loc => (
                <LocationRow
                  key={loc.id}
                  location={loc}
                  onRemove={handleRemoveLocation}
                  showAliases={showAliases}
                />
              ))}
            </div>
          )}
        </div>

        <footer className="p-4 border-t border-gray-700 flex justify-end flex-shrink-0">
          <Button onClick={onClose} variant="secondary">
            Close
          </Button>
        </footer>
      </Card>
    </div>
  );
};

export default LocationManagerModal;
