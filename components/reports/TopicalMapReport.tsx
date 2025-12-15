/**
 * TopicalMapReport
 *
 * Professional, modern report template for topical map content strategy.
 * Designed for business stakeholders with clear explanations of SEO concepts.
 */

import React, { forwardRef } from 'react';
import { TopicalMapReportData, TopicalMapReportConfig, GapItem, ReportActionItem } from '../../types/reports';
import { ReportHeader } from './ReportHeader';
import { ReportFooter, ReportSectionDivider, PageBreak } from './ReportFooter';
import { TopicPieChart } from './charts/TopicPieChart';
import { EavCoverageChart } from './charts/EavCoverageChart';
import { AuditScoreGauge, ScoreBar } from './charts/AuditScoreGauge';

interface TopicalMapReportProps {
  data: TopicalMapReportData;
  config?: Partial<TopicalMapReportConfig>;
}

/**
 * Modern gradient card component
 */
const GradientCard: React.FC<{
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'info';
  className?: string;
}> = ({ children, variant = 'primary', className = '' }) => {
  const variants = {
    primary: 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200',
    secondary: 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200',
    success: 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200',
    warning: 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200',
    info: 'bg-gradient-to-br from-cyan-50 to-sky-50 border-cyan-200'
  };

  return (
    <div className={`rounded-xl border p-6 ${variants[variant]} ${className}`}>
      {children}
    </div>
  );
};

/**
 * Pillar card for displaying the 3 strategic pillars
 */
const PillarCard: React.FC<{
  title: string;
  value: string;
  explanation: string;
  businessImpact: string;
  icon: React.ReactNode;
  color: string;
}> = ({ title, value, explanation, businessImpact, icon, color }) => (
  <div className={`rounded-xl border-2 ${color} p-5 bg-white shadow-sm`}>
    <div className="flex items-start gap-3 mb-4">
      <div className={`p-2 rounded-lg ${color.replace('border-', 'bg-').replace('-500', '-100')}`}>
        {icon}
      </div>
      <div className="flex-1">
        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{title}</h4>
        <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
    </div>
    <div className="space-y-3">
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase mb-1">What This Means</p>
        <p className="text-sm text-gray-700 leading-relaxed">{explanation}</p>
      </div>
      <div className="pt-3 border-t border-gray-100">
        <p className="text-xs font-medium text-gray-500 uppercase mb-1">Business Impact</p>
        <p className="text-sm text-gray-700 leading-relaxed">{businessImpact}</p>
      </div>
    </div>
  </div>
);

/**
 * Section component with modern styling
 */
const ReportSection: React.FC<{
  title: string;
  subtitle?: string;
  explanation?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ title, subtitle, explanation, children, icon }) => (
  <section className="mb-10">
    <div className="flex items-start gap-3 mb-4">
      {icon && (
        <div className="p-2 bg-blue-100 rounded-lg text-blue-600 flex-shrink-0">
          {icon}
        </div>
      )}
      <div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        {subtitle && (
          <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
        )}
        {explanation && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
            <p className="text-sm text-blue-800 leading-relaxed">
              <span className="font-semibold">Why this matters: </span>
              {explanation}
            </p>
          </div>
        )}
      </div>
    </div>
    <div className="mt-5">{children}</div>
  </section>
);

/**
 * Topic tree item component
 */
