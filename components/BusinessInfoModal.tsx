
import React, { useState, useEffect } from 'react';
import { BusinessInfo } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import BrandKitEditor from './BrandKitEditor';
import { Input } from './ui/Input';

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
  const [activeTab, setActiveTab] = useState<'general' | 'brand' | 'api'>('general');

  // Sync with external changes
  useEffect(() => {
    setLocalInfo(businessInfo);
  }, [businessInfo]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(localInfo);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center z-10 flex-shrink-0">
          <h2 className="text-xl font-bold text-white">Edit Business Info</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 bg-gray-800">
          <button
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

        <div className="p-6 overflow-y-auto flex-grow space-y-4">
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-4">
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

          {/* Brand Kit Tab */}
          {activeTab === 'brand' && (
            <div className="space-y-4">
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
            <div className="space-y-4">
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

        {/* Footer with buttons */}
        <div className="sticky bottom-0 bg-gray-800 p-4 border-t border-gray-700 flex justify-end gap-3 flex-shrink-0">
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default BusinessInfoModal;
