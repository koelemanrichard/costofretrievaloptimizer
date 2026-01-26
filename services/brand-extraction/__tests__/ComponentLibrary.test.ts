import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComponentLibrary } from '../ComponentLibrary';

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: { id: 'test-id' }, error: null })) })) })),
      select: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: [], error: null })) })),
      upsert: vi.fn(() => Promise.resolve({ data: null, error: null }))
    }))
  }
}));

describe('ComponentLibrary', () => {
  let library: ComponentLibrary;

  beforeEach(() => {
    library = new ComponentLibrary('project-123');
  });

  describe('findMatchingComponent', () => {
    it('returns null when no components exist', async () => {
      const match = await library.findMatchingComponent('section with heading');
      expect(match).toBeNull();
    });
  });
});
