/**
 * ArticleDraftReport
 *
 * Comprehensive report for article generation quality assessment.
 * Designed for business stakeholders and content writers to review
 * generated content, understand quality metrics, and prepare for publication.
 */

import React, { forwardRef } from 'react';
import { ArticleDraftReportData, ArticleDraftReportConfig, ReportActionItem } from '../../types/reports';
import { ReportHeader } from './ReportHeader';
import { ReportFooter, PageBreak } from './ReportFooter';
import { AuditScoreGauge, ScoreBar } from './charts/AuditScoreGauge';
import { ProgressTimeline } from './charts/ProgressTimeline';
import { EavCoverageChart } from './charts/EavCoverageChart';

interface ArticleDraftReportProps {
  data: ArticleDraftReportData;
  config?: Partial<ArticleDraftReportConfig>;
}

// ============================================
// HELPER COMPONENTS
// ============================================

/**
 * Why This Matters explanation component
 */
const WhyThisMatters: React.FC<{ text: string }> = ({ text }) => (
  <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-l-4 border-blue-500">
    <div className="flex items-start gap-2">
      <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
      <div>
        <span className="text-sm font-semibold text-blue-800">Why This Matters</span>
        <p className="text-sm text-blue-700 mt-1">{text}</p>
      </div>
    </div>
  </div>
);

/**
 * Section wrapper with consistent styling
 */
const ReportSection: React.FC<{
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, subtitle, icon, children }) => (
  <section className="mb-10">
    <div className="flex items-center gap-3 mb-2">
      {icon && <span className="text-gray-400">{icon}</span>}
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
    </div>
    {subtitle && (
      <p className="text-sm text-gray-600 mb-4 ml-0">{subtitle}</p>
    )}
    <div className="mt-4">{children}</div>
  </section>
);

/**
 * Readiness badge with color coding
 */
const ReadinessBadge: React.FC<{ level: ArticleDraftReportData['executiveSummary']['readinessLevel'] }> = ({ level }) => {
  const config = {
    'publish-ready': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', label: 'Ready to Publish' },
    'minor-edits': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', label: 'Minor Edits Needed' },
    'needs-review': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', label: 'Needs Review' },
    'not-ready': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', label: 'Not Ready' }
  };
  const c = config[level];

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${c.bg} ${c.text} border ${c.border}`}>
      {c.label}
    </span>
  );
};

/**
 * Priority indicator
 */
const PriorityBadge: React.FC<{ priority: 'critical' | 'high' | 'medium' | 'low' }> = ({ priority }) => {
  const colors = {
    critical: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800'
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${colors[priority]}`}>
      {priority}
    </span>
  );
};

/**
 * Status indicator
 */
const StatusIndicator: React.FC<{ status: 'complete' | 'incomplete' | 'na' | 'verified' | 'needs-check' | 'unverified' | 'placeholder' | 'generated' | 'uploaded' }> = ({ status }) => {
  const config: Record<string, { icon: React.ReactNode; color: string }> = {
    'complete': {
      icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>,
      color: 'text-green-500'
    },
    'verified': {
      icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>,
      color: 'text-green-500'
    },
    'uploaded': {
      icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>,
      color: 'text-green-500'
    },
    'generated': {
      icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>,
      color: 'text-blue-500'
    },
    'incomplete': {
      icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>,
      color: 'text-red-500'
    },
    'needs-check': {
      icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>,
      color: 'text-yellow-500'
    },
    'unverified': {
      icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>,
      color: 'text-gray-400'
    },
    'placeholder': {
      icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>,
      color: 'text-gray-400'
    },
    'na': {
      icon: <span className="w-4 h-4 flex items-center justify-center text-xs">N/A</span>,
      color: 'text-gray-400'
    }
  };

  const c = config[status] || config['na'];
  return <span className={c.color}>{c.icon}</span>;
};

/**
 * Validation rule card with description and impact
 */
