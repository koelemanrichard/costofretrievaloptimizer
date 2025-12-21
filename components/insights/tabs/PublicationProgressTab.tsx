// components/insights/tabs/PublicationProgressTab.tsx
// Publication Progress - Track content production against plan

import React, { useState } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import type { AggregatedInsights, ContentStatusItem, PhaseProgress } from '../../../types/insights';

interface PublicationProgressTabProps {
  insights: AggregatedInsights;
  mapId: string;
  onRefresh: () => void;
}

type StatusFilter = 'all' | 'not_started' | 'brief_ready' | 'draft' | 'review' | 'published';

export const PublicationProgressTab: React.FC<PublicationProgressTabProps> = ({
  insights,
  mapId,
  onRefresh,
}) => {
  const { publicationProgress } = insights;
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Calculate overall progress
  const totalItems = publicationProgress.contentStatusBoard.length;
  const publishedItems = publicationProgress.contentStatusBoard.filter(i => i.status === 'published').length;
  const overallProgress = totalItems > 0 ? Math.round((publishedItems / totalItems) * 100) : 0;

  // Filter content by status
  const filteredContent = statusFilter === 'all'
    ? publicationProgress.contentStatusBoard
    : publicationProgress.contentStatusBoard.filter(item => item.status === statusFilter);

  // Status configuration
  const statusConfig = {
    not_started: { label: 'Not Started', color: 'gray', bg: 'bg-gray-500/20', text: 'text-gray-400' },
    brief_ready: { label: 'Brief Ready', color: 'blue', bg: 'bg-blue-500/20', text: 'text-blue-400' },
    draft: { label: 'Draft', color: 'yellow', bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
    review: { label: 'In Review', color: 'orange', bg: 'bg-orange-500/20', text: 'text-orange-400' },
    published: { label: 'Published', color: 'green', bg: 'bg-green-500/20', text: 'text-green-400' },
  };

  // Group by status for Kanban view
  const groupedByStatus = {
    not_started: publicationProgress.contentStatusBoard.filter(i => i.status === 'not_started'),
    brief_ready: publicationProgress.contentStatusBoard.filter(i => i.status === 'brief_ready'),
    draft: publicationProgress.contentStatusBoard.filter(i => i.status === 'draft'),
    review: publicationProgress.contentStatusBoard.filter(i => i.status === 'review'),
    published: publicationProgress.contentStatusBoard.filter(i => i.status === 'published'),
  };

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <Card className="p-6 bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-blue-700/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Publication Progress</h3>
            <p className="text-sm text-gray-400">
              {publishedItems} of {totalItems} topics published
            </p>
          </div>
          <div className="text-4xl font-bold text-blue-400">{overallProgress}%</div>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3">
          <div
            className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </Card>

      {/* Phase Progress */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Phase Progress</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {publicationProgress.phaseProgress.map((phase) => (
            <div
              key={phase.phase}
              className={`p-4 rounded-lg border ${
                phase.completion === 100
                  ? 'bg-green-900/30 border-green-700/50'
                  : phase.completion > 0
                    ? 'bg-blue-900/30 border-blue-700/50'
                    : 'bg-gray-800/50 border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">{phase.name}</span>
                <span className={`text-sm ${
                  phase.completion === 100 ? 'text-green-400' :
                  phase.completion > 0 ? 'text-blue-400' : 'text-gray-500'
                }`}>
                  {phase.completion}%
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    phase.completion === 100 ? 'bg-green-500' :
                    phase.completion > 0 ? 'bg-blue-500' : 'bg-gray-600'
                  }`}
                  style={{ width: `${phase.completion}%` }}
                />
              </div>
              <div className="text-xs text-gray-500">
                {phase.completedItems} / {phase.totalItems} items
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Kanban Board */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Content Status Board</h3>
        <div className="grid grid-cols-5 gap-3 min-h-[400px]">
          {Object.entries(groupedByStatus).map(([status, items]) => {
            const config = statusConfig[status as keyof typeof statusConfig];
            return (
              <div key={status} className="flex flex-col">
                <div className={`p-2 rounded-t-lg ${config.bg} flex items-center justify-between`}>
                  <span className={`text-sm font-medium ${config.text}`}>{config.label}</span>
                  <span className="text-xs text-gray-400">{items.length}</span>
                </div>
                <div className="flex-1 bg-gray-800/30 rounded-b-lg p-2 space-y-2 overflow-y-auto max-h-[350px]">
                  {items.length === 0 ? (
                    <div className="text-xs text-gray-500 text-center py-4">No items</div>
                  ) : (
                    items.map((item) => (
                      <div
                        key={item.id}
                        className="p-2 bg-gray-800 rounded border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer"
                      >
                        <p className="text-xs text-white font-medium truncate" title={item.title}>
                          {item.title}
                        </p>
                        {item.scheduledDate && (
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(item.scheduledDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Upcoming Deadlines */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Upcoming Deadlines</h3>
        {publicationProgress.upcomingDeadlines.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No scheduled deadlines. Set publication dates for your topics.
          </div>
        ) : (
          <div className="space-y-2">
            {publicationProgress.upcomingDeadlines.map((deadline) => (
              <div
                key={deadline.id}
                className={`p-3 rounded-lg flex items-center justify-between ${
                  deadline.status === 'overdue'
                    ? 'bg-red-900/30 border border-red-700/50'
                    : deadline.status === 'today'
                      ? 'bg-orange-900/30 border border-orange-700/50'
                      : 'bg-gray-800/50 border border-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    deadline.status === 'overdue' ? 'bg-red-400' :
                    deadline.status === 'today' ? 'bg-orange-400' : 'bg-blue-400'
                  }`} />
                  <div>
                    <p className="text-sm text-white font-medium">{deadline.title}</p>
                    <p className="text-xs text-gray-500 capitalize">{deadline.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm ${
                    deadline.status === 'overdue' ? 'text-red-400' :
                    deadline.status === 'today' ? 'text-orange-400' : 'text-gray-400'
                  }`}>
                    {deadline.status === 'overdue' && 'Overdue: '}
                    {deadline.status === 'today' && 'Today: '}
                    {new Date(deadline.dueDate).toLocaleDateString()}
                  </span>
                  <button className="text-xs text-blue-400 hover:text-blue-300">
                    Reschedule
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Performance Tracking */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Performance Tracking</h3>
        {publicationProgress.performanceTracking.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-gray-500">Performance data not available</p>
            <p className="text-sm text-gray-600 mt-1">
              Connect Google Search Console to track content performance.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-400 border-b border-gray-700">
                  <th className="pb-3">Topic</th>
                  <th className="pb-3">Impressions</th>
                  <th className="pb-3">Clicks</th>
                  <th className="pb-3">Avg Position</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {publicationProgress.performanceTracking.map((metric) => (
                  <tr key={metric.topicId} className="text-sm">
                    <td className="py-3 text-white">{metric.title}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-white">{metric.current.impressions.toLocaleString()}</span>
                        <span className={`text-xs ${
                          metric.change.impressions >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {metric.change.impressions >= 0 ? '+' : ''}{metric.change.impressions}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-white">{metric.current.clicks.toLocaleString()}</span>
                        <span className={`text-xs ${
                          metric.change.clicks >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {metric.change.clicks >= 0 ? '+' : ''}{metric.change.clicks}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-white">{metric.current.position.toFixed(1)}</span>
                        <span className={`text-xs ${
                          metric.change.position <= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {metric.change.position <= 0 ? '' : '+'}{metric.change.position.toFixed(1)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
