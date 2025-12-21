// components/insights/widgets/AlertBanner.tsx
// Alert banners and notification components

import React from 'react';
import type { Alert } from '../../../types/insights';

interface AlertBannerProps {
  alert: Alert;
  onAction?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  alert,
  onAction,
  onDismiss,
  className = '',
}) => {
  const severityConfig = {
    critical: {
      bg: 'bg-red-900/30',
      border: 'border-red-700/50',
      icon: 'text-red-400',
      title: 'text-red-300',
    },
    high: {
      bg: 'bg-orange-900/30',
      border: 'border-orange-700/50',
      icon: 'text-orange-400',
      title: 'text-orange-300',
    },
    medium: {
      bg: 'bg-yellow-900/30',
      border: 'border-yellow-700/50',
      icon: 'text-yellow-400',
      title: 'text-yellow-300',
    },
    low: {
      bg: 'bg-blue-900/30',
      border: 'border-blue-700/50',
      icon: 'text-blue-400',
      title: 'text-blue-300',
    },
  };

  const config = severityConfig[alert.severity];

  const icons = {
    critical: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    high: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4m0 4h.01" />
      </svg>
    ),
    medium: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4m0-4h.01" />
      </svg>
    ),
    low: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v8m-4-4h8" />
      </svg>
    ),
  };

  return (
    <div className={`${config.bg} ${config.border} border rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <span className={config.icon}>{icons[alert.severity]}</span>
        <div className="flex-1 min-w-0">
          <h4 className={`font-medium ${config.title}`}>{alert.title}</h4>
          <p className="text-sm text-gray-400 mt-1">{alert.description}</p>
          {(onAction || onDismiss) && (
            <div className="flex gap-2 mt-3">
              {onAction && alert.actionType && (
                <button
                  onClick={onAction}
                  className="px-3 py-1 text-sm bg-white/10 hover:bg-white/20 rounded transition-colors"
                >
                  Take Action
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="px-3 py-1 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {new Date(alert.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
};

interface AlertListProps {
  alerts: Alert[];
  onAlertAction?: (alert: Alert) => void;
  onAlertDismiss?: (alert: Alert) => void;
  maxItems?: number;
  className?: string;
}

export const AlertList: React.FC<AlertListProps> = ({
  alerts,
  onAlertAction,
  onAlertDismiss,
  maxItems = 5,
  className = '',
}) => {
  const displayAlerts = alerts.slice(0, maxItems);

  if (displayAlerts.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <svg className="w-12 h-12 mx-auto mb-2 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        No alerts at this time
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {displayAlerts.map(alert => (
        <AlertBanner
          key={alert.id}
          alert={alert}
          onAction={onAlertAction ? () => onAlertAction(alert) : undefined}
          onDismiss={onAlertDismiss ? () => onAlertDismiss(alert) : undefined}
        />
      ))}
      {alerts.length > maxItems && (
        <p className="text-sm text-gray-500 text-center">
          +{alerts.length - maxItems} more alerts
        </p>
      )}
    </div>
  );
};
