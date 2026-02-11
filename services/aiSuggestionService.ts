// services/aiSuggestionService.ts
// AI-powered suggestions for audit tasks with human-in-the-loop workflow

import { SupabaseClient } from '@supabase/supabase-js';
import {
  AuditTask,
  AISuggestion,
  BusinessInfo,
  SitePageRecord,
  SiteAnalysisProject,
} from '../types';
import * as prompts from '../config/prompts';
import { GENERATE_CONTEXT_AWARE_TASK_SUGGESTION_PROMPT } from '../config/prompts';
import { AIResponseSanitizer } from './aiResponseSanitizer';
import { AppAction } from '../state/appState';
import { isValidModel, getDefaultModel } from '../config/serviceRegistry';
import React from 'react';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface SuggestionGenerationResult {
  suggestedValue: string;
  confidence: number;
  reasoning: string;
}

interface BatchSuggestionResult {
  sequence: number;
  suggestedValue: string;
  confidence: number;
  reasoning: string;
}

// ============================================
// AI API CALL
// ============================================

/**
 * Call AI API via Supabase Edge Function proxy (same pattern as anthropicService)
 */
const callSuggestionApi = async (
  prompt: string,
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<AppAction>
): Promise<SuggestionGenerationResult> => {
  dispatch({
    type: 'LOG_EVENT',
    payload: {
      service: 'AISuggestions',
      message: `Generating suggestion with ${businessInfo.aiModel}...`,
      status: 'info',
      timestamp: Date.now(),
    },
  });

  if (!businessInfo.anthropicApiKey) {
    throw new Error('Anthropic API key is not configured.');
  }

  if (!businessInfo.supabaseUrl) {
    throw new Error('Supabase URL is not configured. Required for AI proxy.');
  }

  const effectivePrompt = `${prompt}\n\nIMPORTANT: Return ONLY a valid JSON object. Do not include any explanation.`;
  const proxyUrl = `${businessInfo.supabaseUrl}/functions/v1/anthropic-proxy`;

  // Use Claude model
  const modelToUse = (businessInfo.aiModel && isValidModel('anthropic', businessInfo.aiModel))
      ? businessInfo.aiModel : getDefaultModel('anthropic');

  try {
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-anthropic-api-key': businessInfo.anthropicApiKey,
        'apikey': businessInfo.supabaseAnonKey || '',
        'Authorization': `Bearer ${businessInfo.supabaseAnonKey || ''}`,
      },
      body: JSON.stringify({
        model: modelToUse,
        max_tokens: 2048,
        messages: [{ role: 'user', content: effectivePrompt }],
        system: 'You are an expert SEO consultant. Generate specific, actionable remediation suggestions for audit issues. Output strict JSON when requested.',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    // Extract text from Claude response
    const textBlock = data.content?.[0];
    const responseText = textBlock?.type === 'text' ? textBlock.text : '';

    // Parse and validate response
    const sanitizer = new AIResponseSanitizer(dispatch);
    const result = sanitizer.sanitize<SuggestionGenerationResult>(
      responseText,
      { suggestedValue: String, confidence: Number, reasoning: String },
      { suggestedValue: '', confidence: 50, reasoning: '' }
    );

    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'AISuggestions',
        message: `Suggestion generated (confidence: ${result.confidence}%)`,
        status: 'success',
        timestamp: Date.now(),
      },
    });

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'AISuggestions',
        message: `Error: ${message}`,
        status: 'failure',
        timestamp: Date.now(),
        data: error,
      },
    });
    throw new Error(`AI Suggestion Failed: ${message}`);
  }
};

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Generate AI suggestion for a single audit task
 */
