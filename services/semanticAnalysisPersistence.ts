// services/semanticAnalysisPersistence.ts
// Service for persisting semantic analysis results to database

import { SemanticAuditResult } from '../types';
import { getSupabaseClient } from './supabaseClient';

// Note: These types are defined here because the database migration hasn't been applied
// and generated types don't include semantic_analysis_results yet
interface SemanticAnalysisRecord {
    id: string;
    inventory_id: string;
    map_id: string | null;
    result: SemanticAuditResult;
    overall_score: number;
    ce_alignment: number | null;
    sc_alignment: number | null;
    csi_alignment: number | null;
    detected_ce: string | null;
    detected_sc: string | null;
    detected_csi: string | null;
    content_hash: string;
    created_at: string;
    updated_at: string;
}

interface SemanticAnalysisInsert {
    inventory_id: string;
    map_id: string | null;
    result: SemanticAuditResult;
    overall_score: number;
    ce_alignment: number | null;
    sc_alignment: number | null;
    csi_alignment: number | null;
    detected_ce: string | null;
    detected_sc: string | null;
    detected_csi: string | null;
    content_hash: string;
    updated_at: string;
}

/**
 * Generate a simple hash for content to detect changes
 */
const generateContentHash = (content: string): string => {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
};

/**
 * Check if semantic analysis exists for an inventory item
 * Returns the existing result if content hasn't changed, null otherwise
 */
export const getExistingSemanticAnalysis = async (
    inventoryId: string,
    mapId: string | null,
    content: string,
    supabaseUrl: string,
    supabaseAnonKey: string
): Promise<SemanticAuditResult | null> => {
    const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);
    const contentHash = generateContentHash(content);

    console.log('[SemanticPersistence] Checking for existing analysis:', { inventoryId, mapId, contentHash });

    try {
        // Query for existing analysis with matching content hash
        // Using 'as any' because generated types don't include this table yet
        let query = (supabase as any)
            .from('semantic_analysis_results')
            .select('*')
            .eq('inventory_id', inventoryId)
            .eq('content_hash', contentHash);

        // If mapId is provided, also match on that
        if (mapId) {
            query = query.eq('map_id', mapId);
        } else {
            query = query.is('map_id', null);
        }

        const { data, error } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();

        if (error) {
            console.error('[SemanticPersistence] Error fetching existing analysis:', error);
            return null;
        }

        if (data) {
            const record = data as SemanticAnalysisRecord;
            console.log('[SemanticPersistence] Found existing analysis:', {
                id: record.id,
                overall_score: record.overall_score,
                created_at: record.created_at
            });
            return record.result;
        }

        console.log('[SemanticPersistence] No existing analysis found');
        return null;
    } catch (err) {
        // Table might not exist yet - that's okay
        console.warn('[SemanticPersistence] Table may not exist yet:', err);
        return null;
    }
};

/**
 * Save semantic analysis result to database
 */
export const saveSemanticAnalysis = async (
    inventoryId: string,
    mapId: string | null,
    content: string,
    result: SemanticAuditResult,
    supabaseUrl: string,
    supabaseAnonKey: string
): Promise<void> => {
    const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);
    const contentHash = generateContentHash(content);

    console.log('[SemanticPersistence] Saving semantic analysis:', {
        inventoryId,
        mapId,
        contentHash,
        overall_score: result.overallScore
    });

    try {
        // Extract alignment scores if present
        const alignmentScores = result.alignmentScores;

        const record: SemanticAnalysisInsert = {
            inventory_id: inventoryId,
            map_id: mapId,
            result: result,
            overall_score: result.overallScore,
            ce_alignment: alignmentScores?.ceAlignment ?? null,
            sc_alignment: alignmentScores?.scAlignment ?? null,
            csi_alignment: alignmentScores?.csiAlignment ?? null,
            detected_ce: result.coreEntities?.centralEntity ?? null,
            detected_sc: result.coreEntities?.detectedSourceContext ?? null,
            detected_csi: result.coreEntities?.searchIntent ?? null,
            content_hash: contentHash,
            updated_at: new Date().toISOString()
        };

        // Using 'as any' because generated types don't include this table yet
        // Try insert directly since upsert requires unique constraint
        const { error } = await (supabase as any)
            .from('semantic_analysis_results')
            .insert(record);

        if (error) {
            console.error('[SemanticPersistence] Error saving semantic analysis:', error);
            throw new Error(`Failed to save semantic analysis: ${error.message}`);
        }

        console.log('[SemanticPersistence] Semantic analysis saved successfully');
    } catch (err) {
        // Table might not exist yet - log and continue
        console.warn('[SemanticPersistence] Failed to save (table may not exist):', err);
    }
};

/**
 * Get all semantic analysis results for an inventory item
 */
export const getAllSemanticAnalysisForItem = async (
    inventoryId: string,
    supabaseUrl: string,
    supabaseAnonKey: string
): Promise<SemanticAuditResult[]> => {
    const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);

    try {
        // Using 'as any' because generated types don't include this table yet
        const { data, error } = await (supabase as any)
            .from('semantic_analysis_results')
            .select('result')
            .eq('inventory_id', inventoryId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[SemanticPersistence] Error fetching analysis history:', error);
            return [];
        }

        return (data || []).map((row: { result: SemanticAuditResult }) => row.result);
    } catch (err) {
        console.warn('[SemanticPersistence] Failed to fetch (table may not exist):', err);
        return [];
    }
};

/**
 * Delete semantic analysis results for an inventory item
 */
export const deleteSemanticAnalysis = async (
    inventoryId: string,
    supabaseUrl: string,
    supabaseAnonKey: string
): Promise<void> => {
    const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);

    try {
        // Using 'as any' because generated types don't include this table yet
        const { error } = await (supabase as any)
            .from('semantic_analysis_results')
            .delete()
            .eq('inventory_id', inventoryId);

        if (error) {
            console.error('[SemanticPersistence] Error deleting semantic analysis:', error);
            throw new Error(`Failed to delete semantic analysis: ${error.message}`);
        }

        console.log('[SemanticPersistence] Semantic analysis deleted for inventory:', inventoryId);
    } catch (err) {
        // Table might not exist yet - log and continue
        console.warn('[SemanticPersistence] Failed to delete (table may not exist):', err);
    }
};
