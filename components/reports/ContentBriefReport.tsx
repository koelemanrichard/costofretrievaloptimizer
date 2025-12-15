/**
 * ContentBriefReport
 *
 * Professional report template for content briefs with comprehensive
 * business reasoning and actionable guidance for content writers.
 */

import React, { forwardRef } from 'react';
import { ContentBriefReportData, ContentBriefReportConfig } from '../../types/reports';
import { ReportHeader } from './ReportHeader';
import { ReportFooter, ReportSectionDivider, PageBreak } from './ReportFooter';
import { EavCoverageChart } from './charts/EavCoverageChart';

interface ContentBriefReportProps {
  data: ContentBriefReportData;
  config?: Partial<ContentBriefReportConfig>;
}

// ============================================
// REUSABLE COMPONENTS
// ============================================

const WhyThisMatters: React.FC<{ text: string }> = ({ text }) => (
  <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
    <div className="flex items-start gap-2">
      <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div>
        <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Why This Matters</span>
        <p className="text-sm text-blue-800 mt-1">{text}</p>
      </div>
    </div>
  </div>
);

const GradientSection: React.FC<{
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  gradient?: string;
}> = ({ title, subtitle, icon, children, gradient = 'from-gray-50 to-white' }) => (
  <section className="mb-8">
    <div className={`bg-gradient-to-br ${gradient} rounded-xl border border-gray-200 overflow-hidden`}>
      <div className="px-6 py-4 border-b border-gray-200 bg-white/50">
        <div className="flex items-center gap-3">
          {icon && <div className="text-blue-600">{icon}</div>}
          <div>
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
          </div>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </section>
);

