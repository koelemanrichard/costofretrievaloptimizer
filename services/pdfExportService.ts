/**
 * PDF Export Service
 *
 * Generates professional PDF reports from React components using
 * html2canvas for rendering and jsPDF for PDF creation.
 *
 * Uses lazy loading for jsPDF and html2canvas to reduce initial bundle size.
 * These libraries are only loaded when PDF export is actually triggered.
 */

import { ReportConfig, ReportGenerationState } from '../types/reports';

// Lazy load heavy dependencies - only imported when needed
let jsPDFModule: typeof import('jspdf') | null = null;
let html2canvasModule: typeof import('html2canvas') | null = null;

const loadPdfDependencies = async () => {
  if (!jsPDFModule) {
    jsPDFModule = await import('jspdf');
  }
  if (!html2canvasModule) {
    html2canvasModule = await import('html2canvas');
  }
  return {
    jsPDF: jsPDFModule.default,
    html2canvas: html2canvasModule.default,
  };
};

// ============================================
// CONFIGURATION
// ============================================

const PDF_CONFIG = {
  // Page dimensions (A4)
  pageWidth: 210,
  pageHeight: 297,
  margin: 15,

  // Content area
  contentWidth: 180, // 210 - 15*2
  contentHeight: 267, // 297 - 15*2

  // Header/Footer heights
  headerHeight: 20,
  footerHeight: 15,

  // Fonts
  fonts: {
    title: { size: 24, style: 'bold' },
    heading: { size: 16, style: 'bold' },
    subheading: { size: 12, style: 'bold' },
    body: { size: 10, style: 'normal' },
    caption: { size: 8, style: 'italic' }
  },

  // Colors
  colors: {
    primary: '#3B82F6',
    text: '#1F2937',
    textLight: '#6B7280',
    border: '#E5E7EB',
    background: '#F9FAFB'
  }
};

// ============================================
// TYPES
// ============================================

interface ExportOptions {
  filename: string;
  title: string;
  subtitle?: string;
  includeLogo?: boolean;
  includeTimestamp?: boolean;
  onProgress?: (state: ReportGenerationState) => void;
}

interface PageBreakInfo {
  pageNumber: number;
  yPosition: number;
}

// ============================================
// PDF GENERATION CLASS
// ============================================

export class PdfExporter {
  private pdf: InstanceType<typeof import('jspdf').default> | null = null;
  private currentPage: number = 1;
  private yPosition: number = PDF_CONFIG.margin + PDF_CONFIG.headerHeight;

  /**
   * Initialize the PDF document (lazy loads jsPDF)
   */
  private async initPdf(): Promise<void> {
    const { jsPDF } = await loadPdfDependencies();
    this.pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
  }

