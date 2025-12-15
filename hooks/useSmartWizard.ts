// hooks/useSmartWizard.ts
// Smart Wizard hook for managing business research state

import { useState, useCallback } from 'react';
import { BusinessInfo } from '../types';
import { useAppState } from '../state/appState';
import {
  researchBusiness,
  detectInputType,
  BusinessResearchResult,
} from '../services/ai/businessResearch';

export interface SmartWizardState {
  input: string;
  isResearching: boolean;
  result: BusinessResearchResult | null;
  error: string | null;
  appliedFields: Set<string>;
}

export interface UseSmartWizardReturn {
  // State
  input: string;
  setInput: (value: string) => void;
  isResearching: boolean;
  result: BusinessResearchResult | null;
  error: string | null;
  appliedFields: Set<string>;

  // Actions
  research: () => Promise<BusinessResearchResult | null>;
  applySuggestions: (
    currentValues: Partial<BusinessInfo>,
    setValues: (values: Partial<BusinessInfo>) => void
  ) => void;
  clearResult: () => void;
  isFieldSuggested: (fieldName: string) => boolean;
  markFieldEdited: (fieldName: string) => void;
}

export const useSmartWizard = (): UseSmartWizardReturn => {
  const { state, dispatch } = useAppState();
  const [input, setInput] = useState('');
  const [isResearching, setIsResearching] = useState(false);
  const [result, setResult] = useState<BusinessResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appliedFields, setAppliedFields] = useState<Set<string>>(new Set());

  const research = useCallback(async (): Promise<BusinessResearchResult | null> => {
    if (!input.trim()) {
      setError('Please enter a business name, URL, or description.');
      return null;
    }

    setIsResearching(true);
    setError(null);
    setResult(null);

    try {
      const researchResult = await researchBusiness(
        input.trim(),
        state.businessInfo,
        dispatch
      );

      setResult(researchResult);

      // Check for warnings
      if (researchResult.warnings.length > 0 && researchResult.confidence === 'low') {
        setError(researchResult.warnings.join(' '));
      }

      return researchResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Research failed. Please try again.';
      setError(message);
      return null;
    } finally {
      setIsResearching(false);
    }
  }, [input, state.businessInfo, dispatch]);

  const applySuggestions = useCallback(
    (
      currentValues: Partial<BusinessInfo>,
      setValues: (values: Partial<BusinessInfo>) => void
    ) => {
      if (!result?.suggestions) return;

      const suggestions = result.suggestions;
      const newValues = { ...currentValues };
      const newAppliedFields = new Set<string>();

      // Apply each suggested field if it has a value
      const fieldsToApply: (keyof BusinessInfo)[] = [
        'seedKeyword',
        'industry',
        'valueProp',
        'audience',
        'language',
        'targetMarket',
      ];

      for (const field of fieldsToApply) {
        const suggestedValue = suggestions[field];
        if (suggestedValue && String(suggestedValue).trim()) {
          // Only apply if the current value is empty or user hasn't edited it
          if (!currentValues[field] || !String(currentValues[field]).trim()) {
            (newValues as any)[field] = suggestedValue;
            newAppliedFields.add(field);
          }
        }
      }

      // Handle author profile separately
      if (suggestions.authorName || suggestions.authorBio || suggestions.authorCredentials) {
        const currentProfile = currentValues.authorProfile || {
          name: '',
          bio: '',
          credentials: '',
          socialUrls: [],
          stylometry: 'INSTRUCTIONAL_CLEAR' as const,
          customStylometryRules: [],
        };

        newValues.authorProfile = {
          ...currentProfile,
          name: suggestions.authorName || currentProfile.name,
          bio: suggestions.authorBio || currentProfile.bio,
          credentials: suggestions.authorCredentials || currentProfile.credentials,
        };

        if (suggestions.authorName) newAppliedFields.add('authorProfile.name');
        if (suggestions.authorBio) newAppliedFields.add('authorProfile.bio');
        if (suggestions.authorCredentials) newAppliedFields.add('authorProfile.credentials');
      }

      setValues(newValues);
      setAppliedFields(newAppliedFields);
    },
    [result]
  );

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
    setAppliedFields(new Set());
  }, []);

  const isFieldSuggested = useCallback(
    (fieldName: string): boolean => {
      return appliedFields.has(fieldName);
    },
    [appliedFields]
  );

  const markFieldEdited = useCallback((fieldName: string) => {
    setAppliedFields((prev) => {
      const newSet = new Set(prev);
      newSet.delete(fieldName);
      return newSet;
    });
  }, []);

  return {
    input,
    setInput,
    isResearching,
    result,
    error,
    appliedFields,
    research,
    applySuggestions,
    clearResult,
    isFieldSuggested,
    markFieldEdited,
  };
};
