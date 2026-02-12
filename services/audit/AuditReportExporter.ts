// services/audit/AuditReportExporter.ts
// Exports unified audit reports to CSV, HTML, JSON, XLSX, and batch ZIP formats.

import type { UnifiedAuditReport, AuditFinding, AuditPhaseResult } from './types';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';

export class AuditReportExporter {
  // ---------------------------------------------------------------------------
  // CSV Export
  // ---------------------------------------------------------------------------

  /** Export findings as CSV */
  exportCsv(report: UnifiedAuditReport): string {
    const headers = [
      'Phase',
      'Severity',
      'Rule ID',
      'Title',
      'Description',
      'Why It Matters',
      'Current Value',
      'Expected Value',
      'Example Fix',
      'Impact',
      'Category',
    ];

    const rows: string[] = [headers.join(',')];

    for (const phaseResult of report.phaseResults) {
      for (const finding of phaseResult.findings) {
        const row = [
          this.escapeCsvField(finding.phase),
          this.escapeCsvField(finding.severity),
          this.escapeCsvField(finding.ruleId),
          this.escapeCsvField(finding.title),
          this.escapeCsvField(finding.description),
          this.escapeCsvField(finding.whyItMatters),
          this.escapeCsvField(finding.currentValue ?? ''),
          this.escapeCsvField(finding.expectedValue ?? ''),
          this.escapeCsvField(finding.exampleFix ?? ''),
          this.escapeCsvField(finding.estimatedImpact),
          this.escapeCsvField(finding.category),
        ];
        rows.push(row.join(','));
      }
    }

    return rows.join('\n');
  }

  // ---------------------------------------------------------------------------
  // HTML Export
  // ---------------------------------------------------------------------------