  /**
   * Generate PDF from a DOM element containing the report
   */
  async generateFromElement(
    element: HTMLElement,
    options: ExportOptions
  ): Promise<Blob> {
    const { onProgress } = options;

    try {
      onProgress?.({
        isGenerating: true,
        progress: 5,
        currentStep: 'Loading PDF libraries...',
        error: null
      });

      // Lazy load dependencies
      const { html2canvas } = await loadPdfDependencies();
      await this.initPdf();

      onProgress?.({
        isGenerating: true,
        progress: 10,
        currentStep: 'Preparing report...',
        error: null
      });

      // Capture the element as canvas
      const canvas = await html2canvas(element, {
        scale: 2, // Higher quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1200,
        windowHeight: element.scrollHeight
      });

      onProgress?.({
        isGenerating: true,
        progress: 50,
        currentStep: 'Generating PDF pages...',
        error: null
      });

      // Calculate dimensions
      const imgWidth = PDF_CONFIG.contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Split into pages if needed
      const pageContentHeight = PDF_CONFIG.contentHeight - PDF_CONFIG.headerHeight - PDF_CONFIG.footerHeight;
      const totalPages = Math.ceil(imgHeight / pageContentHeight);

      for (let i = 0; i < totalPages; i++) {
        if (i > 0) {
          this.pdf!.addPage();
        }

        // Add header
        this.addHeader(options.title, options.subtitle);

        // Calculate which part of the image to draw
        const sourceY = i * pageContentHeight * (canvas.width / imgWidth);
        const sourceHeight = Math.min(
          pageContentHeight * (canvas.width / imgWidth),
          canvas.height - sourceY
        );

        // Create a temporary canvas for this page's content
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sourceHeight;
        const ctx = pageCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(
            canvas,
            0, sourceY,
            canvas.width, sourceHeight,
            0, 0,
            canvas.width, sourceHeight
          );
        }

        // Add the image to PDF
        const pageImgData = pageCanvas.toDataURL('image/png');
        const drawHeight = (sourceHeight * imgWidth) / canvas.width;

        this.pdf!.addImage(
          pageImgData,
          'PNG',
          PDF_CONFIG.margin,
          PDF_CONFIG.margin + PDF_CONFIG.headerHeight,
          imgWidth,
          drawHeight
        );

        // Add footer
        this.addFooter(i + 1, totalPages, options.includeTimestamp);

        onProgress?.({
          isGenerating: true,
          progress: 50 + ((i + 1) / totalPages) * 40,
          currentStep: `Rendering page ${i + 1} of ${totalPages}...`,
          error: null
        });
      }

      onProgress?.({
        isGenerating: true,
        progress: 95,
        currentStep: 'Finalizing PDF...',
        error: null
      });

      // Generate blob
      const blob = this.pdf!.output('blob');

      onProgress?.({
        isGenerating: false,
        progress: 100,
        currentStep: 'Complete',
        error: null
      });

      return blob;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'PDF generation failed';
      onProgress?.({
        isGenerating: false,
        progress: 0,
        currentStep: 'Error',
        error: errorMessage
      });
      throw error;
    }
  }

  /**
   * Add header to current page
   */
  private addHeader(title: string, subtitle?: string): void {
    const { margin, contentWidth, colors, fonts } = PDF_CONFIG;

    // Title
    this.pdf!.setFont('helvetica', 'bold');
    this.pdf!.setFontSize(fonts.heading.size);
    this.pdf!.setTextColor(colors.text);
    this.pdf!.text(title, margin, margin + 10);

    // Subtitle
    if (subtitle) {
      this.pdf!.setFont('helvetica', 'normal');
      this.pdf!.setFontSize(fonts.body.size);
      this.pdf!.setTextColor(colors.textLight);
      this.pdf!.text(subtitle, margin, margin + 16);
    }

    // Header line
    this.pdf!.setDrawColor(colors.border);
    this.pdf!.setLineWidth(0.5);
    this.pdf!.line(margin, margin + 18, margin + contentWidth, margin + 18);
  }

  /**
   * Add footer to current page
   */
  private addFooter(pageNumber: number, totalPages: number, includeTimestamp?: boolean): void {
    const { margin, pageHeight, contentWidth, colors, fonts } = PDF_CONFIG;
    const footerY = pageHeight - margin;

    // Footer line
    this.pdf!.setDrawColor(colors.border);
    this.pdf!.setLineWidth(0.5);
    this.pdf!.line(margin, footerY - 8, margin + contentWidth, footerY - 8);

    // Page number
    this.pdf!.setFont('helvetica', 'normal');
    this.pdf!.setFontSize(fonts.caption.size);
    this.pdf!.setTextColor(colors.textLight);
    this.pdf!.text(
      `Page ${pageNumber} of ${totalPages}`,
      margin + contentWidth / 2,
      footerY - 3,
      { align: 'center' }
    );

    // Timestamp
    if (includeTimestamp) {
      const timestamp = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      this.pdf!.text(timestamp, margin, footerY - 3);
    }

    // Generated by text
    this.pdf!.text(
      'Generated by Holistic SEO Tool',
      margin + contentWidth,
      footerY - 3,
      { align: 'right' }
    );
  }

  /**
   * Get the PDF as a data URL
   */
  getDataUrl(): string {
    return this.pdf!.output('datauristring');
  }

  /**
   * Download the PDF
   */
  download(filename: string): void {
    this.pdf!.save(filename);
  }
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

/**
 * Export a report element to PDF and trigger download
 */
