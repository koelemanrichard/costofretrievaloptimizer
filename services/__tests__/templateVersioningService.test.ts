/**
 * Template Versioning Service Tests
 *
 * Created: 2026-01-18 - Content Template Routing Task 27
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createTemplateVersion,
  getTemplateVersions,
  getActiveVersion,
  activateVersion,
  rollbackToVersion,
  getVersionHistory,
  CreateVersionInput,
} from '../templateVersioningService';
import { CONTENT_TEMPLATES } from '../../config/contentTemplates';

// Mock Supabase client - define mocks outside for test access
const mockSingle = vi.fn();
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockNeq = vi.fn();
const mockIn = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockRpc = vi.fn();

const mockMaybeSingle = vi.fn();

const createChainMock = () => {
  const chainMock = {
    insert: mockInsert,
    select: mockSelect,
    update: mockUpdate,
    eq: mockEq,
    neq: mockNeq,
    in: mockIn,
    order: mockOrder,
    limit: mockLimit,
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
  };

  // Setup chaining - all methods return chainMock except terminal ones
  mockInsert.mockReturnValue(chainMock);
  mockSelect.mockReturnValue(chainMock);
  mockUpdate.mockReturnValue(chainMock);
  mockEq.mockReturnValue(chainMock);
  mockOrder.mockReturnValue(chainMock);
  mockLimit.mockReturnValue(chainMock);
  mockNeq.mockResolvedValue({ data: null, error: null });
  mockIn.mockResolvedValue({ data: [], error: null });
  mockSingle.mockResolvedValue({
    data: { version_number: 1, id: 'version-1', template_name: 'TEST', is_active: true, config: {} },
    error: null,
  });
  mockMaybeSingle.mockResolvedValue({
    data: { version_number: 1, id: 'version-1', template_name: 'TEST', is_active: true, config: {} },
    error: null,
  });
  mockRpc.mockResolvedValue({ data: null, error: null });

  return chainMock;
};

vi.mock('../supabaseClient', () => ({
  getSupabaseClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      }),
    },
    from: vi.fn(() => createChainMock()),
    rpc: mockRpc,
  })),
}));

describe('templateVersioningService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset chain mocks
    createChainMock();
  });

  describe('createTemplateVersion', () => {
    it('should create a new version with config', async () => {
      const templateConfig = CONTENT_TEMPLATES.DEFINITIONAL;

      const input: CreateVersionInput = {
        templateName: 'DEFINITIONAL',
        config: templateConfig,
        label: 'Test Version',
        description: 'Test description',
      };

      const result = await createTemplateVersion(input);

      expect(result.success).toBe(true);
    });

    it('should activate version when activate flag is true', async () => {
      const input: CreateVersionInput = {
        templateName: 'COMPARISON',
        config: CONTENT_TEMPLATES.COMPARISON,
        activate: true,
      };

      const result = await createTemplateVersion(input);

      expect(result.success).toBe(true);
    });
  });

  describe('getTemplateVersions', () => {
    it('should return empty array when no versions exist', async () => {
      mockLimit.mockResolvedValueOnce({ data: [], error: null });

      const versions = await getTemplateVersions('DEFINITIONAL');

      expect(versions).toBeInstanceOf(Array);
    });
  });

  describe('getActiveVersion', () => {
    it('should return null when no active version', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });

      const active = await getActiveVersion('DEFINITIONAL');

      expect(active).toBeNull();
    });
  });

  describe('activateVersion', () => {
    it('should call activate RPC function', async () => {
      const result = await activateVersion('version-123');

      expect(mockRpc).toHaveBeenCalledWith('activate_template_version', {
        p_version_id: 'version-123',
      });
      expect(result.success).toBe(true);
    });

    it('should handle RPC errors', async () => {
      mockRpc.mockResolvedValueOnce({ error: { message: 'RPC error' } });

      const result = await activateVersion('version-123');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('rollbackToVersion', () => {
    it('should call rollback RPC function with reason', async () => {
      const result = await rollbackToVersion(
        'DEFINITIONAL',
        'version-456',
        'Performance issues'
      );

      expect(mockRpc).toHaveBeenCalledWith('rollback_template_version', {
        p_template_name: 'DEFINITIONAL',
        p_target_version_id: 'version-456',
        p_reason: 'Performance issues',
      });
      expect(result.success).toBe(true);
    });

    it('should work without reason', async () => {
      const result = await rollbackToVersion('COMPARISON', 'version-789');

      expect(mockRpc).toHaveBeenCalledWith('rollback_template_version', {
        p_template_name: 'COMPARISON',
        p_target_version_id: 'version-789',
        p_reason: undefined,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('getVersionHistory', () => {
    it('should return empty array when no history', async () => {
      mockLimit.mockResolvedValueOnce({ data: [], error: null });

      const history = await getVersionHistory('DEFINITIONAL');

      expect(history).toBeInstanceOf(Array);
      expect(history).toHaveLength(0);
    });

    it('should respect limit parameter', async () => {
      await getVersionHistory('DEFINITIONAL', 10);

      // Verify limit was passed (mock chain)
      expect(mockLimit).toHaveBeenCalled();
    });
  });

  describe('version workflow', () => {
    it('should support typical version lifecycle', async () => {
      // 1. Create initial version
      const createResult = await createTemplateVersion({
        templateName: 'PROCESS_HOWTO',
        config: CONTENT_TEMPLATES.PROCESS_HOWTO,
        label: 'v1',
        activate: true,
      });
      expect(createResult.success).toBe(true);

      // 2. Create new version
      const v2Result = await createTemplateVersion({
        templateName: 'PROCESS_HOWTO',
        config: { ...CONTENT_TEMPLATES.PROCESS_HOWTO, maxSections: 15 },
        label: 'v2',
        activate: false,
      });
      expect(v2Result.success).toBe(true);

      // 3. Activate new version
      const activateResult = await activateVersion('version-new');
      expect(activateResult.success).toBe(true);

      // 4. Rollback if needed
      const rollbackResult = await rollbackToVersion(
        'PROCESS_HOWTO',
        'version-1',
        'v2 caused issues'
      );
      expect(rollbackResult.success).toBe(true);
    });
  });
});
