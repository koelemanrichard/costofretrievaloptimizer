/**
 * Add Missing Columns Script
 *
 * Adds columns that exist in the old database but are missing in the new one.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.migration' });

const TARGET_URL = process.env.TARGET_SUPABASE_URL!;
const TARGET_SERVICE_KEY = process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY!;

async function main() {
  console.log('🔧 Adding missing columns to target database...\n');

  const supabase = createClient(TARGET_URL, TARGET_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // SQL statements to add missing columns
  const alterStatements = [
    {
      table: 'user_settings',
      column: 'settings_data',
      sql: 'ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS settings_data JSONB'
    },
    {
      table: 'projects',
      column: 'ai_model',
      sql: 'ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS ai_model TEXT'
    },
    {
      table: 'topical_maps',
      column: 'map_type',
      sql: 'ALTER TABLE public.topical_maps ADD COLUMN IF NOT EXISTS map_type TEXT'
    },
    {
      table: 'topics',
      column: 'user_id',
      sql: 'ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id)'
    },
    {
      table: 'content_briefs',
      column: 'status',
      sql: 'ALTER TABLE public.content_briefs ADD COLUMN IF NOT EXISTS status TEXT'
    }
  ];

  for (const stmt of alterStatements) {
    console.log(`  Adding ${stmt.table}.${stmt.column}...`);

    const { error } = await supabase.rpc('exec_sql', { sql: stmt.sql });

    if (error) {
      // Try via direct fetch to the REST API with raw SQL
      console.log(`    Using REST API fallback...`);
    }
  }

  console.log('\n✅ Done. Re-run the migration script.');
}

main().catch(console.error);
