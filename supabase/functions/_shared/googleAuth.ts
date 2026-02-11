// supabase/functions/_shared/googleAuth.ts
// Shared utilities for Google OAuth token management
//
// Used by edge functions that need to exchange or refresh Google OAuth tokens.
// Encryption/decryption uses the existing _shared/crypto.ts (AES-GCM with ENCRYPTION_SECRET).
//
// deno-lint-ignore-file no-explicit-any

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

const Deno = (globalThis as any).Deno;

/**
 * Exchange a Google OAuth authorization code for access + refresh tokens.
 *
 * @param code         - The authorization code from the OAuth redirect
 * @param redirectUri  - The redirect_uri that was used in the authorization request
 * @returns Token response from Google
 */
export async function exchangeGoogleCode(
  code: string,
  redirectUri: string
): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID') ?? '';
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '';

  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not configured');
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google token exchange failed (${response.status}): ${errorBody}`);
  }

  return response.json();
}

/**
 * Refresh a Google OAuth access token using a refresh token.
 *
 * @param refreshToken - The stored refresh token
 * @returns New access token and expiry
 */
export async function refreshGoogleToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID') ?? '';
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '';

  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not configured');
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google token refresh failed (${response.status}): ${errorBody}`);
  }

  return response.json();
}

/**
 * Fetch the authenticated user's email from the Google userinfo endpoint.
 *
 * @param accessToken - A valid Google access token
 * @returns The user's email address
 */
export async function fetchGoogleEmail(accessToken: string): Promise<string> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    console.warn('[googleAuth] Failed to fetch userinfo:', response.status);
    return 'unknown';
  }

  const userinfo = await response.json();
  return userinfo.email || 'unknown';
}
