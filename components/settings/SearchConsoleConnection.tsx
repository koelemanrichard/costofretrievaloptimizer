import React, { useState, useCallback } from 'react';
import { Button } from '../ui/Button';
import { Label } from '../ui/Label';

interface SearchConsoleConnectionProps {
  supabaseUrl: string;
  connectedEmail?: string;
  connectedProperties?: { siteUrl: string; permissionLevel: string }[];
  onConnect: () => void;
  onDisconnect: () => void;
}

export const SearchConsoleConnection: React.FC<SearchConsoleConnectionProps> = ({
  supabaseUrl,
  connectedEmail,
  connectedProperties,
  onConnect,
  onDisconnect,
}) => {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = useCallback(() => {
    setIsConnecting(true);
    onConnect();
    // The OAuth flow opens in a new window/redirect, so we just trigger it
    setTimeout(() => setIsConnecting(false), 3000);
  }, [onConnect]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-orange-400">Google Search Console</h3>
      <p className="text-sm text-gray-400 -mt-3">
        Connect your Search Console to enable performance tracking and audit correlations.
      </p>

      {connectedEmail ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-green-900/20 border border-green-800 rounded-md">
            <span className="text-green-400 text-sm font-medium">Connected</span>
            <span className="text-gray-300 text-sm">{connectedEmail}</span>
          </div>

          {connectedProperties && connectedProperties.length > 0 && (
            <div className="space-y-1">
              <Label>Available Properties</Label>
              <div className="space-y-1">
                {connectedProperties.map((prop) => (
                  <div key={prop.siteUrl} className="flex items-center justify-between p-2 bg-gray-800 rounded text-sm">
                    <span className="text-gray-300 font-mono text-xs">{prop.siteUrl}</span>
                    <span className="text-gray-500 text-xs">{prop.permissionLevel}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button type="button" variant="secondary" onClick={onDisconnect} className="text-sm">
            Disconnect
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-gray-800 border border-gray-700 rounded-md">
            <span className="text-gray-500 text-sm">Not connected</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="primary"
              onClick={handleConnect}
              disabled={isConnecting}
              className="text-sm"
            >
              {isConnecting ? 'Connecting...' : 'Connect Google Search Console'}
            </Button>
            <span className="text-xs text-gray-500">Or import CSV manually in the audit panel</span>
          </div>
        </div>
      )}
    </div>
  );
};
