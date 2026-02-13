import React, { useState, useEffect } from 'react';
import { getMapSizeAdvisory, type AdvisoryLevel } from '../../utils/mapSizeAdvisory';

interface MapSizeWarningProps {
  topicCount: number;
  mapId: string;
}

const LEVEL_STYLES: Record<AdvisoryLevel, string> = {
  info: 'bg-blue-900/60 border-blue-700 text-blue-200',
  warning: 'bg-yellow-900/60 border-yellow-700 text-yellow-200',
  critical: 'bg-red-900/60 border-red-700 text-red-200',
};

const DISMISS_KEY_PREFIX = 'mapSizeWarningDismissed_';

export const MapSizeWarning: React.FC<MapSizeWarningProps> = ({ topicCount, mapId }) => {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const key = `${DISMISS_KEY_PREFIX}${mapId}`;
    setDismissed(localStorage.getItem(key) === 'true');
  }, [mapId]);

  const advisory = getMapSizeAdvisory(topicCount);
  if (!advisory || dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(`${DISMISS_KEY_PREFIX}${mapId}`, 'true');
    setDismissed(true);
  };

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${LEVEL_STYLES[advisory.level]} mb-4`}>
      <span className="shrink-0 mt-0.5 text-lg">
        {advisory.level === 'critical' ? '\u26A0' : advisory.level === 'warning' ? '\u26A0' : '\u2139'}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{advisory.message}</p>
        <p className="text-xs mt-1 opacity-80">{advisory.suggestion}</p>
      </div>
      <button
        onClick={handleDismiss}
        className="shrink-0 text-current opacity-60 hover:opacity-100 transition-opacity text-lg leading-none"
        aria-label="Dismiss warning"
      >
        &times;
      </button>
    </div>
  );
};
