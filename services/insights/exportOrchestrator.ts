// services/insights/exportOrchestrator.ts
// Orchestrates export of insights data in various formats

import type { AggregatedInsights } from '../../types/insights';
import type { BusinessInfo, TopicalMap, EnrichedTopic, SemanticTriple } from '../../types';

// =====================
// Export Types
// =====================

export type ExportFormat = 'pdf' | 'xlsx' | 'csv' | 'json' | 'html';

export interface ExportConfig {
  format: ExportFormat;
  sections: ExportSection[];
  includeCharts: boolean;
  dateRange?: { start: Date; end: Date };
  branding?: {
    logo?: string;
    companyName?: string;
    primaryColor?: string;
  };
}

export type ExportSection =
  | 'executive-summary'
  | 'topical-authority'
  | 'competitive-intel'
  | 'authority-trust'
  | 'content-health'
  | 'publication-progress'
  | 'cost-usage'
  | 'action-items';

export interface ExportResult {
  success: boolean;
  data?: Blob | string;
  filename?: string;
  mimeType?: string;
  error?: string;
}

// =====================
// Executive Report Export (PDF/HTML)
// =====================

export async function exportExecutiveReport(
  insights: AggregatedInsights,
  businessInfo: BusinessInfo,
  mapInfo: { name: string; projectName: string },
  config: Partial<ExportConfig> = {}
): Promise<ExportResult> {
  try {
    const html = generateExecutiveReportHtml(insights, businessInfo, mapInfo, config);

    if (config.format === 'html') {
      const blob = new Blob([html], { type: 'text/html' });
      return {
        success: true,
        data: blob,
        filename: `${mapInfo.projectName}_executive_report_${formatDate(new Date())}.html`,
        mimeType: 'text/html',
      };
    }

    // For PDF, we return HTML that can be printed or converted
    const blob = new Blob([html], { type: 'text/html' });
    return {
      success: true,
      data: blob,
      filename: `${mapInfo.projectName}_executive_report_${formatDate(new Date())}.html`,
      mimeType: 'text/html',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed',
    };
  }
}

