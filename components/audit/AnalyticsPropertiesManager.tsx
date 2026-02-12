import React, { useState, useCallback } from 'react';
import { Button } from '../ui/Button';
import { Label } from '../ui/Label';
import { Select } from '../ui/Select';

export interface LinkedProperty {
  id: string;
  service: 'gsc' | 'ga4';
  propertyId: string;
  propertyName: string;
  isPrimary: boolean;
  syncEnabled: boolean;
  syncFrequency: 'hourly' | 'daily' | 'weekly';
  lastSyncedAt?: string;
}

interface AvailableProperty {
  id: string;
  service: 'gsc' | 'ga4';
  displayName: string;
}

interface AnalyticsPropertiesManagerProps {
  linkedProperties: LinkedProperty[];
  availableGscProperties: AvailableProperty[];
  availableGa4Properties: AvailableProperty[];
  onLink: (propertyId: string, service: 'gsc' | 'ga4') => void;
  onUnlink: (linkedPropertyId: string) => void;
  onSetPrimary: (linkedPropertyId: string) => void;
  onToggleSync: (linkedPropertyId: string, enabled: boolean) => void;
  onChangeSyncFrequency: (linkedPropertyId: string, frequency: 'hourly' | 'daily' | 'weekly') => void;
}

export const AnalyticsPropertiesManager: React.FC<AnalyticsPropertiesManagerProps> = ({
  linkedProperties,
  availableGscProperties,
  availableGa4Properties,
  onLink,
  onUnlink,
  onSetPrimary,
  onToggleSync,
  onChangeSyncFrequency,
}) => {
  const [selectedGsc, setSelectedGsc] = useState('');
  const [selectedGa4, setSelectedGa4] = useState('');

  const gscLinked = linkedProperties.filter(p => p.service === 'gsc');
  const ga4Linked = linkedProperties.filter(p => p.service === 'ga4');

  const handleLinkGsc = useCallback(() => {
    if (selectedGsc) {
      onLink(selectedGsc, 'gsc');
      setSelectedGsc('');
    }
  }, [selectedGsc, onLink]);

  const handleLinkGa4 = useCallback(() => {
    if (selectedGa4) {
      onLink(selectedGa4, 'ga4');
      setSelectedGa4('');
    }
  }, [selectedGa4, onLink]);

  const renderLinkedList = (items: LinkedProperty[]) => {
    if (items.length === 0) {
      return <p className="text-sm text-gray-500 py-2">No properties linked yet.</p>;
    }

    return (
      <div className="space-y-2">
        {items.map((prop) => (
          <div key={prop.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-md border border-gray-700">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-200">{prop.propertyName || prop.propertyId}</span>
                {prop.isPrimary && (
                  <span className="text-xs bg-blue-900 text-blue-300 px-1.5 py-0.5 rounded">Primary</span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <label className="flex items-center gap-1.5 text-xs text-gray-400">
                  <input
                    type="checkbox"
                    checked={prop.syncEnabled}
                    onChange={(e) => onToggleSync(prop.id, e.target.checked)}
                    className="h-3 w-3 rounded border-gray-600"
                  />
                  Sync
                </label>
                {prop.syncEnabled && (
                  <select
                    value={prop.syncFrequency}
                    onChange={(e) => onChangeSyncFrequency(prop.id, e.target.value as 'hourly' | 'daily' | 'weekly')}
                    className="text-xs bg-gray-700 text-gray-300 border-none rounded px-1 py-0.5"
                  >
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                )}
                {prop.lastSyncedAt && (
                  <span className="text-xs text-gray-500">
                    Last: {new Date(prop.lastSyncedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!prop.isPrimary && (
                <Button type="button" variant="secondary" onClick={() => onSetPrimary(prop.id)} className="text-xs !py-1 !px-2">
                  Set Primary
                </Button>
              )}
              <Button type="button" variant="secondary" onClick={() => onUnlink(prop.id)} className="text-xs !py-1 !px-2 text-red-400">
                Unlink
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <Label>Search Console Properties</Label>
        {renderLinkedList(gscLinked)}
        <div className="flex items-center gap-2 mt-2">
          <Select
            value={selectedGsc}
            onChange={(e) => setSelectedGsc(e.target.value)}
            className="flex-1 text-sm"
          >
            <option value="">Select a GSC property...</option>
            {availableGscProperties.map(p => (
              <option key={p.id} value={p.id}>{p.displayName}</option>
            ))}
          </Select>
          <Button type="button" variant="secondary" onClick={handleLinkGsc} disabled={!selectedGsc} className="text-sm">
            Link
          </Button>
        </div>
      </div>

      <div>
        <Label>Google Analytics 4 Properties</Label>
        {renderLinkedList(ga4Linked)}
        <div className="flex items-center gap-2 mt-2">
          <Select
            value={selectedGa4}
            onChange={(e) => setSelectedGa4(e.target.value)}
            className="flex-1 text-sm"
          >
            <option value="">Select a GA4 property...</option>
            {availableGa4Properties.map(p => (
              <option key={p.id} value={p.id}>{p.displayName}</option>
            ))}
          </Select>
          <Button type="button" variant="secondary" onClick={handleLinkGa4} disabled={!selectedGa4} className="text-sm">
            Link
          </Button>
        </div>
      </div>
    </div>
  );
};
