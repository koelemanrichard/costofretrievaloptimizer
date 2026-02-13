import { describe, it, expect, vi } from 'vitest';
import { batchedIn } from '../supabaseBatchQuery';

/** Helper: create a mock SupabaseClient where `.in()` resolves to the given rows. */
function mockSupabase(responder: (table: string, ids: string[]) => { data: any[] | null; error: any }) {
  return {
    from: (table: string) => ({
      select: (_cols: string) => {
        let captured: { column: string; values: string[] } | null = null;
        const builder: any = {
          in: (column: string, values: string[]) => {
            captured = { column, values };
            return builder;
          },
          eq: () => builder,
          order: () => builder,
          then: (resolve: any) => {
            const result = responder(table, captured!.values);
            resolve(result);
          },
        };
        // Make the builder thenable so `await` works
        builder[Symbol.for('nodejs.util.inspect.custom')] = undefined;
        // Override to make Promise.resolve / await work via .then
        return builder;
      },
    }),
  } as any;
}

describe('batchedIn', () => {
  it('returns empty array for empty values', async () => {
    const supabase = mockSupabase(() => ({ data: [], error: null }));
    const { data, error } = await batchedIn(supabase, 'test', '*', 'id', []);
    expect(data).toEqual([]);
    expect(error).toBeNull();
  });

  it('does NOT batch when values.length <= 200 (fast path)', async () => {
    const callCounts = { from: 0 };
    const ids = Array.from({ length: 200 }, (_, i) => `id-${i}`);
    const supabase = mockSupabase((_table, vals) => {
      callCounts.from++;
      return { data: vals.map(id => ({ id })), error: null };
    });

    const { data, error } = await batchedIn(supabase, 'items', '*', 'id', ids);
    expect(error).toBeNull();
    expect(data).toHaveLength(200);
    expect(callCounts.from).toBe(1);
  });

  it('batches 201 values into 2 queries', async () => {
    const batchSizes: number[] = [];
    const ids = Array.from({ length: 201 }, (_, i) => `id-${i}`);
    const supabase = mockSupabase((_table, vals) => {
      batchSizes.push(vals.length);
      return { data: vals.map(id => ({ id })), error: null };
    });

    const { data, error } = await batchedIn(supabase, 'items', '*', 'id', ids);
    expect(error).toBeNull();
    expect(data).toHaveLength(201);
    expect(batchSizes).toEqual([200, 1]);
  });

  it('batches 851 values into 5 queries (200+200+200+200+51)', async () => {
    const batchSizes: number[] = [];
    const ids = Array.from({ length: 851 }, (_, i) => `uuid-${i}`);
    const supabase = mockSupabase((_table, vals) => {
      batchSizes.push(vals.length);
      return { data: vals.map(id => ({ id })), error: null };
    });

    const { data, error } = await batchedIn(supabase, 'content_briefs', '*', 'topic_id', ids);
    expect(error).toBeNull();
    expect(data).toHaveLength(851);
    expect(batchSizes).toEqual([200, 200, 200, 200, 51]);
  });

  it('passes applyFilters callback to each batch query', async () => {
    const filterCalls: string[][] = [];
    const ids = Array.from({ length: 401 }, (_, i) => `id-${i}`);

    const supabase = {
      from: () => ({
        select: () => {
          const builder: any = {
            in: (_col: string, _vals: string[]) => builder,
            eq: (col: string, val: string) => {
              filterCalls.push([col, val]);
              return builder;
            },
            then: (resolve: any) => resolve({ data: [{ id: 1 }], error: null }),
          };
          return builder;
        },
      }),
    } as any;

    await batchedIn(supabase, 'items', '*', 'id', ids, (q) => q.eq('status', 'active'));
    // 3 batches (200+200+1) → filter called 3 times
    expect(filterCalls).toHaveLength(3);
    expect(filterCalls[0]).toEqual(['status', 'active']);
  });

  it('returns first error and null data on failure', async () => {
    const ids = Array.from({ length: 401 }, (_, i) => `id-${i}`);
    const mockError = { message: 'URL too long', code: '400' };

    const supabase = mockSupabase((_table, vals) => {
      // Fail only on the second batch
      if (vals[0] === 'id-200') return { data: null, error: mockError };
      return { data: vals.map(id => ({ id })), error: null };
    });

    const { data, error } = await batchedIn(supabase, 'items', '*', 'id', ids);
    expect(data).toBeNull();
    expect(error).toBe(mockError);
  });
});
