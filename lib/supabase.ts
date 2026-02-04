/**
 * Supabase client instance for database operations.
 * Re-exports the useSupabase function from services/supabaseClient.
 */

import { useSupabase } from '../services/supabaseClient';

// Export the supabase client getter
export const supabase = {
  from: (table: string) => useSupabase().from(table as any),
  rpc: (fn: string, params?: Record<string, unknown>) => useSupabase().rpc(fn as any, params as any)
};