  /** Export as standalone HTML report */
  exportHtml(report: UnifiedAuditReport): string {
    const allFindings = report.phaseResults.flatMap((pr) => pr.findings);
    const groupedBySeverity = this.groupFindingsBySeverity(allFindings);
    const topRecommendations = this.getTopRecommendations(allFindings, 5);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Audit Report - ${this.escapeHtml(report.url ?? report.projectId)}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #111827; color: #e5e7eb; max-width: 1200px; margin: 0 auto; padding: 2rem; line-height: 1.6; }
    h1 { color: #f9fafb; border-bottom: 2px solid #374151; padding-bottom: 0.5rem; }
    h2 { color: #d1d5db; margin-top: 2rem; }
    h3 { color: #9ca3af; }
    .overview { display: flex; align-items: center; gap: 2rem; margin: 1.5rem 0; padding: 1.5rem; background: #1f2937; border-radius: 0.75rem; border: 1px solid #374151; flex-wrap: wrap; }
    .score-badge { width: 100px; height: 100px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.75rem; font-weight: 700; color: #fff; flex-shrink: 0; }
    .score-high { background: #065f46; border: 3px solid #10b981; }
    .score-medium { background: #78350f; border: 3px solid #f59e0b; }
    .score-low { background: #7f1d1d; border: 3px solid #ef4444; }
    .overview-details p { margin: 0.25rem 0; color: #9ca3af; }
    .overview-details strong { color: #e5e7eb; }
    .phase-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 0.75rem; }
    .phase-card { background: #1f2937; border: 1px solid #374151; border-radius: 0.5rem; padding: 1rem; }
    .phase-card h3 { margin: 0 0 0.5rem 0; font-size: 0.95rem; }
    .phase-score { font-size: 1.5rem; font-weight: 700; }
    .phase-meta { font-size: 0.8rem; color: #6b7280; }
    .finding { background: #1f2937; border-radius: 0.5rem; padding: 1rem; margin: 0.5rem 0; }
    .severity-critical { border-left: 4px solid #ef4444; }
    .severity-high { border-left: 4px solid #f97316; }
    .severity-medium { border-left: 4px solid #eab308; }
    .severity-low { border-left: 4px solid #6b7280; }
    .finding-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .finding-title { font-weight: 600; color: #f9fafb; }
    .badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
    .badge-critical { background: #7f1d1d; color: #fca5a5; }
    .badge-high { background: #7c2d12; color: #fdba74; }
    .badge-medium { background: #713f12; color: #fde047; }
    .badge-low { background: #374151; color: #9ca3af; }
    .finding-desc { color: #9ca3af; font-size: 0.9rem; margin-bottom: 0.5rem; }
    .finding-detail { font-size: 0.85rem; color: #6b7280; margin: 0.25rem 0; }
    .finding-detail strong { color: #9ca3af; }
    .recommendation { background: #1f2937; border: 1px solid #374151; border-radius: 0.5rem; padding: 1rem; margin: 0.5rem 0; }
    .recommendation-number { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: #3b82f6; color: #fff; font-size: 0.8rem; font-weight: 700; margin-right: 0.5rem; }
    .severity-group { margin: 1rem 0; }
    .severity-group-header { font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; }
    footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #374151; color: #6b7280; font-size: 0.85rem; text-align: center; }
  </style>
</head>
<body>
  <h1>Content Audit Report</h1>
  <div class="overview">
    <div class="score-badge ${this.getScoreClass(report.overallScore)}">${report.overallScore}/100</div>
    <div class="overview-details">
      ${report.url ? `<p><strong>URL:</strong> ${this.escapeHtml(report.url)}</p>` : ''}
      <p><strong>Project:</strong> ${this.escapeHtml(report.projectId)}</p>
      <p><strong>Date:</strong> ${this.escapeHtml(report.createdAt)}</p>
      <p><strong>Duration:</strong> ${this.formatDuration(report.auditDurationMs)}</p>
      <p><strong>Language:</strong> ${this.escapeHtml(report.language)}</p>
      <p><strong>Total Findings:</strong> ${allFindings.length}</p>
    </div>
  </div>

  <h2>Phase Scores</h2>
  <div class="phase-grid">
${report.phaseResults.map((pr) => this.renderPhaseCard(pr)).join('\n')}
  </div>

  <h2>Findings (${allFindings.length})</h2>
${this.renderFindingsByGroup(groupedBySeverity)}

  <h2>Recommendations</h2>
${this.renderRecommendations(topRecommendations)}

  <footer>
    Generated by Holistic SEO Audit System
  </footer>
</body>
</html>`;
  }

  // ---------------------------------------------------------------------------
  // JSON Export
  // ---------------------------------------------------------------------------

  /** Export as JSON (for re-import/API use) */
  exportJson(report: UnifiedAuditReport): string {
    return JSON.stringify(report, null, 2);
  }

  // ---------------------------------------------------------------------------
  // XLSX Export (5-sheet Excel workbook)
  // ---------------------------------------------------------------------------

  /** Export as XLSX workbook with 5 sheets */
  async exportXlsx(report: UnifiedAuditReport): Promise<ArrayBuffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Holistic SEO Audit System';
    wb.created = new Date();

    // -- Sheet 1: Overview --
    const overviewSheet = wb.addWorksheet('Overview');
    overviewSheet.columns = [
      { header: 'Property', key: 'property', width: 30 },
      { header: 'Value', key: 'value', width: 50 },
    ];
    const allFindings = report.phaseResults.flatMap((pr) => pr.findings);
    const criticalCount = allFindings.filter((f) => f.severity === 'critical').length;
    const highCount = allFindings.filter((f) => f.severity === 'high').length;
    const mediumCount = allFindings.filter((f) => f.severity === 'medium').length;
    const lowCount = allFindings.filter((f) => f.severity === 'low').length;

    overviewSheet.addRows([
      { property: 'Overall Score', value: `${report.overallScore}/100` },
      { property: 'URL', value: report.url ?? 'N/A' },
      { property: 'Project ID', value: report.projectId },
      { property: 'Audit Type', value: report.auditType },
      { property: 'Language', value: report.language },
      { property: 'Date', value: report.createdAt },
      { property: 'Duration', value: this.formatDuration(report.auditDurationMs) },
      { property: 'Total Findings', value: String(allFindings.length) },
      { property: 'Critical', value: String(criticalCount) },
      { property: 'High', value: String(highCount) },
      { property: 'Medium', value: String(mediumCount) },
      { property: 'Low', value: String(lowCount) },
    ]);
    this.styleHeaderRow(overviewSheet);

    // -- Sheet 2: Findings --
    const findingsSheet = wb.addWorksheet('Findings');
    findingsSheet.columns = [
      { header: 'Phase', key: 'phase', width: 22 },
      { header: 'Severity', key: 'severity', width: 10 },
      { header: 'Rule ID', key: 'ruleId', width: 14 },
      { header: 'Title', key: 'title', width: 35 },
      { header: 'Description', key: 'description', width: 50 },
      { header: 'Why It Matters', key: 'whyItMatters', width: 40 },
      { header: 'Current Value', key: 'currentValue', width: 25 },
      { header: 'Expected Value', key: 'expectedValue', width: 25 },
      { header: 'Example Fix', key: 'exampleFix', width: 30 },
      { header: 'Impact', key: 'impact', width: 10 },
      { header: 'Category', key: 'category', width: 20 },
    ];

    for (const finding of allFindings) {
      const row = findingsSheet.addRow({
        phase: finding.phase,
        severity: finding.severity,
        ruleId: finding.ruleId,
        title: finding.title,
        description: finding.description,
        whyItMatters: finding.whyItMatters,
        currentValue: finding.currentValue ?? '',
        expectedValue: finding.expectedValue ?? '',
        exampleFix: finding.exampleFix ?? '',
        impact: finding.estimatedImpact,
        category: finding.category,
      });
      // Color-code severity cells
      const severityCell = row.getCell('severity');
      const colorMap: Record<string, string> = {
        critical: 'FFEF4444',
        high: 'FFF97316',
        medium: 'FFEAB308',
        low: 'FF9CA3AF',
      };
      severityCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: colorMap[finding.severity] || 'FF9CA3AF' },
      };
    }
    this.styleHeaderRow(findingsSheet);

    // -- Sheet 3: Phase Scores --
    const phasesSheet = wb.addWorksheet('Phase Scores');
    phasesSheet.columns = [
      { header: 'Phase', key: 'phase', width: 25 },
      { header: 'Score', key: 'score', width: 10 },
      { header: 'Weight (%)', key: 'weight', width: 12 },
      { header: 'Passed', key: 'passed', width: 10 },
      { header: 'Total Checks', key: 'total', width: 14 },
      { header: 'Findings', key: 'findings', width: 10 },
      { header: 'Summary', key: 'summary', width: 50 },
    ];

    for (const pr of report.phaseResults) {
      phasesSheet.addRow({
        phase: pr.phase,
        score: pr.score,
        weight: pr.weight,
        passed: pr.passedChecks,
        total: pr.totalChecks,
        findings: pr.findings.length,
        summary: pr.summary,
      });
    }
    this.styleHeaderRow(phasesSheet);

    // -- Sheet 4: Recommendations --
    const recsSheet = wb.addWorksheet('Recommendations');
    recsSheet.columns = [
      { header: '#', key: 'rank', width: 5 },
      { header: 'Priority', key: 'severity', width: 10 },
      { header: 'Title', key: 'title', width: 35 },
      { header: 'Description', key: 'description', width: 50 },
      { header: 'Suggested Fix', key: 'fix', width: 40 },
      { header: 'Impact', key: 'impact', width: 10 },
    ];

    const topFindings = this.getTopRecommendations(allFindings, 20);
    topFindings.forEach((f, i) => {
      recsSheet.addRow({
        rank: i + 1,
        severity: f.severity,
        title: f.title,
        description: f.description,
        fix: f.exampleFix ?? '',
        impact: f.estimatedImpact,
      });
    });
    this.styleHeaderRow(recsSheet);

    // -- Sheet 5: Metadata --
    const metaSheet = wb.addWorksheet('Metadata');
    metaSheet.columns = [
      { header: 'Property', key: 'property', width: 30 },
      { header: 'Value', key: 'value', width: 50 },
    ];
    metaSheet.addRows([
      { property: 'Report ID', value: report.id },
      { property: 'Version', value: String(report.version) },
      { property: 'Prerequisites - Business Info', value: report.prerequisitesMet.businessInfo ? 'Met' : 'Missing' },
      { property: 'Prerequisites - Pillars', value: report.prerequisitesMet.pillars ? 'Met' : 'Missing' },
      { property: 'Prerequisites - EAVs', value: report.prerequisitesMet.eavs ? 'Met' : 'Missing' },
      { property: 'Cannibalization Risks', value: String(report.cannibalizationRisks.length) },
      { property: 'Merge Suggestions', value: String(report.contentMergeSuggestions.length) },
      { property: 'Missing KG Topics', value: String(report.missingKnowledgeGraphTopics.length) },
    ]);

    if (report.missingKnowledgeGraphTopics.length > 0) {
      metaSheet.addRow({ property: '', value: '' });
      metaSheet.addRow({ property: 'Missing Knowledge Graph Topics', value: '' });
      for (const topic of report.missingKnowledgeGraphTopics) {
        metaSheet.addRow({ property: '', value: topic });
      }
    }
    this.styleHeaderRow(metaSheet);

    return wb.xlsx.writeBuffer() as Promise<ArrayBuffer>;
  }

  // ---------------------------------------------------------------------------
  // Batch ZIP Export (multiple reports)
  // ---------------------------------------------------------------------------

  /** Export multiple reports as a ZIP file containing individual HTML and JSON files */
  async exportBatch(reports: UnifiedAuditReport[]): Promise<ArrayBuffer> {
    const zip = new JSZip();

    for (const report of reports) {
      const slug = (report.url ?? report.projectId)
        .replace(/https?:\/\//, '')
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .slice(0, 60);

      const date = report.createdAt.slice(0, 10);
      const prefix = `${slug}_${date}`;

      zip.file(`${prefix}.html`, this.exportHtml(report));
      zip.file(`${prefix}.json`, this.exportJson(report));
      zip.file(`${prefix}.csv`, this.exportCsv(report));
    }

    // Add a summary index
    const summaryRows = [
      'URL,Score,Findings,Critical,High,Medium,Low,Date',
      ...reports.map((r) => {
        const findings = r.phaseResults.flatMap((pr) => pr.findings);
        return [
          this.escapeCsvField(r.url ?? r.projectId),
          r.overallScore,
          findings.length,
          findings.filter((f) => f.severity === 'critical').length,
          findings.filter((f) => f.severity === 'high').length,
          findings.filter((f) => f.severity === 'medium').length,
          findings.filter((f) => f.severity === 'low').length,
          r.createdAt.slice(0, 10),
        ].join(',');
      }),
    ];
    zip.file('_summary.csv', summaryRows.join('\n'));

    const buf = await zip.generateAsync({ type: 'arraybuffer' });
    return buf;
  }

  // ---------------------------------------------------------------------------
  // XLSX Helpers
  // ---------------------------------------------------------------------------

  private styleHeaderRow(sheet: ExcelJS.Worksheet): void {
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F2937' },
    };
    headerRow.alignment = { vertical: 'middle' };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Escape a CSV field: wrap in double quotes if it contains commas, quotes, or newlines */
  escapeCsvField(value: string): string {
    if (
      value.includes(',') ||
      value.includes('"') ||
      value.includes('\n') ||
      value.includes('\r')
    ) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /** Format duration in human-readable form */
  formatDuration(ms: number): string {
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(1)}s`;
    }
    return `${Math.round(ms)}ms`;
  }

  // ---------------------------------------------------------------------------
  // Private HTML helpers
  // ---------------------------------------------------------------------------

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private getScoreClass(score: number): string {
    if (score >= 70) return 'score-high';
    if (score >= 40) return 'score-medium';
    return 'score-low';
  }

  private groupFindingsBySeverity(
    findings: AuditFinding[]
  ): Record<string, AuditFinding[]> {
    const groups: Record<string, AuditFinding[]> = {
      critical: [],
      high: [],
      medium: [],
      low: [],
    };
    for (const f of findings) {
      groups[f.severity].push(f);
    }
    return groups;
  }

  private getTopRecommendations(
    findings: AuditFinding[],
    count: number
  ): AuditFinding[] {
    const severityOrder: Record<string, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    return [...findings]
      .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
      .slice(0, count);
  }

  private renderPhaseCard(pr: AuditPhaseResult): string {
    return `    <div class="phase-card">
      <h3>${this.escapeHtml(pr.phase)}</h3>
      <div class="phase-score" style="color: ${this.getScoreColor(pr.score)}">${pr.score}/100</div>
      <div class="phase-meta">${pr.passedChecks}/${pr.totalChecks} checks passed &middot; weight: ${pr.weight}%</div>
      <div class="phase-meta">${this.escapeHtml(pr.summary)}</div>
    </div>`;
  }

  private getScoreColor(score: number): string {
    if (score >= 70) return '#10b981';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  }

  private renderFindingsByGroup(
    groups: Record<string, AuditFinding[]>
  ): string {
    const parts: string[] = [];
    for (const severity of ['critical', 'high', 'medium', 'low'] as const) {
      const findings = groups[severity];
      if (findings.length === 0) continue;
      parts.push(`  <div class="severity-group">
    <div class="severity-group-header"><span class="badge badge-${severity}">${severity}</span> (${findings.length})</div>
${findings.map((f) => this.renderFinding(f)).join('\n')}
  </div>`);
    }
    return parts.join('\n');
  }

  private renderFinding(f: AuditFinding): string {
    const details: string[] = [];
    if (f.whyItMatters) {
      details.push(
        `      <div class="finding-detail"><strong>Why it matters:</strong> ${this.escapeHtml(f.whyItMatters)}</div>`
      );
    }
    if (f.currentValue) {
      details.push(
        `      <div class="finding-detail"><strong>Current:</strong> ${this.escapeHtml(f.currentValue)}</div>`
      );
    }
    if (f.expectedValue) {
      details.push(
        `      <div class="finding-detail"><strong>Expected:</strong> ${this.escapeHtml(f.expectedValue)}</div>`
      );
    }
    if (f.exampleFix) {
      details.push(
        `      <div class="finding-detail"><strong>Fix:</strong> ${this.escapeHtml(f.exampleFix)}</div>`
      );
    }

    return `    <div class="finding severity-${f.severity}">
      <div class="finding-header">
        <span class="finding-title">${this.escapeHtml(f.title)}</span>
        <span class="badge badge-${f.severity}">${f.severity}</span>
      </div>
      <div class="finding-desc">${this.escapeHtml(f.description)}</div>
${details.join('\n')}
    </div>`;
  }

  private renderRecommendations(findings: AuditFinding[]): string {
    if (findings.length === 0) {
      return '  <p>No findings to recommend fixes for.</p>';
    }
    return findings
      .map(
        (f, i) => `  <div class="recommendation severity-${f.severity}">
    <div class="finding-header">
      <span><span class="recommendation-number">${i + 1}</span><strong>${this.escapeHtml(f.title)}</strong></span>
      <span class="badge badge-${f.severity}">${f.severity}</span>
    </div>
    <div class="finding-desc">${this.escapeHtml(f.description)}</div>
    ${f.exampleFix ? `<div class="finding-detail"><strong>Suggested fix:</strong> ${this.escapeHtml(f.exampleFix)}</div>` : ''}
    <div class="finding-detail"><strong>Impact:</strong> ${this.escapeHtml(f.estimatedImpact)}</div>
  </div>`
      )
      .join('\n');
  }
}
