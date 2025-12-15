/**
 * MigrationReport
 *
 * Comprehensive report template for site migration/transition planning
 */

import React, { forwardRef } from 'react';
import { MigrationReportData, MigrationReportConfig, GapItem, ReportActionItem } from '../../types/reports';
import { ReportHeader } from './ReportHeader';
import { ReportFooter, ReportSectionDivider, PageBreak } from './ReportFooter';
import { AuditScoreGauge, ScoreBar } from './charts/AuditScoreGauge';
import { MigrationStatusChart, DecisionSummary, ActionBadge } from './charts/MigrationStatusChart';
import { PriorityMatrix, PriorityList } from './charts/PriorityMatrix';
import { TopicPieChart } from './charts/TopicPieChart';

interface MigrationReportProps {
  data: MigrationReportData;
  config?: Partial<MigrationReportConfig>;
}

const ReportSection: React.FC<{
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, children }) => (
  <section className="mb-8">
    <h2 className="text-lg font-bold text-gray-900 mb-1">{title}</h2>
    {subtitle && (
      <p className="text-sm text-gray-600 mb-4">{subtitle}</p>
    )}
    <div className="mt-4">{children}</div>
  </section>
);

const ChecklistSection: React.FC<{
  title: string;
  items: { item: string; required: boolean }[];
}> = ({ title, items }) => (
  <div>
    <h4 className="text-sm font-medium text-gray-700 mb-3">{title}</h4>
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${item.required ? 'border-blue-500' : 'border-gray-300'}`} />
          <span className={`text-sm ${item.required ? 'text-gray-900' : 'text-gray-600'}`}>
            {item.item}
            {item.required && <span className="text-red-500 ml-1">*</span>}
          </span>
        </div>
      ))}
    </div>
  </div>
);

const PhaseCard: React.FC<{
  phase: {
    phase: number;
    name: string;
    description: string;
    tasks: ReportActionItem[];
  };
}> = ({ phase }) => (
  <div className="border border-gray-200 rounded-lg overflow-hidden">
    <div className="bg-blue-50 px-4 py-3 border-b border-blue-200">
      <div className="flex items-center gap-3">
        <span className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
          {phase.phase}
        </span>
        <div>
          <h4 className="font-medium text-gray-900">{phase.name}</h4>
          <p className="text-sm text-gray-600">{phase.description}</p>
        </div>
      </div>
    </div>
    <div className="p-4 space-y-2">
      {phase.tasks.map((task, i) => (
        <div key={i} className="flex items-start gap-2 text-sm">
          <div className="w-5 h-5 rounded border border-gray-300 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="text-gray-900">{task.title}</span>
            {task.description && (
              <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>
            )}
          </div>
          <span className={`text-xs px-2 py-0.5 rounded ${
            task.priority === 'critical' ? 'bg-red-100 text-red-700' :
            task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
            task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
            'bg-green-100 text-green-700'
          }`}>
            {task.priority}
          </span>
        </div>
      ))}
    </div>
  </div>
);

export const MigrationReport = forwardRef<HTMLDivElement, MigrationReportProps>(
  ({ data, config = {} }, ref) => {
    const {
      includeCharts = true,
      includeImplementationGuide = true,
      includeRedirectMap = true,
      includeActionPlan = true,
      includeQualityChecklists = true
    } = config;

    return (
      <div
        ref={ref}
        className="bg-white p-8 max-w-4xl mx-auto print:p-4 print:max-w-none"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        {/* Header */}
        <ReportHeader
          title="Site Migration Report"
          subtitle={`Comprehensive migration plan for ${data.domain}`}
          domain={data.domain}
          generatedAt={data.generatedAt}
          metrics={data.metrics}
          variant="branded"
        />

        {/* Executive Summary */}
        <ReportSection
          title="Executive Summary"
          subtitle="Overview of site audit findings and recommended actions"
        >
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-5 mb-6">
            <p className="text-blue-900 font-medium text-lg mb-4">
              {data.executiveSummary.headline}
            </p>

            {/* Key Metrics Row */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-white rounded-lg p-4 text-center border border-blue-200">
                <div className="text-3xl font-bold text-blue-600">
                  {data.executiveSummary.pagesAnalyzed}
                </div>
                <div className="text-sm text-blue-700">Pages Analyzed</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center border border-blue-200">
                <div className="text-3xl font-bold text-orange-600">
                  {data.executiveSummary.actionsRequired}
                </div>
                <div className="text-sm text-blue-700">Actions Required</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center border border-blue-200">
                <div className="text-3xl font-bold text-green-600">
                  {data.executiveSummary.healthScore}%
                </div>
                <div className="text-sm text-blue-700">Health Score</div>
              </div>
            </div>

            {/* Key Findings */}
            <h4 className="text-sm font-medium text-blue-800 mb-2">Key Findings:</h4>
            <ul className="space-y-1 mb-4">
              {data.executiveSummary.keyFindings.map((finding, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-blue-900">
                  <span className="text-blue-500">•</span>
                  {finding}
                </li>
              ))}
            </ul>

            {/* Estimated Impact */}
            <h4 className="text-sm font-medium text-blue-800 mb-2">Estimated Impact:</h4>
            <ul className="space-y-1">
              {data.executiveSummary.estimatedImpact.map((impact, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-blue-900">
                  <svg className="w-4 h-4 text-green-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {impact}
                </li>
              ))}
            </ul>
          </div>
        </ReportSection>

        {/* Current State & Technical Health */}
        <ReportSection
          title="Current State Analysis"
          subtitle="Assessment of your site's current health and structure"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status Distribution */}
            {includeCharts && (
              <div className="bg-gray-50 rounded-lg p-4">
                <MigrationStatusChart
                  data={data.currentState.statusDistribution}
                  title="Page Status Distribution"
                  height={220}
                />
              </div>
            )}

            {/* Health Scores */}
            <div className="space-y-4">
              <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
                <AuditScoreGauge
                  score={data.technicalHealth.overallScore}
                  title="Technical Health"
                  size="md"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <ScoreBar
                  score={data.semanticAnalysis.alignmentScore}
                  label="Semantic Alignment"
                />
                <div className="text-center">
                  <div className="text-sm text-gray-600">Aligned Pages</div>
                  <div className="text-xl font-bold text-green-600">
                    {data.semanticAnalysis.alignedPages}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ReportSection>

        {/* Content Structure */}
        <ReportSection
          title="Content Structure"
          subtitle="Hub-spoke analysis of your site architecture"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {includeCharts && (
              <div className="bg-gray-50 rounded-lg p-4">
                <TopicPieChart
                  data={data.contentStructure.structureChart}
                  title="Content Architecture"
                  height={200}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg text-center border border-blue-200">
                <div className="text-3xl font-bold text-blue-600">{data.contentStructure.hubCount}</div>
                <div className="text-sm text-blue-700">Hub Pages</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center border border-gray-200">
                <div className="text-3xl font-bold text-gray-600">{data.contentStructure.spokeCount}</div>
                <div className="text-sm text-gray-700">Spoke Pages</div>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg text-center border border-yellow-200">
                <div className="text-3xl font-bold text-yellow-600">{data.contentStructure.orphanCount}</div>
                <div className="text-sm text-yellow-700">Orphan Pages</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg text-center border border-green-200">
                <div className="text-3xl font-bold text-green-600">{data.contentStructure.hubSpokeRatio}:1</div>
                <div className="text-sm text-green-700">Hub-Spoke Ratio</div>
              </div>
            </div>
          </div>
        </ReportSection>

        <PageBreak />

        {/* Migration Decisions */}
        <ReportSection
          title="Migration Decisions"
          subtitle="Recommended actions for each page in your site"
        >
          {/* Decision Summary */}
          <div className="mb-6">
            <DecisionSummary summary={data.migrationDecisions.summary} />
          </div>

          {includeCharts && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <MigrationStatusChart
                data={data.migrationDecisions.decisionChart}
                title="Decision Distribution"
                variant="bar"
                height={200}
              />
            </div>
          )}

          {/* Page Decision Table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Page</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Decision</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.migrationDecisions.pageDecisions.slice(0, 15).map((page, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                        {page.title}
                      </div>
                      <div className="text-xs text-gray-500 truncate max-w-xs">
                        {page.url}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ActionBadge action={page.decision} />
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                      {page.confidence}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.migrationDecisions.pageDecisions.length > 15 && (
              <div className="px-4 py-3 bg-gray-50 text-sm text-gray-500 text-center">
                + {data.migrationDecisions.pageDecisions.length - 15} more pages
              </div>
            )}
          </div>
        </ReportSection>

        {/* Action Plan */}
        {includeActionPlan && (
          <ReportSection
            title="Migration Action Plan"
            subtitle="Phased approach to implementing migration changes"
          >
            <div className="space-y-4">
              {data.actionPlan.phases.map((phase, i) => (
                <PhaseCard key={i} phase={phase} />
              ))}
            </div>

            {/* Priority Matrix */}
            {includeCharts && data.actionPlan.priorityMatrix.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Task Prioritization Matrix</h4>
                <PriorityList
                  data={data.actionPlan.priorityMatrix}
                  maxItems={10}
                />
              </div>
            )}
          </ReportSection>
        )}

        <PageBreak />

        {/* Implementation Guide */}
        {includeImplementationGuide && (
          <ReportSection
            title="Implementation Guide"
            subtitle="Technical specifications for migration execution"
          >
            {/* Redirect Map */}
            {includeRedirectMap && data.implementationGuide.redirectMap.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Redirect Map ({data.implementationGuide.redirectMap.length} redirects)
                </h4>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 font-mono text-sm">
                      {data.implementationGuide.redirectMap.slice(0, 10).map((redirect, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2 text-gray-700 truncate max-w-xs">{redirect.source}</td>
                          <td className="px-4 py-2 text-gray-700 truncate max-w-xs">{redirect.target}</td>
                          <td className="px-4 py-2 text-center">
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                              {redirect.type}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {data.implementationGuide.redirectMap.length > 10 && (
                    <div className="px-4 py-2 bg-gray-50 text-sm text-gray-500 text-center">
                      + {data.implementationGuide.redirectMap.length - 10} more redirects
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Technical Notes */}
            {data.implementationGuide.technicalNotes.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Technical Notes</h4>
                <ul className="space-y-2">
                  {data.implementationGuide.technicalNotes.map((note, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Code Snippets */}
            {data.implementationGuide.codeSnippets.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Configuration Examples</h4>
                <div className="space-y-4">
                  {data.implementationGuide.codeSnippets.map((snippet, i) => (
                    <div key={i} className="rounded-lg overflow-hidden border border-gray-200">
                      <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
                        <span className="text-xs text-gray-400">{snippet.language}</span>
                        <span className="text-xs text-gray-500">{snippet.description}</span>
                      </div>
                      <pre className="bg-gray-900 p-4 text-sm text-gray-100 overflow-x-auto">
                        <code>{snippet.code}</code>
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ReportSection>
        )}

        {/* Quality Assurance Checklists */}
        {includeQualityChecklists && (
          <ReportSection
            title="Quality Assurance"
            subtitle="Pre and post-migration checklists"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ChecklistSection
                title="Pre-Migration Checklist"
                items={data.qualityAssurance.preMigrationChecklist}
              />
              <ChecklistSection
                title="Post-Migration Checklist"
                items={data.qualityAssurance.postMigrationChecklist}
              />
            </div>
            <p className="text-xs text-gray-500 mt-4">* Required items must be completed</p>
          </ReportSection>
        )}

        {/* Footer */}
        <ReportFooter
          showDisclaimer
          disclaimerText="This migration report is generated based on automated site analysis. Migration activities should be planned carefully and executed by qualified technical personnel. Always maintain backups and test changes in a staging environment before production deployment."
          showBranding
          generatedAt={data.generatedAt}
        />
      </div>
    );
  }
);

MigrationReport.displayName = 'MigrationReport';

export default MigrationReport;
