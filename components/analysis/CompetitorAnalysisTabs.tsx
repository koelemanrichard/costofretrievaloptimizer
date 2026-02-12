/**
 * Competitor Analysis Tabs Component
 *
 * Tabbed view showing detailed competitor analysis:
 * - Content tab (entity consistency, attribute distribution)
 * - Technical tab (schema quality, navigation type)
 * - Links tab (flow direction, anchor quality, bridge justification)
 * - Comparison table
 *
 * Created: December 25, 2024
 */

import React, { useState } from 'react';
import { AuditButton } from '../audit/AuditButton';
import {
  CompetitorAnalysis,
  ContentLayerAnalysis,
  TechnicalLayerAnalysis,
  LinkLayerAnalysis,
} from '../../types/competitiveIntelligence';

// =============================================================================
// Types
// =============================================================================

interface CompetitorAnalysisTabsProps {
  /** List of competitor analyses */
  competitors: CompetitorAnalysis[];
  /** Custom class name */
  className?: string;
}

type TabId = 'overview' | 'content' | 'technical' | 'links' | 'comparison';

// =============================================================================
// Sub-components
// =============================================================================

const ScoreBadge: React.FC<{ score: number; size?: 'sm' | 'md' }> = ({ score, size = 'md' }) => {
  const color = score >= 80 ? 'bg-green-600' :
                score >= 60 ? 'bg-yellow-600' :
                score >= 40 ? 'bg-orange-600' : 'bg-red-600';

  const sizeClasses = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';

  return (
    <div className={`${sizeClasses} ${color} rounded-full flex items-center justify-center text-white font-bold`}>
      {score}
    </div>
  );
};

const StatRow: React.FC<{ label: string; value: string | number; highlight?: boolean }> = ({
  label,
  value,
  highlight,
}) => (
  <div className="flex justify-between items-center py-1">
    <span className="text-gray-400 text-sm">{label}</span>
    <span className={`text-sm font-medium ${highlight ? 'text-blue-400' : 'text-gray-300'}`}>
      {value}
    </span>
  </div>
);

