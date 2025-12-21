/**
 * Check RLS Policies for Topics Table
 *
 * Run: npx tsx scripts/migration/checkRlsPolicies.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.migration') });

const SUPABASE_URL = process.env.TARGET_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY!;

async function main() {
  console.log('Checking RLS policies for topics table...\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Query the pg_policies view to see RLS policies
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE tablename = 'topics'
      ORDER BY policyname;
    `
  });

  if (error) {
    console.log('Could not query pg_policies directly. Trying alternative...');

    // Try getting info from information_schema
    const { data: tableInfo, error: tableError } = await supabase
      .from('topics')
      .select('id')
      .limit(0);

    console.log('Topics table exists:', !tableError);

    // Check if RLS is enabled by trying an update with anon role
    console.log('\nTesting update with service role key (should work)...');
    const testTopicId = '686694f6-c71f-4e24-9af7-a7452c3028a0';

    const { data: testData, error: testError } = await supabase
      .from('topics')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', testTopicId)
      .select('id, title');

    if (testError) {
      console.log('Update failed:', testError.message);
    } else {
      console.log('Update succeeded:', testData);
    }

    return;
  }

  console.log('RLS Policies for topics:');
  console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);
