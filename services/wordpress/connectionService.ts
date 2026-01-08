/**
 * WordPress Connection Service
 *
 * Manages WordPress site connections including:
 * - Adding new connections with credential encryption
 * - Verifying connections with plugin check
 * - Testing connectivity
 * - Removing connections
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  WordPressConnection,
  WordPressConnectionInput,
  WordPressConnectionStatus,
  PluginVerificationResponse
} from '../../types/wordpress';
import { verifiedInsert, verifiedUpdate } from '../verifiedDatabaseService';
import { WordPressApiClient, testWordPressConnection } from './apiClient';

// ============================================================================
// Types
// ============================================================================

export interface ConnectionResult {
  success: boolean;
  connection?: WordPressConnection;
  error?: string;
}

export interface VerificationResult {
  verified: boolean;
  pluginVersion?: string;
  capabilities?: string[];
  seoPlugin?: 'yoast' | 'rankmath' | 'none';
  error?: string;
}

export interface TestResult {
  success: boolean;
  message: string;
  siteInfo?: {
    name: string;
    url: string;
    description: string;
  };
}

// ============================================================================
// Encryption Utilities
// ============================================================================

/**
 * Simple encryption for storing credentials
 * In production, you'd use Supabase Vault or a proper key management service
 * This uses AES-GCM with a derived key from the user's ID
 */
async function encryptCredential(
  plaintext: string,
  userId: string
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  // Derive key from user ID (in production, use proper key management)
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(userId.padEnd(32, '0').substring(0, 32)),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('cutthecrap-wp-salt'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt stored credentials
 */
async function decryptCredential(
  ciphertext: string,
  userId: string
): Promise<string> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // Decode from base64
  const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);

  // Derive key from user ID
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(userId.padEnd(32, '0').substring(0, 32)),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('cutthecrap-wp-salt'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  );

  return decoder.decode(decrypted);
}

/**
 * Generate a random HMAC secret for request signing
 */
function generateHmacSecret(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Add a new WordPress connection
 */
export async function addConnection(
  supabase: SupabaseClient,
  userId: string,
  input: WordPressConnectionInput
): Promise<ConnectionResult> {
  try {
    console.log('[WP Connection] Adding connection for user:', userId);

    // Normalize site URL
    let siteUrl = input.site_url.trim().toLowerCase();
    if (!siteUrl.startsWith('http://') && !siteUrl.startsWith('https://')) {
      siteUrl = `https://${siteUrl}`;
    }
    siteUrl = siteUrl.replace(/\/$/, ''); // Remove trailing slash
    console.log('[WP Connection] Normalized URL:', siteUrl);

    // Check if connection already exists
    const { data: existing, error: existingError } = await supabase
      .from('wordpress_connections')
      .select('id')
      .eq('user_id', userId)
      .eq('site_url', siteUrl)
      .single();

    console.log('[WP Connection] Existing check result:', { existing, error: existingError?.message });

    if (existing) {
      return {
        success: false,
        error: 'A connection to this WordPress site already exists'
      };
    }

    // Encrypt credentials
    console.log('[WP Connection] Encrypting credentials...');
    const encryptedPassword = await encryptCredential(input.api_password, userId);
    const hmacSecret = generateHmacSecret();
    const encryptedHmacSecret = await encryptCredential(hmacSecret, userId);
    console.log('[WP Connection] Credentials encrypted');

    // Create connection record
    const connectionData = {
      user_id: userId,
      project_id: input.project_id || null,
      site_url: siteUrl,
      site_name: input.site_name || null,
      api_username: input.api_username,
      api_password_encrypted: encryptedPassword,
      hmac_secret_encrypted: encryptedHmacSecret,
      status: 'pending' as WordPressConnectionStatus
    };
    console.log('[WP Connection] Inserting with data:', { ...connectionData, api_password_encrypted: '[REDACTED]', hmac_secret_encrypted: '[REDACTED]' });

    const result = await verifiedInsert(
      supabase,
      { table: 'wordpress_connections', operationDescription: 'add WordPress connection' },
      connectionData,
      '*'
    );

    console.log('[WP Connection] Insert result:', { success: result.success, error: result.error, hasData: !!result.data });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || 'Failed to save connection'
      };
    }

    // Return connection without encrypted fields
    const connection: WordPressConnection = {
      id: (result.data as Record<string, unknown>).id as string,
      user_id: userId,
      project_id: input.project_id,
      site_url: siteUrl,
      site_name: input.site_name,
      api_username: input.api_username,
      status: 'pending',
      created_at: (result.data as Record<string, unknown>).created_at as string,
      updated_at: (result.data as Record<string, unknown>).updated_at as string
    };

    return { success: true, connection };
  } catch (error) {
    console.error('[WP Connection] Add failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add connection'
    };
  }
}

