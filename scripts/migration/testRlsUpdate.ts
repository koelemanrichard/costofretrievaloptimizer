/**
 * Test RLS Update - Simulates frontend update behavior
 *
 * Run: npx tsx scripts/migration/testRlsUpdate.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.migration') });

const SUPABASE_URL = process.env.TARGET_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.TARGET_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY!;

const TEST_TOPIC_ID = '686694f6-c71f-4e24-9af7-a7452c3028a0';

async function main() {
  console.log('Testing RLS update behavior...\n');

  // Test 1: Update with anon key (no auth) - should fail due to RLS
  console.log('[Test 1] Update with anon key (no authentication)...');
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: anonData, error: anonError } = await anonClient
    .from('topics')
    .update({ type: 'outer', updated_at: new Date().toISOString() })
    .eq('id', TEST_TOPIC_ID)
    .select();

  console.log('Anon key result:', { data: anonData, error: anonError?.message });
  if (!anonError && anonData?.length === 0) {
    console.log('*** RLS blocked the update (0 rows affected) ***');
  }

  // Verify the topic wasn't changed
  const { data: verify1 } = await anonClient
    .from('topics')
    .select('type')
    .eq('id', TEST_TOPIC_ID)
    .single();
  console.log('Verification after anon attempt:', verify1?.type);

  // Test 2: Update with service role key - should always work
  console.log('\n[Test 2] Update with service role key...');
  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: serviceData, error: serviceError } = await serviceClient
    .from('topics')
    .update({ type: 'outer', updated_at: new Date().toISOString() })
    .eq('id', TEST_TOPIC_ID)
    .select();

  console.log('Service role result:', { data: serviceData?.length, error: serviceError?.message });

  // Verify it was changed
  const { data: verify2 } = await serviceClient
    .from('topics')
    .select('type')
    .eq('id', TEST_TOPIC_ID)
    .single();
  console.log('Verification after service role:', verify2?.type);

  // Restore
  await serviceClient
    .from('topics')
    .update({ type: 'core' })
    .eq('id', TEST_TOPIC_ID);
  console.log('\nRestored to core.');

  console.log('\n='.repeat(60));
  console.log('CONCLUSION:');
  console.log('='.repeat(60));
  console.log('If "RLS blocked the update" appeared, the user needs to be');
  console.log('authenticated with a valid session for updates to work.');
  console.log('\nCheck that:');
  console.log('1. The user is logged in');
  console.log('2. The session token is being passed to the Supabase client');
  console.log('3. The auth.uid() matches the map owner (user_id)');
}

main().catch(console.error);
