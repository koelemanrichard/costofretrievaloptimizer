/**
 * aiService / providerDispatcher Unit Tests
 *
 * The aiService.ts is a facade that re-exports from services/ai/.
 * The core testable logic lives in the provider dispatcher, which centralizes
 * AI provider selection, fallback behavior, and configuration checking.
 *
 * Tests cover:
 *   1. dispatchToProvider - async provider routing with fallback
 *   2. dispatchToProviderSync - sync provider routing with fallback
 *   3. getGenerateTextFunction - provider function selection
 *   4. isProviderConfigured - API key validation
 *   5. getConfiguredProviders - multi-provider detection
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  dispatchToProvider,
  dispatchToProviderSync,
  getGenerateTextFunction,
  isProviderConfigured,
  getConfiguredProviders,
} from '../ai/providerDispatcher';
import type { BusinessInfo } from '../../types';

// Helper to create a minimal BusinessInfo with a specific provider
function makeBusinessInfo(overrides: Partial<BusinessInfo> = {}): BusinessInfo {
  return {
    businessName: 'Test Business',
    industry: 'Technology',
    audience: 'Developers',
    expertise: 'AI/ML',
    valueProp: 'Fast AI tools',
    aiProvider: 'gemini',
    geminiApiKey: 'test-gemini-key',
    supabaseUrl: '',
    supabaseAnonKey: '',
    ...overrides,
  } as BusinessInfo;
}

describe('providerDispatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================
  // dispatchToProvider (async)
  // ==========================================
  describe('dispatchToProvider', () => {
    it('dispatches to gemini handler by default', async () => {
      const handlers = {
        gemini: vi.fn().mockResolvedValue('gemini-result'),
        openai: vi.fn().mockResolvedValue('openai-result'),
      };

      const result = await dispatchToProvider(makeBusinessInfo(), handlers);

      expect(result).toBe('gemini-result');
      expect(handlers.gemini).toHaveBeenCalledOnce();
      expect(handlers.openai).not.toHaveBeenCalled();
    });

    it('dispatches to openai handler when provider is openai', async () => {
      const handlers = {
        gemini: vi.fn().mockResolvedValue('gemini-result'),
        openai: vi.fn().mockResolvedValue('openai-result'),
      };

      const result = await dispatchToProvider(
        makeBusinessInfo({ aiProvider: 'openai' }),
        handlers
      );

      expect(result).toBe('openai-result');
      expect(handlers.openai).toHaveBeenCalledOnce();
      expect(handlers.gemini).not.toHaveBeenCalled();
    });

    it('dispatches to anthropic handler when provider is anthropic', async () => {
      const handlers = {
        gemini: vi.fn().mockResolvedValue('gemini-result'),
        anthropic: vi.fn().mockResolvedValue('anthropic-result'),
      };

      const result = await dispatchToProvider(
        makeBusinessInfo({ aiProvider: 'anthropic' }),
        handlers
      );

      expect(result).toBe('anthropic-result');
      expect(handlers.anthropic).toHaveBeenCalledOnce();
    });

    it('dispatches to perplexity handler when provider is perplexity', async () => {
      const handlers = {
        gemini: vi.fn().mockResolvedValue('gemini-result'),
        perplexity: vi.fn().mockResolvedValue('perplexity-result'),
      };

      const result = await dispatchToProvider(
        makeBusinessInfo({ aiProvider: 'perplexity' }),
        handlers
      );

      expect(result).toBe('perplexity-result');
    });

    it('dispatches to openrouter handler when provider is openrouter', async () => {
      const handlers = {
        gemini: vi.fn().mockResolvedValue('gemini-result'),
        openrouter: vi.fn().mockResolvedValue('openrouter-result'),
      };

      const result = await dispatchToProvider(
        makeBusinessInfo({ aiProvider: 'openrouter' }),
        handlers
      );

      expect(result).toBe('openrouter-result');
    });

    it('falls back to gemini when requested provider handler is not provided', async () => {
      const handlers = {
        gemini: vi.fn().mockResolvedValue('gemini-fallback'),
        // openai handler not provided
      };

      const result = await dispatchToProvider(
        makeBusinessInfo({ aiProvider: 'openai' }),
        handlers
      );

      expect(result).toBe('gemini-fallback');
      expect(handlers.gemini).toHaveBeenCalledOnce();
    });

    it('falls back to gemini for unknown provider', async () => {
      const handlers = {
        gemini: vi.fn().mockResolvedValue('gemini-default'),
      };

      const result = await dispatchToProvider(
        makeBusinessInfo({ aiProvider: 'unknown-provider' as any }),
        handlers
      );

      expect(result).toBe('gemini-default');
    });

    it('handles async handler that returns a promise', async () => {
      const handlers = {
        gemini: vi.fn().mockImplementation(
          () => new Promise(resolve => setTimeout(() => resolve('delayed-result'), 10))
        ),
      };

      const result = await dispatchToProvider(makeBusinessInfo(), handlers);
      expect(result).toBe('delayed-result');
    });

    it('propagates errors from handlers', async () => {
      const handlers = {
        gemini: vi.fn().mockRejectedValue(new Error('API error')),
      };

      await expect(
        dispatchToProvider(makeBusinessInfo(), handlers)
      ).rejects.toThrow('API error');
    });
  });

  // ==========================================
  // dispatchToProviderSync
  // ==========================================
  describe('dispatchToProviderSync', () => {
    it('dispatches to gemini handler synchronously by default', () => {
      const handlers = {
        gemini: vi.fn().mockReturnValue('sync-gemini'),
        openai: vi.fn().mockReturnValue('sync-openai'),
      };

      const result = dispatchToProviderSync(makeBusinessInfo(), handlers);

      expect(result).toBe('sync-gemini');
      expect(handlers.gemini).toHaveBeenCalledOnce();
      expect(handlers.openai).not.toHaveBeenCalled();
    });

    it('dispatches to specified provider synchronously', () => {
      const handlers = {
        gemini: vi.fn().mockReturnValue('sync-gemini'),
        anthropic: vi.fn().mockReturnValue('sync-anthropic'),
      };

      const result = dispatchToProviderSync(
        makeBusinessInfo({ aiProvider: 'anthropic' }),
        handlers
      );

      expect(result).toBe('sync-anthropic');
    });

    it('falls back to gemini when handler not provided', () => {
      const handlers = {
        gemini: vi.fn().mockReturnValue('sync-gemini-fallback'),
      };

      const result = dispatchToProviderSync(
        makeBusinessInfo({ aiProvider: 'openai' }),
        handlers
      );

      expect(result).toBe('sync-gemini-fallback');
    });
  });

  // ==========================================
  // getGenerateTextFunction
  // ==========================================
  describe('getGenerateTextFunction', () => {
    const mockGeminiGenerateText = vi.fn();
    const mockOpenaiGenerateText = vi.fn();
    const mockAnthropicGenerateText = vi.fn();

    const services = {
      gemini: { generateText: mockGeminiGenerateText },
      openai: { generateText: mockOpenaiGenerateText },
      anthropic: { generateText: mockAnthropicGenerateText },
    };

    it('returns gemini generateText by default', () => {
      const fn = getGenerateTextFunction(makeBusinessInfo(), services);
      expect(fn).toBe(mockGeminiGenerateText);
    });

    it('returns openai generateText when provider is openai', () => {
      const fn = getGenerateTextFunction(
        makeBusinessInfo({ aiProvider: 'openai' }),
        services
      );
      expect(fn).toBe(mockOpenaiGenerateText);
    });

    it('returns anthropic generateText when provider is anthropic', () => {
      const fn = getGenerateTextFunction(
        makeBusinessInfo({ aiProvider: 'anthropic' }),
        services
      );
      expect(fn).toBe(mockAnthropicGenerateText);
    });

    it('falls back to gemini generateText if provider service is missing', () => {
      const limitedServices = {
        gemini: { generateText: mockGeminiGenerateText },
      };

      const fn = getGenerateTextFunction(
        makeBusinessInfo({ aiProvider: 'openai' }),
        limitedServices
      );
      expect(fn).toBe(mockGeminiGenerateText);
    });

    it('falls back to gemini for perplexity when perplexity service not provided', () => {
      const fn = getGenerateTextFunction(
        makeBusinessInfo({ aiProvider: 'perplexity' }),
        services
      );
      expect(fn).toBe(mockGeminiGenerateText);
    });
  });

  // ==========================================
  // isProviderConfigured
  // ==========================================
  describe('isProviderConfigured', () => {
    it('returns true when gemini API key is set', () => {
      expect(isProviderConfigured(makeBusinessInfo())).toBe(true);
    });

    it('returns false when gemini API key is empty', () => {
      expect(isProviderConfigured(makeBusinessInfo({ geminiApiKey: '' }))).toBe(false);
    });

    it('returns true when openai API key is set for openai provider', () => {
      expect(isProviderConfigured(
        makeBusinessInfo({ aiProvider: 'openai', openAiApiKey: 'sk-test' })
      )).toBe(true);
    });

    it('returns false when openai API key is missing for openai provider', () => {
      expect(isProviderConfigured(
        makeBusinessInfo({ aiProvider: 'openai', openAiApiKey: '' })
      )).toBe(false);
    });

    it('returns true when anthropic API key is set', () => {
      expect(isProviderConfigured(
        makeBusinessInfo({ aiProvider: 'anthropic', anthropicApiKey: 'sk-ant-test' })
      )).toBe(true);
    });

    it('returns false when anthropic API key is missing', () => {
      expect(isProviderConfigured(
        makeBusinessInfo({ aiProvider: 'anthropic' })
      )).toBe(false);
    });

    it('checks perplexity API key for perplexity provider', () => {
      expect(isProviderConfigured(
        makeBusinessInfo({ aiProvider: 'perplexity', perplexityApiKey: 'pplx-test' })
      )).toBe(true);

      expect(isProviderConfigured(
        makeBusinessInfo({ aiProvider: 'perplexity' })
      )).toBe(false);
    });

    it('checks openrouter API key for openrouter provider', () => {
      expect(isProviderConfigured(
        makeBusinessInfo({ aiProvider: 'openrouter', openRouterApiKey: 'or-test' })
      )).toBe(true);

      expect(isProviderConfigured(
        makeBusinessInfo({ aiProvider: 'openrouter' })
      )).toBe(false);
    });
  });

  // ==========================================
  // getConfiguredProviders
  // ==========================================
  describe('getConfiguredProviders', () => {
    it('returns only gemini when only gemini key is set', () => {
      const providers = getConfiguredProviders(makeBusinessInfo());
      expect(providers).toEqual(['gemini']);
    });

    it('returns multiple providers when multiple keys are set', () => {
      const providers = getConfiguredProviders(makeBusinessInfo({
        geminiApiKey: 'gemini-key',
        openAiApiKey: 'openai-key',
        anthropicApiKey: 'anthropic-key',
      }));

      expect(providers).toContain('gemini');
      expect(providers).toContain('openai');
      expect(providers).toContain('anthropic');
      expect(providers).toHaveLength(3);
    });

    it('returns all five providers when all keys are set', () => {
      const providers = getConfiguredProviders(makeBusinessInfo({
        geminiApiKey: 'g-key',
        openAiApiKey: 'o-key',
        anthropicApiKey: 'a-key',
        perplexityApiKey: 'p-key',
        openRouterApiKey: 'or-key',
      }));

      expect(providers).toHaveLength(5);
      expect(providers).toEqual(['gemini', 'openai', 'anthropic', 'perplexity', 'openrouter']);
    });

    it('returns empty array when no keys are set', () => {
      const providers = getConfiguredProviders(makeBusinessInfo({ geminiApiKey: '' }));
      expect(providers).toEqual([]);
    });

    it('excludes providers with empty string keys', () => {
      const providers = getConfiguredProviders(makeBusinessInfo({
        geminiApiKey: 'g-key',
        openAiApiKey: '',
        anthropicApiKey: '',
      }));
      expect(providers).toEqual(['gemini']);
    });
  });
});