const ValidationRuleCard: React.FC<{
  rule: ArticleDraftReportData['validationRules']['rules'][0];
}> = ({ rule }) => (
  <div className={`p-4 rounded-lg border ${rule.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
    <div className="flex items-start justify-between mb-2">
      <div className="flex items-center gap-2">
        <StatusIndicator status={rule.passed ? 'complete' : 'incomplete'} />
        <span className={`font-medium ${rule.passed ? 'text-green-800' : 'text-red-800'}`}>
          {rule.businessName}
        </span>
      </div>
      <span className={`text-sm font-medium ${rule.passed ? 'text-green-600' : 'text-red-600'}`}>
        {rule.score}%
      </span>
    </div>
    <p className="text-sm text-gray-700 mb-2">{rule.description}</p>
    {rule.details && !rule.passed && (
      <p className="text-sm text-red-700 mb-2">
        <span className="font-medium">Issue:</span> {rule.details}
      </p>
    )}
    {rule.recommendation && !rule.passed && (
      <p className="text-sm text-blue-700">
        <span className="font-medium">Recommendation:</span> {rule.recommendation}
      </p>
    )}
    <div className="mt-2 text-xs text-gray-500">
      <span className="font-medium">Impact:</span> {rule.impact}
    </div>
  </div>
);

/**
 * Checklist category with items
 */
const ChecklistCategory: React.FC<{
  category: ArticleDraftReportData['publicationChecklist']['categories'][0];
}> = ({ category }) => {
  const completedCount = category.items.filter(i => i.status === 'complete').length;
  const requiredCount = category.items.filter(i => i.required).length;
  const requiredCompleted = category.items.filter(i => i.required && i.status === 'complete').length;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
        <h4 className="font-medium text-gray-900">{category.category}</h4>
        <span className="text-sm text-gray-500">
          {completedCount}/{category.items.length} complete
          {requiredCount > 0 && ` (${requiredCompleted}/${requiredCount} required)`}
        </span>
      </div>
      <div className="divide-y divide-gray-100">
        {category.items.map((item, idx) => (
          <div key={idx} className={`px-4 py-3 ${item.status === 'incomplete' && item.required ? 'bg-red-50' : ''}`}>
            <div className="flex items-start gap-3">
              <StatusIndicator status={item.status} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${item.status === 'complete' ? 'text-gray-700' : 'text-gray-900'}`}>
                    {item.item}
                  </span>
                  {item.required && (
                    <span className="text-xs font-medium text-red-600 uppercase">Required</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{item.reason}</p>
                {item.action && item.status !== 'complete' && (
                  <p className="text-xs text-blue-600 mt-1">
                    <span className="font-medium">Action:</span> {item.action}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Improvement card
 */
const ImprovementCard: React.FC<{ improvement: ReportActionItem; index: number }> = ({ improvement, index }) => (
  <div className="p-4 rounded-lg border border-gray-200 bg-white">
    <div className="flex items-start gap-3">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600">
        {index + 1}
      </span>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-medium text-gray-900">{improvement.title}</h4>
          <PriorityBadge priority={improvement.priority} />
        </div>
        <p className="text-sm text-gray-600">{improvement.description}</p>
        <span className="text-xs text-gray-400 mt-1 inline-block">{improvement.category}</span>
      </div>
    </div>
  </div>
);

// ============================================
// MAIN COMPONENT
// ============================================

export const ArticleDraftReport = forwardRef<HTMLDivElement, ArticleDraftReportProps>(
  ({ data, config = {} }, ref) => {
    const {
      includeCharts = true,
      includeAuditDetails = true,
      includeSectionBreakdown = true,
      includeImprovementAreas = true
    } = config;

    return (
      <div
        ref={ref}
        className="bg-white p-8 max-w-5xl mx-auto print:p-4 print:max-w-none"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        {/* Header */}
        <ReportHeader
          title="Article Quality Report"
          subtitle={data.articleTitle}
          generatedAt={data.generatedAt}
          metrics={data.metrics}
          variant="branded"
        />

        {/* Target Information */}
        <div className="mb-8 flex items-center gap-4 text-sm">
          <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full font-medium">
            {data.targetKeyword}
          </span>
          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full">
            {data.searchIntent}
          </span>
        </div>

        {/* ============================== */}
        {/* EXECUTIVE SUMMARY */}
        {/* ============================== */}
        <ReportSection
          title="Executive Summary"
          subtitle="At-a-glance assessment of article readiness for publication"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        >
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-lg font-semibold text-gray-900">{data.executiveSummary.headline}</p>
                <p className="text-gray-600 mt-1">{data.executiveSummary.overallAssessment}</p>
              </div>
              <div className="text-center">
                <ReadinessBadge level={data.executiveSummary.readinessLevel} />
                <div className="mt-2 text-3xl font-bold text-indigo-600">
                  {data.executiveSummary.readinessScore}%
                </div>
                <div className="text-xs text-gray-500">Readiness Score</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {data.executiveSummary.keyStrengths.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-green-700 mb-2">Key Strengths</h4>
                  <ul className="space-y-1">
                    {data.executiveSummary.keyStrengths.map((strength, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <svg className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {data.executiveSummary.criticalIssues.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-red-700 mb-2">Critical Issues</h4>
                  <ul className="space-y-1">
                    {data.executiveSummary.criticalIssues.map((issue, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <WhyThisMatters text={data.executiveSummary.whyThisMatters} />
        </ReportSection>

        {/* ============================== */}
        {/* GENERATION SUMMARY */}
        {/* ============================== */}
        <ReportSection
          title="Generation Process"
          subtitle="How this article was created through our multi-pass content optimization system"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center justify-center p-6 bg-gray-50 rounded-xl">
              <AuditScoreGauge
                score={data.generationSummary.qualityScore}
                title="Overall Quality Score"
                size="lg"
              />
            </div>

            {includeCharts && (
              <div className="p-4 bg-gray-50 rounded-xl">
                <ProgressTimeline
                  items={data.generationSummary.timeline}
                  title="Content Refinement Stages"
                  orientation="vertical"
                  compact
                />
              </div>
            )}
          </div>

          <WhyThisMatters text={data.generationSummary.whyThisMatters} />
        </ReportSection>

        <PageBreak />

        {/* ============================== */}
        {/* ARTICLE CONTENT */}
        {/* ============================== */}
        <ReportSection
          title="Article Content"
          subtitle="The complete generated article ready for review"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
        >
          {/* Meta Information */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase">Meta Title</span>
              <p className="text-gray-900 font-medium">{data.articleContent.metaTitle}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500 uppercase">Meta Description</span>
              <p className="text-gray-700 text-sm">{data.articleContent.metaDescription}</p>
            </div>
          </div>

          {/* Table of Contents */}
          {data.articleContent.tableOfContents.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Table of Contents</h4>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <ul className="space-y-1">
                  {data.articleContent.tableOfContents.map((item, idx) => (
                    <li
                      key={idx}
                      className="text-sm text-gray-700 hover:text-blue-600"
                      style={{ paddingLeft: `${(item.level - 1) * 16}px` }}
                    >
                      <span className="text-gray-400 mr-2">
                        {item.level === 1 ? '■' : item.level === 2 ? '□' : '○'}
                      </span>
                      {item.title}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Full Article Content */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Full Article Content</h4>
            <div className="bg-white border border-gray-200 rounded-lg p-6 max-h-96 overflow-y-auto prose prose-sm max-w-none">
              <div
                className="whitespace-pre-wrap text-gray-800 text-sm leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: data.articleContent.fullContent
                    .replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>')
                    .replace(/^## (.*$)/gm, '<h2 class="text-lg font-semibold mt-4 mb-2">$1</h2>')
                    .replace(/^### (.*$)/gm, '<h3 class="text-base font-medium mt-3 mb-1">$1</h3>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    .replace(/\n/g, '<br />')
                }}
              />
            </div>
          </div>

          <WhyThisMatters text={data.articleContent.whyThisMatters} />
        </ReportSection>

        <PageBreak />

        {/* ============================== */}
        {/* IMAGE PLACEHOLDERS */}
        {/* ============================== */}
        {data.imagePlaceholders.images.length > 0 && (
          <ReportSection
            title="Image Requirements"
            subtitle="Visual elements needed to complete this article"
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
          >
            <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">
                {data.imagePlaceholders.totalPlaced} of {data.imagePlaceholders.totalRequired} images placed
              </span>
              <div className="w-32">
                <ScoreBar
                  score={Math.round((data.imagePlaceholders.totalPlaced / data.imagePlaceholders.totalRequired) * 100)}
                  showPercentage
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.imagePlaceholders.images.map((image, idx) => (
                <div key={image.id || idx} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="aspect-video bg-gray-100 flex items-center justify-center relative">
                    {image.thumbnailUrl ? (
                      <img
                        src={image.thumbnailUrl}
                        alt={image.altText}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs text-gray-400">Image Placeholder</span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        image.status === 'uploaded' ? 'bg-green-100 text-green-800' :
                        image.status === 'generated' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {image.status}
                      </span>
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                        {image.type}
                      </span>
                      <span className="text-xs text-gray-500">{image.placementSection}</span>
                    </div>
                    <p className="text-sm text-gray-700 mb-1">{image.description}</p>
                    <p className="text-xs text-gray-500">
                      <span className="font-medium">Alt:</span> {image.altText}
                    </p>
                    {image.caption && (
                      <p className="text-xs text-gray-500 mt-1">
                        <span className="font-medium">Caption:</span> {image.caption}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <WhyThisMatters text={data.imagePlaceholders.whyThisMatters} />
          </ReportSection>
        )}

        {/* ============================== */}
        {/* INTERNAL LINKING */}
        {/* ============================== */}
        <ReportSection
          title="Internal Linking Strategy"
          subtitle="Connections to other content in your ecosystem"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>}
        >
          <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
            <div>
              <span className="text-sm text-gray-600">
                {data.internalLinking.totalLinks} links in content
              </span>
              {data.internalLinking.recommendedMinimum > 0 && (
                <span className="text-xs text-gray-500 ml-2">
                  (Recommended minimum: {data.internalLinking.recommendedMinimum})
                </span>
              )}
            </div>
            {data.internalLinking.missingLinks.length > 0 && (
              <span className="text-sm text-orange-600 font-medium">
                {data.internalLinking.missingLinks.length} suggested links missing
              </span>
            )}
          </div>

          {/* Links in Content */}
          {data.internalLinking.linksInContent.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Links Currently in Article</h4>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Anchor Text</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Target Page</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Context</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.internalLinking.linksInContent.map((link, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 text-blue-600 font-medium">{link.anchor}</td>
                        <td className="px-3 py-2 text-gray-700">{link.targetTitle}</td>
                        <td className="px-3 py-2 text-gray-500 text-xs">{link.context}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Missing Links */}
          {data.internalLinking.missingLinks.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-orange-700 mb-2">Recommended Links to Add</h4>
              <div className="space-y-2">
                {data.internalLinking.missingLinks.map((link, idx) => (
                  <div key={idx} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="font-medium text-gray-900">{link.targetTitle}</div>
                    <p className="text-sm text-gray-600 mt-1">{link.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Links */}
          {data.internalLinking.suggestedLinks.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Additional Link Opportunities</h4>
              <div className="space-y-2">
                {data.internalLinking.suggestedLinks.map((link, idx) => (
                  <div key={idx} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{link.targetTitle}</span>
                      <span className="text-xs text-blue-600">Suggested anchor: "{link.anchorSuggestion}"</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{link.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <WhyThisMatters text={data.internalLinking.whyThisMatters} />
        </ReportSection>

        <PageBreak />

        {/* ============================== */}
        {/* FACTS TO VERIFY */}
        {/* ============================== */}
        {data.factsToVerify.facts.length > 0 && (
          <ReportSection
            title="Facts Requiring Verification"
            subtitle="Claims and statistics that should be fact-checked before publication"
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
          >
            <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">
                {data.factsToVerify.totalFacts} facts identified
              </span>
              <span className="text-sm text-gray-600">
                {data.factsToVerify.verifiedCount} verified
              </span>
            </div>

            <div className="space-y-3">
              {data.factsToVerify.facts.map((fact, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border ${
                    fact.verificationStatus === 'verified' ? 'bg-green-50 border-green-200' :
                    fact.verificationStatus === 'needs-check' ? 'bg-yellow-50 border-yellow-200' :
                    'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <StatusIndicator status={fact.verificationStatus} />
                      <div>
                        <p className="text-gray-900 font-medium">{fact.claim}</p>
                        {fact.source && (
                          <p className="text-xs text-gray-500 mt-1">Source: {fact.source}</p>
                        )}
                        <p className="text-sm text-gray-600 mt-2">{fact.reason}</p>
                      </div>
                    </div>
                    <PriorityBadge priority={fact.priority} />
                  </div>
                </div>
              ))}
            </div>

            <WhyThisMatters text={data.factsToVerify.whyThisMatters} />
          </ReportSection>
        )}

        {/* ============================== */}
        {/* VALIDATION RULES */}
        {/* ============================== */}
        {includeAuditDetails && (
          <ReportSection
            title="Content Quality Validation"
            subtitle="Algorithmic checks applied to ensure content meets quality standards"
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
          >
            <div className="flex items-center justify-between mb-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <span className="text-sm text-gray-600">Rules Passed</span>
                <div className="text-2xl font-bold text-gray-900">
                  {data.validationRules.passedCount} / {data.validationRules.totalRules}
                </div>
              </div>
              <div className="w-32">
                <ScoreBar
                  score={Math.round((data.validationRules.passedCount / data.validationRules.totalRules) * 100)}
                  showPercentage
                />
              </div>
            </div>

            <div className="space-y-3">
              {data.validationRules.rules.map((rule, idx) => (
                <ValidationRuleCard key={idx} rule={rule} />
              ))}
            </div>

            <WhyThisMatters text={data.validationRules.whyThisMatters} />
          </ReportSection>
        )}

        <PageBreak />

        {/* ============================== */}
        {/* CONTENT METRICS */}
        {/* ============================== */}
        <ReportSection
          title="Content Metrics"
          subtitle="Key statistics about the generated article"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-900">
                {data.contentMetrics.wordCount.toLocaleString()}
              </div>
              <div className="text-xs text-gray-600 mt-1">Words</div>
              {data.contentMetrics.targetWordCount > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  Target: {data.contentMetrics.targetWordCount.toLocaleString()}
                </div>
              )}
            </div>
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-900">
                {data.contentMetrics.headingCount}
              </div>
              <div className="text-xs text-gray-600 mt-1">Headings</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-900">
                {data.contentMetrics.imageCount}
              </div>
              <div className="text-xs text-gray-600 mt-1">Images</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-900">
                {data.contentMetrics.readingTime}
              </div>
              <div className="text-xs text-gray-600 mt-1">Read Time</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-3 bg-white border border-gray-200 rounded-lg">
              <div className="text-lg font-semibold text-gray-900">{data.contentMetrics.paragraphCount}</div>
              <div className="text-xs text-gray-500">Paragraphs</div>
            </div>
            <div className="p-3 bg-white border border-gray-200 rounded-lg">
              <div className="text-lg font-semibold text-gray-900">{data.contentMetrics.linkCount}</div>
              <div className="text-xs text-gray-500">Internal Links</div>
            </div>
            {data.contentMetrics.readabilityScore !== undefined && (
              <div className="p-3 bg-white border border-gray-200 rounded-lg">
                <div className="text-lg font-semibold text-gray-900">{data.contentMetrics.readabilityScore}</div>
                <div className="text-xs text-gray-500">Readability Score</div>
              </div>
            )}
          </div>

          <WhyThisMatters text={data.contentMetrics.whyThisMatters} />
        </ReportSection>

        {/* ============================== */}
        {/* SEMANTIC ANALYSIS */}
        {/* ============================== */}
        {includeCharts && data.semanticAnalysis.categoryBreakdown.length > 0 && (
          <ReportSection
            title="Semantic Coverage"
            subtitle="How well the article covers required topic attributes"
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="mb-4">
                  <ScoreBar
                    score={data.semanticAnalysis.eavCoverage}
                    label="Attribute Coverage"
                    showPercentage
                  />
                </div>

                {data.semanticAnalysis.coveredAttributes.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Covered Attributes</h4>
                    <div className="max-h-32 overflow-y-auto">
                      {data.semanticAnalysis.coveredAttributes.slice(0, 15).map((attr, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm py-1">
                          <span className="text-green-500">✓</span>
                          <span className="text-gray-700">{attr.attribute}</span>
                          <span className="text-xs text-gray-400">({attr.location})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {data.semanticAnalysis.missingAttributes.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-orange-700 mb-2">Missing Attributes</h4>
                    <div className="max-h-32 overflow-y-auto">
                      {data.semanticAnalysis.missingAttributes.slice(0, 10).map((attr, i) => (
                        <div key={i} className="text-sm py-1 border-l-2 border-orange-300 pl-2">
                          <span className="text-gray-700">{attr.attribute}: {attr.value}</span>
                          <p className="text-xs text-gray-500">{attr.suggestion}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <EavCoverageChart
                  data={data.semanticAnalysis.categoryBreakdown}
                  title="Coverage by Category"
                  height={200}
                  horizontal
                />
              </div>
            </div>

            <WhyThisMatters text={data.semanticAnalysis.whyThisMatters} />
          </ReportSection>
        )}

        {/* ============================== */}
        {/* SECTION BREAKDOWN */}
        {/* ============================== */}
        {includeSectionBreakdown && data.sectionBreakdown.sections.length > 0 && (
          <ReportSection
            title="Section-by-Section Analysis"
            subtitle="Detailed quality assessment for each content section"
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>}
          >
            <div className="space-y-3">
              {data.sectionBreakdown.sections.map((section, i) => (
                <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400" style={{ marginLeft: `${(section.level - 1) * 12}px` }}>
                        {section.level === 1 ? 'H1' : section.level === 2 ? 'H2' : 'H3'}
                      </span>
                      <span className="font-medium text-gray-900">{section.sectionTitle}</span>
                    </div>
                    <span className="text-sm text-gray-500">{section.wordCount} words</span>
                  </div>

                  <div className="px-4 py-3">
                    {/* Quality Indicators */}
                    <div className="flex flex-wrap gap-2 mb-2">
                      {section.qualityIndicators.hasIntro && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">Has Intro</span>
                      )}
                      {section.qualityIndicators.hasConclusion && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">Has Conclusion</span>
                      )}
                      {section.qualityIndicators.hasExamples && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">Has Examples</span>
                      )}
                      {section.qualityIndicators.hasData && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">Has Data</span>
                      )}
                    </div>

                    {/* Issues */}
                    {section.issues.length > 0 && (
                      <div className="mb-2">
                        {section.issues.map((issue, idx) => (
                          <p key={idx} className="text-sm text-red-600 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            {issue}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Suggestions */}
                    {section.suggestions.length > 0 && (
                      <div>
                        {section.suggestions.map((suggestion, idx) => (
                          <p key={idx} className="text-sm text-blue-600 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            {suggestion}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <WhyThisMatters text={data.sectionBreakdown.whyThisMatters} />
          </ReportSection>
        )}

        <PageBreak />

        {/* ============================== */}
        {/* PUBLICATION CHECKLIST */}
        {/* ============================== */}
        <ReportSection
          title="Publication Checklist"
          subtitle="Complete these items before publishing this article"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
        >
          <div className="flex items-center justify-between mb-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <span className="text-sm text-gray-600">Overall Completion</span>
              <div className="text-2xl font-bold text-gray-900">
                {data.publicationChecklist.completionPercentage}%
              </div>
            </div>
            <div className="w-40">
              <ScoreBar score={data.publicationChecklist.completionPercentage} showPercentage />
            </div>
          </div>

          {/* Blockers */}
          {data.publicationChecklist.blockers.length > 0 && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-medium text-red-800 mb-2">Publication Blockers</h4>
              <ul className="space-y-1">
                {data.publicationChecklist.blockers.map((blocker, idx) => (
                  <li key={idx} className="text-sm text-red-700 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {blocker}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Checklist Categories */}
          <div className="space-y-4">
            {data.publicationChecklist.categories.map((category, idx) => (
              <ChecklistCategory key={idx} category={category} />
            ))}
          </div>

          <WhyThisMatters text={data.publicationChecklist.whyThisMatters} />
        </ReportSection>

        {/* ============================== */}
        {/* IMPROVEMENT AREAS */}
        {/* ============================== */}
        {includeImprovementAreas && data.improvements.length > 0 && (
          <ReportSection
            title="Recommended Improvements"
            subtitle="Prioritized actions to enhance this article before publication"
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
          >
            <div className="space-y-3">
              {data.improvements.map((improvement, i) => (
                <ImprovementCard key={improvement.id} improvement={improvement} index={i} />
              ))}
            </div>
          </ReportSection>
        )}

        {/* Footer */}
        <ReportFooter
          showDisclaimer
          disclaimerText="This quality report is generated automatically based on algorithmic content analysis. Human review is recommended before publication to ensure accuracy, brand alignment, and editorial standards. All facts should be verified by subject matter experts."
          showBranding
          generatedAt={data.generatedAt}
        />
      </div>
    );
  }
);

ArticleDraftReport.displayName = 'ArticleDraftReport';

export default ArticleDraftReport;
