/**
 * Audit Persistence Service
 * Handles saving and loading audit results to/from the database
 * Supports historical tracking and comparison
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { QueryNetworkAnalysisResult, MentionScannerResult, CorpusAuditResult } from '../types';
import { EnhancedAuditMetrics } from './reportGenerationService';

// Types for stored audits
export interface StoredQueryNetworkAudit {
  id: string;
  map_id: string;
  user_id: string;
  seed_keyword: string;
  target_domain: string | null;
  language: string;
  total_queries: number;
  total_competitor_eavs: number;
  total_content_gaps: number;
  total_recommendations: number;
  query_network: any;
  competitor_eavs: any[];
  content_gaps: any[];
  recommendations: any[];
  intent_distribution: any;
  questions: any[];
  created_at: string;
}

export interface StoredEATScannerAudit {
  id: string;
  map_id: string;
  user_id: string;
  entity_name: string;
  domain: string | null;
  industry: string | null;
  language: string;
  overall_eat_score: number | null;
  expertise_score: number | null;
  authority_score: number | null;
  trust_score: number | null;
  overall_sentiment: string | null;
  entity_authority: any;
  reputation_signals: any[];
  co_occurrences: any[];
  eat_breakdown: any;
  recommendations: any[];
  created_at: string;
}

export interface StoredCorpusAudit {
  id: string;
  map_id: string;
  user_id: string;
  domain: string;
  sitemap_url: string | null;
  page_limit: number | null;
  total_pages: number;
  total_overlaps: number;
  semantic_coverage_percentage: number | null;
  pages: any[];
  content_overlaps: any[];
  anchor_patterns: any[];
  semantic_coverage: any;
  metrics: any;
  issues: any[];
  created_at: string;
}

export interface StoredEnhancedMetricsSnapshot {
  id: string;
  map_id: string;
  user_id: string;
  snapshot_type: 'manual' | 'auto';
  snapshot_name: string | null;
  semantic_compliance_score: number | null;
  eav_authority_score: number | null;
  information_density_score: number | null;
  topic_count: number;
  eav_count: number;
  unique_eav_count: number;
  root_eav_count: number;
  rare_eav_count: number;
  common_eav_count: number;
  semantic_compliance: any;
  authority_indicators: any;
  information_density: any;
  action_roadmap: any[];
  category_distribution: any;
  classification_distribution: any;
  created_at: string;
  notes: string | null;
}

export interface AuditHistorySummary {
  audit_type: string;
  audit_id: string;
  created_at: string;
  summary: any;
}

/**
 * Save Query Network Audit result to database
 */
export async function saveQueryNetworkAudit(
  supabase: SupabaseClient,
  mapId: string,
  userId: string,
  result: QueryNetworkAnalysisResult,
  config: { seedKeyword: string; targetDomain?: string; language?: string }
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('query_network_audits')
      .insert({
        map_id: mapId,
        user_id: userId,
        seed_keyword: config.seedKeyword,
        target_domain: config.targetDomain || null,
        language: config.language || 'en',
        total_queries: result.queryNetwork?.length || 0,
        total_competitor_eavs: result.competitorEAVs?.length || 0,
        total_content_gaps: result.contentGaps?.length || 0,
        total_recommendations: result.recommendations?.length || 0,
        query_network: result.queryNetwork || [],
        competitor_eavs: result.competitorEAVs || [],
        content_gaps: result.contentGaps || [],
        recommendations: result.recommendations || [],
        intent_distribution: {},
        questions: [],
      })
      .select('id')
      .single();

    if (error) {
      console.error('[saveQueryNetworkAudit] Error:', error);
      return null;
    }

    return data?.id || null;
  } catch (e) {
    console.error('[saveQueryNetworkAudit] Exception:', e);
    return null;
  }
}

/**
 * Save E-A-T Scanner (Mention Scanner) result to database
 */
