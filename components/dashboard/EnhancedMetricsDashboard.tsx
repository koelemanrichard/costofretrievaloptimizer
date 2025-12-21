// components/dashboard/EnhancedMetricsDashboard.tsx
// Comprehensive visualization dashboard for semantic compliance, authority, and audit metrics

import React, { useMemo, useCallback, useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  EnhancedAuditMetrics,
  generateEnhancedMetrics,
  calculateSemanticComplianceMetrics,
  calculateAuthorityIndicators,
} from '../../services/reportGenerationService';
import { exportEnhancedMetricsToHtml } from '../../services/pdfExportService';
import type { SemanticTriple, ReportIssue } from '../../types';

interface EnhancedMetricsDashboardProps {
  eavs: SemanticTriple[];
  topicCount: number;
  issues?: ReportIssue[];
  projectName?: string;
  mapName?: string;
  onExport?: () => void;
}

// Score gauge component
const ScoreGauge: React.FC<{
  score: number;
  target: number;
  label: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({ score, target, label, size = 'md' }) => {
  const radius = size === 'sm' ? 40 : size === 'md' ? 60 : 80;
  const strokeWidth = size === 'sm' ? 8 : size === 'md' ? 10 : 12;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(score / 100, 1);
  const targetProgress = Math.min(target / 100, 1);

  const getScoreColor = (s: number) => {
    if (s >= 85) return '#22c55e'; // green
    if (s >= 70) return '#eab308'; // yellow
    if (s >= 50) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  return (
    <div className="flex flex-col items-center">
      <svg
        width={(radius + strokeWidth) * 2}
        height={(radius + strokeWidth) * 2}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={radius + strokeWidth}
          cy={radius + strokeWidth}
          r={radius}
          fill="none"
          stroke="#374151"
          strokeWidth={strokeWidth}
        />
        {/* Target indicator */}
        <circle
          cx={radius + strokeWidth}
          cy={radius + strokeWidth}
          r={radius}
          fill="none"
          stroke="#4b5563"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - targetProgress)}
          strokeLinecap="round"
          opacity={0.5}
        />
        {/* Score progress */}
        <circle
          cx={radius + strokeWidth}
          cy={radius + strokeWidth}
          r={radius}
          fill="none"
          stroke={getScoreColor(score)}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ marginTop: radius / 2 }}>
        <span className="text-2xl font-bold text-white">{score}%</span>
        <span className="text-xs text-gray-400">Target: {target}%</span>
      </div>
      <span className="mt-2 text-sm font-medium text-gray-300">{label}</span>
    </div>
  );
};

