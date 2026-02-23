import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { QueryNetworkAnalysisResult } from '../../types';

export interface GapAnalysisExportDropdownProps {
  results: QueryNetworkAnalysisResult;
  scores: {
    overallHealth: number;
    contentQuality: number;
    pageStructure: number;
    informationDensity: number;
    topicCoverage: number;
  };
  businessDomain?: string;
}

type ExportFormat = 'csv' | 'json' | 'html';

interface ExportOption {
  format: ExportFormat;
  label: string;
  mimeType: string;
  ext: string;
}

const EXPORT_OPTIONS: ExportOption[] = [
  { format: 'csv', label: 'CSV', mimeType: 'text/csv', ext: 'csv' },
  { format: 'json', label: 'JSON', mimeType: 'application/json', ext: 'json' },
  { format: 'html', label: 'HTML Report', mimeType: 'text/html', ext: 'html' },
];

function buildFileName(domain: string | undefined, format: ExportFormat): string {
  const slug = domain
    ? domain.replace(/^https?:\/\//, '').replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    : 'gap-analysis';
  const date = new Date().toISOString().slice(0, 10);
  return `${slug}-gap-analysis-${date}.${format}`;
}

function escapeCsv(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function buildCsv(results: QueryNetworkAnalysisResult, scores: GapAnalysisExportDropdownProps['scores']): string {
  const lines: string[] = [];

  // Scores
  lines.push('Section: Scores');
  lines.push('Overall Health,Content Quality,Page Structure,Info Density,Topic Coverage');
  lines.push(`${scores.overallHealth},${scores.contentQuality},${scores.pageStructure},${scores.informationDensity},${scores.topicCoverage}`);
  lines.push('');

  // Content Gaps
  lines.push('Section: Content Gaps');
  lines.push('Priority,Missing Attribute,Frequency,Suggested Content,Found In');
  for (const gap of results.contentGaps) {
    lines.push([
      gap.priority,
      escapeCsv(gap.missingAttribute),
      String(gap.frequency),
      escapeCsv(gap.suggestedContent || ''),
      escapeCsv(gap.foundInCompetitors.join('; ')),
    ].join(','));
  }
  lines.push('');

  // Competitor EAVs
  lines.push('Section: Competitor EAVs');
  lines.push('Entity,Attribute,Value,Source,Confidence,Category');
  for (const eav of results.competitorEAVs) {
    lines.push([
      escapeCsv(eav.entity),
      escapeCsv(eav.attribute),
      escapeCsv(eav.value),
      escapeCsv(eav.source),
      String(eav.confidence),
      eav.category || '',
    ].join(','));
  }
  lines.push('');

  // Recommendations
  lines.push('Section: Recommendations');
  lines.push('Priority,Title,Suggested Action');
  for (const rec of results.recommendations) {
    lines.push([
      rec.priority,
      escapeCsv(rec.title),
      escapeCsv(rec.suggestedAction),
    ].join(','));
  }

  return lines.join('\n');
}

function buildJson(results: QueryNetworkAnalysisResult): string {
  const serializable = {
    ...results,
    serpResults: results.serpResults instanceof Map
      ? Object.fromEntries(results.serpResults)
      : results.serpResults,
  };
  return JSON.stringify(serializable, null, 2);
}

function buildHtml(results: QueryNetworkAnalysisResult, scores: GapAnalysisExportDropdownProps['scores'], domain?: string): string {
  const scoreColor = (v: number) => v >= 80 ? '#4ade80' : v >= 60 ? '#60a5fa' : v >= 40 ? '#fbbf24' : '#f87171';
  const prioColor = (p: string) => p === 'high' || p === 'critical' ? '#fca5a5' : p === 'medium' ? '#fcd34d' : '#a5f3fc';

  const gapsHtml = results.contentGaps.map(g => `
    <tr>
      <td style="color:${prioColor(g.priority)};font-weight:600;text-transform:uppercase">${g.priority}</td>
      <td>${g.missingAttribute}</td>
      <td style="text-align:center">${g.frequency}</td>
      <td>${g.suggestedContent || '-'}</td>
    </tr>`).join('');

  const recsHtml = results.recommendations.map(r => `
    <tr>
      <td style="color:${prioColor(r.priority)};font-weight:600;text-transform:uppercase">${r.priority}</td>
      <td>${r.title}</td>
      <td>${r.suggestedAction}</td>
    </tr>`).join('');

  const enrichHtml = results.googleApiEnrichment ? (() => {
    const items: string[] = [];
    const e = results.googleApiEnrichment;
    if (e.urlInspection) items.push(`<li>Indexation: ${e.urlInspection.indexed}/${e.urlInspection.total} pages indexed</li>`);
    if (e.entitySalience) items.push(`<li>Entity Salience: ${(e.entitySalience.centralEntitySalience * 100).toFixed(0)}% (rank #${e.entitySalience.rank})</li>`);
    if (e.trends) items.push(`<li>Seasonality: ${e.trends.seasonalityStrength > 0.3 ? `Seasonal (${(e.trends.seasonalityStrength * 100).toFixed(0)}%)` : 'Evergreen'}</li>`);
    if (e.ga4) items.push(`<li>GA4: ${e.ga4.totalSessions.toLocaleString()} sessions/week, ${e.ga4.avgBounceRate}% bounce</li>`);
    if (e.knowledgeGraph) items.push(`<li>Knowledge Graph: ${e.knowledgeGraph.found ? `Found (score: ${e.knowledgeGraph.authorityScore})` : 'Not found'}</li>`);
    return items.length > 0 ? `<h2>Google API Insights</h2><ul>${items.join('')}</ul>` : '';
  })() : '';

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Gap Analysis Report${domain ? ` — ${domain}` : ''}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#111827;color:#d1d5db;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:2rem;line-height:1.5}
  h1{color:#f9fafb;font-size:1.5rem;margin-bottom:.25rem}
  h2{color:#e5e7eb;font-size:1.1rem;margin:2rem 0 .75rem;border-bottom:1px solid #374151;padding-bottom:.5rem}
  .subtitle{color:#9ca3af;font-size:.85rem;margin-bottom:2rem}
  .scores{display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:1.5rem}
  .score-card{background:#1f2937;border:1px solid #374151;border-radius:.5rem;padding:1rem 1.5rem;text-align:center;min-width:120px}
  .score-card .value{font-size:1.75rem;font-weight:700}
  .score-card .label{font-size:.7rem;color:#9ca3af;text-transform:uppercase;margin-top:.25rem}
  table{width:100%;border-collapse:collapse;margin-bottom:1rem}
  th,td{text-align:left;padding:.5rem .75rem;border-bottom:1px solid #1f2937;font-size:.85rem}
  th{color:#9ca3af;font-size:.7rem;text-transform:uppercase;background:#1f2937}
  ul{list-style:disc;padding-left:1.5rem;font-size:.85rem}
  li{margin:.35rem 0}
  .footer{margin-top:3rem;padding-top:1rem;border-top:1px solid #374151;font-size:.75rem;color:#6b7280}
</style></head><body>
<h1>Gap Analysis Report</h1>
<p class="subtitle">${domain || 'Unknown domain'} &mdash; ${new Date().toLocaleDateString()}</p>
<div class="scores">
  <div class="score-card"><div class="value" style="color:${scoreColor(scores.overallHealth)}">${scores.overallHealth}</div><div class="label">Overall Health</div></div>
  <div class="score-card"><div class="value" style="color:${scoreColor(scores.contentQuality)}">${scores.contentQuality}</div><div class="label">Content Quality</div></div>
  <div class="score-card"><div class="value" style="color:${scoreColor(scores.pageStructure)}">${scores.pageStructure >= 0 ? scores.pageStructure : 'N/A'}</div><div class="label">Page Structure</div></div>
  <div class="score-card"><div class="value" style="color:${scoreColor(scores.informationDensity)}">${scores.informationDensity}</div><div class="label">Info Density</div></div>
  <div class="score-card"><div class="value" style="color:${scoreColor(scores.topicCoverage)}">${scores.topicCoverage}</div><div class="label">Topic Coverage</div></div>
</div>
${enrichHtml}
<h2>Content Gaps (${results.contentGaps.length})</h2>
<table><thead><tr><th>Priority</th><th>Missing Attribute</th><th>Frequency</th><th>Suggested Content</th></tr></thead><tbody>${gapsHtml || '<tr><td colspan="4" style="color:#6b7280">No gaps found</td></tr>'}</tbody></table>
<h2>Recommendations (${results.recommendations.length})</h2>
<table><thead><tr><th>Priority</th><th>Title</th><th>Suggested Action</th></tr></thead><tbody>${recsHtml || '<tr><td colspan="3" style="color:#6b7280">No recommendations</td></tr>'}</tbody></table>
<h2>Summary</h2>
<ul>
  <li>${results.competitorEAVs.length} competitor EAVs extracted from ${new Set(results.competitorEAVs.map(e => e.source)).size} sources</li>
  <li>${results.queryNetwork.length} queries in network</li>
  <li>${results.headingAnalysis.length} pages with heading analysis</li>
  ${results.hasGscData ? '<li>Enriched with Google Search Console data</li>' : ''}
</ul>
<div class="footer">Generated by Holistic SEO Workbench &mdash; ${new Date().toISOString()}</div>
</body></html>`;
}

export const GapAnalysisExportDropdown: React.FC<GapAnalysisExportDropdownProps> = ({
  results,
  scores,
  businessDomain,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleExport = useCallback((option: ExportOption) => {
    let content: string;
    switch (option.format) {
      case 'csv':
        content = buildCsv(results, scores);
        break;
      case 'json':
        content = buildJson(results);
        break;
      case 'html':
        content = buildHtml(results, scores, businessDomain);
        break;
    }

    const blob = new Blob([content], { type: option.mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = buildFileName(businessDomain, option.format);
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    setIsOpen(false);
  }, [results, scores, businessDomain]);

  return (
    <div className="relative inline-block" ref={dropdownRef} data-testid="gap-export-dropdown">
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 text-gray-200 text-sm font-medium hover:bg-gray-600 transition-colors border border-gray-600"
        data-testid="gap-export-button"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export
        <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-40 rounded-lg bg-gray-800 border border-gray-700 shadow-lg z-50 overflow-hidden"
          data-testid="gap-export-menu"
        >
          {EXPORT_OPTIONS.map(option => (
            <button
              key={option.format}
              type="button"
              onClick={() => handleExport(option)}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
              data-testid={`gap-export-option-${option.format}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default GapAnalysisExportDropdown;
