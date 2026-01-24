/**
 * PublicQuoteCalculator - Simplified public-facing quote calculator
 *
 * Allows potential clients to get a quick estimate without authentication.
 * Features:
 * - Package selection only (no custom modules)
 * - Fast/quick analysis mode
 * - No saved quotes
 * - Lead capture for full quote
 */

import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  SiteSize,
  QuestionnaireResponses,
  PrimaryGoal,
  TargetMarket,
  BudgetRange,
} from '../../types/quotation';
import { getActivePackages, getRecommendedPackage, getPackageById } from '../../config/quotation/packages';
import { quickAnalyzeUrl } from '../../services/quotation';
import { useQuotationSettings, QuotationSettingsProvider } from '../../hooks/useQuotationSettings';

type CalculatorStep = 'url' | 'questionnaire' | 'result';

interface LeadInfo {
  name: string;
  email: string;
  company: string;
  phone: string;
}

const PublicQuoteCalculatorContent: React.FC = () => {
  const [step, setStep] = useState<CalculatorStep>('url');
  const [url, setUrl] = useState('');
  const [questionnaire, setQuestionnaire] = useState<Partial<QuestionnaireResponses>>({});
  const [siteSize, setSiteSize] = useState<SiteSize>('small');
  const [leadInfo, setLeadInfo] = useState<LeadInfo>({ name: '', email: '', company: '', phone: '' });
  const [showLeadCapture, setShowLeadCapture] = useState(false);
  const { formatPrice: formatCurrency } = useQuotationSettings();

  const packages = getActivePackages().slice(0, 4); // Show first 4 packages

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    // Quick analysis to determine site size
    const analysis = quickAnalyzeUrl(url);
    setSiteSize(analysis.siteSize);
    setStep('questionnaire');
  };

  const handleQuestionnaireSubmit = () => {
    if (!questionnaire.primaryGoal || !questionnaire.targetMarket || !questionnaire.budgetRange) return;
    setStep('result');
  };

  const recommendedPackage = getRecommendedPackage(
    siteSize,
    questionnaire.targetMarket === 'local'
  );

  const handleGetFullQuote = () => {
    setShowLeadCapture(true);
  };

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Submit lead to CRM/email
    console.log('Lead submitted:', leadInfo);
    alert('Thank you! We will contact you shortly with a detailed quote.');
    setShowLeadCapture(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">SEO Investment Calculator</h1>
          <p className="text-xl text-gray-400">
            Get an instant estimate for your SEO project
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-12">
          {['Website', 'Goals', 'Estimate'].map((label, index) => {
            const stepKeys: CalculatorStep[] = ['url', 'questionnaire', 'result'];
            const isActive = stepKeys.indexOf(step) >= index;
            return (
              <React.Fragment key={label}>
                <div className={`flex items-center ${isActive ? 'text-blue-400' : 'text-gray-600'}`}>
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                      isActive ? 'border-blue-500 bg-blue-500/20' : 'border-gray-700'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <span className="ml-2 font-medium">{label}</span>
                </div>
                {index < 2 && (
                  <div className={`w-16 h-0.5 mx-4 ${isActive ? 'bg-blue-500' : 'bg-gray-700'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step Content */}
        {step === 'url' && (
          <Card className="p-8 max-w-xl mx-auto">
            <form onSubmit={handleUrlSubmit}>
              <label className="block text-lg font-medium text-white mb-4">
                What website do you want to optimize?
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="yourwebsite.com"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              />
              <Button type="submit" className="w-full mt-6" disabled={!url.trim()}>
                Continue
              </Button>
            </form>
          </Card>
        )}

        {step === 'questionnaire' && (
          <div className="space-y-6 max-w-2xl mx-auto">
            {/* Goal */}
            <Card className="p-6">
              <label className="block text-lg font-medium text-white mb-4">
                What's your primary goal?
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'leads' as PrimaryGoal, label: 'Generate Leads', icon: '📋' },
                  { value: 'sales' as PrimaryGoal, label: 'Increase Sales', icon: '💰' },
                  { value: 'brand' as PrimaryGoal, label: 'Build Brand', icon: '⭐' },
                  { value: 'local' as PrimaryGoal, label: 'Local Visibility', icon: '📍' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setQuestionnaire({ ...questionnaire, primaryGoal: option.value })}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      questionnaire.primaryGoal === option.value
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <span className="text-2xl">{option.icon}</span>
                    <div className="mt-2 font-medium text-white">{option.label}</div>
                  </button>
                ))}
              </div>
            </Card>

            {/* Target Market */}
            <Card className="p-6">
              <label className="block text-lg font-medium text-white mb-4">
                Target market scope?
              </label>
              <div className="flex gap-3">
                {[
                  { value: 'local' as TargetMarket, label: 'Local' },
                  { value: 'national' as TargetMarket, label: 'National' },
                  { value: 'international' as TargetMarket, label: 'International' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setQuestionnaire({ ...questionnaire, targetMarket: option.value })}
                    className={`flex-1 p-4 rounded-lg border text-center transition-all ${
                      questionnaire.targetMarket === option.value
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="font-medium text-white">{option.label}</div>
                  </button>
                ))}
              </div>
            </Card>

            {/* Budget */}
            <Card className="p-6">
              <label className="block text-lg font-medium text-white mb-4">
                Monthly budget range?
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'under_1000' as BudgetRange, label: 'Under $1K' },
                  { value: '1000_2500' as BudgetRange, label: '$1K - $2.5K' },
                  { value: '2500_5000' as BudgetRange, label: '$2.5K - $5K' },
                  { value: '5000_10000' as BudgetRange, label: '$5K - $10K' },
                  { value: '10000_25000' as BudgetRange, label: '$10K - $25K' },
                  { value: 'over_25000' as BudgetRange, label: 'Over $25K' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setQuestionnaire({ ...questionnaire, budgetRange: option.value })}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      questionnaire.budgetRange === option.value
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="text-sm text-white">{option.label}</div>
                  </button>
                ))}
              </div>
            </Card>

            <Button
              className="w-full"
              onClick={handleQuestionnaireSubmit}
              disabled={!questionnaire.primaryGoal || !questionnaire.targetMarket || !questionnaire.budgetRange}
            >
              See Estimates
            </Button>
          </div>
        )}

        {step === 'result' && (
          <div className="space-y-8">
            {/* Recommended Package */}
            {recommendedPackage && (
              <Card className="p-8 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30">
                <div className="text-center">
                  <span className="inline-block px-3 py-1 bg-blue-500 text-white text-sm font-medium rounded-full mb-4">
                    Recommended for You
                  </span>
                  <h2 className="text-3xl font-bold text-white mb-2">{recommendedPackage.name}</h2>
                  <p className="text-gray-400 mb-6">{recommendedPackage.description}</p>
                  <div className="text-5xl font-bold text-white mb-2">
                    {formatCurrency(recommendedPackage.basePrice)}
                  </div>
                  <p className="text-gray-400 mb-6">Starting price</p>
                  <Button className="px-8 py-3 text-lg" onClick={handleGetFullQuote}>
                    Get Detailed Quote
                  </Button>
                </div>
              </Card>
            )}

            {/* Other Packages */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Other Options</h3>
              <div className="grid grid-cols-2 gap-4">
                {packages
                  .filter((pkg) => pkg.id !== recommendedPackage?.id)
                  .slice(0, 3)
                  .map((pkg) => (
                    <Card key={pkg.id} className="p-6">
                      <h4 className="font-semibold text-white">{pkg.name}</h4>
                      <p className="text-sm text-gray-400 mt-1 mb-4">{pkg.description}</p>
                      <div className="text-2xl font-bold text-white">{formatCurrency(pkg.basePrice)}</div>
                    </Card>
                  ))}
              </div>
            </div>

            {/* Disclaimer */}
            <p className="text-center text-gray-500 text-sm">
              These are estimated starting prices. Final pricing depends on site complexity,
              competition level, and specific requirements.
            </p>

            {/* Start Over */}
            <div className="text-center">
              <button
                onClick={() => {
                  setStep('url');
                  setUrl('');
                  setQuestionnaire({});
                }}
                className="text-gray-400 hover:text-white underline"
              >
                Start Over
              </button>
            </div>
          </div>
        )}

        {/* Lead Capture Modal */}
        {showLeadCapture && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <Card className="p-8 max-w-md w-full">
              <h3 className="text-xl font-bold text-white mb-2">Get Your Detailed Quote</h3>
              <p className="text-gray-400 mb-6">
                Enter your details and we'll send you a comprehensive proposal
              </p>
              <form onSubmit={handleLeadSubmit} className="space-y-4">
                <input
                  type="text"
                  placeholder="Name"
                  value={leadInfo.name}
                  onChange={(e) => setLeadInfo({ ...leadInfo, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={leadInfo.email}
                  onChange={(e) => setLeadInfo({ ...leadInfo, email: e.target.value })}
                  required
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
                <input
                  type="text"
                  placeholder="Company"
                  value={leadInfo.company}
                  onChange={(e) => setLeadInfo({ ...leadInfo, company: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
                <input
                  type="tel"
                  placeholder="Phone (optional)"
                  value={leadInfo.phone}
                  onChange={(e) => setLeadInfo({ ...leadInfo, phone: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowLeadCapture(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1">
                    Send Me a Quote
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

// Wrapper component with provider
export const PublicQuoteCalculator: React.FC = () => {
  return (
    <QuotationSettingsProvider>
      <PublicQuoteCalculatorContent />
    </QuotationSettingsProvider>
  );
};

export default PublicQuoteCalculator;