const IntentBadge: React.FC<{ intent: string }> = ({ intent }) => {
  const config: Record<string, { bg: string; text: string; description: string }> = {
    informational: { bg: 'bg-blue-100', text: 'text-blue-700', description: 'User wants to learn' },
    navigational: { bg: 'bg-purple-100', text: 'text-purple-700', description: 'User looking for specific page' },
    transactional: { bg: 'bg-green-100', text: 'text-green-700', description: 'User ready to take action' },
    commercial: { bg: 'bg-orange-100', text: 'text-orange-700', description: 'User researching before purchase' }
  };
  const cfg = config[intent.toLowerCase()] || { bg: 'bg-gray-100', text: 'text-gray-700', description: '' };

  return (
    <div className="inline-flex items-center gap-2">
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${cfg.bg} ${cfg.text}`}>
        {intent}
      </span>
      {cfg.description && <span className="text-xs text-gray-500">({cfg.description})</span>}
    </div>
  );
};

const MetricCard: React.FC<{ label: string; value: string | number; subtext?: string }> = ({ label, value, subtext }) => (
  <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm text-center">
    <div className="text-2xl font-bold text-gray-900">{value}</div>
    <div className="text-xs text-gray-600 mt-1">{label}</div>
    {subtext && <div className="text-xs text-gray-400 mt-0.5">{subtext}</div>}
  </div>
);

const ChecklistCategory: React.FC<{
  category: string;
  items: { item: string; required: boolean; reason: string }[];
}> = ({ category, items }) => (
  <div className="mb-6 last:mb-0">
    <h4 className="text-sm font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">
      {category}
    </h4>
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className={`w-5 h-5 mt-0.5 rounded border-2 flex-shrink-0 flex items-center justify-center ${item.required ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}>
            {item.required && <span className="text-xs text-red-500 font-bold">!</span>}
          </div>
          <div className="flex-1">
            <p className={`text-sm ${item.required ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
              {item.item}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{item.reason}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const SectionCard: React.FC<{
  level: number;
  title: string;
  hint?: string;
  formatCode?: string;
  methodologyNote?: string;
  relatedQueries?: string[];
}> = ({ level, title, hint, formatCode, methodologyNote, relatedQueries }) => (
  <div className={`p-4 bg-white rounded-lg border border-gray-200 ${level === 2 ? 'border-l-4 border-l-blue-500' : ''}`}>
    <div className="flex items-center gap-2 mb-2">
      <span className={`text-xs font-medium px-2 py-0.5 rounded ${level === 2 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
        H{level}
      </span>
      {formatCode && (
        <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-100 text-purple-700">
          {formatCode}
        </span>
      )}
    </div>
    <h4 className={`${level === 2 ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{title}</h4>
    {hint && (
      <p className="text-sm text-gray-600 mt-2 italic">"{hint}"</p>
    )}
    {methodologyNote && (
      <p className="text-xs text-purple-600 mt-2">Format: {methodologyNote}</p>
    )}
    {relatedQueries && relatedQueries.length > 0 && (
      <div className="mt-2 flex flex-wrap gap-1">
        {relatedQueries.slice(0, 3).map((q, i) => (
          <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
            {q}
          </span>
        ))}
      </div>
    )}
  </div>
);

// ============================================
// MAIN COMPONENT
// ============================================

export const ContentBriefReport = forwardRef<HTMLDivElement, ContentBriefReportProps>(
  ({ data, config = {} }, ref) => {
    const {
      includeCharts = true,
      includeCompetitorAnalysis = true,
      includeLinkingStrategy = true,
      includeVisualRequirements = true
    } = config;

    const targetKeyword = data.targetKeyword || 'target keyword';

    return (
      <div
        ref={ref}
        className="bg-white p-8 max-w-4xl mx-auto print:p-4 print:max-w-none"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        {/* Header */}
        <ReportHeader
          title="Content Brief"
          subtitle={data.briefTitle}
          generatedAt={data.generatedAt}
          metrics={data.metrics}
          variant="branded"
        />

        {/* Article Overview */}
        <GradientSection
          title="Article Overview"
          subtitle="Strategic focus and key messaging"
          gradient="from-blue-50 to-white"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        >
          {/* Target Keyword & Intent */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-5 text-white mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-blue-100 text-sm">Target Keyword</span>
              <IntentBadge intent={data.searchIntent} />
            </div>
            <h3 className="text-2xl font-bold">{data.targetKeyword}</h3>
            <p className="text-blue-100 mt-2 text-sm">{data.overview.headline}</p>
          </div>

          {/* Meta Description */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Meta Description</h4>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-700">{data.overview.metaDescription || 'Not yet defined'}</p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-500">
                  {(data.overview.metaDescription || '').length}/160 characters
                </p>
                {(data.overview.metaDescription || '').length > 160 && (
                  <span className="text-xs text-red-500 font-medium">Too long - will be truncated</span>
                )}
              </div>
            </div>
          </div>

          {/* Key Takeaways */}
          {data.overview.keyTakeaways.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Key Takeaways</h4>
              <div className="space-y-2">
                {data.overview.keyTakeaways.map((takeaway, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 text-sm font-semibold">
                      {i + 1}
                    </span>
                    <p className="text-gray-700 text-sm">{takeaway}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <WhyThisMatters text={data.overview.whyThisMatters} />
        </GradientSection>

        {/* Strategic Context */}
        {(data.strategicContext.perspectives.length > 0 || data.strategicContext.methodologyNote || data.strategicContext.queryTypeFormat !== 'Prose') && (
          <GradientSection
            title="Strategic Context"
            subtitle="Writing approach and perspective"
            gradient="from-purple-50 to-white"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Perspectives */}
              {data.strategicContext.perspectives.length > 0 && (
                <div className="p-4 bg-white rounded-lg border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Write From These Perspectives</h4>
                  <div className="flex flex-wrap gap-2">
                    {data.strategicContext.perspectives.map((p, i) => (
                      <span key={i} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Query Format */}
              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Preferred Content Format</h4>
                <p className="text-gray-900 font-medium">{data.strategicContext.queryTypeFormat}</p>
              </div>
            </div>

            {/* Methodology Note */}
            {data.strategicContext.methodologyNote && (
              <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h4 className="text-sm font-semibold text-purple-700 mb-2">Specific Writing Instructions</h4>
                <p className="text-purple-800">{data.strategicContext.methodologyNote}</p>
              </div>
            )}

            {/* User Journey */}
            {data.strategicContext.userJourneyPrediction && (
              <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Expected User Journey</h4>
                <p className="text-gray-700">{data.strategicContext.userJourneyPrediction}</p>
              </div>
            )}

            <WhyThisMatters text={data.strategicContext.whyThisMatters} />
          </GradientSection>
        )}

        {/* Featured Snippet Target */}
        {data.featuredSnippetTarget && (
          <GradientSection
            title="Featured Snippet Opportunity"
            subtitle="Target Position 0 in search results"
            gradient="from-yellow-50 to-white"
            icon={
              <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            }
          >
            <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-yellow-800 mb-2">Target Question</h4>
              <p className="text-yellow-900 text-lg">"{data.featuredSnippetTarget.question}"</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600">Answer Format</p>
                <p className="font-semibold text-gray-900">{data.featuredSnippetTarget.targetType}</p>
              </div>
              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600">Target Length</p>
                <p className="font-semibold text-gray-900">{data.featuredSnippetTarget.answerLengthTarget} words</p>
              </div>
            </div>

            {data.featuredSnippetTarget.requiredPredicates.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Must Include These Phrases</h4>
                <div className="flex flex-wrap gap-2">
                  {data.featuredSnippetTarget.requiredPredicates.map((p, i) => (
                    <span key={i} className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                      "{p}"
                    </span>
                  ))}
                </div>
              </div>
            )}

            <WhyThisMatters text={data.featuredSnippetTarget.whyThisMatters} />
          </GradientSection>
        )}

        {/* SERP Analysis */}
        {includeCompetitorAnalysis && (
          <GradientSection
            title="Competitive Landscape"
            subtitle="What's ranking and how to beat it"
            gradient="from-green-50 to-white"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          >
            <div className="grid grid-cols-3 gap-4 mb-6">
              <MetricCard label="Avg Word Count" value={data.serpAnalysis.avgWordCount.toLocaleString()} subtext="Your target" />
              <MetricCard label="Avg Headings" value={data.serpAnalysis.avgHeadings} subtext="Structure guide" />
              <MetricCard label="Competitors" value={data.serpAnalysis.competitorCount} subtext="Analyzed" />
            </div>

            {includeCharts && data.serpAnalysis.competitorComparison.length > 0 && (
              <div className="bg-white rounded-lg p-4 border border-gray-200 mb-6">
                <EavCoverageChart
                  data={data.serpAnalysis.competitorComparison}
                  title="Competitor Content Structure"
                  height={200}
                />
              </div>
            )}

            {/* People Also Ask */}
            {data.serpAnalysis.peopleAlsoAsk.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">People Also Ask (Answer These)</h4>
                <div className="space-y-2">
                  {data.serpAnalysis.peopleAlsoAsk.map((q, i) => (
                    <div key={i} className={`p-3 rounded-lg border flex items-start gap-3 ${i < 2 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                      <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${i < 2 ? 'text-green-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-gray-800 text-sm">{q}</p>
                        {i < 2 && <span className="text-xs text-green-600 font-medium">High priority - answer this directly</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Content Gaps */}
            {data.serpAnalysis.contentGaps.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Content Gaps (Opportunities)</h4>
                <div className="flex flex-wrap gap-2">
                  {data.serpAnalysis.contentGaps.map((gap, i) => (
                    <span key={i} className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                      {gap}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <WhyThisMatters text={data.serpAnalysis.whyThisMatters} />
          </GradientSection>
        )}

        <PageBreak />

        {/* Article Structure */}
        <GradientSection
          title="Article Structure"
          subtitle="Section-by-section writing guide"
          gradient="from-indigo-50 to-white"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          }
        >
          <div className="flex items-center gap-6 mb-6 text-sm text-gray-600">
            <span>Target: <strong className="text-gray-900">{data.outline.estimatedWordCount.toLocaleString()} words</strong></span>
            <span>Reading time: <strong className="text-gray-900">{data.outline.estimatedReadTime}</strong></span>
            <span>Sections: <strong className="text-gray-900">{data.outline.sections.length}</strong></span>
          </div>

          <div className="space-y-3">
            {data.outline.sections.map((section, i) => (
              <SectionCard
                key={i}
                level={section.level}
                title={section.title}
                hint={section.hint}
                formatCode={section.formatCode}
                methodologyNote={section.methodologyNote}
                relatedQueries={section.relatedQueries}
              />
            ))}
          </div>

          <WhyThisMatters text={data.outline.whyThisMatters} />
        </GradientSection>

        {/* Discourse Anchors */}
        {data.discourseAnchors.anchors.length > 0 && (
          <GradientSection
            title="Transition Words & Phrases"
            subtitle="Use these to connect sections smoothly"
            gradient="from-pink-50 to-white"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          >
            <div className="flex flex-wrap gap-2">
              {data.discourseAnchors.anchors.map((anchor, i) => (
                <span key={i} className="px-4 py-2 bg-white border border-pink-200 text-pink-700 rounded-lg text-sm font-medium">
                  {anchor}
                </span>
              ))}
            </div>
            <WhyThisMatters text={data.discourseAnchors.whyThisMatters} />
          </GradientSection>
        )}

        {/* Internal Linking */}
        {includeLinkingStrategy && (
          <GradientSection
            title="Internal Linking Strategy"
            subtitle="Connect this article to your content ecosystem"
            gradient="from-cyan-50 to-white"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Outbound Links */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  Link TO These Articles
                </h4>
                <div className="space-y-2">
                  {data.linkingStrategy.outboundLinks.length > 0 ? (
                    data.linkingStrategy.outboundLinks.map((link, i) => (
                      <div key={i} className="p-3 bg-white rounded-lg border border-gray-200">
                        <p className="text-sm font-medium text-gray-900">{link.title}</p>
                        {link.anchorText && (
                          <p className="text-xs text-blue-600 mt-1">Anchor: "{link.anchorText}"</p>
                        )}
                        {link.contextHint && (
                          <p className="text-xs text-gray-500 mt-1">{link.contextHint}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 italic">No specific outbound links recommended</p>
                  )}
                </div>
              </div>

              {/* Inbound Links */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                  </svg>
                  Link FROM These Articles
                </h4>
                <div className="space-y-2">
                  {data.linkingStrategy.inboundLinks.length > 0 ? (
                    data.linkingStrategy.inboundLinks.map((link, i) => (
                      <div key={i} className="p-3 bg-white rounded-lg border border-gray-200">
                        <p className="text-sm font-medium text-gray-900">{link.title}</p>
                        {link.anchorText && (
                          <p className="text-xs text-green-600 mt-1">Anchor: "{link.anchorText}"</p>
                        )}
                        {link.contextHint && (
                          <p className="text-xs text-gray-500 mt-1">{link.contextHint}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 italic">No specific inbound links recommended</p>
                  )}
                </div>
              </div>
            </div>

            {/* Semantic Bridges */}
            {data.linkingStrategy.semanticBridges.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Suggested Anchor Text Phrases</h4>
                <div className="flex flex-wrap gap-2">
                  {data.linkingStrategy.semanticBridges.map((bridge, i) => (
                    <span key={i} className="px-3 py-1 bg-cyan-100 text-cyan-700 rounded-full text-sm">
                      {bridge}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <WhyThisMatters text={data.linkingStrategy.whyThisMatters} />
          </GradientSection>
        )}

        {/* Visual Requirements */}
        {includeVisualRequirements && (
          <GradientSection
            title="Visual Requirements"
            subtitle="Images and media to include"
            gradient="from-orange-50 to-white"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          >
            {/* Featured Image */}
            {data.visualRequirements.featuredImagePrompt && (
              <div className="p-4 bg-white rounded-lg border border-orange-200 mb-6">
                <h4 className="text-sm font-semibold text-orange-700 mb-2">Featured Image</h4>
                <p className="text-gray-700 italic">"{data.visualRequirements.featuredImagePrompt}"</p>
              </div>
            )}

            {/* Inline Images */}
            {data.visualRequirements.inlineImages.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Required Images ({data.visualRequirements.totalImageCount} total)
                </h4>
                <div className="space-y-3">
                  {data.visualRequirements.inlineImages.map((img, i) => (
                    <div key={i} className="p-4 bg-white rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        {img.type && (
                          <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded font-medium">
                            {img.type}
                          </span>
                        )}
                        {img.dimensions && (
                          <span className="text-xs text-gray-500">{img.dimensions}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-800">{img.description}</p>
                      {img.altText && (
                        <p className="text-xs text-gray-500 mt-2">
                          <span className="font-medium">Alt text:</span> {img.altText}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <WhyThisMatters text={data.visualRequirements.whyThisMatters} />
          </GradientSection>
        )}

        {/* Semantic Requirements */}
        {data.semanticRequirements.eavsToInclude.length > 0 && (
          <GradientSection
            title="Key Facts to Include"
            subtitle="Weave these concepts naturally into your content"
            gradient="from-emerald-50 to-white"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            }
          >
            <div className="space-y-2">
              {data.semanticRequirements.eavsToInclude.map((eav, i) => (
                <div key={i} className="p-3 bg-white rounded-lg border border-gray-200 flex items-start gap-3">
                  <span className={`text-xs px-2 py-1 rounded font-medium flex-shrink-0 ${
                    eav.importance.includes('Essential') ? 'bg-red-100 text-red-700' :
                    eav.importance.includes('High') ? 'bg-orange-100 text-orange-700' :
                    eav.importance.includes('Medium') ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {eav.importance.split(' - ')[0]}
                  </span>
                  <div>
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{eav.entity}</span>
                      {' '}<span className="text-gray-500">{eav.attribute}</span>{' '}
                      <span className="font-medium">{eav.value}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {data.semanticRequirements.totalEavs > 15 && (
              <p className="text-sm text-gray-500 mt-3">
                Showing 15 of {data.semanticRequirements.totalEavs} semantic concepts
              </p>
            )}
            <WhyThisMatters text={data.semanticRequirements.whyThisMatters} />
          </GradientSection>
        )}

        <PageBreak />

        {/* Pre-Publication Checklist */}
        <GradientSection
          title="Pre-Publication Checklist"
          subtitle="Complete all required items before publishing"
          gradient="from-red-50 to-white"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          }
        >
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">
              <strong>Items marked with !</strong> are required and directly impact SEO performance.
              Do not publish until all required items are complete.
            </p>
          </div>

          <div className="space-y-6">
            {data.checklist.map((category, i) => (
              <ChecklistCategory
                key={i}
                category={category.category}
                items={category.items}
              />
            ))}
          </div>
        </GradientSection>

        <ReportSectionDivider />

        {/* Footer */}
        <ReportFooter
          showDisclaimer
          disclaimerText="This content brief provides AI-generated guidelines based on SERP analysis, semantic SEO best practices, and topical map context. Final content should be reviewed and edited by qualified content creators to ensure accuracy and brand alignment."
          showBranding
          generatedAt={data.generatedAt}
        />
      </div>
    );
  }
);

ContentBriefReport.displayName = 'ContentBriefReport';

export default ContentBriefReport;
