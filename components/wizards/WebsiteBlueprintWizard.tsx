
// components/wizards/WebsiteBlueprintWizard.tsx
// Website Blueprint Wizard - Pre-generation wizard for foundation pages and navigation

import React, { useState, useCallback } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import { InfoTooltip } from '../ui/InfoTooltip';
import { NAPData, FoundationPageType, BusinessInfo, SEOPillars } from '../../types';
import { BlueprintTemplate, BLUEPRINT_TEMPLATES } from '../../config/blueprintTemplates';

interface BlueprintConfig {
  napData: NAPData;
  selectedPages: FoundationPageType[];
  templateId?: string;
  navigationPreferences: {
    maxHeaderLinks: number;
    dynamicBySection: boolean;
    includeCTA: boolean;
    footerColumns: number;
  };
}

interface WebsiteBlueprintWizardProps {
  businessInfo: BusinessInfo;
  pillars?: SEOPillars;
  existingNAPData?: NAPData;
  isLoading?: boolean;
  onComplete: (config: BlueprintConfig) => void;
  onSkip: () => void;
  onBack: () => void;
}

type WizardStep = 'nap' | 'pages' | 'navigation';

const FOUNDATION_PAGE_OPTIONS: { type: FoundationPageType; label: string; description: string; recommended: boolean }[] = [
  { type: 'homepage', label: 'Homepage', description: 'Your main landing page with brand overview', recommended: true },
  { type: 'about', label: 'About Us', description: 'Company story, team, expertise (E-E-A-T)', recommended: true },
  { type: 'contact', label: 'Contact', description: 'Contact form, NAP data, location', recommended: true },
  { type: 'privacy', label: 'Privacy Policy', description: 'GDPR/CCPA compliance page', recommended: true },
  { type: 'terms', label: 'Terms of Service', description: 'Legal terms and conditions', recommended: true },
  { type: 'author', label: 'Author/Team', description: 'Individual author pages for E-E-A-T', recommended: false },
];

const DEFAULT_NAP: NAPData = {
  company_name: '',
  address: '',
  phone: '',
  email: '',
  founded_year: '',
};

const DEFAULT_NAV_PREFERENCES = {
  maxHeaderLinks: 7,
  dynamicBySection: true,
  includeCTA: true,
  footerColumns: 3,
};

// Define steps outside component to avoid recreation on every render
const WIZARD_STEPS: WizardStep[] = ['nap', 'pages', 'navigation'];