export async function saveEATScannerAudit(
  supabase: SupabaseClient,
  mapId: string,
  userId: string,
  result: MentionScannerResult,
  config: { entityName: string; domain?: string; industry?: string; language?: string }
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('eat_scanner_audits')
      .insert({
        map_id: mapId,
        user_id: userId,
        entity_name: config.entityName,
        domain: config.domain || null,
        industry: config.industry || null,
        language: config.language || 'en',
        overall_eat_score: result.eatScore || null,
        expertise_score: result.eatBreakdown?.expertise?.score || null,
        authority_score: result.eatBreakdown?.authority?.score || null,
        trust_score: result.eatBreakdown?.trust?.score || null,
        overall_sentiment: result.overallSentiment || null,
        entity_authority: result.entityAuthority || {},
        reputation_signals: result.reputationSignals || [],
        co_occurrences: result.coOccurrences || [],
        eat_breakdown: result.eatBreakdown || {},
        recommendations: result.recommendations || [],
      })
      .select('id')
      .single();

    if (error) {
      console.error('[saveEATScannerAudit] Error:', error);
      return null;
    }

    return data?.id || null;
  } catch (e) {
    console.error('[saveEATScannerAudit] Exception:', e);
    return null;
  }
}

/**
 * Save Corpus Audit result to database
 */
export async function saveCorpusAudit(
  supabase: SupabaseClient,
  mapId: string,
  userId: string,
  result: CorpusAuditResult,
  config: { domain: string; sitemapUrl?: string; pageLimit?: number }
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('corpus_audits')
      .insert({
        map_id: mapId,
        user_id: userId,
        domain: config.domain,
        sitemap_url: config.sitemapUrl || null,
        page_limit: config.pageLimit || null,
        total_pages: result.pages?.length || 0,
        total_overlaps: result.contentOverlaps?.length || 0,
        semantic_coverage_percentage: result.semanticCoverage?.coveragePercentage || null,
        pages: result.pages || [],
        content_overlaps: result.contentOverlaps || [],
        anchor_patterns: result.anchorPatterns || [],
        semantic_coverage: result.semanticCoverage || {},
        metrics: result.metrics || {},
        issues: result.issues || [],
      })
      .select('id')
      .single();

    if (error) {
      console.error('[saveCorpusAudit] Error:', error);
      return null;
    }

    return data?.id || null;
  } catch (e) {
    console.error('[saveCorpusAudit] Exception:', e);
    return null;
  }
}

/**
 * Save Enhanced Metrics snapshot to database
 */
export async function saveEnhancedMetricsSnapshot(
  supabase: SupabaseClient,
  mapId: string,
  userId: string,
  metrics: EnhancedAuditMetrics,
  topicCount: number,
  eavCount: number,
  options?: { snapshotType?: 'manual' | 'auto'; snapshotName?: string; notes?: string }
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('enhanced_metrics_snapshots')
      .insert({
        map_id: mapId,
        user_id: userId,
        snapshot_type: options?.snapshotType || 'manual',
        snapshot_name: options?.snapshotName || null,
        semantic_compliance_score: metrics.semanticCompliance?.score || null,
        eav_authority_score: metrics.authorityIndicators?.eavAuthorityScore || null,
        information_density_score: metrics.informationDensity?.avgFactsPerSection
          ? (metrics.informationDensity.avgFactsPerSection / metrics.informationDensity.targetFactsPerSection) * 100
          : null,
        topic_count: topicCount,
        eav_count: eavCount,
        unique_eav_count: metrics.authorityIndicators?.uniqueEavCount || 0,
        root_eav_count: metrics.authorityIndicators?.rootEavCount || 0,
        rare_eav_count: metrics.authorityIndicators?.rareEavCount || 0,
        common_eav_count: metrics.authorityIndicators?.commonEavCount || 0,
        semantic_compliance: metrics.semanticCompliance || {},
        authority_indicators: metrics.authorityIndicators || {},
        information_density: metrics.informationDensity || {},
        action_roadmap: metrics.actionRoadmap || [],
        category_distribution: metrics.semanticCompliance?.categoryDistribution || {},
        classification_distribution: metrics.semanticCompliance?.classificationDistribution || {},
        notes: options?.notes || null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[saveEnhancedMetricsSnapshot] Error:', error);
      return null;
    }

    return data?.id || null;
  } catch (e) {
    console.error('[saveEnhancedMetricsSnapshot] Exception:', e);
    return null;
  }
}

/**
 * Load Query Network Audit history for a map
 */
