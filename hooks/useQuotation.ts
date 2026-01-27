/**
 * useQuotation Hook
 *
 * Manages the quotation wizard state, URL analysis, module selection,
 * and quote generation.
 */

import { useState, useCallback, useMemo } from 'react';
import { useAppState } from '../state/appState';
import {
  Quote,
  QuotationWizardStep,
  QuotationWizardState,
  QuestionnaireResponses,
  QuoteLineItem,
  ServiceModule,
  UrlAnalysisResult,
  PricingFactors,
  KpiProjection,
  RoiCalculation,
  QuoteStatus,
  PrimaryGoal,
  TargetMarket,
  BudgetRange,
} from '../types/quotation';
import {
  analyzeUrlForQuotation,
  quickAnalyzeUrl,
  UrlAnalysisConfig,
  AnalysisProgress,
  buildPricingFactors,
  generateQuoteLineItems,
  getModulesFromIds,
  calculateQuoteTotal,
  calculateKpiProjections,
  calculateRoi,
  PricingContext,
} from '../services/quotation';
import { getPackageById, getRecommendedPackage } from '../config/quotation/packages';
import { SERVICE_MODULES } from '../config/quotation/modules';

// =============================================================================
// Types
// =============================================================================

export interface UseQuotationReturn {
  // State
  wizardState: QuotationWizardState;
  currentStep: QuotationWizardStep;
  isAnalyzing: boolean;
  analysisProgress: AnalysisProgress | null;
  error: string | null;

  // Navigation
  goToStep: (step: QuotationWizardStep) => void;
  goNext: () => void;
  goBack: () => void;
  canGoNext: boolean;
  canGoBack: boolean;

  // URL Analysis
  setUrl: (url: string) => void;
  startAnalysis: () => Promise<void>;
  useQuickAnalysis: () => void;

  // Questionnaire
  setQuestionnaireResponse: <K extends keyof QuestionnaireResponses>(
    key: K,
    value: QuestionnaireResponses[K]
  ) => void;

  // Package & Module Selection
  selectPackage: (packageId: string) => void;
  toggleModule: (moduleId: string) => void;
  setModules: (moduleIds: string[]) => void;
  clearPackageSelection: () => void;

  // Client Info
  setClientInfo: (info: Partial<QuotationWizardState['clientInfo']>) => void;

  // Quote Generation
  generateQuote: () => Quote | null;
  lineItems: QuoteLineItem[];
  quoteTotal: ReturnType<typeof calculateQuoteTotal> | null;
  kpiProjections: KpiProjection[];
  roiCalculation: RoiCalculation | null;

  // Available Data
  availableModules: ServiceModule[];
  selectedModules: ServiceModule[];
  recommendedPackageId: string | null;

  // Reset
  resetWizard: () => void;
}

// =============================================================================
// Step Flow
// =============================================================================

const STEP_ORDER: QuotationWizardStep[] = [
  'url_input',
  'analysis_result',
  'questionnaire',
  'package_selection',
  'module_customization',
  'quote_preview',
];

function getNextStep(current: QuotationWizardStep): QuotationWizardStep | null {
  const index = STEP_ORDER.indexOf(current);
  if (index < 0 || index >= STEP_ORDER.length - 1) return null;
  return STEP_ORDER[index + 1];
}

function getPrevStep(current: QuotationWizardStep): QuotationWizardStep | null {
  const index = STEP_ORDER.indexOf(current);
  if (index <= 0) return null;
  return STEP_ORDER[index - 1];
}

// =============================================================================
// Initial State
// =============================================================================

const initialWizardState: QuotationWizardState = {
  currentStep: 'url_input',
  url: '',
  isAnalyzing: false,
  analysisResult: undefined,
  questionnaireResponses: {},
  selectedPackageId: undefined,
  selectedModuleIds: [],
  customizations: {},
  clientInfo: {
    name: '',
    email: '',
    company: '',
  },
  generatedQuote: undefined,
};

