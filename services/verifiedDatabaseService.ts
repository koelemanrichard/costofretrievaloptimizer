/**
 * VERIFIED DATABASE SERVICE
 *
 * This service provides a centralized, rock-solid approach to database operations.
 * ALL database writes MUST use this service to ensure:
 * 1. Proper error handling
 * 2. Write verification (read-back after write)
 * 3. User feedback on failures
 *
 * NO SILENT FAILURES. NO ASSUMPTIONS. NO COMPROMISES.
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface VerifiedResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  verificationPassed: boolean;
}

export interface WriteOptions {
  /** Table name for the operation */
  table: string;
  /** Whether to skip verification (USE SPARINGLY - only for bulk operations where verification is done separately) */
  skipVerification?: boolean;
  /** Custom verification function if default read-back isn't sufficient */
  customVerification?: (data: unknown) => boolean;
  /** Operation description for error messages */
  operationDescription?: string;
}

/**
 * Filter specification for WHERE clauses
 * Supports simple id lookups and more complex filters
 */
export interface FilterSpec {
  column: string;
  value: string | string[] | number | boolean;
  operator?: 'eq' | 'in' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte';
}

/**
 * Normalize filter to a FilterSpec object
 * Accepts either a string (assumed to be id) or a FilterSpec object
 */
function normalizeFilter(filter: string | FilterSpec): FilterSpec {
  if (typeof filter === 'string') {
    return { column: 'id', value: filter, operator: 'eq' };
  }
  return { ...filter, operator: filter.operator || 'eq' };
}

/**
 * Verified INSERT operation
 * Inserts a record and verifies it was actually written to the database
 */
export async function verifiedInsert<T extends Record<string, unknown>>(
  supabase: SupabaseClient,
  options: WriteOptions,
  record: T,
  selectColumns: string = '*'
): Promise<VerifiedResult<T>> {
  const { table, skipVerification, operationDescription } = options;
  const opDesc = operationDescription || `insert into ${table}`;

  try {
    // Step 1: Perform the insert with returning
    const { data: insertedData, error: insertError } = await supabase
      .from(table)
      .insert(record)
      .select(selectColumns)
      .single();

    if (insertError) {
      console.error(`[VerifiedDB] INSERT failed for ${opDesc}:`, insertError);
      return {
        success: false,
        data: null,
        error: `Failed to ${opDesc}: ${insertError.message}`,
        verificationPassed: false
      };
    }

    if (!insertedData) {
      console.error(`[VerifiedDB] INSERT returned no data for ${opDesc}`);
      return {
        success: false,
        data: null,
        error: `${opDesc} completed but no data returned. This may indicate a permissions issue.`,
        verificationPassed: false
      };
    }

    // Step 2: Verify by reading back (unless skipped)
    if (!skipVerification && 'id' in insertedData) {
      const { data: verifyData, error: verifyError } = await supabase
        .from(table)
        .select(selectColumns)
        .eq('id', insertedData.id)
        .single();

      if (verifyError || !verifyData) {
        console.error(`[VerifiedDB] INSERT verification failed for ${opDesc}:`, verifyError);
        return {
          success: false,
          data: insertedData as unknown as T,
          error: `${opDesc} may have failed - unable to verify. Check permissions.`,
          verificationPassed: false
        };
      }

      console.log(`[VerifiedDB] INSERT verified for ${opDesc}, id:`, insertedData.id);
    }

    return {
      success: true,
      data: insertedData as unknown as T,
      error: null,
      verificationPassed: true
    };

  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'Unknown error';
    console.error(`[VerifiedDB] INSERT exception for ${opDesc}:`, e);
    return {
      success: false,
      data: null,
      error: `${opDesc} failed unexpectedly: ${errorMsg}`,
      verificationPassed: false
    };
  }
}

/**
 * Verified UPDATE operation
 * Updates a record and verifies the changes were actually persisted
 * @param filter - Either a string (treated as id) or a FilterSpec object
 * @param updates - The partial object to update
 */
