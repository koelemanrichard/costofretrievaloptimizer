
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../database.types';

let supabase: SupabaseClient<Database> | null = null;
let currentUrl: string | null = null;
let currentKey: string | null = null;

export const getSupabaseClient = (supabaseUrl: string, supabaseAnonKey: string) => {
    if (!supabaseUrl || !supabaseAnonKey) {
        console.error("Supabase URL or Anon Key is missing. Cannot initialize client.");
        throw new Error("Supabase credentials not provided.");
    }

    // Only create a new client if the credentials have changed or it doesn't exist yet
    if (!supabase || supabaseUrl !== currentUrl || supabaseAnonKey !== currentKey) {
        // console.log("Initializing new Supabase client..."); // Debug log
        supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
            auth: {
                // Ensure proper session handling
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
            }
        });
        currentUrl = supabaseUrl;
        currentKey = supabaseAnonKey;
    }

    return supabase;
};

/**
 * Clear all Supabase auth data from localStorage.
 * Supabase stores session tokens with keys like 'sb-<project-ref>-auth-token'.
 * This is needed to fully clear stale sessions that cause login to hang.
 */
export const clearSupabaseAuthStorage = () => {
    try {
        // Find and remove all Supabase auth-related localStorage entries
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => {
            console.log('[SupabaseClient] Clearing stale auth storage:', key);
            localStorage.removeItem(key);
        });
        if (keysToRemove.length > 0) {
            console.log(`[SupabaseClient] Cleared ${keysToRemove.length} Supabase storage entries`);
        }
    } catch (e) {
        console.warn('[SupabaseClient] Could not clear localStorage:', e);
    }
};

/**
 * Reset the cached Supabase client.
 * Call this after signOut to ensure a fresh client is created on next getSupabaseClient call.
 * This prevents stale auth state from persisting after logout.
 * @param clearStorage - If true, also clears Supabase auth data from localStorage (default: false)
 */
export const resetSupabaseClient = (clearStorage: boolean = false) => {
    if (clearStorage) {
        clearSupabaseAuthStorage();
    }
    supabase = null;
    currentUrl = null;
    currentKey = null;
};

export const useSupabase = () => {
    if (!supabase) {
        throw new Error("Supabase client has not been initialized. Call getSupabaseClient first.");
    }
    return supabase;
}
