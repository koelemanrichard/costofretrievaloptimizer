/**
 * Batched Supabase `.in()` queries to avoid PostgREST URL length limits.
 *
 * PostgREST has an ~8 KB URL limit. A UUID is 36 chars + comma separator,
 * so 200 UUIDs ≈ 7,400 chars — safely under the limit.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

const BATCH_SIZE = 200;

type QueryBuilder = ReturnType<ReturnType<SupabaseClient['from']>['select']>;

/**
 * Drop-in replacement for `supabase.from(table).select(cols).in(column, values)`
 * that automatically chunks large ID arrays into parallel batches of 200.
 *
 * @param applyFilters - Optional callback to add extra filters (`.eq()`, `.in()`, `.order()`, etc.)
 *                       to each batch query before execution.
 */
export async function batchedIn<T = any>(
  supabase: SupabaseClient,
  table: string,
  selectColumns: string,
  column: string,
  values: string[],
  applyFilters?: (query: QueryBuilder) => QueryBuilder
): Promise<{ data: T[] | null; error: any }> {
  if (values.length === 0) {
    return { data: [], error: null };
  }

  // Fast path — no batching needed
  if (values.length <= BATCH_SIZE) {
    let query = supabase.from(table).select(selectColumns).in(column, values);
    if (applyFilters) query = applyFilters(query) as any;
    const { data, error } = await query;
    return { data: data as T[] | null, error };
  }

  // Chunk into batches and run in parallel
  const batches: string[][] = [];
  for (let i = 0; i < values.length; i += BATCH_SIZE) {
    batches.push(values.slice(i, i + BATCH_SIZE));
  }

  const results = await Promise.all(
    batches.map(async (batch) => {
      let query = supabase.from(table).select(selectColumns).in(column, batch);
      if (applyFilters) query = applyFilters(query) as any;
      return query;
    })
  );

  // Fail-fast: return first error encountered
  for (const result of results) {
    if (result.error) {
      return { data: null, error: result.error };
    }
  }

  // Merge all data arrays
  const merged = results.flatMap((r) => (r.data as T[]) || []);
  return { data: merged, error: null };
}