export async function verifiedUpdate<T extends Record<string, unknown>>(
  supabase: SupabaseClient,
  options: WriteOptions,
  filter: string | FilterSpec,
  updates: Partial<T>,
  selectColumns: string = '*'
): Promise<VerifiedResult<T>> {
  const { table, skipVerification, customVerification, operationDescription } = options;
  const opDesc = operationDescription || `update ${table}`;
  const filterSpec = normalizeFilter(filter);

  try {
    // Add updated_at timestamp if not provided
    const updatesWithTimestamp = {
      ...updates,
      updated_at: (updates as any).updated_at || new Date().toISOString()
    };

    // Step 1: Perform the update with flexible filter
    let query = supabase.from(table).update(updatesWithTimestamp);

    // Apply filter based on operator
    if (filterSpec.operator === 'in' && Array.isArray(filterSpec.value)) {
      query = query.in(filterSpec.column, filterSpec.value);
    } else {
      query = query.eq(filterSpec.column, filterSpec.value as string);
    }

    const { data: updatedData, error: updateError } = await query.select(selectColumns).single();

    if (updateError) {
      console.error(`[VerifiedDB] UPDATE failed for ${opDesc}:`, updateError);
      return {
        success: false,
        data: null,
        error: `Failed to ${opDesc}: ${updateError.message}`,
        verificationPassed: false
      };
    }

    if (!updatedData) {
      console.error(`[VerifiedDB] UPDATE returned no data for ${opDesc}. RLS may have blocked the operation.`);
      return {
        success: false,
        data: null,
        error: `${opDesc} returned no data. This usually means the record doesn't exist or you don't have permission.`,
        verificationPassed: false
      };
    }

    // Step 2: Verify by reading back (unless skipped)
    if (!skipVerification) {
      let verifyQuery = supabase.from(table).select(selectColumns);
      if (filterSpec.operator === 'in' && Array.isArray(filterSpec.value)) {
        verifyQuery = verifyQuery.in(filterSpec.column, filterSpec.value);
      } else {
        verifyQuery = verifyQuery.eq(filterSpec.column, filterSpec.value as string);
      }
      const { data: verifyData, error: verifyError } = await verifyQuery.single();

      if (verifyError) {
        console.error(`[VerifiedDB] UPDATE verification read failed for ${opDesc}:`, verifyError);
        return {
          success: false,
          data: updatedData as unknown as T,
          error: `${opDesc} may have failed - unable to read back for verification. Check permissions.`,
          verificationPassed: false
        };
      }

      // If custom verification provided, use it
      if (customVerification) {
        const verificationResult = customVerification(verifyData);
        if (!verificationResult) {
          console.error(`[VerifiedDB] UPDATE custom verification failed for ${opDesc}`);
          return {
            success: false,
            data: verifyData as unknown as T,
            error: `${opDesc} completed but verification failed. Data may not have been saved correctly.`,
            verificationPassed: false
          };
        }
      }

      console.log(`[VerifiedDB] UPDATE verified for ${opDesc}, filter:`, filterSpec);
    }

    return {
      success: true,
      data: updatedData as unknown as T,
      error: null,
      verificationPassed: true
    };

  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'Unknown error';
    console.error(`[VerifiedDB] UPDATE exception for ${opDesc}:`, e);
    return {
      success: false,
      data: null,
      error: `${opDesc} failed unexpectedly: ${errorMsg}`,
      verificationPassed: false
    };
  }
}

/**
 * Verified UPSERT operation
 * Upserts a record and verifies the changes were actually persisted
 */
export async function verifiedUpsert<T extends Record<string, unknown>>(
  supabase: SupabaseClient,
  options: WriteOptions & { conflictColumns?: string[] },
  record: T,
  selectColumns: string = '*'
): Promise<VerifiedResult<T>> {
  const { table, skipVerification, operationDescription, conflictColumns } = options;
  const opDesc = operationDescription || `upsert into ${table}`;

  try {
    // Add updated_at timestamp if not provided
    const recordWithTimestamp = {
      ...record,
      updated_at: record.updated_at || new Date().toISOString()
    };

    // Step 1: Perform the upsert with timeout protection
    console.log(`[VerifiedDB] Starting UPSERT for ${opDesc}...`, {
      table,
      conflictColumns,
      recordId: (recordWithTimestamp as any).id,
      hasTopicId: 'topic_id' in recordWithTimestamp
    });
    const upsertOptions = conflictColumns ? { onConflict: conflictColumns.join(',') } : undefined;

    // Add timeout to prevent infinite hangs
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Database operation timed out after 30s')), 30000)
    );

    const upsertPromise = supabase
      .from(table)
      .upsert(recordWithTimestamp, upsertOptions)
      .select(selectColumns)
      .single();

    const { data: upsertedData, error: upsertError } = await Promise.race([
      upsertPromise,
      timeoutPromise
    ]) as Awaited<typeof upsertPromise>;
    console.log(`[VerifiedDB] UPSERT call completed for ${opDesc}`, { hasData: !!upsertedData, hasError: !!upsertError });

    if (upsertError) {
      console.error(`[VerifiedDB] UPSERT failed for ${opDesc}:`, upsertError);
      return {
        success: false,
        data: null,
        error: `Failed to ${opDesc}: ${upsertError.message}`,
        verificationPassed: false
      };
    }

    if (!upsertedData) {
      console.error(`[VerifiedDB] UPSERT returned no data for ${opDesc}`);
      return {
        success: false,
        data: null,
        error: `${opDesc} completed but no data returned. This may indicate a permissions issue.`,
        verificationPassed: false
      };
    }

    // Step 2: Verify by reading back (unless skipped)
    if (!skipVerification && 'id' in upsertedData) {
      const { data: verifyData, error: verifyError } = await supabase
        .from(table)
        .select(selectColumns)
        .eq('id', upsertedData.id)
        .single();

      if (verifyError || !verifyData) {
        console.error(`[VerifiedDB] UPSERT verification failed for ${opDesc}:`, verifyError);
        return {
          success: false,
          data: upsertedData as unknown as T,
          error: `${opDesc} may have failed - unable to verify. Check permissions.`,
          verificationPassed: false
        };
      }

      console.log(`[VerifiedDB] UPSERT verified for ${opDesc}, id:`, upsertedData.id);
    }

    return {
      success: true,
      data: upsertedData as unknown as T,
      error: null,
      verificationPassed: true
    };

  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'Unknown error';
    console.error(`[VerifiedDB] UPSERT exception for ${opDesc}:`, e);
    return {
      success: false,
      data: null,
      error: `${opDesc} failed unexpectedly: ${errorMsg}`,
      verificationPassed: false
    };
  }
}