export const generateSuggestionForTask = async (
  supabase: SupabaseClient,
  task: AuditTask,
  page: SitePageRecord | null,
  project: SiteAnalysisProject,
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<AppAction>
): Promise<AISuggestion> => {
  // Build prompt context
  const taskContext = {
    ruleId: task.ruleId,
    title: task.title,
    description: task.description,
    remediation: task.remediation,
    priority: task.priority,
    phase: task.phase,
  };

  const pageContext = {
    url: page?.url || '',
    title: page?.title || undefined,
    h1: page?.h1 || undefined,
    contentMarkdown: page?.contentMarkdown || undefined,
  };

  const projectContext = {
    domain: project.domain,
    centralEntity: project.centralEntity || undefined,
    sourceContext: project.sourceContext || undefined,
    centralSearchIntent: project.centralSearchIntent || undefined,
  };

  // Generate prompt and call AI
  const prompt = prompts.GENERATE_TASK_SUGGESTION_PROMPT(taskContext, pageContext, projectContext);
  const result = await callSuggestionApi(prompt, businessInfo, dispatch);

  // Prepare suggestion record
  const suggestionData = {
    task_id: task.id,
    project_id: project.id,
    page_id: task.pageId || null,
    original_value: task.remediation,
    suggested_value: result.suggestedValue,
    confidence: Math.round(result.confidence),
    reasoning: result.reasoning,
    model_used: businessInfo.aiModel || 'claude-sonnet-4-5-20250929',
    status: 'pending' as const,
  };

  // Insert into database
  const { data: inserted, error } = await supabase
    .from('ai_suggestions')
    .insert(suggestionData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save suggestion: ${error.message}`);
  }

  // Update task has_ai_suggestion flag
  await supabase
    .from('audit_tasks')
    .update({ has_ai_suggestion: true })
    .eq('id', task.id);

  return mapDbToSuggestion(inserted);
};

/**
 * Get existing suggestion for a task
 */
export const getSuggestionForTask = async (
  supabase: SupabaseClient,
  taskId: string
): Promise<AISuggestion | null> => {
  const { data, error } = await supabase
    .from('ai_suggestions')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return mapDbToSuggestion(data);
};

/**
 * Get all pending suggestions for a page
 */
export const getPendingSuggestionsForPage = async (
  supabase: SupabaseClient,
  pageId: string
): Promise<AISuggestion[]> => {
  const { data, error } = await supabase
    .from('ai_suggestions')
    .select('*')
    .eq('page_id', pageId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map(mapDbToSuggestion);
};

/**
 * Get all suggestions (any status) for multiple task IDs
 * Returns the most recent suggestion per task
 */
export const getAllSuggestionsForTasks = async (
  supabase: SupabaseClient,
  taskIds: string[]
): Promise<Map<string, AISuggestion>> => {
  if (taskIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('ai_suggestions')
    .select('*')
    .in('task_id', taskIds)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return new Map();
  }

  // Build map with most recent suggestion per task
  const resultMap = new Map<string, AISuggestion>();
  const seenTaskIds = new Set<string>();

  for (const row of data) {
    if (seenTaskIds.has(row.task_id)) continue; // Skip older suggestions
    seenTaskIds.add(row.task_id);
    resultMap.set(row.task_id, mapDbToSuggestion(row));
  }

  return resultMap;
};

/**
 * Approve a suggestion (with optional user modifications)
 */
export const approveSuggestion = async (
  supabase: SupabaseClient,
  suggestionId: string,
  modifiedValue?: string
): Promise<void> => {
  const updateData: any = {
    status: 'approved',
    approved_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (modifiedValue) {
    updateData.user_modified_value = modifiedValue;
  }

  const { error } = await supabase
    .from('ai_suggestions')
    .update(updateData)
    .eq('id', suggestionId);

  if (error) {
    throw new Error(`Failed to approve suggestion: ${error.message}`);
  }
};

/**
 * Reject a suggestion with optional reason
 */
export const rejectSuggestion = async (
  supabase: SupabaseClient,
  suggestionId: string,
  reason?: string
): Promise<void> => {
  const { error } = await supabase
    .from('ai_suggestions')
    .update({
      status: 'rejected',
      rejection_reason: reason || null,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', suggestionId);

  if (error) {
    throw new Error(`Failed to reject suggestion: ${error.message}`);
  }
};

/**
 * Apply an approved suggestion to its task
 * Updates the task's remediation field with the final value
 */
export const applySuggestionToTask = async (
  supabase: SupabaseClient,
  suggestionId: string
): Promise<void> => {
  // Get the suggestion
  const { data: suggestion, error: fetchError } = await supabase
    .from('ai_suggestions')
    .select('*')
    .eq('id', suggestionId)
    .single();

  if (fetchError || !suggestion) {
    throw new Error('Suggestion not found');
  }

  if (suggestion.status !== 'approved') {
    throw new Error('Only approved suggestions can be applied');
  }

  // Determine final remediation value
  const finalRemediation = suggestion.user_modified_value || suggestion.suggested_value;

  // Update the task
  const { error: taskError } = await supabase
    .from('audit_tasks')
    .update({
      remediation: finalRemediation,
      updated_at: new Date().toISOString(),
    })
    .eq('id', suggestion.task_id);

  if (taskError) {
    throw new Error(`Failed to update task: ${taskError.message}`);
  }

  // Mark suggestion as applied
  const { error: suggestionError } = await supabase
    .from('ai_suggestions')
    .update({
      status: 'applied',
      updated_at: new Date().toISOString(),
    })
    .eq('id', suggestionId);

  if (suggestionError) {
    throw new Error(`Failed to mark suggestion as applied: ${suggestionError.message}`);
  }
};

/**
 * Delete a suggestion
 */
export const deleteSuggestion = async (
  supabase: SupabaseClient,
  suggestionId: string
): Promise<void> => {
  // Get the task ID first
  const { data: suggestion } = await supabase
    .from('ai_suggestions')
    .select('task_id')
    .eq('id', suggestionId)
    .single();

  // Delete the suggestion
  const { error } = await supabase
    .from('ai_suggestions')
    .delete()
    .eq('id', suggestionId);

  if (error) {
    throw new Error(`Failed to delete suggestion: ${error.message}`);
  }

  // Check if task has other suggestions, update flag if not
  if (suggestion?.task_id) {
    const { data: remainingSuggestions } = await supabase
      .from('ai_suggestions')
      .select('id')
      .eq('task_id', suggestion.task_id)
      .limit(1);

    if (!remainingSuggestions || remainingSuggestions.length === 0) {
      await supabase
        .from('audit_tasks')
        .update({ has_ai_suggestion: false })
        .eq('id', suggestion.task_id);
    }
  }
};

// ============================================
// BATCH OPERATIONS
// ============================================

/**
 * Context-aware suggestion generation for batch processing
 * Accumulates previous suggestions and passes them as context to ensure consistency
 */
const generateContextAwareSuggestion = async (
  supabase: SupabaseClient,
  task: AuditTask,
  page: SitePageRecord | null,
  project: SiteAnalysisProject,
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<AppAction>,
  previousSuggestions: Array<{
    ruleId: string;
    title: string;
    suggestedValue: string;
    reasoning: string;
  }>
): Promise<AISuggestion> => {
  // Build task context
  const taskContext = {
    ruleId: task.ruleId,
    title: task.title,
    description: task.description,
    remediation: task.remediation,
    priority: task.priority,
    phase: task.phase,
  };

  const pageContext = {
    url: page?.url || '',
    title: page?.title || undefined,
    h1: page?.h1 || undefined,
    contentMarkdown: page?.contentMarkdown || undefined,
  };

  const projectContext = {
    domain: project.domain,
    centralEntity: project.centralEntity || undefined,
    sourceContext: project.sourceContext || undefined,
    centralSearchIntent: project.centralSearchIntent || undefined,
  };

  // Use context-aware prompt that includes previous suggestions
  const prompt = GENERATE_CONTEXT_AWARE_TASK_SUGGESTION_PROMPT(
    taskContext,
    pageContext,
    projectContext,
    previousSuggestions
  );

  const result = await callSuggestionApi(prompt, businessInfo, dispatch);

  // Prepare suggestion record
  const suggestionData = {
    task_id: task.id,
    project_id: project.id,
    page_id: task.pageId || null,
    original_value: task.remediation,
    suggested_value: result.suggestedValue,
    confidence: Math.round(result.confidence),
    reasoning: result.reasoning,
    model_used: businessInfo.aiModel || 'claude-sonnet-4-5-20250929',
    status: 'pending' as const,
  };

  // Insert into database
  const { data: inserted, error } = await supabase
    .from('ai_suggestions')
    .insert(suggestionData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save suggestion: ${error.message}`);
  }

  // Update task has_ai_suggestion flag
  await supabase
    .from('audit_tasks')
    .update({ has_ai_suggestion: true })
    .eq('id', task.id);

  return mapDbToSuggestion(inserted);
};

