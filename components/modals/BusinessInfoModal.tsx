
import React, { useState, useEffect } from 'react';
import { BusinessInfo, EntityIdentity } from '../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import BrandKitEditor from '../BrandKitEditor';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Select } from '../ui/Select';

// Primary attribute options for desired KP subtitle
const PRIMARY_ATTRIBUTE_OPTIONS = [
  'Software Company',
  'Technology Company',
  'Consulting Firm',
  'Marketing Agency',
  'E-commerce Platform',
  'SaaS Provider',
  'Professional Services',
  'Healthcare Provider',
  'Financial Services',
  'Educational Institution',
  'Non-profit Organization',
  'Manufacturing Company',
  'Retail Company',
  'Media Company',
  'Other',
];

// Seed source definitions - expanded for better Knowledge Panel corroboration
type SeedSourceDef =
  | { id: string; name: string; placeholder: string; category: string; isCheckbox?: false }
  | { id: string; name: string; category: string; isCheckbox: true; placeholder?: never };

const SEED_SOURCES: SeedSourceDef[] = [
  // Authority Sources
  { id: 'wikipedia', name: 'Wikipedia', placeholder: 'https://en.wikipedia.org/wiki/...', category: 'Authority' },
  { id: 'wikidata', name: 'Wikidata', placeholder: 'Q12345', category: 'Authority' },
  // Business Sources
  { id: 'crunchbase', name: 'Crunchbase', placeholder: 'https://www.crunchbase.com/organization/...', category: 'Business' },
  { id: 'linkedinCompany', name: 'LinkedIn Company', placeholder: 'https://www.linkedin.com/company/...', category: 'Business' },
  { id: 'googleBusinessProfile', name: 'Google Business Profile', isCheckbox: true, category: 'Business' },
  // Social Sources - key for entity corroboration
  { id: 'youtube', name: 'YouTube Channel', placeholder: 'https://www.youtube.com/@...', category: 'Social' },
  { id: 'twitter', name: 'X (Twitter)', placeholder: 'https://twitter.com/...', category: 'Social' },
  { id: 'facebook', name: 'Facebook Page', placeholder: 'https://www.facebook.com/...', category: 'Social' },
  { id: 'instagram', name: 'Instagram', placeholder: 'https://www.instagram.com/...', category: 'Social' },
  // Developer Sources
  { id: 'github', name: 'GitHub', placeholder: 'https://github.com/...', category: 'Developer' },
];

interface BusinessInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessInfo: BusinessInfo;
  onSave: (updatedInfo: Partial<BusinessInfo>) => Promise<void>;
}