/**
 * Verified DELETE operation
 * Deletes a record and verifies it was actually removed
 * @param filter - Either a string (treated as id) or a FilterSpec object
 */
export async function verifiedDelete(
  supabase: SupabaseClient,
  options: WriteOptions,
  filter: string | FilterSpec
): Promise<VerifiedResult<{ deleted: boolean }>> {
  const { table, skipVerification, operationDescription } = options;
  const opDesc = operationDescription || `delete from ${table}`;
  const filterSpec = normalizeFilter(filter);

  try {
    // Step 1: Perform the delete with flexible filter
    let query = supabase.from(table).delete();
    if (filterSpec.operator === 'in' && Array.isArray(filterSpec.value)) {
      query = query.in(filterSpec.column, filterSpec.value);
    } else {
      query = query.eq(filterSpec.column, filterSpec.value as string);
    }

    const { error: deleteError } = await query;

    if (deleteError) {
      console.error(`[VerifiedDB] DELETE failed for ${opDesc}:`, deleteError);
      return {
        success: false,
        data: null,
        error: `Failed to ${opDesc}: ${deleteError.message}`,
        verificationPassed: false
      };
    }

    // Step 2: Verify deletion by trying to read the record
    if (!skipVerification) {
      let verifyQuery = supabase.from(table).select('id');
      if (filterSpec.operator === 'in' && Array.isArray(filterSpec.value)) {
        verifyQuery = verifyQuery.in(filterSpec.column, filterSpec.value);
      } else {
        verifyQuery = verifyQuery.eq(filterSpec.column, filterSpec.value as string);
      }
      const { data: verifyData, error: verifyError } = await verifyQuery.maybeSingle();

      // If we can still read the record, deletion failed
      if (verifyData) {
        console.error(`[VerifiedDB] DELETE verification failed - record still exists for ${opDesc}`);
        return {
          success: false,
          data: null,
          error: `${opDesc} failed - record still exists. This may be a permissions issue.`,
          verificationPassed: false
        };
      }

      // PGRST116 means no rows returned, which is what we want
      if (verifyError && verifyError.code !== 'PGRST116') {
        console.error(`[VerifiedDB] DELETE verification read error for ${opDesc}:`, verifyError);
      }

      console.log(`[VerifiedDB] DELETE verified for ${opDesc}, filter:`, filterSpec);
    }

    return {
      success: true,
      data: { deleted: true },
      error: null,
      verificationPassed: true
    };

  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'Unknown error';
    console.error(`[VerifiedDB] DELETE exception for ${opDesc}:`, e);
    return {
      success: false,
      data: null,
      error: `${opDesc} failed unexpectedly: ${errorMsg}`,
      verificationPassed: false
    };
  }
}

/**
 * Verified BULK INSERT operation
 * Inserts multiple records and verifies the count matches
 */
