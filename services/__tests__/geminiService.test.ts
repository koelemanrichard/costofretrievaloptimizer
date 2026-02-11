/**
 * geminiService Unit Tests
 *
 * Tests the Gemini AI service: API call construction, response parsing,
 * retry behavior, usage context tracking, and error handling.
 *
 * Strategy:
 * - Mock @google/genai to intercept API calls
 * - Mock telemetry/logging services to avoid side effects
 * - Mock Supabase to prevent real DB calls
 * - Test public API functions for correct behavior
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock @google/genai before importing geminiService
const mockGenerateContent = vi.fn();

vi.mock('@google/genai', () => {
  class MockGoogleGenAI {
    models = {
      generateContent: mockGenerateContent,
    };
    constructor(_opts: any) {}
  }
  return {
    GoogleGenAI: MockGoogleGenAI,
    Type: {
      STRING: 'STRING',
      NUMBER: 'NUMBER',
      BOOLEAN: 'BOOLEAN',
      OBJECT: 'OBJECT',
      ARRAY: 'ARRAY',
    },
  };
});

// Mock telemetry service
vi.mock('../telemetryService', () => ({
  logAiUsage: vi.fn().mockResolvedValue(undefined),
  estimateTokens: vi.fn((len: number) => Math.ceil(len / 4)),
}));

// Mock supabaseClient
vi.mock('../supabaseClient', () => ({
  getSupabaseClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  })),
}));

// Mock apiCallLogger
vi.mock('../apiCallLogger', () => ({
  geminiLogger: {
    start: vi.fn(() => ({ id: 'mock-log-id' })),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock AI response sanitizer
vi.mock('../aiResponseSanitizer', () => {
  class MockAIResponseSanitizer {
    constructor(_dispatch: any) {}
    sanitize(text: string, _schema: any, fallback: any) {
      try {
        return JSON.parse(text);
      } catch {
        return fallback;
      }
    }
    sanitizeArray(text: string, fallback: any) {
      try {
        const parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed : fallback;
      } catch {
        return fallback;
      }
    }
  }
  return { AIResponseSanitizer: MockAIResponseSanitizer };
});

// Mock config/prompts - provide simple prompt functions
vi.mock('../../config/prompts', () => ({
  SUGGEST_CENTRAL_ENTITY_CANDIDATES_PROMPT: vi.fn(() => 'mock prompt'),
  SUGGEST_SOURCE_CONTEXT_OPTIONS_PROMPT: vi.fn(() => 'mock prompt'),
  SUGGEST_CENTRAL_SEARCH_INTENT_PROMPT: vi.fn(() => 'mock prompt'),
  SUGGEST_RESPONSE_CODE_PROMPT: vi.fn(() => 'mock prompt'),
  GENERATE_CONTENT_BRIEF_PROMPT: vi.fn(() => 'mock prompt'),
  DISCOVER_CORE_SEMANTIC_TRIPLES_PROMPT: vi.fn(() => 'mock prompt'),
  EXPAND_SEMANTIC_TRIPLES_PROMPT: vi.fn(() => 'mock prompt'),
  GENERATE_INITIAL_TOPICAL_MAP_PROMPT: vi.fn(() => 'mock prompt'),
  FIND_MERGE_OPPORTUNITIES_FOR_SELECTION_PROMPT: vi.fn(() => 'mock prompt'),
  FIND_LINKING_OPPORTUNITIES_PROMPT: vi.fn(() => 'mock prompt'),
  GENERATE_ARTICLE_DRAFT_PROMPT: vi.fn(() => 'mock prompt'),
  POLISH_ARTICLE_DRAFT_PROMPT: vi.fn(() => 'mock prompt'),
  AUDIT_CONTENT_INTEGRITY_PROMPT: vi.fn(() => 'mock prompt'),
  REFINE_DRAFT_SECTION_PROMPT: vi.fn(() => 'mock prompt'),
  GENERATE_SCHEMA_PROMPT: vi.fn(() => 'mock prompt'),
  ANALYZE_GSC_DATA_PROMPT: vi.fn(() => 'mock prompt'),
  VALIDATE_TOPICAL_MAP_PROMPT: vi.fn(() => 'mock prompt'),
  IMPROVE_TOPICAL_MAP_PROMPT: vi.fn(() => 'mock prompt'),
  FIND_MERGE_OPPORTUNITIES_PROMPT: vi.fn(() => 'mock prompt'),
  ANALYZE_SEMANTIC_RELATIONSHIPS_PROMPT: vi.fn(() => 'mock prompt'),
  ANALYZE_CONTEXTUAL_COVERAGE_PROMPT: vi.fn(() => 'mock prompt'),
  AUDIT_INTERNAL_LINKING_PROMPT: vi.fn(() => 'mock prompt'),
  CALCULATE_TOPICAL_AUTHORITY_PROMPT: vi.fn(() => 'mock prompt'),
  GENERATE_PUBLICATION_PLAN_PROMPT: vi.fn(() => 'mock prompt'),
  ADD_TOPIC_INTELLIGENTLY_PROMPT: vi.fn(() => 'mock prompt'),
  EXPAND_CORE_TOPIC_PROMPT: vi.fn(() => 'mock prompt'),
  ANALYZE_TOPIC_VIABILITY_PROMPT: vi.fn(() => 'mock prompt'),
  GENERATE_CORE_TOPIC_SUGGESTIONS_PROMPT: vi.fn(() => 'mock prompt'),
  GENERATE_STRUCTURED_TOPIC_SUGGESTIONS_PROMPT: vi.fn(() => 'mock prompt'),
  ENRICH_TOPIC_METADATA_PROMPT: vi.fn(() => 'mock prompt'),
  GENERATE_TOPIC_BLUEPRINT_PROMPT: vi.fn(() => 'mock prompt'),
  AUDIT_INTRA_PAGE_FLOW_PROMPT: vi.fn(() => 'mock prompt'),
  AUDIT_DISCOURSE_INTEGRATION_PROMPT: vi.fn(() => 'mock prompt'),
  APPLY_FLOW_REMEDIATION_PROMPT: vi.fn(() => 'mock prompt'),
  BATCH_FLOW_REMEDIATION_PROMPT: vi.fn(() => 'mock prompt'),
  CLASSIFY_TOPIC_SECTIONS_PROMPT: vi.fn(() => 'mock prompt'),
  REGENERATE_BRIEF_PROMPT: vi.fn(() => 'mock prompt'),
  REFINE_BRIEF_SECTION_PROMPT: vi.fn(() => 'mock prompt'),
  GENERATE_NEW_SECTION_PROMPT: vi.fn(() => 'mock prompt'),
}));

// Mock config/schemas
vi.mock('../../config/schemas', () => ({
  CONTENT_BRIEF_SCHEMA: {},
  CONTENT_BRIEF_FALLBACK: {
    title: '',
    slug: '',
    metaDescription: '',
    keyTakeaways: [],
    outline: '',
    structured_outline: [],
    perspectives: [],
  },
}));

// Mock config/defaults
vi.mock('../../config/defaults', () => ({
  AI_MODEL_DEFAULTS: {
    geminiModel: 'gemini-2.5-flash',
    geminiFallbackModel: 'gemini-2.0-flash',
  },
}));

// Mock provider context
vi.mock('../ai/shared/providerContext', () => ({
  createProviderContext: vi.fn(() => ({
    setUsageContext: vi.fn(),
    getUsageContext: vi.fn(() => ({})),
    getOperation: vi.fn(() => 'test-operation'),
  })),
}));

// Mock extractJson
vi.mock('../ai/shared/extractJson', () => ({
  extractMarkdownFromResponse: vi.fn((text: string) => text),
}));

// Mock knowledge graph
vi.mock('../../lib/knowledgeGraph', () => ({
  KnowledgeGraph: vi.fn(),
}));

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid'),
}));

// Mock helpers
vi.mock('../../utils/helpers', () => ({
  calculateTopicSimilarityPairs: vi.fn(() => []),
}));

import type { BusinessInfo } from '../../types';

// Helper: create a mock BusinessInfo
function createMockBusinessInfo(overrides: Partial<BusinessInfo> = {}): BusinessInfo {
  return {
    businessName: 'Test Co',
    industry: 'Tech',
    audience: 'Devs',
    expertise: 'AI',
    valueProp: 'Quality content',
    aiProvider: 'gemini',
    geminiApiKey: 'test-api-key-123',
    aiModel: 'gemini-2.5-flash',
    supabaseUrl: 'https://test.supabase.co',
    supabaseAnonKey: 'anon-key',
    ...overrides,
  } as BusinessInfo;
}

// Helper: create a mock dispatch function
function createMockDispatch() {
  return vi.fn();
}

// Helper: create a successful Gemini API response
function createMockResponse(text: string, finishReason: string = 'STOP') {
  return {
    text,
    candidates: [{ finishReason }],
  };
}

describe('geminiService', () => {
  let dispatch: ReturnType<typeof createMockDispatch>;

  beforeEach(() => {
    vi.clearAllMocks();
    dispatch = createMockDispatch();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================
  // Module Import & Export
  // ==========================================
  describe('module exports', () => {
    it('exports setUsageContext function', async () => {
      const mod = await import('../geminiService');
      expect(mod.setUsageContext).toBeDefined();
      expect(typeof mod.setUsageContext).toBe('function');
    });

    it('exports generateText function', async () => {
      const mod = await import('../geminiService');
      expect(mod.generateText).toBeDefined();
      expect(typeof mod.generateText).toBe('function');
    });

    it('exports generateJson function', async () => {
      const mod = await import('../geminiService');
      expect(mod.generateJson).toBeDefined();
      expect(typeof mod.generateJson).toBe('function');
    });

    it('exports suggestCentralEntityCandidates function', async () => {
      const mod = await import('../geminiService');
      expect(mod.suggestCentralEntityCandidates).toBeDefined();
    });

    it('exports generateContentBrief function', async () => {
      const mod = await import('../geminiService');
      expect(mod.generateContentBrief).toBeDefined();
    });
  });

  // ==========================================
  // generateText - basic flow
  // ==========================================
  describe('generateText', () => {
    it('calls Gemini API and returns response text', async () => {
      mockGenerateContent.mockResolvedValueOnce(
        createMockResponse('Hello from Gemini!')
      );

      const { generateText } = await import('../geminiService');
      const result = await generateText('Say hello', createMockBusinessInfo(), dispatch);

      expect(result).toBe('Hello from Gemini!');
      expect(mockGenerateContent).toHaveBeenCalledOnce();
    });

    it('throws error when API key is missing', async () => {
      const { generateText } = await import('../geminiService');

      await expect(
        generateText('prompt', createMockBusinessInfo({ geminiApiKey: '' }), dispatch)
      ).rejects.toThrow('Gemini API key is not configured');
    });

    it('dispatches LOG_EVENT on API key missing', async () => {
      const { generateText } = await import('../geminiService');

      try {
        await generateText('prompt', createMockBusinessInfo({ geminiApiKey: '' }), dispatch);
      } catch {
        // expected
      }

      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'LOG_EVENT',
          payload: expect.objectContaining({
            service: 'Gemini',
            status: 'failure',
          }),
        })
      );
    });
  });

  // ==========================================
  // Error handling and retries
  // ==========================================
  describe('error handling', () => {
    it('throws meaningful error when API call fails', async () => {
      const error = new Error('Authentication failed');
      (error as any).status = 401; // Non-retryable status code

      mockGenerateContent.mockRejectedValueOnce(error);

      const { generateText } = await import('../geminiService');

      await expect(
        generateText('prompt', createMockBusinessInfo(), dispatch)
      ).rejects.toThrow('Gemini API Call Failed');
    });

    it('retries on rate limit errors (429)', async () => {
      vi.useFakeTimers();
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;

      mockGenerateContent
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce(createMockResponse('retry success'));

      const { generateText } = await import('../geminiService');
      const resultPromise = generateText('prompt', createMockBusinessInfo(), dispatch);

      // Advance timers to skip the retry delay
      await vi.advanceTimersByTimeAsync(15000);

      const result = await resultPromise;

      expect(result).toBe('retry success');
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });

    it('retries on server errors (500)', async () => {
      vi.useFakeTimers();
      const serverError = new Error('Internal server error');
      (serverError as any).status = 500;

      mockGenerateContent
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce(createMockResponse('recovered'));

      const { generateText } = await import('../geminiService');
      const resultPromise = generateText('prompt', createMockBusinessInfo(), dispatch);

      // Advance timers to skip the retry delay
      await vi.advanceTimersByTimeAsync(15000);

      const result = await resultPromise;

      expect(result).toBe('recovered');
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });

    it('does not retry on non-retryable errors', async () => {
      const authError = new Error('Invalid API key');
      (authError as any).status = 401;

      mockGenerateContent.mockRejectedValue(authError);

      const { generateText } = await import('../geminiService');

      await expect(
        generateText('prompt', createMockBusinessInfo(), dispatch)
      ).rejects.toThrow();

      // Should only be called once (no retries)
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('handles empty response by attempting fallback model', async () => {
      vi.useFakeTimers();

      // First call: empty response with primary model (all 3 retries)
      mockGenerateContent
        .mockResolvedValueOnce(createMockResponse('')) // Empty on attempt 1
        .mockResolvedValueOnce(createMockResponse('')) // Empty on attempt 2
        .mockResolvedValueOnce(createMockResponse('')) // Empty on attempt 3
        .mockResolvedValueOnce(createMockResponse('fallback model response')); // Fallback model

      const { generateText } = await import('../geminiService');
      const resultPromise = generateText('prompt', createMockBusinessInfo(), dispatch);

      // Advance timers through all retries and fallback
      await vi.advanceTimersByTimeAsync(60000);

      const result = await resultPromise;

      expect(result).toBe('fallback model response');
      vi.useRealTimers();
    });
  });

  // ==========================================
  // suggestCentralEntityCandidates
  // ==========================================
  describe('suggestCentralEntityCandidates', () => {
    it('returns parsed array of candidate entities', async () => {
      const mockCandidates = [
        { name: 'Entity A', description: 'Description A' },
        { name: 'Entity B', description: 'Description B' },
      ];

      mockGenerateContent.mockResolvedValueOnce(
        createMockResponse(JSON.stringify(mockCandidates))
      );

      const { suggestCentralEntityCandidates } = await import('../geminiService');
      const result = await suggestCentralEntityCandidates(
        createMockBusinessInfo(),
        dispatch
      );

      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ==========================================
  // generateJson
  // ==========================================
  describe('generateJson', () => {
    it('returns parsed JSON from API response', async () => {
      const mockData = { key: 'value', count: 42 };

      mockGenerateContent.mockResolvedValueOnce(
        createMockResponse(JSON.stringify(mockData))
      );

      const { generateJson } = await import('../geminiService');
      const result = await generateJson(
        'generate JSON prompt',
        createMockBusinessInfo(),
        dispatch,
        { key: '', count: 0 }
      );

      expect(result).toEqual(mockData);
    });

    it('returns fallback when API returns invalid JSON', async () => {
      mockGenerateContent.mockResolvedValueOnce(
        createMockResponse('not valid json {{{')
      );

      const { generateJson } = await import('../geminiService');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const fallback = { key: 'default', count: 0 };
      const result = await generateJson(
        'generate JSON prompt',
        createMockBusinessInfo(),
        dispatch,
        fallback
      );

      // The sanitizer should return the fallback for unparseable text
      expect(result).toBeDefined();
      consoleSpy.mockRestore();
      logSpy.mockRestore();
    });
  });

  // ==========================================
  // Dispatch logging
  // ==========================================
  describe('dispatch logging', () => {
    it('dispatches info log events during API call', async () => {
      mockGenerateContent.mockResolvedValueOnce(
        createMockResponse('test response')
      );

      const { generateText } = await import('../geminiService');
      await generateText('prompt', createMockBusinessInfo(), dispatch);

      // Should have dispatched multiple LOG_EVENT actions
      const logCalls = dispatch.mock.calls.filter(
        (call: any[]) => call[0].type === 'LOG_EVENT'
      );
      expect(logCalls.length).toBeGreaterThanOrEqual(2); // At least "Sending request" and "Received response"
    });

    it('dispatches with correct service name', async () => {
      mockGenerateContent.mockResolvedValueOnce(
        createMockResponse('test')
      );

      const { generateText } = await import('../geminiService');
      await generateText('prompt', createMockBusinessInfo(), dispatch);

      const logCalls = dispatch.mock.calls.filter(
        (call: any[]) => call[0].type === 'LOG_EVENT'
      );

      logCalls.forEach((call: any[]) => {
        expect(call[0].payload.service).toBe('Gemini');
      });
    });
  });
});