function generateExecutiveReportHtml(
  insights: AggregatedInsights,
  businessInfo: BusinessInfo,
  mapInfo: { name: string; projectName: string },
  config: Partial<ExportConfig>
): string {
  const { executiveSummary, topicalAuthority, competitiveIntel, authorityTrust, contentHealth, costUsage, actionCenter } = insights;
  const brandColor = config.branding?.primaryColor || '#3B82F6';

  const getTrendClass = (trend?: { direction: 'up' | 'down' | 'stable'; percentChange: number }) => trend?.direction === 'up' ? 'up' : trend?.direction === 'down' ? 'down' : '';
  const getTrendArrow = (trend?: { direction: 'up' | 'down' | 'stable'; percentChange: number }) => trend?.direction === 'up' ? '↑' : trend?.direction === 'down' ? '↓' : '→';

  // Format numbers safely
  const formatNum = (n: number | undefined | null): string => {
    if (n === undefined || n === null || isNaN(n)) return '0';
    return n.toLocaleString();
  };
  const formatCurrency = (n: number | undefined | null): string => {
    if (n === undefined || n === null || isNaN(n)) return '$0.00';
    return `$${n.toFixed(2)}`;
  };

  // Get EAV categories for display
  const eavCategories = Object.entries(topicalAuthority.eavDistribution.byCategory);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SEO Executive Report - ${mapInfo.projectName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; background: #fff; }
    .container { max-width: 1000px; margin: 0 auto; padding: 40px; }
    .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid ${brandColor}; padding-bottom: 20px; }
    .header h1 { color: ${brandColor}; font-size: 28px; margin-bottom: 8px; }
    .header .subtitle { color: #666; font-size: 16px; }
    .header .date { color: #999; font-size: 14px; margin-top: 8px; }
    .toc { background: #f8fafc; padding: 24px; border-radius: 8px; margin-bottom: 40px; }
    .toc h3 { margin-bottom: 12px; color: ${brandColor}; }
    .toc ul { list-style: none; columns: 2; }
    .toc li { margin-bottom: 8px; }
    .toc a { color: #1a1a1a; text-decoration: none; }
    .toc a:hover { color: ${brandColor}; }
    .score-card { background: linear-gradient(135deg, ${brandColor}, #8B5CF6); color: white; padding: 40px; border-radius: 12px; text-align: center; margin-bottom: 40px; }
    .score-card .score { font-size: 72px; font-weight: bold; }
    .score-card .label { font-size: 18px; opacity: 0.9; }
    .score-card .grade { font-size: 24px; margin-top: 10px; }
    .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 40px; }
    .metric-card { background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid ${brandColor}; }
    .metric-card .value { font-size: 24px; font-weight: bold; color: #1a1a1a; }
    .metric-card .label { color: #666; font-size: 13px; }
    .metric-card .trend { font-size: 11px; margin-top: 4px; }
    .metric-card .trend.up { color: #10b981; }
    .metric-card .trend.down { color: #ef4444; }
    .section { margin-bottom: 40px; page-break-inside: avoid; }
    .section h2 { color: #1a1a1a; font-size: 20px; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb; }
    .section h3 { color: #374151; font-size: 16px; margin: 16px 0 12px 0; }
    .alert { padding: 16px; border-radius: 8px; margin-bottom: 12px; }
    .alert.critical { background: #fef2f2; border-left: 4px solid #ef4444; }
    .alert.high { background: #fff7ed; border-left: 4px solid #f97316; }
    .alert.medium { background: #fefce8; border-left: 4px solid #eab308; }
    .alert .title { font-weight: 600; margin-bottom: 4px; }
    .alert .description { font-size: 14px; color: #666; }
    .action-item { display: flex; align-items: flex-start; gap: 12px; padding: 16px; background: #f8fafc; border-radius: 8px; margin-bottom: 12px; }
    .action-item .priority { width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0; }
    .action-item .priority.critical { background: #ef4444; }
    .action-item .priority.high { background: #f97316; }
    .action-item .priority.medium { background: #eab308; }
    .action-item .content .title { font-weight: 600; font-size: 14px; }
    .action-item .content .why { font-size: 13px; color: #666; margin-top: 4px; }
    .action-item .content .how { font-size: 12px; color: #3b82f6; margin-top: 4px; }
    .table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 14px; }
    .table th, .table td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    .table th { background: #f8fafc; font-weight: 600; }
    .table tr:hover { background: #f8fafc; }
    .stat-row { display: flex; gap: 24px; margin-bottom: 16px; flex-wrap: wrap; }
    .stat-box { flex: 1; min-width: 200px; background: #f8fafc; padding: 16px; border-radius: 8px; text-align: center; }
    .stat-box .value { font-size: 28px; font-weight: bold; color: ${brandColor}; }
    .stat-box .label { font-size: 13px; color: #666; }
    .progress-bar { background: #e5e7eb; border-radius: 4px; height: 8px; margin: 8px 0; }
    .progress-bar .fill { height: 100%; border-radius: 4px; background: ${brandColor}; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
    .badge.green { background: #dcfce7; color: #166534; }
    .badge.yellow { background: #fef9c3; color: #854d0e; }
    .badge.red { background: #fee2e2; color: #991b1b; }
    .badge.blue { background: #dbeafe; color: #1e40af; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .footer { text-align: center; padding-top: 40px; border-top: 1px solid #e5e7eb; color: #999; font-size: 12px; }
    @media print {
      .container { padding: 20px; }
      .score-card { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .metrics-grid { grid-template-columns: repeat(2, 1fr); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SEO Executive Report</h1>
      <div class="subtitle">${mapInfo.projectName} - ${mapInfo.name}</div>
      <div class="date">Generated: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
    </div>

    <!-- Table of Contents -->
    <div class="toc">
      <h3>Contents</h3>
      <ul>
        <li><a href="#overview">1. Executive Overview</a></li>
        <li><a href="#health">2. Health Score Breakdown</a></li>
        <li><a href="#authority">3. Topical Authority</a></li>
        <li><a href="#eat">4. E-A-T Analysis</a></li>
        <li><a href="#competitive">5. Competitive Intelligence</a></li>
        <li><a href="#content">6. Content Health</a></li>
        <li><a href="#costs">7. AI Usage & Costs</a></li>
        <li><a href="#actions">8. Priority Actions</a></li>
      </ul>
    </div>

    <!-- Executive Overview -->
    <div id="overview" class="section">
      <div class="score-card">
        <div class="score">${executiveSummary.healthScore.overall}</div>
        <div class="label">Overall Health Score</div>
        <div class="grade">Grade: ${executiveSummary.healthScore.grade}</div>
      </div>

      <div class="metrics-grid">
        ${executiveSummary.keyMetrics.map(metric => `
        <div class="metric-card">
          <div class="value">${metric.value}</div>
          <div class="label">${metric.label}</div>
          <div class="trend ${getTrendClass(metric.trend)}">
            ${getTrendArrow(metric.trend)} ${metric.description}
          </div>
        </div>
        `).join('')}
      </div>

      ${executiveSummary.alerts.length > 0 ? `
      <h3>Priority Alerts</h3>
      ${executiveSummary.alerts.slice(0, 5).map(alert => `
        <div class="alert ${alert.severity}">
          <div class="title">${alert.title}</div>
          <div class="description">${alert.description}</div>
        </div>
      `).join('')}
      ` : ''}
    </div>

    <!-- Health Score Breakdown -->
    <div id="health" class="section">
      <h2>2. Health Score Breakdown</h2>
      <table class="table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Score</th>
            <th>Status</th>
            <th>Progress</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Semantic Compliance</td>
            <td>${executiveSummary.healthScore.components.semanticCompliance}%</td>
            <td>${getStatusEmoji(executiveSummary.healthScore.components.semanticCompliance)}</td>
            <td><div class="progress-bar"><div class="fill" style="width: ${executiveSummary.healthScore.components.semanticCompliance}%"></div></div></td>
          </tr>
          <tr>
            <td>EAV Authority</td>
            <td>${executiveSummary.healthScore.components.eavAuthority}%</td>
            <td>${getStatusEmoji(executiveSummary.healthScore.components.eavAuthority)}</td>
            <td><div class="progress-bar"><div class="fill" style="width: ${executiveSummary.healthScore.components.eavAuthority}%"></div></div></td>
          </tr>
          <tr>
            <td>E-A-T Trust</td>
            <td>${executiveSummary.healthScore.components.eatScore}%</td>
            <td>${getStatusEmoji(executiveSummary.healthScore.components.eatScore)}</td>
            <td><div class="progress-bar"><div class="fill" style="width: ${executiveSummary.healthScore.components.eatScore}%"></div></div></td>
          </tr>
          <tr>
            <td>Content Health</td>
            <td>${executiveSummary.healthScore.components.contentHealth}%</td>
            <td>${getStatusEmoji(executiveSummary.healthScore.components.contentHealth)}</td>
            <td><div class="progress-bar"><div class="fill" style="width: ${executiveSummary.healthScore.components.contentHealth}%"></div></div></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Topical Authority -->
    <div id="authority" class="section">
      <h2>3. Topical Authority</h2>

      <div class="stat-row">
        <div class="stat-box">
          <div class="value">${topicalAuthority.mapHealth.totalTopics}</div>
          <div class="label">Total Topics</div>
        </div>
        <div class="stat-box">
          <div class="value">${topicalAuthority.mapHealth.coreTopics}</div>
          <div class="label">Core Topics</div>
        </div>
        <div class="stat-box">
          <div class="value">${topicalAuthority.mapHealth.outerTopics}</div>
          <div class="label">Supporting Topics</div>
        </div>
        <div class="stat-box">
          <div class="value">1:${topicalAuthority.mapHealth.hubSpokeRatio}</div>
          <div class="label">Hub-Spoke Ratio</div>
        </div>
      </div>

      <h3>EAV Distribution by Category</h3>
      <table class="table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Count</th>
            <th>Percentage</th>
          </tr>
        </thead>
        <tbody>
          ${eavCategories.map(([cat, count]) => `
          <tr>
            <td><span class="badge blue">${cat}</span></td>
            <td>${count}</td>
            <td>${topicalAuthority.eavDistribution.totalEavs > 0 ? ((count / topicalAuthority.eavDistribution.totalEavs) * 100).toFixed(1) : 0}%</td>
          </tr>
          `).join('')}
          <tr style="font-weight: 600; background: #f1f5f9;">
            <td>Total</td>
            <td>${topicalAuthority.eavDistribution.totalEavs}</td>
            <td>100%</td>
          </tr>
        </tbody>
      </table>

      ${topicalAuthority.eavDistribution.missingCategories.length > 0 ? `
      <div class="alert medium" style="margin-top: 16px;">
        <div class="title">Missing EAV Categories</div>
        <div class="description">Consider adding EAVs for: ${topicalAuthority.eavDistribution.missingCategories.join(', ')}</div>
      </div>
      ` : ''}

      <h3>Top Entities by Attribute Count</h3>
      <table class="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Entity</th>
            <th>Attributes</th>
          </tr>
        </thead>
        <tbody>
          ${topicalAuthority.eavDistribution.topEntities.slice(0, 10).map((entity, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${entity.entity}</td>
            <td>${entity.attributeCount}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- E-A-T Analysis -->
    <div id="eat" class="section">
      <h2>4. E-A-T Analysis</h2>

      <div class="stat-row">
        <div class="stat-box">
          <div class="value">${authorityTrust.eatBreakdown.overall}%</div>
          <div class="label">Overall E-A-T Score</div>
        </div>
        <div class="stat-box">
          <div class="value" style="color: #3b82f6;">${authorityTrust.eatBreakdown.expertise.score}%</div>
          <div class="label">Expertise</div>
        </div>
        <div class="stat-box">
          <div class="value" style="color: #22c55e;">${authorityTrust.eatBreakdown.authority.score}%</div>
          <div class="label">Authority</div>
        </div>
        <div class="stat-box">
          <div class="value" style="color: #f97316;">${authorityTrust.eatBreakdown.trust.score}%</div>
          <div class="label">Trust</div>
        </div>
      </div>

      <div class="two-col">
        <div>
          <h3>E-A-T Factors</h3>
          <table class="table">
            <tbody>
              ${authorityTrust.eatBreakdown.expertise.factors.slice(0, 3).map(f => `<tr><td>✅ ${f}</td></tr>`).join('')}
              ${authorityTrust.eatBreakdown.authority.factors.slice(0, 3).map(f => `<tr><td>✅ ${f}</td></tr>`).join('')}
              ${authorityTrust.eatBreakdown.trust.factors.slice(0, 3).map(f => `<tr><td>✅ ${f}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div>
          <h3>Entity Recognition</h3>
          <table class="table">
            <tbody>
              <tr>
                <td>Wikipedia Presence</td>
                <td>${authorityTrust.entityRecognition.wikipediaPresence ? '<span class="badge green">Found</span>' : '<span class="badge red">Not Found</span>'}</td>
              </tr>
              <tr>
                <td>Wikidata ID</td>
                <td>${authorityTrust.entityRecognition.wikidataId || '<span class="badge red">Not Found</span>'}</td>
              </tr>
              <tr>
                <td>Knowledge Graph</td>
                <td><span class="badge ${authorityTrust.entityRecognition.knowledgeGraphStatus === 'registered' ? 'green' : authorityTrust.entityRecognition.knowledgeGraphStatus === 'partial' ? 'yellow' : 'red'}">${authorityTrust.entityRecognition.knowledgeGraphStatus}</span></td>
              </tr>
              <tr>
                <td>Structured Data</td>
                <td>${authorityTrust.entityRecognition.structuredDataValid ? '<span class="badge green">Valid</span>' : '<span class="badge red">Issues Found</span>'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      ${authorityTrust.improvementRoadmap.length > 0 ? `
      <h3>Improvement Roadmap</h3>
      ${authorityTrust.improvementRoadmap.slice(0, 5).map(item => `
        <div class="action-item">
          <div class="priority ${item.priority <= 1 ? 'critical' : item.priority <= 2 ? 'high' : 'medium'}"></div>
          <div class="content">
            <div class="title">${item.title}</div>
            <div class="why">${item.description}</div>
          </div>
        </div>
      `).join('')}
      ` : ''}
    </div>

    <!-- Competitive Intelligence -->
    <div id="competitive" class="section">
      <h2>5. Competitive Intelligence</h2>

      <div class="stat-row">
        <div class="stat-box">
          <div class="value">${competitiveIntel.queryNetworkSummary.totalQueries}</div>
          <div class="label">Queries Analyzed</div>
        </div>
        <div class="stat-box">
          <div class="value">${competitiveIntel.queryNetworkSummary.yourCoverage}</div>
          <div class="label">Your Topics</div>
        </div>
        <div class="stat-box">
          <div class="value">${competitiveIntel.queryNetworkSummary.competitorEavCount}</div>
          <div class="label">Competitor EAVs</div>
        </div>
        <div class="stat-box">
          <div class="value">${competitiveIntel.contentGaps.length}</div>
          <div class="label">Content Gaps</div>
        </div>
      </div>

      ${competitiveIntel.contentGaps.length > 0 ? `
      <h3>Content Gaps (Opportunities)</h3>
      <table class="table">
        <thead>
          <tr>
            <th>Gap Title</th>
            <th>Difficulty</th>
            <th>Competitor Coverage</th>
            <th>Priority</th>
          </tr>
        </thead>
        <tbody>
          ${competitiveIntel.contentGaps.slice(0, 10).map(gap => `
          <tr>
            <td><strong>${gap.title}</strong><br><span style="font-size: 12px; color: #666;">${gap.description.slice(0, 100)}...</span></td>
            <td><span class="badge ${gap.difficulty === 'low' ? 'green' : gap.difficulty === 'medium' ? 'yellow' : 'red'}">${gap.difficulty || 'unknown'}</span></td>
            <td>${gap.competitorCoverageCount} competitors</td>
            <td>${gap.priority}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
      ` : '<p style="color: #666;">No content gaps identified. Run a Query Network Audit to discover opportunities.</p>'}

      ${competitiveIntel.questionsToAnswer.length > 0 ? `
      <h3>Questions to Answer</h3>
      <ul style="padding-left: 20px;">
        ${competitiveIntel.questionsToAnswer.slice(0, 10).map(q => `<li style="margin-bottom: 8px;">${q.question}</li>`).join('')}
      </ul>
      ` : ''}
    </div>

    <!-- Content Health -->
    <div id="content" class="section">
      <h2>6. Content Health</h2>

      <div class="stat-row">
        <div class="stat-box">
          <div class="value">${contentHealth.corpusOverview.totalPages}</div>
          <div class="label">Pages Analyzed</div>
        </div>
        <div class="stat-box">
          <div class="value">${contentHealth.corpusOverview.semanticCoverage}%</div>
          <div class="label">Semantic Coverage</div>
        </div>
        <div class="stat-box">
          <div class="value">${contentHealth.corpusOverview.overlapCount}</div>
          <div class="label">Overlap Issues</div>
        </div>
        <div class="stat-box">
          <div class="value">${contentHealth.corpusOverview.averagePageScore}%</div>
          <div class="label">Avg Page Score</div>
        </div>
      </div>

      ${contentHealth.cannibalizationRisks.length > 0 ? `
      <h3>Cannibalization Risks</h3>
      <table class="table">
        <thead>
          <tr>
            <th>Topic A</th>
            <th>Topic B</th>
            <th>Similarity</th>
            <th>Recommendation</th>
          </tr>
        </thead>
        <tbody>
          ${contentHealth.cannibalizationRisks.slice(0, 10).map(risk => `
          <tr>
            <td>${risk.topics[0]}</td>
            <td>${risk.topics[1]}</td>
            <td><span class="badge ${risk.similarityScore >= 80 ? 'red' : risk.similarityScore >= 60 ? 'yellow' : 'green'}">${Math.round(risk.similarityScore)}%</span></td>
            <td>${risk.recommendation === 'merge' ? '🔀 Merge into one' : '↔️ Differentiate'}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
      ` : '<p style="color: #666;">No cannibalization issues detected. Great job!</p>'}

      ${contentHealth.contentFreshness.staleTopics.length > 0 ? `
      <h3>Stale Content</h3>
      <ul style="padding-left: 20px;">
        ${contentHealth.contentFreshness.staleTopics.slice(0, 5).map(t => `<li style="margin-bottom: 8px;">${t.topic} - ${t.daysOld} days old</li>`).join('')}
      </ul>
      ` : ''}
    </div>

    <!-- AI Usage & Costs -->
    <div id="costs" class="section">
      <h2>7. AI Usage & Costs</h2>

      <div class="stat-row">
        <div class="stat-box">
          <div class="value">${formatNum(costUsage.tokenConsumption.totalTokens)}</div>
          <div class="label">Total Tokens Used</div>
        </div>
        <div class="stat-box">
          <div class="value">${formatCurrency(costUsage.costBreakdown.totalCost)}</div>
          <div class="label">Estimated Total Cost</div>
        </div>
        <div class="stat-box">
          <div class="value">${formatCurrency(costUsage.costBreakdown.costPerContent)}</div>
          <div class="label">Cost per Content</div>
        </div>
        <div class="stat-box">
          <div class="value">${Object.keys(costUsage.tokenConsumption.byProvider).length}</div>
          <div class="label">AI Providers Used</div>
        </div>
      </div>

      <div class="two-col">
        <div>
          <h3>Tokens by Provider</h3>
          <table class="table">
            <tbody>
              ${Object.entries(costUsage.tokenConsumption.byProvider).map(([provider, tokens]) => `
              <tr>
                <td style="text-transform: capitalize;">${provider}</td>
                <td>${formatNum(tokens)}</td>
              </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div>
          <h3>Cost by Provider</h3>
          <table class="table">
            <tbody>
              ${Object.entries(costUsage.costBreakdown.byProvider).map(([provider, cost]) => `
              <tr>
                <td style="text-transform: capitalize;">${provider}</td>
                <td>${formatCurrency(cost)}</td>
              </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      ${costUsage.optimizationSuggestions.length > 0 ? `
      <h3>Optimization Suggestions</h3>
      ${costUsage.optimizationSuggestions.slice(0, 3).map(s => `
        <div class="alert medium">
          <div class="title">${s.title} ${s.potentialSavings ? `- Save ~${formatCurrency(s.potentialSavings)}` : ''}</div>
          <div class="description">${s.description}</div>
        </div>
      `).join('')}
      ` : ''}
    </div>

    <!-- Priority Actions -->
    <div id="actions" class="section">
      <h2>8. Priority Actions</h2>

      ${actionCenter.criticalActions.length > 0 ? `
      <h3>🔴 Critical Actions (${actionCenter.criticalActions.length})</h3>
      ${actionCenter.criticalActions.map(action => `
        <div class="action-item">
          <div class="priority critical"></div>
          <div class="content">
            <div class="title">${action.what}</div>
            <div class="why">${action.why}</div>
            <div class="how"><strong>How:</strong> ${action.how}</div>
          </div>
        </div>
      `).join('')}
      ` : ''}

      ${actionCenter.highPriorityActions.length > 0 ? `
      <h3>🟠 High Priority Actions (${actionCenter.highPriorityActions.length})</h3>
      ${actionCenter.highPriorityActions.slice(0, 5).map(action => `
        <div class="action-item">
          <div class="priority high"></div>
          <div class="content">
            <div class="title">${action.what}</div>
            <div class="why">${action.why}</div>
            <div class="how"><strong>How:</strong> ${action.how}</div>
          </div>
        </div>
      `).join('')}
      ` : ''}

      ${actionCenter.mediumPriorityActions.length > 0 ? `
      <h3>🟡 Medium Priority Actions (${actionCenter.mediumPriorityActions.length})</h3>
      ${actionCenter.mediumPriorityActions.slice(0, 3).map(action => `
        <div class="action-item">
          <div class="priority medium"></div>
          <div class="content">
            <div class="title">${action.what}</div>
            <div class="why">${action.why}</div>
          </div>
        </div>
      `).join('')}
      ` : ''}

      <h3>Summary</h3>
      <table class="table">
        <tbody>
          <tr><td>Critical Actions</td><td>${actionCenter.criticalActions.length}</td></tr>
          <tr><td>High Priority Actions</td><td>${actionCenter.highPriorityActions.length}</td></tr>
          <tr><td>Medium Priority Actions</td><td>${actionCenter.mediumPriorityActions.length}</td></tr>
          <tr><td>Backlog Items</td><td>${actionCenter.backlogActions.length}</td></tr>
          <tr style="font-weight: 600;"><td>Total Pending Actions</td><td>${actionCenter.criticalActions.length + actionCenter.highPriorityActions.length + actionCenter.mediumPriorityActions.length + actionCenter.backlogActions.length}</td></tr>
        </tbody>
      </table>
    </div>

    <div class="footer">
      <p>Generated by SEO Insights Hub • ${new Date().toISOString()}</p>
      <p>This comprehensive report provides a complete snapshot of your SEO strategy health, competitive positioning, and recommended actions.</p>
      <p style="margin-top: 8px;"><strong>Next Steps:</strong> Review the Priority Actions section and implement critical items first.</p>
    </div>
  </div>
</body>
</html>`;
}

// =====================
// Technical Report Export (XLSX)
// =====================

export async function exportTechnicalReport(
  insights: AggregatedInsights,
  businessInfo: BusinessInfo,
  topics: EnrichedTopic[],
  eavs: SemanticTriple[],
  config: Partial<ExportConfig> = {}
): Promise<ExportResult> {
  try {
    // Generate CSV format for technical data (XLSX would require a library)
    const csvContent = generateTechnicalCsv(insights, topics, eavs);

    const blob = new Blob([csvContent], { type: 'text/csv' });
    return {
      success: true,
      data: blob,
      filename: `technical_report_${formatDate(new Date())}.csv`,
      mimeType: 'text/csv',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed',
    };
  }
}

function generateTechnicalCsv(
  insights: AggregatedInsights,
  topics: EnrichedTopic[],
  eavs: SemanticTriple[]
): string {
  const lines: string[] = [];
  const { executiveSummary, topicalAuthority, competitiveIntel, authorityTrust, contentHealth, publicationProgress, costUsage, actionCenter } = insights;

  // Safe number formatting
  const formatNum = (n: number | undefined | null): string => {
    if (n === undefined || n === null || isNaN(n)) return '0';
    return n.toString();
  };
  const formatPercent = (n: number | undefined | null): string => {
    if (n === undefined || n === null || isNaN(n)) return '0%';
    return `${n}%`;
  };
  const formatCurrency = (n: number | undefined | null): string => {
    if (n === undefined || n === null || isNaN(n)) return '$0.00';
    return `$${n.toFixed(2)}`;
  };

  // =====================
  // SECTION 1: EXECUTIVE SUMMARY
  // =====================
  lines.push('================================================================================');
  lines.push('SECTION 1: EXECUTIVE SUMMARY');
  lines.push('================================================================================');
  lines.push('');
  lines.push('Metric,Value,Description');
  lines.push(`Overall Health Score,${formatNum(executiveSummary.healthScore.overall)},${executiveSummary.healthScore.grade} Grade`);
  lines.push(`Semantic Compliance,${formatPercent(executiveSummary.healthScore.components.semanticCompliance)},How well content follows semantic SEO principles`);
  lines.push(`EAV Authority,${formatPercent(executiveSummary.healthScore.components.eavAuthority)},Entity-Attribute-Value coverage strength`);
  lines.push(`E-A-T Score,${formatPercent(executiveSummary.healthScore.components.eatScore)},Expertise Authority Trust signals`);
  lines.push(`Content Health,${formatPercent(executiveSummary.healthScore.components.contentHealth)},Content quality and freshness`);
  lines.push('');

  // Key Metrics
  lines.push('KEY METRICS');
  lines.push('Label,Value,Description,Color');
  executiveSummary.keyMetrics.forEach(metric => {
    lines.push([
      escapeCsv(metric.label),
      escapeCsv(String(metric.value)),
      escapeCsv(metric.description),
      metric.color,
    ].join(','));
  });
  lines.push('');

  // Alerts
  if (executiveSummary.alerts.length > 0) {
    lines.push('ALERTS');
    lines.push('Severity,Title,Description,Source,Created At');
    executiveSummary.alerts.forEach(alert => {
      lines.push([
        alert.severity,
        escapeCsv(alert.title),
        escapeCsv(alert.description),
        alert.source,
        alert.createdAt,
      ].join(','));
    });
    lines.push('');
  }

  // =====================
  // SECTION 2: TOPICS
  // =====================
  lines.push('================================================================================');
  lines.push('SECTION 2: TOPICS');
  lines.push('================================================================================');
  lines.push('');
  lines.push('ID,Title,Type,Parent ID,Slug,Description,Target URL,Keywords,Search Intent');
  topics.forEach(topic => {
    const metadata = topic.metadata as any;
    lines.push([
      topic.id,
      escapeCsv(topic.title),
      topic.type,
      topic.parent_topic_id || '',
      topic.slug,
      escapeCsv(topic.description || ''),
      escapeCsv(topic.target_url || ''),
      escapeCsv((topic.keywords || []).join('; ')),
      escapeCsv(topic.search_intent || ''),
    ].join(','));
  });
  lines.push('');

  // Topic Statistics
  lines.push('TOPIC STATISTICS');
  lines.push('Metric,Value');
  lines.push(`Total Topics,${topicalAuthority.mapHealth.totalTopics}`);
  lines.push(`Core Topics,${topicalAuthority.mapHealth.coreTopics}`);
  lines.push(`Supporting Topics,${topicalAuthority.mapHealth.outerTopics}`);
  lines.push(`Hub-Spoke Ratio,1:${topicalAuthority.mapHealth.hubSpokeRatio}`);
  lines.push(`Optimal Ratio,${topicalAuthority.mapHealth.optimalRatio}`);
  lines.push(`Pillar Coverage,${formatPercent(topicalAuthority.mapHealth.pillarCoverage)}`);
  lines.push(`Orphan Topics,${topicalAuthority.mapHealth.orphanTopicCount}`);
  lines.push('');

  // =====================
  // SECTION 3: EAV TRIPLES
  // =====================
  lines.push('================================================================================');
  lines.push('SECTION 3: EAV TRIPLES (Entity-Attribute-Value)');
  lines.push('================================================================================');
  lines.push('');
  lines.push('Subject Label,Subject ID,Predicate Relation,Predicate Category,Predicate Classification,Object Value,Object Type,Source,Confidence');
  eavs.forEach(eav => {
    lines.push([
      escapeCsv(eav.subject.label),
      escapeCsv(eav.subject.id || ''),
      escapeCsv(eav.predicate.relation),
      eav.predicate.category || '',
      eav.predicate.classification || '',
      escapeCsv(String(eav.object.value)),
      eav.object.type || 'literal',
      eav.source || '',
      eav.confidence?.toString() || '',
    ].join(','));
  });
  lines.push('');

  // EAV Distribution
  lines.push('EAV DISTRIBUTION BY CATEGORY');
  lines.push('Category,Count,Percentage');
  const totalEavs = topicalAuthority.eavDistribution.totalEavs || 1;
  Object.entries(topicalAuthority.eavDistribution.byCategory).forEach(([category, count]) => {
    const percentage = ((count / totalEavs) * 100).toFixed(1);
    lines.push([category, formatNum(count), `${percentage}%`].join(','));
  });
  lines.push(`TOTAL,${topicalAuthority.eavDistribution.totalEavs},100%`);
  lines.push('');

  // Top Entities
  lines.push('TOP ENTITIES BY ATTRIBUTE COUNT');
  lines.push('Rank,Entity,Attribute Count');
  topicalAuthority.eavDistribution.topEntities.forEach((entity, i) => {
    lines.push([`${i + 1}`, escapeCsv(entity.entity), formatNum(entity.attributeCount)].join(','));
  });
  lines.push('');

  // Missing Categories
  if (topicalAuthority.eavDistribution.missingCategories.length > 0) {
    lines.push('MISSING EAV CATEGORIES');
    lines.push('Category');
    topicalAuthority.eavDistribution.missingCategories.forEach(cat => {
      lines.push(escapeCsv(cat));
    });
    lines.push('');
  }

  // =====================
  // SECTION 4: E-A-T ANALYSIS
  // =====================
  lines.push('================================================================================');
  lines.push('SECTION 4: E-A-T (Expertise-Authority-Trust) ANALYSIS');
  lines.push('================================================================================');
  lines.push('');
  lines.push('E-A-T SCORES');
  lines.push('Component,Score,Explanation');
  lines.push(`Overall,${formatPercent(authorityTrust.eatBreakdown.overall)},Combined E-A-T score`);
  lines.push(`Expertise,${formatPercent(authorityTrust.eatBreakdown.expertise.score)},${escapeCsv(authorityTrust.eatBreakdown.expertise.explanation)}`);
  lines.push(`Authority,${formatPercent(authorityTrust.eatBreakdown.authority.score)},${escapeCsv(authorityTrust.eatBreakdown.authority.explanation)}`);
  lines.push(`Trust,${formatPercent(authorityTrust.eatBreakdown.trust.score)},${escapeCsv(authorityTrust.eatBreakdown.trust.explanation)}`);
  lines.push('');

  // E-A-T Factors
  lines.push('E-A-T FACTORS');
  lines.push('Component,Factor');
  authorityTrust.eatBreakdown.expertise.factors.forEach(f => {
    lines.push(`Expertise,${escapeCsv(f)}`);
  });
  authorityTrust.eatBreakdown.authority.factors.forEach(f => {
    lines.push(`Authority,${escapeCsv(f)}`);
  });
  authorityTrust.eatBreakdown.trust.factors.forEach(f => {
    lines.push(`Trust,${escapeCsv(f)}`);
  });
  lines.push('');

  // Entity Recognition
  lines.push('ENTITY RECOGNITION STATUS');
  lines.push('Check,Status,Details');
  lines.push(`Wikipedia Presence,${authorityTrust.entityRecognition.wikipediaPresence ? 'Found' : 'Not Found'},`);
  lines.push(`Wikidata ID,${authorityTrust.entityRecognition.wikidataId || 'Not Found'},`);
  lines.push(`Knowledge Graph,${authorityTrust.entityRecognition.knowledgeGraphStatus},`);
  lines.push(`Structured Data Valid,${authorityTrust.entityRecognition.structuredDataValid ? 'Yes' : 'No'},${escapeCsv(authorityTrust.entityRecognition.structuredDataIssues.join('; '))}`);
  lines.push('');

  // Reputation Signals
  if (authorityTrust.reputationSignals.length > 0) {
    lines.push('REPUTATION SIGNALS');
    lines.push('Source,Type,Sentiment,URL');
    authorityTrust.reputationSignals.forEach(signal => {
      lines.push([
        escapeCsv(signal.source),
        signal.type,
        signal.sentiment,
        escapeCsv(signal.url || ''),
      ].join(','));
    });
    lines.push('');
  }

  // Improvement Roadmap
  if (authorityTrust.improvementRoadmap.length > 0) {
    lines.push('E-A-T IMPROVEMENT ROADMAP');
    lines.push('Priority,Category,Title,Description,External Action Required');
    authorityTrust.improvementRoadmap.forEach(item => {
      lines.push([
        formatNum(item.priority),
        item.category,
        escapeCsv(item.title),
        escapeCsv(item.description),
        item.external ? 'Yes' : 'No',
      ].join(','));
    });
    lines.push('');
  }

  // =====================
  // SECTION 5: COMPETITIVE INTELLIGENCE
  // =====================
  lines.push('================================================================================');
  lines.push('SECTION 5: COMPETITIVE INTELLIGENCE');
  lines.push('================================================================================');
  lines.push('');
  lines.push('QUERY NETWORK SUMMARY');
  lines.push('Metric,Value');
  lines.push(`Total Queries Analyzed,${formatNum(competitiveIntel.queryNetworkSummary.totalQueries)}`);
  lines.push(`Your Topic Coverage,${formatNum(competitiveIntel.queryNetworkSummary.yourCoverage)}`);
  lines.push(`Competitor EAVs Found,${formatNum(competitiveIntel.queryNetworkSummary.competitorEavCount)}`);
  lines.push(`Content Gaps Identified,${formatNum(competitiveIntel.queryNetworkSummary.contentGapsCount)}`);
  lines.push(`Last Updated,${competitiveIntel.queryNetworkSummary.lastUpdated || 'Never'}`);
  lines.push('');

  // Intent Distribution
  lines.push('SEARCH INTENT DISTRIBUTION');
  lines.push('Intent,Count');
  Object.entries(competitiveIntel.queryNetworkSummary.intentDistribution).forEach(([intent, count]) => {
    lines.push([intent, formatNum(count)].join(','));
  });
  lines.push('');

  // Competitor EAV Comparison
  lines.push('COMPETITOR EAV COMPARISON');
  lines.push('Metric,Value');
  lines.push(`Your EAV Count,${formatNum(competitiveIntel.competitorEavComparison.yourEavCount)}`);
  lines.push(`Competitor EAV Count,${formatNum(competitiveIntel.competitorEavComparison.competitorEavCount)}`);
  lines.push(`Shared EAVs,${formatNum(competitiveIntel.competitorEavComparison.sharedEavs)}`);
  lines.push(`EAVs Unique to You,${formatNum(competitiveIntel.competitorEavComparison.uniqueToYou.length)}`);
  lines.push(`EAVs Unique to Competitors,${formatNum(competitiveIntel.competitorEavComparison.uniqueToCompetitors.length)}`);
  lines.push('');

  // Competitor-only EAVs (opportunities)
  if (competitiveIntel.competitorEavComparison.uniqueToCompetitors.length > 0) {
    lines.push('EAVs UNIQUE TO COMPETITORS (Opportunities to Add)');
    lines.push('Subject,Predicate,Object,Category');
    competitiveIntel.competitorEavComparison.uniqueToCompetitors.forEach(eav => {
      lines.push([
        escapeCsv(eav.subject.label),
        escapeCsv(eav.predicate.relation),
        escapeCsv(String(eav.object.value)),
        eav.predicate.category || '',
      ].join(','));
    });
    lines.push('');
  }

  // Content Gaps
  if (competitiveIntel.contentGaps.length > 0) {
    lines.push('CONTENT GAPS');
    lines.push('ID,Title,Description,Difficulty,Competitor Coverage,Search Volume,Priority');
    competitiveIntel.contentGaps.forEach(gap => {
      lines.push([
        gap.id,
        escapeCsv(gap.title),
        escapeCsv(gap.description),
        gap.difficulty || 'unknown',
        formatNum(gap.competitorCoverageCount),
        formatNum(gap.searchVolume),
        formatNum(gap.priority),
      ].join(','));
    });
    lines.push('');
  }

  // Questions to Answer
  if (competitiveIntel.questionsToAnswer.length > 0) {
    lines.push('QUESTIONS TO ANSWER');
    lines.push('ID,Question,Source,Search Volume,Related Topics');
    competitiveIntel.questionsToAnswer.forEach(q => {
      lines.push([
        q.id,
        escapeCsv(q.question),
        escapeCsv(q.source),
        formatNum(q.searchVolume),
        escapeCsv((q.relatedTopics || []).join('; ')),
      ].join(','));
    });
    lines.push('');
  }

  // Recommendations
  if (competitiveIntel.recommendations.length > 0) {
    lines.push('STRATEGIC RECOMMENDATIONS');
    lines.push('ID,Title,Description,Business Impact,Effort,Implementable');
    competitiveIntel.recommendations.forEach(rec => {
      lines.push([
        rec.id,
        escapeCsv(rec.title),
        escapeCsv(rec.description),
        escapeCsv(rec.businessImpact),
        rec.effort,
        rec.implementable ? 'Yes' : 'No',
      ].join(','));
    });
    lines.push('');
  }

  // =====================
  // SECTION 6: CONTENT HEALTH
  // =====================
  lines.push('================================================================================');
  lines.push('SECTION 6: CONTENT HEALTH');
  lines.push('================================================================================');
  lines.push('');
  lines.push('CORPUS OVERVIEW');
  lines.push('Metric,Value');
  lines.push(`Total Pages Analyzed,${formatNum(contentHealth.corpusOverview.totalPages)}`);
  lines.push(`Semantic Coverage,${formatPercent(contentHealth.corpusOverview.semanticCoverage)}`);
  lines.push(`Overlap Issues,${formatNum(contentHealth.corpusOverview.overlapCount)}`);
  lines.push(`Average Page Score,${formatPercent(contentHealth.corpusOverview.averagePageScore)}`);
  lines.push('');

  // Cannibalization Risks
  if (contentHealth.cannibalizationRisks.length > 0) {
    lines.push('CANNIBALIZATION RISKS');
    lines.push('ID,Topic A,Topic B,Topic A ID,Topic B ID,Similarity Score,Recommendation');
    contentHealth.cannibalizationRisks.forEach(risk => {
      lines.push([
        risk.id,
        escapeCsv(risk.topics[0]),
        escapeCsv(risk.topics[1]),
        risk.topicIds[0],
        risk.topicIds[1],
        formatNum(Math.round(risk.similarityScore)),
        risk.recommendation,
      ].join(','));
    });
    lines.push('');
  }

  // Anchor Text Audit
  lines.push('ANCHOR TEXT AUDIT');
  lines.push('Metric,Value');
  lines.push(`Total Anchors,${formatNum(contentHealth.anchorTextAudit.totalAnchors)}`);
  lines.push(`Generic Anchors,${formatNum(contentHealth.anchorTextAudit.genericAnchors)}`);
  lines.push(`Over-Optimized Anchors,${formatNum(contentHealth.anchorTextAudit.overOptimizedAnchors)}`);
  if (contentHealth.anchorTextAudit.suggestions.length > 0) {
    lines.push('');
    lines.push('Anchor Text Suggestions');
    contentHealth.anchorTextAudit.suggestions.forEach(suggestion => {
      lines.push(escapeCsv(suggestion));
    });
  }
  lines.push('');

  // Content Freshness
  lines.push('CONTENT FRESHNESS');
  lines.push('Metric,Value');
  lines.push(`Topics with Dates,${formatNum(contentHealth.contentFreshness.topicsWithDates)}`);
  lines.push('');

  if (contentHealth.contentFreshness.staleTopics.length > 0) {
    lines.push('STALE TOPICS (Need Update)');
    lines.push('Topic,Last Update,Days Old');
    contentHealth.contentFreshness.staleTopics.forEach(t => {
      lines.push([
        escapeCsv(t.topic),
        t.lastUpdate,
        formatNum(t.daysOld),
      ].join(','));
    });
    lines.push('');
  }

  if (contentHealth.contentFreshness.decayRiskTopics.length > 0) {
    lines.push('CONTENT DECAY RISK');
    lines.push('Topic,Decay Score');
    contentHealth.contentFreshness.decayRiskTopics.forEach(t => {
      lines.push([
        escapeCsv(t.topic),
        formatNum(Math.round(t.decayScore)),
      ].join(','));
    });
    lines.push('');
  }

  // =====================
  // SECTION 7: PUBLICATION PROGRESS
  // =====================
  lines.push('================================================================================');
  lines.push('SECTION 7: PUBLICATION PROGRESS');
  lines.push('================================================================================');
  lines.push('');

  // Phase Progress
  lines.push('PHASE PROGRESS');
  lines.push('Phase,Name,Completed Items,Total Items,Completion %');
  publicationProgress.phaseProgress.forEach(phase => {
    lines.push([
      formatNum(phase.phase),
      escapeCsv(phase.name),
      formatNum(phase.completedItems),
      formatNum(phase.totalItems),
      formatPercent(phase.completion),
    ].join(','));
  });
  lines.push('');

  // Content Status Board
  if (publicationProgress.contentStatusBoard.length > 0) {
    lines.push('CONTENT STATUS BOARD');
    lines.push('ID,Topic ID,Title,Status,Scheduled Date,Actual Date');
    publicationProgress.contentStatusBoard.forEach(item => {
      lines.push([
        item.id,
        item.topicId,
        escapeCsv(item.title),
        item.status,
        item.scheduledDate || '',
        item.actualDate || '',
      ].join(','));
    });
    lines.push('');
  }

  // Upcoming Deadlines
  if (publicationProgress.upcomingDeadlines.length > 0) {
    lines.push('UPCOMING DEADLINES');
    lines.push('ID,Topic ID,Title,Due Date,Status,Type');
    publicationProgress.upcomingDeadlines.forEach(deadline => {
      lines.push([
        deadline.id,
        deadline.topicId,
        escapeCsv(deadline.title),
        deadline.dueDate,
        deadline.status,
        deadline.type,
      ].join(','));
    });
    lines.push('');
  }

  // =====================
  // SECTION 8: AI USAGE & COSTS
  // =====================
  lines.push('================================================================================');
  lines.push('SECTION 8: AI USAGE & COSTS');
  lines.push('================================================================================');
  lines.push('');
  lines.push('SUMMARY');
  lines.push('Metric,Value');
  lines.push(`Total Tokens Used,${formatNum(costUsage.tokenConsumption.totalTokens)}`);
  lines.push(`Total Estimated Cost,${formatCurrency(costUsage.costBreakdown.totalCost)}`);
  lines.push(`Cost Per Content,${formatCurrency(costUsage.costBreakdown.costPerContent)}`);
  lines.push(`Period,${escapeCsv(costUsage.tokenConsumption.periodLabel)}`);
  if (costUsage.costBreakdown.budgetTotal) {
    lines.push(`Budget Total,${formatCurrency(costUsage.costBreakdown.budgetTotal)}`);
    lines.push(`Budget Remaining,${formatCurrency(costUsage.costBreakdown.budgetRemaining)}`);
  }
  lines.push('');

  // Tokens by Provider
  lines.push('TOKENS BY PROVIDER');
  lines.push('Provider,Tokens');
  Object.entries(costUsage.tokenConsumption.byProvider).forEach(([provider, tokens]) => {
    lines.push([provider, formatNum(tokens)].join(','));
  });
  lines.push('');

  // Cost by Provider
  lines.push('COST BY PROVIDER');
  lines.push('Provider,Cost');
  Object.entries(costUsage.costBreakdown.byProvider).forEach(([provider, cost]) => {
    lines.push([provider, formatCurrency(cost)].join(','));
  });
  lines.push('');

  // Tokens by Operation
  lines.push('TOKENS BY OPERATION');
  lines.push('Operation,Tokens');
  Object.entries(costUsage.tokenConsumption.byOperation).forEach(([operation, tokens]) => {
    lines.push([operation, formatNum(tokens)].join(','));
  });
  lines.push('');

  // Efficiency Metrics
  lines.push('EFFICIENCY METRICS');
  lines.push('Metric,Value');
  lines.push(`Retry Rate,${formatPercent(costUsage.efficiencyMetrics.retryRate)}`);
  Object.entries(costUsage.efficiencyMetrics.tokensPerOperation).forEach(([op, tokens]) => {
    lines.push([`Avg Tokens: ${op}`, formatNum(tokens)].join(','));
  });
  lines.push('');

  // Model Comparison
  if (costUsage.efficiencyMetrics.modelComparison.length > 0) {
    lines.push('MODEL COMPARISON');
    lines.push('Model,Average Tokens,Success Rate');
    costUsage.efficiencyMetrics.modelComparison.forEach(model => {
      lines.push([
        escapeCsv(model.model),
        formatNum(model.avgTokens),
        formatPercent(model.successRate),
      ].join(','));
    });
    lines.push('');
  }

  // Optimization Suggestions
  if (costUsage.optimizationSuggestions.length > 0) {
    lines.push('OPTIMIZATION SUGGESTIONS');
    lines.push('ID,Title,Description,Potential Savings,Implementation');
    costUsage.optimizationSuggestions.forEach(s => {
      lines.push([
        s.id,
        escapeCsv(s.title),
        escapeCsv(s.description),
        s.potentialSavings ? formatCurrency(s.potentialSavings) : '',
        escapeCsv(s.implementation),
      ].join(','));
    });
    lines.push('');
  }

  // Usage Trends
  if (costUsage.tokenConsumption.trends.length > 0) {
    lines.push('USAGE TRENDS');
    lines.push('Date,Tokens,Cost');
    costUsage.tokenConsumption.trends.forEach(trend => {
      lines.push([
        trend.date,
        formatNum(trend.tokens),
        formatCurrency(trend.cost),
      ].join(','));
    });
    lines.push('');
  }

  // =====================
  // SECTION 9: ACTION ITEMS
  // =====================
  lines.push('================================================================================');
  lines.push('SECTION 9: ACTION ITEMS');
  lines.push('================================================================================');
  lines.push('');

  const allActions = [
    ...actionCenter.criticalActions.map(a => ({ ...a, priorityGroup: 'CRITICAL' })),
    ...actionCenter.highPriorityActions.map(a => ({ ...a, priorityGroup: 'HIGH' })),
    ...actionCenter.mediumPriorityActions.map(a => ({ ...a, priorityGroup: 'MEDIUM' })),
    ...actionCenter.backlogActions.map(a => ({ ...a, priorityGroup: 'BACKLOG' })),
  ];

  lines.push('ACTION SUMMARY');
  lines.push('Priority Level,Count');
  lines.push(`Critical,${actionCenter.criticalActions.length}`);
  lines.push(`High,${actionCenter.highPriorityActions.length}`);
  lines.push(`Medium,${actionCenter.mediumPriorityActions.length}`);
  lines.push(`Backlog,${actionCenter.backlogActions.length}`);
  lines.push(`Completed,${actionCenter.completedActions.length}`);
  lines.push(`Total Pending,${allActions.length}`);
  lines.push('');

  lines.push('ALL ACTION ITEMS');
  lines.push('ID,Priority Group,Priority,What,Why,How,Effort,Source,Status,Implementable,Action Type,Created At');
  allActions.forEach(action => {
    lines.push([
      action.id,
      (action as any).priorityGroup,
      action.priority,
      escapeCsv(action.what),
      escapeCsv(action.why),
      escapeCsv(action.how),
      action.effort,
      action.source,
      action.status,
      action.implementable ? 'Yes' : 'No',
      action.actionType || '',
      action.createdAt,
    ].join(','));
  });
  lines.push('');

  // Completed Actions
  if (actionCenter.completedActions.length > 0) {
    lines.push('COMPLETED ACTIONS');
    lines.push('ID,What,Completed At');
    actionCenter.completedActions.forEach(action => {
      lines.push([
        action.id,
        escapeCsv(action.what),
        action.completedAt || '',
      ].join(','));
    });
    lines.push('');
  }

  // =====================
  // SECTION 10: SEMANTIC COMPLIANCE
  // =====================
  lines.push('================================================================================');
  lines.push('SECTION 10: SEMANTIC COMPLIANCE DETAILS');
  lines.push('================================================================================');
  lines.push('');
  lines.push(`Overall Semantic Compliance Score,${formatPercent(topicalAuthority.semanticCompliance.score)}`);
  lines.push('');

  if (topicalAuthority.semanticCompliance.breakdown.length > 0) {
    lines.push('COMPLIANCE BREAKDOWN BY CATEGORY');
    lines.push('Category,Score,Issues');
    topicalAuthority.semanticCompliance.breakdown.forEach(item => {
      lines.push([
        escapeCsv(item.category),
        formatPercent(item.score),
        escapeCsv(item.issues.join('; ')),
      ].join(','));
    });
    lines.push('');
  }

  if (topicalAuthority.semanticCompliance.nonCompliantTopics.length > 0) {
    lines.push('NON-COMPLIANT TOPICS');
    lines.push('Topic,Issues');
    topicalAuthority.semanticCompliance.nonCompliantTopics.forEach(item => {
      lines.push([
        escapeCsv(item.topic),
        escapeCsv(item.issues.join('; ')),
      ].join(','));
    });
    lines.push('');
  }

  // Information Density
  lines.push('INFORMATION DENSITY');
  lines.push('Metric,Value');
  lines.push(`Average Facts per Topic,${formatNum(topicalAuthority.informationDensity.averageFactsPerTopic)}`);
  if (topicalAuthority.informationDensity.competitorComparison !== undefined) {
    lines.push(`Competitor Comparison,${formatNum(topicalAuthority.informationDensity.competitorComparison)}`);
  }
  lines.push('');

  if (topicalAuthority.informationDensity.lowDensityTopics.length > 0) {
    lines.push('LOW DENSITY TOPICS (Need More Facts)');
    lines.push('Topic,Fact Count');
    topicalAuthority.informationDensity.lowDensityTopics.forEach(t => {
      lines.push([
        escapeCsv(t.topic),
        formatNum(t.factCount),
      ].join(','));
    });
    lines.push('');
  }

  // =====================
  // FOOTER
  // =====================
  lines.push('================================================================================');
  lines.push('END OF REPORT');
  lines.push('================================================================================');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Data Freshness: Query Network: ${insights.dataFreshness.queryNetwork || 'N/A'} | E-A-T Scanner: ${insights.dataFreshness.eatScanner || 'N/A'} | Corpus Audit: ${insights.dataFreshness.corpusAudit || 'N/A'}`);
  lines.push('');

  return lines.join('\n');
}

// =====================
// Content Plan Export
// =====================

export async function exportContentPlan(
  insights: AggregatedInsights,
  topics: EnrichedTopic[],
  config: Partial<ExportConfig> = {}
): Promise<ExportResult> {
  try {
    const csvContent = generateContentPlanCsv(insights, topics);

    const blob = new Blob([csvContent], { type: 'text/csv' });
    return {
      success: true,
      data: blob,
      filename: `content_plan_${formatDate(new Date())}.csv`,
      mimeType: 'text/csv',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed',
    };
  }
}

function generateContentPlanCsv(
  insights: AggregatedInsights,
  topics: EnrichedTopic[]
): string {
  const lines: string[] = [];

  // Content calendar format
  lines.push('Title,Type,Priority,Status,Target Date,Word Count,Notes');

  // Add existing topics
  topics.forEach(topic => {
    const metadata = topic.metadata as any;
    lines.push([
      escapeCsv(topic.title),
      topic.type,
      metadata?.priority || 'medium',
      metadata?.publication_status || 'not_started',
      metadata?.target_date || '',
      metadata?.target_word_count?.toString() || '1500',
      escapeCsv(topic.description || ''),
    ].join(','));
  });

  // Add content gaps as planned content
  insights.competitiveIntel.contentGaps.forEach(gap => {
    lines.push([
      escapeCsv(gap.title),
      'gap',
      'high',
      'planned',
      '',
      '1500',
      escapeCsv(`Content gap: ${gap.description}`),
    ].join(','));
  });

  return lines.join('\n');
}

// =====================
// JSON Export
// =====================

export async function exportFullDataJson(
  insights: AggregatedInsights,
  businessInfo: BusinessInfo,
  topics: EnrichedTopic[],
  eavs: SemanticTriple[]
): Promise<ExportResult> {
  try {
    const data = {
      exportedAt: new Date().toISOString(),
      insights,
      businessInfo: {
        domain: businessInfo.domain,
        projectName: businessInfo.projectName,
        industry: businessInfo.industry,
        valueProp: businessInfo.valueProp,
        audience: businessInfo.audience,
        seedKeyword: businessInfo.seedKeyword,
      },
      topics,
      eavs,
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });

    return {
      success: true,
      data: blob,
      filename: `full_export_${formatDate(new Date())}.json`,
      mimeType: 'application/json',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed',
    };
  }
}

// =====================
// Utility Functions
// =====================

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function getGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

function getStatusEmoji(score: number): string {
  if (score >= 80) return '✅ Excellent';
  if (score >= 60) return '🟡 Good';
  if (score >= 40) return '🟠 Needs Work';
  return '🔴 Critical';
}

// =====================
// Download Helper
// =====================

export function downloadExport(result: ExportResult): void {
  if (!result.success || !result.data || !result.filename) {
    console.error('Export failed:', result.error);
    return;
  }

  const url = URL.createObjectURL(result.data as Blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = result.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
