/**
 * QuoteStep - Final quote preview and actions
 */

import React, { useState } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import {
  Quote,
  QuoteLineItem,
  KpiProjection,
  RoiCalculation,
  QuotationWizardState,
} from '../../../types/quotation';
import { QuoteTotalResult, openQuoteForPrint, downloadQuoteHtml } from '../../../services/quotation';
import { getPackageById } from '../../../config/quotation/packages';
import { CATEGORY_INFO } from '../../../config/quotation/modules';
import { useQuotationSettings } from '../../../hooks/useQuotationSettings';

interface QuoteStepProps {
  wizardState: QuotationWizardState;
  lineItems: QuoteLineItem[];
  quoteTotal: QuoteTotalResult | null;
  kpiProjections: KpiProjection[];
  roiCalculation: RoiCalculation | null;
  clientInfo: QuotationWizardState['clientInfo'];
  onClientInfoChange: (info: Partial<QuotationWizardState['clientInfo']>) => void;
  onGenerateQuote: () => Quote | null;
  onBack: () => void;
  onStartOver: () => void;
}

export const QuoteStep: React.FC<QuoteStepProps> = ({
  wizardState,
  lineItems,
  quoteTotal,
  kpiProjections,
  roiCalculation,
  clientInfo,
  onClientInfoChange,
  onGenerateQuote,
  onBack,
  onStartOver,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [savedQuote, setSavedQuote] = useState<Quote | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const { formatPrice, formatPriceRange, currency } = useQuotationSettings();

  const pkg = wizardState.selectedPackageId
    ? getPackageById(wizardState.selectedPackageId)
    : null;

  // Group line items by category
  const itemsByCategory = lineItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, QuoteLineItem[]>);

  const handleSaveQuote = async () => {
    setIsSaving(true);
    setExportSuccess(null);
    try {
      const quote = onGenerateQuote();
      if (quote) {
        setSavedQuote(quote);
        // Download as HTML file (can be opened in browser and printed as PDF)
        downloadQuoteHtml(quote, { currency, includeAnalysis: true, includeKpiProjections: true, includeRoi: true, includeTerms: true });
        setExportSuccess('Quote saved as HTML file');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    setExportSuccess(null);
    try {
      const quote = onGenerateQuote();
      if (quote) {
        // Open in new window for printing to PDF
        openQuoteForPrint(quote, { currency, includeAnalysis: true, includeKpiProjections: true, includeRoi: true, includeTerms: true });
        setExportSuccess('Quote opened for print/PDF');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleEmailQuote = () => {
    const quote = onGenerateQuote();
    if (!quote) return;

    const subject = encodeURIComponent(`SEO Service Quote for ${quote.clientCompany || quote.clientDomain}`);
    const domain = quote.clientDomain || 'your website';
    const totalRange = quoteTotal ? `${formatPriceRange(quoteTotal.totalMin, quoteTotal.totalMax)}` : 'See attached';

    const body = encodeURIComponent(
`Dear ${clientInfo.name || 'Client'},

Thank you for your interest in our SEO services. Please find below a summary of your customized quote:

Website: ${domain}
Total Investment: ${totalRange}

${pkg ? `Selected Package: ${pkg.name}
${pkg.description}` : 'Custom Service Selection'}

Services Include:
${lineItems.slice(0, 5).map(item => `- ${item.moduleName}`).join('\n')}
${lineItems.length > 5 ? `... and ${lineItems.length - 5} more services` : ''}

To view the full quote with detailed breakdown, please visit our portal or reply to this email.

Best regards,
SEO Services Team`
    );

    window.open(`mailto:${clientInfo.email || ''}?subject=${subject}&body=${body}`, '_blank');
    setExportSuccess('Email draft opened');
  };

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Main Quote Content - Left 2 columns */}
      <div className="col-span-2 space-y-6">
        {/* Client Info */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Client Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Client Name</label>
              <input
                type="text"
                value={clientInfo.name}
                onChange={(e) => onClientInfoChange({ name: e.target.value })}
                placeholder="Contact name"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input
                type="email"
                value={clientInfo.email}
                onChange={(e) => onClientInfoChange({ email: e.target.value })}
                placeholder="email@example.com"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-gray-400 mb-1">Company</label>
              <input
                type="text"
                value={clientInfo.company}
                onChange={(e) => onClientInfoChange({ company: e.target.value })}
                placeholder="Company name"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              />
            </div>
          </div>
        </Card>

        {/* Package Info */}
        {pkg && (
          <Card className="p-6 bg-blue-500/5 border-blue-500/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-blue-400 mb-1">Selected Package</div>
                <h3 className="text-xl font-bold text-white">{pkg.name}</h3>
                <p className="text-gray-400 text-sm mt-1">{pkg.description}</p>
              </div>
              {pkg.discountPercent > 0 && (
                <div className="bg-green-500/20 text-green-400 px-4 py-2 rounded-lg">
                  {pkg.discountPercent}% Discount
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Line Items */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Service Breakdown</h3>
          <div className="space-y-6">
            {Object.entries(itemsByCategory).map(([category, items]) => (
              <div key={category}>
                <h4 className="text-sm font-medium text-gray-400 mb-2">
                  {CATEGORY_INFO[category as keyof typeof CATEGORY_INFO]?.name || category}
                </h4>
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.moduleId}
                      className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0"
                    >
                      <div>
                        <div className="text-white">{item.moduleName}</div>
                        {item.isRecurring && (
                          <span className="text-xs text-purple-400">{item.recurringInterval}</span>
                        )}
                      </div>
                      <div className="text-gray-300">
                        {formatPriceRange(item.totalMin, item.totalMax)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* KPI Projections */}
        {kpiProjections.length > 0 && (
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Projected Outcomes</h3>
              <span className="text-xs text-blue-400 bg-blue-400/10 px-2 py-1 rounded">
                Industry-based estimates
              </span>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Estimated results within 6-12 months based on selected services and industry benchmarks
            </p>
            <div className="grid grid-cols-2 gap-4">
              {kpiProjections.slice(0, 4).map((projection) => (
                <div key={projection.metric} className="bg-gray-800/50 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">{projection.label}</div>
                  <div className="text-xl font-bold text-white">
                    +{projection.projectedMin} - {projection.projectedMax}
                    {projection.unit && <span className="text-sm ml-1">{projection.unit}</span>}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {Math.round(projection.confidence * 100)}% confidence • {projection.timeframeMonths}mo
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ROI Calculator */}
        {roiCalculation && (
          <Card className={`p-6 ${roiCalculation.roiMin >= 0 ? 'bg-green-500/5 border-green-500/20' : 'bg-yellow-500/5 border-yellow-500/20'}`}>
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">ROI Projection</h3>
              <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded">
                Estimates based on provided data
              </span>
            </div>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <div className="text-sm text-gray-400">Projected Additional Leads</div>
                <div className="text-2xl font-bold text-white">
                  {roiCalculation.projectedAdditionalLeadsMin} - {roiCalculation.projectedAdditionalLeadsMax}
                </div>
                <div className="text-xs text-gray-500">per month</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Projected Revenue</div>
                <div className={`text-2xl font-bold ${roiCalculation.projectedRevenueMin > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                  {formatPriceRange(roiCalculation.projectedRevenueMin, roiCalculation.projectedRevenueMax)}
                </div>
                <div className="text-xs text-gray-500">per year</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Estimated ROI</div>
                <div className={`text-2xl font-bold ${roiCalculation.roiMin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {roiCalculation.roiMin}% - {roiCalculation.roiMax}%
                </div>
                <div className="text-xs text-gray-500">
                  Payback: {roiCalculation.paybackMonthsMin >= 36 ? '36+' : roiCalculation.paybackMonthsMin}-{roiCalculation.paybackMonthsMax >= 36 ? '36+' : roiCalculation.paybackMonthsMax} months
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4 italic">
              * ROI projections are estimates based on industry averages and your provided customer value. Actual results may vary.
            </p>
          </Card>
        )}
      </div>

      {/* Summary Sidebar - Right column */}
      <div className="space-y-4">
        <Card className="p-6 sticky top-4">
          <h3 className="text-lg font-semibold text-white mb-4">Quote Total</h3>

          {/* Domain */}
          {wizardState.analysisResult && (
            <div className="mb-4 pb-4 border-b border-gray-700">
              <div className="text-sm text-gray-400">Website</div>
              <div className="text-white font-medium">{wizardState.analysisResult.domain}</div>
            </div>
          )}

          {/* Pricing */}
          {quoteTotal && (
            <div className="space-y-3">
              {quoteTotal.oneTimeMin > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">One-time Services</span>
                  <span className="text-white">
                    {formatPriceRange(quoteTotal.oneTimeMin, quoteTotal.oneTimeMax)}
                  </span>
                </div>
              )}
              {quoteTotal.recurringMin > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Monthly Recurring</span>
                  <span className="text-white">
                    {formatPriceRange(quoteTotal.recurringMin, quoteTotal.recurringMax)}
                  </span>
                </div>
              )}
              {quoteTotal.discount > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>Package Discount</span>
                  <span>-{formatPrice(quoteTotal.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold pt-3 border-t border-gray-600">
                <span className="text-white">Total Investment</span>
                <span className="text-blue-400">
                  {formatPriceRange(quoteTotal.totalMin, quoteTotal.totalMax)}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 space-y-3">
            <Button className="w-full" onClick={handleSaveQuote} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Quote'}
            </Button>
            <Button variant="outline" className="w-full" onClick={handleExportPdf} disabled={isExporting}>
              {isExporting ? 'Opening...' : 'Export PDF'}
            </Button>
            <Button variant="outline" className="w-full" onClick={handleEmailQuote}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email Quote
            </Button>
            <Button variant="ghost" className="w-full" onClick={onBack}>
              Edit Selection
            </Button>
          </div>

          {exportSuccess && (
            <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="text-green-400 text-sm font-medium">{exportSuccess}</div>
            </div>
          )}

          {savedQuote && (
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="text-blue-400 text-sm font-medium">Quote generated</div>
              <div className="text-gray-400 text-xs mt-1">ID: {savedQuote.id.slice(0, 8)}...</div>
            </div>
          )}

          {/* Start Over */}
          <button
            onClick={onStartOver}
            className="w-full mt-4 text-sm text-gray-500 hover:text-gray-400"
          >
            Start New Quote
          </button>
        </Card>
      </div>
    </div>
  );
};
