/**
 * Check Type Constraint on Topics Table
 *
 * Run: npx tsx scripts/migration/checkTypeConstraint.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.migration') });

const SUPABASE_URL = process.env.TARGET_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY!;

async function main() {
  console.log('Checking type constraint on topics table...\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Test inserting and updating with 'child' type
  const testId = crypto.randomUUID();
  const mapId = '2ea28b9d-77bb-458c-9aca-7e79722fcda4';
  const userId = 'c7ddfc06-87f4-4c13-9b5c-99b6fdb08ef8';

  console.log('[Test 1] Trying to insert a topic with type "child"...');
  const { data: insertData, error: insertError } = await supabase
    .from('topics')
    .insert({
      id: testId,
      map_id: mapId,
      title: 'Test Child Topic',
      slug: 'test-child-topic-' + Date.now(),
      type: 'child',
      user_id: userId
    })
    .select();

  if (insertError) {
    console.log('Insert error:', insertError.message);
    if (insertError.message.includes('check constraint')) {
      console.log('\n*** The "child" type is NOT allowed by the database constraint! ***');
      console.log('You need to run the migration to add "child" to the allowed types.');
    }
  } else {
    console.log('Insert succeeded:', insertData);

    // Clean up
    await supabase.from('topics').delete().eq('id', testId);
    console.log('Test topic cleaned up.');
  }

  console.log('\n[Test 2] Checking current constraint...');
  // Try to get constraint info
  const { data: constraintData, error: constraintError } = await supabase
    .rpc('get_constraint_info', {});

  if (constraintError) {
    console.log('Could not get constraint info via RPC.');
  } else {
    console.log('Constraint info:', constraintData);
  }

  // Test updating an existing topic to 'child' type
  console.log('\n[Test 3] Trying to update existing topic to type "child"...');
  const existingTopicId = '686694f6-c71f-4e24-9af7-a7452c3028a0';

  // First get current state
  const { data: before } = await supabase
    .from('topics')
    .select('type')
    .eq('id', existingTopicId)
    .single();

  console.log('Before:', before?.type);

  const { data: updateData, error: updateError } = await supabase
    .from('topics')
    .update({ type: 'child' })
    .eq('id', existingTopicId)
    .select('type');

  if (updateError) {
    console.log('Update to "child" error:', updateError.message);
    if (updateError.message.includes('check constraint')) {
      console.log('\n*** The "child" type update failed due to constraint! ***');
    }
  } else {
    console.log('Update to "child" succeeded:', updateData);

    // Restore
    await supabase
      .from('topics')
      .update({ type: 'core' })
      .eq('id', existingTopicId);
    console.log('Restored to "core".');
  }

  // Verify restoration
  const { data: after } = await supabase
    .from('topics')
    .select('type')
    .eq('id', existingTopicId)
    .single();

  console.log('After restoration:', after?.type);
}

main().catch(console.error);
