import React from 'react';
import { Button } from '../ui/Button';
import { Label } from '../ui/Label';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SyncLogEntry {
  id: string;
  propertyId: string;
  syncType: 'full' | 'incremental';
  status: 'started' | 'completed' | 'failed';
  rowsSynced: number;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
}

export interface SyncableProperty {
  id: string;
  service: 'gsc' | 'ga4';
  propertyName: string;
  propertyId: string;
  syncEnabled: boolean;
  syncFrequency: 'hourly' | 'daily' | 'weekly';
  lastSyncedAt?: string;
  latestLog?: SyncLogEntry;
}

export interface AnalyticsSyncStatusProps {
  properties: SyncableProperty[];
  onSyncNow: (propertyId: string) => void;
  onChangeSyncFrequency: (propertyId: string, frequency: 'hourly' | 'daily' | 'weekly') => void;
  onToggleSync: (propertyId: string, enabled: boolean) => void;
  /** propertyId currently syncing */
  isSyncing?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns a human-readable relative time string for a given ISO date string.
 */
function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

/**
 * Determines the visual status for a property based on its sync state.
 */
function getSyncStatus(
  property: SyncableProperty,
): 'synced' | 'pending' | 'failed' {
  if (property.latestLog?.status === 'failed') return 'failed';
  if (property.latestLog?.status === 'started') return 'pending';
  if (!property.lastSyncedAt) return 'pending';
  return 'synced';
}

const STATUS_COLORS: Record<'synced' | 'pending' | 'failed', string> = {
  synced: 'bg-green-400',
  pending: 'bg-yellow-400',
  failed: 'bg-red-400',
};

const STATUS_LABELS: Record<'synced' | 'pending' | 'failed', string> = {
  synced: 'Synced',
  pending: 'Pending',
  failed: 'Failed',
};

const SERVICE_BADGE_CLASSES: Record<'gsc' | 'ga4', string> = {
  gsc: 'bg-blue-900 text-blue-300',
  ga4: 'bg-purple-900 text-purple-300',
};

const SERVICE_LABELS: Record<'gsc' | 'ga4', string> = {
  gsc: 'GSC',
  ga4: 'GA4',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const AnalyticsSyncStatus: React.FC<AnalyticsSyncStatusProps> = ({
  properties,
  onSyncNow,
  onChangeSyncFrequency,
  onToggleSync,
  isSyncing,
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-orange-400">Sync Status</h3>
      <p className="text-sm text-gray-400 -mt-3">
        Monitor and manage data synchronisation for linked analytics properties.
      </p>

      {properties.length === 0 ? (
        <div className="flex items-center gap-2 p-3 bg-gray-800 border border-gray-700 rounded-md">
          <span className="text-gray-500 text-sm">No properties linked</span>
        </div>
      ) : (
        <div className="space-y-3">
          {properties.map((property) => {
            const status = getSyncStatus(property);
            const currentlySyncing = isSyncing === property.id;

            return (
              <div
                key={property.id}
                className="p-3 bg-gray-800 border border-gray-700 rounded-md space-y-3"
              >
                {/* Row 1: Service badge, property name, status dot */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-medium px-1.5 py-0.5 rounded ${SERVICE_BADGE_CLASSES[property.service]}`}
                    >
                      {SERVICE_LABELS[property.service]}
                    </span>
                    <span className="text-gray-200 text-sm font-medium">
                      {property.propertyName}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      data-testid={`status-dot-${property.id}`}
                      className={`inline-block w-2.5 h-2.5 rounded-full ${STATUS_COLORS[status]}`}
                    />
                    <span
                      className={`text-xs ${
                        status === 'synced'
                          ? 'text-green-400'
                          : status === 'failed'
                          ? 'text-red-400'
                          : 'text-yellow-400'
                      }`}
                    >
                      {STATUS_LABELS[status]}
                    </span>
                  </div>
                </div>

                {/* Row 2: Last sync time + rows synced */}
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span>
                    Last sync:{' '}
                    {property.lastSyncedAt
                      ? timeAgo(property.lastSyncedAt)
                      : 'never'}
                  </span>
                  {property.latestLog &&
                    property.latestLog.status === 'completed' && (
                      <span>Rows synced: {property.latestLog.rowsSynced}</span>
                    )}
                </div>

                {/* Error message */}
                {property.latestLog?.status === 'failed' &&
                  property.latestLog.errorMessage && (
                    <div className="bg-red-900/20 border border-red-800 text-red-300 text-xs p-2 rounded">
                      {property.latestLog.errorMessage}
                    </div>
                  )}

                {/* Row 3: Controls */}
                <div className="flex items-center gap-3 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onSyncNow(property.id)}
                    disabled={currentlySyncing}
                    className="text-xs"
                  >
                    {currentlySyncing ? 'Syncing...' : 'Sync Now'}
                  </Button>

                  <div className="flex items-center gap-1.5">
                    <Label className="!mb-0 text-xs text-gray-400">
                      Frequency:
                    </Label>
                    <select
                      value={property.syncFrequency}
                      onChange={(e) =>
                        onChangeSyncFrequency(
                          property.id,
                          e.target.value as 'hourly' | 'daily' | 'weekly',
                        )
                      }
                      className="bg-gray-700 border border-gray-600 text-gray-200 text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    >
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer ml-auto">
                    <input
                      type="checkbox"
                      checked={property.syncEnabled}
                      onChange={(e) =>
                        onToggleSync(property.id, e.target.checked)
                      }
                      className="accent-orange-500"
                    />
                    Enabled
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
