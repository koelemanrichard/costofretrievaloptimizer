/**
 * PDF Export Service
 *
 * Generates professional PDF reports from React components using
 * html2canvas for rendering and jsPDF for PDF creation.
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ReportConfig, ReportGenerationState } from '../types/reports';

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
  private pdf: jsPDF;
  private currentPage: number = 1;
  private yPosition: number = PDF_CONFIG.margin + PDF_CONFIG.headerHeight;

  constructor() {
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
          this.pdf.addPage();
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

        this.pdf.addImage(
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
      const blob = this.pdf.output('blob');

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
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(fonts.heading.size);
    this.pdf.setTextColor(colors.text);
    this.pdf.text(title, margin, margin + 10);

    // Subtitle
    if (subtitle) {
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setFontSize(fonts.body.size);
      this.pdf.setTextColor(colors.textLight);
      this.pdf.text(subtitle, margin, margin + 16);
    }

    // Header line
    this.pdf.setDrawColor(colors.border);
    this.pdf.setLineWidth(0.5);
    this.pdf.line(margin, margin + 18, margin + contentWidth, margin + 18);
  }

  /**
   * Add footer to current page
   */
  private addFooter(pageNumber: number, totalPages: number, includeTimestamp?: boolean): void {
    const { margin, pageHeight, contentWidth, colors, fonts } = PDF_CONFIG;
    const footerY = pageHeight - margin;

    // Footer line
    this.pdf.setDrawColor(colors.border);
    this.pdf.setLineWidth(0.5);
    this.pdf.line(margin, footerY - 8, margin + contentWidth, footerY - 8);

    // Page number
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(fonts.caption.size);
    this.pdf.setTextColor(colors.textLight);
    this.pdf.text(
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
      this.pdf.text(timestamp, margin, footerY - 3);
    }

    // Generated by text
    this.pdf.text(
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
    return this.pdf.output('datauristring');
  }

  /**
   * Download the PDF
   */
  download(filename: string): void {
    this.pdf.save(filename);
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