// =============================================================================
// Hook
// =============================================================================

export function useQuotation(): UseQuotationReturn {
  const { state } = useAppState();

  // Wizard state
  const [wizardState, setWizardState] = useState<QuotationWizardState>(initialWizardState);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ==========================================================================
  // Navigation
  // ==========================================================================

  const goToStep = useCallback((step: QuotationWizardStep) => {
    setWizardState((prev) => ({ ...prev, currentStep: step }));
    setError(null);
  }, []);

  const canGoNext = useMemo(() => {
    const { currentStep, url, analysisResult, questionnaireResponses, selectedModuleIds } = wizardState;

    switch (currentStep) {
      case 'url_input':
        return url.trim().length > 0;
      case 'analysis_result':
        return !!analysisResult;
      case 'questionnaire':
        return !!(
          questionnaireResponses.primaryGoal &&
          questionnaireResponses.targetMarket &&
          questionnaireResponses.budgetRange
        );
      case 'package_selection':
        return true; // Can always proceed (customize option)
      case 'module_customization':
        return selectedModuleIds.length > 0;
      case 'quote_preview':
        return false; // Final step
      default:
        return false;
    }
  }, [wizardState]);

  const canGoBack = useMemo(() => {
    return STEP_ORDER.indexOf(wizardState.currentStep) > 0;
  }, [wizardState.currentStep]);

  const goNext = useCallback(() => {
    const nextStep = getNextStep(wizardState.currentStep);
    if (nextStep && canGoNext) {
      // Skip module_customization if a package is selected and user hasn't requested customize
      if (nextStep === 'module_customization' && wizardState.selectedPackageId) {
        goToStep('quote_preview');
      } else {
        goToStep(nextStep);
      }
    }
  }, [wizardState.currentStep, wizardState.selectedPackageId, canGoNext, goToStep]);

  const goBack = useCallback(() => {
    const prevStep = getPrevStep(wizardState.currentStep);
    if (prevStep) {
      // Skip module_customization when going back if package was selected
      if (wizardState.currentStep === 'quote_preview' && wizardState.selectedPackageId) {
        goToStep('package_selection');
      } else {
        goToStep(prevStep);
      }
    }
  }, [wizardState.currentStep, wizardState.selectedPackageId, goToStep]);

  // ==========================================================================
  // URL & Analysis
  // ==========================================================================

  const setUrl = useCallback((url: string) => {
    setWizardState((prev) => ({ ...prev, url }));
  }, []);

  const startAnalysis = useCallback(async () => {
    if (!wizardState.url.trim()) return;

    // Check if API keys are configured
    const hasApifyKey = !!state.businessInfo.apifyToken;

    if (!hasApifyKey) {
      setError(
        'Full analysis requires API keys. Please configure your Apify API key in Settings, or use "Quick Estimate" for instant results based on URL patterns.'
      );
      return;
    }

    setWizardState((prev) => ({ ...prev, isAnalyzing: true }));
    setError(null);
    setAnalysisProgress(null);

    try {
      const config: UrlAnalysisConfig = {
        apifyToken: state.businessInfo.apifyToken,
        jinaApiKey: state.businessInfo.jinaApiKey,
        serpMode: 'fast',
        maxPagesToAnalyze: 25,
      };

      const result = await analyzeUrlForQuotation(
        wizardState.url,
        config,
        state.businessInfo,
        (progress) => setAnalysisProgress(progress)
      );

      setWizardState((prev) => ({
        ...prev,
        isAnalyzing: false,
        analysisResult: result,
        clientInfo: {
          ...prev.clientInfo,
          company: result.domain,
        },
      }));

      // Auto-advance to next step
      goToStep('analysis_result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Try using "Quick Estimate" instead.');
      setWizardState((prev) => ({ ...prev, isAnalyzing: false }));
    }
  }, [wizardState.url, state.businessInfo, goToStep]);

  const useQuickAnalysis = useCallback(() => {
    if (!wizardState.url.trim()) return;

    const result = quickAnalyzeUrl(wizardState.url);
    setWizardState((prev) => ({
      ...prev,
      analysisResult: result,
      clientInfo: {
        ...prev.clientInfo,
        company: result.domain,
      },
    }));
    goToStep('analysis_result');
  }, [wizardState.url, goToStep]);

  // ==========================================================================
  // Questionnaire
  // ==========================================================================

  const setQuestionnaireResponse = useCallback(
    <K extends keyof QuestionnaireResponses>(key: K, value: QuestionnaireResponses[K]) => {
      setWizardState((prev) => ({
        ...prev,
        questionnaireResponses: {
          ...prev.questionnaireResponses,
          [key]: value,
        },
      }));
    },
    []
  );

  // ==========================================================================
  // Package & Module Selection
  // ==========================================================================

  const selectPackage = useCallback((packageId: string) => {
    const pkg = getPackageById(packageId);
    if (pkg) {
      setWizardState((prev) => ({
        ...prev,
        selectedPackageId: packageId,
        selectedModuleIds: pkg.includedModules,
      }));
    }
  }, []);

  const toggleModule = useCallback((moduleId: string) => {
    setWizardState((prev) => {
      const isSelected = prev.selectedModuleIds.includes(moduleId);
      return {
        ...prev,
        selectedModuleIds: isSelected
          ? prev.selectedModuleIds.filter((id) => id !== moduleId)
          : [...prev.selectedModuleIds, moduleId],
        selectedPackageId: undefined, // Clear package when customizing
      };
    });
  }, []);

  const setModules = useCallback((moduleIds: string[]) => {
    setWizardState((prev) => ({
      ...prev,
      selectedModuleIds: moduleIds,
      selectedPackageId: undefined,
    }));
  }, []);

  const clearPackageSelection = useCallback(() => {
    setWizardState((prev) => ({
      ...prev,
      selectedPackageId: undefined,
      selectedModuleIds: [],
    }));
  }, []);

  // ==========================================================================
  // Client Info
  // ==========================================================================

  const setClientInfo = useCallback(
    (info: Partial<QuotationWizardState['clientInfo']>) => {
      setWizardState((prev) => ({
        ...prev,
        clientInfo: { ...prev.clientInfo, ...info },
      }));
    },
    []
  );

  // ==========================================================================
  // Computed Values
  // ==========================================================================

  const availableModules = useMemo((): ServiceModule[] => {
    return SERVICE_MODULES.filter((m) => m.isActive).map((m) => ({
      ...m,
      id: m.id,
    }));
  }, []);

  const selectedModules = useMemo((): ServiceModule[] => {
    return getModulesFromIds(wizardState.selectedModuleIds);
  }, [wizardState.selectedModuleIds]);

  const recommendedPackageId = useMemo((): string | null => {
    if (!wizardState.analysisResult) return null;
    const hasLocalFocus = wizardState.questionnaireResponses.targetMarket === 'local' ||
                          wizardState.questionnaireResponses.primaryGoal === 'local';
    const recommended = getRecommendedPackage(
      wizardState.analysisResult.siteSize,
      hasLocalFocus,
      wizardState.questionnaireResponses.budgetRange
    );
    return recommended?.id || null;
  }, [wizardState.analysisResult, wizardState.questionnaireResponses]);

  // Pricing context
  const pricingContext = useMemo((): PricingContext | null => {
    if (!wizardState.analysisResult) return null;
    return {
      siteSize: wizardState.analysisResult.siteSize,
      complexityScore: wizardState.analysisResult.complexityScore,
      competitionLevel: wizardState.analysisResult.serpData.competitionLevel,
      urgency: 'standard',
    };
  }, [wizardState.analysisResult]);

  // Line items
  const lineItems = useMemo((): QuoteLineItem[] => {
    if (!pricingContext || wizardState.selectedModuleIds.length === 0) return [];
    return generateQuoteLineItems(wizardState.selectedModuleIds, pricingContext);
  }, [wizardState.selectedModuleIds, pricingContext]);

  // Quote total
  const quoteTotal = useMemo(() => {
    if (lineItems.length === 0) return null;
    const pkg = wizardState.selectedPackageId
      ? getPackageById(wizardState.selectedPackageId)
      : null;
    return calculateQuoteTotal(lineItems, pkg?.discountPercent || 0);
  }, [lineItems, wizardState.selectedPackageId]);

  // KPI projections
  const kpiProjections = useMemo((): KpiProjection[] => {
    if (selectedModules.length === 0) return [];
    return calculateKpiProjections(selectedModules, wizardState.analysisResult);
  }, [selectedModules, wizardState.analysisResult]);

  // ROI calculation
  const roiCalculation = useMemo((): RoiCalculation | null => {
    if (!quoteTotal || !wizardState.questionnaireResponses.customerValue) return null;
    return calculateRoi(
      (quoteTotal.totalMin + quoteTotal.totalMax) / 2,
      kpiProjections,
      wizardState.questionnaireResponses.customerValue,
      wizardState.questionnaireResponses.currentMonthlyLeads || 0
    );
  }, [quoteTotal, kpiProjections, wizardState.questionnaireResponses]);

  // ==========================================================================
  // Quote Generation
  // ==========================================================================

  const generateQuote = useCallback((): Quote | null => {
    if (!wizardState.analysisResult || !pricingContext || lineItems.length === 0 || !quoteTotal) {
      return null;
    }

    const pricingFactors = buildPricingFactors(
      wizardState.analysisResult,
      'standard'
    );

    const quote: Quote = {
      id: crypto.randomUUID(),
      organizationId: '', // Will be set when saving
      createdBy: state.user?.id || '',
      clientName: wizardState.clientInfo.name || wizardState.clientInfo.company,
      clientEmail: wizardState.clientInfo.email || undefined,
      clientCompany: wizardState.clientInfo.company || undefined,
      clientDomain: wizardState.analysisResult.domain,
      analysisData: wizardState.analysisResult,
      questionnaireResponses: wizardState.questionnaireResponses as QuestionnaireResponses,
      selectedPackageId: wizardState.selectedPackageId,
      lineItems,
      pricingFactors,
      subtotal: quoteTotal.subtotal,
      discountPercent: wizardState.selectedPackageId
        ? getPackageById(wizardState.selectedPackageId)?.discountPercent || 0
        : 0,
      totalMin: quoteTotal.totalMin,
      totalMax: quoteTotal.totalMax,
      kpiProjections,
      roiCalculation: roiCalculation || undefined,
      status: 'draft' as QuoteStatus,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setWizardState((prev) => ({ ...prev, generatedQuote: quote }));
    return quote;
  }, [
    wizardState,
    pricingContext,
    lineItems,
    quoteTotal,
    kpiProjections,
    roiCalculation,
    state.user,
  ]);

  // ==========================================================================
  // Reset
  // ==========================================================================

  const resetWizard = useCallback(() => {
    setWizardState(initialWizardState);
    setAnalysisProgress(null);
    setError(null);
  }, []);

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    // State
    wizardState,
    currentStep: wizardState.currentStep,
    isAnalyzing: wizardState.isAnalyzing,
    analysisProgress,
    error,

    // Navigation
    goToStep,
    goNext,
    goBack,
    canGoNext,
    canGoBack,

    // URL Analysis
    setUrl,
    startAnalysis,
    useQuickAnalysis,

    // Questionnaire
    setQuestionnaireResponse,

    // Package & Module Selection
    selectPackage,
    toggleModule,
    setModules,
    clearPackageSelection,

    // Client Info
    setClientInfo,

    // Quote Generation
    generateQuote,
    lineItems,
    quoteTotal,
    kpiProjections,
    roiCalculation,

    // Available Data
    availableModules,
    selectedModules,
    recommendedPackageId,

    // Reset
    resetWizard,
  };
}
