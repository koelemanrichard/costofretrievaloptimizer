/**
 * PackageEditModal - Edit package details
 *
 * Modal for editing package properties including:
 * - Name and description
 * - Base price
 * - Discount percent
 * - Target site sizes
 * - Included modules
 * - Active status
 */

import React, { useState, useEffect, useId, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import {
  QuotationPackage,
  SiteSize,
  ServiceModule,
} from '../../types/quotation';
import { SERVICE_MODULES, CATEGORY_INFO } from '../../config/quotation/modules';
import { useQuotationSettings } from '../../hooks/useQuotationSettings';

// =============================================================================
// Types
// =============================================================================

interface PackageEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  package: QuotationPackage | null;
  onSave: (pkg: QuotationPackage) => void;
  isLoading?: boolean;
  availableModules?: ServiceModule[];
}

const SITE_SIZES: { value: SiteSize; label: string }[] = [
  { value: 'small', label: 'Small (1-50 pages)' },
  { value: 'medium', label: 'Medium (51-500 pages)' },
  { value: 'large', label: 'Large (501-5000 pages)' },
  { value: 'enterprise', label: 'Enterprise (5000+ pages)' },
];

// =============================================================================
// Component
// =============================================================================

export const PackageEditModal: React.FC<PackageEditModalProps> = ({
  isOpen,
  onClose,
  package: pkg,
  onSave,
  isLoading = false,
  availableModules = SERVICE_MODULES as ServiceModule[],
}) => {
  const formId = useId();
  const { formatPrice, formatPriceRange } = useQuotationSettings();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [targetSiteSizes, setTargetSiteSizes] = useState<SiteSize[]>([]);
  const [includedModules, setIncludedModules] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  // Sync form state with package prop
  useEffect(() => {
    if (isOpen && pkg) {
      setName(pkg.name);
      setDescription(pkg.description);
      setBasePrice(pkg.basePrice);
      setDiscountPercent(pkg.discountPercent);
      setTargetSiteSizes([...pkg.targetSiteSizes]);
      setIncludedModules([...pkg.includedModules]);
      setIsActive(pkg.isActive);
    }
  }, [isOpen, pkg]);

  // Group modules by category for selection UI
  const modulesByCategory = useMemo(() => {
    return availableModules.reduce((acc, module) => {
      if (!acc[module.category]) {
        acc[module.category] = [];
      }
      acc[module.category].push(module);
      return acc;
    }, {} as Record<string, ServiceModule[]>);
  }, [availableModules]);

  // Calculate value of included modules
  const modulesValue = useMemo(() => {
    let minTotal = 0;
    let maxTotal = 0;
    includedModules.forEach((id) => {
      const module = availableModules.find((m) => m.id === id);
      if (module) {
        minTotal += module.basePriceMin;
        maxTotal += module.basePriceMax;
      }
    });
    return { min: minTotal, max: maxTotal };
  }, [includedModules, availableModules]);

  const handleToggleSiteSize = (size: SiteSize) => {
    if (targetSiteSizes.includes(size)) {
      setTargetSiteSizes(targetSiteSizes.filter((s) => s !== size));
    } else {
      setTargetSiteSizes([...targetSiteSizes, size]);
    }
  };

  const handleToggleModule = (moduleId: string) => {
    if (includedModules.includes(moduleId)) {
      setIncludedModules(includedModules.filter((id) => id !== moduleId));
    } else {
      setIncludedModules([...includedModules, moduleId]);
    }
  };

  const handleSave = () => {
    if (!pkg) return;

    const updatedPackage: QuotationPackage = {
      ...pkg,
      name: name.trim(),
      description: description.trim(),
      basePrice,
      discountPercent,
      targetSiteSizes,
      includedModules,
      isActive,
    };

    onSave(updatedPackage);
  };

  const isValid =
    name.trim() !== '' &&
    basePrice > 0 &&
    discountPercent >= 0 &&
    discountPercent <= 100 &&
    targetSiteSizes.length > 0 &&
    includedModules.length > 0;

  const footer = (
    <div className="flex justify-between items-center gap-4 w-full">
      <Button onClick={onClose} variant="secondary">
        Cancel
      </Button>
      <Button onClick={handleSave} disabled={isLoading || !isValid}>
        {isLoading ? 'Saving...' : 'Save Package'}
      </Button>
    </div>
  );

  if (!pkg) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Package"
      description="Edit the details of this service package"
      maxWidth="max-w-3xl"
      footer={footer}
    >
      <div className="space-y-6">
        {/* Name */}
        <div className="space-y-2">
          <label htmlFor={`${formId}-name`} className="block text-sm font-medium text-gray-300">
            Package Name
          </label>
          <Input
            id={`${formId}-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Semantic SEO Starter"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label htmlFor={`${formId}-desc`} className="block text-sm font-medium text-gray-300">
            Description
          </label>
          <Textarea
            id={`${formId}-desc`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this package"
            rows={2}
          />
        </div>

        {/* Pricing Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor={`${formId}-price`} className="block text-sm font-medium text-gray-300">
              Package Price
            </label>
            <div className="relative">
              <Input
                id={`${formId}-price`}
                type="number"
                min={0}
                step={100}
                value={basePrice}
                onChange={(e) => setBasePrice(parseInt(e.target.value) || 0)}
              />
            </div>
            <p className="text-gray-500 text-sm">{formatPrice(basePrice)}</p>
          </div>
          <div className="space-y-2">
            <label htmlFor={`${formId}-discount`} className="block text-sm font-medium text-gray-300">
              Discount Percent
            </label>
            <div className="relative">
              <Input
                id={`${formId}-discount`}
                type="number"
                min={0}
                max={100}
                step={5}
                value={discountPercent}
                onChange={(e) => setDiscountPercent(parseInt(e.target.value) || 0)}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
            </div>
          </div>
        </div>

        {/* Value Comparison */}
        {includedModules.length > 0 && (
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Individual modules value:</span>
              <span className="text-gray-300">{formatPriceRange(modulesValue.min, modulesValue.max)}</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-gray-400">Package price:</span>
              <span className="text-white font-medium">{formatPrice(basePrice)}</span>
            </div>
            {discountPercent > 0 && (
              <div className="flex justify-between items-center mt-2 text-green-400">
                <span>Savings:</span>
                <span>{discountPercent}% off module value</span>
              </div>
            )}
          </div>
        )}

        {/* Target Site Sizes */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-300">Target Site Sizes</label>
          <div className="grid grid-cols-2 gap-2">
            {SITE_SIZES.map((size) => (
              <label
                key={size.value}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  targetSiteSizes.includes(size.value)
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={targetSiteSizes.includes(size.value)}
                  onChange={() => handleToggleSiteSize(size.value)}
                  className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-gray-300">{size.label}</span>
              </label>
            ))}
          </div>
          {targetSiteSizes.length === 0 && (
            <p className="text-yellow-400 text-sm">Select at least one target site size</p>
          )}
        </div>

        {/* Included Modules */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-medium text-gray-300">Included Modules</label>
            <span className="text-sm text-gray-500">{includedModules.length} selected</span>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-4 pr-2">
            {Object.entries(modulesByCategory).map(([category, modules]) => (
              <div key={category}>
                <h4 className="text-sm font-medium text-gray-400 mb-2">
                  {CATEGORY_INFO[category as keyof typeof CATEGORY_INFO]?.name || category}
                </h4>
                <div className="space-y-1">
                  {modules.map((module) => (
                    <label
                      key={module.id}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        includedModules.includes(module.id)
                          ? 'bg-blue-500/10'
                          : 'hover:bg-gray-800/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={includedModules.includes(module.id)}
                        onChange={() => handleToggleModule(module.id)}
                        className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-blue-500 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <span className="text-gray-300">{module.name}</span>
                        {module.isRecurring && (
                          <span className="ml-2 text-xs bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">
                            {module.recurringInterval}
                          </span>
                        )}
                      </div>
                      <span className="text-gray-500 text-sm">
                        {formatPriceRange(module.basePriceMin, module.basePriceMax)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {includedModules.length === 0 && (
            <p className="text-yellow-400 text-sm">Select at least one module to include</p>
          )}
        </div>

        {/* Active Status */}
        <div className="pt-4 border-t border-gray-700">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-5 h-5 rounded bg-gray-800 border-gray-700 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-gray-300">Package is active and available for selection</span>
          </label>
        </div>
      </div>
    </Modal>
  );
};

export default PackageEditModal;
