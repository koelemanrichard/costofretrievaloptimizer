/**
 * QuestionnaireStep - Gather client goals and budget
 *
 * 4 key questions to understand client needs.
 */

import React from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import {
  QuestionnaireResponses,
  PrimaryGoal,
  TargetMarket,
  BudgetRange,
} from '../../../types/quotation';
import { useQuotationSettings } from '../../../hooks/useQuotationSettings';

interface QuestionnaireStepProps {
  responses: Partial<QuestionnaireResponses>;
  onResponseChange: <K extends keyof QuestionnaireResponses>(
    key: K,
    value: QuestionnaireResponses[K]
  ) => void;
  onContinue: () => void;
  onBack: () => void;
}

const goalOptions: { value: PrimaryGoal; label: string; description: string; icon: string }[] = [
  { value: 'leads', label: 'Generate Leads', description: 'More form submissions and inquiries', icon: '📋' },
  { value: 'sales', label: 'Increase Sales', description: 'Drive e-commerce revenue', icon: '💰' },
  { value: 'brand', label: 'Build Brand', description: 'Increase visibility and awareness', icon: '⭐' },
  { value: 'local', label: 'Local Dominance', description: 'Rank in local search results', icon: '📍' },
];

const marketOptions: { value: TargetMarket; label: string; description: string }[] = [
  { value: 'local', label: 'Local', description: 'City or regional focus' },
  { value: 'national', label: 'National', description: 'Country-wide targeting' },
  { value: 'international', label: 'International', description: 'Multiple countries/languages' },
];

// Budget ranges - values will be formatted with the user's currency
const budgetRanges: { value: BudgetRange; label: string; minValue: number; maxValue: number | null }[] = [
  { value: 'under_1000', label: 'Starter', minValue: 0, maxValue: 1000 },
  { value: '1000_2500', label: 'Growth', minValue: 1000, maxValue: 2500 },
  { value: '2500_5000', label: 'Professional', minValue: 2500, maxValue: 5000 },
  { value: '5000_10000', label: 'Business', minValue: 5000, maxValue: 10000 },
  { value: '10000_25000', label: 'Enterprise', minValue: 10000, maxValue: 25000 },
  { value: 'over_25000', label: 'Custom', minValue: 25000, maxValue: null },
];

export const QuestionnaireStep: React.FC<QuestionnaireStepProps> = ({
  responses,
  onResponseChange,
  onContinue,
  onBack,
}) => {
  const { formatPrice, currencyInfo, currency } = useQuotationSettings();
  const currencySymbol = currencyInfo[currency]?.symbol || '€';

  // Format budget options with current currency
  const budgetOptions = budgetRanges.map((range) => ({
    value: range.value,
    label: range.label,
    range: range.maxValue === null
      ? `Over ${formatPrice(range.minValue)}/mo`
      : range.minValue === 0
        ? `Under ${formatPrice(range.maxValue)}/mo`
        : `${formatPrice(range.minValue)} - ${formatPrice(range.maxValue)}/mo`,
  }));

  const isComplete =
    responses.primaryGoal && responses.targetMarket && responses.budgetRange;

  return (
    <div className="space-y-8">
      {/* Question 1: Primary Goal */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-2">What's your primary SEO goal?</h3>
        <p className="text-gray-400 text-sm mb-4">This helps us prioritize the right services</p>

        <div className="grid grid-cols-2 gap-4">
          {goalOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onResponseChange('primaryGoal', option.value)}
              className={`p-4 rounded-lg border text-left transition-all ${
                responses.primaryGoal === option.value
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
              }`}
            >
              <span className="text-2xl">{option.icon}</span>
              <div className="mt-2 font-medium text-white">{option.label}</div>
              <div className="text-sm text-gray-400">{option.description}</div>
            </button>
          ))}
        </div>
      </Card>

      {/* Question 2: Target Market */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-2">What's your target market?</h3>
        <p className="text-gray-400 text-sm mb-4">Geographic scope affects strategy complexity</p>

        <div className="flex gap-4">
          {marketOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onResponseChange('targetMarket', option.value)}
              className={`flex-1 p-4 rounded-lg border text-center transition-all ${
                responses.targetMarket === option.value
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
              }`}
            >
              <div className="font-medium text-white">{option.label}</div>
              <div className="text-sm text-gray-400 mt-1">{option.description}</div>
            </button>
          ))}
        </div>
      </Card>

      {/* Question 3: Budget Range */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-2">What's your monthly SEO budget?</h3>
        <p className="text-gray-400 text-sm mb-4">We'll recommend packages within your range</p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {budgetOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onResponseChange('budgetRange', option.value)}
              className={`p-4 rounded-lg border text-center transition-all ${
                responses.budgetRange === option.value
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
              }`}
            >
              <div className="font-medium text-white">{option.label}</div>
              <div className="text-sm text-gray-400 mt-1">{option.range}</div>
            </button>
          ))}
        </div>
      </Card>

      {/* Question 4: Customer Value (Optional) */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-2">
          What's your average customer value?
          <span className="text-gray-500 text-sm font-normal ml-2">(Optional)</span>
        </h3>
        <p className="text-gray-400 text-sm mb-4">Used to calculate ROI projections</p>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{currencySymbol}</span>
            <input
              type="number"
              value={responses.customerValue || ''}
              onChange={(e) =>
                onResponseChange('customerValue', e.target.value ? Number(e.target.value) : undefined)
              }
              placeholder="5000"
              className="w-full pl-8 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <span className="text-gray-400">per customer</span>
        </div>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Button>
        <Button onClick={onContinue} disabled={!isComplete}>
          Continue to Packages
          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Button>
      </div>
    </div>
  );
};
