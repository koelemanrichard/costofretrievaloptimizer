import React from 'react';
import { Button } from '../ui/Button';
import { Label } from '../ui/Label';

export interface AnalyticsProperty {
  id: string;
  siteUrl: string;
  service: 'gsc' | 'ga4';
  permissionLevel?: string;
  displayName?: string;
}

interface AnalyticsPropertySelectorProps {
  properties: AnalyticsProperty[];
  selectedIds: string[];
  primaryId?: string;
  onSelect: (propertyId: string) => void;
  onDeselect: (propertyId: string) => void;
  onSetPrimary: (propertyId: string) => void;
  isLoading?: boolean;
}

export const AnalyticsPropertySelector: React.FC<AnalyticsPropertySelectorProps> = ({
  properties,
  selectedIds,
  primaryId,
  onSelect,
  onDeselect,
  onSetPrimary,
  isLoading,
}) => {
  const gscProperties = properties.filter(p => p.service === 'gsc');
  const ga4Properties = properties.filter(p => p.service === 'ga4');

  const renderPropertyList = (items: AnalyticsProperty[], serviceLabel: string) => {
    if (items.length === 0) {
      return <p className="text-sm text-gray-500">No {serviceLabel} properties found.</p>;
    }

    return (
      <div className="space-y-2">
        {items.map((prop) => {
          const isSelected = selectedIds.includes(prop.id);
          const isPrimary = prop.id === primaryId;

          return (
            <div
              key={prop.id}
              className={`flex items-center justify-between p-3 rounded-md border ${
                isSelected
                  ? 'bg-blue-900/20 border-blue-700'
                  : 'bg-gray-800 border-gray-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => isSelected ? onDeselect(prop.id) : onSelect(prop.id)}
                  className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-500"
                />
                <div>
                  <span className="text-sm text-gray-200 font-mono">
                    {prop.displayName || prop.siteUrl}
                  </span>
                  {prop.permissionLevel && (
                    <span className="ml-2 text-xs text-gray-500">{prop.permissionLevel}</span>
                  )}
                </div>
              </div>
              {isSelected && (
                <Button
                  type="button"
                  variant={isPrimary ? 'primary' : 'secondary'}
                  onClick={() => onSetPrimary(prop.id)}
                  className="text-xs !py-1 !px-2"
                >
                  {isPrimary ? 'Primary' : 'Set Primary'}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return <div className="text-sm text-gray-400">Loading properties...</div>;
  }

  return (
    <div className="space-y-6">
      {gscProperties.length > 0 && (
        <div>
          <Label>Search Console Properties</Label>
          {renderPropertyList(gscProperties, 'Search Console')}
        </div>
      )}
      {ga4Properties.length > 0 && (
        <div>
          <Label>Google Analytics 4 Properties</Label>
          {renderPropertyList(ga4Properties, 'GA4')}
        </div>
      )}
      {properties.length === 0 && (
        <p className="text-sm text-gray-500">
          No properties found. Connect a Google account first.
        </p>
      )}
    </div>
  );
};