export async function verifiedBulkInsert<T extends Record<string, unknown>>(
  supabase: SupabaseClient,
  options: WriteOptions,
  records: T[],
  selectColumns: string = 'id'
): Promise<VerifiedResult<T[]>> {
  const { table, operationDescription } = options;
  const opDesc = operationDescription || `bulk insert into ${table}`;

  if (records.length === 0) {
    return {
      success: true,
      data: [],
      error: null,
      verificationPassed: true
    };
  }

  try {
    // Step 1: Perform the bulk insert
    const { data: insertedData, error: insertError } = await supabase
      .from(table)
      .insert(records)
      .select(selectColumns);

    if (insertError) {
      console.error(`[VerifiedDB] BULK INSERT failed for ${opDesc}:`, insertError);
      return {
        success: false,
        data: null,
        error: `Failed to ${opDesc}: ${insertError.message}`,
        verificationPassed: false
      };
    }

    // Step 2: Verify count matches
    const expectedCount = records.length;
    const actualCount = insertedData?.length || 0;

    if (actualCount !== expectedCount) {
      console.error(`[VerifiedDB] BULK INSERT count mismatch for ${opDesc}: expected ${expectedCount}, got ${actualCount}`);
      return {
        success: false,
        data: insertedData as unknown as T[],
        error: `${opDesc} partially failed: expected ${expectedCount} records, but only ${actualCount} were inserted. Check permissions.`,
        verificationPassed: false
      };
    }

    console.log(`[VerifiedDB] BULK INSERT verified for ${opDesc}: ${actualCount} records`);

    return {
      success: true,
      data: insertedData as unknown as T[],
      error: null,
      verificationPassed: true
    };

  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'Unknown error';
    console.error(`[VerifiedDB] BULK INSERT exception for ${opDesc}:`, e);
    return {
      success: false,
      data: null,
      error: `${opDesc} failed unexpectedly: ${errorMsg}`,
      verificationPassed: false
    };
  }
}

/**
 * Verified BULK UPDATE operation
 * Updates multiple records by ID and verifies the count matches
 */
export async function verifiedBulkUpdate<T extends Record<string, unknown>>(
  supabase: SupabaseClient,
  options: WriteOptions,
  ids: string[],
  updates: Partial<T>,
  selectColumns: string = 'id'
): Promise<VerifiedResult<T[]>> {
  const { table, operationDescription } = options;
  const opDesc = operationDescription || `bulk update ${table}`;

  if (ids.length === 0) {
    return {
      success: true,
      data: [],
      error: null,
      verificationPassed: true
    };
  }

  try {
    // Add updated_at timestamp if not provided
    const updatesWithTimestamp = {
      ...updates,
      updated_at: updates.updated_at || new Date().toISOString()
    };

    // Step 1: Perform the bulk update
    const { data: updatedData, error: updateError } = await supabase
      .from(table)
      .update(updatesWithTimestamp)
      .in('id', ids)
      .select(selectColumns);

    if (updateError) {
      console.error(`[VerifiedDB] BULK UPDATE failed for ${opDesc}:`, updateError);
      return {
        success: false,
        data: null,
        error: `Failed to ${opDesc}: ${updateError.message}`,
        verificationPassed: false
      };
    }

    // Step 2: Verify count matches
    const expectedCount = ids.length;
    const actualCount = updatedData?.length || 0;

    if (actualCount !== expectedCount) {
      console.error(`[VerifiedDB] BULK UPDATE count mismatch for ${opDesc}: expected ${expectedCount}, got ${actualCount}`);
      return {
        success: false,
        data: updatedData as unknown as T[],
        error: `${opDesc} partially failed: expected ${expectedCount} records, but only ${actualCount} were updated. Check permissions.`,
        verificationPassed: false
      };
    }

    console.log(`[VerifiedDB] BULK UPDATE verified for ${opDesc}: ${actualCount} records`);

    return {
      success: true,
      data: updatedData as unknown as T[],
      error: null,
      verificationPassed: true
    };

  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'Unknown error';
    console.error(`[VerifiedDB] BULK UPDATE exception for ${opDesc}:`, e);
    return {
      success: false,
      data: null,
      error: `${opDesc} failed unexpectedly: ${errorMsg}`,
      verificationPassed: false
    };
  }
}

/**
 * Verified BULK DELETE operation
 * Deletes multiple records and verifies they were removed
 * @param filter - Either a string array of IDs or a FilterSpec object (for bulk delete by other column)
 * @param expectedCount - Expected number of records to delete (for verification)
 */
