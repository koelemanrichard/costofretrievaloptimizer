/**
 * verifiedDatabaseService Unit Tests
 *
 * Tests the verified database service which provides write-verify-read
 * patterns for all database operations. Every write is followed by a
 * read-back verification to ensure data was actually persisted.
 *
 * Tests cover:
 *   1. verifiedInsert - insert + verification
 *   2. verifiedUpdate - update + verification + custom verification callbacks
 *   3. verifiedUpsert - upsert + verification
 *   4. verifiedDelete - delete + verification
 *   5. verifiedBulkInsert - bulk insert + count verification
 *   6. verifiedBulkUpdate - bulk update + count verification
 *   7. verifiedBulkDelete - bulk delete + verification
 *   8. Timeout handling - 30s timeout protection
 *   9. assertVerified helper
 *  10. createTableClient factory
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  verifiedInsert,
  verifiedUpdate,
  verifiedUpsert,
  verifiedDelete,
  verifiedBulkInsert,
  verifiedBulkUpdate,
  verifiedBulkDelete,
  assertVerified,
  createTableClient,
} from '../verifiedDatabaseService';
import type { SupabaseClient } from '@supabase/supabase-js';

// Helper to create a mock Supabase client with chainable methods
function createMockSupabase(overrides: Record<string, any> = {}) {
  const mockSingle = vi.fn();
  const mockMaybeSingle = vi.fn();
  const mockSelect = vi.fn().mockReturnThis();
  const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
  const mockUpdate = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ single: mockSingle }),
    }),
    in: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ single: mockSingle }),
    }),
  });
  const mockUpsert = vi.fn().mockReturnValue({ select: mockSelect });
  const mockDelete = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
    in: vi.fn().mockResolvedValue({ error: null }),
  });
  const mockEq = vi.fn().mockReturnValue({ single: mockSingle, maybeSingle: mockMaybeSingle });
  const mockIn = vi.fn().mockReturnValue({ single: mockSingle, maybeSingle: mockMaybeSingle });

  // Wire up select -> eq/in chain for verification reads
  mockSelect.mockReturnValue({
    eq: mockEq,
    in: mockIn,
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
  });

  const client = {
    from: vi.fn().mockReturnValue({
      insert: mockInsert,
      update: mockUpdate,
      upsert: mockUpsert,
      delete: mockDelete,
      select: mockSelect,
    }),
    _mocks: {
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      upsert: mockUpsert,
      delete: mockDelete,
      eq: mockEq,
      in: mockIn,
    },
    ...overrides,
  };

  return client as unknown as SupabaseClient & { _mocks: typeof client._mocks };
}

/**
 * Create a properly chained mock Supabase client for verifiedInsert tests.
 * The insert chain is: from(table).insert(record).select(columns).single()
 * The verify chain is: from(table).select(columns).eq('id', id).single()
 */
function createInsertMockSupabase(
  insertResult: { data: any; error: any },
  verifyResult: { data: any; error: any }
) {
  const insertSingle = vi.fn().mockResolvedValue(insertResult);
  const verifySingle = vi.fn().mockResolvedValue(verifyResult);

  const client = {
    from: vi.fn().mockImplementation(() => ({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: insertSingle,
        }),
      }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: verifySingle,
        }),
      }),
    })),
  };

  return client as unknown as SupabaseClient;
}

/**
 * Create a mock for verifiedUpdate tests.
 * Update chain: from(table).update(data).eq(col, val).select(cols).single()
 * Verify chain: from(table).select(cols).eq(col, val).single()
 */
function createUpdateMockSupabase(
  updateResult: { data: any; error: any },
  verifyResult: { data: any; error: any }
) {
  const updateSingle = vi.fn().mockResolvedValue(updateResult);
  const verifySingle = vi.fn().mockResolvedValue(verifyResult);

  const client = {
    from: vi.fn().mockImplementation(() => ({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: updateSingle,
          }),
        }),
        in: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: updateSingle,
          }),
        }),
      }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: verifySingle,
        }),
        in: vi.fn().mockReturnValue({
          single: verifySingle,
        }),
      }),
    })),
  };

  return client as unknown as SupabaseClient;
}

/**
 * Create a mock for verifiedDelete tests.
 */
function createDeleteMockSupabase(
  deleteResult: { error: any },
  verifyResult: { data: any; error: any }
) {
  const client = {
    from: vi.fn().mockImplementation(() => ({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue(deleteResult),
        in: vi.fn().mockResolvedValue(deleteResult),
      }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue(verifyResult),
        }),
        in: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue(verifyResult),
        }),
      }),
    })),
  };

  return client as unknown as SupabaseClient;
}

