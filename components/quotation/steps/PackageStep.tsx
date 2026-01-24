/**
 * PackageStep - Select a pre-built package or customize
 */

import React from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { UrlAnalysisResult } from '../../../types/quotation';
import { getActivePackages, getPackageById } from '../../../config/quotation/packages';
import { getModuleById } from '../../../config/quotation/modules';
import { useQuotationSettings } from '../../../hooks/useQuotationSettings';

interface PackageStepProps {
  analysisResult?: UrlAnalysisResult;
  selectedPackageId?: string;
  recommendedPackageId: string | null;
  onSelectPackage: (packageId: string) => void;
  onCustomize: () => void;
  onContinue: () => void;
  onBack: () => void;
}

export const PackageStep: React.FC<PackageStepProps> = ({
  analysisResult,
  selectedPackageId,
  recommendedPackageId,
  onSelectPackage,
  onCustomize,
  onContinue,
  onBack,
}) => {
  const packages = getActivePackages();
  const { formatPrice } = useQuotationSettings();

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-bold text-white mb-2">Choose Your Package</h2>
        <p className="text-gray-400">
          Select a pre-built package or customize your own service mix
        </p>
      </Card>

      {/* Package Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {packages.map((pkg) => {
          const isSelected = selectedPackageId === pkg.id;
          const isRecommended = recommendedPackageId === pkg.id;
          const moduleCount = pkg.includedModules.length;

          return (
            <Card
              key={pkg.id}
              className={`p-6 cursor-pointer transition-all relative ${
                isSelected
                  ? 'ring-2 ring-blue-500 bg-blue-500/5'
                  : 'hover:border-gray-600'
              }`}
              onClick={() => onSelectPackage(pkg.id)}
            >
              {/* Recommended Badge */}
              {isRecommended && (
                <div className="absolute -top-3 left-4 px-3 py-1 bg-green-600 text-white text-xs font-medium rounded-full">
                  Recommended
                </div>
              )}

              {/* Selection Indicator */}
              <div className="absolute top-4 right-4">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    isSelected
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-600'
                  }`}
                >
                  {isSelected && (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Package Info */}
              <h3 className="text-lg font-semibold text-white pr-8">{pkg.name}</h3>
              <p className="text-gray-400 text-sm mt-1 mb-4">{pkg.description}</p>

              {/* Price */}
              <div className="mb-4">
                <div className="text-2xl font-bold text-white">
                  {formatPrice(pkg.basePrice)}
                  <span className="text-sm text-gray-400 font-normal">/project</span>
                </div>
                {pkg.discountPercent > 0 && (
                  <div className="text-sm text-green-400 mt-1">
                    {pkg.discountPercent}% package discount included
                  </div>
                )}
              </div>

              {/* Included Services */}
              <div className="border-t border-gray-700 pt-4">
                <div className="text-sm text-gray-400 mb-2">{moduleCount} services included:</div>
                <ul className="space-y-1">
                  {pkg.includedModules.slice(0, 5).map((moduleId) => {
                    const mod = getModuleById(moduleId);
                    return mod ? (
                      <li key={moduleId} className="text-sm text-gray-300 flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {mod.name}
                      </li>
                    ) : null;
                  })}
                  {pkg.includedModules.length > 5 && (
                    <li className="text-sm text-gray-500">
                      +{pkg.includedModules.length - 5} more services
                    </li>
                  )}
                </ul>
              </div>

              {/* Target Size */}
              {pkg.targetSiteSizes.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {pkg.targetSiteSizes.map((size) => (
                    <span
                      key={size}
                      className={`text-xs px-2 py-1 rounded ${
                        analysisResult?.siteSize === size
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-gray-700 text-gray-400'
                      }`}
                    >
                      {size}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Custom Option */}
      <Card
        className="p-6 cursor-pointer hover:border-gray-600 transition-all border-dashed"
        onClick={onCustomize}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Build Custom Package</h3>
            <p className="text-gray-400 text-sm mt-1">
              Select individual services to create a tailored solution
            </p>
          </div>
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
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
        <Button onClick={onContinue} disabled={!selectedPackageId}>
          Review Quote
          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Button>
      </div>
    </div>
  );
};
