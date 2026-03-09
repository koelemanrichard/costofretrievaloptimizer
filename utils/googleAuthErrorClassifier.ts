/**
 * Google Auth Error Classifier
 *
 * Centralizes error classification for Google OAuth-dependent edge functions.
 * Detects token expiry, revocation, scope issues, and API misconfig.
 * Returns actionable user-facing messages with resolution guidance.
 *
 * Used by: googleApiOrchestrator, googleUrlInspectionService, gscService,
 * and any component calling Google OAuth edge functions.
 */

export interface GoogleAuthError {
  /** Whether the user needs to re-authenticate */
  relink: boolean;
  /** User-facing error message */
  message: string;
  /** Resolution action for the user */
  action: string;
  /** Error category for programmatic handling */
  category: 'auth_expired' | 'auth_revoked' | 'scope_missing' | 'api_not_enabled' | 'network' | 'unknown';
  /** Original error detail */
  detail?: string;
}

/**
 * Classify an edge function error response into an actionable GoogleAuthError.
 *
 * Works with two error shapes:
 * 1. Structured response: `{ ok: false, error: string, relink?: boolean, apiNotEnabled?: boolean, detail?: string }`
 * 2. Raw Error or FunctionsHttpError from supabase.functions.invoke()
 */
export function classifyGoogleAuthError(
  errorOrData: any,
  fnError?: any,
  serviceName: string = 'Google API'
): GoogleAuthError {
  // 1. Try structured response (edge function returned JSON with ok: false)
  if (errorOrData && typeof errorOrData === 'object' && 'error' in errorOrData) {
    const data = errorOrData;

    if (data.relink) {
      const isRevoked = (data.error || '').toLowerCase().includes('revoked')
        || (data.detail || '').toLowerCase().includes('revoked');

      return {
        relink: true,
        message: `${serviceName} authorization expired`,
        action: 'Go to Settings → Services & APIs → Google Search Console & Analytics and click "Re-connect Google Account" to re-authorize.',
        category: isRevoked ? 'auth_revoked' : 'auth_expired',
        detail: data.detail || data.error,
      };
    }

    if (data.apiNotEnabled) {
      return {
        relink: false,
        message: `${serviceName} API not enabled in your Google Cloud project`,
        action: 'Enable the required API in Google Cloud Console, then retry. Check Settings → Services & APIs for setup instructions.',
        category: 'api_not_enabled',
        detail: data.detail || data.error,
      };
    }

    // Scope-related errors
    const errorLower = (data.error || '').toLowerCase();
    if (errorLower.includes('scope') || errorLower.includes('permission') || errorLower.includes('insufficient')) {
      return {
        relink: true,
        message: `${serviceName} requires additional permissions`,
        action: 'Go to Settings → Services & APIs and re-connect your Google Account to grant the required permissions.',
        category: 'scope_missing',
        detail: data.detail || data.error,
      };
    }

    // Generic edge function error
    return {
      relink: false,
      message: `${serviceName} returned an error: ${data.error}`,
      action: 'Check Settings → Services & APIs to verify your connection, or try again later.',
      category: 'unknown',
      detail: data.detail || data.error,
    };
  }

  // 2. Try FunctionsHttpError (supabase.functions.invoke error)
  if (fnError) {
    const message = fnError.message || String(fnError);
    const messageLower = message.toLowerCase();

    // Try to extract body from FunctionsHttpError
    let body: any = null;
    if (fnError.context && typeof fnError.context.json === 'function') {
      try {
        // Note: can only call .json() once; caller should pass parsed body as errorOrData
        body = fnError.context;
      } catch {
        // ignore
      }
    }

    // Check for auth-related HTTP errors
    if (messageLower.includes('401') || messageLower.includes('403')
      || messageLower.includes('unauthorized') || messageLower.includes('forbidden')) {
      return {
        relink: true,
        message: `${serviceName} authorization failed`,
        action: 'Go to Settings → Services & APIs → Google Search Console & Analytics and re-connect your Google Account.',
        category: 'auth_expired',
        detail: message,
      };
    }

    // Network/timeout errors
    if (messageLower.includes('timeout') || messageLower.includes('network')
      || messageLower.includes('fetch') || messageLower.includes('504')
      || messageLower.includes('502')) {
      return {
        relink: false,
        message: `${serviceName} request timed out`,
        action: 'This is usually temporary. Try again in a few moments.',
        category: 'network',
        detail: message,
      };
    }

    return {
      relink: false,
      message: `${serviceName} error: ${message}`,
      action: 'Check Settings → Services & APIs to verify your configuration.',
      category: 'unknown',
      detail: message,
    };
  }

  // 3. Plain Error object
  if (errorOrData instanceof Error) {
    return classifyGoogleAuthError(null, errorOrData, serviceName);
  }

  return {
    relink: false,
    message: `${serviceName} encountered an unknown error`,
    action: 'Check Settings → Services & APIs to verify your configuration.',
    category: 'unknown',
    detail: String(errorOrData),
  };
}

/**
 * Format a GoogleAuthError into a single user-friendly notification string.
 */
export function formatGoogleAuthErrorMessage(err: GoogleAuthError): string {
  if (err.relink) {
    return `${err.message}. ${err.action}`;
  }
  return `${err.message}. ${err.action}`;
}
