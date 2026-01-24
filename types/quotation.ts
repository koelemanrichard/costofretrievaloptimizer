/**
 * SEO Quotation Tool Type Definitions
 * Types for service modules, pricing, quotes, and CRM features
 */

// =============================================================================
// Core Enums and Type Aliases
// =============================================================================

export type QuoteStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';

export type CurrencyCode = 'EUR' | 'USD' | 'GBP' | 'CHF' | 'CAD' | 'AUD';

export interface QuotationSettings {
  currency: CurrencyCode;
  locale?: string;
}

export type ServiceCategory =
  | 'semantic_seo'
  | 'traditional_seo'
  | 'content'
  | 'offsite'
  | 'paid_ads'
  | 'ai_llm'
  | 'local_seo'
  | 'retainers';

export type SiteSize = 'small' | 'medium' | 'large' | 'enterprise';

export type RecurringInterval = 'monthly' | 'quarterly';

export type CompetitionLevel = 'low' | 'medium' | 'high';

export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low';

export type QuoteActivityType =
  | 'created'
  | 'sent'
  | 'viewed'
  | 'revised'
  | 'accepted'
  | 'rejected'
  | 'note_added'
  | 'status_changed';

// =============================================================================
// Service Module Types
// =============================================================================

export interface KpiContribution {
  metric: string;
  impactMin: number;
  impactMax: number;
  timeframeMonths: number;
  confidence: number;
}

export interface ServiceModule {
  id: string;
  category: ServiceCategory;
  name: string;
  description: string;
  basePriceMin: number;
  basePriceMax: number;
  isRecurring: boolean;
  recurringInterval?: RecurringInterval;
  kpiContributions: KpiContribution[];
  deliverables: string[];
  displayOrder: number;
  isActive: boolean;
}

// =============================================================================
// Package Types
// =============================================================================

export interface QuotationPackage {
  id: string;
  name: string;
  description: string;
  includedModules: string[]; // Module IDs
  basePrice: number;
  discountPercent: number;
  targetSiteSizes: SiteSize[];
  isActive: boolean;
  displayOrder: number;
}

// =============================================================================
// URL Analysis Types
// =============================================================================

export interface CrawlData {
  pageCount: number;
  technicalIssues: {
    critical: number;
    warnings: number;
    notices: number;
  };
  hasSchema: boolean;
  sslValid: boolean;
  mobileOptimized: boolean;
  coreWebVitals?: {
    lcp: number;
    fid: number;
    cls: number;
  };
}

export interface SerpData {
  visibilityScore: number;
  keywordsRanking: number;
  topKeywords: Array<{
    keyword: string;
    position: number;
    volume: number;
  }>;
  competitionLevel: CompetitionLevel;
}

export interface AnalysisRecommendation {
  category: ServiceCategory;
  priority: PriorityLevel;
  description: string;
  estimatedImpact: string;
}

export interface UrlAnalysisResult {
  domain: string;
  crawlData: CrawlData;
  serpData: SerpData;
  recommendations: AnalysisRecommendation[];
  siteSize: SiteSize;
  complexityScore: number;
  analyzedAt: string;
}

// =============================================================================
// Questionnaire Types
// =============================================================================

export type PrimaryGoal = 'leads' | 'sales' | 'brand' | 'local';

export type TargetMarket = 'local' | 'national' | 'international';

export type BudgetRange =
  | 'under_1000'
  | '1000_2500'
  | '2500_5000'
  | '5000_10000'
  | '10000_25000'
  | 'over_25000';

export interface QuestionnaireResponses {
  primaryGoal: PrimaryGoal;
  targetMarket: TargetMarket;
  budgetRange: BudgetRange;
  customerValue?: number;
  currentMonthlyLeads?: number;
  hasExistingContent?: boolean;
  competitorDomains?: string[];
}

// =============================================================================
// Pricing Types
// =============================================================================

export interface PricingFactors {
  siteSize: SiteSize;
  complexityScore: number;
  competitionLevel: CompetitionLevel;
  urgency: 'standard' | 'expedited';
  region?: string;
  appliedMultipliers: Array<{
    name: string;
    value: number;
    reason: string;
  }>;
}