export const WebsiteBlueprintWizard: React.FC<WebsiteBlueprintWizardProps> = ({
  businessInfo,
  pillars,
  existingNAPData,
  isLoading = false,
  onComplete,
  onSkip,
  onBack,
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('nap');
  const [napData, setNAPData] = useState<NAPData>(existingNAPData || {
    ...DEFAULT_NAP,
    company_name: businessInfo.domain?.replace(/\.(com|nl|org|net|co\.uk)$/i, '').replace(/-/g, ' ') || '',
    email: businessInfo.domain ? `info@${businessInfo.domain}` : '',
  });
  const [selectedPages, setSelectedPages] = useState<FoundationPageType[]>(['homepage', 'about', 'contact', 'privacy', 'terms']);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>();
  const [navPreferences, setNavPreferences] = useState(DEFAULT_NAV_PREFERENCES);

  const currentStepIndex = WIZARD_STEPS.indexOf(currentStep);

  const handleNext = useCallback(() => {
    try {
      const nextIndex = currentStepIndex + 1;
      console.log('handleNext called, currentStepIndex:', currentStepIndex, 'nextIndex:', nextIndex, 'WIZARD_STEPS.length:', WIZARD_STEPS.length);
      if (nextIndex < WIZARD_STEPS.length) {
        setCurrentStep(WIZARD_STEPS[nextIndex]);
      } else {
        // Complete wizard
        const config = {
          napData,
          selectedPages,
          templateId: selectedTemplateId,
          navigationPreferences: navPreferences,
        };
        console.log('Calling onComplete with config:', config);
        console.log('onComplete function exists:', typeof onComplete === 'function');
        if (typeof onComplete === 'function') {
          onComplete(config);
        } else {
          console.error('onComplete is not a function!', onComplete);
        }
      }
    } catch (error) {
      console.error('Error in handleNext:', error);
    }
  }, [currentStepIndex, napData, selectedPages, selectedTemplateId, navPreferences, onComplete]);

  const handleBack = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(WIZARD_STEPS[prevIndex]);
    } else {
      onBack();
    }
  }, [currentStepIndex, onBack]);

  const handlePageToggle = useCallback((pageType: FoundationPageType) => {
    setSelectedPages(prev =>
      prev.includes(pageType)
        ? prev.filter(p => p !== pageType)
        : [...prev, pageType]
    );
  }, []);

  const handleTemplateSelect = useCallback((template: BlueprintTemplate) => {
    setSelectedTemplateId(template.id);
    setSelectedPages(template.defaultPages);
    if (template.navigationDefaults) {
      setNavPreferences(prev => ({
        ...prev,
        ...template.navigationDefaults,
      }));
    }
  }, []);

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {WIZARD_STEPS.map((step, index) => (
        <React.Fragment key={step}>
          <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
            index <= currentStepIndex
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'border-gray-600 text-gray-500'
          }`}>
            {index + 1}
          </div>
          {index < WIZARD_STEPS.length - 1 && (
            <div className={`w-16 h-0.5 ${
              index < currentStepIndex ? 'bg-blue-600' : 'bg-gray-600'
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const handleNAPChange = useCallback((field: keyof NAPData, value: string) => {
    setNAPData(prev => ({ ...prev, [field]: value }));
  }, []);

  const renderNAPStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Business Information</h2>
        <p className="text-gray-400">
          Enter your NAP (Name, Address, Phone) data for consistent E-E-A-T signals across your website.
        </p>
      </div>

      <div className="space-y-4">
        {/* Company Name */}
        <div>
          <label className="block text-sm font-medium text-white mb-1">
            Company Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={napData.company_name}
            onChange={e => handleNAPChange('company_name', e.target.value)}
            placeholder="Your Company Name"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-white mb-1">
            Business Address
          </label>
          <input
            type="text"
            value={napData.address}
            onChange={e => handleNAPChange('address', e.target.value)}
            placeholder="123 Main St, City, Country"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">Full address for NAP consistency (E-A-T)</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-white mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={napData.phone}
              onChange={e => handleNAPChange('phone', e.target.value)}
              placeholder="+1 (555) 123-4567"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-white mb-1">
              Contact Email
            </label>
            <input
              type="email"
              value={napData.email}
              onChange={e => handleNAPChange('email', e.target.value)}
              placeholder="info@yourcompany.com"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Founded Year */}
        <div>
          <label className="block text-sm font-medium text-white mb-1">
            Founded Year
          </label>
          <input
            type="text"
            value={napData.founded_year || ''}
            onChange={e => handleNAPChange('founded_year', e.target.value)}
            placeholder="e.g., 2010"
            maxLength={4}
            className="w-full max-w-32 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">Year the company was founded (for E-E-A-T credibility)</p>
        </div>
      </div>

      <Card className="p-4 bg-blue-900/20 border-blue-700">
        <div className="flex items-start gap-3">
          <span className="text-blue-400 text-xl">💡</span>
          <div>
            <p className="text-sm text-blue-300 font-medium">Why is this important?</p>
            <p className="text-sm text-blue-200/70 mt-1">
              Consistent NAP data across all pages improves local SEO and establishes trust with search engines.
              This data will be automatically included in your Contact page, footer, and Schema markup.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderPagesStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Foundation Pages</h2>
        <p className="text-gray-400">
          Select which foundation pages to include. These establish trust, authority, and legal compliance.
        </p>
      </div>

      {/* Template Selection */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          Industry Templates
          <InfoTooltip text="Pre-configured page selections based on your industry type" />
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {BLUEPRINT_TEMPLATES.map(template => (
            <button
              key={template.id}
              onClick={() => handleTemplateSelect(template)}
              className={`p-3 rounded-lg border text-left transition-colors ${
                selectedTemplateId === template.id
                  ? 'bg-blue-600/20 border-blue-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
              }`}
            >
              <div className="text-lg mb-1">{template.icon}</div>
              <div className="font-medium text-sm">{template.name}</div>
              <div className="text-xs text-gray-400 mt-1">{template.defaultPages.length} pages</div>
            </button>
          ))}
        </div>
      </div>

      {/* Page Selection */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Selected Pages</h3>
        <div className="space-y-2">
          {FOUNDATION_PAGE_OPTIONS.map(option => (
            <label
              key={option.type}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedPages.includes(option.type)
                  ? 'bg-green-900/20 border-green-600'
                  : 'bg-gray-800 border-gray-700 hover:border-gray-500'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedPages.includes(option.type)}
                onChange={() => handlePageToggle(option.type)}
                className="w-5 h-5 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{option.label}</span>
                  {option.recommended && (
                    <span className="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded">Recommended</span>
                  )}
                </div>
                <p className="text-sm text-gray-400">{option.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {selectedPages.length === 0 && (
        <Card className="p-4 bg-yellow-900/20 border-yellow-700">
          <p className="text-sm text-yellow-300">
            <span className="font-bold">Warning:</span> No foundation pages selected.
            Your website will lack essential E-E-A-T signals and legal pages.
          </p>
        </Card>
      )}
    </div>
  );

  const renderNavigationStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Navigation Preferences</h2>
        <p className="text-gray-400">
          Configure your website navigation structure. These settings follow SEO best practices.
        </p>
      </div>

      <div className="space-y-6">
        {/* Max Header Links */}
        <div>
          <label className="flex items-center gap-2 text-white font-medium mb-2">
            Maximum Header Links
            <InfoTooltip text="Holistic SEO recommends 7-10 links in the main navigation to maintain focus and link equity" />
          </label>
          <input
            type="range"
            min={3}
            max={15}
            value={navPreferences.maxHeaderLinks}
            onChange={e => setNavPreferences(prev => ({ ...prev, maxHeaderLinks: parseInt(e.target.value) }))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-sm text-gray-400 mt-1">
            <span>3</span>
            <span className="text-blue-400 font-medium">{navPreferences.maxHeaderLinks} links</span>
            <span>15</span>
          </div>
        </div>

        {/* Footer Columns */}
        <div>
          <label className="flex items-center gap-2 text-white font-medium mb-2">
            Footer Columns
            <InfoTooltip text="Number of link sections in your footer. More columns = more organized link structure" />
          </label>
          <div className="flex gap-2">
            {[2, 3, 4, 5].map(num => (
              <button
                key={num}
                onClick={() => setNavPreferences(prev => ({ ...prev, footerColumns: num }))}
                className={`flex-1 py-2 px-4 rounded border ${
                  navPreferences.footerColumns === num
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Navigation */}
        <label className="flex items-center gap-3 p-4 rounded-lg border border-gray-700 bg-gray-800 cursor-pointer">
          <input
            type="checkbox"
            checked={navPreferences.dynamicBySection}
            onChange={e => setNavPreferences(prev => ({ ...prev, dynamicBySection: e.target.checked }))}
            className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
          />
          <div>
            <span className="font-medium text-white">Dynamic Navigation by Section</span>
            <p className="text-sm text-gray-400">
              Show different navigation items based on the current page section (e.g., show service-related links on service pages)
            </p>
          </div>
        </label>

        {/* CTA Button */}
        <label className="flex items-center gap-3 p-4 rounded-lg border border-gray-700 bg-gray-800 cursor-pointer">
          <input
            type="checkbox"
            checked={navPreferences.includeCTA}
            onChange={e => setNavPreferences(prev => ({ ...prev, includeCTA: e.target.checked }))}
            className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
          />
          <div>
            <span className="font-medium text-white">Include CTA Button</span>
            <p className="text-sm text-gray-400">
              Add a prominent call-to-action button in the header (e.g., "Contact Us", "Get Started")
            </p>
          </div>
        </label>
      </div>

      {/* Summary */}
      <Card className="p-4 bg-gray-800/50">
        <h3 className="text-white font-medium mb-3">Configuration Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Foundation Pages:</span>
            <span className="text-white ml-2">{selectedPages.length}</span>
          </div>
          <div>
            <span className="text-gray-400">Header Links:</span>
            <span className="text-white ml-2">Max {navPreferences.maxHeaderLinks}</span>
          </div>
          <div>
            <span className="text-gray-400">Footer Columns:</span>
            <span className="text-white ml-2">{navPreferences.footerColumns}</span>
          </div>
          <div>
            <span className="text-gray-400">NAP Data:</span>
            <span className={`ml-2 ${napData.company_name ? 'text-green-400' : 'text-yellow-400'}`}>
              {napData.company_name ? 'Configured' : 'Incomplete'}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );

  return (
    <Card className="max-w-2xl mx-auto p-6">
      {renderStepIndicator()}

      {currentStep === 'nap' && renderNAPStep()}
      {currentStep === 'pages' && renderPagesStep()}
      {currentStep === 'navigation' && renderNavigationStep()}

      <div className="flex justify-between mt-8 pt-6 border-t border-gray-700">
        <Button variant="secondary" onClick={handleBack} disabled={isLoading}>
          {currentStepIndex === 0 ? 'Back to Previous Step' : 'Back'}
        </Button>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onSkip} disabled={isLoading}>
            Skip Blueprint
          </Button>
          <Button onClick={handleNext} disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader className="w-4 h-4" />
                Generating Map...
              </span>
            ) : (
              currentStepIndex === WIZARD_STEPS.length - 1 ? 'Complete & Generate' : 'Next'
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export type { BlueprintConfig };
export default WebsiteBlueprintWizard;