const IssueList: React.FC<{ issues: { severity: string; description: string }[] }> = ({ issues }) => {
  const safeIssues = issues || [];
  if (safeIssues.length === 0) {
    return <p className="text-sm text-gray-500 italic">No issues detected</p>;
  }

  return (
    <ul className="space-y-1">
      {safeIssues.slice(0, 5).map((issue, idx) => (
        <li key={idx} className="flex items-start gap-2 text-sm">
          <span className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${
            issue.severity === 'critical' ? 'bg-red-500' :
            issue.severity === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
          }`} />
          <span className="text-gray-400">{issue.description}</span>
        </li>
      ))}
    </ul>
  );
};

// =============================================================================
// Tab Content Components
// =============================================================================

const OverviewTab: React.FC<{ competitors: CompetitorAnalysis[] }> = ({ competitors }) => (
  <div className="space-y-4">
    {competitors.map((comp, idx) => (
      <div key={idx} className="p-4 bg-gray-900/50 rounded-lg">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">#{comp.position}</span>
              <h4 className="font-medium text-gray-200">{comp.domain}</h4>
            </div>
            <div className="flex items-center gap-1">
              <a
                href={comp.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:underline truncate block max-w-md"
              >
                {comp.url}
              </a>
              <AuditButton url={comp.url} variant="icon" size="sm" />
            </div>
          </div>
          <ScoreBadge score={comp.overallScore} />
        </div>

        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="text-center p-2 bg-gray-800/50 rounded">
            <div className="text-lg font-bold text-gray-300">{comp.content.contentScore}</div>
            <div className="text-xs text-gray-500">Content</div>
          </div>
          <div className="text-center p-2 bg-gray-800/50 rounded">
            <div className="text-lg font-bold text-gray-300">{comp.technical.technicalScore}</div>
            <div className="text-xs text-gray-500">Technical</div>
          </div>
          <div className="text-center p-2 bg-gray-800/50 rounded">
            <div className="text-lg font-bold text-gray-300">{comp.links.linkScore}</div>
            <div className="text-xs text-gray-500">Links</div>
          </div>
        </div>

        {(comp.strengths || []).length > 0 && (
          <div className="mb-2">
            <span className="text-xs text-green-500 font-medium">Strengths: </span>
            <span className="text-xs text-gray-400">{(comp.strengths || []).slice(0, 2).join(', ')}</span>
          </div>
        )}
        {(comp.weaknesses || []).length > 0 && (
          <div>
            <span className="text-xs text-red-500 font-medium">Weaknesses: </span>
            <span className="text-xs text-gray-400">{(comp.weaknesses || []).slice(0, 2).join(', ')}</span>
          </div>
        )}
      </div>
    ))}
  </div>
);

const ContentTab: React.FC<{ competitors: CompetitorAnalysis[] }> = ({ competitors }) => (
  <div className="space-y-4">
    {competitors.map((comp, idx) => (
      <div key={idx} className="p-4 bg-gray-900/50 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">#{comp.position}</span>
            <h4 className="font-medium text-gray-200">{comp.domain}</h4>
          </div>
          <ScoreBadge score={comp.content.contentScore} size="sm" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Attribute Distribution */}
          <div>
            <h5 className="text-sm font-medium text-gray-400 mb-2">Attribute Distribution</h5>
            <StatRow label="Root Attributes" value={comp.content.attributeDistribution.root} />
            <StatRow label="Rare Attributes" value={comp.content.attributeDistribution.rare} />
            <StatRow label="Unique Attributes" value={comp.content.attributeDistribution.unique} highlight />
            <StatRow label="Root Coverage" value={`${comp.content.attributeDistribution.rootCoverage}%`} />
          </div>

          {/* Central Entity */}
          <div>
            <h5 className="text-sm font-medium text-gray-400 mb-2">Central Entity</h5>
            <StatRow
              label="Entity"
              value={comp.content.centralEntityAnalysis.detectedEntity.name}
            />
            <StatRow
              label="Confidence"
              value={`${Math.round(comp.content.centralEntityAnalysis.detectedEntity.confidence * 100)}%`}
            />
            <StatRow
              label="Consistency"
              value={`${comp.content.centralEntityAnalysis.consistencyScore}%`}
              highlight={comp.content.centralEntityAnalysis.consistencyScore >= 80}
            />
            <StatRow
              label="In H1"
              value={comp.content.centralEntityAnalysis.consistency.inH1 ? 'Yes' : 'No'}
            />
          </div>
        </div>

        {(comp.content.centralEntityAnalysis.issues || []).length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <h5 className="text-sm font-medium text-gray-400 mb-2">Issues</h5>
            <IssueList issues={comp.content.centralEntityAnalysis.issues || []} />
          </div>
        )}
      </div>
    ))}
  </div>
);

const TechnicalTab: React.FC<{ competitors: CompetitorAnalysis[] }> = ({ competitors }) => (
  <div className="space-y-4">
    {competitors.map((comp, idx) => (
      <div key={idx} className="p-4 bg-gray-900/50 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">#{comp.position}</span>
            <h4 className="font-medium text-gray-200">{comp.domain}</h4>
          </div>
          <ScoreBadge score={comp.technical.technicalScore} size="sm" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Schema */}
          <div>
            <h5 className="text-sm font-medium text-gray-400 mb-2">Schema Markup</h5>
            <StatRow label="Has Schema" value={comp.technical.schema.hasSchema ? 'Yes' : 'No'} />
            <StatRow
              label="Schema Types"
              value={comp.technical.schema.schemaTypes.slice(0, 3).join(', ') || 'None'}
            />
            <StatRow
              label="Entity Linking"
              value={`${comp.technical.schema.entityLinking.disambiguationScore}%`}
              highlight={comp.technical.schema.entityLinking.disambiguationScore >= 60}
            />
            <StatRow
              label="Has About"
              value={comp.technical.schema.entityLinking.about.present ? 'Yes' : 'No'}
            />
          </div>

          {/* Navigation */}
          <div>
            <h5 className="text-sm font-medium text-gray-400 mb-2">Navigation</h5>
            <StatRow
              label="Nav Score"
              value={`${comp.technical.navigationAnalysis.navigationScore}%`}
            />
            <StatRow
              label="Header Type"
              value={comp.technical.navigationAnalysis.header.isDynamic}
            />
            <StatRow
              label="Is Mega Menu"
              value={comp.technical.navigationAnalysis.header.isMegaMenu ? 'Yes' : 'No'}
            />
            <StatRow
              label="Footer Type"
              value={comp.technical.navigationAnalysis.footer.isDynamic}
            />
          </div>
        </div>

        {/* Semantic Tags */}
        <div className="mt-3 pt-3 border-t border-gray-700">
          <h5 className="text-sm font-medium text-gray-400 mb-2">Semantic HTML Tags</h5>
          <div className="flex flex-wrap gap-2">
            {Object.entries(comp.technical.semanticTags).map(([tag, has]) => (
              <span
                key={tag}
                className={`px-2 py-1 rounded text-xs ${
                  has ? 'bg-green-900/50 text-green-400' : 'bg-gray-800 text-gray-500'
                }`}
              >
                {tag.replace('has', '<') + '>'}
              </span>
            ))}
          </div>
        </div>
      </div>
    ))}
  </div>
);

const LinksTab: React.FC<{ competitors: CompetitorAnalysis[] }> = ({ competitors }) => (
  <div className="space-y-4">
    {competitors.map((comp, idx) => (
      <div key={idx} className="p-4 bg-gray-900/50 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">#{comp.position}</span>
            <h4 className="font-medium text-gray-200">{comp.domain}</h4>
          </div>
          <ScoreBadge score={comp.links.linkScore} size="sm" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Link Counts */}
          <div>
            <h5 className="text-sm font-medium text-gray-400 mb-2">Link Profile</h5>
            <StatRow label="Internal Links" value={comp.links.internal.totalCount} />
            <StatRow label="External Links" value={comp.links.external.totalCount} />
            <StatRow label="Unique Targets" value={comp.links.internal.uniqueTargets} />
          </div>

          {/* Anchor Quality */}
          <div>
            <h5 className="text-sm font-medium text-gray-400 mb-2">Anchor Quality</h5>
            <StatRow
              label="Overall"
              value={`${comp.links.internal.anchorTextQuality.scores.overall}%`}
              highlight={comp.links.internal.anchorTextQuality.scores.overall >= 70}
            />
            <StatRow
              label="Descriptiveness"
              value={`${comp.links.internal.anchorTextQuality.scores.descriptiveness}%`}
            />
            <StatRow
              label="Generic Anchors"
              value={comp.links.internal.anchorTextQuality.genericCount}
            />
          </div>

          {/* PageRank Flow */}
          <div>
            <h5 className="text-sm font-medium text-gray-400 mb-2">PageRank Flow</h5>
            <StatRow label="Page Type" value={comp.links.pageRankFlow.pageType} />
            <StatRow label="Flow Direction" value={comp.links.pageRankFlow.flowAnalysis.flowDirection} />
            <StatRow
              label="Flow Score"
              value={`${comp.links.pageRankFlow.flowAnalysis.flowScore}%`}
              highlight={comp.links.pageRankFlow.flowAnalysis.flowScore >= 70}
            />
          </div>
        </div>

        {/* Bridge Topics */}
        {(comp.links.bridgeTopics || []).length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <h5 className="text-sm font-medium text-gray-400 mb-2">
              Bridge Topics ({(comp.links.bridgeTopics || []).length})
            </h5>
            <div className="flex flex-wrap gap-2">
              {(comp.links.bridgeTopics || []).slice(0, 5).map((bridge, i) => (
                <span
                  key={i}
                  className={`px-2 py-1 rounded text-xs ${
                    bridge.justification.isJustified
                      ? 'bg-green-900/50 text-green-400'
                      : 'bg-yellow-900/50 text-yellow-400'
                  }`}
                >
                  {bridge.topic.slice(0, 30)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    ))}
  </div>
);

const ComparisonTab: React.FC<{ competitors: CompetitorAnalysis[] }> = ({ competitors }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-700">
          <th className="text-left p-2 text-gray-400 font-medium">Competitor</th>
          <th className="text-center p-2 text-gray-400 font-medium">Position</th>
          <th className="text-center p-2 text-gray-400 font-medium">Overall</th>
          <th className="text-center p-2 text-gray-400 font-medium">Content</th>
          <th className="text-center p-2 text-gray-400 font-medium">Technical</th>
          <th className="text-center p-2 text-gray-400 font-medium">Links</th>
          <th className="text-center p-2 text-gray-400 font-medium">Schema</th>
          <th className="text-center p-2 text-gray-400 font-medium">Entity Score</th>
          <th className="text-center p-2 text-gray-400 font-medium">Anchor</th>
        </tr>
      </thead>
      <tbody>
        {competitors.map((comp, idx) => (
          <tr key={idx} className="border-b border-gray-800 hover:bg-gray-800/50">
            <td className="p-2 text-gray-300">{comp.domain}</td>
            <td className="p-2 text-center text-gray-400">#{comp.position}</td>
            <td className="p-2 text-center">
              <ScoreBadge score={comp.overallScore} size="sm" />
            </td>
            <td className="p-2 text-center text-gray-300">{comp.content.contentScore}</td>
            <td className="p-2 text-center text-gray-300">{comp.technical.technicalScore}</td>
            <td className="p-2 text-center text-gray-300">{comp.links.linkScore}</td>
            <td className="p-2 text-center">
              <span className={comp.technical.schema.hasSchema ? 'text-green-400' : 'text-gray-500'}>
                {comp.technical.schema.hasSchema ? 'Yes' : 'No'}
              </span>
            </td>
            <td className="p-2 text-center text-gray-300">
              {comp.content.centralEntityAnalysis.consistencyScore}%
            </td>
            <td className="p-2 text-center text-gray-300">
              {comp.links.internal.anchorTextQuality.scores.overall}%
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// =============================================================================
// Main Component
// =============================================================================

const CompetitorAnalysisTabs: React.FC<CompetitorAnalysisTabsProps> = ({
  competitors,
  className = '',
}) => {
  // Ensure competitors is always an array
  const safeCompetitors = competitors || [];
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'content', label: 'Content' },
    { id: 'technical', label: 'Technical' },
    { id: 'links', label: 'Links' },
    { id: 'comparison', label: 'Compare' },
  ];

  if (safeCompetitors.length === 0) {
    return (
      <div className={`bg-gray-800/50 border border-gray-700 rounded-lg p-6 ${className}`}>
        <p className="text-gray-400 text-center">No competitor data available</p>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800/50 border border-gray-700 rounded-lg ${className}`}>
      {/* Tab Headers */}
      <div className="flex border-b border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-blue-400 border-b-2 border-blue-400 -mb-px'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-4 max-h-[600px] overflow-y-auto">
        {activeTab === 'overview' && <OverviewTab competitors={safeCompetitors} />}
        {activeTab === 'content' && <ContentTab competitors={safeCompetitors} />}
        {activeTab === 'technical' && <TechnicalTab competitors={safeCompetitors} />}
        {activeTab === 'links' && <LinksTab competitors={safeCompetitors} />}
        {activeTab === 'comparison' && <ComparisonTab competitors={safeCompetitors} />}
      </div>
    </div>
  );
};

export default CompetitorAnalysisTabs;