export interface QuoteLineItem {
  moduleId: string;
  moduleName: string;
  category: ServiceCategory;
  quantity: number;
  unitPriceMin: number;
  unitPriceMax: number;
  appliedMultiplier: number;
  totalMin: number;
  totalMax: number;
  isRecurring: boolean;
  recurringInterval?: RecurringInterval;
  deliverables: string[];
}

// =============================================================================
// KPI Projection Types
// =============================================================================

export interface KpiProjection {
  metric: string;
  label: string;
  current: number | null;
  projectedMin: number;
  projectedMax: number;
  confidence: number;
  timeframeMonths: number;
  unit?: string;
}

export interface RoiCalculation {
  customerValue: number;
  currentMonthlyLeads: number;
  projectedAdditionalLeadsMin: number;
  projectedAdditionalLeadsMax: number;
  projectedRevenueMin: number;
  projectedRevenueMax: number;
  investmentTotal: number;
  roiMin: number;
  roiMax: number;
  paybackMonthsMin: number;
  paybackMonthsMax: number;
}

// =============================================================================
// Quote Types
// =============================================================================

export interface Quote {
  id: string;
  organizationId: string;
  createdBy: string;

  // Client info
  clientName: string;
  clientEmail?: string;
  clientCompany?: string;
  clientDomain?: string;

  // Analysis
  analysisData?: UrlAnalysisResult;
  questionnaireResponses: QuestionnaireResponses;

  // Quote details
  selectedPackageId?: string;
  lineItems: QuoteLineItem[];
  pricingFactors: PricingFactors;
  subtotal: number;
  discountPercent: number;
  totalMin: number;
  totalMax: number;
  kpiProjections: KpiProjection[];
  roiCalculation?: RoiCalculation;

  // Status tracking
  status: QuoteStatus;
  sentAt?: string;
  viewedAt?: string;
  respondedAt?: string;
  validUntil?: string;

  // Versioning
  version: number;
  parentQuoteId?: string;