// Distribution bar chart
const DistributionChart: React.FC<{
  data: Record<string, number>;
  title: string;
  colorMap?: Record<string, string>;
}> = ({ data, title, colorMap }) => {
  const total = Object.values(data).reduce((sum, v) => sum + v, 0);
  const defaultColors: Record<string, string> = {
    UNIQUE: '#8b5cf6',
    ROOT: '#3b82f6',
    RARE: '#10b981',
    COMMON: '#6b7280',
    TYPE: '#ef4444',
    COMPONENT: '#f97316',
    BENEFIT: '#22c55e',
    RISK: '#eab308',
    PROCESS: '#06b6d4',
    SPECIFICATION: '#8b5cf6',
  };
  const colors = colorMap || defaultColors;

  if (total === 0) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg">
        <h4 className="text-sm font-medium text-gray-300 mb-2">{title}</h4>
        <p className="text-xs text-gray-500">No data available</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <h4 className="text-sm font-medium text-gray-300 mb-3">{title}</h4>
      <div className="space-y-2">
        {Object.entries(data).map(([key, value]) => {
          const percentage = total > 0 ? (value / total) * 100 : 0;
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-24 truncate">{key}</span>
              <div className="flex-1 h-4 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: colors[key] || '#6b7280',
                  }}
                />
              </div>
              <span className="text-xs text-gray-400 w-12 text-right">{value} ({percentage.toFixed(0)}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Authority indicator card
const AuthorityCard: React.FC<{
  label: string;
  value: number;
  icon: string;
  color: string;
}> = ({ label, value, icon, color }) => (
  <div className={`p-4 rounded-lg border ${color}`}>
    <div className="flex items-center justify-between">
      <span className="text-2xl">{icon}</span>
      <span className="text-2xl font-bold text-white">{value}</span>
    </div>
    <span className="text-xs text-gray-400">{label}</span>
  </div>
);

// Action roadmap item
const RoadmapItem: React.FC<{
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  action: string;
  impact: string;
}> = ({ priority, category, action, impact }) => {
  const priorityStyles = {
    critical: 'bg-red-900/30 border-red-700 text-red-400',
    high: 'bg-orange-900/30 border-orange-700 text-orange-400',
    medium: 'bg-yellow-900/30 border-yellow-700 text-yellow-400',
    low: 'bg-blue-900/30 border-blue-700 text-blue-400',
  };

  return (
    <div className={`p-3 rounded-lg border ${priorityStyles[priority]}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-xs font-bold uppercase ${priorityStyles[priority].split(' ')[2]}`}>
          {priority}
        </span>
        <span className="text-xs text-gray-400">|</span>
        <span className="text-xs text-gray-300">{category}</span>
      </div>
      <p className="text-sm text-white mb-1">{action}</p>
      <p className="text-xs text-gray-400">{impact}</p>
    </div>
  );
};

export const EnhancedMetricsDashboard: React.FC<EnhancedMetricsDashboardProps> = ({
  eavs,
  topicCount,
  issues = [],
  projectName = 'My Project',
  mapName,
  onExport,
}) => {
  const metrics = useMemo(() => {
    return generateEnhancedMetrics(eavs, topicCount, issues);
  }, [eavs, topicCount, issues]);

  const { semanticCompliance, authorityIndicators, informationDensity, actionRoadmap } = metrics;
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Export handlers
  const handleExportHtml = useCallback(() => {
    const reportData = {
      projectName: mapName || projectName,
      semanticCompliance: {
        score: semanticCompliance.score,
        target: semanticCompliance.target,
        eavCoverage: semanticCompliance.eavCoverage,
        categoryDistribution: semanticCompliance.categoryDistribution,
        classificationDistribution: semanticCompliance.classificationDistribution,
        recommendations: semanticCompliance.recommendations,
      },
      authorityIndicators: {
        eavAuthorityScore: authorityIndicators.eavAuthorityScore,
        uniqueEavCount: authorityIndicators.uniqueEavCount,
        rootEavCount: authorityIndicators.rootEavCount,
        rareEavCount: authorityIndicators.rareEavCount,
        commonEavCount: authorityIndicators.commonEavCount,
        topicalDepthScore: authorityIndicators.topicalDepthScore,
      },
      topicCount,
      actionRoadmap: actionRoadmap.map(item => ({
        priority: item.priority,
        category: item.category,
        action: item.action,
        impact: item.impact,
      })),
    };

    exportEnhancedMetricsToHtml(reportData, `enhanced-metrics-${projectName.replace(/\s+/g, '-').toLowerCase()}`);
    setShowExportMenu(false);
  }, [semanticCompliance, authorityIndicators, topicCount, actionRoadmap, projectName, mapName]);

  const handleExportJson = useCallback(() => {
    const exportData = {
      exportDate: new Date().toISOString(),
      projectName: mapName || projectName,
      dataSource: 'Your Topical Map EAV Analysis',
      metrics: {
        semanticCompliance,
        authorityIndicators,
        informationDensity,
        actionRoadmap,
      },
      summary: {
        totalEavs: eavs.length,
        topicCount,
        complianceScore: semanticCompliance.score,
        authorityScore: authorityIndicators.eavAuthorityScore,
      },
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `enhanced-metrics-${projectName.replace(/\s+/g, '-').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  }, [semanticCompliance, authorityIndicators, informationDensity, actionRoadmap, eavs.length, topicCount, projectName, mapName]);

  return (
    <div className="space-y-6">
      {/* Data Source Banner */}
      <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-white">Your Topical Map Analysis</h3>
            <p className="text-sm text-blue-300">
              This dashboard analyzes the EAVs (Entity-Attribute-Value triples) defined in your current topical map.
              It measures semantic coverage, authority signals, and content strategy alignment.
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Enhanced Audit Metrics</h2>
          <p className="text-gray-400">
            Analyzing {eavs.length} EAVs across {topicCount} topics in your map
          </p>
        </div>
        <div className="relative">
          <Button
            onClick={() => setShowExportMenu(!showExportMenu)}
            variant="secondary"
            className="flex items-center gap-2"
          >
            Export Report
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Button>
          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10">
              <button
                onClick={handleExportHtml}
                className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white rounded-t-lg flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export as HTML
              </button>
              <button
                onClick={handleExportJson}
                className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white rounded-b-lg flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Export as JSON
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Score Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Semantic Compliance */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Semantic Compliance</h3>
          <div className="flex justify-center relative">
            <ScoreGauge
              score={semanticCompliance.score}
              target={semanticCompliance.target}
              label="Compliance Score"
            />
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-400">
              {semanticCompliance.eavCoverage} EAVs analyzed
            </p>
            {semanticCompliance.score >= semanticCompliance.target ? (
              <p className="text-sm text-green-400 mt-1">Target achieved</p>
            ) : (
              <p className="text-sm text-yellow-400 mt-1">
                {semanticCompliance.target - semanticCompliance.score}% below target
              </p>
            )}
          </div>
        </Card>

        {/* Authority Score */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Authority Score</h3>
          <div className="flex justify-center relative">
            <ScoreGauge
              score={authorityIndicators.eavAuthorityScore}
              target={75}
              label="EAV Authority"
            />
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-400">
              Topical Depth: {authorityIndicators.topicalDepthScore}%
            </p>
          </div>
        </Card>

        {/* Information Density */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Information Density</h3>
          <div className="flex justify-center relative">
            <ScoreGauge
              score={Math.min(100, (informationDensity.avgFactsPerSection / informationDensity.targetFactsPerSection) * 100)}
              target={100}
              label="Fact Density"
            />
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-400">
              {informationDensity.avgFactsPerSection} facts/topic (target: {informationDensity.targetFactsPerSection})
            </p>
          </div>
        </Card>
      </div>

      {/* EAV Distribution Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Category Distribution</h3>
          <DistributionChart
            data={semanticCompliance.categoryDistribution}
            title="EAV Categories"
          />
          <p className="mt-3 text-xs text-gray-500">
            UNIQUE = proprietary insights, ROOT = foundational facts, RARE = specialized knowledge, COMMON = general facts
          </p>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Classification Distribution</h3>
          <DistributionChart
            data={semanticCompliance.classificationDistribution}
            title="Predicate Types"
          />
          <p className="mt-3 text-xs text-gray-500">
            Diverse predicate types indicate comprehensive semantic coverage
          </p>
        </Card>
      </div>

      {/* Authority Indicators */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Authority Indicators</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <AuthorityCard
            label="UNIQUE EAVs"
            value={authorityIndicators.uniqueEavCount}
            icon="💎"
            color="bg-purple-900/30 border-purple-700"
          />
          <AuthorityCard
            label="ROOT EAVs"
            value={authorityIndicators.rootEavCount}
            icon="🌳"
            color="bg-blue-900/30 border-blue-700"
          />
          <AuthorityCard
            label="RARE EAVs"
            value={authorityIndicators.rareEavCount}
            icon="🔮"
            color="bg-green-900/30 border-green-700"
          />
          <AuthorityCard
            label="COMMON EAVs"
            value={authorityIndicators.commonEavCount}
            icon="📚"
            color="bg-gray-800 border-gray-600"
          />
        </div>
        <div className="mt-4 p-4 bg-gray-800/50 rounded-lg">
          <p className="text-sm text-gray-300">
            <strong>Authority Strategy:</strong> Focus on UNIQUE and ROOT EAVs to establish topical authority.
            These represent proprietary insights and foundational facts that differentiate your content.
          </p>
        </div>
      </Card>

      {/* Recommendations */}
      {semanticCompliance.recommendations.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recommendations</h3>
          <ul className="space-y-2">
            {semanticCompliance.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-yellow-400 mt-0.5">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Action Roadmap */}
      {actionRoadmap.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Prioritized Action Roadmap</h3>
          <div className="space-y-3">
            {actionRoadmap.map((item, idx) => (
              <RoadmapItem
                key={idx}
                priority={item.priority}
                category={item.category}
                action={item.action}
                impact={item.impact}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default EnhancedMetricsDashboard;
