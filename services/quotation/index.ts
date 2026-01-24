/**
 * Quotation Services Index
 *
 * Re-exports all quotation-related services for easy imports:
 * import { analyzeUrlForQuotation, calculateModulePrice } from '@/services/quotation';
 */

// URL Analysis
export {
  analyzeUrlForQuotation,
  quickAnalyzeUrl,
  extractDomain,
  type UrlAnalysisConfig,
  type AnalysisProgress,
  type ProgressCallback,
} from './urlAnalysisService';

// Pricing Engine
export {
  calculateModulePrice,
  calculateQuoteTotal,
  calculateKpiProjections,
  calculateRoi,
  getSiteMultiplier,
  getCompetitionMultiplier,
  createLineItem,
  generateQuoteLineItems,
  getModulesFromIds,
  buildPricingFactors,
  type PricingContext,
  type ModulePriceResult,
  type QuoteTotalResult,
} from './pricingEngine';

// Quote Export
export {
  generateQuoteHtml,
  generateQuotePdf,
  downloadQuoteHtml,
  openQuoteForPrint,
  setExportCurrency,
} from './quoteExportService';

// Module Service
export {
  getModules,
  getModuleById,
  createModule,
  updateModule,
  deleteModule,
  seedModulesFromConfig,
} from './moduleService';

// Package Service
export {
  getPackages,
  getActivePackages as getActivePackagesFromDb,
  getPackageById as getPackageByIdFromDb,
  createPackage,
  updatePackage,
  deletePackage,
  seedPackagesFromConfig,
} from './packageService';
