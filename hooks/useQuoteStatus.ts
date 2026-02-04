/**
 * useQuoteStatus Hook
 *
 * Manages quote status changes and activity logging.
 */

import { useState, useCallback } from 'react';
import {
  Quote,
  QuoteStatus,
  QuoteActivity,
  QuoteActivityType,
} from '../types/quotation';
import { useSupabase } from '../services/supabaseClient';
import { useAppState } from '../state/appState';
import type { Json } from '../database.types';

export interface UseQuoteStatusReturn {
  // Status management
  updateStatus: (quoteId: string, newStatus: QuoteStatus) => Promise<void>;
  isUpdating: boolean;

  // Activity logging
  logActivity: (quoteId: string, activityType: QuoteActivityType, details?: Record<string, unknown>) => Promise<void>;

  // Validation
  canTransitionTo: (currentStatus: QuoteStatus, targetStatus: QuoteStatus) => boolean;
  getValidTransitions: (currentStatus: QuoteStatus) => QuoteStatus[];

  // Expiration
  isExpired: (quote: Quote) => boolean;
  daysUntilExpiry: (quote: Quote) => number | null;
}

// Valid status transitions
const STATUS_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ['sent'],
  sent: ['viewed', 'accepted', 'rejected', 'expired'],
  viewed: ['accepted', 'rejected', 'expired'],
  accepted: [], // Terminal state
  rejected: ['draft'], // Can revise and try again
  expired: ['draft'], // Can revise and try again
};

export function useQuoteStatus(): UseQuoteStatusReturn {
  const [isUpdating, setIsUpdating] = useState(false);
  const { state } = useAppState();
  const supabase = useSupabase();

  /**
   * Check if a status transition is valid
   */
  const canTransitionTo = useCallback(
    (currentStatus: QuoteStatus, targetStatus: QuoteStatus): boolean => {
      const validTransitions = STATUS_TRANSITIONS[currentStatus] || [];
      return validTransitions.includes(targetStatus);
    },
    []
  );

  /**
   * Get all valid transitions from current status
   */
  const getValidTransitions = useCallback((currentStatus: QuoteStatus): QuoteStatus[] => {
    return STATUS_TRANSITIONS[currentStatus] || [];
  }, []);

  /**
   * Log activity for a quote
   */
  const logActivity = useCallback(
    async (
      quoteId: string,
      activityType: QuoteActivityType,
      details?: Record<string, unknown>
    ): Promise<void> => {
      try {
        const { error } = await supabase
          .from('quote_activities')
          .insert({
            quote_id: quoteId,
            activity_type: activityType,
            details: (details as Json) ?? null,
            created_by: state.user?.id || null,
          });

        if (error) {
          console.error('[useQuoteStatus] Supabase activity insert error:', error);
          // Don't throw - activity logging shouldn't break the main flow
          return;
        }

        console.log(`[useQuoteStatus] Logged activity for quote ${quoteId}: ${activityType}`);
      } catch (error) {
        console.error('[useQuoteStatus] Failed to log activity:', error);
        // Don't throw - activity logging shouldn't break the main flow
      }
    },
    [supabase, state.user?.id]
  );

  /**
   * Update quote status
   */
  const updateStatus = useCallback(
    async (quoteId: string, newStatus: QuoteStatus): Promise<void> => {
      setIsUpdating(true);
      try {
        // Build the update payload with status-specific timestamps
        const updatePayload: Record<string, string> = {
          status: newStatus,
        };

        const now = new Date().toISOString();

        if (newStatus === 'sent') {
          updatePayload.sent_at = now;
        } else if (newStatus === 'viewed') {
          updatePayload.viewed_at = now;
        } else if (newStatus === 'accepted' || newStatus === 'rejected') {
          updatePayload.responded_at = now;
        }

        const { error } = await supabase
          .from('quotes')
          .update(updatePayload)
          .eq('id', quoteId);

        if (error) {
          console.error('[useQuoteStatus] Supabase update error:', error);
          throw new Error(`Failed to update quote status: ${error.message}`);
        }

        // Log the activity
        await logActivity(quoteId, 'status_changed', {
          newStatus,
          timestamp: now,
        });

        console.log(`[useQuoteStatus] Updated quote ${quoteId} to status: ${newStatus}`);
      } catch (error) {
        console.error('[useQuoteStatus] Failed to update status:', error);
        throw error;
      } finally {
        setIsUpdating(false);
      }
    },
    [supabase, logActivity]
  );

  /**
   * Check if a quote is expired
   */
  const isExpired = useCallback((quote: Quote): boolean => {
    if (!quote.validUntil) return false;
    return new Date(quote.validUntil) < new Date();
  }, []);

  /**
   * Get days until quote expires
   */
  const daysUntilExpiry = useCallback((quote: Quote): number | null => {
    if (!quote.validUntil) return null;
    const expiryDate = new Date(quote.validUntil);
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, []);

  return {
    updateStatus,
    isUpdating,
    logActivity,
    canTransitionTo,
    getValidTransitions,
    isExpired,
    daysUntilExpiry,
  };
}

export default useQuoteStatus;