export const exportToPdf = async (
  element: HTMLElement,
  options: ExportOptions
): Promise<void> => {
  const exporter = new PdfExporter();
  const blob = await exporter.generateFromElement(element, options);

  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = options.filename.endsWith('.pdf')
    ? options.filename
    : `${options.filename}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export a report element to PDF and return as blob
 */
export const exportToPdfBlob = async (
  element: HTMLElement,
  options: ExportOptions
): Promise<Blob> => {
  const exporter = new PdfExporter();
  return exporter.generateFromElement(element, options);
};

/**
 * Print a report (opens print dialog)
 */
export const printReport = (element: HTMLElement): void => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    console.error('Failed to open print window');
    return;
  }

  // Get computed styles
  const styles = Array.from(document.styleSheets)
    .map(sheet => {
      try {
        return Array.from(sheet.cssRules)
          .map(rule => rule.cssText)
          .join('\n');
      } catch {
        return '';
      }
    })
    .join('\n');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print Report</title>
        <style>
          ${styles}
          @media print {
            body { margin: 0; padding: 20px; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        ${element.outerHTML}
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();

  // Wait for content to load then print
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
};

/**
 * Export report as HTML file
 */
export const exportToHtml = (
  element: HTMLElement,
  filename: string,
  title: string
): void => {
  // Get styles
  const styles = Array.from(document.styleSheets)
    .map(sheet => {
      try {
        return Array.from(sheet.cssRules)
          .map(rule => rule.cssText)
          .join('\n');
      } catch {
        return '';
      }
    })
    .join('\n');

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          ${styles}
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 1200px;
            margin: 0 auto;
            padding: 40px 20px;
            background: #f9fafb;
          }
          @media print {
            body { background: white; padding: 20px; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        ${element.outerHTML}
        <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
          Generated by Holistic SEO Tool on ${new Date().toLocaleDateString()}
        </footer>
      </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.html') ? filename : `${filename}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Generate enhanced audit metrics HTML report
 */
export interface EnhancedMetricsReportData {
  projectName: string;
  semanticCompliance: {
    score: number;
    target: number;
    eavCoverage: number;
    categoryDistribution: Record<string, number>;
    classificationDistribution: Record<string, number>;
    recommendations: string[];
  };
  authorityIndicators: {
    eavAuthorityScore: number;
    uniqueEavCount: number;
    rootEavCount: number;
    rareEavCount: number;
    commonEavCount: number;
    topicalDepthScore: number;
  };
  topicCount: number;
  actionRoadmap?: Array<{
    priority: string;
    category: string;
    action: string;
    impact: string;
  }>;
}

export const generateEnhancedMetricsHtmlReport = (data: EnhancedMetricsReportData): string => {
  const { projectName, semanticCompliance, authorityIndicators, topicCount, actionRoadmap } = data;

  const getScoreColor = (score: number): string => {
    if (score >= 85) return '#22c55e';
    if (score >= 70) return '#eab308';
    if (score >= 50) return '#f97316';
    return '#ef4444';
  };

  const getPriorityBadge = (priority: string): string => {
    const colors: Record<string, string> = {
      critical: 'background: #fee2e2; color: #dc2626;',
      high: 'background: #ffedd5; color: #ea580c;',
      medium: 'background: #fef3c7; color: #d97706;',
      low: 'background: #dbeafe; color: #2563eb;'
    };
    return colors[priority] || colors.low;
  };

  const categoryRows = Object.entries(semanticCompliance.categoryDistribution)
    .map(([cat, count]) => {
      const total = Object.values(semanticCompliance.categoryDistribution).reduce((a, b) => a + b, 0);
      const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0';
      return `<tr><td>${cat}</td><td>${count}</td><td>${pct}%</td></tr>`;
    })
    .join('');

  const classificationRows = Object.entries(semanticCompliance.classificationDistribution)
    .map(([cls, count]) => {
      const total = Object.values(semanticCompliance.classificationDistribution).reduce((a, b) => a + b, 0);
      const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0';
      return `<tr><td>${cls}</td><td>${count}</td><td>${pct}%</td></tr>`;
    })
    .join('');

  const recommendationsList = semanticCompliance.recommendations
    .map(rec => `<li>${rec}</li>`)
    .join('');

  const roadmapItems = (actionRoadmap || [])
    .map(item => `
      <div style="padding: 12px; margin-bottom: 8px; border-radius: 8px; border: 1px solid #e5e7eb; ${getPriorityBadge(item.priority)}">
        <div style="display: flex; gap: 8px; margin-bottom: 4px;">
          <span style="font-weight: bold; text-transform: uppercase; font-size: 12px;">${item.priority}</span>
          <span style="color: #6b7280;">|</span>
          <span style="color: #6b7280; font-size: 12px;">${item.category}</span>
        </div>
        <p style="margin: 0 0 4px 0; font-weight: 500;">${item.action}</p>
        <p style="margin: 0; font-size: 12px; color: #6b7280;">${item.impact}</p>
      </div>
    `)
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Enhanced Audit Report - ${projectName}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #f9fafb;
      color: #1f2937;
    }
    h1 { color: #111827; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
    h2 { color: #374151; margin-top: 30px; }
    h3 { color: #4b5563; }
    .card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
    }
    .metric-box {
      background: #f3f4f6;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    }
    .metric-value { font-size: 36px; font-weight: bold; }
    .metric-label { font-size: 14px; color: #6b7280; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    th { background: #f9fafb; font-weight: 600; }
    .score-gauge {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: conic-gradient(
        ${getScoreColor(semanticCompliance.score)} 0deg ${(semanticCompliance.score / 100) * 360}deg,
        #e5e7eb ${(semanticCompliance.score / 100) * 360}deg 360deg
      );
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto;
    }
    .score-gauge-inner {
      width: 90px;
      height: 90px;
      border-radius: 50%;
      background: white;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .score-value { font-size: 24px; font-weight: bold; }
    .score-target { font-size: 12px; color: #6b7280; }
    ul { margin: 0; padding-left: 20px; }
    li { margin-bottom: 8px; }
    @media print {
      body { background: white; }
      .card { box-shadow: none; border: 1px solid #e5e7eb; }
    }
  </style>
</head>
<body>
  <h1>Enhanced Audit Report</h1>
  <p style="color: #6b7280;">Project: <strong>${projectName}</strong> | Generated: ${new Date().toLocaleDateString()}</p>

  <div class="card">
    <h2 style="margin-top: 0;">Overview Scores</h2>
    <div class="metrics-grid">
      <div style="text-align: center;">
        <div class="score-gauge">
          <div class="score-gauge-inner">
            <span class="score-value">${semanticCompliance.score}%</span>
            <span class="score-target">Target: ${semanticCompliance.target}%</span>
          </div>
        </div>
        <p style="margin-top: 8px; font-weight: 500;">Semantic Compliance</p>
      </div>
      <div class="metric-box">
        <div class="metric-value" style="color: ${getScoreColor(authorityIndicators.eavAuthorityScore)}">
          ${authorityIndicators.eavAuthorityScore}%
        </div>
        <div class="metric-label">EAV Authority Score</div>
      </div>
      <div class="metric-box">
        <div class="metric-value" style="color: ${getScoreColor(authorityIndicators.topicalDepthScore)}">
          ${authorityIndicators.topicalDepthScore}%
        </div>
        <div class="metric-label">Topical Depth</div>
      </div>
      <div class="metric-box">
        <div class="metric-value">${semanticCompliance.eavCoverage}</div>
        <div class="metric-label">Total EAVs</div>
      </div>
    </div>
  </div>

  <div class="card">
    <h2 style="margin-top: 0;">Authority Indicators</h2>
    <div class="metrics-grid">
      <div class="metric-box">
        <div class="metric-value" style="color: #8b5cf6;">${authorityIndicators.uniqueEavCount}</div>
        <div class="metric-label">UNIQUE EAVs</div>
      </div>
      <div class="metric-box">
        <div class="metric-value" style="color: #3b82f6;">${authorityIndicators.rootEavCount}</div>
        <div class="metric-label">ROOT EAVs</div>
      </div>
      <div class="metric-box">
        <div class="metric-value" style="color: #10b981;">${authorityIndicators.rareEavCount}</div>
        <div class="metric-label">RARE EAVs</div>
      </div>
      <div class="metric-box">
        <div class="metric-value" style="color: #6b7280;">${authorityIndicators.commonEavCount}</div>
        <div class="metric-label">COMMON EAVs</div>
      </div>
    </div>
    <p style="margin-top: 16px; padding: 12px; background: #f3f4f6; border-radius: 8px; font-size: 14px;">
      <strong>Authority Strategy:</strong> Focus on UNIQUE and ROOT EAVs to establish topical authority.
      Current ratio: ${topicCount > 0 ? (semanticCompliance.eavCoverage / topicCount).toFixed(1) : 0} EAVs per topic (target: 3+).
    </p>
  </div>

  <div class="card">
    <h2 style="margin-top: 0;">Category Distribution</h2>
    <table>
      <thead>
        <tr><th>Category</th><th>Count</th><th>Percentage</th></tr>
      </thead>
      <tbody>${categoryRows || '<tr><td colspan="3" style="text-align: center; color: #6b7280;">No data</td></tr>'}</tbody>
    </table>
  </div>

  <div class="card">
    <h2 style="margin-top: 0;">Classification Distribution</h2>
    <table>
      <thead>
        <tr><th>Classification</th><th>Count</th><th>Percentage</th></tr>
      </thead>
      <tbody>${classificationRows || '<tr><td colspan="3" style="text-align: center; color: #6b7280;">No data</td></tr>'}</tbody>
    </table>
  </div>

  ${semanticCompliance.recommendations.length > 0 ? `
  <div class="card">
    <h2 style="margin-top: 0;">Recommendations</h2>
    <ul>${recommendationsList}</ul>
  </div>
  ` : ''}

  ${roadmapItems ? `
  <div class="card">
    <h2 style="margin-top: 0;">Action Roadmap</h2>
    ${roadmapItems}
  </div>
  ` : ''}

  <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
    Generated by Holistic SEO Tool | ${new Date().toLocaleDateString()}
  </footer>
</body>
</html>
  `.trim();
};

/**
 * Export enhanced metrics report as HTML file
 */
export const exportEnhancedMetricsToHtml = (
  data: EnhancedMetricsReportData,
  filename: string
): void => {
  const html = generateEnhancedMetricsHtmlReport(data);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.html') ? filename : `${filename}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
