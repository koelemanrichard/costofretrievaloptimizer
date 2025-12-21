/**
 * Test Topic Update Script
 *
 * Tests if updating a topic's type and parent_topic_id works correctly.
 *
 * Run: npx tsx scripts/migration/testTopicUpdate.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.migration') });

const SUPABASE_URL = process.env.TARGET_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY!;

// Test topic: Technisch Beheer & Onderhoud
const TEST_TOPIC_ID = '686694f6-c71f-4e24-9af7-a7452c3028a0';

async function main() {
  console.log('='.repeat(60));
  console.log('TEST TOPIC UPDATE');
  console.log('='.repeat(60));

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Step 1: Get current state
  console.log('\n[Step 1] Getting current state...');
  const { data: before, error: beforeError } = await supabase
    .from('topics')
    .select('id, title, type, parent_topic_id')
    .eq('id', TEST_TOPIC_ID)
    .single();

  if (beforeError) {
    console.error('Error fetching topic:', beforeError.message);
    process.exit(1);
  }

  console.log('Before:', before);

  // Step 2: Try to update type to 'outer'
  console.log('\n[Step 2] Updating type to "outer"...');
  const { data: updateResult, error: updateError } = await supabase
    .from('topics')
    .update({ type: 'outer', updated_at: new Date().toISOString() })
    .eq('id', TEST_TOPIC_ID)
    .select();

  if (updateError) {
    console.error('Update error:', updateError.message);
    console.error('Full error:', updateError);
  } else {
    console.log('Update result:', updateResult);
  }

  // Step 3: Verify the update
  console.log('\n[Step 3] Verifying update...');
  const { data: after, error: afterError } = await supabase
    .from('topics')
    .select('id, title, type, parent_topic_id')
    .eq('id', TEST_TOPIC_ID)
    .single();

  if (afterError) {
    console.error('Error fetching topic after update:', afterError.message);
  } else {
    console.log('After:', after);
    console.log('\nType changed:', before?.type, '->', after?.type);
  }

  // Step 4: Restore to 'core'
  console.log('\n[Step 4] Restoring type back to "core"...');
  const { error: restoreError } = await supabase
    .from('topics')
    .update({ type: 'core', updated_at: new Date().toISOString() })
    .eq('id', TEST_TOPIC_ID);

  if (restoreError) {
    console.error('Restore error:', restoreError.message);
  } else {
    console.log('Restored to core');
  }

  // Verify restoration
  const { data: final } = await supabase
    .from('topics')
    .select('type')
    .eq('id', TEST_TOPIC_ID)
    .single();

  console.log('\nFinal type:', final?.type);
}

main().catch(console.error);
