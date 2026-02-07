// utils/errorMessages.ts

export const ERROR_MESSAGES: Record<string, { title: string; message: string; action?: string }> = {
  NETWORK_ERROR: {
    title: 'Connection Lost',
    message: 'Check your internet connection and try again.',
    action: 'Try Again',
  },
  API_RATE_LIMIT: {
    title: 'AI Service Busy',
    message: 'The AI provider is rate-limiting requests. Wait a moment and try again.',
    action: 'Try Again',
  },
  API_KEY_INVALID: {
    title: 'Invalid API Key',
    message: 'Your API key is invalid or expired. Check Settings to update it.',
    action: 'Open Settings',
  },
  GENERATION_TIMEOUT: {
    title: 'Generation Timeout',
    message: 'Content generation timed out. Try generating fewer sections at once.',
    action: 'Try Again',
  },
  SUPABASE_ERROR: {
    title: 'Database Error',
    message: 'A database error occurred. Your data is safe — please try again.',
    action: 'Try Again',
  },
  CHUNK_LOAD_ERROR: {
    title: 'New Version Available',
    message: 'A new version of the application is available. Please reload to update.',
    action: 'Reload',
  },
  RENDER_ERROR: {
    title: 'Display Error',
    message: 'Something went wrong displaying this page. Try again or reload.',
    action: 'Try Again',
  },
  UNKNOWN: {
    title: 'Unexpected Error',
    message: 'An unexpected error occurred. Try again or reload the page.',
    action: 'Try Again',
  },
};

/**
 * Categorize an error and return a user-friendly message
 */
export function categorizeError(error: Error | null): { title: string; message: string; action: string; category: string } {
  if (!error) {
    return { ...ERROR_MESSAGES.UNKNOWN, action: 'Reload', category: 'UNKNOWN' };
  }

  const errorString = error.toString().toLowerCase();
  const errorName = error.name?.toLowerCase() || '';

  if (errorName === 'chunkloaderror' || errorString.includes('chunkloaderror') || errorString.includes('loading chunk')) {
    return { ...ERROR_MESSAGES.CHUNK_LOAD_ERROR, action: 'Reload', category: 'CHUNK_LOAD_ERROR' };
  }

  if (errorString.includes('network') || errorString.includes('fetch') || errorString.includes('failed to fetch')) {
    return { ...ERROR_MESSAGES.NETWORK_ERROR, action: 'Try Again', category: 'NETWORK_ERROR' };
  }

  if (errorString.includes('429') || errorString.includes('rate limit')) {
    return { ...ERROR_MESSAGES.API_RATE_LIMIT, action: 'Try Again', category: 'API_RATE_LIMIT' };
  }

  if (errorString.includes('api key') || errorString.includes('unauthorized') || errorString.includes('401')) {
    return { ...ERROR_MESSAGES.API_KEY_INVALID, action: 'Open Settings', category: 'API_KEY_INVALID' };
  }

  if (errorString.includes('timeout') || errorString.includes('aborted')) {
    return { ...ERROR_MESSAGES.GENERATION_TIMEOUT, action: 'Try Again', category: 'GENERATION_TIMEOUT' };
  }

  if (errorString.includes('supabase') || errorString.includes('database') || errorString.includes('rls')) {
    return { ...ERROR_MESSAGES.SUPABASE_ERROR, action: 'Try Again', category: 'SUPABASE_ERROR' };
  }

  return { ...ERROR_MESSAGES.RENDER_ERROR, action: 'Try Again', category: 'RENDER_ERROR' };
}