export async function loadQueryNetworkAuditHistory(
  supabase: SupabaseClient,
  mapId: string,
  limit: number = 10
): Promise<StoredQueryNetworkAudit[]> {
  try {
    const { data, error } = await supabase
      .from('query_network_audits')
      .select('*')
      .eq('map_id', mapId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[loadQueryNetworkAuditHistory] Error:', error);
      return [];
    }

    return data || [];
  } catch (e) {
    console.error('[loadQueryNetworkAuditHistory] Exception:', e);
    return [];
  }
}

/**
 * Load E-A-T Scanner Audit history for a map
 */
export async function loadEATScannerAuditHistory(
  supabase: SupabaseClient,
  mapId: string,
  limit: number = 10
): Promise<StoredEATScannerAudit[]> {
  try {
    const { data, error } = await supabase
      .from('eat_scanner_audits')
      .select('*')
      .eq('map_id', mapId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[loadEATScannerAuditHistory] Error:', error);
      return [];
    }

    return data || [];
  } catch (e) {
    console.error('[loadEATScannerAuditHistory] Exception:', e);
    return [];
  }
}

/**
 * Load Corpus Audit history for a map
 */
export async function loadCorpusAuditHistory(
  supabase: SupabaseClient,
  mapId: string,
  limit: number = 10
): Promise<StoredCorpusAudit[]> {
  try {
    const { data, error } = await supabase
      .from('corpus_audits')
      .select('*')
      .eq('map_id', mapId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[loadCorpusAuditHistory] Error:', error);
      return [];
    }

    return data || [];
  } catch (e) {
    console.error('[loadCorpusAuditHistory] Exception:', e);
    return [];
  }
}

/**
 * Load Enhanced Metrics snapshots for a map
 */
export async function loadEnhancedMetricsHistory(
  supabase: SupabaseClient,
  mapId: string,
  limit: number = 10
): Promise<StoredEnhancedMetricsSnapshot[]> {
  try {
    const { data, error } = await supabase
      .from('enhanced_metrics_snapshots')
      .select('*')
      .eq('map_id', mapId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[loadEnhancedMetricsHistory] Error:', error);
      return [];
    }

    return data || [];
  } catch (e) {
    console.error('[loadEnhancedMetricsHistory] Exception:', e);
    return [];
  }
}

/**
 * Load a specific audit by ID
 */
export async function loadAuditById<T>(
  supabase: SupabaseClient,
  table: 'query_network_audits' | 'eat_scanner_audits' | 'corpus_audits' | 'enhanced_metrics_snapshots',
  auditId: string
): Promise<T | null> {
  try {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', auditId)
      .single();

    if (error) {
      console.error(`[loadAuditById] Error loading from ${table}:`, error);
      return null;
    }

    return data as T;
  } catch (e) {
    console.error(`[loadAuditById] Exception loading from ${table}:`, e);
    return null;
  }
}

/**
 * Get latest audits for a map (summary view)
 */
export async function getLatestAudits(
  supabase: SupabaseClient,
  mapId: string
): Promise<AuditHistorySummary[]> {
  try {
    const { data, error } = await supabase.rpc('get_latest_audits', { p_map_id: mapId });

    if (error) {
      console.error('[getLatestAudits] Error:', error);
      return [];
    }

    return data || [];
  } catch (e) {
    console.error('[getLatestAudits] Exception:', e);
    return [];
  }
}

/**
 * Compare two metrics snapshots
 */
export async function compareMetricsSnapshots(
  supabase: SupabaseClient,
  snapshotId1: string,
  snapshotId2: string
): Promise<any | null> {
  try {
    const { data, error } = await supabase.rpc('compare_metrics_snapshots', {
      p_snapshot_id_1: snapshotId1,
      p_snapshot_id_2: snapshotId2,
    });

    if (error) {
      console.error('[compareMetricsSnapshots] Error:', error);
      return null;
    }

    return data;
  } catch (e) {
    console.error('[compareMetricsSnapshots] Exception:', e);
    return null;
  }
}

/**
 * Delete an audit by ID
 */
export async function deleteAudit(
  supabase: SupabaseClient,
  table: 'query_network_audits' | 'eat_scanner_audits' | 'corpus_audits' | 'enhanced_metrics_snapshots',
  auditId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', auditId);

    if (error) {
      console.error(`[deleteAudit] Error deleting from ${table}:`, error);
      return false;
    }

    return true;
  } catch (e) {
    console.error(`[deleteAudit] Exception deleting from ${table}:`, e);
    return false;
  }
}