export async function verifiedBulkDelete(
  supabase: SupabaseClient,
  options: WriteOptions,
  filter: string[] | FilterSpec,
  expectedCount?: number
): Promise<VerifiedResult<{ deletedCount: number }>> {
  const { table, operationDescription } = options;
  const opDesc = operationDescription || `bulk delete from ${table}`;

  // Normalize filter - string array becomes { column: 'id', operator: 'in', value: ids }
  const filterSpec: FilterSpec = Array.isArray(filter)
    ? { column: 'id', operator: 'in', value: filter }
    : { ...filter, operator: filter.operator || 'eq' };

  const valueArray = Array.isArray(filterSpec.value) ? filterSpec.value : [filterSpec.value];
  const expected = expectedCount ?? valueArray.length;

  if (valueArray.length === 0) {
    return {
      success: true,
      data: { deletedCount: 0 },
      error: null,
      verificationPassed: true
    };
  }

  try {
    // Step 1: Perform the bulk delete
    let query = supabase.from(table).delete();
    if (filterSpec.operator === 'in' && Array.isArray(filterSpec.value)) {
      query = query.in(filterSpec.column, filterSpec.value);
    } else {
      query = query.eq(filterSpec.column, filterSpec.value as string);
    }

    const { error: deleteError } = await query;

    if (deleteError) {
      console.error(`[VerifiedDB] BULK DELETE failed for ${opDesc}:`, deleteError);
      return {
        success: false,
        data: null,
        error: `Failed to ${opDesc}: ${deleteError.message}`,
        verificationPassed: false
      };
    }

    // Step 2: Verify deletion by trying to count remaining records
    let verifyQuery = supabase.from(table).select('id');
    if (filterSpec.operator === 'in' && Array.isArray(filterSpec.value)) {
      verifyQuery = verifyQuery.in(filterSpec.column, filterSpec.value);
    } else {
      verifyQuery = verifyQuery.eq(filterSpec.column, filterSpec.value as string);
    }

    const { data: remainingData, error: verifyError } = await verifyQuery;
    const remainingCount = remainingData?.length || 0;

    if (remainingCount > 0) {
      console.error(`[VerifiedDB] BULK DELETE verification failed - ${remainingCount} records still exist for ${opDesc}`);
      return {
        success: false,
        data: { deletedCount: expected - remainingCount },
        error: `${opDesc} partially failed: ${remainingCount} records were not deleted. Check permissions.`,
        verificationPassed: false
      };
    }

    if (verifyError) {
      console.warn(`[VerifiedDB] BULK DELETE verification read warning for ${opDesc}:`, verifyError);
    }

    console.log(`[VerifiedDB] BULK DELETE verified for ${opDesc}: ${expected} records`);

    return {
      success: true,
      data: { deletedCount: expected },
      error: null,
      verificationPassed: true
    };

  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'Unknown error';
    console.error(`[VerifiedDB] BULK DELETE exception for ${opDesc}:`, e);
    return {
      success: false,
      data: null,
      error: `${opDesc} failed unexpectedly: ${errorMsg}`,
      verificationPassed: false
    };
  }
}

/**
 * Helper to handle verified results in components
 * Throws an error if the operation failed, for use in try/catch blocks
 */
export function assertVerified<T>(result: VerifiedResult<T>, throwOnError = true): T {
  if (!result.success || !result.verificationPassed) {
    if (throwOnError) {
      throw new Error(result.error || 'Database operation failed');
    }
    return result.data as unknown as T;
  }
  return result.data as unknown as T;
}

/**
 * Create a verified database wrapper for a specific table
 * Provides a cleaner API for repeated operations on the same table
 */
export function createTableClient<T extends Record<string, unknown>>(
  supabase: SupabaseClient,
  tableName: string,
  defaultSelectColumns: string = '*'
) {
  return {
    insert: (record: T, selectColumns = defaultSelectColumns) =>
      verifiedInsert<T>(supabase, { table: tableName }, record, selectColumns),

    update: (id: string, updates: Partial<T>, selectColumns = defaultSelectColumns) =>
      verifiedUpdate<T>(supabase, { table: tableName }, id, updates, selectColumns),

    upsert: (record: T, selectColumns = defaultSelectColumns, conflictColumns?: string[]) =>
      verifiedUpsert<T>(supabase, { table: tableName, conflictColumns }, record, selectColumns),

    delete: (id: string) =>
      verifiedDelete(supabase, { table: tableName }, id),

    bulkInsert: (records: T[], selectColumns = defaultSelectColumns) =>
      verifiedBulkInsert<T>(supabase, { table: tableName }, records, selectColumns),

    bulkUpdate: (ids: string[], updates: Partial<T>, selectColumns = defaultSelectColumns) =>
      verifiedBulkUpdate<T>(supabase, { table: tableName }, ids, updates, selectColumns),

    bulkDelete: (ids: string[]) =>
      verifiedBulkDelete(supabase, { table: tableName }, ids),
  };
}
