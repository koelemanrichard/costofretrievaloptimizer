/**
 * ModuleEditModal - Edit service module details
 *
 * Modal for editing service module properties including:
 * - Name and description
 * - Category
 * - Pricing (min/max)
 * - Recurring settings
 * - Deliverables
 * - Active status
 */

import React, { useState, useEffect, useId } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import {
  ServiceModule,
  ServiceCategory,
  RecurringInterval,
} from '../../types/quotation';
import { CATEGORY_INFO } from '../../config/quotation/modules';
import { useQuotationSettings } from '../../hooks/useQuotationSettings';

// =============================================================================
// Types
// =============================================================================

interface ModuleEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  module: ServiceModule | null;
  onSave: (module: ServiceModule) => void;
  isLoading?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export const ModuleEditModal: React.FC<ModuleEditModalProps> = ({
  isOpen,
  onClose,
  module,
  onSave,
  isLoading = false,
}) => {
  const formId = useId();
  const { formatPrice } = useQuotationSettings();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ServiceCategory>('semantic_seo');
  const [basePriceMin, setBasePriceMin] = useState(0);
  const [basePriceMax, setBasePriceMax] = useState(0);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState<RecurringInterval>('monthly');
  const [deliverables, setDeliverables] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [newDeliverable, setNewDeliverable] = useState('');

  // Sync form state with module prop
  useEffect(() => {
    if (isOpen && module) {
      setName(module.name);
      setDescription(module.description);
      setCategory(module.category);
      setBasePriceMin(module.basePriceMin);
      setBasePriceMax(module.basePriceMax);
      setIsRecurring(module.isRecurring);
      setRecurringInterval(module.recurringInterval || 'monthly');
      setDeliverables([...module.deliverables]);
      setIsActive(module.isActive);
    }
  }, [isOpen, module]);

  const handleAddDeliverable = () => {
    if (newDeliverable.trim()) {
      setDeliverables([...deliverables, newDeliverable.trim()]);
      setNewDeliverable('');
    }
  };

  const handleRemoveDeliverable = (index: number) => {
    setDeliverables(deliverables.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!module) return;

    const updatedModule: ServiceModule = {
      ...module,
      name: name.trim(),
      description: description.trim(),
      category,
      basePriceMin,
      basePriceMax,
      isRecurring,
      recurringInterval: isRecurring ? recurringInterval : undefined,
      deliverables,
      isActive,
    };

    onSave(updatedModule);
  };

  const isValid =
    name.trim() !== '' &&
    basePriceMin > 0 &&
    basePriceMax >= basePriceMin &&
    deliverables.length > 0;

  const categoryOptions = Object.entries(CATEGORY_INFO).map(([key, info]) => ({
    value: key as ServiceCategory,
    label: info.name,
  }));

  const footer = (
    <div className="flex justify-between items-center gap-4 w-full">
      <Button onClick={onClose} variant="secondary">
        Cancel
      </Button>
      <Button onClick={handleSave} disabled={isLoading || !isValid}>
        {isLoading ? 'Saving...' : 'Save Module'}
      </Button>
    </div>
  );

  if (!module) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Service Module"
      description="Edit the details of this service module"
      maxWidth="max-w-2xl"
      footer={footer}
    >
      <div className="space-y-6">
        {/* Name */}
        <div className="space-y-2">
          <label htmlFor={`${formId}-name`} className="block text-sm font-medium text-gray-300">
            Module Name
          </label>
          <Input
            id={`${formId}-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Topical Map Development"
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
            placeholder="Brief description of what this service includes"
            rows={3}
          />
        </div>

        {/* Category */}
        <div className="space-y-2">
          <label htmlFor={`${formId}-category`} className="block text-sm font-medium text-gray-300">
            Category
          </label>
          <select
            id={`${formId}-category`}
            value={category}
            onChange={(e) => setCategory(e.target.value as ServiceCategory)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categoryOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Pricing */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor={`${formId}-price-min`} className="block text-sm font-medium text-gray-300">
              Base Price Min
            </label>
            <div className="relative">
              <Input
                id={`${formId}-price-min`}
                type="number"
                min={0}
                step={50}
                value={basePriceMin}
                onChange={(e) => setBasePriceMin(parseInt(e.target.value) || 0)}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                {formatPrice(basePriceMin)}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor={`${formId}-price-max`} className="block text-sm font-medium text-gray-300">
              Base Price Max
            </label>
            <div className="relative">
              <Input
                id={`${formId}-price-max`}
                type="number"
                min={0}
                step={50}
                value={basePriceMax}
                onChange={(e) => setBasePriceMax(parseInt(e.target.value) || 0)}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                {formatPrice(basePriceMax)}
              </div>
            </div>
          </div>
        </div>
        {basePriceMax < basePriceMin && (
          <p className="text-red-400 text-sm">Max price must be greater than or equal to min price</p>
        )}

        {/* Recurring */}
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="w-5 h-5 rounded bg-gray-800 border-gray-700 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-gray-300">This is a recurring service</span>
          </label>

          {isRecurring && (
            <div className="ml-8">
              <label htmlFor={`${formId}-interval`} className="block text-sm font-medium text-gray-400 mb-2">
                Billing Interval
              </label>
              <select
                id={`${formId}-interval`}
                value={recurringInterval}
                onChange={(e) => setRecurringInterval(e.target.value as RecurringInterval)}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>
          )}
        </div>

        {/* Deliverables */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-300">Deliverables</label>
          <div className="space-y-2">
            {deliverables.map((deliverable, index) => (
              <div key={index} className="flex items-center gap-2 bg-gray-800/50 rounded-lg p-2">
                <span className="text-green-500">•</span>
                <span className="flex-1 text-gray-300">{deliverable}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveDeliverable(index)}
                  className="text-gray-500 hover:text-red-400 p-1"
                  aria-label={`Remove deliverable: ${deliverable}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newDeliverable}
              onChange={(e) => setNewDeliverable(e.target.value)}
              placeholder="Add a deliverable..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddDeliverable();
                }
              }}
            />
            <Button type="button" variant="secondary" onClick={handleAddDeliverable}>
              Add
            </Button>
          </div>
          {deliverables.length === 0 && (
            <p className="text-yellow-400 text-sm">At least one deliverable is required</p>
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
            <span className="text-gray-300">Module is active and available for quotes</span>
          </label>
        </div>
      </div>
    </Modal>
  );
};

export default ModuleEditModal;