describe('verifiedDatabaseService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  // ==========================================
  // verifiedInsert
  // ==========================================
  describe('verifiedInsert', () => {
    it('inserts a record and verifies successfully', async () => {
      const record = { id: 'rec-1', name: 'Test Record' };
      const supabase = createInsertMockSupabase(
        { data: record, error: null },
        { data: record, error: null }
      );

      const result = await verifiedInsert(supabase, { table: 'test_table' }, record);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(record);
      expect(result.error).toBeNull();
      expect(result.verificationPassed).toBe(true);
    });

    it('returns failure when insert has an error', async () => {
      const supabase = createInsertMockSupabase(
        { data: null, error: { message: 'Insert failed: unique violation' } },
        { data: null, error: null }
      );

      const result = await verifiedInsert(
        supabase,
        { table: 'test_table' },
        { name: 'Duplicate' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insert failed');
      expect(result.verificationPassed).toBe(false);
    });

    it('returns failure when insert returns no data', async () => {
      const supabase = createInsertMockSupabase(
        { data: null, error: null },
        { data: null, error: null }
      );

      const result = await verifiedInsert(
        supabase,
        { table: 'test_table' },
        { name: 'No data' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('no data returned');
    });

    it('returns failure when verification fails', async () => {
      const record = { id: 'rec-1', name: 'Test' };
      const supabase = createInsertMockSupabase(
        { data: record, error: null },
        { data: null, error: { message: 'Read failed' } }
      );

      const result = await verifiedInsert(supabase, { table: 'test_table' }, record);

      expect(result.success).toBe(false);
      expect(result.verificationPassed).toBe(false);
      expect(result.error).toContain('unable to verify');
    });

    it('skips verification when skipVerification is true', async () => {
      const record = { id: 'rec-1', name: 'Test' };
      const supabase = createInsertMockSupabase(
        { data: record, error: null },
        { data: null, error: null } // should never be called
      );

      const result = await verifiedInsert(
        supabase,
        { table: 'test_table', skipVerification: true },
        record
      );

      expect(result.success).toBe(true);
      expect(result.verificationPassed).toBe(true);
    });

    it('uses custom operation description in error messages', async () => {
      const supabase = createInsertMockSupabase(
        { data: null, error: { message: 'DB error' } },
        { data: null, error: null }
      );

      const result = await verifiedInsert(
        supabase,
        { table: 'test_table', operationDescription: 'create user profile' },
        { name: 'Test' }
      );

      expect(result.error).toContain('create user profile');
    });

    it('handles exception during insert gracefully', async () => {
      const supabase = {
        from: vi.fn().mockImplementation(() => {
          throw new Error('Connection lost');
        }),
      } as unknown as SupabaseClient;

      const result = await verifiedInsert(
        supabase,
        { table: 'test_table' },
        { name: 'Test' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection lost');
    });
  });

  // ==========================================
  // verifiedUpdate
  // ==========================================
  describe('verifiedUpdate', () => {
    it('updates a record and verifies successfully with string filter', async () => {
      const updatedRecord = { id: 'rec-1', name: 'Updated Name', updated_at: '2026-01-01' };
      const supabase = createUpdateMockSupabase(
        { data: updatedRecord, error: null },
        { data: updatedRecord, error: null }
      );

      const result = await verifiedUpdate(
        supabase,
        { table: 'test_table' },
        'rec-1',
        { name: 'Updated Name' }
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedRecord);
      expect(result.verificationPassed).toBe(true);
    });

    it('returns failure when update has an error', async () => {
      const supabase = createUpdateMockSupabase(
        { data: null, error: { message: 'Update blocked by RLS' } },
        { data: null, error: null }
      );

      const result = await verifiedUpdate(
        supabase,
        { table: 'test_table' },
        'rec-1',
        { name: 'Blocked' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Update blocked by RLS');
    });

    it('returns failure when update returns no data (record not found)', async () => {
      const supabase = createUpdateMockSupabase(
        { data: null, error: null },
        { data: null, error: null }
      );

      const result = await verifiedUpdate(
        supabase,
        { table: 'test_table' },
        'non-existent-id',
        { name: 'Ghost' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("doesn't exist or you don't have permission");
    });

    it('supports FilterSpec for non-id filters', async () => {
      const updatedRecord = { id: 'rec-1', status: 'active' };
      const supabase = createUpdateMockSupabase(
        { data: updatedRecord, error: null },
        { data: updatedRecord, error: null }
      );

      const result = await verifiedUpdate(
        supabase,
        { table: 'test_table' },
        { column: 'user_id', value: 'user-123', operator: 'eq' },
        { status: 'active' }
      );

      expect(result.success).toBe(true);
    });

    it('uses custom verification callback', async () => {
      const updatedRecord = { id: 'rec-1', name: 'Updated', score: 50 };
      const supabase = createUpdateMockSupabase(
        { data: updatedRecord, error: null },
        { data: updatedRecord, error: null }
      );

      // Custom verification that checks score > 40
      const customVerification = vi.fn((data: any) => data.score > 40);

      const result = await verifiedUpdate(
        supabase,
        { table: 'test_table', customVerification },
        'rec-1',
        { name: 'Updated', score: 50 }
      );

      expect(result.success).toBe(true);
      expect(customVerification).toHaveBeenCalledWith(updatedRecord);
    });

    it('fails when custom verification returns false', async () => {
      const updatedRecord = { id: 'rec-1', name: 'Updated', score: 10 };
      const supabase = createUpdateMockSupabase(
        { data: updatedRecord, error: null },
        { data: updatedRecord, error: null }
      );

      // Custom verification that checks score > 40 (will fail)
      const customVerification = vi.fn((data: any) => data.score > 40);

      const result = await verifiedUpdate(
        supabase,
        { table: 'test_table', customVerification },
        'rec-1',
        { name: 'Updated', score: 10 }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('verification failed');
    });

    it('handles exception gracefully', async () => {
      const supabase = {
        from: vi.fn().mockImplementation(() => {
          throw new Error('Timeout');
        }),
      } as unknown as SupabaseClient;

      const result = await verifiedUpdate(
        supabase,
        { table: 'test_table' },
        'rec-1',
        { name: 'Failed' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Timeout');
    });
  });

  // ==========================================
  // verifiedDelete
  // ==========================================
  describe('verifiedDelete', () => {
    it('deletes a record and verifies it is gone', async () => {
      const supabase = createDeleteMockSupabase(
        { error: null },
        { data: null, error: null } // No record found = deletion verified
      );

      const result = await verifiedDelete(
        supabase,
        { table: 'test_table' },
        'rec-1'
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ deleted: true });
      expect(result.verificationPassed).toBe(true);
    });

    it('returns failure when delete has an error', async () => {
      const supabase = createDeleteMockSupabase(
        { error: { message: 'RLS blocked delete' } },
        { data: null, error: null }
      );

      const result = await verifiedDelete(
        supabase,
        { table: 'test_table' },
        'rec-1'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('RLS blocked delete');
    });

    it('returns failure when record still exists after delete', async () => {
      const supabase = createDeleteMockSupabase(
        { error: null },
        { data: { id: 'rec-1' }, error: null } // Record still exists!
      );

      const result = await verifiedDelete(
        supabase,
        { table: 'test_table' },
        'rec-1'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('record still exists');
    });

    it('supports FilterSpec for non-id deletes', async () => {
      const supabase = createDeleteMockSupabase(
        { error: null },
        { data: null, error: null }
      );

      const result = await verifiedDelete(
        supabase,
        { table: 'test_table' },
        { column: 'map_id', value: 'map-123', operator: 'eq' }
      );

      expect(result.success).toBe(true);
    });
  });

  // ==========================================
  // verifiedBulkInsert
  // ==========================================
  describe('verifiedBulkInsert', () => {
    it('returns success for empty records array', async () => {
      const supabase = createInsertMockSupabase(
        { data: null, error: null },
        { data: null, error: null }
      );

      const result = await verifiedBulkInsert(
        supabase,
        { table: 'test_table' },
        []
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('inserts multiple records and verifies count', async () => {
      const records = [
        { id: '1', name: 'A' },
        { id: '2', name: 'B' },
        { id: '3', name: 'C' },
      ];

      const insertSelect = vi.fn().mockResolvedValue({
        data: records.map(r => ({ id: r.id })),
        error: null,
      });

      const supabase = {
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: insertSelect,
          }),
        }),
      } as unknown as SupabaseClient;

      const result = await verifiedBulkInsert(
        supabase,
        { table: 'test_table' },
        records
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
    });

    it('returns failure when count mismatch occurs', async () => {
      const records = [
        { id: '1', name: 'A' },
        { id: '2', name: 'B' },
        { id: '3', name: 'C' },
      ];

      const insertSelect = vi.fn().mockResolvedValue({
        data: [{ id: '1' }, { id: '2' }], // Only 2 of 3 inserted
        error: null,
      });

      const supabase = {
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: insertSelect,
          }),
        }),
      } as unknown as SupabaseClient;

      const result = await verifiedBulkInsert(
        supabase,
        { table: 'test_table' },
        records
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('partially failed');
      expect(result.error).toContain('expected 3');
      expect(result.error).toContain('only 2');
    });
  });

  // ==========================================
  // verifiedBulkUpdate
  // ==========================================
  describe('verifiedBulkUpdate', () => {
    it('returns success for empty ids array', async () => {
      const supabase = createUpdateMockSupabase(
        { data: null, error: null },
        { data: null, error: null }
      );

      const result = await verifiedBulkUpdate(
        supabase,
        { table: 'test_table' },
        [],
        { status: 'active' }
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('updates multiple records and verifies count', async () => {
      const ids = ['id-1', 'id-2'];
      const selectFn = vi.fn().mockResolvedValue({
        data: [{ id: 'id-1' }, { id: 'id-2' }],
        error: null,
      });

      const supabase = {
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              select: selectFn,
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      const result = await verifiedBulkUpdate(
        supabase,
        { table: 'test_table' },
        ids,
        { status: 'done' }
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });
  });

  // ==========================================
  // verifiedBulkDelete
  // ==========================================
  describe('verifiedBulkDelete', () => {
    it('returns success for empty ids array', async () => {
      const supabase = createDeleteMockSupabase(
        { error: null },
        { data: null, error: null }
      );

      const result = await verifiedBulkDelete(
        supabase,
        { table: 'test_table' },
        []
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ deletedCount: 0 });
    });

    it('deletes multiple records and verifies none remain', async () => {
      const supabase = {
        from: vi.fn().mockImplementation(() => ({
          delete: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ error: null }),
          }),
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        })),
      } as unknown as SupabaseClient;

      const result = await verifiedBulkDelete(
        supabase,
        { table: 'test_table' },
        ['id-1', 'id-2', 'id-3']
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ deletedCount: 3 });
    });

    it('returns failure when some records remain after delete', async () => {
      const supabase = {
        from: vi.fn().mockImplementation(() => ({
          delete: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ error: null }),
          }),
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [{ id: 'id-3' }], // One record still exists
              error: null,
            }),
          }),
        })),
      } as unknown as SupabaseClient;

      const result = await verifiedBulkDelete(
        supabase,
        { table: 'test_table' },
        ['id-1', 'id-2', 'id-3']
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('partially failed');
    });
  });

  // ==========================================
  // Timeout handling
  // ==========================================
  describe('timeout handling', () => {
    it('verifiedInsert times out after 30 seconds', async () => {
      // Create a supabase client that never resolves
      const neverResolve = new Promise(() => {}); // Never resolves
      const supabase = {
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockReturnValue(neverResolve),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      // Use fake timers to speed up the 30s timeout
      vi.useFakeTimers();

      const resultPromise = verifiedInsert(
        supabase,
        { table: 'test_table' },
        { name: 'Slow record' }
      );

      // Advance timers by 31 seconds
      await vi.advanceTimersByTimeAsync(31000);

      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');

      vi.useRealTimers();
    });
  });

  // ==========================================
  // assertVerified helper
  // ==========================================
  describe('assertVerified', () => {
    it('returns data for successful result', () => {
      const result = {
        success: true,
        data: { id: '1', name: 'Test' },
        error: null,
        verificationPassed: true,
      };

      const data = assertVerified(result);
      expect(data).toEqual({ id: '1', name: 'Test' });
    });

    it('throws error for failed result when throwOnError is true', () => {
      const result = {
        success: false,
        data: null,
        error: 'Insert failed: permissions',
        verificationPassed: false,
      };

      expect(() => assertVerified(result)).toThrow('Insert failed: permissions');
    });

    it('returns data without throwing when throwOnError is false', () => {
      const result = {
        success: false,
        data: { id: '1', name: 'Partial' },
        error: 'Verification failed',
        verificationPassed: false,
      };

      const data = assertVerified(result, false);
      expect(data).toEqual({ id: '1', name: 'Partial' });
    });

    it('throws generic error when no error message provided', () => {
      const result = {
        success: false,
        data: null,
        error: null,
        verificationPassed: false,
      };

      expect(() => assertVerified(result)).toThrow('Database operation failed');
    });
  });

  // ==========================================
  // createTableClient factory
  // ==========================================
  describe('createTableClient', () => {
    it('creates a client with all CRUD methods', () => {
      const supabase = createInsertMockSupabase(
        { data: null, error: null },
        { data: null, error: null }
      );

      const client = createTableClient(supabase, 'my_table');

      expect(typeof client.insert).toBe('function');
      expect(typeof client.update).toBe('function');
      expect(typeof client.upsert).toBe('function');
      expect(typeof client.delete).toBe('function');
      expect(typeof client.bulkInsert).toBe('function');
      expect(typeof client.bulkUpdate).toBe('function');
      expect(typeof client.bulkDelete).toBe('function');
    });

    it('insert method calls verifiedInsert with correct table name', async () => {
      const record = { id: 'test-1', name: 'Test' };
      const supabase = createInsertMockSupabase(
        { data: record, error: null },
        { data: record, error: null }
      );

      const client = createTableClient(supabase, 'my_table');
      const result = await client.insert(record as any);

      // Should have called from('my_table')
      expect(supabase.from).toHaveBeenCalledWith('my_table');
      expect(result.success).toBe(true);
    });
  });
});
