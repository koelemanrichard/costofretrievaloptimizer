/**
 * QuotationPricingAdmin - Admin panel for managing quotation pricing
 *
 * CRUD for service modules, package presets, and multiplier configuration.
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  ServiceModule,
  ServiceCategory,
  QuotationPackage,
  CurrencyCode,
} from '../../types/quotation';
import { SERVICE_MODULES, CATEGORY_INFO } from '../../config/quotation/modules';
import { QUOTATION_PACKAGES } from '../../config/quotation/packages';
import { ModuleEditModal } from './ModuleEditModal';
import { PackageEditModal } from './PackageEditModal';
import {
  useQuotationSettings,
  QuotationSettingsProvider,
  CURRENCY_INFO,
} from '../../hooks/useQuotationSettings';
import {
  getModules,
  updateModule,
  getPackages,
  updatePackage,
} from '../../services/quotation';

type AdminTab = 'modules' | 'packages' | 'multipliers' | 'analytics';

// =============================================================================
// Multiplier Configuration
// =============================================================================

interface MultiplierConfig {
  siteSizeMultipliers: Record<string, number>;
  competitionMultipliers: Record<string, number>;
  urgencyMultipliers: Record<string, number>;
}

const DEFAULT_MULTIPLIERS: MultiplierConfig = {
  siteSizeMultipliers: {
    small: 1.0,
    medium: 1.3,
    large: 1.6,
    enterprise: 2.2,
  },
  competitionMultipliers: {
    low: 1.0,
    medium: 1.15,
    high: 1.35,
  },
  urgencyMultipliers: {
    standard: 1.0,
    expedited: 1.5,
  },
};

// =============================================================================
// Component
// =============================================================================

const QuotationPricingAdminContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('modules');
  const [multipliers, setMultipliers] = useState<MultiplierConfig>(DEFAULT_MULTIPLIERS);
  const [editingModule, setEditingModule] = useState<ServiceModule | null>(null);
  const [editingPackage, setEditingPackage] = useState<QuotationPackage | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // State for loaded data
  const [modules, setModules] = useState<ServiceModule[]>(SERVICE_MODULES as ServiceModule[]);
  const [packages, setPackages] = useState<QuotationPackage[]>(QUOTATION_PACKAGES as QuotationPackage[]);
  const [isLoading, setIsLoading] = useState(true);

  // Currency settings
  const { formatPrice, formatPriceRange, currency, setCurrency, availableCurrencies, currencyInfo } = useQuotationSettings();

  // Load data from database
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [modulesResult, packagesResult] = await Promise.all([
          getModules(),
          getPackages(),
        ]);
        if (modulesResult.data) setModules(modulesResult.data);
        if (packagesResult.data) setPackages(packagesResult.data);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Group modules by category
  const modulesByCategory = useMemo(() => {
    return modules.reduce((acc, module) => {
      if (!acc[module.category]) {
        acc[module.category] = [];
      }
      acc[module.category].push(module);
      return acc;
    }, {} as Record<ServiceCategory, ServiceModule[]>);
  }, [modules]);

  // Handle module save
  const handleSaveModule = useCallback(async (module: ServiceModule) => {
    setIsSaving(true);
    try {
      const result = await updateModule(module);
      if (result.data) {
        setModules((prev) =>
          prev.map((m) => (m.id === module.id ? result.data! : m))
        );
      }
      setEditingModule(null);
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Handle package save
  const handleSavePackage = useCallback(async (pkg: QuotationPackage) => {
    setIsSaving(true);
    try {
      const result = await updatePackage(pkg);
      if (result.data) {
        setPackages((prev) =>
          prev.map((p) => (p.id === pkg.id ? result.data! : p))
        );
      }
      setEditingPackage(null);
    } finally {
      setIsSaving(false);
    }
  }, []);

  const tabs: { key: AdminTab; label: string; icon: string }[] = [
    {
      key: 'modules',
      label: 'Service Modules',
      icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
    },
    {
      key: 'packages',
      label: 'Packages',
      icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    },
    {
      key: 'multipliers',
      label: 'Pricing Multipliers',
      icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
    },
    {
      key: 'analytics',
      label: 'Quote Analytics',
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-white">Quotation Pricing Management</h2>
          <p className="text-gray-400 mt-1">Configure service modules, packages, and pricing multipliers</p>
        </div>

        {/* Currency Selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-400">Currency:</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {availableCurrencies.map((code) => (
              <option key={code} value={code}>
                {currencyInfo[code].symbol} {code}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-gray-400">Loading pricing data...</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${
              activeTab === tab.key
                ? 'bg-gray-800 text-white border border-gray-700 border-b-gray-800'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
            </svg>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {/* Modules Tab */}
        {activeTab === 'modules' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <p className="text-gray-400">
                {modules.length} modules across {Object.keys(modulesByCategory).length} categories
              </p>
              <Button>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Module
              </Button>
            </div>

            {Object.entries(modulesByCategory).map(([category, modules]) => (
              <Card key={category} className="p-4">
                <h3 className="font-semibold text-white mb-3">
                  {CATEGORY_INFO[category as ServiceCategory]?.name || category}
                  <span className="text-gray-500 text-sm font-normal ml-2">({modules.length} modules)</span>
                </h3>
                <div className="space-y-2">
                  {modules.map((module) => (
                    <div
                      key={module.id}
                      className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">{module.name}</span>
                          {module.isRecurring && (
                            <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">
                              {module.recurringInterval}
                            </span>
                          )}
                          {!module.isActive && (
                            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 mt-1">{module.description}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-white">
                            {formatPriceRange(module.basePriceMin, module.basePriceMax)}
                          </div>
                          <div className="text-xs text-gray-500">{module.deliverables.length} deliverables</div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingModule(module);
                          }}
                          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
                          title="Edit module"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Packages Tab */}
        {activeTab === 'packages' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <p className="text-gray-400">{packages.filter(p => p.isActive).length} active packages</p>
              <Button>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Package
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {packages.map((pkg) => (
                <Card key={pkg.id} className={`p-4 ${!pkg.isActive ? 'opacity-50' : ''}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-white">
                        {pkg.name}
                        {!pkg.isActive && (
                          <span className="ml-2 text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">
                            Inactive
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">{pkg.description}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingPackage(pkg);
                      }}
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
                      title="Edit package"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <div className="text-2xl font-bold text-white">{formatPrice(pkg.basePrice)}</div>
                    {pkg.discountPercent > 0 && (
                      <span className="text-sm bg-green-500/20 text-green-400 px-2 py-1 rounded">
                        {pkg.discountPercent}% discount
                      </span>
                    )}
                  </div>

                  <div className="text-sm text-gray-400 mb-2">
                    {pkg.includedModules.length} services included
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {pkg.targetSiteSizes.map((size) => (
                      <span key={size} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                        {size}
                      </span>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Multipliers Tab */}
        {activeTab === 'multipliers' && (
          <div className="grid grid-cols-3 gap-6">
            {/* Site Size Multipliers */}
            <Card className="p-4">
              <h3 className="font-semibold text-white mb-4">Site Size Multipliers</h3>
              <div className="space-y-3">
                {Object.entries(multipliers.siteSizeMultipliers).map(([size, value]) => (
                  <div key={size} className="flex items-center justify-between">
                    <span className="text-gray-300 capitalize">{size}</span>
                    <input
                      type="number"
                      step="0.1"
                      value={value}
                      onChange={(e) =>
                        setMultipliers({
                          ...multipliers,
                          siteSizeMultipliers: {
                            ...multipliers.siteSizeMultipliers,
                            [size]: parseFloat(e.target.value) || 1,
                          },
                        })
                      }
                      className="w-20 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-right"
                    />
                  </div>
                ))}
              </div>
            </Card>

            {/* Competition Multipliers */}
            <Card className="p-4">
              <h3 className="font-semibold text-white mb-4">Competition Multipliers</h3>
              <div className="space-y-3">
                {Object.entries(multipliers.competitionMultipliers).map(([level, value]) => (
                  <div key={level} className="flex items-center justify-between">
                    <span className="text-gray-300 capitalize">{level}</span>
                    <input
                      type="number"
                      step="0.05"
                      value={value}
                      onChange={(e) =>
                        setMultipliers({
                          ...multipliers,
                          competitionMultipliers: {
                            ...multipliers.competitionMultipliers,
                            [level]: parseFloat(e.target.value) || 1,
                          },
                        })
                      }
                      className="w-20 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-right"
                    />
                  </div>
                ))}
              </div>
            </Card>

            {/* Urgency Multipliers */}
            <Card className="p-4">
              <h3 className="font-semibold text-white mb-4">Urgency Multipliers</h3>
              <div className="space-y-3">
                {Object.entries(multipliers.urgencyMultipliers).map(([urgency, value]) => (
                  <div key={urgency} className="flex items-center justify-between">
                    <span className="text-gray-300 capitalize">{urgency}</span>
                    <input
                      type="number"
                      step="0.1"
                      value={value}
                      onChange={(e) =>
                        setMultipliers({
                          ...multipliers,
                          urgencyMultipliers: {
                            ...multipliers.urgencyMultipliers,
                            [urgency]: parseFloat(e.target.value) || 1,
                          },
                        })
                      }
                      className="w-20 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-right"
                    />
                  </div>
                ))}
              </div>
            </Card>

            <div className="col-span-3">
              <Button>Save Multiplier Changes</Button>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Total Quotes', value: '0', change: '-' },
                { label: 'Accepted', value: '0', change: '-' },
                { label: 'Acceptance Rate', value: '0%', change: '-' },
                { label: 'Total Revenue', value: '$0', change: '-' },
              ].map((stat) => (
                <Card key={stat.label} className="p-4 text-center">
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm text-gray-400 mt-1">{stat.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{stat.change}</div>
                </Card>
              ))}
            </div>

            <Card className="p-6">
              <h3 className="font-semibold text-white mb-4">Quote Conversion Funnel</h3>
              <p className="text-gray-500 text-center py-8">
                Analytics will be available once quotes are generated
              </p>
            </Card>
          </div>
        )}
      </div>

      {/* Module Edit Modal */}
      <ModuleEditModal
        isOpen={editingModule !== null}
        onClose={() => setEditingModule(null)}
        module={editingModule}
        onSave={handleSaveModule}
        isLoading={isSaving}
      />

      {/* Package Edit Modal */}
      <PackageEditModal
        isOpen={editingPackage !== null}
        onClose={() => setEditingPackage(null)}
        package={editingPackage}
        onSave={handleSavePackage}
        isLoading={isSaving}
        availableModules={modules}
      />
    </div>
  );
};

// Wrapper component with provider
export const QuotationPricingAdmin: React.FC = () => {
  return (
    <QuotationSettingsProvider>
      <QuotationPricingAdminContent />
    </QuotationSettingsProvider>
  );
};

export default QuotationPricingAdmin;