export const BusinessInfoModal: React.FC<BusinessInfoModalProps> = ({
  isOpen,
  onClose,
  businessInfo,
  onSave
}) => {
  const [localInfo, setLocalInfo] = useState<BusinessInfo>(businessInfo);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'identity' | 'brand' | 'api'>('general');

  // Sync with external changes
  useEffect(() => {
    setLocalInfo(businessInfo);
  }, [businessInfo]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(localInfo);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  // Footer content
  const footerContent = (
    <div className="flex justify-end gap-3 w-full">
      <Button variant="secondary" onClick={onClose} disabled={isSaving}>
        Cancel
      </Button>
      <Button onClick={handleSave} disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Business Info"
      description="Configure business details, entity identity, brand kit, and API settings"
      maxWidth="max-w-2xl"
      footer={footerContent}
      className="max-h-[90vh] flex flex-col"
    >
        {/* Tabs */}
        <div className="flex border-b border-gray-700 bg-gray-800 -mx-6 -mt-6 mb-4" role="tablist" aria-label="Business info sections">
          <button
            role="tab"
            id="tab-general"
            aria-selected={activeTab === 'general'}
            aria-controls="panel-general"
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === 'general'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('general')}
          >
            General
          </button>
          <button
            role="tab"
            id="tab-identity"
            aria-selected={activeTab === 'identity'}
            aria-controls="panel-identity"
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === 'identity'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('identity')}
          >
            Entity Identity
          </button>
          <button
            role="tab"
            id="tab-brand"
            aria-selected={activeTab === 'brand'}
            aria-controls="panel-brand"
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === 'brand'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('brand')}
          >
            Brand Kit
          </button>
          <button
            role="tab"
            id="tab-api"
            aria-selected={activeTab === 'api'}
            aria-controls="panel-api"
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === 'api'
                ? 'text-green-400 border-b-2 border-green-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('api')}
          >
            Image APIs
          </button>
        </div>

        <div className="overflow-y-auto flex-grow space-y-4">
          {/* General Tab */}
          {activeTab === 'general' && (
            <div id="panel-general" role="tabpanel" aria-labelledby="tab-general" className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Business Name
                </label>
                <Input
                  value={localInfo.projectName || ''}
                  onChange={(e) => setLocalInfo(prev => ({ ...prev, projectName: e.target.value }))}
                  placeholder="Your Business Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Domain
                </label>
                <Input
                  value={localInfo.domain || ''}
                  onChange={(e) => setLocalInfo(prev => ({ ...prev, domain: e.target.value }))}
                  placeholder="example.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Language
                  </label>
                  <select
                    value={localInfo.language || 'en'}
                    onChange={(e) => setLocalInfo(prev => ({ ...prev, language: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="en">English</option>
                    <option value="nl">Dutch (Nederlands)</option>
                    <option value="de">German (Deutsch)</option>
                    <option value="fr">French (Français)</option>
                    <option value="es">Spanish (Español)</option>
                    <option value="it">Italian (Italiano)</option>
                    <option value="pt">Portuguese (Português)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Region
                  </label>
                  <Input
                    value={localInfo.region || ''}
                    onChange={(e) => setLocalInfo(prev => ({ ...prev, region: e.target.value }))}
                    placeholder="e.g., Netherlands, United States"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Target Audience
                </label>
                <Input
                  value={localInfo.audience || ''}
                  onChange={(e) => setLocalInfo(prev => ({ ...prev, audience: e.target.value }))}
                  placeholder="Who is your target audience?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Value Proposition
                </label>
                <Input
                  value={localInfo.valueProp || ''}
                  onChange={(e) => setLocalInfo(prev => ({ ...prev, valueProp: e.target.value }))}
                  placeholder="What value do you provide?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Industry
                </label>
                <Input
                  value={localInfo.industry || ''}
                  onChange={(e) => setLocalInfo(prev => ({ ...prev, industry: e.target.value }))}
                  placeholder="Your industry"
                />
              </div>
            </div>
          )}

          {/* Entity Identity Tab */}
          {activeTab === 'identity' && (
            <div id="panel-identity" role="tabpanel" aria-labelledby="tab-identity" className="space-y-6">
              <p className="text-sm text-gray-400">
                Define your entity's formal identity for Knowledge Panel building.
              </p>

              {/* Legal Entity Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-amber-400 border-b border-gray-700 pb-2">
                  Legal Entity
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="legalName">Legal Name</Label>
                    <Input
                      id="legalName"
                      value={localInfo.entityIdentity?.legalName || localInfo.projectName || ''}
                      onChange={(e) => setLocalInfo(prev => ({
                        ...prev,
                        entityIdentity: {
                          ...prev.entityIdentity,
                          legalName: e.target.value
                        }
                      }))}
                      placeholder="Official registered name"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      The official registered name of your entity
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="foundedYear">Founded Year</Label>
                    <Input
                      id="foundedYear"
                      type="number"
                      value={localInfo.entityIdentity?.foundedYear || ''}
                      onChange={(e) => setLocalInfo(prev => ({
                        ...prev,
                        entityIdentity: {
                          ...prev.entityIdentity,
                          foundedYear: parseInt(e.target.value) || undefined
                        }
                      }))}
                      placeholder="e.g., 2020"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="headquartersLocation">Headquarters Location</Label>
                  <Input
                    id="headquartersLocation"
                    value={localInfo.entityIdentity?.headquartersLocation || ''}
                    onChange={(e) => setLocalInfo(prev => ({
                      ...prev,
                      entityIdentity: {
                        ...prev.entityIdentity,
                        headquartersLocation: e.target.value
                      }
                    }))}
                    placeholder="City, Country"
                  />
                </div>
              </div>

              {/* Key Person Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-amber-400 border-b border-gray-700 pb-2">
                  Key Person (E-A-T Signal)
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="founderOrCEO">Founder / CEO</Label>
                    <Input
                      id="founderOrCEO"
                      value={localInfo.entityIdentity?.founderOrCEO || ''}
                      onChange={(e) => setLocalInfo(prev => ({
                        ...prev,
                        entityIdentity: {
                          ...prev.entityIdentity,
                          founderOrCEO: e.target.value
                        }
                      }))}
                      placeholder="Full name of key person"
                    />
                  </div>
                  <div>
                    <Label htmlFor="founderCredential">Primary Credential</Label>
                    <Input
                      id="founderCredential"
                      value={localInfo.entityIdentity?.founderCredential || ''}
                      onChange={(e) => setLocalInfo(prev => ({
                        ...prev,
                        entityIdentity: {
                          ...prev.entityIdentity,
                          founderCredential: e.target.value
                        }
                      }))}
                      placeholder="e.g., PhD, MBA, CTO"
                    />
                  </div>
                </div>
              </div>

              {/* Desired KP Identity Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-amber-400 border-b border-gray-700 pb-2">
                  Desired Knowledge Panel Identity
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="primaryAttribute">Primary Attribute (KP Subtitle)</Label>
                    <Select
                      id="primaryAttribute"
                      value={localInfo.entityIdentity?.primaryAttribute || ''}
                      onChange={(e) => setLocalInfo(prev => ({
                        ...prev,
                        entityIdentity: {
                          ...prev.entityIdentity,
                          primaryAttribute: e.target.value
                        }
                      }))}
                    >
                      <option value="">Select desired KP subtitle...</option>
                      {PRIMARY_ATTRIBUTE_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      This appears under your entity name in the Knowledge Panel
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="brandSearchDemand">Brand Search Demand (Monthly)</Label>
                    <Input
                      id="brandSearchDemand"
                      type="number"
                      value={localInfo.entityIdentity?.brandSearchDemand || ''}
                      onChange={(e) => setLocalInfo(prev => ({
                        ...prev,
                        entityIdentity: {
                          ...prev.entityIdentity,
                          brandSearchDemand: parseInt(e.target.value) || undefined
                        }
                      }))}
                      placeholder="Monthly branded searches"
                    />
                  </div>
                </div>
              </div>

              {/* Existing Seed Sources Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-amber-400 border-b border-gray-700 pb-2">
                  Existing Seed Sources
                </h3>
                <p className="text-xs text-gray-500">
                  Enter URLs of existing profiles. Aim for 10+ sources for strong Knowledge Panel corroboration.
                </p>
                {/* Group by category */}
                {['Authority', 'Business', 'Social', 'Developer'].map(category => {
                  const categorySources = SEED_SOURCES.filter(s => s.category === category);
                  if (categorySources.length === 0) return null;
                  return (
                    <div key={category} className="space-y-2">
                      <span className="text-xs font-medium text-gray-500 uppercase">{category}</span>
                      <div className="space-y-2 pl-2 border-l-2 border-gray-700">
                        {categorySources.map(source => (
                          <div key={source.id} className="flex items-center gap-3">
                            <span className="text-sm text-gray-300 w-32 truncate">{source.name}</span>
                            {source.isCheckbox ? (
                              <label className="flex items-center gap-2 text-sm text-gray-300">
                                <input
                                  type="checkbox"
                                  checked={!!localInfo.entityIdentity?.existingSeedSources?.[source.id as keyof typeof localInfo.entityIdentity.existingSeedSources]}
                                  onChange={(e) => setLocalInfo(prev => ({
                                    ...prev,
                                    entityIdentity: {
                                      ...prev.entityIdentity,
                                      existingSeedSources: {
                                        ...prev.entityIdentity?.existingSeedSources,
                                        [source.id]: e.target.checked
                                      }
                                    }
                                  }))}
                                  className="rounded border-gray-600 bg-gray-800 text-amber-500 focus:ring-amber-500"
                                />
                                Claimed
                              </label>
                            ) : (
                              <Input
                                value={(localInfo.entityIdentity?.existingSeedSources?.[source.id as keyof typeof localInfo.entityIdentity.existingSeedSources] as string) || ''}
                                onChange={(e) => setLocalInfo(prev => ({
                                  ...prev,
                                  entityIdentity: {
                                    ...prev.entityIdentity,
                                    existingSeedSources: {
                                      ...prev.entityIdentity?.existingSeedSources,
                                      [source.id]: e.target.value
                                    }
                                  }
                                }))}
                                placeholder={source.placeholder}
                                className="flex-1 h-8 text-sm"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Brand Kit Tab */}
          {activeTab === 'brand' && (
            <div id="panel-brand" role="tabpanel" aria-labelledby="tab-brand" className="space-y-4">
              <p className="text-sm text-gray-400">
                Configure your brand colors, logo, and visual identity for image generation.
              </p>
              <BrandKitEditor
                brandKit={localInfo.brandKit}
                onChange={(brandKit) => setLocalInfo(prev => ({ ...prev, brandKit }))}
              />
            </div>
          )}

          {/* Image APIs Tab */}
          {activeTab === 'api' && (
            <div id="panel-api" role="tabpanel" aria-labelledby="tab-api" className="space-y-4">
              <p className="text-sm text-gray-400">
                Configure API keys for image generation and hosting services.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Cloudinary Cloud Name
                </label>
                <Input
                  value={localInfo.cloudinaryCloudName || ''}
                  onChange={(e) => setLocalInfo(prev => ({ ...prev, cloudinaryCloudName: e.target.value }))}
                  placeholder="your-cloud-name"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Found in your Cloudinary dashboard
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Cloudinary API Key
                </label>
                <Input
                  type="password"
                  value={localInfo.cloudinaryApiKey || ''}
                  onChange={(e) => setLocalInfo(prev => ({ ...prev, cloudinaryApiKey: e.target.value }))}
                  placeholder="API Key"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  MarkupGo API Key
                </label>
                <Input
                  type="password"
                  value={localInfo.markupGoApiKey || ''}
                  onChange={(e) => setLocalInfo(prev => ({ ...prev, markupGoApiKey: e.target.value }))}
                  placeholder="API Key for hero image generation"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Used for HTML-to-image hero generation
                </p>
              </div>
            </div>
          )}
        </div>
    </Modal>
  );
};

export default BusinessInfoModal;