/**
 * Generate suggestions for multiple tasks with context awareness
 * Each subsequent suggestion knows about previous ones to ensure consistency
 */
export const generateSuggestionsForTasks = async (
  supabase: SupabaseClient,
  tasks: AuditTask[],
  pages: Map<string, SitePageRecord>,
  project: SiteAnalysisProject,
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<AppAction>,
  onProgress?: (current: number, total: number) => void
): Promise<{ suggestions: AISuggestion[]; errors: { taskId: string; error: string }[] }> => {
  const suggestions: AISuggestion[] = [];
  const errors: { taskId: string; error: string }[] = [];

  // Accumulator for context awareness - tracks all previous suggestions
  const previousSuggestionContext: Array<{
    ruleId: string;
    title: string;
    suggestedValue: string;
    reasoning: string;
  }> = [];

  dispatch({
    type: 'LOG_EVENT',
    payload: {
      service: 'AISuggestions',
      message: `Starting context-aware batch generation for ${tasks.length} tasks...`,
      status: 'info',
      timestamp: Date.now(),
    },
  });

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    onProgress?.(i + 1, tasks.length);

    try {
      const page = task.pageId ? pages.get(task.pageId) || null : null;

      // Use context-aware generation that includes previous suggestions
      const suggestion = await generateContextAwareSuggestion(
        supabase,
        task,
        page,
        project,
        businessInfo,
        dispatch,
        previousSuggestionContext
      );

      suggestions.push(suggestion);

      // Add this suggestion to context for subsequent tasks
      previousSuggestionContext.push({
        ruleId: task.ruleId,
        title: task.title,
        suggestedValue: suggestion.suggestedValue,
        reasoning: suggestion.reasoning,
      });

      dispatch({
        type: 'LOG_EVENT',
        payload: {
          service: 'AISuggestions',
          message: `Completed ${i + 1}/${tasks.length}: ${task.title} (context: ${previousSuggestionContext.length} previous suggestions)`,
          status: 'success',
          timestamp: Date.now(),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push({ taskId: task.id, error: message });

      dispatch({
        type: 'LOG_EVENT',
        payload: {
          service: 'AISuggestions',
          message: `Failed ${i + 1}/${tasks.length}: ${task.title} - ${message}`,
          status: 'failure',
          timestamp: Date.now(),
        },
      });
    }

    // Rate limiting - wait 500ms between requests
    if (i < tasks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  dispatch({
    type: 'LOG_EVENT',
    payload: {
      service: 'AISuggestions',
      message: `Batch complete: ${suggestions.length} suggestions, ${errors.length} errors`,
      status: errors.length === 0 ? 'success' : 'warning',
      timestamp: Date.now(),
    },
  });

  return { suggestions, errors };
};

/**
 * Approve all pending suggestions for a page
 */
export const approveAllSuggestionsForPage = async (
  supabase: SupabaseClient,
  pageId: string
): Promise<number> => {
  const { data, error } = await supabase
    .from('ai_suggestions')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('page_id', pageId)
    .eq('status', 'pending')
    .select('id');

  if (error) {
    throw new Error(`Failed to approve suggestions: ${error.message}`);
  }

  return data?.length || 0;
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Map database row to AISuggestion type
 */
const mapDbToSuggestion = (row: any): AISuggestion => ({
  id: row.id,
  taskId: row.task_id,
  projectId: row.project_id,
  pageId: row.page_id || undefined,
  originalValue: row.original_value,
  suggestedValue: row.suggested_value,
  confidence: row.confidence,
  reasoning: row.reasoning || '',
  modelUsed: row.model_used || '',
  status: row.status,
  userModifiedValue: row.user_modified_value || undefined,
  approvedAt: row.approved_at || undefined,
  rejectionReason: row.rejection_reason || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
