// services/ai/shared/retryWithBackoff.ts

/**
 * Shared retry utility with exponential backoff.
 * Used by all AI provider services for network resilience.
 */

interface RetryOptions {
  /** Maximum number of retries (default: 3) */
  maxRetries?: number;
  /** Base delay in ms before first retry (default: 2000) */
  baseDelay?: number;
  /** Maximum delay in ms (default: 30000) */
  maxDelay?: number;
  /** Custom function to determine if an error is retryable */
  retryOn?: (error: Error) => boolean;
}

/** Default: retry on network errors and 429 rate limits */
function isRetryableByDefault(error: Error): boolean {
  const message = error.message?.toLowerCase() || '';
  const name = error.name?.toLowerCase() || '';

  // Network errors
  if (name === 'typeerror' && message.includes('fetch')) return true;
  if (message.includes('failed to fetch')) return true;
  if (message.includes('networkerror')) return true;
  if (message.includes('network request failed')) return true;
  if (message.includes('econnrefused')) return true;
  if (message.includes('econnreset')) return true;
  if (message.includes('etimedout')) return true;

  // Rate limiting (429)
  if (message.includes('429')) return true;
  if (message.includes('rate limit')) return true;
  if (message.includes('too many requests')) return true;
  if (message.includes('resource_exhausted')) return true;

  return false;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 2000,
    maxDelay = 30000,
    retryOn = isRetryableByDefault,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt >= maxRetries || !retryOn(lastError)) {
        throw lastError;
      }

      // Exponential backoff with jitter
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      const jitter = delay * 0.1 * Math.random();
      console.warn(
        `[retryWithBackoff] Attempt ${attempt + 1}/${maxRetries} failed: ${lastError.message}. Retrying in ${Math.round(delay + jitter)}ms...`
      );
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
    }
  }

  throw lastError || new Error('Max retries exceeded');
}
