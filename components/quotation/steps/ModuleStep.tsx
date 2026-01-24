/**
 * ModuleStep - Custom module selection
 */

import React, { useState } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import {
  ServiceModule,
  ServiceCategory,
  QuoteLineItem,
} from '../../../types/quotation';
import { CATEGORY_INFO } from '../../../config/quotation/modules';
import { QuoteTotalResult } from '../../../services/quotation';
import { useQuotationSettings } from '../../../hooks/useQuotationSettings';

interface ModuleStepProps {
  availableModules: ServiceModule[];
  selectedModuleIds: string[];
  onToggleModule: (moduleId: string) => void;
  lineItems: QuoteLineItem[];
  quoteTotal: QuoteTotalResult | null;
  onContinue: () => void;
  onBack: () => void;
}

export const ModuleStep: React.FC<ModuleStepProps> = ({
  availableModules,
  selectedModuleIds,
  onToggleModule,
  lineItems,
  quoteTotal,
  onContinue,
  onBack,
}) => {
  const [expandedCategory, setExpandedCategory] = useState<ServiceCategory | null>('semantic_seo');
  const { formatPriceRange: formatPrice } = useQuotationSettings();

  // Group modules by category
  const modulesByCategory = availableModules.reduce((acc, module) => {
    if (!acc[module.category]) {
      acc[module.category] = [];
    }
    acc[module.category].push(module);
    return acc;
  }, {} as Record<ServiceCategory, ServiceModule[]>);

  // Sort categories by display order
  const sortedCategories = Object.keys(modulesByCategory).sort(
    (a, b) => (CATEGORY_INFO[a as ServiceCategory]?.order || 99) - (CATEGORY_INFO[b as ServiceCategory]?.order || 99)
  ) as ServiceCategory[];

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Module Selection - Left 2 columns */}
      <div className="col-span-2 space-y-4">
        <Card className="p-4">
          <h2 className="text-lg font-bold text-white">Select Services</h2>
          <p className="text-gray-400 text-sm">Build your custom package</p>
        </Card>

        {sortedCategories.map((category) => {
          const categoryInfo = CATEGORY_INFO[category];
          const modules = modulesByCategory[category];
          const isExpanded = expandedCategory === category;
          const selectedInCategory = modules.filter((m) =>
            selectedModuleIds.includes(m.id)
          ).length;

          return (
            <Card key={category} className="overflow-hidden">
              {/* Category Header */}
              <button
                className="w-full p-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
                onClick={() => setExpandedCategory(isExpanded ? null : category)}
              >
                <div>
                  <h3 className="font-semibold text-white">{categoryInfo?.name || category}</h3>
                  <p className="text-sm text-gray-400">{categoryInfo?.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  {selectedInCategory > 0 && (
                    <span className="bg-blue-500/20 text-blue-400 text-sm px-2 py-1 rounded">
                      {selectedInCategory} selected
                    </span>
                  )}
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Module List */}
              {isExpanded && (
                <div className="border-t border-gray-700">
                  {modules.map((module) => {
                    const isSelected = selectedModuleIds.includes(module.id);
                    const lineItem = lineItems.find((li) => li.moduleId === module.id);

                    return (
                      <div
                        key={module.id}
                        className={`p-4 border-b border-gray-700 last:border-b-0 cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-500/5' : 'hover:bg-gray-800/30'
                        }`}
                        onClick={() => onToggleModule(module.id)}
                      >
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <div
                            className={`mt-1 w-5 h-5 rounded border flex items-center justify-center ${
                              isSelected
                                ? 'bg-blue-500 border-blue-500'
                                : 'border-gray-600'
                            }`}
                          >
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>

                          {/* Module Info */}
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="font-medium text-white">{module.name}</div>
                              <div className="text-sm text-gray-300">
                                {lineItem
                                  ? formatPrice(lineItem.totalMin, lineItem.totalMax)
                                  : formatPrice(module.basePriceMin, module.basePriceMax)}
                              </div>
                            </div>
                            <p className="text-sm text-gray-400 mt-1">{module.description}</p>

                            {/* Recurring Badge */}
                            {module.isRecurring && (
                              <span className="inline-block mt-2 text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">
                                {module.recurringInterval}
                              </span>
                            )}

                            {/* Deliverables */}
                            {isSelected && module.deliverables.length > 0 && (
                              <ul className="mt-3 space-y-1">
                                {module.deliverables.slice(0, 3).map((d, i) => (
                                  <li key={i} className="text-xs text-gray-500 flex items-center gap-1">
                                    <span className="text-green-500">•</span>
                                    {d}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Summary Sidebar - Right column */}
      <div className="space-y-4">
        <Card className="p-4 sticky top-4">
          <h3 className="font-semibold text-white mb-4">Quote Summary</h3>

          {/* Selected Items */}
          {lineItems.length === 0 ? (
            <p className="text-gray-500 text-sm">No services selected</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
              {lineItems.map((item) => (
                <div key={item.moduleId} className="flex justify-between text-sm">
                  <span className="text-gray-300 truncate pr-2">{item.moduleName}</span>
                  <span className="text-gray-400 whitespace-nowrap">
                    {formatPrice(item.totalMin, item.totalMax)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Totals */}
          {quoteTotal && (
            <div className="border-t border-gray-700 pt-4 space-y-2">
              {quoteTotal.oneTimeMin > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">One-time</span>
                  <span className="text-white">
                    {formatPrice(quoteTotal.oneTimeMin, quoteTotal.oneTimeMax)}
                  </span>
                </div>
              )}
              {quoteTotal.recurringMin > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Monthly recurring</span>
                  <span className="text-white">
                    {formatPrice(quoteTotal.recurringMin, quoteTotal.recurringMax)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-600">
                <span className="text-white">Total</span>
                <span className="text-blue-400">
                  {formatPrice(quoteTotal.totalMin, quoteTotal.totalMax)}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 space-y-3">
            <Button
              className="w-full"
              onClick={onContinue}
              disabled={selectedModuleIds.length === 0}
            >
              Review Quote
            </Button>
            <Button variant="outline" className="w-full" onClick={onBack}>
              Back to Packages
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
