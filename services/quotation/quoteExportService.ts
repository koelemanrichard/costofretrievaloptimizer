/**
 * Quote Export Service
 *
 * Generates PDF and HTML exports of quotes.
 */

import {
  Quote,
  QuoteLineItem,
  KpiProjection,
  RoiCalculation,
  QuoteExportOptions,
  CurrencyCode,
} from '../../types/quotation';
import { CATEGORY_INFO } from '../../config/quotation/modules';
import {
  formatCurrency as formatCurrencyUtil,
  formatPriceRange as formatPriceRangeUtil,
} from '../../utils/currencyFormatter';

// =============================================================================
// Formatting Helpers (with currency support)
// =============================================================================

// Default currency can be overridden via options
let defaultCurrency: CurrencyCode = 'EUR';

export function setExportCurrency(currency: CurrencyCode): void {
  defaultCurrency = currency;
}

function formatCurrency(amount: number, currency?: CurrencyCode): string {
  return formatCurrencyUtil(amount, currency || defaultCurrency);
}

function formatPriceRange(min: number, max: number, currency?: CurrencyCode): string {
  return formatPriceRangeUtil(min, max, currency || defaultCurrency);
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'Not specified';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// =============================================================================
// HTML Template Generation
// =============================================================================

function generateLineItemsHtml(lineItems: QuoteLineItem[], currency?: CurrencyCode): string {
  // Group by category
  const byCategory = lineItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, QuoteLineItem[]>);

  return Object.entries(byCategory)
    .map(([category, items]) => {
      const categoryName = CATEGORY_INFO[category as keyof typeof CATEGORY_INFO]?.name || category;
      const itemRows = items
        .map(
          (item) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
            <div style="font-weight: 500;">${item.moduleName}</div>
            ${item.isRecurring ? `<span style="font-size: 12px; color: #7c3aed;">${item.recurringInterval}</span>` : ''}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">
            ${formatPriceRange(item.totalMin, item.totalMax, currency)}
          </td>
        </tr>
      `
        )
        .join('');

      return `
        <tr>
          <td colspan="2" style="padding: 12px 12px 8px; background: #f9fafb; font-weight: 600; color: #374151;">
            ${categoryName}
          </td>
        </tr>
        ${itemRows}
      `;
    })
    .join('');
}

function generateKpiProjectionsHtml(projections: KpiProjection[]): string {
  return projections
    .slice(0, 4)
    .map(
      (p) => `
      <div style="background: #f9fafb; padding: 16px; border-radius: 8px;">
        <div style="color: #6b7280; font-size: 14px; margin-bottom: 4px;">${p.label}</div>
        <div style="font-size: 20px; font-weight: 600; color: #111827;">
          +${p.projectedMin} - ${p.projectedMax}${p.unit ? ` ${p.unit}` : ''}
        </div>
        <div style="color: #9ca3af; font-size: 12px; margin-top: 4px;">
          ${Math.round(p.confidence * 100)}% confidence • ${p.timeframeMonths} months
        </div>
      </div>
    `
    )
    .join('');
}

function generateRoiHtml(roi: RoiCalculation, currency?: CurrencyCode): string {
  return `
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
      <div>
        <div style="color: #6b7280; font-size: 14px;">Additional Leads</div>
        <div style="font-size: 24px; font-weight: 600; color: #111827;">
          ${roi.projectedAdditionalLeadsMin} - ${roi.projectedAdditionalLeadsMax}
        </div>
        <div style="color: #9ca3af; font-size: 12px;">per month</div>
      </div>
      <div>
        <div style="color: #6b7280; font-size: 14px;">Projected Revenue</div>
        <div style="font-size: 24px; font-weight: 600; color: #059669;">
          ${formatPriceRange(roi.projectedRevenueMin, roi.projectedRevenueMax, currency)}
        </div>
        <div style="color: #9ca3af; font-size: 12px;">per year</div>
      </div>
      <div>
        <div style="color: #6b7280; font-size: 14px;">Estimated ROI</div>
        <div style="font-size: 24px; font-weight: 600; color: #059669;">
          ${roi.roiMin}% - ${roi.roiMax}%
        </div>
        <div style="color: #9ca3af; font-size: 12px;">
          Payback: ${roi.paybackMonthsMin}-${roi.paybackMonthsMax} months
        </div>
      </div>
    </div>
  `;
}

// =============================================================================
// Main Export Functions
// =============================================================================

/**
 * Generate HTML export of quote
 */
export function generateQuoteHtml(
  quote: Quote,
  options: QuoteExportOptions = {
    format: 'html',
    includeAnalysis: true,
    includeKpiProjections: true,
    includeRoi: true,
    includeTerms: true,
  }
): string {
  // Set currency for this export if provided
  const currency = options.currency || defaultCurrency;
  const primaryColor = options.brandingOptions?.primaryColor || '#2563eb';
  const companyName = options.brandingOptions?.companyName || 'SEO Services';

  // Local formatters using the export currency
  const fmtCurrency = (amount: number) => formatCurrency(amount, currency);
  const fmtRange = (min: number, max: number) => formatPriceRange(min, max, currency);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SEO Quote - ${quote.clientCompany || quote.clientDomain}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111827; line-height: 1.6; }
    .container { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid ${primaryColor}; }
    .section { margin-bottom: 32px; }
    .section-title { font-size: 18px; font-weight: 600; color: #374151; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; }
    .total-row { font-size: 20px; font-weight: 700; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      ${options.brandingOptions?.logoUrl ? `<img src="${options.brandingOptions.logoUrl}" alt="${companyName}" style="max-height: 60px; margin-bottom: 16px;">` : ''}
      <h1 style="font-size: 28px; color: ${primaryColor}; margin-bottom: 8px;">SEO Service Proposal</h1>
      <p style="color: #6b7280;">Quote #${quote.id.slice(0, 8).toUpperCase()}</p>
    </div>

    <!-- Client Info -->
    <div class="section">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px;">
        <div>
          <h3 style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">PREPARED FOR</h3>
          <div style="font-size: 18px; font-weight: 600;">${quote.clientCompany || quote.clientName}</div>
          ${quote.clientName && quote.clientCompany ? `<div>${quote.clientName}</div>` : ''}
          ${quote.clientEmail ? `<div>${quote.clientEmail}</div>` : ''}
          ${quote.clientDomain ? `<div style="color: ${primaryColor};">${quote.clientDomain}</div>` : ''}
        </div>
        <div style="text-align: right;">
          <h3 style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">QUOTE DETAILS</h3>
          <div>Date: ${formatDate(quote.createdAt)}</div>
          <div>Valid Until: ${formatDate(quote.validUntil)}</div>
          <div>Version: ${quote.version}</div>
        </div>
      </div>
    </div>

    ${
      options.includeAnalysis && quote.analysisData
        ? `
    <!-- Analysis Summary -->
    <div class="section">
      <h2 class="section-title">Website Analysis Summary</h2>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;">
        <div style="background: #f9fafb; padding: 16px; border-radius: 8px; text-align: center;">
          <div style="font-size: 28px; font-weight: 700; color: ${primaryColor};">${quote.analysisData.crawlData.pageCount}</div>
          <div style="color: #6b7280; font-size: 14px;">Pages</div>
        </div>
        <div style="background: #f9fafb; padding: 16px; border-radius: 8px; text-align: center;">
          <div style="font-size: 28px; font-weight: 700; color: ${primaryColor};">${quote.analysisData.serpData.visibilityScore}%</div>
          <div style="color: #6b7280; font-size: 14px;">Visibility</div>
        </div>
        <div style="background: #f9fafb; padding: 16px; border-radius: 8px; text-align: center;">
          <div style="font-size: 28px; font-weight: 700; color: ${primaryColor};">${quote.analysisData.serpData.keywordsRanking}</div>
          <div style="color: #6b7280; font-size: 14px;">Keywords</div>
        </div>
        <div style="background: #f9fafb; padding: 16px; border-radius: 8px; text-align: center;">
          <div style="font-size: 28px; font-weight: 700; color: ${
            quote.analysisData.serpData.competitionLevel === 'high' ? '#dc2626' : quote.analysisData.serpData.competitionLevel === 'medium' ? '#d97706' : '#059669'
          };">${quote.analysisData.serpData.competitionLevel.charAt(0).toUpperCase() + quote.analysisData.serpData.competitionLevel.slice(1)}</div>
          <div style="color: #6b7280; font-size: 14px;">Competition</div>
        </div>
      </div>
    </div>
    `
        : ''
    }

    <!-- Services -->
    <div class="section">
      <h2 class="section-title">Proposed Services</h2>
      <table>
        <thead>
          <tr style="border-bottom: 2px solid #e5e7eb;">
            <th style="padding: 12px; text-align: left; color: #6b7280;">Service</th>
            <th style="padding: 12px; text-align: right; color: #6b7280;">Investment</th>
          </tr>
        </thead>
        <tbody>
          ${generateLineItemsHtml(quote.lineItems, currency)}
        </tbody>
      </table>
    </div>

    <!-- Totals -->
    <div class="section" style="background: #f9fafb; padding: 24px; border-radius: 8px;">
      <table>
        ${
          quote.discountPercent > 0
            ? `
        <tr>
          <td style="padding: 8px 0; color: #059669;">Package Discount (${quote.discountPercent}%)</td>
          <td style="padding: 8px 0; text-align: right; color: #059669;">-${fmtCurrency(quote.subtotal * (quote.discountPercent / 100))}</td>
        </tr>
        `
            : ''
        }
        <tr class="total-row">
          <td style="padding: 16px 0; border-top: 2px solid #e5e7eb;">Total Investment</td>
          <td style="padding: 16px 0; border-top: 2px solid #e5e7eb; text-align: right; color: ${primaryColor};">
            ${fmtRange(quote.totalMin, quote.totalMax)}
          </td>
        </tr>
      </table>
    </div>

    ${
      options.includeKpiProjections && quote.kpiProjections.length > 0
        ? `
    <!-- KPI Projections -->
    <div class="section">
      <h2 class="section-title">Projected Outcomes (6-12 Months)</h2>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
        ${generateKpiProjectionsHtml(quote.kpiProjections)}
      </div>
    </div>
    `
        : ''
    }

    ${
      options.includeRoi && quote.roiCalculation
        ? `
    <!-- ROI -->
    <div class="section">
      <h2 class="section-title">Return on Investment</h2>
      <div style="background: #ecfdf5; padding: 24px; border-radius: 8px; border: 1px solid #a7f3d0;">
        ${generateRoiHtml(quote.roiCalculation, currency)}
      </div>
    </div>
    `
        : ''
    }

    ${
      options.includeTerms
        ? `
    <!-- Terms -->
    <div class="section footer">
      <h3 style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">Terms & Conditions</h3>
      <ul style="list-style: disc; padding-left: 20px; font-size: 13px;">
        <li>Quote valid for 30 days from date of issue</li>
        <li>50% deposit required to commence work</li>
        <li>Prices are exclusive of applicable taxes</li>
        <li>Monthly recurring services are billed in advance</li>
        <li>Results projections are estimates based on industry benchmarks</li>
      </ul>
    </div>
    `
        : ''
    }

    <div style="text-align: center; margin-top: 40px; color: #9ca3af; font-size: 12px;">
      Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate PDF export (uses browser print)
 */
export async function generateQuotePdf(
  quote: Quote,
  options?: QuoteExportOptions
): Promise<Blob> {
  // Generate HTML
  const html = generateQuoteHtml(quote, { ...options, format: 'pdf' });

  // Create iframe for printing
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  // Write HTML to iframe
  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    throw new Error('Failed to create print document');
  }

  doc.open();
  doc.write(html);
  doc.close();

  // Wait for content to load
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Print to PDF (browser will handle)
  iframe.contentWindow?.print();

  // Cleanup
  document.body.removeChild(iframe);

  // Return empty blob - actual PDF is handled by browser print dialog
  return new Blob([html], { type: 'text/html' });
}

/**
 * Download quote as HTML file
 */
export function downloadQuoteHtml(quote: Quote, options?: QuoteExportOptions): void {
  const html = generateQuoteHtml(quote, options);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `quote-${quote.clientDomain || quote.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Open quote in new window for printing
 */
export function openQuoteForPrint(quote: Quote, options?: QuoteExportOptions): void {
  const html = generateQuoteHtml(quote, options);
  const printWindow = window.open('', '_blank');

  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