const TopicTreeItem: React.FC<{
  topic: { title: string; description: string; reasoning?: string; };
  isCore?: boolean;
  children?: React.ReactNode;
}> = ({ topic, isCore, children }) => (
  <div className={`rounded-lg border ${isCore ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200 bg-white'} p-4`}>
    <div className="flex items-start gap-3">
      <span className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${isCore ? 'bg-blue-500' : 'bg-gray-400'}`} />
      <div className="flex-1">
        <h4 className={`font-semibold ${isCore ? 'text-blue-900' : 'text-gray-800'}`}>{topic.title}</h4>
        {topic.description && (
          <p className="text-sm text-gray-600 mt-1">{topic.description}</p>
        )}
        {topic.reasoning && (
          <p className="text-xs text-gray-500 mt-2 italic">
            Strategy: {topic.reasoning}
          </p>
        )}
        {children && <div className="ml-4 mt-3 space-y-2">{children}</div>}
      </div>
    </div>
  </div>
);

/**
 * Gap/Issue card component with modern styling
 */
const GapCard: React.FC<{ gap: GapItem }> = ({ gap }) => {
  const styles = {
    critical: {
      border: 'border-red-200',
      bg: 'bg-gradient-to-r from-red-50 to-rose-50',
      icon: 'bg-red-100 text-red-600',
      badge: 'bg-red-100 text-red-700'
    },
    warning: {
      border: 'border-amber-200',
      bg: 'bg-gradient-to-r from-amber-50 to-yellow-50',
      icon: 'bg-amber-100 text-amber-600',
      badge: 'bg-amber-100 text-amber-700'
    },
    info: {
      border: 'border-blue-200',
      bg: 'bg-gradient-to-r from-blue-50 to-sky-50',
      icon: 'bg-blue-100 text-blue-600',
      badge: 'bg-blue-100 text-blue-700'
    }
  };

  const style = styles[gap.severity];

  return (
    <div className={`rounded-xl border ${style.border} ${style.bg} p-5`}>
      <div className="flex items-start gap-4">
        <div className={`p-2 rounded-lg ${style.icon}`}>
          {gap.severity === 'critical' ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          ) : gap.severity === 'warning' ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-gray-900">{gap.title}</h4>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.badge}`}>
              {gap.severity === 'critical' ? 'Needs Attention' : gap.severity === 'warning' ? 'Review Recommended' : 'For Your Information'}
            </span>
          </div>
          <p className="text-sm text-gray-700">{gap.description}</p>
          {gap.recommendation && (
            <div className="mt-3 p-3 bg-white/60 rounded-lg border border-gray-100">
              <p className="text-sm text-gray-700">
                <span className="font-semibold text-gray-900">Recommended action: </span>
                {gap.recommendation}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Action item card with priority indicator
 */
const ActionCard: React.FC<{ action: ReportActionItem; index: number }> = ({ action, index }) => {
  const priorityStyles = {
    critical: { bg: 'bg-red-500', border: 'border-red-200', light: 'bg-red-50' },
    high: { bg: 'bg-orange-500', border: 'border-orange-200', light: 'bg-orange-50' },
    medium: { bg: 'bg-amber-500', border: 'border-amber-200', light: 'bg-amber-50' },
    low: { bg: 'bg-green-500', border: 'border-green-200', light: 'bg-green-50' }
  };

  const style = priorityStyles[action.priority];

  return (
    <div className={`rounded-xl border ${style.border} ${style.light} p-5`}>
      <div className="flex items-start gap-4">
        <span className={`flex-shrink-0 w-8 h-8 rounded-full ${style.bg} text-white text-sm font-bold flex items-center justify-center shadow-sm`}>
          {index + 1}
        </span>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-900">{action.title}</h4>
            <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full border border-gray-200">
              {action.category}
            </span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{action.description}</p>
        </div>
      </div>
    </div>
  );
};

/**
 * Business decision card
 */
const DecisionCard: React.FC<{
  decision: NonNullable<TopicalMapReportData['businessDecisions']>[0];
}> = ({ decision }) => (
  <div className="rounded-xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 p-6">
    <div className="flex items-start gap-3 mb-4">
      <div className="p-2 bg-purple-100 rounded-lg">
        <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div className="flex-1">
        <h4 className="font-bold text-purple-900 text-lg">{decision.title}</h4>
        <p className="text-sm text-purple-700 mt-1">{decision.description}</p>
      </div>
    </div>

    <div className="space-y-2 mb-4">
      {decision.options.map((option, i) => (
        <div key={i} className="flex items-start gap-2 p-3 bg-white/60 rounded-lg border border-purple-100">
          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-200 text-purple-700 text-xs font-bold flex items-center justify-center">
            {String.fromCharCode(65 + i)}
          </span>
          <p className="text-sm text-gray-700">{option}</p>
        </div>
      ))}
    </div>

    <div className="p-4 bg-white rounded-lg border border-purple-200">
      <p className="text-xs font-semibold text-purple-600 uppercase mb-1">Our Recommendation</p>
      <p className="text-sm text-gray-800 font-medium">{decision.recommendation}</p>
      <p className="text-xs text-gray-500 mt-2 italic">{decision.impact}</p>
    </div>
  </div>
);

/**
 * Main Topical Map Report component
 */
export const TopicalMapReport = forwardRef<HTMLDivElement, TopicalMapReportProps>(
  ({ data, config = {} }, ref) => {
    const {
      includeCharts = true,
      includeEavDetails = true,
      includeGapAnalysis = true,
      includeNextSteps = true
    } = config;

    // Icons for pillars
    const CentralEntityIcon = (
      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    );

    const SourceContextIcon = (
      <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    );

    const IntentIcon = (
      <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    );

    return (
      <div
        ref={ref}
        className="bg-white p-8 max-w-4xl mx-auto print:p-6 print:max-w-none"
        style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
      >
        {/* Header */}
        <ReportHeader
          title="Content Strategy Report"
          subtitle={`Strategic Topical Map Analysis`}
          domain={data.domain}
          generatedAt={data.generatedAt}
          metrics={data.metrics}
          variant="branded"
        />

        {/* Executive Summary */}
        <GradientCard variant="primary" className="mb-10">
          <h2 className="text-xl font-bold text-blue-900 mb-4">Executive Summary</h2>
          <p className="text-lg text-blue-800 font-medium mb-6">
            {data.executiveSummary.headline}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-white/60 rounded-lg">
              <div className="text-3xl font-bold text-blue-900">{data.executiveSummary.totalTopics}</div>
              <div className="text-sm text-blue-700">Total Topics</div>
            </div>
            <div className="text-center p-3 bg-white/60 rounded-lg">
              <div className="text-3xl font-bold text-blue-900">{data.executiveSummary.coreTopics}</div>
              <div className="text-sm text-blue-700">Core Topics</div>
            </div>
            <div className="text-center p-3 bg-white/60 rounded-lg">
              <div className="text-3xl font-bold text-blue-900">{data.executiveSummary.outerTopics}</div>
              <div className="text-sm text-blue-700">Supporting Topics</div>
            </div>
            <div className="text-center p-3 bg-white/60 rounded-lg">
              <div className="text-3xl font-bold text-blue-900">{data.semanticCoverage.totalEavs}</div>
              <div className="text-sm text-blue-700">Semantic Attributes</div>
            </div>
          </div>
        </GradientCard>

        {/* Strategic Foundation - The 3 Pillars */}
        <ReportSection
          title="Strategic Foundation"
          subtitle="The three pillars that define your content strategy"
          explanation="These three elements work together to create a focused, authoritative content strategy. When all three are aligned, search engines understand exactly what your site is about and who it serves - leading to better rankings and more qualified traffic."
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          }
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <PillarCard
              title="Central Entity"
              value={data.strategicFoundation.pillars.centralEntity.value}
              explanation={data.strategicFoundation.pillars.centralEntity.explanation}
              businessImpact={data.strategicFoundation.pillars.centralEntity.businessImpact}
              icon={CentralEntityIcon}
              color="border-blue-500"
            />
            <PillarCard
              title="Source Context"
              value={data.strategicFoundation.pillars.sourceContext.value}
              explanation={data.strategicFoundation.pillars.sourceContext.explanation}
              businessImpact={data.strategicFoundation.pillars.sourceContext.businessImpact}
              icon={SourceContextIcon}
              color="border-emerald-500"
            />
            <PillarCard
              title="Central Search Intent"
              value={data.strategicFoundation.pillars.centralSearchIntent.value}
              explanation={data.strategicFoundation.pillars.centralSearchIntent.explanation}
              businessImpact={data.strategicFoundation.pillars.centralSearchIntent.businessImpact}
              icon={IntentIcon}
              color="border-purple-500"
            />
          </div>

          <div className="mt-6 p-5 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-2">Your Overall Strategy</h4>
            <p className="text-gray-700 leading-relaxed">{data.strategicFoundation.overallStrategy}</p>
          </div>
        </ReportSection>

        <ReportSectionDivider />

        {/* Topic Hierarchy */}
        <ReportSection
          title="Content Structure"
          subtitle="How your content is organized into pillars and supporting articles"
          explanation="A well-structured content hierarchy helps search engines understand the relationships between your topics. Core topics establish authority, while supporting topics provide depth and capture long-tail search traffic."
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {includeCharts && (
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <TopicPieChart
                  data={data.topicHierarchy.distribution}
                  title="Topic Distribution"
                  height={220}
                />
              </div>
            )}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Content Pillars</h4>
              <div className="space-y-2">
                {data.topicHierarchy.pillars.map((pillar, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-200 transition-colors">
                    <div className="flex-1">
                      <span className="font-semibold text-gray-900">{pillar.name}</span>
                      {pillar.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">{pillar.description}</p>
                      )}
                    </div>
                    <span className="text-sm text-blue-600 font-medium bg-blue-50 px-3 py-1 rounded-full">
                      {pillar.topicCount} topics
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-4 italic">
                Topic depth: {data.topicHierarchy.depth} levels
              </p>
            </div>
          </div>
        </ReportSection>

        {/* Topic Tree (Optional) */}
        {data.topicTree && data.topicTree.coreTopics.length > 0 && (
          <ReportSection
            title="Detailed Topic Map"
            subtitle="Complete view of your content structure with strategic reasoning"
            explanation="Each topic has a specific purpose in building your topical authority. Understanding the 'why' behind each topic helps ensure content creation stays aligned with your strategy."
          >
            <div className="space-y-4">
              {data.topicTree.coreTopics.slice(0, 5).map((core) => (
                <TopicTreeItem key={core.id} topic={core} isCore>
                  {core.children.slice(0, 5).map((child) => (
                    <TopicTreeItem key={child.id} topic={child} />
                  ))}
                  {core.children.length > 5 && (
                    <p className="text-xs text-gray-500 ml-5 italic">
                      + {core.children.length - 5} more supporting topics
                    </p>
                  )}
                </TopicTreeItem>
              ))}
              {data.topicTree.coreTopics.length > 5 && (
                <p className="text-sm text-gray-500 text-center italic">
                  + {data.topicTree.coreTopics.length - 5} more core topics not shown
                </p>
              )}
            </div>
          </ReportSection>
        )}

        <PageBreak />

        {/* Semantic Coverage */}
        {includeEavDetails && (
          <ReportSection
            title="Semantic Depth"
            subtitle="How comprehensively your content addresses what customers search for"
            explanation="Semantic coverage measures the depth of information in your content. More attributes mean more ways search engines can match your content to user queries - especially specific, high-intent searches that convert better."
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-gray-700">Coverage Score</span>
                  <span className="text-3xl font-bold text-blue-600">
                    {data.semanticCoverage.coverageScore}%
                  </span>
                </div>
                <ScoreBar
                  score={data.semanticCoverage.coverageScore}
                  label="Overall Coverage"
                />
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {data.semanticCoverage.explanation}
                  </p>
                </div>
              </div>
              {includeCharts && data.semanticCoverage.categoryBreakdown.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <EavCoverageChart
                    data={data.semanticCoverage.categoryBreakdown}
                    title="Attributes by Category"
                    height={200}
                    horizontal
                  />
                </div>
              )}
            </div>
          </ReportSection>
        )}

        {/* EAV Details (Optional) */}
        {data.eavDetails && data.eavDetails.categorizedTree.length > 0 && (
          <ReportSection
            title="Semantic Attributes Detail"
            subtitle="Categorized breakdown of your content's semantic coverage"
          >
            <div className="space-y-6">
              {data.eavDetails.categorizedTree.map((category, i) => (
                <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900">{category.category}</h4>
                        <p className="text-xs text-gray-500 mt-1">{category.categoryDescription}</p>
                      </div>
                      <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                        {category.eavs.length} attributes
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {category.eavs.slice(0, 6).map((eav, j) => (
                        <div key={j} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                          <span className="font-medium text-gray-700">{eav.attribute}:</span>
                          <span className="text-gray-600">{eav.value}</span>
                        </div>
                      ))}
                    </div>
                    {category.eavs.length > 6 && (
                      <p className="text-xs text-gray-500 mt-2 italic text-center">
                        + {category.eavs.length - 6} more attributes in this category
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ReportSection>
        )}

        {/* Content Gaps */}
        {includeGapAnalysis && data.gaps.length > 0 && (
          <ReportSection
            title="Areas for Improvement"
            subtitle="Identified opportunities to strengthen your content strategy"
            explanation="These gaps represent opportunities. Addressing them will improve your content's completeness, which search engines reward with better visibility. Prioritize based on severity - critical items first."
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
          >
            <div className="space-y-4">
              {data.gaps.slice(0, 5).map((gap, i) => (
                <GapCard key={i} gap={gap} />
              ))}
            </div>
            {data.gaps.length > 5 && (
              <p className="text-sm text-gray-500 mt-4 text-center italic">
                + {data.gaps.length - 5} additional items identified
              </p>
            )}
          </ReportSection>
        )}

        {/* Business Decisions */}
        {data.businessDecisions && data.businessDecisions.length > 0 && (
          <ReportSection
            title="Decisions Needed"
            subtitle="Strategic choices that require stakeholder input"
            explanation="These decisions affect your content direction and require business context that only you can provide. Our recommendations are based on best practices, but your specific situation may warrant different choices."
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          >
            <div className="space-y-6">
              {data.businessDecisions.map((decision, i) => (
                <DecisionCard key={i} decision={decision} />
              ))}
            </div>
          </ReportSection>
        )}

        <PageBreak />

        {/* Next Steps */}
        {includeNextSteps && data.nextSteps.length > 0 && (
          <ReportSection
            title="Recommended Actions"
            subtitle="Prioritized steps to strengthen your content strategy"
            explanation="These actions are ordered by impact. Completing them will improve your site's topical authority, search visibility, and ability to attract your target audience."
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            }
          >
            <div className="space-y-4">
              {data.nextSteps.map((action, i) => (
                <ActionCard key={action.id} action={action} index={i} />
              ))}
            </div>
          </ReportSection>
        )}

        {/* Footer */}
        <ReportFooter
          showDisclaimer
          disclaimerText="This report provides strategic recommendations based on semantic SEO best practices and your specific topical map configuration. Implementation timelines and priorities should be adjusted based on your available resources and business objectives. The recommendations are designed to build long-term organic visibility and authority."
          showBranding
          generatedAt={data.generatedAt}
        />
      </div>
    );
  }
);

TopicalMapReport.displayName = 'TopicalMapReport';

export default TopicalMapReport;