/**
 * Test a WordPress connection (without saving)
 */
export async function testConnection(
  siteUrl: string,
  username: string,
  password: string
): Promise<TestResult> {
  // Normalize site URL
  let normalizedUrl = siteUrl.trim().toLowerCase();
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = `https://${normalizedUrl}`;
  }
  normalizedUrl = normalizedUrl.replace(/\/$/, '');

  const result = await testWordPressConnection(normalizedUrl, username, password);

  // Convert to TestResult type
  return {
    success: result.success,
    message: result.message,
    siteInfo: result.siteInfo ? {
      name: (result.siteInfo.name as string) || '',
      url: (result.siteInfo.url as string) || normalizedUrl,
      description: (result.siteInfo.description as string) || ''
    } : undefined
  };
}

/**
 * Verify a saved connection (checks API access and plugin)
 */
export async function verifyConnection(
  supabase: SupabaseClient,
  userId: string,
  connectionId: string
): Promise<VerificationResult> {
  try {
    // Get connection
    const { data: connection, error: fetchError } = await supabase
      .from('wordpress_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !connection) {
      return {
        verified: false,
        error: 'Connection not found'
      };
    }

    // Decrypt credentials
    const password = await decryptCredential(connection.api_password_encrypted, userId);

    // Create client and test
    const client = new WordPressApiClient({
      siteUrl: connection.site_url,
      username: connection.api_username,
      password
    });

    // Test basic connectivity first
    const testResult = await client.testConnection();
    if (!testResult.success) {
      // Update status to error
      await supabase
        .from('wordpress_connections')
        .update({
          status: 'error',
          last_error: testResult.message
        })
        .eq('id', connectionId);

      return {
        verified: false,
        error: testResult.message
      };
    }

    // Try to verify plugin
    let pluginVerification: PluginVerificationResponse | undefined;
    const pluginResult = await client.verifyPlugin();

    if (pluginResult.success && pluginResult.data) {
      pluginVerification = pluginResult.data;
    }

    // Update connection status
    await verifiedUpdate(
      supabase,
      { table: 'wordpress_connections', operationDescription: 'verify connection' },
      { column: 'id', value: connectionId },
      {
        status: 'verified' as WordPressConnectionStatus,
        site_name: testResult.siteInfo?.name || connection.site_name,
        plugin_version: pluginVerification?.plugin_version || null,
        plugin_verified_at: pluginVerification ? new Date().toISOString() : null,
        last_sync_at: new Date().toISOString(),
        last_error: null
      },
      '*'
    );

    return {
      verified: true,
      pluginVersion: pluginVerification?.plugin_version,
      capabilities: pluginVerification?.capabilities,
      seoPlugin: pluginVerification?.seo_plugin
    };
  } catch (error) {
    console.error('[WP Connection] Verify failed:', error);
    return {
      verified: false,
      error: error instanceof Error ? error.message : 'Verification failed'
    };
  }
}

/**
 * Get all connections for a user
 */
export async function getConnectionsForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<WordPressConnection[]> {
  console.log('[WP Connection] Fetching connections for user:', userId);

  const { data, error } = await supabase
    .from('wordpress_connections')
    .select('id, user_id, project_id, site_url, site_name, api_username, plugin_version, plugin_verified_at, status, last_sync_at, last_error, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  console.log('[WP Connection] Fetch result:', { count: data?.length, error: error?.message, code: error?.code });

  if (error) {
    console.error('[WP Connection] Fetch failed:', error);
    return [];
  }

  return data || [];
}

/**
 * Get connections for a specific project
 */
export async function getConnectionsForProject(
  supabase: SupabaseClient,
  projectId: string
): Promise<WordPressConnection[]> {
  const { data, error } = await supabase
    .from('wordpress_connections')
    .select('id, user_id, project_id, site_url, site_name, api_username, plugin_version, plugin_verified_at, status, last_sync_at, last_error, created_at, updated_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[WP Connection] Fetch by project failed:', error);
    return [];
  }

  return data || [];
}

