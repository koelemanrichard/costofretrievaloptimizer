/**
 * ReportHeader
 *
 * Professional header component for PDF/HTML reports
 */

import React from 'react';
import { MetricCard } from '../../types/reports';

interface ReportHeaderProps {
  title: string;
  subtitle?: string;
  domain?: string;
  generatedAt: string;
  logoUrl?: string;
  metrics?: MetricCard[];
  variant?: 'default' | 'minimal' | 'branded';
}

const MetricDisplay: React.FC<{ metric: MetricCard }> = ({ metric }) => {
  const colorClasses = {
    green: 'bg-green-50 border-green-200 text-green-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-700'
  };

  const classes = colorClasses[metric.color || 'gray'];

  return (
    <div className={`px-4 py-3 rounded-lg border ${classes}`}>
      <div className="text-2xl font-bold">{metric.value}</div>
      <div className="text-xs mt-0.5 opacity-80">{metric.label}</div>
      {metric.sublabel && (
        <div className="text-xs mt-0.5 opacity-60">{metric.sublabel}</div>
      )}
    </div>
  );
};

export const ReportHeader: React.FC<ReportHeaderProps> = ({
  title,
  subtitle,
  domain,
  generatedAt,
  logoUrl,
  metrics,
  variant = 'default'
}) => {
  if (variant === 'minimal') {
    return (
      <div className="mb-6 pb-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{title}</h1>
            {subtitle && (
              <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
            )}
          </div>
          <div className="text-right text-sm text-gray-500">
            {domain && <p>{domain}</p>}
            <p>{generatedAt}</p>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'branded') {
    return (
      <div className="mb-8">
        {/* Top bar with gradient */}
        <div className="h-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-lg" />

        <div className="bg-white border border-t-0 border-gray-200 rounded-b-lg p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-12 w-auto" />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                {subtitle && (
                  <p className="text-gray-600 mt-1">{subtitle}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              {domain && (
                <p className="text-sm font-medium text-gray-700">{domain}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                Generated: {generatedAt}
              </p>
            </div>
          </div>

          {/* Metrics row */}
          {metrics && metrics.length > 0 && (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {metrics.map((metric, index) => (
                <MetricDisplay key={index} metric={metric} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className="mb-8 bg-white rounded-lg border border-gray-200 overflow-hidden print:border-0">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-10 w-auto" />
            ) : (
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">{title}</h1>
              {subtitle && (
                <p className="text-sm text-gray-600">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="text-right text-sm">
            {domain && (
              <p className="font-medium text-gray-700">{domain}</p>
            )}
            <p className="text-gray-500">{generatedAt}</p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      {metrics && metrics.length > 0 && (
        <div className="px-6 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {metrics.map((metric, index) => (
              <MetricDisplay key={index} metric={metric} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportHeader;
