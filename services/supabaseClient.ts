
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
        supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
        currentUrl = supabaseUrl;
        currentKey = supabaseAnonKey;
    }

    return supabase;
};

export const useSupabase = () => {
    if (!supabase) {
        throw new Error("Supabase client has not been initialized. Call getSupabaseClient first.");
    }
    return supabase;
}
