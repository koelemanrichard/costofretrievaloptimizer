/**
 * Quotation Settings Context
 *
 * Provides quotation-wide settings including currency preferences.
 * Settings are stored in localStorage and can be overridden per-quote.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CurrencyCode, QuotationSettings } from '../types/quotation';
import {
  formatCurrency as formatCurrencyUtil,
  formatPriceRange as formatPriceRangeUtil,
  CURRENCY_INFO,
  getAvailableCurrencies,
} from '../utils/currencyFormatter';

// =============================================================================
// Types
// =============================================================================

interface QuotationSettingsContextValue {
  settings: QuotationSettings;
  updateSettings: (updates: Partial<QuotationSettings>) => void;
  formatPrice: (amount: number) => string;
  formatPriceRange: (min: number, max: number) => string;
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  availableCurrencies: CurrencyCode[];
  currencyInfo: typeof CURRENCY_INFO;
}

// =============================================================================
// Constants
// =============================================================================

const STORAGE_KEY = 'quotation_settings';

const DEFAULT_SETTINGS: QuotationSettings = {
  currency: 'EUR',
  locale: 'nl-NL',
};

// =============================================================================
// Context
// =============================================================================

const QuotationSettingsContext = createContext<QuotationSettingsContextValue | null>(null);

// =============================================================================
// Provider Component
// =============================================================================

interface QuotationSettingsProviderProps {
  children: React.ReactNode;
  initialSettings?: Partial<QuotationSettings>;
}

export const QuotationSettingsProvider: React.FC<QuotationSettingsProviderProps> = ({
  children,
  initialSettings,
}) => {
  const [settings, setSettings] = useState<QuotationSettings>(() => {
    // Try to load from localStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          return { ...DEFAULT_SETTINGS, ...parsed, ...initialSettings };
        }
      } catch {
        // Ignore localStorage errors
      }
    }
    return { ...DEFAULT_SETTINGS, ...initialSettings };
  });

  // Persist settings to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [settings]);

  const updateSettings = useCallback((updates: Partial<QuotationSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const setCurrency = useCallback((currency: CurrencyCode) => {
    updateSettings({ currency });
  }, [updateSettings]);

  const formatPrice = useCallback(
    (amount: number) => formatCurrencyUtil(amount, settings.currency, { locale: settings.locale }),
    [settings.currency, settings.locale]
  );

  const formatPriceRange = useCallback(
    (min: number, max: number) => formatPriceRangeUtil(min, max, settings.currency, settings.locale),
    [settings.currency, settings.locale]
  );

  const value: QuotationSettingsContextValue = {
    settings,
    updateSettings,
    formatPrice,
    formatPriceRange,
    currency: settings.currency,
    setCurrency,
    availableCurrencies: getAvailableCurrencies(),
    currencyInfo: CURRENCY_INFO,
  };

  return React.createElement(QuotationSettingsContext.Provider, { value }, children);
};

// =============================================================================
// Hook
// =============================================================================

export function useQuotationSettings(): QuotationSettingsContextValue {
  const context = useContext(QuotationSettingsContext);

  if (!context) {
    // Return a default context when not wrapped in provider
    // This allows components to work standalone without requiring the provider
    return {
      settings: DEFAULT_SETTINGS,
      updateSettings: () => {},
      formatPrice: (amount: number) => formatCurrencyUtil(amount, 'EUR'),
      formatPriceRange: (min: number, max: number) => formatPriceRangeUtil(min, max, 'EUR'),
      currency: 'EUR',
      setCurrency: () => {},
      availableCurrencies: getAvailableCurrencies(),
      currencyInfo: CURRENCY_INFO,
    };
  }

  return context;
}

// =============================================================================
// Exports
// =============================================================================

export { CURRENCY_INFO, getAvailableCurrencies };
export type { QuotationSettingsContextValue };
