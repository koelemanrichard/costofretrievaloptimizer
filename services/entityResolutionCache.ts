// services/entityResolutionCache.ts
// Entity resolution cache service for storing and retrieving resolved entities from Supabase

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  ResolvedEntity,
  SchemaEntityType,
  EntityCacheEntry,
  EntityCandidate
} from '../types';
import {
  resolveEntity as wikidataResolveEntity,
  batchResolveEntities as wikidataBatchResolve
} from './wikidataService';

// Cache expiration (30 days)
const CACHE_EXPIRATION_DAYS = 30;

/**
 * Get Supabase client for entity cache operations
 */
function getSupabaseClient(supabaseUrl: string, supabaseKey: string): SupabaseClient {
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Check if a cache entry is stale
 */
function isCacheStale(entry: EntityCacheEntry): boolean {
  if (!entry.lastVerifiedAt) return true;

  const lastVerified = new Date(entry.lastVerifiedAt);
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() - CACHE_EXPIRATION_DAYS);

  return lastVerified < expirationDate;
}

/**
 * Convert database row to EntityCacheEntry
 */
function rowToCacheEntry(row: any): EntityCacheEntry {
  return {
    id: row.id,
    userId: row.user_id,
    entityName: row.entity_name,
    entityType: row.entity_type as SchemaEntityType,
    wikidataId: row.wikidata_id,
    wikipediaUrl: row.wikipedia_url,
    resolvedData: row.resolved_data,
    sameAsUrls: row.same_as_urls || [],
    confidenceScore: parseFloat(row.confidence_score) || 0,
    resolutionSource: row.resolution_source,
    lastVerifiedAt: row.last_verified_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Convert ResolvedEntity to database row
 */
function resolvedEntityToRow(
  entity: ResolvedEntity,
  userId: string
): Partial<EntityCacheEntry> {
  return {
    userId,
    entityName: entity.name,
    entityType: entity.type,
    wikidataId: entity.wikidataId,
    wikipediaUrl: entity.wikipediaUrl,
    resolvedData: entity.properties as Record<string, unknown>,
    sameAsUrls: entity.sameAs,
    confidenceScore: entity.confidenceScore,
    resolutionSource: entity.source,
    lastVerifiedAt: entity.lastVerifiedAt || new Date().toISOString()
  };
}

/**
 * Get cached entity by name and type
 */
export async function getCachedEntity(
  supabaseUrl: string,
  supabaseKey: string,
  userId: string,
  entityName: string,
  entityType: SchemaEntityType
): Promise<ResolvedEntity | null> {
  const supabase = getSupabaseClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from('entity_resolution_cache')
    .select('*')
    .eq('user_id', userId)
    .eq('entity_name', entityName)
    .eq('entity_type', entityType)
    .single();

  if (error || !data) {
    return null;
  }

  const cacheEntry = rowToCacheEntry(data);

  // Check if stale
  if (isCacheStale(cacheEntry)) {
    console.log(`[EntityCache] Cache entry for "${entityName}" is stale, needs refresh`);
    return null;
  }

  // Convert to ResolvedEntity
  return {
    id: cacheEntry.id,
    name: cacheEntry.entityName,
    type: cacheEntry.entityType,
    wikidataId: cacheEntry.wikidataId,
    wikipediaUrl: cacheEntry.wikipediaUrl,
    sameAs: cacheEntry.sameAsUrls,
    description: cacheEntry.resolvedData?.description as string | undefined,
    properties: cacheEntry.resolvedData || {},
    confidenceScore: cacheEntry.confidenceScore,
    source: cacheEntry.resolutionSource,
    lastVerifiedAt: cacheEntry.lastVerifiedAt
  };
}

/**
 * Get multiple cached entities
 */
export async function getCachedEntities(
  supabaseUrl: string,
  supabaseKey: string,
  userId: string,
  entityNames: string[]
): Promise<Map<string, ResolvedEntity>> {
  const supabase = getSupabaseClient(supabaseUrl, supabaseKey);
  const result = new Map<string, ResolvedEntity>();

  const { data, error } = await supabase
    .from('entity_resolution_cache')
    .select('*')
    .eq('user_id', userId)
    .in('entity_name', entityNames);

  if (error || !data) {
    return result;
  }

  for (const row of data) {
    const cacheEntry = rowToCacheEntry(row);

    if (!isCacheStale(cacheEntry)) {
      result.set(cacheEntry.entityName, {
        id: cacheEntry.id,
        name: cacheEntry.entityName,
        type: cacheEntry.entityType,
        wikidataId: cacheEntry.wikidataId,
        wikipediaUrl: cacheEntry.wikipediaUrl,
        sameAs: cacheEntry.sameAsUrls,
        description: cacheEntry.resolvedData?.description as string | undefined,
        properties: cacheEntry.resolvedData || {},
        confidenceScore: cacheEntry.confidenceScore,
        source: cacheEntry.resolutionSource,
        lastVerifiedAt: cacheEntry.lastVerifiedAt
      });
    }
  }

  return result;
}

/**
 * Cache a resolved entity
 */
export async function cacheEntity(
  supabaseUrl: string,
  supabaseKey: string,
  userId: string,
  entity: ResolvedEntity
): Promise<void> {
  const supabase = getSupabaseClient(supabaseUrl, supabaseKey);

  const row = {
    user_id: userId,
    entity_name: entity.name,
    entity_type: entity.type,
    wikidata_id: entity.wikidataId,
    wikipedia_url: entity.wikipediaUrl,
    resolved_data: entity.properties,
    same_as_urls: entity.sameAs,
    confidence_score: entity.confidenceScore,
    resolution_source: entity.source,
    last_verified_at: entity.lastVerifiedAt || new Date().toISOString()
  };

  // Upsert to handle duplicates
  const { error } = await supabase
    .from('entity_resolution_cache')
    .upsert(row, {
      onConflict: 'user_id,entity_name,entity_type'
    });

  if (error) {
    console.error('[EntityCache] Failed to cache entity:', error);
  }
}

/**
 * Cache multiple entities
 */
export async function cacheEntities(
  supabaseUrl: string,
  supabaseKey: string,
  userId: string,
  entities: ResolvedEntity[]
): Promise<void> {
  const supabase = getSupabaseClient(supabaseUrl, supabaseKey);

  const rows = entities.map(entity => ({
    user_id: userId,
    entity_name: entity.name,
    entity_type: entity.type,
    wikidata_id: entity.wikidataId,
    wikipedia_url: entity.wikipediaUrl,
    resolved_data: entity.properties,
    same_as_urls: entity.sameAs,
    confidence_score: entity.confidenceScore,
    resolution_source: entity.source,
    last_verified_at: entity.lastVerifiedAt || new Date().toISOString()
  }));

  const { error } = await supabase
    .from('entity_resolution_cache')
    .upsert(rows, {
      onConflict: 'user_id,entity_name,entity_type'
    });

  if (error) {
    console.error('[EntityCache] Failed to cache entities:', error);
  }
}

/**
 * Get or resolve an entity (cache-first strategy)
 * This is the main function to use for entity resolution
 */
export async function getOrResolveEntity(
  supabaseUrl: string,
  supabaseKey: string,
  userId: string,
  name: string,
  type: SchemaEntityType,
  context: string
): Promise<ResolvedEntity | null> {
  // 1. Try cache first
  const cached = await getCachedEntity(
    supabaseUrl,
    supabaseKey,
    userId,
    name,
    type
  );

  if (cached) {
    console.log(`[EntityCache] Cache hit for "${name}"`);
    return cached;
  }

  // 2. Resolve via Wikidata
  console.log(`[EntityCache] Cache miss for "${name}", resolving via Wikidata...`);
  const resolved = await wikidataResolveEntity(name, context, type);

  if (resolved) {
    // 3. Cache the result
    await cacheEntity(supabaseUrl, supabaseKey, userId, resolved);
    return resolved;
  }

  return null;
}

/**
 * Batch get or resolve entities
 */
export async function batchGetOrResolveEntities(
  supabaseUrl: string,
  supabaseKey: string,
  userId: string,
  candidates: EntityCandidate[],
  maxResolutions: number = 10
): Promise<{ resolved: ResolvedEntity[]; failed: string[] }> {
  const resolved: ResolvedEntity[] = [];
  const failed: string[] = [];
  const toResolve: EntityCandidate[] = [];

  // 1. Check cache for all candidates
  const entityNames = candidates.map(c => c.name);
  const cached = await getCachedEntities(
    supabaseUrl,
    supabaseKey,
    userId,
    entityNames
  );

  // 2. Separate cached from uncached
  for (const candidate of candidates) {
    const cachedEntity = cached.get(candidate.name);
    if (cachedEntity) {
      resolved.push(cachedEntity);
    } else {
      toResolve.push(candidate);
    }
  }

  // 3. Limit resolutions to avoid excessive API calls
  const limitedToResolve = toResolve.slice(0, maxResolutions);

  // 4. Resolve uncached entities via Wikidata
  if (limitedToResolve.length > 0) {
    const { resolved: newlyResolved, failed: resolveFailed } =
      await wikidataBatchResolve(limitedToResolve);

    // 5. Cache the newly resolved entities
    if (newlyResolved.length > 0) {
      await cacheEntities(supabaseUrl, supabaseKey, userId, newlyResolved);
    }

    resolved.push(...newlyResolved);
    failed.push(...resolveFailed);
  }

  // 6. Add skipped entities to failed
  const skipped = toResolve.slice(maxResolutions);
  failed.push(...skipped.map(c => c.name));

  return { resolved, failed };
}

/**
 * Refresh stale cache entries
 */
export async function refreshStaleEntities(
  supabaseUrl: string,
  supabaseKey: string,
  userId: string,
  maxRefresh: number = 10
): Promise<number> {
  const supabase = getSupabaseClient(supabaseUrl, supabaseKey);

  // Calculate expiration date
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() - CACHE_EXPIRATION_DAYS);

  // Get stale entries
  const { data, error } = await supabase
    .from('entity_resolution_cache')
    .select('*')
    .eq('user_id', userId)
    .lt('last_verified_at', expirationDate.toISOString())
    .limit(maxRefresh);

  if (error || !data || data.length === 0) {
    return 0;
  }

  // Refresh each stale entry
  let refreshed = 0;
  for (const row of data) {
    const entry = rowToCacheEntry(row);
    const resolved = await wikidataResolveEntity(
      entry.entityName,
      '', // No context for refresh
      entry.entityType
    );

    if (resolved) {
      await cacheEntity(supabaseUrl, supabaseKey, userId, resolved);
      refreshed++;
    }
  }

  return refreshed;
}

/**
 * Delete cached entity
 */
export async function deleteCachedEntity(
  supabaseUrl: string,
  supabaseKey: string,
  userId: string,
  entityName: string,
  entityType: SchemaEntityType
): Promise<boolean> {
  const supabase = getSupabaseClient(supabaseUrl, supabaseKey);

  const { error } = await supabase
    .from('entity_resolution_cache')
    .delete()
    .eq('user_id', userId)
    .eq('entity_name', entityName)
    .eq('entity_type', entityType);

  return !error;
}

/**
 * Clear all cached entities for a user
 */
export async function clearUserCache(
  supabaseUrl: string,
  supabaseKey: string,
  userId: string
): Promise<boolean> {
  const supabase = getSupabaseClient(supabaseUrl, supabaseKey);

  const { error } = await supabase
    .from('entity_resolution_cache')
    .delete()
    .eq('user_id', userId);

  return !error;
}

/**
 * Get cache statistics for a user
 */
export async function getCacheStats(
  supabaseUrl: string,
  supabaseKey: string,
  userId: string
): Promise<{
  totalEntries: number;
  staleEntries: number;
  byType: Record<string, number>;
  bySource: Record<string, number>;
}> {
  const supabase = getSupabaseClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from('entity_resolution_cache')
    .select('entity_type, resolution_source, last_verified_at')
    .eq('user_id', userId);

  if (error || !data) {
    return {
      totalEntries: 0,
      staleEntries: 0,
      byType: {},
      bySource: {}
    };
  }

  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() - CACHE_EXPIRATION_DAYS);

  const stats = {
    totalEntries: data.length,
    staleEntries: 0,
    byType: {} as Record<string, number>,
    bySource: {} as Record<string, number>
  };

  for (const row of data) {
    // Count stale entries
    if (!row.last_verified_at || new Date(row.last_verified_at) < expirationDate) {
      stats.staleEntries++;
    }

    // Count by type
    stats.byType[row.entity_type] = (stats.byType[row.entity_type] || 0) + 1;

    // Count by source
    stats.bySource[row.resolution_source] = (stats.bySource[row.resolution_source] || 0) + 1;
  }

  return stats;
}
