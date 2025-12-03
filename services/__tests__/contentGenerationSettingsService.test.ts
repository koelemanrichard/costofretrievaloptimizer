// services/__tests__/contentGenerationSettingsService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContentGenerationSettingsService } from '../contentGenerationSettingsService';
import { DEFAULT_CONTENT_GENERATION_SETTINGS, PRIORITY_PRESETS } from '../../types/contentGeneration';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  single: vi.fn()
};

describe('ContentGenerationSettingsService', () => {
  let service: ContentGenerationSettingsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ContentGenerationSettingsService(mockSupabase as any);
  });

  describe('getOrCreateDefaultSettings', () => {
    it('returns default settings when none exist', async () => {
      // Mock: no existing settings found
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });

      // Mock: successful creation
      const createdRow = {
        id: 'settings-new',
        user_id: 'user-123',
        map_id: null,
        name: 'Default',
        is_default: true,
        priority_human_readability: 40,
        priority_business_conversion: 25,
        priority_machine_optimization: 20,
        priority_factual_density: 15,
        tone: 'professional',
        audience_expertise: 'intermediate',
        pass_config: {
          checkpoint_after_pass_1: false,
          passes: {
            pass_2_headers: { enabled: true, store_version: true },
            pass_3_lists: { enabled: true, store_version: true },
            pass_4_visuals: { enabled: true, store_version: true },
            pass_5_micro: { enabled: true, store_version: true },
            pass_6_discourse: { enabled: true, store_version: true },
            pass_7_intro: { enabled: true, store_version: true },
            pass_8_audit: { enabled: true, store_version: false }
          }
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };
      mockSupabase.single.mockResolvedValueOnce({ data: createdRow, error: null });

      const result = await service.getOrCreateDefaultSettings('user-123');

      expect(result.priorities.humanReadability).toBe(40);
      expect(result.priorities.businessConversion).toBe(25);
      expect(result.tone).toBe('professional');
      expect(result.isDefault).toBe(true);
    });

    it('returns existing settings when they exist', async () => {
      const existingSettings = {
        id: 'settings-1',
        user_id: 'user-123',
        map_id: null,
        name: 'My Settings',
        is_default: true,
        priority_human_readability: 50,
        priority_business_conversion: 30,
        priority_machine_optimization: 15,
        priority_factual_density: 5,
        tone: 'conversational',
        audience_expertise: 'expert',
        pass_config: {
          checkpoint_after_pass_1: true,
          passes: {
            pass_2_headers: { enabled: true, store_version: true },
            pass_3_lists: { enabled: true, store_version: true },
            pass_4_visuals: { enabled: true, store_version: true },
            pass_5_micro: { enabled: true, store_version: true },
            pass_6_discourse: { enabled: true, store_version: true },
            pass_7_intro: { enabled: true, store_version: true },
            pass_8_audit: { enabled: true, store_version: false }
          }
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };
      mockSupabase.single.mockResolvedValue({ data: existingSettings, error: null });

      const result = await service.getOrCreateDefaultSettings('user-123');

      expect(result.priorities.humanReadability).toBe(50);
      expect(result.priorities.businessConversion).toBe(30);
      expect(result.tone).toBe('conversational');
      expect(result.audienceExpertise).toBe('expert');
    });

    it('returns in-memory defaults if database creation fails', async () => {
      // Mock: no existing settings found
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });

      // Mock: creation fails
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });

      const result = await service.getOrCreateDefaultSettings('user-123');

      expect(result.priorities).toEqual(PRIORITY_PRESETS.balanced);
      expect(result.tone).toBe('professional');
      expect(result.userId).toBe('user-123');
    });
  });

  describe('getSettingsForMap', () => {
    it('returns map-specific settings when they exist', async () => {
      const mapSettings = {
        id: 'settings-map',
        user_id: 'user-123',
        map_id: 'map-456',
        name: 'Map Settings',
        is_default: false,
        priority_human_readability: 30,
        priority_business_conversion: 40,
        priority_machine_optimization: 20,
        priority_factual_density: 10,
        tone: 'sales',
        audience_expertise: 'beginner',
        pass_config: {
          checkpoint_after_pass_1: false,
          passes: {
            pass_2_headers: { enabled: true, store_version: true },
            pass_3_lists: { enabled: true, store_version: true },
            pass_4_visuals: { enabled: true, store_version: true },
            pass_5_micro: { enabled: true, store_version: true },
            pass_6_discourse: { enabled: true, store_version: true },
            pass_7_intro: { enabled: true, store_version: true },
            pass_8_audit: { enabled: true, store_version: false }
          }
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };
      mockSupabase.single.mockResolvedValue({ data: mapSettings, error: null });

      const result = await service.getSettingsForMap('user-123', 'map-456');

      expect(result.mapId).toBe('map-456');
      expect(result.tone).toBe('sales');
    });

    it('falls back to user defaults when no map-specific settings exist', async () => {
      // First call: no map-specific settings
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: null });

      // Second call: return user defaults
      const defaultSettings = {
        id: 'settings-default',
        user_id: 'user-123',
        map_id: null,
        name: 'Default',
        is_default: true,
        priority_human_readability: 40,
        priority_business_conversion: 25,
        priority_machine_optimization: 20,
        priority_factual_density: 15,
        tone: 'professional',
        audience_expertise: 'intermediate',
        pass_config: {
          checkpoint_after_pass_1: false,
          passes: {
            pass_2_headers: { enabled: true, store_version: true },
            pass_3_lists: { enabled: true, store_version: true },
            pass_4_visuals: { enabled: true, store_version: true },
            pass_5_micro: { enabled: true, store_version: true },
            pass_6_discourse: { enabled: true, store_version: true },
            pass_7_intro: { enabled: true, store_version: true },
            pass_8_audit: { enabled: true, store_version: false }
          }
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };
      mockSupabase.single.mockResolvedValueOnce({ data: defaultSettings, error: null });

      const result = await service.getSettingsForMap('user-123', 'map-456');

      expect(result.isDefault).toBe(true);
      expect(result.mapId).toBeUndefined();
    });
  });

  describe('saveSettings', () => {
    it('updates settings and returns updated version', async () => {
      const settings = {
        id: 'settings-1',
        userId: 'user-123',
        mapId: undefined,
        name: 'Updated Settings',
        isDefault: true,
        priorities: PRIORITY_PRESETS.seo_focused,
        tone: 'academic' as const,
        audienceExpertise: 'expert' as const,
        checkpointAfterPass1: true,
        passes: DEFAULT_CONTENT_GENERATION_SETTINGS.passes,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const updatedRow = {
        id: 'settings-1',
        user_id: 'user-123',
        map_id: null,
        name: 'Updated Settings',
        is_default: true,
        priority_human_readability: 25,
        priority_business_conversion: 15,
        priority_machine_optimization: 40,
        priority_factual_density: 20,
        tone: 'academic',
        audience_expertise: 'expert',
        pass_config: {
          checkpoint_after_pass_1: true,
          passes: {
            pass_2_headers: { enabled: true, store_version: true },
            pass_3_lists: { enabled: true, store_version: true },
            pass_4_visuals: { enabled: true, store_version: true },
            pass_5_micro: { enabled: true, store_version: true },
            pass_6_discourse: { enabled: true, store_version: true },
            pass_7_intro: { enabled: true, store_version: true },
            pass_8_audit: { enabled: true, store_version: false }
          }
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z'
      };
      mockSupabase.single.mockResolvedValue({ data: updatedRow, error: null });

      const result = await service.saveSettings(settings);

      expect(result.priorities).toEqual(PRIORITY_PRESETS.seo_focused);
      expect(result.tone).toBe('academic');
    });

    it('throws error when save fails', async () => {
      const settings = {
        id: 'settings-1',
        userId: 'user-123',
        mapId: undefined,
        name: 'Settings',
        isDefault: true,
        priorities: PRIORITY_PRESETS.balanced,
        tone: 'professional' as const,
        audienceExpertise: 'intermediate' as const,
        checkpointAfterPass1: false,
        passes: DEFAULT_CONTENT_GENERATION_SETTINGS.passes,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      mockSupabase.single.mockResolvedValue({ data: null, error: { message: 'Update failed' } });

      await expect(service.saveSettings(settings)).rejects.toThrow('Failed to save settings');
    });
  });

  describe('applyPreset', () => {
    it('applies balanced preset priorities to settings', () => {
      const settings = {
        ...DEFAULT_CONTENT_GENERATION_SETTINGS,
        id: 'test',
        userId: 'user-123',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = service.applyPreset(settings as any, 'balanced');

      expect(result.priorities).toEqual(PRIORITY_PRESETS.balanced);
      expect(result.priorities.humanReadability).toBe(40);
      expect(result.priorities.businessConversion).toBe(25);
      expect(result.priorities.machineOptimization).toBe(20);
      expect(result.priorities.factualDensity).toBe(15);
    });

    it('applies seo_focused preset priorities to settings', () => {
      const settings = {
        ...DEFAULT_CONTENT_GENERATION_SETTINGS,
        id: 'test',
        userId: 'user-123',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = service.applyPreset(settings as any, 'seo_focused');

      expect(result.priorities).toEqual(PRIORITY_PRESETS.seo_focused);
      expect(result.priorities.humanReadability).toBe(25);
      expect(result.priorities.machineOptimization).toBe(40);
    });

    it('applies conversion_focused preset priorities to settings', () => {
      const settings = {
        ...DEFAULT_CONTENT_GENERATION_SETTINGS,
        id: 'test',
        userId: 'user-123',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = service.applyPreset(settings as any, 'conversion_focused');

      expect(result.priorities).toEqual(PRIORITY_PRESETS.conversion_focused);
      expect(result.priorities.businessConversion).toBe(45);
    });

    it('preserves other settings properties when applying preset', () => {
      const settings = {
        ...DEFAULT_CONTENT_GENERATION_SETTINGS,
        id: 'test',
        userId: 'user-123',
        tone: 'conversational' as const,
        audienceExpertise: 'expert' as const,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = service.applyPreset(settings as any, 'seo_focused');

      expect(result.tone).toBe('conversational');
      expect(result.audienceExpertise).toBe('expert');
      expect(result.userId).toBe('user-123');
    });
  });

  describe('getPresets', () => {
    it('returns all available presets', () => {
      const presets = service.getPresets();

      expect(presets).toEqual(PRIORITY_PRESETS);
      expect(Object.keys(presets)).toContain('balanced');
      expect(Object.keys(presets)).toContain('seo_focused');
      expect(Object.keys(presets)).toContain('conversion_focused');
      expect(Object.keys(presets)).toContain('academic');
      expect(Object.keys(presets)).toContain('reader_first');
    });

    it('preset values sum correctly', () => {
      const presets = service.getPresets();

      Object.values(presets).forEach(preset => {
        const sum = preset.humanReadability + preset.businessConversion +
                    preset.machineOptimization + preset.factualDensity;
        expect(sum).toBe(100);
      });
    });
  });
});
