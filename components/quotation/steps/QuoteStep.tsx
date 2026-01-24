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
import { QuoteTotalResult } from '../../../services/quotation';
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
  const [savedQuote, setSavedQuote] = useState<Quote | null>(null);
  const { formatPrice, formatPriceRange } = useQuotationSettings();

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
    try {
      const quote = onGenerateQuote();
      if (quote) {
        setSavedQuote(quote);
        // TODO: Save to database
      }
    } finally {
      setIsSaving(false);
    }
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
            <h3 className="text-lg font-semibold text-white mb-4">Projected Outcomes</h3>
            <p className="text-gray-400 text-sm mb-4">
              Estimated results within 6-12 months based on selected services
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
          <Card className="p-6 bg-green-500/5 border-green-500/20">
            <h3 className="text-lg font-semibold text-white mb-4">ROI Projection</h3>
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
                <div className="text-2xl font-bold text-green-400">
                  {formatPriceRange(roiCalculation.projectedRevenueMin, roiCalculation.projectedRevenueMax)}
                </div>
                <div className="text-xs text-gray-500">per year</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Estimated ROI</div>
                <div className="text-2xl font-bold text-green-400">
                  {roiCalculation.roiMin}% - {roiCalculation.roiMax}%
                </div>
                <div className="text-xs text-gray-500">
                  Payback: {roiCalculation.paybackMonthsMin}-{roiCalculation.paybackMonthsMax} months
                </div>
              </div>
            </div>
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
            <Button variant="outline" className="w-full">
              Export PDF
            </Button>
            <Button variant="ghost" className="w-full" onClick={onBack}>
              Edit Selection
            </Button>
          </div>

          {savedQuote && (
            <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="text-green-400 text-sm font-medium">Quote saved!</div>
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