  // Notes
  notes?: string;
  internalNotes?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface QuoteActivity {
  id: string;
  quoteId: string;
  activityType: QuoteActivityType;
  details?: Record<string, unknown>;
  createdBy?: string;
  createdAt: string;
}

// =============================================================================
// Quote Summary Types (for lists)
// =============================================================================

export interface QuoteSummary {
  id: string;
  clientName: string;
  clientCompany?: string;
  clientDomain?: string;
  totalMin: number;
  totalMax: number;
  status: QuoteStatus;
  version: number;
  createdAt: string;
  validUntil?: string;
}

// =============================================================================
// Wizard State Types
// =============================================================================

export type QuotationWizardStep =
  | 'url_input'
  | 'analysis_result'
  | 'questionnaire'
  | 'package_selection'
  | 'module_customization'
  | 'quote_preview';

export interface QuotationWizardState {
  currentStep: QuotationWizardStep;
  url: string;
  isAnalyzing: boolean;
  analysisResult?: UrlAnalysisResult;
  questionnaireResponses: Partial<QuestionnaireResponses>;
  selectedPackageId?: string;
  selectedModuleIds: string[];
  customizations: Record<string, unknown>;
  clientInfo: {
    name: string;
    email: string;
    company: string;
  };
  generatedQuote?: Quote;
}

// =============================================================================
// Filter Types
// =============================================================================

export interface QuoteFilters {
  status?: QuoteStatus[];
  clientDomain?: string;
  dateFrom?: string;
  dateTo?: string;
  minTotal?: number;
  maxTotal?: number;
  searchQuery?: string;
}

// =============================================================================
// Export Types
// =============================================================================

export interface QuoteExportOptions {
  format: 'pdf' | 'html';
  includeAnalysis: boolean;
  includeKpiProjections: boolean;
  includeRoi: boolean;
  includeTerms: boolean;
  currency?: CurrencyCode;
  brandingOptions?: {
    logoUrl?: string;
    primaryColor?: string;
    companyName?: string;
  };
}

// =============================================================================
// Database Record Types (snake_case for Supabase)
// =============================================================================

export interface ServiceModuleRecord {
  id: string;
  category: ServiceCategory;
  name: string;
  description: string | null;
  base_price_min: number;
  base_price_max: number;
  is_recurring: boolean;
  recurring_interval: RecurringInterval | null;
  kpi_contributions: KpiContribution[];
  deliverables: string[];
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuotationPackageRecord {
  id: string;
  name: string;
  description: string | null;
  included_modules: string[];
  base_price: number;
  discount_percent: number;
  target_site_sizes: SiteSize[];
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface QuoteRecord {
  id: string;
  organization_id: string;
  created_by: string;
  client_name: string | null;
  client_email: string | null;
  client_company: string | null;
  client_domain: string | null;
  analysis_data: UrlAnalysisResult | null;
  questionnaire_responses: QuestionnaireResponses | null;
  selected_package_id: string | null;
  line_items: QuoteLineItem[];
  pricing_factors: PricingFactors | null;
  subtotal: number | null;
  discount_percent: number;
  total_min: number | null;
  total_max: number | null;
  kpi_projections: KpiProjection[];
  roi_calculation: RoiCalculation | null;
  status: QuoteStatus;
  sent_at: string | null;
  viewed_at: string | null;
  responded_at: string | null;
  valid_until: string | null;
  version: number;
  parent_quote_id: string | null;
  notes: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuoteActivityRecord {
  id: string;
  quote_id: string;
  activity_type: QuoteActivityType;
  details: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
}

// =============================================================================
// Utility Functions for Type Conversion
// =============================================================================

export function toServiceModule(record: ServiceModuleRecord): ServiceModule {
  return {
    id: record.id,
    category: record.category,
    name: record.name,
    description: record.description ?? '',
    basePriceMin: record.base_price_min,
    basePriceMax: record.base_price_max,
    isRecurring: record.is_recurring,
    recurringInterval: record.recurring_interval ?? undefined,
    kpiContributions: record.kpi_contributions,
    deliverables: record.deliverables,
    displayOrder: record.display_order,
    isActive: record.is_active,
  };
}

export function toQuotationPackage(record: QuotationPackageRecord): QuotationPackage {
  return {
    id: record.id,
    name: record.name,
    description: record.description ?? '',
    includedModules: record.included_modules,
    basePrice: record.base_price,
    discountPercent: record.discount_percent,
    targetSiteSizes: record.target_site_sizes,
    isActive: record.is_active,
    displayOrder: record.display_order,
  };
}

export function toQuote(record: QuoteRecord): Quote {
  return {
    id: record.id,
    organizationId: record.organization_id,
    createdBy: record.created_by,
    clientName: record.client_name ?? '',
    clientEmail: record.client_email ?? undefined,
    clientCompany: record.client_company ?? undefined,
    clientDomain: record.client_domain ?? undefined,
    analysisData: record.analysis_data ?? undefined,
    questionnaireResponses: record.questionnaire_responses ?? {
      primaryGoal: 'leads',
      targetMarket: 'local',
      budgetRange: 'under_1000',
    },
    selectedPackageId: record.selected_package_id ?? undefined,
    lineItems: record.line_items,
    pricingFactors: record.pricing_factors ?? {
      siteSize: 'small',
      complexityScore: 1,
      competitionLevel: 'low',
      urgency: 'standard',
      appliedMultipliers: [],
    },
    subtotal: record.subtotal ?? 0,
    discountPercent: record.discount_percent,
    totalMin: record.total_min ?? 0,
    totalMax: record.total_max ?? 0,
    kpiProjections: record.kpi_projections,
    roiCalculation: record.roi_calculation ?? undefined,
    status: record.status,
    sentAt: record.sent_at ?? undefined,
    viewedAt: record.viewed_at ?? undefined,
    respondedAt: record.responded_at ?? undefined,
    validUntil: record.valid_until ?? undefined,
    version: record.version,
    parentQuoteId: record.parent_quote_id ?? undefined,
    notes: record.notes ?? undefined,
    internalNotes: record.internal_notes ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export function toQuoteActivity(record: QuoteActivityRecord): QuoteActivity {
  return {
    id: record.id,
    quoteId: record.quote_id,
    activityType: record.activity_type,
    details: record.details ?? undefined,
    createdBy: record.created_by ?? undefined,
    createdAt: record.created_at,
  };
}
