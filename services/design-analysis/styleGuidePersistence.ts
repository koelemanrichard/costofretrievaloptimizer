// =============================================================================
// Style Guide Persistence — Save/load style guides to Supabase
// =============================================================================
// Cached by hostname (not full URL). A style guide for nfir.nl/page-a
// also works for nfir.nl/page-b.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { StyleGuide, SavedStyleGuide } from '../../types/styleGuide';

/**
 * Save a style guide to the database.
 * Creates a new version if one already exists for this hostname.
 */
export async function saveStyleGuide(
  supabase: SupabaseClient,
  userId: string,
  styleGuide: StyleGuide
): Promise<SavedStyleGuide | null> {
  // Get current max version for this hostname
  const { data: existing } = await supabase
    .from('style_guides')
    .select('version')
    .eq('user_id', userId)
    .eq('hostname', styleGuide.hostname)
    .order('version', { ascending: false })
    .limit(1);

  const nextVersion = (existing?.[0]?.version ?? 0) + 1;

  const record = {
    user_id: userId,
    hostname: styleGuide.hostname,
    source_url: styleGuide.sourceUrl,
    style_guide: {
      ...styleGuide,
      version: nextVersion,
      // Cap screenshot size to avoid exceeding column limits
      screenshotBase64: styleGuide.screenshotBase64?.substring(0, 500000) || null,
    },
    version: nextVersion,
  };

  const { data, error } = await supabase
    .from('style_guides')
    .insert(record)
    .select()
    .single();

  if (error) {
    console.error('[styleGuidePersistence] Failed to save style guide:', error);
    return null;
  }

  return data as unknown as SavedStyleGuide;
}

/**
 * Load the latest style guide for a hostname.
 */
export async function loadStyleGuide(
  supabase: SupabaseClient,
  userId: string,
  hostname: string
): Promise<SavedStyleGuide | null> {
  const { data, error } = await supabase
    .from('style_guides')
    .select('*')
    .eq('user_id', userId)
    .eq('hostname', hostname)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as SavedStyleGuide;
}

/**
 * Load all style guide versions for a hostname (lightweight — only metadata).
 */
export async function loadStyleGuideHistory(
  supabase: SupabaseClient,
  userId: string,
  hostname: string
): Promise<Pick<SavedStyleGuide, 'id' | 'version' | 'source_url' | 'created_at'>[]> {
  const { data, error } = await supabase
    .from('style_guides')
    .select('id, version, source_url, created_at')
    .eq('user_id', userId)
    .eq('hostname', hostname)
    .order('version', { ascending: false });

  if (error || !data) return [];
  return data as any[];
}

/**
 * Delete a specific style guide version.
 */
export async function deleteStyleGuide(
  supabase: SupabaseClient,
  styleGuideId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('style_guides')
    .delete()
    .eq('id', styleGuideId);

  return !error;
}

/**
 * Extract hostname from a URL for cache key lookup.
 */
export function getHostnameFromUrl(url: string): string {
  try {
    return new URL(url.startsWith('http') ? url : 'https://' + url).hostname;
  } catch {
    return url;
  }
}
