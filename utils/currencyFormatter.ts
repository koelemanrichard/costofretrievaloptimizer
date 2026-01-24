/**
 * Currency Formatting Utilities
 *
 * Provides consistent currency formatting across the quotation system.
 * Default currency is EUR per user preference.
 */

import { CurrencyCode } from '../types/quotation';

// Map currencies to their default locales
const CURRENCY_LOCALE_MAP: Record<CurrencyCode, string> = {
  EUR: 'nl-NL',
  USD: 'en-US',
  GBP: 'en-GB',
  CHF: 'de-CH',
  CAD: 'en-CA',
  AUD: 'en-AU',
};

// Currency display info
export const CURRENCY_INFO: Record<CurrencyCode, { name: string; symbol: string }> = {
  EUR: { name: 'Euro', symbol: '€' },
  USD: { name: 'US Dollar', symbol: '$' },
  GBP: { name: 'British Pound', symbol: '£' },
  CHF: { name: 'Swiss Franc', symbol: 'CHF' },
  CAD: { name: 'Canadian Dollar', symbol: 'C$' },
  AUD: { name: 'Australian Dollar', symbol: 'A$' },
};

/**
 * Format a number as currency
 */
export function formatCurrency(
  amount: number,
  currency: CurrencyCode = 'EUR',
  options?: {
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string {
  const locale = options?.locale || CURRENCY_LOCALE_MAP[currency] || 'nl-NL';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 0,
  }).format(amount);
}

/**
 * Format a price range (min - max)
 */
export function formatPriceRange(
  min: number,
  max: number,
  currency: CurrencyCode = 'EUR',
  locale?: string
): string {
  if (min === max) {
    return formatCurrency(min, currency, { locale });
  }
  return `${formatCurrency(min, currency, { locale })} - ${formatCurrency(max, currency, { locale })}`;
}

/**
 * Get all available currency codes
 */
export function getAvailableCurrencies(): CurrencyCode[] {
  return Object.keys(CURRENCY_INFO) as CurrencyCode[];
}

/**
 * Create a currency formatter bound to a specific currency
 */
export function createCurrencyFormatter(currency: CurrencyCode, locale?: string) {
  return {
    format: (amount: number) => formatCurrency(amount, currency, { locale }),
    formatRange: (min: number, max: number) => formatPriceRange(min, max, currency, locale),
    currency,
    locale: locale || CURRENCY_LOCALE_MAP[currency],
  };
}