/**
 * Get a single connection by ID
 */
export async function getConnection(
  supabase: SupabaseClient,
  userId: string,
  connectionId: string
): Promise<WordPressConnection | null> {
  const { data, error } = await supabase
    .from('wordpress_connections')
    .select('id, user_id, project_id, site_url, site_name, api_username, plugin_version, plugin_verified_at, status, last_sync_at, last_error, created_at, updated_at')
    .eq('id', connectionId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Update connection details
 */
export async function updateConnection(
  supabase: SupabaseClient,
  userId: string,
  connectionId: string,
  updates: {
    site_name?: string;
    api_username?: string;
    api_password?: string;
    project_id?: string | null;
  }
): Promise<ConnectionResult> {
  try {
    // Build update object
    const updateData: Record<string, unknown> = {};

    if (updates.site_name !== undefined) {
      updateData.site_name = updates.site_name;
    }

    if (updates.api_username !== undefined) {
      updateData.api_username = updates.api_username;
    }

    if (updates.api_password !== undefined) {
      updateData.api_password_encrypted = await encryptCredential(updates.api_password, userId);
      updateData.status = 'pending'; // Re-verify after password change
    }

    if (updates.project_id !== undefined) {
      updateData.project_id = updates.project_id;
    }

    if (Object.keys(updateData).length === 0) {
      return {
        success: false,
        error: 'No updates provided'
      };
    }

    const result = await verifiedUpdate(
      supabase,
      { table: 'wordpress_connections', operationDescription: 'update connection' },
      { column: 'id', value: connectionId },
      updateData,
      '*'
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Update failed'
      };
    }

    // Fetch updated connection
    const connection = await getConnection(supabase, userId, connectionId);

    return {
      success: true,
      connection: connection || undefined
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Update failed'
    };
  }
}

/**
 * Disconnect/remove a WordPress connection
 */
export async function removeConnection(
  supabase: SupabaseClient,
  userId: string,
  connectionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('wordpress_connections')
      .delete()
      .eq('id', connectionId)
      .eq('user_id', userId);

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed'
    };
  }
}

/**
 * Get an authenticated API client for a connection
 * Used by other services (publication, media, etc.)
 */
export async function getAuthenticatedClient(
  supabase: SupabaseClient,
  userId: string,
  connectionId: string
): Promise<{ client: WordPressApiClient; connection: WordPressConnection } | { error: string }> {
  try {
    // Get connection with encrypted fields
    const { data: connection, error: fetchError } = await supabase
      .from('wordpress_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !connection) {
      return { error: 'Connection not found' };
    }

    if (connection.status === 'error' || connection.status === 'disconnected') {
      return { error: `Connection is ${connection.status}. Please verify the connection.` };
    }

    // Decrypt credentials
    const password = await decryptCredential(connection.api_password_encrypted, userId);
    let hmacSecret: string | undefined;

    if (connection.hmac_secret_encrypted) {
      try {
        hmacSecret = await decryptCredential(connection.hmac_secret_encrypted, userId);
      } catch {
        // HMAC secret decryption failed, continue without it
        console.warn('[WP Connection] HMAC secret decryption failed, continuing without');
      }
    }

    const client = new WordPressApiClient({
      siteUrl: connection.site_url,
      username: connection.api_username,
      password,
      hmacSecret
    });

    // Return sanitized connection (without encrypted fields)
    const sanitizedConnection: WordPressConnection = {
      id: connection.id,
      user_id: connection.user_id,
      project_id: connection.project_id,
      site_url: connection.site_url,
      site_name: connection.site_name,
      api_username: connection.api_username,
      plugin_version: connection.plugin_version,
      plugin_verified_at: connection.plugin_verified_at,
      status: connection.status,
      last_sync_at: connection.last_sync_at,
      last_error: connection.last_error,
      created_at: connection.created_at,
      updated_at: connection.updated_at
    };

    return { client, connection: sanitizedConnection };
  } catch (error) {
    console.error('[WP Connection] Get client failed:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to create API client'
    };
  }
}
